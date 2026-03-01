# NexAgent - Backend Node System Rebuild Plan

## Problem
The existing backend node system (`lib/workflow/langgraph/`) was:
- Poorly structured, not actually using real LangGraph
- Hard-coded registration lists with no validation
- Not LLM-friendly (complex format, no schemas)
- Empty metadata system (`shared/nodes-metadata.json` was empty)
- Mix of legacy fallback + new system = confusion

## Solution
Complete rebuild of the backend node execution engine using a **Custom Python DAG Executor** pattern (same as n8n/Zapier), with clean Pydantic models and LLM-friendly schemas.

---

## Tech Decision: Custom Python DAG Executor (NOT LangGraph)

LangGraph is designed for AI agents with cyclic feedback loops — not for linear automation workflows. A custom executor is:
- Simpler and faster
- LLM-friendly (flat JSON, clear parameter definitions)
- Exactly what n8n/Zapier uses under the hood
- Easy to extend without modifying the engine

---

## New Directory Structure

```
backend/
├── nodes/                          ← All node definitions
│   ├── __init__.py
│   ├── base.py                     ← BaseNode ABC + Pydantic models
│   ├── registry.py                 ← NodeRegistry (auto-discovers all nodes)
│   ├── triggers/
│   │   ├── manual_trigger.py       ManualTrigger
│   │   ├── schedule.py             Schedule (cron-based)
│   │   └── webhook.py              Webhook
│   ├── actions/
│   │   ├── logger.py               Logger
│   │   ├── http_request.py         HTTP Request
│   │   ├── send_email.py           Send Email
│   │   ├── slack_message.py        Slack Message
│   │   ├── telegram_send.py        Telegram Send
│   │   └── chat_input.py           Chat Input
│   ├── logic/
│   │   ├── delay.py                Delay
│   │   ├── if_condition.py         If Condition (branching)
│   │   ├── loop.py                 Loop (iterates over arrays)
│   │   └── stopper.py              Stopper (ends workflow)
│   ├── data/
│   │   ├── json_parser.py          JSON Parser
│   │   ├── data_formatter.py       Data Formatter
│   │   └── set_variable.py         Set Variable
│   ├── integrations/
│   │   ├── google_sheets.py        Google Sheets
│   │   ├── google_drive.py         Google Drive
│   │   └── stripe.py               Stripe
│   └── ai/
│       ├── openai_chat.py          OpenAI GPT
│       └── claude_chat.py          Claude AI
│
├── executor/                       ← Workflow execution engine
│   ├── context.py                  ExecutionContext
│   ├── resolver.py                 Variable resolver {{$node.x.y}}
│   └── engine.py                   WorkflowEngine (DAG runner)
│
└── app/api/v1/
    ├── nodes.py                    NEW: GET /api/v1/nodes
    └── workflows.py                MODIFIED: uses WorkflowEngine

# DELETED:
# lib/workflow/langgraph/           Entire old system removed
```

---

## Core Models (backend/nodes/base.py)

### ParameterType enum
```
STRING | NUMBER | BOOLEAN | OPTIONS | COLLECTION | CREDENTIAL | EXPRESSION
```

### NodeParameter
```python
name: str           # internal key  e.g. "duration"
display_name: str   # shown in UI   e.g. "Duration (seconds)"
type: ParameterType
required: bool = False
default: Any = None
description: str = ""
placeholder: str = ""
options: List[dict] | None       # for OPTIONS type: [{"value":"GET","label":"GET"}]
min_value: float | None
max_value: float | None
```

### NodeOutputField
```python
name: str           # key in output dict  e.g. "response_body"
display_name: str   # shown in variable picker
type: str           # string | number | boolean | object | array
description: str = ""
```

### NodeDefinition
```python
type: str                    # canonical type e.g. "Delay"
display_name: str
description: str
category: str                # Triggers | Actions | Logic | Data | AI | Integrations
icon: str                    # emoji or SVG path
color: str                   # hex color
is_trigger: bool = False
parameters: List[NodeParameter]
outputs: List[NodeOutputField]
required_credentials: List[str] = []
```

