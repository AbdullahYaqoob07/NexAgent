"""
FastAPI endpoints using the LangGraph orchestrator
"""
from fastapi import FastAPI, HTTPException, APIRouter
from pydantic import BaseModel
from typing import Any, Optional, Dict, List
import logging

from lib.workflow.langgraph.orchestrator import WorkflowOrchestrator
from lib.workflow.langgraph.error_recovery import CheckpointType

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/v1/workflows", tags=["workflows"])

# Global orchestrator instance
# In a production environment, you would want to configure this properly
# with dependency injection or a proper singleton pattern
orchestrator = WorkflowOrchestrator(
    api_keys={"openai": "sk-..."},  # Replace with actual API keys
    enable_checkpointing=True,
    enable_circuit_breakers=True,
    checkpoint_storage_dir="./checkpoints"
)

class ExecuteRequest(BaseModel):
    workflow: dict
    input: Optional[Any] = None

class ExecuteResponse(BaseModel):
    status: str
    summary: Optional[dict] = None
    final_output: Optional[Any] = None
    node_logs: Optional[List[dict]] = None
    execution_time_ms: Optional[float] = None
    error: Optional[str] = None
    partial_results: Optional[List[dict]] = None

class CheckpointResponse(BaseModel):
    checkpoints: List[dict]

class RecoveryResponse(BaseModel):
    restored_state: Optional[dict]
    error: Optional[str] = None

@router.post("/execute", response_model=ExecuteResponse)
async def execute_workflow(request: ExecuteRequest):
    """Execute workflow with full orchestration"""
    try:
        logger.info(f"Received workflow execution request for workflow ID: {request.workflow.get('id', 'unknown')}")
        result = await orchestrator.execute_workflow(
            request.workflow,
            request.input
        )
        logger.info(f"Workflow execution completed with status: {result['status']}")
        return ExecuteResponse(**result)
    except Exception as e:
        logger.error(f"Error executing workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/checkpoints/{execution_id}", response_model=CheckpointResponse)
async def list_checkpoints(execution_id: str):
    """List checkpoints for an execution"""
    try:
        if not orchestrator.enable_checkpointing:
            raise HTTPException(status_code=400, detail="Checkpointing is not enabled")
            
        checkpoints = await orchestrator.checkpoint_manager.list_checkpoints(
            execution_id=execution_id
        )
        return CheckpointResponse(checkpoints=checkpoints)
    except Exception as e:
        logger.error(f"Error listing checkpoints: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/recover/{execution_id}", response_model=RecoveryResponse)
async def recover_workflow(execution_id: str):
    """Recover a failed workflow execution"""
    try:
        if not orchestrator.enable_checkpointing:
            raise HTTPException(status_code=400, detail="Checkpointing is not enabled")
            
        checkpoint_id = await orchestrator.checkpoint_manager.find_recovery_checkpoint(
            workflow_id="",
            execution_id=execution_id
        )
        
        if not checkpoint_id:
            raise HTTPException(status_code=404, detail="No recovery point found")
        
        state = await orchestrator.checkpoint_manager.restore_from_checkpoint(
            checkpoint_id
        )
        
        return RecoveryResponse(restored_state=state)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recovering workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/circuit-breakers")
async def get_circuit_breaker_status():
    """Get status of all circuit breakers"""
    try:
        if not orchestrator.enable_circuit_breakers:
            return {"enabled": False}
        
        metrics = orchestrator.circuit_breaker_registry.get_all_metrics()
        return {"enabled": True, "breakers": metrics}
    except Exception as e:
        logger.error(f"Error getting circuit breaker status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Example node executor implementations
# These would typically be in separate files in a real application

class DelayNodeExecutor:
    """Example implementation of a delay node executor"""
    
    def __init__(self, config, context):
        self.config = config
        self.context = context
    
    async def execute(self, input_data):
        import asyncio
        duration_ms = self.config.config.get("duration_ms", 1000)
        await asyncio.sleep(duration_ms / 1000.0)
        return {
            "delayed": True,
            "duration_ms": duration_ms,
            "input": input_data
        }

# Register the example executor
orchestrator.register_node_executor("Delay", DelayNodeExecutor)

# Export the router
workflow_router = router