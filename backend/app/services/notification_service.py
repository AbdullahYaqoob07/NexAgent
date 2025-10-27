from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
from app.models.notification_models import (
    NotificationChannel, NotificationType, NotificationPriority, NotificationStatus,
    NotificationCreateRequest, NotificationBulkCreateRequest, NotificationResponse,
    NotificationListResponse, NotificationStatsResponse, NotificationPreferencesRequest,
    BulkOperationResponse, NotificationDeliveryResponse
)
from app.db.notification_db import notification_db
from app.core.config import settings
import asyncio
import logging
import json
from concurrent.futures import ThreadPoolExecutor
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import aiohttp
import jinja2

logger = logging.getLogger(__name__)


class NotificationDeliveryService:
    """Service for handling notification delivery across different channels"""
    
    def __init__(self):
        self.template_env = jinja2.Environment(loader=jinja2.DictLoader({}))
        self.executor = ThreadPoolExecutor(max_workers=10)
        
    async def deliver_notification(self, notification: Dict[str, Any]) -> NotificationDeliveryResponse:
        """Deliver notification across specified channels"""
        notification_id = notification['id']
        channels = notification.get('channels', [])
        
        channels_attempted = []
        channels_succeeded = []
        channels_failed = []
        errors = {}
        
        # Attempt delivery for each channel
        for channel in channels:
            channels_attempted.append(channel)
            try:
                success = await self._deliver_to_channel(notification, channel)
                if success:
                    channels_succeeded.append(channel)
                else:
                    channels_failed.append(channel)
                    errors[channel] = "Delivery failed"
            except Exception as e:
                channels_failed.append(channel)
                errors[channel] = str(e)
                logger.error(f"Error delivering notification {notification_id} to {channel}: {str(e)}")
        
        # Update notification status
        now = datetime.utcnow()
        if channels_succeeded:
            await notification_db.update_notification(notification_id, {
                'status': NotificationStatus.DELIVERED.value,
                'delivered_at': now,
                'delivery_attempts': notification.get('delivery_attempts', 0) + 1,
                'delivery_log': notification.get('delivery_log', []) + [{
                    'timestamp': now,
                    'channels_attempted': channels_attempted,
                    'channels_succeeded': channels_succeeded,
                    'channels_failed': channels_failed,
                    'errors': errors
                }]
            })
        else:
            await notification_db.update_notification(notification_id, {
                'status': NotificationStatus.FAILED.value,
                'delivery_attempts': notification.get('delivery_attempts', 0) + 1,
                'last_error': f"All channels failed: {errors}",
                'delivery_log': notification.get('delivery_log', []) + [{
                    'timestamp': now,
                    'channels_attempted': channels_attempted,
                    'channels_succeeded': channels_succeeded,
                    'channels_failed': channels_failed,
                    'errors': errors
                }]
            })
        
        return NotificationDeliveryResponse(
            success=len(channels_succeeded) > 0,
            message=f"Delivered to {len(channels_succeeded)}/{len(channels_attempted)} channels",
            notification_id=notification_id,
            channels_attempted=[NotificationChannel(c) for c in channels_attempted],
            channels_succeeded=[NotificationChannel(c) for c in channels_succeeded],
            channels_failed=[NotificationChannel(c) for c in channels_failed],
            errors=errors
        )
    
    async def _deliver_to_channel(self, notification: Dict[str, Any], channel: str) -> bool:
        """Deliver notification to specific channel"""
        try:
            if channel == NotificationChannel.EMAIL.value:
                return await self._deliver_email(notification)
            elif channel == NotificationChannel.PUSH.value:
                return await self._deliver_push(notification)
            elif channel == NotificationChannel.IN_APP.value:
                return await self._deliver_in_app(notification)
            elif channel == NotificationChannel.SMS.value:
                return await self._deliver_sms(notification)
            elif channel == NotificationChannel.WEBHOOK.value:
                return await self._deliver_webhook(notification)
            elif channel == NotificationChannel.SLACK.value:
                return await self._deliver_slack(notification)
            else:
                logger.warning(f"Unknown delivery channel: {channel}")
                return False
        except Exception as e:
            logger.error(f"Channel {channel} delivery failed: {str(e)}")
            return False
    
    async def _deliver_email(self, notification: Dict[str, Any]) -> bool:
        """Deliver email notification"""
        try:
            # This is a simplified implementation - in production you'd use services like SendGrid, AWS SES, etc.
            user_email = await self._get_user_email(notification['user_id'])
            if not user_email:
                return False
            
            # Create email content
            subject = notification['title']
            body = self._format_email_body(notification)
            
            # Send email (implement your email service here)
            # For now, we'll just log it as successful
            logger.info(f"Email notification sent to {user_email}: {subject}")
            return True
            
        except Exception as e:
            logger.error(f"Email delivery failed: {str(e)}")
            return False
    
    async def _deliver_push(self, notification: Dict[str, Any]) -> bool:
        """Deliver push notification"""
        try:
            # Implement push notification service (FCM, APNS, etc.)
            # For now, we'll just log it as successful
            logger.info(f"Push notification sent for user {notification['user_id']}")
            return True
        except Exception as e:
            logger.error(f"Push delivery failed: {str(e)}")
            return False
    
    async def _deliver_in_app(self, notification: Dict[str, Any]) -> bool:
        """Deliver in-app notification (already stored in DB)"""
        # In-app notifications are delivered by simply storing them in the database
        # The frontend will fetch them via the API
        return True
    
    async def _deliver_sms(self, notification: Dict[str, Any]) -> bool:
        """Deliver SMS notification"""
        try:
            # Implement SMS service (Twilio, AWS SNS, etc.)
            logger.info(f"SMS notification sent for user {notification['user_id']}")
            return True
        except Exception as e:
            logger.error(f"SMS delivery failed: {str(e)}")
            return False
    
    async def _deliver_webhook(self, notification: Dict[str, Any]) -> bool:
        """Deliver webhook notification"""
        try:
            webhook_url = notification.get('metadata', {}).get('webhook_url')
            if not webhook_url:
                return False
            
            payload = {
                'notification_id': notification['id'],
                'user_id': notification['user_id'],
                'title': notification['title'],
                'message': notification['message'],
                'type': notification['notification_type'],
                'priority': notification['priority'],
                'metadata': notification.get('metadata', {}),
                'created_at': notification['created_at'].isoformat() if isinstance(notification['created_at'], datetime) else notification['created_at']
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    webhook_url, 
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    return response.status < 400
                    
        except Exception as e:
            logger.error(f"Webhook delivery failed: {str(e)}")
            return False
    
    async def _deliver_slack(self, notification: Dict[str, Any]) -> bool:
        """Deliver Slack notification"""
        try:
            slack_webhook = notification.get('metadata', {}).get('slack_webhook')
            if not slack_webhook:
                return False
            
            payload = {
                'text': notification['title'],
                'attachments': [{
                    'color': self._get_slack_color(notification['priority']),
                    'title': notification['title'],
                    'text': notification['message'],
                    'footer': f"NexAgent • {notification['notification_type']}",
                    'ts': int(notification['created_at'].timestamp()) if isinstance(notification['created_at'], datetime) else int(datetime.fromisoformat(notification['created_at']).timestamp())
                }]
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    slack_webhook,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    return response.status < 400
                    
        except Exception as e:
            logger.error(f"Slack delivery failed: {str(e)}")
            return False
    
    def _get_slack_color(self, priority: str) -> str:
        """Get Slack attachment color based on priority"""
        colors = {
            NotificationPriority.LOW.value: '#36a64f',      # Green
            NotificationPriority.MEDIUM.value: '#ffa500',   # Orange
            NotificationPriority.HIGH.value: '#ff6b6b',     # Red
            NotificationPriority.CRITICAL.value: '#d63031'  # Dark Red
        }
        return colors.get(priority, '#36a64f')
    
    def _format_email_body(self, notification: Dict[str, Any]) -> str:
        """Format email body with notification content"""
        template = """
        <html>
        <head></head>
        <body>
            <h2>{{ title }}</h2>
            <p>{{ message }}</p>
            {% if action_url %}
            <p><a href="{{ action_url }}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Take Action</a></p>
            {% endif %}
            <hr>
            <p><small>Priority: {{ priority }} | Type: {{ notification_type }}</small></p>
        </body>
        </html>
        """
        
        template_obj = self.template_env.from_string(template)
        return template_obj.render(**notification)
    
    async def _get_user_email(self, user_id: str) -> Optional[str]:
        """Get user email from user service"""
        try:
            # Get user email from Firebase Auth or user collection
            user_doc = notification_db.users_col.document(user_id).get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                return user_data.get('email')
            return None
        except Exception as e:
            logger.error(f"Error getting user email for {user_id}: {str(e)}")
            return None


class NotificationService:
    """Main notification service with business logic"""
    
    def __init__(self):
        self.delivery_service = NotificationDeliveryService()
        self.background_tasks = set()
    
    async def create_notification(
        self, 
        notification_data: NotificationCreateRequest, 
        created_by: str = None,
        auto_deliver: bool = True
    ) -> str:
        """Create a new notification"""
        try:
            # Check if user has notification preferences
            preferences = await self.get_user_preferences(notification_data.user_id)
            
            # Filter channels based on user preferences
            if preferences:
                allowed_channels = self._filter_channels_by_preferences(
                    notification_data.channels, 
                    preferences,
                    notification_data.notification_type
                )
                notification_data.channels = allowed_channels
            
            # Create notification in database
            notification_id = await notification_db.create_notification(notification_data, created_by)
            
            # Schedule delivery if auto_deliver is True
            if auto_deliver and not notification_data.scheduled_for:
                # Immediate delivery
                task = asyncio.create_task(self._deliver_notification_by_id(notification_id))
                self.background_tasks.add(task)
                task.add_done_callback(self.background_tasks.discard)
            
            return notification_id
            
        except Exception as e:
            logger.error(f"Error creating notification: {str(e)}")
            raise
    
    async def create_bulk_notifications(
        self, 
        bulk_request: NotificationBulkCreateRequest,
        created_by: str = None,
        auto_deliver: bool = True
    ) -> BulkOperationResponse:
        """Create multiple notifications in bulk"""
        try:
            notifications_data = []
            
            for user_id in bulk_request.user_ids:
                notification_dict = {
                    'user_id': user_id,
                    'title': bulk_request.title,
                    'message': bulk_request.message,
                    'notification_type': bulk_request.notification_type.value,
                    'priority': bulk_request.priority.value,
                    'channels': [channel.value for channel in bulk_request.channels],
                    'metadata': bulk_request.metadata,
                    'scheduled_for': bulk_request.scheduled_for,
                    'expires_at': bulk_request.expires_at,
                    'action_url': bulk_request.action_url
                }
                
                # Apply user preferences
                preferences = await self.get_user_preferences(user_id)
                if preferences:
                    allowed_channels = self._filter_channels_by_preferences(
                        bulk_request.channels,
                        preferences,
                        bulk_request.notification_type
                    )
                    notification_dict['channels'] = [channel.value for channel in allowed_channels]
                
                notifications_data.append(notification_dict)
            
            # Create notifications in database
            notification_ids = await notification_db.create_bulk_notifications(notifications_data, created_by)
            
            # Schedule delivery if auto_deliver is True
            if auto_deliver and not bulk_request.scheduled_for:
                for notification_id in notification_ids:
                    task = asyncio.create_task(self._deliver_notification_by_id(notification_id))
                    self.background_tasks.add(task)
                    task.add_done_callback(self.background_tasks.discard)
            
            return BulkOperationResponse(
                success=True,
                message=f"Created {len(notification_ids)} notifications successfully",
                processed=len(bulk_request.user_ids),
                succeeded=len(notification_ids),
                failed=len(bulk_request.user_ids) - len(notification_ids)
            )
            
        except Exception as e:
            logger.error(f"Error creating bulk notifications: {str(e)}")
            return BulkOperationResponse(
                success=False,
                message=f"Bulk notification creation failed: {str(e)}",
                processed=len(bulk_request.user_ids),
                succeeded=0,
                failed=len(bulk_request.user_ids),
                errors=[{"error": str(e)}]
            )
    
    async def get_user_notifications(
        self,
        user_id: str,
        status: Optional[str] = None,
        notification_type: Optional[str] = None,
        priority: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
        include_read: bool = True
    ) -> NotificationListResponse:
        """Get notifications for a user with filtering and pagination"""
        try:
            offset = (page - 1) * page_size
            
            result = await notification_db.get_user_notifications(
                user_id=user_id,
                status=status,
                notification_type=notification_type,
                priority=priority,
                limit=page_size,
                offset=offset,
                include_read=include_read
            )
            
            # Convert to response models
            notifications = [
                NotificationResponse(**notification) 
                for notification in result['notifications']
            ]
            
            return NotificationListResponse(
                notifications=notifications,
                total=result['total'],
                page=page,
                page_size=page_size,
                unread_count=result['unread_count']
            )
            
        except Exception as e:
            logger.error(f"Error getting user notifications: {str(e)}")
            raise
    
    async def get_notification_by_id(self, notification_id: str, user_id: str = None) -> Optional[NotificationResponse]:
        """Get notification by ID"""
        try:
            notification = await notification_db.get_notification_by_id(notification_id)
            
            if not notification:
                return None
            
            # Check if user has access to this notification
            if user_id and notification['user_id'] != user_id:
                return None
            
            return NotificationResponse(**notification)
            
        except Exception as e:
            logger.error(f"Error getting notification {notification_id}: {str(e)}")
            return None
    
    async def mark_notifications_as_read(self, notification_ids: List[str], user_id: str) -> BulkOperationResponse:
        """Mark notifications as read"""
        try:
            result = await notification_db.mark_notifications_as_read(notification_ids, user_id)
            
            return BulkOperationResponse(
                success=result['succeeded'] > 0,
                message=f"Marked {result['succeeded']}/{result['total']} notifications as read",
                processed=result['total'],
                succeeded=result['succeeded'],
                failed=result['failed']
            )
            
        except Exception as e:
            logger.error(f"Error marking notifications as read: {str(e)}")
            return BulkOperationResponse(
                success=False,
                message=f"Failed to mark notifications as read: {str(e)}",
                processed=len(notification_ids),
                succeeded=0,
                failed=len(notification_ids),
                errors=[{"error": str(e)}]
            )
    
    async def delete_notification(self, notification_id: str, user_id: str = None) -> bool:
        """Delete notification"""
        try:
            # Check if user has access to this notification
            if user_id:
                notification = await notification_db.get_notification_by_id(notification_id)
                if not notification or notification['user_id'] != user_id:
                    return False
            
            return await notification_db.delete_notification(notification_id)
            
        except Exception as e:
            logger.error(f"Error deleting notification {notification_id}: {str(e)}")
            return False
    
    async def get_user_statistics(self, user_id: str) -> NotificationStatsResponse:
        """Get notification statistics for user"""
        try:
            stats = await notification_db.get_user_notification_stats(user_id)
            
            return NotificationStatsResponse(
                total_notifications=stats.get('total_notifications', 0),
                unread_count=stats.get('unread_count', 0),
                read_count=stats.get('read_count', 0),
                by_type=stats.get('by_type', {}),
                by_priority=stats.get('by_priority', {}),
                by_status=stats.get('by_status', {}),
                recent_activity=stats.get('recent_activity', [])
            )
            
        except Exception as e:
            logger.error(f"Error getting user statistics: {str(e)}")
            return NotificationStatsResponse(
                total_notifications=0,
                unread_count=0,
                read_count=0,
                by_type={},
                by_priority={},
                by_status={},
                recent_activity=[]
            )
    
    async def process_pending_notifications(self, limit: int = 100) -> int:
        """Process pending notifications for delivery"""
        try:
            pending_notifications = await notification_db.get_pending_notifications(limit)
            processed_count = 0
            
            for notification in pending_notifications:
                try:
                    await self.delivery_service.deliver_notification(notification)
                    processed_count += 1
                except Exception as e:
                    logger.error(f"Error processing notification {notification['id']}: {str(e)}")
            
            return processed_count
            
        except Exception as e:
            logger.error(f"Error processing pending notifications: {str(e)}")
            return 0
    
    async def get_user_preferences(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user notification preferences"""
        try:
            # Get preferences from user document
            user_doc = notification_db.users_col.document(user_id).get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                return user_data.get('notification_preferences')
            return None
        except Exception as e:
            logger.error(f"Error getting user preferences for {user_id}: {str(e)}")
            return None
    
    async def update_user_preferences(self, user_id: str, preferences: NotificationPreferencesRequest) -> bool:
        """Update user notification preferences"""
        try:
            preferences_data = {
                'enabled_channels': [channel.value for channel in preferences.enabled_channels],
                'notification_types': {ntype.value: enabled for ntype, enabled in preferences.notification_types.items()},
                'quiet_hours_start': preferences.quiet_hours_start,
                'quiet_hours_end': preferences.quiet_hours_end,
                'timezone': preferences.timezone,
                'updated_at': datetime.utcnow()
            }
            
            # Update user document
            notification_db.users_col.document(user_id).update({
                'notification_preferences': preferences_data
            })
            
            return True
            
        except Exception as e:
            logger.error(f"Error updating user preferences for {user_id}: {str(e)}")
            return False
    
    def _filter_channels_by_preferences(
        self, 
        channels: List[NotificationChannel], 
        preferences: Dict[str, Any],
        notification_type: NotificationType
    ) -> List[NotificationChannel]:
        """Filter notification channels based on user preferences"""
        if not preferences:
            return channels
        
        enabled_channels = preferences.get('enabled_channels', [])
        notification_types = preferences.get('notification_types', {})
        
        # Check if notification type is enabled
        if notification_type.value in notification_types and not notification_types[notification_type.value]:
            return []
        
        # Filter channels based on user preferences
        filtered_channels = []
        for channel in channels:
            if channel.value in enabled_channels:
                filtered_channels.append(channel)
        
        return filtered_channels
    
    async def _deliver_notification_by_id(self, notification_id: str):
        """Deliver notification by ID (background task)"""
        try:
            notification = await notification_db.get_notification_by_id(notification_id)
            if notification:
                await self.delivery_service.deliver_notification(notification)
        except Exception as e:
            logger.error(f"Error delivering notification {notification_id}: {str(e)}")
    
    async def cleanup_expired_notifications(self) -> int:
        """Clean up expired notifications"""
        try:
            return await notification_db.cleanup_expired_notifications()
        except Exception as e:
            logger.error(f"Error cleaning up expired notifications: {str(e)}")
            return 0


# Singleton instance
notification_service = NotificationService()