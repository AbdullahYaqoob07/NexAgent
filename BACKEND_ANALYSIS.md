# NexAgent Backend - Very Detailed Analysis

## 📊 Executive Overview

**NexAgent** is a production-grade workflow automation platform (similar to n8n) with a **FastAPI backend** built with industrial-standard architecture. The backend implements **4 complete major modules** with **98+ API endpoints**.

---

## 🏗️ Architecture Layer Breakdown

### **Layer 1: API Layer** (`app/api/v1/`)
- **Purpose**: HTTP request/response handling
- **Files**: 8 route files handling different domains
  - `auth.py` - Authentication & user management
  - `workflows.py` - Workflow CRUD operations
  - `notifications.py` - Multi-channel notifications
  - `marketplace_nexas.py` - Product management
  - `marketplace_sellers.py` - Seller operations
  - `marketplace_purchases.py` - Payment processing
  - `marketplace_admin.py` - Admin controls
  - `templates.py`, `integrations.py`, `analytics.py`, `audit.py` - Additional domains

**Key Characteristics**:
- ✅ FastAPI route decorators (`@router.post`, `@router.get`, etc.)
- ✅ Pydantic model validation on inputs/outputs
- ✅ Rate limiting decorators (`@rate_limit(requests_per_minute=50)`)
- ✅ Authentication dependency injection (`Depends(get_current_user)`)
- ✅ Comprehensive OpenAPI documentation

### **Layer 2: Service Layer** (`app/services/`)
- **Purpose**: Business logic implementation
- **Pattern**: Service classes handling domain-specific operations
- **Files**:
  - `firebase_service.py` - Firebase Auth & Firestore integration
  - `session_service.py` - Enhanced session management (4-hour sessions)
  - `workflow_service.py` - Workflow business logic
  - `notification_service.py` - Multi-channel notification dispatch
  - `marketplace_service.py` - E-commerce logic
  - `stripe_service.py` - Payment processing with Stripe
  - `analytics_service.py` - Analytics aggregation
  - `audit_service.py` - Audit trail tracking
  - `billing_service.py` - Usage-based billing
  - `integration_service.py` - Third-party integrations
  - `template_service.py` - Template management

**Key Characteristics**:
- ✅ Async/await for non-blocking operations
- ✅ Error handling with detailed logging
- ✅ Data transformation & validation
- ✅ External service orchestration

### **Layer 3: Database Layer** (`app/db/`)
- **Purpose**: Firestore data access & queries
- **Pattern**: Direct Firestore operations with query optimization
- **Files**:
  - `notification_db.py` - Notification CRUD operations
  - `marketplace_db.py` - Marketplace data operations
  - Other domain-specific database operations

**Key Characteristics**:
- ✅ Document-based design (Firestore NoSQL)
- ✅ Pagination support for large datasets
- ✅ Transaction management
- ✅ Relationship handling via references

### **Layer 4: Models/Schemas** (`app/models/`)
- **Purpose**: Pydantic models for request/response validation
- **Pattern**: Each domain has dedicated models file
- **Files**:
  - `auth_models.py` - Auth requests/responses
  - `workflow_models.py` - Workflow schemas
  - `notification_models.py` - Notification schemas
  - `marketplace_models.py` - 75+ marketplace data models
  - `billing_models.py`, `analytics_models.py`, `audit_models.py`, etc.

**Key Characteristics**:
- ✅ Type hints for all fields
- ✅ Built-in validation (email, URL, min/max length)
- ✅ Optional fields with defaults
- ✅ Documentation strings for API docs

### **Layer 5: Core Infrastructure** (`app/core/`)
- **Purpose**: Cross-cutting concerns
- **Files**:
  - `config.py` - Configuration management with environment variables
  - `security.py` - Rate limiting, input sanitization, API key generation
  - `logging.py` - Structured logging system
  - `auth_dependency.py` - Authentication dependencies

**Key Characteristics**:
- ✅ Settings via Pydantic BaseSettings
- ✅ Environment variable loading (.env)
- ✅ Dependency injection patterns
- ✅ Security utilities

---

## 🔐 Authentication System (100% Complete)

### **Flow Diagram**:
```
Frontend Firebase Auth → Backend Verify Token → Create Session → Return User Data
                              ↓
                        Check Firestore User Doc
                              ↓
                        Enhance with Additional Data
                              ↓
                        Single Session Enforcement
```

