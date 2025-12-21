# MFA Implementation Plan - TOTP (Google Authenticator Style)

## Overview
Implement TOTP (Time-based One-Time Password) multi-factor authentication using industry-standard libraries.

---

## Technology Stack

### Backend (Python)
- **Library**: `pyotp` - TOTP generation and verification
- **Library**: `qrcode` + `Pillow` - QR code generation for setup
- **Library**: `secrets` (built-in) - Secure secret generation

### Frontend (TypeScript/React)
- **Library**: `qrcode.react` or `react-qr-code` - Display QR codes
- **Library**: `otpauth` (optional) - Client-side TOTP validation (for better UX)

---

## Implementation Steps

### Phase 1: Backend Setup (Day 1)

#### 1.1 Install Dependencies
```bash
cd backend
pip install pyotp qrcode[pil] Pillow
```

#### 1.2 Create MFA Service
**File**: `backend/app/services/mfa_service.py`
- Generate TOTP secrets
- Create QR codes for authenticator apps
- Verify TOTP codes
- Generate backup codes
- Store MFA secrets securely (encrypted in Firestore)

#### 1.3 Create MFA API Endpoints
**File**: `backend/app/api/v1/mfa.py`
- `POST /api/v1/mfa/setup` - Generate secret and QR code
- `POST /api/v1/mfa/verify-setup` - Verify initial setup code
- `POST /api/v1/mfa/verify` - Verify TOTP during login
- `POST /api/v1/mfa/disable` - Disable MFA
- `GET /api/v1/mfa/backup-codes` - Get backup codes
- `POST /api/v1/mfa/regenerate-backup-codes` - Generate new backup codes

#### 1.4 Update User Model
- Already has `twoFactorEnabled` and `twoFactorMethod` fields ✅
- Add: `mfaSecret` (encrypted), `mfaBackupCodes` (hashed), `mfaEnabledAt`

---

### Phase 2: Frontend Setup (Day 2-3)

#### 2.1 Install Dependencies
```bash
npm install qrcode.react
# or
npm install react-qr-code
```

#### 2.2 Create MFA Setup Component
**File**: `components/mfa/MFASetup.tsx`
- Display QR code
- Show manual entry key
- Input field for verification code
- Instructions for Google Authenticator/Authy

#### 2.3 Create MFA Verification Component
**File**: `components/mfa/MFAVerify.tsx`
- 6-digit code input
- Auto-submit on complete
- Error handling
- "Use backup code" option

#### 2.4 Update Settings Page
**File**: `components/settings/SettingsView.tsx`
- Add MFA toggle/enable button
- Show MFA status
- Display backup codes (with copy/download)
- Disable MFA option

#### 2.5 Update Sign-In Flow
**File**: `app/sign-in/page.tsx` and `lib/auth.ts`
- After successful password auth, check if MFA is enabled
- If enabled, show MFA verification step
- Verify TOTP code before completing login

---

### Phase 3: Integration (Day 4)

#### 3.1 Update Auth Flow
- Modify `lib/auth.ts` to check MFA status after password verification
- Add MFA verification step in sign-in process
- Store MFA verification in session

#### 3.2 Backup Codes
- Generate 10 backup codes on MFA setup
- Hash and store in Firestore
- Allow one-time use
- Show download/copy option

#### 3.3 Security Enhancements
- Encrypt MFA secrets in Firestore
- Rate limit MFA verification attempts
- Log MFA events for audit

---

## Detailed Implementation

### Backend MFA Service Structure

```python
# backend/app/services/mfa_service.py

import pyotp
import qrcode
from io import BytesIO
import base64
import secrets
from typing import Dict, Any, Optional

class MFAService:
    def generate_secret(self) -> str:
        """Generate a random TOTP secret"""
        return pyotp.random_base32()
    
    def generate_qr_code(self, email: str, secret: str, issuer: str = "NexAgent") -> str:
        """Generate QR code data URL for authenticator app"""
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=email,
            issuer_name=issuer
        )
        # Generate QR code and return as base64 data URL
        ...
    
    def verify_totp(self, secret: str, code: str) -> bool:
        """Verify TOTP code"""
        totp = pyotp.TOTP(secret)
        return totp.verify(code, valid_window=1)  # Allow 1 time step window
    
    def generate_backup_codes(self, count: int = 10) -> list[str]:
        """Generate backup codes"""
        return [secrets.token_hex(4).upper() for _ in range(count)]
```

### Frontend MFA Components

```typescript
// components/mfa/MFASetup.tsx
- QR code display
- Manual entry key display
- Verification code input
- "Continue" button

// components/mfa/MFAVerify.tsx
- 6-digit code input (auto-focus, auto-submit)
- "Use backup code" link
- Error messages
- Resend/retry options
```

---

## User Flow

### Setup Flow
1. User goes to Settings → Security
2. Clicks "Enable Two-Factor Authentication"
3. Backend generates secret and QR code
4. User scans QR code with authenticator app
5. User enters verification code from app
6. Backend verifies and enables MFA
7. Backend generates and displays backup codes
8. User saves backup codes

### Login Flow
1. User enters email and password
2. Password verified successfully
3. System checks if MFA is enabled
4. If enabled, show MFA verification step
5. User enters 6-digit code from authenticator app
6. System verifies TOTP code
7. Login completes

### Recovery Flow
1. User can't access authenticator app
2. User clicks "Use backup code"
3. User enters one of the backup codes
4. System verifies and invalidates that backup code
5. Login completes

---

## Security Considerations

1. **Secret Storage**: Encrypt MFA secrets in Firestore
2. **Backup Codes**: Hash backup codes (bcrypt) before storing
3. **Rate Limiting**: Limit MFA verification attempts (5 attempts per 15 minutes)
4. **Audit Logging**: Log all MFA events (enable, disable, verify, backup code use)
5. **Session Management**: Require MFA verification for sensitive operations

---

## Testing Checklist

- [ ] Generate TOTP secret
- [ ] Generate QR code
- [ ] Scan QR code with Google Authenticator
- [ ] Verify TOTP code (current and previous/next time step)
- [ ] Generate backup codes
- [ ] Use backup code for login
- [ ] Disable MFA
- [ ] Re-enable MFA
- [ ] Test with multiple authenticator apps (Google Authenticator, Authy, Microsoft Authenticator)
- [ ] Test rate limiting
- [ ] Test error handling (invalid codes, expired codes)

---

## Estimated Time

- **Backend**: 1-2 days
- **Frontend**: 2-3 days
- **Testing & Integration**: 1 day
- **Total**: 4-6 days

---

## Next Steps

1. Install backend dependencies
2. Create MFA service
3. Create MFA API endpoints
4. Install frontend dependencies
5. Create MFA UI components
6. Integrate into sign-in flow
7. Test with authenticator apps

