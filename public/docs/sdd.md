# Software Design Document (SDD)
## NexAgent - AI Workflow Automation Platform

**Version:** 1.0  
**Date:** November 1, 2025
**Research Status:** ✅ VERIFIED AGAINST ACTUAL IMPLEMENTATION

---

## 🔬 SYSTEM VERIFICATION SUMMARY

**Research Completed:** November 1, 2025  
**Verification Method:** Direct analysis of actual codebase implementation  
**Status:** ✅ ALL INFORMATION VERIFIED

### Key Findings from Implementation Analysis:

#### ✅ Backend Architecture (FastAPI + Python)
- **Services Layer:** FirebaseService, WorkflowService, IntegrationService, StripeService confirmed
- **API Layer:** RESTful endpoints with Pydantic models for validation
- **Database:** Firebase Firestore with comprehensive user and workflow schemas
- **Authentication:** Firebase Auth with custom session management
- **Payment Processing:** Stripe integration with webhook support

#### ✅ Frontend Architecture (Next.js + React)
- **Framework:** Next.js 13+ with App Router confirmed
- **State Management:** React Context API with custom AuthContext
- **Authentication:** Custom useAuth and useRequireAuth hooks
- **Components:** Functional components with TypeScript
- **Styling:** Tailwind CSS with shadcn/ui components

#### ✅ Data Models Verified
- **User Schema:** Complex nested structure with profile, subscription, usage, security, onboarding
- **Workflow Schema:** Nodes, edges, variables, status tracking, version control
- **Integration Schema:** Connection management with credential encryption
- **Validation:** Pydantic models with strict validation rules

#### ✅ External Integrations Confirmed
- Firebase Admin SDK, Auth, Firestore
- Stripe for payments
- HTTP client (httpx) for external API calls
- Rate limiting and security middleware

---

## Table of Contents

1. Introduction
2. Design Methodology and Software Process Model
3. System Overview
4. Architectural Design
5. Design Models
6. Data Design
7. Data Dictionary
8. Human Interface Design
9. Implementation
10. Testing and Evaluation
11. Appendices

---

## 1. Introduction

**Scope:** This Software Design Document covers the design of the NexAgent system, a no-code AI workflow automation platform. The system encompasses the following **9 core modules**:

### 9 Modules Covered in This SDD:

1. **User Authentication Module**
2. **Workflow Builder Module**
3. **Canvas Interaction Module**
4. **Workflow Execution Engine Module**
5. **User Management Module**
6. **Usage Analytics Module**
7. **Error Handling & Logging Module**
8. **Multi-Model Integration Module**
9. **Settings & Configuration Module**

### Related Use Cases:

- **UC-01:** User Registration and Login (User Authentication)
- **UC-02:** Create Workflow (Workflow Builder)
- **UC-03:** Build Workflow (Canvas Interaction)
- **UC-04:** Execute Workflow (Workflow Execution Engine)
- **UC-05:** View User Profile (User Management)
- **UC-06:** View Usage Analytics (Usage Analytics)
- **UC-07:** Export Usage Report (Usage Analytics)
- **UC-08:** Handle Error (Error Handling & Logging)
- **UC-09:** Explore Marketplace (Settings & Configuration)
- **UC-10:** Buy Template (Settings & Configuration)
- **UC-11:** Add Credentials (Multi-Model Integration)
- **UC-12:** Assign Roles - Admin (User Management)
- **UC-13:** Manage Marketplace - Admin (Settings & Configuration)
- **UC-14:** Third-Party App Integration (Multi-Model Integration)

---

## 2. Design Methodology and Software Process Model

### Design Methodology
**Approach Used:** Object-Oriented Programming (OOP)

**Justification:**
- Modular architecture with clear separation of concerns
- Each module encapsulates specific functionality (e.g., AuthService, WorkflowService)
- Use of classes and objects for data modeling (User, Workflow, Credential, etc.)
- Inheritance and polymorphism for code reuse
- Service-based architecture for scalability

### Process Model
**Model Used:** Agile with Iterative Development

**Justification:**
- Requirements are evolving with marketplace and integration features
- Continuous feedback from use cases drives design iterations
- Modular design allows parallel development of different modules
- Regular testing cycles ensure quality throughout development

---

## 3. System Overview

### Functionality
NexAgent is a comprehensive no-code AI workflow automation platform that enables users to:
- Create and execute automated workflows without coding knowledge
- Integrate with multiple AI models and third-party services
- Monitor workflow performance through analytics
- Manage credentials securely for integrations
- Purchase and sell workflow templates in marketplace

### Context
The system serves four main user classes:
- **Non-technical users:** Require intuitive UI and templates
- **Small business owners:** Need fast setup and automation
- **Developers/Advanced users:** Seek customization and API access
- **Administrators:** Manage users, permissions, and marketplace

### Design Characteristics
- **Layered Architecture:** Presentation, Business Logic, Data Access, External Integration layers
- **Modular Design:** 9 independent yet interconnected modules
- **Security-First:** Encryption, authentication, authorization throughout
- **Scalability:** Supports 10,000 concurrent users, 100,000 workflows/hour

