from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ==================== Enums ====================

class AuditEventType(str, Enum):
    """Audit event types"""
    USER_LOGIN = "user_login"
    USER_LOGOUT = "user_logout"
    USER_CREATED = "user_created"
    USER_UPDATED = "user_updated"
    USER_DELETED = "user_deleted"
    PASSWORD_CHANGED = "password_changed"
    PASSWORD_RESET = "password_reset"
    
    WORKFLOW_CREATED = "workflow_created"
    WORKFLOW_UPDATED = "workflow_updated"
    WORKFLOW_DELETED = "workflow_deleted"
    WORKFLOW_EXECUTED = "workflow_executed"
    
    INTEGRATION_CONNECTED = "integration_connected"
    INTEGRATION_DISCONNECTED = "integration_disconnected"
    INTEGRATION_UPDATED = "integration_updated"
    
    DATA_ACCESSED = "data_accessed"
    DATA_EXPORTED = "data_exported"
    DATA_DELETED = "data_deleted"
    
    PERMISSION_GRANTED = "permission_granted"
    PERMISSION_REVOKED = "permission_revoked"
    ROLE_ASSIGNED = "role_assigned"
    ROLE_REMOVED = "role_removed"
    
    API_KEY_CREATED = "api_key_created"
    API_KEY_REVOKED = "api_key_revoked"
    
    SECURITY_ALERT = "security_alert"
    FAILED_LOGIN = "failed_login"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    
    SYSTEM_CONFIG_CHANGED = "system_config_changed"
    BACKUP_CREATED = "backup_created"
    BACKUP_RESTORED = "backup_restored"


