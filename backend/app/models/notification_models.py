from pydantic import BaseModel, Field, validator, root_validator
from typing import Optional, List, Dict, Any, Literal, Union
from datetime import datetime
from enum import Enum


class NotificationChannel(str, Enum):
    """Available notification delivery channels"""
    EMAIL = "email"
    PUSH = "push"
    IN_APP = "in_app"
    SMS = "sms"
    WEBHOOK = "webhook"
    SLACK = "slack"


class NotificationType(str, Enum):
    """Types of notifications in the system"""
    WORKFLOW_SUCCESS = "workflow_success"
    WORKFLOW_FAILED = "workflow_failed"
    WORKFLOW_SCHEDULED = "workflow_scheduled"
    SYSTEM_MAINTENANCE = "system_maintenance"
    SECURITY_ALERT = "security_alert"
    QUOTA_WARNING = "quota_warning"
    QUOTA_EXCEEDED = "quota_exceeded"
    PAYMENT_SUCCESS = "payment_success"
    PAYMENT_FAILED = "payment_failed"
    TEAM_INVITATION = "team_invitation"
    CUSTOM = "custom"


class NotificationPriority(str, Enum):
    """Notification priority levels"""
    LOW = "low"
    MEDIUM = "medium" 
    HIGH = "high"
    CRITICAL = "critical"


class NotificationStatus(str, Enum):
    """Notification delivery status"""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"
    RETRYING = "retrying"


class NotificationCreateRequest(BaseModel):
    """Request model for creating notifications"""
    user_id: str = Field(..., description="Target user ID")
    title: str = Field(..., min_length=1, max_length=200, description="Notification title")
    message: str = Field(..., min_length=1, max_length=2000, description="Notification message")
    notification_type: NotificationType = Field(..., description="Type of notification")
    priority: NotificationPriority = Field(default=NotificationPriority.MEDIUM, description="Notification priority")
    channels: List[NotificationChannel] = Field(default=[NotificationChannel.IN_APP], description="Delivery channels")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")
    scheduled_for: Optional[datetime] = Field(None, description="Schedule notification for specific time")
    expires_at: Optional[datetime] = Field(None, description="Notification expiry time")
    action_url: Optional[str] = Field(None, max_length=500, description="URL for notification action")
    
    @validator('channels')
    def validate_channels(cls, v):
        if not v:
            raise ValueError('At least one notification channel must be specified')
        # Remove duplicates while preserving order
        seen = set()
        unique_channels = []
        for channel in v:
            if channel not in seen:
                seen.add(channel)
                unique_channels.append(channel)
        return unique_channels
    
    @validator('scheduled_for')
    def validate_scheduled_for(cls, v):
        if v and v <= datetime.utcnow():
            raise ValueError('Scheduled time must be in the future')
        return v
    
    @validator('expires_at')
    def validate_expires_at(cls, v, values):
        if v:
            if v <= datetime.utcnow():
                raise ValueError('Expiry time must be in the future')
            if 'scheduled_for' in values and values['scheduled_for'] and v <= values['scheduled_for']:
                raise ValueError('Expiry time must be after scheduled time')
        return v
    
    @validator('metadata')
    def validate_metadata(cls, v):
        if v and len(str(v)) > 5000:  # Limit metadata size
            raise ValueError('Metadata size exceeds maximum limit')
        return v


