# Workflow API Endpoints

## Overview

Complete workflow management system with authentication, user ownership, and public/private workflow support.

## Workflow Data Structure (Firestore)

Workflows are stored in the `workflows` collection:

```javascript
{
  id: "workflow_abc123",           // Auto-generated workflow ID
  userId: "user_uid",               // Owner's user ID
  name: "My Workflow",              // Workflow name (required)
  description: "Description",       // Optional description
  canBeListed: false,               // Public visibility (default: false)
  
  // Workflow definition
  nodes: [],                        // Workflow nodes array
  edges: [],                        // Workflow edges array
  variables: {},                    // Workflow variables object
  
  // Metadata
  status: "draft",                  // draft, active, archived
  version: 1,                       // Auto-incremented on updates
  createdAt: Timestamp,
  updatedAt: Timestamp,
  lastExecutedAt: null,             // Last execution timestamp
  executionCount: 0,                // Total executions
  
  // Additional fields
  tags: [],
  isPublic: false,
  collaborators: []
}
```

## API Endpoints

### Base URL
```
http://localhost:8000/api/v1/workflows
```

---

## 1. Create Workflow

**`POST /api/v1/workflows`**

Create a new workflow. Requires authentication.

### Headers
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

### Request Body
```json
{
  "name": "My First Workflow",
  "description": "This workflow automates order processing",
  "canBeListed": false,
  "nodes": [],
  "edges": [],
  "variables": {}
}
```

### Response (201 Created)
```json
{
  "success": true,
  "workflow": {
    "id": "workflow_abc123",
    "userId": "user_uid",
    "name": "My First Workflow",
    "description": "This workflow automates order processing",
    "canBeListed": false,
    "nodes": [],
    "edges": [],
    "variables": {},
    "status": "draft",
    "version": 1,
    "createdAt": "2025-01-21T18:00:00Z",
    "updatedAt": "2025-01-21T18:00:00Z",
    "lastExecutedAt": null,
    "executionCount": 0
  }
}
```

### What Happens
- ✅ Workflow created in Firestore `workflows` collection
- ✅ User's `usage.totalWorkflows` incremented
- ✅ User's `usage.workflowsCreated` incremented

---

## 2. Get All User Workflows

**`GET /api/v1/workflows`**

Get all workflows owned by the authenticated user. Supports pagination and filtering.

### Headers
```
Authorization: Bearer <firebase_id_token>
```

### Query Parameters
- `page` (optional): Page number (default: 1)
- `page_size` (optional): Items per page (default: 20, max: 100)
- `status` (optional): Filter by status (draft, active, archived)

### Example Request
```
GET /api/v1/workflows?page=1&page_size=10&status=active
```

### Response (200 OK)
```json
{
  "success": true,
  "workflows": [
    {
      "id": "workflow_abc123",
      "userId": "user_uid",
      "name": "My Workflow",
      "description": "Description",
      "canBeListed": false,
      "nodes": [],
      "edges": [],
      "variables": {},
      "status": "active",
      "version": 2,
      "createdAt": "2025-01-21T18:00:00Z",
      "updatedAt": "2025-01-21T19:00:00Z",
      "lastExecutedAt": null,
      "executionCount": 0
    }
  ],
  "total": 5,
  "page": 1,
  "pageSize": 10
}
```

---

## 3. Get Single Workflow

**`GET /api/v1/workflows/{workflow_id}`**

Get a specific workflow by ID. User must own the workflow OR it must be public (`canBeListed=true`).

### Headers
```
Authorization: Bearer <firebase_id_token>
```

### Response (200 OK)
```json
{
  "success": true,
  "workflow": {
    "id": "workflow_abc123",
    "userId": "user_uid",
    "name": "My Workflow",
    "description": "Description",
    "canBeListed": false,
    "nodes": [],
    "edges": [],
    "variables": {},
    "status": "draft",
    "version": 1,
    "createdAt": "2025-01-21T18:00:00Z",
    "updatedAt": "2025-01-21T18:00:00Z",
    "lastExecutedAt": null,
    "executionCount": 0
  }
}
```

### Error Responses
- `404 Not Found` - Workflow doesn't exist or access denied
- `401 Unauthorized` - Invalid or missing token

---

## 4. Update Workflow

**`PUT /api/v1/workflows/{workflow_id}`**

Update a workflow. User must own the workflow.

### Headers
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