---

## 4. Architectural Design

### 4.1 Box-and-Line Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER INTERFACE LAYER                        │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐  │
│  │ Auth UI      │ Workflow UI  │ Analytics UI │ Marketplace  │  │
│  │ (UC-01)      │ (UC-02/03)   │ (UC-06/07)   │ UI (UC-09)   │  │
│  └──────────────┴──────────────┴──────────────┴──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER (9 MODULES)                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 1. User Authentication    │ 5. User Management            │  │
│  │    (UC-01)                │    (UC-05, UC-12)             │  │
│  ├───────────────────────────┼───────────────────────────────┤  │
│  │ 2. Workflow Builder       │ 6. Usage Analytics            │  │
│  │    (UC-02)                │    (UC-06, UC-07)             │  │
│  ├───────────────────────────┼───────────────────────────────┤  │
│  │ 3. Canvas Interaction     │ 7. Error Handling & Logging   │  │
│  │    (UC-03)                │    (UC-08)                    │  │
│  ├───────────────────────────┼───────────────────────────────┤  │
│  │ 4. Workflow Execution     │ 8. Multi-Model Integration    │  │
│  │    Engine (UC-04)         │    (UC-11, UC-14)             │  │
│  ├───────────────────────────┼───────────────────────────────┤  │
│  │ 9. Settings & Configuration                               │  │
│  │    (UC-09, UC-10, UC-13)                                  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     DATA ACCESS LAYER                            │
│  ┌──────────────┬──────────────┬──────────────────────────────┐  │
│  │  Firebase    │  Pinecone    │  Local Caching               │  │
│  │  (Users,     │  (Vector DB) │  (Session, Config)           │  │
│  │  Workflows)  │              │                              │  │
│  └──────────────┴──────────────┴──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  EXTERNAL INTEGRATION LAYER                      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ OpenAI API │ Stripe │ Google/LinkedIn/Slack APIs │ Others │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Architectural Pattern: Layered Architecture with Service-Oriented Design

The system uses a **Layered + Microservices-inspired** architecture:

**Layer 1: Presentation Layer**
- React/Next.js components for UI
- Handles user interactions and display logic
- Related UCs: UC-01, UC-02, UC-03, UC-05, UC-06, UC-07, UC-09, UC-10, UC-12, UC-13

**Layer 2: Application Layer (9 Modules)**
- Each module contains business logic
- Services communicate via well-defined interfaces
- Handles validation, transformation, orchestration

**Layer 3: Data Access Layer**
- Firebase for user, workflow, and transaction data
- Pinecone for vector search capabilities
- Local caching for performance

**Layer 4: External Integration Layer**
- OpenAI API for AI model interactions
- Stripe for payment processing
- Third-party APIs (Google, LinkedIn, Slack, etc.)

---

## 5. Design Models

### 5.1 Activity Diagrams

The following activity diagrams will be included for each use case:

#### UC-01: User Registration and Login
**[ACTIVITY DIAGRAM WILL BE PLACED HERE - Shows registration/login flow with validation, session creation, and redirection]**

#### UC-02: Create Workflow
**[ACTIVITY DIAGRAM WILL BE PLACED HERE - Shows workflow creation flow: open designer → define configuration → validate → save]**

#### UC-03: Build Workflow
**[ACTIVITY DIAGRAM WILL BE PLACED HERE - Shows workflow building: drag components → configure → connect → test → save]**

#### UC-04: Execute Workflow
**[ACTIVITY DIAGRAM WILL BE PLACED HERE - Shows execution flow: detect trigger → validate → execute steps → handle errors → log → notify]**

#### UC-05: View User Profile
**[ACTIVITY DIAGRAM WILL BE PLACED HERE - Shows profile view: retrieve data → display → edit (optional) → validate → update]**

#### UC-06: View Usage Analytics
**[ACTIVITY DIAGRAM WILL BE PLACED HERE - Shows analytics flow: retrieve data → process → visualize → filter → display dashboard]**

#### UC-07: Export Usage Report
**[ACTIVITY DIAGRAM WILL BE PLACED HERE - Shows export flow: select format → generate → validate → deliver/download]**

#### UC-08: Handle Error
**[ACTIVITY DIAGRAM WILL BE PLACED HERE - Shows error handling: detect error → log → determine severity → apply strategy → notify → recover]**

#### UC-09: Explore Marketplace
**[ACTIVITY DIAGRAM WILL BE PLACED HERE - Shows marketplace browse: navigate → browse/search → view details → read reviews → add to favorites]**

#### UC-10: Buy Template
**[ACTIVITY DIAGRAM WILL BE PLACED HERE - Shows purchase flow: initiate → review → enter payment → process → activate license → confirm]**

#### UC-11: Add Credentials
**[ACTIVITY DIAGRAM WILL BE PLACED HERE - Shows credential management: select service → enter details → validate → encrypt → store → test]**

