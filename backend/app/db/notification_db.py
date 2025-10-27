from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter, BaseCompositeFilter
from app.models.notification_models import (
    NotificationChannel, NotificationType, NotificationPriority, 
    NotificationStatus, NotificationCreateRequest, NotificationResponse
)
from app.services.firebase_service import FirebaseService
import uuid
import logging

logger = logging.getLogger(__name__)


class NotificationDB:
    """
    Firebase Firestore database operations for Notifications & Alerts
    
    Collections Structure:
    - notifications/{notification_id}: Individual notification documents
    - users/{user_id}/notification_preferences: User notification preferences
    - notification_stats/{user_id}: Aggregated stats per user
    - notification_templates/{template_id}: Reusable notification templates
    """
    
    def __init__(self):
        self.firebase_service = FirebaseService()
        self.db = self.firebase_service.db
        
        # Collection references
        self.notifications_col = self.db.collection('notifications')
        self.users_col = self.db.collection('users')
        self.templates_col = self.db.collection('notification_templates')
        self.stats_col = self.db.collection('notification_stats')
    
    async def create_notification(self, notification_data: NotificationCreateRequest, created_by: str = None) -> str:
        """Create a new notification document"""
        try:
            notification_id = str(uuid.uuid4())
            now = datetime.utcnow()
            
            # Prepare notification document
            doc_data = {
                'id': notification_id,
                'user_id': notification_data.user_id,
                'title': notification_data.title,
                'message': notification_data.message,
                'notification_type': notification_data.notification_type.value,
                'priority': notification_data.priority.value,
                'status': NotificationStatus.PENDING.value,
                'channels': [channel.value for channel in notification_data.channels],
                'metadata': notification_data.metadata or {},
                'scheduled_for': notification_data.scheduled_for,
                'expires_at': notification_data.expires_at,
                'action_url': notification_data.action_url,
                'created_at': now,
                'updated_at': now,
                'created_by': created_by,
                'sent_at': None,
                'delivered_at': None,
                'read_at': None,
                'delivery_attempts': 0,
                'last_error': None,
                'delivery_log': [],
                
                # Indexing fields for efficient queries
                'user_priority': f"{notification_data.user_id}_{notification_data.priority.value}",
                'user_type': f"{notification_data.user_id}_{notification_data.notification_type.value}",
                'user_status': f"{notification_data.user_id}_{NotificationStatus.PENDING.value}",
                'priority_timestamp': f"{notification_data.priority.value}_{int(now.timestamp())}",
                
                # TTL field for automatic cleanup
                'expires_on': notification_data.expires_at or (now + timedelta(days=30))
            }
            
            # Create the document
            self.notifications_col.document(notification_id).set(doc_data)
            
            # Update user stats asynchronously
            await self._update_user_stats(notification_data.user_id, 'created')
            
            logger.info(f"Created notification {notification_id} for user {notification_data.user_id}")
            return notification_id
            
        except Exception as e:
            logger.error(f"Error creating notification: {str(e)}")
            raise
    
    async def create_bulk_notifications(self, notifications: List[Dict[str, Any]], created_by: str = None) -> List[str]:
        """Create multiple notifications in batch"""
        try:
            notification_ids = []
            batch = self.db.batch()
            now = datetime.utcnow()
            
            for notification_data in notifications:
                notification_id = str(uuid.uuid4())
                notification_ids.append(notification_id)
                
                doc_data = {
                    'id': notification_id,
                    'user_id': notification_data['user_id'],
                    'title': notification_data['title'],
                    'message': notification_data['message'],
                    'notification_type': notification_data['notification_type'],
                    'priority': notification_data['priority'],
                    'status': NotificationStatus.PENDING.value,
                    'channels': notification_data['channels'],
                    'metadata': notification_data.get('metadata', {}),
                    'scheduled_for': notification_data.get('scheduled_for'),
                    'expires_at': notification_data.get('expires_at'),
                    'action_url': notification_data.get('action_url'),
                    'created_at': now,
                    'updated_at': now,
                    'created_by': created_by,
                    'sent_at': None,
                    'delivered_at': None,
                    'read_at': None,
                    'delivery_attempts': 0,
                    'last_error': None,
                    'delivery_log': [],
                    
                    # Indexing fields
                    'user_priority': f"{notification_data['user_id']}_{notification_data['priority']}",
                    'user_type': f"{notification_data['user_id']}_{notification_data['notification_type']}",
                    'user_status': f"{notification_data['user_id']}_{NotificationStatus.PENDING.value}",
                    'priority_timestamp': f"{notification_data['priority']}_{int(now.timestamp())}",
                    'expires_on': notification_data.get('expires_at', now + timedelta(days=30))
                }
                
                doc_ref = self.notifications_col.document(notification_id)
                batch.set(doc_ref, doc_data)
            
            # Execute batch write
            batch.commit()
            
            # Update stats for affected users
            user_ids = list(set([n['user_id'] for n in notifications]))
            for user_id in user_ids:
                await self._update_user_stats(user_id, 'created')
            
            logger.info(f"Created {len(notification_ids)} notifications in batch")
            return notification_ids
            
        except Exception as e:
            logger.error(f"Error creating bulk notifications: {str(e)}")
            raise
    
    async def get_notification_by_id(self, notification_id: str) -> Optional[Dict[str, Any]]:
        """Get notification by ID"""
        try:
            doc = self.notifications_col.document(notification_id).get()
            if doc.exists:
                return doc.to_dict()
            return None
        except Exception as e:
            logger.error(f"Error getting notification {notification_id}: {str(e)}")
            raise
    
    async def get_user_notifications(
        self, 
        user_id: str, 
        status: Optional[str] = None,
        notification_type: Optional[str] = None,
        priority: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        include_read: bool = True
    ) -> Dict[str, Any]:
        """Get notifications for a user with filtering and pagination"""
        try:
            query = self.notifications_col.where(filter=FieldFilter('user_id', '==', user_id))
            
            # Apply filters
            if status:
                query = query.where(filter=FieldFilter('user_status', '==', f"{user_id}_{status}"))
            
            if notification_type:
                query = query.where(filter=FieldFilter('user_type', '==', f"{user_id}_{notification_type}"))
            
            if priority:
                query = query.where(filter=FieldFilter('user_priority', '==', f"{user_id}_{priority}"))
            
            if not include_read:
                query = query.where(filter=FieldFilter('read_at', '==', None))
            
            # Order by priority and timestamp
            query = query.order_by('priority_timestamp', direction=firestore.Query.DESCENDING)
            
            # Apply pagination
            query = query.offset(offset).limit(limit)
            
            # Execute query
            docs = query.stream()
            notifications = [doc.to_dict() for doc in docs]
            
            # Get total count (separate query for accuracy)
            total_query = self.notifications_col.where(filter=FieldFilter('user_id', '==', user_id))
            if status:
                total_query = total_query.where(filter=FieldFilter('user_status', '==', f"{user_id}_{status}"))
            if notification_type:
                total_query = total_query.where(filter=FieldFilter('user_type', '==', f"{user_id}_{notification_type}"))
            if priority:
                total_query = total_query.where(filter=FieldFilter('user_priority', '==', f"{user_id}_{priority}"))
            if not include_read:
                total_query = total_query.where(filter=FieldFilter('read_at', '==', None))
            
            total_docs = total_query.stream()
            total_count = sum(1 for _ in total_docs)
            
            # Get unread count
            unread_query = self.notifications_col.where(filter=FieldFilter('user_id', '==', user_id)).where(filter=FieldFilter('read_at', '==', None))
            unread_docs = unread_query.stream()
            unread_count = sum(1 for _ in unread_docs)
            
            return {
                'notifications': notifications,
                'total': total_count,
                'unread_count': unread_count,
                'page': (offset // limit) + 1,
                'page_size': limit
            }
            
        except Exception as e:
            logger.error(f"Error getting user notifications for {user_id}: {str(e)}")
            raise
    
    async def update_notification(self, notification_id: str, update_data: Dict[str, Any]) -> bool:
        """Update notification document"""
        try:
            update_data['updated_at'] = datetime.utcnow()
            
            # Update composite index fields if relevant fields changed
            if 'status' in update_data:
                doc = await self.get_notification_by_id(notification_id)
                if doc:
                    user_id = doc['user_id']
                    update_data['user_status'] = f"{user_id}_{update_data['status']}"
            
            self.notifications_col.document(notification_id).update(update_data)
            return True
            
        except Exception as e:
            logger.error(f"Error updating notification {notification_id}: {str(e)}")
            return False
    
    async def mark_notifications_as_read(self, notification_ids: List[str], user_id: str) -> Dict[str, Any]:
        """Mark multiple notifications as read"""
        try:
            batch = self.db.batch()
            now = datetime.utcnow()
            succeeded = 0
            failed = 0
            
            for notification_id in notification_ids:
                try:
                    doc_ref = self.notifications_col.document(notification_id)
                    batch.update(doc_ref, {
                        'status': NotificationStatus.READ.value,
                        'read_at': now,
                        'updated_at': now,
                        'user_status': f"{user_id}_{NotificationStatus.READ.value}"
                    })
                    succeeded += 1
                except Exception:
                    failed += 1
            
            batch.commit()
            
            # Update user stats
            await self._update_user_stats(user_id, 'read', count=succeeded)
            
            return {
                'succeeded': succeeded,
                'failed': failed,
                'total': len(notification_ids)
            }
            
        except Exception as e:
            logger.error(f"Error marking notifications as read: {str(e)}")
            raise
    
    async def delete_notification(self, notification_id: str) -> bool:
        """Delete notification document"""
        try:
            self.notifications_col.document(notification_id).delete()
            return True
        except Exception as e:
            logger.error(f"Error deleting notification {notification_id}: {str(e)}")
            return False
    
    async def get_pending_notifications(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get pending notifications for processing"""
        try:
            now = datetime.utcnow()
            query = (self.notifications_col
                    .where(filter=FieldFilter('status', '==', NotificationStatus.PENDING.value))
                    .where(filter=FieldFilter('scheduled_for', '<=', now))
                    .order_by('priority_timestamp', direction=firestore.Query.DESCENDING)
                    .limit(limit))
            
            docs = query.stream()
            return [doc.to_dict() for doc in docs]
            
        except Exception as e:
            logger.error(f"Error getting pending notifications: {str(e)}")
            return []
    
    async def get_user_notification_stats(self, user_id: str) -> Dict[str, Any]:
        """Get aggregated notification statistics for user"""
        try:
            stats_doc = self.stats_col.document(user_id).get()
            
            if stats_doc.exists:
                return stats_doc.to_dict()
            
            # If no stats exist, calculate from scratch
            return await self._calculate_user_stats(user_id)
            
        except Exception as e:
            logger.error(f"Error getting user notification stats for {user_id}: {str(e)}")
            return {}
    
    async def cleanup_expired_notifications(self) -> int:
        """Remove expired notifications"""
        try:
            now = datetime.utcnow()
            query = self.notifications_col.where(filter=FieldFilter('expires_on', '<=', now))
            
            docs = query.stream()
            deleted_count = 0
            batch = self.db.batch()
            
            for doc in docs:
                batch.delete(doc.reference)
                deleted_count += 1
                
                # Commit in batches of 500 (Firestore limit)
                if deleted_count % 500 == 0:
                    batch.commit()
                    batch = self.db.batch()
            
            # Commit remaining
            if deleted_count % 500 != 0:
                batch.commit()
            
            logger.info(f"Cleaned up {deleted_count} expired notifications")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error cleaning up expired notifications: {str(e)}")
            return 0
    
    async def _update_user_stats(self, user_id: str, action: str, count: int = 1):
        """Update user notification statistics"""
        try:
            stats_ref = self.stats_col.document(user_id)
            
            # Use Firestore transactions for atomic updates
            @firestore.transactional
            def update_stats(transaction):
                stats_doc = stats_ref.get(transaction=transaction)
                
                if stats_doc.exists:
                    stats_data = stats_doc.to_dict()
                else:
                    stats_data = {
                        'user_id': user_id,
                        'total_notifications': 0,
                        'unread_count': 0,
                        'read_count': 0,
                        'by_type': {},
                        'by_priority': {},
                        'by_status': {},
                        'last_updated': datetime.utcnow(),
                        'created_at': datetime.utcnow()
                    }
                
                # Update based on action
                if action == 'created':
                    stats_data['total_notifications'] = stats_data.get('total_notifications', 0) + count
                    stats_data['unread_count'] = stats_data.get('unread_count', 0) + count
                elif action == 'read':
                    stats_data['read_count'] = stats_data.get('read_count', 0) + count
                    stats_data['unread_count'] = max(0, stats_data.get('unread_count', 0) - count)
                
                stats_data['last_updated'] = datetime.utcnow()
                
                transaction.set(stats_ref, stats_data, merge=True)
            
            transaction = self.db.transaction()
            update_stats(transaction)
            
        except Exception as e:
            logger.error(f"Error updating user stats for {user_id}: {str(e)}")
    
    async def _calculate_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Calculate user notification statistics from scratch"""
        try:
            # Get all notifications for user
            query = self.notifications_col.where(filter=FieldFilter('user_id', '==', user_id))
            docs = query.stream()
            
            stats = {
                'user_id': user_id,
                'total_notifications': 0,
                'unread_count': 0,
                'read_count': 0,
                'by_type': {},
                'by_priority': {},
                'by_status': {},
                'recent_activity': [],
                'last_updated': datetime.utcnow(),
                'created_at': datetime.utcnow()
            }
            
            for doc in docs:
                data = doc.to_dict()
                stats['total_notifications'] += 1
                
                # Count by status
                status = data.get('status', 'unknown')
                stats['by_status'][status] = stats['by_status'].get(status, 0) + 1
                
                if status == NotificationStatus.READ.value:
                    stats['read_count'] += 1
                else:
                    stats['unread_count'] += 1
                
                # Count by type
                ntype = data.get('notification_type', 'unknown')
                stats['by_type'][ntype] = stats['by_type'].get(ntype, 0) + 1
                
                # Count by priority
                priority = data.get('priority', 'unknown')
                stats['by_priority'][priority] = stats['by_priority'].get(priority, 0) + 1
            
            # Save calculated stats
            self.stats_col.document(user_id).set(stats)
            
            return stats
            
        except Exception as e:
            logger.error(f"Error calculating user stats for {user_id}: {str(e)}")
            return {}


# Singleton instance
notification_db = NotificationDB()