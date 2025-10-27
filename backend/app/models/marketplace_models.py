from pydantic import BaseModel, Field, validator, root_validator, EmailStr
from typing import Optional, List, Dict, Any, Literal, Union
from datetime import datetime
from enum import Enum
from decimal import Decimal


# =============================================================================
# ENUMS
# =============================================================================

class NexaStatus(str, Enum):
    """Status of a Nexa in the marketplace"""
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"
    ARCHIVED = "archived"


class NexaCategory(str, Enum):
    """Categories for Nexas"""
    AUTOMATION = "automation"
    DATA_PROCESSING = "data_processing"
    API_INTEGRATION = "api_integration"
    NOTIFICATION = "notification"
    MARKETING = "marketing"
    E_COMMERCE = "e_commerce"
    CRM = "crm"
    ANALYTICS = "analytics"
    SOCIAL_MEDIA = "social_media"
    PRODUCTIVITY = "productivity"
    FINANCE = "finance"
    HEALTHCARE = "healthcare"
    EDUCATION = "education"
    UTILITIES = "utilities"
    OTHER = "other"


class PricingModel(str, Enum):
    """Pricing models for Nexas"""
    FREE = "free"
    ONE_TIME = "one_time"
    MONTHLY = "monthly"
    YEARLY = "yearly"
    USAGE_BASED = "usage_based"


class LicenseType(str, Enum):
    """License types for Nexas"""
    PERSONAL = "personal"
    TEAM = "team"
    ENTERPRISE = "enterprise"
    OPEN_SOURCE = "open_source"


class PurchaseStatus(str, Enum):
    """Status of a purchase"""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    DISPUTED = "disputed"


class SellerStatus(str, Enum):
    """Status of seller account"""
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    BANNED = "banned"