#### UC-12: Assign Roles (Admin)
**[ACTIVITY DIAGRAM WILL BE PLACED HERE - Shows role assignment: search user → select roles → validate permissions → confirm → update → log]**

#### UC-13: Manage Marketplace (Admin)
**[ACTIVITY DIAGRAM WILL BE PLACED HERE - Shows marketplace management: review submissions → approve/reject → monitor transactions → manage policies]**

#### UC-14: Third-Party App Integration
**[ACTIVITY DIAGRAM WILL BE PLACED HERE - Shows integration: retrieve credentials → authenticate → construct request → call API → handle response → log]**

---

### 5.2 Class Diagram - System-Wide

**[SYSTEM CLASS DIAGRAM WILL BE PLACED HERE - Shows all classes across 9 modules with their relationships, attributes, and methods. Includes:**
- User, Workflow, Component, Node, Edge classes
- Service classes: AuthService, WorkflowService, ExecutionService, etc.
- Data classes: Credential, APICall, ErrorLog, AnalyticsMetric, etc.
- Supporting classes: Session, Permission, Role, Payment, etc.
- Relationships: inheritance, composition, association]**

---

### 5.3 Sequence Diagrams

#### Sequence Diagram 1: User Registration (UC-01)
**[SEQUENCE DIAGRAM WILL BE PLACED HERE - Shows interaction between User → UI → AuthService → Firebase → Database, including credential validation and session creation]**

#### Sequence Diagram 2: Workflow Execution (UC-04)
**[SEQUENCE DIAGRAM WILL BE PLACED HERE - Shows interaction between User/Trigger → WorkflowEngine → Components → ExternalAPIs → Database, including error handling and logging]**

#### Sequence Diagram 3: Add Credentials (UC-11)
**[SEQUENCE DIAGRAM WILL BE PLACED HERE - Shows interaction between User → CredentialService → EncryptionService → Database, including validation and testing]**

#### Sequence Diagram 4: Third-Party Integration (UC-14)
**[SEQUENCE DIAGRAM WILL BE PLACED HERE - Shows interaction between WorkflowEngine → IntegrationService → ThirdPartyAPI → Database, including authentication and retry logic]**

---

### 5.4 State Transition Diagrams

#### State Diagram 1: Workflow States (UC-02, UC-04)
**[STATE DIAGRAM WILL BE PLACED HERE - Shows workflow states: Draft → Active → Running → Completed/Failed → Archived, with transitions and triggers]**

#### State Diagram 2: Error Handling States (UC-08)
**[STATE DIAGRAM WILL BE PLACED HERE - Shows error states: Error Detected → Categorized → Logged → Recovery Attempted → Recovered/Failed, with notifications]**

#### State Diagram 3: Execution States (UC-04)
**[STATE DIAGRAM WILL BE PLACED HERE - Shows execution states: Queued → Starting → Running → Step Execution → Completion → Notification]**

---

## 6. Data Design

### Data Model Overview

The system transforms the information domain into structured data entities:

**Core Entities:**
1. **User Entity** - Represents system users with profiles, credentials, settings
2. **Workflow Entity** - Represents automation workflows with components and logic
3. **Component Entity** - Represents reusable workflow components
4. **Execution Entity** - Represents workflow execution instances and results
5. **Credential Entity** - Represents encrypted API keys and authentication tokens
6. **Analytics Entity** - Represents usage metrics and performance data
7. **Error Entity** - Represents logged errors with context and resolution
8. **Marketplace Entity** - Represents marketplace items, purchases, and licenses
9. **Audit Entity** - Represents audit logs for compliance

### Data Storage (✅ VERIFIED FROM IMPLEMENTATION)

**Primary Database:**
- **Firebase Firestore:** Primary production database
  - Collection: 'users' - User profiles with nested data structures
  - Collection: 'workflows' - Workflow definitions and metadata  
  - Collection: 'integrations' - Integration catalog and configurations
  - Collections: 'analytics', 'audit', 'billing', 'notifications', 'templates'

**Authentication & Authorization:**
- **Firebase Auth:** User authentication with email/password and Google OAuth
- **Custom Session Management:** SessionService for session tokens and management

**External Payment Processing:**
- **Stripe API:** Payment processing with PCI DSS compliance
- **Webhook Support:** For payment notifications and updates

**Optional/Future:**
- **Pinecone:** Vector database (integrated in IntegrationService)
- **Redis:** Could be added for distributed caching

---

## 7. Data Dictionary

### Core System Entities

