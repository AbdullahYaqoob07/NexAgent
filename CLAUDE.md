# NexAgent - Claude Session Guide

## What This Project Is
Visual AI workflow automation platform (like n8n/Zapier). Users build node-based workflows on a canvas; a Python backend executes them.

## Stack
- **Frontend:** Next.js 15 + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui
- **Backend API:** FastAPI (Python, port 8000) in `backend/`
- **Auth:** Firebase Auth + FastAPI session layer
- **Database:** Firebase Firestore
- **Workflow Engine:** Custom Python DAG executor in `backend/nodes/` + `backend/executor/`

## DO NOT TOUCH (Frontend - working as-is)
- `app/` — Next.js pages and API routes
- `components/` — React components (especially `WorkflowCanvas.tsx`, `WorkflowEditor.tsx`)
- `lib/` — Frontend services, auth, API clients
- `src/workflows/` — Node metadata.ts files and canvas node components
- `hooks/`, `middleware.ts`, `public/`, `shared/`

## Active Backend Architecture (backend/)

### Node System (backend/nodes/)
Each node is a Python class with:
1. `definition: NodeDefinition` — static schema (type, parameters, outputs)
2. `async execute(config, input_data, context) -> dict` — execution logic

### Key Models (backend/nodes/base.py)
- `NodeDefinition` — full node schema for API + LLM
- `NodeParameter` — one config field (name, type, required, options)
- `NodeOutputField` — one output field (name, type)
- `BaseNode` — ABC all nodes inherit from

### Execution Engine (backend/executor/)
- `context.py` — `ExecutionContext` (credentials, variables, node_outputs, logs)
- `resolver.py` — `{{$trigger.x}}`, `{{$node.id.field}}`, `{{$vars.x}}` substitution
- `engine.py` — `WorkflowEngine` DAG runner

### Node Registry (backend/nodes/registry.py)
- `NodeRegistry` — auto-discovers all `BaseNode` subclasses on startup
- Singleton accessed via `get_registry()`

### API Endpoints
- `GET /api/v1/nodes` — all node definitions (for LLM + frontend)
- `POST /api/v1/workflows/{id}/execute` — run a workflow
- All other existing endpoints remain unchanged

## Workflow JSON Format
```json
{
  "id": "wf_123",
  "name": "My Workflow",
  "nodes": [{"id": "n1", "type": "ManualTrigger", "config": {}}],
  "connections": [{"from": "n1", "to": "n2", "condition": null}]
}
```
`condition`: `"true"`, `"false"`, or `null` (for IfCondition branching)

## Variable Syntax in Config
- `{{$trigger.field}}` — trigger node output
- `{{$node.nodeId.field}}` — any previous node output
- `{{$vars.name}}` — workflow variable

## Key Commands
```bash
# Start backend
cd backend && uvicorn app.main:app --reload --port 8000

# Start frontend
npm run dev
```

## Implemented Nodes (19 total)
Triggers: ManualTrigger, Schedule, Webhook
Actions: Logger, HttpRequest, SendEmail, SlackMessage, TelegramSend, ChatInput
Logic: Delay, IfCondition, Loop, Stopper
Data: JsonParser, DataFormatter, SetVariable
AI: OpenAI, ClaudeAI
Integrations: GoogleSheets, GoogleDrive, Stripe

## LLM-Friendliness Goal
The `GET /api/v1/nodes` endpoint returns full node schemas. An LLM system prompt
can include this catalog to generate valid workflow JSON automatically.

## Deleted (Old System)
`lib/workflow/langgraph/` — entire directory removed (was poorly structured,
didn't use real LangGraph, empty metadata, not LLM-friendly)
