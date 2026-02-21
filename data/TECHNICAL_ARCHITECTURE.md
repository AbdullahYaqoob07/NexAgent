# NexAgent - Technical Architecture

## System Architecture Overview

NexAgent follows a three-tier architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER (Browser)                   │
│  Next.js 15.5.2 | React 19 | TypeScript | Tailwind CSS     │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   API GATEWAY LAYER                         │
│  Axios HTTP Client | Firebase Auth | Session Management    │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND API LAYER                          │
│  FastAPI | Python | Uvicorn | Pydantic Validation         │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Firestore   │  │    Redis     │  │  External    │
│  Database    │  │    Cache     │  │  Services    │
└──────────────┘  └──────────────┘  └──────────────┘
        │                │                │
        └────────────────┼────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              WORKFLOW ENGINE LAYER                          │
│  LangGraph | Node Registry | Async Execution               │
└─────────────────────────────────────────────────────────────┘
```

## Frontend Architecture

### Technology Stack
- **Framework**: Next.js 15.5.2 (React 19)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI (20+ components)
- **State Management**: React Query (TanStack)
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios
- **Authentication**: Firebase 12.3.0
- **Animations**: Framer Motion
- **Build Tool**: Turbopack

### Directory Structure
```
app/
├── page.tsx                    # Landing page
├── layout.tsx                  # Root layout
├── globals.css                 # Global styles
├── admin321/                   # Admin dashboard
│   ├── analytics/
│   ├── audit/
│   ├── billing/
│   ├── integrations/
│   ├── marketplace/
│   ├── notifications/
│   ├── settings/
│   ├── system/
│   ├── templates/
│   ├── users/
│   ├── workflows/
│   └── layout.tsx
├── workflows/                  # Workflow management
│   ├── page.tsx               # Workflows list
│   ├── new/page.tsx           # Create workflow
│   ├── editor/page.tsx        # Workflow editor
│   ├── execution/[id]/        # Execution details
│   └── [id]/page.tsx          # Workflow details
├── credentials/               # Credential management
├── marketplace/               # Marketplace
├── dashboard/                 # User dashboard
├── profile/                   # User profile
├── settings/                  # Settings
├── sign-in/                   # Sign in page
├── sign-up/                   # Sign up page
└── api/                       # API routes

lib/
├── auth/                      # Firebase auth service
├── api/
│   ├── client.ts             # Axios HTTP client
│   ├── services/             # API service layer
│   │   ├── authService.ts
│   │   ├── workflowService.ts
│   │   ├── credentialService.ts
│   │   └── executionService.ts
│   └── types/                # TypeScript types
├── workflow/                 # Workflow engine
│   ├── WorkflowManager.ts
│   ├── engine/
│   ├── nodes/
│   ├── storage/
│   └── utils/
├── schemas/                  # Zod validation schemas
├── contexts/                 # React contexts
│   ├── AuthContext.tsx
│   └── BackendAuthContext.tsx
└── utils/                    # Utility functions

components/
├── landing/                  # Landing page components
│   ├── Navbar.tsx
│   ├── Hero.tsx
│   ├── Features.tsx
│   ├── Pricing.tsx
│   └── ...
├── dashboard/               # Dashboard components
│   ├── DashboardLayout.tsx
│   ├── Sidebar.tsx
│   └── ...
├── workflows/               # Workflow components
│   ├── WorkflowEditor.tsx
│   ├── NodePalette.tsx
│   └── ...
└── ui/                      # Radix UI components
    ├── button.tsx
    ├── card.tsx
    ├── dialog.tsx
    └── ...
