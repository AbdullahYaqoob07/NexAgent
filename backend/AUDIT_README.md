# 🔍 Audit Logs & Compliance Module - Complete Documentation

## Overview

The **Audit Logs & Compliance** module provides comprehensive audit trail tracking, security event monitoring, access control logging, and compliance reporting for GDPR, SOC2, HIPAA, and other standards.

### Key Features
- ✅ **Complete Audit Trail** - Track all user actions and system events
- ✅ **Security Monitoring** - Log and track security threats
- ✅ **Access Control Logs** - Monitor resource access patterns
- ✅ **Compliance Reporting** - GDPR, SOC2, HIPAA, ISO27001
- ✅ **Data Retention Policies** - Automated data lifecycle management
- ✅ **Compliance Alerts** - Violations and warning notifications
- ✅ **User Activity Tracking** - Risk scoring and behavior analysis
- ✅ **Export & Analytics** - CSV/JSON/PDF export capabilities

---

## 🏗️ Architecture

### File Structure
```
backend/app/
├── models/
│   └── audit_models.py          # Pydantic models (401 lines)
├── db/
│   └── audit_db.py              # Database layer (611 lines)
├── services/
│   └── audit_service.py         # Business logic (473 lines)
└── api/v1/
    └── audit.py                  # 20 API endpoints (673 lines)
```

### Firestore Collections
- `audit_logs` - Main audit trail
- `security_logs` - Security events and threats
- `access_logs` - Access control records
- `compliance_reports` - Generated compliance reports
- `retention_policies` - Data retention configuration
- `compliance_alerts` - Compliance violation alerts

---

## 🔌 API Endpoints (20 Total)

### Base URL
```
http://localhost:8000/api/v1/audit
```

---

## 1️⃣ Audit Logs (4 endpoints)

### POST `/audit/logs`
**Purpose:** Log audit event  
**Auth:** Required | **Rate Limit:** 100/min

**Request Body:**
```json
{
  "eventType": "workflow_created",
  "severity": "info",
  "userId": "user_123",
  "userName": "John Doe",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "resourceType": "workflow",
  "resourceId": "workflow_456",
  "resourceName": "My Workflow",
  "action": "created",
  "description": "User created a new workflow",
  "metadata": {
    "source": "web_app"
  },
  "changes": {
    "before": null,
    "after": {"name": "My Workflow"}
  },
  "status": "success"
}
```

**Response:**
```json
{
  "success": true,
  "logId": "log_789",
  "message": "Audit event logged successfully"
}
```

**Use Case:** Track all system actions for audit trail

---

### GET `/audit/logs`
**Purpose:** Query audit logs with filters  
**Auth:** Required | **Rate Limit:** 50/min

