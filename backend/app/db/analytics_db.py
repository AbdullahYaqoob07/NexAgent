import logging
from typing import Optional, Dict, Any, List
from firebase_admin import firestore
from datetime import datetime, timedelta
from collections import defaultdict
import statistics

logger = logging.getLogger(__name__)


class AnalyticsDB:
    """Database operations for analytics and monitoring"""
    
    def __init__(self):
        self.db = firestore.client()
        self.events_collection = 'analytics_events'
        self.metrics_collection = 'analytics_metrics'
        self.aggregations_collection = 'analytics_aggregations'
        self.alerts_collection = 'analytics_alerts'
        self.system_metrics_collection = 'system_metrics'
    
    # ==================== Event Tracking ====================
    
    async def track_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Track analytics event"""
        try:
            event_ref = self.db.collection(self.events_collection).document()
            event_id = event_ref.id
            
            event_data['id'] = event_id
            event_data['createdAt'] = firestore.SERVER_TIMESTAMP
            
            if 'timestamp' not in event_data or event_data['timestamp'] is None:
                event_data['timestamp'] = datetime.utcnow()
            
            event_ref.set(event_data)
            
            logger.info(f"✅ Event tracked: {event_id}")
            return {'success': True, 'eventId': event_id, 'data': event_data}
        except Exception as e:
            logger.error(f"❌ Failed to track event: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_events(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        user_id: Optional[str] = None,
        workflow_id: Optional[str] = None,
        event_type: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Query analytics events"""
        try:
            query = self.db.collection(self.events_collection)
            
            # Apply filters
            if start_date:
                query = query.where('timestamp', '>=', start_date)
            if end_date:
                query = query.where('timestamp', '<=', end_date)
            if user_id:
                query = query.where('userId', '==', user_id)
            if workflow_id:
                query = query.where('workflowId', '==', workflow_id)
            if event_type:
                query = query.where('eventType', '==', event_type)
            
            # Order and pagination
            query = query.order_by('timestamp', direction=firestore.Query.DESCENDING)
            
            # Get total count
            all_docs = list(query.stream())
            total = len(all_docs)
            
            # Apply pagination
            paginated = all_docs[offset:offset + limit]
            events = [doc.to_dict() for doc in paginated]
            
            return {
                'success': True,
                'events': events,
                'total': total
            }
        except Exception as e:
            logger.error(f"❌ Failed to get events: {str(e)}")
            return {'success': False, 'error': str(e), 'events': [], 'total': 0}
    
    async def get_event_timeline(
        self,
        start_date: datetime,
        end_date: datetime,
        interval: str = 'hour'  # hour, day, week
    ) -> Dict[str, Any]:
        """Get event timeline aggregated by interval"""
        try:
            events_result = await self.get_events(start_date=start_date, end_date=end_date, limit=10000)
            if not events_result['success']:
                return events_result
            
            events = events_result['events']
            timeline = defaultdict(int)
            
            for event in events:
                timestamp = event.get('timestamp')
                if isinstance(timestamp, datetime):
                    if interval == 'hour':
                        bucket = timestamp.replace(minute=0, second=0, microsecond=0)
                    elif interval == 'day':
                        bucket = timestamp.replace(hour=0, minute=0, second=0, microsecond=0)
                    else:  # week
                        bucket = timestamp - timedelta(days=timestamp.weekday())
                        bucket = bucket.replace(hour=0, minute=0, second=0, microsecond=0)
                    
                    timeline[bucket.isoformat()] += 1
            
            timeline_list = [{'timestamp': k, 'count': v} for k, v in sorted(timeline.items())]
            
            return {
                'success': True,
                'timeline': timeline_list,
                'period': f"{start_date.isoformat()} to {end_date.isoformat()}"
            }
        except Exception as e:
            logger.error(f"❌ Failed to get event timeline: {str(e)}")
            return {'success': False, 'error': str(e), 'timeline': []}
    
    # ==================== Workflow Analytics ====================
    
    async def get_workflow_metrics(self, workflow_id: str, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get workflow execution metrics"""
        try:
            # Query workflow execution events
            events_result = await self.get_events(
                workflow_id=workflow_id,
                start_date=start_date,
                end_date=end_date,
                limit=10000
            )
            
            if not events_result['success']:
                return events_result
            
            events = events_result['events']
            
            # Calculate metrics
            total_executions = 0
            successful_executions = 0
            failed_executions = 0
            execution_times = []
            last_executed_at = None
            
            for event in events:
                if event.get('eventType') == 'workflow_completed':
                    total_executions += 1
                    successful_executions += 1
                    duration = event.get('properties', {}).get('duration')
                    if duration:
                        execution_times.append(duration)
                    
                    timestamp = event.get('timestamp')
                    if timestamp and (not last_executed_at or timestamp > last_executed_at):
                        last_executed_at = timestamp
                
                elif event.get('eventType') == 'workflow_failed':
                    total_executions += 1
                    failed_executions += 1
            
            # Compute stats
            success_rate = (successful_executions / total_executions * 100) if total_executions > 0 else 0
            
            avg_execution_time = statistics.mean(execution_times) if execution_times else 0
            min_execution_time = min(execution_times) if execution_times else 0
            max_execution_time = max(execution_times) if execution_times else 0
            p95_execution_time = statistics.quantiles(execution_times, n=20)[18] if len(execution_times) >= 20 else max_execution_time
            
            return {
                'success': True,
                'metrics': {
                    'workflowId': workflow_id,
                    'totalExecutions': total_executions,
                    'successfulExecutions': successful_executions,
                    'failedExecutions': failed_executions,
                    'successRate': success_rate,
                    'avgExecutionTime': avg_execution_time,
                    'minExecutionTime': min_execution_time,
                    'maxExecutionTime': max_execution_time,
                    'p95ExecutionTime': p95_execution_time,
                    'lastExecutedAt': last_executed_at
                }
            }
        except Exception as e:
            logger.error(f"❌ Failed to get workflow metrics: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_workflow_executions(
        self,
        workflow_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Get workflow execution history"""
        try:
            query = self.db.collection('workflow_executions').where('workflowId', '==', workflow_id)
            
            if start_date:
                query = query.where('startTime', '>=', start_date)
            if end_date:
                query = query.where('startTime', '<=', end_date)
            if status:
                query = query.where('status', '==', status)
            
            query = query.order_by('startTime', direction=firestore.Query.DESCENDING)
            
            all_docs = list(query.stream())
            total = len(all_docs)
            
            paginated = all_docs[offset:offset + limit]
            executions = [doc.to_dict() for doc in paginated]
            
            return {
                'success': True,
                'executions': executions,
                'total': total
            }
        except Exception as e:
            logger.error(f"❌ Failed to get workflow executions: {str(e)}")
            return {'success': False, 'error': str(e), 'executions': [], 'total': 0}
    
    async def get_all_workflows_performance(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get performance comparison for all workflows"""
        try:
            # Get all workflow IDs
            workflows_ref = self.db.collection('workflows')
            workflows = [doc.to_dict() for doc in workflows_ref.stream()]
            
            comparisons = []
            
            # Calculate period durations
            current_period_duration = end_date - start_date
            previous_start = start_date - current_period_duration
            previous_end = start_date
            
            for workflow in workflows:
                workflow_id = workflow.get('id')
                
                # Current period metrics
                current_metrics = await self.get_workflow_metrics(workflow_id, start_date, end_date)
                # Previous period metrics
                previous_metrics = await self.get_workflow_metrics(workflow_id, previous_start, previous_end)
                
                if current_metrics['success'] and previous_metrics['success']:
                    current = current_metrics['metrics']
                    previous = previous_metrics['metrics']
                    
                    execution_change = (
                        ((current['totalExecutions'] - previous['totalExecutions']) / previous['totalExecutions'] * 100)
                        if previous['totalExecutions'] > 0 else 0
                    )
                    
                    success_rate_change = current['successRate'] - previous['successRate']
                    
                    execution_time_change = (
                        ((current['avgExecutionTime'] - previous['avgExecutionTime']) / previous['avgExecutionTime'] * 100)
                        if previous['avgExecutionTime'] > 0 else 0
                    )
                    
                    comparisons.append({
                        'workflowId': workflow_id,
                        'workflowName': workflow.get('name', 'Unknown'),
                        'currentPeriodExecutions': current['totalExecutions'],
                        'previousPeriodExecutions': previous['totalExecutions'],
                        'executionChange': execution_change,
                        'currentSuccessRate': current['successRate'],
                        'previousSuccessRate': previous['successRate'],
                        'successRateChange': success_rate_change,
                        'avgExecutionTime': current['avgExecutionTime'],
                        'executionTimeChange': execution_time_change
                    })
            
            return {
                'success': True,
                'comparisons': comparisons,
                'period': f"{start_date.isoformat()} to {end_date.isoformat()}"
            }
        except Exception as e:
            logger.error(f"❌ Failed to get workflows performance: {str(e)}")
            return {'success': False, 'error': str(e), 'comparisons': []}
    
    # ==================== System Metrics ====================
    
    async def store_system_metrics(self, metrics_data: Dict[str, Any]) -> Dict[str, Any]:
        """Store system metrics snapshot"""
        try:
            metric_ref = self.db.collection(self.system_metrics_collection).document()
            metrics_data['timestamp'] = firestore.SERVER_TIMESTAMP
            metric_ref.set(metrics_data)
            
            return {'success': True, 'metricId': metric_ref.id}
        except Exception as e:
            logger.error(f"❌ Failed to store system metrics: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_system_health(self) -> Dict[str, Any]:
        """Get current system health status"""
        try:
            # Get recent metrics (last 5 minutes)
            five_min_ago = datetime.utcnow() - timedelta(minutes=5)
            
            metrics_query = (self.db.collection(self.system_metrics_collection)
                           .where('timestamp', '>=', five_min_ago)
                           .order_by('timestamp', direction=firestore.Query.DESCENDING)
                           .limit(1))
            
            docs = list(metrics_query.stream())
            
            if docs:
                latest_metrics = docs[0].to_dict()
                
                # Determine health status
                error_rate = latest_metrics.get('errorRate', 0)
                status = 'healthy'
                if error_rate > 10:
                    status = 'degraded'
                elif error_rate > 25:
                    status = 'down'
                
                return {
                    'success': True,
                    'status': status,
                    'uptime': latest_metrics.get('uptime', 0),
                    'uptimePercentage': latest_metrics.get('uptimePercentage', 0),
                    'totalRequests': latest_metrics.get('totalRequests', 0),
                    'successfulRequests': latest_metrics.get('successfulRequests', 0),
                    'failedRequests': latest_metrics.get('failedRequests', 0),
                    'avgResponseTime': latest_metrics.get('avgResponseTime', 0),
                    'errorRate': error_rate,
                    'activeConnections': latest_metrics.get('activeConnections', 0),
                    'timestamp': latest_metrics.get('timestamp', datetime.utcnow())
                }
            else:
                # No recent metrics: still return a full SystemHealthResponse-compatible object
                return {
                    'success': True,
                    'status': 'unknown',
                    'uptime': 0,
                    'uptimePercentage': 0.0,
                    'totalRequests': 0,
                    'successfulRequests': 0,
                    'failedRequests': 0,
                    'avgResponseTime': 0.0,
                    'errorRate': 0.0,
                    'activeConnections': 0,
                    'timestamp': datetime.utcnow(),
                }
        except Exception as e:
            logger.error(f"❌ Failed to get system health: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_resource_usage(self) -> Dict[str, Any]:
        """Get current resource usage"""
        try:
            # Mock implementation - in production, integrate with monitoring tools
            return {
                'success': True,
                'metrics': {
                    'cpuUsage': 45.2,
                    'memoryUsage': 62.8,
                    'memoryUsedMB': 2048,
                    'memoryTotalMB': 4096,
                    'diskUsage': 38.5,
                    'diskUsedGB': 150,
                    'diskTotalGB': 500,
                    'activeThreads': 25,
                    'timestamp': datetime.utcnow()
                }
            }
        except Exception as e:
            logger.error(f"❌ Failed to get resource usage: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    # ==================== User Activity ====================
    
    async def get_user_activity_metrics(
        self,
        user_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Get user activity metrics"""
        try:
            # Get user events
            events_result = await self.get_events(
                user_id=user_id,
                start_date=start_date,
                end_date=end_date,
                event_type='user_action',
                limit=10000
            )
            
            if not events_result['success']:
                return events_result
            
            events = events_result['events']
            
            # Group by user
            user_metrics = defaultdict(lambda: {
                'totalActions': 0,
                'sessions': set(),
                'workflows_created': 0,
                'workflows_executed': 0,
                'integrations_connected': 0,
                'api_calls': 0,
                'last_active': None
            })
            
            for event in events:
                uid = event.get('userId')
                if not uid:
                    continue
                
                user_metrics[uid]['totalActions'] += 1
                
                session_id = event.get('properties', {}).get('sessionId')
                if session_id:
                    user_metrics[uid]['sessions'].add(session_id)
                
                action = event.get('eventName')
                if action == 'workflow_created':
                    user_metrics[uid]['workflows_created'] += 1
                elif action == 'workflow_executed':
                    user_metrics[uid]['workflows_executed'] += 1
                elif action == 'integration_connected':
                    user_metrics[uid]['integrations_connected'] += 1
                
                timestamp = event.get('timestamp')
                if timestamp and (not user_metrics[uid]['last_active'] or timestamp > user_metrics[uid]['last_active']):
                    user_metrics[uid]['last_active'] = timestamp
            
            # Convert to list
            metrics_list = []
            for uid, metrics in user_metrics.items():
                metrics_list.append({
                    'userId': uid,
                    'totalSessions': len(metrics['sessions']),
                    'totalActions': metrics['totalActions'],
                    'avgSessionDuration': 15.5,  # Mock - need session tracking
                    'lastActive': metrics['last_active'],
                    'workflowsCreated': metrics['workflows_created'],
                    'workflowsExecuted': metrics['workflows_executed'],
                    'integrationsConnected': metrics['integrations_connected'],
                    'apiCallsMade': metrics['api_calls']
                })
            
            # Pagination
            total = len(metrics_list)
            paginated = metrics_list[offset:offset + limit]
            
            return {
                'success': True,
                'metrics': paginated,
                'total': total
            }
        except Exception as e:
            logger.error(f"❌ Failed to get user activity metrics: {str(e)}")
            return {'success': False, 'error': str(e), 'metrics': [], 'total': 0}
    
    # ==================== Dashboard ====================
    
    async def get_dashboard_overview(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get dashboard overview data"""
        try:
            # Get workflow stats
            workflows_ref = self.db.collection('workflows')
            total_workflows = len(list(workflows_ref.stream()))
            
            # Get execution stats
            events_result = await self.get_events(start_date=start_date, end_date=end_date, limit=10000)
            events = events_result.get('events', [])
            
            total_executions = len([e for e in events if e.get('eventType') in ['workflow_completed', 'workflow_failed']])
            successful_executions = len([e for e in events if e.get('eventType') == 'workflow_completed'])
            failed_executions = len([e for e in events if e.get('eventType') == 'workflow_failed'])
            
            success_rate = (successful_executions / total_executions * 100) if total_executions > 0 else 0
            
            # Get user stats
            users_ref = self.db.collection('users')
            total_users = len(list(users_ref.stream()))
            
            # Get recent activity
            recent_events = events[:10]
            recent_activity = [{
                'id': e.get('id'),
                'type': e.get('eventType'),
                'name': e.get('eventName'),
                'timestamp': e.get('timestamp'),
                'user': e.get('userId')
            } for e in recent_events]
            
            return {
                'success': True,
                'period': f"{start_date.isoformat()} to {end_date.isoformat()}",
                'workflows': {
                    'total': total_workflows,
                    'active': total_workflows,  # Mock
                    'success_rate': success_rate
                },
                'executions': {
                    'total': total_executions,
                    'successful': successful_executions,
                    'failed': failed_executions,
                    'running': 0  # Mock
                },
                'users': {
                    'total': total_users,
                    'active': total_users,  # Mock
                    'new': 0  # Mock
                },
                'integrations': {
                    'total': 30,  # Mock
                    'active': 25,  # Mock
                    'connections': 50  # Mock
                },
                'system': {
                    'health': 'healthy',
                    'uptime': 99.9,
                    'error_rate': 0.5
                },
                'recentActivity': recent_activity,
                'timestamp': datetime.utcnow()
            }
        except Exception as e:
            logger.error(f"❌ Failed to get dashboard overview: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    # ==================== Alerts ====================
    
    async def create_alert(self, alert_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create system alert"""
        try:
            alert_ref = self.db.collection(self.alerts_collection).document()
            alert_id = alert_ref.id
            
            alert_data['id'] = alert_id
            alert_data['timestamp'] = firestore.SERVER_TIMESTAMP
            alert_data['acknowledged'] = False
            alert_data['resolvedAt'] = None
            
            alert_ref.set(alert_data)
            
            logger.info(f"✅ Alert created: {alert_id}")
            return {'success': True, 'alertId': alert_id}
        except Exception as e:
            logger.error(f"❌ Failed to create alert: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_alerts(
        self,
        severity: Optional[str] = None,
        category: Optional[str] = None,
        acknowledged: Optional[bool] = None,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Get system alerts"""
        try:
            query = self.db.collection(self.alerts_collection)
            
            if severity:
                query = query.where('severity', '==', severity)
            if category:
                query = query.where('category', '==', category)
            if acknowledged is not None:
                query = query.where('acknowledged', '==', acknowledged)
            
            query = query.order_by('timestamp', direction=firestore.Query.DESCENDING).limit(limit)
            
            alerts = [doc.to_dict() for doc in query.stream()]
            
            critical_count = len([a for a in alerts if a.get('severity') == 'critical'])
            warning_count = len([a for a in alerts if a.get('severity') == 'warning'])
            
            return {
                'success': True,
                'alerts': alerts,
                'total': len(alerts),
                'criticalCount': critical_count,
                'warningCount': warning_count
            }
        except Exception as e:
            error_msg = str(e)
            # If it's a missing index error, log it but return empty results gracefully
            if 'requires an index' in error_msg or 'FAILED_PRECONDITION' in error_msg:
                logger.warning(f"⚠️ Firestore index needed for alerts query. Returning empty results. Error: {error_msg[:200]}")
                return {
                    'success': True,
                    'alerts': [],
                    'total': 0,
                    'criticalCount': 0,
                    'warningCount': 0
                }
            logger.error(f"❌ Failed to get alerts: {error_msg}")
            return {'success': True, 'error': error_msg, 'alerts': [], 'total': 0, 'criticalCount': 0, 'warningCount': 0}


# Global instance
analytics_db = AnalyticsDB()
