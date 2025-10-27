from fastapi import APIRouter, HTTPException, Depends, Query, Path, BackgroundTasks, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
from datetime import datetime
import logging

from app.models.notification_models import (
    NotificationCreateRequest, NotificationBulkCreateRequest, NotificationUpdateRequest,
    NotificationMarkRequest, NotificationPreferencesRequest, NotificationDeliveryRequest,
    NotificationResponse, NotificationListResponse, NotificationStatsResponse,
    NotificationPreferencesResponse, BulkOperationResponse, NotificationDeliveryResponse,
    SuccessResponse, ErrorResponse, NotificationChannel, NotificationType, NotificationPriority
)
from app.services.notification_service import notification_service
from app.services.firebase_service import FirebaseService
from app.core.security import verify_token, rate_limit, require_permissions
from app.core.logging import log_api_event
import asyncio

logger = logging.getLogger(__name__)
security = HTTPBearer()

# Create router with proper tags and metadata
router = APIRouter(
    prefix="/notifications",
    tags=["🔔 Notifications & Alerts"],
    responses={
        400: {"model": ErrorResponse, "description": "Bad Request"},
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        403: {"model": ErrorResponse, "description": "Forbidden"},
        404: {"model": ErrorResponse, "description": "Not Found"},
        422: {"model": ErrorResponse, "description": "Validation Error"},
        429: {"model": ErrorResponse, "description": "Rate Limit Exceeded"},
        500: {"model": ErrorResponse, "description": "Internal Server Error"}
    }
)

# Dependency for user authentication and authorization
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verify user token and return user info"""
    try:
        firebase_service = FirebaseService()
        user_info = await firebase_service.verify_token(credentials.credentials)
        if not user_info:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired token"
            )
        return user_info
    except Exception as e:
        logger.error(f"Authentication failed: {str(e)}")
        raise HTTPException(
            status_code=401,
            detail="Authentication failed"
        )

# Admin dependency for admin-only operations
async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    """Verify admin privileges"""
    user_roles = current_user.get('roles', [])
    if 'admin' not in user_roles and 'super_admin' not in user_roles:
        raise HTTPException(
            status_code=403,
            detail="Admin privileges required"
        )
    return current_user


# =============================================================================
# NOTIFICATION MANAGEMENT ENDPOINTS
# =============================================================================

@router.post(
    "/",
    response_model=SuccessResponse,
    status_code=201,
    summary="Create Notification",
    description="Create a new notification for a user with delivery across multiple channels"
)
@rate_limit(requests_per_minute=100)
async def create_notification(
    request: Request,
    notification_data: NotificationCreateRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Create a new notification"""
    try:
        # Log API event
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="create_notification",
            resource_id=notification_data.user_id,
            metadata={"type": notification_data.notification_type.value, "priority": notification_data.priority.value}
        )
        
        # Create notification
        notification_id = await notification_service.create_notification(
            notification_data=notification_data,
            created_by=current_user['uid']
        )
        
        return SuccessResponse(
            message="Notification created successfully",
            data={"notification_id": notification_id}
        )
        
    except Exception as e:
        logger.error(f"Error creating notification: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to create notification"
        )


@router.post(
    "/bulk",
    response_model=BulkOperationResponse,
    status_code=201,
    summary="Create Bulk Notifications",
    description="Create notifications for multiple users at once"
)
@rate_limit(requests_per_minute=10)  # Stricter rate limit for bulk operations
async def create_bulk_notifications(
    request: Request,
    bulk_data: NotificationBulkCreateRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_admin_user)  # Admin only
):
    """Create bulk notifications"""
    try:
        # Log API event
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="create_bulk_notifications",
            resource_id=f"bulk_{len(bulk_data.user_ids)}_users",
            metadata={"user_count": len(bulk_data.user_ids), "type": bulk_data.notification_type.value}
        )
        
        # Create bulk notifications
        result = await notification_service.create_bulk_notifications(
            bulk_request=bulk_data,
            created_by=current_user['uid']
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error creating bulk notifications: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to create bulk notifications"
        )


