from pydantic import BaseModel, Field, validator, root_validator, EmailStr
from typing import Optional, List, Dict, Any, Literal, Union
from datetime import datetime
from enum import Enum
from decimal import Decimal


# =============================================================================
# ENUMS
# =============================================================================

class PlanType(str, Enum):
    """Available subscription plans"""
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class BillingCycle(str, Enum):
    """Billing cycle options"""
    MONTHLY = "monthly"
    YEARLY = "yearly"


class SubscriptionStatus(str, Enum):
    """Subscription status values"""
    ACTIVE = "active"
    CANCELED = "canceled"
    PAST_DUE = "past_due"
    UNPAID = "unpaid"
    TRIALING = "trialing"
    INCOMPLETE = "incomplete"
    INCOMPLETE_EXPIRED = "incomplete_expired"


class InvoiceStatus(str, Enum):
    """Invoice status values"""
    DRAFT = "draft"
    OPEN = "open" 
    PAID = "paid"
    UNCOLLECTIBLE = "uncollectible"
    VOID = "void"


class PaymentStatus(str, Enum):
    """Payment status values"""
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELED = "canceled"
    REQUIRES_ACTION = "requires_action"


class UsageMetric(str, Enum):
    """Trackable usage metrics"""
    NEXAS = "nexas"
    EXECUTIONS = "executions"
    API_CALLS = "api_calls"
    STORAGE = "storage"
    TEAM_MEMBERS = "team_members"
    TOKENS = "tokens"


# =============================================================================
# PLAN MODELS
# =============================================================================

class PlanLimits(BaseModel):
    """Plan usage limits"""
    nexas_max: int = Field(..., ge=0, description="Maximum NexAs allowed")
    executions_per_month: int = Field(..., ge=0, description="Monthly execution limit")
    api_calls_per_month: int = Field(..., ge=0, description="Monthly API calls limit")
    storage_gb: Union[int, float] = Field(..., ge=0, description="Storage limit in GB")
    team_members: int = Field(..., ge=1, description="Team members limit")
    tokens_per_month: int = Field(..., ge=0, description="Monthly token limit")


class PlanFeatures(BaseModel):
    """Plan features and capabilities"""
    priority_support: bool = Field(default=False, description="Priority customer support")
    advanced_analytics: bool = Field(default=False, description="Advanced analytics dashboard")
    custom_integrations: bool = Field(default=False, description="Custom integration development")
    sla_guarantee: bool = Field(default=False, description="SLA guarantee")
    white_labeling: bool = Field(default=False, description="White label option")
    api_access: bool = Field(default=True, description="API access")
    webhook_notifications: bool = Field(default=True, description="Webhook notifications")


class PlanCreateRequest(BaseModel):
    """Request model for creating a subscription plan"""
    name: str = Field(..., min_length=2, max_length=50, description="Plan display name")
    description: str = Field(..., min_length=10, max_length=500, description="Plan description")
    plan_type: PlanType = Field(..., description="Plan type identifier")
    price_monthly: Decimal = Field(..., ge=0, description="Monthly price in USD")
    price_yearly: Decimal = Field(..., ge=0, description="Yearly price in USD")
    limits: PlanLimits = Field(..., description="Usage limits")
    features: PlanFeatures = Field(default_factory=PlanFeatures, description="Plan features")
    is_popular: bool = Field(default=False, description="Mark as popular plan")
    is_active: bool = Field(default=True, description="Plan availability")
    trial_days: int = Field(default=0, ge=0, le=90, description="Free trial days")
    
    @validator('price_yearly')
    def validate_yearly_discount(cls, v, values):
        """Ensure yearly price offers some discount"""
        monthly_price = values.get('price_monthly')
        if monthly_price and v > monthly_price * 10:  # More than 10 months = bad deal
            raise ValueError('Yearly price should offer discount compared to monthly')
        return v


