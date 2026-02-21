# Redirect Loop Fix

## Problem
The frontend was stuck in a redirect loop, constantly redirecting to `/sign-in` page.

## Root Cause
The API client's response interceptor was redirecting to `/sign-in` on **any** 401 error, including:
- Network errors (backend not running)
- Public endpoints that don't require auth
- When already on the sign-in page

## Solution Applied

### 1. Smarter 401 Redirect Logic
Updated `lib/api/client.ts` to only redirect when:
- ✅ We have a valid HTTP response (not network error)
- ✅ We're NOT already on sign-in page (prevents loops)
- ✅ We're NOT on admin pages
- ✅ It's NOT a public endpoint (like `/check-account-status`)

### 2. Network Error Handling
Network errors (connection refused, timeout) are now treated separately and **don't trigger redirects** since they're not authentication failures.

### 3. Public Endpoint Exclusion
Endpoints that don't require authentication are excluded from redirect logic:
- `/check-account-status` (called before login)
- `/forgot-password`
- `/sign-up`

## Changes Made

### `lib/api/client.ts`
```typescript
// Before: Redirected on ANY 401
if (status === 401 && typeof window !== 'undefined') {
  if (window.location.pathname !== '/sign-in') {
    window.location.href = '/sign-in';
  }
}

// After: Smart redirect with checks
if (status === 401 && typeof window !== 'undefined') {
  const currentPath = window.location.pathname;
  const onAdmin = currentPath.startsWith('/admin321');
  const onSignIn = currentPath === '/sign-in' || currentPath.startsWith('/sign-in');
  const isPublicEndpoint = error.config?.url?.includes('/check-account-status') || 
                           error.config?.url?.includes('/forgot-password') ||
                           error.config?.url?.includes('/sign-up');
  
  if (!onAdmin && !onSignIn && !isPublicEndpoint) {
    window.location.replace('/sign-in'); // Use replace to avoid history
  }
}
```

### `app/sign-in/page.tsx`
Updated to handle network errors gracefully without blocking login.

## Testing

### ✅ Test 1: Backend Not Running
1. Stop backend server
2. Try to access dashboard
3. **Expected**: Should show error, NOT redirect loop

### ✅ Test 2: Sign In Page
1. Go to `/sign-in`
2. **Expected**: Should stay on sign-in page, no loop

### ✅ Test 3: Public Endpoints
1. Call `/check-account-status` without auth
2. **Expected**: Should return error, NOT redirect

### ✅ Test 4: Authenticated User
1. Sign in successfully
2. Access dashboard
3. **Expected**: Should work normally

## Prevention

To prevent future redirect loops:
1. ✅ Always check if already on sign-in before redirecting
2. ✅ Exclude public endpoints from auth redirects
3. ✅ Distinguish network errors from auth errors
4. ✅ Use `window.location.replace()` instead of `href` to avoid history issues

## If Loop Still Happens

1. **Clear browser cache and localStorage:**
   ```javascript
   // In browser console
   localStorage.clear();
   sessionStorage.clear();
   ```

2. **Check browser console** for error messages

3. **Check Network tab** to see which API calls are failing

4. **Verify backend is running:**
   ```bash
   curl http://localhost:8000/health
   ```

5. **Check `.env.local`** has correct backend URL:
   ```env
   NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8000
   ```

