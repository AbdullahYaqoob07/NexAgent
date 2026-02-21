# SMTP Email Configuration Guide

## How to Get SMTP Credentials

### Option 1: Gmail (Recommended for Development)

#### Step 1: Enable 2-Step Verification
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** (if not already enabled)
3. Complete the setup process

#### Step 2: Generate App Password
1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select **App**: "Mail"
3. Select **Device**: "Other (Custom name)"
4. Enter name: "NexAgent Backend"
5. Click **Generate**
6. **Copy the 16-character password** (you'll see it only once!)

#### Step 3: Use in Backend `.env`
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # The 16-char app password (remove spaces)
EMAIL_FROM=noreply@nexagent.com
```

**Important Notes:**
- Use the **App Password**, NOT your regular Gmail password
- Remove spaces from the app password when pasting
- The app password format: `xxxx xxxx xxxx xxxx` → use as `xxxxxxxxxxxxxxxx`

---

### Option 2: Other Email Providers

#### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USERNAME=your-email@outlook.com
SMTP_PASSWORD=your-password
EMAIL_FROM=your-email@outlook.com
```

#### Yahoo Mail
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USERNAME=your-email@yahoo.com
SMTP_PASSWORD=your-app-password  # Generate from Yahoo Account Security
EMAIL_FROM=your-email@yahoo.com
```

#### Custom SMTP Server
```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587  # or 465 for SSL
SMTP_USERNAME=your-email@yourdomain.com
SMTP_PASSWORD=your-password
EMAIL_FROM=noreply@yourdomain.com
```

---

### Option 3: Email Service Providers (Production)

For production, consider using:
- **SendGrid** (Free tier: 100 emails/day)
- **AWS SES** (Very cheap, $0.10 per 1000 emails)
- **Mailgun** (Free tier: 5000 emails/month)
- **Postmark** (Free tier: 100 emails/month)

#### SendGrid Example
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
```

---

## Backend Configuration

### File: `backend/.env`

Add these lines:
```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password-here
EMAIL_FROM=noreply@nexagent.com
```

### Testing Email Configuration

1. **Start your backend:**
   ```bash
   cd backend
   python run.py
   ```

2. **Test via API:**
   ```bash
   # Enable 2FA for a user (requires auth token)
   curl -X POST http://localhost:8000/api/v1/two-factor/enable \
     -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"method": "email"}'
   
   # Send OTP (requires auth token)
   curl -X POST http://localhost:8000/api/v1/two-factor/send-otp \
     -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
   ```

3. **Check backend logs:**
   - If SMTP is configured: Email will be sent
   - If NOT configured: You'll see `[DEV] OTP Email would be sent to...` in logs

---

## Development Mode (No Email Sending)

If you don't want to configure SMTP for development, the system will:
- Still generate OTP codes
- Log them to console instead of sending
- Work for testing 2FA flow

**Backend logs will show:**
```
[DEV] OTP Email would be sent to user@example.com: 123456
⚠️ SMTP credentials not configured. OTP email not sent.
```

You can manually check the OTP from backend logs during development.

---

## Troubleshooting

### Error: "SMTP Authentication failed"
- **Gmail**: Make sure you're using App Password, not regular password
- **Other**: Verify username and password are correct

### Error: "Connection refused"
- Check if SMTP port (587) is not blocked by firewall
- Try port 465 with SSL instead

### Error: "Connection timeout"
- Check SMTP host address
- Verify internet connection
- Some networks block SMTP ports

### Gmail: "Less secure app access"
- Gmail no longer supports "less secure apps"
- **Solution**: Use App Password (see Option 1 above)

---

## Security Best Practices

1. **Never commit `.env` files** to Git
2. **Use App Passwords** instead of main account passwords
3. **Rotate passwords** regularly
4. **Use environment-specific** email addresses for testing
5. **In production**, use dedicated email service (SendGrid, AWS SES)

---

## Quick Reference

| Provider | SMTP Host | Port | Auth Required |
|----------|-----------|------|---------------|
| Gmail | smtp.gmail.com | 587 | App Password |
| Outlook | smtp-mail.outlook.com | 587 | Yes |
| Yahoo | smtp.mail.yahoo.com | 587 | App Password |
| SendGrid | smtp.sendgrid.net | 587 | API Key |
| AWS SES | email-smtp.region.amazonaws.com | 587 | Access Keys |

