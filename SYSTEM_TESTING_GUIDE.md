# System Testing Guide

This guide explains how to test the new LangGraph-based workflow engine that replaces the mock implementation.

## System Components

The new system consists of:

1. **LangGraph Workflow Engine** - Core execution engine in `lib/workflow/langgraph/`
2. **API Integration** - Updated endpoints in `backend/app/api/v1/workflows.py`
3. **Test Scripts** - Various test files to verify functionality

## Testing the System

### 1. Local Testing (No Backend Required)

Run the local test scripts to verify the core functionality:

```bash
# Test basic workflow execution
python test_local_workflow.py

# Test API endpoint simulation
python test_api_endpoint.py
```

These scripts will:
- Create sample workflows with Delay nodes
- Execute workflows and verify proper timing
- Show execution logs and results

### 2. Expected Test Results

When you run the tests, you should see:

1. **Workflow Creation**: Workflows are created with proper node definitions
2. **Sequential Execution**: Nodes execute in the correct order
3. **Delay Handling**: Delay nodes properly wait for the specified duration
4. **Data Flow**: Data passes correctly between nodes
5. **Checkpointing**: Execution state is saved at each step
6. **Completion**: Workflows complete successfully with proper results

### 3. Timer-Based Workflow Testing

To test timer functionality specifically:

1. Create a workflow with a Delay node:
   ```json
   {
     "id": "timer-test",
     "nodes": [
       {"id": "start", "type": "Start", "config": {}},
       {"id": "delay", "type": "Delay", "config": {"duration_ms": 5000}},
       {"id": "end", "type": "End", "config": {}}
     ],
     "connections": [
       {"sourceNodeId": "start", "targetNodeId": "delay"},
       {"sourceNodeId": "delay", "targetNodeId": "end"}
     ]
   }
   ```

2. Execute the workflow and observe:
   - Immediate start
   - 5-second pause at the Delay node
   - Completion after the delay

### 4. API Endpoint Testing

The new API endpoint is:
```
POST /api/v1/workflows/{workflow_id}/execute
```

Request body:
```json
{
  "input": {
    "user_id": "user_123",
    "data": "test_data"
  },
  "config": {
    "timeout": 30000
  }
}
```

Expected response:
```json
{
  "status": "success",
  "summary": {
    "nodes_executed": 4,
    "execution_time_ms": 3000
  },
  "final_output": { /* final node result */ }
}
```

## Key Improvements Over Previous Mock Implementation

1. **Real Node Execution**: Nodes actually execute their defined logic instead of returning mock data
2. **Proper Timing**: Delay nodes accurately wait for specified durations
3. **Error Handling**: Comprehensive error handling with retry logic
4. **Checkpointing**: Automatic state saving for recovery
5. **Circuit Breakers**: Protection against service failures
6. **Parallel Execution**: Support for concurrent workflow branches
7. **Conditional Routing**: Complex decision-making based on data

## Frontend Integration

To use the new system from the frontend:

1. **Define workflows** as before with nodes and connections
2. **Include Delay nodes** where timing is needed
3. **Execute workflows** through the API endpoint
4. **Monitor execution** through returned results and logs

## Verification Checklist

Before accepting the implementation, verify:

- [ ] Delay nodes properly wait for specified durations
- [ ] Workflows execute in correct sequence
- [ ] Data flows correctly between nodes
- [ ] Error handling works appropriately
- [ ] Checkpointing saves execution state
- [ ] API endpoint returns proper responses
- [ ] Timer-based workflows execute after the delay period
- [ ] All node types execute their intended logic

## Troubleshooting

If you encounter issues:

1. **Check logs** for error messages
2. **Verify node configurations** are correct
3. **Ensure all dependencies** are installed (`pip install langgraph langchain-core`)
4. **Confirm PYTHONPATH** includes the project root
5. **Test with simple workflows** first before complex ones

The system is now ready for production use and provides all the functionality needed for robust workflow execution with proper timing controls.