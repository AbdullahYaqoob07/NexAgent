from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
from enum import Enum
import asyncio
import logging
import json
import re
from jinja2 import Template, Environment, FileSystemLoader
from app.models.notification_models import (
    NotificationChannel, NotificationType, NotificationPriority, NotificationStatus
)
import hashlib
import base64

logger = logging.getLogger(__name__)


class NotificationTemplate:
    """
    Template system for notification formatting
    """
    
    def __init__(self):
        # Initialize Jinja2 environment
        self.env = Environment(
            loader=FileSystemLoader('templates/notifications'),
            autoescape=True
        )
        
        # Default templates if files don't exist
        self.default_templates = {
            'email_html': """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>{{ title }}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .header { background: {{ priority_color }}; color: white; padding: 20px; }
                    .content { padding: 30px; }
                    .footer { background: #f8f9fa; padding: 15px 30px; font-size: 12px; color: #6c757d; }
                    .action-btn { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                    .metadata { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>{{ title }}</h1>
                        <p>Priority: {{ priority | upper }} | Type: {{ notification_type | title }}</p>
                    </div>
                    <div class="content">
                        <p>{{ message | nl2br }}</p>
                        {% if action_url %}
                        <a href="{{ action_url }}" class="action-btn">Take Action</a>
                        {% endif %}
                        {% if metadata %}
                        <div class="metadata">
                            <strong>Additional Information:</strong>
                            {% for key, value in metadata.items() %}
                            <br><strong>{{ key | title }}:</strong> {{ value }}
                            {% endfor %}
                        </div>
                        {% endif %}
                    </div>
                    <div class="footer">
                        <p>Sent at {{ created_at.strftime('%Y-%m-%d %H:%M:%S UTC') }} | NexAgent Notification System</p>
                        <p>If you no longer wish to receive these notifications, please update your preferences in your account settings.</p>
                    </div>
                </div>
            </body>
            </html>
            """,
            
            'email_text': """
            {{ title }}
            ==========================================
            
            {{ message }}
            
            Priority: {{ priority | upper }}
            Type: {{ notification_type | title }}
            {% if action_url %}
            Action URL: {{ action_url }}
            {% endif %}
            {% if metadata %}
            
            Additional Information:
            {% for key, value in metadata.items() %}
            {{ key | title }}: {{ value }}
            {% endfor %}
            {% endif %}
            
            --
            Sent at {{ created_at.strftime('%Y-%m-%d %H:%M:%S UTC') }}
            NexAgent Notification System
            """,
            
            'slack': {
                "text": "{{ title }}",
                "blocks": [
                    {
                        "type": "header",
                        "text": {
                            "type": "plain_text",
                            "text": "{{ title }}"
                        }
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "{{ message }}"
                        }
                    },
                    {
                        "type": "context",
                        "elements": [
                            {
                                "type": "mrkdwn",
                                "text": "*Priority:* {{ priority | upper }} | *Type:* {{ notification_type | title }}"
                            }
                        ]
                    }
                ]
            },
            
            'push': {
                "title": "{{ title }}",
                "body": "{{ message }}",
                "data": {
                    "priority": "{{ priority }}",
                    "type": "{{ notification_type }}",
                    "action_url": "{{ action_url }}",
                    "created_at": "{{ created_at.isoformat() }}"
                }
            }
        }
    
    def get_priority_color(self, priority: str) -> str:
        """Get color code for priority level"""
        colors = {
            NotificationPriority.LOW.value: "#28a745",      # Green
            NotificationPriority.MEDIUM.value: "#ffc107",   # Yellow
            NotificationPriority.HIGH.value: "#fd7e14",     # Orange
            NotificationPriority.CRITICAL.value: "#dc3545"  # Red
        }
        return colors.get(priority, "#6c757d")  # Default gray
    
    def render_email_html(self, notification: Dict[str, Any]) -> str:
        """Render HTML email template"""
        try:
            # Add helper variables
            context = notification.copy()
            context['priority_color'] = self.get_priority_color(notification.get('priority', 'medium'))
            
            # Try to load custom template first
            try:
                template = self.env.get_template('email_html.j2')
            except:
                # Fall back to default template
                template = Template(self.default_templates['email_html'])
            
            # Add custom filters
            def nl2br(value):
                return value.replace('\n', '<br>')
            
            template.globals['nl2br'] = nl2br
            
            return template.render(**context)
            
        except Exception as e:
            logger.error(f"Error rendering email HTML template: {str(e)}")
            # Return basic fallback
            return f"<h1>{notification.get('title', 'Notification')}</h1><p>{notification.get('message', '')}</p>"
    
    def render_email_text(self, notification: Dict[str, Any]) -> str:
        """Render plain text email template"""
        try:
            # Try to load custom template first
            try:
                template = self.env.get_template('email_text.j2')
            except:
                # Fall back to default template
                template = Template(self.default_templates['email_text'])
            
            return template.render(**notification)
            
        except Exception as e:
            logger.error(f"Error rendering email text template: {str(e)}")
            # Return basic fallback
            return f"{notification.get('title', 'Notification')}\n\n{notification.get('message', '')}"
    
    def render_slack_payload(self, notification: Dict[str, Any]) -> Dict[str, Any]:
        """Render Slack message payload"""
        try:
            template_str = json.dumps(self.default_templates['slack'])
            template = Template(template_str)
            rendered = template.render(**notification)
            return json.loads(rendered)
            
        except Exception as e:
            logger.error(f"Error rendering Slack template: {str(e)}")
            # Return basic fallback
            return {
                "text": notification.get('title', 'Notification'),
                "attachments": [{
                    "color": self.get_priority_color(notification.get('priority', 'medium')),
                    "text": notification.get('message', ''),
                    "footer": "NexAgent"
                }]
            }
    
    def render_push_payload(self, notification: Dict[str, Any]) -> Dict[str, Any]:
        """Render push notification payload"""
        try:
            template_str = json.dumps(self.default_templates['push'])
            template = Template(template_str)
            rendered = template.render(**notification)
            return json.loads(rendered)
            
        except Exception as e:
            logger.error(f"Error rendering push template: {str(e)}")
            # Return basic fallback
            return {
                "title": notification.get('title', 'Notification'),
                "body": notification.get('message', ''),
                "data": {
                    "priority": notification.get('priority', 'medium'),
                    "type": notification.get('notification_type', 'custom')
                }
            }


