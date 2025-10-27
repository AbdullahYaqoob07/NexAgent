from fastapi import APIRouter, HTTPException, Depends, Query, Path, BackgroundTasks, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
from datetime import datetime, timedelta
import logging

from app.models.marketplace_models import (
    PurchaseCreateRequest, PurchaseResponse, PurchaseListResponse,
    RefundRequest, RefundResponse, CheckoutSessionRequest, CheckoutSessionResponse,
    SuccessResponse, ErrorResponse, PurchaseStatus
)
from app.services.marketplace_service import marketplace_service
from app.services.firebase_service import FirebaseService
from app.core.security import rate_limit
from app.core.logging import log_api_event

logger = logging.getLogger(__name__)
security = HTTPBearer()

# Create router
router = APIRouter(
    prefix="/purchases",
    tags=["🏪 Marketplace - Purchases"],
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


# =============================================================================
# CHECKOUT & PAYMENT PROCESSING
# =============================================================================

@router.post(
    "/checkout",
    response_model=CheckoutSessionResponse,
    status_code=201,
    summary="Create Checkout Session",
    description="Create Stripe checkout session for purchasing a Nexa"
)
@rate_limit(requests_per_minute=50)
async def create_checkout_session(
    request: Request,
    checkout_data: CheckoutSessionRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Create checkout session for Nexa purchase"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="create_checkout_session",
            resource_id=checkout_data.nexa_id,
            metadata={"payment_method": checkout_data.payment_method}
        )
        
        result = await marketplace_service.create_checkout_session(checkout_data, current_user['uid'])
        
        if result['success']:
            return CheckoutSessionResponse(
                checkout_url=result['checkout_url'],
                session_id=result['session_id'],
                expires_at=result['expires_at']
            )
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating checkout session: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session")


@router.post(
    "/direct-purchase",
    response_model=SuccessResponse,
    status_code=201,
    summary="Direct Purchase",
    description="Process direct purchase using saved payment method"
)
@rate_limit(requests_per_minute=30)
async def direct_purchase(
    request: Request,
    purchase_data: PurchaseCreateRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Process direct purchase"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="direct_purchase",
            resource_id=purchase_data.nexa_id,
            metadata={"payment_method_id": purchase_data.payment_method_id}
        )
        
        result = await marketplace_service.process_direct_purchase(purchase_data, current_user['uid'])
        
        if result['success']:
            return SuccessResponse(
                message=result['message'],
                data={
                    "purchase_id": result['purchase_id'],
                    "payment_intent_id": result.get('payment_intent_id'),
                    "status": result.get('status')
                }
            )
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing direct purchase: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process purchase")


@router.post(
    "/confirm-payment",
    response_model=SuccessResponse,
    summary="Confirm Payment",
    description="Confirm payment intent and complete purchase"
)
@rate_limit(requests_per_minute=100)
async def confirm_payment(
    request: Request,
    payment_intent_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Confirm payment and complete purchase"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="confirm_payment",
            metadata={"payment_intent_id": payment_intent_id}
        )
        
        result = await marketplace_service.confirm_payment(payment_intent_id, current_user['uid'])
        
        if result['success']:
            return SuccessResponse(
                message=result['message'],
                data={
                    "purchase_id": result.get('purchase_id'),
                    "status": result.get('status')
                }
            )
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirming payment: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to confirm payment")


# =============================================================================
# PURCHASE MANAGEMENT
# =============================================================================

@router.get(
    "/",
    response_model=PurchaseListResponse,
    summary="My Purchases",
    description="Get user's purchase history with filtering options"
)
@rate_limit(requests_per_minute=100)
async def get_my_purchases(
    request: Request,
    status: Optional[PurchaseStatus] = Query(None, description="Filter by status"),
    start_date: Optional[datetime] = Query(None, description="Filter from date"),
    end_date: Optional[datetime] = Query(None, description="Filter to date"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: dict = Depends(get_current_user)
):
    """Get user's purchase history"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="get_my_purchases",
            metadata={"status": status, "page": page}
        )
        
        result = await marketplace_service.get_user_purchases(
            current_user['uid'], status, start_date, end_date, page, page_size
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting user purchases: {str(e)}")
        return PurchaseListResponse(
            purchases=[], total=0, page=1, page_size=page_size,
            total_pages=0, has_next=False, has_prev=False
        )


@router.get(
    "/{purchase_id}",
    response_model=PurchaseResponse,
    summary="Get Purchase Details",
    description="Get detailed information about a specific purchase"
)
@rate_limit(requests_per_minute=200)
async def get_purchase_details(
    request: Request,
    purchase_id: str = Path(..., description="Purchase ID"),
    current_user: dict = Depends(get_current_user)
):
    """Get purchase details"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="get_purchase_details",
            resource_id=purchase_id
        )
        
        purchase = await marketplace_service.get_purchase_details(purchase_id, current_user['uid'])
        
        if not purchase:
            raise HTTPException(status_code=404, detail="Purchase not found")
        
        return purchase
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting purchase details: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve purchase details")


@router.get(
    "/{purchase_id}/download",
    response_model=dict,
    summary="Download Purchased Nexa",
    description="Get download link for purchased Nexa"
)
@rate_limit(requests_per_minute=50)
async def download_purchased_nexa(
    request: Request,
    purchase_id: str = Path(..., description="Purchase ID"),
    current_user: dict = Depends(get_current_user)
):
    """Get download link for purchased Nexa"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="download_purchased_nexa",
            resource_id=purchase_id
        )
        
        result = await marketplace_service.get_download_link(purchase_id, current_user['uid'])
        
        if result['success']:
            return {
                "download_url": result['download_url'],
                "expires_at": result['expires_at'],
                "file_name": result.get('file_name'),
                "file_size": result.get('file_size')
            }
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting download link: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate download link")


# =============================================================================
# REFUNDS & DISPUTES
# =============================================================================

@router.post(
    "/{purchase_id}/refund",
    response_model=SuccessResponse,
    summary="Request Refund",
    description="Request refund for a purchase"
)
@rate_limit(requests_per_minute=10)
async def request_refund(
    request: Request,
    refund_data: RefundRequest,
    purchase_id: str = Path(..., description="Purchase ID"),
    current_user: dict = Depends(get_current_user)
):
    """Request refund for purchase"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="request_refund",
            resource_id=purchase_id,
            metadata={"reason": refund_data.reason}
        )
        
        result = await marketplace_service.request_refund(purchase_id, current_user['uid'], refund_data)
        
        if result['success']:
            return SuccessResponse(
                message=result['message'],
                data={
                    "refund_id": result.get('refund_id'),
                    "status": result.get('status'),
                    "estimated_processing_time": result.get('processing_time')
                }
            )
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error requesting refund: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to request refund")


