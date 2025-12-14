"""
Pydantic models for workflow data structures
"""
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from enum import Enum

class NodeType(str, Enum):
    """Supported node types"""
    TRIGGER = "On Clicking Execute"
    DELAY = "Delay"
    OPENAI = "OpenAI"
    HTTP_REQUEST = "HTTP Request"
    CONDITION = "Condition"
    LOOP = "Loop"
    CODE = "Code"
    TRANSFORM = "Transform"

class Position(BaseModel):
    x: float
    y: float

class WorkflowNode(BaseModel):
    id: str
    type: NodeType
    name: str
    position: Position
    config: Dict[str, Any] = Field(default_factory=dict)

class WorkflowConnection(BaseModel):
    id: str
    sourceNodeId: str
    targetNodeId: str
    sourcePortId: str = "output"
    targetPortId: str = "input"
    # Optional: for conditional routing
    condition: Optional[str] = None

class WorkflowData(BaseModel):
    id: str
    name: str
    nodes: List[WorkflowNode]
    connections: List[WorkflowConnection]
    # Optional: global workflow configuration
    config: Dict[str, Any] = Field(default_factory=dict)

class NodeExecutionResult(BaseModel):
    node_id: str
    node_name: str
    status: str  # "success", "error", "skipped"
    output: Any = None
    error: Optional[str] = None
    execution_time: float = 0.0
    timestamp: str

class WorkflowExecutionResult(BaseModel):
    workflow_id: str
    execution_id: str
    status: str  # "completed", "failed", "partial"
    node_results: List[NodeExecutionResult]
    total_execution_time: float
    started_at: str
    completed_at: str
    final_output: Any = None


"""
Advanced features: Retry logic, error handling, and conditional routing
"""
import asyncio
from typing import Dict, Any, Callable, Optional
from functools import wraps
import logging

logger = logging.getLogger(__name__)

class RetryConfig:
    """Configuration for retry behavior"""
    def __init__(
        self,
        max_attempts: int = 3,
        initial_delay: float = 1.0,
        max_delay: float = 60.0,
        exponential_base: float = 2.0,
        retry_on_exceptions: tuple = (Exception,)
    ):
        self.max_attempts = max_attempts
        self.initial_delay = initial_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.retry_on_exceptions = retry_on_exceptions

