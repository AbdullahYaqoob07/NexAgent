from pydantic import BaseModel, Field, validator, HttpUrl
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class IntegrationCategory(str, Enum):
    """Integration categories"""
    COMMUNICATION = "communication"
    STORAGE = "storage"
    PRODUCTIVITY = "productivity"
    PAYMENTS = "payments"
    CRM = "crm"
    ANALYTICS = "analytics"
    DATABASES = "databases"
    AI_ML = "ai_ml"
    SOCIAL = "social"
    OTHER = "other"


class AuthType(str, Enum):
    """Authentication types"""
    OAUTH2 = "oauth2"
    API_KEY = "api_key"
    BASIC = "basic"
    BEARER = "bearer"
    CUSTOM = "custom"


class ConnectionStatus(str, Enum):
    """Connection status"""
    ACTIVE = "active"
    EXPIRED = "expired"
    ERROR = "error"
    TESTING = "testing"


class WebhookStatus(str, Enum):
    """Webhook status"""
    ACTIVE = "active"
    PAUSED = "paused"
    ERROR = "error"


# ==================== Integration Catalog Models ====================

class IntegrationResponse(BaseModel):
    """Response model for integration details"""
    id: str
    name: str
    description: str
    category: str
    logo: Optional[str] = None
    authType: str
    scopes: List[str] = []
    isActive: bool = True
    popularity: int = 0
    requiredFields: List[str] = []
    documentation: Optional[str] = None
    tags: List[str] = []
    webhookSupport: bool = False
    
    class Config:
        from_attributes = True


class IntegrationListResponse(BaseModel):
    """Response model for integration list"""
    success: bool = True
    integrations: List[IntegrationResponse]
    total: int
    page: int
    pageSize: int


class IntegrationDetailResponse(BaseModel):
    """Response model for single integration with full details"""
    success: bool = True
    integration: IntegrationResponse


class CategoryResponse(BaseModel):
    """Response model for integration category"""
    id: str
    name: str
    description: str
    icon: Optional[str] = None
    integrationCount: int = 0


class CategoriesListResponse(BaseModel):
    """Response model for categories list"""
    success: bool = True
    categories: List[CategoryResponse]


# ==================== Connection Models ====================

class ConnectionCreateRequest(BaseModel):
    """Request model for creating a connection (manual credentials)"""
    integrationId: str = Field(..., description="Integration ID")
    name: str = Field(..., min_length=3, max_length=100, description="Connection name")
    authType: AuthType = Field(..., description="Authentication type")
    credentials: Dict[str, str] = Field(..., description="Credentials (will be encrypted)")
    metadata: Optional[Dict[str, Any]] = Field(default={}, description="Additional metadata")
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) < 3:
            raise ValueError('Connection name must be at least 3 characters')
        return v.strip()


class ConnectionUpdateRequest(BaseModel):
    """Request model for updating a connection"""
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    credentials: Optional[Dict[str, str]] = None
    metadata: Optional[Dict[str, Any]] = None
    status: Optional[ConnectionStatus] = None


class ConnectionResponse(BaseModel):
    """Response model for connection details"""
    id: str
    userId: str
    integrationId: str
    integrationName: str
    name: str
    authType: str
    status: str
    metadata: Dict[str, Any] = {}
    lastTested: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime
    
    # Never expose actual credentials in response
    hasCredentials: bool = True
    
    class Config:
        from_attributes = True


class ConnectionListResponse(BaseModel):
    """Response model for connection list"""
    success: bool = True
    connections: List[ConnectionResponse]
    total: int


class ConnectionDetailResponse(BaseModel):
    """Response model for single connection"""
    success: bool = True
    connection: ConnectionResponse


class ConnectionTestResponse(BaseModel):
    """Response model for connection test"""
    success: bool = True
    status: str
    message: str
    details: Optional[Dict[str, Any]] = None


class ConnectionStatsResponse(BaseModel):
    """Response model for connection statistics"""
    success: bool = True
    totalConnections: int
    activeConnections: int
    expiredConnections: int
    errorConnections: int
    byIntegration: List[Dict[str, Any]]


# ==================== OAuth Models ====================

class OAuthAuthorizeRequest(BaseModel):
    """Request model for initiating OAuth flow"""
    integrationId: str = Field(..., description="Integration ID")
    redirectUri: Optional[str] = Field(None, description="Custom redirect URI")
    state: Optional[str] = Field(None, description="Custom state parameter")


class OAuthAuthorizeResponse(BaseModel):
    """Response model for OAuth authorization URL"""
    success: bool = True
    authorizationUrl: str
    state: str
    expiresIn: int = 600  # 10 minutes


class OAuthCallbackRequest(BaseModel):
    """Request model for OAuth callback"""
    code: str = Field(..., description="Authorization code")
    state: str = Field(..., description="State parameter")


class OAuthExchangeRequest(BaseModel):
    """Request model for exchanging auth code for tokens"""
    code: str = Field(..., description="Authorization code")
    state: str = Field(..., description="State parameter")
    redirectUri: Optional[str] = None


class OAuthExchangeResponse(BaseModel):
    """Response model after token exchange"""
    success: bool = True
    connectionId: str
    message: str = "OAuth connection established successfully"


class OAuthRefreshRequest(BaseModel):
    """Request model for refreshing OAuth token"""
    connectionId: str = Field(..., description="Connection ID")


