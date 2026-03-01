# NexAgent — Chatbot & LLM Integration Guide

> **Purpose:** This document teaches an LLM (ChatGPT, Claude, Groq, Gemini, GitHub Copilot, etc.)
> everything it needs to understand NexAgent's workflow system and generate valid, executable
> workflows — either as JSON for the API, or by controlling the canvas via MCP.

---

## 1. What Is a DAG and How NexAgent Uses It

### Directed Acyclic Graph (DAG)
A **DAG** is a graph where:
- Each **node** is a unit of work (send email, call API, run AI, etc.)
- Each **edge** is a directed connection (A → B means "run B after A finishes")
- **Acyclic** means no circular paths — execution always flows forward, never loops back

```
ManualTrigger ──→ HttpRequest ──→ Groq ──→ SendEmail
                                    │
                                    └──→ Logger
```

### How NexAgent Executes a DAG

1. **Find the start node** — the node with `is_trigger: true` or no incoming connections
2. **BFS traversal** — Breadth-First Search processes nodes level by level
3. **Before each node runs**, all `{{...}}` expressions in its config are resolved against previous outputs
4. **Each node's output** is stored in context and becomes available to all downstream nodes
5. **Conditional branching** — `IfCondition` outputs `branch: "true"` or `branch: "false"`, and connections tagged with `"true"` or `"false"` are followed accordingly
6. **Loop** — special handling: downstream nodes are re-executed once per item in the list

### Key Engine Files
| File | Role |
|------|------|
| `backend/executor/engine.py` | DAG runner — BFS traversal, branching, loop handling |
| `backend/executor/resolver.py` | Substitutes `{{$node.x.y}}` before each node runs |
| `backend/executor/context.py` | Holds trigger output, node outputs, variables, logs |
| `backend/nodes/registry.py` | Auto-discovers all `BaseNode` subclasses on startup |
| `backend/nodes/base.py` | `BaseNode` ABC, `NodeDefinition`, `NodeParameter` models |

---

## 2. Workflow JSON Schema

This is the exact format accepted by `POST /api/v1/workflows/{id}/execute`:

```json
{
  "id": "wf_unique_id",
  "name": "My Workflow",
  "nodes": [
    {
      "id": "n1",
      "type": "ManualTrigger",
      "name": "Start",
      "config": {}
    },
    {
      "id": "n2",
      "type": "Logger",
      "name": "Log Message",
      "config": {
        "message": "Hello from {{$node.n1.input_data}}"
      }
    }
  ],
  "connections": [
    {
      "from": "n1",
      "to": "n2",
      "condition": null
    }
  ]
}
```

### nodes[ ] — Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique node ID within this workflow (e.g. `"n1"`, `"node_abc"`) |
| `type` | string | ✅ | Exact backend node type (e.g. `"ManualTrigger"`, `"Groq"`) |
| `name` | string | ❌ | Display name shown in logs |
| `config` | object | ✅ | Key-value pairs for all node parameters |

### connections[ ] — Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `from` | string | ✅ | Source node ID |
| `to` | string | ✅ | Target node ID |
| `condition` | string \| null | ❌ | `"true"`, `"false"`, or `null` (for IfCondition branching) |

---

## 3. Variable / Expression Syntax

Variables are written as `{{...}}` inside any string config value and are resolved before the node executes.

### Syntax Reference

| Syntax | Resolves to | Example |
|--------|-------------|---------|
| `{{$trigger.field}}` | Field from trigger node output | `{{$trigger.input_data.message}}` |
| `{{$trigger.input_data}}` | Full trigger input object | — |
| `{{$node.nodeId.field}}` | Field from a specific node's output | `{{$node.n2.response}}` |
| `{{$node.nodeId.field.subfield}}` | Nested dot-notation access | `{{$node.n2.data.0.Topic}}` |
| `{{$vars.varName}}` | Workflow variable set by SetVariable | `{{$vars.myScore}}` |

### Type Preservation
- **Pure expression** (`"{{$node.n2.amount}}"` — nothing else in the string): resolved to the raw Python type (int, float, bool, dict, list)
- **Mixed string** (`"Score: {{$node.n2.amount}} points"`): resolved to a string with the value interpolated
- **Array access** via dot-notation index: `{{$node.n2.data.0.Topic}}` → first element of `data` array, key `Topic`