class NotificationQueue:
    """
    Queue system for background notification processing
    """
    
    def __init__(self, max_size: int = 10000):
        self.queue = asyncio.Queue(maxsize=max_size)
        self.workers = []
        self.is_running = False
        self.worker_count = 5  # Number of worker coroutines
    
    async def start(self):
        """Start the notification queue workers"""
        if self.is_running:
            return
        
        self.is_running = True
        
        # Start worker coroutines
        for i in range(self.worker_count):
            worker = asyncio.create_task(self._worker(f"worker-{i}"))
            self.workers.append(worker)
        
        logger.info(f"Started {self.worker_count} notification queue workers")
    
    async def stop(self):
        """Stop the notification queue workers"""
        if not self.is_running:
            return
        
        self.is_running = False
        
        # Cancel all workers
        for worker in self.workers:
            worker.cancel()
        
        # Wait for workers to finish
        await asyncio.gather(*self.workers, return_exceptions=True)
        self.workers.clear()
        
        logger.info("Stopped notification queue workers")
    
    async def enqueue(self, notification: Dict[str, Any], priority: int = 1):
        """
        Add notification to processing queue
        
        Args:
            notification: Notification data
            priority: Priority level (1=high, 2=medium, 3=low)
        """
        try:
            await self.queue.put((priority, notification))
        except asyncio.QueueFull:
            logger.error("Notification queue is full, dropping notification")
    
    async def _worker(self, worker_name: str):
        """Background worker for processing notifications"""
        logger.info(f"Notification worker {worker_name} started")
        
        while self.is_running:
            try:
                # Get notification from queue (blocks until available)
                priority, notification = await asyncio.wait_for(
                    self.queue.get(), 
                    timeout=1.0
                )
                
                # Process notification
                await self._process_notification(notification, worker_name)
                
                # Mark task as done
                self.queue.task_done()
                
            except asyncio.TimeoutError:
                # No notifications available, continue loop
                continue
            except asyncio.CancelledError:
                logger.info(f"Notification worker {worker_name} cancelled")
                break
            except Exception as e:
                logger.error(f"Error in notification worker {worker_name}: {str(e)}")
                await asyncio.sleep(1)
        
        logger.info(f"Notification worker {worker_name} stopped")
    
    async def _process_notification(self, notification: Dict[str, Any], worker_name: str):
        """Process a single notification"""
        try:
            from app.services.notification_service import notification_service
            
            # Deliver notification
            result = await notification_service.delivery_service.deliver_notification(notification)
            
            if result.success:
                logger.info(f"Worker {worker_name}: Successfully delivered notification {notification['id']}")
            else:
                logger.warning(f"Worker {worker_name}: Failed to deliver notification {notification['id']}: {result.message}")
                
        except Exception as e:
            logger.error(f"Worker {worker_name}: Error processing notification {notification.get('id', 'unknown')}: {str(e)}")


