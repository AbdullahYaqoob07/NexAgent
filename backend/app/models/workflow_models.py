from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
from datetime import datetime


class WorkflowCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    canBeListed: bool = False
    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    variables: Dict[str, Any] = {}
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) < 3:
            raise ValueError('Workflow name must be at least 3 characters long')
        if len(v) > 100:
            raise ValueError('Workflow name must not exceed 100 characters')
        return v.strip()


class WorkflowUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    canBeListed: Optional[bool] = None
    nodes: Optional[List[Dict[str, Any]]] = None
    edges: Optional[List[Dict[str, Any]]] = None
    variables: Optional[Dict[str, Any]] = None
    status: Optional[str] = None  # active, draft, archived


class WorkflowResponse(BaseModel):
    id: str
    userId: str
    name: str
    description: Optional[str]
    canBeListed: bool
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    variables: Dict[str, Any]
    status: str
    version: int
    createdAt: datetime
    updatedAt: datetime
    lastExecutedAt: Optional[datetime] = None
    executionCount: int
    
    class Config:
        from_attributes = True


class WorkflowListResponse(BaseModel):
    success: bool
    workflows: List[WorkflowResponse]
    total: int
    page: int
    pageSize: int


class WorkflowDetailResponse(BaseModel):
    success: bool
    workflow: WorkflowResponse