class AuditSeverity(str, Enum):
    """Audit event severity"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class ComplianceStandard(str, Enum):
    """Compliance standards"""
    GDPR = "gdpr"
    SOC2 = "soc2"
    HIPAA = "hipaa"
    ISO27001 = "iso27001"
    PCI_DSS = "pci_dss"


class RetentionPeriod(str, Enum):
    """Data retention periods"""
    DAYS_30 = "30d"
    DAYS_90 = "90d"
    DAYS_180 = "180d"
    YEAR_1 = "1y"
    YEAR_3 = "3y"
    YEAR_7 = "7y"
    INDEFINITE = "indefinite"


# ==================== Audit Event Models ====================

class AuditEventCreate(BaseModel):
    """Create audit event"""
    eventType: AuditEventType
    severity: AuditSeverity = AuditSeverity.INFO
    userId: Optional[str] = None
    userName: Optional[str] = None
    ipAddress: Optional[str] = None
    userAgent: Optional[str] = None
    resourceType: Optional[str] = None  # workflow, integration, user, etc.
    resourceId: Optional[str] = None
    resourceName: Optional[str] = None
    action: str  # created, updated, deleted, accessed, etc.
    description: str
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    changes: Optional[Dict[str, Any]] = Field(default_factory=dict)  # before/after
    status: str = "success"  # success, failed, pending
    errorMessage: Optional[str] = None


class AuditEventResponse(BaseModel):
    """Audit event response"""
    id: str
    eventType: AuditEventType
    severity: AuditSeverity
    userId: Optional[str] = None
    userName: Optional[str] = None
    ipAddress: Optional[str] = None
    userAgent: Optional[str] = None
    resourceType: Optional[str] = None
    resourceId: Optional[str] = None
    resourceName: Optional[str] = None
    action: str
    description: str
    metadata: Dict[str, Any]
    changes: Dict[str, Any]
    status: str
    errorMessage: Optional[str] = None
    timestamp: datetime
    createdAt: datetime


# ==================== Security Log Models ====================

class SecurityEvent(BaseModel):
    """Security-related event"""
    id: str
    eventType: str  # failed_login, brute_force, suspicious_activity
    severity: AuditSeverity
    userId: Optional[str] = None
    ipAddress: str
    userAgent: Optional[str] = None
    description: str
    threatLevel: int = Field(ge=1, le=10)  # 1-10 scale
    mitigationAction: Optional[str] = None
    resolved: bool = False
    resolvedAt: Optional[datetime] = None
    resolvedBy: Optional[str] = None
    timestamp: datetime


class AccessLog(BaseModel):
    """Access control log"""
    id: str
    userId: str
    userName: Optional[str] = None
    resourceType: str
    resourceId: str
    action: str  # read, write, delete, execute
    granted: bool
    denialReason: Optional[str] = None
    ipAddress: Optional[str] = None
    timestamp: datetime


# ==================== Compliance Models ====================

class ComplianceReport(BaseModel):
    """Compliance report summary"""
    id: str
    standard: ComplianceStandard
    reportPeriod: str
    generatedAt: datetime
    totalEvents: int
    complianceScore: float  # 0-100
    violations: int
    warnings: int
    recommendations: List[str]
    status: str  # compliant, non_compliant, needs_review
    reportUrl: Optional[str] = None


class GDPRReport(BaseModel):
    """GDPR-specific report"""
    totalDataSubjects: int
    dataAccessRequests: int
    dataExportRequests: int
    dataDeletionRequests: int
    dataBreaches: int
    consentRecords: int
    processingActivities: List[Dict[str, Any]]
    dataRetentionCompliance: bool
    rightToBeForgottenCompliance: bool


class SOC2Report(BaseModel):
    """SOC2-specific report"""
    securityEvents: int
    accessControlViolations: int
    dataEncryptionCompliance: bool
    backupCompliance: bool
    incidentResponseTime: float  # hours
    systemUptime: float  # percentage
    vulnerabilitiesFound: int
    vulnerabilitiesResolved: int


class DataRetentionPolicy(BaseModel):
    """Data retention policy"""
    id: str
    name: str
    resourceType: str
    retentionPeriod: RetentionPeriod
    autoDelete: bool
    complianceStandard: Optional[ComplianceStandard] = None
    description: str
    active: bool
    createdAt: datetime
    updatedAt: datetime


# ==================== Query Models ====================

class AuditLogQuery(BaseModel):
    """Query audit logs"""
    eventType: Optional[AuditEventType] = None
    severity: Optional[AuditSeverity] = None
    userId: Optional[str] = None
    resourceType: Optional[str] = None
    resourceId: Optional[str] = None
    action: Optional[str] = None
    status: Optional[str] = None
    startDate: Optional[datetime] = None
    endDate: Optional[datetime] = None
    ipAddress: Optional[str] = None
    searchQuery: Optional[str] = None
    page: int = Field(default=1, ge=1)
    pageSize: int = Field(default=50, ge=1, le=1000)


class SecurityLogQuery(BaseModel):
    """Query security logs"""
    eventType: Optional[str] = None
    severity: Optional[AuditSeverity] = None
    userId: Optional[str] = None
    ipAddress: Optional[str] = None
    resolved: Optional[bool] = None
    minThreatLevel: Optional[int] = Field(None, ge=1, le=10)
    startDate: Optional[datetime] = None
    endDate: Optional[datetime] = None
    page: int = Field(default=1, ge=1)
    pageSize: int = Field(default=50, ge=1, le=100)


# ==================== Response Models ====================

class AuditLogsResponse(BaseModel):
    """Audit logs query response"""
    success: bool
    logs: List[AuditEventResponse]
    total: int
    page: int
    pageSize: int
    filters: Optional[Dict[str, Any]] = None


class SecurityLogsResponse(BaseModel):
    """Security logs response"""
    success: bool
    logs: List[SecurityEvent]
    total: int
    page: int
    pageSize: int


class AccessLogsResponse(BaseModel):
    """Access logs response"""
    success: bool
    logs: List[AccessLog]
    total: int
    page: int
    pageSize: int


class ComplianceReportResponse(BaseModel):
    """Compliance report response"""
    success: bool
    report: ComplianceReport


class ComplianceReportsListResponse(BaseModel):
    """List of compliance reports"""
    success: bool
    reports: List[ComplianceReport]
    total: int


class DataRetentionPoliciesResponse(BaseModel):
    """Data retention policies response"""
    success: bool
    policies: List[DataRetentionPolicy]
    total: int


# ==================== Statistics Models ====================

class AuditStatistics(BaseModel):
    """Audit log statistics"""
    totalEvents: int
    eventsByType: Dict[str, int]
    eventsBySeverity: Dict[str, int]
    eventsByUser: List[Dict[str, Any]]
    eventsByResource: Dict[str, int]
    successRate: float
    failureRate: float
    topActions: List[Dict[str, Any]]
    period: str


class SecurityStatistics(BaseModel):
    """Security statistics"""
    totalSecurityEvents: int
    criticalEvents: int
    resolvedEvents: int
    unresolvedEvents: int
    avgThreatLevel: float
    failedLoginAttempts: int
    unauthorizedAccessAttempts: int
    topThreats: List[Dict[str, Any]]
    suspiciousIPs: List[str]


class ComplianceStatistics(BaseModel):
    """Compliance statistics"""
    overallComplianceScore: float
    complianceByStandard: Dict[str, float]
    totalViolations: int
    violationsByType: Dict[str, int]
    dataSubjectRequests: int
    avgResponseTime: float  # hours
    retentionPolicyCompliance: bool


# ==================== Export Models ====================

class AuditExportRequest(BaseModel):
    """Export audit logs"""
    eventType: Optional[AuditEventType] = None
    startDate: datetime
    endDate: datetime
    format: str = Field(default="csv", pattern="^(csv|json|pdf|excel)$")
    includeMetadata: bool = True
    filters: Optional[Dict[str, Any]] = Field(default_factory=dict)


class AuditExportResponse(BaseModel):
    """Export response"""
    success: bool
    exportId: str
    downloadUrl: str
    format: str
    recordCount: int
    fileSize: Optional[int] = None  # bytes
    expiresAt: datetime


# ==================== User Activity Models ====================

class UserActivitySummary(BaseModel):
    """User activity summary for audit"""
    userId: str
    userName: Optional[str] = None
    totalActions: int
    actionsByType: Dict[str, int]
    failedActions: int
    lastActivity: datetime
    ipAddresses: List[str]
    userAgents: List[str]
    riskScore: int = Field(ge=0, le=100)  # 0-100 scale


class UserActivityTimeline(BaseModel):
    """User activity timeline"""
    userId: str
    userName: Optional[str] = None
    activities: List[Dict[str, Any]]
    period: str


# ==================== Compliance Alert Models ====================

class ComplianceAlert(BaseModel):
    """Compliance violation alert"""
    id: str
    alertType: str  # retention_violation, access_violation, etc.
    severity: AuditSeverity
    standard: ComplianceStandard
    title: str
    description: str
    affectedResources: List[str]
    recommendedAction: str
    acknowledged: bool
    acknowledgedBy: Optional[str] = None
    resolvedAt: Optional[datetime] = None
    createdAt: datetime


class ComplianceAlertsResponse(BaseModel):
    """Compliance alerts response"""
    success: bool
    alerts: List[ComplianceAlert]
    total: int
    criticalCount: int
    warningCount: int