class OAuthRefreshResponse(BaseModel):
    """Response model after token refresh"""
    success: bool = True
    message: str = "Token refreshed successfully"
    expiresIn: Optional[int] = None


# ==================== Credentials Models ====================

class CredentialCreateRequest(BaseModel):
    """Request model for storing credentials"""
    integrationId: str = Field(..., description="Integration ID")
    name: str = Field(..., min_length=3, max_length=100, description="Credential name")
    type: str = Field(..., description="Credential type (api_key, token, password, etc.)")
    value: str = Field(..., description="Credential value (will be encrypted)")
    metadata: Optional[Dict[str, Any]] = Field(default={}, description="Additional metadata")


class CredentialUpdateRequest(BaseModel):
    """Request model for updating credential"""
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    value: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class CredentialResponse(BaseModel):
    """Response model for credential (metadata only, never exposes actual value)"""
    id: str
    userId: str
    integrationId: str
    integrationName: str
    name: str
    type: str
    metadata: Dict[str, Any] = {}
    createdAt: datetime
    lastUsed: Optional[datetime] = None
    
    # Security: Never expose actual credential value
    hasValue: bool = True
    
    class Config:
        from_attributes = True


class CredentialListResponse(BaseModel):
    """Response model for credentials list"""
    success: bool = True
    credentials: List[CredentialResponse]
    total: int


class CredentialDetailResponse(BaseModel):
    """Response model for single credential"""
    success: bool = True
    credential: CredentialResponse


class CredentialTestResponse(BaseModel):
    """Response model for credential test"""
    success: bool = True
    status: str
    message: str


# ==================== Webhook Models ====================

class WebhookCreateRequest(BaseModel):
    """Request model for creating webhook"""
    name: str = Field(..., min_length=3, max_length=100, description="Webhook name")
    events: List[str] = Field(..., min_items=1, description="Events to listen for")
    description: Optional[str] = Field(None, max_length=500)
    metadata: Optional[Dict[str, Any]] = Field(default={}, description="Additional metadata")


class WebhookUpdateRequest(BaseModel):
    """Request model for updating webhook"""
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    events: Optional[List[str]] = Field(None, min_items=1)
    description: Optional[str] = None
    status: Optional[WebhookStatus] = None
    metadata: Optional[Dict[str, Any]] = None


class WebhookResponse(BaseModel):
    """Response model for webhook details"""
    id: str
    userId: str
    name: str
    url: str
    secret: str  # Webhook secret for signature verification
    status: str
    events: List[str]
    description: Optional[str] = None
    metadata: Dict[str, Any] = {}
    deliveryCount: int = 0
    lastDelivery: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime
    
    class Config:
        from_attributes = True


class WebhookListResponse(BaseModel):
    """Response model for webhook list"""
    success: bool = True
    webhooks: List[WebhookResponse]
    total: int


class WebhookDetailResponse(BaseModel):
    """Response model for single webhook"""
    success: bool = True
    webhook: WebhookResponse


class WebhookRegenerateResponse(BaseModel):
    """Response model after regenerating webhook secret"""
    success: bool = True
    message: str = "Webhook secret regenerated successfully"
    newSecret: str


class WebhookLogResponse(BaseModel):
    """Response model for webhook delivery log"""
    id: str
    webhookId: str
    timestamp: datetime
    status: str
    statusCode: int
    duration: int  # milliseconds
    payload: Dict[str, Any]
    response: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class WebhookLogsListResponse(BaseModel):
    """Response model for webhook logs list"""
    success: bool = True
    logs: List[WebhookLogResponse]
    total: int
    page: int
    pageSize: int


# ==================== Search & Filter Models ====================

class IntegrationSearchRequest(BaseModel):
    """Request model for searching integrations"""
    query: Optional[str] = Field(None, description="Search query")
    category: Optional[IntegrationCategory] = Field(None, description="Filter by category")
    authType: Optional[AuthType] = Field(None, description="Filter by auth type")
    tags: Optional[List[str]] = Field(default=[], description="Filter by tags")
    page: int = Field(default=1, ge=1, description="Page number")
    pageSize: int = Field(default=20, ge=1, le=100, description="Items per page")


# ==================== Admin Models ====================

class IntegrationCreateRequest(BaseModel):
    """Request model for creating new integration (admin only)"""
    id: str = Field(..., min_length=2, max_length=50, description="Unique integration ID")
    name: str = Field(..., min_length=3, max_length=100)
    description: str = Field(..., min_length=10, max_length=1000)
    category: IntegrationCategory
    logo: Optional[str] = None
    authType: AuthType
    scopes: List[str] = []
    requiredFields: List[str] = []
    documentation: Optional[str] = None
    tags: List[str] = []
    webhookSupport: bool = False
    isActive: bool = True
    
    @validator('id')
    def validate_id(cls, v):
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Integration ID must be alphanumeric with _ or -')
        return v.lower()


class IntegrationUpdateRequest(BaseModel):
    """Request model for updating integration (admin only)"""
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[IntegrationCategory] = None
    logo: Optional[str] = None
    authType: Optional[AuthType] = None
    scopes: Optional[List[str]] = None
    requiredFields: Optional[List[str]] = None
    documentation: Optional[str] = None
    tags: Optional[List[str]] = None
    webhookSupport: Optional[bool] = None
    isActive: Optional[bool] = None