### Examples
```
"{{$node.n3.response}}"                     → full AI response string
"Summary: {{$node.n3.response}}"            → string with AI response embedded
"{{$node.n2.data.0.Topic}}"                 → first row's Topic column from Sheets
"{{$vars.score}}"                           → variable named "score"
"{{$trigger.input_data.message}}"           → message from ChatInput trigger
```

---

## 4. Complete Node Catalog

### 4.1 Triggers

#### `ManualTrigger`
Starts the workflow immediately when Execute is clicked.
```json
{ "id": "n1", "type": "ManualTrigger", "config": {} }
```
**Output:** `{ "input_data": {} }`

---

#### `Schedule`
Runs the workflow on a cron schedule.
```json
{
  "id": "n1", "type": "Schedule",
  "config": {
    "cron": "*/5 * * * *",
    "timezone": "UTC"
  }
}
```
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `cron` | string | `"*/1 * * * *"` | Cron expression (min hour dom month dow) |
| `timezone` | string | `"UTC"` | e.g. `"America/New_York"`, `"Asia/Karachi"` |

**Output:** `{ "triggered_at": "2026-03-01T10:00:00Z", "cron": "*/5 * * * *" }`

---

#### `Webhook`
Exposes an HTTP endpoint that triggers the workflow.
Endpoint: `POST /api/v1/workflows/{id}/webhook`
```json
{ "id": "n1", "type": "Webhook", "config": {} }
```
**Output:** `{ "body": {...}, "headers": {...}, "method": "POST" }`
Access body fields via `{{$trigger.body.fieldName}}`

---

#### `ChatInput`
Opens a chat interface. When user sends a message it triggers the workflow.
```json
{
  "id": "n1", "type": "ChatInput",
  "config": { "session_id": "session_abc" }
}
```
**Output:** `{ "message": "user typed text", "session_id": "...", "timestamp": "..." }`
Access via `{{$node.n1.message}}`

---

### 4.2 Actions

#### `Logger`
Prints a message to the execution output panel.
```json
{
  "id": "n2", "type": "Logger",
  "config": {
    "message": "Hello {{$node.n1.message}}",
    "level": "info"
  }
}
```
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `message` | expression | — | Message to log (required) |
| `level` | string | `"info"` | `"info"` \| `"warning"` \| `"error"` |
| `include_input` | boolean | `false` | Also log the input data |

**Output:** `{ "message": "resolved message", "level": "info", "timestamp": "..." }`

---

#### `HttpRequest`
Makes an HTTP call to any external API.
```json
{
  "id": "n2", "type": "HttpRequest",
  "config": {
    "method": "GET",
    "url": "https://api.example.com/data",
    "headers": { "Authorization": "Bearer token" },
    "timeout": 30
  }
}
```
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `method` | string | `"GET"` | `GET` \| `POST` \| `PUT` \| `PATCH` \| `DELETE` |
| `url` | expression | — | Full URL (required) |
| `headers` | object | `{}` | Request headers |
| `body` | expression | — | Request body (for POST/PUT) |
| `timeout` | number | `30` | Timeout in seconds |

**Output:** `{ "status_code": 200, "response_body": "...", "headers": {...} }`

---

#### `SendEmail`
Sends an email via SMTP.
```json
{
  "id": "n3", "type": "SendEmail",
  "config": {
    "to": "user@example.com",
    "subject": "Report Ready",
    "body": "{{$node.n2.response}}",
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "smtp_user": "you@gmail.com",
    "smtp_pass": "your-app-password",
    "is_html": true
  }
}
```
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | expression | ✅ | Recipient(s), comma-separated |
| `subject` | expression | ✅ | Email subject |
| `body` | expression | ✅ | Email body (plain text or HTML) |
| `smtp_host` | string | ✅ | e.g. `smtp.gmail.com` |
| `smtp_port` | number | ❌ | `587` (TLS) or `465` (SSL) |
| `smtp_user` | string | ✅ | SMTP login email |
| `smtp_pass` | string | ✅ | SMTP password / app password |
| `from_email` | string | ❌ | Sender address (defaults to smtp_user) |
| `from_name` | string | ❌ | Sender display name (default: `"NexAgent"`) |
| `is_html` | boolean | ❌ | `true` to send body as HTML |

**Output:** `{ "sent": true, "message_id": "<uuid@nexagent>", "sent_at": "...", "to": "..." }`

---

