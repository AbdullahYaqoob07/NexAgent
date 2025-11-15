# NexAgent Authentication & Authorization System

## Overview
NexAgent implements a multi-layer authentication and authorization system using Firebase Auth, JWT tokens, session management, and role-based access control (RBAC).

---

## Architecture Components

### 1. Authentication Layer

#### Firebase Authentication
- **Primary Auth Provider**: Firebase Auth handles user registration, sign-in, and identity management
- **Identity Token**: Firebase generates ID tokens (JWTs) for authenticated users
- **Email Verification**: Users must verify email before full access
- **Password Reset**: Secure password reset flow via email

#### Token Verification
```python
# Location: app/core/auth_dependency.py
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    # 1. Extract Bearer token from Authorization header
    token = credentials.credentials
    
    # 2. Verify token with Firebase
    decoded_token = await firebase_service.verify_token(token)
    
    # 3. Get user document from Firestore
    user_doc = await _get_user_document(decoded_token['uid'])
    
    # 4. Return combined user data
    return {
        'uid': decoded_token['uid'],
        'email': decoded_token['email'],
        'email_verified': decoded_token['email_verified'],
        'isAdmin': user_doc.get('isAdmin'),
        'subscription': user_doc.get('subscription'),
        # ... additional user data
    }
```

#### Session Management
- **Session Creation**: When user signs in, a session token is created with:
  - Session ID
  - User ID
  - Device info (User-Agent)
  - IP address
  - Expiration (1 week default)
  
- **Single Session Enforcement**: Only one active session per user (invalidates previous sessions)
  - Prevents concurrent logins from multiple devices
  - Can be bypassed for specific use cases

- **Session Verification**: Before each request, session is verified to ensure:
  - Token hasn't expired
  - Session still exists in database
  - User hasn't logged out

---

### 2. Authorization Layer

#### Role-Based Access Control (RBAC)

**Available Roles**:
```python
{
    'admin': {
        'description': 'Full system access',
        'permissions': [
            'admin:create_users',
            'admin:manage_roles',
            'admin:view_all_workflows',
            'admin:manage_marketplace',
            'admin:view_analytics',
            'admin:manage_billing',
            'admin:manage_audit_logs'
        ]
    },
    'user': {
        'description': 'Regular user access',
        'permissions': [
            'user:create_workflows',
            'user:view_own_workflows',
            'user:execute_workflows',
            'user:view_profile',
            'user:browse_marketplace'
        ]
    },
    'viewer': {
        'description': 'Read-only access',
        'permissions': [
            'user:view_own_workflows',
            'user:view_profile',
            'user:browse_marketplace'
        ]
    }
}
```

#### Permission Checking
```python
# Location: app/core/security.py
@require_permissions(['admin:manage_marketplace'])
async def manage_marketplace(current_user: Dict[str, Any]):
    # Only users with 'admin:manage_marketplace' permission can access
    pass

# OR

async def get_admin_user(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    is_admin = (
        current_user.get('isAdmin', False) or 
        current_user.get('role') == 'admin' or
        current_user.get('firebase_claims', {}).get('admin', False)
    )
    
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return current_user
```

---

### 3. Endpoint Authentication Patterns

#### Pattern 1: Public Endpoints (No Auth Required)
```python
@router.get("/marketplace/browse")
async def browse_marketplace():
    # No authentication required
    # Anyone can browse marketplace templates
    pass
```

#### Pattern 2: Authenticated Endpoints (User Only)
```python
@router.post("/workflows", status_code=201)
async def create_workflow(
    request: WorkflowCreateRequest,
    current_user: dict = Depends(get_current_user)  # <- Requires auth
):
    user_id = current_user['uid']
    # Create workflow for authenticated user
    pass
```

#### Pattern 3: Admin-Only Endpoints
```python
@router.get("/admin/users")
async def list_all_users(
    current_user: dict = Depends(get_admin_user)  # <- Requires admin role
):
    # Only admins can list all users
    pass
```