```

### Key Components

#### AuthContext
Manages Firebase authentication state and provides auth methods:
- `user`: Current authenticated user
- `loading`: Auth loading state
- `signIn()`: Email/password login
- `signUp()`: Create account
- `signInWithGoogle()`: Google OAuth
- `signOut()`: Logout
- `getUserToken()`: Get Firebase ID token

#### BackendAuthContext
Manages backend session authentication:
- `user`: Backend user data
- `isAuthenticated`: Session validity
- `signIn()`: Backend login
- `signUp()`: Backend registration
- `logout()`: Backend logout
- `refreshUser()`: Refresh user data

#### DashboardLayout
Main layout for authenticated pages:
- Sidebar navigation
- User menu
- Email verification banner
- Responsive design

### HTTP Client (Axios)

```typescript
// lib/api/client.ts
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth tokens
apiClient.interceptors.request.use(async (config) => {
  // Add Firebase ID token or session token
  // Handle token refresh
  return config;
});

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 - redirect to sign-in
    // Handle other errors
    return Promise.reject(error);
  }
);
```

### State Management (React Query)

```typescript
// Example: Fetching workflows
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['workflows'],
  queryFn: () => workflowService.listWorkflows(),
  staleTime: 30 * 1000,
  retry: 2,
});
```

## Backend Architecture

### Technology Stack
- **Framework**: FastAPI
- **Server**: Uvicorn
- **Language**: Python 3.8+
- **Database**: Firestore
- **Cache**: Redis
- **Task Queue**: Celery
- **Validation**: Pydantic
- **Security**: Python-Jose, Passlib, Cryptography

### Directory Structure
```
backend/
├── app/
│   ├── main.py              # FastAPI app initialization
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes/          # API route handlers
│   │   │   ├── auth.py
│   │   │   ├── workflows.py
│   │   │   ├── credentials.py
│   │   │   └── executions.py
│   │   └── v1/              # API v1 endpoints
│   ├── core/
│   │   ├── config.py        # Configuration
│   │   ├── security.py      # Security utilities
│   │   ├── auth_dependency.py # Auth dependency
│   │   └── logging.py       # Logging setup
│   ├── db/
│   │   ├── analytics_db.py
│   │   ├── audit_db.py
│   │   ├── billing_db.py
│   │   ├── integration_db.py
│   │   ├── marketplace_db.py
│   │   ├── notification_db.py
│   │   └── template_db.py
│   ├── models/              # Pydantic models
│   ├── services/            # Business logic
│   └── utils/               # Utilities
├── requirements.txt         # Python dependencies
├── .env                     # Environment variables
└── run.py                   # Development server
```

### API Structure

#### Authentication Routes
```python
# POST /api/v1/auth/signup
# POST /api/v1/auth/signin
# POST /api/v1/auth/verify-token
# GET /api/v1/auth/me
```

#### Workflow Routes
```python
# POST /api/v1/workflows
# GET /api/v1/workflows
# GET /api/v1/workflows/{id}
# PUT /api/v1/workflows/{id}
# DELETE /api/v1/workflows/{id}
# POST /api/v1/workflows/{id}/execute
# GET /api/v1/workflows/public/list
```

#### Credential Routes
```python
# POST /api/v1/credentials
# GET /api/v1/credentials
# GET /api/v1/credentials/{id}
# PUT /api/v1/credentials/{id}
# DELETE /api/v1/credentials/{id}
```

#### Execution Routes
```python
# GET /api/v1/executions
# GET /api/v1/executions/{id}
# GET /api/v1/executions/{id}/logs
```

### Pydantic Models

```python
# Authentication
class SignUpRequest(BaseModel):
    email: str
    password: str
    display_name: Optional[str]

class SignInRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    uid: str
    email: str
    display_name: str
    created_at: datetime

# Workflows
class WorkflowCreateRequest(BaseModel):
    name: str
    description: Optional[str]
    nodes: List[WorkflowNode]
    edges: List[WorkflowEdge]
    variables: Dict[str, Any]

class WorkflowResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str]
    status: str
    version: int
    created_at: datetime
    updated_at: datetime
```

### Database Layer

#### Firestore Integration
```python
# backend/app/db/
# Each module handles specific collection operations

# Example: workflows_db.py
class WorkflowDB:
    @staticmethod
    async def create_workflow(user_id: str, data: WorkflowCreateRequest):
        # Create workflow in Firestore
        pass
    
    @staticmethod
    async def get_workflow(workflow_id: str):
        # Retrieve workflow from Firestore
        pass
    
    @staticmethod
    async def list_workflows(user_id: str):
        # List user's workflows
        pass
