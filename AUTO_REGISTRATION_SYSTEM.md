# Node Auto-Registration System - Architecture & Implementation

**Status:** ✅ Complete (Ready for Metadata Definitions)

## Overview

This document explains the auto-registration system for workflow nodes. Instead of manually maintaining registration lists in Python, the system:

1. **Single Source of Truth:** Node metadata is defined once in TypeScript (`metadata.ts`)
2. **Automatic Discovery:** Build script generates `shared/nodes-metadata.json` from all metadata files
3. **Smart Registration:** Python orchestrator auto-imports executors and registers types + aliases
4. **Type Consistency:** Frontend and backend metadata stay in sync

## System Architecture

```
src/workflows/
├── DelayNode/
│   ├── metadata.ts          ← Define metadata here (type, executor, aliases)
│   ├── executor.ts          ← Node logic lives here
│   └── ...
├── ScheduleNode/
│   ├── metadata.ts
│   ├── executor.ts
│   └── ...
└── ... (all other nodes)
        ↓ [npm run build:metadata]
shared/
└── nodes-metadata.json      ← Auto-generated (canonical types + aliases)
        ↓ [orchestrator._register_node_types()]
lib/workflow/langgraph/
└── orchestrator.py          ← Loads metadata and auto-registers with ExecutorFactory
```

## Components

### 1. TypeScript Metadata Definition

**File:** `src/workflows/[NodeName]/metadata.ts`

```typescript
export const metadata = {
  type: 'Delay',                    // Canonical type (what backend sends)
  executor: 'DelayExecutor',        // Python class name (exact match)
  category: 'Logic',                // UI organization
  description: 'Pause workflow...',
  color: '#8B5CF6',
  aliases: [
    'DelayNode',                    // Frontend might use these
    'DelayAction',
    'Wait',
  ],
  // ... other UI metadata
} as const;
```

### 2. Build Script

**File:** `scripts/generate-nodes-metadata.js`

**Purpose:** Extracts metadata from all TypeScript files and generates JSON

**Process:**
1. Finds all `metadata.ts` files in `src/workflows/*/`
2. Parses TypeScript objects using regex
3. Extracts: type, executor, aliases, category, description, color
4. Validates: ensures `type` and `executor` are present
5. Generates `shared/nodes-metadata.json`

**Usage:**
```bash
npm run build:metadata      # Runs before next dev/build
node scripts/generate-nodes-metadata.js  # Manual run
```

### 3. JSON Output Structure

**File:** `shared/nodes-metadata.json`

```json
{
  "version": "1.0.0",
  "generated": "2026-02-22T18:30:05.439Z",
  "nodeCount": 2,
  "categories": ["Logic", "Triggers"],
  "nodes": [
    {
      "type": "Delay",
      "executor": "DelayExecutor",
      "category": "Logic",
      "description": "Pause workflow for specified duration",
      "color": "#8B5CF6",
      "aliases": ["DelayNode", "DelayAction", "Wait"],
      "filePath": "DelayNode/metadata.ts"
    },
    {
      "type": "Schedule",
      "executor": "ScheduleTriggerExecutor",
      "category": "Triggers",
      "description": "Trigger workflow on schedule",
      "color": "#3B82F6",
      "aliases": ["ScheduleTriggerNode", "Scheduling"],
      "filePath": "ScheduleNode/metadata.ts"
    }
  ]
}
```

### 4. Python Orchestrator Auto-Registration

**File:** `lib/workflow/langgraph/orchestrator.py`

**Method:** `_register_node_types()`

**Process:**

```python
def _register_node_types(self):
    # 1. Load nodes-metadata.json
    metadata = json.load('shared/nodes-metadata.json')
    
    # 2. For each node in metadata:
    for node_meta in metadata['nodes']:
        # 3. Dynamically load executor class
        executor_class = self._load_executor_class(node_meta['executor'])
        
        # 4. Register canonical type
        factory.register_executor(node_meta['type'], executor_class)
        
        # 5. Register all aliases to same executor
        for alias in node_meta['aliases']:
            factory.register_executor(alias, executor_class)
    
    # 6. Done! All types + aliases are now mapped to executors
```

**Benefits:**
- ✅ No manual registration list needed
- ✅ Single source of truth (TypeScript metadata)
- ✅ Frontend → Backend mapping is automatic
- ✅ Adding new nodes requires only: metadata.ts + executor class

## How to Add a New Node

### Step 1: Create Metadata File

**File:** `src/workflows/MyNodeName/metadata.ts`

```typescript
export const metadata = {
  type: 'MyNodeName',              // Used in workflows.json
  executor: 'MyNodeNameExecutor',  // Must match Python class name exactly
  category: 'Actions',             // or 'Triggers', 'Logic', 'Data', etc.
  description: 'What does this node do?',
  color: '#F97316',                // Or any gradient color from palette
  aliases: [
    'MyNode',                       // Alternative names frontend might use
    'MyAction',
  ],
} as const;
```

### Step 2: Create Python Executor

**File:** `lib/workflow/langgraph/nodes/actions/executors.py`

```python
class MyNodeNameExecutor(BaseNodeExecutor):
    """Execute MyNodeName node"""
    
    async def execute(self, node_data, context, variables):
        # Extract config from node_data.config
        # Process inputs
        # Return output
        return {"output_key": "value"}
```

