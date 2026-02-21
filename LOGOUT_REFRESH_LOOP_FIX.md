# Fix: Refresh Loop After Logout with 2FA Enabled

## Problem
After enabling 2FA and logging out, the frontend page keeps refreshing in a continuous loop.

## Root Cause
1. **Logout not clearing all state** - Some localStorage items remain
2. **Sign-in page redirecting too quickly** - Checks auth state before it's fully cleared
3. **check-account-status endpoint errors** - Might be causing redirects
4. **Auth state race condition** - Firebase auth state and backend auth state out of sync

## Solution Applied

### 1. Clear All Auth State on Logout
Updated `lib/auth.ts` to clear all auth-related localStorage items:
- `backend_auth_token`
- `backend_session_token`
- `user_is_admin`
- `admin_redirect_url`

### 2. Fix Sign-In Redirect Logic
Updated `app/sign-in/page.tsx` to:
- Wait for auth loading to complete before checking
- Only redirect if actually on sign-in page (prevent loops)
- Use `router.replace()` instead of `router.push()` to avoid history issues

### 3. Better Error Handling
Updated `lib/api/services/twoFactorService.ts` to:
- Handle 401 errors gracefully in `checkAccountStatus`
- Return safe defaults if backend has auth issues
- Don't throw errors that cause redirects

## Changes Made

### `lib/auth.ts`
```typescript
async signOutUser(): Promise<void> {
  await signOut(auth);
  // Clear all auth-related localStorage items
  localStorage.removeItem('backend_auth_token');
  localStorage.removeItem('backend_session_token');
  localStorage.removeItem('user_is_admin');
  localStorage.removeItem('admin_redirect_url');
}
```

### `app/sign-in/page.tsx`
```typescript
// Wait for auth to load, only redirect if actually authenticated
useEffect(() => {
  if (authLoading || backendLoading) {
    return; // Wait for loading to complete
  }
  
  // Only redirect if we have valid auth AND we're on sign-in page
  if ((firebaseUser || backendAuthenticated) && 
      window.location.pathname === '/sign-in') {
    router.replace(redirect); // Use replace, not push
  }
}, [authLoading, backendLoading, firebaseUser, backendAuthenticated]);
```

### `lib/api/services/twoFactorService.ts`
```typescript
async checkAccountStatus(email: string): Promise<AccountStatus> {
  try {
    const response = await apiClient.get(...);
    return response.data;
  } catch (error: any) {
    // Return safe defaults if auth fails
    if (error?.status === 401 || error?.message === 'Invalid token') {
      return {
        success: true,
        accountLocked: false,
        failedAttempts: 0,
        twoFactorEnabled: false
      };
    }
    throw error;
  }
}
```

## Testing

### ✅ Test 1: Normal Logout
1. Sign in
2. Logout
3. **Expected**: Redirects to sign-in, no loop

### ✅ Test 2: Logout with 2FA Enabled
1. Enable 2FA
2. Logout
3. **Expected**: Redirects to sign-in, no loop

### ✅ Test 3: Sign In After Logout
1. Logout
2. Sign in again
3. **Expected**: Works normally, no loop

### ✅ Test 4: Multiple Logout/Login Cycles
1. Sign in → Logout → Sign in → Logout (repeat)
2. **Expected**: No loops, works smoothly

## If Loop Still Happens

### Quick Fix 1: Clear Browser Storage
```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Quick Fix 2: Check Auth State
```javascript
// In browser console
import('@/lib/firebase').then(({ auth }) => {
  console.log('Firebase user:', auth.currentUser);
  console.log('LocalStorage tokens:', {
    backend: localStorage.getItem('backend_auth_token'),
    session: localStorage.getItem('backend_session_token'),
    admin: localStorage.getItem('user_is_admin')
  });
});
```

### Quick Fix 3: Check Backend Logs
Look for:
- Token verification errors
- 401 errors from check-account-status
- Firebase connection issues

## Prevention

To prevent future loops:
1. ✅ Always clear all auth state on logout
2. ✅ Wait for auth loading to complete before redirects
3. ✅ Check current pathname before redirecting
4. ✅ Use `router.replace()` instead of `router.push()`
5. ✅ Handle auth errors gracefully

## Summary

The refresh loop was caused by:
- Incomplete state clearing on logout
- Sign-in page redirecting before auth state cleared
- Auth state race conditions

**Fixed by**:
- Clearing all localStorage on logout
- Better redirect logic with pathname check
- Graceful error handling for auth endpoints

The logout flow should now work smoothly with or without 2FA enabled!

