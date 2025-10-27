from fastapi import APIRouter, HTTPException, Depends, status, Query, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.audit_models import *
from app.services.firebase_service import firebase_service
from app.services.audit_service import audit_service
from app.core.security import rate_limit
from typing import Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/audit", tags=["Audit Logs & Compliance"])
security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Get current user from token"""
    try:
        token = credentials.credentials
        decoded_token = await firebase_service.verify_token(token)
        if not decoded_token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return decoded_token
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auth error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication failed")


# ==================== Audit Logs ====================

@router.post("/logs", status_code=201)
@rate_limit(requests_per_minute=100)
async def log_audit_event(
    request: Request,
    event: AuditEventCreate,
    user: dict = Depends(get_current_user)
):
    """Log audit event"""
    try:
        event_data = event.dict()
        event_data['userId'] = event_data.get('userId') or user.get('uid')
        
        result = await audit_service.log_event(event_data)
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        return {
            'success': True,
            'logId': result['logId'],
            'message': 'Audit event logged successfully'
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Log audit event error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to log audit event")


@router.get("/logs", response_model=AuditLogsResponse)
@rate_limit(requests_per_minute=50)
async def query_audit_logs(
    request: Request,
    user: dict = Depends(get_current_user),
    eventType: Optional[AuditEventType] = Query(None),
    severity: Optional[AuditSeverity] = Query(None),
    userId: Optional[str] = Query(None),
    resourceType: Optional[str] = Query(None),
    resourceId: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    startDate: Optional[datetime] = Query(None),
    endDate: Optional[datetime] = Query(None),
    ipAddress: Optional[str] = Query(None),
    searchQuery: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    pageSize: int = Query(50, ge=1, le=1000)
):
    """Query audit logs"""
    try:
        result = await audit_service.query_logs(
            event_type=eventType.value if eventType else None,
            severity=severity.value if severity else None,
            user_id=userId,
            resource_type=resourceType,
            resource_id=resourceId,
            action=action,
            status=status,
            start_date=startDate,
            end_date=endDate,
            ip_address=ipAddress,
            search_query=searchQuery,
            page=page,
            page_size=pageSize
        )
        
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        logs = [AuditEventResponse(**log) for log in result['logs']]
        return AuditLogsResponse(
            success=True,
            logs=logs,
            total=result['total'],
            page=page,
            pageSize=pageSize,
            filters={
                'eventType': eventType.value if eventType else None,
                'severity': severity.value if severity else None,
                'userId': userId
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Query audit logs error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to query audit logs")


@router.get("/logs/{log_id}")
@rate_limit(requests_per_minute=50)
async def get_audit_log(
    request: Request,
    log_id: str,
    user: dict = Depends(get_current_user)
):
    """Get specific audit log"""
    try:
        log = await audit_service.get_log_by_id(log_id)
        if not log:
            raise HTTPException(status_code=404, detail="Audit log not found")
        
        return {
            'success': True,
            'log': log
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get audit log error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get audit log")


@router.get("/logs/statistics/summary", response_model=AuditStatistics)
@rate_limit(requests_per_minute=30)
async def get_audit_statistics(
    request: Request,
    user: dict = Depends(get_current_user),
    startDate: Optional[datetime] = Query(None),
    endDate: Optional[datetime] = Query(None)
):
    """Get audit statistics"""
    try:
        result = await audit_service.get_audit_statistics(startDate, endDate)
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        return AuditStatistics(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get audit statistics error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get audit statistics")


# ==================== Security Logs ====================

@router.post("/security/events", status_code=201)
@rate_limit(requests_per_minute=50)
async def log_security_event(
    request: Request,
    event_data: Dict[str, Any],
    user: dict = Depends(get_current_user)
):
    """Log security event"""
    try:
        result = await audit_service.log_security_event(event_data)
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        return {
            'success': True,
            'logId': result['logId'],
            'message': 'Security event logged successfully'
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Log security event error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to log security event")


@router.get("/security/events", response_model=SecurityLogsResponse)
@rate_limit(requests_per_minute=50)
async def query_security_logs(
    request: Request,
    user: dict = Depends(get_current_user),
    eventType: Optional[str] = Query(None),
    severity: Optional[AuditSeverity] = Query(None),
    userId: Optional[str] = Query(None),
    ipAddress: Optional[str] = Query(None),
    resolved: Optional[bool] = Query(None),
    minThreatLevel: Optional[int] = Query(None, ge=1, le=10),
    startDate: Optional[datetime] = Query(None),
    endDate: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    pageSize: int = Query(50, ge=1, le=100)
):
    """Query security logs"""
    try:
        result = await audit_service.query_security_logs(
            event_type=eventType,
            severity=severity.value if severity else None,
            user_id=userId,
            ip_address=ipAddress,
            resolved=resolved,
            min_threat_level=minThreatLevel,
            start_date=startDate,
            end_date=endDate,
            page=page,
            page_size=pageSize
        )
        
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        logs = [SecurityEvent(**log) for log in result['logs']]
        return SecurityLogsResponse(
            success=True,
            logs=logs,
            total=result['total'],
            page=page,
            pageSize=pageSize
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Query security logs error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to query security logs")


@router.post("/security/events/{event_id}/resolve")
@rate_limit(requests_per_minute=20)
async def resolve_security_event(
    request: Request,
    event_id: str,
    mitigation_action: str = Query(...),
    user: dict = Depends(get_current_user)
):
    """Resolve security event"""
    try:
        result = await audit_service.resolve_security_event(
            event_id,
            user.get('uid'),
            mitigation_action
        )
        
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        return {
            'success': True,
            'message': 'Security event resolved successfully'
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resolve security event error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to resolve security event")


@router.get("/security/statistics", response_model=SecurityStatistics)
@rate_limit(requests_per_minute=30)
async def get_security_statistics(
    request: Request,
    user: dict = Depends(get_current_user),
    startDate: Optional[datetime] = Query(None),
    endDate: Optional[datetime] = Query(None)
):
    """Get security statistics"""
    try:
        result = await audit_service.get_security_statistics(startDate, endDate)
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        return SecurityStatistics(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get security statistics error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get security statistics")


# ==================== Access Logs ====================

@router.post("/access/logs", status_code=201)
@rate_limit(requests_per_minute=100)
async def log_access_event(
    request: Request,
    event_data: Dict[str, Any],
    user: dict = Depends(get_current_user)
):
    """Log access control event"""
    try:
        result = await audit_service.log_access_event(event_data)
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        return {
            'success': True,
            'logId': result['logId'],
            'message': 'Access event logged successfully'
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Log access event error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to log access event")


@router.get("/access/logs", response_model=AccessLogsResponse)
@rate_limit(requests_per_minute=50)
async def query_access_logs(
    request: Request,
    user: dict = Depends(get_current_user),
    userId: Optional[str] = Query(None),
    resourceType: Optional[str] = Query(None),
    resourceId: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    granted: Optional[bool] = Query(None),
    startDate: Optional[datetime] = Query(None),
    endDate: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    pageSize: int = Query(50, ge=1, le=100)
):
    """Query access logs"""
    try:
        result = await audit_service.query_access_logs(
            user_id=userId,
            resource_type=resourceType,
            resource_id=resourceId,
            action=action,
            granted=granted,
            start_date=startDate,
            end_date=endDate,
            page=page,
            page_size=pageSize
        )
        
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        logs = [AccessLog(**log) for log in result['logs']]
        return AccessLogsResponse(
            success=True,
            logs=logs,
            total=result['total'],
            page=page,
            pageSize=pageSize
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Query access logs error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to query access logs")


# ==================== User Activity ====================

@router.get("/users/{user_id}/activity", response_model=UserActivitySummary)
@rate_limit(requests_per_minute=50)
async def get_user_activity(
    request: Request,
    user_id: str,
    user: dict = Depends(get_current_user),
    startDate: Optional[datetime] = Query(None),
    endDate: Optional[datetime] = Query(None)
):
    """Get user activity summary"""
    try:
        result = await audit_service.get_user_activity(user_id, startDate, endDate)
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        return UserActivitySummary(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get user activity error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get user activity")


@router.get("/users/{user_id}/timeline", response_model=UserActivityTimeline)
@rate_limit(requests_per_minute=50)
async def get_user_activity_timeline(
    request: Request,
    user_id: str,
    user: dict = Depends(get_current_user),
    startDate: Optional[datetime] = Query(None),
    endDate: Optional[datetime] = Query(None)
):
    """Get user activity timeline"""
    try:
        result = await audit_service.get_user_activity_timeline(user_id, startDate, endDate)
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        return UserActivityTimeline(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get user timeline error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get user timeline")


# ==================== Compliance Reports ====================

@router.post("/compliance/reports", status_code=201)
@rate_limit(requests_per_minute=10)
async def generate_compliance_report(
    request: Request,
    standard: ComplianceStandard = Query(...),
    startDate: datetime = Query(...),
    endDate: datetime = Query(...),
    user: dict = Depends(get_current_user)
):
    """Generate compliance report"""
    try:
        result = await audit_service.generate_compliance_report(
            standard.value,
            startDate,
            endDate
        )
        
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        return {
            'success': True,
            'report': result['report'],
            'message': 'Compliance report generated successfully'
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Generate compliance report error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate compliance report")


@router.get("/compliance/reports", response_model=ComplianceReportsListResponse)
@rate_limit(requests_per_minute=30)
async def get_compliance_reports(
    request: Request,
    user: dict = Depends(get_current_user),
    standard: Optional[ComplianceStandard] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100)
):
    """Get compliance reports"""
    try:
        result = await audit_service.get_compliance_reports(
            standard=standard.value if standard else None,
            status=status,
            limit=limit
        )
        
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        reports = [ComplianceReport(**r) for r in result['reports']]
        return ComplianceReportsListResponse(
            success=True,
            reports=reports,
            total=result['total']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get compliance reports error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get compliance reports")


@router.get("/compliance/reports/{report_id}", response_model=ComplianceReportResponse)
@rate_limit(requests_per_minute=30)
async def get_compliance_report(
    request: Request,
    report_id: str,
    user: dict = Depends(get_current_user)
):
    """Get specific compliance report"""
    try:
        report = await audit_service.get_compliance_report(report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Compliance report not found")
        
        return ComplianceReportResponse(
            success=True,
            report=ComplianceReport(**report)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get compliance report error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get compliance report")


@router.get("/compliance/statistics", response_model=ComplianceStatistics)
@rate_limit(requests_per_minute=30)
async def get_compliance_statistics(
    request: Request,
    user: dict = Depends(get_current_user),
    startDate: Optional[datetime] = Query(None),
    endDate: Optional[datetime] = Query(None)
):
    """Get compliance statistics"""
    try:
        result = await audit_service.get_compliance_statistics(startDate, endDate)
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        return ComplianceStatistics(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get compliance statistics error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get compliance statistics")


# ==================== Data Retention ====================

@router.post("/retention/policies", status_code=201)
@rate_limit(requests_per_minute=10)
async def create_retention_policy(
    request: Request,
    policy_data: Dict[str, Any],
    user: dict = Depends(get_current_user)
):
    """Create data retention policy"""
    try:
        result = await audit_service.create_retention_policy(policy_data)
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        return {
            'success': True,
            'policyId': result['policyId'],
            'message': 'Retention policy created successfully'
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create retention policy error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create retention policy")


@router.get("/retention/policies", response_model=DataRetentionPoliciesResponse)
@rate_limit(requests_per_minute=30)
async def get_retention_policies(
    request: Request,
    user: dict = Depends(get_current_user),
    activeOnly: bool = Query(True)
):
    """Get data retention policies"""
    try:
        result = await audit_service.get_retention_policies(activeOnly)
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        policies = [DataRetentionPolicy(**p) for p in result['policies']]
        return DataRetentionPoliciesResponse(
            success=True,
            policies=policies,
            total=result['total']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get retention policies error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get retention policies")


# ==================== Compliance Alerts ====================

@router.get("/compliance/alerts", response_model=ComplianceAlertsResponse)
@rate_limit(requests_per_minute=50)
async def get_compliance_alerts(
    request: Request,
    user: dict = Depends(get_current_user),
    severity: Optional[AuditSeverity] = Query(None),
    standard: Optional[ComplianceStandard] = Query(None),
    acknowledged: Optional[bool] = Query(None),
    limit: int = Query(50, ge=1, le=100)
):
    """Get compliance alerts"""
    try:
        result = await audit_service.get_compliance_alerts(
            severity=severity.value if severity else None,
            standard=standard.value if standard else None,
            acknowledged=acknowledged,
            limit=limit
        )
        
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        alerts = [ComplianceAlert(**a) for a in result['alerts']]
        return ComplianceAlertsResponse(
            success=True,
            alerts=alerts,
            total=result['total'],
            criticalCount=result['criticalCount'],
            warningCount=result['warningCount']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get compliance alerts error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get compliance alerts")


@router.post("/compliance/alerts/{alert_id}/acknowledge")
@rate_limit(requests_per_minute=20)
async def acknowledge_compliance_alert(
    request: Request,
    alert_id: str,
    user: dict = Depends(get_current_user)
):
    """Acknowledge compliance alert"""
    try:
        result = await audit_service.acknowledge_alert(alert_id, user.get('uid'))
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        return {
            'success': True,
            'message': 'Alert acknowledged successfully'
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Acknowledge alert error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to acknowledge alert")


# ==================== Export ====================

@router.post("/export", response_model=AuditExportResponse)
@rate_limit(requests_per_minute=5)
async def export_audit_logs(
    request: Request,
    export_request: AuditExportRequest,
    user: dict = Depends(get_current_user)
):
    """Export audit logs"""
    try:
        result = await audit_service.export_logs(
            event_type=export_request.eventType.value if export_request.eventType else None,
            start_date=export_request.startDate,
            end_date=export_request.endDate,
            format=export_request.format,
            filters=export_request.filters
        )
        
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        return AuditExportResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Export audit logs error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to export audit logs")