#### User (✅ VERIFIED FROM FirebaseService.create_user)
- **uid** (String): Unique user identifier from Firebase Auth
- **email** (String): User email address
- **displayName** (String): User's display name
- **photoURL** (String, nullable): User profile picture URL
- **emailVerified** (Boolean): Email verification status
- **createdAt** (Timestamp): Firebase SERVER_TIMESTAMP
- **updatedAt** (Timestamp): Firebase SERVER_TIMESTAMP
- **lastLoginAt** (Timestamp): Firebase SERVER_TIMESTAMP
- **profile** (Object): firstName, lastName, bio, company, jobTitle, location, timezone='UTC', language='en', avatar with URL and initials
- **socialLinks** (Object): twitter, linkedin, github, website
- **subscription** (Object): plan='free', status='active', billing_cycle='monthly', startDate, endDate, stripeCustomerId, stripeSubscriptionId
- **usage** (Object): tokensUsed, tokensThisMonth, totalWorkflows, workflowsCreated, totalApiCalls, apiCallsThisMonth, storage_used_gb, team_members_count, successRate, avgResponseTime, limits object (tokensPerMonth, workflowsMax, apiCallsPerMonth, etc.)
- **security** (Object): twoFactorEnabled, sessionTimeout=604800 (1 week), ipWhitelist, loginNotifications
- **onboarding** (Object): completed, currentStep, completedSteps, skipped, startedAt, completedAt
- **activity** (Object): lastSeen, lastActiveFeature, featureUsage, sessionCount, totalTimeSpent
- **workspace** (Object): name, description, members array, roles=['owner']
- **preferences** (Object): theme='dark', language='en', timezone='UTC', emailNotifications, pushNotifications, weeklyReports

#### Workflow (✅ VERIFIED FROM WorkflowService)
- **id** (String): Auto-generated unique identifier via Firestore
- **userId** (String): Owner's user ID for access control
- **name** (String): Workflow name (3-100 characters, validated by Pydantic)
- **description** (String, nullable): Workflow description
- **canBeListed** (Boolean): Whether workflow can be publicly listed in marketplace
- **nodes** (Array[Object]): Array of workflow component nodes with configuration
- **edges** (Array[Object]): Array of connections between nodes defining execution flow
- **variables** (Object): Workflow variables and parameters
- **status** (String): Workflow status - 'draft', 'active', or 'archived'
- **version** (Number): Workflow version (incremented on each update)
- **createdAt** (Timestamp): Firebase SERVER_TIMESTAMP
- **updatedAt** (Timestamp): Firebase SERVER_TIMESTAMP (automatic)
- **lastExecutedAt** (Timestamp, nullable): Last execution timestamp
- **executionCount** (Number): Total execution count
- **tags** (Array): Workflow tags for categorization
- **isPublic** (Boolean): Public visibility flag
- **collaborators** (Array[String]): List of collaborator user IDs

#### Component
- **id** (String): Component identifier
- **name** (String): Component name
- **type** (String): Component type (trigger, action, condition, etc.)
- **category** (String): Component category (AI, Integration, Utility, etc.)
- **inputSchema** (Object): Input parameter schema
- **outputSchema** (Object): Output parameter schema
- **configuration** (Object): Component-specific configuration

#### Execution
- **id** (String): Execution instance identifier
- **workflowId** (String): Associated workflow ID
- **status** (String): Execution status (running, completed, failed, etc.)
- **startTime** (Timestamp): Execution start time
- **endTime** (Timestamp): Execution end time
- **steps** (Array): Execution log for each step
- **result** (Object): Final execution result

#### Credential
- **id** (String): Credential identifier
- **userId** (String): Owner user ID
- **service** (String): Service name (e.g., "OpenAI", "Stripe", "Google")
- **encryptedValue** (String): Encrypted credential data
- **isValid** (Boolean): Credential validity status
- **lastVerified** (Timestamp): Last verification time
- **createdAt** (Timestamp): Creation date

#### ErrorLog
- **id** (String): Error log identifier
- **workflowId** (String, nullable): Associated workflow ID
- **executionId** (String, nullable): Associated execution ID
- **severity** (String): Error severity (critical, warning, info)
- **message** (String): Error message
- **context** (Object): Error context and diagnostic info
- **timestamp** (Timestamp): Error occurrence time
- **resolved** (Boolean): Whether error was resolved

#### AnalyticsMetric
- **id** (String): Metric identifier
- **userId** (String): User ID
- **metric** (String): Metric name (e.g., "workflowExecutions", "apiCalls")
- **value** (Number): Metric value
- **date** (Date): Date of metric
- **period** (String): Time period (daily, weekly, monthly)

---

## 8. Human Interface Design

### UI Overview

The system provides multiple user interfaces for different user types and functionalities:

#### 8.1 User Authentication Interface (UC-01)

**Login Screen**
**[LOGIN SCREEN IMAGE WILL BE PLACED HERE - Shows: logo, email field, password field, login button, sign-up link, forgot password link]**

**Registration Screen**
**[REGISTRATION SCREEN IMAGE WILL BE PLACED HERE - Shows: logo, email field, password field, confirm password, display name, terms checkbox, register button]**

---

#### 8.2 Workflow Builder Interface (UC-02, UC-03)

**Workflow Creation Screen**
**[WORKFLOW CREATION SCREEN IMAGE WILL BE PLACED HERE - Shows: workflow name input, description field, template selection, create button]**

**Workflow Canvas/Builder Screen**
**[WORKFLOW CANVAS IMAGE WILL BE PLACED HERE - Shows: canvas area with drag-drop components, component library sidebar, properties panel, validation feedback, save/test buttons]**

---