### BaseNode (ABC)
```python
class BaseNode(ABC):
    definition: ClassVar[NodeDefinition]

    @abstractmethod
    async def execute(
        self,
        config: Dict[str, Any],      # user config (variables already resolved)
        input_data: Dict[str, Any],  # previous node output
        context: ExecutionContext,
    ) -> Dict[str, Any]:
        pass
```

---

## ExecutionContext (backend/executor/context.py)

```python
class ExecutionContext(BaseModel):
    execution_id: str
    workflow_id: str
    user_id: str
    credentials: Dict[str, Dict[str, str]]   # {cred_type: {key: value}}
    variables: Dict[str, Any] = {}           # workflow-level (mutable)
    node_outputs: Dict[str, Dict[str, Any]] = {}  # {node_id: output}
    trigger_output: Dict[str, Any] = {}      # shortcut for $trigger.*
    logs: List[NodeLog] = []
```

---

## Variable Resolution (backend/executor/resolver.py)

Resolves `{{...}}` patterns recursively throughout any config dict/list:
- `{{$trigger.field}}` → `context.trigger_output["field"]`
- `{{$node.nodeId.field}}` → `context.node_outputs["nodeId"]["field"]`
- `{{$node.nodeId.nested.path}}` → deep dot-notation access
- `{{$vars.name}}` → `context.variables["name"]`

---

## Workflow Engine (backend/executor/engine.py)

```
WorkflowEngine.execute(workflow, initial_input, context):
  1. Validate all node types exist in registry
  2. Find start node (is_trigger=True, no incoming connections)
  3. For each node in execution order:
     a. Resolve config: resolver.resolve(config, context)
     b. Get node class from registry
     c. output = await node.execute(config, prev_output, context)
     d. Store in context.node_outputs[node.id]
     e. If trigger: also store in context.trigger_output
     f. Append NodeLog to context.logs
  4. Follow connections:
     - IfCondition: follow connection where condition == output["branch"]
     - Loop: repeat downstream nodes for each item
     - Others: follow first matching connection
  5. Return ExecutionResult {logs, final_output, status, duration_ms}
```

---

## Workflow JSON Format (LLM-Friendly)

```json
{
  "id": "wf_abc123",
  "name": "My Workflow",
  "nodes": [
    {"id": "n1", "type": "ManualTrigger", "name": "Start", "config": {}},
    {"id": "n2", "type": "Delay", "name": "Wait", "config": {"duration": 5, "unit": "seconds"}},
    {"id": "n3", "type": "HttpRequest", "name": "Fetch", "config": {
      "url": "https://api.example.com/users/{{$trigger.userId}}",
      "method": "GET"
    }},
    {"id": "n4", "type": "IfCondition", "name": "Check", "config": {
      "left": "{{$node.n3.status_code}}", "operator": "==", "right": 200
    }}
  ],
  "connections": [
    {"from": "n1", "to": "n2"},
    {"from": "n2", "to": "n3"},
    {"from": "n3", "to": "n4"},
    {"from": "n4", "to": "n5", "condition": "true"},
    {"from": "n4", "to": "n6", "condition": "false"}
  ]
}
```

**Key design choices:**
- `from/to` (not `sourceNodeId/targetNodeId`) — shorter, LLM-friendly
- `condition: "true"|"false"|null` — explicit branching
- No `outputMap` complexity
- Flat, readable, exactly what an LLM can generate

---

## GET /api/v1/nodes Response

```json
{
  "nodes": [
    {
      "type": "Delay",
      "display_name": "Delay",
      "description": "Pause workflow for a specified duration",
      "category": "Logic",
      "icon": "⏱️",
      "color": "#8B5CF6",
      "is_trigger": false,
      "parameters": [
        {"name": "duration", "display_name": "Duration", "type": "number",
         "required": true, "default": 1, "min_value": 0},
        {"name": "unit", "display_name": "Unit", "type": "options",
         "required": false, "default": "seconds",
         "options": [
           {"value": "milliseconds", "label": "Milliseconds"},
           {"value": "seconds", "label": "Seconds"},
           {"value": "minutes", "label": "Minutes"}
         ]}
      ],
      "outputs": [
        {"name": "actual_duration_ms", "display_name": "Actual Duration (ms)", "type": "number"},
        {"name": "delayed_until", "display_name": "Delayed Until", "type": "string"}
      ],
      "required_credentials": []
    }
  ]
}
```

