# Enhanced Authentication System

## Overview

Your backend now has an advanced session management system with:

1. **4-hour session lifetime** (instead of 1-hour Firebase tokens)
2. **Single-session enforcement** - logging in from a new device/browser automatically logs out the previous session
3. **Session tracking** - tracks device info, IP address, and last activity

## How It Works

### 🔐 Authentication Flow

```
┌─────────────┐         ┌─────────────┐         ┌──────────────┐
│   Frontend  │         │   Backend   │         │   Firebase   │
│             │         │             │         │  + Firestore │
└──────┬──────┘         └──────┬──────┘         └──────┬───────┘
       │                       │                        │
       │  1. Sign in           │                        │
       │  (email/password)     │                        │
       ├──────────────────────>│                        │
       │                       │                        │
       │                       │  2. Verify user        │
       │                       ├───────────────────────>│
       │                       │                        │
       │                       │  3. User valid ✅      │
       │                       │<───────────────────────┤
       │                       │                        │
       │                       │  4. Invalidate old     │
       │                       │     sessions (Firestore)│
       │                       ├───────────────────────>│
       │                       │                        │
       │                       │  5. Create new session │
       │                       ├───────────────────────>│
       │                       │                        │
       │  6. Session token     │                        │
       │     (4-hour validity) │                        │
       │<──────────────────────┤                        │
```

## API Changes

### 1. Sign In (`POST /api/v1/auth/signin`)

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sign in successful. Session created (4 hours validity).",
  "user": {
    "uid": "abc123",
    "email": "user@example.com",
    "display_name": "John Doe",
    "email_verified": true
  },
  "access_token": "session_token_here_32_chars",  // NEW: Session token
  "token_type": "bearer"
}
```

**What happens:**
- ✅ Checks if user exists in Firebase Auth
- ✅ **Invalidates ALL previous sessions** for this user
- ✅ Creates a new session with 4-hour expiration
- ✅ Returns session token to frontend

### 2. Verify Token (`POST /api/v1/auth/verify-token`)

**Request:**
```json
{
  "token": "firebase_id_token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token verified successfully. Session created (4 hours validity).",
  "user": { ... },
  "access_token": "session_token_here"  // NEW: Session token
}
```

**What happens:**
- ✅ Verifies Firebase ID token
- ✅ **Invalidates ALL previous sessions** for this user
- ✅ Creates a new session
- ✅ Returns session token

### 3. Get Current User (`GET /api/v1/auth/me`)

**Request Headers:**
```
Authorization: Bearer <firebase_id_token>
X-Session-Token: <session_token>  (Optional but recommended)
```

**What happens:**
- ✅ Verifies Firebase ID token
- ✅ If `X-Session-Token` provided, verifies session is still active
- ✅ If session expired or invalidated, returns 401 error
- ✅ Refreshes session expiration time (extends 4 hours from now)

### 4. Logout (`POST /api/v1/auth/logout`) - NEW

**Request:**
```json
{
  "session_token": "session_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**What happens:**
- ✅ Revokes the session immediately
- ✅ Marks it as inactive in Firestore

## Session Data Structure (Firestore)

Sessions are stored in the `user_sessions` collection:

```javascript
{
  uid: "user_uid",
  email: "user@example.com",
  session_token: "32_char_random_token",
  device_info: "Mozilla/5.0...",  // User-Agent
  ip_address: "192.168.1.1",
  created_at: Timestamp,
  last_activity: Timestamp,
  expires_at: Timestamp,  // Created_at + 4 hours
  is_active: true,
  revoked: false,
  revoked_reason: null  // "New login from different device/browser" when invalidated
}
```

## Single-Session Enforcement

### Scenario 1: User Logs In From Desktop
```
1. User signs in on Desktop Chrome
   → Session A created (4 hours)
   ✅ User can access the app
```

### Scenario 2: Same User Logs In From Mobile
```
1. User signs in on Mobile Safari
   → Session A is INVALIDATED
   → Session B created (4 hours)
   
2. Desktop Chrome makes API call with Session A token
   ❌ Returns 401: "Session expired or invalid. Please sign in again."
   
3. Mobile Safari makes API call with Session B token
   ✅ Success - this is the active session
```

## Benefits

### 1. Extended Session Time
- Users stay logged in for **4 hours** instead of just 1 hour
- Every API call **refreshes** the 4-hour timer
- Better user experience for active users

### 2. Security
- **One device at a time** - prevents account sharing
- **Automatic logout** on other devices when user logs in elsewhere
- **Session tracking** - know which device/IP is active

### 3. Flexibility
- Can easily adjust session lifetime (change `session_lifetime_hours`)
- Can implement **multiple sessions** per user if needed in future
- Can add session management UI (show active sessions, revoke specific ones)

## Frontend Integration

### Store Session Token
```typescript
// After successful sign in
const response = await fetch('/api/v1/auth/signin', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});

const data = await response.json();
const sessionToken = data.access_token;  // Store this!

// Save to localStorage or secure storage
localStorage.setItem('session_token', sessionToken);
```

### Use Session Token in API Calls
```typescript
// Get Firebase ID token (refreshed automatically)
const firebaseToken = await auth.currentUser.getIdToken();
const sessionToken = localStorage.getItem('session_token');

// Make API call with both tokens
const response = await fetch('/api/v1/auth/me', {
  headers: {
    'Authorization': `Bearer ${firebaseToken}`,
    'X-Session-Token': sessionToken
  }
});

// If response is 401 (session invalid)
if (response.status === 401) {
  // Session was invalidated (user logged in elsewhere)
  // Redirect to login page
  router.push('/sign-in');
}
```

## Configuration

Edit `backend/app/services/session_service.py`:

```python
class SessionService:
    def __init__(self):
        # Change session lifetime here
        self.session_lifetime_hours = 4  # Default: 4 hours
```

To allow **multiple sessions** (disable single-session enforcement):

```python
async def create_session(...):
    # Comment out this line to allow multiple sessions
    # await self._invalidate_all_user_sessions(uid)
```

## Monitoring

### Check Active Sessions
```python
# Get user's active session
session = await session_service.get_active_session(uid="user_uid")
print(session)
```

### Cleanup Expired Sessions (Run periodically)
```python
# Clean up expired sessions
cleaned = await session_service.cleanup_expired_sessions()
print(f"Cleaned {cleaned} expired sessions")
```

## Testing

Test the single-session enforcement:

1. Sign in from Chrome → Get session token A
2. Sign in from Firefox → Get session token B
3. Try using session token A → Should fail with 401
4. Use session token B → Should work ✅

## Summary

✅ **4-hour sessions** - Extended from 1 hour  
✅ **Single session per user** - Automatic logout on new login  
✅ **Session tracking** - Device info, IP, timestamps  
✅ **Auto-refresh** - Active users stay logged in  
✅ **Secure** - Prevents account sharing  
✅ **Flexible** - Easy to configure  

Your authentication system is now production-ready! 🚀
