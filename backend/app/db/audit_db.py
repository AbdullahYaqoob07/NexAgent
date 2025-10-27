import logging
from typing import Optional, Dict, Any, List
from firebase_admin import firestore
from datetime import datetime, timedelta
from collections import defaultdict

logger = logging.getLogger(__name__)


class AuditDB:
    """Database operations for audit logs and compliance"""
    
    def __init__(self):
        self.db = firestore.client()
        self.audit_logs_collection = 'audit_logs'
        self.security_logs_collection = 'security_logs'
        self.access_logs_collection = 'access_logs'
        self.compliance_reports_collection = 'compliance_reports'
        self.retention_policies_collection = 'retention_policies'
        self.compliance_alerts_collection = 'compliance_alerts'
    
    # ==================== Audit Logs ====================
    
    async def log_audit_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Log audit event"""
        try:
            log_ref = self.db.collection(self.audit_logs_collection).document()
            log_id = log_ref.id
            
            event_data['id'] = log_id
            event_data['timestamp'] = datetime.utcnow()
            event_data['createdAt'] = firestore.SERVER_TIMESTAMP
            
            log_ref.set(event_data)
            
            logger.info(f"✅ Audit event logged: {log_id} - {event_data.get('eventType')}")
            return {'success': True, 'logId': log_id, 'data': event_data}
        except Exception as e:
            logger.error(f"❌ Failed to log audit event: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def query_audit_logs(
        self,
        event_type: Optional[str] = None,
        severity: Optional[str] = None,
        user_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        action: Optional[str] = None,
        status: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        ip_address: Optional[str] = None,
        search_query: Optional[str] = None,
        page: int = 1,
        page_size: int = 50
    ) -> Dict[str, Any]:
        """Query audit logs with filters"""
        try:
            query = self.db.collection(self.audit_logs_collection)
            
            # Apply filters
            if event_type:
                query = query.where('eventType', '==', event_type)
            if severity:
                query = query.where('severity', '==', severity)
            if user_id:
                query = query.where('userId', '==', user_id)
            if resource_type:
                query = query.where('resourceType', '==', resource_type)
            if resource_id:
                query = query.where('resourceId', '==', resource_id)
            if action:
                query = query.where('action', '==', action)
            if status:
                query = query.where('status', '==', status)
            if start_date:
                query = query.where('timestamp', '>=', start_date)
            if end_date:
                query = query.where('timestamp', '<=', end_date)
            if ip_address:
                query = query.where('ipAddress', '==', ip_address)
            
            # Order by timestamp
            query = query.order_by('timestamp', direction=firestore.Query.DESCENDING)
            
            # Get all docs
            all_docs = list(query.stream())
            
            # Client-side search if needed
            if search_query:
                search_lower = search_query.lower()
                filtered = []
                for doc in all_docs:
                    data = doc.to_dict()
                    if (search_lower in data.get('description', '').lower() or
                        search_lower in data.get('userName', '').lower() or
                        search_lower in data.get('resourceName', '').lower()):
                        filtered.append(doc)
                all_docs = filtered
            
            total = len(all_docs)
            
            # Pagination
            offset = (page - 1) * page_size
            paginated = all_docs[offset:offset + page_size]
            logs = [doc.to_dict() for doc in paginated]
            
            return {
                'success': True,
                'logs': logs,
                'total': total,
                'page': page,
                'pageSize': page_size
            }
        except Exception as e:
            logger.error(f"❌ Failed to query audit logs: {str(e)}")
            return {'success': False, 'error': str(e), 'logs': [], 'total': 0}
    
    async def get_audit_log_by_id(self, log_id: str) -> Optional[Dict[str, Any]]:
        """Get specific audit log"""
        try:
            doc = self.db.collection(self.audit_logs_collection).document(log_id).get()
            return doc.to_dict() if doc.exists else None
        except Exception as e:
            logger.error(f"❌ Failed to get audit log: {str(e)}")
            return None
    
    # ==================== Security Logs ====================
    
    async def log_security_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Log security event"""
        try:
            log_ref = self.db.collection(self.security_logs_collection).document()
            log_id = log_ref.id
            
            event_data['id'] = log_id
            event_data['timestamp'] = datetime.utcnow()
            event_data['resolved'] = False
            
            log_ref.set(event_data)
            
            # Also log to audit logs
            await self.log_audit_event({
                'eventType': 'security_alert',
                'severity': event_data.get('severity', 'warning'),
                'description': f"Security event: {event_data.get('description')}",
                'metadata': {'securityEventId': log_id},
                'action': 'security_event',
                'status': 'success'
            })
            
            logger.info(f"✅ Security event logged: {log_id}")
            return {'success': True, 'logId': log_id}
        except Exception as e:
            logger.error(f"❌ Failed to log security event: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def query_security_logs(
        self,
        event_type: Optional[str] = None,
        severity: Optional[str] = None,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        resolved: Optional[bool] = None,
        min_threat_level: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 50
    ) -> Dict[str, Any]:
        """Query security logs"""
        try:
            query = self.db.collection(self.security_logs_collection)
            
            if event_type:
                query = query.where('eventType', '==', event_type)
            if severity:
                query = query.where('severity', '==', severity)
            if user_id:
                query = query.where('userId', '==', user_id)
            if ip_address:
                query = query.where('ipAddress', '==', ip_address)
            if resolved is not None:
                query = query.where('resolved', '==', resolved)
            if min_threat_level:
                query = query.where('threatLevel', '>=', min_threat_level)
            if start_date:
                query = query.where('timestamp', '>=', start_date)
            if end_date:
                query = query.where('timestamp', '<=', end_date)
            
            query = query.order_by('timestamp', direction=firestore.Query.DESCENDING)
            
            all_docs = list(query.stream())
            total = len(all_docs)
            
            offset = (page - 1) * page_size
            paginated = all_docs[offset:offset + page_size]
            logs = [doc.to_dict() for doc in paginated]
            
            return {
                'success': True,
                'logs': logs,
                'total': total,
                'page': page,
                'pageSize': page_size
            }
        except Exception as e:
            logger.error(f"❌ Failed to query security logs: {str(e)}")
            return {'success': False, 'error': str(e), 'logs': [], 'total': 0}
    
    async def resolve_security_event(self, event_id: str, resolved_by: str, mitigation_action: str) -> Dict[str, Any]:
        """Resolve security event"""
        try:
            doc_ref = self.db.collection(self.security_logs_collection).document(event_id)
            doc_ref.update({
                'resolved': True,
                'resolvedAt': firestore.SERVER_TIMESTAMP,
                'resolvedBy': resolved_by,
                'mitigationAction': mitigation_action
            })
            
            logger.info(f"✅ Security event resolved: {event_id}")
            return {'success': True, 'eventId': event_id}
        except Exception as e:
            logger.error(f"❌ Failed to resolve security event: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    # ==================== Access Logs ====================
    
    async def log_access_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Log access control event"""
        try:
            log_ref = self.db.collection(self.access_logs_collection).document()
            log_id = log_ref.id
            
            event_data['id'] = log_id
            event_data['timestamp'] = datetime.utcnow()
            
            log_ref.set(event_data)
            
            logger.info(f"✅ Access event logged: {log_id}")
            return {'success': True, 'logId': log_id}
        except Exception as e:
            logger.error(f"❌ Failed to log access event: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def query_access_logs(
        self,
        user_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        action: Optional[str] = None,
        granted: Optional[bool] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 50
    ) -> Dict[str, Any]:
        """Query access logs"""
        try:
            query = self.db.collection(self.access_logs_collection)
            
            if user_id:
                query = query.where('userId', '==', user_id)
            if resource_type:
                query = query.where('resourceType', '==', resource_type)
            if resource_id:
                query = query.where('resourceId', '==', resource_id)
            if action:
                query = query.where('action', '==', action)
            if granted is not None:
                query = query.where('granted', '==', granted)
            if start_date:
                query = query.where('timestamp', '>=', start_date)
            if end_date:
                query = query.where('timestamp', '<=', end_date)
            
            query = query.order_by('timestamp', direction=firestore.Query.DESCENDING)
            
            all_docs = list(query.stream())
            total = len(all_docs)
            
            offset = (page - 1) * page_size
            paginated = all_docs[offset:offset + page_size]
            logs = [doc.to_dict() for doc in paginated]
            
            return {
                'success': True,
                'logs': logs,
                'total': total,
                'page': page,
                'pageSize': page_size
            }
        except Exception as e:
            logger.error(f"❌ Failed to query access logs: {str(e)}")
            return {'success': False, 'error': str(e), 'logs': [], 'total': 0}
    
    # ==================== Statistics ====================
    
    async def get_audit_statistics(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get audit log statistics"""
        try:
            logs_result = await self.query_audit_logs(
                start_date=start_date,
                end_date=end_date,
                page=1,
                page_size=10000
            )
            
            if not logs_result['success']:
                return logs_result
            
            logs = logs_result['logs']
            
            # Calculate statistics
            events_by_type = defaultdict(int)
            events_by_severity = defaultdict(int)
            events_by_user = defaultdict(int)
            events_by_resource = defaultdict(int)
            success_count = 0
            failure_count = 0
            actions_count = defaultdict(int)
            
            for log in logs:
                events_by_type[log.get('eventType')] += 1
                events_by_severity[log.get('severity')] += 1
                
                user_id = log.get('userId')
                if user_id:
                    events_by_user[user_id] += 1
                
                resource_type = log.get('resourceType')
                if resource_type:
                    events_by_resource[resource_type] += 1
                
                if log.get('status') == 'success':
                    success_count += 1
                else:
                    failure_count += 1
                
                action = log.get('action')
                if action:
                    actions_count[action] += 1
            
            total_events = len(logs)
            success_rate = (success_count / total_events * 100) if total_events > 0 else 0
            failure_rate = (failure_count / total_events * 100) if total_events > 0 else 0
            
            # Top users
            events_by_user_list = sorted(
                [{'userId': k, 'count': v} for k, v in events_by_user.items()],
                key=lambda x: x['count'],
                reverse=True
            )[:10]
            
            # Top actions
            top_actions = sorted(
                [{'action': k, 'count': v} for k, v in actions_count.items()],
                key=lambda x: x['count'],
                reverse=True
            )[:10]
            
            return {
                'success': True,
                'totalEvents': total_events,
                'eventsByType': dict(events_by_type),
                'eventsBySeverity': dict(events_by_severity),
                'eventsByUser': events_by_user_list,
                'eventsByResource': dict(events_by_resource),
                'successRate': success_rate,
                'failureRate': failure_rate,
                'topActions': top_actions,
                'period': f"{start_date.isoformat()} to {end_date.isoformat()}"
            }
        except Exception as e:
            logger.error(f"❌ Failed to get audit statistics: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_security_statistics(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get security statistics"""
        try:
            logs_result = await self.query_security_logs(
                start_date=start_date,
                end_date=end_date,
                page=1,
                page_size=10000
            )
            
            if not logs_result['success']:
                return logs_result
            
            logs = logs_result['logs']
            
            critical_events = len([l for l in logs if l.get('severity') == 'critical'])
            resolved_events = len([l for l in logs if l.get('resolved') == True])
            unresolved_events = len(logs) - resolved_events
            
            threat_levels = [l.get('threatLevel', 0) for l in logs if l.get('threatLevel')]
            avg_threat_level = sum(threat_levels) / len(threat_levels) if threat_levels else 0
            
            failed_login_attempts = len([l for l in logs if l.get('eventType') == 'failed_login'])
            unauthorized_access = len([l for l in logs if l.get('eventType') == 'unauthorized_access'])
            
            # Top threats
            event_types = defaultdict(int)
            for log in logs:
                event_types[log.get('eventType')] += 1
            
            top_threats = sorted(
                [{'type': k, 'count': v} for k, v in event_types.items()],
                key=lambda x: x['count'],
                reverse=True
            )[:10]
            
            # Suspicious IPs
            ip_counts = defaultdict(int)
            for log in logs:
                ip = log.get('ipAddress')
                if ip:
                    ip_counts[ip] += 1
            
            suspicious_ips = [ip for ip, count in ip_counts.items() if count >= 5][:20]
            
            return {
                'success': True,
                'totalSecurityEvents': len(logs),
                'criticalEvents': critical_events,
                'resolvedEvents': resolved_events,
                'unresolvedEvents': unresolved_events,
                'avgThreatLevel': avg_threat_level,
                'failedLoginAttempts': failed_login_attempts,
                'unauthorizedAccessAttempts': unauthorized_access,
                'topThreats': top_threats,
                'suspiciousIPs': suspicious_ips
            }
        except Exception as e:
            logger.error(f"❌ Failed to get security statistics: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    # ==================== Compliance Reports ====================
    
    async def create_compliance_report(self, report_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create compliance report"""
        try:
            report_ref = self.db.collection(self.compliance_reports_collection).document()
            report_id = report_ref.id
            
            report_data['id'] = report_id
            report_data['generatedAt'] = firestore.SERVER_TIMESTAMP
            
            report_ref.set(report_data)
            
            logger.info(f"✅ Compliance report created: {report_id}")
            return {'success': True, 'reportId': report_id, 'data': report_data}
        except Exception as e:
            logger.error(f"❌ Failed to create compliance report: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_compliance_reports(
        self,
        standard: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Get compliance reports"""
        try:
            query = self.db.collection(self.compliance_reports_collection)
            
            if standard:
                query = query.where('standard', '==', standard)
            if status:
                query = query.where('status', '==', status)
            
            query = query.order_by('generatedAt', direction=firestore.Query.DESCENDING).limit(limit)
            
            reports = [doc.to_dict() for doc in query.stream()]
            
            return {
                'success': True,
                'reports': reports,
                'total': len(reports)
            }
        except Exception as e:
            logger.error(f"❌ Failed to get compliance reports: {str(e)}")
            return {'success': False, 'error': str(e), 'reports': [], 'total': 0}
    
    async def get_compliance_report_by_id(self, report_id: str) -> Optional[Dict[str, Any]]:
        """Get specific compliance report"""
        try:
            doc = self.db.collection(self.compliance_reports_collection).document(report_id).get()
            return doc.to_dict() if doc.exists else None
        except Exception as e:
            logger.error(f"❌ Failed to get compliance report: {str(e)}")
            return None
    
    # ==================== Data Retention Policies ====================
    
    async def create_retention_policy(self, policy_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create data retention policy"""
        try:
            policy_ref = self.db.collection(self.retention_policies_collection).document()
            policy_id = policy_ref.id
            
            policy_data['id'] = policy_id
            policy_data['createdAt'] = firestore.SERVER_TIMESTAMP
            policy_data['updatedAt'] = firestore.SERVER_TIMESTAMP
            
            policy_ref.set(policy_data)
            
            logger.info(f"✅ Retention policy created: {policy_id}")
            return {'success': True, 'policyId': policy_id}
        except Exception as e:
            logger.error(f"❌ Failed to create retention policy: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_retention_policies(self, active_only: bool = True) -> Dict[str, Any]:
        """Get retention policies"""
        try:
            query = self.db.collection(self.retention_policies_collection)
            
            if active_only:
                query = query.where('active', '==', True)
            
            policies = [doc.to_dict() for doc in query.stream()]
            
            return {
                'success': True,
                'policies': policies,
                'total': len(policies)
            }
        except Exception as e:
            logger.error(f"❌ Failed to get retention policies: {str(e)}")
            return {'success': False, 'error': str(e), 'policies': [], 'total': 0}
    
    # ==================== Compliance Alerts ====================
    
    async def create_compliance_alert(self, alert_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create compliance alert"""
        try:
            alert_ref = self.db.collection(self.compliance_alerts_collection).document()
            alert_id = alert_ref.id
            
            alert_data['id'] = alert_id
            alert_data['acknowledged'] = False
            alert_data['createdAt'] = firestore.SERVER_TIMESTAMP
            
            alert_ref.set(alert_data)
            
            logger.info(f"✅ Compliance alert created: {alert_id}")
            return {'success': True, 'alertId': alert_id}
        except Exception as e:
            logger.error(f"❌ Failed to create compliance alert: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_compliance_alerts(
        self,
        severity: Optional[str] = None,
        standard: Optional[str] = None,
        acknowledged: Optional[bool] = None,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Get compliance alerts"""
        try:
            query = self.db.collection(self.compliance_alerts_collection)
            
            if severity:
                query = query.where('severity', '==', severity)
            if standard:
                query = query.where('standard', '==', standard)
            if acknowledged is not None:
                query = query.where('acknowledged', '==', acknowledged)
            
            query = query.order_by('createdAt', direction=firestore.Query.DESCENDING).limit(limit)
            
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
            logger.error(f"❌ Failed to get compliance alerts: {str(e)}")
            return {'success': False, 'error': str(e), 'alerts': [], 'total': 0}
    
    async def acknowledge_compliance_alert(self, alert_id: str, acknowledged_by: str) -> Dict[str, Any]:
        """Acknowledge compliance alert"""
        try:
            doc_ref = self.db.collection(self.compliance_alerts_collection).document(alert_id)
            doc_ref.update({
                'acknowledged': True,
                'acknowledgedBy': acknowledged_by,
                'acknowledgedAt': firestore.SERVER_TIMESTAMP
            })
            
            logger.info(f"✅ Compliance alert acknowledged: {alert_id}")
            return {'success': True, 'alertId': alert_id}
        except Exception as e:
            logger.error(f"❌ Failed to acknowledge compliance alert: {str(e)}")
            return {'success': False, 'error': str(e)}


# Global instance
audit_db = AuditDB()
