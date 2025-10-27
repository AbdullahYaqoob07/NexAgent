from fastapi import APIRouter, HTTPException, Depends, Query, Path, BackgroundTasks, Request, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
from datetime import datetime
import logging

from app.models.marketplace_models import (
    NexaCreateRequest, NexaUpdateRequest, NexaSearchRequest, NexaResponse, NexaListResponse,
    SuccessResponse, ErrorResponse, BulkOperationResponse,
    NexaCategory, PricingModel, LicenseType
)
from app.services.marketplace_service import marketplace_service
from app.services.firebase_service import FirebaseService
from app.core.security import rate_limit
from app.core.logging import log_api_event

logger = logging.getLogger(__name__)
security = HTTPBearer()

# Create router
router = APIRouter(
    prefix="/nexas",
    tags=["🏪 Marketplace - Nexas"],
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
# NEXA PUBLISHING & MANAGEMENT
# =============================================================================

@router.post(
    "/",
    response_model=SuccessResponse,
    status_code=201,
    summary="Publish New Nexa",
    description="Upload and publish a new Nexa (workflow) to the marketplace"
)
@rate_limit(requests_per_minute=20)
async def publish_nexa(
    request: Request,
    nexa_data: NexaCreateRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Publish a new Nexa to the marketplace"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="publish_nexa",
            metadata={"name": nexa_data.name, "category": nexa_data.category.value, "pricing_model": nexa_data.pricing_model.value}
        )
        
        result = await marketplace_service.create_nexa(nexa_data, current_user['uid'])
        
        if result['success']:
            return SuccessResponse(
                message=result['message'],
                data={
                    "nexa_id": result['nexa_id'],
                    "status": result.get('status'),
                    "requires_review": result.get('status') == 'pending_review'
                }
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result['error']
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error publishing Nexa: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to publish Nexa")


@router.get(
    "/",
    response_model=NexaListResponse,
    summary="Browse Marketplace",
    description="Browse and search all approved Nexas in the marketplace with advanced filtering"
)
@rate_limit(requests_per_minute=200)
async def browse_nexas(
    request: Request,
    # Search parameters
    query: Optional[str] = Query(None, description="Search query"),
    category: Optional[NexaCategory] = Query(None, description="Filter by category"),
    pricing_model: Optional[PricingModel] = Query(None, description="Filter by pricing model"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price"),
    license_type: Optional[LicenseType] = Query(None, description="Filter by license type"),
    min_rating: Optional[float] = Query(None, ge=0, le=5, description="Minimum rating"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags"),
    sort_by: Optional[str] = Query("newest", description="Sort by: newest, oldest, price_low, price_high, popular, rating"),
    
    # Pagination
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    
    # Optional auth
    current_user: Optional[dict] = Depends(lambda credentials: get_current_user(credentials) if credentials else None)
):
    """Browse marketplace Nexas with filtering and search"""
    try:
        user_id = current_user['uid'] if current_user else None
        
        await log_api_event(
            request=request,
            user_id=user_id,
            action="browse_nexas",
            metadata={"query": query, "category": category, "page": page}
        )
        
        # Create search request
        search_request = NexaSearchRequest(
            query=query,
            category=category,
            pricing_model=pricing_model,
            min_price=min_price,
            max_price=max_price,
            license_type=license_type,
            min_rating=min_rating,
            tags=tags,
            sort_by=sort_by
        )
        
        # Perform search with pagination
        results = await marketplace_service.search_nexas(search_request, user_id)
        
        # Apply pagination manually since service doesn't handle it yet
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        
        paginated_nexas = results.nexas[start_idx:end_idx]
        
        return NexaListResponse(
            nexas=paginated_nexas,
            total=results.total,
            page=page,
            page_size=page_size,
            total_pages=(results.total + page_size - 1) // page_size,
            has_next=end_idx < results.total,
            has_prev=page > 1
        )
        
    except Exception as e:
        logger.error(f"Error browsing Nexas: {str(e)}")
        return NexaListResponse(
            nexas=[], total=0, page=1, page_size=page_size,
            total_pages=0, has_next=False, has_prev=False
        )


@router.get(
    "/{nexa_id}",
    response_model=NexaResponse,
    summary="Get Nexa Details",
    description="Get detailed information about a specific Nexa including seller info and user-specific data"
)
@rate_limit(requests_per_minute=300)
async def get_nexa_details(
    request: Request,
    nexa_id: str = Path(..., description="Nexa ID"),
    current_user: Optional[dict] = Depends(lambda credentials: get_current_user(credentials) if credentials else None)
):
    """Get detailed Nexa information"""
    try:
        user_id = current_user['uid'] if current_user else None
        
        await log_api_event(
            request=request,
            user_id=user_id,
            action="view_nexa_details",
            resource_id=nexa_id
        )
        
        nexa = await marketplace_service.get_nexa_details(nexa_id, user_id)
        
        if not nexa:
            raise HTTPException(status_code=404, detail="Nexa not found")
        
        return nexa
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting Nexa details: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve Nexa details")


@router.put(
    "/{nexa_id}",
    response_model=SuccessResponse,
    summary="Update Nexa",
    description="Update Nexa details (seller only)"
)
@rate_limit(requests_per_minute=50)
async def update_nexa(
    request: Request,
    update_data: NexaUpdateRequest,
    nexa_id: str = Path(..., description="Nexa ID"),
    current_user: dict = Depends(get_current_user)
):
    """Update Nexa details"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="update_nexa",
            resource_id=nexa_id,
            metadata=update_data.dict(exclude_unset=True)
        )
        
        result = await marketplace_service.update_nexa(nexa_id, update_data, current_user['uid'])
        
        if result['success']:
            return SuccessResponse(message=result['message'])
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating Nexa: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update Nexa")


@router.delete(
    "/{nexa_id}",
    response_model=SuccessResponse,
    summary="Delete Nexa",
    description="Delete a Nexa from the marketplace (seller only)"
)
@rate_limit(requests_per_minute=20)
async def delete_nexa(
    request: Request,
    nexa_id: str = Path(..., description="Nexa ID"),
    current_user: dict = Depends(get_current_user)
):
    """Delete a Nexa"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="delete_nexa",
            resource_id=nexa_id
        )
        
        result = await marketplace_service.delete_nexa(nexa_id, current_user['uid'])
        
        if result['success']:
            return SuccessResponse(message=result['message'])
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting Nexa: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete Nexa")


# =============================================================================
# SELLER'S NEXA MANAGEMENT
# =============================================================================

@router.get(
    "/my-nexas/",
    response_model=NexaListResponse,
    summary="My Published Nexas",
    description="Get seller's own published Nexas with all statuses"
)
@rate_limit(requests_per_minute=100)
async def get_my_nexas(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: dict = Depends(get_current_user)
):
    """Get seller's published Nexas"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="get_my_nexas",
            metadata={"page": page}
        )
        
        result = await marketplace_service.get_seller_nexas(current_user['uid'], page, page_size)
        return result
        
    except Exception as e:
        logger.error(f"Error getting seller Nexas: {str(e)}")
        return NexaListResponse(
            nexas=[], total=0, page=1, page_size=page_size,
            total_pages=0, has_next=False, has_prev=False
        )


# =============================================================================
# FAVORITES & STARRING
# =============================================================================

@router.post(
    "/{nexa_id}/star",
    response_model=SuccessResponse,
    summary="Star/Unstar Nexa",
    description="Add or remove Nexa from user's favorites"
)
@rate_limit(requests_per_minute=100)
async def toggle_star_nexa(
    request: Request,
    nexa_id: str = Path(..., description="Nexa ID"),
    current_user: dict = Depends(get_current_user)
):
    """Star or unstar a Nexa"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="toggle_star_nexa",
            resource_id=nexa_id
        )
        
        # Check current star status
        nexa = await marketplace_service.get_nexa_details(nexa_id, current_user['uid'])
        if not nexa:
            raise HTTPException(status_code=404, detail="Nexa not found")
        
        if nexa.is_starred:
            # Unstar
            result = await marketplace_service.unstar_nexa(nexa_id, current_user['uid'])
            action = "unstarred"
        else:
            # Star
            result = await marketplace_service.star_nexa(nexa_id, current_user['uid'])
            action = "starred"
        
        if result['success']:
            return SuccessResponse(
                message=result['message'],
                data={"action": action, "is_starred": action == "starred"}
            )
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling star: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to toggle star")


@router.get(
    "/starred/",
    response_model=NexaListResponse,
    summary="My Starred Nexas",
    description="Get user's starred/favorite Nexas"
)
@rate_limit(requests_per_minute=100)
async def get_starred_nexas(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: dict = Depends(get_current_user)
):
    """Get user's starred Nexas"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="get_starred_nexas",
            metadata={"page": page}
        )
        
        result = await marketplace_service.get_starred_nexas(current_user['uid'], page, page_size)
        return result
        
    except Exception as e:
        logger.error(f"Error getting starred Nexas: {str(e)}")
        return NexaListResponse(
            nexas=[], total=0, page=1, page_size=page_size,
            total_pages=0, has_next=False, has_prev=False
        )


# =============================================================================
# UTILITY ENDPOINTS
# =============================================================================

@router.get(
    "/categories/",
    response_model=List[dict],
    summary="Get Categories",
    description="Get all available Nexa categories"
)
@rate_limit(requests_per_minute=500)
async def get_categories():
    """Get all available categories"""
    try:
        categories = [
            {"value": cat.value, "label": cat.value.replace("_", " ").title()}
            for cat in NexaCategory
        ]
        return categories
    except Exception as e:
        logger.error(f"Error getting categories: {str(e)}")
        return []


@router.get(
    "/pricing-models/",
    response_model=List[dict],
    summary="Get Pricing Models",
    description="Get all available pricing models"
)
@rate_limit(requests_per_minute=500)
async def get_pricing_models():
    """Get all available pricing models"""
    try:
        models = [
            {"value": model.value, "label": model.value.replace("_", " ").title()}
            for model in PricingModel
        ]
        return models
    except Exception as e:
        logger.error(f"Error getting pricing models: {str(e)}")
        return []


@router.get(
    "/license-types/",
    response_model=List[dict],
    summary="Get License Types",
    description="Get all available license types"
)
@rate_limit(requests_per_minute=500)
async def get_license_types():
    """Get all available license types"""
    try:
        licenses = [
            {"value": lic.value, "label": lic.value.replace("_", " ").title()}
            for lic in LicenseType
        ]
        return licenses
    except Exception as e:
        logger.error(f"Error getting license types: {str(e)}")
        return []