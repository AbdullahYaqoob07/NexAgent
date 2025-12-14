# Timer-Based Workflow Example

This document explains how to create and test a timer-based workflow using the new LangGraph workflow engine.

## How It Works

The LangGraph workflow engine can handle timer-based workflows where execution is triggered after a certain delay. Here's how you can set it up:

## Frontend Workflow Definition

Create a workflow with the following structure:

```json
{
  "id": "timer-workflow-example",
  "name": "Timer-Based Workflow",
  "nodes": [
    {
      "id": "trigger",
      "type": "On Clicking Execute",
      "name": "Start Timer",
      "position": {"x": 100, "y": 100},
      "config": {}
    },
    {
      "id": "delay",
      "type": "Delay",
      "name": "Wait Period",
      "position": {"x": 300, "y": 100},
      "config": {
        "duration_ms": 60000  // 1 minute delay
      }
    },
    {
      "id": "action",
      "type": "HTTP Request",  // Or any other action node
      "name": "Perform Action",
      "position": {"x": 500, "y": 100},
      "config": {
        "url": "https://your-api-endpoint.com/webhook",
        "method": "POST",
        "body": "{\"message\": \"Timer triggered at {{timestamp}}\"}"
      }
    },
    {
      "id": "end",
      "type": "End",
      "name": "Finish",
      "position": {"x": 700, "y": 100},
      "config": {}
    }
  ],
  "connections": [
    {
      "id": "edge1",
      "sourceNodeId": "trigger",
      "targetNodeId": "delay",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "edge2",
      "sourceNodeId": "delay",
      "targetNodeId": "action",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "edge3",
      "sourceNodeId": "action",
      "targetNodeId": "end",
      "sourceHandle": "output",
      "targetHandle": "input"
    }
  ],
  "variables": {
    "timestamp": "{{now}}"
  }
}
```

## Testing the Workflow

1. **Create the workflow** in the frontend editor
2. **Save the workflow** to the backend
3. **Execute the workflow** by clicking the "Execute" button
4. **Observe** the execution:
   - The workflow starts immediately
   - It waits for the specified delay (e.g., 1 minute)
   - After the delay, it executes the next node
   - The final action is performed
   - The workflow completes

## API Endpoint

The workflow execution endpoint is:
```
POST /api/v1/workflows/{workflow_id}/execute
```

With request body:
```json
{
  "input": {
    "timestamp": "2025-12-13T10:30:00Z",
    "user_id": "user_123",
    "data": {}
  }
}
```

## Features Demonstrated

1. **Timer Functionality**: The Delay node properly waits for the specified duration
2. **Variable Interpolation**: Timestamps and other variables are interpolated in the HTTP request
3. **Error Handling**: If any node fails, the workflow uses the configured error strategy
4. **Checkpointing**: The workflow state is saved at each node for recovery
5. **Circuit Breakers**: External service calls are protected by circuit breakers

## Real-World Use Cases

1. **Scheduled Notifications**: Send reminders after a delay
2. **Batch Processing**: Process data at specific intervals
3. **Timeout Handling**: Cancel operations that take too long
4. **Retry Logic**: Automatically retry failed operations with exponential backoff
5. **Webhook Triggers**: Call external services after a delay

## Testing Your Implementation

To test that your timer-based workflow works:

1. Set a short delay (e.g., 5 seconds) for testing
2. Execute the workflow
3. Wait for the delay period
4. Verify that the subsequent nodes execute correctly
5. Check the execution logs to confirm timing

The system will handle the timing accurately and execute the workflow nodes in sequence after the delay period.