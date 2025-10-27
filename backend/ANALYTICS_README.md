# 📊 Analytics & Monitoring Module - Complete Documentation

## Overview

The **Analytics & Monitoring** module provides comprehensive tracking, metrics, and insights for your NexAgent platform. Monitor workflow performance, system health, user activity, and receive real-time alerts.

### Key Features
- ✅ **Workflow Analytics** - Execution metrics, success rates, performance tracking
- ✅ **System Monitoring** - Health checks, resource usage, API metrics
- ✅ **User Activity Tracking** - Engagement, retention, behavior analysis
- ✅ **Real-time Dashboard** - Live metrics and KPIs
- ✅ **Event Tracking** - Custom event logging and querying
- ✅ **Alerting System** - Automated alerts for critical issues
- ✅ **Trend Analysis** - Historical data and forecasting

---

## 🏗️ Architecture

### File Structure
```
backend/app/
├── models/
│   └── analytics_models.py      # Pydantic models (385 lines)
├── db/
│   └── analytics_db.py          # Database layer (593 lines)
├── services/
│   └── analytics_service.py     # Business logic (429 lines)
└── api/v1/
    └── analytics.py              # 25 API endpoints (705 lines)
```

### Firestore Collections
- `analytics_events` - Event tracking log
- `analytics_metrics` - Computed metrics
- `analytics_aggregations` - Pre-aggregated data
- `analytics_alerts` - System alerts
- `system_metrics` - System health snapshots
- `workflow_executions` - Workflow execution history

---

## 🔌 API Endpoints (25 Total)

### Base URL
```
http://localhost:8000/api/v1/analytics
```

---

## 1️⃣ Workflow Analytics (7 endpoints)

### GET `/analytics/workflows/overview`
**Purpose:** Get overall workflow execution statistics  
**Auth:** Required | **Rate Limit:** 50/min

**Query Parameters:**
- `timeRange` - Time period (1h, 24h, 7d, 30d, 90d, custom)
- `startDate` - Custom start date (ISO 8601)
- `endDate` - Custom end date

**Response:**
```json
{
  "success": true,
  "overview": {
    "totalExecutions": 1523,
    "successfulExecutions": 1442,
    "failedExecutions": 81,
    "successRate": 94.68,
    "period": "2025-01-01T00:00:00Z to 2025-01-31T23:59:59Z"
  }
}
```

**Use Case:** Dashboard widget showing overall workflow health

---

### GET `/analytics/workflows/{workflow_id}/metrics`
**Purpose:** Get detailed metrics for a specific workflow  
**Auth:** Required | **Rate Limit:** 50/min

**Query Parameters:**
- `workflowName` - Workflow display name (required)
- `timeRange` - Time period (default: 30d)

**Response:**
```json
{
  "success": true,
  "metrics": {
    "workflowId": "workflow_123",
    "workflowName": "Email Campaign",
    "totalExecutions": 250,
    "successfulExecutions": 238,
    "failedExecutions": 12,
    "successRate": 95.2,
    "avgExecutionTime": 4.5,
    "minExecutionTime": 2.1,
    "maxExecutionTime": 12.8,
    "p95ExecutionTime": 8.3,
    "lastExecutedAt": "2025-01-25T14:30:00Z"
  },
  "timeSeries": [
    {"timestamp": "2025-01-20T00:00:00Z", "value": 45},
    {"timestamp": "2025-01-21T00:00:00Z", "value": 52}
  ],
  "period": "Last 30 days"
}
```

**Use Case:** Workflow detail page showing performance over time

---

### GET `/analytics/workflows/{workflow_id}/executions`
**Purpose:** Get execution history with pagination  
**Auth:** Required | **Rate Limit:** 50/min

**Query Parameters:**
- `timeRange` - Time period (default: 7d)
- `status` - Filter by status (success, failed, running)
- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 50, max: 100)

**Response:**
```json
{
  "success": true,
  "executions": [
    {
      "id": "exec_789",
      "workflowId": "workflow_123",
      "workflowName": "Email Campaign",
      "status": "success",
      "startTime": "2025-01-25T14:30:00Z",
      "endTime": "2025-01-25T14:30:05Z",
      "duration": 5.2,
      "stepsCompleted": 5,
      "totalSteps": 5,
      "triggeredBy": "user_456"
    }
  ],
  "total": 250,
  "page": 1,
  "pageSize": 50
}
```

**Use Case:** Execution log viewer with filters

---

