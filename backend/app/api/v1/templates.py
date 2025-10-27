from fastapi import APIRouter, HTTPException, Depends, status, Query, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.template_models import (
    TemplateCreateRequest,
    TemplateUpdateRequest,
    TemplateResponse,
    TemplateListResponse,
    TemplateDetailResponse,
    TemplateCloneRequest,
    TemplateCloneResponse,
    CategoryResponse,
    CategoriesListResponse,
    TemplateRatingRequest,
    TemplateRatingsListResponse,
    BookmarkToggleRequest,
    BookmarkResponse,
    BookmarkedTemplatesResponse,
    TemplateSearchRequest,
    TemplateStatsResponse,
    TemplateFeaturedToggleRequest,
    TemplateActiveToggleRequest,
    TemplateSortBy
)
from app.services.firebase_service import firebase_service
from app.services.template_service import template_service
from app.core.security import rate_limit
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/templates", tags=["Templates"])
security = HTTPBearer()


# ==================== Authentication Dependency ====================

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Dependency to get current user from Authorization token
    """
    try:
        token = credentials.credentials
        decoded_token = await firebase_service.verify_token(token)
        
        if not decoded_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        
        return decoded_token
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auth dependency error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )


async def get_optional_user(request: Request) -> Optional[dict]:
    """
    Optional authentication - returns user if token is valid, None otherwise
    """
    try:
        auth_header = request.headers.get("authorization", "")
        if not auth_header.startswith("Bearer "):
            return None
        
        token = auth_header[7:]
        decoded_token = await firebase_service.verify_token(token)
        return decoded_token
        
    except Exception:
        return None


# ==================== Template CRUD Endpoints ====================

@router.post("", response_model=TemplateDetailResponse, status_code=status.HTTP_201_CREATED)
@rate_limit(requests_per_minute=20)
async def create_template(
    request: Request,
    data: TemplateCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new template from an existing workflow
    
    **Requires authentication**
    
    Creates a template that can be shared with other users.
    The template is created from one of your existing workflows.
    """
    try:
        user_id = current_user['uid']
        
        result = await template_service.create_template(
            workflow_id=data.workflowId,
            user_id=user_id,
            name=data.name,
            description=data.description,
            category=data.category,
            tags=data.tags,
            difficulty=data.difficulty.value,
            required_integrations=data.requiredIntegrations,
            estimated_time=data.estimatedTime
        )
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Failed to create template')
            )
        
        template = result['template']
        
        return TemplateDetailResponse(
            success=True,
            template=TemplateResponse(**template),
            isBookmarked=False,
            userRating=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create template error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create template"
        )


@router.get("/search", response_model=TemplateListResponse)
@rate_limit(requests_per_minute=100)
async def search_templates(
    request: Request,
    query: Optional[str] = Query(None, description="Search query"),
    category: Optional[str] = Query(None, description="Filter by category"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty (beginner, intermediate, advanced)"),
    sortBy: TemplateSortBy = Query(TemplateSortBy.POPULAR, description="Sort order"),
    page: int = Query(1, ge=1, description="Page number"),
    pageSize: int = Query(20, ge=1, le=100, description="Items per page")
):
    """
    Search and filter templates
    
    **No authentication required**
    
    Search templates by name, description, tags, category, and difficulty.
    Results can be sorted by popularity, rating, newest, or most used.
    """
    try:
        result = await template_service.search_templates(
            query=query,
            category=category,
            tags=tags,
            difficulty=difficulty,
            sort_by=sortBy.value,
            page=page,
            page_size=pageSize
        )
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get('error', 'Failed to search templates')
            )
        
        templates = [TemplateResponse(**t) for t in result['templates']]
        
        return TemplateListResponse(
            success=True,
            templates=templates,
            total=result['total'],
            page=result['page'],
            pageSize=result['pageSize']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Search templates error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search templates"
        )


@router.get("/featured", response_model=TemplateListResponse)
@rate_limit(requests_per_minute=100)
async def get_featured_templates(
    request: Request,
    limit: int = Query(10, ge=1, le=50, description="Number of templates to return")
):
    """
    Get featured templates
    
    **No authentication required**
    
    Returns curated featured templates with high ratings.
    """
    try:
        result = await template_service.get_featured_templates(limit=limit)
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get('error', 'Failed to get featured templates')
            )
        
        templates = [TemplateResponse(**t) for t in result['templates']]
        
        return TemplateListResponse(
            success=True,
            templates=templates,
            total=len(templates),
            page=1,
            pageSize=limit
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get featured templates error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get featured templates"
        )