### **Key Components**:
- **Firebase Admin SDK Integration**: Verifies Firebase ID tokens
- **Session Management**: 4-hour session validity with auto-refresh
- **Single Sign-On**: One active session per user
- **Device Tracking**: IP, User-Agent, timestamp logging
- **User Profiles**: Extended user data stored in Firestore

### **Endpoints** (6 APIs):
```
POST   /api/v1/auth/signup              - Create new account
POST   /api/v1/auth/signin              - Sign in (returns user info)
POST   /api/v1/auth/verify-token        - Verify Firebase token
POST   /api/v1/auth/forgot-password     - Password reset
GET    /api/v1/auth/me                  - Get current user profile
GET    /api/v1/auth/profile             - Get extended profile
```

### **Authentication Dependency Injection**:
```python
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # 1. Extract token from Authorization header
    # 2. Verify with Firebase
    # 3. Fetch user document from Firestore
    # 4. Return enhanced user object
```

---

## 🔄 Workflows Management (100% Complete)

### **Key Features**:
- ✅ Full CRUD operations (Create, Read, Update, Delete)
- ✅ Ownership model (workflows belong to users)
- ✅ Public/private control (`canBeListed` flag)
- ✅ Version tracking (auto-increment on updates)
- ✅ Usage statistics (track executions, users)
- ✅ Pagination support

### **Endpoints** (6 APIs):
```
POST   /api/v1/workflows               - Create new workflow
GET    /api/v1/workflows               - List user workflows (with pagination)
GET    /api/v1/workflows/{id}          - Get workflow details
PUT    /api/v1/workflows/{id}          - Update workflow
DELETE /api/v1/workflows/{id}          - Delete workflow
GET    /api/v1/workflows/{id}/history  - Get workflow version history
```

### **Workflow Document Structure (Firestore)**:
```json
{
  "id": "workflow_123",
  "userId": "user_456",
  "name": "Email Alert Workflow",
  "description": "Send alerts on trigger",
  "nodes": [...],
  "edges": [...],
  "variables": {...},
  "version": 5,
  "canBeListed": true,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-20T14:45:00Z",
  "usageStats": {
    "totalExecutions": 142,
    "successfulExecutions": 138,
    "failedExecutions": 4,
    "totalUsers": 3,
    "lastExecutedAt": "2024-01-20T14:30:00Z"
  }
}
```

---

## 🔔 Notifications System (100% Complete)

### **Multi-Channel Delivery**:
1. **Email** - SMTP integration
2. **Push Notifications** - Browser/mobile push
3. **Slack** - Webhook-based messaging
4. **SMS** - Twilio or similar
5. **Webhook** - Custom HTTP callbacks
6. **In-App** - Database-stored notifications

### **Key Features**:
- ✅ Jinja2 template system for personalization
- ✅ User preference management (per-channel, per-type)
- ✅ Bulk notification sending for admins
- ✅ Priority levels (low, normal, high, critical)
- ✅ Scheduling support
- ✅ Delivery tracking & status monitoring
- ✅ Admin analytics dashboard

### **Endpoints** (20+ APIs):
```
POST   /api/v1/notifications/send              - Send notification
POST   /api/v1/notifications/bulk-send         - Bulk send (admin)
GET    /api/v1/notifications                   - List notifications
PUT    /api/v1/notifications/{id}/mark-read    - Mark as read
DELETE /api/v1/notifications/{id}              - Delete notification
GET    /api/v1/notifications/preferences       - Get user preferences
PUT    /api/v1/notifications/preferences       - Update preferences
GET    /api/v1/notifications/templates         - List templates
POST   /api/v1/notifications/templates         - Create template
GET    /api/v1/notifications/analytics         - Admin analytics
... and more
```

### **Notification Template Example**:
```python
{
  "channel": "email",
  "subject": "Welcome {{ user.firstName }}",
  "template": "Hello {{ user.firstName }},\n\nYour account {{ user.email }} has been created.",
  "variables": ["user.firstName", "user.email"]
}
```

---

## 🏪 Marketplace System (100% Complete - 66+ APIs)

### **Subsystem 1: Nexa Management** (`marketplace_nexas.py` - 22 APIs)
**Purpose**: Product (workflow) publishing and discovery

