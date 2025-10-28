# Workflows 403 Forbidden Error - Fixed

## Issue
```
GET https://nexagent-backend-production.up.railway.app/api/v1/workflows?page...
403 (Forbidden)
{status: 403, message: 'Not authenticated', error: 'HTTP_EXCEPTION'}
```

## Root Cause

The workflows page was only checking **Firebase authentication** but not waiting for **backend authentication** to complete. The backend API requires a backend session token, which is obtained by verifying the Firebase token with the backend.

### Auth Flow
1. ✅ User logs in with Firebase
2. ⏳ Firebase token is sent to backend for verification
3. ✅ Backend returns a session token
4. ✅ Session token is stored in localStorage
5. ✅ API requests include session token in Authorization header

**The Problem**: The workflows page was trying to fetch workflows before step 3-4 completed!

## Fix Applied

Updated `app/workflows/page.tsx` to:

1. **Import BackendAuthContext**
   ```typescript
   import { useBackendAuth } from '@/lib/contexts/BackendAuthContext';
   ```

2. **Wait for Both Auth States**
   ```typescript
   const { user: firebaseUser, loading: authLoading } = useAuth();
   const { user: backendUser, loading: backendLoading, isAuthenticated } = useBackendAuth();
   ```

3. **Check Both Auth States Before Fetching**
   ```typescript
   useEffect(() => {
     const fetchWorkflows = async () => {
       // Wait for both Firebase and backend auth to complete
       if (authLoading || backendLoading) return;
       if (!firebaseUser || !isAuthenticated) return;
       
       // Now safe to fetch workflows
       const response = await workflowService.listWorkflows(...);
     };
     
     fetchWorkflows();
   }, [firebaseUser, isAuthenticated, authLoading, backendLoading]);
   ```

4. **Show Proper Loading State**
   ```typescript
   if (authLoading || backendLoading || loading) {
     return <div>{backendLoading ? 'Authenticating...' : 'Loading workflows...'}</div>;
   }
   ```

## How It Works Now

### Before (Broken)
```
User logs in → Firebase Auth ✅ → Workflows page loads → API call ❌ (no backend token)
```

### After (Fixed)
```
User logs in → Firebase Auth ✅ → Backend Auth ✅ → Workflows page loads → API call ✅
```

## Testing the Fix

1. **Sign out** completely
2. **Sign in** again
3. **Check console logs** - you should see:
   ```
   Workflows page auth state: {
     firebaseUser: true,
     backendUser: true,
     backendToken: true,
     isAuthenticated: true,
     authLoading: false,
     backendLoading: false
   }
   ```
4. **Workflows should load** without 403 error

## Debug Checklist

If you still see the 403 error:

### 1. Check Auth Token
Open browser console and run:
```javascript
localStorage.getItem('backend_auth_token')
```
Should return a JWT token string.

### 2. Check Backend Auth Context
The console should show:
```
✅ Backend auth token obtained
```

### 3. Check API Request Headers
Open Network tab → Find the workflows request → Check Headers:
```
Authorization: Bearer <your-token-here>
```

### 4. Check Backend Logs
If the token is being sent but still getting 403, the backend token might be expired or invalid.

## Common Issues

### Issue: Token Not Being Set
**Symptom**: `localStorage.getItem('backend_auth_token')` returns `null`

**Solution**: Check `BackendAuthContext.tsx` line 60 - ensure it's calling:
```typescript
const response = await authService.verifyToken({ idToken: firebaseToken });
```
(Note: `idToken` not `token`)

### Issue: Token Format Wrong
**Symptom**: Token exists but backend rejects it

**Solution**: Check `lib/api/types/auth.ts` - ensure:
```typescript
export interface TokenVerifyRequest {
  idToken: string;  // ✅ Correct
  // token: string;  // ❌ Wrong
}
```

### Issue: Token Expired
**Symptom**: Works for a while then 403

**Solution**: Sign out and sign back in to get a fresh token.

## Related Files Changed

1. ✅ `app/workflows/page.tsx` - Wait for backend auth
2. ✅ `lib/api/types/auth.ts` - Fixed `idToken` field name (previous fix)
3. ✅ `lib/contexts/BackendAuthContext.tsx` - Syncs Firebase with backend

## Auth Context Chain

```
┌─────────────────┐
│  Firebase Auth  │ (useAuth)
│  - user         │
│  - loading      │
└────────┬────────┘
         │
         │ getUserToken()
         ▼
┌─────────────────┐
│ Backend Auth    │ (useBackendAuth)
│ - verifyToken() │
│ - setAuthToken()│
└────────┬────────┘
         │
         │ Bearer Token
         ▼
┌─────────────────┐
│  API Client     │
│  - Authorization│
│  - Headers      │
└─────────────────┘
         │
         │ Authenticated Requests
         ▼
┌─────────────────┐
│  Backend API    │
│  - /workflows   │
│  - /nodes       │
└─────────────────┘
```

## Summary

✅ **Problem**: Workflows page fetched data before backend authentication completed  
✅ **Solution**: Wait for `backendLoading` and check `isAuthenticated`  
✅ **Result**: Workflows API calls now include proper authentication  
✅ **Status**: Should work now! Test by signing in again  

## Next Steps

If you're still seeing issues:
1. Clear browser cache and localStorage
2. Sign out completely
3. Sign in again
4. Check console for detailed auth logs
5. Verify the Firestore index is created (from previous fix)

Both auth sync and Firestore index fixes need to be in place for workflows to load properly!