class NotificationUpdateRequest(BaseModel):
    """Request model for updating notifications"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    message: Optional[str] = Field(None, min_length=1, max_length=2000)
    priority: Optional[NotificationPriority] = None
    metadata: Optional[Dict[str, Any]] = None
    expires_at: Optional[datetime] = None
    action_url: Optional[str] = Field(None, max_length=500)
    
    @validator('metadata')
    def validate_metadata(cls, v):
        if v and len(str(v)) > 5000:
            raise ValueError('Metadata size exceeds maximum limit')
        return v


class NotificationBulkCreateRequest(BaseModel):
    """Request model for creating bulk notifications"""
    user_ids: List[str] = Field(..., min_items=1, max_items=1000, description="Target user IDs")
    title: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=2000)
    notification_type: NotificationType
    priority: NotificationPriority = NotificationPriority.MEDIUM
    channels: List[NotificationChannel] = [NotificationChannel.IN_APP]
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    scheduled_for: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    action_url: Optional[str] = Field(None, max_length=500)
    
    @validator('user_ids')
    def validate_user_ids(cls, v):
        if len(set(v)) != len(v):
            raise ValueError('Duplicate user IDs are not allowed')
        return v
    
    @validator('channels')
    def validate_channels(cls, v):
        if not v:
            raise ValueError('At least one notification channel must be specified')
        return list(set(v))  # Remove duplicates


class NotificationDeliveryRequest(BaseModel):
    """Request model for manual notification delivery"""
    notification_id: str
    channels: Optional[List[NotificationChannel]] = None
    force_resend: bool = Field(default=False, description="Force resend even if already delivered")


class NotificationMarkRequest(BaseModel):
    """Request model for marking notifications"""
    notification_ids: List[str] = Field(..., min_items=1, max_items=100)
    status: Literal["read", "unread"] = Field(..., description="Status to set")


class NotificationPreferencesRequest(BaseModel):
    """Request model for user notification preferences"""
    enabled_channels: List[NotificationChannel] = Field(default_factory=list)
    notification_types: Dict[NotificationType, bool] = Field(default_factory=dict)
    quiet_hours_start: Optional[str] = Field(None, pattern=r'^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$')
    quiet_hours_end: Optional[str] = Field(None, pattern=r'^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$')
    timezone: str = Field(default="UTC", description="User timezone for quiet hours")


class NotificationResponse(BaseModel):
    """Response model for single notification"""
    id: str
    user_id: str
    title: str
    message: str
    notification_type: NotificationType
    priority: NotificationPriority
    status: NotificationStatus
    channels: List[NotificationChannel]
    metadata: Dict[str, Any]
    scheduled_for: Optional[datetime]
    expires_at: Optional[datetime]
    action_url: Optional[str]
    created_at: datetime
    updated_at: datetime
    sent_at: Optional[datetime]
    delivered_at: Optional[datetime]
    read_at: Optional[datetime]
    delivery_attempts: int
    last_error: Optional[str]
    
    class Config:
        from_attributes = True
        use_enum_values = True


class NotificationListResponse(BaseModel):
    """Response model for notification lists"""
    success: bool = True
    notifications: List[NotificationResponse]
    total: int
    page: int
    page_size: int
    unread_count: int


class NotificationStatsResponse(BaseModel):
    """Response model for notification statistics"""
    success: bool = True
    total_notifications: int
    unread_count: int
    read_count: int
    by_type: Dict[str, int]
    by_priority: Dict[str, int]
    by_status: Dict[str, int]
    recent_activity: List[Dict[str, Any]]


class NotificationPreferencesResponse(BaseModel):
    """Response model for notification preferences"""
    success: bool = True
    user_id: str
    enabled_channels: List[NotificationChannel]
    notification_types: Dict[NotificationType, bool]
    quiet_hours_start: Optional[str]
    quiet_hours_end: Optional[str]
    timezone: str
    updated_at: datetime
    
    class Config:
        use_enum_values = True


class BulkOperationResponse(BaseModel):
    """Response model for bulk operations"""
    success: bool
    message: str
    processed: int
    succeeded: int
    failed: int
    errors: List[Dict[str, str]] = []


class NotificationDeliveryResponse(BaseModel):
    """Response model for notification delivery"""
    success: bool
    message: str
    notification_id: str
    channels_attempted: List[NotificationChannel]
    channels_succeeded: List[NotificationChannel]
    channels_failed: List[NotificationChannel]
    errors: Dict[str, str] = {}


# Common response models
class SuccessResponse(BaseModel):
    """Standard success response"""
    success: bool = True
    message: str
    data: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """Standard error response"""
    success: bool = False
    message: str
    error: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    status_code: int = 400