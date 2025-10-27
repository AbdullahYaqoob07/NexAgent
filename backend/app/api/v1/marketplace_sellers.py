from fastapi import APIRouter, HTTPException, Depends, Query, Path, BackgroundTasks, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
from datetime import datetime, timedelta
import logging

from app.models.marketplace_models import (
    SellerRegistrationRequest, SellerProfileUpdateRequest, SellerResponse, SellerListResponse,
    SellerAnalyticsResponse, SellerPayoutResponse, SuccessResponse, ErrorResponse
)
from app.services.marketplace_service import marketplace_service
from app.services.firebase_service import FirebaseService
from app.core.security import rate_limit
from app.core.logging import log_api_event

logger = logging.getLogger(__name__)
security = HTTPBearer()

# Create router
router = APIRouter(
    prefix="/sellers",
    tags=["🏪 Marketplace - Sellers"],
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
# SELLER ONBOARDING & PROFILE MANAGEMENT
# =============================================================================

@router.post(
    "/onboard",
    response_model=SuccessResponse,
    status_code=201,
    summary="Become a Seller",
    description="Complete seller onboarding with Stripe Connect setup"
)
@rate_limit(requests_per_minute=10)
async def onboard_seller(
    request: Request,
    seller_data: SellerRegistrationRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Complete seller onboarding process"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="seller_onboarding_start",
            metadata={"business_name": seller_data.business_name, "country": seller_data.country}
        )
        
        result = await marketplace_service.onboard_seller(seller_data, current_user['uid'])
        
        if result['success']:
            return SuccessResponse(
                message=result['message'],
                data={
                    "seller_id": result['seller_id'],
                    "stripe_account_id": result.get('stripe_account_id'),
                    "onboarding_url": result.get('onboarding_url'),
                    "status": result.get('status')
                }
            )
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error onboarding seller: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to complete seller onboarding")


@router.get(
    "/profile",
    response_model=SellerResponse,
    summary="Get Seller Profile",
    description="Get current user's seller profile and status"
)
@rate_limit(requests_per_minute=100)
async def get_seller_profile(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get seller's own profile"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="get_seller_profile"
        )
        
        seller = await marketplace_service.get_seller_profile(current_user['uid'])
        
        if not seller:
            raise HTTPException(status_code=404, detail="Seller profile not found. Please complete onboarding first.")
        
        return seller
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting seller profile: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve seller profile")


@router.put(
    "/profile",
    response_model=SuccessResponse,
    summary="Update Seller Profile",
    description="Update seller profile information"
)
@rate_limit(requests_per_minute=20)
async def update_seller_profile(
    request: Request,
    update_data: SellerProfileUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update seller profile"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="update_seller_profile",
            metadata=update_data.dict(exclude_unset=True)
        )
        
        result = await marketplace_service.update_seller_profile(current_user['uid'], update_data)
        
        if result['success']:
            return SuccessResponse(message=result['message'])
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating seller profile: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update seller profile")


@router.get(
    "/stripe-status",
    response_model=dict,
    summary="Get Stripe Account Status",
    description="Get Stripe Connect account status and onboarding progress"
)
@rate_limit(requests_per_minute=50)
async def get_stripe_status(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get Stripe Connect account status"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="get_stripe_status"
        )
        
        result = await marketplace_service.get_stripe_account_status(current_user['uid'])
        
        if result['success']:
            return result['data']
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting Stripe status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve Stripe status")


@router.post(
    "/stripe-onboarding-link",
    response_model=dict,
    summary="Generate Stripe Onboarding Link",
    description="Generate fresh Stripe Connect onboarding link"
)
@rate_limit(requests_per_minute=10)
async def create_stripe_onboarding_link(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Generate Stripe onboarding link"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="create_stripe_onboarding_link"
        )
        
        result = await marketplace_service.create_stripe_onboarding_link(current_user['uid'])
        
        if result['success']:
            return {"onboarding_url": result['onboarding_url']}
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating Stripe onboarding link: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create onboarding link")


# =============================================================================
# SELLER ANALYTICS & PERFORMANCE
# =============================================================================

@router.get(
    "/analytics",
    response_model=SellerAnalyticsResponse,
    summary="Seller Analytics Dashboard",
    description="Get comprehensive seller analytics including sales, views, earnings"
)
@rate_limit(requests_per_minute=100)
async def get_seller_analytics(
    request: Request,
    period: str = Query("30d", description="Time period: 7d, 30d, 90d, 1y"),
    current_user: dict = Depends(get_current_user)
):
    """Get seller analytics data"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="get_seller_analytics",
            metadata={"period": period}
        )
        
        analytics = await marketplace_service.get_seller_analytics(current_user['uid'], period)
        
        if not analytics:
            # Return empty analytics for new sellers
            return SellerAnalyticsResponse(
                total_sales=0, total_revenue=0.0, total_views=0, total_stars=0,
                active_nexas=0, avg_rating=0.0, conversion_rate=0.0,
                sales_chart=[], revenue_chart=[], top_nexas=[]
            )
        
        return analytics
        
    except Exception as e:
        logger.error(f"Error getting seller analytics: {str(e)}")
        # Return empty analytics on error
        return SellerAnalyticsResponse(
            total_sales=0, total_revenue=0.0, total_views=0, total_stars=0,
            active_nexas=0, avg_rating=0.0, conversion_rate=0.0,
            sales_chart=[], revenue_chart=[], top_nexas=[]
        )


@router.get(
    "/earnings",
    response_model=dict,
    summary="Seller Earnings Summary",
    description="Get detailed earnings breakdown and payout information"
)
@rate_limit(requests_per_minute=100)
async def get_seller_earnings(
    request: Request,
    period: str = Query("30d", description="Time period: 7d, 30d, 90d, 1y"),
    current_user: dict = Depends(get_current_user)
):
    """Get seller earnings data"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="get_seller_earnings",
            metadata={"period": period}
        )
        
        result = await marketplace_service.get_seller_earnings(current_user['uid'], period)
        
        if result['success']:
            return result['data']
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting seller earnings: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve earnings data")