#### Pattern 4: Subscription-Required Endpoints
```python
@router.post("/workflows/execute")
async def execute_workflow(
    current_user: dict = Depends(require_subscription)  # <- Requires active subscription
):
    subscription_status = current_user.get('subscription', {}).get('status')
    if subscription_status not in ['active', 'trialing']:
        raise HTTPException(status_code=402, detail="Active subscription required")
    pass
```

#### Pattern 5: Plan-Level Endpoints
```python
@router.post("/api/integrations/advanced")
async def use_advanced_integration(
    current_user: dict = Depends(require_plan_level('pro'))  # <- Requires 'pro' plan
):
    # Only users with 'pro' or higher plans can use advanced integrations
    pass
```

#### Pattern 6: Data Access Control
```python
@router.get("/users/{user_id}/profile")
async def get_user_profile(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Verify user can access target user's data
    await verify_user_access(user_id, current_user)
    
    # Access rules:
    # 1. Users can view their own data
    # 2. Admins can view any user's data
    # 3. Organization members can view team data
    pass
```

---

### 4. Security Mechanisms

#### Rate Limiting
```python
# Location: app/core/security.py
@rate_limit(requests_per_minute=60, window_minutes=1)
@router.post("/auth/signin")
async def sign_in(request: SignInRequest, req: Request):
    # Limited to 60 requests per minute per client
    pass
```

**Rate Limiting Rules**:
- Per user: Identified by user ID (if authenticated)
- Per API key: Identified by API key hash
- Per IP: Fallback to IP + User-Agent hash
- Uses in-memory store (can be upgraded to Redis)

#### Input Sanitization
```python
# Location: app/core/security.py
def sanitize_input(data: Any, max_length: int = 1000) -> Any:
    # Removes null bytes and control characters
    # Truncates long strings
    # Applies regex filtering for allowed characters
    # Recursively sanitizes dicts and lists
    pass
```

#### Password Hashing
```python
# Location: app/core/security.py
def hash_sensitive_data(data: str, salt: Optional[str] = None) -> str:
    # Uses PBKDF2 with SHA-256
    # 100,000 iterations
    # Random salt per hash
    # Returns: salt + hash (hex encoded)
    pass
```

#### API Key Management
```python
def generate_api_key(user_id: str, permissions: List[str] = None) -> str:
    # Generates: nxa_{random_part}_{metadata_encoded}
    # Format: nxa_URLSAFE32CHARS_BASE64METADATA
    # Metadata includes: user_id, permissions, created_at
    pass

def validate_api_key(api_key: str) -> Optional[Dict[str, Any]]:
    # Validates format
    # Decodes metadata
    # Returns permissions and user_id
    pass
```

---

## API Endpoint Authentication Matrix

### Authentication Endpoints
| Endpoint | Method | Auth Required | Role | Rate Limit |
|----------|--------|---------------|------|-----------|
| `/auth/signup` | POST | No | - | 5/min |
| `/auth/signin` | POST | No | - | 10/min |
| `/auth/verify-token` | POST | No | - | 20/min |
| `/auth/forgot-password` | POST | No | - | 3/min |
| `/auth/logout` | POST | Firebase Token | User | Yes |
| `/auth/me` | GET | Firebase Token | User | Yes |
| `/auth/admin/init` | POST | No | - | 1/setup |
| `/auth/verify-admin` | POST | Firebase Token | Admin | Yes |

### Workflow Endpoints
| Endpoint | Method | Auth Required | Role | Rate Limit |
|----------|--------|---------------|------|-----------|
| `POST /workflows` | POST | Firebase Token | User | Yes |
| `GET /workflows` | GET | Firebase Token | User | Yes |
| `GET /workflows/{id}` | GET | Firebase Token | User/Public | Yes |
| `PATCH /workflows/{id}` | PATCH | Firebase Token | Owner/Admin | Yes |
| `DELETE /workflows/{id}` | DELETE | Firebase Token | Owner/Admin | Yes |
| `POST /workflows/{id}/execute` | POST | Session Token | Subscriber | Yes |

