# Backend API Integration Guide

## Overview

Your Next.js frontend now integrates with the FastAPI backend hosted on Railway. The integration uses:
- **Firebase Auth** for user authentication (sign-up, sign-in, Google OAuth)
- **Backend API** for session management and API operations

## 🎯 What's Been Set Up

### 1. Environment Configuration ✅
- Backend API URL: `https://nexagent-backend-production.up.railway.app`
- Already configured in `.env.local`

### 2. API Client ✅
**Location:** `lib/api/client.ts`
- Axios-based HTTP client
- Automatic token injection in headers
- Error handling and 401 redirects
- Token stored in localStorage as `backend_auth_token`

### 3. TypeScript Types ✅
**Location:** `lib/api/types/auth.ts`
- Request/response types matching backend schemas
- Type-safe API calls

### 4. Auth Service ✅
**Location:** `lib/api/services/authService.ts`
- All 6 backend auth endpoints integrated:
  - `POST /api/v1/auth/signup` - Create account
  - `POST /api/v1/auth/signin` - Sign in
  - `POST /api/v1/auth/forgot-password` - Reset password
  - `POST /api/v1/auth/verify-token` - Verify Firebase token
  - `GET /api/v1/auth/me` - Get current user
  - `POST /api/v1/auth/logout` - Logout

### 5. Backend Auth Context ✅
**Location:** `lib/contexts/BackendAuthContext.tsx`
- React context for backend auth state
- Auto-syncs with Firebase authentication
- Automatically verifies Firebase tokens with backend
- Manages session tokens

### 6. Combined Auth Hook ✅
**Location:** `lib/hooks/useCombinedAuth.ts`
- Unified interface for both Firebase and backend auth
- Easy to use in any component

### 7. Root Layout Integration ✅
**Location:** `app/layout.tsx`
- `BackendAuthProvider` added alongside `AuthProvider`
- Automatic token synchronization

## 🚀 How to Use

### Method 1: Using Backend Auth Context (Recommended)

```typescript
'use client';

import { useBackendAuth } from '@/lib/contexts/BackendAuthContext';

export default function MyComponent() {
  const { user, isAuthenticated, loading } = useBackendAuth();

  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please sign in</div>;

  return <div>Welcome, {user?.email}</div>;
}
```

### Method 2: Using Combined Auth Hook

```typescript
'use client';

import { useCombinedAuth } from '@/lib/hooks/useCombinedAuth';

export default function MyComponent() {
  const { 
    user,              // Backend user (preferred) or Firebase user
    firebaseUser,      // Firebase user data
    backendUser,       // Backend user data
    isAuthenticated,   // Combined auth status
    signOut,           // Logs out from both systems
  } = useCombinedAuth();

  return (
    <div>
      <p>Email: {user?.email}</p>
      <button onClick={signOut}>Logout</button>
    </div>
  );
}
```

### Method 3: Direct API Service Calls

```typescript
import { authService } from '@/lib/api/services/authService';

// Example: Get current user from backend
const user = await authService.getCurrentUser();

// Example: Logout
await authService.logout();
```

## 🔄 Authentication Flow

```
1. User signs in with Firebase (email/password or Google)
   ↓
2. Firebase generates ID token
   ↓
3. BackendAuthContext automatically sends token to:
   POST /api/v1/auth/verify-token
   ↓
4. Backend verifies Firebase token with Firebase Admin SDK
   ↓
5. Backend creates session (1 week validity)
   ↓
6. Backend returns session token
   ↓
7. Session token stored in localStorage
   ↓
8. All API calls automatically include session token
```

## 📍 Test the Integration

Visit: `http://localhost:3000/api-test`

This page shows:
- Firebase auth status
- Backend session status
- Token synchronization
- Integration diagnostics

## 🔧 Making Backend API Calls

### Example: Protected API Endpoint

```typescript
import apiClient from '@/lib/api/client';

// The session token is automatically added to headers
const response = await apiClient.get('/api/v1/workflows');
```

### Example: With Error Handling

```typescript
import { authService } from '@/lib/api/services/authService';
import type { ApiError } from '@/lib/api/types/auth';

try {
  const user = await authService.getCurrentUser();
  console.log('User:', user);
} catch (error) {
  const apiError = error as ApiError;
  console.error(`Error ${apiError.status}: ${apiError.message}`);
}
```

## 🎨 Update Existing Pages

Your existing auth pages (`sign-in`, `sign-up`) use Firebase.  
The backend integration works automatically - no changes needed!

When a user signs in with Firebase:
1. Firebase creates the user session
2. `BackendAuthContext` detects the Firebase user
3. Automatically calls backend `/verify-token`
4. Backend session is established
5. User can make API calls to backend

## 📦 Available Endpoints

All backend auth endpoints are ready to use:

| Endpoint | Method | Service Function |
|----------|--------|------------------|
| `/api/v1/auth/signup` | POST | `authService.signUp()` |
| `/api/v1/auth/signin` | POST | `authService.signIn()` |
| `/api/v1/auth/forgot-password` | POST | `authService.forgotPassword()` |
| `/api/v1/auth/verify-token` | POST | `authService.verifyToken()` |
| `/api/v1/auth/me` | GET | `authService.getCurrentUser()` |
| `/api/v1/auth/logout` | POST | `authService.logout()` |

## 🔐 Token Management

Tokens are managed automatically:
- **Firebase Token:** Managed by Firebase SDK
- **Backend Session Token:** Stored in `localStorage` as `backend_auth_token`
- **Auto-refresh:** Firebase token auto-refreshes, backend session lasts 1 week
- **Auto-cleanup:** Both tokens cleared on logout or 401 errors

## ✅ Testing Checklist

1. **Test Authentication Flow**
   ```bash
   npm run dev
   # Visit http://localhost:3000/sign-in
   # Sign in with existing account
   # Check http://localhost:3000/api-test
   ```

2. **Verify Backend Connection**
   - Check browser console for any errors
   - Look for "Backend session" status on test page
   - Verify Firebase and backend tokens are synced

3. **Test API Calls**
   ```typescript
   // In any component
   import { authService } from '@/lib/api/services/authService';
   
   const user = await authService.getCurrentUser();
   console.log('Backend user:', user);
   ```

## 🛠️ Troubleshooting

### Issue: Backend session not created
**Solution:** Check browser console for errors. Verify `NEXT_PUBLIC_BACKEND_API_URL` in `.env.local`

### Issue: 401 Unauthorized errors
**Solution:** 
1. Check if Firebase user is signed in
2. Clear localStorage and sign in again
3. Verify backend is running on Railway

### Issue: CORS errors
**Solution:** Backend CORS is configured for `http://localhost:3000` - ensure you're running on that port

## 📚 Next Steps

1. ✅ Test the integration at `/api-test`
2. ✅ Try signing in and check both auth states
3. ✅ Start making backend API calls in your workflows
4. ✅ Add more backend endpoints as needed

## 🔗 Backend API Documentation

Visit: https://nexagent-backend-production.up.railway.app/docs

This shows all available endpoints in the FastAPI backend.
