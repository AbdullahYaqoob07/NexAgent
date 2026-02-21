"""
Two-Factor Authentication API Endpoints
"""

from fastapi import APIRouter, HTTPException, Depends, status, Query, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.services.firebase_service import firebase_service
from app.services.otp_service import otp_service
from app.core.security import rate_limit
from firebase_admin import firestore
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/two-factor", tags=["Two-Factor Authentication"])
security = HTTPBearer()

# Maximum failed login attempts before lockout
MAX_FAILED_ATTEMPTS = 3
LOCKOUT_DURATION_MINUTES = 15


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


class Enable2FARequest(BaseModel):
    method: str = "email"  # Only email for now


class VerifyOTPRequest(BaseModel):
    otp: str


class Check2FAStatusResponse(BaseModel):
    twoFactorEnabled: bool
    method: Optional[str] = None


class SendOTPResponse(BaseModel):
    success: bool
    message: str
    expiresAt: Optional[str] = None


class VerifyOTPResponse(BaseModel):
    success: bool
    message: str


@router.get("/status", response_model=Check2FAStatusResponse)
@rate_limit(requests_per_minute=30)
async def get_2fa_status(
    request: Request,
    user: dict = Depends(get_current_user)
):
    """Get 2FA status for current user"""
    try:
        uid = user.get('uid')
        user_doc = await firebase_service.get_user_profile(uid)
        
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        security = user_doc.get('security', {})
        
        return Check2FAStatusResponse(
            twoFactorEnabled=security.get('twoFactorEnabled', False),
            method=security.get('twoFactorMethod')
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get 2FA status error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get 2FA status")


@router.post("/enable", response_model=dict)
@rate_limit(requests_per_minute=10)
async def enable_2fa(
    request: Request,
    req: Enable2FARequest,
    user: dict = Depends(get_current_user)
):
    """Enable 2FA for current user"""
    try:
        uid = user.get('uid')
        user_doc = await firebase_service.get_user_profile(uid)
        
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update user document
        db = firebase_service.db
        user_ref = db.collection('users').document(uid)
        
        user_ref.update({
            'security.twoFactorEnabled': True,
            'security.twoFactorMethod': req.method,
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        logger.info(f"2FA enabled for user {uid}")
        
        return {
            'success': True,
            'message': 'Two-factor authentication enabled successfully'
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Enable 2FA error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to enable 2FA")


@router.post("/disable", response_model=dict)
@rate_limit(requests_per_minute=10)
async def disable_2fa(
    request: Request,
    user: dict = Depends(get_current_user)
):
    """Disable 2FA for current user"""
    try:
        uid = user.get('uid')
        user_doc = await firebase_service.get_user_profile(uid)
        
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update user document
        db = firebase_service.db
        user_ref = db.collection('users').document(uid)
        
        user_ref.update({
            'security.twoFactorEnabled': False,
            'security.twoFactorMethod': None,
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        logger.info(f"2FA disabled for user {uid}")
        
        return {
            'success': True,
            'message': 'Two-factor authentication disabled successfully'
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Disable 2FA error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to disable 2FA")


@router.post("/send-otp", response_model=SendOTPResponse)
@rate_limit(requests_per_minute=5)
async def send_otp(
    request: Request,
    user: dict = Depends(get_current_user)
):
    """Send OTP for 2FA verification (during login)"""
    try:
        uid = user.get('uid')
        email = user.get('email')
        
        if not email:
            raise HTTPException(status_code=400, detail="User email not found")
        
        # Check if 2FA is enabled
        user_doc = await firebase_service.get_user_profile(uid)
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        security = user_doc.get('security', {})
        if not security.get('twoFactorEnabled', False):
            raise HTTPException(status_code=400, detail="2FA is not enabled for this account")
        
        # Create and send OTP
        result = await otp_service.create_otp(uid, email)
        
        return SendOTPResponse(
            success=result['success'],
            message=result.get('message', 'OTP sent successfully'),
            expiresAt=result.get('expiresAt')
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Send OTP error: {str(e)}")
        if "wait" in str(e).lower():
            raise HTTPException(status_code=429, detail=str(e))
        raise HTTPException(status_code=500, detail="Failed to send OTP")


@router.post("/verify-otp", response_model=VerifyOTPResponse)
@rate_limit(requests_per_minute=10)
async def verify_otp(
    request: Request,
    req: VerifyOTPRequest,
    user: dict = Depends(get_current_user)
):
    """Verify OTP during login"""
    try:
        uid = user.get('uid')
        
        # Verify OTP
        result = await otp_service.verify_otp(uid, req.otp)
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Invalid OTP')
            )
        
        return VerifyOTPResponse(
            success=True,
            message=result.get('message', 'OTP verified successfully')
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verify OTP error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to verify OTP")


@router.get("/check-account-status")
@rate_limit(requests_per_minute=30)
async def check_account_status(
    request: Request,
    email: EmailStr = Query(...)
):
    """
    Check if account is locked due to failed login attempts
    This endpoint is called before attempting login
    """
    try:
        # Get user by email
        user_record = await firebase_service.get_user_by_email(email)
        
        if not user_record:
            # Don't reveal if user exists
            return {
                'success': True,
                'accountLocked': False,
                'failedAttempts': 0
            }
        
        uid = user_record.get('uid')
        user_doc = await firebase_service.get_user_profile(uid)
        
        if not user_doc:
            return {
                'success': True,
                'accountLocked': False,
                'failedAttempts': 0
            }
        
        security = user_doc.get('security', {})
        failed_attempts = security.get('failedLoginAttempts', 0)
        locked_until = security.get('accountLockedUntil')
        
        # Check if account is still locked
        account_locked = False
        if locked_until:
            if isinstance(locked_until, datetime):
                if datetime.utcnow() < locked_until:
                    account_locked = True
            else:
                # Handle Firestore timestamp
                locked_ts = locked_until.timestamp() if hasattr(locked_until, 'timestamp') else None
                if locked_ts and datetime.utcnow().timestamp() < locked_ts:
                    account_locked = True
        
        return {
            'success': True,
            'accountLocked': account_locked,
            'failedAttempts': failed_attempts,
            'lockedUntil': locked_until.isoformat() if locked_until and account_locked else None,
            'twoFactorEnabled': security.get('twoFactorEnabled', False)
        }
    except Exception as e:
        logger.error(f"Check account status error: {str(e)}")
        return {
            'success': True,
            'accountLocked': False,
            'failedAttempts': 0
        }


async def increment_failed_login_attempts(uid: str) -> dict:
    """
    Increment failed login attempts and lock account if threshold reached
    Returns dict with account status
    """
    try:
        db = firebase_service.db
        user_ref = db.collection('users').document(uid)
        
        # Get current security data
        user_doc = await firebase_service.get_user_profile(uid)
        security = user_doc.get('security', {}) if user_doc else {}
        current_attempts = security.get('failedLoginAttempts', 0)
        
        new_attempts = current_attempts + 1
        
        update_data = {
            'security.failedLoginAttempts': new_attempts,
            'security.lastFailedLoginAt': datetime.utcnow(),
            'updatedAt': firestore.SERVER_TIMESTAMP
        }
        
        # Lock account if threshold reached
        if new_attempts >= MAX_FAILED_ATTEMPTS:
            locked_until = datetime.utcnow() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
            update_data['security.accountLockedUntil'] = locked_until
            
            user_ref.update(update_data)
            
            logger.warning(f"Account {uid} locked due to {new_attempts} failed login attempts")
            
            return {
                'accountLocked': True,
                'failedAttempts': new_attempts,
                'lockedUntil': locked_until,
                'message': f'Account temporarily locked due to {MAX_FAILED_ATTEMPTS} failed login attempts. Please try again after {LOCKOUT_DURATION_MINUTES} minutes.'
            }
        else:
            user_ref.update(update_data)
            
            return {
                'accountLocked': False,
                'failedAttempts': new_attempts,
                'attemptsRemaining': MAX_FAILED_ATTEMPTS - new_attempts
            }
            
    except Exception as e:
        logger.error(f"Increment failed login attempts error: {str(e)}")
        return {
            'accountLocked': False,
            'failedAttempts': 0
        }


@router.post("/reset-failed-attempts")
@rate_limit(requests_per_minute=30)
async def reset_failed_attempts(
    request: Request,
    user: dict = Depends(get_current_user)
):
    """Reset failed login attempts on successful login"""
    try:
        uid = user.get('uid')
        db = firebase_service.db
        user_ref = db.collection('users').document(uid)
        
        user_ref.update({
            'security.failedLoginAttempts': 0,
            'security.accountLockedUntil': None,
            'security.lastFailedLoginAt': None,
            'lastLoginAt': firestore.SERVER_TIMESTAMP,
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        logger.info(f"Reset failed login attempts for user {uid}")
        
        return {
            'success': True,
            'message': 'Failed attempts reset'
        }
        
    except Exception as e:
        logger.error(f"Reset failed login attempts error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to reset attempts")


@router.post("/increment-failed-attempts")
@rate_limit(requests_per_minute=30)
async def increment_failed_attempts_endpoint(
    request: Request,
    email: EmailStr = Query(...)
):
    """Increment failed login attempts (called on failed login)"""
    try:
        # Get user by email
        user_record = await firebase_service.get_user_by_email(email)
        
        if not user_record:
            # Don't reveal if user exists
            return {
                'success': True,
                'accountLocked': False
            }
        
        uid = user_record.get('uid')
        result = await increment_failed_login_attempts(uid)
        
        return {
            'success': True,
            **result
        }
        
    except Exception as e:
        logger.error(f"Increment failed attempts error: {str(e)}")
        return {
            'success': True,
            'accountLocked': False
        }

