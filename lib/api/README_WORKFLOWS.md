# Workflow API Integration - Quick Reference

## 📦 Files Created

```
lib/api/
├── types/
│   └── workflow.ts                  # TypeScript types
├── adapters/
│   └── workflowAdapter.ts          # Format converters
└── services/
    └── workflowService.ts          # API service

lib/workflow/storage/
└── BackendStorageProvider.ts       # Backend storage

app/workflows/
└── page.tsx                        # Updated list page
```

## 🚀 Quick Start

### Using Workflow Service

```typescript
import { workflowService } from '@/lib/api/services/workflowService';

// List workflows
const { workflows, total } = await workflowService.listWorkflows({
  page: 1,
  pageSize: 20,
  status: 'active' // optional: draft, active, archived
});

// Get one workflow
const { workflow } = await workflowService.getWorkflow(workflowId);

// Create workflow
const request = {
  name: 'My Workflow',
  description: 'Description here',
  canBeListed: false,
  nodes: [...],
  edges: [...],
  variables: {}
};
const { workflow } = await workflowService.createWorkflow(request);

// Update workflow
await workflowService.updateWorkflow(workflowId, {
  name: 'Updated Name',
  status: 'active'
});

// Delete workflow
await workflowService.deleteWorkflow(workflowId);
```

### Using WorkflowManager (Recommended)

```typescript
import { workflowManager } from '@/lib/workflow/WorkflowManager';

// Automatically uses backend when authenticated
await workflowManager.saveWorkflow(workflow);
const workflow = await workflowManager.loadWorkflow(workflowId);
const workflows = await workflowManager.listWorkflows();
```

## 🔄 Data Conversion

```typescript
import { 
  backendWorkflowToFrontend,
  prepareWorkflowForBackend 
} from '@/lib/api/adapters/workflowAdapter';

// Backend → Frontend
const frontendWorkflow = backendWorkflowToFrontend(backendWorkflow);

// Frontend → Backend
const backendRequest = prepareWorkflowForBackend(frontendWorkflow);
```

## 🔐 Authentication

All requests automatically include authentication:
- Token from `localStorage` key: `backend_auth_token`
- Added via axios interceptor
- Redirects to `/sign-in` on 401

## ✅ Test Endpoints

Visit: `http://localhost:3000/workflows`

Should:
- Fetch workflows from backend
- Display workflow cards
- Allow edit/delete operations
- Show loading and error states

## 📍 Backend URLs

**Development:** `http://localhost:8000`
**Production:** `https://nexagent-backend-production.up.railway.app`

Configured in `.env.local`: `NEXT_PUBLIC_BACKEND_API_URL`