@router.get("/my-templates", response_model=TemplateListResponse)
@rate_limit(requests_per_minute=50)
async def get_my_templates(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all templates created by the authenticated user
    
    **Requires authentication**
    """
    try:
        user_id = current_user['uid']
        
        result = await template_service.get_user_templates(user_id)
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get('error', 'Failed to get templates')
            )
        
        templates = [TemplateResponse(**t) for t in result['templates']]
        
        return TemplateListResponse(
            success=True,
            templates=templates,
            total=result['total'],
            page=1,
            pageSize=result['total']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get my templates error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get templates"
        )


@router.get("/{template_id}", response_model=TemplateDetailResponse)
@rate_limit(requests_per_minute=100)
async def get_template(
    request: Request,
    template_id: str,
    user: Optional[dict] = Depends(get_optional_user)
):
    """
    Get a specific template by ID
    
    **Authentication optional**
    
    Returns template details including whether the current user has bookmarked it
    and their rating (if authenticated).
    """
    try:
        user_id = user['uid'] if user else None
        
        result = await template_service.get_template(template_id, user_id)
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result.get('error', 'Template not found')
            )
        
        template = result['template']
        
        return TemplateDetailResponse(
            success=True,
            template=TemplateResponse(**template),
            isBookmarked=result.get('isBookmarked', False),
            userRating=result.get('userRating')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get template error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get template"
        )


@router.put("/{template_id}", response_model=dict)
@rate_limit(requests_per_minute=20)
async def update_template(
    request: Request,
    template_id: str,
    data: TemplateUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a template
    
    **Requires authentication**
    
    Only the template author can update it.
    """
    try:
        user_id = current_user['uid']
        
        # Build updates dict
        updates = {}
        if data.name is not None:
            updates['name'] = data.name
        if data.description is not None:
            updates['description'] = data.description
        if data.category is not None:
            updates['category'] = data.category
        if data.tags is not None:
            updates['tags'] = data.tags
        if data.difficulty is not None:
            updates['difficulty'] = data.difficulty.value
        if data.requiredIntegrations is not None:
            updates['requiredIntegrations'] = data.requiredIntegrations
        if data.estimatedTime is not None:
            updates['estimatedTime'] = data.estimatedTime
        if data.isActive is not None:
            updates['isActive'] = data.isActive
        
        result = await template_service.update_template(template_id, user_id, updates)
        
        if not result['success']:
            error = result.get('error', 'Failed to update template')
            if 'author' in error.lower() or 'unauthorized' in error.lower():
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=error)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)
        
        return {"success": True, "message": "Template updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update template error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update template"
        )


@router.delete("/{template_id}", response_model=dict)
@rate_limit(requests_per_minute=20)
async def delete_template(
    request: Request,
    template_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a template (soft delete - marks as inactive)
    
    **Requires authentication**
    
    Only the template author can delete it.
    """
    try:
        user_id = current_user['uid']
        
        result = await template_service.delete_template(template_id, user_id)
        
        if not result['success']:
            error = result.get('error', 'Failed to delete template')
            if 'author' in error.lower() or 'unauthorized' in error.lower():
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=error)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)
        
        return {"success": True, "message": "Template deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete template error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete template"
        )


# ==================== Template Clone Endpoint ====================

@router.post("/clone", response_model=TemplateCloneResponse)
@rate_limit(requests_per_minute=30)
async def clone_template(
    request: Request,
    data: TemplateCloneRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Clone a template into your workflows
    
    **Requires authentication**
    
    Creates a new workflow in your account based on the template.
    """
    try:
        user_id = current_user['uid']
        
        result = await template_service.clone_template(
            template_id=data.templateId,
            user_id=user_id,
            workflow_name=data.workflowName,
            customize_variables=data.customizeVariables
        )
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Failed to clone template')
            )
        
        return TemplateCloneResponse(
            success=True,
            message=result['message'],
            workflowId=result['workflowId'],
            workflowName=result['workflowName']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Clone template error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clone template"
        )


# ==================== Category Endpoints ====================

@router.get("/categories/all", response_model=CategoriesListResponse)
@rate_limit(requests_per_minute=100)
async def get_categories(request: Request):
    """
    Get all template categories
    
    **No authentication required**
    """
    try:
        result = await template_service.get_categories()
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get('error', 'Failed to get categories')
            )
        
        categories = [CategoryResponse(**c) for c in result['categories']]
        
        return CategoriesListResponse(
            success=True,
            categories=categories
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get categories error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get categories"
        )


# ==================== Rating & Review Endpoints ====================

