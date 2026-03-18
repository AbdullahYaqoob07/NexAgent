from fastapi import APIRouter, HTTPException, Depends, status, Query, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from app.models.workflow_models import (
    WorkflowCreateRequest,
    WorkflowUpdateRequest,
    WorkflowResponse,
    WorkflowListResponse,
    WorkflowDetailResponse
)
from app.services.firebase_service import firebase_service
from firebase_admin import firestore
from app.services.workflow_service import workflow_service
from typing import Optional, Any, Dict, List
from datetime import datetime
import logging
import uuid
from app.api.v1.credentials import load_user_credentials_sync

# Ensure backend/ is in sys.path so that nodes.* and executor.* are importable
import sys
from pathlib import Path

backend_dir = Path(__file__).parent.parent.parent.parent  # …/backend/
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# New workflow engine
from executor.engine import WorkflowEngine, WorkflowDefinition
from executor.context import ExecutionContext
from executor.execution_environment import ExecutionEnvironment
from nodes.registry import get_registry

# Scheduler
try:
    from services.scheduler import get_scheduler
    _SCHEDULER_AVAILABLE = True
except Exception:
    _SCHEDULER_AVAILABLE = False

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/workflows", tags=["Workflows"])

# Global workflow engine instance (shared, thread-safe)
_engine: Optional[WorkflowEngine] = None

# In-memory store for webhook execution results (workflow_id → last 10 results)
# Keyed by workflow_id; each entry: {received_at_ms, execution_id, body, node_logs, ...}
_webhook_results: Dict[str, List[Dict]] = {}
_MAX_WEBHOOK_RESULTS = 10

# Per-workflow lock to prevent concurrent scheduler registrations racing to register duplicate jobs
import asyncio as _asyncio_mod
_scheduler_register_locks: Dict[str, Any] = {}


def _get_scheduler_lock(workflow_id: str):
    """Return a per-workflow asyncio.Lock for serialising scheduler registration."""
    if workflow_id not in _scheduler_register_locks:
        _scheduler_register_locks[workflow_id] = _asyncio_mod.Lock()
    return _scheduler_register_locks[workflow_id]


def get_engine() -> WorkflowEngine:
    global _engine
    if _engine is None:
        _engine = WorkflowEngine(get_registry())
    return _engine


def _resolve_credential_ref(value: Any, user_credentials: Dict[str, str]) -> Any:
    """Resolve {{$creds.name}} references to their secret values when possible."""
    if not isinstance(value, str):
        return value

    raw = value.strip()
    if raw.startswith("{{$creds.") and raw.endswith("}}"):
        cred_name = raw.replace("{{$creds.", "").replace("}}", "").strip()
        return user_credentials.get(cred_name, value)
    return value


def _extract_databases_config_from_nodes(
    raw_nodes: List[Dict[str, Any]],
    user_credentials: Dict[str, str],
) -> Dict[str, Any]:
    """
    Build databases_config for ExecutionEnvironment from workflow node configs.

    This enables MCP/AI tools to access DB clients even when database nodes are
    placed after AI nodes in the graph.
    """
    db_config: Dict[str, Any] = {}

    for node in raw_nodes or []:
        node_type = str(node.get("type") or "")
        cfg = node.get("config") or {}

        # PostgreSQL
        if node_type in {"PostgresQuery", "PostgreSQL Query", "Postgres Query"}:
            conn = _resolve_credential_ref(cfg.get("connection_string"), user_credentials)
            if isinstance(conn, str) and conn.strip() and "postgres" not in db_config:
                db_config["postgres"] = {"connection_string": conn.strip()}

        # MongoDB
        elif node_type in {"MongoDBQuery", "MongoDB Query"}:
            conn = _resolve_credential_ref(cfg.get("connection_string"), user_credentials)
            db_name = cfg.get("database_name")
            if isinstance(conn, str) and conn.strip() and "mongodb" not in db_config:
                entry: Dict[str, Any] = {"connection_string": conn.strip()}
                if isinstance(db_name, str) and db_name.strip():
                    entry["database_name"] = db_name.strip()
                db_config["mongodb"] = entry

        # Pinecone
        elif node_type in {"PineconeQuery", "Pinecone Query"}:
            api_key = _resolve_credential_ref(cfg.get("api_key"), user_credentials)
            index_name = cfg.get("index_name")
            environment = cfg.get("environment")
            if isinstance(api_key, str) and api_key.strip() and "pinecone" not in db_config:
                entry = {"api_key": api_key.strip()}
                if isinstance(index_name, str) and index_name.strip():
                    entry["index_name"] = index_name.strip()
                if isinstance(environment, str) and environment.strip():
                    entry["environment"] = environment.strip()
                db_config["pinecone"] = entry

    return db_config


