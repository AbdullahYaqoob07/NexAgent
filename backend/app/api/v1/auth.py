from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.auth_models import (
    SignUpRequest, 
    SignInRequest, 
    ForgotPasswordRequest,
    AuthResponse,
    ErrorResponse,
    SuccessResponse,
    UserResponse,
    TokenVerifyRequest,
    MFAVerifyRequest,
    MFASetupResponse,
    MFAVerifySetupRequest,
    MFAVerifySetupResponse,
    MFAVerifyLoginRequest
)
from app.services.firebase_service import firebase_service
from app.services.session_service import session_service
from app.services.mfa_service import mfa_service
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def sign_up(request: SignUpRequest):
    """
    Create a new user account
    
    - **email**: Valid email address
    - **password**: Password (minimum 8 characters)
    - **display_name**: Optional display name for the user
    """
    try:
        # Create user in Firebase Auth
        result = await firebase_service.create_user(
            email=request.email,
            password=request.password,
            display_name=request.display_name
        )
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result['error']
            )
        
        user_data = result['user']
        
        return AuthResponse(
            success=True,
            message="Account created successfully. Please verify your email.",
            user=UserResponse(
                uid=user_data['uid'],
                email=user_data['email'],
                display_name=user_data['displayName'],
                email_verified=user_data['emailVerified']
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Sign up error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create account. Please try again."
        )


@router.post("/signin", response_model=AuthResponse)
async def sign_in(request: SignInRequest, req: Request):
    """
    Sign in with email and password
    
    - **email**: User's email address
    - **password**: User's password
    
    Note: This endpoint expects the frontend to handle Firebase Auth sign-in
    and send the ID token for verification. This is a placeholder for backend-only auth.
    """
    try:
        # Check if user exists
        user = await firebase_service.get_user_by_email(request.email)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if user['disabled']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is disabled"
            )
        
        # Create session and invalidate old sessions (single session enforcement)
        device_info = req.headers.get('user-agent', 'Unknown')
        ip_address = req.client.host if req.client else None
        
        session_token = await session_service.create_session(
            uid=user['uid'],
            email=user['email'],
            device_info=device_info,
            ip_address=ip_address
        )
        
        return AuthResponse(
            success=True,
            message="Sign in successful. Session created (1 week validity).",
            user=UserResponse(
                uid=user['uid'],
                email=user['email'],
                display_name=user['displayName'],
                email_verified=user['emailVerified']
            ),
            access_token=session_token  # Return session token
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Sign in error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Sign in failed. Please try again."
        )


@router.post("/forgot-password", response_model=SuccessResponse)
async def forgot_password(request: ForgotPasswordRequest):
    """
    Send password reset email
    
    - **email**: User's email address
    """
    try:
        # Check if user exists
        user = await firebase_service.get_user_by_email(request.email)
        
        if not user:
            # Don't reveal if user exists or not for security
            return SuccessResponse(
                success=True,
                message="If an account with that email exists, a password reset link has been sent."
            )
        
        # Send password reset email
        result = await firebase_service.send_password_reset_email(request.email)
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send password reset email"
            )
        
        return SuccessResponse(
            success=True,
            message="If an account with that email exists, a password reset link has been sent."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Forgot password error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process password reset request"
        )


