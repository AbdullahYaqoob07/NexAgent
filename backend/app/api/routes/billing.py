from typing import Dict, List, Optional, Any
from datetime import datetime
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Body, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.services.billing_service import billing_service
from app.models.billing_models import (
    # Request models
    PlanCreateRequest, PlanUpdateRequest, 
    SubscriptionCreateRequest, SubscriptionUpdateRequest,
    UsageTrackingRequest, UsageAdjustmentRequest, UsageResetRequest,
    PaymentMethodCreateRequest, CheckoutSessionCreateRequest, BillingPortalRequest,
    CouponCreateRequest, CouponUpdateRequest, SubscriptionPauseRequest, SubscriptionResumeRequest,
    RefundCreateRequest, TaxCalculationRequest,
    
    # Response models
    PlanResponse, SubscriptionResponse, UsageResponse,
    InvoiceResponse, PaymentMethodResponse, InvoiceListResponse, PaymentMethodListResponse,
    SubscriptionHistoryResponse, CheckoutSessionResponse, BillingPortalResponse,
    CouponResponse, RefundResponse, RefundListResponse, TaxCalculationResponse,
    AdminAnalyticsResponse, AdminUserListResponse, WebhookEventResponse,
    
    # Enums
    UsageMetric, BillingCycle, SubscriptionStatus
)
from app.core.auth_dependency import get_current_user, get_admin_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/billing", tags=["billing"])
security = HTTPBearer()


# =============================================================================
# PLAN MANAGEMENT ROUTES
# =============================================================================