class NotificationValidator:
    """
    Validation utilities for notifications
    """
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email address format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    @staticmethod
    def validate_phone_number(phone: str) -> bool:
        """Validate phone number format (E.164)"""
        pattern = r'^\+[1-9]\d{1,14}$'
        return re.match(pattern, phone) is not None
    
    @staticmethod
    def validate_url(url: str) -> bool:
        """Validate URL format"""
        pattern = r'^https?://(?:[-\w.])+(?:[:\d]+)?(?:/(?:[\w/_.])*(?:\?(?:[\w&=%.])*)?(?:#(?:\w*))*)?$'
        return re.match(pattern, url) is not None
    
    @staticmethod
    def sanitize_message(message: str, max_length: int = 2000) -> str:
        """Sanitize notification message"""
        if not message:
            return ""
        
        # Remove potentially dangerous content
        sanitized = re.sub(r'<script[^>]*>.*?</script>', '', message, flags=re.IGNORECASE | re.DOTALL)
        sanitized = re.sub(r'javascript:', '', sanitized, flags=re.IGNORECASE)
        
        # Truncate if too long
        if len(sanitized) > max_length:
            sanitized = sanitized[:max_length - 3] + "..."
        
        return sanitized.strip()
    
    @staticmethod
    def validate_notification_data(data: Dict[str, Any]) -> List[str]:
        """
        Validate notification data and return list of errors
        
        Args:
            data: Notification data to validate
            
        Returns:
            List of validation error messages
        """
        errors = []
        
        # Check required fields
        if not data.get('title'):
            errors.append("Title is required")
        
        if not data.get('message'):
            errors.append("Message is required")
        
        if not data.get('user_id'):
            errors.append("User ID is required")
        
        # Validate field lengths
        if data.get('title') and len(data['title']) > 200:
            errors.append("Title must be 200 characters or less")
        
        if data.get('message') and len(data['message']) > 2000:
            errors.append("Message must be 2000 characters or less")
        
        # Validate URLs
        if data.get('action_url') and not NotificationValidator.validate_url(data['action_url']):
            errors.append("Invalid action URL format")
        
        # Validate webhook URLs in metadata
        if data.get('metadata', {}).get('webhook_url'):
            if not NotificationValidator.validate_url(data['metadata']['webhook_url']):
                errors.append("Invalid webhook URL format")
        
        # Validate channels
        valid_channels = [channel.value for channel in NotificationChannel]
        channels = data.get('channels', [])
        for channel in channels:
            if channel not in valid_channels:
                errors.append(f"Invalid channel: {channel}")
        
        return errors


