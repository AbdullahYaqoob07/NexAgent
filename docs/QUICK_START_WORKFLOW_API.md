# Quick Start - Workflow Backend API Integration

## 🎯 What Was Done

Complete backend API integration for workflows with:
- ✅ Full CRUD operations (Create, Read, Update, Delete)
- ✅ Automatic storage provider selection
- ✅ Type-safe API service
- ✅ Data transformation layer
- ✅ Error handling

## 🚀 How to Use

### 1. Import the API Service

```typescript
import * as workflowApi from '@/lib/api/services/workflowApi';
```

### 2. Use the Functions

```typescript
// Create/Update (smart save)
const workflow = await workflowApi.saveWorkflow(myWorkflow);

// List workflows
const { workflows, total } = await workflowApi.listWorkflows({
  page: 1,
  pageSize: 20,
  status: 'active'
});

// Get single workflow
const workflow = await workflowApi.getWorkflow(workflowId);

// Delete workflow
await workflowApi.deleteWorkflow(workflowId);

// List public workflows
const { workflows } = await workflowApi.listPublicWorkflows();
```

### 3. Or Use Workflow Manager (Recommended)

```typescript
import { workflowManager } from '@/lib/workflow/WorkflowManager';

// Create
const workflow = workflowManager.createWorkflow('My Workflow');

// Save
await workflowManager.saveWorkflow(workflow);

// Load
const loaded = await workflowManager.loadWorkflow(workflowId);

// List
const workflows = await workflowManager.listWorkflows();

// Delete
await workflowManager.deleteWorkflow(workflowId);

// Execute
const execution = await workflowManager.executeWorkflow(workflow);
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `lib/api/services/workflowApi.ts` | Main API service - use this for API calls |
| `lib/workflow/WorkflowManager.ts` | Workflow manager - use this for business logic |
| `lib/workflow/storage/BackendStorageProvider.ts` | Storage implementation |
| `lib/api/adapters/workflowAdapter.ts` | Data transformation |
| `lib/api/types/workflow.ts` | TypeScript types |

## 🔧 Environment Setup

Add to `.env.local`:
```bash
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8000
```

## ✅ Testing Checklist

### Prerequisites
- [ ] Backend running: `cd backend && uvicorn app.main:app --reload`
- [ ] Frontend running: `npm run dev`
- [ ] User signed in (has backend auth token)

### Quick Test
1. Navigate to `/workflows/new`
2. Add some nodes to canvas
3. Click "Save"
4. Check console for: `✅ Workflow saved via backend`
5. Go to `/workflows` - workflow should appear
6. Click "Edit" - workflow should load
7. Click delete icon - workflow should be removed

## 🐛 Troubleshooting

### "Using FirestoreStorageProvider (fallback)"
**Solution**: Sign in to get backend auth token

### "Network error"
**Solution**: Ensure backend server is running

### Workflow not saving
**Check**: 
- Browser console for errors
- Backend terminal for errors
- Network tab for failed requests

## 📊 Data Flow

```
UI Component → WorkflowManager → BackendStorageProvider 
  → workflowApi → adapter → apiClient → Backend API
```

## 🎓 Examples

### Save Workflow from Editor
```typescript
// This is already done in WorkflowEditor.tsx
const saveCurrentWorkflow = async () => {
  const workflow = {
    id: currentWorkflowId,
    name: workflowName,
    nodes: [...],
    connections: [...],
    // ...
  };
  
  await workflowManager.saveWorkflow(workflow);
  // Automatically uses backend when authenticated!
};
```

### List Workflows in Component
```typescript
import { useState, useEffect } from 'react';
import * as workflowApi from '@/lib/api/services/workflowApi';

function MyComponent() {
  const [workflows, setWorkflows] = useState([]);
  
  useEffect(() => {
    async function loadWorkflows() {
      const { workflows } = await workflowApi.listWorkflows();
      setWorkflows(workflows);
    }
    loadWorkflows();
  }, []);
  
  return (
    <div>
      {workflows.map(wf => (
        <div key={wf.id}>{wf.name}</div>
      ))}
    </div>
  );
}
```

### Delete Workflow
```typescript
const handleDelete = async (workflowId: string) => {
  if (confirm('Delete this workflow?')) {
    await workflowApi.deleteWorkflow(workflowId);
    // Refresh list
    const { workflows } = await workflowApi.listWorkflows();
    setWorkflows(workflows);
  }
};
```

## 📚 More Info

- **Full Documentation**: See `WORKFLOW_BACKEND_INTEGRATION.md`
- **Implementation Summary**: See `WORKFLOW_INTEGRATION_SUMMARY.md`
- **Backend API**: Check `/docs` endpoint when backend is running

## 💡 Pro Tips

1. **Always use workflowManager** for business logic (recommended)
2. **Use workflowApi directly** only for custom API calls
3. **Check console logs** - they show which storage provider is active
4. **Backend automatically handles** data validation and transformation
5. **Errors are caught and logged** - check both frontend and backend logs

## 🎉 You're Ready!

The integration is complete and ready to use. All existing code continues to work, and new features automatically use the backend API when authenticated.

**Next**: Start testing the workflow operations!