**Key Endpoints**:
```
POST   /api/v1/marketplace/nexas                 - Publish new nexa
GET    /api/v1/marketplace/nexas                 - Browse nexas (with filters)
GET    /api/v1/marketplace/nexas/search          - Advanced search
GET    /api/v1/marketplace/nexas/{id}            - Get nexa details
PUT    /api/v1/marketplace/nexas/{id}            - Update nexa
DELETE /api/v1/marketplace/nexas/{id}            - Unpublish nexa
POST   /api/v1/marketplace/nexas/{id}/favorite   - Add to favorites
DELETE /api/v1/marketplace/nexas/{id}/favorite   - Remove from favorites
GET    /api/v1/marketplace/nexas/{id}/reviews    - Get reviews
POST   /api/v1/marketplace/nexas/{id}/reviews    - Post review
... and more
```

**Features**:
- ✅ Search with category/tag filtering
- ✅ Rating system (1-5 stars)
- ✅ Category management
- ✅ Trending calculations
- ✅ Favorites/collections
- ✅ Analytics (views, downloads)

### **Subsystem 2: Seller Management** (`marketplace_sellers.py` - 15 APIs)
**Purpose**: Seller onboarding, verification, payouts

**Key Endpoints**:
```
POST   /api/v1/marketplace/sellers              - Create seller account
GET    /api/v1/marketplace/sellers/me           - Get seller profile
PUT    /api/v1/marketplace/sellers/me           - Update seller profile
POST   /api/v1/marketplace/sellers/verify       - Submit KYC documents
GET    /api/v1/marketplace/sellers/analytics    - Sales analytics
GET    /api/v1/marketplace/sellers/payouts      - Payout history
POST   /api/v1/marketplace/sellers/payouts      - Request payout
... and more
```

**Features**:
- ✅ Stripe Connect integration
- ✅ KYC verification workflow
- ✅ Revenue tracking
- ✅ Payout scheduling
- ✅ Tax document management
- ✅ Seller verification status

### **Subsystem 3: Purchase & Payments** (`marketplace_purchases.py` - 13 APIs)
**Purpose**: Payment processing and checkout

**Key Endpoints**:
```
POST   /api/v1/marketplace/checkout             - Create checkout session
GET    /api/v1/marketplace/checkout/{id}       - Get checkout status
POST   /api/v1/marketplace/purchase             - Direct purchase
GET    /api/v1/marketplace/purchases            - Purchase history
GET    /api/v1/marketplace/purchases/{id}       - Get purchase details
POST   /api/v1/marketplace/purchases/{id}/refund - Request refund
... and more
```

**Features**:
- ✅ Stripe checkout sessions
- ✅ Multiple payment methods
- ✅ Invoice generation
- ✅ Refund processing
- ✅ Purchase tracking
- ✅ Revenue split calculation

### **Subsystem 4: Admin Management** (`marketplace_admin.py` - 16 APIs)
**Purpose**: Content moderation, disputes, analytics

**Key Endpoints**:
```
GET    /api/v1/marketplace/admin/nexas         - All nexas (for review)
PUT    /api/v1/marketplace/admin/nexas/{id}    - Approve/reject nexa
GET    /api/v1/marketplace/admin/sellers       - All sellers
PUT    /api/v1/marketplace/admin/sellers/{id}  - Update seller status
GET    /api/v1/marketplace/admin/disputes      - Open disputes
POST   /api/v1/marketplace/admin/disputes/{id} - Resolve dispute
GET    /api/v1/marketplace/admin/analytics     - Marketplace analytics
... and more
```

**Features**:
- ✅ Content moderation workflow
- ✅ Seller verification management
- ✅ Dispute resolution system
- ✅ Revenue analytics
- ✅ Marketplace configuration
- ✅ Policy enforcement

---

## 🔧 Core Infrastructure Details

### **Configuration System** (`config.py`)

**Environment Variables**:
```env
# Environment
ENVIRONMENT=development
DEBUG=true

# API
API_HOST=0.0.0.0
API_PORT=8000
API_VERSION=v1

# Security
SECRET_KEY=your-secret-key
ALGORITHM=HS256

# Firebase
FIREBASE_PROJECT_ID=nexagent-90391
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=...
SMTP_PASSWORD=...

# Payment
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# CORS
CORS_ORIGINS=["http://localhost:3000", "https://nexagent.com"]

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# Logging
LOG_LEVEL=INFO
```

