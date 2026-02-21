# Debugging 2FA Authentication Issues

## Error: 401 Unauthorized - "Not authenticated"

This means the **Firebase authentication token is missing or invalid**.

---

## Quick Fixes

### 1. **Make Sure You're Signed In**

The 2FA endpoints require you to be **signed in** to your app first.

**Steps:**
1. Go to your app: `http://localhost:3000`
2. Sign in with your email/password
3. **Then** try to enable 2FA

---

### 2. **Check Browser Console**

Open browser DevTools (F12) → Console tab and check:

```javascript
// Check if user is signed in
const { auth } = await import('./lib/firebase');
console.log('Current user:', auth.currentUser);
console.log('User email:', auth.currentUser?.email);

// Get token
const token = await auth.currentUser?.getIdToken();
console.log('Token exists:', !!token);
```

**If `auth.currentUser` is `null`**, you need to sign in first.

---

### 3. **Test from Frontend Code**

Create a test button in your settings page:

```typescript
import { twoFactorService } from '@/lib/api/services/twoFactorService';
import { useAuth } from '@/lib/AuthContext';

function Test2FA() {
  const { user } = useAuth();
  
  const handleEnable = async () => {
    if (!user) {
      alert('Please sign in first!');
      return;
    }
    
    try {
      const result = await twoFactorService.enable('email');
      console.log('Success:', result);
      alert('2FA enabled!');
    } catch (error: any) {
      console.error('Error:', error);
      alert('Error: ' + error.message);
    }
  };
  
  return (
    <button onClick={handleEnable}>
      Enable 2FA
    </button>
  );
}
```

---

### 4. **Verify API Client is Adding Token**

Add debug logging to see if token is being sent:

**Temporarily add to `lib/api/client.ts`:**

```typescript
// In the request interceptor, add:
if (process.env.NEXT_PUBLIC_DEBUG_TOKENS === 'true') {
  console.log('[API Client] Request:', {
    url: config.url,
    hasAuth: !!(config.headers as any).Authorization,
    user: auth?.currentUser?.email
  });
}
```

Then in `.env.local`:
```env
NEXT_PUBLIC_DEBUG_TOKENS=true
```

---

### 5. **Test with FastAPI Docs (Easiest)**

1. **Sign in to your app** first (so you have a valid token)
2. Open browser console and get token:
   ```javascript
   const { auth } = await import('./lib/firebase');
   const token = await auth.currentUser.getIdToken();
   console.log('Copy this token:', token);
   ```
3. Open `http://localhost:8000/docs`
4. Click **"Authorize"** button (top right)
5. Paste your Firebase token
6. Click **"Authorize"**
7. Now test the endpoints

---

## Common Causes

### Cause 1: Not Signed In
**Symptom**: `auth.currentUser` is `null`
**Fix**: Sign in to your app first

### Cause 2: Token Expired
**Symptom**: Token exists but backend rejects it
**Fix**: The API client should auto-refresh, but try signing out and back in

### Cause 3: Backend Can't Verify Token
**Symptom**: Token sent but backend returns 401
**Fix**: Check backend Firebase credentials in `backend/.env`

### Cause 4: CORS Issues
**Symptom**: Request fails before reaching backend
**Fix**: Check backend CORS settings allow `http://localhost:3000`

---

## Step-by-Step Debugging

### Step 1: Verify User is Signed In
```javascript
// In browser console
import('@/lib/firebase').then(({ auth }) => {
  console.log('User:', auth.currentUser?.email);
});
```

### Step 2: Get Token Manually
```javascript
// In browser console
import('@/lib/firebase').then(async ({ auth }) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken(true); // Force refresh
    console.log('Token:', token.substring(0, 20) + '...');
  } else {
    console.log('No user signed in!');
  }
});
```

### Step 3: Test Endpoint with Token
```bash
# Replace YOUR_TOKEN with token from Step 2
curl -X POST "http://localhost:8000/api/v1/two-factor/enable" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"method": "email"}'
```

### Step 4: Check Backend Logs
Look at your backend terminal for:
- Token verification errors
- Firebase connection issues
- User not found errors

---

## Expected Flow

1. ✅ User signs in → Firebase creates session
2. ✅ Frontend gets Firebase ID token
3. ✅ API client automatically adds token to requests
4. ✅ Backend verifies token with Firebase Admin SDK
5. ✅ Backend processes request

**If any step fails, you'll get 401.**

---

## Quick Test Script

Add this to a React component to test:

```typescript
const test2FA = async () => {
  const { auth } = await import('@/lib/firebase');
  const user = auth.currentUser;
  
  if (!user) {
    alert('❌ Not signed in!');
    return;
  }
  
  try {
    const token = await user.getIdToken();
    console.log('✅ Token obtained:', token.substring(0, 20) + '...');
    
    const status = await twoFactorService.getStatus();
    console.log('✅ 2FA Status:', status);
    
    alert('✅ Authentication working!');
  } catch (error: any) {
    console.error('❌ Error:', error);
    alert('❌ Error: ' + error.message);
  }
};
```

---

## Still Not Working?

1. **Check backend is running**: `http://localhost:8000/docs` should load
2. **Check Firebase credentials** in `backend/.env`
3. **Check browser console** for any errors
4. **Check backend logs** for authentication errors
5. **Try signing out and back in** to refresh token

