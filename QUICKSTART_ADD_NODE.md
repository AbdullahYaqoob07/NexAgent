# Quick Start: Adding a New Node with Auto-Registration

This guide shows exactly how to add a new node using the auto-registration system.

## Example: Adding a "SendSMS" Node

Let's walk through adding a simple SendSMS action node.

### Step 1: Create the Metadata File

**File:** `src/workflows/SendSmsNode/metadata.ts`

```typescript
export const metadata = {
  type: 'SendSMS',
  executor: 'SendSmsExecutor',
  category: 'Actions',
  description: 'Send SMS message to phone number',
  color: '#F97316',
  aliases: [
    'SendSmsNode',
    'SendTextMessage',
    'SMS',
  ],
} as const;
```

### Step 2: Create the Executor

**File:** `lib/workflow/langgraph/nodes/actions/executors.py`

Add this class to the existing executors file:

```python
from base import BaseNodeExecutor
import logging

logger = logging.getLogger(__name__)

class SendSmsExecutor(BaseNodeExecutor):
    """
    Execute SendSMS node - sends SMS message to phone number
    """
    
    async def execute(self, node_data: dict, context: dict, variables: dict):
        """
        Execute SMS sending
        
        Config expected:
        {
            "phoneNumber": "+1234567890",
            "message": "Hello from workflow"
        }
        
        Variables will be interpolated in message
        """
        
        config = node_data.get('config', {})
        phone_number = config.get('phoneNumber')
        message = config.get('message', '')
        
        if not phone_number:
            raise ValueError("phoneNumber is required in config")
        
        # Interpolate variables in message
        message = self._interpolate_variables(message, variables)
        
        logger.info(f"Sending SMS to {phone_number}: {message}")
        
        # TODO: Call SMS service (Twilio, etc.)
        # result = await sms_service.send(phone_number, message)
        
        return {
            'success': True,
            'phoneNumber': phone_number,
            'messageLength': len(message),
            'timestamp': datetime.now().isoformat(),
        }
```

### Step 3: Build the Metadata

```bash
npm run build:metadata
```

You should see:
```
Generating node metadata...
Scanning: D:\...\src\workflows
Found 1 metadata files
  Processing: SendSmsNode/metadata.ts
Generated: D:\...\shared\nodes-metadata.json
Summary:
   Total nodes: 1
   Categories: Actions
   Generated: 2026-02-22T18:35:00.000Z
```

### Step 4: Verify the JSON

**File:** `shared/nodes-metadata.json`

```json
{
  "version": "1.0.0",
  "generated": "2026-02-22T18:35:00.000Z",
  "nodeCount": 1,
  "categories": ["Actions"],
  "nodes": [
    {
      "type": "SendSMS",
      "executor": "SendSmsExecutor",
      "category": "Actions",
      "description": "Send SMS message to phone number",
      "color": "#F97316",
      "aliases": ["SendSmsNode", "SendTextMessage", "SMS"],
      "filePath": "SendSmsNode/metadata.ts"
    }
  ]
}
```

### Step 5: Restart the Backend

The orchestrator will:
1. Load `shared/nodes-metadata.json`
2. Find `SendSMS` node metadata
3. Dynamically import `SendSmsExecutor` from Python
4. Register both type AND aliases:
   - `"SendSMS"` → `SendSmsExecutor`
   - `"SendSmsNode"` → `SendSmsExecutor`
   - `"SendTextMessage"` → `SendSmsExecutor`
   - `"SMS"` → `SendSmsExecutor`

### Step 6: Use in Workflow

**Frontend can now send:**

```json
{
  "id": "sms-node-1",
  "type": "SendSMS",              // or any alias: "SMS", "SendTextMessage", etc.
  "config": {
    "phoneNumber": "+1234567890",
    "message": "Hello {{userName}}"
  },
  "inputs": []
}
```

**Backend will:**
1. Receive `"type": "SendSMS"`
2. Look up in metadata → finds `SendSmsExecutor`
3. Import and execute: `SendSmsExecutor.execute()`
4. Return result

## Common Mistakes & How to Fix

### ❌ Mistake 1: Executor Name Doesn't Match

**metadata.ts:**
```typescript
executor: 'SendSmsExecutor'  // Correct
```

**Python file:**
```python
class SendSMSExecutor:  # ❌ Wrong! (SMSvsSms casing)
    pass
```

**Fix:** Match exactly: `SendSmsExecutor`

### ❌ Mistake 2: Metadata Type Doesn't Match Workflow

**metadata.ts:**
```typescript
type: 'SendSMS'
```

**Workflow uses:**
```json
{ "type": "Send SMS" }  // ❌ Different from metadata type!
```

**Fix:** Use alias or match type exactly

**Better:** Add alias in metadata:
```typescript
aliases: ['Send SMS', 'SendSMS', 'SMS']
```

### ❌ Mistake 3: Forgot to Rebuild

**Changed:** `metadata.ts` aliases
**Forgot:** `npm run build:metadata`
**Result:** Changes don't appear in `nodes-metadata.json`

**Fix:** Always rebuild after metadata changes:
```bash
npm run build:metadata
```

## Checking Registration

### Check what types are registered:

**Python:**
```python
factory = ExecutorFactory()
print(factory.get_registered_types())
# Output: ['SendSMS', 'SendSmsNode', 'SendTextMessage', 'SMS', ...]
```

### Check metadata was loaded:

**Python:**
```python
def __init__(self):
    self._register_node_types()
    # This logs: "Registered 1 node types from metadata"
```

Check logs when backend starts for:
```
INFO: Node registration complete: 1 succeeded, 0 failed
```

## Testing the New Node

### 1. Create test workflow:

**test_sms_workflow.json:**
```json
{
  "name": "Test SMS",
  "nodes": [
    {
      "id": "start",
      "type": "ManualTrigger"
    },
    {
      "id": "sms",
      "type": "SendSMS",
      "config": {
        "phoneNumber": "+1234567890",
        "message": "Test from workflow"
      },
      "inputs": []
    }
  ],
  "edges": [
    { "source": "start", "target": "sms" }
  ]
}
```

### 2. Execute via API:

```bash
curl -X POST http://localhost:8000/workflows/execute \
  -H "Content-Type: application/json" \
  -d @test_sms_workflow.json
```

### 3. Verify output contains SendSMS result:

```json
{
  "nodeId": "sms",
  "type": "SendSMS",
  "output": {
    "success": true,
    "phoneNumber": "+1234567890",
    "messageLength": 18,
    "timestamp": "2026-02-22T18:40:00.000Z"
  }
}
```

## Summary

To add a new node:

| Step | File | Action |
|------|------|--------|
| 1 | `src/workflows/MyNode/metadata.ts` | Define type, executor, aliases |
| 2 | `lib/workflow/.../executors.py` | Implement executor class |
| 3 | Terminal | Run `npm run build:metadata` |
| 4 | Terminal | Restart backend |
| 5 | Workflow JSON | Use new node type |

That's it! No manual registration lists to maintain. 🎉

## Next Steps

Once your node works:

1. **Add UI component** in `src/workflows/MyNode/component.tsx`
2. **Add tests** in `test_nodes.py`
3. **Update node picker** in frontend to show category/description
4. **Document** the node parameters in README

The auto-registration system handles the backend wiring - you focus on the node logic! ✨
