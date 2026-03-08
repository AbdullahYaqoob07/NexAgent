# NexAgent Automation Workflows Test Plan

This file contains 15 workflows (basic to advanced) you can test one by one.

## How to use

1. Create the workflow with the node order shown.
2. Copy the configuration values for each node.
3. Replace placeholder credentials and IDs.
4. Run test and mark status.

## Placeholders to replace

- `YOUR_GROQ_API_KEY`
- `YOUR_OPENAI_API_KEY`
- `YOUR_GEMINI_API_KEY`
- `YOUR_SLACK_BOT_TOKEN`
- `YOUR_TELEGRAM_BOT_TOKEN`
- `YOUR_GOOGLE_SERVICE_ACCOUNT_JSON`
- `YOUR_SPREADSHEET_ID`
- `YOUR_STRIPE_SECRET_KEY`
- `YOUR_WEBHOOK_REPLY_URL`

---

## 1) Daily Motivational Email (Basic)

- Difficulty: Basic
- Nodes: `Scheduling -> Groq -> EmailSend`
- Goal: Send a daily AI-generated motivation email.

### Node Config

- `Scheduling`
  - `cron`: `0 9 * * *`
  - `timezone`: `Asia/Karachi`
- `Groq`
  - `api_key`: `YOUR_GROQ_API_KEY`
  - `model`: `llama-3.3-70b-versatile`
  - `prompt`: `Generate a short motivational quote for the day (2-3 sentences).`
  - `temperature`: `0.9`
- `EmailSend`
  - `to`: `you@example.com`
  - `subject`: `Your Daily Motivation`
  - `body`: `{{$node.groq.response}}`

Test status: `[ completed ]`

---

## 2) Website Uptime Alert to Slack (Basic)

- Difficulty: Basic
- Nodes: `Schedule -> HTTPRequest -> Conditional -> SlackMessage`
- Goal: Alert Slack if website status is not 200.

### Setup Instructions

1. **Create Schedule trigger** - Set to check every 15 minutes
2. **Create HTTPRequest node** - Make GET request to your website
3. **Create Conditional node** - Check if status code ≠ 200
4. **Create SlackMessage node** - Send alert message when condition is TRUE