**Query Parameters:**
- `eventType` - Filter by event type
- `severity` - Filter by severity (info, warning, error, critical)
- `userId` - Filter by user
- `resourceType` - Filter by resource type
- `resourceId` - Filter by specific resource
- `action` - Filter by action
- `status` - Filter by status (success, failed)
- `startDate` & `endDate` - Date range
- `ipAddress` - Filter by IP
- `searchQuery` - Full-text search
- `page` & `pageSize` - Pagination

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": "log_789",
      "eventType": "workflow_created",
      "severity": "info",
      "userId": "user_123",
      "userName": "John Doe",
      "ipAddress": "192.168.1.100",
      "resourceType": "workflow",
      "resourceId": "workflow_456",
      "action": "created",
      "description": "User created a new workflow",
      "status": "success",
      "timestamp": "2025-01-25T14:30:00Z"
    }
  ],
  "total": 1523,
  "page": 1,
  "pageSize": 50
}
```

**Use Case:** Audit log viewer with advanced filtering

---

### GET `/audit/logs/{log_id}`
**Purpose:** Get specific audit log  
**Auth:** Required | **Rate Limit:** 50/min

**Use Case:** View detailed audit log entry

---

### GET `/audit/logs/statistics/summary`
**Purpose:** Get audit statistics  
**Auth:** Required | **Rate Limit:** 30/min

**Response:**
```json
{
  "success": true,
  "totalEvents": 15420,
  "eventsByType": {
    "workflow_created": 1250,
    "user_login": 3500,
    "data_accessed": 8500
  },
  "eventsBySeverity": {
    "info": 14000,
    "warning": 1200,
    "error": 200,
    "critical": 20
  },
  "eventsByUser": [
    {"userId": "user_123", "count": 450}
  ],
  "successRate": 97.5,
  "failureRate": 2.5,
  "topActions": [
    {"action": "accessed", "count": 5200}
  ],
  "period": "Last 30 days"
}
```

**Use Case:** Audit dashboard overview

---

## 2️⃣ Security Logs (4 endpoints)

### POST `/audit/security/events`
**Purpose:** Log security event  
**Auth:** Required | **Rate Limit:** 50/min

**Request Body:**
```json
{
  "eventType": "failed_login",
  "severity": "warning",
  "userId": "user_123",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "description": "Multiple failed login attempts detected",
  "threatLevel": 7
}
```

**Use Case:** Track security threats and suspicious activity

---

### GET `/audit/security/events`
**Purpose:** Query security logs  
**Auth:** Required | **Rate Limit:** 50/min

**Query Parameters:**
- `eventType` - failed_login, brute_force, unauthorized_access
- `severity` - Filter by severity
- `userId` - Filter by user
- `ipAddress` - Filter by IP
- `resolved` - Show resolved/unresolved
- `minThreatLevel` - Minimum threat level (1-10)
- `startDate` & `endDate` - Date range
- `page` & `pageSize` - Pagination

**Use Case:** Security incident dashboard

---

### POST `/audit/security/events/{event_id}/resolve`
**Purpose:** Resolve security event  
**Auth:** Required | **Rate Limit:** 20/min

**Query Parameters:**
- `mitigation_action` - Action taken to resolve

**Use Case:** Security incident management

---

### GET `/audit/security/statistics`
**Purpose:** Get security statistics  
**Auth:** Required | **Rate Limit:** 30/min

**Response:**
```json
{
  "success": true,
  "totalSecurityEvents": 450,
  "criticalEvents": 15,
  "resolvedEvents": 420,
  "unresolvedEvents": 30,
  "avgThreatLevel": 4.5,
  "failedLoginAttempts": 250,
  "unauthorizedAccessAttempts": 80,
  "topThreats": [
    {"type": "failed_login", "count": 250}
  ],
  "suspiciousIPs": ["192.168.1.50", "10.0.0.25"]
}
```

**Use Case:** Security dashboard and reporting

---

## 3️⃣ Access Logs (2 endpoints)

### POST `/audit/access/logs`
**Purpose:** Log access control event  
**Auth:** Required | **Rate Limit:** 100/min

**Request Body:**
```json
{
  "userId": "user_123",
  "userName": "John Doe",
  "resourceType": "workflow",
  "resourceId": "workflow_456",
  "action": "read",
  "granted": true,
  "ipAddress": "192.168.1.100"
}
```

**Use Case:** Track resource access for compliance

---

### GET `/audit/access/logs`
**Purpose:** Query access logs  
**Auth:** Required | **Rate Limit:** 50/min

**Query Parameters:**
- `userId` - Filter by user
- `resourceType` - Filter by resource type
- `resourceId` - Filter by resource
- `action` - read, write, delete, execute
- `granted` - true/false (successful/denied)
- `startDate` & `endDate` - Date range
- `page` & `pageSize` - Pagination

**Use Case:** Access control audit report

---

## 4️⃣ User Activity (2 endpoints)

### GET `/audit/users/{user_id}/activity`
**Purpose:** Get user activity summary with risk scoring  
**Auth:** Required | **Rate Limit:** 50/min

**Response:**
```json
{
  "success": true,
  "userId": "user_123",
  "userName": "John Doe",
  "totalActions": 1250,
  "actionsByType": {
    "workflow_created": 50,
    "data_accessed": 800,
    "workflow_executed": 400
  },
  "failedActions": 25,
  "lastActivity": "2025-01-25T14:30:00Z",
  "ipAddresses": ["192.168.1.100", "10.0.0.50"],
  "userAgents": ["Chrome", "Firefox"],
  "riskScore": 35
}
```

**Risk Score (0-100):**
- 0-30: Low risk
- 31-60: Medium risk
- 61-100: High risk

**Use Case:** User behavior analysis and anomaly detection

---

### GET `/audit/users/{user_id}/timeline`
**Purpose:** Get user activity timeline  
**Auth:** Required | **Rate Limit:** 50/min

**Response:**
```json
{
  "success": true,
  "userId": "user_123",
  "userName": "John Doe",
  "activities": [
    {
      "id": "log_789",
      "eventType": "workflow_created",
      "action": "created",
      "resourceType": "workflow",
      "resourceName": "My Workflow",
      "description": "Created new workflow",
      "status": "success",
      "timestamp": "2025-01-25T14:30:00Z"
    }
  ],
  "period": "Last 7 days"
}
```

**Use Case:** User activity forensics

---

## 5️⃣ Compliance Reports (4 endpoints)

### POST `/audit/compliance/reports`
**Purpose:** Generate compliance report  
**Auth:** Required | **Rate Limit:** 10/min

**Query Parameters:**
- `standard` - GDPR, SOC2, HIPAA, ISO27001, PCI_DSS
- `startDate` - Report start date (required)
- `endDate` - Report end date (required)

**Response:**
```json
{
  "success": true,
  "report": {
    "id": "report_123",
    "standard": "gdpr",
    "reportPeriod": "Q1 2025",
    "generatedAt": "2025-01-25T14:30:00Z",
    "totalEvents": 15420,
    "complianceScore": 94.5,
    "violations": 3,
    "warnings": 12,
    "recommendations": [
      "Address critical security events immediately",
      "Increase audit logging coverage"
    ],
    "status": "compliant"
  },
  "message": "Compliance report generated successfully"
}
```

**Compliance Score:**
- 90-100: Compliant
- 70-89: Needs review
- 0-69: Non-compliant

**Use Case:** Quarterly compliance audits

---

### GET `/audit/compliance/reports`
**Purpose:** List compliance reports  
**Auth:** Required | **Rate Limit:** 30/min

**Query Parameters:**
- `standard` - Filter by standard
- `status` - compliant, non_compliant, needs_review
- `limit` - Results limit (max: 100)

**Use Case:** Compliance report history

---

### GET `/audit/compliance/reports/{report_id}`
**Purpose:** Get specific compliance report  
**Auth:** Required | **Rate Limit:** 30/min

**Use Case:** View detailed compliance report

---

### GET `/audit/compliance/statistics`
**Purpose:** Get compliance statistics  
**Auth:** Required | **Rate Limit:** 30/min

**Response:**
```json
{
  "success": true,
  "overallComplianceScore": 92.5,
  "complianceByStandard": {
    "gdpr": 95.0,
    "soc2": 90.0,
    "hipaa": 92.5
  },
  "totalViolations": 15,
  "violationsByType": {
    "data_retention": 8,
    "access_control": 7
  },
  "dataSubjectRequests": 25,
  "avgResponseTime": 24.5,
  "retentionPolicyCompliance": true
}
```

**Use Case:** Compliance dashboard

---

## 6️⃣ Data Retention (2 endpoints)

### POST `/audit/retention/policies`
**Purpose:** Create data retention policy  
**Auth:** Required | **Rate Limit:** 10/min

**Request Body:**
```json
{
  "name": "Audit Log Retention",
  "resourceType": "audit_logs",
  "retentionPeriod": "1y",
  "autoDelete": true,
  "complianceStandard": "gdpr",
  "description": "Keep audit logs for 1 year",
  "active": true
}
```

**Retention Periods:**
- `30d`, `90d`, `180d` - Days
- `1y`, `3y`, `7y` - Years
- `indefinite` - Never delete

**Use Case:** GDPR data retention compliance

---

### GET `/audit/retention/policies`
**Purpose:** Get data retention policies  
**Auth:** Required | **Rate Limit:** 30/min

**Query Parameters:**
- `activeOnly` - Show only active policies (default: true)

**Use Case:** View retention policy configuration

---

## 7️⃣ Compliance Alerts (2 endpoints)

### GET `/audit/compliance/alerts`
**Purpose:** Get compliance alerts  
**Auth:** Required | **Rate Limit:** 50/min

**Query Parameters:**
- `severity` - critical, warning, info
- `standard` - Filter by compliance standard
- `acknowledged` - true/false
- `limit` - Results limit (max: 100)

**Response:**
```json
{
  "success": true,
  "alerts": [
    {
      "id": "alert_123",
      "alertType": "retention_violation",
      "severity": "critical",
      "standard": "gdpr",
      "title": "Data Retention Violation",
      "description": "User data retained beyond policy limit",
      "affectedResources": ["user_data_456"],
      "recommendedAction": "Delete expired user data immediately",
      "acknowledged": false,
      "createdAt": "2025-01-25T14:30:00Z"
    }
  ],
  "total": 5,
  "criticalCount": 2,
  "warningCount": 3
}
```

**Use Case:** Compliance violation monitoring

---

### POST `/audit/compliance/alerts/{alert_id}/acknowledge`
**Purpose:** Acknowledge compliance alert  
**Auth:** Required | **Rate Limit:** 20/min

**Use Case:** Alert management workflow

---

## 8️⃣ Export (1 endpoint)

### POST `/audit/export`
**Purpose:** Export audit logs  
**Auth:** Required | **Rate Limit:** 5/min

**Request Body:**
```json
{
  "eventType": "workflow_created",
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-01-31T23:59:59Z",
  "format": "csv",
  "includeMetadata": true,
  "filters": {}
}
```

**Formats:** `csv`, `json`, `pdf`, `excel`

**Response:**
```json
{
  "success": true,
  "exportId": "export_123",
  "downloadUrl": "https://api.example.com/exports/export_123.csv",
  "format": "csv",
  "recordCount": 1523,
  "fileSize": 2048576,
  "expiresAt": "2025-01-26T14:30:00Z"
}
```

**Use Case:** Compliance reporting and data export

---

## 📝 Event Types

### User Events
- `user_login`, `user_logout`
- `user_created`, `user_updated`, `user_deleted`
- `password_changed`, `password_reset`

### Workflow Events
- `workflow_created`, `workflow_updated`, `workflow_deleted`
- `workflow_executed`

### Integration Events
- `integration_connected`, `integration_disconnected`
- `integration_updated`

### Data Events
- `data_accessed`, `data_exported`, `data_deleted`

### Permission Events
- `permission_granted`, `permission_revoked`
- `role_assigned`, `role_removed`

### Security Events
- `failed_login`, `unauthorized_access`, `security_alert`
- `api_key_created`, `api_key_revoked`

### System Events
- `system_config_changed`
- `backup_created`, `backup_restored`

---

## 🔒 Compliance Standards Supported

### GDPR (General Data Protection Regulation)
- **Right to be Forgotten** - Track data deletion requests
- **Data Portability** - Export user data
- **Consent Management** - Log consent records
- **Breach Notification** - 72-hour notification tracking
- **Data Retention** - Automated deletion policies

### SOC2 (Service Organization Control 2)
- **Security Controls** - Access logging
- **Availability** - Uptime tracking
- **Confidentiality** - Encryption audit
- **Processing Integrity** - Error tracking
- **Privacy** - Data handling audit

### HIPAA (Health Insurance Portability and Accountability Act)
- **Access Controls** - Who accessed what
- **Audit Controls** - Complete audit trail
- **Integrity** - Data modification tracking
- **Transmission Security** - Transfer logging

### ISO 27001 (Information Security Management)
- **Access Control** - Authentication and authorization logs
- **Operations Security** - System activity tracking
- **Incident Management** - Security event logging

### PCI DSS (Payment Card Industry Data Security Standard)
- **Track and Monitor** - All access to cardholder data
- **Logging** - Comprehensive audit trail
- **Access Control** - User activity monitoring

---

## 🧪 Testing Examples

### Log User Login
```bash
curl -X POST "http://localhost:8000/api/v1/audit/logs" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "user_login",
    "severity": "info",
    "userId": "user_123",
    "userName": "John Doe",
    "ipAddress": "192.168.1.100",
    "action": "login",
    "description": "User logged in successfully",
    "status": "success"
  }'