class ReviewStatus(str, Enum):
    """Review status"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


# =============================================================================
# NEXA (WORKFLOW) MODELS
# =============================================================================

class NexaCreateRequest(BaseModel):
    """Request model for creating a new Nexa"""
    name: str = Field(..., min_length=3, max_length=100, description="Nexa name")
    description: str = Field(..., min_length=10, max_length=2000, description="Detailed description")
    short_description: str = Field(..., min_length=10, max_length=200, description="Brief summary")
    category: NexaCategory = Field(..., description="Nexa category")
    tags: List[str] = Field(default_factory=list, max_items=10, description="Search tags")
    
    # Workflow data
    workflow_data: Dict[str, Any] = Field(..., description="Complete workflow JSON")
    workflow_version: str = Field(default="1.0.0", description="Version number")
    
    # Pricing
    pricing_model: PricingModel = Field(..., description="How this Nexa is priced")
    price: Optional[Decimal] = Field(None, ge=0, description="Price in USD")
    currency: str = Field(default="USD", description="Currency code")
    
    # License and usage
    license_type: LicenseType = Field(default=LicenseType.PERSONAL, description="License type")
    max_installations: Optional[int] = Field(None, ge=1, description="Max allowed installations")
    
    # Media and documentation
    screenshots: List[str] = Field(default_factory=list, max_items=5, description="Screenshot URLs")
    demo_video_url: Optional[str] = Field(None, description="Demo video URL")
    documentation_url: Optional[str] = Field(None, description="Documentation link")
    
    # Requirements
    min_nexagent_version: Optional[str] = Field(None, description="Minimum NexAgent version required")
    dependencies: List[str] = Field(default_factory=list, description="Required dependencies")
    
    @validator('tags')
    def validate_tags(cls, v):
        if v:
            # Clean and validate tags
            cleaned_tags = []
            for tag in v:
                tag = tag.strip().lower()
                if len(tag) >= 2 and len(tag) <= 30:
                    cleaned_tags.append(tag)
            return list(set(cleaned_tags))  # Remove duplicates
        return []
    
    @validator('price')
    def validate_price_with_model(cls, v, values):
        pricing_model = values.get('pricing_model')
        if pricing_model == PricingModel.FREE:
            return Decimal('0')
        elif pricing_model in [PricingModel.ONE_TIME, PricingModel.MONTHLY, PricingModel.YEARLY]:
            if v is None or v <= 0:
                raise ValueError(f'Price is required for {pricing_model} model')
        return v


class NexaUpdateRequest(BaseModel):
    """Request model for updating a Nexa"""
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = Field(None, min_length=10, max_length=2000)
    short_description: Optional[str] = Field(None, min_length=10, max_length=200)
    category: Optional[NexaCategory] = None
    tags: Optional[List[str]] = Field(None, max_items=10)
    
    # Workflow updates
    workflow_data: Optional[Dict[str, Any]] = None
    workflow_version: Optional[str] = None
    
    # Pricing updates
    pricing_model: Optional[PricingModel] = None
    price: Optional[Decimal] = Field(None, ge=0)
    
    # Media updates
    screenshots: Optional[List[str]] = Field(None, max_items=5)
    demo_video_url: Optional[str] = None
    documentation_url: Optional[str] = None
    
    # Requirements updates
    min_nexagent_version: Optional[str] = None
    dependencies: Optional[List[str]] = None


class NexaResponse(BaseModel):
    """Response model for Nexa data"""
    id: str
    seller_id: str
    seller_name: str
    seller_avatar: Optional[str]
    
    # Basic info
    name: str
    description: str
    short_description: str
    category: NexaCategory
    tags: List[str]
    status: NexaStatus
    
    # Workflow info
    workflow_version: str
    min_nexagent_version: Optional[str]
    dependencies: List[str]
    
    # Pricing
    pricing_model: PricingModel
    price: Decimal
    currency: str
    license_type: LicenseType
    max_installations: Optional[int]
    
    # Media
    screenshots: List[str]
    demo_video_url: Optional[str]
    documentation_url: Optional[str]
    
    # Statistics
    downloads: int
    purchases: int
    rating: float
    review_count: int
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime]
    
    # User-specific data (when authenticated)
    is_purchased: Optional[bool] = None
    is_starred: Optional[bool] = None
    
    class Config:
        from_attributes = True


class NexaListResponse(BaseModel):
    """Response model for Nexa lists"""
    success: bool = True
    nexas: List[NexaResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool


class NexaSearchRequest(BaseModel):
    """Request model for searching Nexas"""
    query: Optional[str] = Field(None, max_length=100, description="Search query")
    category: Optional[NexaCategory] = None
    pricing_model: Optional[PricingModel] = None
    min_price: Optional[Decimal] = Field(None, ge=0)
    max_price: Optional[Decimal] = Field(None, ge=0)
    license_type: Optional[LicenseType] = None
    min_rating: Optional[float] = Field(None, ge=0, le=5)
    tags: Optional[List[str]] = None
    sort_by: Optional[Literal["newest", "oldest", "price_low", "price_high", "popular", "rating"]] = "newest"
    
    @validator('max_price')
    def validate_price_range(cls, v, values):
        min_price = values.get('min_price')
        if min_price and v and v < min_price:
            raise ValueError('max_price must be greater than min_price')
        return v


# =============================================================================
# SELLER MODELS
# =============================================================================

class SellerRegistrationRequest(BaseModel):
    """Request model for seller registration"""
    business_name: str = Field(..., min_length=2, max_length=100, description="Business or individual name")
    business_email: EmailStr = Field(..., description="Business contact email")
    business_type: Literal["individual", "company"] = Field(..., description="Business type")
    
    # Profile info
    bio: Optional[str] = Field(None, max_length=1000, description="Seller bio")
    website_url: Optional[str] = Field(None, description="Business website")
    social_links: Optional[Dict[str, str]] = Field(default_factory=dict, description="Social media links")
    
    # Address info (required for Stripe)
    country: str = Field(..., min_length=2, max_length=2, description="Country code (ISO 2)")
    address_line1: str = Field(..., min_length=5, max_length=200, description="Address line 1")
    address_line2: Optional[str] = Field(None, max_length=200, description="Address line 2")
    city: str = Field(..., min_length=2, max_length=100, description="City")
    state: Optional[str] = Field(None, max_length=100, description="State/Province")
    postal_code: str = Field(..., min_length=3, max_length=20, description="Postal code")
    
    # Tax info
    tax_id: Optional[str] = Field(None, max_length=50, description="Tax ID/VAT number")
    
    # Terms acceptance
    accepts_terms: bool = Field(..., description="Must accept terms of service")
    accepts_privacy: bool = Field(..., description="Must accept privacy policy")
    
    @validator('accepts_terms', 'accepts_privacy')
    def validate_acceptance(cls, v):
        if not v:
            raise ValueError('Must accept terms and privacy policy')
        return v


class SellerProfileUpdateRequest(BaseModel):
    """Request model for updating seller profile"""
    business_name: Optional[str] = Field(None, min_length=2, max_length=100)
    bio: Optional[str] = Field(None, max_length=1000)
    website_url: Optional[str] = None
    social_links: Optional[Dict[str, str]] = None
    avatar_url: Optional[str] = None


class SellerResponse(BaseModel):
    """Response model for seller data"""
    id: str
    user_id: str
    business_name: str
    business_email: str
    business_type: str
    status: SellerStatus
    
    # Profile
    bio: Optional[str]
    website_url: Optional[str]
    social_links: Dict[str, str]
    avatar_url: Optional[str]
    
    # Statistics
    total_nexas: int
    total_sales: int
    total_revenue: Decimal
    rating: float
    review_count: int
    
    # Stripe info
    stripe_account_id: Optional[str]
    stripe_onboarding_complete: bool
    payout_enabled: bool
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    verified_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class SellerDashboardResponse(BaseModel):
    """Response model for seller dashboard data"""
    success: bool = True
    seller: SellerResponse
    
    # Recent statistics
    stats: Dict[str, Any] = Field(default_factory=dict)
    recent_sales: List[Dict[str, Any]] = Field(default_factory=list)
    top_nexas: List[Dict[str, Any]] = Field(default_factory=list)
    pending_payouts: Decimal = Decimal('0')
    
    # Charts data
    revenue_chart: List[Dict[str, Any]] = Field(default_factory=list)
    sales_chart: List[Dict[str, Any]] = Field(default_factory=list)


# =============================================================================
# PURCHASE & PAYMENT MODELS
# =============================================================================

class CheckoutRequest(BaseModel):
    """Request model for creating checkout session"""
    nexa_id: str = Field(..., description="ID of Nexa to purchase")
    success_url: str = Field(..., description="URL to redirect after successful payment")
    cancel_url: str = Field(..., description="URL to redirect after cancelled payment")
    
    # Optional coupon
    coupon_code: Optional[str] = Field(None, max_length=50, description="Discount coupon code")


class PurchaseResponse(BaseModel):
    """Response model for purchase data"""
    id: str
    user_id: str
    nexa_id: str
    nexa_name: str
    seller_id: str
    seller_name: str
    
    # Payment info
    amount: Decimal
    currency: str
    status: PurchaseStatus
    stripe_payment_intent_id: Optional[str]
    
    # License info
    license_key: str
    license_type: LicenseType
    max_installations: Optional[int]
    current_installations: int
    
    # Download info
    download_url: Optional[str]
    download_count: int
    expires_at: Optional[datetime]
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class PurchaseListResponse(BaseModel):
    """Response model for purchase lists"""
    success: bool = True
    purchases: List[PurchaseResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# COLLECTION & FAVORITES MODELS
# =============================================================================

class CollectionCreateRequest(BaseModel):
    """Request model for creating collections"""
    name: str = Field(..., min_length=3, max_length=100, description="Collection name")
    description: Optional[str] = Field(None, max_length=500, description="Collection description")
    is_public: bool = Field(default=False, description="Whether collection is public")
    nexa_ids: List[str] = Field(default_factory=list, description="Initial Nexas to add")


class CollectionUpdateRequest(BaseModel):
    """Request model for updating collections"""
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_public: Optional[bool] = None


class CollectionResponse(BaseModel):
    """Response model for collection data"""
    id: str
    user_id: str
    user_name: str
    name: str
    description: Optional[str]
    is_public: bool
    
    # Statistics
    nexa_count: int
    followers: int
    
    # Nexas preview (first few)
    nexas_preview: List[NexaResponse] = Field(default_factory=list)
    
    # User-specific data
    is_following: Optional[bool] = None
    is_owner: Optional[bool] = None
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# =============================================================================
# REVIEW & RATING MODELS
# =============================================================================

class ReviewCreateRequest(BaseModel):
    """Request model for creating reviews"""
    nexa_id: str = Field(..., description="ID of Nexa being reviewed")
    rating: int = Field(..., ge=1, le=5, description="Rating from 1-5 stars")
    title: str = Field(..., min_length=5, max_length=100, description="Review title")
    comment: str = Field(..., min_length=10, max_length=1000, description="Review comment")
    
    # Optional tags for the review
    pros: Optional[List[str]] = Field(None, max_items=5, description="Positive aspects")
    cons: Optional[List[str]] = Field(None, max_items=5, description="Negative aspects")


class ReviewResponse(BaseModel):
    """Response model for review data"""
    id: str
    user_id: str
    user_name: str
    user_avatar: Optional[str]
    nexa_id: str
    
    rating: int
    title: str
    comment: str
    pros: List[str]
    cons: List[str]
    
    # Moderation
    status: ReviewStatus
    
    # Interaction stats
    helpful_count: int
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# =============================================================================
# ADMIN MODELS
# =============================================================================

class AdminNexaModerationRequest(BaseModel):
    """Request model for admin nexa moderation"""
    nexa_id: str
    action: Literal["approve", "reject", "suspend", "archive"]
    reason: Optional[str] = Field(None, max_length=500, description="Reason for action")
    notes: Optional[str] = Field(None, max_length=1000, description="Internal notes")


class AdminAnalyticsResponse(BaseModel):
    """Response model for admin analytics"""
    success: bool = True
    
    # Overview stats
    total_nexas: int
    total_sellers: int
    total_purchases: int
    total_revenue: Decimal
    
    # Recent activity
    new_nexas_today: int
    new_sellers_today: int
    purchases_today: int
    revenue_today: Decimal
    
    # Charts data
    revenue_chart: List[Dict[str, Any]]
    nexas_chart: List[Dict[str, Any]]
    users_chart: List[Dict[str, Any]]
    
    # Top performers
    top_nexas: List[Dict[str, Any]]
    top_sellers: List[Dict[str, Any]]
    
    # Pending items
    pending_nexas: int
    pending_reviews: int
    pending_reports: int


# =============================================================================
# WEBHOOK & PAYMENT MODELS
# =============================================================================

class StripeWebhookEvent(BaseModel):
    """Model for Stripe webhook events"""
    event_type: str
    data: Dict[str, Any]
    created: datetime


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
    error: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    status_code: int = 400


class BulkOperationResponse(BaseModel):
    """Response model for bulk operations"""
    success: bool
    message: str
    processed: int
    succeeded: int
    failed: int
    errors: List[Dict[str, str]] = []
    
    # Alternative simpler constructor
    def __init__(self, success_count=0, failed_count=0, errors=None, **data):
        if errors is None:
            errors = []
        super().__init__(
            success=failed_count == 0,
            message=f"Processed {success_count + failed_count} items. {success_count} succeeded, {failed_count} failed.",
            processed=success_count + failed_count,
            succeeded=success_count,
            failed=failed_count,
            errors=errors,
            **data
        )


class CheckoutSessionRequest(BaseModel):
    """Request model for creating checkout session"""
    nexa_id: str
    payment_method: str = "stripe"
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


class CheckoutSessionResponse(BaseModel):
    """Response model for checkout session"""
    checkout_url: str
    session_id: str
    expires_at: datetime


class PurchaseCreateRequest(BaseModel):
    """Request model for direct purchase"""
    nexa_id: str
    payment_method_id: str


class RefundRequest(BaseModel):
    """Request model for refund"""
    reason: str
    description: Optional[str] = None


class RefundResponse(BaseModel):
    """Response model for refund"""
    id: str
    purchase_id: str
    amount: Decimal
    status: str
    reason: str
    created_at: datetime


class SellerListResponse(BaseModel):
    """Response model for seller lists"""
    sellers: List[SellerResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool


class SellerAnalyticsResponse(BaseModel):
    """Response model for seller analytics"""
    total_sales: int
    total_revenue: Decimal
    total_views: int
    total_stars: int
    active_nexas: int
    avg_rating: float
    conversion_rate: float
    sales_chart: List[Dict[str, Any]]
    revenue_chart: List[Dict[str, Any]]
    top_nexas: List[Dict[str, Any]]


class SellerPayoutResponse(BaseModel):
    """Response model for seller payout"""
    id: str
    amount: Decimal
    status: str
    created_at: datetime
    processed_at: Optional[datetime]
