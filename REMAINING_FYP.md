# NexAgent FYP - Remaining Tasks & Node Development Plan

## 📋 Remaining Features for FYP Submission

### 1. **Workflow Persistence & Storage** ⚠️ CRITICAL
- [ ] **Store workflows in JSON format** - Export/Import workflows as JSON files
  - Implement `WorkflowExporter` utility to convert workflow state to JSON
  - Implement `WorkflowImporter` utility to load JSON into workflow editor
  - File format: `workflows/{workflowId}.json`
  
- [ ] **Save workflows to Firestore**
  - Create Firestore collection: `workflows/{userId}/{workflowId}`
  - Store structure:
    ```json
    {
      "id": "workflow_abc123",
      "name": "My Workflow",
      "description": "Description",
      "nodes": [],
      "edges": [],
      "variables": {},
      "createdAt": "2025-02-15T...",
      "updatedAt": "2025-02-15T...",
      "version": 1
    }
    ```
  - Auto-save on every node change (debounced)
  - Manual save button in toolbar

- [ ] **Display workflows on /workflows page**
  - Fetch workflows from Firestore for current user
  - Show list with: Name, Description, Last Modified, Actions (Edit/Delete)
  - Create new workflow button
  - Quick preview modal showing node count & connections

### 2. **Marketplace Integration (Basic)** ⭐ IMPORTANT
- [ ] **List Workflow on Marketplace**
  - Backend API: `POST /api/v1/marketplace/listings`
  - Frontend Modal asking:
    - ☐ Workflow name & description
    - ☐ **Paid or Free?** (Simple toggle)
    - ☐ If paid: Price in USD ($5-$999)
    - ☐ Category selection
    - ☐ Tags/Keywords
  - Store in Firestore: `marketplace_listings/{workflowId}`

- [ ] **Purchase Workflow from Marketplace** (If Paid)
  - Display marketplace workflows with filters
  - **Free Workflows**: 1-click clone/use
  - **Paid Workflows**: Stripe integration
    - Show price & demo
    - One-click purchase
    - Charge user & grant access
    - Redirect to workflow editor post-purchase

- [ ] **Use Marketplace Workflow**
  - Clone workflow to user's account (with all nodes preserved)
  - Edit cloned workflow independently
  - Show "Modified from: [Original Workflow]" badge

---

## 🎯 High-Priority Nodes for FYP MVP

### **Phase 1: MUST BUILD (Easy, High Impact)**
Perfect for FYP demo - shows automation in action

#### 1. **😍 Telegram Bot** (Priority: ⭐⭐⭐⭐⭐)
```
Type: Action/Communication
Why: Easy to demo, visual feedback, impressive for jurors
Time to Build: 2-3 hours

Core Features:
- Send message to specific chat ID
- List available chats (stored in DB)
- Format messages with variables
- Simple webhook for receiving messages

Node Config:
{
  "telegramBotToken": "YOUR_TOKEN",
  "chatId": "123456789",
  "message": "Hello {{$trigger.name}}!",
  "parseMode": "HTML"  // Optional formatting
}

Use Case Example:
Workflow: "Daily Report Sender"
→ Trigger (Schedule 9AM)
→ Process Data
→ Telegram: Send summary to team group
→ Done ✅
```

#### 2. **📧 Email Sender** (Priority: ⭐⭐⭐⭐⭐)
```
Type: Action/Communication
Why: Core automation feature, everyone understands emails
Time to Build: 2-3 hours

Core Features:
- Send email via Gmail/SMTP
- Use templates with variables
- Add attachments from URLs
- CC/BCC support
- HTML formatting

Node Config:
{
  "to": "{{$trigger.email}}",
  "subject": "Order #{{$vars.orderId}} Confirmed",
  "body": "Your order has been shipped",
  "htmlBody": "<h1>Order Details</h1>...",
  "cc": "manager@company.com"
}

Use Case Example:
Workflow: "Order Confirmation Email"
→ Trigger (New Order)
→ Email: Send confirmation
→ Email: Send to admin
→ Done ✅
```

#### 3. **🔔 Slack Message** (Priority: ⭐⭐⭐⭐⭐)
```
Type: Action/Communication
Why: Slack integration is highly visible in demos
Time to Build: 2-3 hours

Core Features:
- Post message to Slack channel
- Formatted blocks & rich formatting
- Emoji reactions
- Thread replies
- User mentions with @

Node Config:
{
  "slackToken": "xoxb-...",
  "channel": "#alerts",
  "message": "🚨 Alert: {{$vars.alertMessage}}",
  "blocks": [...]  // Block Kit for advanced formatting
}

Use Case Example:
Workflow: "Error Alert System"
→ Trigger (On Error)
→ Slack: Post alert with stack trace
→ Email: Send to devs
→ Done ✅
```

