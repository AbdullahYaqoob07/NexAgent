# Nodes catalog (Integrations/Connectors)

Status: draft
Purpose: reference list of nodes we can support (inspired by common offerings in tools like Zapier, n8n, and Make) organized by category, with typical triggers/actions. Use this to prioritize roadmap and seed our marketplace.

## Table of contents
- Communication & Chat
- Email & Marketing
- Files & Storage
- Spreadsheets & Databases
- CRM & Sales
- Project Management & Productivity
- Calendars & Scheduling
- Payments & Finance
- Social & Ads
- E‑commerce
- DevOps & Monitoring
- AI/ML & NLP
- Utilities & Web
- Maps & Geo
- Customer Support & Helpdesk

---

## Communication & Chat
- Slack
  - Triggers: New Message in Channel/Thread, Reaction Added, New Mention
  - Actions: Send Message, DM User, Add Reaction, Create Channel, Invite User
- Discord
  - Triggers: New Message, Reaction, New Member Join
  - Actions: Send Message, Manage Roles, Add Reaction
- Microsoft Teams
  - Triggers: New Channel Message, Mention
  - Actions: Send Channel/Chat Message
- Telegram
  - Triggers: New Message, New Member
  - Actions: Send Message, Send Media
- WhatsApp (Cloud API)
  - Triggers: Incoming Message, Message Status
  - Actions: Send Text/Media, Send Template, Mark as Read, Interactive Buttons/List

## Email & Marketing
- Gmail / Google Workspace Mail
  - Triggers: New Email, New Label
  - Actions: Send Email, Reply, Add Label
- Outlook / Microsoft 365 Mail
  - Triggers/Actions: similar to Gmail
- SendGrid / Mailgun / Amazon SES
  - Actions: Send Transactional Email, Manage Templates
- Mailchimp / Klaviyo / Brevo
  - Triggers: Subscriber Added/Updated, Campaign Event
  - Actions: Add/Update Subscriber, Send Campaign (where supported)

## Files & Storage
- Google Drive
  - Triggers: File Added/Updated, New Folder
  - Actions: Upload File, Create Folder, Share File
- Dropbox / OneDrive / Box
  - Similar file triggers/actions
- Amazon S3 / Cloudflare R2
  - Actions: Put/Get Object, List Objects

## Spreadsheets & Databases
- Google Sheets
  - Triggers: New Row, Updated Row
  - Actions: Add/Update Row, Lookup Row, Create Sheet
- Airtable
  - Triggers: New/Updated Record
  - Actions: Create/Update/Find Record, Attachments
- Microsoft Excel (OneDrive)
  - Triggers/Actions: New/Update Row, Tables
- Databases (direct connectors)
  - PostgreSQL / MySQL / MSSQL: Run Query, Insert/Update, Listen (logical via polling)
  - MongoDB / Firestore: Insert/Update/Find, Change Streams (where permitted)
  - Redis: Get/Set, Pub/Sub (advanced)

## CRM & Sales
- HubSpot
  - Triggers: New/Updated Contact/Deal, Form Submission
  - Actions: Create/Update Contact/Deal, Log Activity
- Salesforce
  - Triggers: Record Created/Updated, Platform Events (where enabled)
  - Actions: CRUD on objects, SOQL query
- Pipedrive / Zoho CRM / Close
  - Common CRUD triggers/actions

## Project Management & Productivity
- Notion
  - Triggers: Database Item Created/Updated
  - Actions: Create/Update Page, Query Database
- Trello
  - Triggers: Card Created/Updated, Moved List
  - Actions: Create Card, Comment, Move Card
- Asana / ClickUp / Linear / Jira
  - Triggers: Task/Issue Created/Updated
  - Actions: Create/Update Task/Issue, Comment, Change Status

## Calendars & Scheduling
- Google Calendar / Microsoft Outlook Calendar
  - Triggers: Event Created/Updated/Cancelled
  - Actions: Create/Update Event, Find Time Slots