```

### Query Failed Logins
```bash
curl -X GET "http://localhost:8000/api/v1/audit/logs?eventType=failed_login&severity=warning&startDate=2025-01-01T00:00:00Z" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Generate GDPR Report
```bash
curl -X POST "http://localhost:8000/api/v1/audit/compliance/reports?standard=gdpr&startDate=2025-01-01T00:00:00Z&endDate=2025-03-31T23:59:59Z" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get User Activity
```bash
curl -X GET "http://localhost:8000/api/v1/audit/users/user_123/activity?startDate=2025-01-01T00:00:00Z&endDate=2025-01-31T23:59:59Z" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Export Audit Logs
```bash
curl -X POST "http://localhost:8000/api/v1/audit/export" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-01-31T23:59:59Z",
    "format": "csv",
    "includeMetadata": true
  }'
```

---

## 📊 Use Cases

### 1. Security Incident Investigation
```
1. GET /audit/security/events?severity=critical
2. GET /audit/users/{user_id}/timeline
3. GET /audit/access/logs?userId={user_id}&granted=false
```

### 2. Compliance Audit
```
1. POST /audit/compliance/reports?standard=gdpr
2. GET /audit/compliance/statistics
3. GET /audit/compliance/alerts?acknowledged=false
4. POST /audit/export (for auditor)
```