@router.get(
    "/",
    response_model=NotificationListResponse,
    summary="Get User Notifications",
    description="Get notifications for the current user with filtering and pagination"
)
@rate_limit(requests_per_minute=200)
async def get_user_notifications(
    request: Request,
    status: Optional[str] = Query(None, description="Filter by status"),
    notification_type: Optional[str] = Query(None, description="Filter by type"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    include_read: bool = Query(True, description="Include read notifications"),
    current_user: dict = Depends(get_current_user)
):
    """Get notifications for current user"""
    try:
        # Log API event
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="get_notifications",
            resource_id=current_user['uid'],
            metadata={"page": page, "page_size": page_size, "filters": {"status": status, "type": notification_type, "priority": priority}}
        )
        
        # Get notifications
        result = await notification_service.get_user_notifications(
            user_id=current_user['uid'],
            status=status,
            notification_type=notification_type,
            priority=priority,
            page=page,
            page_size=page_size,
            include_read=include_read
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting user notifications: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve notifications"
        )


@router.get(
    "/{notification_id}",
    response_model=NotificationResponse,
    summary="Get Notification Details",
    description="Get detailed information about a specific notification"
)
@rate_limit(requests_per_minute=300)
async def get_notification_details(
    request: Request,
    notification_id: str = Path(..., description="Notification ID"),
    current_user: dict = Depends(get_current_user)
):
    """Get notification by ID"""
    try:
        # Log API event
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="get_notification_details",
            resource_id=notification_id
        )
        
        # Get notification
        notification = await notification_service.get_notification_by_id(
            notification_id=notification_id,
            user_id=current_user['uid']
        )
        
        if not notification:
            raise HTTPException(
                status_code=404,
                detail="Notification not found"
            )
        
        return notification
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting notification details: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve notification details"
        )


@router.put(
    "/{notification_id}",
    response_model=SuccessResponse,
    summary="Update Notification",
    description="Update notification details (admin only)"
)
@rate_limit(requests_per_minute=50)
async def update_notification(
    request: Request,
    update_data: NotificationUpdateRequest,
    notification_id: str = Path(..., description="Notification ID"),
    current_user: dict = Depends(get_admin_user)  # Admin only
):
    """Update notification (admin only)"""
    try:
        # Log API event
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="update_notification",
            resource_id=notification_id,
            metadata=update_data.dict(exclude_unset=True)
        )
        
        # Check if notification exists
        notification = await notification_service.get_notification_by_id(notification_id)
        if not notification:
            raise HTTPException(
                status_code=404,
                detail="Notification not found"
            )
        
        # Update notification
        from app.db.notification_db import notification_db
        success = await notification_db.update_notification(
            notification_id, 
            update_data.dict(exclude_unset=True)
        )
        
        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to update notification"
            )
        
        return SuccessResponse(message="Notification updated successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating notification: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to update notification"
        )


@router.delete(
    "/{notification_id}",
    response_model=SuccessResponse,
    summary="Delete Notification",
    description="Delete a notification"
)
@rate_limit(requests_per_minute=100)
async def delete_notification(
    request: Request,
    notification_id: str = Path(..., description="Notification ID"),
    current_user: dict = Depends(get_current_user)
):
    """Delete notification"""
    try:
        # Log API event
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="delete_notification",
            resource_id=notification_id
        )
        
        # Delete notification
        success = await notification_service.delete_notification(
            notification_id=notification_id,
            user_id=current_user['uid']
        )
        
        if not success:
            raise HTTPException(
                status_code=404,
                detail="Notification not found or access denied"
            )
        
        return SuccessResponse(message="Notification deleted successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting notification: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete notification"
        )


# =============================================================================
# NOTIFICATION ACTIONS ENDPOINTS
# =============================================================================