class PlanUpdateRequest(BaseModel):
    """Request model for updating a plan"""
    name: Optional[str] = Field(None, min_length=2, max_length=50)
    description: Optional[str] = Field(None, min_length=10, max_length=500)
    price_monthly: Optional[Decimal] = Field(None, ge=0)
    price_yearly: Optional[Decimal] = Field(None, ge=0)
    limits: Optional[PlanLimits] = None
    features: Optional[PlanFeatures] = None
    is_popular: Optional[bool] = None
    is_active: Optional[bool] = None
    trial_days: Optional[int] = Field(None, ge=0, le=90)


class PlanResponse(BaseModel):
    """Response model for plan data"""
    id: str
    name: str
    description: str
    plan_type: PlanType
    price_monthly: Decimal
    price_yearly: Decimal
    limits: PlanLimits
    features: PlanFeatures
    is_popular: bool
    is_active: bool
    trial_days: int
    stripe_price_monthly_id: Optional[str]
    stripe_price_yearly_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# =============================================================================
# SUBSCRIPTION MODELS
# =============================================================================

class SubscriptionCreateRequest(BaseModel):
    """Request model for creating/upgrading subscription"""
    plan_id: str = Field(..., description="Target plan ID")
    billing_cycle: BillingCycle = Field(..., description="Billing frequency")
    payment_method_id: Optional[str] = Field(None, description="Stripe payment method ID")
    coupon_code: Optional[str] = Field(None, max_length=50, description="Discount coupon")
    trial_days: Optional[int] = Field(None, ge=0, le=90, description="Override trial days")


class SubscriptionUpdateRequest(BaseModel):
    """Request model for subscription changes"""
    plan_id: Optional[str] = None
    billing_cycle: Optional[BillingCycle] = None
    cancel_at_period_end: Optional[bool] = None
    coupon_code: Optional[str] = Field(None, max_length=50)


class SubscriptionResponse(BaseModel):
    """Response model for subscription data"""
    id: str
    user_id: str
    plan: PlanResponse
    status: SubscriptionStatus
    billing_cycle: BillingCycle
    current_period_start: datetime
    current_period_end: datetime
    next_billing_date: Optional[datetime]
    trial_start: Optional[datetime]
    trial_end: Optional[datetime]
    cancel_at_period_end: bool
    canceled_at: Optional[datetime]
    stripe_subscription_id: Optional[str]
    stripe_customer_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# =============================================================================
# USAGE TRACKING MODELS
# =============================================================================

class UsageTrackingRequest(BaseModel):
    """Request model for tracking usage"""
    metric: UsageMetric = Field(..., description="Usage metric to track")
    amount: Union[int, float] = Field(..., gt=0, description="Usage amount")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional context")
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)


class UsageResponse(BaseModel):
    """Response model for usage data"""
    metric: UsageMetric
    current_usage: Union[int, float]
    limit: Union[int, float]
    usage_percentage: float
    period_start: datetime
    period_end: datetime
    last_updated: datetime
    
    @validator('usage_percentage')
    def validate_percentage(cls, v):
        return min(max(v, 0.0), 100.0)


class UsageSummaryResponse(BaseModel):
    """Response model for complete usage summary"""
    user_id: str
    plan: PlanResponse
    current_period_start: datetime
    current_period_end: datetime
    usage_metrics: List[UsageResponse]
    warnings: List[str] = Field(default_factory=list, description="Usage warnings")
    
    class Config:
        from_attributes = True


# =============================================================================
# BILLING & INVOICE MODELS
# =============================================================================

class InvoiceLineItem(BaseModel):
    """Invoice line item"""
    description: str
    amount: Decimal
    currency: str = "USD"
    quantity: int = 1
    unit_price: Optional[Decimal] = None