#### `SlackMessage`
Posts a message to a Slack channel via Bot Token.
```json
{
  "id": "n3", "type": "SlackMessage",
  "config": {
    "token": "xoxb-...",
    "channel": "#general",
    "message": "Alert: {{$node.n2.response}}",
    "username": "NexAgent"
  }
}
```
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | ✅ | Slack Bot Token (`xoxb-...`). Requires `chat:write` scope |
| `channel` | expression | ✅ | `#channel-name` or channel ID |
| `message` | expression | ✅ | Message text |
| `username` | string | ❌ | Bot display name (default: `"NexAgent"`) |

**Output:** `{ "sent": true, "timestamp": "...", "channel": "...", "sent_at": "..." }`

---

#### `TelegramSend`
Sends a message via Telegram Bot API.
```json
{
  "id": "n3", "type": "TelegramSend",
  "config": {
    "token": "1234567890:AAFxxx...",
    "chat_id": "7053843621",
    "message": "Hello {{$vars.name}}!",
    "parse_mode": "HTML"
  }
}
```
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | ✅ | Bot Token from @BotFather |
| `chat_id` | expression | ✅ | User ID, group ID, or `@channel` |
| `message` | expression | ✅ | Message text |
| `parse_mode` | string | ❌ | `"HTML"` \| `"Markdown"` (default: `"HTML"`) |

**Note:** Requires VPN if Telegram is blocked by ISP.
**Output:** `{ "sent": true, "message_id": 123, "chat_id": "...", "sent_at": "..." }`

---

### 4.3 Logic

#### `Delay`
Pauses workflow execution for a specified time.
```json
{
  "id": "n2", "type": "Delay",
  "config": { "duration": 5, "unit": "seconds" }
}
```
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `duration` | number | `1` | How long to wait |
| `unit` | string | `"seconds"` | `"ms"` \| `"milliseconds"` \| `"seconds"` \| `"minutes"` (max 1 hour) |

**Output:** `{ "slept_ms": 5000, "duration": 5, "unit": "seconds" }`

---

#### `IfCondition`
Branches workflow into true/false paths.
```json
{
  "id": "n3", "type": "IfCondition",
  "config": {
    "left": "{{$vars.score}}",
    "operator": ">=",
    "right": "50"
  }
}
```
| Param | Type | Description |
|-------|------|-------------|
| `left` | expression | Left side of comparison |
| `operator` | string | `"=="` \| `"!="` \| `">"` \| `">="` \| `"<"` \| `"<="` \| `"contains"` \| `"startsWith"` \| `"endsWith"` |
| `right` | expression | Right side of comparison |

**Output:** `{ "result": true, "branch": "true", "left": "85", "right": "50", "operator": ">=" }`
**Connection rule:** Use `"condition": "true"` and `"condition": "false"` on outgoing connections.

---

#### `Loop`
Iterates a downstream subgraph once per item in a list.
```json
{
  "id": "n3", "type": "Loop",
  "config": { "items": "{{$node.n2.parsed}}" }
}
```
| Param | Type | Description |
|-------|------|-------------|
| `items` | expression | Array to iterate over |

**Per-iteration output (available in loop body):**
```json
{
  "items": ["apple", "banana", "cherry"],
  "current_item": "apple",
  "index": 0,
  "total": 3,
  "is_last": false
}
```
Access current item: `{{$node.loopNodeId.current_item}}`

---

#### `Stopper`
Marks a terminal endpoint in the workflow. Useful to cleanly end a branch.
```json
{ "id": "n9", "type": "Stopper", "config": {} }
```
**Output:** `{ "stopped": true, "message": "Workflow stopped", "timestamp": "..." }`

---

### 4.4 Data

#### `SetVariable`
Stores a value as a named workflow variable.
```json
{
  "id": "n2", "type": "SetVariable",
  "config": { "name": "myScore", "value": "85" }
}
```
| Param | Type | Description |
|-------|------|-------------|
| `name` | string | Variable name |
| `value` | expression | Value to store |

**Output:** `{ "name": "myScore", "value": "85" }`
**Access later:** `{{$vars.myScore}}`

---

#### `JsonParser`
Parses a JSON string into a Python object.
```json
{
  "id": "n2", "type": "JsonParser",
  "config": { "json_string": "[\"apple\", \"banana\"]" }
}
```
| Param | Type | Description |
|-------|------|-------------|
| `json_string` | expression | JSON string to parse |