### **Security Features** (`security.py`)

**1. Rate Limiting**:
```python
@rate_limit(requests_per_minute=50)
async def sensitive_endpoint():
    pass
```
- In-memory store (upgradeable to Redis)
- Per-user/per-API-key/per-IP identification
- Configurable windows
- Returns 429 with Retry-After header

**2. Input Sanitization**:
```python
def sanitize_input(data, max_length=1000, allowed_chars=None):
    # Remove null bytes and control characters
    # Truncate if too long
    # Apply regex filter if specified
```

**3. Sensitive Data Hashing**:
```python
def hash_sensitive_data(data, salt=None):
    # Uses PBKDF2 with SHA256
    # 100,000 iterations for security
```

**4. API Key Management**:
```python
api_key = generate_api_key(user_id, permissions=["read", "write"])
# Format: nxa_{random_part}_{base64_encoded_metadata}
```

### **Authentication Dependencies** (`auth_dependency.py`)

```python
async def get_current_user():
    # Requires Authorization: Bearer <token>
    # Returns authenticated user object

async def get_admin_user():
    # Requires admin privileges
    # Checks isAdmin, role, or Firebase claims

async def get_optional_user():
    # Works for both authenticated and anonymous
    # Returns user or None

async def require_subscription():
    # Requires active subscription
    # Returns 402 Payment Required if inactive

async def require_plan_level(min_plan_level):
    # Requires minimum plan (free/basic/pro/enterprise)
    # Returns 402 Payment Required if insufficient
```

---

## 📁 Directory Structure

```
backend/
├── 📄 README.md                              # Quick start guide
├── 📄 FULL_BACKEND_STRUCTURE.md              # Comprehensive documentation
├── 📄 SESSION_AUTH.md                        # Authentication details
├── 📄 USER_DATA_STRUCTURE.md                 # User data schema
├── 📄 WORKFLOW_ENDPOINTS.md                  # Workflow API docs
├── 📄 requirements.txt                       # Python dependencies
├── 📄 run.py                                 # Development server launcher
│
├── app/
│   ├── main.py                               # FastAPI app setup
│   │
│   ├── api/
│   │   └── v1/
│   │       ├── auth.py                       # 6 auth endpoints
│   │       ├── workflows.py                  # 6 workflow endpoints
│   │       ├── notifications.py              # 20+ notification endpoints
│   │       ├── marketplace.py                # Main marketplace router
│   │       ├── marketplace_nexas.py          # 22 nexa endpoints
│   │       ├── marketplace_sellers.py        # 15 seller endpoints
│   │       ├── marketplace_purchases.py      # 13 purchase endpoints
│   │       ├── marketplace_admin.py          # 16 admin endpoints
│   │       ├── templates.py                  # Template management
│   │       ├── integrations.py               # Third-party integrations
│   │       ├── analytics.py                  # Analytics endpoints
│   │       └── audit.py                      # Audit logging
│   │
│   ├── models/
│   │   ├── auth_models.py                    # Auth schemas
│   │   ├── workflow_models.py                # Workflow schemas
│   │   ├── notification_models.py            # Notification schemas
│   │   ├── marketplace_models.py             # 75+ marketplace models
│   │   ├── billing_models.py                 # Billing schemas
│   │   ├── analytics_models.py               # Analytics schemas
│   │   ├── audit_models.py                   # Audit schemas
│   │   ├── integration_models.py             # Integration schemas
│   │   └── template_models.py                # Template schemas
│   │
│   ├── services/
│   │   ├── firebase_service.py               # Firebase integration
│   │   ├── session_service.py                # Session management
│   │   ├── workflow_service.py               # Workflow logic
│   │   ├── notification_service.py           # Notification dispatch
│   │   ├── marketplace_service.py            # Marketplace logic
│   │   ├── stripe_service.py                 # Stripe integration
│   │   ├── analytics_service.py              # Analytics aggregation
│   │   ├── audit_service.py                  # Audit tracking
│   │   ├── billing_service.py                # Billing logic
│   │   ├── integration_service.py            # Integration logic
│   │   └── template_service.py               # Template logic
│   │
│   ├── db/
│   │   ├── notification_db.py                # Notification queries
│   │   ├── marketplace_db.py                 # Marketplace queries
│   │   ├── analytics_db.py                   # Analytics queries
│   │   ├── audit_db.py                       # Audit queries
│   │   ├── billing_db.py                     # Billing queries
│   │   ├── integration_db.py                 # Integration queries
│   │   └── template_db.py                    # Template queries
│   │
│   ├── core/
│   │   ├── config.py                         # Settings & configuration
│   │   ├── security.py                       # Rate limiting, sanitization
│   │   ├── logging.py                        # Structured logging
│   │   └── auth_dependency.py                # Auth dependencies
│   │
│   └── utils/
│       └── notification_utils.py             # Notification helpers
│
└── scripts/
    └── seed_analytics.py                     # Database seeding
```

