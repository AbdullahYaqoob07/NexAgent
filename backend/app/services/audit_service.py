import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from app.db.audit_db import audit_db

logger = logging.getLogger(__name__)


class AuditService:
    """Service layer for audit logs and compliance"""
    
    def __init__(self):
        self.db = audit_db
    
    # ==================== Audit Logging ====================
    
    async def log_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Log audit event"""
        return await self.db.log_audit_event(event_data)
    
    async def query_logs(
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
        """Query audit logs"""
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        return await self.db.query_audit_logs(
            event_type, severity, user_id, resource_type, resource_id,
            action, status, start_date, end_date, ip_address, search_query,
            page, page_size
        )
    
    async def get_log_by_id(self, log_id: str) -> Optional[Dict[str, Any]]:
        """Get specific audit log"""
        return await self.db.get_audit_log_by_id(log_id)
    
    async def get_audit_statistics(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get audit statistics"""
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        return await self.db.get_audit_statistics(start_date, end_date)
    
    # ==================== Security Logs ====================
    
    async def log_security_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Log security event"""
        return await self.db.log_security_event(event_data)
    
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
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        return await self.db.query_security_logs(
            event_type, severity, user_id, ip_address, resolved,
            min_threat_level, start_date, end_date, page, page_size
        )
    
    async def resolve_security_event(
        self,
        event_id: str,
        resolved_by: str,
        mitigation_action: str
    ) -> Dict[str, Any]:
        """Resolve security event"""
        return await self.db.resolve_security_event(event_id, resolved_by, mitigation_action)
    
    async def get_security_statistics(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get security statistics"""
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        return await self.db.get_security_statistics(start_date, end_date)
    
    # ==================== Access Logs ====================
    
    async def log_access_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Log access control event"""
        return await self.db.log_access_event(event_data)
    
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
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        return await self.db.query_access_logs(
            user_id, resource_type, resource_id, action, granted,
            start_date, end_date, page, page_size
        )
    
    # ==================== User Activity ====================
    
    async def get_user_activity(
        self,
        user_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get user activity summary"""
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        logs_result = await self.db.query_audit_logs(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            page=1,
            page_size=10000
        )
        
        if not logs_result['success']:
            return logs_result
        
        logs = logs_result['logs']
        
        actions_by_type = {}
        failed_actions = 0
        ip_addresses = set()
        user_agents = set()
        last_activity = None
        
        for log in logs:
            event_type = log.get('eventType')
            if event_type:
                actions_by_type[event_type] = actions_by_type.get(event_type, 0) + 1
            
            if log.get('status') != 'success':
                failed_actions += 1
            
            ip = log.get('ipAddress')
            if ip:
                ip_addresses.add(ip)
            
            ua = log.get('userAgent')
            if ua:
                user_agents.add(ua)
            
            timestamp = log.get('timestamp')
            if timestamp and (not last_activity or timestamp > last_activity):
                last_activity = timestamp
        
        # Calculate risk score (0-100)
        risk_score = 0
        if failed_actions > 10:
            risk_score += 20
        if len(ip_addresses) > 5:
            risk_score += 15
        if len([a for a in actions_by_type if 'delete' in a.lower()]) > 0:
            risk_score += 10
        
        risk_score = min(risk_score, 100)
        
        return {
            'success': True,
            'userId': user_id,
            'totalActions': len(logs),
            'actionsByType': actions_by_type,
            'failedActions': failed_actions,
            'lastActivity': last_activity,
            'ipAddresses': list(ip_addresses),
            'userAgents': list(user_agents),
            'riskScore': risk_score
        }
    
    async def get_user_activity_timeline(
        self,
        user_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get user activity timeline"""
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=7)
        if not end_date:
            end_date = datetime.utcnow()
        
        logs_result = await self.db.query_audit_logs(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            page=1,
            page_size=1000
        )
        
        if not logs_result['success']:
            return logs_result
        
        activities = []
        for log in logs_result['logs']:
            activities.append({
                'id': log.get('id'),
                'eventType': log.get('eventType'),
                'action': log.get('action'),
                'resourceType': log.get('resourceType'),
                'resourceName': log.get('resourceName'),
                'description': log.get('description'),
                'status': log.get('status'),
                'timestamp': log.get('timestamp')
            })
        
        return {
            'success': True,
            'userId': user_id,
            'activities': activities,
            'period': f"{start_date.isoformat()} to {end_date.isoformat()}"
        }
    
    # ==================== Compliance Reports ====================
    
    async def generate_compliance_report(
        self,
        standard: str,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Generate compliance report"""
        # Get audit statistics
        stats = await self.db.get_audit_statistics(start_date, end_date)
        
        if not stats['success']:
            return stats
        
        # Get security statistics
        security_stats = await self.db.get_security_statistics(start_date, end_date)
        
        # Calculate compliance score
        compliance_score = 100.0
        violations = 0
        warnings = 0
        recommendations = []
        
        # Check for critical security events
        if security_stats['success']:
            if security_stats.get('criticalEvents', 0) > 0:
                compliance_score -= 15
                violations += security_stats['criticalEvents']
                recommendations.append("Address critical security events immediately")
            
            if security_stats.get('unresolvedEvents', 0) > 5:
                compliance_score -= 10
                warnings += 1
                recommendations.append("Resolve pending security events")
        
        # Check audit coverage
        if stats.get('totalEvents', 0) < 100:
            warnings += 1
            recommendations.append("Increase audit logging coverage")
        
        # Check failure rate
        if stats.get('failureRate', 0) > 10:
            compliance_score -= 5
            warnings += 1
            recommendations.append("Investigate high failure rate")
        
        # Determine status
        if compliance_score >= 90:
            status = 'compliant'
        elif compliance_score >= 70:
            status = 'needs_review'
        else:
            status = 'non_compliant'
        
        report_data = {
            'standard': standard,
            'reportPeriod': f"{start_date.isoformat()} to {end_date.isoformat()}",
            'totalEvents': stats.get('totalEvents', 0),
            'complianceScore': compliance_score,
            'violations': violations,
            'warnings': warnings,
            'recommendations': recommendations,
            'status': status
        }
        
        # Store report
        result = await self.db.create_compliance_report(report_data)
        
        if result['success']:
            return {
                'success': True,
                'report': result['data']
            }
        
        return result
    
    async def get_compliance_reports(
        self,
        standard: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Get compliance reports"""
        return await self.db.get_compliance_reports(standard, status, limit)
    
    async def get_compliance_report(self, report_id: str) -> Optional[Dict[str, Any]]:
        """Get specific compliance report"""
        return await self.db.get_compliance_report_by_id(report_id)
    
    async def get_compliance_statistics(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get compliance statistics"""
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=90)
        if not end_date:
            end_date = datetime.utcnow()
        
        # Get recent reports
        reports_result = await self.db.get_compliance_reports(limit=100)
        
        if not reports_result['success']:
            return reports_result
        
        reports = reports_result['reports']
        
        # Calculate statistics
        total_violations = sum(r.get('violations', 0) for r in reports)
        violations_by_type = {}
        compliance_by_standard = {}
        
        for report in reports:
            standard = report.get('standard')
            if standard:
                if standard not in compliance_by_standard:
                    compliance_by_standard[standard] = []
                compliance_by_standard[standard].append(report.get('complianceScore', 0))
        
        # Average compliance scores
        for standard in compliance_by_standard:
            scores = compliance_by_standard[standard]
            compliance_by_standard[standard] = sum(scores) / len(scores) if scores else 0
        
        overall_compliance = sum(compliance_by_standard.values()) / len(compliance_by_standard) if compliance_by_standard else 0
        
        return {
            'success': True,
            'overallComplianceScore': overall_compliance,
            'complianceByStandard': compliance_by_standard,
            'totalViolations': total_violations,
            'violationsByType': violations_by_type,
            'dataSubjectRequests': 0,  # Mock
            'avgResponseTime': 24.5,  # Mock
            'retentionPolicyCompliance': True
        }
    
    # ==================== Data Retention ====================
    
    async def create_retention_policy(self, policy_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create retention policy"""
        return await self.db.create_retention_policy(policy_data)
    
    async def get_retention_policies(self, active_only: bool = True) -> Dict[str, Any]:
        """Get retention policies"""
        return await self.db.get_retention_policies(active_only)
    
    # ==================== Compliance Alerts ====================
    
    async def create_compliance_alert(self, alert_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create compliance alert"""
        return await self.db.create_compliance_alert(alert_data)
    
    async def get_compliance_alerts(
        self,
        severity: Optional[str] = None,
        standard: Optional[str] = None,
        acknowledged: Optional[bool] = None,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Get compliance alerts"""
        return await self.db.get_compliance_alerts(severity, standard, acknowledged, limit)
    
    async def acknowledge_alert(self, alert_id: str, acknowledged_by: str) -> Dict[str, Any]:
        """Acknowledge compliance alert"""
        return await self.db.acknowledge_compliance_alert(alert_id, acknowledged_by)
    
    # ==================== Export ====================
    
    async def export_logs(
        self,
        event_type: Optional[str],
        start_date: datetime,
        end_date: datetime,
        format: str,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Export audit logs"""
        # Query logs
        logs_result = await self.query_logs(
            event_type=event_type,
            start_date=start_date,
            end_date=end_date,
            page=1,
            page_size=10000
        )
        
        if not logs_result['success']:
            return logs_result
        
        # Mock export - in production, generate actual file
        export_id = f"export_{datetime.utcnow().timestamp()}"
        download_url = f"https://api.example.com/exports/{export_id}.{format}"
        
        return {
            'success': True,
            'exportId': export_id,
            'downloadUrl': download_url,
            'format': format,
            'recordCount': logs_result['total'],
            'expiresAt': datetime.utcnow() + timedelta(hours=24)
        }


# Global instance
audit_service = AuditService()
