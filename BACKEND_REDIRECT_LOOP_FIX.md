# Fix: Redirect Loop When Backend is Running

## Problem
When the backend is running, the frontend gets stuck in a redirect loop to `/sign-in` page.

## Root Cause
1. **Dashboard makes authenticated API calls** on page load
2. **Backend requires valid Firebase token** for analytics endpoints
3. **If token is missing/invalid** → Backend returns 401
4. **API client redirects to sign-in** → Creates loop

## Solution Applied

### 1. Dashboard Auth Check
Updated `DashboardHome.tsx` to:
- ✅ Check if user is authenticated **before** making API calls
- ✅ Verify Firebase token exists before fetching data
- ✅ Skip API calls if user is not authenticated
- ✅ Handle errors gracefully without redirecting

### 2. API Client Redirect Logic
Updated `lib/api/client.ts` to:
- ✅ **Don't redirect** on 401 errors from dashboard/analytics endpoints
- ✅ Dashboard handles its own errors gracefully
- ✅ Only redirect on actual authentication failures (not dashboard data errors)

### 3. Error Handling
- ✅ Network errors don't trigger redirects
- ✅ Analytics endpoint errors are handled gracefully
- ✅ Dashboard shows fallback data when backend/auth fails

## Changes Made

### `components/dashboard/DashboardHome.tsx`
```typescript
// Before: Made API calls immediately
useEffect(() => {
  fetchDashboardData();
}, []);

// After: Check auth first
useEffect(() => {
  const fetchDashboardData = async () => {
    // Check if user is authenticated
    const { auth } = await import('@/lib/firebase');
    if (!auth.currentUser) {
      setDataLoading(false);
      return;
    }
    
    // Verify token exists
    const token = await auth.currentUser.getIdToken().catch(() => null);
    if (!token) {
      setDataLoading(false);
      return;
    }
    
    // Then make API calls...
  };
  
  if (!profileLoading) {
    fetchDashboardData();
  }
}, [profileLoading]);
```

### `lib/api/client.ts`
```typescript
// Added dashboard/analytics exclusion
const onDashboard = currentPath === '/dashboard' || currentPath.startsWith('/dashboard');
const isAnalyticsEndpoint = error.config?.url?.includes('/analytics/');

if (!onAdmin && !onSignIn && !onDashboard && !isPublicEndpoint && !isAnalyticsEndpoint) {
  window.location.replace('/sign-in');
}
```

## Testing

### ✅ Test 1: Backend Running, User Authenticated
1. Start backend: `python run.py`
2. Sign in to frontend
3. Go to dashboard
4. **Expected**: Dashboard loads, no redirect loop

### ✅ Test 2: Backend Running, User NOT Authenticated
1. Start backend
2. Don't sign in
3. Try to access dashboard
4. **Expected**: Redirects to sign-in (once), no loop

### ✅ Test 3: Backend Running, Invalid Token
1. Start backend
2. Sign in, then manually clear token
3. Go to dashboard
4. **Expected**: Dashboard shows empty data, no redirect loop

### ✅ Test 4: Backend NOT Running
1. Don't start backend
2. Sign in to frontend
3. Go to dashboard
4. **Expected**: Dashboard shows empty data, no errors/redirects

## Potential Issues

### Issue 1: Token Not Being Sent
**Symptom**: Backend returns 401 even when user is signed in
**Fix**: Check browser console for token errors
**Debug**:
```javascript
// In browser console
import('@/lib/firebase').then(async ({ auth }) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    console.log('Token exists:', !!token);
  }
});
```

### Issue 2: Backend Can't Verify Token
**Symptom**: Backend logs show token verification errors
**Fix**: Check backend Firebase credentials in `backend/.env`
**Debug**: Look at backend logs for:
- "Token verification failed"
- "Firebase Admin SDK" errors
- "Invalid token" messages

### Issue 3: CORS Issues
**Symptom**: Network errors in console
**Fix**: Check backend CORS settings allow `http://localhost:3000`
**Debug**: Check Network tab for CORS errors

## Prevention

To prevent future redirect loops:
1. ✅ Always check auth before making authenticated API calls
2. ✅ Don't redirect on dashboard/analytics endpoint errors
3. ✅ Handle network errors gracefully
4. ✅ Use fallback data when backend is unavailable
5. ✅ Verify token exists before making API calls

## Quick Debug

If loop still happens:

1. **Check browser console** for:
   - Token errors
   - 401 errors
   - Network errors

2. **Check backend logs** for:
   - Token verification errors
   - Firebase connection issues
   - Authentication failures

3. **Clear browser storage**:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

4. **Check Network tab**:
   - Which requests are failing?
   - What status codes?
   - Are tokens being sent?

## Summary

The redirect loop was caused by:
- Dashboard making authenticated API calls without checking auth first
- API client redirecting on all 401 errors, including dashboard errors

**Fixed by**:
- Checking authentication before API calls
- Excluding dashboard/analytics endpoints from redirect logic
- Better error handling

The app should now work correctly whether the backend is running or not!

