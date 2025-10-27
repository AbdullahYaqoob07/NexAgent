import logging
from typing import Optional, Dict, Any, List
from firebase_admin import firestore
from datetime import datetime, timedelta
import secrets
import hashlib
import base64
from cryptography.fernet import Fernet
import os

logger = logging.getLogger(__name__)


class IntegrationDB:
    """Database operations for integrations"""
    
    def __init__(self):
        self.db = firestore.client()
        self.integrations_collection = 'integrations'
        self.connections_collection = 'user_connections'
        self.oauth_states_collection = 'oauth_states'
        self.credentials_collection = 'credentials'
        self.webhooks_collection = 'webhooks'
        self.webhook_logs_collection = 'webhook_logs'
        
        # Encryption setup (in production, use proper key management like AWS KMS)
        self.encryption_key = os.getenv('ENCRYPTION_KEY', Fernet.generate_key()).encode() if isinstance(os.getenv('ENCRYPTION_KEY', Fernet.generate_key()), str) else os.getenv('ENCRYPTION_KEY', Fernet.generate_key())
        self.cipher = Fernet(self.encryption_key)
    
    # ==================== Encryption Utilities ====================
    
    def encrypt_value(self, value: str) -> str:
        """Encrypt a sensitive value"""
        try:
            encrypted = self.cipher.encrypt(value.encode())
            return base64.b64encode(encrypted).decode()
        except Exception as e:
            logger.error(f"❌ Encryption failed: {str(e)}")
            raise
    
    def decrypt_value(self, encrypted_value: str) -> str:
        """Decrypt a sensitive value"""
        try:
            decoded = base64.b64decode(encrypted_value.encode())
            decrypted = self.cipher.decrypt(decoded)
            return decrypted.decode()
        except Exception as e:
            logger.error(f"❌ Decryption failed: {str(e)}")
            raise
    
    # ==================== Integration Catalog Operations ====================
    
    async def get_all_integrations(
        self,
        category: Optional[str] = None,
        auth_type: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """Get all available integrations"""
        try:
            query = self.db.collection(self.integrations_collection).where('isActive', '==', True)
            
            if category:
                query = query.where('category', '==', category)
            if auth_type:
                query = query.where('authType', '==', auth_type)
            
            query = query.order_by('popularity', direction=firestore.Query.DESCENDING)
            
            all_integrations = list(query.stream())
            total = len(all_integrations)
            
            # Pagination
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            paginated = all_integrations[start_index:end_index]
            
            integrations = [doc.to_dict() for doc in paginated]
            
            return {
                'success': True,
                'integrations': integrations,
                'total': total,
                'page': page,
                'pageSize': page_size
            }
        except Exception as e:
            logger.error(f"❌ Failed to get integrations: {str(e)}")
            return {'success': False, 'error': str(e), 'integrations': [], 'total': 0}
    
    async def get_integration_by_id(self, integration_id: str) -> Optional[Dict[str, Any]]:
        """Get integration by ID"""
        try:
            doc = self.db.collection(self.integrations_collection).document(integration_id).get()
            return doc.to_dict() if doc.exists else None
        except Exception as e:
            logger.error(f"❌ Failed to get integration: {str(e)}")
            return None
    
    async def search_integrations(
        self,
        query: Optional[str] = None,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """Search integrations"""
        try:
            query_ref = self.db.collection(self.integrations_collection).where('isActive', '==', True)
            
            if category:
                query_ref = query_ref.where('category', '==', category)
            if tags and len(tags) > 0:
                query_ref = query_ref.where('tags', 'array_contains', tags[0])
            
            all_docs = list(query_ref.stream())
            
            # Client-side text search
            if query:
                query_lower = query.lower()
                filtered = []
                for doc in all_docs:
                    data = doc.to_dict()
                    if (query_lower in data.get('name', '').lower() or
                        query_lower in data.get('description', '').lower() or
                        any(query_lower in tag.lower() for tag in data.get('tags', []))):
                        filtered.append(doc)
                all_docs = filtered
            
            total = len(all_docs)
            
            # Pagination
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            paginated = all_docs[start_index:end_index]
            
            integrations = [doc.to_dict() for doc in paginated]
            
            return {
                'success': True,
                'integrations': integrations,
                'total': total,
                'page': page,
                'pageSize': page_size
            }
        except Exception as e:
            logger.error(f"❌ Failed to search integrations: {str(e)}")
            return {'success': False, 'error': str(e), 'integrations': [], 'total': 0}
    
    async def get_popular_integrations(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get most popular integrations"""
        try:
            docs = (self.db.collection(self.integrations_collection)
                   .where('isActive', '==', True)
                   .order_by('popularity', direction=firestore.Query.DESCENDING)
                   .limit(limit)
                   .stream())
            return [doc.to_dict() for doc in docs]
        except Exception as e:
            logger.error(f"❌ Failed to get popular integrations: {str(e)}")
            return []
    
    # ==================== Connection Operations ====================
    
    async def create_connection(self, connection_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new connection"""
        try:
            conn_ref = self.db.collection(self.connections_collection).document()
            connection_id = conn_ref.id
            
            # Encrypt credentials
            if 'credentials' in connection_data:
                encrypted_creds = {}
                for key, value in connection_data['credentials'].items():
                    encrypted_creds[f'encrypted_{key}'] = self.encrypt_value(value)
                connection_data['credentials'] = encrypted_creds
            
            connection_data['id'] = connection_id
            connection_data['createdAt'] = firestore.SERVER_TIMESTAMP
            connection_data['updatedAt'] = firestore.SERVER_TIMESTAMP
            
            conn_ref.set(connection_data)
            
            logger.info(f"✅ Connection created: {connection_id}")
            return {'success': True, 'connectionId': connection_id, 'data': connection_data}
        except Exception as e:
            logger.error(f"❌ Failed to create connection: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_user_connections(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all connections for a user"""
        try:
            docs = (self.db.collection(self.connections_collection)
                   .where('userId', '==', user_id)
                   .order_by('createdAt', direction=firestore.Query.DESCENDING)
                   .stream())
            
            connections = []
            for doc in docs:
                conn = doc.to_dict()
                # Remove sensitive credentials from response
                if 'credentials' in conn:
                    conn['hasCredentials'] = True
                    del conn['credentials']
                connections.append(conn)
            
            return connections
        except Exception as e:
            logger.error(f"❌ Failed to get connections: {str(e)}")
            return []
    
    async def get_connection_by_id(self, connection_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get connection by ID"""
        try:
            doc = self.db.collection(self.connections_collection).document(connection_id).get()
            if not doc.exists:
                return None
            
            conn = doc.to_dict()
            # Verify ownership
            if conn.get('userId') != user_id:
                return None
            
            # Remove sensitive credentials from response (keep encrypted)
            if 'credentials' in conn:
                conn['hasCredentials'] = True
                # Don't expose encrypted values in normal get
                conn.pop('credentials', None)
            
            return conn
        except Exception as e:
            logger.error(f"❌ Failed to get connection: {str(e)}")
            return None
    
    async def get_connection_with_credentials(self, connection_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get connection with decrypted credentials (internal use only)"""
        try:
            doc = self.db.collection(self.connections_collection).document(connection_id).get()
            if not doc.exists:
                return None
            
            conn = doc.to_dict()
            if conn.get('userId') != user_id:
                return None
            
            # Decrypt credentials
            if 'credentials' in conn:
                decrypted_creds = {}
                for key, value in conn['credentials'].items():
                    if key.startswith('encrypted_'):
                        original_key = key.replace('encrypted_', '')
                        decrypted_creds[original_key] = self.decrypt_value(value)
                    else:
                        decrypted_creds[key] = value
                conn['credentials'] = decrypted_creds
            
            return conn
        except Exception as e:
            logger.error(f"❌ Failed to get connection with credentials: {str(e)}")
            return None
    
    async def update_connection(self, connection_id: str, user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update connection"""
        try:
            doc_ref = self.db.collection(self.connections_collection).document(connection_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                return {'success': False, 'error': 'Connection not found'}
            
            conn = doc.to_dict()
            if conn.get('userId') != user_id:
                return {'success': False, 'error': 'Unauthorized'}
            
            # Encrypt credentials if updating
            if 'credentials' in updates:
                encrypted_creds = {}
                for key, value in updates['credentials'].items():
                    encrypted_creds[f'encrypted_{key}'] = self.encrypt_value(value)
                updates['credentials'] = encrypted_creds
            
            updates['updatedAt'] = firestore.SERVER_TIMESTAMP
            doc_ref.update(updates)
            
            logger.info(f"✅ Connection updated: {connection_id}")
            return {'success': True}
        except Exception as e:
            logger.error(f"❌ Failed to update connection: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def delete_connection(self, connection_id: str, user_id: str) -> Dict[str, Any]:
        """Delete connection"""
        try:
            doc_ref = self.db.collection(self.connections_collection).document(connection_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                return {'success': False, 'error': 'Connection not found'}
            
            conn = doc.to_dict()
            if conn.get('userId') != user_id:
                return {'success': False, 'error': 'Unauthorized'}
            
            doc_ref.delete()
            
            logger.info(f"✅ Connection deleted: {connection_id}")
            return {'success': True}
        except Exception as e:
            logger.error(f"❌ Failed to delete connection: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_connection_stats(self, user_id: str) -> Dict[str, Any]:
        """Get connection statistics for a user"""
        try:
            connections = await self.get_user_connections(user_id)
            
            total = len(connections)
            active = sum(1 for c in connections if c.get('status') == 'active')
            expired = sum(1 for c in connections if c.get('status') == 'expired')
            error = sum(1 for c in connections if c.get('status') == 'error')
            
            # Group by integration
            by_integration = {}
            for conn in connections:
                integration_id = conn.get('integrationId')
                if integration_id not in by_integration:
                    by_integration[integration_id] = {'count': 0, 'integrationId': integration_id}
                by_integration[integration_id]['count'] += 1
            
            return {
                'success': True,
                'totalConnections': total,
                'activeConnections': active,
                'expiredConnections': expired,
                'errorConnections': error,
                'byIntegration': list(by_integration.values())
            }
        except Exception as e:
            logger.error(f"❌ Failed to get connection stats: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    # ==================== OAuth State Operations ====================
    
    async def create_oauth_state(self, state_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create OAuth state for flow"""
        try:
            state_ref = self.db.collection(self.oauth_states_collection).document()
            state_id = state_ref.id
            
            state_data['id'] = state_id
            state_data['createdAt'] = firestore.SERVER_TIMESTAMP
            state_data['expiresAt'] = datetime.utcnow() + timedelta(minutes=10)
            
            state_ref.set(state_data)
            
            logger.info(f"✅ OAuth state created: {state_id}")
            return {'success': True, 'stateId': state_id, 'data': state_data}
        except Exception as e:
            logger.error(f"❌ Failed to create OAuth state: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_oauth_state(self, state: str) -> Optional[Dict[str, Any]]:
        """Get OAuth state by state parameter"""
        try:
            docs = list(self.db.collection(self.oauth_states_collection)
                       .where('state', '==', state)
                       .limit(1)
                       .stream())
            
            if not docs:
                return None
            
            state_data = docs[0].to_dict()
            
            # Check expiration
            if state_data.get('expiresAt') < datetime.utcnow():
                # Delete expired state
                docs[0].reference.delete()
                return None
            
            return state_data
        except Exception as e:
            logger.error(f"❌ Failed to get OAuth state: {str(e)}")
            return None
    
    async def delete_oauth_state(self, state: str) -> Dict[str, Any]:
        """Delete OAuth state after use"""
        try:
            docs = list(self.db.collection(self.oauth_states_collection)
                       .where('state', '==', state)
                       .stream())
            
            for doc in docs:
                doc.reference.delete()
            
            return {'success': True}
        except Exception as e:
            logger.error(f"❌ Failed to delete OAuth state: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    # ==================== Credentials Operations ====================
    
    async def create_credential(self, credential_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create encrypted credential"""
        try:
            cred_ref = self.db.collection(self.credentials_collection).document()
            credential_id = cred_ref.id
            
            # Encrypt value
            if 'value' in credential_data:
                credential_data['encryptedValue'] = self.encrypt_value(credential_data['value'])
                del credential_data['value']
            
            credential_data['id'] = credential_id
            credential_data['createdAt'] = firestore.SERVER_TIMESTAMP
            credential_data['lastUsed'] = None
            
            cred_ref.set(credential_data)
            
            logger.info(f"✅ Credential created: {credential_id}")
            return {'success': True, 'credentialId': credential_id}
        except Exception as e:
            logger.error(f"❌ Failed to create credential: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_user_credentials(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all credentials for a user (metadata only)"""
        try:
            docs = (self.db.collection(self.credentials_collection)
                   .where('userId', '==', user_id)
                   .order_by('createdAt', direction=firestore.Query.DESCENDING)
                   .stream())
            
            credentials = []
            for doc in docs:
                cred = doc.to_dict()
                # Remove encrypted value from response
                cred.pop('encryptedValue', None)
                cred['hasValue'] = True
                credentials.append(cred)
            
            return credentials
        except Exception as e:
            logger.error(f"❌ Failed to get credentials: {str(e)}")
            return []
    
    async def get_credential_by_id(self, credential_id: str, user_id: str, decrypt: bool = False) -> Optional[Dict[str, Any]]:
        """Get credential by ID"""
        try:
            doc = self.db.collection(self.credentials_collection).document(credential_id).get()
            if not doc.exists:
                return None
            
            cred = doc.to_dict()
            if cred.get('userId') != user_id:
                return None
            
            if decrypt and 'encryptedValue' in cred:
                cred['value'] = self.decrypt_value(cred['encryptedValue'])
                del cred['encryptedValue']
            else:
                cred.pop('encryptedValue', None)
                cred['hasValue'] = True
            
            return cred
        except Exception as e:
            logger.error(f"❌ Failed to get credential: {str(e)}")
            return None
    
    async def update_credential(self, credential_id: str, user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update credential"""
        try:
            doc_ref = self.db.collection(self.credentials_collection).document(credential_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                return {'success': False, 'error': 'Credential not found'}
            
            cred = doc.to_dict()
            if cred.get('userId') != user_id:
                return {'success': False, 'error': 'Unauthorized'}
            
            # Encrypt new value if provided
            if 'value' in updates:
                updates['encryptedValue'] = self.encrypt_value(updates['value'])
                del updates['value']
            
            doc_ref.update(updates)
            
            logger.info(f"✅ Credential updated: {credential_id}")
            return {'success': True}
        except Exception as e:
            logger.error(f"❌ Failed to update credential: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def delete_credential(self, credential_id: str, user_id: str) -> Dict[str, Any]:
        """Delete credential"""
        try:
            doc_ref = self.db.collection(self.credentials_collection).document(credential_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                return {'success': False, 'error': 'Credential not found'}
            
            cred = doc.to_dict()
            if cred.get('userId') != user_id:
                return {'success': False, 'error': 'Unauthorized'}
            
            doc_ref.delete()
            
            logger.info(f"✅ Credential deleted: {credential_id}")
            return {'success': True}
        except Exception as e:
            logger.error(f"❌ Failed to delete credential: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    # ==================== Webhook Operations ====================
    
    async def create_webhook(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create webhook"""
        try:
            webhook_ref = self.db.collection(self.webhooks_collection).document()
            webhook_id = webhook_ref.id
            
            # Generate webhook secret
            webhook_secret = f"whsec_{secrets.token_urlsafe(32)}"
            
            webhook_data['id'] = webhook_id
            webhook_data['secret'] = webhook_secret
            webhook_data['url'] = f"{os.getenv('API_BASE_URL', 'http://localhost:8000')}/webhooks/{webhook_id}"
            webhook_data['deliveryCount'] = 0
            webhook_data['createdAt'] = firestore.SERVER_TIMESTAMP
            webhook_data['updatedAt'] = firestore.SERVER_TIMESTAMP
            
            webhook_ref.set(webhook_data)
            
            logger.info(f"✅ Webhook created: {webhook_id}")
            return {'success': True, 'webhookId': webhook_id, 'data': webhook_data}
        except Exception as e:
            logger.error(f"❌ Failed to create webhook: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_user_webhooks(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all webhooks for a user"""
        try:
            docs = (self.db.collection(self.webhooks_collection)
                   .where('userId', '==', user_id)
                   .order_by('createdAt', direction=firestore.Query.DESCENDING)
                   .stream())
            return [doc.to_dict() for doc in docs]
        except Exception as e:
            logger.error(f"❌ Failed to get webhooks: {str(e)}")
            return []
    
    async def get_webhook_by_id(self, webhook_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get webhook by ID"""
        try:
            doc = self.db.collection(self.webhooks_collection).document(webhook_id).get()
            if not doc.exists:
                return None
            
            webhook = doc.to_dict()
            if webhook.get('userId') != user_id:
                return None
            
            return webhook
        except Exception as e:
            logger.error(f"❌ Failed to get webhook: {str(e)}")
            return None
    
    async def update_webhook(self, webhook_id: str, user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update webhook"""
        try:
            doc_ref = self.db.collection(self.webhooks_collection).document(webhook_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                return {'success': False, 'error': 'Webhook not found'}
            
            webhook = doc.to_dict()
            if webhook.get('userId') != user_id:
                return {'success': False, 'error': 'Unauthorized'}
            
            updates['updatedAt'] = firestore.SERVER_TIMESTAMP
            doc_ref.update(updates)
            
            logger.info(f"✅ Webhook updated: {webhook_id}")
            return {'success': True}
        except Exception as e:
            logger.error(f"❌ Failed to update webhook: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def delete_webhook(self, webhook_id: str, user_id: str) -> Dict[str, Any]:
        """Delete webhook"""
        try:
            doc_ref = self.db.collection(self.webhooks_collection).document(webhook_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                return {'success': False, 'error': 'Webhook not found'}
            
            webhook = doc.to_dict()
            if webhook.get('userId') != user_id:
                return {'success': False, 'error': 'Unauthorized'}
            
            doc_ref.delete()
            
            logger.info(f"✅ Webhook deleted: {webhook_id}")
            return {'success': True}
        except Exception as e:
            logger.error(f"❌ Failed to delete webhook: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def regenerate_webhook_secret(self, webhook_id: str, user_id: str) -> Dict[str, Any]:
        """Regenerate webhook secret"""
        try:
            doc_ref = self.db.collection(self.webhooks_collection).document(webhook_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                return {'success': False, 'error': 'Webhook not found'}
            
            webhook = doc.to_dict()
            if webhook.get('userId') != user_id:
                return {'success': False, 'error': 'Unauthorized'}
            
            new_secret = f"whsec_{secrets.token_urlsafe(32)}"
            doc_ref.update({
                'secret': new_secret,
                'updatedAt': firestore.SERVER_TIMESTAMP
            })
            
            logger.info(f"✅ Webhook secret regenerated: {webhook_id}")
            return {'success': True, 'newSecret': new_secret}
        except Exception as e:
            logger.error(f"❌ Failed to regenerate webhook secret: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    # ==================== Webhook Logs Operations ====================
    
    async def create_webhook_log(self, log_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create webhook delivery log"""
        try:
            log_ref = self.db.collection(self.webhook_logs_collection).document()
            log_id = log_ref.id
            
            log_data['id'] = log_id
            log_data['timestamp'] = firestore.SERVER_TIMESTAMP
            
            log_ref.set(log_data)
            
            # Increment webhook delivery count
            webhook_ref = self.db.collection(self.webhooks_collection).document(log_data['webhookId'])
            webhook_ref.update({
                'deliveryCount': firestore.Increment(1),
                'lastDelivery': firestore.SERVER_TIMESTAMP
            })
            
            return {'success': True, 'logId': log_id}
        except Exception as e:
            logger.error(f"❌ Failed to create webhook log: {str(e)}")
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
            # Verify webhook ownership
            webhook = await self.get_webhook_by_id(webhook_id, user_id)
            if not webhook:
                return {'success': False, 'error': 'Webhook not found or unauthorized'}
            
            query = (self.db.collection(self.webhook_logs_collection)
                    .where('webhookId', '==', webhook_id)
                    .order_by('timestamp', direction=firestore.Query.DESCENDING))
            
            all_logs = list(query.stream())
            total = len(all_logs)
            
            # Pagination
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            paginated = all_logs[start_index:end_index]
            
            logs = [doc.to_dict() for doc in paginated]
            
            return {
                'success': True,
                'logs': logs,
                'total': total,
                'page': page,
                'pageSize': page_size
            }
        except Exception as e:
            logger.error(f"❌ Failed to get webhook logs: {str(e)}")
            return {'success': False, 'error': str(e), 'logs': [], 'total': 0}


# Create singleton instance
integration_db = IntegrationDB()
