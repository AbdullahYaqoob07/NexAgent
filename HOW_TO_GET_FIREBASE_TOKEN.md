# How to Get Your Firebase Authentication Token

## Quick Method (Browser Console)

### Step 1: Sign In to Your App
1. Go to `http://localhost:3000/sign-in`
2. Enter your email and password
3. Click "Sign In"
4. Wait until you're redirected to the dashboard

### Step 2: Open Browser Console
1. Press **F12** (or right-click → Inspect)
2. Go to the **Console** tab

### Step 3: Get Your Token
Copy and paste this code into the console:

```javascript
(async () => {
  const { auth } = await import('/lib/firebase.js');
  const user = auth.currentUser;
  
  if (!user) {
    console.log('❌ No user signed in! Please sign in first.');
    return;
  }
  
  try {
    const token = await user.getIdToken(true); // Force refresh
    console.log('✅ Firebase Token:');
    console.log(token);
    console.log('\n📋 Token copied above - use this in API requests');
  } catch (error) {
    console.error('❌ Error getting token:', error);
  }
})();
```

**Or use this simpler version:**

```javascript
import('/lib/firebase.js').then(async ({ auth }) => {
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    console.log('Token:', token);
    // Copy the token from console
  } else {
    console.log('Not signed in!');
  }
});
```

---

## Alternative: Using localStorage (If Available)

Sometimes the token is stored in localStorage:

```javascript
// In browser console
const token = localStorage.getItem('backend_auth_token');
console.log('Token from localStorage:', token);
```

**Note:** This might not always be available, so the method above is more reliable.

---

## Method 2: Add Debug Button to Your App

Temporarily add this to any page for easy token access:

```typescript
'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';

export function TokenDisplay() {
  const { user } = useAuth();
  const [token, setToken] = useState<string>('');

  const getToken = async () => {
    if (!user) {
      alert('Please sign in first!');
      return;
    }

    try {
      const { auth } = await import('@/lib/firebase');
      const currentUser = auth.currentUser;
      if (currentUser) {
        const idToken = await currentUser.getIdToken(true);
        setToken(idToken);
        // Copy to clipboard
        await navigator.clipboard.writeText(idToken);
        alert('Token copied to clipboard!');
      }
    } catch (error) {
      console.error('Error getting token:', error);
      alert('Failed to get token');
    }
  };

  if (!user) {
    return <p>Please sign in to get token</p>;
  }

  return (
    <div className="p-4">
      <button 
        onClick={getToken}
        className="px-4 py-2 bg-[#FF6900] text-white rounded"
      >
        Get Firebase Token
      </button>
      {token && (
        <div className="mt-4">
          <p className="text-sm text-white/70 mb-2">Token:</p>
          <textarea 
            value={token} 
            readOnly 
            className="w-full p-2 bg-black/40 text-white text-xs rounded"
            rows={3}
          />
        </div>
      )}
    </div>
  );
}
```

---

## Method 3: Using Network Tab

1. Open DevTools (F12)
2. Go to **Network** tab
3. Sign in to your app
4. Look for requests to `/api/v1/...`
5. Click on any request
6. Go to **Headers** tab
7. Look for `Authorization: Bearer ...`
8. Copy the token after "Bearer "

---

## Method 4: Programmatic Access (For Testing)

Add this to your component:

```typescript
import { useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';

export function MyComponent() {
  const { user } = useAuth();

  useEffect(() => {
    const getToken = async () => {
      if (user) {
        const { auth } = await import('@/lib/firebase');
        const currentUser = auth.currentUser;
        if (currentUser) {
          const token = await currentUser.getIdToken();
          console.log('Current token:', token);
          // Use token for API calls
        }
      }
    };
    
    getToken();
  }, [user]);

  return <div>...</div>;
}
```

---

## Using the Token

### In FastAPI Docs
1. Go to `http://localhost:8000/docs`
2. Click **"Authorize"** button (top right)
3. Paste your token
4. Click **"Authorize"**

### In curl
```bash
curl -X POST "http://localhost:8000/api/v1/two-factor/enable" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"method": "email"}'
```

### In Postman/Thunder Client
- **Header Name**: `Authorization`
- **Header Value**: `Bearer YOUR_TOKEN_HERE`

---

## Token Details

- **Type**: Firebase ID Token (JWT)
- **Length**: ~800-1200 characters
- **Expires**: Usually 1 hour
- **Format**: `eyJhbGciOiJSUzI1NiIsImtpZCI6...` (starts with "eyJ")

---

## Troubleshooting

### "No user signed in"
**Fix**: Sign in to your app first at `http://localhost:3000/sign-in`

### "Cannot read property 'getIdToken'"
**Fix**: Make sure `auth.currentUser` is not null

### Token is expired
**Fix**: Get a fresh token by calling `getIdToken(true)` (force refresh)

### Token doesn't work
**Fix**: 
1. Make sure you copied the entire token (it's long!)
2. Make sure you include "Bearer " prefix: `Bearer YOUR_TOKEN`
3. Check backend Firebase credentials are correct

---

## Quick Copy-Paste Script

**For Chrome/Edge/Firefox Console:**

```javascript
(async () => {
  try {
    const { auth } = await import('/lib/firebase.js');
    if (!auth.currentUser) {
      console.log('❌ Please sign in first!');
      return;
    }
    const token = await auth.currentUser.getIdToken(true);
    console.log('✅ TOKEN (copy this):');
    console.log(token);
    console.log('\n📋 Length:', token.length, 'characters');
    
    // Try to copy to clipboard
    try {
      await navigator.clipboard.writeText(token);
      console.log('✅ Token copied to clipboard!');
    } catch {
      console.log('⚠️ Could not auto-copy. Please copy manually from above.');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
```

---

## Security Note

⚠️ **Important**: 
- Tokens are sensitive - don't share them
- Tokens expire after ~1 hour
- Each token is unique to your session
- Never commit tokens to Git

---

## Next Steps

Once you have the token:
1. Use it in FastAPI docs (`/docs`) → Click "Authorize"
2. Or use it in curl/Postman with `Authorization: Bearer TOKEN`
3. Or just use the frontend service (it handles tokens automatically)