class NotificationFormatter:
    """
    Formatting utilities for notifications
    """
    
    def __init__(self):
        self.template_system = NotificationTemplate()
    
    def format_for_channel(self, notification: Dict[str, Any], channel: str) -> Any:
        """
        Format notification for specific delivery channel
        
        Args:
            notification: Notification data
            channel: Delivery channel
            
        Returns:
            Formatted notification payload
        """
        try:
            if channel == NotificationChannel.EMAIL.value:
                return {
                    'html': self.template_system.render_email_html(notification),
                    'text': self.template_system.render_email_text(notification),
                    'subject': notification.get('title', 'Notification')
                }
            
            elif channel == NotificationChannel.SLACK.value:
                return self.template_system.render_slack_payload(notification)
            
            elif channel == NotificationChannel.PUSH.value:
                return self.template_system.render_push_payload(notification)
            
            elif channel == NotificationChannel.SMS.value:
                return {
                    'body': f"{notification.get('title', 'Notification')}: {notification.get('message', '')[:140]}"
                }
            
            elif channel == NotificationChannel.WEBHOOK.value:
                return {
                    'notification_id': notification.get('id'),
                    'user_id': notification.get('user_id'),
                    'title': notification.get('title'),
                    'message': notification.get('message'),
                    'type': notification.get('notification_type'),
                    'priority': notification.get('priority'),
                    'created_at': notification.get('created_at'),
                    'metadata': notification.get('metadata', {})
                }
            
            elif channel == NotificationChannel.IN_APP.value:
                # In-app notifications are already in the correct format
                return notification
            
            else:
                logger.warning(f"Unknown channel for formatting: {channel}")
                return notification
                
        except Exception as e:
            logger.error(f"Error formatting notification for channel {channel}: {str(e)}")
            return notification
    
    def truncate_message(self, message: str, max_length: int) -> str:
        """Truncate message to fit channel limits"""
        if len(message) <= max_length:
            return message
        
        return message[:max_length - 3] + "..."
    
    def format_timestamp(self, timestamp: Union[datetime, str], format_type: str = "readable") -> str:
        """Format timestamp for display"""
        try:
            if isinstance(timestamp, str):
                timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            
            if format_type == "readable":
                return timestamp.strftime("%Y-%m-%d %H:%M:%S UTC")
            elif format_type == "iso":
                return timestamp.isoformat()
            elif format_type == "relative":
                now = datetime.utcnow()
                diff = now - timestamp
                
                if diff.days > 0:
                    return f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
                elif diff.seconds > 3600:
                    hours = diff.seconds // 3600
                    return f"{hours} hour{'s' if hours > 1 else ''} ago"
                elif diff.seconds > 60:
                    minutes = diff.seconds // 60
                    return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
                else:
                    return "Just now"
            else:
                return str(timestamp)
                
        except Exception as e:
            logger.error(f"Error formatting timestamp: {str(e)}")
            return str(timestamp)


class NotificationEncryption:
    """
    Encryption utilities for sensitive notification data
    """
    
    @staticmethod
    def encrypt_sensitive_data(data: str, key: str) -> str:
        """
        Encrypt sensitive data using AES
        
        Args:
            data: Data to encrypt
            key: Encryption key
            
        Returns:
            Base64 encoded encrypted data
        """
        try:
            from cryptography.fernet import Fernet
            
            # Use provided key or generate key hash
            if len(key) != 44:  # Fernet key length
                key_hash = hashlib.sha256(key.encode()).digest()
                key = base64.urlsafe_b64encode(key_hash)
            
            f = Fernet(key)
            encrypted_data = f.encrypt(data.encode())
            return base64.b64encode(encrypted_data).decode()
            
        except Exception as e:
            logger.error(f"Error encrypting sensitive data: {str(e)}")
            return data  # Return unencrypted as fallback
    
    @staticmethod
    def decrypt_sensitive_data(encrypted_data: str, key: str) -> str:
        """
        Decrypt sensitive data using AES
        
        Args:
            encrypted_data: Base64 encoded encrypted data
            key: Decryption key
            
        Returns:
            Decrypted data
        """
        try:
            from cryptography.fernet import Fernet
            
            # Use provided key or generate key hash
            if len(key) != 44:  # Fernet key length
                key_hash = hashlib.sha256(key.encode()).digest()
                key = base64.urlsafe_b64encode(key_hash)
            
            f = Fernet(key)
            decoded_data = base64.b64decode(encrypted_data)
            decrypted_data = f.decrypt(decoded_data)
            return decrypted_data.decode()
            
        except Exception as e:
            logger.error(f"Error decrypting sensitive data: {str(e)}")
            return encrypted_data  # Return encrypted as fallback