- Calendly
  - Triggers: Invitee Created/Cancelled

## Payments & Finance
- Stripe
  - Triggers: Payment Intent Succeeded, Subscription Events, Invoice Events
  - Actions: Create Customer, Create Charge/Payment Link, Refund
- PayPal
  - Triggers: Payment Completed, Dispute
  - Actions: Capture/Refund
- QuickBooks Online / Xero
  - Actions: Create Invoice, Customer, Payment

## Social & Ads
- Instagram (Graph API)
  - Triggers: New Comment, New Mention, Media Published
  - Actions: Publish Photo/Video, Reply to Comment, DM (advanced)
- Facebook Pages & Messenger
  - Triggers: New Page Message, New Comment, Lead Created
  - Actions: Create Post, Reply/Hide Comment, Send Message
- Twitter/X
  - Triggers: Mention, New Follower (where API allows)
  - Actions: Tweet/Reply, DM (access dependent)
- LinkedIn
  - Actions: Share Post (company), Comment (limited by API)
- Google Ads / Meta Ads
  - Actions: Create/Update Campaign/Ad Set (advanced; usually read + conversions log)

## E‑commerce
- Shopify
  - Triggers: Order Created/Updated/Paid/Cancelled, Customer Created, Product Created
  - Actions: Get Orders/Products/Customers, Update Order
- WooCommerce / BigCommerce
  - Similar order/customer/product triggers/actions
- Shippo / ShipStation
  - Actions: Create Label, Track Shipment

## DevOps & Monitoring
- GitHub / GitLab / Bitbucket
  - Triggers: Push, PR/MR events, Issue events
  - Actions: Create Issue/PR, Comment, Dispatch Workflow
- Vercel / Netlify
  - Actions: Trigger Deploy, Get Deploy Status
- Sentry / Datadog / New Relic
  - Triggers: New Issue/Alert

## AI/ML & NLP
- OpenAI / Anthropic / Google Gemini / Cohere
  - Actions: Chat Completions, Embeddings, Batch, Image Generation, Moderation
- Whisper / Speech‑to‑Text (GCP/AWS/Azure)
  - Actions: Transcribe Audio
- Vision/OCR: Google Vision, AWS Textract, Azure Vision
  - Actions: OCR, Label Detection, Document extraction

## Utilities & Web
- HTTP/Webhook
  - Triggers: Catch Hook
  - Actions: HTTP Request (GET/POST/PUT/PATCH/DELETE), Retry, Auth presets
- JSON / Transform
  - Actions: Parse/Build JSON, Template with Handlebars/Mustache, JMESPath
- Formatter
  - Actions: Date, Numbers, Text transforms
- Rate limiter / Delay / Schedule
  - Actions: Delay, Throttle, Cron trigger
- Storage / KV
  - Actions: Get/Set, Secrets reference

## Maps & Geo
- Google Maps Platform
  - Actions: Geocoding, Directions, Distance Matrix, Places search
- Mapbox
  - Actions: Geocoding, Isochrones

## Customer Support & Helpdesk
- Zendesk / Freshdesk / Intercom
  - Triggers: Ticket/Conversation Created/Updated
  - Actions: Create/Update Ticket/Conversation, Reply

---

### Prioritization guidance
- Phase 1 (broadest utility): HTTP/Webhooks, Google Sheets, Slack, Gmail/Outlook, Notion, Airtable, OpenAI
- Phase 2: Shopify, WhatsApp, Instagram/Facebook, Trello/Asana/Jira, Google Drive/Dropbox
- Phase 3: Stripe, HubSpot, Calendars, Databases (Postgres/MySQL), GitHub

### Notes
- Many vendor APIs require OAuth and app review. Keep scopes minimal for MVPs.
- Where real‑time events aren’t available, provide polling nodes with proper backoff.
- Reuse our credential model, webhook system, and NodeDefinition schema for consistency.