@router.get(
    "/{purchase_id}/refund",
    response_model=RefundResponse,
    summary="Get Refund Status",
    description="Get refund status and details for a purchase"
)
@rate_limit(requests_per_minute=50)
async def get_refund_status(
    request: Request,
    purchase_id: str = Path(..., description="Purchase ID"),
    current_user: dict = Depends(get_current_user)
):
    """Get refund status"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="get_refund_status",
            resource_id=purchase_id
        )
        
        refund = await marketplace_service.get_refund_status(purchase_id, current_user['uid'])
        
        if not refund:
            raise HTTPException(status_code=404, detail="Refund not found")
        
        return refund
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting refund status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve refund status")


@router.delete(
    "/{purchase_id}/refund",
    response_model=SuccessResponse,
    summary="Cancel Refund Request",
    description="Cancel pending refund request"
)
@rate_limit(requests_per_minute=20)
async def cancel_refund_request(
    request: Request,
    purchase_id: str = Path(..., description="Purchase ID"),
    current_user: dict = Depends(get_current_user)
):
    """Cancel refund request"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="cancel_refund_request",
            resource_id=purchase_id
        )
        
        result = await marketplace_service.cancel_refund_request(purchase_id, current_user['uid'])
        
        if result['success']:
            return SuccessResponse(message=result['message'])
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error canceling refund: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to cancel refund")


