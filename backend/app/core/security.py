from functools import wraps
from typing import Dict, List, Optional, Callable, Any
from datetime import datetime, timedelta
from fastapi import HTTPException, Request
from collections import defaultdict
import time
import hashlib
import logging
import asyncio
from threading import Lock

logger = logging.getLogger(__name__)

# In-memory store for rate limiting (in production, use Redis)
rate_limit_store: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"count": 0, "reset_time": 0})
rate_limit_lock = Lock()

# Token verification cache
token_cache: Dict[str, Dict[str, Any]] = {}
token_cache_lock = Lock()


def rate_limit(requests_per_minute: int = 60, window_minutes: int = 1):
    """
    Rate limiting decorator for API endpoints
    
    Args:
        requests_per_minute: Maximum requests allowed per minute
        window_minutes: Time window in minutes for rate limiting
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract request from args/kwargs
            request: Optional[Request] = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if not request:
                # Look in kwargs
                request = kwargs.get('request')
            
            if not request:
                logger.warning("Rate limit decorator: Request object not found")
                return await func(*args, **kwargs)
            
            # Get client identifier
            client_id = get_client_identifier(request)
            current_time = time.time()
            window_seconds = window_minutes * 60
            
            with rate_limit_lock:
                client_data = rate_limit_store[client_id]
                
                # Reset count if window has expired
                if current_time >= client_data["reset_time"]:
                    client_data["count"] = 0
                    client_data["reset_time"] = current_time + window_seconds
                
                # Check rate limit
                if client_data["count"] >= requests_per_minute:
                    reset_in = int(client_data["reset_time"] - current_time)
                    logger.warning(f"Rate limit exceeded for client {client_id}")
                    raise HTTPException(
                        status_code=429,
                        detail=f"Rate limit exceeded. Try again in {reset_in} seconds.",
                        headers={"Retry-After": str(reset_in)}
                    )
                
                # Increment counter
                client_data["count"] += 1
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def get_client_identifier(request: Request) -> str:
    """
    Get unique client identifier for rate limiting
    
    Priority:
    1. User ID from authenticated token
    2. API Key
    3. IP Address + User Agent
    """
    try:
        # Try to get user ID from Authorization header
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            # This is a simplified approach - in production, decode the JWT
            user_id = get_user_id_from_token(token)
            if user_id:
                return f"user:{user_id}"
        
        # Try API key
        api_key = request.headers.get("x-api-key")
        if api_key:
            return f"api_key:{hashlib.md5(api_key.encode()).hexdigest()[:8]}"
        
        # Fall back to IP + User Agent
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "")
        client_hash = hashlib.md5(f"{client_ip}:{user_agent}".encode()).hexdigest()[:8]
        return f"ip:{client_hash}"
        
    except Exception as e:
        logger.error(f"Error getting client identifier: {str(e)}")
        return "unknown"


def get_user_id_from_token(token: str) -> Optional[str]:
    """
    Extract user ID from JWT token (simplified)
    In production, properly decode and validate the JWT
    """
    try:
        with token_cache_lock:
            if token in token_cache:
                cache_entry = token_cache[token]
                # Check if cache entry is still valid (5 minutes)
                if time.time() - cache_entry["timestamp"] < 300:
                    return cache_entry["user_id"]
        
        # In production, decode JWT properly
        # For now, this is a placeholder
        return None
        
    except Exception as e:
        logger.error(f"Error extracting user ID from token: {str(e)}")
        return None


async def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify JWT token and return user information
    This should integrate with your Firebase service
    """
    try:
        # This is a placeholder - implement actual token verification
        # Should integrate with Firebase Auth
        from app.services.firebase_service import FirebaseService
        firebase_service = FirebaseService()
        return await firebase_service.verify_token(token)
        
    except Exception as e:
        logger.error(f"Token verification failed: {str(e)}")
        return None