class InvoiceResponse(BaseModel):
    """Response model for invoice data"""
    id: str
    user_id: str
    invoice_number: str
    status: InvoiceStatus
    subtotal: Decimal
    tax: Decimal
    total: Decimal
    currency: str
    line_items: List[InvoiceLineItem]
    billing_period_start: datetime
    billing_period_end: datetime
    due_date: Optional[datetime]
    paid_at: Optional[datetime]
    stripe_invoice_id: Optional[str]
    download_url: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class PaymentMethodResponse(BaseModel):
    """Response model for payment method"""
    id: str
    type: str
    last4: Optional[str]
    brand: Optional[str]
    exp_month: Optional[int] 
    exp_year: Optional[int]
    is_default: bool
    stripe_payment_method_id: str
    created_at: datetime


# =============================================================================
# ADMIN MODELS  
# =============================================================================

class AdminUserBillingResponse(BaseModel):
    """Admin view of user billing info"""
    user_id: str
    email: str
    display_name: Optional[str]
    subscription: SubscriptionResponse
    usage_summary: UsageSummaryResponse
    total_revenue: Decimal
    payment_methods_count: int
    invoices_count: int
    last_payment_date: Optional[datetime]
    account_age_days: int
    risk_score: float = Field(ge=0.0, le=1.0, description="Fraud/churn risk score")


class AdminAnalyticsResponse(BaseModel):
    """Admin analytics dashboard data"""
    # Revenue metrics
    mrr: Decimal = Field(..., description="Monthly Recurring Revenue")
    arr: Decimal = Field(..., description="Annual Recurring Revenue") 
    churn_rate: float = Field(..., ge=0.0, le=1.0, description="Monthly churn rate")
    
    # User metrics
    total_users: int
    paying_users: int
    trial_users: int
    canceled_users: int
    
    # Plan distribution
    users_by_plan: Dict[str, int]
    revenue_by_plan: Dict[str, Decimal]
    
    # Growth metrics
    new_subscriptions_this_month: int
    upgrades_this_month: int
    downgrades_this_month: int
    cancellations_this_month: int
    
    # Usage insights
    avg_usage_by_plan: Dict[str, Dict[str, float]]
    users_near_limits: List[str] = Field(default_factory=list, description="Users at >80% usage")
    
    # Financial health
    failed_payments_this_month: int
    dunning_users: int = Field(..., description="Users with failed payments")
    recovery_rate: float = Field(ge=0.0, le=1.0, description="Payment recovery rate")


class AdminUserOverrideRequest(BaseModel):
    """Request to override user's plan/usage (admin only)"""
    action: Literal["change_plan", "adjust_usage", "add_credit", "reset_usage"]
    plan_id: Optional[str] = None
    usage_metric: Optional[UsageMetric] = None
    adjustment_amount: Optional[Union[int, float]] = None
    reason: str = Field(..., min_length=10, max_length=500, description="Reason for override")
    expires_at: Optional[datetime] = Field(None, description="When override expires")


# =============================================================================
# COMMON RESPONSE MODELS
# =============================================================================

class SuccessResponse(BaseModel):
    """Standard success response"""
    success: bool = True
    message: str
    data: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """Standard error response"""
    success: bool = False
    message: str
    error_code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    status_code: int = 400


class BulkOperationResponse(BaseModel):
    """Response for bulk operations"""
    success: bool
    message: str
    processed: int
    succeeded: int  
    failed: int
    errors: List[Dict[str, str]] = Field(default_factory=list)
    
    @validator('success')
    def validate_success(cls, v, values):
        failed = values.get('failed', 0)
        return failed == 0


# =============================================================================
# CHECKOUT & PAYMENT MODELS
# =============================================================================

class CheckoutSessionRequest(BaseModel):
    """Request to create checkout session"""
    plan_id: str = Field(..., description="Plan to subscribe to")
    billing_cycle: BillingCycle = Field(..., description="Billing frequency")
    success_url: str = Field(..., description="Success redirect URL")
    cancel_url: str = Field(..., description="Cancel redirect URL")
    coupon_code: Optional[str] = Field(None, max_length=50)
    trial_days: Optional[int] = Field(None, ge=0, le=90)