### 3. User Behavior Analysis
```
1. GET /audit/users/{user_id}/activity
2. GET /audit/users/{user_id}/timeline
3. GET /audit/logs?userId={user_id}&action=delete
```

### 4. Data Access Audit
```
1. GET /audit/access/logs?resourceType=user_data
2. GET /audit/logs?eventType=data_accessed
3. GET /audit/logs/statistics/summary
```

### 5. System Health Check
```
1. GET /audit/logs/statistics/summary
2. GET /audit/security/statistics
3. GET /audit/compliance/statistics
```

---

## 📈 Integration Example

### Automatic Audit Logging Middleware
```python
@app.middleware("http")
async def audit_middleware(request: Request, call_next):
    user = get_user_from_token(request)
    
    # Log request
    await audit_service.log_event({
        "eventType": "api_call",
        "severity": "info",
        "userId": user.get('uid'),
        "ipAddress": request.client.host,
        "resourceType": "api",
        "action": request.method,
        "description": f"{request.method} {request.url.path}",
        "status": "success"
    })
    
    response = await call_next(request)
    return response
```

### GDPR Data Export
```python
async def export_user_data(user_id: str):
    # Get all user activity
    activity = await audit_service.get_user_activity(user_id)
    
    # Export to JSON
    result = await audit_service.export_logs(
        event_type=None,
        start_date=datetime(2020, 1, 1),
        end_date=datetime.utcnow(),
        format="json",
        filters={"userId": user_id}
    )
    
    return result['downloadUrl']
```

---

## 🐛 Troubleshooting

### No Logs Showing
- Ensure events are being logged via `POST /audit/logs`
- Check date range filters
- Verify user permissions

### High Storage Usage
- Review retention policies
- Enable `autoDelete` on retention policies
- Export and archive old logs

### Compliance Report Shows Non-Compliant
- Check compliance alerts
- Review security events
- Increase audit logging coverage
- Address critical violations first

---

## 📋 Summary

### Total: 20 Endpoints

**Audit Logs (4):** Log events, query logs, get log, statistics  
**Security Logs (4):** Log security events, query events, resolve, statistics  
**Access Logs (2):** Log access, query logs  
**User Activity (2):** Activity summary, timeline  
**Compliance Reports (4):** Generate, list, get, statistics  
**Data Retention (2):** Create policy, list policies  
**Compliance Alerts (2):** List alerts, acknowledge  
**Export (1):** Export audit logs

### Key Capabilities
- Complete audit trail
- Security monitoring
- Compliance reporting (GDPR, SOC2, HIPAA, ISO27001)
- Risk scoring
- Data retention automation
- Export for auditors
- Real-time alerts

---

**Built with ❤️ using FastAPI + Firebase + Firestore + Compliance Best Practices**
