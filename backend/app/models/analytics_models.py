from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ==================== Enums ====================

class EventType(str, Enum):
    """Analytics event types"""
    WORKFLOW_STARTED = "workflow_started"
    WORKFLOW_COMPLETED = "workflow_completed"
    WORKFLOW_FAILED = "workflow_failed"
    API_CALL = "api_call"
    USER_ACTION = "user_action"
    ERROR = "error"
    SYSTEM_EVENT = "system_event"
    INTEGRATION_CALL = "integration_call"


class MetricType(str, Enum):
    """Metric types"""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    SUMMARY = "summary"


class TimeRange(str, Enum):
    """Time range options"""
    LAST_HOUR = "1h"
    LAST_24_HOURS = "24h"
    LAST_7_DAYS = "7d"
    LAST_30_DAYS = "30d"
    LAST_90_DAYS = "90d"
    CUSTOM = "custom"


class AggregationType(str, Enum):
    """Aggregation types"""
    SUM = "sum"
    AVG = "avg"
    MIN = "min"
    MAX = "max"
    COUNT = "count"
    PERCENTILE_50 = "p50"
    PERCENTILE_95 = "p95"
    PERCENTILE_99 = "p99"


# ==================== Event Models ====================

class AnalyticsEventCreate(BaseModel):
    """Create analytics event"""
    eventType: EventType
    eventName: str
    userId: Optional[str] = None
    workflowId: Optional[str] = None
    integrationId: Optional[str] = None
    properties: Optional[Dict[str, Any]] = Field(default_factory=dict)
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    timestamp: Optional[datetime] = None


class AnalyticsEventResponse(BaseModel):
    """Analytics event response"""
    id: str
    eventType: EventType
    eventName: str
    userId: Optional[str] = None
    workflowId: Optional[str] = None
    integrationId: Optional[str] = None
    properties: Dict[str, Any]
    metadata: Dict[str, Any]
    timestamp: datetime
    createdAt: datetime


# ==================== Workflow Analytics Models ====================

class WorkflowMetrics(BaseModel):
    """Workflow execution metrics"""
    workflowId: str
    workflowName: str
    totalExecutions: int
    successfulExecutions: int
    failedExecutions: int
    successRate: float
    avgExecutionTime: float  # seconds
    minExecutionTime: float
    maxExecutionTime: float
    p95ExecutionTime: float
    lastExecutedAt: Optional[datetime] = None


class WorkflowExecution(BaseModel):
    """Workflow execution record"""
    id: str
    workflowId: str
    workflowName: str
    status: str  # success, failed, running
    startTime: datetime
    endTime: Optional[datetime] = None
    duration: Optional[float] = None  # seconds
    errorMessage: Optional[str] = None
    stepsCompleted: int
    totalSteps: int
    triggeredBy: Optional[str] = None


class WorkflowPerformanceComparison(BaseModel):
    """Compare workflow performance"""
    workflowId: str
    workflowName: str
    currentPeriodExecutions: int
    previousPeriodExecutions: int
    executionChange: float  # percentage
    currentSuccessRate: float
    previousSuccessRate: float
    successRateChange: float
    avgExecutionTime: float
    executionTimeChange: float


class WorkflowBottleneck(BaseModel):
    """Identify workflow bottlenecks"""
    workflowId: str
    workflowName: str
    stepName: str
    stepIndex: int
    avgStepDuration: float
    percentageOfTotalTime: float
    failureRate: float
    recommendedAction: str


# ==================== System Metrics Models ====================

class SystemHealthResponse(BaseModel):
    """System health overview"""
    success: bool
    status: str  # healthy, degraded, down
    uptime: float  # seconds
    uptimePercentage: float
    totalRequests: int
    successfulRequests: int
    failedRequests: int
    avgResponseTime: float  # ms
    errorRate: float
    activeConnections: int
    timestamp: datetime


class ResourceUsageMetrics(BaseModel):
    """Resource usage metrics"""
    cpuUsage: float  # percentage
    memoryUsage: float  # percentage
    memoryUsedMB: float
    memoryTotalMB: float
    diskUsage: float  # percentage
    diskUsedGB: float
    diskTotalGB: float
    activeThreads: int
    timestamp: datetime


class APIMetrics(BaseModel):
    """API performance metrics"""
    endpoint: str
    method: str
    totalCalls: int
    successfulCalls: int
    failedCalls: int
    avgLatency: float  # ms
    p50Latency: float
    p95Latency: float
    p99Latency: float
    minLatency: float
    maxLatency: float
    errorRate: float


class ErrorRateMetrics(BaseModel):
    """Error rate tracking"""
    totalErrors: int
    errorRate: float
    errorsByType: Dict[str, int]
    errorsByEndpoint: Dict[str, int]
    criticalErrors: int
    warningErrors: int
    topErrors: List[Dict[str, Any]]
    timestamp: datetime


# ==================== User Activity Models ====================