@router.post(
    "/mark-read",
    response_model=BulkOperationResponse,
    summary="Mark Notifications as Read",
    description="Mark one or more notifications as read"
)
@rate_limit(requests_per_minute=200)
async def mark_notifications_as_read(
    request: Request,
    mark_data: NotificationMarkRequest,
    current_user: dict = Depends(get_current_user)
):
    """Mark notifications as read"""
    try:
        # Log API event
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="mark_notifications_read",
            resource_id=f"batch_{len(mark_data.notification_ids)}",
            metadata={"count": len(mark_data.notification_ids), "status": mark_data.status}
        )
        
        if mark_data.status == "read":
            result = await notification_service.mark_notifications_as_read(
                notification_ids=mark_data.notification_ids,
                user_id=current_user['uid']
            )
        else:
            # For unread, we need to implement similar logic
            raise HTTPException(
                status_code=501,
                detail="Mark as unread functionality not yet implemented"
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking notifications: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to update notification status"
        )


@router.post(
    "/{notification_id}/deliver",
    response_model=NotificationDeliveryResponse,
    summary="Manually Deliver Notification",
    description="Manually trigger notification delivery (admin only)"
)
@rate_limit(requests_per_minute=20)
async def deliver_notification(
    request: Request,
    delivery_data: NotificationDeliveryRequest,
    background_tasks: BackgroundTasks,
    notification_id: str = Path(..., description="Notification ID"),
    current_user: dict = Depends(get_admin_user)  # Admin only
):
    """Manually deliver notification"""
    try:
        # Log API event
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="manual_deliver_notification",
            resource_id=notification_id,
            metadata={"channels": delivery_data.channels, "force_resend": delivery_data.force_resend}
        )
        
        # Get notification
        from app.db.notification_db import notification_db
        notification = await notification_db.get_notification_by_id(notification_id)
        
        if not notification:
            raise HTTPException(
                status_code=404,
                detail="Notification not found"
            )
        
        # Override channels if specified
        if delivery_data.channels:
            notification['channels'] = [channel.value for channel in delivery_data.channels]
        
        # Deliver notification
        result = await notification_service.delivery_service.deliver_notification(notification)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error delivering notification: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to deliver notification"
        )


# =============================================================================
# STATISTICS AND ANALYTICS ENDPOINTS
# =============================================================================

@router.get(
    "/stats",
    response_model=NotificationStatsResponse,
    summary="Get Notification Statistics",
    description="Get notification statistics for the current user"
)
@rate_limit(requests_per_minute=100)
async def get_notification_statistics(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get notification statistics"""
    try:
        # Log API event
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="get_notification_stats",
            resource_id=current_user['uid']
        )
        
        # Get statistics
        stats = await notification_service.get_user_statistics(current_user['uid'])
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting notification statistics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve notification statistics"
        )


# =============================================================================
# USER PREFERENCES ENDPOINTS
# =============================================================================

@router.get(
    "/preferences",
    response_model=NotificationPreferencesResponse,
    summary="Get Notification Preferences",
    description="Get notification preferences for the current user"
)
@rate_limit(requests_per_minute=100)
async def get_notification_preferences(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get user notification preferences"""
    try:
        # Log API event
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="get_notification_preferences",
            resource_id=current_user['uid']
        )
        
        # Get preferences
        preferences = await notification_service.get_user_preferences(current_user['uid'])
        
        if not preferences:
            # Return default preferences
            return NotificationPreferencesResponse(
                user_id=current_user['uid'],
                enabled_channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
                notification_types={ntype: True for ntype in NotificationType},
                quiet_hours_start=None,
                quiet_hours_end=None,
                timezone="UTC",
                updated_at=datetime.utcnow()
            )
        
        return NotificationPreferencesResponse(
            user_id=current_user['uid'],
            enabled_channels=[NotificationChannel(ch) for ch in preferences.get('enabled_channels', [])],
            notification_types={NotificationType(k): v for k, v in preferences.get('notification_types', {}).items()},
            quiet_hours_start=preferences.get('quiet_hours_start'),
            quiet_hours_end=preferences.get('quiet_hours_end'),
            timezone=preferences.get('timezone', 'UTC'),
            updated_at=preferences.get('updated_at', datetime.utcnow())
        )
        
    except Exception as e:
        logger.error(f"Error getting notification preferences: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve notification preferences"
        )