**Output:** `{ "parsed": [...], "keys": [...], "type": "array", "length": 2 }`
Access parsed data: `{{$node.n2.parsed}}`

---

#### `DataFormatter`
Transforms a string value.
```json
{
  "id": "n3", "type": "DataFormatter",
  "config": {
    "input": "{{$vars.myText}}",
    "operation": "uppercase"
  }
}
```
| Param | `operation` values |
|-------|-------------------|
| `input` | expression — the string to transform |
| `operation` | `"uppercase"` \| `"lowercase"` \| `"capitalize"` \| `"trim"` \| `"reverse"` \| `"length"` \| `"word_count"` |

**Output:** `{ "result": "TRANSFORMED TEXT", "original": "...", "operation": "uppercase" }`

---

### 4.5 AI Nodes

All AI nodes share the same output structure:
```json
{ "response": "AI text", "model": "model-name", "prompt_tokens": 50, "completion_tokens": 200, "finish_reason": "stop" }
```
Access response: `{{$node.nodeId.response}}`

---

#### `Groq` — Free tier
```json
{
  "id": "n3", "type": "Groq",
  "config": {
    "api_key": "gsk_...",
    "model": "llama-3.3-70b-versatile",
    "system_prompt": "You are a helpful assistant.",
    "prompt": "Summarize: {{$node.n2.response_body}}",
    "temperature": 0.7,
    "max_tokens": 1024
  }
}
```
| Param | Default | Models available |
|-------|---------|-----------------|
| `model` | `llama-3.3-70b-versatile` | `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `llama3-8b-8192`, `mixtral-8x7b-32768`, `gemma2-9b-it` |
| `temperature` | `0.7` | 0–2 |
| `max_tokens` | `1024` | 1–32768 |

Get free key: **console.groq.com**

---

#### `Gemini` — Free tier
```json
{
  "id": "n3", "type": "Gemini",
  "config": {
    "api_key": "AIza...",
    "model": "gemini-2.0-flash",
    "system_prompt": "You are a data analyst.",
    "prompt": "Analyze: {{$node.n2.response_body}}",
    "temperature": 0.7,
    "max_tokens": 1024
  }
}
```
| Param | Default | Models available |
|-------|---------|-----------------|
| `model` | `gemini-2.0-flash` | `gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-1.5-pro` |

Get free key: **aistudio.google.com**

---

#### `OpenAI` — Paid
```json
{
  "id": "n3", "type": "OpenAI",
  "config": {
    "api_key": "sk-...",
    "model": "gpt-4o-mini",
    "system_prompt": "You are a helpful assistant.",
    "prompt": "{{$node.n2.message}}",
    "temperature": 0.7,
    "max_tokens": 1000
  }
}
```
Models: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `gpt-3.5-turbo`

---

#### `ClaudeAI` — Paid
```json
{
  "id": "n3", "type": "ClaudeAI",
  "config": {
    "api_key": "sk-ant-...",
    "model": "claude-3-5-sonnet-20241022",
    "system_prompt": "You are a helpful assistant.",
    "prompt": "{{$node.n2.message}}",
    "temperature": 0.7,
    "max_tokens": 1000
  }
}
```

---

### 4.6 Integrations

#### `GoogleSheets`
```json
{
  "id": "n2", "type": "GoogleSheets",
  "config": {
    "operation": "read",
    "credentials_json": "{\"type\":\"service_account\",...}",
    "spreadsheet_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
    "range": "Sheet1!A1:D100",
    "values": "[[\"Name\",\"Age\"],[\"Alice\",\"30\"]]"
  }
}
```
| `operation` | Required params | Description |
|-------------|-----------------|-------------|
| `read` | `spreadsheet_id`, `range` | Returns rows as array of objects (first row = headers) |
| `append` | `spreadsheet_id`, `range`, `values` | Appends rows to sheet |
| `update` | `spreadsheet_id`, `range`, `values` | Overwrites range |

**Output:** `{ "data": [{...}], "rows_affected": 5, "range": "Sheet1!A1:D6", "operation": "read" }`
**Note:** Share the sheet with the service account email (Viewer/Editor).

---

#### `GoogleDrive`
```json
{
  "id": "n3", "type": "GoogleDrive",
  "config": {
    "operation": "upload",
    "credentials_json": "{\"type\":\"service_account\",...}",
    "folder_id": "1ABC123...",
    "file_name": "report.html",
    "file_content": "{{$node.n2.response}}"
  }
}
```
| `operation` | Required params | Description |
|-------------|-----------------|-------------|
| `list` | — | Lists files (optional: `folder_id`, `query`, `limit`) |
| `download` | `file_id` | Returns file content as string |
| `upload` | `file_name`, `file_content` | Creates a text file (optional: `folder_id`) |
| `delete` | `file_id` | Permanently deletes a file |

**Output:** `{ "file_id": "...", "name": "...", "url": "...", "content": "...", "files": [...] }`

---

#### `Stripe`
```json
{
  "id": "n2", "type": "Stripe",
  "config": {
    "operation": "create_payment_intent",
    "api_key": "sk_test_...",
    "amount": 1000,
    "currency": "usd"
  }
}
```
| `operation` | Required params | Description |
|-------------|-----------------|-------------|
| `create_payment_intent` | `amount`, `currency` | Creates intent (status: `requires_payment_method`) |
| `retrieve_payment_intent` | `payment_intent_id` | Fetches a payment intent |
| `create_customer` | `customer_email` | Creates a Stripe customer |
| `retrieve_customer` | `customer_id` | Fetches customer by ID |
| `list_charges` | — | Lists recent charges (optional: `limit`) |

**Output:** `{ "payment_id": "pi_...", "status": "...", "amount": 1000, "currency": "usd", "client_secret": "...", "customer_id": "...", "data": {...} }`

---

## 5. Connection Rules

### Standard (linear)
```json
{ "from": "n1", "to": "n2", "condition": null }
```

### IfCondition branching
```json
{ "from": "n3", "to": "n4", "condition": "true" },
{ "from": "n3", "to": "n5", "condition": "false" }
```
The engine checks `node_output["branch"]` (`"true"` or `"false"`) after IfCondition runs and follows the matching connection.

### Loop body
```json
{ "from": "n_loop", "to": "n_body", "condition": null }
```
All nodes reachable from the Loop node form the loop body and are re-executed for each item. The main traversal skips them after the loop completes.

### Fan-out (multiple outputs from one node)
```json
{ "from": "n2", "to": "n3", "condition": null },
{ "from": "n2", "to": "n4", "condition": null }
```
Both n3 and n4 run after n2 — useful for sending to both Slack and Email simultaneously.

---

## 6. Complete Workflow Examples

### 6.1 Simple Linear — HTTP + AI + Email
```json
{
  "id": "wf_ai_report",
  "name": "Fetch Data → AI Analysis → Email",
  "nodes": [
    { "id": "n1", "type": "ManualTrigger", "config": {} },
    {
      "id": "n2", "type": "HttpRequest",
      "config": { "method": "GET", "url": "https://jsonplaceholder.typicode.com/posts?_limit=5" }
    },
    {
      "id": "n3", "type": "Groq",
      "config": {
        "api_key": "gsk_...",
        "model": "llama-3.3-70b-versatile",
        "system_prompt": "You are a data analyst. Be concise.",
        "prompt": "Analyze these blog posts and list 3 key themes in bullet points:\n\n{{$node.n2.response_body}}"
      }
    },
    {
      "id": "n4", "type": "SendEmail",
      "config": {
        "to": "you@example.com",
        "subject": "AI Content Analysis",
        "body": "<h2>AI Analysis</h2><p>{{$node.n3.response}}</p>",
        "smtp_host": "smtp.gmail.com",
        "smtp_port": 587,
        "smtp_user": "you@gmail.com",
        "smtp_pass": "app-password",
        "is_html": true
      }
    }
  ],
  "connections": [
    { "from": "n1", "to": "n2", "condition": null },
    { "from": "n2", "to": "n3", "condition": null },
    { "from": "n3", "to": "n4", "condition": null }
  ]
}
```

### 6.2 Conditional — Score Grader
```json
{
  "id": "wf_score_grader",
  "name": "Score → Pass/Fail Notification",
  "nodes": [
    { "id": "n1", "type": "ManualTrigger", "config": {} },
    { "id": "n2", "type": "SetVariable", "config": { "name": "score", "value": "72" } },
    {
      "id": "n3", "type": "IfCondition",
      "config": { "left": "{{$vars.score}}", "operator": ">=", "right": "60" }
    },
    { "id": "n4", "type": "Logger", "config": { "message": "✅ PASS — Score: {{$vars.score}}" } },
    { "id": "n5", "type": "Logger", "config": { "message": "❌ FAIL — Score: {{$vars.score}}" } }
  ],
  "connections": [
    { "from": "n1", "to": "n2", "condition": null },
    { "from": "n2", "to": "n3", "condition": null },
    { "from": "n3", "to": "n4", "condition": "true" },
    { "from": "n3", "to": "n5", "condition": "false" }
  ]
}
```

### 6.3 Loop — Batch AI Processing
```json
{
  "id": "wf_batch_ai",
  "name": "Batch AI Descriptions",
  "nodes": [
    { "id": "n1", "type": "ManualTrigger", "config": {} },
    {
      "id": "n2", "type": "JsonParser",
      "config": { "json_string": "[\"Python\", \"JavaScript\", \"Rust\"]" }
    },
    {
      "id": "n3", "type": "Loop",
      "config": { "items": "{{$node.n2.parsed}}" }
    },
    {
      "id": "n4", "type": "Groq",
      "config": {
        "api_key": "gsk_...",
        "model": "llama-3.1-8b-instant",
        "prompt": "In one sentence, what is {{$node.n3.current_item}} best used for?"
      }
    },
    {
      "id": "n5", "type": "Logger",
      "config": { "message": "{{$node.n3.current_item}}: {{$node.n4.response}}" }
    }
  ],
  "connections": [
    { "from": "n1", "to": "n2", "condition": null },
    { "from": "n2", "to": "n3", "condition": null },
    { "from": "n3", "to": "n4", "condition": null },
    { "from": "n4", "to": "n5", "condition": null }
  ]
}
```

### 6.4 Google Sheets → Groq → Email (Article Generator)
```json
{
  "id": "wf_article_gen",
  "name": "Sheets Topic → AI Article → Email",
  "nodes": [
    { "id": "n1", "type": "ManualTrigger", "config": {} },
    {
      "id": "n2", "type": "GoogleSheets",
      "config": {
        "operation": "read",
        "credentials_json": "{\"type\":\"service_account\",...}",
        "spreadsheet_id": "YOUR_SHEET_ID",
        "range": "Sheet1!A1:A2"
      }
    },
    {
      "id": "n3", "type": "Groq",
      "config": {
        "api_key": "gsk_...",
        "model": "llama-3.3-70b-versatile",
        "system_prompt": "You are a professional HTML blog writer. Return ONLY valid HTML, no markdown.",
        "prompt": "The following JSON contains a blog topic. Write a complete HTML article about it.\n\nData: {{$node.n2.data}}\n\nFormat: <article><h1>Title</h1><h2>Section</h2><p>...</p></article>",
        "max_tokens": 2048
      }
    },
    {
      "id": "n4", "type": "SendEmail",
      "config": {
        "to": "you@example.com",
        "subject": "AI Generated Article",
        "body": "{{$node.n3.response}}",
        "smtp_host": "smtp.gmail.com",
        "smtp_port": 587,
        "smtp_user": "you@gmail.com",
        "smtp_pass": "app-password",
        "is_html": true
      }
    }
  ],
  "connections": [
    { "from": "n1", "to": "n2", "condition": null },
    { "from": "n2", "to": "n3", "condition": null },
    { "from": "n3", "to": "n4", "condition": null }
  ]
}
```

---

## 7. Available Node Types (Quick Reference)

```
TRIGGERS:   ManualTrigger | Schedule | Webhook | ChatInput
ACTIONS:    Logger | HttpRequest | SendEmail | SlackMessage | TelegramSend
LOGIC:      Delay | IfCondition | Loop | Stopper
DATA:       SetVariable | JsonParser | DataFormatter
AI:         Groq | Gemini | OpenAI | ClaudeAI
INTEGRATIONS: GoogleSheets | GoogleDrive | Stripe
```

All 21 node type strings are case-sensitive and must match exactly.

---

## 8. API Endpoints

### Execute a Workflow
```
POST /api/v1/workflows/{workflow_id}/execute
Content-Type: application/json