### Marketplace Endpoints
| Endpoint | Method | Auth Required | Role | Rate Limit |
|----------|--------|---------------|------|-----------|
| `GET /marketplace/browse` | GET | No | - | Yes |
| `GET /marketplace/nexas` | GET | No | - | Yes |
| `POST /marketplace/purchases` | POST | Firebase Token | Subscriber | Yes |
| `GET /marketplace/admin` | GET | Firebase Token | Admin | Yes |
| `POST /marketplace/admin` | POST | Firebase Token | Admin | Yes |

### Admin Endpoints
| Endpoint | Method | Auth Required | Role | Rate Limit |
|----------|--------|---------------|------|-----------|
| `GET /admin/users` | GET | Firebase Token | Admin | Yes |
| `POST /admin/roles` | POST | Firebase Token | SuperAdmin | Yes |
| `GET /admin/audit-logs` | GET | Firebase Token | Admin | Yes |
| `GET /admin/analytics` | GET | Firebase Token | Admin | Yes |

---

## Request Flow Examples

### Example 1: User Registration & Sign In

```
1. User signs up via frontend
   POST /auth/signup
   {
       "email": "user@example.com",
       "password": "securepass123",
       "display_name": "John Doe"
   }
   ↓
   Backend: Create user in Firebase Auth
   ↓
   Create user document in Firestore
   ↓
   Send verification email
   ↓
   Response: User created, email sent

2. User confirms email and signs in
   POST /auth/signin
   {
       "email": "user@example.com",
       "password": "securepass123"
   }
   ↓
   Backend: Verify password with Firebase
   ↓
   Create session (single session enforcement)
   ↓
   Response: Session token (1 week validity)

3. User makes authenticated request
   GET /workflows
   Headers: {
       "Authorization": "Bearer {firebase_id_token}",
       "X-Session-Token": "{session_token}"
   }
   ↓
   Backend: Verify Firebase token
   ↓
   Verify session is valid
   ↓
   Check user has active subscription
   ↓
   Return user's workflows
```

### Example 2: Admin Operations

```
1. Admin signs in with admin email
   POST /auth/verify-token
   {
       "token": "{firebase_id_token_with_admin_claims}"
   }
   ↓
   Backend: Verify Firebase token
   ↓
   Check for admin custom claims
   ↓
   Response: Admin access, metadata, permissions

2. Admin accesses admin-only endpoint
   GET /admin/users
   Headers: {
       "Authorization": "Bearer {admin_firebase_token}"
   }
   ↓
   Backend: Verify token and check admin status
   ↓
   get_admin_user dependency checks isAdmin=true
   ↓
   Return all users (admin can view any user's data)

3. Admin manages marketplace
   POST /marketplace/admin/publish
   Headers: {
       "Authorization": "Bearer {admin_firebase_token}"
   }
   ↓
   Backend: Verify admin token
   ↓
   Check admin:manage_marketplace permission
   ↓
   Process marketplace operation
```

### Example 3: Subscription-Protected Feature

```
1. User executes workflow
   POST /workflows/{id}/execute
   Headers: {
       "Authorization": "Bearer {firebase_token}",
       "X-Session-Token": "{session_token}"
   }
   ↓
   Backend: Verify authentication
   ↓
   Execute: Depends(get_current_user)
   ↓
   Check: subscription.status in ['active', 'trialing']
   ↓
   If not subscribed:
       Response: 402 Payment Required
       "Active subscription required"
   ↓
   If subscribed:
       Execute workflow
       Record execution metrics
       Update usage statistics
```

---

## Token Types & Lifespans

### Firebase ID Token
- **Purpose**: User identity verification
- **Lifespan**: 1 hour
- **Renewal**: Refreshed via Firebase SDK on client
- **Contains**: uid, email, email_verified, name, picture, admin claims
- **Used For**: All authenticated API calls

### Session Token
- **Purpose**: Session management & single-device enforcement
- **Lifespan**: 1 week
- **Storage**: Secure HTTP-only cookie OR encrypted localStorage
- **Renewal**: No automatic renewal (requires re-login)
- **Used For**: Verifying session validity across requests

### API Key
- **Format**: `nxa_{random32chars}_{base64metadata}`
- **Lifespan**: Long-lived (manually revoked)
- **Permissions**: Subset of user permissions
- **Used For**: Programmatic access, webhooks, integrations

