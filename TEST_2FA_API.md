# Testing 2FA API Endpoints

## Issue: "Method Not Allowed" Error

If you see `{"detail":"Method Not Allowed"}`, you're using the **wrong HTTP method**.

All 2FA endpoints require **POST** method (except status check which is GET).

---

## How to Test 2FA Endpoints

### Option 1: Using Browser (GET endpoints only)

**Only works for GET endpoints:**
```
http://localhost:8000/api/v1/two-factor/status
```

**Won't work for POST endpoints** (you'll get "Method Not Allowed"):
```
http://localhost:8000/api/v1/two-factor/enable  ❌
```

---

### Option 2: Using FastAPI Docs (Recommended)

1. Start backend: `python run.py` in `backend/` directory
2. Open browser: `http://localhost:8000/docs`
3. Find **"Two-Factor Authentication"** section
4. Click on endpoint (e.g., `POST /api/v1/two-factor/enable`)
5. Click **"Try it out"**
6. Click **"Authorize"** button (top right) → Enter your Firebase token
7. Fill in request body
8. Click **"Execute"**

---

### Option 3: Using curl (Command Line)

#### 1. Get Your Firebase Token

First, sign in to your app and get the Firebase ID token from browser console:
```javascript
// In browser console (after signing in)
const { auth } = await import('./lib/firebase');
const token = await auth.currentUser.getIdToken();
console.log(token);
```

#### 2. Enable 2FA
```bash
curl -X POST "http://localhost:8000/api/v1/two-factor/enable" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"method": "email"}'
```

#### 3. Disable 2FA
```bash
curl -X POST "http://localhost:8000/api/v1/two-factor/disable" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

#### 4. Check 2FA Status
```bash
curl -X GET "http://localhost:8000/api/v1/two-factor/status" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN_HERE"
```

#### 5. Send OTP
```bash
curl -X POST "http://localhost:8000/api/v1/two-factor/send-otp" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

#### 6. Verify OTP
```bash
curl -X POST "http://localhost:8000/api/v1/two-factor/verify-otp" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"otp": "123456"}'
```

---

### Option 4: Using Postman/Thunder Client

1. **Method**: POST
2. **URL**: `http://localhost:8000/api/v1/two-factor/enable`
3. **Headers**:
   ```
   Authorization: Bearer YOUR_FIREBASE_TOKEN
   Content-Type: application/json
   ```
4. **Body** (raw JSON):
   ```json
   {
     "method": "email"
   }
   ```

---

## Quick Test Checklist

### ✅ Test Enable 2FA
```bash
POST http://localhost:8000/api/v1/two-factor/enable
Headers: Authorization: Bearer <token>
Body: {"method": "email"}
```

### ✅ Test Check Status
```bash
GET http://localhost:8000/api/v1/two-factor/status
Headers: Authorization: Bearer <token>
```

### ✅ Test Send OTP
```bash
POST http://localhost:8000/api/v1/two-factor/send-otp
Headers: Authorization: Bearer <token>
```

### ✅ Test Verify OTP
```bash
POST http://localhost:8000/api/v1/two-factor/verify-otp
Headers: Authorization: Bearer <token>
Body: {"otp": "123456"}
```

### ✅ Test Disable 2FA
```bash
POST http://localhost:8000/api/v1/two-factor/disable
Headers: Authorization: Bearer <token>
```

---

## Common Errors

### "Method Not Allowed"
- **Cause**: Using GET instead of POST
- **Fix**: Use POST method (or use FastAPI docs at `/docs`)

### "401 Unauthorized"
- **Cause**: Missing or invalid Firebase token
- **Fix**: Get fresh token from browser console after signing in

### "Connection Refused"
- **Cause**: Backend not running
- **Fix**: Start backend with `python run.py` in `backend/` directory

### "User not found"
- **Cause**: User document doesn't exist in Firestore
- **Fix**: Sign up first to create user document

---

## Testing from Frontend (Recommended)

The easiest way is to use the frontend service:

```typescript
import { twoFactorService } from '@/lib/api/services/twoFactorService';

// Enable 2FA
await twoFactorService.enable('email');

// Check status
const status = await twoFactorService.getStatus();

// Send OTP
await twoFactorService.sendOTP();

// Verify OTP
await twoFactorService.verifyOTP('123456');
```

This automatically handles:
- ✅ Authentication tokens
- ✅ Correct HTTP methods
- ✅ Error handling
- ✅ Type safety

---

## Verify Endpoint is Registered

Check if endpoint exists:
```bash
# Should show all available endpoints
curl http://localhost:8000/docs
```

Or visit: `http://localhost:8000/docs` in browser and look for "Two-Factor Authentication" section.