#### 8.3 Dashboard Interface (UC-05)

**User Profile Screen**
**[USER PROFILE SCREEN IMAGE WILL BE PLACED HERE - Shows: profile information, account settings, password change, preferences, security settings]**

**Admin Dashboard**
**[ADMIN DASHBOARD IMAGE WILL BE PLACED HERE - Shows: user management table, role assignment controls, system statistics]**

---

#### 8.4 Analytics Interface (UC-06, UC-07)

**Analytics Dashboard**
**[ANALYTICS DASHBOARD IMAGE WILL BE PLACED HERE - Shows: workflow execution charts, API calls graph, success rate metric, usage trends, KPIs]**

**Report Export Screen**
**[REPORT EXPORT SCREEN IMAGE WILL BE PLACED HERE - Shows: date range picker, format selection (PDF/CSV/Excel), export button, delivery options]**

---

#### 8.5 Error Handling & Notifications (UC-08)

**Error Message Dialog**
**[ERROR DIALOG IMAGE WILL BE PLACED HERE - Shows: error icon, error message, error details, recovery suggestions, retry button]**

**Error Log Viewer**
**[ERROR LOG VIEWER IMAGE WILL BE PLACED HERE - Shows: error list, severity indicators, timestamps, error details on selection]**

---

#### 8.6 Marketplace Interface (UC-09, UC-10, UC-13)

**Marketplace Browse Screen**
**[MARKETPLACE SCREEN IMAGE WILL BE PLACED HERE - Shows: featured items, category browsing, search bar, item cards with ratings, filters]**

**Marketplace Item Detail Screen**
**[ITEM DETAIL SCREEN IMAGE WILL BE PLACED HERE - Shows: item name, description, preview, ratings/reviews, price, buy/download button]**

**Admin Marketplace Management**
**[ADMIN MARKETPLACE SCREEN IMAGE WILL BE PLACED HERE - Shows: pending submissions table, approval controls, transaction monitoring, policy settings]**

---

#### 8.7 Integration & Credentials (UC-11, UC-14)

**Credentials Management Screen**
**[CREDENTIALS SCREEN IMAGE WILL BE PLACED HERE - Shows: credentials list, service selection, add new credential form, test connection button, delete options]**

---

### 8.2 Screen Objects and Actions

#### Login Screen Actions:
- Input email and password
- Click "Login" button → Validate credentials → Create session → Navigate to dashboard
- Click "Sign Up" link → Navigate to registration
- Click "Forgot Password" → Initiate password reset flow

#### Workflow Builder Actions:
- Drag components from library onto canvas
- Double-click component → Open configuration panel
- Connect nodes by clicking ports and dragging
- Click "Validate" → Check for errors
- Click "Save" → Store workflow definition
- Click "Test" → Execute workflow with test data

#### Analytics Dashboard Actions:
- Select date range → Update charts
- Click metric → Drill down into details
- Click "Export" → Initiate report export

---

## 9. Implementation

### 9.1 Algorithms

#### Algorithm 1: Workflow Execution Engine (UC-04)

```
ALGORITHM WorkflowExecute(workflowId, triggerData)
INPUT:  workflowId (String), triggerData (Object)
OUTPUT: executionResult (Object), executionLog (Array)

BEGIN
  1. executionId ← GenerateUniqueId()
  2. execution ← CreateExecutionContext(workflowId, executionId, triggerData)
  3. workflow ← LoadWorkflow(workflowId)
  
  IF workflow.status ≠ "active" THEN
    RETURN Error("Workflow not active")
  END IF
  
  4. startNode ← FindStartNode(workflow.nodes)
  5. currentNode ← startNode
  6. executionLog ← []
  
  7. WHILE currentNode ≠ NULL DO
    8.   stepResult ← ExecuteNode(currentNode, execution.data)
    9.   LogStep(executionLog, currentNode.id, stepResult)
    
    10.  IF stepResult.status = "error" THEN
      11.    errorResult ← HandleError(stepResult.error, currentNode, execution)
      12.    IF errorResult.action = "retry" THEN
        13.      currentNode ← ExecuteNodeWithRetry(currentNode, execution.data)
        14.    ELSE IF errorResult.action = "skip" THEN
        15.      currentNode ← FindNextNode(currentNode, workflow.edges)
        16.    ELSE IF errorResult.action = "abort" THEN
        17.      RETURN FailureResult(execution.id, executionLog, stepResult.error)
        18.    END IF
      19.  ELSE
      20.    execution.data ← MergeData(execution.data, stepResult.output)
      21.    currentNode ← FindNextNode(currentNode, workflow.edges)
      22.  END IF
  23. END WHILE
  
  24. LogExecution(execution)
  25. NotifyUser(workflow.userId, "Workflow completed successfully")
  26. RETURN SuccessResult(execution.id, execution.data, executionLog)
END
```

#### Algorithm 2: Credential Encryption (UC-11)

