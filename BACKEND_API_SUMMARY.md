# NexAgent Backend API Summary

## 🚀 Current Status
**Your backend is RUNNING on:** `http://localhost:8000`
- API Documentation: http://localhost:8000/docs
- Health Check: http://localhost:8000/health
- Process ID: 19796

---

## 📋 All Available APIs

### 1. **Authentication APIs** (`/api/v1/auth`)
Located in: `backend/app/api/v1/auth.py`
- User registration
- User login
- Token refresh
- User profile management
- Firebase authentication integration

### 2. **Workflow APIs** (`/api/v1/workflows`)
Located in: `backend/app/api/v1/workflows.py`

#### Core Workflow Operations:
- `POST /api/v1/workflows` - Create new workflow
- `GET /api/v1/workflows` - List user's workflows
- `GET /api/v1/workflows/{workflow_id}` - Get workflow details
- `PUT /api/v1/workflows/{workflow_id}` - Update workflow
- `DELETE /api/v1/workflows/{workflow_id}` - Delete workflow

#### Workflow Execution:
- `POST /api/v1/workflows/{workflow_id}/execute` - Execute workflow
- `POST /api/v1/workflows/{workflow_id}/scheduler/stop` - Stop scheduled execution
- `GET /api/v1/workflows/{workflow_id}/scheduler/status` - Get scheduler status

#### Public Workflows:
- `GET /api/v1/workflows/public/list` - List public workflows

### 3. **Template APIs** (`/api/v1/templates`)
Located in: `backend/app/api/v1/templates.py`

#### Template Management:
- `POST /api/v1/templates` - Create template
- `GET /api/v1/templates/search` - Search templates
- `GET /api/v1/templates/featured` - Get featured templates
- `GET /api/v1/templates/my-templates` - Get user's templates
- `GET /api/v1/templates/{template_id}` - Get template details
- `PUT /api/v1/templates/{template_id}` - Update template
- `DELETE /api/v1/templates/{template_id}` - Delete template

#### Template Actions:
- `POST /api/v1/templates/clone` - Clone template to workflow
- `GET /api/v1/templates/categories/all` - Get all categories
- `POST /api/v1/templates/{template_id}/rate` - Rate template
- `GET /api/v1/templates/{template_id}/ratings` - Get template ratings
- `POST /api/v1/templates/bookmark/toggle` - Bookmark/unbookmark template

### 4. **Marketplace APIs** (`/api/v1/marketplace`)
Located in: `backend/app/api/v1/marketplace*.py`
- Browse marketplace items
- Purchase workflows/templates
- Seller management
- Admin marketplace controls
- Nexa currency integration

### 5. **Notifications APIs** (`/api/v1/notifications`)
Located in: `backend/app/api/v1/notifications.py`
- Get user notifications
- Mark notifications as read
- Notification preferences
- Real-time notification system

### 6. **Integrations APIs** (`/api/v1/integrations`)
Located in: `backend/app/api/v1/integrations.py`
- Third-party service integrations
- OAuth connections
- API key management
- Integration configuration

### 7. **Analytics APIs** (`/api/v1/analytics`)
Located in: `backend/app/api/v1/analytics.py`
- Workflow execution analytics
- User activity tracking
- Performance metrics
- Usage statistics

### 8. **Audit APIs** (`/api/v1/audit`)
Located in: `backend/app/api/v1/audit.py`
- Audit log tracking
- User activity history
- Compliance logging
- Security audit trails

### 9. **Billing APIs** (`/api/billing`)
Located in: `backend/app/api/routes/billing.py`
- Stripe integration
- Subscription management
- Payment processing
- Invoice generation

---

## 🔧 Configuration

### Environment Variables (.env)
Your backend uses these configurations from `backend/.env`:

```env
# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_VERSION=v1
ENVIRONMENT=development
DEBUG=True

# CORS (Frontend URL)
CORS_ORIGINS=http://localhost:3000,https://nexagent.com

# Firebase Configuration
FIREBASE_PROJECT_ID=nexagent-90391
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 📦 Database Structure

### Firestore Collections:
1. **workflows** - User workflows
2. **templates** - Workflow templates
3. **users** - User profiles and data
4. **notifications** - User notifications
5. **integrations** - Third-party integrations
6. **analytics** - Analytics data
7. **audit_logs** - Audit trail
8. **marketplace** - Marketplace items

---

## 🔗 Frontend Integration

### Update Your Frontend API URL
In your Next.js frontend, update the API base URL to:

**Before (Railway):**
```typescript
const API_URL = "https://your-app.railway.app/api/v1"
```

**After (Local):**
```typescript
const API_URL = "http://localhost:8000/api/v1"
```

### Files to Update:
1. Check `lib/api.ts` or similar API configuration files
2. Look for environment variables like `NEXT_PUBLIC_API_URL`
3. Update any hardcoded API URLs in your components

---

## 🔐 Authentication Flow

1. User signs in via Firebase Auth (frontend)
2. Frontend gets Firebase ID token
3. Frontend sends requests with header:
   ```
   Authorization: Bearer <firebase_id_token>
   ```
4. Backend verifies token with Firebase Admin SDK
5. Backend identifies user and authorizes request

---

## 🎯 Next Steps

### 1. Update Frontend API Configuration
Create or update `NexAgent/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### 2. Test Your APIs
Visit http://localhost:8000/docs to see interactive API documentation

### 3. Test Workflow Execution
Your UI can now:
- Create workflows via `POST /api/v1/workflows`
- Save workflows to Firebase
- Execute workflows via `POST /api/v1/workflows/{id}/execute`
- View results in real-time

---

## ⚠️ Missing Dependencies (Optional)

Current warnings:
- `croniter` - For scheduled workflows (install if needed)
- `aiohttp` - For HTTP request nodes (install if needed)

Install if you need these features:
```bash
pip install croniter aiohttp
```

---

## 🧪 Testing Your Setup

1. **Test Health Check:**
   ```bash
   curl http://localhost:8000/health
   ```

2. **Test Workflow API:**
   ```bash
   curl http://localhost:8000/api/v1/workflows \
     -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
   ```

3. **Test via Frontend:**
   - Open your Next.js app: http://localhost:3000
   - Try creating/executing a workflow
   - Check backend terminal for logs

---

## 📝 Workflow Execution API

### Execute Workflow
```bash
POST /api/v1/workflows/{workflow_id}/execute
Authorization: Bearer <firebase_token>

Request Body:
{
  "inputData": {
    "key": "value"
  }
}

Response:
{
  "success": true,
  "executionId": "exec_123",
  "status": "completed",
  "results": {
    "nodeResults": {...}
  }
}
```

---

## 🎉 Summary

✅ **Backend is running:** http://localhost:8000
✅ **All APIs available:** 9 main API groups with 50+ endpoints
✅ **Database:** Connected to Firebase/Firestore
✅ **Authentication:** Firebase Auth integration working
✅ **CORS:** Configured for http://localhost:3000

**Your backend is ready to use! Just update your frontend to point to `http://localhost:8000`**