Body: { ...workflow JSON... }
```

### Get All Node Schemas (LLM catalog)
```
GET /api/v1/nodes
```
Returns full schema for all 21 nodes — parameter names, types, descriptions, options.
Feed this to an LLM as its system context.

### Trigger via Webhook
```
POST /api/v1/workflows/{workflow_id}/webhook
Content-Type: application/json

Body: { "any": "data" }
```

---

## 9. MCP Integration Design

**Goal:** Let a chatbot user describe a workflow in plain English and have the chatbot
generate and configure it on the NexAgent canvas automatically — like GitHub Copilot for workflows.

### Concept Architecture

```
User (natural language)
       ↓
   Chatbot / LLM
  (system prompt = this guide + GET /api/v1/nodes catalog)
       ↓
   Generates workflow JSON
       ↓
   MCP Server  ←→  NexAgent API
       ↓
   Canvas updated / workflow saved + executed
```

### MCP Tools to Implement

```typescript
// Tool 1: Get available nodes and their full schemas
get_node_catalog() → NodeDefinition[]

// Tool 2: Create or update a workflow
save_workflow(workflow: WorkflowJSON) → { id: string, saved: boolean }

// Tool 3: Execute a workflow
execute_workflow(workflow_id: string, input?: object) → ExecutionResult

