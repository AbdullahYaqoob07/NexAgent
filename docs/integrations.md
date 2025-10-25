<<<<<<< HEAD
# Integrations Plan: Instagram, Facebook, WhatsApp (Cloud API)

Status: draft
Owner: Platform Integrations

## Table of contents
- Scope and assumptions
- Cross‑platform architecture
- Instagram (Graph API + Messenger API for Instagram)
  - Features (MVP and Beyond)
  - Triggers and Actions (for workflow nodes)
  - Data model and env
  - App review and compliance
- Facebook Pages + Messenger
  - Features (MVP and Beyond)
  - Triggers and Actions
  - Data model and env
  - App review and compliance
- WhatsApp Business Platform (Cloud API)
  - Features (MVP and Beyond)
  - Triggers and Actions
  - Data model and env
  - Compliance: 24‑hour window, templates, pricing
- Rollout plan (phased)
- Open questions

---

## Scope and assumptions
- Single platform‑owned Meta app (recommended). End users authorize their store/page/accounts; we manage tokens and webhooks.
- Webhooks deliver platform events to our /api/webhooks/{platform}/{credentialId} endpoints with HMAC/verify token checks.
- Our engine normalizes events into a common envelope for triggers.
- Minimal scopes at first to simplify review. Scale scopes after MVP is live.

## Cross‑platform architecture
- Credentials
  - Store: provider, account/page IDs, tokens, token expiry/long‑lived flags, webhook verify token, metadata
  - Encryption at rest for tokens
- OAuth (FB/IG)
  - Long‑lived tokens (extend on exchange and refresh via scheduled job)
  - Allow selecting a Page mapped to an IG Business Account
- WhatsApp Cloud
  - Setup requires WABA + Phone Number ID; store permanent/page/system user token
  - Register webhook callback URL + verify token
- Webhook infrastructure
  - Verification endpoints for Meta hub challenge
  - HMAC/verify_signature checks (when applicable)
  - Idempotency keys and retry/backoff

---

## Instagram (Graph API + Messenger API for Instagram)

### Features
- MVP
  - Publish photo/video to IG Business Account (create container → publish)
  - New Comment on Post (webhook) → reply/hide/delete
  - New Mention of account (webhook) → acknowledge/reply
  - Insights (media + account basic metrics)
- Beyond MVP
  - DMs via Messenger API for Instagram (send/receive, mark read)
  - Hashtag search limited endpoints; mention discovery
  - Comment moderation automation

### Triggers and Actions
- Triggers
  - Instagram: New Comment
  - Instagram: New Mention
  - Instagram: Media Published (own account)
- Actions
  - Instagram: Publish Photo/Video
  - Instagram: Reply to Comment / Hide / Delete
  - Instagram: Send DM (requires Messenger API for Instagram)
  - Instagram: Get Insights (account/media)

### Data model and env
- Credential fields (instagram)
  - instagram.accountId, instagram.pageId (linked FB Page), accessToken (long‑lived), expiresAt
  - permissions[], webhookVerifyToken
- ENV
  - META_APP_ID, META_APP_SECRET
  - IG_WEBHOOK_VERIFY_TOKEN

### App review and compliance
- Typical permissions: instagram_basic, instagram_content_publish, instagram_manage_comments, instagram_manage_insights
- For DMs: instagram_manage_messages + connected FB Page + pages_messaging
- Business verification may be required; provide screencast for review

---

## Facebook Pages + Messenger

### Features
- MVP
  - Create Page posts (text/photo/video) + schedule
  - New Page Message (webhook) + reply
  - New Comment on Page Post (webhook) + reply/hide/delete
- Beyond MVP
  - Lead Ads: webhook + fetch leads
  - Reactions, feed curation, insights dashboards

### Triggers and Actions
- Triggers
  - Facebook: New Page Message
  - Facebook: New Comment on Post
  - Facebook: New Lead (optional)
- Actions
  - Facebook: Create Post / Schedule Post
  - Facebook: Reply/Hide/Delete Comment
  - Facebook: Send Page Message
  - Facebook: Fetch Insights (page/post)

### Data model and env
- Credential fields (facebook)
  - pageId, pageAccessToken (long‑lived), userId, permissions[], webhookVerifyToken
- ENV
  - META_APP_ID, META_APP_SECRET
  - FB_WEBHOOK_VERIFY_TOKEN

### App review and compliance
- Typical permissions: pages_manage_posts, pages_read_engagement, pages_manage_engagement, pages_messaging
- Optional: leads_retrieval, ads_* if needed
- Business verification likely needed for messaging/leads
=======
# Connect WhatsApp, Instagram, and Facebook (Cloud API)

Status: docs v1

This guide explains exactly how to connect WhatsApp, Instagram, and Facebook so you can use their nodes and triggers in workflows.
>>>>>>> 52f0342f9c042b37ca534d495ca3a26475f642fc

---

## WhatsApp Business Platform (Cloud API)

<<<<<<< HEAD
### Features
- MVP
  - Receive incoming messages (webhook)
  - Send text messages
  - Mark message as read
  - Send template messages (for outside 24h window)
- Beyond MVP
  - Send media (image/video/audio/document), stickers
  - Send location and contacts
  - Interactive messages (buttons/list)
  - Product/catalog messages (if catalog configured)
  - Template management (create/submit) and multi‑language templates

### Triggers and Actions
- Triggers
  - WhatsApp: Incoming Message
  - WhatsApp: Message Status (sent/delivered/read/failed)
- Actions
  - WhatsApp: Send Text/Media/Location/Contact
  - WhatsApp: Send Interactive (Buttons/List)
  - WhatsApp: Send Template (HSM) with variables
  - WhatsApp: Mark as Read

### Data model and env
- Credential fields (whatsapp)
  - businessAccountId, phoneNumberId, token, defaultTemplateLanguage, webhookVerifyToken, catalogId?
- ENV
  - WA_BUSINESS_ACCOUNT_ID, WA_PHONE_NUMBER_ID, WA_ACCESS_TOKEN
  - WA_WEBHOOK_VERIFY_TOKEN

### Compliance: 24‑hour window, templates, pricing
- Customer service window: free‑form replies allowed within 24h of user’s last message
- Outside 24h: must use approved template messages
- Track conversation category and pricing for billing visibility
- Maintain opt‑in records; do not allow cold outreach

---

## Rollout plan (phased)
1) Foundations: credential types, OAuth/token refresh, webhook verification, event normalization
2) Instagram MVP: publish + comment triggers/actions + insights
3) Facebook MVP: page posts, messages, comments
4) WhatsApp MVP: receive/send text + template + mark read
5) Enhancements: DM support (IG), interactive messages (WA), Lead Ads (FB), analytics, retries/rate limits

## Open questions
- BYO‑credentials option needed or only platform‑owned?
- Which insights are critical for v1 dashboards?
- Prioritize WhatsApp first (fastest value) vs Instagram/Facebook (review heavy)?
=======
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
>>>>>>> 52f0342f9c042b37ca534d495ca3a26475f642fc