### Step 3: Run Build Script

```bash
npm run build:metadata
```

This generates updated `shared/nodes-metadata.json`

### Step 4: Done!

- Frontend can use: `"type": "MyNodeName"` or any alias
- Backend automatically registers the executor
- No manual Python registration needed!

## Type Mapping Example

**Workflow sends:** 
```json
{
  "nodeId": "delay-1",
  "type": "Wait"           // ← Alias from metadata
}
```

**Metadata says:**
```json
{
  "type": "Delay",
  "aliases": ["Wait"]      // ← Maps "Wait" to "Delay"
}
```

**Orchestrator does:**
```python
# Load from metadata
node_type = "Wait"
metadata = find_metadata_by_alias("Wait")  # Returns: {type: "Delay", ...}

# Register both canonical type AND alias
executor = load_executor_class("DelayExecutor")
factory.register_executor("Delay", executor)
factory.register_executor("Wait", executor)

# Execute: "Wait" → finds "DelayExecutor", runs correctly
```

## Fallback Legacy Mode

If `shared/nodes-metadata.json` is not found:

```python
def _register_node_types(self):
    try:
        # Try auto-registration from JSON
        self._register_node_types_auto()
    except FileNotFoundError:
        # Fallback to legacy manual registration
        logger.warning("Falling back to legacy mode")
        self._register_node_types_legacy()
```

Legacy mode is frozen at current registration list and is deprecated.

## Validation & Quality Checks

### Build Script Validates:

✅ **Type Uniqueness**
```
Error: Duplicate node type "Delay" found
```

✅ **Required Fields**
```
Error: Missing 'executor' in metadata for node type "MyNode"
```

✅ **Executor Availability**
```
Warning: Could not load executor class "DelayExecutor"
```

### Python Validates:

✅ **Class Existence**
```python
# Tries multiple import paths
['lib.workflow.langgraph.nodes.logic',
 'lib.workflow.langgraph.nodes.actions',
 'lib.workflow.langgraph.nodes']
```

✅ **Type Registration**
```python
# Logs all registered types
INFO: Registered 20 node types from metadata
```

## Development Workflow

### Adding New Node Types:

1. **Create metadata.ts** in `src/workflows/MyNode/`
2. **Create executor.py** in `lib.workflow.langgraph.nodes.*`
3. **Run:** `npm run build:metadata`
4. **Verify:** Check `shared/nodes-metadata.json` was updated
5. **Test:** Call workflow with new node type

### Updating Aliases:

1. **Edit metadata.ts** (aliases array)
2. **Run:** `npm run build:metadata`
3. **Restart backend** (picks up new JSON)

### Adding Executor Logic:

1. **Edit executor.py** (node logic)
2. **No rebuild needed** (executor is already registered)
3. **Restart backend** if Python code changed

## File Structure Reference

```
NexAgent/
├── scripts/
│   └── generate-nodes-metadata.js     ← Build script
│
├── shared/
│   └── nodes-metadata.json            ← Auto-generated
│
├── src/workflows/
│   ├── DelayNode/
│   │   ├── metadata.ts                ← Defines type/executor/aliases
│   │   ├── executor.ts
│   │   ├── config.ts
│   │   └── ...
│   ├── ScheduleNode/
│   │   ├── metadata.ts
│   │   └── ...
│   └── ... (other nodes)
│
└── lib/workflow/langgraph/
    ├── orchestrator.py                ← Auto-registers from JSON
    └── nodes/
        ├── logic/
        │   └── executors.py           ← DelayExecutor, etc.
        ├── triggers/
        │   └── executors.py
        ├── actions/
        │   └── executors.py
        └── ...
```

## Benefits of This System

| Aspect | Before | After |
|--------|--------|-------|
| **Registration** | Manual list in Python | Auto from metadata |
| **Aliases** | Duplicated in Python | Single source (TypeScript) |
| **Adding Node** | Edit 2+ files | Edit 1 metadata.ts |
| **Sync Issues** | Frontend ≠ Backend | Always in sync |
| **Discoverability** | Buried in code | Clear JSON structure |
| **Validation** | Manual checking | Automated (build script) |

## Future Enhancements

- [ ] JSON Schema validation for metadata.ts
- [ ] IDE autocomplete for metadata fields
- [ ] Frontend node picker auto-populated from JSON
- [ ] Node categories with icons auto-generated
- [ ] API docs auto-generated from metadata
- [ ] Type checking: executor class exists and matches signature

## Troubleshooting

### Issue: "Undefined executor 'MyNodeNameExecutor'"

**Solution:** Ensure executor class name in metadata.ts matches Python class name exactly

### Issue: nodes-metadata.json is empty

**Solution:** Run `npm run build:metadata` - script may not have found metadata.ts files

### Issue: "Alias not registered"

**Solution:** Rebuild: `npm run build:metadata`, then restart backend

### Issue: "Could not load executor class"

**Solution:** Executor class not found in import paths. Check:
1. Python file in correct directory
2. Class name matches metadata exactly
3. No import errors in executor file

## Conclusion

This system ensures:
- ✅ Single source of truth for node metadata
- ✅ Frontend and backend stay synchronized
- ✅ Zero manual registration lists to maintain
- ✅ Adding new nodes is straightforward
- ✅ Type safety and discoverability for all nodes
