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
        """Get API performance metrics.

        Currently there is no real request-tracking backend wired up, so we
        return an empty metrics array instead of any mocked data. Once
        request tracking is implemented, this method should aggregate and
        return real metrics from the underlying store.
        """
        start, end = self.parse_time_range(time_range)

        # No real metrics yet – return empty list so frontend can show
        # an explicit "no data" state instead of fake rows.
        return {
            'success': True,
            'metrics': [],
            'timestamp': datetime.utcnow(),
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
        """Get user engagement metrics based on real Firestore data.

        - totalUsers is derived from the users collection (via dashboard overview)
        - *Active* users are users with at least one `user_action` event in the
          selected time range.
        - Daily/weekly/monthly actives are based on activity in the last
          1/7/30 days respectively.
        - newUsers are users whose first action is within the selected range;
          returningUsers are the rest of the active cohort.
        - Engagement rate is activeUsers / totalUsers.

        On any failure we return zeros instead of hardcoded demo values so the
        frontend can show an honest empty state rather than fake data.
        """
        start, end = self.parse_time_range(time_range)

        # Determine total users using the same logic as the dashboard overview.
        total_users = 0
        try:
            dashboard = await self.db.get_dashboard_overview(start, end)
            if dashboard.get('success'):
                users_info = dashboard.get('users') or {}
                total_users = int(users_info.get('total', 0))
        except Exception as e:
            logger.error(f"Failed to load total users for engagement metrics: {e}")
            total_users = 0

        try:
            # Pull user_action events for the period and derive activity stats.
            events_result = await self.db.get_events(
                start_date=start,
                end_date=end,
                user_id=None,
                workflow_id=None,
                event_type='user_action',
                limit=10000,
                offset=0,
            )

            if not events_result.get('success'):
                logger.error(
                    "get_user_engagement_metrics: events query failed: %s",
                    events_result.get('error'),
                )
                # Return zeros rather than fake numbers.
                return {
                    'success': True,
                    'totalUsers': total_users,
                    'activeUsers': 0,
                    'dailyActiveUsers': 0,
                    'weeklyActiveUsers': 0,
                    'monthlyActiveUsers': 0,
                    'newUsers': 0,
                    'returningUsers': 0,
                    'avgSessionsPerUser': 0.0,
                    'avgActionsPerUser': 0.0,
                    'engagementRate': 0.0,
                }

            events = events_result.get('events', [])

            now = datetime.utcnow()
            day_ago = now - timedelta(days=1)
            week_ago = now - timedelta(days=7)

            monthly_users = set()
            weekly_users = set()
            daily_users = set()

            user_sessions: Dict[str, set] = {}
            user_actions: Dict[str, int] = {}
            first_seen: Dict[str, datetime] = {}

            for event in events:
                uid = event.get('userId')
                ts = event.get('timestamp')
                if not uid or not isinstance(ts, datetime):
                    continue

                # Track active sets
                monthly_users.add(uid)
                if ts >= week_ago:
                    weekly_users.add(uid)
                if ts >= day_ago:
                    daily_users.add(uid)

                # Aggregate sessions/actions
                user_actions[uid] = user_actions.get(uid, 0) + 1
                props = event.get('properties') or {}
                session_id = props.get('sessionId')
                if session_id:
                    sessions = user_sessions.setdefault(uid, set())
                    sessions.add(session_id)

                prev_first = first_seen.get(uid)
                if prev_first is None or ts < prev_first:
                    first_seen[uid] = ts

            active_users = len(monthly_users)
            total_sessions = sum(len(user_sessions.get(uid, set())) for uid in monthly_users)
            total_actions = sum(user_actions.get(uid, 0) for uid in monthly_users)

            avg_sessions_per_user = (
                float(total_sessions) / active_users if active_users > 0 else 0.0
            )
            avg_actions_per_user = (
                float(total_actions) / active_users if active_users > 0 else 0.0
            )

            # A "new" user is one whose first action falls inside the period
            new_users = sum(1 for ts in first_seen.values() if ts >= start)
            returning_users = max(active_users - new_users, 0)

            engagement_rate = (
                float(active_users) / float(total_users) * 100.0
                if total_users > 0
                else 0.0
            )

            return {
                'success': True,
                'totalUsers': total_users,
                'activeUsers': active_users,
                'dailyActiveUsers': len(daily_users),
                'weeklyActiveUsers': len(weekly_users),
                'monthlyActiveUsers': active_users,
                'newUsers': new_users,
                'returningUsers': returning_users,
                'avgSessionsPerUser': avg_sessions_per_user,
                'avgActionsPerUser': avg_actions_per_user,
                'engagementRate': engagement_rate,
            }
        except Exception as e:
            logger.error(f"Failed to compute user engagement metrics: {e}")
            # Still no fake data – just zeros if something goes wrong.
            return {
                'success': True,
                'totalUsers': total_users,
                'activeUsers': 0,
                'dailyActiveUsers': 0,
                'weeklyActiveUsers': 0,
                'monthlyActiveUsers': 0,
                'newUsers': 0,
                'returningUsers': 0,
                'avgSessionsPerUser': 0.0,
                'avgActionsPerUser': 0.0,
                'engagementRate': 0.0,
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
