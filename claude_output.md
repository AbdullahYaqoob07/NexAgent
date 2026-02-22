Problems Summary (All Found Issues)
Problem 1 — Metadata outputs don't match executor outputs (the worst one)
Delay metadata declares outputs as delayed, delayedUntil, duration but the executor actually returns delayedData, delayDuration, timestamp. These are completely different keys. Your variable system {{$node.delay_1.delayDuration}} would work but {{$node.delay_1.delayed}} which a user picks from the UI would return undefined.
Problem 2 — Edges lose port information
Your edges only have source and target. When converted to LangGraph, sourcePortId and targetPortId get hardcoded as "output" and "input". Multi-output nodes like Delay or Conditional become meaningless.
Problem 3 — Nodes and edges are completely untyped in Python
List[Dict[str, Any]] means zero validation. Bad data goes in, chaos comes out at runtime.
Problem 4 — NodeInput type is missing trigger and json types
Your NodeInput.type only allows text | textarea | number | boolean | select | password | email | url but NodeOutput.type has trigger | json | object | array. You can't wire a json output into a config field that doesn't accept json input.
Problem 5 — Variable system is frontend only
replaceVariables is a TypeScript function. There's no equivalent on the Python backend. So when the executor runs, config fields with {{$node.x.y}} are raw unresolved strings unless you're resolving them before sending to the backend — which I don't see happening.
Problem 6 — No connection between config inputs and output ports
Your NodeInput (config fields the user fills in) and NodeOutput (what gets passed to next nodes) are completely separate. But some config fields ARE outputs — like Delay's duration. There's no formal way to say "this config field also becomes an output" or "this config field accepts a wired input from another node."
The Recommended Workflow JSON Schema
Here's the schema that fixes all of this. I'll explain every decision.
{
  "$schema": "https://nexagent.io/schemas/workflow/v2.json",
  "schemaVersion": 2,
  "id": "wf_abc123",
  "name": "Simple Telegram Chat",
  "description": "Type a message and send it to Telegram",
  "version": 1,
  "status": "draft",
  "createdAt": "2026-02-21T15:48:10.802Z",
  "updatedAt": "2026-02-21T15:48:10.802Z",

  "variables": {
    "botToken": {
      "type": "secret",
      "value": null,
      "secretRef": "TELEGRAM_BOT_TOKEN"
    },
    "defaultChatId": {
      "type": "string",
      "value": "-100123456789"
    }
  },

  "nodes": [
    {
      "id": "trigger_1",
      "type": "ManualTrigger",
      "nodeSchemaVersion": 1,
      "name": "Start",
      "position": { "x": 100, "y": 100 },
      "config": {},
      "outputMap": {
        "timestamp": "trigger_1.timestamp",
        "executionId": "trigger_1.executionId"
      }
    },
    {
      "id": "chat_input_1",
      "type": "ChatInput",
      "nodeSchemaVersion": 1,
      "name": "User Message",
      "position": { "x": 300, "y": 100 },
      "config": {
        "placeholder": "Type your message here...",
        "maxLength": 4096
      },
      "outputMap": {
        "message": "chat_input_1.message"
      }
    },
    {
      "id": "telegram_1",
      "type": "TelegramSend",
      "nodeSchemaVersion": 1,
      "name": "Send to Telegram",
      "position": { "x": 500, "y": 100 },
      "config": {
        "botToken": "{{$vars.botToken}}",
        "chatId": "{{$vars.defaultChatId}}",
        "message": "{{$node.chat_input_1.message}}",
        "parseMode": "HTML"
      },
      "outputMap": {
        "message_id": "telegram_1.message_id",
        "success": "telegram_1.success"
      }
    }
  ],

  "edges": [
    {
      "id": "edge_1",
      "source": "trigger_1",
      "sourcePort": "timestamp",
      "target": "chat_input_1",
      "targetPort": "trigger",
      "enabled": true,
      "condition": null
    },
    {
      "id": "edge_2",
      "source": "chat_input_1",
      "sourcePort": "message",
      "target": "telegram_1",
      "targetPort": "message",
      "enabled": true,
      "condition": null
    }
  ],

  "executionConfig": {
    "timeoutMs": 30000,
    "retryPolicy": {
      "maxRetries": 3,
      "backoffMs": 1000
    },
    "parallelExecution": false,
    "debugMode": false
  },

  "metadata": {
    "tags": ["telegram", "messaging"],
    "isPublic": false,
    "collaborators": []
  }
}
Why Each Decision Was Made
sourcePort and targetPort on edges — fixes Problem 2 entirely. Now the executor knows exactly which output of a multi-output node (like Conditional's true/false branches) connects to which input of the next node.
outputMap on each node — this is the key fix for Problem 1. It's the explicit contract between what the executor returns and what the variable system can reference. When you write {{$node.telegram_1.message_id}}, the system looks up outputMap to verify that message_id is a valid resolvable output of that node. No more silent undefined.
variables as typed objects not a flat dict — your current variables: {} is completely unstructured. The new format makes each variable typed with a type field, and crucially supports secretRef for credentials instead of putting raw tokens in the JSON.
nodeSchemaVersion on each node instance — separate from the global schemaVersion. This lets you migrate individual nodes when you update their metadata, without invalidating the whole workflow.
executionConfig at workflow level — timeout, retry policy, and parallel execution flag live here instead of being passed ad-hoc in the API request body. The workflow carries its own execution rules.
condition on edges — currently null but this is where Conditional node branching goes. When you implement Conditional, you add "condition": "{{$node.conditional_1.branch}} === 'true'" on the edge. The field exists now so you don't have to retrofit it later.
The Updated Node Metadata Contract
Your metadata NodeOutput also needs one addition to make outputMap reliable:
export interface NodeOutput {
  id: string;           // Must exactly match what executor returns
  label: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date' | 'trigger' | 'json';
  description?: string;
  executorKey: string;  // ADD THIS — the actual key in executor return object
}
So Delay's metadata would be:
outputs: [
  {
    id: "delayed",
    label: "Delayed",
    type: "trigger",
    description: "Fires after delay completes",
    executorKey: "delayedData"   // maps to what executor actually returns
  },
  {
    id: "delayedUntil", 
    label: "Delayed Until",
    type: "date",
    executorKey: "timestamp"     // maps to actual executor key
  }
]
This bridges the gap between what users see in the UI and what the executor actually produces — without having to rename everything in the executor.
What to Build Next (In Order)
First, write a TypeScript validator that checks a workflow JSON against this schema and reports all errors — wrong port names, missing required configs, unresolved variables. This becomes your single validation layer used by the editor, the API, and the AI chatbot.
Second, fix your Python models — replace List[Dict[str, Any]] with proper Pydantic models matching this schema exactly. You can auto-generate these from the schema later but do it manually first to understand the shape.
Third, fix the executor output keys to match metadata, or add executorKey to metadata as shown above. Pick one approach and be consistent.
Fourth, move variable resolution to the backend. The Python execution engine needs its own resolve_variables(config, context) function that runs before each node executes, using the same logic as your TypeScript replaceVariables.
This schema will carry you comfortably to 50+ nodes, export/import, and AI-generated workflows without needing another redesign.