@router.get(
    "/payouts",
    response_model=List[SellerPayoutResponse],
    summary="Payout History",
    description="Get seller's payout history and status"
)
@rate_limit(requests_per_minute=100)
async def get_seller_payouts(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: dict = Depends(get_current_user)
):
    """Get seller payout history"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="get_seller_payouts",
            metadata={"page": page}
        )
        
        payouts = await marketplace_service.get_seller_payouts(current_user['uid'], page, page_size)
        return payouts or []
        
    except Exception as e:
        logger.error(f"Error getting seller payouts: {str(e)}")
        return []


@router.post(
    "/request-payout",
    response_model=SuccessResponse,
    summary="Request Payout",
    description="Request immediate payout of available balance"
)
@rate_limit(requests_per_minute=5)
async def request_payout(
    request: Request,
    amount: Optional[float] = Query(None, ge=0.01, description="Amount to payout (leave empty for full balance)"),
    current_user: dict = Depends(get_current_user)
):
    """Request seller payout"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="request_payout",
            metadata={"amount": amount}
        )
        
        result = await marketplace_service.request_seller_payout(current_user['uid'], amount)
        
        if result['success']:
            return SuccessResponse(
                message=result['message'],
                data={"payout_id": result.get('payout_id'), "amount": result.get('amount')}
            )
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error requesting payout: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to request payout")


# =============================================================================
# PUBLIC SELLER DIRECTORY
# =============================================================================

@router.get(
    "/",
    response_model=SellerListResponse,
    summary="Browse Sellers",
    description="Browse all verified sellers in the marketplace"
)
@rate_limit(requests_per_minute=200)
async def browse_sellers(
    request: Request,
    query: Optional[str] = Query(None, description="Search query"),
    sort_by: Optional[str] = Query("rating", description="Sort by: rating, sales, newest, alphabetical"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page")
):
    """Browse verified sellers"""
    try:
        await log_api_event(
            request=request,
            user_id=None,
            action="browse_sellers",
            metadata={"query": query, "sort_by": sort_by, "page": page}
        )
        
        result = await marketplace_service.browse_sellers(query, sort_by, page, page_size)
        return result
        
    except Exception as e:
        logger.error(f"Error browsing sellers: {str(e)}")
        return SellerListResponse(
            sellers=[], total=0, page=1, page_size=page_size,
            total_pages=0, has_next=False, has_prev=False
        )


@router.get(
    "/{seller_id}",
    response_model=SellerResponse,
    summary="Get Seller Public Profile",
    description="Get public seller profile and their published Nexas"
)
@rate_limit(requests_per_minute=300)
async def get_seller_public_profile(
    request: Request,
    seller_id: str = Path(..., description="Seller ID"),
    current_user: Optional[dict] = Depends(lambda credentials: get_current_user(credentials) if credentials else None)
):
    """Get public seller profile"""
    try:
        user_id = current_user['uid'] if current_user else None
        
        await log_api_event(
            request=request,
            user_id=user_id,
            action="view_seller_profile",
            resource_id=seller_id
        )
        
        seller = await marketplace_service.get_seller_public_profile(seller_id, user_id)
        
        if not seller:
            raise HTTPException(status_code=404, detail="Seller not found")
        
        return seller
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting seller profile: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve seller profile")


@router.get(
    "/{seller_id}/nexas",
    response_model=dict,
    summary="Get Seller's Nexas",
    description="Get all published Nexas by a specific seller"
)
@rate_limit(requests_per_minute=200)
async def get_seller_nexas(
    request: Request,
    seller_id: str = Path(..., description="Seller ID"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: Optional[dict] = Depends(lambda credentials: get_current_user(credentials) if credentials else None)
):
    """Get seller's published Nexas"""
    try:
        user_id = current_user['uid'] if current_user else None
        
        await log_api_event(
            request=request,
            user_id=user_id,
            action="view_seller_nexas",
            resource_id=seller_id,
            metadata={"page": page}
        )
        
        result = await marketplace_service.get_seller_public_nexas(seller_id, user_id, page, page_size)
        return result
        
    except Exception as e:
        logger.error(f"Error getting seller Nexas: {str(e)}")
        return {
            "nexas": [], "total": 0, "page": 1, "page_size": page_size,
            "total_pages": 0, "has_next": False, "has_prev": False
        }


# =============================================================================
# SELLER VERIFICATION & STATUS
# =============================================================================

@router.post(
    "/verify-documents",
    response_model=SuccessResponse,
    summary="Submit Verification Documents",
    description="Submit additional verification documents for seller approval"
)
@rate_limit(requests_per_minute=10)
async def submit_verification_documents(
    request: Request,
    documents: dict,
    current_user: dict = Depends(get_current_user)
):
    """Submit seller verification documents"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="submit_verification_documents"
        )
        
        result = await marketplace_service.submit_seller_verification(current_user['uid'], documents)
        
        if result['success']:
            return SuccessResponse(message=result['message'])
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting verification documents: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to submit verification documents")


@router.get(
    "/verification-status",
    response_model=dict,
    summary="Get Verification Status",
    description="Get current seller verification status and requirements"
)
@rate_limit(requests_per_minute=50)
async def get_verification_status(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get seller verification status"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="get_verification_status"
        )
        
        result = await marketplace_service.get_seller_verification_status(current_user['uid'])
        
        if result['success']:
            return result['data']
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting verification status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve verification status")