@router.post("/verify-token", response_model=AuthResponse)
async def verify_token(request: TokenVerifyRequest, req: Request):
    """
    Verify Firebase ID token and create session
    Also checks for admin status and includes it in response
    
    - **token**: Firebase ID token from client
    """
    try:
        # Verify the Firebase ID token and check admin status
        admin_result = await firebase_service.verify_admin_token(request.token)
        
        if not admin_result['success']:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        
        decoded_token = admin_result['user']
        is_admin = admin_result['is_admin']
        
        # Get user info from Firebase Auth
        user = await firebase_service.get_user_by_uid(decoded_token['uid'])
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Check MFA status FIRST - before creating session
        mfa_status = await mfa_service.get_mfa_status(user['uid'])
        requires_mfa = mfa_status.get('success') and mfa_status.get('enabled', False)
        
        logger.info(f"MFA check for user {user['uid']}: status={mfa_status}, requires_mfa={requires_mfa}")
        
        # If MFA is required, don't create session yet - return requires_mfa flag
        if requires_mfa:
            logger.info(f"MFA required for user {user['uid']} - returning requires_mfa flag without creating session")
            metadata = {
                'is_admin': is_admin,
                'admin_role': admin_result.get('admin_role') if is_admin else None,
                'permissions': admin_result.get('permissions') if is_admin else None,
                'redirect_to': '/admin321' if is_admin else '/dashboard',
                'requires_mfa': True
            }
            
            return AuthResponse(
                success=True,
                message="MFA verification required",
                user=UserResponse(
                    uid=user['uid'],
                    email=user['email'],
                    display_name=user['displayName'],
                    email_verified=user['emailVerified']
                ),
                access_token=None,  # No session token until MFA is verified
                metadata=metadata
            )
        
        # MFA not required - create session normally
        device_info = req.headers.get('user-agent', 'Unknown')
        ip_address = req.client.host if req.client else None
        
        session_token = await session_service.create_session(
            uid=user['uid'],
            email=user['email'],
            device_info=device_info,
            ip_address=ip_address
        )
        
        # Prepare metadata with admin info if applicable
        metadata = {}
        if is_admin:
            metadata = {
                'is_admin': True,
                'admin_role': admin_result['admin_role'],
                'permissions': admin_result['permissions'],
                'redirect_to': '/admin321',  # Redirect admin users
                'requires_mfa': False
            }
        else:
            metadata = {
                'is_admin': False,
                'redirect_to': '/dashboard',  # Redirect regular users
                'requires_mfa': False
            }
        
        message = "Admin session created successfully" if is_admin else "Token verified successfully. Session created (1 week validity)."
        
        return AuthResponse(
            success=True,
            message=message,
            user=UserResponse(
                uid=user['uid'],
                email=user['email'],
                display_name=user['displayName'],
                email_verified=user['emailVerified']
            ),
            access_token=session_token,
            metadata=metadata
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token verification failed"
        )


@router.get("/me", response_model=AuthResponse)
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), session_token: str = None):
    """
    Get current authenticated user info
    
    Requires: 
    - Authorization header with Bearer token (Firebase ID token)
    - X-Session-Token header (session token) - optional but recommended
    """
    try:
        # Extract Firebase ID token from Authorization header
        firebase_token = credentials.credentials
        
        # Verify the Firebase ID token
        decoded_token = await firebase_service.verify_token(firebase_token)
        
        if not decoded_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired Firebase token"
            )
        
        uid = decoded_token['uid']
        
        # If session token provided, verify it (this enforces single-session)
        if session_token:
            session_valid = await session_service.verify_session(uid, session_token)
            if not session_valid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Session expired or invalid. Please sign in again from this device."
                )
        
        # Get user profile from Firestore
        user_profile = await firebase_service.get_user_profile(uid)
        
        if not user_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        return AuthResponse(
            success=True,
            message="User profile retrieved successfully",
            user=UserResponse(
                uid=user_profile['uid'],
                email=user_profile['email'],
                display_name=user_profile['displayName'],
                email_verified=user_profile['emailVerified'],
                created_at=user_profile.get('createdAt')
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get current user error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user profile"
        )


@router.post("/logout", response_model=SuccessResponse)
async def logout(session_token: str):
    """
    Logout user and revoke session
    
    - **session_token**: Session token to revoke
    """
    try:
        success = await session_service.revoke_session(session_token)
        
        if success:
            return SuccessResponse(
                success=True,
                message="Logged out successfully"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to logout"
        )


@router.post("/admin/init", response_model=SuccessResponse)
async def initialize_admin_user(email: str):
    """
    Initialize admin privileges for a user (Internal endpoint for setup)
    
    - **email**: Email of the user to grant admin privileges
    
    WARNING: This endpoint should only be used during initial setup and then disabled.
    """
    try:
        # Only allow specific admin email for security
        allowed_admin_emails = ['admin@gmail.com']
        
        if email not in allowed_admin_emails:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email not authorized for admin privileges"
            )
        
        result = await firebase_service.init_admin_user(email)
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result['error']
            )
        
        return SuccessResponse(
            success=True,
            message=f"Admin privileges initialized for {email}. User must sign out and sign in again to receive admin claims."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin initialization error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initialize admin privileges"
        )


