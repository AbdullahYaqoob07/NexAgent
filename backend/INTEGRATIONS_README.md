# 🔗 Integration Management Module - Complete Documentation

## Overview

The **Integration Management** module provides a comprehensive system for managing third-party service connections, OAuth authentication, encrypted credential storage, and webhook management. Users can connect to 30+ pre-configured integrations including Gmail, Slack, Google Sheets, Stripe, and more.

### Key Features
- ✅ **30+ Pre-configured Integrations** (Gmail, Slack, Stripe, etc.)
- ✅ **OAuth 2.0 Flow Handler** with state management
- ✅ **AES-256 Encrypted Credentials** storage
- ✅ **Connection Management** with testing & refresh
- ✅ **Webhook System** with delivery logs
- ✅ **Integration Catalog** with search & filters
- ✅ **Automatic Token Refresh** for OAuth

---

## 🏗️ Architecture

### File Structure
```
backend/app/
├── models/
│   └── integration_models.py    # Pydantic models (409 lines)
├── db/
│   └── integration_db.py         # Database + encryption (709 lines)
├── services/
│   └── integration_service.py    # Business logic + OAuth (667 lines)
└── api/v1/
    └── integrations.py            # 32 API endpoints (921 lines)
```

### Firestore Collections
- `integrations` - Pre-configured integration catalog
- `user_connections` - User's active connections
- `oauth_states` - Temporary OAuth flow state (10min TTL)
- `credentials` - Encrypted credential storage
- `webhooks` - Webhook endpoints
- `webhook_logs` - Webhook delivery logs

---

## 📊 Data Models

### Integration Document
```json
{
  "id": "gmail",
  "name": "Gmail",
  "description": "Send and receive emails",
  "category": "communication",
  "logo": "https://...",
  "authType": "oauth2",
  "scopes": ["https://www.googleapis.com/auth/gmail.send"],
  "isActive": true,
  "popularity": 1250,
  "requiredFields": ["clientId", "clientSecret"],
  "documentation": "Setup instructions...",
  "tags": ["email", "google"],
  "webhookSupport": false
}
```

### Connection Document
```json
{
  "id": "conn_123",
  "userId": "user_456",
  "integrationId": "gmail",
  "integrationName": "Gmail",
  "name": "My Gmail Account",
  "authType": "oauth2",
  "status": "active",
  "credentials": {
    "encrypted_access_token": "...",
    "encrypted_refresh_token": "..."
  },
  "metadata": {"email": "user@gmail.com"},
  "lastTested": "2025-01-25T14:00:00Z",
  "createdAt": "2025-01-20T10:00:00Z",
  "updatedAt": "2025-01-25T14:00:00Z"
}
```

---

## 🔌 API Endpoints (32 Total)

### Base URL
```
http://localhost:8000/api/v1/integrations
```

---

## 1️⃣ Integration Catalog (6 endpoints)

### GET `/integrations`
Get all available integrations

**Authentication:** Optional  
**Rate Limit:** 100/min

**Query Parameters:**
- `category` - Filter by category (communication, storage, etc.)
- `authType` - Filter by auth type (oauth2, api_key, etc.)
- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 20, max: 100)

**Response:** `200 OK`
```json
{
  "success": true,
  "integrations": [...],
  "total": 45,
  "page": 1,
  "pageSize": 20
}
```

---

### GET `/integrations/{integration_id}`
Get integration details

**Authentication:** No  
**Rate Limit:** 100/min

**Response:** `200 OK`
```json
{
  "success": true,
  "integration": {
    "id": "gmail",
    "name": "Gmail",
    "description": "...",
    "category": "communication",
    "authType": "oauth2",
    "scopes": [...],
    "requiredFields": [...],
    "tags": ["email", "google"]
  }
}
```

---

### GET `/integrations/search/query`
Search integrations

**Authentication:** No  
**Rate Limit:** 100/min

**Query Parameters:**
- `query` - Search text
- `category` - Filter by category
- `authType` - Filter by auth type
- `tags` - Filter by tags (array)
- `page` & `pageSize`

---

### GET `/integrations/popular/list`
Get popular integrations

**Authentication:** No  
**Rate Limit:** 100/min

**Query Parameters:**
- `limit` - Number of results (default: 10, max: 50)

---

### GET `/integrations/categories/all`
Get all categories

**Authentication:** No  
**Rate Limit:** 100/min

