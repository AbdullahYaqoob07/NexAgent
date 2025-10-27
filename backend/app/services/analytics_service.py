import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from app.db.analytics_db import analytics_db
from app.models.analytics_models import TimeRange

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Service layer for analytics and monitoring"""
    
    def __init__(self):
        self.db = analytics_db
    
    # ==================== Helper Methods ====================
    
    def parse_time_range(self, time_range: TimeRange, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None):
        """Parse time range to start and end dates"""
        now = datetime.utcnow()
        
        if time_range == TimeRange.CUSTOM:
            return start_date or (now - timedelta(days=7)), end_date or now
        elif time_range == TimeRange.LAST_HOUR:
            return now - timedelta(hours=1), now
        elif time_range == TimeRange.LAST_24_HOURS:
            return now - timedelta(hours=24), now
        elif time_range == TimeRange.LAST_7_DAYS:
            return now - timedelta(days=7), now
        elif time_range == TimeRange.LAST_30_DAYS:
            return now - timedelta(days=30), now
        elif time_range == TimeRange.LAST_90_DAYS:
            return now - timedelta(days=90), now
        else:
            return now - timedelta(days=7), now
    
    # ==================== Event Tracking ====================
    
    async def track_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Track analytics event"""
        return await self.db.track_event(event_data)
    
    async def get_events(
        self,
        time_range: TimeRange = TimeRange.LAST_24_HOURS,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        user_id: Optional[str] = None,
        workflow_id: Optional[str] = None,
        event_type: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Query analytics events"""
        start, end = self.parse_time_range(time_range, start_date, end_date)
        return await self.db.get_events(start, end, user_id, workflow_id, event_type, limit, offset)
    
    async def get_event_timeline(
        self,
        time_range: TimeRange = TimeRange.LAST_24_HOURS,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        interval: str = 'hour'
    ) -> Dict[str, Any]:
        """Get event timeline"""
        start, end = self.parse_time_range(time_range, start_date, end_date)
        return await self.db.get_event_timeline(start, end, interval)
    
    # ==================== Workflow Analytics ====================
    
    async def get_workflow_overview(
        self,
        time_range: TimeRange = TimeRange.LAST_30_DAYS,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get workflow analytics overview"""
        start, end = self.parse_time_range(time_range, start_date, end_date)
        
        # Get all workflows and aggregate metrics
        events_result = await self.db.get_events(start_date=start, end_date=end, limit=10000)
        if not events_result['success']:
            return events_result
        
        events = events_result['events']
        
        total_executions = len([e for e in events if e.get('eventType') in ['workflow_completed', 'workflow_failed']])
        successful = len([e for e in events if e.get('eventType') == 'workflow_completed'])
        failed = len([e for e in events if e.get('eventType') == 'workflow_failed'])
        success_rate = (successful / total_executions * 100) if total_executions > 0 else 0
        
        return {
            'success': True,
            'overview': {
                'totalExecutions': total_executions,
                'successfulExecutions': successful,
                'failedExecutions': failed,
                'successRate': success_rate,
                'period': f"{start.isoformat()} to {end.isoformat()}"
            }
        }
    
    async def get_workflow_metrics(
        self,
        workflow_id: str,
        workflow_name: str,
        time_range: TimeRange = TimeRange.LAST_30_DAYS,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get detailed workflow metrics"""
        start, end = self.parse_time_range(time_range, start_date, end_date)
        
        metrics_result = await self.db.get_workflow_metrics(workflow_id, start, end)
        if not metrics_result['success']:
            return metrics_result
        
        metrics = metrics_result['metrics']
        metrics['workflowName'] = workflow_name
        
        # Get time series data
        timeline_result = await self.db.get_event_timeline(start, end, 'day')
        time_series = timeline_result.get('timeline', []) if timeline_result['success'] else []
        
        return {
            'success': True,
            'metrics': metrics,
            'timeSeries': time_series,
            'period': f"{start.isoformat()} to {end.isoformat()}"
        }
    
    async def get_workflow_executions(
        self,
        workflow_id: str,
        time_range: TimeRange = TimeRange.LAST_7_DAYS,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 50
    ) -> Dict[str, Any]:
        """Get workflow execution history"""
        start, end = self.parse_time_range(time_range, start_date, end_date)
        offset = (page - 1) * page_size
        
        return await self.db.get_workflow_executions(workflow_id, start, end, status, page_size, offset)
    
    async def get_workflow_performance_comparison(
        self,
        time_range: TimeRange = TimeRange.LAST_30_DAYS,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Compare workflow performance across periods"""
        start, end = self.parse_time_range(time_range, start_date, end_date)
        return await self.db.get_all_workflows_performance(start, end)
    
    async def get_workflow_success_rates(
        self,
        time_range: TimeRange = TimeRange.LAST_30_DAYS
    ) -> Dict[str, Any]:
        """Get success rates for all workflows"""
        start, end = self.parse_time_range(time_range)
        performance = await self.db.get_all_workflows_performance(start, end)
        
        if not performance['success']:
            return performance
        
        success_rates = [
            {
                'workflowId': p['workflowId'],
                'workflowName': p['workflowName'],
                'successRate': p['currentSuccessRate'],
                'totalExecutions': p['currentPeriodExecutions']
            }
            for p in performance['comparisons']
        ]
        
        # Sort by success rate
        success_rates.sort(key=lambda x: x['successRate'], reverse=True)
        
        return {
            'success': True,
            'successRates': success_rates,
            'period': performance['period']
        }
    
    # ==================== System Metrics ====================
    
    async def get_system_health(self) -> Dict[str, Any]:
        """Get system health status"""
        return await self.db.get_system_health()
    
    async def get_resource_usage(self) -> Dict[str, Any]:
        """Get resource usage metrics"""
        return await self.db.get_resource_usage()
    
    async def get_api_metrics(
        self,
        time_range: TimeRange = TimeRange.LAST_24_HOURS
    ) -> Dict[str, Any]:
        """Get API performance metrics"""
        start, end = self.parse_time_range(time_range)
        
        # Mock implementation - in production, integrate with request tracking
        return {
            'success': True,
            'metrics': [
                {
                    'endpoint': '/api/v1/workflows',
                    'method': 'GET',
                    'totalCalls': 1250,
                    'successfulCalls': 1230,
                    'failedCalls': 20,
                    'avgLatency': 125.5,
                    'p50Latency': 98.2,
                    'p95Latency': 245.8,
                    'p99Latency': 450.3,
                    'minLatency': 45.2,
                    'maxLatency': 980.1,
                    'errorRate': 1.6
                },
                {
                    'endpoint': '/api/v1/integrations/connections',
                    'method': 'POST',
                    'totalCalls': 580,
                    'successfulCalls': 575,
                    'failedCalls': 5,
                    'avgLatency': 210.3,
                    'p50Latency': 180.5,
                    'p95Latency': 380.2,
                    'p99Latency': 550.7,
                    'minLatency': 120.3,
                    'maxLatency': 850.2,
                    'errorRate': 0.86
                }
            ],
            'timestamp': datetime.utcnow()
        }
    
    async def get_error_rate_metrics(
        self,
        time_range: TimeRange = TimeRange.LAST_24_HOURS
    ) -> Dict[str, Any]:
        """Get error rate tracking"""
        start, end = self.parse_time_range(time_range)
        
        # Get error events
        errors_result = await self.db.get_events(
            start_date=start,
            end_date=end,
            event_type='error',
            limit=1000
        )
        
        if not errors_result['success']:
            return errors_result
        
        errors = errors_result['events']
        
        errors_by_type = {}
        errors_by_endpoint = {}
        critical_errors = 0
        warning_errors = 0
        
        for error in errors:
            error_type = error.get('properties', {}).get('errorType', 'Unknown')
            errors_by_type[error_type] = errors_by_type.get(error_type, 0) + 1
            
            endpoint = error.get('properties', {}).get('endpoint', 'Unknown')
            errors_by_endpoint[endpoint] = errors_by_endpoint.get(endpoint, 0) + 1
            
            severity = error.get('properties', {}).get('severity', 'warning')
            if severity == 'critical':
                critical_errors += 1
            else:
                warning_errors += 1
        
        top_errors = sorted(
            [{'type': k, 'count': v} for k, v in errors_by_type.items()],
            key=lambda x: x['count'],
            reverse=True
        )[:10]
        
        total_requests = 5000  # Mock - get from system metrics
        error_rate = (len(errors) / total_requests * 100) if total_requests > 0 else 0
        
        return {
            'success': True,
            'totalErrors': len(errors),
            'errorRate': error_rate,
            'errorsByType': errors_by_type,
            'errorsByEndpoint': errors_by_endpoint,
            'criticalErrors': critical_errors,
            'warningErrors': warning_errors,
            'topErrors': top_errors,
            'timestamp': datetime.utcnow()
        }
    
    # ==================== User Activity ====================
    
    async def get_user_activity_metrics(
        self,
        user_id: Optional[str] = None,
        time_range: TimeRange = TimeRange.LAST_30_DAYS,
        page: int = 1,
        page_size: int = 50
    ) -> Dict[str, Any]:
        """Get user activity metrics"""
        start, end = self.parse_time_range(time_range)
        offset = (page - 1) * page_size
        
        return await self.db.get_user_activity_metrics(user_id, start, end, page_size, offset)
    
    async def get_user_engagement_metrics(
        self,
        time_range: TimeRange = TimeRange.LAST_30_DAYS
    ) -> Dict[str, Any]:
        """Get user engagement metrics"""
        start, end = self.parse_time_range(time_range)
        
        # Mock implementation - in production, compute from actual user data
        return {
            'success': True,
            'totalUsers': 1250,
            'activeUsers': 850,
            'dailyActiveUsers': 450,
            'weeklyActiveUsers': 680,
            'monthlyActiveUsers': 850,
            'newUsers': 85,
            'returningUsers': 765,
            'avgSessionsPerUser': 12.5,
            'avgActionsPerUser': 45.2,
            'engagementRate': 68.0
        }
    
    # ==================== Dashboard ====================
    
    async def get_dashboard_overview(
        self,
        time_range: TimeRange = TimeRange.LAST_24_HOURS
    ) -> Dict[str, Any]:
        """Get main dashboard data"""
        start, end = self.parse_time_range(time_range)
        return await self.db.get_dashboard_overview(start, end)
    
    async def get_real_time_metrics(self) -> Dict[str, Any]:
        """Get real-time metrics"""
        return {
            'success': True,
            'activeExecutions': 15,
            'executionsPerMinute': 8,
            'avgExecutionTime': 12.5,
            'currentErrorRate': 1.2,
            'activeUsers': 125,
            'requestsPerSecond': 45.2,
            'queuedJobs': 28,
            'systemLoad': 62.5,
            'timestamp': datetime.utcnow()
        }
    
    async def get_trends(
        self,
        metric: str,
        time_range: TimeRange = TimeRange.LAST_7_DAYS
    ) -> Dict[str, Any]:
        """Get trend analysis for a metric"""
        start, end = self.parse_time_range(time_range)
        
        # Get timeline data
        timeline_result = await self.db.get_event_timeline(start, end, 'day')
        if not timeline_result['success']:
            return timeline_result
        
        data_points = timeline_result['timeline']
        
        # Determine trend
        if len(data_points) >= 2:
            first_value = data_points[0]['count']
            last_value = data_points[-1]['count']
            change = ((last_value - first_value) / first_value * 100) if first_value > 0 else 0
            
            if change > 5:
                trend = 'increasing'
            elif change < -5:
                trend = 'decreasing'
            else:
                trend = 'stable'
        else:
            trend = 'unknown'
            change = 0
        
        insights = []
        if trend == 'increasing':
            insights.append(f"{metric} has increased by {abs(change):.1f}% over the period")
        elif trend == 'decreasing':
            insights.append(f"{metric} has decreased by {abs(change):.1f}% over the period")
        else:
            insights.append(f"{metric} has remained relatively stable")
        
        return {
            'success': True,
            'metric': metric,
            'timeRange': time_range.value,
            'dataPoints': data_points,
            'trend': trend,
            'changePercentage': change,
            'insights': insights
        }
    
    # ==================== Alerts ====================
    
    async def get_alerts(
        self,
        severity: Optional[str] = None,
        category: Optional[str] = None,
        acknowledged: Optional[bool] = None,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Get system alerts"""
        return await self.db.get_alerts(severity, category, acknowledged, limit)
    
    async def create_alert(self, alert_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create system alert"""
        return await self.db.create_alert(alert_data)


# Global instance
analytics_service = AnalyticsService()