@router.post("/verify-admin", response_model=AuthResponse)
async def verify_admin_token(request: TokenVerifyRequest):
    """
    Verify Firebase ID token and check admin status
    
    - **token**: Firebase ID token from client
    """
    try:
        result = await firebase_service.verify_admin_token(request.token)
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=result['error']
            )
        
        user_data = result['user']
        
        if not result['is_admin']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required"
            )
        
        return AuthResponse(
            success=True,
            message="Admin token verified successfully",
            user=UserResponse(
                uid=user_data['uid'],
                email=user_data['email'],
                display_name=user_data.get('name'),
                email_verified=user_data.get('email_verified', False)
            ),
            access_token=None,  # Admin uses Firebase ID token directly
            metadata={
                'admin_role': result['admin_role'],
                'permissions': result['permissions']
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin token verification error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin verification failed"
        )


@router.post("/check-lockout")
async def check_lockout(request: SignInRequest):
    """
    Check if account is locked before attempting sign-in
    
    - **email**: User's email address
    """
    try:
        result = await firebase_service.check_account_lockout(request.email)
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to check account lockout status"
            )
        
        return {
            "success": True,
            "isLocked": result['isLocked'],
            "failedAttempts": result['failedAttempts'],
            "lockedUntil": result['lockedUntil'],
            "remainingAttempts": result.get('remainingAttempts', max(0, 5 - result['failedAttempts']))
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Check lockout error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check account lockout"
        )


@router.post("/record-failed-attempt")
async def record_failed_attempt(request: SignInRequest):
    """
    Record a failed login attempt
    
    - **email**: User's email address
    """
    try:
        result = await firebase_service.record_failed_login_attempt(request.email)
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to record failed attempt"
            )
        
        return {
            "success": True,
            "failedAttempts": result['failedAttempts'],
            "isLocked": result['isLocked'],
            "lockedUntil": result.get('lockedUntil'),
            "remainingAttempts": result.get('remainingAttempts', max(0, 5 - result['failedAttempts']))
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Record failed attempt error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record failed attempt"
        )


@router.post("/reset-failed-attempts")
async def reset_failed_attempts(request: SignInRequest):
    """
    Reset failed login attempts on successful login
    
    - **email**: User's email address
    """
    try:
        result = await firebase_service.reset_failed_login_attempts(request.email)
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to reset failed attempts"
            )
        
        return {
            "success": True,
            "message": result.get('message', 'Failed attempts reset')
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reset failed attempts error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset failed attempts"
        )


# Dependency to get current user from token (defined before MFA endpoints)
async def get_current_user_dependency(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
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


@router.post("/mfa/setup", response_model=MFASetupResponse)
async def setup_mfa(current_user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """
    Setup MFA for the current user - generates secret and QR code
    
    Requires authentication
    """
    try:
        uid = current_user['uid']
        email = current_user.get('email', '')
        
        result = await mfa_service.setup_mfa(uid, email)
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get('error', 'Failed to setup MFA')
            )
        
        return MFASetupResponse(
            success=True,
            qr_code=result['qr_code'],
            manual_entry_key=result['manual_entry_key'],
            message="Scan the QR code with your authenticator app"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"MFA setup error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to setup MFA"
        )


@router.post("/mfa/verify-setup", response_model=MFAVerifySetupResponse)
async def verify_mfa_setup(
    request: MFAVerifySetupRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """
    Verify MFA setup by checking the code from authenticator app
    
    Requires authentication
    """
    try:
        uid = current_user['uid']
        
        result = await mfa_service.verify_mfa_setup(uid, request.code)
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Invalid verification code')
            )
        
        return MFAVerifySetupResponse(
            success=True,
            backup_codes=result['backup_codes'],
            message="MFA enabled successfully. Please save your backup codes."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"MFA verify setup error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify MFA setup"
        )


@router.post("/mfa/verify-login", response_model=AuthResponse)
async def verify_mfa_login(request: MFAVerifyLoginRequest, req: Request):
    """
    Verify MFA code during login and create session if successful
    """
    try:
        # Verify MFA code
        result = await mfa_service.verify_mfa_login(request.uid, request.code)
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=result.get('error', 'Invalid MFA code')
            )
        
        # MFA verified - now create session
        user = await firebase_service.get_user_by_uid(request.uid)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Check admin status by checking Firestore admins collection
        try:
            admin_doc = firebase_service.db.collection('admins').document(request.uid).get()
            is_admin = admin_doc.exists if admin_doc else False
            
            admin_role = None
            permissions = []
            if is_admin:
                admin_data = admin_doc.to_dict()
                admin_role = admin_data.get('role', 'admin')
                permissions = admin_data.get('permissions', [])
        except Exception as e:
            logger.warning(f"Failed to check admin status for {request.uid}: {str(e)}")
            is_admin = False
            admin_role = None
            permissions = []
        
        # Create session
        device_info = req.headers.get('user-agent', 'Unknown')
        ip_address = req.client.host if req.client else None
        
        session_token = await session_service.create_session(
            uid=user['uid'],
            email=user['email'],
            device_info=device_info,
            ip_address=ip_address
        )
        
        # Prepare metadata
        metadata = {}
        if is_admin:
            metadata = {
                'is_admin': True,
                'admin_role': admin_role,
                'permissions': permissions,
                'redirect_to': '/admin321',
                'requires_mfa': False
            }
        else:
            metadata = {
                'is_admin': False,
                'redirect_to': '/dashboard',
                'requires_mfa': False
            }
        
        message = "MFA verified. Session created successfully."
        
        return AuthResponse(
            success=True,
            message=message,
            user=UserResponse(
                uid=user['uid'],
                email=user['email'],
                display_name=user['displayName'],
                email_verified=user['emailVerified']
            ),
            access_token=session_token,
            metadata=metadata
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"MFA verify login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify MFA code"
        )