class CheckoutSessionResponse(BaseModel):
    """Response with checkout session details"""
    session_id: str
    checkout_url: str
    expires_at: datetime


class PaymentIntentResponse(BaseModel):
    """Response for payment intent"""
    payment_intent_id: str
    client_secret: str
    status: PaymentStatus
    amount: Decimal
    currency: str = "USD"


# =============================================================================
# WEBHOOKS
# =============================================================================

class StripeWebhookEvent(BaseModel):
    """Stripe webhook event data"""
    event_type: str
    event_id: str
    data: Dict[str, Any]
    created: datetime
    livemode: bool


class WebhookEventResponse(BaseModel):
    """Response for webhook processing"""
    event_id: str
    event_type: str
    processed: bool
    processed_at: datetime
    error: Optional[str] = None


class AdminAnalyticsResponse(BaseModel):
    """Admin analytics response"""
    period_start: datetime
    period_end: datetime
    total_users: int
    paying_users: int
    trial_users: int
    canceled_users: int
    mrr: float
    arr: float
    churn_rate: float
    users_by_plan: Dict[str, int] = Field(default_factory=dict)
    revenue_by_plan: Dict[str, float] = Field(default_factory=dict)
    new_subscriptions_this_month: int
    failed_payments_this_month: int


class AdminUserListResponse(BaseModel):
    """Admin user list response"""
    users: List[Dict[str, Any]] = Field(default_factory=list)
    total_count: int
    criteria: Dict[str, Any] = Field(default_factory=dict)
    limit: int


# =============================================================================
# INVOICE MODELS
# =============================================================================

class InvoiceLineItem(BaseModel):
    """Invoice line item"""
    description: str
    quantity: int = 1
    unit_amount: Decimal
    total_amount: Decimal
    metadata: Dict[str, Any] = Field(default_factory=dict)


class InvoiceListResponse(BaseModel):
    """Invoice list response"""
    invoices: List[InvoiceResponse] = Field(default_factory=list)
    total_count: int
    has_more: bool = False


# =============================================================================
# PAYMENT METHOD MODELS
# =============================================================================

class PaymentMethodCreateRequest(BaseModel):
    """Create payment method request"""
    payment_method_id: str = Field(..., description="Stripe payment method ID")
    set_as_default: bool = Field(False, description="Set as default payment method")


class PaymentMethodListResponse(BaseModel):
    """Payment method list response"""
    payment_methods: List[PaymentMethodResponse] = Field(default_factory=list)
    default_payment_method: Optional[str] = None


# =============================================================================
# SUBSCRIPTION HISTORY MODELS
# =============================================================================

class SubscriptionHistoryItem(BaseModel):
    """Subscription history item"""
    id: str
    plan_id: str
    plan_name: str
    status: SubscriptionStatus
    billing_cycle: BillingCycle
    start_date: datetime
    end_date: Optional[datetime]
    amount: Decimal
    created_at: datetime


class SubscriptionHistoryResponse(BaseModel):
    """Subscription history response"""
    subscriptions: List[SubscriptionHistoryItem] = Field(default_factory=list)
    total_count: int


# =============================================================================
# USAGE ADJUSTMENT MODELS
# =============================================================================

class UsageAdjustmentRequest(BaseModel):
    """Usage adjustment request for admin"""
    user_id: str
    metric: UsageMetric
    adjustment_amount: Union[int, float]
    reason: str = Field(..., min_length=10, max_length=500)
    reset_to_zero: bool = Field(False, description="Reset usage to zero instead of adjusting")
    period: Optional[str] = Field(None, description="Period to adjust (YYYY-MM format)")


class UsageResetRequest(BaseModel):
    """Usage reset request for admin"""
    user_id: str
    metrics: List[UsageMetric] = Field(..., description="Metrics to reset")
    period: Optional[str] = Field(None, description="Period to reset (YYYY-MM format)")
    reason: str = Field(..., min_length=10, max_length=500)


