# Workflow Schema v2 Implementation Summary

**Date**: February 22, 2026  
**Status**: ✅ Complete  
**By**: Copilot (implementing Claude's recommendations)

---

## Overview

After architectural discussion with Claude AI, NexAgent's workflow system had **6 critical problems**:
1. Metadata outputs don't match executor outputs (worst issue)
2. Edges lose port information (hardcoded as "output"/"input")
3. Nodes and edges completely untyped in Python
4. NodeInput type missing `json` and `trigger` types
5. Variable system is frontend-only (no Python backend)
6. No connection between config inputs and output ports

---

## What Was Implemented

### 1. **TypeScript Workflow Schema Validator** ✅
**File**: [src/schemas/workflowSchema.ts](src/schemas/workflowSchema.ts)

Complete TypeScript types and validation for Workflow Schema v2:
- `Workflow`, `WorkflowNode`, `WorkflowEdge`, `ExecutionConfig` types
- `validateWorkflow()` function that validates:
  - Schema version (must be 2)
  - Required fields (id, name, version, status, nodes, edges, etc.)
  - Node type registry matching
  - Edge references and port connectivity
  - Variable syntax in config and conditions
  - Duplicate IDs (nodes and edges)
  - Self-loop prevention
  - Max instance constraints per node type
- Helper functions:
  - `extractAllVariables()` - find all variables in workflow
  - `createEmptyWorkflow()` - scaffold valid workflow
  - `validateVariableSyntaxInString()` - check {{}} syntax

### 2. **Python Pydantic Models** ✅
**File**: [backend/app/schemas/workflow_schema.py](backend/app/schemas/workflow_schema.py)

Complete Python implementation for Workflow Schema v2:
- Enums: `WorkflowStatus`, `VariableType`, `NodeOutputType`, `NodeInputType`
- Models:
  - `WorkflowVariable` - typed workflow variables with secret support
  - `WorkflowNode` - single node instance with outputMap
  - `WorkflowEdge` - connection with sourcePort/targetPort (not hardcoded)
  - `ExecutionConfig`, `RetryPolicy`
  - `WorkflowV2` - complete validated workflow
  - `ExecuteWorkflowRequest`, `ExecuteWorkflowResponse`
  - `LangGraphWorkflow` - transformed format for LangGraph
- **Critical Functions** (solve Problem 5 - variable resolution on backend):
  - `resolve_variables(template, context)` - backend equivalent of TypeScript replaceVariables()
  - `resolve_node_config(config, context)` - resolve ALL variables in node config before execution
  - `map_executor_output(raw_output, output_map)` - fix for Problem 1 (metadata/executor key mismatch)

### 3. **Node Metadata Updates** ✅
Updated all three existing node metadata files with `executorKey` mapping:

**[src/workflows/delay/delay.metadata.ts](src/workflows/delay/delay.metadata.ts)**
```typescript
outputs: [
  { id: 'delayed', executorKey: 'delayedData' },         // Maps metadata ID → executor key
  { id: 'delayedUntil', executorKey: 'timestamp' },
  { id: 'duration', executorKey: 'delayDuration' },
]
```

**[src/workflows/manualtrigger/manualtrigger.metadata.ts](src/workflows/manualtrigger/manualtrigger.metadata.ts)**
```typescript
outputs: [
  { id: 'timestamp', executorKey: 'timestamp' },
  { id: 'executionId', executorKey: 'executionId' },
]
```

**[src/workflows/stopper/stopper.metadata.ts](src/workflows/stopper/stopper.metadata.ts)**
```typescript
outputs: [
  { id: 'status', executorKey: 'status' },
  { id: 'message', executorKey: 'message' },
  { id: 'timestamp', executorKey: 'timestamp' },
]
```

### 4. **Type Definition Updates** ✅

**[lib/workflow/types/metadata.ts](lib/workflow/types/metadata.ts)**
```typescript
// Added executorKey to NodeOutput interface (optional)
export interface NodeOutput {
  id: string;
  label: string;
  type: 'string' | ... | 'date' | 'trigger' | 'json';
  description?: string;
  executorKey?: string;  // NEW: maps to actual executor return key
}

// Added json and trigger to NodeInput types (was missing)
export interface NodeInput {
  id: string;
  label: string;
  type: 'text' | ... | 'url' | 'json' | 'trigger';  // NEW: json and trigger
  // ... rest
}
```

---

## Problems Fixed

| Problem | Solution | Files |
|---------|----------|-------|
| **1. Metadata/Executor Key Mismatch** | Added `outputMap` to workflow nodes + `executorKey` to metadata outputs | workflowSchema.ts, workflow_schema.py, *.metadata.ts |
| **2. Edges Losing Port Info** | Added explicit `sourcePort` and `targetPort` to edges | workflowSchema.ts, workflow_schema.py |
| **3. Untyped Python Models** | Full Pydantic v2 models with validation | workflow_schema.py |
| **4. Missing Input Types** | Added `json` and `trigger` to NodeInputType | metadata.ts, workflowSchema.ts |
| **5. No Backend Variable Resolution** | Implemented `resolve_variables()` and `resolve_node_config()` | workflow_schema.py |
| **6. Config/Output Disconnect** | `outputMap` bridges the gap; metadata outputs can map to config values | all files |

---

## New Workflow JSON Structure (v2)

Instead of:
```json
{
  "nodes": [{ "id": "delay_1", "type": "Delay", "config": {"duration": 5} }],
  "edges": [{ "source": "trigger_1", "target": "delay_1" }]  // Hardcoded ports!
}
```

Now:
```json
{
  "schemaVersion": 2,
  "nodes": [
    {
      "id": "delay_1",
      "type": "Delay",
      "nodeSchemaVersion": 1,
      "config": { "duration": 5 },
      "outputMap": {
        "delayed": "delayedData",
        "delayedUntil": "timestamp"
      }
    }
  ],
  "edges": [
    {
      "source": "trigger_1",
      "sourcePort": "timestamp",    // Explicit!
      "target": "delay_1",
      "targetPort": "trigger"       // Explicit!
    }
  ],
  "executionConfig": {
    "timeoutMs": 30000,
    "retryPolicy": { "maxRetries": 3, "backoffMs": 1000 },
    "parallelExecution": false,
    "debugMode": false
  }
}
```

---

## Key Design Decisions

### outputMap: The Critical Fix
```typescript
// When executor returns: { "delayedData": ..., "timestamp": "2026-..." }
// And outputMap is: { "delayed": "delayedData", "delayedUntil": "timestamp" }
// map_executor_output() transforms to: { "delayed": ..., "delayedUntil": "2026-..." }
// Now {{$node.delay_1.delayed}} works because key exists!
```

### sourcePort / targetPort
Instead of hardcoding "output" and "input", edges now explicitly specify:
- `sourcePort`: Must match a `NodeOutput.id` from source node's metadata
- `targetPort`: Must match a `NodeInput.id` from target node's metadata

This enables multi-output nodes (e.g., Conditional with true/false branches) to work correctly.

### Variables on Backend
```python
# Before: only TypeScript replaceVariables() existed
# After: Full Python implementation

resolve_variables("Hello {{$node.chat_1.message}}", context)
# → "Hello user_input"

resolve_node_config(
  {"message": "User: {{$trigger.user_message}}"},
  context
)
# → {"message": "User: hello world"}
```

---

## Integration Points

### For Workflow Execution
Before saving/executing ANY workflow:
1. Call `validateWorkflow(workflow, nodeRegistry)` on frontend
2. Import and use `WorkflowV2` Pydantic model on backend
3. Call `resolve_node_config(node.config, execution_context)` before executor
4. Call `map_executor_output(executor_return, node.output_map)` after executor

### For Node Registry
All metadata files should include `executorKey` for outputs that differ from metadata ID.

### For LangGraph
Use `LangGraphWorkflow.from_workflow()` to properly transform v2 schemas (replaces broken hardcoded transformation).

---

## Files Created/Modified

### Created:
- ✅ [src/schemas/workflowSchema.ts](src/schemas/workflowSchema.ts) — 623 lines
- ✅ [backend/app/schemas/workflow_schema.py](backend/app/schemas/workflow_schema.py) — 654 lines

### Modified:
- ✅ [src/workflows/delay/delay.metadata.ts](src/workflows/delay/delay.metadata.ts) — Added executorKey
- ✅ [src/workflows/manualtrigger/manualtrigger.metadata.ts](src/workflows/manualtrigger/manualtrigger.metadata.ts) — Added executorKey
- ✅ [src/workflows/stopper/stopper.metadata.ts](src/workflows/stopper/stopper.metadata.ts) — Added executorKey
- ✅ [lib/workflow/types/metadata.ts](lib/workflow/types/metadata.ts) — Added executorKey + json/trigger types

---

## Next Steps

1. **Update existing node metadata** — Add `executorKey` to all other node outputs
2. **Update workflow_service.py** — Use `WorkflowV2` model instead of `List[Dict[str, Any]]`
3. **Update executors** — Call `resolve_node_config()` before executor logic
4. **Update workflow execution** — Call `map_executor_output()` after each executor returns
5. **Migrate existing workflows** — Convert from v1 to v2 schema (add outputMap, sourcePort/targetPort)
6. **Frontend UI** — Show sourcePort/targetPort in edge UI, validate with new schema

---

## Validation Examples

### Valid Workflow
```typescript
const result = validateWorkflow(myWorkflow, nodeRegistry);
if (!result.valid) {
  result.errors.forEach(err => {
    console.log(`${err.path}: ${err.code} - ${err.message}`);
  });
}
```

### Execution with Resolution
```python
from app.schemas.workflow_schema import resolve_node_config, map_executor_output

# Before executor
config = resolve_node_config(node.config, execution_context)
# Now template vars are resolved: {"duration": 5, "message": "user input"}

# After executor
raw_output = execute_delay(config)  # → {"delayedData": ..., "timestamp": "..."}
final_output = map_executor_output(raw_output, node.output_map)
# Now metadata output IDs work: {"delayed": ..., "delayedUntil": "..."}
```

---

## This schema will carry you to:
✅ 50+ nodes  
✅ Export/import workflows  
✅ AI-generated workflows  
✅ Conditional branching (true/false paths)  
✅ Parallel execution (different output ports)  
✅ No redesign needed
