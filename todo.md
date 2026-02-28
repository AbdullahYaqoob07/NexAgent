# NexAgent — Node Testing Checklist
> Ordered easiest → hardest. Check off each node once it has been tested end-to-end
> (backend executes correctly + frontend UX animation plays).

---

## ✅ Tested & Working

- [x] **ManualTrigger** — instant trigger, no config required
- [x] **Delay** — sleeps N seconds/minutes/ms; unit aliases fixed; 1-hour cap
- [x] **Stopper** — marks workflow end; no external deps
- [x] **Logger** — logs a message/value; output shown in terminal
- [x] **SetVariable** — writes to context.variables; readable via {{$vars.name}}
- [x] **JsonParser** — parses JSON string → object; keys + is_array outputs

---

## 🟡 Pure Logic / Control Flow (in progress)

- [ ] **IfCondition** — evaluates left op right; true/false branch routing via connection badge
- [ ] **DataFormatter** — string/number/date transformations; input + operation config
- [ ] **Loop** — iterates over array; engine runs body per-item; current_item via {{$node.id.current_item}}

---

## 🟠 Light External I/O (network, but no auth)

- [ ] **HttpRequest** — GET/POST/PUT/DELETE; headers + body; response_body output
- [ ] **Webhook** — exposes an inbound HTTP endpoint; body/headers output
- [ ] **Schedule** — cron-based trigger; timezone support
- [ ] **ChatInput** — accepts a chat message as workflow input

---

## 🔴 Requires Credentials / API Keys

- [ ] **SendEmail** — SMTP or email provider; to/subject/body
- [ ] **SlackMessage** — Slack Bot Token; channel + message
- [ ] **TelegramSend** — Bot Token + chat_id
- [ ] **OpenAI** — OpenAI API key; prompt → response + tokens_used
- [ ] **ClaudeAI** — Anthropic API key; prompt → response + stop_reason

---

## 🟣 Complex Integrations (OAuth2 / payment)

- [ ] **GoogleSheets** — OAuth2 service account; read/write/append
- [ ] **GoogleDrive** — OAuth2 service account; upload/download/list
- [ ] **Stripe** — API key; charge/refund/customer ops

---

## Notes

- Backend node registry: `backend/nodes/registry.py` — auto-discovers all `BaseNode` subclasses
- Engine: `backend/executor/engine.py` — DAG runner with per-node logging
- Type mapping (frontend ↔ backend): `lib/workflow/engine/nodeTypeMapping.ts`
- Default configs (canvas → workflow): `lib/workflow/utils/NodeMapping.ts`
- Variable syntax: `{{$trigger.field}}` · `{{$node.nodeId.field}}` · `{{$vars.name}}`