### GET `/analytics/workflows/performance`
**Purpose:** Compare workflow performance between periods  
**Auth:** Required | **Rate Limit:** 30/min

**Response:**
```json
{
  "success": true,
  "comparisons": [
    {
      "workflowId": "workflow_123",
      "workflowName": "Email Campaign",
      "currentPeriodExecutions": 250,
      "previousPeriodExecutions": 230,
      "executionChange": 8.7,
      "currentSuccessRate": 95.2,
      "previousSuccessRate": 93.5,
      "successRateChange": 1.7,
      "avgExecutionTime": 4.5,
      "executionTimeChange": -5.2
    }
  ],
  "period": "Last 30 days vs Previous 30 days"
}
```

**Use Case:** Performance comparison report

---

### GET `/analytics/workflows/success-rate`
**Purpose:** Get success rates for all workflows  
**Auth:** Required | **Rate Limit:** 50/min

**Use Case:** Dashboard "Workflow Health" widget

---

### GET `/analytics/workflows/top-performers`
**Purpose:** Get best performing workflows  
**Auth:** Required | **Rate Limit:** 50/min

**Query Parameters:**
- `limit` - Number of results (default: 10, max: 50)

**Use Case:** "Top Performers" leaderboard

---

### GET `/analytics/workflows/bottlenecks`
**Purpose:** Identify slow workflow steps  
**Auth:** Required | **Rate Limit:** 30/min

**Response:**
```json
{
  "success": true,
  "bottlenecks": [
    {
      "workflowId": "workflow_123",
      "workflowName": "Email Campaign",
      "stepName": "Send Email",
      "stepIndex": 3,
      "avgStepDuration": 5.2,
      "percentageOfTotalTime": 45.5,
      "failureRate": 2.3,
      "recommendedAction": "Consider batching email sends"
    }
  ]
}
```

**Use Case:** Performance optimization dashboard

---

## 2️⃣ System Metrics (5 endpoints)

