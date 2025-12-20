from fastapi import APIRouter, HTTPException, Depends, status, Query, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.analytics_models import *
from app.services.firebase_service import firebase_service
from app.services.analytics_service import analytics_service
from app.core.security import rate_limit
from typing import Optional, List
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["Analytics & Monitoring"])
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


# ==================== Workflow Analytics ====================

@router.get("/workflows/overview")
@rate_limit(requests_per_minute=50)
async def get_workflow_overview(
    request: Request,
    user: dict = Depends(get_current_user),
    timeRange: TimeRange = Query(TimeRange.LAST_30_DAYS),
    startDate: Optional[datetime] = Query(None),
    endDate: Optional[datetime] = Query(None)
):
    """Get workflow analytics overview"""
    try:
        result = await analytics_service.get_workflow_overview(timeRange, startDate, endDate)
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get workflow overview error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get workflow overview")


@router.get("/workflows/{workflow_id}/metrics", response_model=WorkflowAnalyticsResponse)
@rate_limit(requests_per_minute=50)
async def get_workflow_metrics(
    request: Request,
    workflow_id: str,
    user: dict = Depends(get_current_user),
    workflowName: str = Query(...),
    timeRange: TimeRange = Query(TimeRange.LAST_30_DAYS),
    startDate: Optional[datetime] = Query(None),
    endDate: Optional[datetime] = Query(None)
):
    """Get detailed workflow metrics"""
    try:
        result = await analytics_service.get_workflow_metrics(workflow_id, workflowName, timeRange, startDate, endDate)
        if not result['success']:
            raise HTTPException(status_code=404, detail=result.get('error', 'Workflow not found'))
        
        return WorkflowAnalyticsResponse(
            success=True,
            metrics=WorkflowMetrics(**result['metrics']),
            timeSeries=[TimeSeriesDataPoint(timestamp=t['timestamp'], value=t['count']) for t in result['timeSeries']],
            period=result['period']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get workflow metrics error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get workflow metrics")


@router.get("/workflows/{workflow_id}/executions", response_model=WorkflowExecutionsResponse)
@rate_limit(requests_per_minute=50)
async def get_workflow_executions(
    request: Request,
    workflow_id: str,
    user: dict = Depends(get_current_user),
    timeRange: TimeRange = Query(TimeRange.LAST_7_DAYS),
    startDate: Optional[datetime] = Query(None),
    endDate: Optional[datetime] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    pageSize: int = Query(50, ge=1, le=100)
):
    """Get workflow execution history"""
    try:
        result = await analytics_service.get_workflow_executions(workflow_id, timeRange, startDate, endDate, status, page, pageSize)
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        executions = [WorkflowExecution(**e) for e in result['executions']]
        return WorkflowExecutionsResponse(
            success=True,
            executions=executions,
            total=result['total'],
            page=page,
            pageSize=pageSize
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get workflow executions error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get workflow executions")


@router.get("/workflows/performance", response_model=WorkflowPerformanceResponse)
@rate_limit(requests_per_minute=30)
async def get_workflow_performance_comparison(
    request: Request,
    user: dict = Depends(get_current_user),
    timeRange: TimeRange = Query(TimeRange.LAST_30_DAYS),
    startDate: Optional[datetime] = Query(None),
    endDate: Optional[datetime] = Query(None)
):
    """Compare workflow performance across periods"""
    try:
        result = await analytics_service.get_workflow_performance_comparison(timeRange, startDate, endDate)
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        comparisons = [WorkflowPerformanceComparison(**c) for c in result['comparisons']]
        return WorkflowPerformanceResponse(
            success=True,
            comparisons=comparisons,
            period=result['period']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get workflow performance error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get workflow performance")


@router.get("/workflows/success-rate")
@rate_limit(requests_per_minute=50)
async def get_workflow_success_rates(
    request: Request,
    user: dict = Depends(get_current_user),
    timeRange: TimeRange = Query(TimeRange.LAST_30_DAYS)
):
    """Get success rates for all workflows"""
    try:
        result = await analytics_service.get_workflow_success_rates(timeRange)
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get workflow success rates error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get workflow success rates")


@router.get("/workflows/top-performers")
@rate_limit(requests_per_minute=50)
async def get_top_performing_workflows(
    request: Request,
    user: dict = Depends(get_current_user),
    timeRange: TimeRange = Query(TimeRange.LAST_30_DAYS),
    limit: int = Query(10, ge=1, le=50)
):
    """Get best performing workflows"""
    try:
        result = await analytics_service.get_workflow_success_rates(timeRange)
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        top_performers = result['successRates'][:limit]
        return {
            'success': True,
            'topPerformers': top_performers,
            'period': result['period']
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get top performers error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get top performers")


@router.get("/workflows/bottlenecks")
@rate_limit(requests_per_minute=30)
async def identify_workflow_bottlenecks(
    request: Request,
    user: dict = Depends(get_current_user),
    workflowId: Optional[str] = Query(None),
    timeRange: TimeRange = Query(TimeRange.LAST_30_DAYS)
):
    """Identify workflow bottlenecks (mock implementation)"""
    try:
        # Mock implementation - in production, analyze step execution times
        bottlenecks = [
            {
                'workflowId': 'workflow_123',
                'workflowName': 'Email Campaign',
                'stepName': 'Send Email',
                'stepIndex': 3,
                'avgStepDuration': 5.2,
                'percentageOfTotalTime': 45.5,
                'failureRate': 2.3,
                'recommendedAction': 'Consider batching email sends or using async processing'
            }
        ]
        
        return {
            'success': True,
            'bottlenecks': bottlenecks,
            'timeRange': timeRange.value
        }
    except Exception as e:
        logger.error(f"Identify bottlenecks error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to identify bottlenecks")


# ==================== System Metrics ====================

@router.get("/system/health", response_model=SystemHealthResponse)
@rate_limit(requests_per_minute=100)
async def get_system_health(
    request: Request,
    user: dict = Depends(get_current_user)
):
    """Get system health overview"""
    try:
        result = await analytics_service.get_system_health()
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        return SystemHealthResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get system health error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get system health")


@router.get("/system/resource-usage", response_model=ResourceUsageMetrics)
@rate_limit(requests_per_minute=100)
async def get_resource_usage(
    request: Request,
    user: dict = Depends(get_current_user)
):
    """Get current resource usage"""
    try:
        result = await analytics_service.get_resource_usage()
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        return ResourceUsageMetrics(**result['metrics'])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get resource usage error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get resource usage")


@router.get("/system/api-metrics")
@rate_limit(requests_per_minute=50)
async def get_api_metrics(
    request: Request,
    user: dict = Depends(get_current_user),
    timeRange: TimeRange = Query(TimeRange.LAST_24_HOURS)
):
    """Get API performance metrics"""
    try:
        result = await analytics_service.get_api_metrics(timeRange)
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get API metrics error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get API metrics")


@router.get("/system/error-rate", response_model=ErrorRateMetrics)
@rate_limit(requests_per_minute=50)
async def get_error_rate_metrics(
    request: Request,
    user: dict = Depends(get_current_user),
    timeRange: TimeRange = Query(TimeRange.LAST_24_HOURS)
):
    """Get error rate tracking"""
    try:
        result = await analytics_service.get_error_rate_metrics(timeRange)
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        return ErrorRateMetrics(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get error rate error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get error rate")


@router.get("/system/uptime")
@rate_limit(requests_per_minute=50)
async def get_system_uptime(
    request: Request,
    user: dict = Depends(get_current_user),
    timeRange: TimeRange = Query(TimeRange.LAST_30_DAYS)
):
    """Get system uptime statistics"""
    try:
        # Mock implementation
        return {
            'success': True,
            'uptime': 99.95,
            'totalDowntime': 2160,  # seconds
            'incidents': 3,
            'lastIncident': datetime.utcnow() - timedelta(days=5),
            'timeRange': timeRange.value
        }
    except Exception as e:
        logger.error(f"Get uptime error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get uptime")


# ==================== User Activity ====================

@router.get("/users/activity", response_model=UserActivityResponse)
@rate_limit(requests_per_minute=50)
async def get_user_activity(
    request: Request,
    user: dict = Depends(get_current_user),
    userId: Optional[str] = Query(None),
    timeRange: TimeRange = Query(TimeRange.LAST_30_DAYS),
    page: int = Query(1, ge=1),
    pageSize: int = Query(50, ge=1, le=100)
):
    """Get user activity tracking"""
    try:
        result = await analytics_service.get_user_activity_metrics(userId, timeRange, page, pageSize)
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        metrics = [UserActivityMetrics(**m) for m in result['metrics']]
        return UserActivityResponse(
            success=True,
            metrics=metrics,
            total=result['total'],
            page=page,
            pageSize=pageSize
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get user activity error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get user activity")


@router.get("/users/{user_id}/metrics")
@rate_limit(requests_per_minute=50)
async def get_user_metrics(
    request: Request,
    user_id: str,
    user: dict = Depends(get_current_user),
    timeRange: TimeRange = Query(TimeRange.LAST_30_DAYS)
):
    """Get metrics for specific user"""
    try:
        result = await analytics_service.get_user_activity_metrics(user_id, timeRange, 1, 1)
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        if not result['metrics']:
            raise HTTPException(status_code=404, detail="User metrics not found")
        
        return {
            'success': True,
            'metrics': result['metrics'][0]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get user metrics error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get user metrics")


@router.get("/users/engagement", response_model=UserEngagementMetrics)
@rate_limit(requests_per_minute=50)
async def get_user_engagement(
    request: Request,
    user: dict = Depends(get_current_user),
    timeRange: TimeRange = Query(TimeRange.LAST_30_DAYS)
):
    """Get user engagement metrics"""
    try:
        result = await analytics_service.get_user_engagement_metrics(timeRange)
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        return UserEngagementMetrics(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get user engagement error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get user engagement")


@router.get("/users/retention")
@rate_limit(requests_per_minute=30)
async def get_user_retention(
    request: Request,
    user: dict = Depends(get_current_user),
    cohort: Optional[str] = Query(None)
):
    """Get user retention analysis"""
    try:
        # Mock implementation
        return {
            'success': True,
            'cohort': cohort or '2025-01',
            'totalUsers': 500,
            'retainedUsers': {
                'week1': 400,
                'week2': 350,
                'week3': 320,
                'week4': 300
            },
            'retentionRate': {
                'week1': 0.80,
                'week2': 0.70,
                'week3': 0.64,
                'week4': 0.60
            },
            'churnRate': 0.40,
            'avgLifetime': 45.5
        }
    except Exception as e:
        logger.error(f"Get user retention error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get user retention")


# ==================== Dashboard ====================

@router.get("/dashboard/overview", response_model=DashboardOverview)
@rate_limit(requests_per_minute=100)
async def get_dashboard_overview(
    request: Request,
    user: dict = Depends(get_current_user),
    timeRange: TimeRange = Query(TimeRange.LAST_24_HOURS)
):
    """Get main dashboard data"""
    try:
        result = await analytics_service.get_dashboard_overview(timeRange)
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        return DashboardOverview(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get dashboard overview error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get dashboard overview")


@router.get("/dashboard/real-time", response_model=RealTimeMetrics)
@rate_limit(requests_per_minute=100)
async def get_real_time_metrics(
    request: Request,
    user: dict = Depends(get_current_user)
):
    """Get real-time metrics"""
    try:
        result = await analytics_service.get_real_time_metrics()
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        return RealTimeMetrics(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get real-time metrics error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get real-time metrics")


@router.get("/dashboard/trends", response_model=TrendAnalysis)
@rate_limit(requests_per_minute=50)
async def get_trend_analysis(
    request: Request,
    user: dict = Depends(get_current_user),
    metric: str = Query(...),
    timeRange: TimeRange = Query(TimeRange.LAST_7_DAYS)
):
    """Get trend analysis for a metric"""
    try:
        result = await analytics_service.get_trends(metric, timeRange)
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        return TrendAnalysis(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get trends error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get trends")


@router.get("/dashboard/alerts", response_model=AlertsResponse)
@rate_limit(requests_per_minute=100)
async def get_alerts(
    request: Request,
    user: dict = Depends(get_current_user),
    severity: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    acknowledged: Optional[bool] = Query(None),
    limit: int = Query(50, ge=1, le=100)
):
    """Get active alerts"""
    try:
        result = await analytics_service.get_alerts(severity, category, acknowledged, limit)
        
        # Always return successfully even if empty (don't crash the dashboard)
        alerts = [Alert(**a) for a in result.get('alerts', [])]
        return AlertsResponse(
            success=True,
            alerts=alerts,
            total=result.get('total', 0),
            criticalCount=result.get('criticalCount', 0),
            warningCount=result.get('warningCount', 0)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get alerts error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get alerts")


@router.get("/dashboard/widgets")
@rate_limit(requests_per_minute=50)
async def get_dashboard_widgets(
    request: Request,
    user: dict = Depends(get_current_user),
    widgetType: str = Query(...)
):
    """Get custom widget data"""
    try:
        # Mock implementation - can be extended for custom widgets
        if widgetType == 'execution_chart':
            return {
                'success': True,
                'widgetType': widgetType,
                'data': {
                    'labels': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    'values': [45, 52, 48, 65, 58, 42, 38]
                }
            }
        elif widgetType == 'success_rate':
            return {
                'success': True,
                'widgetType': widgetType,
                'data': {
                    'rate': 94.5,
                    'change': 2.3,
                    'trend': 'up'
                }
            }
        else:
            raise HTTPException(status_code=400, detail="Unknown widget type")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get widget data error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get widget data")


# ==================== Events & Logs ====================

@router.post("/events", status_code=201)
@rate_limit(requests_per_minute=100)
async def track_event(
    request: Request,
    event: AnalyticsEventCreate,
    user: dict = Depends(get_current_user)
):
    """Track custom analytics event"""
    try:
        event_data = event.dict()
        event_data['userId'] = event_data.get('userId') or user.get('uid')
        
        result = await analytics_service.track_event(event_data)
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        return {
            'success': True,
            'eventId': result['eventId'],
            'message': 'Event tracked successfully'
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Track event error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to track event")


@router.get("/events", response_model=EventsResponse)
@rate_limit(requests_per_minute=50)
async def query_events(
    request: Request,
    user: dict = Depends(get_current_user),
    timeRange: TimeRange = Query(TimeRange.LAST_24_HOURS),
    startDate: Optional[datetime] = Query(None),
    endDate: Optional[datetime] = Query(None),
    userId: Optional[str] = Query(None),
    workflowId: Optional[str] = Query(None),
    eventType: Optional[EventType] = Query(None),
    page: int = Query(1, ge=1),
    pageSize: int = Query(100, ge=1, le=1000)
):
    """Query analytics events"""
    try:
        offset = (page - 1) * pageSize
        result = await analytics_service.get_events(
            timeRange, startDate, endDate, userId, workflowId,
            eventType.value if eventType else None, pageSize, offset
        )
        
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        events = [AnalyticsEventResponse(**e) for e in result['events']]
        return EventsResponse(
            success=True,
            events=events,
            total=result['total'],
            page=page,
            pageSize=pageSize
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Query events error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to query events")


@router.get("/events/timeline", response_model=EventTimelineResponse)
@rate_limit(requests_per_minute=50)
async def get_event_timeline(
    request: Request,
    user: dict = Depends(get_current_user),
    timeRange: TimeRange = Query(TimeRange.LAST_24_HOURS),
    startDate: Optional[datetime] = Query(None),
    endDate: Optional[datetime] = Query(None),
    interval: str = Query('hour', regex='^(hour|day|week)$')
):
    """Get event timeline"""
    try:
        result = await analytics_service.get_event_timeline(timeRange, startDate, endDate, interval)
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        return EventTimelineResponse(
            success=True,
            timeline=result['timeline'],
            period=result['period']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get event timeline error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get event timeline")


@router.get("/events/export", response_model=AnalyticsExportResponse)
@rate_limit(requests_per_minute=10)
async def export_events(
    request: Request,
    user: dict = Depends(get_current_user),
    timeRange: TimeRange = Query(TimeRange.LAST_30_DAYS),
    format: str = Query('csv', regex='^(csv|json|excel)$')
):
    """Export analytics events"""
    try:
        # Mock implementation
        export_id = f"export_{datetime.utcnow().timestamp()}"
        download_url = f"https://api.example.com/exports/{export_id}.{format}"
        
        return AnalyticsExportResponse(
            success=True,
            exportId=export_id,
            downloadUrl=download_url,
            format=format,
            expiresAt=datetime.utcnow() + timedelta(hours=24)
        )
    except Exception as e:
        logger.error(f"Export events error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to export events")
