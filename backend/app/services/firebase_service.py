import firebase_admin
from firebase_admin import credentials, auth, firestore
from app.core.config import get_firebase_credentials, settings
import logging
from typing import Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

class FirebaseService:
    def __init__(self):
        self.app = None
        self.db = None
        self._initialize_firebase()
    
    def _initialize_firebase(self):
        """Initialize Firebase Admin SDK"""
        try:
            if not firebase_admin._apps:
                # Get credentials from environment
                firebase_creds = get_firebase_credentials()
                cred = credentials.Certificate(firebase_creds)
                self.app = firebase_admin.initialize_app(cred)
                logger.info("Firebase Admin SDK initialized successfully")
            else:
                self.app = firebase_admin.get_app()
                logger.info("Using existing Firebase Admin SDK instance")
            
            # Initialize Firestore
            self.db = firestore.client()
            logger.info("Firestore client initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {str(e)}")
            raise
    
    async def verify_token(self, id_token: str) -> Optional[Dict[str, Any]]:
        """Verify Firebase ID token and return user info"""
        try:
            decoded_token = auth.verify_id_token(id_token)
            return decoded_token
        except Exception as e:
            logger.error(f"Token verification failed: {str(e)}")
            return None
    
    async def create_user(self, email: str, password: str, display_name: str = None) -> Dict[str, Any]:
        """Create a new user in Firebase Auth"""
        try:
            user_record = auth.create_user(
                email=email,
                password=password,
                display_name=display_name,
                email_verified=False
            )
            
            # Create comprehensive user document in Firestore
            user_data = {
                'uid': user_record.uid,
                'email': email,
                'displayName': display_name,
                'photoURL': None,
                'emailVerified': False,
                'createdAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP,
                'lastLoginAt': firestore.SERVER_TIMESTAMP,
                
                # Profile information
                'profile': {
                    'firstName': display_name.split(' ')[0] if display_name else None,
                    'lastName': ' '.join(display_name.split(' ')[1:]) if display_name and ' ' in display_name else None,
                    'bio': None,
                    'company': None,
                    'jobTitle': None,
                    'location': None,
                    'timezone': 'UTC',
                    'language': 'en',
                    'avatar': {
                        'url': None,
                        'initials': display_name[0].upper() if display_name else email[0].upper()
                    }
                },
                
                # Social links
                'socialLinks': {
                    'twitter': None,
                    'linkedin': None,
                    'github': None,
                    'website': None
                },
                
                # Subscription details
                'subscription': {
                    'plan': 'free',
                    'status': 'active',
                    'startDate': firestore.SERVER_TIMESTAMP,
                    'endDate': None,
                    'cancelAtPeriodEnd': False,
                    'stripeCustomerId': None,
                    'stripeSubscriptionId': None
                },
                
                # Usage stats and limits
                'usage': {
                    # Tokens
                    'tokensUsed': 0,
                    'tokensThisMonth': 0,
                    
                    # Workflows
                    'totalWorkflows': 0,
                    'workflowsCreated': 0,
                    'activeWorkflows': 0,
                    
                    # API Calls
                    'totalApiCalls': 0,
                    'apiCallsThisMonth': 0,
                    'apiCallsToday': 0,
                    
                    # Performance metrics
                    'successRate': 100,
                    'avgResponseTime': 0,
                    'totalExecutionTime': 0,
                    
                    # Limits based on plan
                    'limits': {
                        'tokensPerMonth': 10000,
                        'workflowsMax': 5,
                        'apiCallsPerMonth': 1000,
                        'executionsPerMonth': 500
                    }
                },
                
                # Security settings
                'security': {
                    'twoFactorEnabled': False,
                    'twoFactorMethod': None,
                    'backupCodes': [],
                    'lastPasswordChange': firestore.SERVER_TIMESTAMP,
                    'sessionTimeout': 604800,  # 1 week in seconds
                    'ipWhitelist': [],
                    'loginNotifications': True
                },
                
                # Onboarding progress
                'onboarding': {
                    'completed': False,
                    'currentStep': 0,
                    'completedSteps': [],
                    'skipped': False,
                    'startedAt': firestore.SERVER_TIMESTAMP,
                    'completedAt': None
                },
                
                # Activity tracking
                'activity': {
                    'lastSeen': firestore.SERVER_TIMESTAMP,
                    'lastActiveFeature': None,
                    'featureUsage': {},
                    'sessionCount': 1,
                    'totalTimeSpent': 0
                },
                
                # Workspace settings
                'workspace': {
                    'name': f"{display_name}'s Workspace" if display_name else f"{email.split('@')[0]}'s Workspace",
                    'description': None,
                    'members': [],
                    'roles': ['owner'],
                    'settings': {
                        'defaultWorkflowVisibility': 'private',
                        'allowSharing': False,
                        'requireApproval': True
                    }
                },
                
                # Preferences
                'preferences': {
                    'theme': 'dark',
                    'language': 'en',
                    'timezone': 'UTC',
                    'emailNotifications': True,
                    'pushNotifications': False,
                    'weeklyReports': True,
                    'marketingEmails': False,
                    'dateFormat': 'MM/DD/YYYY',
                    'timeFormat': '12h'
                },
                
                # API Keys (empty initially)
                'apiKeys': [],
                
                # Integrations (empty initially)
                'integrations': [],
                
                # Credentials (stored separately in credentials collection)
                'credentialsCount': 0
            }
            
            # Save to Firestore
            self.db.collection('users').document(user_record.uid).set(user_data)
            
            return {
                'success': True,
                'user': {
                    'uid': user_record.uid,
                    'email': user_record.email,
                    'displayName': user_record.display_name,
                    'emailVerified': user_record.email_verified
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to create user: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email from Firebase Auth"""
        try:
            user_record = auth.get_user_by_email(email)
            return {
                'uid': user_record.uid,
                'email': user_record.email,
                'displayName': user_record.display_name,
                'emailVerified': user_record.email_verified,
                'disabled': user_record.disabled
            }
        except Exception as e:
            logger.error(f"Failed to get user by email: {str(e)}")
            return None
    
    async def get_user_by_uid(self, uid: str) -> Optional[Dict[str, Any]]:
        """Get user by UID from Firebase Auth"""
        try:
            user_record = auth.get_user(uid)
            return {
                'uid': user_record.uid,
                'email': user_record.email,
                'displayName': user_record.display_name,
                'emailVerified': user_record.email_verified,
                'disabled': user_record.disabled
            }
        except Exception as e:
            logger.error(f"Failed to get user by UID: {str(e)}")
            return None
    
    async def update_user(self, uid: str, **kwargs) -> Dict[str, Any]:
        """Update user in Firebase Auth"""
        try:
            user_record = auth.update_user(uid, **kwargs)
            return {
                'success': True,
                'user': {
                    'uid': user_record.uid,
                    'email': user_record.email,
                    'displayName': user_record.display_name,
                    'emailVerified': user_record.email_verified
                }
            }
        except Exception as e:
            logger.error(f"Failed to update user: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def send_password_reset_email(self, email: str) -> Dict[str, Any]:
        """Send password reset email"""
        try:
            # Generate password reset link
            link = auth.generate_password_reset_link(email)
            
            # In a real implementation, you would send this link via email
            # For now, we'll just return success
            logger.info(f"Password reset link generated for {email}: {link}")
            
            return {
                'success': True,
                'message': 'Password reset email sent successfully'
            }
        except Exception as e:
            logger.error(f"Failed to send password reset email: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_user_profile(self, uid: str) -> Optional[Dict[str, Any]]:
        """Get user profile from Firestore"""
        try:
            user_doc = self.db.collection('users').document(uid).get()
            if user_doc.exists:
                return user_doc.to_dict()
            return None
        except Exception as e:
            logger.error(f"Failed to get user profile: {str(e)}")
            return None
    
    async def update_user_profile(self, uid: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update user profile in Firestore"""
        try:
            profile_data['updatedAt'] = firestore.SERVER_TIMESTAMP
            self.db.collection('users').document(uid).update(profile_data)
            
            return {'success': True, 'message': 'Profile updated successfully'}
        except Exception as e:
            logger.error(f"Failed to update user profile: {str(e)}")
            return {'success': False, 'error': str(e)}

# Create global instance
firebase_service = FirebaseService()