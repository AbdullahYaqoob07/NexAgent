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
    TokenVerifyRequest
)
from app.services.firebase_service import firebase_service
from app.services.session_service import session_service
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
        
        # Create session (invalidates old sessions from other devices)
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
                'redirect_to': '/admin321'  # Redirect admin users
            }
        else:
            metadata = {
                'is_admin': False,
                'redirect_to': '/dashboard'  # Redirect regular users
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


# Dependency to get current user from token
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
