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
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Failed to create workflow')
            )
        
        workflow = result['workflow']
        
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
                createdAt=workflow.get('createdAt', None),
                updatedAt=workflow.get('updatedAt', None),
                lastExecutedAt=workflow.get('lastExecutedAt'),
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
    status: Optional[str] = Query(None, description="Filter by status (draft, active, archived)")
):
    """
    Get all workflows for the authenticated user
    
    Requires authentication via Bearer token
    
    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    - **status**: Filter by status (optional)
    """
    try:
        user_id = current_user['uid']
        
        # Get workflows
        result = await workflow_service.get_user_workflows(
            user_id=user_id,
            page=page,
            page_size=page_size,
            status=status
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
        
        # Prepare workflow data for execution
        # Convert the workflow structure to match what our orchestrator expects
        workflow_data = {
            "id": workflow["id"],
            "name": workflow["name"],
            "nodes": workflow.get("nodes", []),
            "connections": workflow.get("edges", []),  # Assuming edges are connections
            "config": request.config or workflow.get("config", {})
        }
        
        # Check if this workflow has a Schedule node - if so, register with scheduler
        schedule_nodes = [n for n in workflow_data.get("nodes", []) 
                         if n.get("type") in ["Schedule", "ScheduleTriggerNode"]]
        
        if schedule_nodes and len(schedule_nodes) > 0:
            # This is a scheduled workflow - register with scheduler instead of executing immediately
            schedule_node = schedule_nodes[0]
            cron = schedule_node.get("config", {}).get("cron")
            
            if cron:
                scheduler = get_scheduler()
                
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
                
                job_id = scheduler.register_job(
                    workflow_id=workflow_id,
                    workflow_data=workflow_data,
                    cron=cron,
                    timezone=schedule_node.get("config", {}).get("timezone", "UTC"),
                    executor_func=execute_scheduled_workflow
                )
                
                # Start the scheduler
                await scheduler.start_scheduler(job_id)
                
                job = scheduler.get_job(job_id)
                return ExecuteWorkflowResponse(
                    status="scheduled",
                    summary={
                        "workflow_id": workflow_id,
                        "status": "scheduled",
                        "scheduler_job_id": job_id,
                        "next_run": job.next_run.isoformat() if job and job.next_run else None
                    },
                    final_output={"scheduler_job_id": job_id, "status": "scheduled"},
                    node_logs=[],
                    execution_time_ms=0
                )
        
        # Execute workflow normally (no schedule node or manual execution)
        logger.info(f"Executing workflow {workflow_id} for user {user_id}")
        result = await orchestrator.execute_workflow(
            workflow_data=workflow_data,
            initial_input=request.input
        )
        
        # Update execution count
        await workflow_service.increment_execution_count(workflow_id)
        
        logger.info(f"Workflow {workflow_id} execution completed with status: {result['status']}")
        return ExecuteWorkflowResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Execute workflow error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to execute workflow"
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
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No scheduled job found for this workflow"
            )
        
        await scheduler.stop_scheduler(job.job_id)
        
        return {
            "success": True,
            "message": "Scheduler stopped",
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
        
        return {
            "scheduled": True,
            "status": job.status,
            "job_id": job.job_id,
            "cron": job.cron,
            "next_run": job.next_run.isoformat() if job.next_run else None,
            "last_run": job.last_run.isoformat() if job.last_run else None,
            "run_count": job.run_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get scheduler status error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get scheduler status: {str(e)}"
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
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No scheduled job found for this workflow"
            )
        
        await scheduler.stop_scheduler(job.job_id)
        
        return {
            "success": True,
            "message": "Scheduler stopped",
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
        
        return {
            "scheduled": True,
            "status": job.status,
            "job_id": job.job_id,
            "cron": job.cron,
            "next_run": job.next_run.isoformat() if job.next_run else None,
            "last_run": job.last_run.isoformat() if job.last_run else None,
            "run_count": job.run_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get scheduler status error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get scheduler status: {str(e)}"
        )