security = HTTPBearer()


# Dependency to get current user from token
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Dependency to get current user from Authorization token
    """
    try:
        token = credentials.credentials
        decoded_token = await firebase_service.verify_token(token)
        
        if not decoded_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        
        return decoded_token
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auth dependency error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )


@router.post("", response_model=WorkflowDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    request: WorkflowCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new workflow
    
    Requires authentication via Bearer token
    
    - **name**: Workflow name (3-100 characters)
    - **description**: Optional workflow description
    - **canBeListed**: Whether workflow can be publicly listed (default: false)
    - **nodes**: Array of workflow nodes
    - **edges**: Array of workflow edges
    - **variables**: Workflow variables
    """
    try:
        user_id = current_user['uid']
        
        # Create workflow
        result = await workflow_service.create_workflow(
            user_id=user_id,
            name=request.name,
            description=request.description,
            can_be_listed=request.canBeListed,
            nodes=request.nodes,
            edges=request.edges,
            variables=request.variables
        )
        
        if not result['success']:
            # Check if it's a validation error
            if result.get('status_code') == 422:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={
                        'message': 'Workflow validation failed',
                        'errors': result.get('validation_errors', [])
                    }
                )
            # Check if it's a workflow limit error
            if result.get('limit_reached'):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        'message': result.get('error', 'Workflow limit reached'),
                        'limit_reached': True,
                        'current_count': result.get('current_count'),
                        'max_allowed': result.get('max_allowed'),
                        'plan': result.get('plan')
                    }
                )
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Failed to create workflow')
            )
        
        workflow = result['workflow']
        
        # Convert Firestore timestamps to datetime objects
        from datetime import datetime
        
        def convert_timestamp(ts):
            if ts is None:
                return None
            # Check if it's already a datetime
            if isinstance(ts, datetime):
                return ts
            # Check if it's a Firestore Timestamp (has to_datetime method)
            if hasattr(ts, 'to_datetime'):
                return ts.to_datetime()
            # Check if it's a Firestore Timestamp (has timestamp method)
            if hasattr(ts, 'timestamp'):
                return datetime.fromtimestamp(ts.timestamp())
            # If it's a string, try to parse it
            if isinstance(ts, str):
                try:
                    return datetime.fromisoformat(ts.replace('Z', '+00:00'))
                except:
                    pass
            # Fallback to current time
            return datetime.now()
        
        return WorkflowDetailResponse(
            success=True,
            workflow=WorkflowResponse(
                id=workflow['id'],
                userId=workflow['userId'],
                name=workflow['name'],
                description=workflow['description'],
                canBeListed=workflow['canBeListed'],
                nodes=workflow['nodes'],
                edges=workflow['edges'],
                variables=workflow['variables'],
                status=workflow['status'],
                version=workflow['version'],
                createdAt=convert_timestamp(workflow.get('createdAt')),
                updatedAt=convert_timestamp(workflow.get('updatedAt')),
                lastExecutedAt=convert_timestamp(workflow.get('lastExecutedAt')),
                executionCount=workflow['executionCount']
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create workflow error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create workflow"
        )


@router.get("", response_model=WorkflowListResponse)
async def get_workflows(
    current_user: dict = Depends(get_current_user),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    filter_status: Optional[str] = Query(None, description="Filter by status (draft, active, archived)")
):
    """
    Get all workflows for the authenticated user

    Requires authentication via Bearer token
    
    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    - **filter_status**: Filter by status (optional)
    """
    try:
        user_id = current_user['uid']
        
        # Get workflows
        result = await workflow_service.get_user_workflows(
            user_id=user_id,
            page=page,
            page_size=page_size,
            status=filter_status
        )
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get('error', 'Failed to get workflows')
            )
        
        # Convert workflows to response models
        workflow_responses = []
        for workflow in result['workflows']:
            workflow_responses.append(
                WorkflowResponse(
                    id=workflow['id'],
                    userId=workflow['userId'],
                    name=workflow['name'],
                    description=workflow.get('description'),
                    canBeListed=workflow.get('canBeListed', False),
                    nodes=workflow.get('nodes', []),
                    edges=workflow.get('edges', []),
                    variables=workflow.get('variables', {}),
                    status=workflow.get('status', 'draft'),
                    version=workflow.get('version', 1),
                    createdAt=workflow.get('createdAt'),
                    updatedAt=workflow.get('updatedAt'),
                    lastExecutedAt=workflow.get('lastExecutedAt'),
                    executionCount=workflow.get('executionCount', 0)
                )
            )
        
        return WorkflowListResponse(
            success=True,
            workflows=workflow_responses,
            total=result['total'],
            page=result['page'],
            pageSize=result['pageSize']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get workflows error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get workflows"
        )


