Below is a practical architecture + code that you can paste into a FastAPI project and extend node-by-node.

1) Keep your JSON (mostly) — add only “execution metadata” where needed

Your existing structure (nodes + connections) is already enough to build a LangGraph DAG.

What you’ll want to add (optional, backward-compatible):

A) Node ports and mapping (optional)

If you want richer data routing than “everything goes into shared state”, add an optional mappings array per connection:

{
  "id": "conn_2",
  "sourceNodeId": "node_2",
  "targetNodeId": "node_3",
  "sourcePortId": "output",
  "targetPortId": "input",
  "mappings": [
    { "from": "data.nodes.node_2.output", "to": "data.input.delayResult" }
  ]
}

B) Conditional/loop routing (only for special nodes)

For an If node you can keep it as a normal node, but add routes:

{
  "id": "node_if",
  "type": "If",
  "config": {
    "expression": "{{data.input.score}} > 0.7",
    "routes": { "true": "node_A", "false": "node_B" }
  }
}


LangGraph supports conditional edges natively via add_conditional_edges. 
LangChain Docs
+1

2) The execution model in LangGraph
Recommended State shape

Use a single shared state object:

data: everything the workflow reads/writes

logs: append-only log list (reducer)

errors: structured errors if you want graceful failure

meta: run_id, timestamps, etc.

LangGraph state schemas can be TypedDict / Pydantic and can use reducers to “merge” updates. 
LangChain Docs
+1

3) Code: minimal LangGraph “compiler” from your JSON
engine/state.py
from __future__ import annotations

from typing import Any, Dict, List, TypedDict, Annotated
from operator import add

class ExecState(TypedDict, total=False):
    data: Dict[str, Any]
    logs: Annotated[List[Dict[str, Any]], add]      # reducer: append
    errors: Annotated[List[Dict[str, Any]], add]    # reducer: append
    meta: Dict[str, Any]

4) Node registry (your “new engine” is basically: JSON → Graph → Node registry)
engine/nodes/base.py
from __future__ import annotations
from typing import Any, Dict, Callable
import time
import traceback

def now_ms() -> int:
    return int(time.time() * 1000)

def make_node_wrapper(node_id: str, node_type: str, handler: Callable[..., Any]):
    """
    Wrap a node handler so it:
      - logs start/end
      - stores output at data["nodes"][node_id]
      - catches exceptions -> raises (or records in state)
    """
    async def run(state: Dict[str, Any]) -> Dict[str, Any]:
        t0 = now_ms()
        logs = [{"ts": t0, "level": "info", "nodeId": node_id, "event": "start", "type": node_type}]

        try:
            output = await handler(state)

            t1 = now_ms()
            logs.append({"ts": t1, "level": "info", "nodeId": node_id, "event": "end", "ms": t1 - t0})

            # Store per-node output in a consistent place
            data = state.get("data", {})
            data.setdefault("nodes", {})
            data["nodes"][node_id] = {"output": output, "type": node_type}

            return {"data": data, "logs": logs}

        except Exception as e:
            t1 = now_ms()
            logs.append({
                "ts": t1,
                "level": "error",
                "nodeId": node_id,
                "event": "error",
                "error": str(e),
                "trace": traceback.format_exc(),
            })
            # Raise to let LangGraph retry / fail the run
            raise

    return run

5) Example node implementations (Delay, OpenAI)
engine/nodes/delay.py
import asyncio
from typing import Any, Dict

async def delay_handler(state: Dict[str, Any], *, duration_ms: int) -> Dict[str, Any]:
    await asyncio.sleep(duration_ms / 1000.0)
    return {"sleptMs": duration_ms}

engine/nodes/openai_node.py

This uses LangChain’s OpenAI integration (langchain-openai). 
LangChain Docs

from typing import Any, Dict
from langchain_openai import ChatOpenAI

def render_template(prompt: str, state: Dict[str, Any]) -> str:
    # Minimal mustache-ish replacement: {{data.input.topic}}
    # Replace with Jinja2 if you want full templating.
    out = prompt
    data = state.get("data", {})
    # A very small helper:
    def get(path: str):
        cur = {"data": data, **state}
        for part in path.split("."):
            cur = cur.get(part, None) if isinstance(cur, dict) else None
        return cur
    import re
    for m in re.findall(r"\{\{\s*([^}]+?)\s*\}\}", prompt):
        value = get(m.strip())
        out = out.replace("{{" + m + "}}", str(value) if value is not None else "")
    return out

async def openai_handler(state: Dict[str, Any], *, model: str, prompt: str) -> Dict[str, Any]:
    llm = ChatOpenAI(model=model)  # expects OPENAI_API_KEY
    rendered = render_template(prompt, state)
    resp = await llm.ainvoke(rendered)
    return {"text": resp.content, "model": model}

6) Graph construction from your workflow JSON

This is the “compiler”: it reads nodes/connections and builds a StateGraph.

engine/compiler.py
from __future__ import annotations

from typing import Any, Dict, List, Tuple
from langgraph.graph import StateGraph, START, END
from langgraph.pregel import RetryPolicy

from .state import ExecState
from .nodes.base import make_node_wrapper
from .nodes.delay import delay_handler
from .nodes.openai_node import openai_handler

# 1) Node registry: maps node["type"] -> function that returns an async handler
def build_handler(node: Dict[str, Any]):
    node_type = node["type"]
    cfg = node.get("config", {}) or {}

    if node_type == "Delay":
        duration = int(cfg.get("duration", 0))
        async def h(state):
            return await delay_handler(state, duration_ms=duration)
        return h

    if node_type == "OpenAI":
        model = cfg.get("model", "gpt-4o-mini")  # choose your default
        prompt = cfg.get("prompt", "")
        async def h(state):
            return await openai_handler(state, model=model, prompt=prompt)
        return h

    if node_type == "On Clicking Execute":
        async def h(state):
            # Trigger nodes usually just pass through
            return {"triggered": True}
        return h

    raise ValueError(f"Unsupported node type: {node_type}")


