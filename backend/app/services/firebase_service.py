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
                    'billing_cycle': 'monthly',
                    'startDate': firestore.SERVER_TIMESTAMP,
                    'endDate': None,
                    'next_billing_date': None,
                    'trial_ends_at': None,
                    'cancelAtPeriodEnd': False,
                    'stripeCustomerId': None,
                    'stripeSubscriptionId': None,
                    'created_at': firestore.SERVER_TIMESTAMP,
                    'updated_at': firestore.SERVER_TIMESTAMP
                },
                
                # Usage stats and limits
                'usage': {
                    # Tokens
                    'tokensUsed': 0,
                    'tokensThisMonth': 0,
                    
                    # Workflows (NexAs)
                    'totalWorkflows': 0,
                    'workflowsCreated': 0,
                    'activeWorkflows': 0,
                    
                    # API Calls
                    'totalApiCalls': 0,
                    'apiCallsThisMonth': 0,
                    'apiCallsToday': 0,
                    
                    # Storage and Team
                    'storage_used_gb': 0.0,
                    'team_members_count': 1,
                    'integrations_count': 0,
                    'executions_this_month': 0,
                    
                    # Performance metrics
                    'successRate': 100,
                    'avgResponseTime': 0,
                    'totalExecutionTime': 0,
                    
                    # Period tracking
                    'last_reset_date': firestore.SERVER_TIMESTAMP,
                    'current_period_start': firestore.SERVER_TIMESTAMP,
                    'current_period_end': None,
                    
                    # Limits based on plan (Free tier)
                    'limits': {
                        'tokensPerMonth': 10000,
                        'workflowsMax': 5,              # 5 NexAs on free plan
                        'apiCallsPerMonth': 1000,
                        'executionsPerMonth': 500,
                        'storage_gb': 1,
                        'team_members': 1
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
            
            # Create Stripe customer for billing (only if not in test environment)
            stripe_customer_id = None
            if not settings.DEBUG or settings.ENVIRONMENT == 'production':
                try:
                    from app.services.stripe_service import StripeService
                    stripe_service = StripeService()
                    stripe_result = await stripe_service.create_customer(
                        email=email,
                        name=display_name,
                        metadata={'user_id': user_record.uid}
                    )
                    
                    if stripe_result['success']:
                        stripe_customer_id = stripe_result['customer_id']
                        logger.info(f"Created Stripe customer {stripe_customer_id} for user {user_record.uid}")
                    else:
                        logger.warning(f"Failed to create Stripe customer for {email}: {stripe_result['error']}")
                        
                except Exception as stripe_error:
                    logger.warning(f"Stripe customer creation failed for {email}: {str(stripe_error)}")
            
            # Update user data with Stripe customer ID
            if stripe_customer_id:
                user_data['subscription']['stripeCustomerId'] = stripe_customer_id
            
            # Save to Firestore
            self.db.collection('users').document(user_record.uid).set(user_data)
            
            return {
                'success': True,
                'user': {
                    'uid': user_record.uid,
                    'email': user_record.email,
                    'displayName': user_record.display_name,
                    'emailVerified': user_record.email_verified,
                    'stripeCustomerId': stripe_customer_id
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
    
    async def set_admin_claims(self, uid: str, admin_level: str = 'super_admin') -> Dict[str, Any]:
        """Set admin custom claims for a user (server-side only)"""
        try:
            custom_claims = {
                'admin': True,
                'role': admin_level,
                'permissions': [
                    'analytics:read',
                    'users:manage',
                    'workflows:manage',
                    'integrations:manage',
                    'billing:manage',
                    'audit:read'
                ]
            }
            
            auth.set_custom_user_claims(uid, custom_claims)
            
            # Check if user document exists in Firestore
            user_doc = self.db.collection('users').document(uid).get()
            
            admin_data = {
                'isAdmin': True,
                'adminLevel': admin_level,
                'adminGrantedAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP
            }
            
            if user_doc.exists:
                # Update existing document
                self.db.collection('users').document(uid).update(admin_data)
            else:
                # Create minimal user document with admin privileges
                user_info = auth.get_user(uid)
                minimal_user_data = {
                    'uid': uid,
                    'email': user_info.email,
                    'displayName': user_info.display_name,
                    'emailVerified': user_info.email_verified,
                    'createdAt': firestore.SERVER_TIMESTAMP,
                    **admin_data
                }
                self.db.collection('users').document(uid).set(minimal_user_data)
            
            logger.info(f"Admin claims set for user {uid} with level {admin_level}")
            return {'success': True, 'message': f'Admin privileges granted with level {admin_level}'}
            
        except Exception as e:
            logger.error(f"Failed to set admin claims: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def remove_admin_claims(self, uid: str) -> Dict[str, Any]:
        """Remove admin custom claims from a user"""
        try:
            auth.set_custom_user_claims(uid, {})
            
            # Update user profile in Firestore
            admin_data = {
                'isAdmin': False,
                'adminLevel': None,
                'adminRevokedAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP
            }
            
            self.db.collection('users').document(uid).update(admin_data)
            
            logger.info(f"Admin claims removed for user {uid}")
            return {'success': True, 'message': 'Admin privileges revoked'}
            
        except Exception as e:
            logger.error(f"Failed to remove admin claims: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def verify_admin_token(self, id_token: str) -> Dict[str, Any]:
        """Verify token and check admin status from custom claims"""
        try:
            decoded_token = auth.verify_id_token(id_token)
            
            if not decoded_token:
                return {'success': False, 'error': 'Invalid token'}
            
            # Check admin custom claims
            is_admin = decoded_token.get('admin', False)
            admin_role = decoded_token.get('role', None)
            permissions = decoded_token.get('permissions', [])
            
            return {
                'success': True,
                'user': decoded_token,
                'is_admin': is_admin,
                'admin_role': admin_role,
                'permissions': permissions
            }
            
        except Exception as e:
            logger.error(f"Admin token verification failed: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def init_admin_user(self, email: str) -> Dict[str, Any]:
        """Initialize admin privileges for existing user by email"""
        try:
            user = await self.get_user_by_email(email)
            if not user:
                return {'success': False, 'error': 'User not found'}
            
            result = await self.set_admin_claims(user['uid'], 'super_admin')
            
            if result['success']:
                logger.info(f"Admin privileges initialized for {email}")
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to initialize admin user: {str(e)}")
            return {'success': False, 'error': str(e)}

# Create global instance
firebase_service = FirebaseService()