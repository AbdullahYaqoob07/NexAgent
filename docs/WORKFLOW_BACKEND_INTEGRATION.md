# Workflow Backend Integration

## Overview
This document describes the complete backend API integration for workflow management in NexAgent.

## Architecture

### Backend (FastAPI)
- **Location**: `backend/app/api/v1/workflows.py`
- **Endpoints**:
  - `POST /api/v1/workflows` - Create workflow
  - `GET /api/v1/workflows` - List user workflows (paginated)
  - `GET /api/v1/workflows/{id}` - Get workflow by ID
  - `PUT /api/v1/workflows/{id}` - Update workflow
  - `DELETE /api/v1/workflows/{id}` - Delete workflow
  - `GET /api/v1/workflows/public` - List public workflows

### Frontend (Next.js)

#### 1. API Client Layer
- **Base Client**: `lib/api/client.ts`
  - Axios instance with authentication interceptor
  - Automatic token management from localStorage
  - Error handling with 401 redirect

#### 2. Type Definitions
- **Location**: `lib/api/types/workflow.ts`
- **Types**:
  - `BackendWorkflow` - Backend workflow schema
  - `BackendWorkflowNode` - Backend node format
  - `BackendWorkflowEdge` - Backend edge/connection format
  - `WorkflowCreateRequest` - Create payload
  - `WorkflowUpdateRequest` - Update payload
  - `WorkflowDetailResponse` - Single workflow response
  - `WorkflowListResponse` - List response with pagination

#### 3. Adapter Layer
- **Location**: `lib/api/adapters/workflowAdapter.ts`
- **Functions**:
  - `frontendNodeToBackend()` - Convert frontend node to backend format
  - `frontendConnectionToBackendEdge()` - Convert connection to edge
  - `backendNodeToFrontend()` - Convert backend node to frontend
  - `backendEdgeToFrontendConnection()` - Convert edge to connection
  - `workflowToCreateRequest()` - Prepare workflow for creation
  - `workflowToUpdateRequest()` - Prepare workflow for update
  - `backendWorkflowToFrontend()` - Convert backend workflow to frontend
  - `prepareWorkflowForBackend()` - Validate and sanitize workflow

#### 4. API Service Layer
- **Location**: `lib/api/services/workflowApi.ts`
- **Functions**:
  - `createWorkflow(workflow)` - Create new workflow
  - `listWorkflows(params?)` - List workflows with pagination
  - `getWorkflow(workflowId)` - Get single workflow
  - `updateWorkflow(workflowId, updates)` - Update workflow
  - `deleteWorkflow(workflowId)` - Delete workflow
  - `listPublicWorkflows(params?)` - List public workflows
  - `saveWorkflow(workflow)` - Smart save (create or update)

#### 5. Storage Provider
- **Location**: `lib/workflow/storage/BackendStorageProvider.ts`
- **Purpose**: Implements StorageProvider interface using backend API
- **Methods**:
  - `saveWorkflow()` - Save via API
  - `loadWorkflow()` - Load via API
  - `listWorkflows()` - List via API
  - `saveExecution()` - TODO: Implement when backend supports
  - `loadExecution()` - TODO: Implement when backend supports
  - `listExecutions()` - TODO: Implement when backend supports

#### 6. Workflow Manager
- **Location**: `lib/workflow/WorkflowManager.ts`
- **Storage Selection**:
  1. **BackendStorageProvider** - When user has backend auth token (primary)
  2. **FirestoreStorageProvider** - Fallback when no backend token
  3. **LocalStorageProvider** - Development/demo mode
  4. **InMemoryStorageProvider** - Server-side rendering
- **New Methods**:
  - `deleteWorkflow(workflowId)` - Delete workflow via API

#### 7. UI Components
- **WorkflowEditor**: `components/workflows/WorkflowEditor.tsx`
  - Already uses `workflowManager.saveWorkflow()` ✅
  - Automatically uses backend when authenticated ✅
  
- **Workflows List Page**: `app/workflows/page.tsx`
  - Uses `workflowService` directly ✅
  - Supports delete operation ✅

## Data Flow

### Creating/Saving Workflow
```
WorkflowEditor
  ↓ (save button)
WorkflowManager.saveWorkflow()
  ↓
BackendStorageProvider.saveWorkflow()
  ↓
workflowApi.saveWorkflow()
  ↓
workflowAdapter.workflowToCreateRequest() / workflowToUpdateRequest()
  ↓
apiClient.post/put → Backend API
  ↓
Backend validates and saves to Firestore
  ↓
Returns BackendWorkflow
  ↓
workflowAdapter.backendWorkflowToFrontend()
  ↓
Frontend Workflow object
```

### Loading Workflow
```
WorkflowManager.loadWorkflow(id)
  ↓
BackendStorageProvider.loadWorkflow()
  ↓
workflowApi.getWorkflow(id)
  ↓
apiClient.get → Backend API
  ↓
Backend fetches from Firestore
  ↓
Returns BackendWorkflow
  ↓
workflowAdapter.backendWorkflowToFrontend()
  ↓
Frontend Workflow object
```

### Listing Workflows
```
workflowApi.listWorkflows() OR workflowService.listWorkflows()
  ↓
apiClient.get → Backend API
  ↓
Backend queries Firestore with pagination
  ↓
Returns WorkflowListResponse
  ↓
workflowAdapter.backendWorkflowToFrontend() (for each workflow)
  ↓
Array of Frontend Workflow objects
```

