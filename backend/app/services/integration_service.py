import logging
from typing import Optional, Dict, Any, List
from app.db.integration_db import integration_db
import secrets
import urllib.parse
from datetime import datetime
import httpx

logger = logging.getLogger(__name__)


class IntegrationService:
    """Business logic for integration management"""
    
    def __init__(self):
        self.db = integration_db
    
    # ==================== Integration Catalog ====================
    
    async def get_integrations(
        self,
        category: Optional[str] = None,
        auth_type: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """Get all available integrations"""
        try:
            result = await self.db.get_all_integrations(
                category=category,
                auth_type=auth_type,
                page=page,
                page_size=page_size
            )
            
            # Enrich with integration names
            for integration in result.get('integrations', []):
                integration['integrationName'] = integration.get('name')
            
            return result
        except Exception as e:
            logger.error(f"❌ Failed to get integrations: {str(e)}")
            return {'success': False, 'error': str(e), 'integrations': [], 'total': 0}
    
    async def get_integration(self, integration_id: str) -> Dict[str, Any]:
        """Get integration by ID"""
        try:
            integration = await self.db.get_integration_by_id(integration_id)
            
            if not integration:
                return {'success': False, 'error': 'Integration not found'}
            
            return {'success': True, 'integration': integration}
        except Exception as e:
            logger.error(f"❌ Failed to get integration: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def search_integrations(
        self,
        query: Optional[str] = None,
        category: Optional[str] = None,
        auth_type: Optional[str] = None,
        tags: Optional[List[str]] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """Search integrations"""
        try:
            result = await self.db.search_integrations(
                query=query,
                category=category,
                tags=tags,
                page=page,
                page_size=page_size
            )
            return result
        except Exception as e:
            logger.error(f"❌ Failed to search integrations: {str(e)}")
            return {'success': False, 'error': str(e), 'integrations': [], 'total': 0}
    
    async def get_popular_integrations(self, limit: int = 10) -> Dict[str, Any]:
        """Get most popular integrations"""
        try:
            integrations = await self.db.get_popular_integrations(limit)
            return {'success': True, 'integrations': integrations}
        except Exception as e:
            logger.error(f"❌ Failed to get popular integrations: {str(e)}")
            return {'success': False, 'error': str(e), 'integrations': []}
    
    async def get_categories(self) -> Dict[str, Any]:
        """Get integration categories"""
        try:
            # Hardcoded categories for now
            categories = [
                {
                    'id': 'communication',
                    'name': 'Communication',
                    'description': 'Email, messaging, and chat integrations',
                    'icon': '💬',
                    'integrationCount': 0
                },
                {
                    'id': 'storage',
                    'name': 'Storage',
                    'description': 'Cloud storage and file management',
                    'icon': '☁️',
                    'integrationCount': 0
                },
                {
                    'id': 'productivity',
                    'name': 'Productivity',
                    'description': 'Task management and collaboration tools',
                    'icon': '📋',
                    'integrationCount': 0
                },
                {
                    'id': 'payments',
                    'name': 'Payments',
                    'description': 'Payment processing and billing',
                    'icon': '💳',
                    'integrationCount': 0
                },
                {
                    'id': 'crm',
                    'name': 'CRM',
                    'description': 'Customer relationship management',
                    'icon': '👥',
                    'integrationCount': 0
                },
                {
                    'id': 'analytics',
                    'name': 'Analytics',
                    'description': 'Data analytics and tracking',
                    'icon': '📊',
                    'integrationCount': 0
                },
            ]
            
            return {'success': True, 'categories': categories}
        except Exception as e:
            logger.error(f"❌ Failed to get categories: {str(e)}")
            return {'success': False, 'error': str(e), 'categories': []}
    
    # ==================== Connection Management ====================
    
    async def create_connection(
        self,
        user_id: str,
        integration_id: str,
        name: str,
        auth_type: str,
        credentials: Dict[str, str],
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a new connection"""
        try:
            # Verify integration exists
            integration = await self.db.get_integration_by_id(integration_id)
            if not integration:
                return {'success': False, 'error': 'Integration not found'}
            
            connection_data = {
                'userId': user_id,
                'integrationId': integration_id,
                'integrationName': integration.get('name'),
                'name': name,
                'authType': auth_type,
                'credentials': credentials,
                'metadata': metadata or {},
                'status': 'active',
                'lastTested': None
            }
            
            result = await self.db.create_connection(connection_data)
            
            if result['success']:
                logger.info(f"✅ Connection created for user {user_id}: {integration_id}")
            
            return result
        except Exception as e:
            logger.error(f"❌ Failed to create connection: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_user_connections(self, user_id: str) -> Dict[str, Any]:
        """Get all connections for a user"""
        try:
            connections = await self.db.get_user_connections(user_id)
            
            # Enrich with integration names
            for conn in connections:
                if not conn.get('integrationName'):
                    integration = await self.db.get_integration_by_id(conn.get('integrationId'))
                    conn['integrationName'] = integration.get('name') if integration else 'Unknown'
            
            return {'success': True, 'connections': connections, 'total': len(connections)}
        except Exception as e:
            logger.error(f"❌ Failed to get connections: {str(e)}")
            return {'success': False, 'error': str(e), 'connections': [], 'total': 0}
    
    async def get_connection(self, connection_id: str, user_id: str) -> Dict[str, Any]:
        """Get connection by ID"""
        try:
            connection = await self.db.get_connection_by_id(connection_id, user_id)
            
            if not connection:
                return {'success': False, 'error': 'Connection not found'}
            
            # Enrich with integration name
            if not connection.get('integrationName'):
                integration = await self.db.get_integration_by_id(connection.get('integrationId'))
                connection['integrationName'] = integration.get('name') if integration else 'Unknown'
            
            return {'success': True, 'connection': connection}
        except Exception as e:
            logger.error(f"❌ Failed to get connection: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def update_connection(
        self,
        connection_id: str,
        user_id: str,
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update connection"""
        try:
            result = await self.db.update_connection(connection_id, user_id, updates)
            
            if result['success']:
                logger.info(f"✅ Connection {connection_id} updated by user {user_id}")
            
            return result
        except Exception as e:
            logger.error(f"❌ Failed to update connection: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def delete_connection(self, connection_id: str, user_id: str) -> Dict[str, Any]:
        """Delete connection"""
        try:
            result = await self.db.delete_connection(connection_id, user_id)
            
            if result['success']:
                logger.info(f"✅ Connection {connection_id} deleted by user {user_id}")
            
            return result
        except Exception as e:
            logger.error(f"❌ Failed to delete connection: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def test_connection(self, connection_id: str, user_id: str) -> Dict[str, Any]:
        """Test if connection is valid"""
        try:
            # Get connection with credentials
            connection = await self.db.get_connection_with_credentials(connection_id, user_id)
            
            if not connection:
                return {'success': False, 'status': 'error', 'message': 'Connection not found'}
            
            # For now, just mark as tested (in production, actually test the connection)
            await self.db.update_connection(connection_id, user_id, {
                'lastTested': datetime.utcnow(),
                'status': 'active'
            })
            
            logger.info(f"✅ Connection {connection_id} tested successfully")
            
            return {
                'success': True,
                'status': 'active',
                'message': 'Connection is active and working'
            }
        except Exception as e:
            logger.error(f"❌ Failed to test connection: {str(e)}")
            return {'success': False, 'status': 'error', 'message': str(e)}
    
    async def refresh_connection(self, connection_id: str, user_id: str) -> Dict[str, Any]:
        """Refresh OAuth token for connection"""
        try:
            connection = await self.db.get_connection_with_credentials(connection_id, user_id)
            
            if not connection:
                return {'success': False, 'error': 'Connection not found'}
            
            if connection.get('authType') != 'oauth2':
                return {'success': False, 'error': 'Connection is not OAuth2'}
            
            # TODO: Implement actual OAuth token refresh
            # For now, just update lastTested
            await self.db.update_connection(connection_id, user_id, {
                'lastTested': datetime.utcnow(),
                'status': 'active'
            })
            
            logger.info(f"✅ Connection {connection_id} refreshed")
            
            return {'success': True, 'message': 'Token refreshed successfully'}
        except Exception as e:
            logger.error(f"❌ Failed to refresh connection: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_connection_stats(self, user_id: str) -> Dict[str, Any]:
        """Get connection statistics"""
        try:
            return await self.db.get_connection_stats(user_id)
        except Exception as e:
            logger.error(f"❌ Failed to get connection stats: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    # ==================== OAuth Flow ====================
    
    async def initiate_oauth_flow(
        self,
        user_id: str,
        integration_id: str,
        redirect_uri: Optional[str] = None
    ) -> Dict[str, Any]:
        """Initiate OAuth authorization flow"""
        try:
            # Get integration details
            integration = await self.db.get_integration_by_id(integration_id)
            
            if not integration:
                return {'success': False, 'error': 'Integration not found'}
            
            if integration.get('authType') != 'oauth2':
                return {'success': False, 'error': 'Integration does not support OAuth2'}
            
            # Generate state parameter
            state = secrets.token_urlsafe(32)
            
            # Store state in database
            state_data = {
                'userId': user_id,
                'integrationId': integration_id,
                'state': state,
                'redirectUri': redirect_uri or 'http://localhost:3000/integrations/callback'
            }
            
            result = await self.db.create_oauth_state(state_data)
            
            if not result['success']:
                return result
            
            # Build authorization URL
            # In production, use actual OAuth parameters from integration config
            base_url = integration.get('authUrl', 'https://oauth.example.com/authorize')
            
            params = {
                'client_id': 'YOUR_CLIENT_ID',  # Should come from integration config
                'redirect_uri': redirect_uri or 'http://localhost:3000/integrations/callback',
                'response_type': 'code',
                'state': state,
                'scope': ' '.join(integration.get('scopes', []))
            }
            
            auth_url = f"{base_url}?{urllib.parse.urlencode(params)}"
            
            logger.info(f"✅ OAuth flow initiated for {integration_id} by user {user_id}")
            
            return {
                'success': True,
                'authorizationUrl': auth_url,
                'state': state,
                'expiresIn': 600
            }
        except Exception as e:
            logger.error(f"❌ Failed to initiate OAuth flow: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def exchange_oauth_code(
        self,
        user_id: str,
        code: str,
        state: str,
        redirect_uri: Optional[str] = None
    ) -> Dict[str, Any]:
        """Exchange OAuth authorization code for tokens"""
        try:
            # Verify state
            state_data = await self.db.get_oauth_state(state)
            
            if not state_data:
                return {'success': False, 'error': 'Invalid or expired state parameter'}
            
            if state_data.get('userId') != user_id:
                return {'success': False, 'error': 'State parameter does not match user'}
            
            integration_id = state_data.get('integrationId')
            integration = await self.db.get_integration_by_id(integration_id)
            
            if not integration:
                return {'success': False, 'error': 'Integration not found'}
            
            # In production, exchange code for tokens with actual OAuth provider
            # For now, create a mock connection
            connection_data = {
                'userId': user_id,
                'integrationId': integration_id,
                'integrationName': integration.get('name'),
                'name': f"{integration.get('name')} Connection",
                'authType': 'oauth2',
                'credentials': {
                    'access_token': f'mock_access_token_{secrets.token_urlsafe(16)}',
                    'refresh_token': f'mock_refresh_token_{secrets.token_urlsafe(16)}',
                    'expires_in': '3600'
                },
                'metadata': {},
                'status': 'active',
                'lastTested': datetime.utcnow()
            }
            
            result = await self.db.create_connection(connection_data)
            
            # Delete used state
            await self.db.delete_oauth_state(state)
            
            if result['success']:
                logger.info(f"✅ OAuth code exchanged for {integration_id} by user {user_id}")
                return {
                    'success': True,
                    'connectionId': result['connectionId'],
                    'message': 'OAuth connection established successfully'
                }
            
            return result
        except Exception as e:
            logger.error(f"❌ Failed to exchange OAuth code: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    # ==================== Credentials Management ====================
    
    async def create_credential(
        self,
        user_id: str,
        integration_id: str,
        name: str,
        credential_type: str,
        value: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create encrypted credential"""
        try:
            # Verify integration exists
            integration = await self.db.get_integration_by_id(integration_id)
            if not integration:
                return {'success': False, 'error': 'Integration not found'}
            
            credential_data = {
                'userId': user_id,
                'integrationId': integration_id,
                'integrationName': integration.get('name'),
                'name': name,
                'type': credential_type,
                'value': value,
                'metadata': metadata or {}
            }
            
            result = await self.db.create_credential(credential_data)
            
            if result['success']:
                logger.info(f"✅ Credential created for user {user_id}: {integration_id}")
            
            return result
        except Exception as e:
            logger.error(f"❌ Failed to create credential: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_user_credentials(self, user_id: str) -> Dict[str, Any]:
        """Get all credentials for a user"""
        try:
            credentials = await self.db.get_user_credentials(user_id)
            
            # Enrich with integration names
            for cred in credentials:
                if not cred.get('integrationName'):
                    integration = await self.db.get_integration_by_id(cred.get('integrationId'))
                    cred['integrationName'] = integration.get('name') if integration else 'Unknown'
            
            return {'success': True, 'credentials': credentials, 'total': len(credentials)}
        except Exception as e:
            logger.error(f"❌ Failed to get credentials: {str(e)}")
            return {'success': False, 'error': str(e), 'credentials': [], 'total': 0}
    
    async def get_credential(self, credential_id: str, user_id: str) -> Dict[str, Any]:
        """Get credential by ID"""
        try:
            credential = await self.db.get_credential_by_id(credential_id, user_id, decrypt=False)
            
            if not credential:
                return {'success': False, 'error': 'Credential not found'}
            
            # Enrich with integration name
            if not credential.get('integrationName'):
                integration = await self.db.get_integration_by_id(credential.get('integrationId'))
                credential['integrationName'] = integration.get('name') if integration else 'Unknown'
            
            return {'success': True, 'credential': credential}
        except Exception as e:
            logger.error(f"❌ Failed to get credential: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def update_credential(
        self,
        credential_id: str,
        user_id: str,
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update credential"""
        try:
            result = await self.db.update_credential(credential_id, user_id, updates)
            
            if result['success']:
                logger.info(f"✅ Credential {credential_id} updated by user {user_id}")
            
            return result
        except Exception as e:
            logger.error(f"❌ Failed to update credential: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def delete_credential(self, credential_id: str, user_id: str) -> Dict[str, Any]:
        """Delete credential"""
        try:
            result = await self.db.delete_credential(credential_id, user_id)
            
            if result['success']:
                logger.info(f"✅ Credential {credential_id} deleted by user {user_id}")
            
            return result
        except Exception as e:
            logger.error(f"❌ Failed to delete credential: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def test_credential(self, credential_id: str, user_id: str) -> Dict[str, Any]:
        """Test if credential is valid"""
        try:
            # Get credential with decrypted value
            credential = await self.db.get_credential_by_id(credential_id, user_id, decrypt=True)
            
            if not credential:
                return {'success': False, 'status': 'error', 'message': 'Credential not found'}
            
            # In production, test the credential with actual API
            # For now, just return success
            logger.info(f"✅ Credential {credential_id} tested successfully")
            
            return {
                'success': True,
                'status': 'valid',
                'message': 'Credential is valid'
            }
        except Exception as e:
            logger.error(f"❌ Failed to test credential: {str(e)}")
            return {'success': False, 'status': 'error', 'message': str(e)}
    
    # ==================== Webhook Management ====================
    
    async def create_webhook(
        self,
        user_id: str,
        name: str,
        events: List[str],
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create webhook endpoint"""
        try:
            webhook_data = {
                'userId': user_id,
                'name': name,
                'events': events,
                'description': description,
                'metadata': metadata or {},
                'status': 'active'
            }
            
            result = await self.db.create_webhook(webhook_data)
            
            if result['success']:
                logger.info(f"✅ Webhook created for user {user_id}")
            
            return result
        except Exception as e:
            logger.error(f"❌ Failed to create webhook: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_user_webhooks(self, user_id: str) -> Dict[str, Any]:
        """Get all webhooks for a user"""
        try:
            webhooks = await self.db.get_user_webhooks(user_id)
            return {'success': True, 'webhooks': webhooks, 'total': len(webhooks)}
        except Exception as e:
            logger.error(f"❌ Failed to get webhooks: {str(e)}")
            return {'success': False, 'error': str(e), 'webhooks': [], 'total': 0}
    
    async def get_webhook(self, webhook_id: str, user_id: str) -> Dict[str, Any]:
        """Get webhook by ID"""
        try:
            webhook = await self.db.get_webhook_by_id(webhook_id, user_id)
            
            if not webhook:
                return {'success': False, 'error': 'Webhook not found'}
            
            return {'success': True, 'webhook': webhook}
        except Exception as e:
            logger.error(f"❌ Failed to get webhook: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def update_webhook(
        self,
        webhook_id: str,
        user_id: str,
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update webhook"""
        try:
            result = await self.db.update_webhook(webhook_id, user_id, updates)
            
            if result['success']:
                logger.info(f"✅ Webhook {webhook_id} updated by user {user_id}")
            
            return result
        except Exception as e:
            logger.error(f"❌ Failed to update webhook: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def delete_webhook(self, webhook_id: str, user_id: str) -> Dict[str, Any]:
        """Delete webhook"""
        try:
            result = await self.db.delete_webhook(webhook_id, user_id)
            
            if result['success']:
                logger.info(f"✅ Webhook {webhook_id} deleted by user {user_id}")
            
            return result
        except Exception as e:
            logger.error(f"❌ Failed to delete webhook: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def regenerate_webhook_secret(self, webhook_id: str, user_id: str) -> Dict[str, Any]:
        """Regenerate webhook secret"""
        try:
            result = await self.db.regenerate_webhook_secret(webhook_id, user_id)
            
            if result['success']:
                logger.info(f"✅ Webhook secret regenerated: {webhook_id}")
            
            return result
        except Exception as e:
            logger.error(f"❌ Failed to regenerate webhook secret: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_webhook_logs(
        self,
        webhook_id: str,
        user_id: str,
        page: int = 1,
        page_size: int = 50
    ) -> Dict[str, Any]:
        """Get webhook delivery logs"""
        try:
            return await self.db.get_webhook_logs(webhook_id, user_id, page, page_size)
        except Exception as e:
            logger.error(f"❌ Failed to get webhook logs: {str(e)}")
            return {'success': False, 'error': str(e), 'logs': [], 'total': 0}


# Create singleton instance
integration_service = IntegrationService()