### GET `/analytics/system/health`
**Purpose:** Get current system health status  
**Auth:** Required | **Rate Limit:** 100/min

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "uptime": 2592000,
  "uptimePercentage": 99.95,
  "totalRequests": 1500000,
  "successfulRequests": 1485000,
  "failedRequests": 15000,
  "avgResponseTime": 125.5,
  "errorRate": 1.0,
  "activeConnections": 250,
  "timestamp": "2025-01-25T14:30:00Z"
}
```

**Use Case:** Status page, health check endpoint

---

### GET `/analytics/system/resource-usage`
**Purpose:** Get CPU, memory, disk usage  
**Auth:** Required | **Rate Limit:** 100/min

**Response:**
```json
{
  "cpuUsage": 45.2,
  "memoryUsage": 62.8,
  "memoryUsedMB": 2048,
  "memoryTotalMB": 4096,
  "diskUsage": 38.5,
  "diskUsedGB": 150,
  "diskTotalGB": 500,
  "activeThreads": 25,
  "timestamp": "2025-01-25T14:30:00Z"
}
```

**Use Case:** Infrastructure monitoring dashboard

---

### GET `/analytics/system/api-metrics`
**Purpose:** Get API endpoint performance metrics  
**Auth:** Required | **Rate Limit:** 50/min

**Response:**
```json
{
  "success": true,
  "metrics": [
    {
      "endpoint": "/api/v1/workflows",
      "method": "GET",
      "totalCalls": 1250,
      "successfulCalls": 1230,
      "failedCalls": 20,
      "avgLatency": 125.5,
      "p50Latency": 98.2,
      "p95Latency": 245.8,
      "p99Latency": 450.3,
      "errorRate": 1.6
    }
  ]
}
```

**Use Case:** API performance monitoring

---

### GET `/analytics/system/error-rate`
**Purpose:** Track errors across the system  
**Auth:** Required | **Rate Limit:** 50/min

**Response:**
```json
{
  "success": true,
  "totalErrors": 450,
  "errorRate": 1.2,
  "errorsByType": {
    "ValidationError": 250,
    "DatabaseError": 120,
    "AuthenticationError": 80
  },
  "errorsByEndpoint": {
    "/api/v1/workflows": 180,
    "/api/v1/integrations": 150
  },
  "criticalErrors": 15,
  "warningErrors": 435,
  "topErrors": [...]
}
```

**Use Case:** Error tracking dashboard

---

### GET `/analytics/system/uptime`
**Purpose:** Get system uptime statistics  
**Auth:** Required | **Rate Limit:** 50/min

**Use Case:** SLA reporting

---

## 3️⃣ User Activity (4 endpoints)

### GET `/analytics/users/activity`
**Purpose:** Track user actions and sessions  
**Auth:** Required | **Rate Limit:** 50/min

**Query Parameters:**
- `userId` - Filter by specific user
- `timeRange` - Time period (default: 30d)
- `page` & `pageSize` - Pagination

**Response:**
```json
{
  "success": true,
  "metrics": [
    {
      "userId": "user_123",
      "userName": "John Doe",
      "totalSessions": 45,
      "totalActions": 320,
      "avgSessionDuration": 15.5,
      "lastActive": "2025-01-25T14:30:00Z",
      "workflowsCreated": 12,
      "workflowsExecuted": 85,
      "integrationsConnected": 5,
      "apiCallsMade": 250
    }
  ],
  "total": 150,
  "page": 1,
  "pageSize": 50
}
```

**Use Case:** User activity report

---

### GET `/analytics/users/{user_id}/metrics`
**Purpose:** Get metrics for specific user  
**Auth:** Required | **Rate Limit:** 50/min

**Use Case:** User profile analytics page

---

### GET `/analytics/users/engagement`
**Purpose:** Get user engagement overview  
**Auth:** Required | **Rate Limit:** 50/min

**Response:**
```json
{
  "success": true,
  "totalUsers": 1250,
  "activeUsers": 850,
  "dailyActiveUsers": 450,
  "weeklyActiveUsers": 680,
  "monthlyActiveUsers": 850,
  "newUsers": 85,
  "returningUsers": 765,
  "avgSessionsPerUser": 12.5,
  "avgActionsPerUser": 45.2,
  "engagementRate": 68.0
}
```

**Use Case:** User engagement dashboard

---

### GET `/analytics/users/retention`
**Purpose:** Analyze user retention by cohort  
**Auth:** Required | **Rate Limit:** 30/min

**Response:**
```json
{
  "success": true,
  "cohort": "2025-01",
  "totalUsers": 500,
  "retainedUsers": {
    "week1": 400,
    "week2": 350,
    "week3": 320,
    "week4": 300
  },
  "retentionRate": {
    "week1": 0.80,
    "week2": 0.70,
    "week3": 0.64,
    "week4": 0.60
  },
  "churnRate": 0.40,
  "avgLifetime": 45.5
}
```

**Use Case:** Retention analysis report

---

## 4️⃣ Dashboard (5 endpoints)

### GET `/analytics/dashboard/overview`
**Purpose:** Get main dashboard summary  
**Auth:** Required | **Rate Limit:** 100/min

**Response:**
```json
{
  "success": true,
  "period": "Last 24 hours",
  "workflows": {
    "total": 45,
    "active": 42,
    "success_rate": 94.5
  },
  "executions": {
    "total": 1250,
    "successful": 1182,
    "failed": 68,
    "running": 5
  },
  "users": {
    "total": 850,
    "active": 450,
    "new": 25
  },
  "integrations": {
    "total": 30,
    "active": 25,
    "connections": 150
  },
  "system": {
    "health": "healthy",
    "uptime": 99.9,
    "error_rate": 0.5
  },
  "recentActivity": [...]
}
```

**Use Case:** Main analytics dashboard

---

### GET `/analytics/dashboard/real-time`
**Purpose:** Get live metrics  
**Auth:** Required | **Rate Limit:** 100/min

**Response:**
```json
{
  "success": true,
  "activeExecutions": 15,
  "executionsPerMinute": 8,
  "avgExecutionTime": 12.5,
  "currentErrorRate": 1.2,
  "activeUsers": 125,
  "requestsPerSecond": 45.2,
  "queuedJobs": 28,
  "systemLoad": 62.5,
  "timestamp": "2025-01-25T14:30:00Z"
}
```

**Use Case:** Real-time monitoring dashboard

---

### GET `/analytics/dashboard/trends`
**Purpose:** Get trend analysis with forecasting  
**Auth:** Required | **Rate Limit:** 50/min

**Query Parameters:**
- `metric` - Metric name (required)
- `timeRange` - Time period (default: 7d)

**Response:**
```json
{
  "success": true,
  "metric": "workflow_executions",
  "timeRange": "7d",
  "dataPoints": [
    {"timestamp": "2025-01-20", "value": 180},
    {"timestamp": "2025-01-21", "value": 195}
  ],
  "trend": "increasing",
  "changePercentage": 8.3,
  "insights": [
    "Workflow executions increased by 8.3% over the period"
  ]
}
```

**Use Case:** Trend charts with insights

---

### GET `/analytics/dashboard/alerts`
**Purpose:** Get active system alerts  
**Auth:** Required | **Rate Limit:** 100/min

**Query Parameters:**
- `severity` - Filter by severity (critical, warning, info)
- `category` - Filter by category (system, workflow, user, integration)
- `acknowledged` - Filter by acknowledgment status
- `limit` - Number of results (default: 50, max: 100)

**Response:**
```json
{
  "success": true,
  "alerts": [
    {
      "id": "alert_123",
      "severity": "critical",
      "title": "High Error Rate Detected",
      "message": "Error rate exceeded 5% threshold",
      "category": "system",
      "source": "error_monitor",
      "timestamp": "2025-01-25T14:30:00Z",
      "acknowledged": false
    }
  ],
  "total": 15,
  "criticalCount": 3,
  "warningCount": 12
}
```

**Use Case:** Alert notification center

---

### GET `/analytics/dashboard/widgets`
**Purpose:** Get custom dashboard widget data  
**Auth:** Required | **Rate Limit:** 50/min

**Query Parameters:**
- `widgetType` - Widget type (execution_chart, success_rate, etc.)

**Use Case:** Customizable dashboard widgets

---

## 5️⃣ Events & Logs (4 endpoints)

### POST `/analytics/events`
**Purpose:** Track custom analytics event  
**Auth:** Required | **Rate Limit:** 100/min

**Request Body:**
```json
{
  "eventType": "user_action",
  "eventName": "workflow_created",
  "userId": "user_123",
  "workflowId": "workflow_456",
  "properties": {
    "workflowName": "My Workflow",
    "templateUsed": "email_campaign"
  },
  "metadata": {
    "source": "web_app",
    "version": "1.0.0"
  }
}
```

**Response:**
```json
{
  "success": true,
  "eventId": "event_789",
  "message": "Event tracked successfully"
}
```

**Use Case:** Custom event tracking for analytics

---

### GET `/analytics/events`
**Purpose:** Query tracked events  
**Auth:** Required | **Rate Limit:** 50/min

**Query Parameters:**
- `timeRange` - Time period (default: 24h)
- `userId` - Filter by user
- `workflowId` - Filter by workflow
- `eventType` - Filter by event type
- `page` & `pageSize` - Pagination

**Use Case:** Event log viewer

---

### GET `/analytics/events/timeline`
**Purpose:** Get aggregated event timeline  
**Auth:** Required | **Rate Limit:** 50/min

**Query Parameters:**
- `timeRange` - Time period (default: 24h)
- `interval` - Aggregation interval (hour, day, week)

**Response:**
```json
{
  "success": true,
  "timeline": [
    {"timestamp": "2025-01-25T00:00:00Z", "count": 45},
    {"timestamp": "2025-01-25T01:00:00Z", "count": 52}
  ],
  "period": "Last 24 hours"
}
```

**Use Case:** Event timeline chart

---

### GET `/analytics/events/export`
**Purpose:** Export events to CSV/JSON/Excel  
**Auth:** Required | **Rate Limit:** 10/min

**Query Parameters:**
- `timeRange` - Time period (default: 30d)
- `format` - Export format (csv, json, excel)

**Response:**
```json
{
  "success": true,
  "exportId": "export_123",
  "downloadUrl": "https://api.example.com/exports/export_123.csv",
  "format": "csv",
  "expiresAt": "2025-01-26T14:30:00Z"
}
```

**Use Case:** Data export for reporting

---

## 📝 Rate Limits Summary

| Category | Rate Limit |
|----------|------------|
| Workflow Analytics | 30-50 req/min |
| System Metrics | 50-100 req/min |
| User Activity | 30-50 req/min |
| Dashboard | 50-100 req/min |
| Events | 10-100 req/min |

---

## 🎯 Common Use Cases

### 1. **Main Dashboard**
```
GET /analytics/dashboard/overview?timeRange=24h
GET /analytics/dashboard/real-time
GET /analytics/workflows/overview?timeRange=24h
GET /analytics/system/health
```

### 2. **Workflow Performance Page**
```
GET /analytics/workflows/{id}/metrics?timeRange=30d
GET /analytics/workflows/{id}/executions?page=1
GET /analytics/workflows/bottlenecks?workflowId={id}
```

### 3. **System Monitoring**
```
GET /analytics/system/health
GET /analytics/system/resource-usage
GET /analytics/system/error-rate?timeRange=24h
GET /analytics/dashboard/alerts?severity=critical
```

### 4. **User Analytics**
```
GET /analytics/users/activity?timeRange=30d
GET /analytics/users/engagement
GET /analytics/users/retention?cohort=2025-01
```

### 5. **Custom Event Tracking**
```javascript
// Track event
await fetch('/api/v1/analytics/events', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    eventType: 'user_action',
    eventName: 'button_clicked',
    properties: {
      buttonId: 'save_workflow',
      page: 'workflow_editor'
    }
  })
});

