from fastapi import APIRouter, HTTPException, Depends, status, Query
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
from app.services.workflow_service import workflow_service
from typing import Optional, Any, Dict, List
from datetime import datetime
import logging

# Import LangGraph orchestrator
import sys
import os
from pathlib import Path

# Add project root to Python path
# File is at: backend/app/api/v1/workflows.py
# We need to go up 4 levels to reach project root
backend_dir = Path(__file__).parent.parent.parent.parent
project_root = backend_dir.parent
sys.path.insert(0, str(project_root))

from lib.workflow.langgraph.orchestrator import WorkflowOrchestrator
from lib.workflow.langgraph.error_recovery import CheckpointType
from lib.workflow.langgraph.scheduler import get_scheduler
from app.schemas.workflow_schema import (
    WorkflowV2,
    LangGraphWorkflow,
    resolve_node_config,
    map_executor_output,
    VariableContext
)

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/workflows", tags=["Workflows"])

# Global orchestrator instance
orchestrator = WorkflowOrchestrator(
    api_keys={},  # Will be populated with actual API keys
    enable_checkpointing=True,
    enable_circuit_breakers=True,
    checkpoint_storage_dir="./checkpoints"
)
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


class ExecuteWorkflowResponse(BaseModel):
    status: str
    summary: Optional[Dict[str, Any]] = None
    final_output: Optional[Any] = None
    node_logs: Optional[List[Dict[str, Any]]] = None
    execution_time_ms: Optional[float] = None
    error: Optional[str] = None
    partial_results: Optional[List[Dict[str, Any]]] = None