class UserActivityMetrics(BaseModel):
    """User activity tracking"""
    userId: str
    userName: Optional[str] = None
    totalSessions: int
    totalActions: int
    avgSessionDuration: float  # minutes
    lastActive: datetime
    workflowsCreated: int
    workflowsExecuted: int
    integrationsConnected: int
    apiCallsMade: int


class UserEngagementMetrics(BaseModel):
    """User engagement metrics"""
    totalUsers: int
    activeUsers: int  # last 30 days
    dailyActiveUsers: int
    weeklyActiveUsers: int
    monthlyActiveUsers: int
    newUsers: int
    returningUsers: int
    avgSessionsPerUser: float
    avgActionsPerUser: float
    engagementRate: float


class UserRetentionMetrics(BaseModel):
    """User retention analysis"""
    cohort: str  # e.g., "2024-01"
    totalUsers: int
    retainedUsers: Dict[str, int]  # {"week1": 80, "week2": 65, ...}
    retentionRate: Dict[str, float]  # {"week1": 0.80, "week2": 0.65, ...}
    churnRate: float
    avgLifetime: float  # days


# ==================== Dashboard Models ====================

class DashboardOverview(BaseModel):
    """Main dashboard data"""
    success: bool
    period: str
    workflows: Dict[str, Any]  # total, active, success_rate
    executions: Dict[str, Any]  # total, successful, failed, running
    users: Dict[str, Any]  # total, active, new
    integrations: Dict[str, Any]  # total, active, connections
    system: Dict[str, Any]  # health, uptime, error_rate
    recentActivity: List[Dict[str, Any]]
    timestamp: datetime


class RealTimeMetrics(BaseModel):
    """Real-time metrics"""
    activeExecutions: int
    executionsPerMinute: int
    avgExecutionTime: float
    currentErrorRate: float
    activeUsers: int
    requestsPerSecond: float
    queuedJobs: int
    systemLoad: float
    timestamp: datetime


class TrendAnalysis(BaseModel):
    """Trend analysis"""
    metric: str
    timeRange: str
    dataPoints: List[Dict[str, Any]]  # [{timestamp, value}, ...]
    trend: str  # increasing, decreasing, stable
    changePercentage: float
    forecastedValue: Optional[float] = None
    insights: List[str]


class Alert(BaseModel):
    """System alert"""
    id: str
    severity: str  # critical, warning, info
    title: str
    message: str
    category: str  # system, workflow, user, integration
    source: str
    timestamp: datetime
    acknowledged: bool
    acknowledgedBy: Optional[str] = None
    resolvedAt: Optional[datetime] = None


# ==================== Query Models ====================

class AnalyticsQuery(BaseModel):
    """Query analytics data"""
    timeRange: TimeRange = TimeRange.LAST_24_HOURS
    startDate: Optional[datetime] = None
    endDate: Optional[datetime] = None
    userId: Optional[str] = None
    workflowId: Optional[str] = None
    eventType: Optional[EventType] = None
    groupBy: Optional[str] = None
    aggregation: Optional[AggregationType] = AggregationType.COUNT
    limit: int = Field(default=100, ge=1, le=1000)
    offset: int = Field(default=0, ge=0)


class TimeSeriesDataPoint(BaseModel):
    """Time series data point"""
    timestamp: datetime
    value: float
    label: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


# ==================== Response Models ====================

class WorkflowAnalyticsResponse(BaseModel):
    """Workflow analytics response"""
    success: bool
    metrics: WorkflowMetrics
    timeSeries: List[TimeSeriesDataPoint]
    period: str


class WorkflowExecutionsResponse(BaseModel):
    """Workflow executions response"""
    success: bool
    executions: List[WorkflowExecution]
    total: int
    page: int
    pageSize: int


class WorkflowPerformanceResponse(BaseModel):
    """Workflow performance comparison response"""
    success: bool
    comparisons: List[WorkflowPerformanceComparison]
    period: str


class SystemMetricsResponse(BaseModel):
    """System metrics response"""
    success: bool
    metrics: Dict[str, Any]
    timestamp: datetime


class UserActivityResponse(BaseModel):
    """User activity response"""
    success: bool
    metrics: List[UserActivityMetrics]
    total: int
    page: int
    pageSize: int


class EventsResponse(BaseModel):
    """Events query response"""
    success: bool
    events: List[AnalyticsEventResponse]
    total: int
    page: int
    pageSize: int


class EventTimelineResponse(BaseModel):
    """Event timeline response"""
    success: bool
    timeline: List[Dict[str, Any]]
    period: str


class AlertsResponse(BaseModel):
    """Alerts response"""
    success: bool
    alerts: List[Alert]
    total: int
    criticalCount: int
    warningCount: int


class AnalyticsExportResponse(BaseModel):
    """Export response"""
    success: bool
    exportId: str
    downloadUrl: str
    format: str  # csv, json, excel
    expiresAt: datetime
