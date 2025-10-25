# Connect WhatsApp, Instagram, and Facebook (Cloud API)

Status: docs v1

This guide explains exactly how to connect WhatsApp, Instagram, and Facebook so you can use their nodes and triggers in workflows.

---

## WhatsApp Business Platform (Cloud API)

What you need
- Business Account ID (WABA ID)
- Phone Number ID
- Access Token (temporary for testing or system-user token for prod)
- Webhook Verify Token (secret you choose)

Steps
1) Create app and WABA (one-time)
- developers.facebook.com → My Apps → Create App (Business)
- Add Product → WhatsApp. Complete onboarding to get a test number.

2) Get IDs and token
- Business Account ID: App Dashboard → WhatsApp → Configuration.
- Phone Number ID: App Dashboard → WhatsApp → Phone numbers → copy Phone number ID.
- Access Token:
  - For testing: “Temporary access token.”
  - For production: Business Settings → Users → System Users → Generate token with whatsapp_business_messaging and whatsapp_business_management.

3) Create credential in NexAgent
- Go to /credentials → WhatsApp → Connect.
- Fill Business Account ID, Phone Number ID, Access Token, Webhook Verify Token.
- Submit. The modal shows your webhook URL:
  - https://YOUR_DOMAIN/api/webhooks/whatsapp/{credentialId}

4) Configure webhook in Meta
- App Dashboard → WhatsApp → Configuration → Webhooks:
  - Callback URL: paste the webhook URL above
  - Verify Token: the exact secret from the modal
- Subscribe to messages and message status fields.

Notes
- Use E.164 phone format (+15551234567) in nodes.
- Outside the 24-hour window, use approved templates to initiate responses.

---

## Instagram (Graph API + Messenger API for Instagram)

What you need
- A Facebook App (Business)
- Instagram Business or Creator account connected to a Facebook Page
- App in Development or Live mode with appropriate permissions

Steps
1) Start OAuth in NexAgent
- /credentials → Instagram → Connect.
- You’ll be redirected to Meta to grant permissions.

2) Approve permissions
- instagram_basic, instagram_manage_comments, instagram_manage_messages, instagram_manage_insights.
- If messaging is required, ensure the IG account is linked to a Facebook Page.

3) Finish callback
- After granting access, you’ll be redirected back and an Instagram credential is created.

4) (Optional) Webhooks
- If you want inbound triggers (comments/messages), configure App Dashboard → Webhooks for IG topics, pointing to your NexAgent webhook endpoints when available.

Notes
- For publishing, IG Business accounts require media container → publish flow.
- Messaging requires the Page linkage and proper permissions.

---

## Facebook Pages + Messenger

What you need
- A Facebook App (Business)
- A Facebook Page you manage
- App in Development or Live mode with appropriate permissions

Steps
1) Start OAuth in NexAgent
- /credentials → Facebook → Connect.

2) Select Page and grant permissions
- pages_show_list, pages_read_engagement, pages_manage_metadata, pages_messaging.

3) Finish callback
- You’ll be redirected back and a Facebook credential is created.

4) (Optional) Webhooks
- App Dashboard → Webhooks → subscribe Page to messages/comments events.
- Point the callback URL to NexAgent’s webhook endpoints when available.

Notes
- For Page messaging, be mindful of policies and rate limits.

---

Troubleshooting
- Invalid verify token: ensure the token in Meta matches exactly what you entered.
- Token expired: temporary tokens expire ~24h; use a system-user token for WhatsApp or reauthorize for IG/FB.
- Permissions missing: re-run Connect and ensure all requested scopes are approved.