---

## All 19 Nodes

### TRIGGERS (is_trigger: true)
| Type | Key Config | Key Outputs |
|------|-----------|-------------|
| `ManualTrigger` | — | `triggered_at`, `input_data` |
| `Schedule` | `cron`, `timezone` | `triggered_at`, `next_run` |
| `Webhook` | — | `body`, `headers`, `method`, `query_params` |

### ACTIONS
| Type | Key Config | Key Outputs |
|------|-----------|-------------|
| `Logger` | `message`, `level` | `logged`, `message`, `level`, `logged_at` |
| `HttpRequest` | `url`, `method`, `headers`, `body` | `status_code`, `response_body`, `headers`, `ok` |
| `SendEmail` | `to`, `subject`, `body` | `sent`, `message_id`, `sent_at` |
| `SlackMessage` | `channel`, `message`, `token` | `sent`, `timestamp`, `channel` |
| `TelegramSend` | `chat_id`, `message`, `token` | `sent`, `message_id`, `sent_at` |
| `ChatInput` | `message`, `session_id` | `message`, `session_id`, `timestamp` |

### LOGIC
| Type | Key Config | Key Outputs |
|------|-----------|-------------|
| `Delay` | `duration`, `unit` | `actual_duration_ms`, `delayed_until` |
| `IfCondition` | `left`, `operator`, `right` | `branch` (true/false), `result` |
| `Loop` | `items` or `items_path` | `current_item`, `index`, `is_last`, `total` |
| `Stopper` | `status`, `message` | `status`, `message`, `stopped_at` |

### DATA
| Type | Key Config | Key Outputs |
|------|-----------|-------------|
| `JsonParser` | `json_string` | `parsed`, `keys` |
| `DataFormatter` | `input`, `operation` | `formatted`, `original` |
| `SetVariable` | `variable_name`, `value` | `variable_name`, `value`, `set_at` |

### INTEGRATIONS (stubs with credential placeholders)
| Type | Key Config | Key Outputs |
|------|-----------|-------------|
| `GoogleSheets` | `spreadsheet_id`, `operation`, `range` | `data`, `rows_affected` |
| `GoogleDrive` | `operation`, `file_id` | `file_id`, `name`, `url` |
| `Stripe` | `operation`, `amount`, `currency` | `payment_id`, `status`, `amount` |

### AI
| Type | Key Config | Key Outputs |
|------|-----------|-------------|
| `OpenAI` | `prompt`, `model`, `temperature`, `max_tokens` | `response`, `model`, `tokens_used`, `finish_reason` |
| `ClaudeAI` | `prompt`, `model`, `max_tokens` | `response`, `model`, `tokens_used`, `stop_reason` |

---

## IfCondition Operators
`==`, `!=`, `>`, `<`, `>=`, `<=`, `contains`, `not_contains`, `starts_with`, `ends_with`, `is_empty`, `is_not_empty`, `regex`

---

## Verification Steps

1. `uvicorn app.main:app --reload` starts without errors
2. `GET /api/v1/nodes` → 200 with all 19 node definitions
3. Execute workflow: ManualTrigger → Delay(1s) → Logger → returns 3 node logs
4. Variable resolution: Logger message = `{{$trigger.triggered_at}}` → resolves correctly
5. IfCondition: routes to correct branch based on condition result
6. Loop: iterates over `["a","b","c"]`, child nodes run 3 times

---

## LLM Integration Path

Future chatbot workflow generation:
1. Chatbot calls `GET /api/v1/nodes` to get full node catalog
2. System prompt includes catalog + workflow JSON format spec
3. User describes workflow in natural language
4. LLM generates workflow JSON
5. Frontend validates + renders on canvas
6. Backend executes via `POST /api/v1/workflows/{id}/execute`
