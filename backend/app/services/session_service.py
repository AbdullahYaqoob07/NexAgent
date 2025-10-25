"""
Session Management Service

Handles user sessions to:
1. Track active sessions per user
2. Invalidate old sessions when new login occurs (single session per user)
3. Extend session lifetime beyond Firebase's 1-hour token
"""

from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import secrets
import logging
from firebase_admin import firestore

logger = logging.getLogger(__name__)


class SessionService:
    def __init__(self):
        self.db = firestore.client()
        self.sessions_collection = 'user_sessions'
        # Session expires after 1 week (7 days) of inactivity
        self.session_lifetime_days = 7
    
    async def create_session(
        self, 
        uid: str, 
        email: str,
        device_info: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> str:
        """
        Create a new session for user and invalidate all previous sessions
        
        Returns:
            session_token: Unique session token to be used with Firebase ID token
        """
        try:
            # Generate unique session token
            session_token = secrets.token_urlsafe(32)
            
            # Invalidate all previous sessions for this user (single session enforcement)
            await self._invalidate_all_user_sessions(uid)
            
            # Create new session document
            session_data = {
                'uid': uid,
                'email': email,
                'session_token': session_token,
                'device_info': device_info,
                'ip_address': ip_address,
                'created_at': firestore.SERVER_TIMESTAMP,
                'last_activity': firestore.SERVER_TIMESTAMP,
                'expires_at': datetime.utcnow() + timedelta(days=self.session_lifetime_days),
                'is_active': True,
                'revoked': False
            }
            
            # Store in Firestore
            session_ref = self.db.collection(self.sessions_collection).document()
            session_ref.set(session_data)
            
            logger.info(f"✅ New session created for user {email}, previous sessions invalidated")
            
            return session_token
            
        except Exception as e:
            logger.error(f"❌ Failed to create session: {str(e)}")
            raise
    
    async def verify_session(self, uid: str, session_token: str) -> bool:
        """
        Verify if session is valid and active
        
        Returns:
            bool: True if session is valid, False otherwise
        """
        try:
            # Query for session
            sessions_query = (
                self.db.collection(self.sessions_collection)
                .where('uid', '==', uid)
                .where('session_token', '==', session_token)
                .where('is_active', '==', True)
                .where('revoked', '==', False)
                .limit(1)
            )
            
            sessions = list(sessions_query.stream())
            
            if not sessions:
                logger.warning(f"⚠️ No active session found for user {uid}")
                return False
            
            session_doc = sessions[0]
            session_data = session_doc.to_dict()
            
            # Check if session has expired
            expires_at = session_data.get('expires_at')
            if expires_at and datetime.utcnow() > expires_at:
                logger.warning(f"⚠️ Session expired for user {uid}")
                # Mark as inactive
                session_doc.reference.update({'is_active': False})
                return False
            
            # Update last activity timestamp (refresh session)
            session_doc.reference.update({
                'last_activity': firestore.SERVER_TIMESTAMP,
                'expires_at': datetime.utcnow() + timedelta(days=self.session_lifetime_days)
            })
            
            logger.info(f"✅ Session verified and refreshed for user {uid}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Session verification failed: {str(e)}")
            return False
    
    async def revoke_session(self, session_token: str) -> bool:
        """
        Revoke a specific session (for logout)
        """
        try:
            sessions_query = (
                self.db.collection(self.sessions_collection)
                .where('session_token', '==', session_token)
                .limit(1)
            )
            
            sessions = list(sessions_query.stream())
            
            if sessions:
                session_doc = sessions[0]
                session_doc.reference.update({
                    'is_active': False,
                    'revoked': True,
                    'revoked_at': firestore.SERVER_TIMESTAMP
                })
                logger.info(f"✅ Session revoked: {session_token[:10]}...")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"❌ Failed to revoke session: {str(e)}")
            return False
    
    async def _invalidate_all_user_sessions(self, uid: str) -> None:
        """
        Invalidate all existing sessions for a user
        (Called when user logs in from new device/browser)
        """
        try:
            sessions_query = (
                self.db.collection(self.sessions_collection)
                .where('uid', '==', uid)
                .where('is_active', '==', True)
            )
            
            sessions = list(sessions_query.stream())
            
            for session_doc in sessions:
                session_doc.reference.update({
                    'is_active': False,
                    'revoked': True,
                    'revoked_at': firestore.SERVER_TIMESTAMP,
                    'revoked_reason': 'New login from different device/browser'
                })
            
            if sessions:
                logger.info(f"✅ Invalidated {len(sessions)} previous session(s) for user {uid}")
            
        except Exception as e:
            logger.error(f"❌ Failed to invalidate user sessions: {str(e)}")
    
    async def get_active_session(self, uid: str) -> Optional[Dict[str, Any]]:
        """
        Get user's active session info
        """
        try:
            sessions_query = (
                self.db.collection(self.sessions_collection)
                .where('uid', '==', uid)
                .where('is_active', '==', True)
                .where('revoked', '==', False)
                .limit(1)
            )
            
            sessions = list(sessions_query.stream())
            
            if sessions:
                return sessions[0].to_dict()
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Failed to get active session: {str(e)}")
            return None
    
    async def cleanup_expired_sessions(self) -> int:
        """
        Clean up expired sessions (can be run as a scheduled task)
        
        Returns:
            int: Number of sessions cleaned up
        """
        try:
            cutoff_time = datetime.utcnow()
            
            sessions_query = (
                self.db.collection(self.sessions_collection)
                .where('expires_at', '<=', cutoff_time)
                .where('is_active', '==', True)
            )
            
            sessions = list(sessions_query.stream())
            
            for session_doc in sessions:
                session_doc.reference.update({
                    'is_active': False,
                    'revoked': True,
                    'revoked_at': firestore.SERVER_TIMESTAMP,
                    'revoked_reason': 'Session expired'
                })
            
            logger.info(f"✅ Cleaned up {len(sessions)} expired sessions")
            return len(sessions)
            
        except Exception as e:
            logger.error(f"❌ Failed to cleanup expired sessions: {str(e)}")
            return 0


# Global instance
session_service = SessionService()
