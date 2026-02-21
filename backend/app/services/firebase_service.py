import firebase_admin
from firebase_admin import credentials, auth, firestore
from app.core.config import get_firebase_credentials, settings
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

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
                
                # Initialize app with storage bucket if available
                firebase_options = {}
                if hasattr(settings, 'FIREBASE_STORAGE_BUCKET') and settings.FIREBASE_STORAGE_BUCKET:
                    firebase_options['storageBucket'] = settings.FIREBASE_STORAGE_BUCKET
                
                self.app = firebase_admin.initialize_app(cred, firebase_options)
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
        """Create a new user in Firebase Auth or reuse existing user"""
        try:
            try:
                user_record = auth.create_user(
                    email=email,
                    password=password,
                    display_name=display_name,
                    email_verified=False
                )
            except auth.EmailAlreadyExistsError:
                user_record = auth.get_user_by_email(email)
            
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
                    'plan': 'trial',  # Options: trial, free, basic, pro, enterprise
                    'status': 'trialing',  # trialing, active, cancelled, past_due, unpaid
                    'billing_cycle': 'monthly',
                    'startDate': firestore.SERVER_TIMESTAMP,
                    'endDate': None,
                    'next_billing_date': None,
                    'trial_ends_at': datetime.now() + timedelta(days=30),  # 30 days trial
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
                    
                    # Limits based on plan (Trial tier - same as free)
                    'limits': {
                        'tokensPerMonth': 10000,
                        'workflowsMax': 5,              # 5 workflows max on trial plan
                        'apiCallsPerMonth': 1000,
                        'executionsPerMonth': 500,
                        'storage_gb': 1,
                        'team_members': 1
                    }
                },
                
                # Security settings
                'security': {
                    'twoFactorEnabled': False,
                    'twoFactorMethod': None,  # 'email' or 'sms' or 'app'
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
            
            # Save to Firestore (merge to preserve any existing fields)
            self.db.collection('users').document(user_record.uid).set(user_data, merge=True)
            
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
    
    async def check_account_lockout(self, email: str) -> Dict[str, Any]:
        """Check if account is locked and return lockout status"""
        try:
            user = await self.get_user_by_email(email)
            if not user:
                # Don't reveal if user exists for security
                return {
                    'success': True,
                    'isLocked': False,
                    'failedAttempts': 0,
                    'lockedUntil': None
                }
            
            # Check if account is disabled in Firebase Auth (this indicates it's locked)
            if user.get('disabled', False):
                # Account is disabled, check Firestore for lockout details
                user_doc = self.db.collection('users').document(user['uid']).get()
                if user_doc.exists:
                    user_data = user_doc.to_dict()
                    security = user_data.get('security', {})
                    locked_until = security.get('accountLockedUntil')
                    
                    # Check if lockout has expired
                    if locked_until:
                        locked_until_timestamp = locked_until.timestamp() if hasattr(locked_until, 'timestamp') else locked_until
                        current_time = datetime.now().timestamp()
                        if locked_until_timestamp > current_time:
                            return {
                                'success': True,
                                'isLocked': True,
                                'failedAttempts': 5,
                                'lockedUntil': locked_until_timestamp,
                                'remainingAttempts': 0
                            }
                        else:
                            # Lockout expired, reset it and re-enable account
                            self.db.collection('users').document(user['uid']).update({
                                'security.failedLoginAttempts': 0,
                                'security.accountLockedUntil': None,
                                'security.lastFailedLoginAttempt': None,
                                'updatedAt': firestore.SERVER_TIMESTAMP
                            })
                            try:
                                auth.update_user(user['uid'], disabled=False)
                                logger.info(f"Account unlocked and re-enabled in Firebase Auth for {email}")
                            except Exception as enable_error:
                                logger.error(f"Failed to re-enable Firebase Auth account: {str(enable_error)}")
                            return {
                                'success': True,
                                'isLocked': False,
                                'failedAttempts': 0,
                                'lockedUntil': None,
                                'remainingAttempts': 5
                            }
                
                # Account is disabled but no lockout info in Firestore - treat as locked
                return {
                    'success': True,
                    'isLocked': True,
                    'failedAttempts': 5,
                    'lockedUntil': None,
                    'remainingAttempts': 0
                }
            
            # Get user document from Firestore
            user_doc = self.db.collection('users').document(user['uid']).get()
            if not user_doc.exists:
                return {
                    'success': True,
                    'isLocked': False,
                    'failedAttempts': 0,
                    'lockedUntil': None
                }
            
            user_data = user_doc.to_dict()
            security = user_data.get('security', {})
            failed_attempts = security.get('failedLoginAttempts', 0)
            locked_until = security.get('accountLockedUntil')
            
            # Check if lockout has expired
            is_locked = False
            if locked_until:
                locked_until_timestamp = locked_until.timestamp() if hasattr(locked_until, 'timestamp') else locked_until
                current_time = datetime.now().timestamp()
                if locked_until_timestamp > current_time:
                    is_locked = True
                    # Make sure account is disabled in Firebase Auth
                    try:
                        if not user.get('disabled', False):
                            auth.update_user(user['uid'], disabled=True)
                            logger.info(f"Disabled Firebase Auth account for {email} due to lockout")
                    except Exception as disable_error:
                        logger.error(f"Failed to disable Firebase Auth account: {str(disable_error)}")
                else:
                    # Lockout expired, reset it and re-enable account
                    self.db.collection('users').document(user['uid']).update({
                        'security.failedLoginAttempts': 0,
                        'security.accountLockedUntil': None,
                        'security.lastFailedLoginAttempt': None,
                        'updatedAt': firestore.SERVER_TIMESTAMP
                    })
                    # Re-enable the Firebase Auth account
                    try:
                        auth.update_user(user['uid'], disabled=False)
                        logger.info(f"Account unlocked and re-enabled in Firebase Auth for {email}")
                    except Exception as enable_error:
                        logger.error(f"Failed to re-enable Firebase Auth account: {str(enable_error)}")
                    failed_attempts = 0
                    locked_until = None
            
            return {
                'success': True,
                'isLocked': is_locked,
                'failedAttempts': failed_attempts,
                'lockedUntil': locked_until.timestamp() if locked_until and hasattr(locked_until, 'timestamp') else (locked_until if locked_until else None),
                'remainingAttempts': max(0, 5 - failed_attempts)
            }
            
        except Exception as e:
            logger.error(f"Failed to check account lockout: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def record_failed_login_attempt(self, email: str) -> Dict[str, Any]:
        """Record a failed login attempt and lock account if threshold reached"""
        try:
            logger.info(f"📝 Recording failed login attempt for email: {email}")
            user = await self.get_user_by_email(email)
            if not user:
                # Don't reveal if user exists for security
                logger.warning(f"⚠️ User not found for email: {email}")
                return {'success': True, 'message': 'Failed attempt recorded'}
            
            logger.info(f"✅ Found user: {user['uid']}")
            user_doc_ref = self.db.collection('users').document(user['uid'])
            user_doc = user_doc_ref.get()
            
            if not user_doc.exists:
                logger.warning(f"⚠️ User document not found in Firestore for UID: {user['uid']}")
                return {'success': True, 'message': 'Failed attempt recorded'}
            
            user_data = user_doc.to_dict()
            security = user_data.get('security', {})
            current_attempts = security.get('failedLoginAttempts', 0)
            failed_attempts = current_attempts + 1
            logger.info(f"📊 Current failed attempts: {current_attempts}, New count: {failed_attempts}")
            
            # Lockout duration: 30 minutes (1800 seconds)
            lockout_duration_seconds = 1800
            locked_until_timestamp = None
            
            # Update user document
            from datetime import timedelta
            update_data = {
                'security.failedLoginAttempts': failed_attempts,
                'security.lastFailedLoginAttempt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP
            }
            
            if failed_attempts >= 5:
                # Lock account for 30 minutes
                locked_until_datetime = datetime.now() + timedelta(seconds=lockout_duration_seconds)
                locked_until_timestamp = locked_until_datetime.timestamp()
                # Store datetime object in Firestore (it will be converted automatically)
                update_data['security.accountLockedUntil'] = locked_until_datetime
                
                # Actually disable the Firebase Auth account
                try:
                    auth.update_user(user['uid'], disabled=True)
                    logger.warning(f"Account locked and disabled in Firebase Auth for {email} after {failed_attempts} failed attempts")
                except Exception as disable_error:
                    logger.error(f"Failed to disable Firebase Auth account: {str(disable_error)}")
            
            logger.info(f"📝 Updating Firestore with: {update_data}")
            user_doc_ref.update(update_data)
            logger.info(f"✅ Successfully updated failed attempts to {failed_attempts} for {email}")
            
            return {
                'success': True,
                'failedAttempts': failed_attempts,
                'isLocked': failed_attempts >= 5,
                'lockedUntil': locked_until_timestamp,
                'remainingAttempts': max(0, 5 - failed_attempts)
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to record failed login attempt: {str(e)}")
            logger.error(f"❌ Exception type: {type(e).__name__}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            return {'success': False, 'error': str(e)}
    
    async def reset_failed_login_attempts(self, email: str) -> Dict[str, Any]:
        """Reset failed login attempts counter on successful login"""
        try:
            user = await self.get_user_by_email(email)
            if not user:
                return {'success': True, 'message': 'Attempts reset'}
            
            user_doc_ref = self.db.collection('users').document(user['uid'])
            user_doc = user_doc_ref.get()
            
            if not user_doc.exists:
                return {'success': True, 'message': 'Attempts reset'}
            
            user_data = user_doc.to_dict()
            security = user_data.get('security', {})
            failed_attempts = security.get('failedLoginAttempts', 0)
            
            # Only update if there were failed attempts or account was locked
            if failed_attempts > 0 or security.get('accountLockedUntil'):
                user_doc_ref.update({
                    'security.failedLoginAttempts': 0,
                    'security.accountLockedUntil': None,
                    'security.lastFailedLoginAttempt': None,
                    'updatedAt': firestore.SERVER_TIMESTAMP
                })
                # Re-enable the Firebase Auth account if it was disabled
                try:
                    if user.get('disabled', False):
                        auth.update_user(user['uid'], disabled=False)
                        logger.info(f"Re-enabled Firebase Auth account for {email}")
                except Exception as enable_error:
                    logger.error(f"Failed to re-enable Firebase Auth account: {str(enable_error)}")
                logger.info(f"Reset failed login attempts for {email}")
            
            return {'success': True, 'message': 'Failed attempts reset'}
            
        except Exception as e:
            logger.error(f"Failed to reset failed login attempts: {str(e)}")
            return {'success': False, 'error': str(e)}

# Create global instance
firebase_service = FirebaseService()