---

## Error Responses

### Authentication Errors

```json
{
    "401 Unauthorized": {
        "detail": "Invalid or expired token",
        "headers": {"WWW-Authenticate": "Bearer"}
    }
}

{
    "401 Unauthorized": {
        "detail": "Session expired or invalid. Please sign in again from this device."
    }
}

{
    "401 Unauthorized": {
        "detail": "Invalid or expired Firebase token"
    }
}
```

### Authorization Errors

```json
{
    "403 Forbidden": {
        "detail": "Admin access required"
    }
}

{
    "403 Forbidden": {
        "detail": "Access denied to user data"
    }
}

{
    "403 Forbidden": {
        "detail": "Insufficient permissions. Required: admin:manage_marketplace"
    }
}
```

### Subscription Errors

```json
{
    "402 Payment Required": {
        "detail": "Active subscription required"
    }
}

{
    "402 Payment Required": {
        "detail": "Plan upgrade required. Minimum plan: pro"
    }
}
```

### Rate Limiting

```json
{
    "429 Too Many Requests": {
        "detail": "Rate limit exceeded. Try again in 45 seconds.",
        "headers": {"Retry-After": "45"}
    }
}
```

---

## Security Best Practices

### Frontend
1. Store Firebase ID token in secure HTTP-only cookies
2. Store session token in secure storage
3. Include both tokens in API requests
4. Implement automatic token refresh
5. Clear tokens on logout

### Backend
1. Always verify Firebase token signature
2. Check token expiration
3. Verify session validity on every request
4. Use HTTPS only
5. Implement rate limiting
6. Sanitize all inputs
7. Log authentication events
8. Rotate API keys regularly
9. Implement CSP headers
10. Use strong password requirements

### Database
1. Encrypt sensitive data at rest
2. Encrypt credentials in transit
3. Hash passwords with PBKDF2
4. Store audit logs
5. Implement field-level encryption for PII

---

## Admin Setup & Initialization

### First-Time Admin Setup

```bash
# 1. Create admin user in Firebase
# Email: admin@gmail.com
# Password: Set secure password

# 2. Initialize admin privileges
POST /auth/admin/init
{
    "email": "admin@gmail.com"
}

# 3. Admin must sign out and sign in again
# Firebase automatically refreshes claims

# 4. Admin can now access admin panel
GET /admin321
Headers: {
    "Authorization": "Bearer {admin_firebase_token}"
}
```

### Creating Additional Admins

```bash
# Only initial admin can create additional admins
POST /admin/roles/assign
{
    "user_id": "target_user_id",
    "role": "admin"
}
```

---

## Integration Examples

### Making Authenticated Requests

```javascript
// Frontend: Sign in and get tokens
const response = await firebase.auth().signInWithEmailAndPassword(email, password);
const idToken = await response.user.getIdToken();
const sessionToken = response.sessionToken;

// Make authenticated request
const result = await fetch('/api/v1/workflows', {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${idToken}`,
        'X-Session-Token': sessionToken,
        'Content-Type': 'application/json'
    }
});

// Handle 401 - refresh token or redirect to login
if (result.status === 401) {
    // Redirect to login
    window.location.href = '/login';
}

// Handle 403 - insufficient permissions
if (result.status === 403) {
    // Show "Access Denied" message
}

// Handle 402 - subscription required
if (result.status === 402) {
    // Redirect to upgrade plan
}
```

```python
# Backend: Verify auth in endpoint
@router.post("/workflows/{id}/execute")
async def execute_workflow(
    workflow_id: str,
    current_user: dict = Depends(get_current_user),  # Auth check
    _: dict = Depends(require_subscription)  # Subscription check
):
    user_id = current_user['uid']
    
    # Execute workflow
    result = await execution_service.execute(workflow_id, user_id)
    
    return result
```

---

## Monitoring & Audit

### Audit Logging
- All authentication attempts logged
- All authorization checks logged
- All permission denials logged
- All role changes logged
- All API key generations logged

### Metrics Tracked
- Failed login attempts
- Rate limit violations
- Permission denials
- Token verification failures
- Session creation/revocation

