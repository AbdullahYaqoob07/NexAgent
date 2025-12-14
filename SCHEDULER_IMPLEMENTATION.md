# Scheduler Implementation Guide

## Overview

The scheduler system allows workflows with Schedule nodes to run automatically on a recurring basis using cron expressions. When you execute a workflow with a Schedule node, it starts a background scheduler that runs the workflow at the specified intervals.

## Features

### ✅ Validation Before Execution
- All nodes are validated before execution starts
- Missing required fields are caught and displayed
- Workflow won't execute until all nodes are properly configured
- Clear error messages show which nodes have configuration issues

### ✅ Scheduler System
- **Automatic Scheduling**: When a workflow with a Schedule node is executed, it automatically starts a scheduler
- **Cron Support**: Uses cron expressions (e.g., `*/1 * * * *` for every minute)
- **Start/Stop Control**: Execute button changes to Stop button when scheduler is running
- **Status Monitoring**: Frontend polls scheduler status every 5 seconds
- **Background Execution**: Workflows run automatically in the background at scheduled times

## How It Works

### 1. Workflow Execution Flow

```
User clicks Execute
    ↓
Frontend validates all node configs
    ↓
If validation fails → Show errors, don't execute
    ↓
If validation passes → Send to backend
    ↓
Backend checks for Schedule node
    ↓
If Schedule node found:
    - Register with scheduler service
    - Start scheduler loop
    - Return "scheduled" status
    ↓
If no Schedule node:
    - Execute workflow immediately
    - Return execution results
```

### 2. Scheduler Service

The `WorkflowScheduler` class manages scheduled jobs:

- **Job Registration**: Each scheduled workflow gets a unique job ID
- **Cron Parsing**: Validates and parses cron expressions using `croniter`
- **Background Loop**: Each job runs in its own async task
- **Next Run Calculation**: Calculates when the workflow should run next
- **Automatic Execution**: Executes the workflow at scheduled times
- **Stop Control**: Can be stopped via API endpoint

### 3. Frontend Integration

- **Execute Button**: 
  - Shows "Execute" when scheduler is not running
  - Shows "Stop" (red) when scheduler is running
  - Disabled during execution
  
- **Status Polling**: 
  - Checks scheduler status every 5 seconds
  - Updates button state automatically
  
- **Validation Display**:
  - Shows configuration errors before execution
  - Highlights nodes with errors
  - Prevents execution until fixed

## API Endpoints

### Execute Workflow (with Schedule detection)
```
POST /api/v1/workflows/{workflow_id}/execute
```

If workflow has Schedule node:
- Registers with scheduler
- Starts scheduler
- Returns `status: "scheduled"` with `scheduler_job_id`

### Stop Scheduler
```
POST /api/v1/workflows/{workflow_id}/scheduler/stop
```

Stops the scheduler for a workflow.

### Get Scheduler Status
```
GET /api/v1/workflows/{workflow_id}/scheduler/status
```

Returns:
```json
{
  "scheduled": true,
  "status": "running",
  "job_id": "job_abc123",
  "cron": "*/1 * * * *",
  "next_run": "2024-01-15T10:01:00Z",
  "last_run": "2024-01-15T10:00:00Z",
  "run_count": 5
}
```

## Usage Example

### 1. Create a Workflow with Schedule Node

1. Add a **Schedule** node
2. Configure cron expression (e.g., `*/1 * * * *` for every minute)
3. Add other nodes (e.g., HTTP Request)
4. Connect them

### 2. Configure All Nodes

- **Schedule Node**: Must have `cron` field
- **HTTP Request Node**: Must have `url` field
- All required fields must be filled

### 3. Execute

1. Click **Execute** button
2. If validation fails → Fix errors shown
3. If validation passes → Scheduler starts
4. Button changes to **Stop** (red)
5. Workflow runs automatically at scheduled times

### 4. Stop Scheduler

1. Click **Stop** button
2. Scheduler stops
3. Button changes back to **Execute**

## Validation Errors

When a node is not properly configured, you'll see:

```
Configuration Errors:

HTTP Request (HTTP Request):
  • Missing required config field: 'url'

OpenAI GPT (OpenAI GPT):
  • Missing required config field: 'prompt'
```

The workflow will **NOT execute** until all errors are fixed.

## Cron Expression Examples

- `*/1 * * * *` - Every minute
- `0 */5 * * *` - Every 5 minutes
- `0 0 * * *` - Every hour
- `0 0 0 * *` - Every day at midnight
- `0 0 * * 1` - Every Monday at midnight

## Technical Details

### Scheduler Service Location
- `lib/workflow/langgraph/scheduler.py`

### Schedule Node Executor
- `lib/workflow/langgraph/nodes/triggers.py` → `ScheduleTriggerExecutor`

### Frontend Components
- `components/workflows/WorkflowEditor.tsx` - Main editor with validation
- `components/workflows/WorkflowToolbar.tsx` - Execute/Stop button
- `lib/workflow/utils/validateWorkflow.ts` - Validation logic

### Backend Endpoints
- `backend/app/api/v1/workflows.py` - Execute, stop, status endpoints

## Troubleshooting

### Scheduler Not Running
- Check if `croniter` is installed: `pip install croniter`
- Check backend logs for scheduler errors
- Verify cron expression is valid

### Validation Errors Not Showing
- Check browser console for errors
- Ensure `validateWorkflow.ts` is imported correctly
- Check that node types are properly mapped

### Stop Button Not Appearing
- Check scheduler status endpoint is working
- Verify workflow has Schedule node
- Check frontend polling is active (every 5 seconds)

## Next Steps

1. ✅ Validation before execution - DONE
2. ✅ Scheduler service - DONE
3. ✅ Execute/Stop button - DONE
4. ✅ Status polling - DONE
5. ⏳ Test end-to-end flow

The system is now ready to test! Try creating a workflow with Schedule and HTTP nodes, configure them properly, and execute to see the scheduler in action.

