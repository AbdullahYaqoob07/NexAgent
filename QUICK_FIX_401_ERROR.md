# Quick Fix: 401 "Not authenticated" Error

## The Problem

You're getting `{"success": false, "message": "Not authenticated", "error": "HTTP_EXCEPTION", "status_code": 401}` when trying to enable 2FA.

**This means the Firebase authentication token is missing from your request.**

---

## Solution: Make Sure You're Signed In

### ✅ Correct Way (From Your App)

1. **Sign in to your app first:**
   - Go to `http://localhost:3000/sign-in`
   - Enter your email and password
   - Click "Sign In"

2. **Then enable 2FA:**
   - The API client will automatically add your Firebase token
   - All requests will be authenticated

### ❌ Wrong Way (Direct API Call)

If you're testing directly via:
- Browser address bar (GET request)
- curl without token
- Postman without Authorization header

You'll get 401 because there's no token.

---

## How to Test Properly

### Option 1: Use FastAPI Docs (Recommended)

1. **Sign in to your app** (`http://localhost:3000/sign-in`)

2. **Get your Firebase token** (browser console):
   ```javascript
   // Open browser console (F12)
   const { auth } = await import('./lib/firebase');
   const token = await auth.currentUser.getIdToken();
   console.log('Copy this token:', token);
   ```

3. **Open API docs**: `http://localhost:8000/docs`

4. **Authorize:**
   - Click **"Authorize"** button (top right, lock icon)
   - Paste your Firebase token
   - Click **"Authorize"**
   - Click **"Close"**

5. **Test endpoint:**
   - Find `POST /api/v1/two-factor/enable`
   - Click **"Try it out"**
   - Enter body: `{"method": "email"}`
   - Click **"Execute"**

---

### Option 2: Use Frontend Code

Create a test component or add to settings page:

```typescript
'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { twoFactorService } from '@/lib/api/services/twoFactorService';

export function Enable2FAButton() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleEnable = async () => {
    if (!user) {
      setMessage('❌ Please sign in first!');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await twoFactorService.enable('email');
      setMessage('✅ ' + result.message);
    } catch (error: any) {
      setMessage('❌ Error: ' + (error.message || 'Failed to enable 2FA'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button 
        onClick={handleEnable} 
        disabled={loading || !user}
        className="px-4 py-2 bg-[#FF6900] text-white rounded"
      >
        {loading ? 'Enabling...' : 'Enable 2FA'}
      </button>
      {message && <p>{message}</p>}
    </div>
  );
}
```

---

### Option 3: Use curl with Token

1. **Get token** (from browser console after signing in):
   ```javascript
   const { auth } = await import('./lib/firebase');
   const token = await auth.currentUser.getIdToken();
   console.log(token);
   ```

2. **Use in curl:**
   ```bash
   curl -X POST "http://localhost:8000/api/v1/two-factor/enable" \
     -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     -H "Content-Type: application/json" \
     -d "{\"method\": \"email\"}"
   ```

---

## Verify Authentication is Working

### Check 1: Are you signed in?
```javascript
// Browser console
import('@/lib/firebase').then(({ auth }) => {
  console.log('Signed in:', !!auth.currentUser);
  console.log('Email:', auth.currentUser?.email);
});
```

### Check 2: Can you get a token?
```javascript
// Browser console
import('@/lib/firebase').then(async ({ auth }) => {
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    console.log('Token length:', token.length);
    console.log('Token preview:', token.substring(0, 20) + '...');
  } else {
    console.log('❌ No user signed in!');
  }
});
```

### Check 3: Test a simple authenticated endpoint
```javascript
// Browser console (after signing in)
const { twoFactorService } = await import('@/lib/api/services/twoFactorService');
try {
  const status = await twoFactorService.getStatus();
  console.log('✅ Auth working!', status);
} catch (error) {
  console.error('❌ Auth failed:', error);
}
```

---

## Common Mistakes

### ❌ Mistake 1: Testing before signing in
**Fix**: Always sign in to your app first

### ❌ Mistake 2: Using browser address bar
**Fix**: Use FastAPI docs (`/docs`) or frontend code

### ❌ Mistake 3: Token expired
**Fix**: Sign out and sign back in to refresh token

### ❌ Mistake 4: Backend not running
**Fix**: Start backend with `python run.py` in `backend/` directory

---

## Expected Success Response

When working correctly, you should get:

```json
{
  "success": true,
  "message": "Two-factor authentication enabled successfully"
}
```

---

## Still Getting 401?

1. ✅ **Verify you're signed in** (check browser console)
2. ✅ **Check backend is running** (`http://localhost:8000/docs`)
3. ✅ **Check backend Firebase credentials** in `backend/.env`
4. ✅ **Try signing out and back in** to refresh token
5. ✅ **Check browser console** for any errors
6. ✅ **Check backend logs** for authentication errors

See `DEBUG_2FA_AUTH.md` for more detailed debugging steps.

