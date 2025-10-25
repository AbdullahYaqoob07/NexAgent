from fastapi import APIRouter, HTTPException, Depends, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.workflow_models import (
    WorkflowCreateRequest,
    WorkflowUpdateRequest,
    WorkflowResponse,
    WorkflowListResponse,
    WorkflowDetailResponse
)
from app.services.firebase_service import firebase_service
from app.services.workflow_service import workflow_service
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/workflows", tags=["Workflows"])
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
