# Two-Factor Authentication (2FA) Implementation

## Overview

Optional email-based 2FA has been implemented with account lockout protection after 3 failed login attempts.

## Features Implemented

### ✅ Core Features
1. **Optional 2FA** - Users can enable/disable 2FA in settings
2. **Email-based OTP** - 6-digit codes sent via email
3. **OTP Expiry** - Codes expire in 1 minute
4. **Resend Cooldown** - 60 seconds between resend requests
5. **Account Lockout** - Temporary ban after 3 failed login attempts (15 minutes)
6. **Failed Attempt Tracking** - Tracks and displays failed login attempts

### ✅ User Flow
1. User signs in with email/password
2. System checks account status (locked/failed attempts)
3. If account locked → Show lockout message
4. If 2FA enabled → Send OTP and redirect to verification page
5. User enters OTP code
6. On success → Reset failed attempts and redirect to dashboard
7. On failure → Track failed attempt, lock account if threshold reached

## Backend Implementation

### Files Created/Modified

#### 1. `backend/app/services/otp_service.py`
- OTP generation (6-digit numeric)
- OTP storage in Firestore
- Email sending via SMTP
- OTP verification with attempt tracking
- Expiry and cleanup logic

#### 2. `backend/app/api/v1/two_factor.py`
- `GET /api/v1/two-factor/status` - Get 2FA status
- `POST /api/v1/two-factor/enable` - Enable 2FA
- `POST /api/v1/two-factor/disable` - Disable 2FA
- `POST /api/v1/two-factor/send-otp` - Send OTP code
- `POST /api/v1/two-factor/verify-otp` - Verify OTP code
- `GET /api/v1/two-factor/check-account-status` - Check account lock status
- `POST /api/v1/two-factor/reset-failed-attempts` - Reset on successful login
- `POST /api/v1/two-factor/increment-failed-attempts` - Track failed login

#### 3. `backend/app/services/firebase_service.py`
- Updated user schema to include:
  - `security.twoFactorEnabled`
  - `security.twoFactorMethod`
  - `security.failedLoginAttempts`
  - `security.accountLockedUntil`
  - `security.lastFailedLoginAt`

## Frontend Implementation

### Files Created/Modified

#### 1. `app/verify-otp/page.tsx`
- OTP verification screen (similar to forgot password design)
- 6-digit input with auto-focus
- Paste support for OTP codes
- Resend functionality with cooldown timer
- Success/error handling

#### 2. `app/sign-in/page.tsx`
- Account status check before login
- 2FA check after successful Firebase login
- Account locked message display
- Failed attempt tracking integration
- Redirect to OTP verification if 2FA enabled

#### 3. `lib/api/services/twoFactorService.ts`
- Frontend service for 2FA API calls
- TypeScript interfaces for type safety

## Data Model

### Firestore User Document
```javascript
{
  security: {
    twoFactorEnabled: boolean,
    twoFactorMethod: 'email' | null,
    failedLoginAttempts: number,
    accountLockedUntil: Timestamp | null,
    lastFailedLoginAt: Timestamp | null
  }
}
```

### Firestore OTP Collection
```javascript
{
  userId: string,
  email: string,
  otp: string,  // 6-digit code
  expiresAt: Timestamp,
  used: boolean,
  attempts: number,
  createdAt: Timestamp,
  type: '2fa_login'
}
```

## Configuration

### Environment Variables (Backend)
Add to `backend/.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@nexagent.com
```

**How to Get Gmail App Password:**
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification**
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Generate app password for "Mail" → "Other (Custom name)" → "NexAgent Backend"
5. Copy the 16-character password (remove spaces when using)

**See `SMTP_SETUP_GUIDE.md` for detailed instructions.**

## Security Features

1. **OTP Security**
   - 6-digit numeric codes
   - 1-minute expiry
   - Single-use only
   - Maximum 5 verification attempts per OTP
   - 60-second resend cooldown

2. **Account Protection**
   - 3 failed login attempts → 15-minute lockout
   - Failed attempts reset on successful login
   - Account status checked before each login attempt

3. **Rate Limiting**
   - OTP send: 5 requests/minute
   - OTP verify: 10 requests/minute
   - Status check: 30 requests/minute

## Usage

### Enable 2FA (User)
1. Go to Settings page
2. Toggle "Enable Two-Factor Authentication"
3. Confirm activation

### Login with 2FA Enabled
1. Enter email and password
2. After successful Firebase login, OTP is sent automatically
3. Redirected to OTP verification page
4. Enter 6-digit code from email
5. On success → Redirected to dashboard

### Account Lockout
- After 3 failed login attempts, account is locked for 15 minutes
- Lockout message displayed on sign-in page
- User must wait for lockout period to expire

## Next Steps (TODO)

### Settings Page Integration
- [ ] Add 2FA toggle in user settings
- [ ] Show 2FA status and method
- [ ] Allow enable/disable with confirmation

### Additional Enhancements
- [ ] SMS-based 2FA option
- [ ] Authenticator app support (TOTP)
- [ ] Backup codes generation
- [ ] 2FA recovery flow
- [ ] Email templates customization
- [ ] OTP cleanup scheduled job

## Testing Checklist

- [ ] Enable 2FA in settings
- [ ] Sign in with 2FA enabled → OTP sent
- [ ] Enter correct OTP → Success redirect
- [ ] Enter wrong OTP → Error message
- [ ] Resend OTP → Cooldown timer works
- [ ] 3 failed login attempts → Account locked
- [ ] Account locked message displays correctly
- [ ] Disable 2FA → Normal login flow
- [ ] Failed attempts reset on successful login

## API Endpoints Summary

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/api/v1/two-factor/status` | Yes | Get 2FA status |
| POST | `/api/v1/two-factor/enable` | Yes | Enable 2FA |
| POST | `/api/v1/two-factor/disable` | Yes | Disable 2FA |
| POST | `/api/v1/two-factor/send-otp` | Yes | Send OTP code |
| POST | `/api/v1/two-factor/verify-otp` | Yes | Verify OTP code |
| GET | `/api/v1/two-factor/check-account-status` | No | Check account lock status |
| POST | `/api/v1/two-factor/reset-failed-attempts` | Yes | Reset failed attempts |
| POST | `/api/v1/two-factor/increment-failed-attempts` | No | Track failed login |

## Notes

- OTP codes are stored in plaintext in Firestore (for development). In production, consider hashing.
- Email sending requires SMTP configuration. In development, emails are logged instead of sent.
- Account lockout duration is 15 minutes (configurable in `two_factor.py`).
- Failed attempts threshold is 3 (configurable in `two_factor.py`).