### Request Body (All fields optional)
```json
{
  "name": "Updated Workflow Name",
  "description": "New description",
  "canBeListed": true,
  "nodes": [...],
  "edges": [...],
  "variables": {...},
  "status": "active"
}
```

### Response (200 OK)
```json
{
  "success": true,
  "workflow": {
    "id": "workflow_abc123",
    "userId": "user_uid",
    "name": "Updated Workflow Name",
    "description": "New description",
    "canBeListed": true,
    "nodes": [...],
    "edges": [...],
    "variables": {...},
    "status": "active",
    "version": 2,
    "createdAt": "2025-01-21T18:00:00Z",
    "updatedAt": "2025-01-21T19:00:00Z",
    "lastExecutedAt": null,
    "executionCount": 0
  }
}
```

### What Happens
- ✅ Workflow updated in Firestore
- ✅ `updatedAt` timestamp updated
- ✅ `version` incremented

---

## 5. Delete Workflow

**`DELETE /api/v1/workflows/{workflow_id}`**

Delete a workflow. User must own the workflow.

### Headers
```
Authorization: Bearer <firebase_id_token>
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Workflow deleted successfully"
}
```

### What Happens
- ✅ Workflow deleted from Firestore
- ✅ User's `usage.totalWorkflows` decremented

---

## 6. Get Public Workflows

**`GET /api/v1/workflows/public/list`**

Get all public workflows (where `canBeListed=true`). **Does NOT require authentication**.

### Query Parameters
- `page` (optional): Page number (default: 1)
- `page_size` (optional): Items per page (default: 20, max: 100)

### Example Request
```
GET /api/v1/workflows/public/list?page=1&page_size=20
```

### Response (200 OK)
```json
{
  "success": true,
  "workflows": [
    {
      "id": "workflow_xyz789",
      "userId": "another_user_uid",
      "name": "Public Workflow",
      "description": "Available for everyone",
      "canBeListed": true,
      "nodes": [],
      "edges": [],
      "variables": {},
      "status": "active",
      "version": 1,
      "createdAt": "2025-01-21T17:00:00Z",
      "updatedAt": "2025-01-21T17:00:00Z",
      "lastExecutedAt": null,
      "executionCount": 0
    }
  ],
  "total": 15,
  "page": 1,
  "pageSize": 20
}
```

---

## Testing

### 1. Sign In to Get Token
```powershell
$signInBody = @{email="testmaarij@gmail.com"; password="123456789"} | ConvertTo-Json
$signInResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/signin" -Method POST -Body $signInBody -ContentType "application/json"
$token = $signInResponse.access_token
```

### 2. Create a Workflow
```powershell
$workflowBody = @{
    name = "Test Workflow"
    description = "My first workflow"
    canBeListed = $false
    nodes = @()
    edges = @()
    variables = @{}
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer YOUR_FIREBASE_ID_TOKEN"
    "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri "http://localhost:8000/api/v1/workflows" -Method POST -Headers $headers -Body $workflowBody
```

### 3. Get All Workflows
```powershell
$headers = @{
    "Authorization" = "Bearer YOUR_FIREBASE_ID_TOKEN"
}

Invoke-RestMethod -Uri "http://localhost:8000/api/v1/workflows" -Method GET -Headers $headers
```

---

## Firebase Console Path

To view workflows in Firebase:

```
Firebase Console → Firestore Database → Data

📁 workflows (collection)
  └─ 📄 workflow_abc123 (document ID)
      ├─ id: "workflow_abc123"
      ├─ userId: "user_uid"
      ├─ name: "My Workflow"
      ├─ canBeListed: false
      └─ ... (all other fields)
```

---

## Security Features

✅ **Authentication Required** - All create/update/delete operations require valid Firebase token  
✅ **Ownership Verification** - Users can only modify their own workflows  
✅ **Public Access Control** - Only workflows with `canBeListed=true` are publicly accessible  
✅ **Auto-increment Version** - Tracks workflow changes  
✅ **User Stats Tracking** - Automatically updates user's workflow counts  

---

## Summary

✅ **Complete CRUD operations** - Create, Read, Update, Delete  
✅ **User ownership** - Every workflow has `userId` field  
✅ **Public/Private control** - `canBeListed` flag for visibility  
✅ **Pagination support** - Handle large workflow lists  
✅ **Version tracking** - Auto-incremented on updates  
✅ **Usage statistics** - Auto-updates user's workflow count  
✅ **Secure** - Token-based authentication required  

Your workflow system is ready to use! 🚀