// Tool 4: Get execution logs
get_execution_logs(execution_id: string) → NodeLog[]

// Tool 5: List existing workflows
list_workflows() → WorkflowSummary[]
```

### LLM System Prompt Template

Copy this into your chatbot system prompt:

```
You are NexAgent Workflow Assistant. You help users build automation workflows.

AVAILABLE NODES:
[Paste output of GET /api/v1/nodes here]

WORKFLOW JSON FORMAT:
{
  "id": "wf_<unique>",
  "name": "...",
  "nodes": [{ "id": "n1", "type": "NodeType", "config": {...} }],
  "connections": [{ "from": "n1", "to": "n2", "condition": null }]
}

RULES:
1. Node IDs must be unique strings within the workflow (n1, n2, n3, ...)
2. The first node must be a trigger (ManualTrigger, Schedule, Webhook, or ChatInput)
3. Use {{$node.nodeId.field}} to reference previous node outputs
4. Use {{$vars.name}} to reference SetVariable values
5. IfCondition connections must have "condition": "true" or "condition": "false"
6. Loop connections to body nodes use "condition": null
7. All node type strings are case-sensitive

When the user describes a workflow:
1. Ask any required credential questions (API keys, SMTP, etc.)
2. Generate the complete workflow JSON
3. Explain what each node does
4. Call save_workflow() then execute_workflow() via MCP