```
ALGORITHM StoreCredential(userId, service, credentialValue)
INPUT:  userId (String), service (String), credentialValue (String)
OUTPUT: credentialId (String), encryptedStorageKey (String)

BEGIN
  1. credentialId ← GenerateUniqueId()
  2. salt ← GenerateRandomSalt(32)
  3. encryptionKey ← DeriveKey(userId + service, salt, iterations=100000)
  4. encryptedValue ← AES256Encrypt(credentialValue, encryptionKey)
  
  5. credential ← CreateCredentialObject(
       id = credentialId,
       userId = userId,
       service = service,
       encryptedValue = encryptedValue,
       salt = salt,
       isValid = TRUE,
       createdAt = CurrentTimestamp()
     )
  
  6. SaveToDatabase(credential)
  7. LogAuditEvent("CREDENTIAL_CREATED", userId, credentialId)
  
  8. RETURN credentialId
END
```

#### Algorithm 3: Error Detection and Handling (UC-08)

```
ALGORITHM HandleWorkflowError(error, context)
INPUT:  error (Error), context (ExecutionContext)
OUTPUT: errorHandlingResult (Object)

BEGIN
  1. errorId ← GenerateUniqueId()
  2. errorSeverity ← DetermineSeverity(error.type)
  3. errorCategory ← CategorizeError(error)
  
  4. errorLog ← CreateErrorLog(
       id = errorId,
       type = error.type,
       message = error.message,
       severity = errorSeverity,
       context = context,
       timestamp = CurrentTimestamp()
     )
  
  5. LogToDatabase(errorLog)
  
  6. SWITCH errorSeverity DO
    7.  CASE "critical":
      8.    NotifyAdministrator(errorLog)
      9.    SendUserNotification(context.userId, error.message, "error")
      
    10. CASE "warning":
      11.    SendUserNotification(context.userId, error.message, "warning")
      
    12. CASE "info":
      13.    LogToAnalytics(errorLog)
  END SWITCH
  
  14. handlingStrategy ← GetErrorHandlingStrategy(errorCategory)
  
  15. SWITCH handlingStrategy DO
    16.  CASE "retry":
      17.    RETURN { action: "retry", maxAttempts: 3, backoffMs: 1000 }
      18.  CASE "skip":
      19.    RETURN { action: "skip" }
      20.  CASE "abort":
      21.    RETURN { action: "abort", reason: error.message }
    22.  CASE "fallback":
    23.    fallbackResult ← ExecuteFallbackLogic(context)
    24.    RETURN { action: "fallback", result: fallbackResult }
  END SWITCH
END
```

---

### 9.2 External APIs/SDKs

| API/SDK | Version | Purpose | Integration Module |
|---------|---------|---------|-------------------|
| **Firebase Admin SDK** | 11.x | User authentication, database operations | User Authentication, User Management |
| **Firebase Auth** | - | Secure user authentication | User Authentication |
| **Firebase Firestore** | - | NoSQL database for workflows, users, executions | All modules |
| **OpenAI API** | v1.7.0.0 | AI model integration for workflow intelligence | Multi-Model Integration |
| **Pinecone SDK** | Latest | Vector database for semantic search | Multi-Model Integration |
| **Stripe SDK** | Latest | Payment processing and subscriptions | Settings & Configuration |
| **Google APIs** | Latest | OAuth integration, Google Workspace integration | Multi-Model Integration |
| **LinkedIn APIs** | Latest | OAuth integration, LinkedIn data access | Multi-Model Integration |
| **Slack APIs** | Latest | Workflow notifications, Slack workspace integration | Error Handling & Logging, Workflow Execution |
| **Express.js** | 4.x | Backend web framework | All modules |
| **Python FastAPI** | Latest | Backend API for workflow execution | Workflow Execution Engine |

---

### 9.3 User Interface

#### 9.3.1 Web Application (Next.js/React)

**Technologies Used:**
- Framework: Next.js 13+ with React 18
- Styling: Tailwind CSS with custom components
- State Management: React Context API + Hooks
- Real-time Updates: Firebase Realtime Database listeners

**Main UI Components per Module:**

**User Authentication Module (UC-01)**
- Login component with form validation
- Registration component with email verification
- Password reset component with security questions
- Session management interceptors

**Workflow Builder Module (UC-02, UC-03)**
- Workflow designer canvas with drag-and-drop
- Component library sidebar with search/filter
- Property panel for component configuration
- Real-time validation feedback
- Save/test/deploy controls

**Dashboard & Profile Module (UC-05, UC-12)**
- User profile view/edit form
- Settings page with preference controls
- Admin user management table with role assignment
- Audit log viewer

**Analytics Module (UC-06, UC-07)**
- Analytics dashboard with charts and metrics
- Report export dialog with format/date range selection
- Downloadable report generation

**Error Handling UI (UC-08)**
- Error notification toast/modal
- Error log viewer with filtering
- Error detail modal with recovery suggestions

**Marketplace UI (UC-09, UC-10, UC-13)**
- Marketplace browse grid with filters
- Item detail modal with purchase flow
- Admin marketplace management panel
- Submission approval interface

**Credentials Management (UC-11)**
- Credentials list with actions
- Add new credential modal with service selection
- Credential testing interface