def require_permissions(permissions: List[str]):
    """
    Decorator to require specific permissions
    
    Args:
        permissions: List of required permissions
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get current user from kwargs
            current_user = kwargs.get('current_user')
            
            if not current_user:
                raise HTTPException(
                    status_code=401,
                    detail="Authentication required"
                )
            
            user_permissions = current_user.get('permissions', [])
            user_roles = current_user.get('roles', [])
            
            # Check if user has required permissions
            has_permission = False
            
            for permission in permissions:
                if permission in user_permissions:
                    has_permission = True
                    break
                
                # Check role-based permissions
                if permission.startswith('admin:') and ('admin' in user_roles or 'super_admin' in user_roles):
                    has_permission = True
                    break
                
                if permission.startswith('user:') and 'user' in user_roles:
                    has_permission = True
                    break
            
            if not has_permission:
                logger.warning(f"Permission denied for user {current_user.get('uid')}: required {permissions}")
                raise HTTPException(
                    status_code=403,
                    detail=f"Insufficient permissions. Required: {', '.join(permissions)}"
                )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def sanitize_input(data: Any, max_length: int = 1000, allowed_chars: Optional[str] = None) -> Any:
    """
    Sanitize user input to prevent injection attacks
    
    Args:
        data: Input data to sanitize
        max_length: Maximum allowed string length
        allowed_chars: Regex pattern for allowed characters
    """
    if isinstance(data, str):
        # Remove null bytes and control characters
        sanitized = ''.join(char for char in data if ord(char) >= 32 or char in '\n\r\t')
        
        # Truncate if too long
        if len(sanitized) > max_length:
            sanitized = sanitized[:max_length]
        
        # Apply character filter if provided
        if allowed_chars:
            import re
            if not re.match(allowed_chars, sanitized):
                raise ValueError(f"Input contains invalid characters")
        
        return sanitized
    
    elif isinstance(data, dict):
        return {key: sanitize_input(value, max_length, allowed_chars) for key, value in data.items()}
    
    elif isinstance(data, list):
        return [sanitize_input(item, max_length, allowed_chars) for item in data]
    
    else:
        return data


def hash_sensitive_data(data: str, salt: Optional[str] = None) -> str:
    """
    Hash sensitive data with salt
    
    Args:
        data: Data to hash
        salt: Optional salt (will generate if not provided)
    """
    import os
    import hashlib
    
    if not salt:
        salt = os.urandom(32).hex()
    
    # Use PBKDF2 for key derivation
    key = hashlib.pbkdf2_hmac('sha256', data.encode(), salt.encode(), 100000)
    return salt + key.hex()


def verify_hashed_data(data: str, hashed: str) -> bool:
    """
    Verify data against hash
    
    Args:
        data: Original data
        hashed: Hashed data (includes salt)
    """
    try:
        import hashlib
        
        # Extract salt (first 64 characters)
        salt = hashed[:64]
        stored_hash = hashed[64:]
        
        # Hash input data with extracted salt
        key = hashlib.pbkdf2_hmac('sha256', data.encode(), salt.encode(), 100000)
        
        return key.hex() == stored_hash
        
    except Exception as e:
        logger.error(f"Error verifying hashed data: {str(e)}")
        return False


def generate_api_key(user_id: str, permissions: List[str] = None) -> str:
    """
    Generate API key for a user
    
    Args:
        user_id: User identifier
        permissions: List of permissions for the API key
    """
    import secrets
    import base64
    import json
    
    # Generate random key
    random_part = secrets.token_urlsafe(32)
    
    # Create metadata
    metadata = {
        "user_id": user_id,
        "permissions": permissions or [],
        "created_at": time.time()
    }
    
    # Encode metadata
    metadata_encoded = base64.b64encode(json.dumps(metadata).encode()).decode()
    
    return f"nxa_{random_part}_{metadata_encoded}"


def validate_api_key(api_key: str) -> Optional[Dict[str, Any]]:
    """
    Validate and decode API key
    
    Args:
        api_key: API key to validate
        
    Returns:
        Decoded API key metadata or None if invalid
    """
    try:
        import base64
        import json
        
        if not api_key.startswith("nxa_"):
            return None
        
        parts = api_key.split("_")
        if len(parts) != 3:
            return None
        
        # Decode metadata
        metadata_encoded = parts[2]
        metadata_json = base64.b64decode(metadata_encoded).decode()
        metadata = json.loads(metadata_json)
        
        return metadata
        
    except Exception as e:
        logger.error(f"Error validating API key: {str(e)}")
        return None


def cleanup_rate_limit_cache():
    """
    Clean up expired entries from rate limit cache
    Should be called periodically
    """
    current_time = time.time()
    
    with rate_limit_lock:
        expired_keys = []
        
        for key, data in rate_limit_store.items():
            if current_time >= data["reset_time"]:
                expired_keys.append(key)
        
        for key in expired_keys:
            del rate_limit_store[key]
        
        logger.info(f"Cleaned up {len(expired_keys)} expired rate limit entries")


def cleanup_token_cache():
    """
    Clean up expired entries from token cache
    Should be called periodically
    """
    current_time = time.time()
    
    with token_cache_lock:
        expired_keys = []
        
        for token, data in token_cache.items():
            # Remove entries older than 5 minutes
            if current_time - data["timestamp"] > 300:
                expired_keys.append(token)
        
        for token in expired_keys:
            del token_cache[token]
        
        logger.info(f"Cleaned up {len(expired_keys)} expired token cache entries")


# Background task to clean up caches
async def periodic_cleanup():
    """
    Periodic cleanup of security caches
    """
    while True:
        try:
            cleanup_rate_limit_cache()
            cleanup_token_cache()
            await asyncio.sleep(300)  # Clean up every 5 minutes
        except Exception as e:
            logger.error(f"Error in periodic security cleanup: {str(e)}")
            await asyncio.sleep(60)  # Wait 1 minute before retrying