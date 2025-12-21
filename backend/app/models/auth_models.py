from pydantic import BaseModel, EmailStr, validator
from typing import Optional, Dict, Any
from datetime import datetime


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: Optional[str] = None
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v
    
    @validator('display_name')
    def validate_display_name(cls, v):
        if v and len(v.strip()) < 2:
            raise ValueError('Display name must be at least 2 characters long')
        return v.strip() if v else None


class SignInRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class UserResponse(BaseModel):
    uid: str
    email: str
    display_name: Optional[str] = None
    email_verified: bool
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    success: bool
    message: str
    user: Optional[UserResponse] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    metadata: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    success: bool = False
    message: str
    error: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class SuccessResponse(BaseModel):
    success: bool = True
    message: str
    data: Optional[Dict[str, Any]] = None


class TokenVerifyRequest(BaseModel):
    token: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class MFAVerifyRequest(BaseModel):
    code: str


class MFASetupResponse(BaseModel):
    success: bool
    qr_code: Optional[str] = None
    manual_entry_key: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None


class MFAVerifySetupRequest(BaseModel):
    code: str


class MFAVerifySetupResponse(BaseModel):
    success: bool
    backup_codes: Optional[list[str]] = None
    message: Optional[str] = None
    error: Optional[str] = None


class MFAVerifyLoginRequest(BaseModel):
    code: str
    uid: str  # User ID for login verification