@router.post("/{workflow_id}/execute", response_model=ExecuteWorkflowResponse)
async def execute_workflow(
    workflow_id: str,
    request: ExecuteWorkflowRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Execute a workflow using LangGraph orchestrator
    
    Requires authentication via Bearer token
    User must own the workflow
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
        
        # ─── RE-VALIDATE BEFORE EXECUTION (Safety net) ───
        # This catches any config that slipped through frontend validation
        try:
            # Add schema version if missing
            if 'schemaVersion' not in workflow:
                workflow['schemaVersion'] = 2
            workflow_v2 = WorkflowV2(**workflow)
        except ValidationError as e:
            # Pydantic validation failed - format errors for user
            error_details = []
            for err in e.errors():
                field_path = '.'.join(str(loc) for loc in err['loc'])
                message = err['msg']
                error_details.append({
                    'field': field_path,
                    'message': message,
                    'code': err.get('type', 'validation_error')
                })
            
            logger.error(f"Workflow {workflow_id} failed schema validation: {error_details}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    'message': 'Workflow configuration is invalid. Please check your node settings.',
                    'errors': error_details
                }
            )
        
        # Transform to LangGraph format with proper port handling (no hardcoded ports)
        langgraph_workflow = LangGraphWorkflow.from_workflow(workflow_v2)
        
        # Convert Pydantic models to dicts for orchestrator compatibility
        # Use by_alias=True to convert snake_case back to camelCase for orchestrator
        # Use exclude_none=True to avoid None values
        nodes_as_dicts = [node.model_dump(by_alias=True, exclude_none=False) for node in langgraph_workflow.nodes]
        connections_as_dicts = [conn.model_dump(by_alias=True, exclude_none=False) for conn in langgraph_workflow.connections]
        
        logger.info(f"First connection keys: {list(connections_as_dicts[0].keys()) if connections_as_dicts else 'no connections'}")
        logger.info(f"First connection: {connections_as_dicts[0] if connections_as_dicts else 'no connections'}")
        
        workflow_data = {
            "id": workflow_id,
            "name": langgraph_workflow.name,
            "nodes": nodes_as_dicts,
            "connections": connections_as_dicts,
            "config": request.config or workflow.get("config", {})
        }
                
        # Log workflow data for debugging
        logger.info(f"Prepared workflow data for scheduler - Nodes: {len(workflow_data.get('nodes', []))}, Connections: {len(workflow_data.get('connections', []))}")
        for i, node in enumerate(workflow_data.get('nodes', [])):
            logger.info(f"Node {i}: {node.get('type', 'unknown')} - {node.get('name', 'unnamed')}")
        
        # Check if this workflow has a Schedule node - if so, register with scheduler
        schedule_nodes = [n for n in workflow_data.get("nodes", []) 
                         if n.get("type") in ["Schedule", "ScheduleTriggerNode", "ScheduleEvent"]]
        
        if schedule_nodes and len(schedule_nodes) > 0:
            # This is a scheduled workflow - register with scheduler instead of executing immediately
            schedule_node = schedule_nodes[0]
            cron = schedule_node.get("config", {}).get("cron")
            # Get timezone from config, default to UTC if not set
            timezone = schedule_node.get("config", {}).get("timezone", "UTC")
            
            # Log schedule node config for debugging
            logger.info(f"Schedule node config: {schedule_node.get('config', {})}")
            logger.info(f"Scheduling workflow {workflow_id} with cron '{cron}' in timezone '{timezone}'")
            
            # Log current time for debugging cron calculation
            try:
                import pytz
                tz = pytz.timezone(timezone)
                current_time = datetime.now(tz)
                logger.info(f"Current time in {timezone}: {current_time}")
            except:
                logger.info(f"Current UTC time: {datetime.utcnow()}")
            
            if cron:
                scheduler = get_scheduler()
                
                # Normalize cron expression first (6-field to 5-field)
                try:
                    normalized_cron = scheduler.normalize_cron(cron)
                    cron = normalized_cron  # Use normalized version
                except ValueError as e:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid cron expression: {str(e)}"
                    )
                
                # Check if croniter is available and validate
                try:
                    from croniter import croniter
                    croniter(cron)  # Validate normalized cron expression
                except ImportError:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="croniter library is required for scheduled workflows. Please install it: pip install croniter"
                    )
                except Exception as e:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid cron expression: {str(e)}"
                    )
                
                # Check if job already exists and is running
                existing_job = scheduler.get_job_by_workflow_id(workflow_id)
                if existing_job and existing_job.status.value == "running":
                    # Already running, return status
                    return ExecuteWorkflowResponse(
                        status="scheduled",
                        summary={
                            "workflow_id": workflow_id,
                            "status": "scheduled",
                            "scheduler_job_id": existing_job.job_id,
                            "next_run": existing_job.next_run.isoformat() if existing_job.next_run else None
                        },
                        final_output={"scheduler_job_id": existing_job.job_id, "status": "scheduled"},
                        node_logs=[],
                        execution_time_ms=0
                    )
                
                # Create executor function
                async def execute_scheduled_workflow(wf_data: Dict[str, Any], wf_input: Any):
                    return await orchestrator.execute_workflow(wf_data, wf_input)
                
                # Remove existing job if any
                if existing_job:
                    scheduler.remove_job(existing_job.job_id)
                
                try:
                    logger.info(f"Registering scheduler job for workflow {workflow_id} with cron: {cron}")
                    logger.info(f"Workflow data keys: {list(workflow_data.keys()) if workflow_data else 'None'}")
                    job_id = scheduler.register_job(
                        workflow_id=workflow_id,
                        workflow_data=workflow_data,
                        cron=cron,
                        timezone=timezone,
                        executor_func=execute_scheduled_workflow
                    )
                    logger.info(f"Scheduler job registered: {job_id}")
                    
                    # Start the scheduler
                    logger.info(f"Starting scheduler for job: {job_id}")
                    await scheduler.start_scheduler(job_id)
                    logger.info(f"Scheduler started successfully for job: {job_id}")
                    
                    # Verify job is running
                    job = scheduler.get_job(job_id)
                    if job:
                        logger.info(f"Job {job_id} status after start: {job.status}")
                    else:
                        logger.error(f"Job {job_id} not found after registration")
                    
                    job = scheduler.get_job(job_id)
                    if not job:
                        raise HTTPException(
                            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Scheduler job was created but could not be retrieved"
                        )
                    
                    logger.info(f"Returning scheduled response for workflow {workflow_id}")
                    return ExecuteWorkflowResponse(
                        status="scheduled",
                        summary={
                            "workflow_id": workflow_id,
                            "status": "scheduled",
                            "scheduler_job_id": job_id,
                            "next_run": job.next_run.isoformat() if job.next_run else None
                        },
                        final_output={"scheduler_job_id": job_id, "status": "scheduled"},
                        node_logs=[],
                        execution_time_ms=0
                    )
                except ValueError as e:
                    # Cron validation error from register_job
                    logger.error(f"Cron validation error: {str(e)}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid cron expression: {str(e)}"
                    )
                except HTTPException:
                    raise
                except Exception as e:
                    import traceback
                    error_traceback = traceback.format_exc()
                    logger.error(f"Failed to register scheduler job: {str(e)}")
                    logger.error(f"Error traceback: {error_traceback}")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Failed to schedule workflow: {str(e)}"
                    )
        
        # Execute workflow normally (no schedule node or manual execution)
        logger.info(f"Executing workflow {workflow_id} for user {user_id}")
        
        # Note: resolve_node_config() and map_executor_output() should be called inside 
        # the orchestrator's node execution loop. Build a context that could be used there:
        execution_context = VariableContext(
            trigger=request.input or {},
            node_outputs={},
            variables=workflow_v2.variables or {},
            execution_id=workflow_id
        )
        
        # TODO: Pass execution_context to orchestrator when it supports variable resolution
        # For now, the orchestrator executes with vanilla node configs
        result = await orchestrator.execute_workflow(
            workflow_data=workflow_data,
            initial_input=request.input
        )
        
        # Convert node_logs from snake_case to camelCase for frontend
        if result.get("node_logs"):
            converted_logs = []
            for log in result["node_logs"]:
                converted_log = {
                    "nodeId": log.get("node_id", ""),
                    "nodeName": log.get("node_name", log.get("node_id", "Unknown")),
                    "nodeType": log.get("node_type", "unknown"),
                    "status": log.get("status", "unknown"),
                    "output": log.get("output"),
                    "error": log.get("error"),
                    "executionTimeMs": log.get("execution_time_ms", 0),
                    "startedAt": log.get("started_at", ""),
                    "completedAt": log.get("completed_at", ""),
                    "metadata": log.get("metadata", {})
                }
                converted_logs.append(converted_log)
            result["node_logs"] = converted_logs
        
        # Update execution count
        await workflow_service.increment_execution_count(workflow_id)
        
        logger.info(f"Workflow {workflow_id} execution completed with status: {result['status']}")
        return ExecuteWorkflowResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        logger.error(f"Execute workflow error: {str(e)}")
        logger.error(f"Error traceback: {error_traceback}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute workflow: {str(e)}"
        )


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