#### 4. **💾 Data Formatter/Transformer** (Priority: ⭐⭐⭐⭐)
```
Type: Data Processing
Why: Essential for connecting different node formats
Time to Build: 2 hours

Core Features:
- Convert JSON to CSV
- Format dates (various formats)
- String manipulation (uppercase, trim, split)
- Math operations
- Template rendering

Node Config:
{
  "operation": "format_date",
  "inputValue": "{{$trigger.timestamp}}",
  "format": "YYYY-MM-DD HH:mm:ss",
  "timezone": "UTC"
}

Transformations:
- JSON → CSV ✓
- Text → JSON ✓
- Concatenate strings ✓
- Extract fields ✓
```

#### 5. **🔗 HTTP Request** (Priority: ⭐⭐⭐⭐)
```
Type: Integration/Action
Why: Connect to any external API
Time to Build: 3 hours

Core Features:
- GET, POST, PUT, DELETE methods
- Custom headers & auth
- Request body (JSON/Form)
- Response parsing
- Error handling & retries

Node Config:
{
  "method": "POST",
  "url": "https://api.service.com/webhook",
  "headers": {
    "Authorization": "Bearer {{$vars.apiKey}}"
  },
  "body": {
    "user": "{{$trigger.user}}",
    "action": "{{$vars.action}}"
  }
}

Use Case Example:
Workflow: "Sync to CRM"
→ Trigger (New Lead)
→ HTTP: POST to CRM API
→ Slack: Notify on success
→ Done ✅
```

---

### **Phase 2: BUILD NEXT (Medium Difficulty, Good Practice)**

#### 6. **🗂️ Google Sheets** (Priority: ⭐⭐⭐⭐)
- Append rows to sheet
- Read/update cells
- Create new sheets
- Time: 4 hours

#### 7. **⏱️ Delay/Wait** (Priority: ⭐⭐⭐⭐)
- Wait X seconds/minutes/hours
- Pause until specific time
- Time: 1 hour (simple but very useful)

#### 8. **🔀 Conditional (If/Else)** (Priority: ⭐⭐⭐⭐⭐)
- Branch workflow based on conditions
- Comparison operators (==, >, <, contains)
- Logical operators (AND, OR, NOT)
- Time: 2 hours

#### 9. **🔄 Loop** (Priority: ⭐⭐⭐)
- Iterate over arrays
- Run node N times
- Break on condition
- Time: 3 hours

#### 10. **📊 Database Query** (Priority: ⭐⭐⭐)
- Query Firebase/MongoDB
- Store/retrieve workflow data
- Filter & sort results
- Time: 3-4 hours

---

### **Phase 3: NICE TO HAVE (Advanced)**

- 🤖 OpenAI/Claude API
- 📱 SMS/Twilio
- 💳 Stripe Webhook Handler
- 📸 Image Processing
- 🎵 Discord Bot
- 📺 YouTube Upload
- ☁️ Cloud Storage (S3)

---

## 📊 Recommended Demo Workflow for FYP

**"Automated Lead Onboarding Flow"** - Shows 6+ node types in action:

```
Trigger: New Lead Submitted (Webhook)
   ↓
Data: Format lead info (Age, Email validation)
   ↓
Decision: Is email valid? (Conditional)
   ├─ YES:
   │   ├→ Google Sheets: Append lead to database
   │   ├→ Email: Send welcome email
   │   └→ Slack: Notify sales team
   └─ NO:
       └→ Email: Ask user to verify email
```

**Nodes Required**: Webhook Trigger, Data Formatter, Conditional, Google Sheets, Email, Slack, Logger

---

## 🏗️ Node Implementation Checklist

- [ ] Node TypeScript interface defined
- [ ] Node config modal/form built
- [ ] Node execution logic implemented
- [ ] Variable interpolation working ({{$trigger.x}}, {{$vars.y}})
- [ ] Error handling & validation
- [ ] Mock API/service for testing
- [ ] Documentation/comments added
- [ ] Unit tests written (bonus)

---

## 📝 FYP Submission Highlights

When presenting to jurors, highlight:
1. **Workflow Visual Editor** - Drag & drop workflow building
2. **Node System** - 10+ pre-built integrations
3. **Marketplace** - Buy/sell workflows with payment processing
4. **Database Persistence** - Workflows saved and retrievable
5. **Execution Engine** - Workflows actually run and do things
6. **Live Demo** - Show Telegram/Email/Slack notifications in real-time

---

**Estimated Timeline**: 
- Phase 1: 2 weeks (5 nodes)
- Phase 2: 3 weeks (5 nodes)
- Phase 3: 1-2 weeks (bonus features)
- Testing & Polish: 1 week