---

## 📊 Statistics

### **Code Metrics**
- **Total API Endpoints**: 98+
- **Completed Modules**: 4/11 (36%)
- **Models/Schemas**: 100+
- **Service Classes**: 10+
- **Database Operations**: 30+

### **API Endpoint Distribution**
| Module | Endpoints | Status |
|--------|-----------|---------|
| Authentication | 6 | ✅ Complete |
| Workflows | 6 | ✅ Complete |
| Notifications | 20+ | ✅ Complete |
| Marketplace | 66+ | ✅ Complete |
| Templates | Partial | 🟡 In Progress |
| Integrations | Partial | 🟡 In Progress |
| Analytics | Partial | 🟡 In Progress |
| Audit | Partial | 🟡 In Progress |
| Billing | Partial | 🟡 In Progress |
| Workflow Engine | 0 | ⏳ Not Started |
| Developer APIs | 0 | ⏳ Not Started |

---

## 🚀 Key Technologies

- **FastAPI**: Modern async Python web framework
- **Pydantic**: Data validation & serialization
- **Firebase Admin SDK**: Authentication & Firestore
- **Stripe**: Payment processing
- **Jinja2**: Template rendering
- **Redis**: Caching (optional)
- **Celery**: Task queue (optional)
- **Python-jose**: JWT handling

---

## 📝 Example API Request/Response

### **Example 1: Create Workflow**

**Request**:
```bash
POST /api/v1/workflows
Authorization: Bearer <firebase_token>
Content-Type: application/json

{
  "name": "Send Email Alert",
  "description": "Trigger email on specific events",
  "nodes": [
    {
      "id": "node_1",
      "type": "trigger",
      "data": {"trigger_type": "webhook"}
    },
    {
      "id": "node_2",
      "type": "email",
      "data": {"to": "user@example.com"}
    }
  ],
  "edges": [
    {"source": "node_1", "target": "node_2"}
  ]
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "workflow_123",
    "userId": "user_456",
    "name": "Send Email Alert",
    "version": 1,
    "createdAt": "2024-01-20T15:30:00Z",
    "canBeListed": false
  }
}
```

### **Example 2: Send Notification**

**Request**:
```bash
POST /api/v1/notifications/send
Authorization: Bearer <firebase_token>
Content-Type: application/json

{
  "userId": "user_123",
  "channels": ["email", "in-app"],
  "title": "Welcome!",
  "message": "Your account has been created",
  "template": "welcome_template",
  "variables": {
    "userName": "John Doe"
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "notificationId": "notif_789",
    "status": "delivered",
    "channels": {
      "email": "sent",
      "in-app": "created"
    }
  }
}
```

---

## 🎯 Design Patterns Used

1. **Dependency Injection**: FastAPI's `Depends()` for auth/middleware
2. **Service Pattern**: Business logic separation
3. **Repository Pattern**: Database abstraction
4. **Decorator Pattern**: Rate limiting, authentication
5. **Async/Await**: Non-blocking I/O operations
6. **Factory Pattern**: Dynamic dependency creation
7. **Observer Pattern**: Notification system
8. **Strategy Pattern**: Multi-channel delivery

---

## 🔍 Ready for Next Tasks

Now that you understand the backend structure in detail:
- **Clean architecture** with clear layer separation
- **98+ working endpoints** across 4 major modules
- **Production-ready security** with rate limiting & validation
- **Firebase integration** for auth & database
- **Stripe integration** for payments
- **Comprehensive logging & error handling**

**I'm ready to help with whatever you need!** 🚀

Tell me:
- ❓ What feature do you want to build/modify?
- 🐛 What bug needs fixing?
- 🔄 What should be refactored?
- 📈 What should be optimized?
- 🎯 What's your specific task?