@router.get("/{workflow_id}", response_model=WorkflowDetailResponse)
async def get_workflow(
    workflow_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific workflow by ID
    
    Requires authentication via Bearer token
    User must own the workflow or it must be public (canBeListed=true)
    """
    try:
        user_id = current_user['uid']
        
        # Get workflow
        workflow = await workflow_service.get_workflow_by_id(
            workflow_id=workflow_id,
            user_id=user_id
        )
        
        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow not found or access denied"
            )
        
        return WorkflowDetailResponse(
            success=True,
            workflow=WorkflowResponse(
                id=workflow['id'],
                userId=workflow['userId'],
                name=workflow['name'],
                description=workflow.get('description'),
                canBeListed=workflow.get('canBeListed', False),
                nodes=workflow.get('nodes', []),
                edges=workflow.get('edges', []),
                variables=workflow.get('variables', {}),
                status=workflow.get('status', 'draft'),
                version=workflow.get('version', 1),
                createdAt=workflow.get('createdAt'),
                updatedAt=workflow.get('updatedAt'),
                lastExecutedAt=workflow.get('lastExecutedAt'),
                executionCount=workflow.get('executionCount', 0)
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get workflow error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get workflow"
        )


@router.put("/{workflow_id}", response_model=WorkflowDetailResponse)
async def update_workflow(
    workflow_id: str,
    request: WorkflowUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a workflow
    
    Requires authentication via Bearer token
    User must own the workflow
    """
    try:
        user_id = current_user['uid']
        
        # Prepare updates
        updates = {}
        if request.name is not None:
            updates['name'] = request.name
        if request.description is not None:
            updates['description'] = request.description
        if request.canBeListed is not None:
            updates['canBeListed'] = request.canBeListed
        if request.nodes is not None:
            updates['nodes'] = request.nodes
        if request.edges is not None:
            updates['edges'] = request.edges
        if request.variables is not None:
            updates['variables'] = request.variables
        if request.status is not None:
            updates['status'] = request.status
        
        # Update workflow
        result = await workflow_service.update_workflow(
            workflow_id=workflow_id,
            user_id=user_id,
            updates=updates
        )
        
        if not result['success']:
            if result.get('status_code') == 422:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={
                        'message': 'Workflow validation failed',
                        'errors': result.get('validation_errors', [])
                    }
                )
            if result.get('error') == 'Unauthorized':
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to update this workflow"
                )
            elif result.get('error') == 'Workflow not found':
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Workflow not found"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=result.get('error', 'Failed to update workflow')
                )
        
        # Get updated workflow
        workflow = await workflow_service.get_workflow_by_id(workflow_id, user_id)
        
        return WorkflowDetailResponse(
            success=True,
            workflow=WorkflowResponse(
                id=workflow['id'],
                userId=workflow['userId'],
                name=workflow['name'],
                description=workflow.get('description'),
                canBeListed=workflow.get('canBeListed', False),
                nodes=workflow.get('nodes', []),
                edges=workflow.get('edges', []),
                variables=workflow.get('variables', {}),
                status=workflow.get('status', 'draft'),
                version=workflow.get('version', 1),
                createdAt=workflow.get('createdAt'),
                updatedAt=workflow.get('updatedAt'),
                lastExecutedAt=workflow.get('lastExecutedAt'),
                executionCount=workflow.get('executionCount', 0)
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update workflow error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update workflow"
        )


@router.delete("/{workflow_id}")
async def delete_workflow(
    workflow_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a workflow
    
    Requires authentication via Bearer token
    User must own the workflow
    """
    try:
        user_id = current_user['uid']
        
        # Delete workflow
        result = await workflow_service.delete_workflow(
            workflow_id=workflow_id,
            user_id=user_id
        )
        
        if not result['success']:
            if result.get('error') == 'Unauthorized':
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to delete this workflow"
                )
            elif result.get('error') == 'Workflow not found':
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Workflow not found"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=result.get('error', 'Failed to delete workflow')
                )
        
        return {
            "success": True,
            "message": "Workflow deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete workflow error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete workflow"
        )


@router.get("/public/list", response_model=WorkflowListResponse)
async def get_public_workflows(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page")
):
    """
    Get all public workflows (canBeListed=true)
    
    Does NOT require authentication
    """
    try:
        # Get public workflows
        result = await workflow_service.get_public_workflows(
            page=page,
            page_size=page_size
        )
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get('error', 'Failed to get public workflows')
            )
        
        # Convert workflows to response models
        workflow_responses = []
        for workflow in result['workflows']:
            workflow_responses.append(
                WorkflowResponse(
                    id=workflow['id'],
                    userId=workflow['userId'],
                    name=workflow['name'],
                    description=workflow.get('description'),
                    canBeListed=workflow.get('canBeListed', False),
                    nodes=workflow.get('nodes', []),
                    edges=workflow.get('edges', []),
                    variables=workflow.get('variables', {}),
                    status=workflow.get('status', 'draft'),
                    version=workflow.get('version', 1),
                    createdAt=workflow.get('createdAt'),
                    updatedAt=workflow.get('updatedAt'),
                    lastExecutedAt=workflow.get('lastExecutedAt'),
                    executionCount=workflow.get('executionCount', 0)
                )
            )
        
        return WorkflowListResponse(
            success=True,
            workflows=workflow_responses,
            total=result['total'],
            page=result['page'],
            pageSize=result['pageSize']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get public workflows error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get public workflows"
        )


class ExecuteWorkflowRequest(BaseModel):
    input: Optional[Any] = None
    config: Optional[Dict[str, Any]] = None


class TestDbConnectionRequest(BaseModel):
    node_type: str
    config: Dict[str, Any]


class TestDbConnectionResponse(BaseModel):
    success: bool
    message: str
    node_type: str


class ExecuteWorkflowResponse(BaseModel):
    status: str
    summary: Optional[Dict[str, Any]] = None
    final_output: Optional[Any] = None
    node_logs: Optional[List[Dict[str, Any]]] = None
    execution_time_ms: Optional[float] = None
    error: Optional[str] = None
    partial_results: Optional[List[Dict[str, Any]]] = None


@router.post("/test-connection", response_model=TestDbConnectionResponse)
async def test_db_connection(
    request: TestDbConnectionRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Test database connection for DB nodes (PostgresQuery, MongoDBQuery, PineconeQuery)
    without executing a workflow.
    """
    node_type = (request.node_type or "").strip()
    cfg = request.config or {}

    try:
        if node_type in ("PostgresQuery", "PostgreSQL Query", "Postgres Query"):
            from executor.databases.postgres import PostgresClient

            conn = str(cfg.get("connection_string") or "").strip()
            if not conn:
                raise HTTPException(status_code=400, detail="PostgreSQL connection string is required")

            client = PostgresClient(conn)
            await client.connect()
            try:
                healthy = await client.health_check()
            finally:
                await client.disconnect()

            if not healthy:
                raise HTTPException(status_code=400, detail="PostgreSQL health check failed")

            return TestDbConnectionResponse(
                success=True,
                message="PostgreSQL connection successful",
                node_type="PostgresQuery",
            )

        if node_type in ("MongoDBQuery", "MongoDB Query"):
            from executor.databases.mongodb import MongoDBClient

            conn = str(cfg.get("connection_string") or "").strip()
            db_name = str(cfg.get("database_name") or "").strip()
            if not conn:
                raise HTTPException(status_code=400, detail="MongoDB connection string is required")
            if not db_name:
                raise HTTPException(status_code=400, detail="MongoDB database name is required")

            client = MongoDBClient(conn, db_name)
            await client.connect()
            try:
                healthy = await client.health_check()
            finally:
                await client.disconnect()

            if not healthy:
                raise HTTPException(status_code=400, detail="MongoDB health check failed")

            return TestDbConnectionResponse(
                success=True,
                message="MongoDB connection successful",
                node_type="MongoDBQuery",
            )

        if node_type in ("PineconeQuery", "Pinecone Query"):
            from executor.databases.pinecone import PineconeClient

            api_key = str(cfg.get("api_key") or "").strip()
            index_name = str(cfg.get("index_name") or "").strip()
            environment = str(cfg.get("environment") or "us-east-1").strip()
            if not api_key:
                raise HTTPException(status_code=400, detail="Pinecone API key is required")
            if not index_name:
                raise HTTPException(status_code=400, detail="Pinecone index name is required")

            client = PineconeClient(api_key, index_name, environment)
            await client.connect()
            try:
                healthy = await client.health_check()
            finally:
                await client.disconnect()

            if not healthy:
                raise HTTPException(status_code=400, detail="Pinecone health check failed")

            return TestDbConnectionResponse(
                success=True,
                message="Pinecone connection successful",
                node_type="PineconeQuery",
            )

        raise HTTPException(status_code=400, detail=f"Unsupported database node type: {node_type}")

    except HTTPException:
        raise
    except RuntimeError as exc:
        # Surface dependency/setup issues (e.g., missing SDKs) as clear client-visible errors
        logger.error("Database connection test runtime error for node %s: %s", node_type, exc)
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        msg = str(exc)
        logger.error("Database connection test failed for node %s: %s", node_type, msg)

        # Map common connection/config errors to user-fixable 400 responses
        lowered = msg.lower()
        if "getaddrinfo failed" in lowered or "name or service not known" in lowered:
            raise HTTPException(
                status_code=400,
                detail="Database host could not be resolved. Check the hostname in your connection string.",
            )
        if "connection refused" in lowered or "timeout expired" in lowered or "timed out" in lowered:
            raise HTTPException(
                status_code=400,
                detail="Database server is unreachable. Check host/port, network access, and firewall.",
            )
        if "password authentication failed" in lowered or "authentication failed" in lowered:
            raise HTTPException(
                status_code=400,
                detail="Authentication failed. Check username/password in your connection string.",
            )
        if "does not exist" in lowered and "database" in lowered:
            raise HTTPException(
                status_code=400,
                detail="Database not found. Verify the database name in your connection string.",
            )

        raise HTTPException(status_code=500, detail=f"Connection test failed: {msg}")


@router.post("/{workflow_id}/execute", response_model=ExecuteWorkflowResponse)
async def execute_workflow(
    workflow_id: str,
    request: ExecuteWorkflowRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Execute a workflow using the NexAgent WorkflowEngine.

    Requires authentication via Bearer token.
    User must own the workflow.
    """
    try:
        user_id = current_user['uid']

        # ── Load workflow ──────────────────────────────────────────────
        workflow = await workflow_service.get_workflow_by_id(
            workflow_id=workflow_id,
            user_id=user_id
        )
        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow not found or access denied"
            )

        # ── Build WorkflowDefinition ───────────────────────────────────
        # Firestore stores nodes + edges (old key); new engine uses connections.
        # WorkflowConnection.from_dict() handles both formats automatically.
        from executor.engine import WorkflowConnection, WorkflowNode
        raw_nodes = workflow.get("nodes", [])
        raw_connections = workflow.get("connections") or workflow.get("edges", [])

        wf_nodes = [WorkflowNode(id=n.get("id", ""), type=n.get("type", ""), name=n.get("name", ""), config=n.get("config", {})) for n in raw_nodes]
        wf_connections = [WorkflowConnection.from_dict(c) for c in raw_connections]
        wf_def = WorkflowDefinition(id=workflow_id, name=workflow.get("name", ""), nodes=wf_nodes, connections=wf_connections)

        user_credentials = load_user_credentials_sync(user_id)
        databases_config = _extract_databases_config_from_nodes(raw_nodes, user_credentials)

        # ── Check for Schedule node → register with scheduler ──────────
        schedule_nodes = [n for n in wf_nodes if n.type in ("Schedule", "ScheduleTriggerNode", "ScheduleEvent", "Scheduling")]

        if schedule_nodes and _SCHEDULER_AVAILABLE:
            schedule_node = schedule_nodes[0]
            cfg = schedule_node.config or {}
        # "cron" is the new field name; "frequency" was the old NodeDefinitions key
            cron = cfg.get("cron") or cfg.get("frequency")
            tz = cfg.get("timezone", "UTC")

            if cron:
                scheduler = get_scheduler()
                try:
                    cron = scheduler.normalize_cron(cron)
                except ValueError as exc:
                    raise HTTPException(status_code=400, detail=f"Invalid cron expression: {exc}")

                engine = get_engine()

                async def execute_scheduled_workflow(wf_data: Dict[str, Any], wf_input: Any):
                    """Called by scheduler on each cron tick."""
                    ctx = await ExecutionEnvironment.create_context(
                        execution_id=str(uuid.uuid4()),
                        workflow_id=workflow_id,
                        user_id=user_id,
                        variables=workflow.get("variables") or {},
                        user_credentials=user_credentials,
                        databases_config=databases_config,
                    )
                    try:
                        raw_c = wf_data.get("connections") or wf_data.get("edges", [])
                        sched_nodes = [WorkflowNode(**n) for n in wf_data.get("nodes", [])]
                        sched_conns = [WorkflowConnection.from_dict(c) for c in raw_c]
                        sched_def = WorkflowDefinition(id=workflow_id, name=wf_data.get("name", ""), nodes=sched_nodes, connections=sched_conns)
                        result = await engine.execute(sched_def, wf_input or {}, ctx)
                        return {"status": result.status, "node_logs": [log.dict() for log in result.logs], "final_output": result.final_output}
                    finally:
                        await ExecutionEnvironment.cleanup_context(ctx)

                # Serialise scheduler registration per workflow to prevent duplicate jobs
                # from concurrent Execute requests arriving simultaneously.
                async with _get_scheduler_lock(workflow_id):
                    # Re-check inside the lock (another request may have just registered)
                    existing_jobs = scheduler.get_jobs_by_workflow_id(workflow_id)
                    running_job = next((j for j in existing_jobs if j.status.value == "running"), None)
                    if running_job:
                        return ExecuteWorkflowResponse(
                            status="scheduled",
                            summary={"workflow_id": workflow_id, "status": "scheduled",
                                     "scheduler_job_id": running_job.job_id,
                                     "next_run": running_job.next_run.isoformat() if running_job.next_run else None},
                            final_output={"scheduler_job_id": running_job.job_id},
                            node_logs=[], execution_time_ms=0,
                        )

                    # Stop and purge ALL stale jobs before creating a fresh one
                    for stale in existing_jobs:
                        await scheduler.stop_scheduler(stale.job_id)
                        scheduler.jobs.pop(stale.job_id, None)

                    workflow_data_for_scheduler = {"id": workflow_id, "name": workflow.get("name", ""), "nodes": raw_nodes, "connections": raw_connections}
                    job_id = scheduler.register_job(workflow_id=workflow_id, workflow_data=workflow_data_for_scheduler, cron=cron, timezone=tz, executor_func=execute_scheduled_workflow)
                    await scheduler.start_scheduler(job_id)

                job = scheduler.get_job(job_id)

                return ExecuteWorkflowResponse(
                    status="scheduled",
                    summary={"workflow_id": workflow_id, "status": "scheduled", "scheduler_job_id": job_id,
                             "next_run": job.next_run.isoformat() if job and job.next_run else None},
                    final_output={"scheduler_job_id": job_id},
                    node_logs=[], execution_time_ms=0,
                )

        # ── Execute workflow immediately ───────────────────────────────
        logger.info("Executing workflow %s for user %s", workflow_id, user_id)

        context = await ExecutionEnvironment.create_context(
            execution_id=str(uuid.uuid4()),
            workflow_id=workflow_id,
            user_id=user_id,
            variables=workflow.get("variables") or {},
            user_credentials=user_credentials,
            databases_config=databases_config,
        )

        try:
            engine = get_engine()
            _exec_start_ms = int(__import__('time').time() * 1000)
            result = await engine.execute(wf_def, request.input or {}, context)

            # Convert NodeLog objects to frontend-friendly camelCase dicts
            node_logs = [
                {
                    "nodeId": log.node_id,
                    "nodeName": log.node_name,
                    "nodeType": log.node_type,
                    "status": log.status,
                    "output": log.output,
                    "error": log.error,
                    "executionTimeMs": log.duration_ms,
                    "startedAt": log.started_at,
                    "completedAt": log.finished_at,
                }
                for log in result.logs
            ]

            await workflow_service.increment_execution_count(workflow_id)

            # Persist execution record to Firestore
            try:
                exec_id = context.execution_id
                exec_doc = {
                    "id": exec_id,
                    "workflowId": workflow_id,
                    "userId": user_id,
                    "status": result.status,
                    "startTime": _exec_start_ms,
                    "endTime": int(__import__('time').time() * 1000),
                    "duration": result.duration_ms,
                    "nodeLogs": node_logs,
                    "input": request.input or {},
                    "output": result.final_output or {},
                    "error": result.error,
                    "metadata": {"tokensUsed": 0, "cost": 0},
                    "createdAt": firestore.SERVER_TIMESTAMP,
                }
                firebase_service.db.collection("executions").document(exec_id).set(exec_doc)
            except Exception as _save_err:
                logger.warning("Failed to persist execution record: %s", _save_err)

            logger.info("Workflow %s completed with status: %s", workflow_id, result.status)
            return ExecuteWorkflowResponse(
                status=result.status,
                final_output=result.final_output,
                node_logs=node_logs,
                execution_time_ms=result.duration_ms,
                error=result.error,
            )
        finally:
            await ExecutionEnvironment.cleanup_context(context)

    except HTTPException:
        raise
    except Exception as exc:
        import traceback
        logger.error("Execute workflow error: %s\n%s", exc, traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute workflow: {exc}"
        )


@router.get("/{workflow_id}/executions")
async def list_executions(
    workflow_id: str,
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
):
    """List execution history for a workflow (most recent first)."""
    try:
        user_id = current_user["uid"]
        docs = (
            firebase_service.db.collection("executions")
            .where("workflowId", "==", workflow_id)
            .where("userId", "==", user_id)
            .stream()
        )
        executions = [d.to_dict() for d in docs]
        # Sort newest first in Python to avoid needing a composite Firestore index
        executions.sort(key=lambda e: e.get("startTime", 0), reverse=True)
        return {"executions": executions[:limit]}
    except Exception as exc:
        logger.error("list_executions error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/{workflow_id}/executions/{execution_id}")
async def get_execution(
    workflow_id: str,
    execution_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get a single execution record."""
    try:
        user_id = current_user["uid"]
        doc = firebase_service.db.collection("executions").document(execution_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Execution not found")
        data = doc.to_dict()
        if data.get("userId") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        return data
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("get_execution error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/{workflow_id}/webhook")
async def receive_webhook(
    workflow_id: str,
    request: Request,
):
    """
    Inbound Webhook endpoint — no auth required.

    External services call:
        POST /api/v1/workflows/{workflow_id}/webhook
        POST /api/v1/workflows/{workflow_id}/webhook?foo=bar

    The raw HTTP body, headers, method, and query params are passed
    as the workflow's initial input so the Webhook trigger node can
    surface them via {{$trigger.body}}, {{$trigger.headers}}, etc.
    """
    try:
        # Parse body
        try:
            body = await request.json()
        except Exception:
            raw = await request.body()
            body = raw.decode("utf-8", errors="replace") if raw else {}

        headers = dict(request.headers)
        method = request.method
        query_params = dict(request.query_params)

        # Load workflow without user-auth (webhook is public)
        workflow = await workflow_service.get_workflow_by_id(
            workflow_id=workflow_id,
            user_id=None  # allow any owner; service must handle None gracefully
        )
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")

        # Only execute workflows that contain a Webhook trigger node
        webhook_node_types = {"Webhook", "WebhookTriggerNode", "Incoming Webhook"}
        raw_nodes = workflow.get("nodes", [])
        has_webhook = any(n.get("type", "") in webhook_node_types for n in raw_nodes)
        if not has_webhook:
            raise HTTPException(status_code=400, detail="Workflow does not have a Webhook trigger node")

        raw_connections = workflow.get("connections") or workflow.get("edges", [])
        from executor.engine import WorkflowConnection, WorkflowNode
        wf_nodes = [WorkflowNode(id=n.get("id", ""), type=n.get("type", ""), name=n.get("name", ""), config=n.get("config", {})) for n in raw_nodes]
        wf_connections = [WorkflowConnection.from_dict(c) for c in raw_connections]
        wf_def = WorkflowDefinition(id=workflow_id, name=workflow.get("name", ""), nodes=wf_nodes, connections=wf_connections)

        _webhook_uid = workflow.get("userId", "")
        webhook_user_credentials = load_user_credentials_sync(_webhook_uid)
        webhook_databases_config = _extract_databases_config_from_nodes(raw_nodes, webhook_user_credentials)
        context = await ExecutionEnvironment.create_context(
            execution_id=str(uuid.uuid4()),
            workflow_id=workflow_id,
            user_id=_webhook_uid,
            variables=workflow.get("variables") or {},
            user_credentials=webhook_user_credentials,
            databases_config=webhook_databases_config,
        )

        try:
            initial_input = {
                "body": body,
                "headers": headers,
                "method": method,
                "query_params": query_params,
            }

            engine = get_engine()
            result = await engine.execute(wf_def, initial_input, context)

            await workflow_service.increment_execution_count(workflow_id)

            node_logs = [
                {
                    "nodeId": log.node_id,
                    "nodeType": log.node_type,
                    "status": log.status,
                    "output": log.output,
                    "error": log.error,
                    "executionTimeMs": log.duration_ms,
                }
                for log in result.logs
            ]

            import time
            execution_record = {
                "received_at_ms": int(time.time() * 1000),
                "execution_id": context.execution_id,
                "status": result.status,
                "final_output": result.final_output,
                "node_logs": node_logs,
                "execution_time_ms": result.duration_ms,
                "error": result.error,
                "request": {
                    "method": method,
                    "body": body,
                    "query_params": query_params,
                },
            }
            # Store in memory for frontend polling (keep last N results per workflow)
            bucket = _webhook_results.setdefault(workflow_id, [])
            bucket.append(execution_record)
            if len(bucket) > _MAX_WEBHOOK_RESULTS:
                del bucket[:-_MAX_WEBHOOK_RESULTS]

            return {
                "status": result.status,
                "execution_id": context.execution_id,
                "workflow_id": workflow_id,
                "final_output": result.final_output,
                "node_logs": node_logs,
                "execution_time_ms": result.duration_ms,
                "error": result.error,
            }
        finally:
            await ExecutionEnvironment.cleanup_context(context)

    except HTTPException:
        raise
    except Exception as exc:
        import traceback
        logger.error("Webhook execution error: %s\n%s", exc, traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Webhook execution failed: {exc}")


@router.get("/{workflow_id}/webhook/results")
async def get_webhook_results(
    workflow_id: str,
    since_ms: int = Query(default=0, description="Return only results received after this Unix ms timestamp"),
):
    """
    Poll for new webhook execution results.
    Frontend calls this every few seconds to display incoming webhook requests.
    Returns results with received_at_ms > since_ms, ordered oldest-first.
    """
    all_results = _webhook_results.get(workflow_id, [])
    new_results = [r for r in all_results if r["received_at_ms"] > since_ms]
    return {"results": new_results, "total": len(new_results)}


@router.post("/{workflow_id}/scheduler/stop")
async def stop_scheduler(
    workflow_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Stop a scheduled workflow
    """
    try:
        user_id = current_user['uid']
        
        # Verify workflow ownership
        workflow = await workflow_service.get_workflow_by_id(
            workflow_id=workflow_id,
            user_id=user_id
        )
        
        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow not found or access denied"
            )
        
        # Find and stop the scheduler job
        scheduler = get_scheduler()
        job = scheduler.get_job_by_workflow_id(workflow_id)
        
        if not job:
            logger.info(f"No scheduled job found for workflow {workflow_id}")
            return {
                "success": True,
                "message": "No active scheduler found for this workflow",
                "job_id": None
            }
        
        await scheduler.stop_scheduler(job.job_id)
        logger.info(f"Stopped scheduler job {job.job_id} for workflow {workflow_id}")
        
        return {
            "success": True,
            "message": "Scheduler stopped successfully",
            "job_id": job.job_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Stop scheduler error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stop scheduler: {str(e)}"
        )


@router.get("/{workflow_id}/scheduler/status")
async def get_scheduler_status(
    workflow_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get scheduler status for a workflow
    """
    try:
        user_id = current_user['uid']
        
        # Verify workflow ownership
        workflow = await workflow_service.get_workflow_by_id(
            workflow_id=workflow_id,
            user_id=user_id
        )
        
        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow not found or access denied"
            )
        
        # Get scheduler job
        scheduler = get_scheduler()
        job = scheduler.get_job_by_workflow_id(workflow_id)
        
        if not job:
            return {
                "scheduled": False,
                "status": None
            }
        
        response = {
            "scheduled": True,
            "status": job.status.value if hasattr(job.status, 'value') else str(job.status),
            "job_id": job.job_id,
            "cron": job.cron,
            "timezone": job.timezone,
            "next_run": job.next_run.isoformat() if job.next_run else None,
            "last_run": job.last_run.isoformat() if job.last_run else None,
            "run_count": job.run_count
        }
        
        # Include last execution result if available
        if hasattr(job, 'last_execution_result') and job.last_execution_result:
            response["last_execution"] = job.last_execution_result
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get scheduler status error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get scheduler status: {str(e)}"
        )