# Global instances
notification_template = NotificationTemplate()
notification_queue = NotificationQueue()
notification_formatter = NotificationFormatter()
notification_validator = NotificationValidator()


# Utility functions
def generate_notification_id() -> str:
    """Generate unique notification ID"""
    import uuid
    return str(uuid.uuid4())


def calculate_delivery_delay(priority: str, retry_count: int = 0) -> float:
    """
    Calculate delay before delivery attempt based on priority and retry count
    
    Args:
        priority: Notification priority
        retry_count: Number of previous retry attempts
        
    Returns:
        Delay in seconds
    """
    base_delays = {
        NotificationPriority.CRITICAL.value: 0,      # Immediate
        NotificationPriority.HIGH.value: 1,          # 1 second
        NotificationPriority.MEDIUM.value: 5,        # 5 seconds
        NotificationPriority.LOW.value: 30,          # 30 seconds
    }
    
    base_delay = base_delays.get(priority, 5)
    
    # Exponential backoff for retries
    if retry_count > 0:
        base_delay = base_delay * (2 ** retry_count)
    
    return min(base_delay, 300)  # Cap at 5 minutes


def should_retry_delivery(error: str, attempt_count: int) -> bool:
    """
    Determine if delivery should be retried based on error and attempt count
    
    Args:
        error: Error message from failed delivery
        attempt_count: Number of previous attempts
        
    Returns:
        True if should retry, False otherwise
    """
    # Don't retry after 3 attempts
    if attempt_count >= 3:
        return False
    
    # Don't retry for certain types of errors
    non_retryable_errors = [
        "invalid_email",
        "invalid_phone",
        "invalid_webhook_url",
        "user_not_found",
        "permission_denied"
    ]
    
    for non_retryable in non_retryable_errors:
        if non_retryable in error.lower():
            return False
    
    return True


async def batch_notifications(
    notifications: List[Dict[str, Any]], 
    batch_size: int = 100
) -> List[List[Dict[str, Any]]]:
    """
    Batch notifications for efficient processing
    
    Args:
        notifications: List of notifications to batch
        batch_size: Maximum batch size
        
    Returns:
        List of notification batches
    """
    batches = []
    for i in range(0, len(notifications), batch_size):
        batch = notifications[i:i + batch_size]
        batches.append(batch)
    
    return batches


def get_notification_digest_summary(notifications: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generate summary for notification digest
    
    Args:
        notifications: List of notifications
        
    Returns:
        Digest summary
    """
    if not notifications:
        return {"total": 0, "by_type": {}, "by_priority": {}}
    
    summary = {
        "total": len(notifications),
        "by_type": {},
        "by_priority": {},
        "latest": notifications[0] if notifications else None,
        "date_range": {
            "start": min(n.get('created_at') for n in notifications),
            "end": max(n.get('created_at') for n in notifications)
        }
    }
    
    for notification in notifications:
        ntype = notification.get('notification_type', 'unknown')
        priority = notification.get('priority', 'medium')
        
        summary["by_type"][ntype] = summary["by_type"].get(ntype, 0) + 1
        summary["by_priority"][priority] = summary["by_priority"].get(priority, 0) + 1
    
    return summary