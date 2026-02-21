# NexAgent - Complete Project Information

## Project Identity
- **Name**: NexAgent
- **Tagline**: The Future of AI Intelligence
- **Version**: 0.1.0 (Beta)
- **Type**: AI-Powered Workflow Automation Platform
- **Status**: Active Development

## Executive Summary

NexAgent is a comprehensive workflow automation platform that enables users to create, manage, and execute complex automation sequences using a visual builder with 20+ pre-built node types. The platform combines AI capabilities, third-party integrations, and a user-friendly interface to democratize workflow automation.

## Core Value Proposition

1. **Visual Workflow Builder** - Drag-and-drop interface for non-technical users
2. **20+ Pre-built Nodes** - Ready-to-use components for common tasks
3. **AI Integration** - OpenAI and Claude AI capabilities built-in
4. **Secure Credential Management** - Encrypted storage for API keys and tokens
5. **Public Marketplace** - Share and monetize workflows
6. **Real-time Execution** - Monitor workflows as they run
7. **Comprehensive Analytics** - Track usage, costs, and performance

## Technology Stack

### Frontend
- **Framework**: Next.js 15.5.2
- **Runtime**: React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Library**: Radix UI (20+ components)
- **State Management**: React Query (TanStack)
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios with interceptors
- **Authentication**: Firebase 12.3.0
- **Animations**: Framer Motion
- **Icons**: Lucide React, React Icons
- **Build Tool**: Turbopack

### Backend
- **Framework**: FastAPI (Python)
- **Server**: Uvicorn
- **Database**: Firestore (Firebase)
- **Authentication**: Firebase Admin SDK
- **Task Queue**: Celery + Redis
- **Validation**: Pydantic
- **Security**: Python-Jose, Passlib, Cryptography
- **Payments**: Stripe API
- **HTTP Clients**: HTTPX, Aiohttp

### Workflow Engine
- **Core**: LangGraph-based execution
- **Pattern**: Node Registry pattern
- **Storage**: Multi-provider (Backend API, Firestore, LocalStorage)
- **Execution**: Async/await with parallel and sequential support

## Project Structure

```
nexagent/
├── app/                          # Next.js app directory
│   ├── page.tsx                 # Landing page
│   ├── layout.tsx               # Root layout
│   ├── globals.css              # Global styles
│   ├── admin321/                # Admin dashboard
│   ├── workflows/               # Workflow management
│   ├── credentials/             # Credential management
│   ├── marketplace/             # Marketplace
│   ├── dashboard/               # User dashboard
│   ├── api/                     # API routes
│   └── [other pages]/           # Additional pages
├── backend/                      # FastAPI backend
│   ├── app/
│   │   ├── main.py             # FastAPI app
│   │   ├── api/                # API routes
│   │   ├── core/               # Core utilities
│   │   ├── db/                 # Database modules
│   │   ├── models/             # Data models
│   │   ├── services/           # Business logic
│   │   └── utils/              # Utilities
│   ├── requirements.txt         # Python dependencies
│   └── .env                     # Environment config
├── lib/                          # Shared libraries
│   ├── auth/                    # Authentication
│   ├── api/                     # API client
│   ├── workflow/                # Workflow engine
│   ├── schemas/                 # Validation schemas
│   └── contexts/                # React contexts
├── components/                   # React components
│   ├── landing/                 # Landing page components
│   ├── dashboard/               # Dashboard components
│   ├── workflows/               # Workflow components
│   └── ui/                      # UI components
├── public/                       # Static assets
├── package.json                 # Frontend dependencies
└── .env                         # Frontend environment config
```

## Key Features

### 1. Workflow Builder
- Visual drag-and-drop interface
- 20+ pre-built node types
- Real-time node configuration
- Workflow versioning
- Save and publish workflows

### 2. Workflow Execution
- Manual execution (click Run)
- Scheduled execution (cron-based)
- Webhook-triggered execution
- Real-time execution monitoring
- Detailed execution logs

