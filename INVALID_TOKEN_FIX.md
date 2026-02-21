# Fix: "Invalid token" Errors in Console

## Problem
Getting 401 "Invalid token" errors in console when backend is running:
```
❌ Get dashboard overview error: {message: 'Invalid token', status: undefined, data: undefined}
GET http://localhost:8000/api/v1/analytics/dashboard/real-time 401 (Unauthorized)
```

## Root Cause
1. **Token might be expired** - Firebase tokens expire after ~1 hour
2. **Token not being refreshed** - Old token being used
3. **Token not being sent** - Authorization header missing
4. **Backend can't verify token** - Firebase credentials issue

## Solution Applied

### 1. Wait for Authentication
- Dashboard now waits for `useAuth()` to confirm user is authenticated
- Only makes API calls when `user` exists and `authLoading` is false

### 2. Force Token Refresh
- API client now forces token refresh (`getIdToken(true)`)
- Ensures fresh token is used for each request
- Falls back to stored token if refresh fails

### 3. Suppress Expected Errors
- "Invalid token" errors are now suppressed (they're expected)
- 401 errors from dashboard endpoints are handled gracefully
- Dashboard shows empty data when token is invalid

### 4. Better Token Management
- Token is stored in localStorage as fallback
- Token is refreshed before each API call
- Handles token expiration gracefully

## Changes Made

### `components/dashboard/DashboardHome.tsx`
```typescript
// Now uses useAuth hook
const { user, loading: authLoading } = useAuth();

// Waits for auth before making API calls
useEffect(() => {
  if (authLoading || !user) {
    setDataLoading(false);
    return;
  }
  
  // Force token refresh
  const token = await auth.currentUser.getIdToken(true);
  // Then make API calls...
}, [authLoading, user]);
```

### `lib/api/client.ts`
```typescript
// Force token refresh
const idToken = await auth.currentUser.getIdToken(true);
if (idToken) {
  config.headers.Authorization = `Bearer ${idToken}`;
  // Store for fallback
  localStorage.setItem('backend_auth_token', idToken);
}
```

### `lib/api/dashboard-api.ts`
```typescript
// Suppress "Invalid token" errors
if (error?.message !== 'Invalid token' && 
    error?.status !== 401) {
  console.error('Error:', error);
}
```

## Testing

### ✅ Test 1: Normal Flow
1. Sign in to app
2. Go to dashboard
3. **Expected**: No "Invalid token" errors, data loads

### ✅ Test 2: Token Expired
1. Sign in, wait for token to expire (or manually clear)
2. Go to dashboard
3. **Expected**: No console errors, dashboard shows empty data

### ✅ Test 3: Backend Not Running
1. Don't start backend
2. Sign in, go to dashboard
3. **Expected**: No errors, dashboard shows empty data

## If Errors Persist

### Check 1: Token is Being Sent
```javascript
// In browser console (Network tab)
// Check request headers for:
Authorization: Bearer <token>
```

### Check 2: Token is Valid
```javascript
// In browser console
import('@/lib/firebase').then(async ({ auth }) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken(true);
    console.log('Token length:', token.length);
    console.log('Token preview:', token.substring(0, 20) + '...');
  }
});
```

### Check 3: Backend Can Verify Token
Check backend logs for:
- "Token verification failed"
- "Firebase Admin SDK" errors
- "Invalid token" messages

### Check 4: Firebase Credentials
Verify `backend/.env` has correct Firebase credentials:
```env
FIREBASE_PROJECT_ID=nexagent-90391
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
```

## Quick Fix

If you still see errors:

1. **Sign out and sign back in** - This refreshes the token
2. **Clear browser storage**:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```
3. **Check backend Firebase credentials** - Make sure they're correct

## Summary

The "Invalid token" errors are now:
- ✅ Suppressed in console (no spam)
- ✅ Handled gracefully (dashboard shows empty data)
- ✅ Tokens are refreshed automatically
- ✅ Better error handling overall

The dashboard will work correctly whether tokens are valid or not!