**Response:** `200 OK`
```json
{
  "success": true,
  "categories": [
    {
      "id": "communication",
      "name": "Communication",
      "description": "Email, messaging, and chat",
      "icon": "💬",
      "integrationCount": 12
    }
  ]
}
```

---

### GET `/integrations/{integration_id}/documentation`
Get integration setup documentation

**Authentication:** No  
**Rate Limit:** 100/min

---

## 2️⃣ Connection Management (8 endpoints)

### POST `/integrations/connections`
Create new connection (manual credentials)

**Authentication:** Required  
**Rate Limit:** 20/min

**Request Body:**
```json
{
  "integrationId": "slack",
  "name": "My Slack Workspace",
  "authType": "api_key",
  "credentials": {
    "api_key": "xoxb-your-token"
  },
  "metadata": {
    "workspace": "My Company"
  }
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "connection": {
    "id": "conn_123",
    "userId": "user_456",
    "integrationId": "slack",
    "name": "My Slack Workspace",
    "status": "active",
    "hasCredentials": true,
    "createdAt": "..."
  }
}
```

---

### GET `/integrations/connections`
Get all user connections

**Authentication:** Required  
**Rate Limit:** 50/min

---

### GET `/integrations/connections/{connection_id}`
Get specific connection

**Authentication:** Required  
**Rate Limit:** 50/min

---

### PUT `/integrations/connections/{connection_id}`
Update connection

**Authentication:** Required  
**Rate Limit:** 20/min

**Request Body:**
```json
{
  "name": "Updated Connection Name",
  "credentials": {
    "api_key": "new-token"
  },
  "status": "active"
}
```

---

### DELETE `/integrations/connections/{connection_id}`
Delete connection

**Authentication:** Required  
**Rate Limit:** 20/min

---

### POST `/integrations/connections/{connection_id}/test`
Test connection validity

**Authentication:** Required  
**Rate Limit:** 30/min

**Response:** `200 OK`
```json
{
  "success": true,
  "status": "active",
  "message": "Connection is active and working"
}
```

---

### POST `/integrations/connections/{connection_id}/refresh`
Refresh OAuth token

**Authentication:** Required  
**Rate Limit:** 20/min

---

### GET `/integrations/connections/stats/summary`
Get connection statistics

**Authentication:** Required  
**Rate Limit:** 50/min

**Response:** `200 OK`
```json
{
  "success": true,
  "totalConnections": 15,
  "activeConnections": 12,
  "expiredConnections": 2,
  "errorConnections": 1,
  "byIntegration": [
    {"integrationId": "gmail", "count": 3},
    {"integrationId": "slack", "count": 2}
  ]
}
```

---

## 3️⃣ OAuth Flow (5 endpoints)

### POST `/integrations/oauth/authorize`
Initiate OAuth authorization flow

**Authentication:** Required  
**Rate Limit:** 10/min

**Request Body:**
```json
{
  "integrationId": "gmail",
  "redirectUri": "http://localhost:3000/integrations/callback",
  "state": "optional-custom-state"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
  "state": "generated_state_token",
  "expiresIn": 600
}
```

**Flow:**
1. Frontend calls this endpoint
2. Frontend redirects user to `authorizationUrl`
3. User authorizes on provider's site
4. Provider redirects back to `redirectUri` with code & state
5. Frontend calls `/oauth/exchange` with the code

---

### GET `/integrations/oauth/callback`
OAuth callback handler

**Authentication:** No  
**Rate Limit:** 10/min

**Query Parameters:**
- `code` - Authorization code from OAuth provider
- `state` - State parameter for CSRF protection

**Note:** This is typically called by the OAuth provider, not directly by the frontend.

---

### POST `/integrations/oauth/exchange`
Exchange authorization code for tokens

**Authentication:** Required  
**Rate Limit:** 10/min

**Request Body:**
```json
{
  "code": "auth_code_from_provider",
  "state": "state_from_authorize",
  "redirectUri": "http://localhost:3000/integrations/callback"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "connectionId": "conn_123",
  "message": "OAuth connection established successfully"
}
```

---

### POST `/integrations/oauth/refresh`
Refresh OAuth access token

**Authentication:** Required  
**Rate Limit:** 20/min

**Request Body:**
```json
{
  "connectionId": "conn_123"
}
```

---

### POST `/integrations/oauth/revoke`
Revoke OAuth tokens

**Authentication:** Required  
**Rate Limit:** 20/min

**Request Body:**
```json
{
  "connectionId": "conn_123"
}
```

---

## 4️⃣ Credentials Management (6 endpoints)