### 3. Node System
- **Triggers**: Manual, Schedule, Webhook
- **Communication**: Chat Input, Telegram, Email, Slack, HTTP
- **Logic**: Conditional, Loop, Delay
- **Data**: Data Formatter, JSON Parser, Logger
- **Integrations**: Google Sheets, Google Drive, Stripe
- **AI/ML**: OpenAI, Claude AI

### 4. Credential Management
- Secure API key storage
- OAuth token management
- Credential encryption
- Credential sharing (future)
- Credential expiration tracking

### 5. Marketplace
- Browse public workflows
- Use templates
- Publish workflows
- Monetize workflows
- Community contributions

### 6. Analytics & Monitoring
- Execution statistics
- Token usage tracking
- Cost monitoring
- Performance metrics
- Real-time dashboards

### 7. User Management
- Firebase authentication
- Email/password login
- Google OAuth
- Email verification
- Password reset
- MFA support (future)

## Authentication System

### Dual Authentication
1. **Firebase Auth** (Primary)
   - Email/password authentication
   - Google OAuth
   - Email verification
   - Password reset

2. **Backend Session Auth** (Secondary)
   - FastAPI session tokens
   - Token refresh mechanism
   - Session management

### Auth Flow
1. User signs up/in via Firebase
2. Firebase generates ID token
3. Frontend sends ID token to backend
4. Backend validates and creates session token
5. Session token stored in localStorage
6. All API calls include session token

## Database Schema

### Firestore Collections

#### Workflows
```
{
  id: string,
  userId: string,
  name: string,
  description: string,
  nodes: WorkflowNode[],
  edges: WorkflowConnection[],
  variables: Record<string, any>,
  status: 'draft' | 'active' | 'archived',
  version: number,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  lastExecutedAt: Timestamp,
  executionCount: number,
  tags: string[],
  isPublic: boolean,
  collaborators: string[]
}
```

#### Users
```
{
  uid: string,
  email: string,
  displayName: string,
  photoURL: string,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  usage: {
    totalWorkflows: number,
    workflowsCreated: number,
    executionsRun: number,
    tokensUsed: number
  },
  subscription: {
    plan: 'free' | 'pro' | 'enterprise',
    status: 'active' | 'cancelled',
    renewalDate: Timestamp
  }
}
```

#### Credentials
```
{
  id: string,
  userId: string,
  name: string,
  platform: string,
  type: 'oauth2' | 'api_key' | 'basic_auth' | 'webhook',
  data: Record<string, any>, // Encrypted
  status: 'active' | 'inactive' | 'expired' | 'error',
  createdAt: Timestamp,
  updatedAt: Timestamp,
  expiresAt: Timestamp,
  lastUsed: Timestamp
}
```

#### Executions
```
{
  id: string,
  workflowId: string,
  userId: string,
  status: 'pending' | 'running' | 'completed' | 'failed',
  startTime: Timestamp,
  endTime: Timestamp,
  duration: number,
  input: Record<string, any>,
  output: Record<string, any>,
  error: string,
  nodeLogs: NodeExecutionLog[],
  metadata: {
    tokensUsed: number,
    cost: number
  }
}
```

## API Endpoints

### Base URL
`http://localhost:8000/api/v1`

### Authentication
- `POST /auth/signup` - Create account
- `POST /auth/signin` - Sign in
- `POST /auth/verify-token` - Verify Firebase token
- `GET /auth/me` - Get current user

### Workflows
- `POST /workflows` - Create workflow
- `GET /workflows` - List workflows
- `GET /workflows/{id}` - Get workflow
- `PUT /workflows/{id}` - Update workflow
- `DELETE /workflows/{id}` - Delete workflow
- `POST /workflows/{id}/execute` - Execute workflow
- `GET /workflows/public/list` - List public workflows

### Credentials
- `POST /credentials` - Create credential
- `GET /credentials` - List credentials
- `GET /credentials/{id}` - Get credential
- `PUT /credentials/{id}` - Update credential
- `DELETE /credentials/{id}` - Delete credential

