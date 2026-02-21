# Quick Guide: Enable 2FA for Your Account

## The Issue
`twoFactorEnabled` is `false` in your Firestore database. Here's how to enable it.

## Method 1: Via Backend API (Recommended)

### Step 1: Sign in to your app
1. Go to `http://localhost:3000/sign-in`
2. Sign in with your email/password

### Step 2: Get your Firebase token
Open browser console (F12) and run:
```javascript
import('@/lib/firebase').then(async ({ auth }) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    console.log('Token:', token);
    // Copy this token
  }
});
```

### Step 3: Enable 2FA via API
**Option A: Using FastAPI Docs**
1. Go to `http://localhost:8000/docs`
2. Find `POST /api/v1/two-factor/enable`
3. Click "Try it out"
4. Click "Authorize" button
5. Enter: `Bearer <your-token>` (from Step 2)
6. Click "Execute"
7. Should return: `{"success": true, "message": "Two-factor authentication enabled successfully"}`

**Option B: Using curl**
```bash
curl -X POST "http://localhost:8000/api/v1/two-factor/enable" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"method": "email"}'
```

---

## Method 2: Directly in Firestore Console

### Step 1: Open Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `nexagent-90391`
3. Go to **Firestore Database**

### Step 2: Find Your User Document
1. Click on `users` collection
2. Find your user document (by UID or email)
3. Click on the document

### Step 3: Update Security Field
1. Find the `security` field
2. Click the edit icon (pencil)
3. Update:
   ```json
   {
     "twoFactorEnabled": true,
     "twoFactorMethod": "email"
   }
   ```
4. Click "Update"

---

## Method 3: Using Python Script

Create a file `enable_2fa.py` in your backend directory:

```python
import asyncio
from app.services.firebase_service import firebase_service
from firebase_admin import firestore

async def enable_2fa_for_user(email: str):
    """Enable 2FA for a user by email"""
    user = await firebase_service.get_user_by_email(email)
    if not user:
        print(f"User {email} not found")
        return
    
    uid = user['uid']
    db = firebase_service.db
    user_ref = db.collection('users').document(uid)
    
    user_ref.update({
        'security.twoFactorEnabled': True,
        'security.twoFactorMethod': 'email',
        'updatedAt': firestore.SERVER_TIMESTAMP
    })
    
    print(f"✅ 2FA enabled for {email} (UID: {uid})")

# Run it
if __name__ == "__main__":
    import sys
    email = sys.argv[1] if len(sys.argv) > 1 else input("Enter email: ")
    asyncio.run(enable_2fa_for_user(email))
```

Run it:
```bash
cd backend
python enable_2fa.py your-email@example.com
```

---

## Verify 2FA is Enabled

### Check in Firestore
1. Go to Firebase Console → Firestore
2. Check `users/{your-uid}/security/twoFactorEnabled` = `true`

### Test Login Flow
1. Logout from your app
2. Sign in with email/password
3. **Expected**: Should redirect to `/verify-otp` page
4. Check your email for OTP code
5. Enter OTP and verify

---

## Troubleshooting

### Issue: "2FA is not enabled" error
**Fix**: Make sure `security.twoFactorEnabled` is `true` in Firestore

### Issue: Still logging in without OTP
**Fix**: 
1. Check browser console for "2FA status" logs
2. Verify backend is running
3. Check `check-account-status` endpoint is working

### Issue: Can't find user in Firestore
**Fix**: User document might not exist. Sign up again or check Firebase Auth users.

---

## Next Steps

After enabling 2FA:
1. ✅ Test login flow (should ask for OTP)
2. ✅ Test OTP verification
3. ✅ Test resend OTP
4. ✅ Add UI in settings page to enable/disable 2FA (Task #6)

---

## Summary

**Quickest Method**: Use Firestore Console to manually set `security.twoFactorEnabled = true`

**Best Method**: Use the backend API endpoint (Method 1) - it's the proper way and logs the action

Once enabled, your login flow will require OTP verification! 🔐

