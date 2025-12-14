# LangGraph Workflow Engine

A comprehensive workflow execution engine built on top of LangGraph, designed to replace the mock workflow engine with a production-ready solution.

## Overview

This implementation provides a robust, scalable workflow engine with the following key features:

1. **State Management** - Comprehensive state tracking with checkpoints and recovery
2. **Node Execution** - Flexible node executor factory with error handling and retry logic
3. **Conditional Routing** - Advanced conditional logic for workflow branching
4. **Parallel Execution** - Support for parallel workflow branches with synchronization
5. **Circuit Breakers** - Fault tolerance to prevent cascading failures
6. **Data Flow** - Variable interpolation and data transformation between nodes
7. **Error Recovery** - Checkpointing and recovery mechanisms

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      FastAPI Endpoint Layer                      │
│                  (Receives workflow from frontend)               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  LangGraph Orchestrator                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. State Management (WorkflowState, StateManager)       │  │
│  │ 2. Circuit Breakers (per node/service)                  │  │
│  │ 3. Checkpoint Manager (auto-checkpointing)              │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
┌──────────────────────────┐  ┌─────────────────────────┐
│  Sequential Execution    │  │  Parallel Coordinator   │
│  - Node Executor Factory │  │  - Branch Manager       │
│  - Retry Logic           │  │  - Synchronization      │
│  - Timeout Management    │  │  - Result Merging       │
└──────────┬───────────────┘  └───────────┬─────────────┘
           │                               │
           └───────────┬───────────────────┘
                       │
                       ▼
           ┌────────────────────────┐
           │  Conditional Router    │
           │  - Route Evaluation    │
           │  - Multi-condition     │
           └───────────┬────────────┘
                       │
                       ▼
           ┌────────────────────────┐
           │  Data Flow Manager     │
           │  - Variable Extract    │
           │  - Interpolation       │
           │  - Type Conversion     │
           └────────────────────────┘
```

## Components

### 1. State Management (`state_management.py`)

- `WorkflowState`: TypedDict defining the complete workflow state structure
- `StateManager`: Utility class for state operations including:
  - Creating initial state
  - Merging parallel results
  - Updating node logs
  - Creating/restoring checkpoints
  - Generating execution summaries
  - Validating state integrity

### 2. Node Executor Factory (`executor_factory.py`)

- `NodeExecutorFactory`: Factory for creating node executors
- `NodeExecutor`: Base class for all node executors
- Error handling strategies:
  - `FAIL_FAST`: Stop execution immediately
  - `IGNORE`: Continue execution, log error
  - `FALLBACK`: Use fallback value
  - `RETRY`: Retry with backoff
  - `SKIP`: Skip node and continue
- Retry mechanisms with exponential backoff and jitter
- Timeout management for preventing stuck executions

### 3. Conditional Routing (`conditional_routing.py`)

- `ConditionalRouter`: Handles decision-making in workflows
- Supports 17 different condition operators:
  - `EQUALS`, `NOT_EQUALS`, `GREATER_THAN`, `LESS_THAN`, etc.
- Logical operations: `AND`, `OR`, `NOT`
- Complex condition parsing from multiple formats
- Dynamic routing based on data flowing through the workflow

### 4. Parallel Execution Coordinator (`parallel_coordinator.py`)

- `ParallelExecutionCoordinator`: Manages concurrent execution paths
- Automatic branch identification
- Concurrent execution with semaphore-based limiting
- Six merge strategies for combining results:
  - `COMBINE_DICT`, `COMBINE_LIST`, `FIRST`, `LAST`, `FASTEST`, `ALL_SUCCESS`, `ANY_SUCCESS`
- Synchronization points where parallel paths converge
- Deadlock detection

### 5. Circuit Breaker (`circuit_breaker.py`)

- `CircuitBreaker`: Implements the circuit breaker pattern
- Three-state pattern: `CLOSED`, `OPEN`, `HALF_OPEN`
- Failure threshold tracking
- Sliding window metrics
- Latency monitoring
- `CircuitBreakerRegistry`: Manages multiple circuit breakers

### 6. Data Flow System (`data_flow_system.py`)

- `DataFlowManager`: Handles data movement between nodes
- Nested value extraction using dot notation and array indexing
- Array wildcard support for extracting multiple values
- Variable interpolation in templates with transforms and type casting
- 15+ transform functions: `upper`, `lower`, `json`, `reverse`, etc.
- Deep merging of data structures
- `CrossNodeDataBus`: Centralized data store with versioning

### 7. Error Recovery (`error_recovery.py`)

- `CheckpointManager`: Manages checkpoint creation and storage
- Multiple checkpoint types: `MANUAL`, `AUTO`, `NODE`, `BRANCH`, `SYNC`, `ERROR`
- File-based checkpoint storage (extensible to databases/cloud)
- Multiple recovery strategies:
  - `RESTART_FROM_BEGINNING`
  - `RESUME_FROM_CHECKPOINT`
  - `RESUME_FROM_FAILED_NODE`
  - `SKIP_FAILED_NODE`
- Automatic recovery attempts
- Checkpoint cleanup

## Integration

### FastAPI Endpoints

The workflow engine is exposed through FastAPI endpoints in `backend/app/api/v1/workflows.py`:

- `POST /workflows/{workflow_id}/execute` - Execute a workflow
- Checkpoint and recovery endpoints
- Circuit breaker status monitoring

### Usage Example

```python
from lib.workflow.langgraph.orchestrator import WorkflowOrchestrator

# Create orchestrator
orchestrator = WorkflowOrchestrator(
    api_keys={"openai": "sk-..."},
    enable_checkpointing=True,
    enable_circuit_breakers=True
)

# Define workflow
workflow = {
    "id": "example-workflow",
    "nodes": [...],
    "connections": [...]
}

# Execute workflow
result = await orchestrator.execute_workflow(workflow, initial_input={"data": "value"})
```

## Extending the Engine

### Custom Node Executors

Create custom node executors by extending the `NodeExecutor` base class:

```python
from lib.workflow.langgraph.executor_factory import NodeExecutor

class CustomExecutor(NodeExecutor):
    def get_required_config_fields(self):
        return ["required_field"]
    
    async def _execute_impl(self, input_data):
        # Implementation here
        return output_data
```

Register with the orchestrator:
```python
orchestrator.register_node_executor("Custom Type", CustomExecutor)
```

## Testing

Run the test script to verify functionality:
```bash
python test_langgraph.py
```

## Key Benefits

1. **Production-Ready**: All components include proper error handling, logging, and type hints
2. **Highly Extensible**: Easy to add new node types, storage backends, or merge strategies
3. **Performance Optimized**: Async throughout, parallel execution, circuit breakers
4. **Fault Tolerant**: Checkpointing, recovery, retry logic, circuit breakers
5. **Clear Separation**: Each component is independent and testable
6. **Well Documented**: Inline docs, examples, and usage patterns

This implementation replaces the mock workflow engine with a robust, scalable solution that maintains your frontend-defined node approach while leveraging LangGraph's powerful orchestration capabilities.