## Testing Checklist

### Backend Testing
- [ ] Start FastAPI backend: `cd backend && uvicorn app.main:app --reload`
- [ ] Verify backend is running at `http://localhost:8000`
- [ ] Check `/docs` endpoint for API documentation
- [ ] Verify Firestore connection is working

### Authentication Setup
- [ ] Sign in to the frontend application
- [ ] Verify backend auth token is stored in localStorage (`backend_auth_token`)
- [ ] Check that WorkflowManager logs show "✅ Using BackendStorageProvider"

### Create Workflow Test
1. [ ] Navigate to `/workflows/new` or `/workflows/editor`
2. [ ] Add nodes to canvas (e.g., Trigger → Action → Save)
3. [ ] Click Save button
4. [ ] Check browser console for:
   - "✅ Workflow saved via backend: {id}"
   - "Workflow saved" toast notification
5. [ ] Verify in backend logs that POST request was received
6. [ ] Check Firestore console for new workflow document

### List Workflows Test
1. [ ] Navigate to `/workflows`
2. [ ] Verify workflows are displayed in cards
3. [ ] Check browser console for:
   - "✅ Loaded X workflows from backend"
4. [ ] Verify pagination works (if more than 50 workflows)

### Load Workflow Test
1. [ ] From workflows list, click "Edit" on a workflow
2. [ ] Verify workflow loads in editor with correct nodes and connections
3. [ ] Check browser console for:
   - "✅ Workflow loaded from backend: {id}"

### Update Workflow Test
1. [ ] Load an existing workflow in editor
2. [ ] Modify nodes (add/remove/edit)
3. [ ] Click Save button
4. [ ] Verify "Workflow saved" toast appears
5. [ ] Reload page and verify changes persisted

### Delete Workflow Test
1. [ ] Navigate to `/workflows`
2. [ ] Click delete button (trash icon) on a workflow
3. [ ] Confirm deletion in dialog
4. [ ] Verify workflow is removed from list
5. [ ] Check Firestore to confirm deletion

### Error Handling Tests
- [ ] Try to load non-existent workflow ID
  - Should show "Workflow not found" and return null
- [ ] Try to update workflow without authentication
  - Should redirect to sign-in page
- [ ] Try to save workflow with invalid name (< 3 chars)
  - Should show validation error
- [ ] Disconnect backend server
  - Should show "Network error" message

### Integration Tests
- [ ] Create workflow → Save → Navigate away → Load → Verify data matches
- [ ] Create multiple workflows → List → Verify all appear
- [ ] Update workflow multiple times → Verify version increments
- [ ] Delete workflow → Try to load → Verify 404
- [ ] Test with public workflows endpoint

## Environment Variables

Ensure these are set in your `.env.local`:

```bash
# Backend API URL
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8000

# Firebase (for Firestore via backend)
# These are used by the backend, not directly by frontend for workflows
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
```

## Troubleshooting

### "Using FirestoreStorageProvider (fallback)"
- **Cause**: No backend auth token found
- **Solution**: Sign in to the application to get a backend token

### "Network error"
- **Cause**: Backend server not running or unreachable
- **Solution**: Start backend server and check URL in environment variables

### "Failed to save workflow"
- **Check**: Backend logs for detailed error message
- **Common causes**: 
  - Invalid workflow name (too short/long)
  - Missing required fields
  - Database connection issues

### Workflow not appearing in list
- **Check**: 
  - Backend logs for errors
  - Firestore console for document
  - User ID matches between frontend and backend
  - Workflow belongs to authenticated user

## Migration Notes

### From Direct Firestore to Backend API

**Old Approach** (Direct Firestore):
```typescript
// Frontend directly accesses Firestore
const db = getFirestore();
await setDoc(doc(db, 'workflows', id), workflow);
```

**New Approach** (Backend API):
```typescript
// Frontend calls backend API
const workflow = await workflowApi.saveWorkflow(workflow);
```

**Benefits**:
- ✅ Centralized validation and business logic
- ✅ Better security (backend controls access)
- ✅ Easier to add features (versioning, webhooks, etc.)
- ✅ Consistent data format across clients
- ✅ Better error handling and logging
- ✅ Supports future features (execution history, analytics)

## Future Enhancements

### Execution History (TODO)
- Backend endpoints for execution CRUD
- Update BackendStorageProvider execution methods
- UI for viewing execution history

### Workflow Sharing
- Implement `canBeListed` visibility toggle in UI
- Create public workflow marketplace

### Versioning
- Backend already tracks `version` field
- Add version history UI
- Support rollback to previous versions

### Real-time Updates
- WebSocket support for collaborative editing
- Live workflow execution status

### Analytics
- Track workflow usage metrics
- Execution success rates
- Performance monitoring

## API Reference

See `backend/app/api/v1/workflows.py` for complete API documentation.

Quick reference:
```python
# Create workflow
POST /api/v1/workflows
Body: { name, description?, nodes?, edges?, variables? }

# List workflows
GET /api/v1/workflows?page=1&page_size=20&status=active

# Get workflow
GET /api/v1/workflows/{workflow_id}

# Update workflow
PUT /api/v1/workflows/{workflow_id}
Body: { name?, description?, nodes?, edges?, ... }

# Delete workflow
DELETE /api/v1/workflows/{workflow_id}

# List public workflows
GET /api/v1/workflows/public?page=1&page_size=20
```

All endpoints require Bearer token authentication except public list.