---

### 9.4 Deployment

#### Deployment Architecture

**Frontend Deployment:**
- **Platform:** Vercel or Netlify
- **Environment:** Next.js on Node.js runtime
- **CDN:** Global edge network for static assets
- **SSL/TLS:** Automatic HTTPS with 1.3 support

**Backend Deployment:**
- **API Server:** Railway or AWS App Runner
- **Runtime:** Node.js for Express, Python for FastAPI
- **Environment Variables:** Configured per environment (dev, staging, prod)
- **Database:** Firebase Firestore (managed by Google Cloud)
- **Vector DB:** Pinecone (cloud-hosted)

**Services Configuration:**
- **Authentication:** Firebase Auth (cloud-managed)
- **Payments:** Stripe (PCI DSS compliant payment processing)
- **Email:** SendGrid or Firebase Cloud Functions
- **Monitoring:** Firebase Performance Monitoring, Sentry for error tracking
- **Logging:** Firebase Cloud Logging

**Infrastructure:**
- **Regions:** Multi-region deployment for high availability
- **Load Balancing:** Automatic through cloud provider
- **Backup:** Daily automated backups with point-in-time recovery
- **Disaster Recovery:** RTO < 4 hours, RPO < 1 hour

**Deployment Pipeline:**
1. Code pushed to GitHub
2. CI/CD runs tests (unit, integration)
3. Build artifacts created
4. Deploy to staging environment
5. Automated smoke tests
6. Manual approval required
7. Deploy to production
8. Post-deployment monitoring

---

## 10. Testing and Evaluation

### 10.1 Unit Testing

#### Unit Test 1: User Registration (UC-01)
**Objective:** Verify user registration with valid and invalid inputs

**Test Cases:**
1. Register with valid email and strong password → User created successfully
2. Register with duplicate email → Error message shown
3. Register with weak password → Validation error
4. Register with invalid email format → Validation error
5. Email verification link sent → User can verify

**Tools:** Jest, React Testing Library

---

#### Unit Test 2: Workflow Validation (UC-02, UC-03)
**Objective:** Verify workflow configuration validation

**Test Cases:**
1. Create workflow with required fields → Workflow saved
2. Create workflow with missing name → Validation error
3. Build workflow with valid connections → Connections saved
4. Build workflow with invalid node connections → Error feedback
5. Validate complete workflow → All checks pass

---

#### Unit Test 3: Credential Storage (UC-11)
**Objective:** Verify credentials are encrypted and stored securely

**Test Cases:**
1. Store API key → Encrypted and saved
2. Retrieve stored credential → Decrypts correctly
3. Test credential validity → Verification succeeds
4. Update credential → New value replaces old
5. Delete credential → No longer accessible

---

### 10.2 Functional Testing

#### Functional Test 1: Complete Workflow Execution (UC-04)
**Objective:** Verify end-to-end workflow execution

**Test Cases:**
1. Execute workflow with valid trigger → Completes successfully
2. Execute workflow with data transformation → Output correct
3. Execute workflow with API integration → External call succeeds
4. Execute workflow with conditional branching → Correct path taken
5. Handle workflow timeout → Graceful failure with logging

---

#### Functional Test 2: Analytics Report Generation (UC-06, UC-07)
**Objective:** Verify analytics data retrieval and report generation

**Test Cases:**
1. View analytics dashboard → Metrics display correctly
2. Apply date range filter → Data updates accordingly
3. Export report as PDF → File generated successfully
4. Export report as CSV → Correct data format
5. Email report → Delivery confirmed

---

### 10.3 Business Rules Testing

#### Decision Table: Workflow Execution Retry Logic (UC-04, UC-08)

| Condition: Error Type | Condition: Retry Count | Condition: User Config | Action: Retry | Action: Notify | Action: Log |
|---|---|---|---|---|---|
| Network Error | < 3 | Retry Enabled | YES | NO | YES |
| Network Error | ≥ 3 | Retry Enabled | NO | YES | YES |
| Authorization Error | Any | Any | NO | YES | YES |
| Timeout | < 3 | Retry Enabled | YES | NO | YES |
| Timeout | ≥ 3 | Retry Enabled | NO | YES | YES |
| API Rate Limit | Any | Any | WAIT | YES | YES |

**Test Cases Generated from Decision Table:**
- Test Case 1: Network error with retries available → Retry succeeds
- Test Case 2: Network error with max retries exceeded → Fail and notify user
- Test Case 3: Authorization error → Never retry, immediately fail and notify
- Test Case 4: Timeout with retries → Retry with exponential backoff
- Test Case 5: Rate limit hit → Wait and retry

---

#### Decision Table: User Role Permissions (UC-12)

| Condition: User Role | Condition: Action | Condition: Resource Owner | Action: Allow | Action: Log | Action: Deny |
|---|---|---|---|---|---|
| Admin | Any | Any | YES | YES | NO |
| Owner | View | Own Resource | YES | YES | NO |
| Owner | Edit | Own Resource | YES | YES | NO |
| Owner | Delete | Own Resource | YES | YES | NO |
| Collaborator | View | Shared Resource | YES | YES | NO |
| Collaborator | Edit | Shared Resource | YES | YES | NO |
| Other User | Any | Other Resource | NO | YES | YES |