> **Note on Slack Setup:**
> 1. Go to [api.slack.com/apps](https://api.slack.com/apps) and create a new app
> 2. Under "OAuth & Permissions", add `chat:write` scope
> 3. Copy the "Bot User OAuth Token" (starts with `xoxb-`)
> 4. Install the app to your workspace
> 5. Invite the bot to your target channel (`#alerts`)

### Node Config

#### Schedule Node
- `frequency`: `*/15 * * * *` (every 15 minutes)
- `timezone`: `UTC`

#### HTTPRequest Node
- `method`: `GET`
- `url`: `https://yourwebsite.com` (replace with your actual domain)
- `timeout`: `10` (seconds before request fails)
- `headers`: Leave **empty** (optional - only needed for auth or custom headers)
- `body`: Leave **empty** (optional - only used with POST/PUT/PATCH requests)
- `query_params`: Leave **empty** (optional - for GET requests with filter parameters)

> **HTTPRequest Fields Explained:**
> - `method`: HTTP verb - GET (fetch data), POST (send data), PUT (update), DELETE (remove)
> - `url`: Full URL including protocol (https://). Use variables like {{$node.x.field}} for dynamic URLs
> - `headers`: JSON object for request headers. Example: `{"Authorization": "Bearer YOUR_TOKEN", "Accept": "application/json"}`
> - `body`: JSON object for request body (for POST/PUT/PATCH). Example: `{"name": "test", "value": 123}`
> - `query_params`: JSON object to append as URL parameters. Example: `{"page": "1", "limit": "10"}` becomes `?page=1&limit=10`
> - `timeout`: How long to wait (in seconds) before aborting. Default 30, max 300.
>
> **For Workflow #2 (uptime check):** Only `method`, `url`, and `timeout` are needed. Headers, body, and query_params can be left blank.

#### Conditional Node (Check Status)
- `left`: `{{$node.{http_request_node_id}.status_code}}`
  - *Replace `{http_request_node_id}` with the actual node ID from HTTPRequest (e.g., `node_1234567890`)*
  - Or use the UI variable picker to select HTTPRequest → status_code
- `operator`: `!=` (not equals)
- `right`: `200`

#### SlackMessage Node (Alert Channel)
Only connect this from the **TRUE branch** of the Conditional node (mark connection with T badge)
- `token`: `xoxb-YOUR_SLACK_BOT_TOKEN`
  - Paste your bot token from api.slack.com/apps
- `channel`: `#alerts`
  - Use channel name with # or @username for direct messages
- `message`: `⚠️ Website down! Status: {{$node.{http_request_node_id}.status_code}}`
  - Replace `{http_request_node_id}` with actual HTTPRequest node ID or use variable picker
- `username`: `NexAgent Bot` (optional, for bot display name)

### Connection Setup

- Schedule → HTTPRequest (main flow)
- HTTPRequest → Conditional (main flow)
- Conditional → SlackMessage (mark connection with **TRUE** badge - click the T/F indicator)

This ensures the alert only sends when status ≠ 200.

### Testing Checklist

- [ ] Schedule node created with correct cron expression
- [ ] HTTPRequest node configured with valid website URL
- [ ] Conditional node has correct field references and operator
- [ ] SlackMessage token pasted correctly
- [ ] Connection marked with TRUE badge on Conditional → SlackMessage
- [ ] Manual test run shows slack message when triggered
- [ ] Verify message appears in Slack channel

Test status: `[ completed ]`

---

## 3) Webhook JSON to Google Sheets (Basic)

- Difficulty: Basic
- Nodes: `Webhook -> JSONParser -> Loop -> GoogleSheets`
- Goal: Receive JSON rows and append them to a sheet.

### Node Config

- `Webhook`
  - `allowed_methods`: `POST`
  - `path`: `csv-upload`
- `JSONParser`
  - `json_string`: `{{$trigger.body}}`
- `Loop`
  - `items`: `{{$node.json_parser.parsed.rows}}`
- `GoogleSheets`
  - `operation`: `append`
  - `credentials_json`: `YOUR_GOOGLE_SERVICE_ACCOUNT_JSON`
  - `spreadsheet_id`: `YOUR_SPREADSHEET_ID`
  - `range`: `Sheet1!A:Z`
  - `values`: `[[{{$node.loop.current_item.col1}}, {{$node.loop.current_item.col2}}]]`

Test status: `[ completed ]`

---

## 4) Birthday Reminder Emails (Basic)

- Difficulty: Basic
- Nodes: `Scheduling -> GoogleSheets -> Loop -> Conditional -> EmailSend`
- Goal: Send birthday wishes based on sheet data.

### Node Config

- `Scheduling`
  - `cron`: `0 8 * * *`
  - `timezone`: `Asia/Karachi`
- `GoogleSheets`
  - `operation`: `read`
  - `credentials_json`: `YOUR_GOOGLE_SERVICE_ACCOUNT_JSON`
  - `spreadsheet_id`: `YOUR_SPREADSHEET_ID`
  - `range`: `Birthdays!A2:C100`
- `Loop`
  - `items`: `{{$node.google_sheets.data}}`
- `Conditional`
  - `left`: `{{$node.loop.current_item.date}}`
  - `operator`: `contains`
  - `right`: `{{$trigger.timestamp}}`
- `EmailSend` (TRUE branch)
  - `to`: `{{$node.loop.current_item.email}}`
  - `subject`: `Happy Birthday {{$node.loop.current_item.name}}`
  - `body`: `Wishing you an amazing day.`

Test status: `[ completed ]`

---

## 5) Daily Weather to Telegram (Basic)

- Difficulty: Basic
- Nodes: `Scheduling -> HTTPRequest -> DataFormatter -> TelegramSend`
- Goal: Fetch weather and send daily Telegram update.

### Node Config

- `Scheduling`
  - `cron`: `0 7 * * *`
  - `timezone`: `Asia/Karachi`
- `HTTPRequest`
  - `method`: `GET`
  - `url`: `https://api.openweathermap.org/data/2.5/weather?q=Lahore&appid=YOUR_API_KEY&units=metric`
- `DataFormatter`
  - `input`: `Temperature: {{$node.http_request.response_body.main.temp}} C, Condition: {{$node.http_request.response_body.weather[0].description}}`
  - `operation`: `capitalize`
- `TelegramSend`
  - `token`: `YOUR_TELEGRAM_BOT_TOKEN`
  - `chat_id`: `@yourchannel`
  - `message`: `{{$node.data_formatter.formatted}}`

Test status: `[ ]`

---

## 6) AI Email Auto-Reply (Intermediate)

- Difficulty: Intermediate
- Nodes: `Webhook -> JSONParser -> Groq -> EmailSend -> Logger`
- Goal: Auto-generate and send support replies.

### Node Config

- `Webhook`
  - `allowed_methods`: `POST`
- `JSONParser`
  - `json_string`: `{{$trigger.body}}`
- `Groq`
  - `api_key`: `YOUR_GROQ_API_KEY`
  - `model`: `llama-3.3-70b-versatile`
  - `system_prompt`: `You are a professional customer support assistant.`
  - `prompt`: `Reply politely to this user query: {{$node.json_parser.parsed.message}}`
  - `temperature`: `0.7`
- `EmailSend`
  - `to`: `{{$node.json_parser.parsed.customer_email}}`
  - `subject`: `Re: {{$node.json_parser.parsed.subject}}`
  - `body`: `{{$node.groq.response}}`
- `Logger`
  - `level`: `info`
  - `message`: `Auto-reply sent to {{$node.json_parser.parsed.customer_email}}`

Test status: `[ ]`

---

## 7) AI Content Moderation (Intermediate)

- Difficulty: Intermediate
- Nodes: `Webhook -> Gemini -> Conditional -> SlackMessage + GoogleSheets`
- Goal: Flag and log inappropriate content.

### Node Config

- `Webhook`
  - `allowed_methods`: `POST`
- `Gemini`
  - `api_key`: `YOUR_GEMINI_API_KEY`
  - `model`: `gemini-2.0-flash`
  - `prompt`: `Classify this content as appropriate or inappropriate. Return one word only.`
  - `system_prompt`: `Return only: appropriate or inappropriate.`
- `Conditional`
  - `left`: `{{$node.gemini.response}}`
  - `operator`: `contains`
  - `right`: `inappropriate`
- `SlackMessage` (TRUE branch)
  - `token`: `YOUR_SLACK_BOT_TOKEN`
  - `channel`: `#moderation`
  - `message`: `Flagged content: {{$trigger.body.content}}`
- `GoogleSheets` (TRUE branch)
  - `operation`: `append`
  - `credentials_json`: `YOUR_GOOGLE_SERVICE_ACCOUNT_JSON`
  - `spreadsheet_id`: `YOUR_SPREADSHEET_ID`
  - `range`: `Flagged!A:D`
  - `values`: `[[{{$trigger.body.user_id}}, {{$trigger.body.content}}, {{$trigger.timestamp}}, flagged]]`

Test status: `[ ]`

---

## 8) Multi-Language Translator (Intermediate)

- Difficulty: Intermediate
- Nodes: `Webhook -> Variable Setter -> Loop -> OpenAI -> GoogleSheets`
- Goal: Translate one input text into multiple languages.

### Node Config

- `Webhook`
  - `allowed_methods`: `POST`
- `Variable Setter`
  - `variable_name`: `languages`
  - `value`: `["Spanish", "French", "German", "Japanese"]`
- `Loop`
  - `items`: `{{$vars.languages}}`
- `OpenAI`
  - `model`: `gpt-3.5-turbo`
  - `prompt`: `You are a translator. Translate accurately.`
  - `input`: `Translate to {{$node.loop.current_item}}: {{$trigger.body.text}}`
  - `temperature`: `0.2`
- `GoogleSheets`
  - `operation`: `append`
  - `credentials_json`: `YOUR_GOOGLE_SERVICE_ACCOUNT_JSON`
  - `spreadsheet_id`: `YOUR_SPREADSHEET_ID`
  - `range`: `Translations!A:C`
  - `values`: `[[{{$trigger.body.text}}, {{$node.loop.current_item}}, {{$node.openai.response}}]]`

Test status: `[ ]`

---

## 9) Stripe Payment + Notifications (Intermediate)

- Difficulty: Intermediate
- Nodes: `Webhook -> Stripe -> Conditional -> EmailSend + SlackMessage + GoogleSheets`
- Goal: Process payment and notify all channels.

### Node Config

- `Webhook`
  - `allowed_methods`: `POST`
- `Stripe`
  - `operation`: `create_payment_intent`
  - `api_key`: `YOUR_STRIPE_SECRET_KEY`
  - `amount`: `{{$trigger.body.amount}}`
  - `currency`: `usd`
- `Conditional`
  - `left`: `{{$node.stripe.status}}`
  - `operator`: `==`
  - `right`: `succeeded`
- `EmailSend` (TRUE branch)
  - `to`: `{{$trigger.body.customer_email}}`
  - `subject`: `Payment Confirmed`
  - `body`: `Your payment was successful. Payment ID: {{$node.stripe.payment_id}}`
- `SlackMessage` (TRUE branch)
  - `token`: `YOUR_SLACK_BOT_TOKEN`
  - `channel`: `#sales`
  - `message`: `New payment from {{$trigger.body.customer_email}} amount {{$node.stripe.amount}}`
- `GoogleSheets` (TRUE branch)
  - `operation`: `append`
  - `credentials_json`: `YOUR_GOOGLE_SERVICE_ACCOUNT_JSON`
  - `spreadsheet_id`: `YOUR_SPREADSHEET_ID`
  - `range`: `Payments!A:E`
  - `values`: `[[{{$node.stripe.payment_id}}, {{$trigger.body.customer_email}}, {{$node.stripe.amount}}, {{$trigger.timestamp}}, succeeded]]`

Test status: `[ ]`

---

## 10) Chatbot with Conversation Memory (Intermediate)

- Difficulty: Intermediate
- Nodes: `Webhook -> GoogleSheets(read) -> ClaudeAI -> GoogleSheets(append) -> HTTPRequest`
- Goal: Answer with context from previous chat history.

### Node Config

- `Webhook`
  - `allowed_methods`: `POST`
- `GoogleSheets` (read)
  - `operation`: `read`
  - `credentials_json`: `YOUR_GOOGLE_SERVICE_ACCOUNT_JSON`
  - `spreadsheet_id`: `YOUR_SPREADSHEET_ID`
  - `range`: `ChatHistory!A:C`
- `ClaudeAI`
  - `model`: `claude-3-sonnet`
  - `prompt`: `Use prior context: {{$node.google_sheets.data}}`
  - `input`: `{{$trigger.body.message}}`
- `GoogleSheets` (append)
  - `operation`: `append`
  - `credentials_json`: `YOUR_GOOGLE_SERVICE_ACCOUNT_JSON`
  - `spreadsheet_id`: `YOUR_SPREADSHEET_ID`
  - `range`: `ChatHistory!A:C`
  - `values`: `[[{{$trigger.body.session_id}}, {{$trigger.body.message}}, {{$node.claudeai.response}}]]`
- `HTTPRequest`
  - `method`: `POST`
  - `url`: `YOUR_WEBHOOK_REPLY_URL`
  - `headers`: `{"Content-Type":"application/json"}`
  - `body`: `{"message":"{{$node.claudeai.response}}"}`

Test status: `[ ]`

---

## 11) AI Lead Scoring + Routing (Advanced)

- Difficulty: Advanced
- Nodes: `Webhook -> OpenAI -> Conditional -> Variable Setter -> Loop -> EmailSend + SlackMessage + GoogleSheets`
- Goal: Score incoming leads and route hot leads.

### Node Config

- `Webhook`
  - `allowed_methods`: `POST`
- `OpenAI`
  - `model`: `gpt-4`
  - `prompt`: `Score this lead from 0 to 100. Return number only.`
  - `input`: `Company {{$trigger.body.company}}, budget {{$trigger.body.budget}}, timeline {{$trigger.body.timeline}}, pain points {{$trigger.body.pain_points}}`
  - `temperature`: `0`
- `Conditional`
  - `left`: `{{$node.openai.response}}`
  - `operator`: `>=`
  - `right`: `70`
- `Variable Setter` (TRUE branch)
  - `variable_name`: `sales_team`
  - `value`: `["sales1@company.com", "sales2@company.com"]`
- `Loop` (TRUE branch)
  - `items`: `{{$vars.sales_team}}`
- `EmailSend` (from Loop)
  - `to`: `{{$node.loop.current_item}}`
  - `subject`: `Hot lead {{$trigger.body.company}}`
  - `body`: `Lead score {{$node.openai.response}}`
- `SlackMessage` (TRUE branch)
  - `token`: `YOUR_SLACK_BOT_TOKEN`
  - `channel`: `#sales-hot-leads`
  - `message`: `Hot lead {{$trigger.body.company}} score {{$node.openai.response}}`
- `GoogleSheets` (TRUE branch)
  - `operation`: `append`
  - `credentials_json`: `YOUR_GOOGLE_SERVICE_ACCOUNT_JSON`
  - `spreadsheet_id`: `YOUR_SPREADSHEET_ID`
  - `range`: `Leads!A:F`
  - `values`: `[[{{$trigger.body.company}}, {{$trigger.body.email}}, {{$node.openai.response}}, {{$trigger.timestamp}}, high-priority]]`

Test status: `[ ]`

---

## 12) Document Summarization Pipeline (Advanced)

- Difficulty: Advanced
- Nodes: `Webhook -> GoogleDrive -> Gemini -> Variable Setter -> Loop -> EmailSend + TelegramSend + GoogleSheets`
- Goal: Save a document, summarize it, and distribute summary.

### Node Config

- `Webhook`
  - `allowed_methods`: `POST`
- `GoogleDrive`
  - `operation`: `upload`
  - `credentials_json`: `YOUR_GOOGLE_SERVICE_ACCOUNT_JSON`
  - `file_name`: `doc_{{$trigger.timestamp}}.txt`
  - `file_content`: `{{$trigger.body.document_text}}`
- `Gemini`
  - `api_key`: `YOUR_GEMINI_API_KEY`
  - `model`: `gemini-1.5-pro`
  - `prompt`: `Summarize in 3 short paragraphs and include action items.`
  - `system_prompt`: `Be concise and practical.`
- `Variable Setter`
  - `variable_name`: `recipients`
  - `value`: `[{"email":"manager@company.com","telegram":"123456789"}]`
- `Loop`
  - `items`: `{{$vars.recipients}}`
- `EmailSend`
  - `to`: `{{$node.loop.current_item.email}}`
  - `subject`: `Document summary ready`
  - `body`: `{{$node.gemini.response}}\n\nFile URL: {{$node.google_drive.url}}`
- `TelegramSend`
  - `token`: `YOUR_TELEGRAM_BOT_TOKEN`
  - `chat_id`: `{{$node.loop.current_item.telegram}}`
  - `message`: `{{$node.gemini.response}}`
- `GoogleSheets`
  - `operation`: `append`
  - `credentials_json`: `YOUR_GOOGLE_SERVICE_ACCOUNT_JSON`
  - `spreadsheet_id`: `YOUR_SPREADSHEET_ID`
  - `range`: `Summaries!A:D`
  - `values`: `[[{{$trigger.timestamp}}, {{$node.google_drive.file_id}}, distributed, ok]]`

Test status: `[ ]`

---

## 13) Multi-API Monitoring Dashboard (Advanced)

- Difficulty: Advanced
- Nodes: `Scheduling -> Variable Setter -> Loop -> HTTPRequest -> JSONParser -> DataFormatter -> GoogleSheets -> Conditional -> SlackMessage`
- Goal: Poll multiple APIs and alert anomalies.

### Node Config

- `Scheduling`
  - `cron`: `*/30 * * * *`
  - `timezone`: `UTC`
- `Variable Setter`
  - `variable_name`: `apis`
  - `value`: `[{"url":"https://api1.example.com/data","name":"API1"},{"url":"https://api2.example.com/data","name":"API2"}]`
- `Loop`
  - `items`: `{{$vars.apis}}`
- `HTTPRequest`
  - `method`: `GET`
  - `url`: `{{$node.loop.current_item.url}}`
  - `timeout`: `15`
- `JSONParser`
  - `json_string`: `{{$node.http_request.response_text}}`
- `DataFormatter`
  - `input`: `{{$node.json_parser.parsed.value}}`
  - `operation`: `to_number`
- `GoogleSheets`
  - `operation`: `append`
  - `credentials_json`: `YOUR_GOOGLE_SERVICE_ACCOUNT_JSON`
  - `spreadsheet_id`: `YOUR_SPREADSHEET_ID`
  - `range`: `ApiMetrics!A:D`
  - `values`: `[[{{$node.loop.current_item.name}}, {{$node.data_formatter.formatted}}, {{$trigger.timestamp}}, {{$node.http_request.status_code}}]]`
- `Conditional`
  - `left`: `{{$node.data_formatter.formatted}}`
  - `operator`: `>`
  - `right`: `1000`
- `SlackMessage` (TRUE branch)
  - `token`: `YOUR_SLACK_BOT_TOKEN`
  - `channel`: `#alerts`
  - `message`: `Anomaly in {{$node.loop.current_item.name}} value {{$node.data_formatter.formatted}}`

Test status: `[ ]`

---

## 14) Customer Onboarding Sequence (Advanced)

- Difficulty: Advanced
- Nodes: `Webhook -> Stripe -> OpenAI -> Variable Setter -> Delay -> EmailSend -> Delay -> EmailSend -> GoogleSheets -> SlackMessage`
- Goal: Personalized onboarding journey after signup.

### Node Config

- `Webhook`
  - `allowed_methods`: `POST`
- `Stripe`
  - `operation`: `create_customer`
  - `api_key`: `YOUR_STRIPE_SECRET_KEY`
  - `customer_email`: `{{$trigger.body.email}}`
  - `customer_name`: `{{$trigger.body.name}}`
- `OpenAI`
  - `model`: `gpt-4`
  - `prompt`: `Create 2 onboarding emails for this user profile.`
  - `input`: `Industry {{$trigger.body.industry}}, goals {{$trigger.body.goals}}`
  - `temperature`: `0.8`
- `Variable Setter`
  - `variable_name`: `onboarding_sequence`
  - `value`: `{{$node.openai.response}}`
- `Delay`
  - `duration`: `5`
- `EmailSend` (first)
  - `to`: `{{$trigger.body.email}}`
  - `subject`: `Welcome {{$trigger.body.name}}`
  - `body`: `{{$vars.onboarding_sequence}}`
- `Delay` (second)
  - `duration`: `10`
- `EmailSend` (second)
  - `to`: `{{$trigger.body.email}}`
  - `subject`: `Next step for your onboarding`
  - `body`: `Checking in after your first steps.`
- `GoogleSheets`
  - `operation`: `append`
  - `credentials_json`: `YOUR_GOOGLE_SERVICE_ACCOUNT_JSON`
  - `spreadsheet_id`: `YOUR_SPREADSHEET_ID`
  - `range`: `Onboarding!A:E`
  - `values`: `[[{{$trigger.body.email}}, {{$node.stripe.customer_id}}, {{$trigger.timestamp}}, onboarding_started, active]]`
- `SlackMessage`
  - `token`: `YOUR_SLACK_BOT_TOKEN`
  - `channel`: `#new-customers`
  - `message`: `New onboarding started for {{$trigger.body.email}}`

Test status: `[ ]`

---

## 15) AI Content Factory (Advanced)

- Difficulty: Advanced
- Nodes: `Scheduling -> HTTPRequest -> Groq -> ClaudeAI -> OpenAI -> DataFormatter -> GoogleDrive -> Conditional -> Variable Setter -> Loop -> EmailSend + TelegramSend + SlackMessage + GoogleSheets`
- Goal: Generate, optimize, save, and distribute weekly content draft.

### Node Config

- `Scheduling`
  - `cron`: `0 10 * * 1`
  - `timezone`: `Asia/Karachi`
- `HTTPRequest`
  - `method`: `GET`
  - `url`: `https://newsapi.org/v2/top-headlines?country=us&apiKey=YOUR_API_KEY`
- `Groq`
  - `api_key`: `YOUR_GROQ_API_KEY`
  - `model`: `llama-3.3-70b-versatile`
  - `prompt`: `Create a blog outline from this trend data: {{$node.http_request.response_text}}`
- `ClaudeAI`
  - `model`: `claude-3-opus`
  - `prompt`: `Write a 1000-word blog post from this outline.`
  - `input`: `{{$node.groq.response}}`
- `OpenAI`
  - `model`: `gpt-4`
  - `prompt`: `Optimize this article for SEO. Add title, meta description, keywords.`
  - `input`: `{{$node.claudeai.response}}`
- `DataFormatter`
  - `input`: `{{$node.openai.response}}`
  - `operation`: `trim`
- `GoogleDrive`
  - `operation`: `upload`
  - `credentials_json`: `YOUR_GOOGLE_SERVICE_ACCOUNT_JSON`
  - `file_name`: `blog_{{$trigger.timestamp}}.txt`
  - `file_content`: `{{$node.data_formatter.formatted}}`
- `Conditional`
  - `left`: `{{$node.claudeai.usage.output_tokens}}`
  - `operator`: `>=`
  - `right`: `800`
- `Variable Setter` (TRUE branch)
  - `variable_name`: `team`
  - `value`: `[{"email":"editor@company.com","telegram":"123456"},{"email":"seo@company.com","telegram":"789101"}]`
- `Loop` (TRUE branch)
  - `items`: `{{$vars.team}}`
- `EmailSend` (from Loop)
  - `to`: `{{$node.loop.current_item.email}}`
  - `subject`: `New blog draft ready`
  - `body`: `{{$node.data_formatter.formatted}}`
- `TelegramSend` (from Loop)
  - `token`: `YOUR_TELEGRAM_BOT_TOKEN`
  - `chat_id`: `{{$node.loop.current_item.telegram}}`
  - `message`: `New blog draft ready. Check email.`
- `SlackMessage` (TRUE branch)
  - `token`: `YOUR_SLACK_BOT_TOKEN`
  - `channel`: `#content-team`
  - `message`: `New content draft created. Drive URL: {{$node.google_drive.url}}`
- `GoogleSheets` (TRUE branch)
  - `operation`: `append`
  - `credentials_json`: `YOUR_GOOGLE_SERVICE_ACCOUNT_JSON`
  - `spreadsheet_id`: `YOUR_SPREADSHEET_ID`
  - `range`: `ContentLog!A:F`
  - `values`: `[[{{$trigger.timestamp}}, content_draft, {{$node.google_drive.url}}, {{$node.claudeai.usage.output_tokens}}, ready, distributed]]`

Test status: `[ ]`

---

## Quick Testing Order Recommendation

1. Start with workflows `1, 2, 3` to validate core trigger and communication nodes.
2. Then run `6, 7, 9` to validate AI + branching + integrations.
3. Finally test advanced chains `11-15` after credentials and sheet/drive setup are confirmed.

## Notes

- If a node expects JSON, always pass valid JSON strings.
- If expression paths fail, verify node IDs and output field names from test output.
- For branch logic, ensure `Conditional` true/false paths are connected correctly.

---

## HTTPRequest Node Reference

The HTTPRequest node can make requests to any API or website. Below are common usage patterns:

### Example 1: Simple GET (Uptime Check - Workflow #2)
```
method: GET
url: https://yourwebsite.com
headers: (leave empty)
body: (leave empty)
query_params: (leave empty)
timeout: 10
```
**Output:** `status_code`, `response_body`, `ok`

---

### Example 2: GET with Query Parameters (e.g., Weather API)
```
method: GET
url: https://api.openweathermap.org/data/2.5/weather
query_params: {"q": "Lahore", "appid": "YOUR_API_KEY", "units": "metric"}
headers: (leave empty)
body: (leave empty)
timeout: 10
```
**Result:** URL becomes `https://api.openweathermap.org/data/2.5/weather?q=Lahore&appid=YOUR_API_KEY&units=metric`

---

### Example 3: POST with Headers and Body (e.g., Slack Webhook)
```
method: POST
url: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
headers: {"Content-Type": "application/json"}
body: {"text": "Hello {{$node.prev.message}}", "channel": "#alerts"}
query_params: (leave empty)
timeout: 10
```
**Note:** Some APIs prefer headers in body; check their docs.

---

### Example 4: API Call with Authentication
```
method: GET
url: https://api.stripe.com/v1/customers
headers: {"Authorization": "Bearer sk_live_YOUR_STRIPE_KEY", "Accept": "application/json"}
query_params: {"limit": "10"}
body: (leave empty)
timeout: 15
```

---

### Example 5: POST with Dynamic Body (e.g., Creating Payment)
```
method: POST
url: https://api.stripe.com/v1/payment_intents
headers: {"Authorization": "Bearer {{$vars.stripe_key}}", "Content-Type": "application/x-www-form-urlencoded"}
body: {"amount": "{{$trigger.body.amount}}", "currency": "usd"}
timeout: 20
```

---

### Output Fields Reference
Every HTTPRequest returns:
- `status_code` (number): 200, 404, 500, etc.
- `response_body` (object): Parsed JSON response
- `response_text` (string): Raw response as text
- `ok` (boolean): True if status 200-299
- `headers` (object): Response headers key-value pairs

### Tips
- **Headers are optional** unless the API requires authentication or specific content-type
- **Body is only for POST/PUT/PATCH** - GET requests don't have bodies
- **Query params flatten into URL** - e.g., `?key1=val1&key2=val2`
- **Variable support:** Use `{{$node.x.field}}`, `{{$trigger.x}}`, `{{$vars.x}}` anywhere
- **JSON formatting:** Headers and body must be valid JSON or wrapped in quotes