### Executions
- `GET /executions` - List executions
- `GET /executions/{id}` - Get execution
- `GET /executions/{id}/logs` - Get execution logs

## Supported Integrations

### Communication
- Telegram
- Slack
- Email (SMTP)
- WhatsApp
- Facebook Messenger
- Instagram Direct Messages

### Payment Processing
- Stripe
- Shopify

### Cloud Services
- Google Sheets
- Google Drive
- OpenAI
- Anthropic Claude

## Workflow Node Types (20 Total)

### Triggers (3)
1. Manual Trigger - User clicks Run
2. Schedule - Cron-based scheduling
3. Webhook - HTTP POST trigger

### Communication (5)
1. Chat Input - User text input
2. Telegram Send - Send to Telegram
3. Email Send - Send email
4. Slack Message - Post to Slack
5. HTTP Request - Call external API

### Logic (3)
1. Conditional - If/else branching
2. Loop - Iterate over items
3. Delay - Pause execution

### Data (3)
1. Data Formatter - Transform data
2. JSON Parser - Parse JSON
3. Logger - Debug output

### Integrations (3)
1. Google Sheets - Read/write spreadsheets
2. Google Drive - Upload/download files
3. Stripe - Process payments

### AI/ML (2)
1. OpenAI - GPT models
2. Claude AI - Claude models

## Home Page Structure

The landing page (`app/page.tsx`) includes:
1. **Navbar** - Navigation and auth buttons
2. **Hero** - Main call-to-action
3. **Features** - Platform capabilities
4. **AboutUs** - Company information
5. **Workflow** - Workflow showcase
6. **Marketplace** - Template marketplace
7. **Selling** - Monetization features
8. **Pricing** - Subscription tiers
9. **FAQ** - Common questions
10. **CTA** - Final call-to-action
11. **Footer** - Links and info

## User Roles

### Free User
- Limited workflows
- Limited executions
- Basic features

### Pro User
- Unlimited workflows
- Unlimited executions
- Advanced features
- Marketplace access

### Enterprise User
- Custom integrations
- Dedicated support
- SLA guarantees
- Custom features

### Admin
- Platform administration
- User management
- Analytics access
- System configuration

## Security Features

### Authentication
- Firebase Auth
- Email verification
- Password reset
- Account lockout
- MFA support (planned)

### Data Protection
- Encrypted credentials
- HTTPS only
- CORS protection
- Rate limiting
- Audit logging

### Authorization
- User ownership verification
- Role-based access control
- Workflow visibility settings
- Credential access restrictions

## Performance Metrics

- **Execution Timeout**: 300 seconds (configurable)
- **Retry Count**: 3 (configurable)
- **Concurrency**: 1 (configurable)
- **Rate Limit**: 100 requests/minute
- **Storage**: Unlimited (per plan)

## Development Workflow

### Frontend Development
```bash
npm install
npm run dev
npm run build
npm run lint
```

### Backend Development
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py
```

## Deployment

### Frontend
- Deployed on Vercel
- Next.js optimization
- Environment variables
- Build with Turbopack

### Backend
- FastAPI on cloud platform
- Docker containerization
- Redis for caching
- Celery for background jobs

## Future Roadmap

1. Mobile applications
2. More integrations
3. Advanced AI features
4. Workflow templates library
5. Team collaboration
6. Custom nodes
7. Workflow marketplace monetization
8. Advanced analytics
9. Workflow versioning UI
10. Offline mode

## Support & Documentation

- **Documentation**: In-app docs
- **Support**: Email support
- **Community**: Forum (planned)
- **Tutorials**: Video tutorials (planned)
- **API Docs**: Swagger/OpenAPI

## Compliance

- GDPR compliant
- CCPA compliant
- SOC 2 (planned)
- HIPAA (planned)
- PCI DSS (planned)

## Contact & Resources

- **Website**: nexagent.io (planned)
- **Email**: support@nexagent.io (planned)
- **GitHub**: github.com/nexagent (planned)
- **Documentation**: docs.nexagent.io (planned)