# =============================================================================
# CHECKOUT SESSION MODELS
# =============================================================================

class CheckoutSessionCreateRequest(BaseModel):
    """Create checkout session request"""
    plan_id: str
    billing_cycle: BillingCycle
    success_url: str
    cancel_url: str
    coupon_code: Optional[str] = None
    trial_days: Optional[int] = Field(None, ge=0, le=90)
    customer_email: Optional[str] = None


class BillingPortalRequest(BaseModel):
    """Create billing portal session request"""
    return_url: str


class BillingPortalResponse(BaseModel):
    """Billing portal session response"""
    portal_url: str
    expires_at: datetime


# =============================================================================
# COUPON MODELS
# =============================================================================

class CouponCreateRequest(BaseModel):
    """Create coupon request"""
    code: str = Field(..., min_length=3, max_length=50, pattern=r'^[A-Z0-9_-]+$')
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    discount_type: Literal['percentage', 'fixed_amount'] = Field(...)
    discount_value: Decimal = Field(..., gt=0)
    max_redemptions: Optional[int] = Field(None, gt=0)
    expires_at: Optional[datetime] = None
    applies_to_plans: List[str] = Field(default_factory=list)
    is_active: bool = True


class CouponUpdateRequest(BaseModel):
    """Update coupon request"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    max_redemptions: Optional[int] = Field(None, gt=0)
    expires_at: Optional[datetime] = None
    is_active: Optional[bool] = None


class CouponResponse(BaseModel):
    """Coupon response"""
    id: str
    code: str
    name: str
    description: Optional[str]
    discount_type: str
    discount_value: Decimal
    times_redeemed: int
    max_redemptions: Optional[int]
    expires_at: Optional[datetime]
    applies_to_plans: List[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime


# =============================================================================
# SUBSCRIPTION CONTROL MODELS
# =============================================================================

class SubscriptionPauseRequest(BaseModel):
    """Pause subscription request"""
    pause_until: Optional[datetime] = Field(None, description="Resume date, if not provided pauses indefinitely")
    reason: Optional[str] = Field(None, max_length=500)


class SubscriptionResumeRequest(BaseModel):
    """Resume subscription request"""
    resume_immediately: bool = Field(True, description="Resume immediately or at next billing cycle")
    prorate: bool = Field(True, description="Prorate charges when resuming")


# =============================================================================
# REFUND MODELS
# =============================================================================

class RefundCreateRequest(BaseModel):
    """Create refund request"""
    payment_intent_id: str
    amount: Optional[Decimal] = Field(None, description="Partial refund amount, if not provided refunds full amount")
    reason: Literal['duplicate', 'fraudulent', 'requested_by_customer', 'other'] = 'requested_by_customer'
    description: Optional[str] = Field(None, max_length=500)


class RefundResponse(BaseModel):
    """Refund response"""
    id: str
    amount: Decimal
    currency: str
    status: str
    reason: str
    description: Optional[str]
    payment_intent_id: str
    created_at: datetime


class RefundListResponse(BaseModel):
    """Refund list response"""
    refunds: List[RefundResponse] = Field(default_factory=list)
    total_count: int
    has_more: bool = False


# =============================================================================
# TAX MODELS
# =============================================================================

class TaxCalculationRequest(BaseModel):
    """Tax calculation request"""
    amount: Decimal
    currency: str = "USD"
    customer_country: str = Field(..., min_length=2, max_length=2, description="ISO country code")
    customer_state: Optional[str] = Field(None, min_length=2, max_length=2, description="State/province code")
    product_type: str = "service"


class TaxCalculationResponse(BaseModel):
    """Tax calculation response"""
    subtotal: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    tax_rate: Decimal
    tax_breakdown: List[Dict[str, Any]] = Field(default_factory=list)
    applicable_taxes: List[str] = Field(default_factory=list)