When a workflow fails, read the execution logs and explain which node failed and why.
```

### Example Interaction

**User:** "I want a workflow that fetches today's weather and sends it to my Slack every morning"

**LLM response:**
1. Asks for: Slack Bot Token, channel name, weather API key (or uses free endpoint), timezone
2. Generates:
```json
{
  "nodes": [
    { "id": "n1", "type": "Schedule", "config": { "cron": "0 8 * * *", "timezone": "Asia/Karachi" } },
    { "id": "n2", "type": "HttpRequest", "config": { "method": "GET", "url": "https://wttr.in/Lahore?format=3" } },
    { "id": "n3", "type": "SlackMessage", "config": { "token": "xoxb-...", "channel": "#general", "message": "🌤️ Today's weather: {{$node.n2.response_body}}" } }
  ],
  "connections": [
    { "from": "n1", "to": "n2", "condition": null },
    { "from": "n2", "to": "n3", "condition": null }
  ]
}
```
3. Calls `save_workflow()` → canvas updates
4. Confirms: "Workflow saved! It will post weather to #general at 8 AM Karachi time daily."

---

## 10. Error Handling Reference

| Error | Cause | Fix |
|-------|-------|-----|
| `Unknown node type 'X'` | Type string mismatch | Check exact casing in Section 7 |
| `Missing required config field 'X'` | Required param not in config | Add the missing field |
| `[missing: nodeId.field]` | Referenced node ID doesn't exist | Check node IDs match exactly |
| `Slack API error: missing_scope` | Bot token lacks permission | Add `chat:write` scope, reinstall app |
| `ConnectTimeout` | Server can't reach external API | Check network/VPN |
| `Failed to authenticate with Google` | Invalid service account JSON | Re-paste full JSON, check API is enabled |
| `Stripe error: ...` | Stripe API rejected request | Check secret key and operation params |

---

*Guide version: 2026-03-01 — covers all 21 nodes in NexAgent backend.*