### POST `/integrations/credentials`
Store encrypted credential

**Authentication:** Required  
**Rate Limit:** 20/min

**Request Body:**
```json
{
  "integrationId": "stripe",
  "name": "Stripe Production Key",
  "type": "api_key",
  "value": "sk_live_xxxxx",
  "metadata": {
    "environment": "production"
  }
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "credential": {
    "id": "cred_123",
    "userId": "user_456",
    "integrationId": "stripe",
    "name": "Stripe Production Key",
    "type": "api_key",
    "hasValue": true,
    "createdAt": "..."
  }
}
```

**Security:** The `value` is encrypted with AES-256 and never exposed in API responses.

---

### GET `/integrations/credentials`
Get all user credentials (metadata only)

**Authentication:** Required  
**Rate Limit:** 50/min

---

### GET `/integrations/credentials/{credential_id}`
Get specific credential (metadata only)

**Authentication:** Required  
**Rate Limit:** 50/min

---

### PUT `/integrations/credentials/{credential_id}`
Update credential

**Authentication:** Required  
**Rate Limit:** 20/min

---

### DELETE `/integrations/credentials/{credential_id}`
Delete credential

**Authentication:** Required  
**Rate Limit:** 20/min

---

### POST `/integrations/credentials/{credential_id}/test`
Test credential validity

**Authentication:** Required  
**Rate Limit:** 30/min

---

## 5️⃣ Webhook Management (7 endpoints)

### POST `/integrations/webhooks`
Create webhook endpoint

**Authentication:** Required  
**Rate Limit:** 20/min

**Request Body:**
```json
{
  "name": "Payment Webhook",
  "events": ["payment.success", "payment.failed"],
  "description": "Handle payment events",
  "metadata": {
    "workflow_id": "workflow_123"
  }
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "webhook": {
    "id": "webhook_123",
    "userId": "user_456",
    "name": "Payment Webhook",
    "url": "http://localhost:8000/webhooks/webhook_123",
    "secret": "whsec_xxxxx",
    "status": "active",
    "events": ["payment.success", "payment.failed"],
    "deliveryCount": 0,
    "createdAt": "..."
  }
}
```

**Note:** Use the `secret` to verify webhook signatures.

---

### GET `/integrations/webhooks`
Get all user webhooks

**Authentication:** Required  
**Rate Limit:** 50/min

---

### GET `/integrations/webhooks/{webhook_id}`
Get specific webhook

**Authentication:** Required  
**Rate Limit:** 50/min

---

### PUT `/integrations/webhooks/{webhook_id}`
Update webhook

**Authentication:** Required  
**Rate Limit:** 20/min

---

### DELETE `/integrations/webhooks/{webhook_id}`
Delete webhook

**Authentication:** Required  
**Rate Limit:** 20/min

---

### POST `/integrations/webhooks/{webhook_id}/regenerate`
Regenerate webhook secret

**Authentication:** Required  
**Rate Limit:** 10/min

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Webhook secret regenerated successfully",
  "newSecret": "whsec_new_xxxxx"
}
```

---

### GET `/integrations/webhooks/{webhook_id}/logs`
Get webhook delivery logs

**Authentication:** Required  
**Rate Limit:** 50/min

**Query Parameters:**
- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 50, max: 100)

**Response:** `200 OK`
```json
{
  "success": true,
  "logs": [
    {
      "id": "log_123",
      "webhookId": "webhook_123",
      "timestamp": "2025-01-25T14:00:00Z",
      "status": "success",
      "statusCode": 200,
      "duration": 234,
      "payload": {...},
      "response": {...}
    }
  ],
  "total": 145,
  "page": 1,
  "pageSize": 50
}
```

---

## 🔐 Security Features

### 1. Credential Encryption
- **Algorithm:** AES-256 (Fernet)
- **Key Management:** Environment variable `ENCRYPTION_KEY`
- **Storage:** All sensitive credentials encrypted at rest
- **Access:** Only decrypted when needed for API calls
- **Response:** Never exposed in API responses

### 2. OAuth Security
- **State Parameter:** CSRF protection with random 32-byte tokens
- **State Expiration:** 10-minute TTL
- **Token Storage:** Encrypted access & refresh tokens
- **PKCE Support:** Ready for Proof Key for Code Exchange

### 3. Webhook Security
- **Secret Generation:** Cryptographically secure random secrets
- **Signature Verification:** HMAC-SHA256 for webhook payloads
- **Secret Rotation:** Regenerate secrets without downtime
- **Delivery Logs:** Full audit trail

---

## 🧪 Testing with cURL

### Create Connection
```bash
curl -X POST http://localhost:8000/api/v1/integrations/connections \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "integrationId": "slack",
    "name": "My Slack",
    "authType": "api_key",
    "credentials": {"api_key": "xoxb-your-token"},
    "metadata": {"workspace": "My Company"}
  }'