@router.post("/mfa/disable", response_model=SuccessResponse)
async def disable_mfa(current_user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """
    Disable MFA for the current user
    
    Requires authentication
    """
    try:
        uid = current_user['uid']
        
        result = await mfa_service.disable_mfa(uid)
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get('error', 'Failed to disable MFA')
            )
        
        return SuccessResponse(
            success=True,
            message="MFA disabled successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"MFA disable error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to disable MFA"
        )


@router.get("/mfa/status")
async def get_mfa_status(current_user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """
    Get MFA status for the current user
    
    Requires authentication
    """
    try:
        uid = current_user['uid']
        
        result = await mfa_service.get_mfa_status(uid)
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get('error', 'Failed to get MFA status')
            )
        
        return {
            "success": True,
            "enabled": result['enabled'],
            "method": result['method'],
            "setup_in_progress": result['setup_in_progress'],
            "backup_codes_count": result['backup_codes_count']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get MFA status error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get MFA status"
        )


# ── Admin: user role management ───────────────────────────────────────────────

ADMIN_EMAIL = "admin@gmail.com"

_VALID_ROLES = {"admin", "user", "viewer"}


async def _require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Dependency: verifies caller is the platform admin."""
    token = credentials.credentials
    decoded = await firebase_service.verify_token(token)
    if not decoded or decoded.get("email") != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Admin access required")
    return decoded


class RoleUpdateRequest(SuccessResponse):
    pass


from pydantic import BaseModel as _BaseModel

class _RoleBody(_BaseModel):
    role: str


@router.patch("/admin/users/{uid}/role")
async def set_user_role(
    uid: str,
    body: _RoleBody,
    _admin: dict = Depends(_require_admin),
):
    """Set a user's role (admin, user, viewer). Admin only."""
    if body.role not in _VALID_ROLES:
        raise HTTPException(status_code=422, detail=f"Invalid role. Must be one of: {', '.join(_VALID_ROLES)}")
    try:
        from firebase_admin import firestore as _fs
        _fs.client().collection("users").document(uid).update({
            "role": body.role,
            "updatedAt": _fs.SERVER_TIMESTAMP,
        })
        return {"success": True, "uid": uid, "role": body.role}
    except Exception as e:
        logger.error("set_user_role error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to update role")


@router.get("/admin/users")
async def list_users_with_roles(
    _admin: dict = Depends(_require_admin),
):
    """List all users with their role. Admin only."""
    try:
        from firebase_admin import firestore as _fs
        docs = _fs.client().collection("users").stream()
        users = []
        for doc in docs:
            d = doc.to_dict()
            users.append({
                "uid": doc.id,
                "email": d.get("email", ""),
                "displayName": d.get("displayName", ""),
                "role": d.get("role", "user"),
                "createdAt": str(d.get("createdAt", "")),
                "lastLoginAt": str(d.get("lastLoginAt", "")),
                "subscription": d.get("subscription", {}),
            })
        return {"users": users}
    except Exception as e:
        logger.error("list_users_with_roles error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to list users")