@router.post("/plans", response_model=PlanResponse)
async def create_plan(
    plan_data: PlanCreateRequest,
    current_user: dict = Depends(get_admin_user)
):
    """
    Create a new billing plan
    
    **Admin only endpoint**
    """
    try:
        result = await billing_service.create_plan(plan_data, current_user["uid"])
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating plan: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/plans", response_model=List[PlanResponse])
async def get_all_plans(
    active_only: bool = Query(True, description="Only return active plans"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get all billing plans
    
    Query parameters:
    - **active_only**: Filter to only active plans (default: true)
    """
    try:
        plans = await billing_service.get_all_plans(active_only)
        return plans
        
    except Exception as e:
        logger.error(f"Error getting plans: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/plans/{plan_id}", response_model=PlanResponse)
async def get_plan(
    plan_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get specific plan by ID"""
    try:
        plan = await billing_service.get_plan(plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        return plan
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting plan {plan_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/plans/{plan_id}", response_model=Dict[str, str])
async def update_plan(
    plan_id: str,
    update_data: PlanUpdateRequest,
    current_user: dict = Depends(get_admin_user)
):
    """
    Update billing plan
    
    **Admin only endpoint**
    """
    try:
        success = await billing_service.update_plan(plan_id, update_data, current_user["uid"])
        
        if not success:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        return {"message": "Plan updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating plan {plan_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# SUBSCRIPTION MANAGEMENT ROUTES  
# =============================================================================

@router.post("/subscriptions", response_model=SubscriptionResponse)
async def create_subscription(
    subscription_data: SubscriptionCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new subscription for the current user
    
    Creates both Stripe subscription and internal tracking
    """
    try:
        user_id = current_user["uid"]
        result = await billing_service.create_subscription(user_id, subscription_data)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating subscription: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/subscriptions/me", response_model=SubscriptionResponse)
async def get_my_subscription(
    current_user: dict = Depends(get_current_user)
):
    """Get current user's active subscription"""
    try:
        user_id = current_user["uid"]
        subscription = await billing_service.get_user_subscription(user_id)
        
        if not subscription:
            raise HTTPException(status_code=404, detail="No active subscription found")
        
        return subscription
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user subscription: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/subscriptions/{subscription_id}", response_model=Dict[str, str])
async def update_subscription(
    subscription_id: str,
    update_data: SubscriptionUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update subscription"""
    try:
        # Verify user owns this subscription
        user_subscription = await billing_service.get_user_subscription(current_user["uid"])
        if not user_subscription or user_subscription.id != subscription_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        success = await billing_service.update_subscription(subscription_id, update_data)
        
        if not success:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        return {"message": "Subscription updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating subscription: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/subscriptions/me", response_model=Dict[str, str])
async def cancel_my_subscription(
    cancel_at_period_end: bool = Query(True, description="Cancel at end of current billing period"),
    current_user: dict = Depends(get_current_user)
):
    """
    Cancel current user's subscription
    
    Query parameters:
    - **cancel_at_period_end**: If true, subscription continues until end of billing period (default: true)
    """
    try:
        user_id = current_user["uid"]
        success = await billing_service.cancel_subscription(user_id, cancel_at_period_end)
        
        if not success:
            raise HTTPException(status_code=404, detail="No subscription to cancel")
        
        message = ("Subscription will be canceled at the end of the current billing period" 
                  if cancel_at_period_end 
                  else "Subscription canceled immediately")
        
        return {"message": message}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error canceling subscription: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# USAGE TRACKING ROUTES
# =============================================================================

@router.post("/usage/track", response_model=Dict[str, str])
async def track_usage(
    request: UsageTrackingRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Track usage for current user
    
    Automatically enforces usage limits based on subscription plan
    """
    try:
        # Ensure user is tracking their own usage (unless admin)
        if not current_user.get("isAdmin", False) and request.user_id != current_user["uid"]:
            request.user_id = current_user["uid"]
        
        success = await billing_service.track_usage(request)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to track usage")
        
        return {"message": "Usage tracked successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error tracking usage: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/usage/me", response_model=UsageResponse)
async def get_my_usage(
    period: Optional[str] = Query(None, description="Usage period (YYYY-MM format)"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get current user's usage data
    
    Query parameters:
    - **period**: Specific month to get usage for (format: YYYY-MM). Defaults to current month.
    """
    try:
        user_id = current_user["uid"]
        usage = await billing_service.get_user_usage(user_id, period)
        return usage
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user usage: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/usage/check-limit", response_model=Dict[str, Any])
async def check_usage_limit(
    metric: UsageMetric = Query(..., description="Usage metric to check"),
    additional_usage: float = Query(0, description="Additional usage to check against limits"),
    current_user: dict = Depends(get_current_user)
):
    """
    Check if additional usage would exceed limits
    
    Query parameters:
    - **metric**: The usage metric to check
    - **additional_usage**: Amount of additional usage to test (default: 0)
    """
    try:
        user_id = current_user["uid"]
        limit_check = await billing_service.check_usage_limit(user_id, metric, additional_usage)
        return limit_check
        
    except Exception as e:
        logger.error(f"Error checking usage limits: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# ADMIN ROUTES
# =============================================================================

@router.get("/admin/analytics", response_model=AdminAnalyticsResponse)
async def get_admin_analytics(
    period_days: int = Query(30, ge=1, le=365, description="Number of days to include in analytics"),
    current_user: dict = Depends(get_admin_user)
):
    """
    Get comprehensive billing analytics
    
    **Admin only endpoint**
    
    Query parameters:
    - **period_days**: Number of days to analyze (1-365, default: 30)
    """
    try:
        analytics = await billing_service.get_admin_analytics(period_days)
        return analytics
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting admin analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/admin/users", response_model=AdminUserListResponse)
async def get_admin_user_list(
    plan: Optional[str] = Query(None, description="Filter by plan ID"),
    status: Optional[SubscriptionStatus] = Query(None, description="Filter by subscription status"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of users to return"),
    current_user: dict = Depends(get_admin_user)
):
    """
    Get user list with billing information
    
    **Admin only endpoint**
    
    Query parameters:
    - **plan**: Filter by specific plan ID
    - **status**: Filter by subscription status
    - **limit**: Maximum users to return (1-1000, default: 100)
    """
    try:
        criteria = {}
        if plan:
            criteria['plan'] = plan
        if status:
            criteria['status'] = status.value
        
        user_list = await billing_service.get_admin_user_list(criteria, limit)
        return user_list
        
    except Exception as e:
        logger.error(f"Error getting admin user list: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/admin/users/{user_id}/subscription", response_model=SubscriptionResponse)
async def get_user_subscription_admin(
    user_id: str,
    current_user: dict = Depends(get_admin_user)
):
    """
    Get any user's subscription (admin only)
    
    **Admin only endpoint**
    """
    try:
        subscription = await billing_service.get_user_subscription(user_id)
        if not subscription:
            raise HTTPException(status_code=404, detail="User has no subscription")
        
        return subscription
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user subscription: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/admin/users/{user_id}/usage", response_model=UsageResponse)
async def get_user_usage_admin(
    user_id: str,
    period: Optional[str] = Query(None, description="Usage period (YYYY-MM format)"),
    current_user: dict = Depends(get_admin_user)
):
    """
    Get any user's usage data (admin only)
    
    **Admin only endpoint**
    """
    try:
        usage = await billing_service.get_user_usage(user_id, period)
        return usage
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user usage: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/admin/users/{user_id}/subscription", response_model=Dict[str, str])
async def update_user_subscription_admin(
    user_id: str,
    update_data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_admin_user)
):
    """
    Update any user's subscription (admin only)
    
    **Admin only endpoint**
    """
    try:
        success = await billing_service.admin_update_user_subscription(user_id, update_data)
        
        if not success:
            raise HTTPException(status_code=404, detail="User has no subscription")
        
        return {"message": "User subscription updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user subscription: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# WEBHOOK ROUTES
# =============================================================================

@router.post("/webhooks/stripe", response_model=WebhookEventResponse)
async def stripe_webhook(
    request_body: bytes = Body(...),
    stripe_signature: str = Header(None, alias="stripe-signature")
):
    """
    Handle Stripe webhook events
    
    This endpoint processes Stripe webhook events for payment and subscription updates
    """
    try:
        # Verify webhook signature (simplified - in production you'd use proper verification)
        import json
        event_data = json.loads(request_body.decode('utf-8'))
        
        # Process the webhook
        result = await billing_service.handle_stripe_webhook(event_data)
        return result
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    except Exception as e:
        logger.error(f"Error handling Stripe webhook: {str(e)}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")


# =============================================================================
# HEALTH CHECK ROUTE
# =============================================================================

# =============================================================================
# INVOICE ROUTES
# =============================================================================

@router.get("/invoices", response_model=InvoiceListResponse)
async def get_my_invoices(
    limit: int = Query(10, ge=1, le=100, description="Number of invoices to retrieve"),
    starting_after: Optional[str] = Query(None, description="Cursor for pagination"),
    current_user: dict = Depends(get_current_user)
):
    """Get current user's invoices"""
    try:
        user_id = current_user["uid"]
        invoices = await billing_service.get_user_invoices(user_id, limit, starting_after)
        return invoices
    except Exception as e:
        logger.error(f"Error getting user invoices: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get specific invoice details"""
    try:
        invoice = await billing_service.get_invoice(invoice_id, current_user["uid"])
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        return invoice
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting invoice: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# PAYMENT METHOD ROUTES
# =============================================================================

@router.get("/payment-methods", response_model=PaymentMethodListResponse)
async def get_payment_methods(
    current_user: dict = Depends(get_current_user)
):
    """Get user's payment methods"""
    try:
        user_id = current_user["uid"]
        payment_methods = await billing_service.get_payment_methods(user_id)
        return payment_methods
    except Exception as e:
        logger.error(f"Error getting payment methods: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/payment-methods", response_model=PaymentMethodResponse)
async def add_payment_method(
    request: PaymentMethodCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Add new payment method"""
    try:
        user_id = current_user["uid"]
        payment_method = await billing_service.add_payment_method(user_id, request)
        return payment_method
    except Exception as e:
        logger.error(f"Error adding payment method: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/payment-methods/{payment_method_id}", response_model=Dict[str, str])
async def delete_payment_method(
    payment_method_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete payment method"""
    try:
        user_id = current_user["uid"]
        success = await billing_service.delete_payment_method(user_id, payment_method_id)
        if not success:
            raise HTTPException(status_code=404, detail="Payment method not found")
        return {"message": "Payment method deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting payment method: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# PLAN DELETION ROUTE
# =============================================================================

@router.delete("/plans/{plan_id}", response_model=Dict[str, str])
async def delete_plan(
    plan_id: str,
    current_user: dict = Depends(get_admin_user)
):
    """Delete billing plan (Admin only)"""
    try:
        success = await billing_service.delete_plan(plan_id, current_user["uid"])
        if not success:
            raise HTTPException(status_code=404, detail="Plan not found")
        return {"message": "Plan deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting plan: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# SUBSCRIPTION HISTORY ROUTES
# =============================================================================

@router.get("/subscriptions/history", response_model=SubscriptionHistoryResponse)
async def get_subscription_history(
    limit: int = Query(10, ge=1, le=100, description="Number of subscriptions to retrieve"),
    current_user: dict = Depends(get_current_user)
):
    """Get user's subscription history"""
    try:
        user_id = current_user["uid"]
        history = await billing_service.get_subscription_history(user_id, limit)
        return history
    except Exception as e:
        logger.error(f"Error getting subscription history: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# SUBSCRIPTION CONTROL ROUTES
# =============================================================================

@router.post("/subscriptions/pause", response_model=Dict[str, str])
async def pause_subscription(
    request: SubscriptionPauseRequest,
    current_user: dict = Depends(get_current_user)
):
    """Pause current subscription"""
    try:
        user_id = current_user["uid"]
        success = await billing_service.pause_subscription(user_id, request)
        if not success:
            raise HTTPException(status_code=404, detail="No active subscription to pause")
        return {"message": "Subscription paused successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error pausing subscription: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/subscriptions/resume", response_model=Dict[str, str])
async def resume_subscription(
    request: SubscriptionResumeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Resume paused subscription"""
    try:
        user_id = current_user["uid"]
        success = await billing_service.resume_subscription(user_id, request)
        if not success:
            raise HTTPException(status_code=404, detail="No paused subscription to resume")
        return {"message": "Subscription resumed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resuming subscription: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# USAGE ADJUSTMENT ROUTES (ADMIN)
# =============================================================================

@router.post("/admin/usage/adjust", response_model=Dict[str, str])
async def adjust_user_usage(
    request: UsageAdjustmentRequest,
    current_user: dict = Depends(get_admin_user)
):
    """Adjust user usage (Admin only)"""
    try:
        success = await billing_service.adjust_user_usage(request, current_user["uid"])
        if not success:
            raise HTTPException(status_code=404, detail="Failed to adjust usage")
        return {"message": "Usage adjusted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adjusting usage: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/admin/usage/reset", response_model=Dict[str, str])
async def reset_user_usage(
    request: UsageResetRequest,
    current_user: dict = Depends(get_admin_user)
):
    """Reset user usage (Admin only)"""
    try:
        success = await billing_service.reset_user_usage(request, current_user["uid"])
        if not success:
            raise HTTPException(status_code=404, detail="Failed to reset usage")
        return {"message": "Usage reset successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting usage: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# CHECKOUT & BILLING PORTAL ROUTES
# =============================================================================

@router.post("/checkout/session", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    request: CheckoutSessionCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create Stripe checkout session"""
    try:
        user_id = current_user["uid"]
        session = await billing_service.create_checkout_session(user_id, request)
        return session
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating checkout session: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/portal/session", response_model=BillingPortalResponse)
async def create_billing_portal_session(
    request: BillingPortalRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create Stripe billing portal session"""
    try:
        user_id = current_user["uid"]
        session = await billing_service.create_billing_portal_session(user_id, request)
        return session
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating billing portal session: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# COUPON MANAGEMENT ROUTES (ADMIN)
# =============================================================================

@router.post("/admin/coupons", response_model=CouponResponse)
async def create_coupon(
    request: CouponCreateRequest,
    current_user: dict = Depends(get_admin_user)
):
    """Create discount coupon (Admin only)"""
    try:
        coupon = await billing_service.create_coupon(request, current_user["uid"])
        return coupon
    except Exception as e:
        logger.error(f"Error creating coupon: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/admin/coupons", response_model=List[CouponResponse])
async def get_all_coupons(
    active_only: bool = Query(True, description="Only return active coupons"),
    current_user: dict = Depends(get_admin_user)
):
    """Get all coupons (Admin only)"""
    try:
        coupons = await billing_service.get_all_coupons(active_only)
        return coupons
    except Exception as e:
        logger.error(f"Error getting coupons: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/admin/coupons/{coupon_id}", response_model=CouponResponse)
async def update_coupon(
    coupon_id: str,
    request: CouponUpdateRequest,
    current_user: dict = Depends(get_admin_user)
):
    """Update coupon (Admin only)"""
    try:
        coupon = await billing_service.update_coupon(coupon_id, request, current_user["uid"])
        if not coupon:
            raise HTTPException(status_code=404, detail="Coupon not found")
        return coupon
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating coupon: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/admin/coupons/{coupon_id}", response_model=Dict[str, str])
async def delete_coupon(
    coupon_id: str,
    current_user: dict = Depends(get_admin_user)
):
    """Delete coupon (Admin only)"""
    try:
        success = await billing_service.delete_coupon(coupon_id, current_user["uid"])
        if not success:
            raise HTTPException(status_code=404, detail="Coupon not found")
        return {"message": "Coupon deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting coupon: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# REFUND ROUTES (ADMIN)
# =============================================================================

@router.post("/admin/refunds", response_model=RefundResponse)
async def create_refund(
    request: RefundCreateRequest,
    current_user: dict = Depends(get_admin_user)
):
    """Create refund (Admin only)"""
    try:
        refund = await billing_service.create_refund(request, current_user["uid"])
        return refund
    except Exception as e:
        logger.error(f"Error creating refund: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/admin/refunds", response_model=RefundListResponse)
async def get_all_refunds(
    limit: int = Query(50, ge=1, le=100, description="Number of refunds to retrieve"),
    starting_after: Optional[str] = Query(None, description="Cursor for pagination"),
    current_user: dict = Depends(get_admin_user)
):
    """Get all refunds (Admin only)"""
    try:
        refunds = await billing_service.get_all_refunds(limit, starting_after)
        return refunds
    except Exception as e:
        logger.error(f"Error getting refunds: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# TAX CALCULATION ROUTES
# =============================================================================

@router.post("/tax/calculate", response_model=TaxCalculationResponse)
async def calculate_tax(
    request: TaxCalculationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Calculate tax for amount and location"""
    try:
        tax_calculation = await billing_service.calculate_tax(request)
        return tax_calculation
    except Exception as e:
        logger.error(f"Error calculating tax: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# HEALTH CHECK ROUTE
# =============================================================================

@router.get("/health", response_model=Dict[str, str])
async def billing_health_check():
    """Health check endpoint for billing service"""
    return {
        "status": "healthy",
        "service": "billing",
        "timestamp": datetime.utcnow().isoformat()
    }