def compile_workflow_to_graph(workflow: Dict[str, Any]):
    nodes: List[Dict[str, Any]] = workflow["nodes"]
    conns: List[Dict[str, Any]] = workflow.get("connections", [])

    # Build adjacency
    outgoing: Dict[str, List[str]] = {}
    incoming_count: Dict[str, int] = {n["id"]: 0 for n in nodes}

    for c in conns:
        s = c["sourceNodeId"]
        t = c["targetNodeId"]
        outgoing.setdefault(s, []).append(t)
        incoming_count[t] = incoming_count.get(t, 0) + 1

    # Entry nodes:
    # Prefer trigger nodes; otherwise nodes with no incoming edges.
    triggers = [n["id"] for n in nodes if n["type"] == "On Clicking Execute"]
    entry = triggers[0] if triggers else next((nid for nid, cnt in incoming_count.items() if cnt == 0), None)
    if not entry:
        raise ValueError("No entry node found (no trigger and no node with zero in-degree).")

    builder = StateGraph(ExecState)

    # Add nodes
    for n in nodes:
        node_id = n["id"]
        node_type = n["type"]

        handler = build_handler(n)
        wrapped = make_node_wrapper(node_id, node_type, handler)

        # Retry policy: best for transient API/network errors.
        # You can customize per-node type.
        retry = None
        if node_type in ("OpenAI",):
            retry = RetryPolicy(max_attempts=3)  # tune + add retry_on if you want
        builder.add_node(node_id, wrapped, retry=retry)

    # Wire edges
    builder.add_edge(START, entry)
    for s, targets in outgoing.items():
        for t in targets:
            builder.add_edge(s, t)

    # End nodes: those with no outgoing edges
    for n in nodes:
        if n["id"] not in outgoing:
            builder.add_edge(n["id"], END)

    return builder.compile()


LangGraph supports node retry policies (via RetryPolicy) for transient failures. 
Medium
+2
LangChain Docs
+2

7) FastAPI endpoint (accept workflow JSON → run graph → return outputs + logs)
main.py
from __future__ import annotations
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, Optional
import uuid
import time

from engine.compiler import compile_workflow_to_graph

app = FastAPI()

class ExecuteRequest(BaseModel):
    workflow: Dict[str, Any]         # keep contract: accept your existing JSON
    input: Optional[Dict[str, Any]] = None  # runtime inputs from frontend

class ExecuteResponse(BaseModel):
    runId: str
    status: str
    data: Dict[str, Any]
    logs: list[dict]

@app.post("/api/workflows/execute", response_model=ExecuteResponse)
async def execute_workflow(req: ExecuteRequest):
    run_id = f"run_{uuid.uuid4().hex}"
    t0 = int(time.time() * 1000)

    try:
        graph = compile_workflow_to_graph(req.workflow)

        initial_state = {
            "data": {
                "input": req.input or {},
                "workflowId": req.workflow.get("id"),
                "runId": run_id,
                "nodes": {},
            },
            "logs": [{"ts": t0, "level": "info", "event": "run_start", "runId": run_id}],
            "errors": [],
            "meta": {"startedAt": t0},
        }

        # Run graph
        final_state = await graph.ainvoke(initial_state)

        final_state["logs"].append({
            "ts": int(time.time() * 1000),
            "level": "info",
            "event": "run_end",
            "runId": run_id,
        })

        return {
            "runId": run_id,
            "status": "success",
            "data": final_state.get("data", {}),
            "logs": final_state.get("logs", []),
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

8) Data flow between nodes (best practice)
The simplest (works like n8n “global JSON”)

Every node can read: state["data"]

Every node writes its output into: state["data"]["nodes"][node_id]["output"]

So node_3 can read node_2 output like:

prev = state["data"]["nodes"]["node_2"]["output"]


This is “easy mode” and matches typical visual workflow tools.

If you want “wire-level” mapping

Use your connections[].mappings to copy specific fields into data.input.* just before a target node runs.

Two common ways:

Add small “router” nodes automatically between connected nodes (clean, explicit)

Store mapping metadata and apply it inside each node wrapper before handler execution

Either is fine; most workflow engines do (2) for speed.

9) Error handling & retries (what to do in LangGraph)

Use two layers:

A) Automatic retries for transient errors

Use node RetryPolicy (network, rate limits, etc.). 
Medium
+2
LangChain Docs
+2

B) Controlled fallback paths for “business errors”

If you need “after retries exhausted, go to a fallback node”, you typically:

catch the error in node code, write it into state["errors"], and

use conditional edges to route to an error handler node (instead of raising)

This is a common pattern discussed by the LangChain community. 
LangChain Forum
+1

10) Returning execution results & logs to frontend
Basic (your current contract style)

Return:

runId

status

data (includes per-node outputs)

logs (list of events)

Better UX (optional): stream logs live

LangGraph supports streaming events/values (so you can SSE/WebSocket progress). The graph APIs include streaming concepts you can hook into. 
LangChain Docs
+1

If you want, I can provide:

SSE endpoint /api/workflows/execute/stream

frontend example to update node status in real time

How this meets your requirements

Frontend stays the source of truth (nodes + connections JSON)

Backend “compiles” JSON → LangGraph at runtime

Supports sequential, parallel fan-out (multiple outgoing edges), conditional (via add_conditional_edges), loops (edges back with stop conditions) 
aidoczh.com
+1

Retry + robust error handling patterns supported 
Medium
+1

Keeps API compatibility (you can accept the same payload)