@router.post("/{template_id}/rate", response_model=dict)
@rate_limit(requests_per_minute=20)
async def rate_template(
    request: Request,
    template_id: str,
    data: TemplateRatingRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Rate and review a template
    
    **Requires authentication**
    
    Rate a template from 1 to 5 stars with an optional review.
    """
    try:
        user_id = current_user['uid']
        
        result = await template_service.rate_template(
            template_id=template_id,
            user_id=user_id,
            rating=data.rating,
            review=data.review
        )
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Failed to rate template')
            )
        
        return {
            "success": True,
            "message": f"Rating {result['action']} successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Rate template error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to rate template"
        )


@router.get("/{template_id}/ratings", response_model=TemplateRatingsListResponse)
@rate_limit(requests_per_minute=100)
async def get_template_ratings(
    request: Request,
    template_id: str
):
    """
    Get all ratings and reviews for a template
    
    **No authentication required**
    """
    try:
        result = await template_service.get_template_ratings(template_id)
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get('error', 'Failed to get ratings')
            )
        
        return TemplateRatingsListResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get ratings error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get ratings"
        )


# ==================== Bookmark Endpoints ====================

@router.post("/bookmark/toggle", response_model=BookmarkResponse)
@rate_limit(requests_per_minute=50)
async def toggle_bookmark(
    request: Request,
    data: BookmarkToggleRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Toggle bookmark for a template
    
    **Requires authentication**
    
    Add or remove a template from your bookmarks.
    """
    try:
        user_id = current_user['uid']
        
        result = await template_service.toggle_bookmark(
            template_id=data.templateId,
            user_id=user_id
        )
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Failed to toggle bookmark')
            )
        
        return BookmarkResponse(
            success=True,
            message=result['message'],
            isBookmarked=result['isBookmarked']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Toggle bookmark error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to toggle bookmark"
        )


@router.get("/bookmarks/my-bookmarks", response_model=BookmarkedTemplatesResponse)
@rate_limit(requests_per_minute=50)
async def get_my_bookmarks(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all bookmarked templates for the authenticated user
    
    **Requires authentication**
    """
    try:
        user_id = current_user['uid']
        
        result = await template_service.get_user_bookmarks(user_id)
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get('error', 'Failed to get bookmarks')
            )
        
        templates = [TemplateResponse(**t) for t in result['templates']]
        
        return BookmarkedTemplatesResponse(
            success=True,
            templates=templates,
            total=result['total']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get bookmarks error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get bookmarks"
        )


# ==================== Statistics Endpoint ====================

@router.get("/stats/overview", response_model=TemplateStatsResponse)
@rate_limit(requests_per_minute=50)
async def get_template_statistics(request: Request):
    """
    Get overall template statistics
    
    **No authentication required**
    
    Returns statistics including total templates, categories, usage, and trending templates.
    """
    try:
        result = await template_service.get_template_statistics()
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get('error', 'Failed to get statistics')
            )
        
        trending_templates = [TemplateResponse(**t) for t in result.get('trendingTemplates', [])]
        
        return TemplateStatsResponse(
            success=True,
            totalTemplates=result['totalTemplates'],
            totalCategories=result['totalCategories'],
            totalUsage=result['totalUsage'],
            averageRating=result['averageRating'],
            popularCategories=result.get('popularCategories', []),
            trendingTemplates=trending_templates
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get statistics error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get statistics"
        )


# ==================== Admin Endpoints (TODO: Add admin authentication) ====================

@router.post("/admin/toggle-featured", response_model=dict)
@rate_limit(requests_per_minute=20)
async def toggle_featured_status(
    request: Request,
    data: TemplateFeaturedToggleRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Toggle featured status for a template (Admin only)
    
    **Requires admin authentication**
    
    TODO: Add admin role verification
    """
    try:
        # TODO: Verify user is admin
        # For now, allow any authenticated user (update in production)
        
        result = await template_service.toggle_featured(
            template_id=data.templateId,
            is_featured=data.isFeatured
        )
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Failed to toggle featured status')
            )
        
        return {"success": True, "message": result.get('message', 'Status updated')}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Toggle featured error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to toggle featured status"
        )


@router.post("/admin/toggle-active", response_model=dict)
@rate_limit(requests_per_minute=20)
async def toggle_active_status(
    request: Request,
    data: TemplateActiveToggleRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Toggle active status for a template (Admin only)
    
    **Requires admin authentication**
    
    TODO: Add admin role verification
    """
    try:
        # TODO: Verify user is admin
        # For now, allow any authenticated user (update in production)
        
        result = await template_service.toggle_active(
            template_id=data.templateId,
            is_active=data.isActive
        )
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Failed to toggle active status')
            )
        
        return {"success": True, "message": result.get('message', 'Status updated')}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Toggle active error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to toggle active status"
        )