def with_retry(retry_config: RetryConfig):
    """Decorator to add retry logic to node executors"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None
            delay = retry_config.initial_delay
            
            for attempt in range(retry_config.max_attempts):
                try:
                    return await func(*args, **kwargs)
                except retry_config.retry_on_exceptions as e:
                    last_exception = e
                    
                    if attempt < retry_config.max_attempts - 1:
                        logger.warning(
                            f"Attempt {attempt + 1} failed: {str(e)}. "
                            f"Retrying in {delay}s..."
                        )
                        await asyncio.sleep(delay)
                        delay = min(delay * retry_config.exponential_base, 
                                  retry_config.max_delay)
                    else:
                        logger.error(
                            f"All {retry_config.max_attempts} attempts failed. "
                            f"Last error: {str(e)}"
                        )
            
            raise last_exception
        
        return wrapper
    return decorator

class ErrorHandlingStrategy:
    """Base class for error handling strategies"""
    
    async def handle_error(self, node_id: str, error: Exception, 
                          state: Dict[str, Any]) -> Dict[str, Any]:
        """Handle an error and return updated state"""
        raise NotImplementedError

class IgnoreErrorStrategy(ErrorHandlingStrategy):
    """Ignore errors and continue execution"""
    
    async def handle_error(self, node_id: str, error: Exception, 
                          state: Dict[str, Any]) -> Dict[str, Any]:
        logger.warning(f"Ignoring error in node {node_id}: {str(error)}")
        return state

class FailWorkflowStrategy(ErrorHandlingStrategy):
    """Fail entire workflow on error"""
    
    async def handle_error(self, node_id: str, error: Exception, 
                          state: Dict[str, Any]) -> Dict[str, Any]:
        logger.error(f"Failing workflow due to error in node {node_id}: {str(error)}")
        raise error

class FallbackValueStrategy(ErrorHandlingStrategy):
    """Return fallback value on error"""
    
    def __init__(self, fallback_value: Any):
        self.fallback_value = fallback_value
    
    async def handle_error(self, node_id: str, error: Exception, 
                          state: Dict[str, Any]) -> Dict[str, Any]:
        logger.warning(
            f"Error in node {node_id}: {str(error)}. "
            f"Using fallback value."
        )
        state["current_data"] = self.fallback_value
        return state

class ConditionalRouter:
    """Handle conditional routing between nodes"""
    
    @staticmethod
    def evaluate_condition(condition: str, data: Any) -> bool:
        """
        Evaluate a condition expression
        
        Supported operators:
        - equals: value == target
        - not_equals: value != target
        - greater_than: value > target
        - less_than: value < target
        - contains: target in value
        - exists: field exists in data
        """
        try:
            if not condition:
                return True
            
            # Parse condition (simple format: "field operator value")
            parts = condition.split()
            if len(parts) < 2:
                return True
            
            field = parts[0]
            operator = parts[1]
            value = " ".join(parts[2:]) if len(parts) > 2 else None
            
            # Get field value from data
            field_value = ConditionalRouter._get_nested_value(data, field)
            
            # Evaluate based on operator
            if operator == "exists":
                return field_value is not None
            
            if operator == "equals" or operator == "==":
                return str(field_value) == value
            
            if operator == "not_equals" or operator == "!=":
                return str(field_value) != value
            
            if operator == "greater_than" or operator == ">":
                return float(field_value) > float(value)
            
            if operator == "less_than" or operator == "<":
                return float(field_value) < float(value)
            
            if operator == "contains":
                return value in str(field_value)
            
            return True
            
        except Exception as e:
            logger.warning(f"Error evaluating condition '{condition}': {str(e)}")
            return False
    
    @staticmethod
    def _get_nested_value(data: Any, path: str) -> Any:
        """Get nested value from data using dot notation"""
        if not isinstance(data, dict):
            return None
        
        keys = path.split('.')
        value = data
        
        for key in keys:
            if isinstance(value, dict):
                value = value.get(key)
            else:
                return None
        
        return value
    
    @staticmethod
    def route(connections: list, current_node_id: str, state: Dict[str, Any]) -> list:
        """
        Determine which connections to follow based on conditions
        
        Returns: List of target node IDs to execute
        """
        targets = []
        
        for conn in connections:
            if conn["sourceNodeId"] == current_node_id:
                condition = conn.get("condition")
                
                if not condition or ConditionalRouter.evaluate_condition(
                    condition, state.get("current_data")
                ):
                    targets.append(conn["targetNodeId"])
        
        return targets

# Enhanced Node Executor with retry and error handling
class EnhancedNodeExecutor:
    """Node executor with advanced features"""
    
    def __init__(
        self,
        base_executor,
        retry_config: Optional[RetryConfig] = None,
        error_strategy: Optional[ErrorHandlingStrategy] = None,
        timeout: Optional[float] = None
    ):
        self.base_executor = base_executor
        self.retry_config = retry_config or RetryConfig(max_attempts=1)
        self.error_strategy = error_strategy or FailWorkflowStrategy()
        self.timeout = timeout
    
    async def execute(self, input_data: Any) -> Any:
        """Execute with retry, timeout, and error handling"""
        
        @with_retry(self.retry_config)
        async def execute_with_retry():
            if self.timeout:
                return await asyncio.wait_for(
                    self.base_executor.execute(input_data),
                    timeout=self.timeout
                )
            return await self.base_executor.execute(input_data)
        
        try:
            return await execute_with_retry()
        except Exception as e:
            # Use error handling strategy
            state = {"current_data": input_data}
            updated_state = await self.error_strategy.handle_error(
                self.base_executor.node_id, e, state
            )
            return updated_state.get("current_data")

# Example workflow with advanced features
advanced_workflow_example = {
    "id": "workflow_advanced",
    "name": "Advanced Workflow with Retry and Conditions",
    "config": {
        "retry": {
            "max_attempts": 3,
            "initial_delay": 1.0,
            "exponential_base": 2.0
        },
        "timeout": 30.0
    },
    "nodes": [
        {
            "id": "trigger_1",
            "type": "On Clicking Execute",
            "name": "Start",
            "position": {"x": 100, "y": 200},
            "config": {}
        },
        {
            "id": "api_1",
            "type": "HTTP Request",
            "name": "Fetch Weather",
            "position": {"x": 300, "y": 200},
            "config": {
                "url": "https://api.weather.com/current?city={{input.city}}",
                "method": "GET",
                "retry": {"max_attempts": 3},
                "timeout": 10.0,
                "error_handling": "fallback",
                "fallback_value": {"temperature": 20, "condition": "unknown"}
            }
        },
        {
            "id": "condition_1",
            "type": "Condition",
            "name": "Check Temperature",
            "position": {"x": 500, "y": 200},
            "config": {
                "condition": "temperature > 25"
            }
        },
        {
            "id": "openai_hot",
            "type": "OpenAI",
            "name": "Hot Weather Message",
            "position": {"x": 700, "y": 100},
            "config": {
                "prompt": "Write a message about hot weather ({{input.temperature}}°C)",
                "model": "gpt-3.5-turbo"
            }
        },
        {
            "id": "openai_cold",
            "type": "OpenAI",
            "name": "Cold Weather Message",
            "position": {"x": 700, "y": 300},
            "config": {
                "prompt": "Write a message about cold weather ({{input.temperature}}°C)",
                "model": "gpt-3.5-turbo"
            }
        }
    ],
    "connections": [
        {
            "id": "conn_1",
            "sourceNodeId": "trigger_1",
            "targetNodeId": "api_1"
        },
        {
            "id": "conn_2",
            "sourceNodeId": "api_1",
            "targetNodeId": "condition_1"
        },
        {
            "id": "conn_3",
            "sourceNodeId": "condition_1",
            "targetNodeId": "openai_hot",
            "condition": "temperature > 25"
        },
        {
            "id": "conn_4",
            "sourceNodeId": "condition_1",
            "targetNodeId": "openai_cold",
            "condition": "temperature <= 25"
        }
    ]
}

# Circuit breaker pattern for fault tolerance
class CircuitBreaker:
    """Circuit breaker to prevent cascading failures"""
    
    def __init__(
        self,
        failure_threshold: int = 5,
        timeout: float = 60.0,
        expected_exception: type = Exception
    ):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.expected_exception = expected_exception
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    async def call(self, func: Callable, *args, **kwargs):
        """Execute function with circuit breaker protection"""
        
        if self.state == "OPEN":
            if asyncio.get_event_loop().time() - self.last_failure_time >= self.timeout:
                self.state = "HALF_OPEN"
            else:
                raise Exception("Circuit breaker is OPEN")
        
        try:
            result = await func(*args, **kwargs)
            if self.state == "HALF_OPEN":
                self.state = "CLOSED"
                self.failure_count = 0
            return result
            
        except self.expected_exception as e:
            self.failure_count += 1
            self.last_failure_time = asyncio.get_event_loop().time()
            
            if self.failure_count >= self.failure_threshold:
                self.state = "OPEN"
                logger.error(f"Circuit breaker opened after {self.failure_count} failures")
            
            raise e



# LangGraph Workflow Integration Guide

## Overview

This guide shows how to integrate LangGraph into your Next.js/FastAPI workflow automation platform while maintaining your existing frontend architecture.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js/React)                 │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Visual Flow │  │ Node Library │  │ Execution UI │      │
│  │   Editor    │  │              │  │              │      │
│  └─────────────┘  └──────────────┘  └──────────────┘      │
└───────────────────────────┬─────────────────────────────────┘
                            │ JSON Workflow Data
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (FastAPI + LangGraph)             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   FastAPI    │→ │  LangGraph   │→ │ Node Executor│     │
│  │   Endpoint   │  │ Orchestrator │  │   Factory    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Installation

### Backend Requirements

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn langgraph openai httpx pydantic python-multipart
```

### Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application
│   ├── models.py               # Pydantic models
│   ├── nodes.py                # Node implementations
│   ├── orchestrator.py         # LangGraph orchestrator
│   └── config.py               # Configuration
├── tests/
│   ├── test_nodes.py
│   ├── test_orchestrator.py
│   └── test_api.py
└── requirements.txt
```

## Key Concepts

### 1. Workflow Data Structure Adaptation

Your existing workflow JSON structure works perfectly with LangGraph. No changes needed! The orchestrator converts it internally:

- **Nodes** → LangGraph State Functions
- **Connections** → LangGraph Edges
- **Config** → Function Parameters

### 2. State Management

LangGraph uses a typed state object that flows through the graph:

```python
class WorkflowState(TypedDict):
    workflow_id: str
    execution_id: str
    current_data: Any          # Data flowing between nodes
    node_results: List[...]    # Accumulated execution logs
    errors: List[str]          # Error tracking
    started_at: str
```

### 3. Node Implementation Pattern

Each node type is implemented as an async executor:

```python
class NodeExecutor(ABC):
    async def execute(self, input_data: Any) -> Any:
        # Node logic here
        pass
```

## Usage Examples

### Basic Execution

```python
from app.models import WorkflowData
from app.orchestrator import LangGraphWorkflowOrchestrator

# Create orchestrator
orchestrator = LangGraphWorkflowOrchestrator(
    api_keys={"openai": "sk-..."}
)

# Execute workflow
result = await orchestrator.execute_workflow(
    workflow=workflow_data,
    initial_input={"topic": "AI"}
)

print(f"Status: {result.status}")
print(f"Output: {result.final_output}")
```

### Frontend Integration (React)

```typescript
// Execute workflow from frontend
const executeWorkflow = async (workflow, input) => {
  const response = await fetch('/api/v1/workflows/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflow, input })
  });
  
  return await response.json();
};

// With streaming for real-time updates
const executeWithStreaming = async (workflow, input) => {
  const response = await fetch('/api/v1/workflows/execute/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflow, input })
  });
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const text = decoder.decode(value);
    // Process SSE events
  }
};
```

## Advanced Features

### 1. Retry Logic

Configure automatic retries for unreliable operations:

```python
{
  "config": {
    "retry": {
      "max_attempts": 3,
      "initial_delay": 1.0,
      "exponential_base": 2.0
    }
  }
}
```

### 2. Error Handling Strategies

- **Ignore**: Continue execution despite errors
- **Fail**: Stop entire workflow
- **Fallback**: Use default value

### 3. Conditional Routing

Add conditions to connections:

```json
{
  "sourceNodeId": "condition_1",
  "targetNodeId": "branch_a",
  "condition": "temperature > 25"
}
```

### 4. Parallel Execution

Multiple connections from one node execute in parallel:

```json
{
  "connections": [
    {"sourceNodeId": "start", "targetNodeId": "branch_1"},
    {"sourceNodeId": "start", "targetNodeId": "branch_2"}
  ]
}
```

## Running the Server

```bash
# Development
uvicorn app.main:app --reload --port 8000

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/workflows/execute` | POST | Execute workflow |
| `/api/v1/workflows/execute/stream` | POST | Execute with streaming |
| `/api/v1/workflows/validate` | POST | Validate workflow |
| `/api/v1/workflows/{id}/status/{exec_id}` | GET | Get execution status |
| `/api/v1/node-types` | GET | List supported nodes |
| `/api/v1/configure` | POST | Configure API keys |

## Testing

```python
import pytest
from app.models import WorkflowData, WorkflowNode, WorkflowConnection

@pytest.mark.asyncio
async def test_simple_workflow():
    workflow = WorkflowData(
        id="test_1",
        name="Test Workflow",
        nodes=[
            WorkflowNode(
                id="node_1",
                type="On Clicking Execute",
                name="Start",
                position={"x": 0, "y": 0}
            )
        ],
        connections=[]
    )
    
    orchestrator = LangGraphWorkflowOrchestrator()
    result = await orchestrator.execute_workflow(workflow)
    
    assert result.status == "completed"
```

## Performance Considerations

1. **Async Execution**: All node executors are async for better performance
2. **Parallel Branches**: LangGraph automatically parallelizes independent branches
3. **Streaming**: Use streaming endpoint for long-running workflows
4. **Checkpointing**: LangGraph saves state at each step for recovery

## Security Best Practices

1. **API Key Management**: Store keys securely (environment variables, secrets manager)
2. **Input Validation**: All inputs are validated with Pydantic
3. **Rate Limiting**: Implement rate limiting for API endpoints
4. **Sandboxing**: Execute custom code in isolated environments

## Migration from Mock Engine

1. Keep your frontend code unchanged
2. Replace mock executor with LangGraph orchestrator
3. Implement real node executors (already provided)
4. Update API endpoint handlers
5. Test with existing workflows

## Troubleshooting

### Common Issues

**Issue**: Workflow validation fails
- Check for cycles in connections
- Ensure at least one entry node exists

**Issue**: Node execution fails
- Check API keys are configured
- Verify node configuration schema
- Check logs for specific error

**Issue**: Parallel branches don't execute
- Verify multiple connections from source node
- Check LangGraph version (>= 0.0.40)

## Next Steps

1. Implement additional node types for your use case
2. Add workflow persistence (database)
3. Implement execution history and replay
4. Add monitoring and observability
5. Create node marketplace/library

## Resources

- [LangGraph Documentation](https://python.langchain.com/docs/langgraph)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)


Summary
I've created a comprehensive integration solution for your workflow automation platform. Here's what I've provided:
📦 Core Components

Workflow Models - Pydantic models that maintain your existing JSON structure
Node Implementations - Async executors for Delay, OpenAI, HTTP Request, and more
LangGraph Orchestrator - Converts your visual workflows into LangGraph execution graphs
FastAPI Endpoints - RESTful API with validation, execution, and streaming support
Advanced Features - Retry logic, error handling, conditional routing, and circuit breakers

🎯 Key Answers to Your Questions
1. Data Structure Adaptation: Your existing structure works perfectly! No changes needed. The orchestrator internally converts:

Nodes → LangGraph state functions
Connections → Graph edges
Config → Function parameters

2. FastAPI Endpoint: The /api/v1/workflows/execute endpoint accepts your workflow JSON and orchestrates execution through LangGraph with full error handling and result tracking.
3. Node Implementation: Each node type (Delay, OpenAI, HTTP) is implemented as an async executor with support for variable interpolation ({{input.field}}), retries, and timeouts.
4. Data Flow: Uses LangGraph's WorkflowState TypedDict that accumulates results and passes data between nodes. Each node receives the previous node's output.
5. Error Handling: Multiple strategies (ignore, fail workflow, fallback value), automatic retries with exponential backoff, and circuit breaker pattern for fault tolerance.
6. Results & Logs: Complete execution result includes per-node status, outputs, execution times, and final workflow output - perfect for frontend visualization.
🚀 Key Features

✅ No frontend changes required
✅ Maintains existing API contracts
✅ Sequential, parallel, and conditional execution
✅ Streaming support for real-time updates
✅ Comprehensive error handling & retries
✅ Workflow validation endpoint
✅ Type-safe with Pydantic models
✅ Production-ready architecture

The implementation preserves your visual workflow approach while leveraging LangGraph's powerful orchestration capabilities. Your frontend can continue sending workflow JSON exactly as before!