# =============================================================================
# INVOICE & RECEIPTS
# =============================================================================

@router.get(
    "/{purchase_id}/invoice",
    response_model=dict,
    summary="Get Purchase Invoice",
    description="Get invoice/receipt for a purchase"
)
@rate_limit(requests_per_minute=100)
async def get_purchase_invoice(
    request: Request,
    purchase_id: str = Path(..., description="Purchase ID"),
    format: str = Query("json", description="Format: json, pdf"),
    current_user: dict = Depends(get_current_user)
):
    """Get purchase invoice"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="get_purchase_invoice",
            resource_id=purchase_id,
            metadata={"format": format}
        )
        
        result = await marketplace_service.get_purchase_invoice(purchase_id, current_user['uid'], format)
        
        if result['success']:
            return result['data']
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting invoice: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate invoice")


# =============================================================================
# PURCHASE ANALYTICS & INSIGHTS
# =============================================================================

@router.get(
    "/analytics/summary",
    response_model=dict,
    summary="Purchase Analytics",
    description="Get user's purchase analytics and spending insights"
)
@rate_limit(requests_per_minute=50)
async def get_purchase_analytics(
    request: Request,
    period: str = Query("30d", description="Time period: 7d, 30d, 90d, 1y, all"),
    current_user: dict = Depends(get_current_user)
):
    """Get purchase analytics"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="get_purchase_analytics",
            metadata={"period": period}
        )
        
        result = await marketplace_service.get_purchase_analytics(current_user['uid'], period)
        
        if result['success']:
            return result['data']
        else:
            return {
                "total_purchases": 0,
                "total_spent": 0.0,
                "avg_purchase_value": 0.0,
                "favorite_categories": [],
                "spending_chart": [],
                "recent_purchases": []
            }
            
    except Exception as e:
        logger.error(f"Error getting purchase analytics: {str(e)}")
        return {
            "total_purchases": 0,
            "total_spent": 0.0,
            "avg_purchase_value": 0.0,
            "favorite_categories": [],
            "spending_chart": [],
            "recent_purchases": []
        }


# =============================================================================
# PAYMENT METHODS MANAGEMENT
# =============================================================================

@router.get(
    "/payment-methods",
    response_model=List[dict],
    summary="Get Payment Methods",
    description="Get user's saved payment methods"
)
@rate_limit(requests_per_minute=100)
async def get_payment_methods(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get user's payment methods"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="get_payment_methods"
        )
        
        result = await marketplace_service.get_user_payment_methods(current_user['uid'])
        
        if result['success']:
            return result['payment_methods']
        else:
            return []
            
    except Exception as e:
        logger.error(f"Error getting payment methods: {str(e)}")
        return []


@router.post(
    "/payment-methods",
    response_model=SuccessResponse,
    summary="Add Payment Method",
    description="Add new payment method to user account"
)
@rate_limit(requests_per_minute=20)
async def add_payment_method(
    request: Request,
    payment_method_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Add payment method"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="add_payment_method"
        )
        
        result = await marketplace_service.add_payment_method(current_user['uid'], payment_method_data)
        
        if result['success']:
            return SuccessResponse(
                message=result['message'],
                data={"payment_method_id": result.get('payment_method_id')}
            )
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding payment method: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add payment method")


@router.delete(
    "/payment-methods/{payment_method_id}",
    response_model=SuccessResponse,
    summary="Remove Payment Method",
    description="Remove saved payment method"
)
@rate_limit(requests_per_minute=20)
async def remove_payment_method(
    request: Request,
    payment_method_id: str = Path(..., description="Payment Method ID"),
    current_user: dict = Depends(get_current_user)
):
    """Remove payment method"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="remove_payment_method",
            resource_id=payment_method_id
        )
        
        result = await marketplace_service.remove_payment_method(current_user['uid'], payment_method_id)
        
        if result['success']:
            return SuccessResponse(message=result['message'])
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing payment method: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to remove payment method")