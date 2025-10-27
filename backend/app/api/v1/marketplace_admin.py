from fastapi import APIRouter, HTTPException, Depends, Query, Path, BackgroundTasks, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import logging

from app.models.marketplace_models import (
    AdminAnalyticsResponse, SuccessResponse, ErrorResponse, BulkOperationResponse,
    NexaStatus, SellerStatus, ReviewStatus
)
from app.services.marketplace_service import marketplace_service
from app.services.firebase_service import FirebaseService
from app.core.security import rate_limit
from app.core.logging import log_api_event

logger = logging.getLogger(__name__)
security = HTTPBearer()

# Create router
router = APIRouter(
    prefix="/admin",
    tags=["🔧 Marketplace - Admin"],
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

# Dependency for user authentication
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verify user token and return user info"""
    try:
        firebase_service = FirebaseService()
        user_info = await firebase_service.verify_token(credentials.credentials)
        if not user_info:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return user_info
    except Exception as e:
        logger.error(f"Authentication failed: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")

# Admin dependency
async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    """Verify admin privileges"""
    user_roles = current_user.get('roles', [])
    if 'admin' not in user_roles and 'super_admin' not in user_roles:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user

# Super admin dependency
async def get_super_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    """Verify super admin privileges"""
    user_roles = current_user.get('roles', [])
    if 'super_admin' not in user_roles:
        raise HTTPException(status_code=403, detail="Super admin privileges required")
    return current_user


# =============================================================================
# NEXA CONTENT MODERATION
# =============================================================================

@router.get(
    "/nexas/pending",
    response_model=List[dict],
    summary="Pending Nexas Review",
    description="Get all Nexas pending admin review"
)
@rate_limit(requests_per_minute=100)
async def get_pending_nexas(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    admin_user: dict = Depends(get_admin_user)
):
    """Get Nexas pending review"""
    try:
        await log_api_event(
            request=request,
            user_id=admin_user['uid'],
            action="get_pending_nexas",
            metadata={"page": page}
        )
        
        result = await marketplace_service.get_pending_nexas_for_review(page, page_size)
        return result
        
    except Exception as e:
        logger.error(f"Error getting pending Nexas: {str(e)}")
        return []


@router.post(
    "/nexas/{nexa_id}/approve",
    response_model=SuccessResponse,
    summary="Approve Nexa",
    description="Approve a pending Nexa for marketplace listing"
)
@rate_limit(requests_per_minute=50)
async def approve_nexa(
    request: Request,
    nexa_id: str = Path(..., description="Nexa ID"),
    review_note: Optional[str] = Query(None, description="Admin review note"),
    admin_user: dict = Depends(get_admin_user)
):
    """Approve Nexa"""
    try:
        await log_api_event(
            request=request,
            user_id=admin_user['uid'],
            action="approve_nexa",
            resource_id=nexa_id,
            metadata={"review_note": review_note}
        )
        
        result = await marketplace_service.moderate_nexa(
            nexa_id, NexaStatus.approved, admin_user['uid'], review_note
        )
        
        if result['success']:
            return SuccessResponse(message=result['message'])
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving Nexa: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to approve Nexa")


@router.post(
    "/nexas/{nexa_id}/reject",
    response_model=SuccessResponse,
    summary="Reject Nexa",
    description="Reject a pending Nexa with reason"
)
@rate_limit(requests_per_minute=50)
async def reject_nexa(
    request: Request,
    nexa_id: str = Path(..., description="Nexa ID"),
    rejection_reason: str = Query(..., description="Reason for rejection"),
    admin_user: dict = Depends(get_admin_user)
):
    """Reject Nexa"""
    try:
        await log_api_event(
            request=request,
            user_id=admin_user['uid'],
            action="reject_nexa",
            resource_id=nexa_id,
            metadata={"rejection_reason": rejection_reason}
        )
        
        result = await marketplace_service.moderate_nexa(
            nexa_id, NexaStatus.rejected, admin_user['uid'], rejection_reason
        )
        
        if result['success']:
            return SuccessResponse(message=result['message'])
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting Nexa: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to reject Nexa")


@router.post(
    "/nexas/{nexa_id}/suspend",
    response_model=SuccessResponse,
    summary="Suspend Nexa",
    description="Suspend an active Nexa due to policy violation"
)
@rate_limit(requests_per_minute=30)
async def suspend_nexa(
    request: Request,
    nexa_id: str = Path(..., description="Nexa ID"),
    suspension_reason: str = Query(..., description="Reason for suspension"),
    admin_user: dict = Depends(get_admin_user)
):
    """Suspend Nexa"""
    try:
        await log_api_event(
            request=request,
            user_id=admin_user['uid'],
            action="suspend_nexa",
            resource_id=nexa_id,
            metadata={"suspension_reason": suspension_reason}
        )
        
        result = await marketplace_service.moderate_nexa(
            nexa_id, NexaStatus.suspended, admin_user['uid'], suspension_reason
        )
        
        if result['success']:
            return SuccessResponse(message=result['message'])
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error suspending Nexa: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to suspend Nexa")


@router.post(
    "/nexas/bulk-action",
    response_model=BulkOperationResponse,
    summary="Bulk Nexa Actions",
    description="Perform bulk actions on multiple Nexas"
)
@rate_limit(requests_per_minute=20)
async def bulk_nexa_action(
    request: Request,
    nexa_ids: List[str],
    action: str = Query(..., description="Action: approve, reject, suspend"),
    reason: Optional[str] = Query(None, description="Reason for action"),
    admin_user: dict = Depends(get_admin_user)
):
    """Perform bulk actions on Nexas"""
    try:
        await log_api_event(
            request=request,
            user_id=admin_user['uid'],
            action="bulk_nexa_action",
            metadata={"action": action, "count": len(nexa_ids), "reason": reason}
        )
        
        result = await marketplace_service.bulk_moderate_nexas(
            nexa_ids, action, admin_user['uid'], reason
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error performing bulk action: {str(e)}")
        return BulkOperationResponse(
            success_count=0, failed_count=len(nexa_ids), errors=[str(e)]
        )


# =============================================================================
# SELLER VERIFICATION & MANAGEMENT
# =============================================================================

@router.get(
    "/sellers/pending",
    response_model=List[dict],
    summary="Pending Seller Verifications",
    description="Get all sellers pending verification"
)
@rate_limit(requests_per_minute=100)
async def get_pending_sellers(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    admin_user: dict = Depends(get_admin_user)
):
    """Get sellers pending verification"""
    try:
        await log_api_event(
            request=request,
            user_id=admin_user['uid'],
            action="get_pending_sellers",
            metadata={"page": page}
        )
        
        result = await marketplace_service.get_pending_sellers_for_verification(page, page_size)
        return result
        
    except Exception as e:
        logger.error(f"Error getting pending sellers: {str(e)}")
        return []


@router.post(
    "/sellers/{seller_id}/verify",
    response_model=SuccessResponse,
    summary="Verify Seller",
    description="Approve seller verification"
)
@rate_limit(requests_per_minute=30)
async def verify_seller(
    request: Request,
    seller_id: str = Path(..., description="Seller ID"),
    verification_note: Optional[str] = Query(None, description="Verification note"),
    admin_user: dict = Depends(get_admin_user)
):
    """Verify seller"""
    try:
        await log_api_event(
            request=request,
            user_id=admin_user['uid'],
            action="verify_seller",
            resource_id=seller_id,
            metadata={"verification_note": verification_note}
        )
        
        result = await marketplace_service.moderate_seller(
            seller_id, SellerStatus.verified, admin_user['uid'], verification_note
        )
        
        if result['success']:
            return SuccessResponse(message=result['message'])
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying seller: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to verify seller")


@router.post(
    "/sellers/{seller_id}/reject",
    response_model=SuccessResponse,
    summary="Reject Seller",
    description="Reject seller verification application"
)
@rate_limit(requests_per_minute=30)
async def reject_seller_verification(
    request: Request,
    seller_id: str = Path(..., description="Seller ID"),
    rejection_reason: str = Query(..., description="Rejection reason"),
    admin_user: dict = Depends(get_admin_user)
):
    """Reject seller verification"""
    try:
        await log_api_event(
            request=request,
            user_id=admin_user['uid'],
            action="reject_seller_verification",
            resource_id=seller_id,
            metadata={"rejection_reason": rejection_reason}
        )
        
        result = await marketplace_service.moderate_seller(
            seller_id, SellerStatus.rejected, admin_user['uid'], rejection_reason
        )
        
        if result['success']:
            return SuccessResponse(message=result['message'])
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting seller: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to reject seller")


@router.post(
    "/sellers/{seller_id}/suspend",
    response_model=SuccessResponse,
    summary="Suspend Seller",
    description="Suspend seller account"
)
@rate_limit(requests_per_minute=20)
async def suspend_seller(
    request: Request,
    seller_id: str = Path(..., description="Seller ID"),
    suspension_reason: str = Query(..., description="Suspension reason"),
    admin_user: dict = Depends(get_admin_user)
):
    """Suspend seller"""
    try:
        await log_api_event(
            request=request,
            user_id=admin_user['uid'],
            action="suspend_seller",
            resource_id=seller_id,
            metadata={"suspension_reason": suspension_reason}
        )
        
        result = await marketplace_service.moderate_seller(
            seller_id, SellerStatus.suspended, admin_user['uid'], suspension_reason
        )
        
        if result['success']:
            return SuccessResponse(message=result['message'])
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error suspending seller: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to suspend seller")


# =============================================================================
# MARKETPLACE ANALYTICS & INSIGHTS
# =============================================================================

@router.get(
    "/analytics/overview",
    response_model=AdminAnalyticsResponse,
    summary="Marketplace Analytics Overview",
    description="Get comprehensive marketplace analytics for admins"
)
@rate_limit(requests_per_minute=100)
async def get_marketplace_analytics(
    request: Request,
    period: str = Query("30d", description="Time period: 7d, 30d, 90d, 1y"),
    admin_user: dict = Depends(get_admin_user)
):
    """Get marketplace analytics overview"""
    try:
        await log_api_event(
            request=request,
            user_id=admin_user['uid'],
            action="get_marketplace_analytics",
            metadata={"period": period}
        )
        
        analytics = await marketplace_service.get_admin_analytics(period)
        return analytics
        
    except Exception as e:
        logger.error(f"Error getting marketplace analytics: {str(e)}")
        # Return empty analytics on error
        return AdminAnalyticsResponse(
            total_nexas=0, total_sellers=0, total_purchases=0, total_revenue=0.0,
            active_nexas=0, verified_sellers=0, pending_nexas=0, pending_sellers=0,
            conversion_rate=0.0, avg_purchase_value=0.0,
            revenue_chart=[], sales_chart=[], top_categories=[],
            top_sellers=[], recent_activity=[]
        )


@router.get(
    "/analytics/sales",
    response_model=dict,
    summary="Sales Analytics",
    description="Get detailed sales analytics and trends"
)
@rate_limit(requests_per_minute=100)
async def get_sales_analytics(
    request: Request,
    period: str = Query("30d", description="Time period"),
    breakdown: str = Query("daily", description="Breakdown: hourly, daily, weekly, monthly"),
    admin_user: dict = Depends(get_admin_user)
):
    """Get sales analytics"""
    try:
        await log_api_event(
            request=request,
            user_id=admin_user['uid'],
            action="get_sales_analytics",
            metadata={"period": period, "breakdown": breakdown}
        )
        
        result = await marketplace_service.get_sales_analytics(period, breakdown)
        
        if result['success']:
            return result['data']
        else:
            return {"error": result['error']}
            
    except Exception as e:
        logger.error(f"Error getting sales analytics: {str(e)}")
        return {"error": "Failed to retrieve sales analytics"}


@router.get(
    "/analytics/users",
    response_model=dict,
    summary="User Analytics",
    description="Get user behavior and engagement analytics"
)
@rate_limit(requests_per_minute=100)
async def get_user_analytics(
    request: Request,
    period: str = Query("30d", description="Time period"),
    admin_user: dict = Depends(get_admin_user)
):
    """Get user analytics"""
    try:
        await log_api_event(
            request=request,
            user_id=admin_user['uid'],
            action="get_user_analytics",
            metadata={"period": period}
        )
        
        result = await marketplace_service.get_user_analytics(period)
        
        if result['success']:
            return result['data']
        else:
            return {"error": result['error']}
            
    except Exception as e:
        logger.error(f"Error getting user analytics: {str(e)}")
        return {"error": "Failed to retrieve user analytics"}


# =============================================================================
# DISPUTE MANAGEMENT
# =============================================================================

@router.get(
    "/disputes",
    response_model=List[dict],
    summary="Active Disputes",
    description="Get all active disputes and refund requests"
)
@rate_limit(requests_per_minute=50)
async def get_active_disputes(
    request: Request,
    status: Optional[str] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    admin_user: dict = Depends(get_admin_user)
):
    """Get active disputes"""
    try:
        await log_api_event(
            request=request,
            user_id=admin_user['uid'],
            action="get_active_disputes",
            metadata={"status": status, "page": page}
        )
        
        result = await marketplace_service.get_admin_disputes(status, page, page_size)
        return result
        
    except Exception as e:
        logger.error(f"Error getting disputes: {str(e)}")
        return []


@router.post(
    "/disputes/{dispute_id}/resolve",
    response_model=SuccessResponse,
    summary="Resolve Dispute",
    description="Resolve a dispute with admin decision"
)
@rate_limit(requests_per_minute=30)
async def resolve_dispute(
    request: Request,
    dispute_id: str = Path(..., description="Dispute ID"),
    resolution: str = Query(..., description="Resolution: approve_refund, deny_refund, partial_refund"),
    resolution_note: Optional[str] = Query(None, description="Resolution note"),
    refund_amount: Optional[float] = Query(None, description="Partial refund amount"),
    admin_user: dict = Depends(get_admin_user)
):
    """Resolve dispute"""
    try:
        await log_api_event(
            request=request,
            user_id=admin_user['uid'],
            action="resolve_dispute",
            resource_id=dispute_id,
            metadata={"resolution": resolution, "refund_amount": refund_amount}
        )
        
        result = await marketplace_service.resolve_dispute(
            dispute_id, resolution, admin_user['uid'], resolution_note, refund_amount
        )
        
        if result['success']:
            return SuccessResponse(message=result['message'])
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resolving dispute: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to resolve dispute")


# =============================================================================
# SYSTEM CONFIGURATION
# =============================================================================

@router.get(
    "/config/fees",
    response_model=dict,
    summary="Get Fee Configuration",
    description="Get current marketplace fee structure"
)
@rate_limit(requests_per_minute=50)
async def get_fee_config(
    request: Request,
    admin_user: dict = Depends(get_admin_user)
):
    """Get fee configuration"""
    try:
        await log_api_event(
            request=request,
            user_id=admin_user['uid'],
            action="get_fee_config"
        )
        
        result = await marketplace_service.get_fee_configuration()
        return result
        
    except Exception as e:
        logger.error(f"Error getting fee config: {str(e)}")
        return {"error": "Failed to retrieve fee configuration"}


@router.put(
    "/config/fees",
    response_model=SuccessResponse,
    summary="Update Fee Configuration",
    description="Update marketplace fee structure (Super Admin only)"
)
@rate_limit(requests_per_minute=10)
async def update_fee_config(
    request: Request,
    fee_config: dict,
    super_admin_user: dict = Depends(get_super_admin_user)
):
    """Update fee configuration"""
    try:
        await log_api_event(
            request=request,
            user_id=super_admin_user['uid'],
            action="update_fee_config",
            metadata=fee_config
        )
        
        result = await marketplace_service.update_fee_configuration(
            fee_config, super_admin_user['uid']
        )
        
        if result['success']:
            return SuccessResponse(message=result['message'])
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating fee config: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update fee configuration")


@router.get(
    "/config/categories",
    response_model=List[dict],
    summary="Get Category Configuration",
    description="Get marketplace categories and their settings"
)
@rate_limit(requests_per_minute=50)
async def get_category_config(
    request: Request,
    admin_user: dict = Depends(get_admin_user)
):
    """Get category configuration"""
    try:
        await log_api_event(
            request=request,
            user_id=admin_user['uid'],
            action="get_category_config"
        )
        
        result = await marketplace_service.get_category_configuration()
        return result
        
    except Exception as e:
        logger.error(f"Error getting category config: {str(e)}")
        return []


@router.post(
    "/config/categories",
    response_model=SuccessResponse,
    summary="Add New Category",
    description="Add new marketplace category (Super Admin only)"
)
@rate_limit(requests_per_minute=20)
async def add_category(
    request: Request,
    category_data: dict,
    super_admin_user: dict = Depends(get_super_admin_user)
):
    """Add new category"""
    try:
        await log_api_event(
            request=request,
            user_id=super_admin_user['uid'],
            action="add_category",
            metadata=category_data
        )
        
        result = await marketplace_service.add_category(
            category_data, super_admin_user['uid']
        )
        
        if result['success']:
            return SuccessResponse(message=result['message'])
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding category: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add category")


# =============================================================================
# AUDIT LOGS & MONITORING
# =============================================================================

@router.get(
    "/audit-logs",
    response_model=List[dict],
    summary="Get Audit Logs",
    description="Get marketplace audit logs and admin actions"
)
@rate_limit(requests_per_minute=100)
async def get_audit_logs(
    request: Request,
    action: Optional[str] = Query(None, description="Filter by action type"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    start_date: Optional[datetime] = Query(None, description="Filter from date"),
    end_date: Optional[datetime] = Query(None, description="Filter to date"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    admin_user: dict = Depends(get_admin_user)
):
    """Get audit logs"""
    try:
        await log_api_event(
            request=request,
            user_id=admin_user['uid'],
            action="get_audit_logs",
            metadata={"action_filter": action, "target_user": user_id, "page": page}
        )
        
        result = await marketplace_service.get_audit_logs(
            action, user_id, start_date, end_date, page, page_size
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting audit logs: {str(e)}")
        return []