// Query events
const events = await fetch(
  '/api/v1/analytics/events?eventType=user_action&timeRange=7d'
);
```

---

## 🧪 Testing with cURL

### Get Dashboard Overview
```bash
curl -X GET "http://localhost:8000/api/v1/analytics/dashboard/overview?timeRange=24h" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Workflow Metrics
```bash
curl -X GET "http://localhost:8000/api/v1/analytics/workflows/workflow_123/metrics?workflowName=EmailCampaign&timeRange=30d" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Track Custom Event
```bash
curl -X POST "http://localhost:8000/api/v1/analytics/events" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "user_action",
    "eventName": "workflow_created",
    "properties": {"workflowName": "My Workflow"}
  }'
```

### Get System Health
```bash
curl -X GET "http://localhost:8000/api/v1/analytics/system/health" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 Data Models

### Time Ranges
- `1h` - Last hour
- `24h` - Last 24 hours
- `7d` - Last 7 days
- `30d` - Last 30 days
- `90d` - Last 90 days
- `custom` - Custom date range (use startDate/endDate)

### Event Types
- `workflow_started`
- `workflow_completed`
- `workflow_failed`
- `api_call`
- `user_action`
- `error`
- `system_event`
- `integration_call`

### Alert Severity
- `critical` - Requires immediate attention
- `warning` - Potential issue
- `info` - Informational only

