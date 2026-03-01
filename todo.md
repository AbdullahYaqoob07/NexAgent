# NexAgent — Node Testing Checklist
> Ordered easiest → hardest. Check off each node once it has been tested end-to-end
> (backend executes correctly + frontend UX animation plays).

---

## ✅ Tested & Working

- [x] **ManualTrigger** — instant trigger, no config required
- [x] **Delay** — sleeps N seconds/minutes/ms; unit aliases fixed; 1-hour cap
- [x] **Stopper** — marks workflow end; no external deps
- [x] **Logger** — `ManualTrigger → Logger(message="Hello NexAgent!")` → terminal output: "Hello NexAgent!"
- [x] **SetVariable** — `ManualTrigger → SetVariable(name="myVar", value="Hello") → Logger(message="{{$vars.myVar}}")` → terminal: "Hello"
- [x] **JsonParser** — `ManualTrigger → JsonParser(json_string='["a","b","c"]') → Logger(message="{{$node.n2.keys}}")` → parses JSON, keys output logged
- [x] **DataFormatter** — `ManualTrigger → SetVariable(myText="hello world from nexagent") → DataFormatter(input="{{$vars.myText}}", operation=uppercase) → Logger` → output: "HELLO WORLD FROM NEXAGENT"
- [x] **IfCondition** — `ManualTrigger → SetVariable(score=85) → IfCondition(left="{{$vars.score}}", operator=">=", right=50) → [T] Logger("PASS") / [F] Logger("FAIL")` → TRUE at 85, FALSE at 20
- [x] **Loop** — `ManualTrigger → JsonParser('["apple","banana","cherry","date"]') → Loop(items="{{$node.n2.parsed}}") → Logger(message="{{$node.n3.current_item}}")` → 4 iterations: apple, banana, cherry, date
- [x] **HttpRequest** — `ManualTrigger → HttpRequest(GET, https://jsonplaceholder.typicode.com/todos/1) → Logger(message="{{$node.n2.status_code}}")` → expect 200
- [x] **Webhook** — `POST /api/v1/workflows/{id}/webhook` with JSON body → triggers workflow; body available as `{{$trigger.body}}`
- [x] **Schedule** — `Schedule(cron="*/1 * * * *", timezone=UTC) → Logger(message="tick")` → fires every minute; click Execute to register, stop button cancels it
- [x] **ChatInput** — `ManualTrigger → ChatInput → Logger(message="{{$node.n2.message}}")` → Click Execute → Chat tab opens → type "Hello" → Logger echoes "Hello"
- [x] **SendEmail** — `ManualTrigger → SendEmail(to, subject, body, smtp_host, smtp_port, smtp_user, smtp_pass) → Logger(message="{{$node.n2.sent}}")` → email arrives, Logger logs `true`; all SMTP fields in node config, no .env fallback
- [x] **SlackMessage** — `ManualTrigger → SlackMessage(token=xoxb-..., channel=#general, message="Hello") → Logger(message="{{$node.n2.sent}}")` → message appears in Slack; requires `chat:write` scope on bot
- [x] **TelegramSend** — `ManualTrigger → TelegramSend(token=<botfather-token>, chat_id=<your-id>, message="Hello") → Logger(message="{{$node.n2.sent}}")` → message arrives in Telegram; requires VPN if Telegram is blocked by ISP
- [x] **Stripe** — `ManualTrigger → Stripe(operation=create_payment_intent, api_key=sk_test_..., amount=1000, currency=usd) → Logger(message="{{$node.n2.payment_id}} | {{$node.n2.status}}")` → Logger shows `pi_xxx | requires_payment_method`
- [x] **GoogleSheets** — `ManualTrigger → GoogleSheets(operation=read, credentials_json=<paste-json>, spreadsheet_id=<id>, range=Sheet1!A1:Z100) → Logger(message="{{$node.n2.rows_affected}} rows")` → sheet must be shared with service account email
- [x] **GoogleDrive** — `ManualTrigger → GoogleDrive(operation=list, credentials_json=<paste-json>, folder_id=<id>) → Logger(message="{{$node.n2.operation}}")` → lists files in folder; folder must be shared with service account email

---

## 🤖 AI Nodes

- [ ] **OpenAI** — OpenAI API key; prompt → response + tokens_used
- [ ] **ClaudeAI** — Anthropic API key; prompt → response + stop_reason

---

## Notes

- Backend node registry: `backend/nodes/registry.py` — auto-discovers all `BaseNode` subclasses
- Engine: `backend/executor/engine.py` — DAG runner with per-node logging
- Type mapping (frontend ↔ backend): `lib/workflow/engine/nodeTypeMapping.ts`
- Default configs (canvas → workflow): `lib/workflow/utils/NodeMapping.ts`
- Variable syntax: `{{$trigger.field}}` · `{{$node.nodeId.field}}` · `{{$vars.name}}`
- ChatInput workflows: clicking Execute auto-opens Chat tab; type to trigger execution
- Google nodes: service account email is `nexagent@n8n-nexagent.iam.gserviceaccount.com` — share sheets/folders with this address
- Stripe: `requires_payment_method` is the correct initial status for a new PaymentIntent (not an error)
- TelegramSend: requires VPN on the backend machine if Telegram is blocked by ISP