```

### Start OAuth Flow
```bash
curl -X POST http://localhost:8000/api/v1/integrations/oauth/authorize \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "integrationId": "gmail",
    "redirectUri": "http://localhost:3000/callback"
  }'
```

### Create Webhook
```bash
curl -X POST http://localhost:8000/api/v1/integrations/webhooks \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Payment Events",
    "events": ["payment.success"],
    "description": "Handle payments"
  }'
```

---

## 📝 Rate Limits

| Endpoint Type | Rate Limit |
|--------------|------------|
| Catalog/Search | 100 req/min |
| Connection CRUD | 20 req/min |
| Connection Get | 50 req/min |
| Connection Test | 30 req/min |
| OAuth Flow | 10 req/min |
| OAuth Refresh | 20 req/min |
| Credentials | 20 req/min |
| Webhooks | 20 req/min |
| Webhook Logs | 50 req/min |

---

## 📦 Supported Integrations (Examples)

### Communication
- Gmail (OAuth2)
- Slack (OAuth2)
- Discord (OAuth2)
- Telegram (Bot Token)
- Microsoft Teams (OAuth2)

### Storage
- Google Drive (OAuth2)
- Dropbox (OAuth2)
- OneDrive (OAuth2)
- AWS S3 (API Key)

### Productivity
- Google Sheets (OAuth2)
- Notion (OAuth2)
- Airtable (API Key)
- Trello (OAuth2)

### Payments
- Stripe (API Key)
- PayPal (OAuth2)

### CRM
- HubSpot (API Key)
- Salesforce (OAuth2)

---

## 🎯 Use Cases

### For Users
1. **Connect Services** - Link Gmail, Slack, Stripe accounts
2. **Secure Storage** - Encrypted credential management
3. **OAuth Made Easy** - Simple authorization flow
4. **Test Connections** - Verify credentials work
5. **Webhook Handling** - Receive events from services

### For Developers
1. **Pre-built Integrations** - 30+ ready to use
2. **OAuth Infrastructure** - No need to build from scratch
3. **Encryption Handled** - AES-256 out of the box
4. **Webhook System** - Event-driven architecture
5. **Audit Logs** - Full delivery tracking

---

## 🚀 Getting Started

### 1. Set Environment Variables
```bash
# In backend/.env
ENCRYPTION_KEY=your-32-byte-base64-key
API_BASE_URL=http://localhost:8000
```

### 2. Start Backend
```bash
cd backend
python run.py
```

### 3. Access Documentation
- **Swagger:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### 4. Test Integration Flow
1. Browse catalog: `GET /integrations`
2. Create connection: `POST /integrations/connections`
3. Test it: `POST /integrations/connections/{id}/test`

---

## 🔮 Future Enhancements

- [ ] More pre-configured integrations (100+ target)
- [ ] OAuth PKCE implementation
- [ ] Connection health monitoring
- [ ] Automatic credential rotation
- [ ] Integration usage analytics
- [ ] Custom integration builder
- [ ] Multi-account support per integration

---

## 🐛 Troubleshooting

### Connection Failed
- Verify credentials are correct
- Check integration is active (`isActive: true`)
- Test the connection endpoint

### OAuth Errors
- Ensure `redirectUri` matches OAuth app config
- Check state parameter hasn't expired (10min TTL)
- Verify OAuth scopes match requirements

### Encryption Errors
- Ensure `ENCRYPTION_KEY` is set in environment
- Key must be 32-byte Fernet-compatible key
- Generate with: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`

---

## 📊 Summary

### Total: 32 Endpoints

**Public (6):** Catalog, search, categories, documentation  
**Connections (8):** CRUD, test, refresh, stats  
**OAuth (5):** Authorize, callback, exchange, refresh, revoke  
**Credentials (6):** CRUD, test  
**Webhooks (7):** CRUD, regenerate secret, logs

### Security
- AES-256 encryption
- OAuth 2.0 flows
- HMAC webhook signatures
- Rate limiting
- Audit logging

---

**Built with ❤️ using FastAPI + Firebase + Firestore + Cryptography**