---

## 🔮 Future Enhancements

- [ ] Custom dashboards builder
- [ ] Alert rule configuration
- [ ] Predictive analytics with ML
- [ ] Cost analysis and optimization
- [ ] Compliance reporting (GDPR, SOC2)
- [ ] Anomaly detection
- [ ] Multi-tenant analytics isolation
- [ ] Advanced query builder

---

## 📈 Integration Examples

### React Dashboard Component
```javascript
import { useEffect, useState } from 'react';

function AnalyticsDashboard() {
  const [overview, setOverview] = useState(null);
  const [realtime, setRealtime] = useState(null);

  useEffect(() => {
    // Fetch dashboard data
    fetch('/api/v1/analytics/dashboard/overview?timeRange=24h', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setOverview(data));

    // Poll real-time metrics every 30 seconds
    const interval = setInterval(() => {
      fetch('/api/v1/analytics/dashboard/real-time', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setRealtime(data));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1>Analytics Dashboard</h1>
      {overview && (
        <div>
          <div>Total Workflows: {overview.workflows.total}</div>
          <div>Success Rate: {overview.workflows.success_rate}%</div>
          <div>Active Users: {overview.users.active}</div>
        </div>
      )}
      {realtime && (
        <div>
          <div>Active Executions: {realtime.activeExecutions}</div>
          <div>System Load: {realtime.systemLoad}%</div>
        </div>
      )}
    </div>
  );
}
```

---

## 🐛 Troubleshooting

### No Data Showing
- Ensure events are being tracked via `POST /analytics/events`
- Check time range parameters
- Verify workflow executions exist in the database

### Slow Query Performance
- Use smaller time ranges for initial queries
- Implement pagination for large result sets
- Consider pre-aggregated data for common queries

### High Memory Usage
- Analytics queries process large datasets in memory
- Use pagination and filtering to reduce data volume
- Consider implementing data retention policies

---

## 📋 Summary

### Total: 25 Endpoints

**Workflow Analytics (7):** Overview, metrics, executions, performance, success rates, top performers, bottlenecks  
**System Metrics (5):** Health, resource usage, API metrics, error rate, uptime  
**User Activity (4):** Activity tracking, user metrics, engagement, retention  
**Dashboard (5):** Overview, real-time, trends, alerts, widgets  
**Events & Logs (4):** Track event, query events, timeline, export

### Key Capabilities
- Real-time monitoring
- Historical analysis
- Performance optimization insights
- User behavior tracking
- System health monitoring
- Custom event tracking
- Alert management
- Data export

---

**Built with ❤️ using FastAPI + Firebase + Firestore + Python Statistics**
