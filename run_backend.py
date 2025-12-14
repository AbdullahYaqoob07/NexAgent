#!/usr/bin/env python3
"""
Standalone backend server for testing without Firebase dependencies
"""
import sys
import os
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.absolute()
sys.path.insert(0, str(project_root))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import logging
from typing import Dict, Any
import json

# Import our LangGraph orchestrator
from lib.workflow.langgraph.orchestrator import WorkflowOrchestrator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="NexAgent Workflow API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create a global orchestrator instance
orchestrator = WorkflowOrchestrator(
    api_keys={},
    enable_checkpointing=True,
    enable_circuit_breakers=True
)

@app.get("/")
async def root():
    return {"message": "NexAgent Workflow API is running"}

@app.post("/api/v1/workflows/{workflow_id}/execute")
async def execute_workflow(workflow_id: str, request: Dict[str, Any]):
    """
    Execute a workflow using the LangGraph engine
    """
    try:
        logger.info(f"Executing workflow {workflow_id}")
        
        # Extract workflow data and input from request
        workflow_data = request.get("workflow_data", {})
        input_data = request.get("input", {})
        config = request.get("config", {})
        
        # If no workflow data provided, create a simple test workflow
        if not workflow_data:
            workflow_data = {
                "id": workflow_id,
                "name": f"Test Workflow {workflow_id}",
                "nodes": [
                    {
                        "id": "start",
                        "type": "Start",
                        "name": "Start Node",
                        "config": {}
                    },
                    {
                        "id": "delay",
                        "type": "Delay",
                        "name": "Delay Node",
                        "config": {
                            "duration_ms": config.get("delay_ms", 2000)
                        }
                    },
                    {
                        "id": "end",
                        "type": "End",
                        "name": "End Node",
                        "config": {}
                    }
                ],
                "connections": [
                    {
                        "sourceNodeId": "start",
                        "targetNodeId": "delay"
                    },
                    {
                        "sourceNodeId": "delay",
                        "targetNodeId": "end"
                    }
                ],
                "config": config
            }
        
        # Execute the workflow
        result = await orchestrator.execute_workflow(
            workflow_data=workflow_data,
            initial_input=input_data
        )
        
        return {
            "status": result["status"],
            "workflow_id": workflow_id,
            "summary": result["summary"],
            "final_output": result["final_output"],
            "execution_time_ms": result["execution_time_ms"]
        }
        
    except Exception as e:
        logger.error(f"Error executing workflow {workflow_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/workflows/timer-test")
async def create_timer_test(request: Dict[str, Any]):
    """
    Create and execute a timer-based test workflow
    """
    try:
        # Create a timer workflow
        workflow_data = {
            "id": "timer-test-workflow",
            "name": "Timer Test Workflow",
            "nodes": [
                {
                    "id": "trigger",
                    "type": "Start",
                    "name": "Timer Trigger",
                    "config": {}
                },
                {
                    "id": "delay",
                    "type": "Delay",
                    "name": "Wait Period",
                    "config": {
                        "duration_ms": request.get("delay_ms", 5000)  # Default 5 seconds
                    }
                },
                {
                    "id": "action",
                    "type": "HTTP Request",
                    "name": "Notification",
                    "config": {
                        "url": "https://httpbin.org/post",
                        "method": "POST",
                        "body": "{\"message\": \"Timer workflow executed!\", \"timestamp\": \"{{now}}\"}"
                    }
                },
                {
                    "id": "end",
                    "type": "End",
                    "name": "Finish",
                    "config": {}
                }
            ],
            "connections": [
                {
                    "sourceNodeId": "trigger",
                    "targetNodeId": "delay"
                },
                {
                    "sourceNodeId": "delay",
                    "targetNodeId": "action"
                },
                {
                    "sourceNodeId": "action",
                    "targetNodeId": "end"
                }
            ],
            "config": {}
        }
        
        # Execute the workflow
        input_data = request.get("input", {
            "timestamp": "2025-12-14T10:00:00Z",
            "user_id": "test_user"
        })
        
        result = await orchestrator.execute_workflow(
            workflow_data=workflow_data,
            initial_input=input_data
        )
        
        return {
            "status": result["status"],
            "workflow_id": "timer-test-workflow",
            "summary": result["summary"],
            "final_output": result["final_output"],
            "execution_time_ms": result["execution_time_ms"]
        }
        
    except Exception as e:
        logger.error(f"Error creating timer test: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    logger.info("Starting NexAgent Workflow API server...")
    logger.info("API available at http://localhost:8000")
    logger.info("Execute workflow endpoint: POST /api/v1/workflows/{workflow_id}/execute")
    logger.info("Timer test endpoint: POST /api/v1/workflows/timer-test")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)