from fastapi import APIRouter, HTTPException, Depends, status, Query, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.integration_models import *
from app.services.firebase_service import firebase_service
from app.services.integration_service import integration_service
from app.core.security import rate_limit
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integrations", tags=["Integrations"])
security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Get current user from token"""
    try:
        token = credentials.credentials
        decoded_token = await firebase_service.verify_token(token)
        if not decoded_token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return decoded_token
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auth error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication failed")


async def get_optional_user(request: Request) -> Optional[dict]:
    """Optional authentication"""
    try:
        auth_header = request.headers.get("authorization", "")
        if not auth_header.startswith("Bearer "):
            return None
        token = auth_header[7:]
        return await firebase_service.verify_token(token)
    except:
        return None


# ==================== Integration Catalog ====================

@router.get("", response_model=IntegrationListResponse)
@rate_limit(requests_per_minute=100)
async def get_integrations(
    request: Request,
    category: Optional[str] = Query(None),
    authType: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100)
):
    """Get all available integrations"""
    try:
        result = await integration_service.get_integrations(category, authType, page, pageSize)
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        integrations = [IntegrationResponse(**i) for i in result['integrations']]
        return IntegrationListResponse(
            success=True,
            integrations=integrations,
            total=result['total'],
            page=result['page'],
            pageSize=result['pageSize']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get integrations error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get integrations")


@router.get("/{integration_id}", response_model=IntegrationDetailResponse)
@rate_limit(requests_per_minute=100)
async def get_integration(request: Request, integration_id: str):
    """Get integration by ID"""
    try:
        result = await integration_service.get_integration(integration_id)
        if not result['success']:
            raise HTTPException(status_code=404, detail=result.get('error'))
        
        return IntegrationDetailResponse(
            success=True,
            integration=IntegrationResponse(**result['integration'])
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get integration error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get integration")


@router.get("/search/query", response_model=IntegrationListResponse)
@rate_limit(requests_per_minute=100)
async def search_integrations(
    request: Request,
    query: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    authType: Optional[str] = Query(None),
    tags: Optional[List[str]] = Query(None),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100)
):
    """Search integrations"""
    try:
        result = await integration_service.search_integrations(query, category, authType, tags, page, pageSize)
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        integrations = [IntegrationResponse(**i) for i in result['integrations']]
        return IntegrationListResponse(
            success=True,
            integrations=integrations,
            total=result['total'],
            page=result['page'],
            pageSize=result['pageSize']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Search integrations error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to search integrations")


@router.get("/popular/list", response_model=IntegrationListResponse)
@rate_limit(requests_per_minute=100)
async def get_popular_integrations(
    request: Request,
    limit: int = Query(10, ge=1, le=50)
):
    """Get popular integrations"""
    try:
        result = await integration_service.get_popular_integrations(limit)
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        integrations = [IntegrationResponse(**i) for i in result['integrations']]
        return IntegrationListResponse(
            success=True,
            integrations=integrations,
            total=len(integrations),
            page=1,
            pageSize=limit
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get popular integrations error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get popular integrations")


@router.get("/categories/all", response_model=CategoriesListResponse)
@rate_limit(requests_per_minute=100)
async def get_categories(request: Request):
    """Get all integration categories"""
    try:
        result = await integration_service.get_categories()
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        categories = [CategoryResponse(**c) for c in result['categories']]
        return CategoriesListResponse(success=True, categories=categories)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get categories error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get categories")


@router.get("/{integration_id}/documentation", response_model=dict)
@rate_limit(requests_per_minute=100)
async def get_integration_documentation(request: Request, integration_id: str):
    """Get integration documentation"""
    try:
        result = await integration_service.get_integration(integration_id)
        if not result['success']:
            raise HTTPException(status_code=404, detail=result.get('error'))
        
        integration = result['integration']
        return {
            "success": True,
            "documentation": integration.get('documentation', 'No documentation available'),
            "requiredFields": integration.get('requiredFields', []),
            "scopes": integration.get('scopes', [])
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get documentation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get documentation")


# ==================== Connection Management ====================

@router.post("/connections", response_model=ConnectionDetailResponse, status_code=201)
@rate_limit(requests_per_minute=20)
async def create_connection(
    request: Request,
    data: ConnectionCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new connection with manual credentials"""
    try:
        user_id = current_user['uid']
        result = await integration_service.create_connection(
            user_id, data.integrationId, data.name, data.authType.value,
            data.credentials, data.metadata
        )
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result.get('error'))
        
        connection_data = result['data']
        connection_data.pop('credentials', None)
        return ConnectionDetailResponse(
            success=True,
            connection=ConnectionResponse(**connection_data)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create connection error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create connection")


@router.get("/connections", response_model=ConnectionListResponse)
@rate_limit(requests_per_minute=50)
async def get_connections(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get all user connections"""
    try:
        user_id = current_user['uid']
        result = await integration_service.get_user_connections(user_id)
        
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        connections = [ConnectionResponse(**c) for c in result['connections']]
        return ConnectionListResponse(
            success=True,
            connections=connections,
            total=result['total']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get connections error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get connections")


@router.get("/connections/{connection_id}", response_model=ConnectionDetailResponse)
@rate_limit(requests_per_minute=50)
async def get_connection(
    request: Request,
    connection_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get specific connection"""
    try:
        user_id = current_user['uid']
        result = await integration_service.get_connection(connection_id, user_id)
        
        if not result['success']:
            raise HTTPException(status_code=404, detail=result.get('error'))
        
        return ConnectionDetailResponse(
            success=True,
            connection=ConnectionResponse(**result['connection'])
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get connection error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get connection")


@router.put("/connections/{connection_id}", response_model=dict)
@rate_limit(requests_per_minute=20)
async def update_connection(
    request: Request,
    connection_id: str,
    data: ConnectionUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update connection"""
    try:
        user_id = current_user['uid']
        updates = {}
        if data.name: updates['name'] = data.name
        if data.credentials: updates['credentials'] = data.credentials
        if data.metadata: updates['metadata'] = data.metadata
        if data.status: updates['status'] = data.status.value
        
        result = await integration_service.update_connection(connection_id, user_id, updates)
        
        if not result['success']:
            error = result.get('error', '')
            if 'not found' in error.lower():
                raise HTTPException(status_code=404, detail=error)
            if 'unauthorized' in error.lower():
                raise HTTPException(status_code=403, detail=error)
            raise HTTPException(status_code=400, detail=error)
        
        return {"success": True, "message": "Connection updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update connection error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update connection")


@router.delete("/connections/{connection_id}", response_model=dict)
@rate_limit(requests_per_minute=20)
async def delete_connection(
    request: Request,
    connection_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete connection"""
    try:
        user_id = current_user['uid']
        result = await integration_service.delete_connection(connection_id, user_id)
        
        if not result['success']:
            error = result.get('error', '')
            if 'not found' in error.lower():
                raise HTTPException(status_code=404, detail=error)
            if 'unauthorized' in error.lower():
                raise HTTPException(status_code=403, detail=error)
            raise HTTPException(status_code=400, detail=error)
        
        return {"success": True, "message": "Connection deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete connection error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete connection")


@router.post("/connections/{connection_id}/test", response_model=ConnectionTestResponse)
@rate_limit(requests_per_minute=30)
async def test_connection(
    request: Request,
    connection_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Test connection validity"""
    try:
        user_id = current_user['uid']
        result = await integration_service.test_connection(connection_id, user_id)
        
        if not result['success']:
            return ConnectionTestResponse(
                success=False,
                status=result.get('status', 'error'),
                message=result.get('message', 'Test failed')
            )
        
        return ConnectionTestResponse(**result)
    except Exception as e:
        logger.error(f"Test connection error: {str(e)}")
        return ConnectionTestResponse(
            success=False,
            status='error',
            message=str(e)
        )


@router.post("/connections/{connection_id}/refresh", response_model=dict)
@rate_limit(requests_per_minute=20)
async def refresh_connection(
    request: Request,
    connection_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Refresh OAuth token"""
    try:
        user_id = current_user['uid']
        result = await integration_service.refresh_connection(connection_id, user_id)
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result.get('error'))
        
        return {"success": True, "message": result['message']}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Refresh connection error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to refresh connection")


@router.get("/connections/stats/summary", response_model=ConnectionStatsResponse)
@rate_limit(requests_per_minute=50)
async def get_connection_stats(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get connection statistics"""
    try:
        user_id = current_user['uid']
        result = await integration_service.get_connection_stats(user_id)
        
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        return ConnectionStatsResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get stats error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get statistics")


# ==================== OAuth Flow ====================

@router.post("/oauth/authorize", response_model=OAuthAuthorizeResponse)
@rate_limit(requests_per_minute=10)
async def oauth_authorize(
    request: Request,
    data: OAuthAuthorizeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Initiate OAuth flow"""
    try:
        user_id = current_user['uid']
        result = await integration_service.initiate_oauth_flow(
            user_id, data.integrationId, data.redirectUri
        )
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result.get('error'))
        
        return OAuthAuthorizeResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OAuth authorize error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to initiate OAuth")


@router.get("/oauth/callback", response_model=dict)
@rate_limit(requests_per_minute=10)
async def oauth_callback(
    request: Request,
    code: str = Query(...),
    state: str = Query(...)
):
    """OAuth callback handler"""
    try:
        return {
            "success": True,
            "message": "OAuth callback received",
            "code": code,
            "state": state
        }
    except Exception as e:
        logger.error(f"OAuth callback error: {str(e)}")
        raise HTTPException(status_code=500, detail="OAuth callback failed")


@router.post("/oauth/exchange", response_model=OAuthExchangeResponse)
@rate_limit(requests_per_minute=10)
async def oauth_exchange(
    request: Request,
    data: OAuthExchangeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Exchange OAuth code for tokens"""
    try:
        user_id = current_user['uid']
        result = await integration_service.exchange_oauth_code(
            user_id, data.code, data.state, data.redirectUri
        )
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result.get('error'))
        
        return OAuthExchangeResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OAuth exchange error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to exchange OAuth code")


@router.post("/oauth/refresh", response_model=OAuthRefreshResponse)
@rate_limit(requests_per_minute=20)
async def oauth_refresh(
    request: Request,
    data: OAuthRefreshRequest,
    current_user: dict = Depends(get_current_user)
):
    """Refresh OAuth token"""
    try:
        user_id = current_user['uid']
        result = await integration_service.refresh_connection(data.connectionId, user_id)
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result.get('error'))
        
        return OAuthRefreshResponse(
            success=True,
            message=result['message']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OAuth refresh error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to refresh token")


@router.post("/oauth/revoke", response_model=dict)
@rate_limit(requests_per_minute=20)
async def oauth_revoke(
    request: Request,
    connectionId: str,
    current_user: dict = Depends(get_current_user)
):
    """Revoke OAuth tokens"""
    try:
        user_id = current_user['uid']
        result = await integration_service.delete_connection(connectionId, user_id)
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result.get('error'))
        
        return {"success": True, "message": "OAuth tokens revoked"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OAuth revoke error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to revoke tokens")


# ==================== Credentials Management ====================

@router.post("/credentials", response_model=CredentialDetailResponse, status_code=201)
@rate_limit(requests_per_minute=20)
async def create_credential(
    request: Request,
    data: CredentialCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Store encrypted credential"""
    try:
        user_id = current_user['uid']
        result = await integration_service.create_credential(
            user_id, data.integrationId, data.name, data.type, data.value, data.metadata
        )
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result.get('error'))
        
        cred_result = await integration_service.get_credential(result['credentialId'], user_id)
        if not cred_result['success']:
            raise HTTPException(status_code=500, detail="Credential created but failed to retrieve")
        
        return CredentialDetailResponse(
            success=True,
            credential=CredentialResponse(**cred_result['credential'])
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create credential error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create credential")


@router.get("/credentials", response_model=CredentialListResponse)
@rate_limit(requests_per_minute=50)
async def get_credentials(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get all user credentials"""
    try:
        user_id = current_user['uid']
        result = await integration_service.get_user_credentials(user_id)
        
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        credentials = [CredentialResponse(**c) for c in result['credentials']]
        return CredentialListResponse(
            success=True,
            credentials=credentials,
            total=result['total']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get credentials error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get credentials")


@router.get("/credentials/{credential_id}", response_model=CredentialDetailResponse)
@rate_limit(requests_per_minute=50)
async def get_credential(
    request: Request,
    credential_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get specific credential"""
    try:
        user_id = current_user['uid']
        result = await integration_service.get_credential(credential_id, user_id)
        
        if not result['success']:
            raise HTTPException(status_code=404, detail=result.get('error'))
        
        return CredentialDetailResponse(
            success=True,
            credential=CredentialResponse(**result['credential'])
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get credential error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get credential")


@router.put("/credentials/{credential_id}", response_model=dict)
@rate_limit(requests_per_minute=20)
async def update_credential(
    request: Request,
    credential_id: str,
    data: CredentialUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update credential"""
    try:
        user_id = current_user['uid']
        updates = {}
        if data.name: updates['name'] = data.name
        if data.value: updates['value'] = data.value
        if data.metadata: updates['metadata'] = data.metadata
        
        result = await integration_service.update_credential(credential_id, user_id, updates)
        
        if not result['success']:
            error = result.get('error', '')
            if 'not found' in error.lower():
                raise HTTPException(status_code=404, detail=error)
            if 'unauthorized' in error.lower():
                raise HTTPException(status_code=403, detail=error)
            raise HTTPException(status_code=400, detail=error)
        
        return {"success": True, "message": "Credential updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update credential error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update credential")


@router.delete("/credentials/{credential_id}", response_model=dict)
@rate_limit(requests_per_minute=20)
async def delete_credential(
    request: Request,
    credential_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete credential"""
    try:
        user_id = current_user['uid']
        result = await integration_service.delete_credential(credential_id, user_id)
        
        if not result['success']:
            error = result.get('error', '')
            if 'not found' in error.lower():
                raise HTTPException(status_code=404, detail=error)
            if 'unauthorized' in error.lower():
                raise HTTPException(status_code=403, detail=error)
            raise HTTPException(status_code=400, detail=error)
        
        return {"success": True, "message": "Credential deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete credential error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete credential")


@router.post("/credentials/{credential_id}/test", response_model=CredentialTestResponse)
@rate_limit(requests_per_minute=30)
async def test_credential(
    request: Request,
    credential_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Test credential validity"""
    try:
        user_id = current_user['uid']
        result = await integration_service.test_credential(credential_id, user_id)
        
        if not result['success']:
            return CredentialTestResponse(
                success=False,
                status=result.get('status', 'error'),
                message=result.get('message', 'Test failed')
            )
        
        return CredentialTestResponse(**result)
    except Exception as e:
        logger.error(f"Test credential error: {str(e)}")
        return CredentialTestResponse(
            success=False,
            status='error',
            message=str(e)
        )


# ==================== Webhook Management ====================

@router.post("/webhooks", response_model=WebhookDetailResponse, status_code=201)
@rate_limit(requests_per_minute=20)
async def create_webhook(
    request: Request,
    data: WebhookCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create webhook endpoint"""
    try:
        user_id = current_user['uid']
        result = await integration_service.create_webhook(
            user_id, data.name, data.events, data.description, data.metadata
        )
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result.get('error'))
        
        webhook_data = result['data']
        return WebhookDetailResponse(
            success=True,
            webhook=WebhookResponse(**webhook_data)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create webhook error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create webhook")


@router.get("/webhooks", response_model=WebhookListResponse)
@rate_limit(requests_per_minute=50)
async def get_webhooks(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get all user webhooks"""
    try:
        user_id = current_user['uid']
        result = await integration_service.get_user_webhooks(user_id)
        
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        webhooks = [WebhookResponse(**w) for w in result['webhooks']]
        return WebhookListResponse(
            success=True,
            webhooks=webhooks,
            total=result['total']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get webhooks error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get webhooks")


@router.get("/webhooks/{webhook_id}", response_model=WebhookDetailResponse)
@rate_limit(requests_per_minute=50)
async def get_webhook(
    request: Request,
    webhook_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get specific webhook"""
    try:
        user_id = current_user['uid']
        result = await integration_service.get_webhook(webhook_id, user_id)
        
        if not result['success']:
            raise HTTPException(status_code=404, detail=result.get('error'))
        
        return WebhookDetailResponse(
            success=True,
            webhook=WebhookResponse(**result['webhook'])
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get webhook error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get webhook")


@router.put("/webhooks/{webhook_id}", response_model=dict)
@rate_limit(requests_per_minute=20)
async def update_webhook(
    request: Request,
    webhook_id: str,
    data: WebhookUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update webhook"""
    try:
        user_id = current_user['uid']
        updates = {}
        if data.name: updates['name'] = data.name
        if data.events: updates['events'] = data.events
        if data.description is not None: updates['description'] = data.description
        if data.status: updates['status'] = data.status.value
        if data.metadata: updates['metadata'] = data.metadata
        
        result = await integration_service.update_webhook(webhook_id, user_id, updates)
        
        if not result['success']:
            error = result.get('error', '')
            if 'not found' in error.lower():
                raise HTTPException(status_code=404, detail=error)
            if 'unauthorized' in error.lower():
                raise HTTPException(status_code=403, detail=error)
            raise HTTPException(status_code=400, detail=error)
        
        return {"success": True, "message": "Webhook updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update webhook error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update webhook")


@router.delete("/webhooks/{webhook_id}", response_model=dict)
@rate_limit(requests_per_minute=20)
async def delete_webhook(
    request: Request,
    webhook_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete webhook"""
    try:
        user_id = current_user['uid']
        result = await integration_service.delete_webhook(webhook_id, user_id)
        
        if not result['success']:
            error = result.get('error', '')
            if 'not found' in error.lower():
                raise HTTPException(status_code=404, detail=error)
            if 'unauthorized' in error.lower():
                raise HTTPException(status_code=403, detail=error)
            raise HTTPException(status_code=400, detail=error)
        
        return {"success": True, "message": "Webhook deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete webhook error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete webhook")


@router.post("/webhooks/{webhook_id}/regenerate", response_model=WebhookRegenerateResponse)
@rate_limit(requests_per_minute=10)
async def regenerate_webhook_secret(
    request: Request,
    webhook_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Regenerate webhook secret"""
    try:
        user_id = current_user['uid']
        result = await integration_service.regenerate_webhook_secret(webhook_id, user_id)
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result.get('error'))
        
        return WebhookRegenerateResponse(
            success=True,
            message="Webhook secret regenerated successfully",
            newSecret=result['newSecret']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Regenerate secret error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to regenerate secret")


@router.get("/webhooks/{webhook_id}/logs", response_model=WebhookLogsListResponse)
@rate_limit(requests_per_minute=50)
async def get_webhook_logs(
    request: Request,
    webhook_id: str,
    page: int = Query(1, ge=1),
    pageSize: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Get webhook delivery logs"""
    try:
        user_id = current_user['uid']
        result = await integration_service.get_webhook_logs(webhook_id, user_id, page, pageSize)
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result.get('error'))
        
        logs = [WebhookLogResponse(**log) for log in result['logs']]
        return WebhookLogsListResponse(
            success=True,
            logs=logs,
            total=result['total'],
            page=result['page'],
            pageSize=result['pageSize']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get webhook logs error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get webhook logs")