@router.put(
    "/preferences",
    response_model=SuccessResponse,
    summary="Update Notification Preferences",
    description="Update notification preferences for the current user"
)
@rate_limit(requests_per_minute=50)
async def update_notification_preferences(
    request: Request,
    preferences_data: NotificationPreferencesRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update user notification preferences"""
    try:
        # Log API event
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="update_notification_preferences",
            resource_id=current_user['uid'],
            metadata=preferences_data.dict()
        )
        
        # Update preferences
        success = await notification_service.update_user_preferences(
            user_id=current_user['uid'],
            preferences=preferences_data
        )
        
        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to update preferences"
            )
        
        return SuccessResponse(message="Notification preferences updated successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating notification preferences: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to update notification preferences"
        )


# =============================================================================
# ADMIN ENDPOINTS
# =============================================================================

@router.get(
    "/admin/pending",
    response_model=List[NotificationResponse],
    summary="Get Pending Notifications (Admin)",
    description="Get all pending notifications for processing (admin only)"
)
@rate_limit(requests_per_minute=20)
async def get_pending_notifications(
    request: Request,
    limit: int = Query(100, ge=1, le=1000, description="Maximum notifications to return"),
    current_user: dict = Depends(get_admin_user)  # Admin only
):
    """Get pending notifications (admin only)"""
    try:
        # Log API event
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="get_pending_notifications",
            resource_id="admin",
            metadata={"limit": limit}
        )
        
        # Get pending notifications
        from app.db.notification_db import notification_db
        pending_notifications = await notification_db.get_pending_notifications(limit)
        
        # Convert to response models
        notifications = [
            NotificationResponse(**notification) 
            for notification in pending_notifications
        ]
        
        return notifications
        
    except Exception as e:
        logger.error(f"Error getting pending notifications: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve pending notifications"
        )


@router.post(
    "/admin/process-pending",
    response_model=SuccessResponse,
    summary="Process Pending Notifications (Admin)",
    description="Process and deliver pending notifications (admin only)"
)
@rate_limit(requests_per_minute=10)
async def process_pending_notifications(
    request: Request,
    background_tasks: BackgroundTasks,
    limit: int = Query(100, ge=1, le=1000, description="Maximum notifications to process"),
    current_user: dict = Depends(get_admin_user)  # Admin only
):
    """Process pending notifications (admin only)"""
    try:
        # Log API event
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="process_pending_notifications",
            resource_id="admin",
            metadata={"limit": limit}
        )
        
        # Process notifications in background
        background_tasks.add_task(notification_service.process_pending_notifications, limit)
        
        return SuccessResponse(
            message=f"Processing up to {limit} pending notifications in background"
        )
        
    except Exception as e:
        logger.error(f"Error processing pending notifications: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to process pending notifications"
        )


@router.delete(
    "/admin/cleanup",
    response_model=SuccessResponse,
    summary="Cleanup Expired Notifications (Admin)",
    description="Remove expired notifications from the system (admin only)"
)
@rate_limit(requests_per_minute=5)
async def cleanup_expired_notifications(
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_admin_user)  # Admin only
):
    """Cleanup expired notifications (admin only)"""
    try:
        # Log API event
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="cleanup_expired_notifications",
            resource_id="admin"
        )
        
        # Cleanup in background
        background_tasks.add_task(notification_service.cleanup_expired_notifications)
        
        return SuccessResponse(
            message="Expired notifications cleanup initiated in background"
        )
        
    except Exception as e:
        logger.error(f"Error cleaning up expired notifications: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to cleanup expired notifications"
        )