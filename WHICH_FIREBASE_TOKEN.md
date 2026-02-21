# Which Firebase Token to Use for Authorization

## Answer: Firebase ID Token (JWT)

Use the **Firebase ID Token** (also called ID token or JWT token) in the Authorization header.

**Format:**
```
Authorization: Bearer <firebase-id-token>
```

---

## How to Get the Token

### Method 1: Browser Console (Easiest) ✅

1. **Sign in to your app** at `http://localhost:3000/sign-in`

2. **Open browser console** (F12 → Console tab)

3. **Run this code:**
```javascript
import('@/lib/firebase').then(async ({ auth }) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken(true); // Force refresh
    console.log('✅ Firebase ID Token:');
    console.log(token);
    console.log('\n📋 Copy this token and use it in Authorization header');
  } else {
    console.log('❌ No user signed in! Please sign in first.');
  }
});
```

4. **Copy the token** from the console output

---

### Method 2: Check localStorage

Sometimes the token is stored in localStorage:

```javascript
// In browser console
const token = localStorage.getItem('backend_auth_token');
console.log('Token:', token);
```

**Note:** This might not always be available, so Method 1 is more reliable.

---

## Using the Token

### In FastAPI Docs (`http://localhost:8000/docs`)

1. Click the **"Authorize"** button (top right, 🔒 icon)
2. In the "Value" field, enter: `Bearer YOUR_TOKEN_HERE`
   - **Important:** Include the word "Bearer" followed by a space, then your token
3. Click **"Authorize"**
4. Now all API calls will include the token automatically

**Example:**
```
Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2ODk5NzY4NzM...
```

---

### In curl

```bash
curl -X POST "http://localhost:8000/api/v1/two-factor/enable" \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"method": "email"}'
```

**Replace `YOUR_FIREBASE_ID_TOKEN_HERE` with the actual token from Method 1.**

---

### In Postman/Thunder Client

1. Go to **Headers** tab
2. Add header:
   - **Key**: `Authorization`
   - **Value**: `Bearer YOUR_FIREBASE_ID_TOKEN_HERE`

---

## Token Details

### What is it?
- **Type**: Firebase ID Token (JWT - JSON Web Token)
- **Purpose**: Proves the user is authenticated with Firebase
- **Format**: `eyJhbGciOiJSUzI1NiIsImtpZCI6...` (starts with "eyJ")
- **Length**: Usually 800-1200 characters
- **Expires**: After 1 hour (Firebase automatically refreshes it)

### What it contains:
- User UID
- Email
- Email verification status
- Custom claims (if any)
- Expiration time

---

## Important Notes

### ✅ DO:
- Use `Bearer <token>` format (include "Bearer" prefix)
- Get a fresh token if it expires (tokens expire after ~1 hour)
- Sign in to your app first before getting the token

### ❌ DON'T:
- Use access tokens or refresh tokens (wrong type)
- Use session tokens (different purpose)
- Forget the "Bearer " prefix
- Use expired tokens

---

## Automatic Token Handling

**Good news!** Your app automatically handles tokens:

1. **Frontend API calls** - The `apiClient` automatically adds the token to all requests
2. **Token refresh** - Tokens are automatically refreshed when needed
3. **Storage** - Token is stored in localStorage as `backend_auth_token`

**You only need to manually get the token for:**
- Testing APIs in FastAPI docs
- Using curl/Postman
- Debugging

---

## Quick Test

After getting your token, test it:

```bash
# Test if token works
curl -X GET "http://localhost:8000/api/v1/two-factor/status" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected:** Should return your 2FA status (not 401 error)

---

## Troubleshooting

### "401 Unauthorized" error
**Possible causes:**
1. Token expired → Get a fresh token (`getIdToken(true)`)
2. Missing "Bearer " prefix → Use `Bearer <token>`
3. Token not copied completely → Token is long, make sure you copied it all
4. User not signed in → Sign in first

### "Invalid token" error
**Fix:**
1. Make sure you're signed in
2. Get a fresh token: `getIdToken(true)` (force refresh)
3. Check backend Firebase credentials are correct

### Token looks weird
**Normal token format:**
- Starts with `eyJ` (base64 encoded JSON)
- Very long (800-1200 characters)
- Three parts separated by dots: `header.payload.signature`

---

## Summary

**Use:** Firebase ID Token (from `auth.currentUser.getIdToken()`)

**Format:** `Authorization: Bearer <firebase-id-token>`

**Get it:** Browser console → `auth.currentUser.getIdToken()`

**Auto-handled:** Your app automatically adds it to API calls, so you only need it manually for testing!