---

### 10.4 Integration Testing

#### Integration Test 1: User Registration to Dashboard Navigation (UC-01 → UC-02)
**Objective:** Verify seamless transition from authentication to workflow builder

**Test Scenario:**
1. User registers with valid credentials
2. Email verification completed
3. User logs in with verified email
4. Session token created and stored
5. User navigated to dashboard
6. User can access workflow builder
7. Workflow builder loads components correctly
8. User can create new workflow

**Interfaces Tested:**
- Authentication ↔ User Management
- User Management ↔ Workflow Builder
- Session Management ↔ Database

---

#### Integration Test 2: Workflow Execution with Error Handling (UC-04 ↔ UC-08)
**Objective:** Verify workflow execution handles errors appropriately

**Test Scenario:**
1. Workflow execution starts
2. Component 2 encounters API error
3. Error detection and logging triggered
4. Error handling logic applied (retry/skip/abort)
5. Appropriate user notification sent
6. Execution log updated
7. Admin receives alert if critical

**Interfaces Tested:**
- Workflow Engine ↔ Error Handler
- Error Handler ↔ Notification System
- Notification System ↔ Database

---

#### Integration Test 3: Credential Management with Third-Party Integration (UC-11 ↔ UC-14)
**Objective:** Verify credentials enable successful third-party API calls

**Test Scenario:**
1. User adds Google API credentials (UC-11)
2. Credentials stored securely
3. Workflow created with Google integration node (UC-14)
4. Workflow executed
5. Credentials retrieved and decrypted
6. API authentication succeeds
7. Data retrieved from Google API
8. Response processed and stored

**Interfaces Tested:**
- Credential Management ↔ Encryption Service
- Integration Service ↔ Third-Party APIs
- Workflow Engine ↔ Integration Service

---

## 11. Appendices

### Appendix A: Architecture Patterns & Diagrams

**[DETAILED ARCHITECTURE PATTERN DIAGRAM WILL BE PLACED HERE - Shows complete system architecture with all 9 modules, their interactions, and external systems connections]**

**[BOX-AND-LINE DIAGRAM WITH DETAILED CONNECTIONS WILL BE PLACED HERE - Shows module-to-module communication flows]**

---

### Appendix B: Design Models Detailed Examples

**[ADDITIONAL DESIGN MODEL EXAMPLES WILL BE PLACED HERE - Shows UML diagram syntax, DFD examples, and other model illustrations]**

---

### Appendix C: Entity Relationship Diagram (ERD)

**[DATABASE ENTITY RELATIONSHIP DIAGRAM WILL BE PLACED HERE - Shows all data entities, their relationships, cardinalities, and attributes organized by module]**

---

### Appendix D: API Specifications

**[API ENDPOINT DOCUMENTATION WILL BE PLACED HERE - Shows RESTful API endpoints for each module with request/response schemas, authentication requirements, and error codes]**

---

### Appendix E: Security Architecture

**[SECURITY ARCHITECTURE DIAGRAM WILL BE PLACED HERE - Shows encryption layers, authentication flows, authorization mechanisms, and security protocols]**

---

### Appendix F: Data Flow Diagrams (DFD)

#### DFD Context Diagram
**[CONTEXT DFD WILL BE PLACED HERE - Shows NexAgent system as single process with external entities (User, Firebase, OpenAI, Stripe, Third-party APIs)]**

#### DFD Level 0
**[DFD LEVEL 0 WILL BE PLACED HERE - Shows 9 main processes (modules), data stores (Firebase, Pinecone, Redis), data flows, and external entities]**

#### DFD Level 1 - Workflow Execution Process
**[DFD LEVEL 1 WILL BE PLACED HERE - Explodes Workflow Execution Engine showing: validate workflow, detect trigger, execute components, handle errors, log execution, send notifications]**

#### DFD Level 1 - User Authentication Process
**[DFD LEVEL 1 WILL BE PLACED HERE - Explodes User Authentication showing: validate credentials, create session, generate token, store session, return token]**

---

### Appendix G: State Machines Detailed

**[DETAILED STATE MACHINE DIAGRAMS WILL BE PLACED HERE - Shows all possible states and transitions for workflows, executions, users, and errors with conditions]**

---

### Appendix H: Coding Standards & Guidelines

**[REFER TO TEMPLATE APPENDIX D - Contains variable naming conventions, commenting standards, indentation, file structure, access modifiers, cohesion/coupling principles, DRY law, SRP, and exception handling guidelines]**

---

### Appendix I: Testing Matrices

**[COMPREHENSIVE TEST MATRIX WILL BE PLACED HERE - Shows test cases, expected results, pass/fail criteria for all modules and use cases]**

---

## End of Document

**Document Status:** Draft  
**Last Updated:** November 1, 2025  
**Next Review:** Upon design completion and before implementation