```

### Security

#### Authentication
- Firebase Admin SDK for token verification
- Session token generation and validation
- Token refresh mechanism
- CORS protection

#### Authorization
- User ownership verification
- Role-based access control
- Credential access restrictions

#### Data Protection
- Encrypted credential storage
- HTTPS enforcement
- Rate limiting
- Audit logging

## Workflow Engine Architecture

### Core Components

#### WorkflowManager
Main entry point for workflow operations:
```typescript
class WorkflowManager {
  createWorkflow(name: string, description?: string): Workflow
  executeWorkflow(workflow: Workflow, input: ExecutionContext): Promise<WorkflowExecution>
  validateWorkflow(workflow: Workflow): ValidationResult
  saveWorkflow(workflow: Workflow): Promise<void>
  loadWorkflow(workflowId: string): Promise<Workflow>
}
```

#### WorkflowEngine
Core execution engine:
```typescript
class WorkflowEngine {
  async execute(workflow: Workflow, context: ExecutionContext): Promise<WorkflowExecution>
  private async executeNode(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult>
  private resolveDependencies(nodes: WorkflowNode[]): WorkflowNode[]
  private substituteVariables(config: Record<string, any>, context: ExecutionContext): Record<string, any>
}
```

#### NodeRegistry
Registry for all available node types:
```typescript
class NodeRegistry {
  register(nodeType: string, handler: NodeHandler): void
  getHandler(nodeType: string): NodeHandler
  getAllNodeTypes(): string[]
  validateNodeConfig(nodeType: string, config: Record<string, any>): ValidationResult
}
```

#### Storage Providers
Multiple storage implementations:
- **BackendStorageProvider**: Uses backend API
- **FirestoreStorageProvider**: Direct Firestore access
- **LocalStorageProvider**: Browser localStorage
- **InMemoryStorageProvider**: Server-side memory

### Execution Flow

```
1. Validate Workflow
   ├─ Check trigger exists
   ├─ Validate node types
   └─ Validate connections

2. Resolve Dependencies
   ├─ Build execution graph
   ├─ Identify parallel nodes
   └─ Determine execution order

3. Execute Nodes
   ├─ Execute trigger
   ├─ Execute connected nodes
   ├─ Handle errors
   └─ Collect results

4. Track Execution
   ├─ Log node execution
   ├─ Record timing
   ├─ Track token usage
   └─ Calculate costs

5. Return Results
   ├─ Aggregate outputs
   ├─ Generate execution report
   └─ Save to database
```

### Variable Substitution

Variables are substituted using the pattern: `{{$node.nodeId.fieldName}}`

```typescript
function substituteVariables(
  config: Record<string, any>,
  context: ExecutionContext
): Record<string, any> {
  // Find all {{...}} patterns
  // Replace with values from context
  // Handle nested references
  // Return substituted config
}
```

### Error Handling

Each node can be configured with error handling:
- **Stop**: Stop workflow on error
- **Continue**: Skip node and continue
- **Retry**: Retry with exponential backoff

```typescript
async function executeNodeWithErrorHandling(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  try {
    return await executeNode(node, context);
  } catch (error) {
    switch (node.errorHandling) {
      case 'stop':
        throw error;
      case 'continue':
        return { success: false, error: error.message };
      case 'retry':
        return await retryWithBackoff(node, context);
    }
  }
}
```

## Authentication Flow

### Sign Up Flow
```
1. User enters email and password
2. Frontend calls Firebase Auth signUp()
3. Firebase creates user account
4. Frontend gets Firebase ID token
5. Frontend sends ID token to backend
6. Backend verifies token with Firebase Admin SDK
7. Backend creates user in Firestore
8. Backend generates session token
9. Frontend stores session token in localStorage
10. User redirected to dashboard
```

### Sign In Flow
```
1. User enters email and password
2. Frontend calls Firebase Auth signIn()
3. Firebase authenticates user
4. Frontend gets Firebase ID token
5. Frontend sends ID token to backend
6. Backend verifies token
7. Backend generates session token
8. Frontend stores session token
9. User redirected to dashboard
```

### API Request Flow
```
1. Frontend makes API request
2. Axios interceptor adds session token to headers
3. Backend receives request
4. Backend validates session token
5. Backend verifies user ownership
6. Backend processes request
7. Backend returns response
8. Frontend handles response
```

## Data Flow

### Workflow Creation
```
User Input
    ↓
Frontend Validation (Zod)
    ↓
API Request (POST /workflows)
    ↓
Backend Validation (Pydantic)
    ↓
Firestore Storage
    ↓
Response to Frontend
    ↓
Update React Query Cache
```

### Workflow Execution
```
User Clicks Run
    ↓
Frontend Sends Execute Request
    ↓
Backend Receives Request
    ↓
Workflow Engine Validates
    ↓
Engine Executes Nodes
    ↓
Nodes Execute Actions
    ↓
Results Collected
    ↓
Execution Saved to Firestore
    ↓
Response Sent to Frontend
    ↓
Frontend Updates UI
```

## Performance Optimization

### Frontend
- Code splitting with Next.js
- Image optimization
- CSS-in-JS optimization
- React Query caching
- Lazy loading components

### Backend
- Database indexing
- Redis caching
- Connection pooling
- Async/await for I/O
- Batch operations

### Workflow Engine
- Parallel node execution
- Lazy variable substitution
- Result caching
- Connection pooling for external APIs

## Monitoring & Logging

### Frontend Logging
- Console logs for development
- Error tracking (Sentry planned)
- Performance monitoring (Web Vitals)

### Backend Logging
- Structured logging with Python logging
- Request/response logging
- Error logging with stack traces
- Audit logging for sensitive operations

### Workflow Execution Logging
- Node execution logs
- Variable substitution logs
- Error logs
- Performance metrics

## Deployment Architecture

### Frontend Deployment
- Vercel or similar platform
- Next.js optimization
- Environment variables
- CDN for static assets
- Automatic deployments on push

### Backend Deployment
- Cloud platform (AWS, GCP, Azure)
- Docker containerization
- Environment configuration
- Redis for caching
- Celery for background jobs
- Load balancing

### Database
- Firestore (managed service)
- Automatic backups
- Replication
- Scaling

## Security Architecture

### Authentication
- Firebase Auth
- Email verification
- Password reset
- Account lockout
- MFA (planned)

### Authorization
- User ownership verification
- Role-based access control
- Workflow visibility settings
- Credential access restrictions

### Data Protection
- Encrypted credentials
- HTTPS only
- CORS protection
- Rate limiting
- Audit logging

### API Security
- Input validation (Pydantic)
- Output sanitization
- SQL injection prevention
- XSS prevention
- CSRF protection

## Scalability Considerations

### Horizontal Scaling
- Stateless API servers
- Load balancing
- Database replication
- Cache distribution

### Vertical Scaling
- Optimize database queries
- Implement caching
- Optimize algorithms
- Monitor resource usage

### Workflow Execution Scaling
- Async execution
- Task queue (Celery)
- Parallel node execution
- Result caching
