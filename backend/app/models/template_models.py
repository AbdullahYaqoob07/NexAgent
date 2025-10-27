from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class TemplateDifficulty(str, Enum):
    """Template difficulty levels"""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class TemplateSortBy(str, Enum):
    """Template sorting options"""
    POPULAR = "popular"
    NEWEST = "newest"
    RATING = "rating"
    MOST_USED = "most_used"


# ==================== Template CRUD Models ====================

class TemplateCreateRequest(BaseModel):
    """Request model for creating a template from a workflow"""
    workflowId: str = Field(..., description="Source workflow ID to create template from")
    name: str = Field(..., min_length=3, max_length=100, description="Template name")
    description: str = Field(..., min_length=10, max_length=1000, description="Template description")
    category: str = Field(..., description="Template category")
    tags: List[str] = Field(default=[], max_items=10, description="Template tags")
    difficulty: TemplateDifficulty = Field(default=TemplateDifficulty.BEGINNER, description="Difficulty level")
    requiredIntegrations: List[str] = Field(default=[], description="Required integrations (e.g., gmail, slack)")
    estimatedTime: Optional[str] = Field(None, description="Estimated setup time (e.g., '5 minutes')")
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) < 3:
            raise ValueError('Template name must be at least 3 characters long')
        return v.strip()
    
    @validator('tags')
    def validate_tags(cls, v):
        if len(v) > 10:
            raise ValueError('Maximum 10 tags allowed')
        return [tag.lower().strip() for tag in v if tag.strip()]


class TemplateUpdateRequest(BaseModel):
    """Request model for updating a template"""
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = Field(None, min_length=10, max_length=1000)
    category: Optional[str] = None
    tags: Optional[List[str]] = Field(None, max_items=10)
    difficulty: Optional[TemplateDifficulty] = None
    requiredIntegrations: Optional[List[str]] = None
    estimatedTime: Optional[str] = None
    isActive: Optional[bool] = None


class TemplateResponse(BaseModel):
    """Response model for template data"""
    id: str
    workflowId: str
    authorId: str
    authorName: Optional[str] = None
    name: str
    description: str
    category: str
    tags: List[str]
    difficulty: str
    requiredIntegrations: List[str]
    estimatedTime: Optional[str] = None
    
    # Template preview
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    
    # Statistics
    usageCount: int = 0
    rating: float = 0.0
    reviewCount: int = 0
    bookmarkCount: int = 0
    
    # Status
    isActive: bool = True
    isFeatured: bool = False
    
    # Timestamps
    createdAt: datetime
    updatedAt: datetime
    
    class Config:
        from_attributes = True


class TemplateListResponse(BaseModel):
    """Response model for template list"""
    success: bool = True
    templates: List[TemplateResponse]
    total: int
    page: int
    pageSize: int


class TemplateDetailResponse(BaseModel):
    """Response model for single template with full details"""
    success: bool = True
    template: TemplateResponse
    isBookmarked: Optional[bool] = False
    userRating: Optional[int] = None


# ==================== Template Clone Models ====================

class TemplateCloneRequest(BaseModel):
    """Request model for cloning a template into user's workflows"""
    templateId: str = Field(..., description="Template ID to clone")
    workflowName: Optional[str] = Field(None, description="Custom name for the new workflow")
    customizeVariables: Optional[Dict[str, Any]] = Field(default={}, description="Custom variable values")


class TemplateCloneResponse(BaseModel):
    """Response model after cloning a template"""
    success: bool = True
    message: str = "Template cloned successfully"
    workflowId: str
    workflowName: str


# ==================== Category Models ====================

class CategoryResponse(BaseModel):
    """Response model for template category"""
    id: str
    name: str
    description: str
    icon: Optional[str] = None
    templateCount: int = 0
    isActive: bool = True


class CategoriesListResponse(BaseModel):
    """Response model for categories list"""
    success: bool = True
    categories: List[CategoryResponse]


# ==================== Rating Models ====================

class TemplateRatingRequest(BaseModel):
    """Request model for rating a template"""
    templateId: str
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5 stars")
    review: Optional[str] = Field(None, max_length=500, description="Optional review text")
    
    @validator('rating')
    def validate_rating(cls, v):
        if v < 1 or v > 5:
            raise ValueError('Rating must be between 1 and 5')
        return v


class TemplateRatingResponse(BaseModel):
    """Response model for a single rating"""
    id: str
    templateId: str
    userId: str
    userName: Optional[str] = None
    rating: int
    review: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime


class TemplateRatingsListResponse(BaseModel):
    """Response model for template ratings list"""
    success: bool = True
    ratings: List[TemplateRatingResponse]
    averageRating: float
    totalRatings: int
    ratingDistribution: Dict[str, int] = {}  # {"5": 10, "4": 5, "3": 2, "2": 1, "1": 0}


# ==================== Bookmark Models ====================

class BookmarkToggleRequest(BaseModel):
    """Request model for toggling bookmark"""
    templateId: str


class BookmarkResponse(BaseModel):
    """Response model for bookmark action"""
    success: bool = True
    message: str
    isBookmarked: bool


class BookmarkedTemplatesResponse(BaseModel):
    """Response model for user's bookmarked templates"""
    success: bool = True
    templates: List[TemplateResponse]
    total: int


# ==================== Search Models ====================

class TemplateSearchRequest(BaseModel):
    """Request model for searching templates"""
    query: Optional[str] = Field(None, description="Search query")
    category: Optional[str] = Field(None, description="Filter by category")
    tags: Optional[List[str]] = Field(default=[], description="Filter by tags")
    difficulty: Optional[TemplateDifficulty] = Field(None, description="Filter by difficulty")
    sortBy: TemplateSortBy = Field(default=TemplateSortBy.POPULAR, description="Sort order")
    page: int = Field(default=1, ge=1, description="Page number")
    pageSize: int = Field(default=20, ge=1, le=100, description="Items per page")


# ==================== Statistics Models ====================

class TemplateStatsResponse(BaseModel):
    """Response model for template statistics"""
    success: bool = True
    totalTemplates: int
    totalCategories: int
    totalUsage: int
    averageRating: float
    popularCategories: List[Dict[str, Any]]
    trendingTemplates: List[TemplateResponse]


# ==================== Admin Models ====================

class TemplateFeaturedToggleRequest(BaseModel):
    """Request model for toggling featured status (admin only)"""
    templateId: str
    isFeatured: bool


class TemplateActiveToggleRequest(BaseModel):
    """Request model for toggling active status (admin only)"""
    templateId: str
    isActive: bool
