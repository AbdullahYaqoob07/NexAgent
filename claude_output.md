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
Typescript workflow schema validator:
// ============================================================
// NexAgent Workflow Schema v2 — TypeScript Types & Validator
// ============================================================
// File: src/schemas/workflowSchema.ts
// Usage: Import validateWorkflow() before saving or executing

// ─── Types ───────────────────────────────────────────────────────────────────

export type WorkflowStatus = 'draft' | 'active' | 'archived';
export type LogLevel = 'info' | 'success' | 'warning' | 'error';
export type VariableType = 'string' | 'number' | 'boolean' | 'secret' | 'json';
export type NodeOutputType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'date'
  | 'trigger'
  | 'json';
export type NodeInputType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'password'
  | 'email'
  | 'url'
  | 'json'
  | 'trigger';

// ─── Variable ────────────────────────────────────────────────────────────────

export interface WorkflowVariable {
  type: VariableType;
  value: string | number | boolean | null;
  secretRef?: string; // e.g. 'TELEGRAM_BOT_TOKEN' — value is null when secretRef is set
  description?: string;
}

// ─── Node ────────────────────────────────────────────────────────────────────

/**
 * outputMap: maps metadata output IDs → the actual key the executor returns.
 * e.g. { "delayedUntil": "timestamp", "delayed": "delayedData" }
 * This bridges the gap between UI-facing output names and executor return keys.
 */
export interface WorkflowNode {
  id: string;                          // Unique within workflow, e.g. "trigger_1"
  type: string;                        // Must match a NodeMetadata.type
  nodeSchemaVersion: number;           // Version of the node's metadata used
  name: string;                        // User-facing label on canvas
  position: { x: number; y: number }; // Canvas position
  config: Record<string, unknown>;     // User-configured values (may contain {{}} vars)
  outputMap: Record<string, string>;   // { metadataOutputId: executorReturnKey }
  disabled?: boolean;                  // Skip this node during execution
  notes?: string;                      // Developer notes, ignored at runtime
}

// ─── Edge ────────────────────────────────────────────────────────────────────

export interface WorkflowEdge {
  id: string;
  source: string;       // Node ID
  sourcePort: string;   // Must match a NodeOutput.id in source node's metadata
  target: string;       // Node ID
  targetPort: string;   // Must match a NodeInput.id in target node's metadata
  enabled: boolean;
  condition: string | null; // e.g. "{{$node.cond_1.branch}} === 'true'" — null = always
}

// ─── Execution Config ────────────────────────────────────────────────────────

export interface RetryPolicy {
  maxRetries: number;   // 0–10
  backoffMs: number;    // Base backoff in ms
}

export interface ExecutionConfig {
  timeoutMs: number;          // Max execution time for entire workflow
  retryPolicy: RetryPolicy;
  parallelExecution: boolean; // Run independent nodes in parallel
  debugMode: boolean;
}

// ─── Workflow ────────────────────────────────────────────────────────────────

export interface Workflow {
  $schema?: string;
  schemaVersion: 2;                         // Always 2 for this schema
  id: string;
  name: string;
  description?: string;
  version: number;                          // Increments on each save
  status: WorkflowStatus;
  createdAt: string;                        // ISO 8601
  updatedAt: string;                        // ISO 8601
  variables: Record<string, WorkflowVariable>;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  executionConfig: ExecutionConfig;
  metadata: {
    tags: string[];
    isPublic: boolean;
    collaborators: string[];                // User IDs
  };
}

// ─── Validation Result ───────────────────────────────────────────────────────

export interface ValidationError {
  path: string;       // e.g. "nodes[2].config.botToken"
  code: string;       // e.g. "MISSING_REQUIRED_FIELD"
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ─── Node Registry (loaded from nodes-metadata.json) ────────────────────────

interface NodeOutputMeta {
  id: string;
  type: NodeOutputType;
  executorKey: string;
}

interface NodeInputMeta {
  id: string;
  type: NodeInputType;
  required: boolean;
  validation?: { min?: number; max?: number; pattern?: string };
}

interface NodeMeta {
  type: string;
  schemaVersion: number;
  isStartNode: boolean;
  maxInstances?: number;
  inputs: NodeInputMeta[];
  outputs: NodeOutputMeta[];
}

// ─── Validator ───────────────────────────────────────────────────────────────

export function validateWorkflow(
  workflow: unknown,
  nodeRegistry: NodeMeta[]
): ValidationResult {
  const errors: ValidationError[] = [];

  // Build registry map for O(1) lookup
  const registryMap = new Map<string, NodeMeta>(
    nodeRegistry.map((n) => [n.type, n])
  );

  // ── 1. Top-level shape ───────────────────────────────────────────────────

  if (!workflow || typeof workflow !== 'object') {
    return {
      valid: false,
      errors: [{ path: '$', code: 'INVALID_TYPE', message: 'Workflow must be an object' }],
    };
  }

  const wf = workflow as Record<string, unknown>;

  if (wf['schemaVersion'] !== 2) {
    errors.push({
      path: 'schemaVersion',
      code: 'WRONG_SCHEMA_VERSION',
      message: `Expected schemaVersion 2, got ${wf['schemaVersion']}`,
    });
  }

  const requiredTopLevel: Array<keyof Workflow> = [
    'id', 'name', 'version', 'status', 'createdAt', 'updatedAt',
    'nodes', 'edges', 'variables', 'executionConfig', 'metadata',
  ];

  for (const field of requiredTopLevel) {
    if (wf[field] === undefined || wf[field] === null) {
      errors.push({
        path: field,
        code: 'MISSING_REQUIRED_FIELD',
        message: `Required field "${field}" is missing`,
      });
    }
  }

  if (typeof wf['name'] === 'string') {
    if (wf['name'].length < 3 || wf['name'].length > 100) {
      errors.push({
        path: 'name',
        code: 'INVALID_LENGTH',
        message: 'Workflow name must be 3–100 characters',
      });
    }
  }

  const validStatuses: WorkflowStatus[] = ['draft', 'active', 'archived'];
  if (wf['status'] && !validStatuses.includes(wf['status'] as WorkflowStatus)) {
    errors.push({
      path: 'status',
      code: 'INVALID_VALUE',
      message: `status must be one of: ${validStatuses.join(', ')}`,
    });
  }

  // ── 2. Variables ─────────────────────────────────────────────────────────

  if (wf['variables'] && typeof wf['variables'] === 'object') {
    const variables = wf['variables'] as Record<string, unknown>;
    const validVarTypes: VariableType[] = ['string', 'number', 'boolean', 'secret', 'json'];

    for (const [varName, varDef] of Object.entries(variables)) {
      const path = `variables.${varName}`;
      if (!varDef || typeof varDef !== 'object') {
        errors.push({ path, code: 'INVALID_TYPE', message: 'Variable must be an object' });
        continue;
      }
      const v = varDef as Record<string, unknown>;
      if (!validVarTypes.includes(v['type'] as VariableType)) {
        errors.push({
          path: `${path}.type`,
          code: 'INVALID_VALUE',
          message: `Variable type must be one of: ${validVarTypes.join(', ')}`,
        });
      }
      if (v['type'] === 'secret' && !v['secretRef']) {
        errors.push({
          path: `${path}.secretRef`,
          code: 'MISSING_SECRET_REF',
          message: 'Secret variables must have a secretRef pointing to the environment variable name',
        });
      }
    }
  }

  // ── 3. Nodes ─────────────────────────────────────────────────────────────

  const nodes = Array.isArray(wf['nodes']) ? (wf['nodes'] as unknown[]) : [];
  const nodeIds = new Set<string>();
  const nodeTypeCount = new Map<string, number>();
  const nodeOutputPorts = new Map<string, Set<string>>(); // nodeId → set of output port IDs

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i] as Record<string, unknown>;
    const path = `nodes[${i}]`;

    // Required fields
    for (const field of ['id', 'type', 'nodeSchemaVersion', 'name', 'position', 'config', 'outputMap']) {
      if (node[field] === undefined) {
        errors.push({ path: `${path}.${field}`, code: 'MISSING_REQUIRED_FIELD', message: `Required field "${field}" is missing on node` });
      }
    }

    const nodeId = node['id'] as string;
    const nodeType = node['type'] as string;

    // Duplicate node IDs
    if (nodeId) {
      if (nodeIds.has(nodeId)) {
        errors.push({ path: `${path}.id`, code: 'DUPLICATE_NODE_ID', message: `Duplicate node ID: "${nodeId}"` });
      }
      nodeIds.add(nodeId);
    }

    // Node type exists in registry
    const meta = nodeType ? registryMap.get(nodeType) : undefined;
    if (nodeType && !meta) {
      errors.push({ path: `${path}.type`, code: 'UNKNOWN_NODE_TYPE', message: `Unknown node type: "${nodeType}". Not found in node registry.` });
      continue; // Can't validate further without metadata
    }

    if (meta) {
      // maxInstances check
      const count = (nodeTypeCount.get(nodeType) ?? 0) + 1;
      nodeTypeCount.set(nodeType, count);
      if (meta.maxInstances !== undefined && count > meta.maxInstances) {
        errors.push({
          path,
          code: 'MAX_INSTANCES_EXCEEDED',
          message: `Node type "${nodeType}" allows max ${meta.maxInstances} instance(s), found ${count}`,
        });
      }

      // schemaVersion match
      if (node['nodeSchemaVersion'] !== meta.schemaVersion) {
        errors.push({
          path: `${path}.nodeSchemaVersion`,
          code: 'SCHEMA_VERSION_MISMATCH',
          message: `Node "${nodeId}" uses schema v${node['nodeSchemaVersion']} but registry has v${meta.schemaVersion}. Node needs migration.`,
        });
      }

      // Required config inputs
      const config = (node['config'] as Record<string, unknown>) ?? {};
      for (const input of meta.inputs) {
        if (input.required && config[input.id] === undefined) {
          errors.push({
            path: `${path}.config.${input.id}`,
            code: 'MISSING_REQUIRED_CONFIG',
            message: `Required config field "${input.id}" is missing on node "${nodeId}"`,
          });
        }

        // Numeric range validation (skip if value is a template variable)
        if (
          input.type === 'number' &&
          input.validation &&
          config[input.id] !== undefined &&
          typeof config[input.id] === 'number'
        ) {
          const val = config[input.id] as number;
          if (input.validation.min !== undefined && val < input.validation.min) {
            errors.push({
              path: `${path}.config.${input.id}`,
              code: 'VALIDATION_FAILED',
              message: `"${input.id}" value ${val} is below minimum ${input.validation.min}`,
            });
          }
          if (input.validation.max !== undefined && val > input.validation.max) {
            errors.push({
              path: `${path}.config.${input.id}`,
              code: 'VALIDATION_FAILED',
              message: `"${input.id}" value ${val} exceeds maximum ${input.validation.max}`,
            });
          }
        }
      }

      // outputMap keys must match metadata output IDs
      const outputMap = (node['outputMap'] as Record<string, string>) ?? {};
      const validOutputIds = new Set(meta.outputs.map((o) => o.id));
      const availablePortsForNode = new Set<string>();

      for (const [metaOutputId] of Object.entries(outputMap)) {
        if (!validOutputIds.has(metaOutputId)) {
          errors.push({
            path: `${path}.outputMap.${metaOutputId}`,
            code: 'INVALID_OUTPUT_MAP_KEY',
            message: `outputMap key "${metaOutputId}" does not exist in metadata outputs for node type "${nodeType}"`,
          });
        } else {
          availablePortsForNode.add(metaOutputId);
        }
      }

      // Track valid output ports for edge validation
      if (nodeId) {
        nodeOutputPorts.set(nodeId, availablePortsForNode);
      }
    }

    // Validate template variables in config values
    const config = (node['config'] as Record<string, unknown>) ?? {};
    for (const [configKey, configValue] of Object.entries(config)) {
      if (typeof configValue === 'string') {
        const varErrors = validateVariableSyntaxInString(configValue);
        for (const varError of varErrors) {
          errors.push({
            path: `${path}.config.${configKey}`,
            code: 'INVALID_VARIABLE_SYNTAX',
            message: varError,
          });
        }
      }
    }
  }

  // ── 4. At least one start node ───────────────────────────────────────────

  const startNodeTypes = nodeRegistry.filter((n) => n.isStartNode).map((n) => n.type);
  const hasStartNode = nodes.some(
    (n) => startNodeTypes.includes((n as Record<string, unknown>)['type'] as string)
  );
  if (nodes.length > 0 && !hasStartNode) {
    errors.push({
      path: 'nodes',
      code: 'MISSING_START_NODE',
      message: `Workflow must contain at least one start node (${startNodeTypes.join(', ')})`,
    });
  }

  // ── 5. Edges ─────────────────────────────────────────────────────────────

  const edges = Array.isArray(wf['edges']) ? (wf['edges'] as unknown[]) : [];
  const edgeIds = new Set<string>();

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i] as Record<string, unknown>;
    const path = `edges[${i}]`;

    for (const field of ['id', 'source', 'sourcePort', 'target', 'targetPort']) {
      if (!edge[field]) {
        errors.push({ path: `${path}.${field}`, code: 'MISSING_REQUIRED_FIELD', message: `Required field "${field}" is missing on edge` });
      }
    }

    const edgeId = edge['id'] as string;
    if (edgeId) {
      if (edgeIds.has(edgeId)) {
        errors.push({ path: `${path}.id`, code: 'DUPLICATE_EDGE_ID', message: `Duplicate edge ID: "${edgeId}"` });
      }
      edgeIds.add(edgeId);
    }

    const sourceId = edge['source'] as string;
    const targetId = edge['target'] as string;
    const sourcePort = edge['sourcePort'] as string;
    const targetPort = edge['targetPort'] as string;

    // Source node must exist
    if (sourceId && !nodeIds.has(sourceId)) {
      errors.push({ path: `${path}.source`, code: 'UNKNOWN_NODE_REFERENCE', message: `Edge references unknown source node: "${sourceId}"` });
    }

    // Target node must exist
    if (targetId && !nodeIds.has(targetId)) {
      errors.push({ path: `${path}.target`, code: 'UNKNOWN_NODE_REFERENCE', message: `Edge references unknown target node: "${targetId}"` });
    }

    // Self-loop check
    if (sourceId && targetId && sourceId === targetId) {
      errors.push({ path, code: 'SELF_LOOP', message: `Edge "${edgeId}" connects node "${sourceId}" to itself` });
    }

    // sourcePort must exist in source node's outputMap
    if (sourceId && sourcePort && nodeIds.has(sourceId)) {
      const availablePorts = nodeOutputPorts.get(sourceId);
      if (availablePorts && !availablePorts.has(sourcePort)) {
        errors.push({
          path: `${path}.sourcePort`,
          code: 'INVALID_SOURCE_PORT',
          message: `Port "${sourcePort}" does not exist on node "${sourceId}". Available: ${[...availablePorts].join(', ')}`,
        });
      }
    }

    // targetPort must exist in target node's metadata inputs
    if (targetId && targetPort && nodeIds.has(targetId)) {
      const targetNode = nodes.find(
        (n) => (n as Record<string, unknown>)['id'] === targetId
      ) as Record<string, unknown> | undefined;

      if (targetNode) {
        const targetMeta = registryMap.get(targetNode['type'] as string);
        if (targetMeta) {
          const validTargetPorts = new Set(targetMeta.inputs.map((inp) => inp.id));
          // Also allow 'trigger' as a special control-flow port
          validTargetPorts.add('trigger');
          if (!validTargetPorts.has(targetPort)) {
            errors.push({
              path: `${path}.targetPort`,
              code: 'INVALID_TARGET_PORT',
              message: `Port "${targetPort}" does not exist on node "${targetId}". Available: ${[...validTargetPorts].join(', ')}`,
            });
          }
        }
      }
    }

    // condition syntax check
    if (edge['condition'] && typeof edge['condition'] === 'string') {
      const varErrors = validateVariableSyntaxInString(edge['condition']);
      for (const varError of varErrors) {
        errors.push({ path: `${path}.condition`, code: 'INVALID_VARIABLE_SYNTAX', message: varError });
      }
    }
  }

  // ── 6. Execution config ───────────────────────────────────────────────────

  if (wf['executionConfig'] && typeof wf['executionConfig'] === 'object') {
    const ec = wf['executionConfig'] as Record<string, unknown>;
    if (typeof ec['timeoutMs'] === 'number' && ec['timeoutMs'] < 1000) {
      errors.push({ path: 'executionConfig.timeoutMs', code: 'VALIDATION_FAILED', message: 'timeoutMs must be at least 1000ms' });
    }
    if (ec['retryPolicy'] && typeof ec['retryPolicy'] === 'object') {
      const rp = ec['retryPolicy'] as Record<string, unknown>;
      if (typeof rp['maxRetries'] === 'number' && (rp['maxRetries'] < 0 || rp['maxRetries'] > 10)) {
        errors.push({ path: 'executionConfig.retryPolicy.maxRetries', code: 'VALIDATION_FAILED', message: 'maxRetries must be 0–10' });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── Variable Syntax Validator (internal) ─────────────────────────────────────

function validateVariableSyntaxInString(text: string): string[] {
  const errors: string[] = [];
  const matches = text.matchAll(/\{\{([^}]+)\}\}/g);
  for (const match of matches) {
    const expr = match[1].trim();
    if (
      !expr.startsWith('$trigger.') &&
      !expr.startsWith('$node.') &&
      !expr.startsWith('$vars.')
    ) {
      errors.push(`Invalid variable "{{${expr}}}": must start with $trigger, $node, or $vars`);
    }
    if (expr.startsWith('$node.')) {
      const parts = expr.substring(6).split('.');
      if (parts.length < 2) {
        errors.push(`Invalid $node variable "{{${expr}}}": must include node ID and field, e.g. {{$node.my_node.fieldName}}`);
      }
    }
  }
  return errors;
}

// ─── Helper: Extract all variable references from a workflow ──────────────────

export function extractAllVariables(workflow: Workflow): string[] {
  const found = new Set<string>();
  const scan = (value: unknown) => {
    if (typeof value === 'string') {
      const matches = value.matchAll(/\{\{([^}]+)\}\}/g);
      for (const m of matches) found.add(m[1].trim());
    } else if (Array.isArray(value)) {
      value.forEach(scan);
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(scan);
    }
  };
  scan(workflow.nodes);
  scan(workflow.edges);
  return [...found];
}

// ─── Helper: Create a minimal valid workflow skeleton ────────────────────────

export function createEmptyWorkflow(name: string, id: string): Workflow {
  const now = new Date().toISOString();
  return {
    schemaVersion: 2,
    id,
    name,
    version: 1,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    variables: {},
    nodes: [],
    edges: [],
    executionConfig: {
      timeoutMs: 30000,
      retryPolicy: { maxRetries: 3, backoffMs: 1000 },
      parallelExecution: false,
      debugMode: false,
    },
    metadata: {
      tags: [],
      isPublic: false,
      collaborators: [],
    },
  };
}

Python Pydantic models for NexAgent workflow schema v2
# ============================================================
# NexAgent Workflow Schema v2 — Python Pydantic Models
# ============================================================
# File: app/schemas/workflow_schema.py
# Usage: Import WorkflowV2 for request validation and Firestore serialization
#
# Install deps: pip install pydantic[email] pydantic>=2.0

from __future__ import annotations

import re
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field, field_validator, model_validator


# ─── Enums ────────────────────────────────────────────────────────────────────

class WorkflowStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class VariableType(str, Enum):
    STRING = "string"
    NUMBER = "number"
    BOOLEAN = "boolean"
    SECRET = "secret"
    JSON = "json"


class NodeOutputType(str, Enum):
    STRING = "string"
    NUMBER = "number"
    BOOLEAN = "boolean"
    OBJECT = "object"
    ARRAY = "array"
    DATE = "date"
    TRIGGER = "trigger"
    JSON = "json"


class NodeInputType(str, Enum):
    TEXT = "text"
    TEXTAREA = "textarea"
    NUMBER = "number"
    BOOLEAN = "boolean"
    SELECT = "select"
    PASSWORD = "password"
    EMAIL = "email"
    URL = "url"
    JSON = "json"
    TRIGGER = "trigger"


# ─── Variable ────────────────────────────────────────────────────────────────

class WorkflowVariable(BaseModel):
    """
    Typed workflow-level variable.
    For secrets, set type='secret' and provide secretRef.
    value must be None when secretRef is set (never store raw credentials).
    """
    type: VariableType
    value: Optional[Union[str, int, float, bool]] = None
    secret_ref: Optional[str] = Field(None, alias="secretRef")
    description: Optional[str] = None

    @model_validator(mode="after")
    def validate_secret(self) -> "WorkflowVariable":
        if self.type == VariableType.SECRET:
            if not self.secret_ref:
                raise ValueError(
                    "Secret variables must have a secretRef "
                    "(e.g. 'TELEGRAM_BOT_TOKEN')"
                )
            if self.value is not None:
                raise ValueError(
                    "Secret variables must have value=null. "
                    "Raw credentials must never be stored in workflow JSON."
                )
        return self

    model_config = {"populate_by_name": True}


# ─── Node ────────────────────────────────────────────────────────────────────

VARIABLE_PATTERN = re.compile(r"\{\{([^}]+)\}\}")


def _validate_variable_syntax(text: str) -> list[str]:
    """Returns list of syntax error messages found in a template string."""
    errors = []
    for match in VARIABLE_PATTERN.finditer(text):
        expr = match.group(1).strip()
        if not (
            expr.startswith("$trigger.")
            or expr.startswith("$node.")
            or expr.startswith("$vars.")
        ):
            errors.append(
                f"Invalid variable '{{{{  {expr}  }}}}': "
                f"must start with $trigger, $node, or $vars"
            )
        if expr.startswith("$node."):
            parts = expr[6:].split(".")
            if len(parts) < 2:
                errors.append(
                    f"Invalid $node variable '{{{{ {expr} }}}}': "
                    f"must include node ID and field, e.g. {{{{$node.my_node.fieldName}}}}"
                )
    return errors


class WorkflowNode(BaseModel):
    """
    A single node instance within a workflow.

    outputMap: maps the metadata output ID (what users/UI see) →
               the actual key returned by the executor.
    e.g. { "delayedUntil": "timestamp", "delayed": "delayedData" }
    This is the fix for the metadata/executor key mismatch problem.
    """
    id: str = Field(..., min_length=1, max_length=100)
    type: str = Field(..., min_length=1)
    node_schema_version: int = Field(..., alias="nodeSchemaVersion", ge=1)
    name: str = Field(..., min_length=1, max_length=100)
    position: Dict[str, float]
    config: Dict[str, Any] = Field(default_factory=dict)
    output_map: Dict[str, str] = Field(default_factory=dict, alias="outputMap")
    disabled: bool = False
    notes: Optional[str] = None

    @field_validator("position")
    @classmethod
    def validate_position(cls, v: Dict[str, float]) -> Dict[str, float]:
        if "x" not in v or "y" not in v:
            raise ValueError("Node position must have 'x' and 'y' keys")
        return v

    @field_validator("config")
    @classmethod
    def validate_config_variables(cls, v: Dict[str, Any]) -> Dict[str, Any]:
        all_errors = []
        for field_name, field_value in v.items():
            if isinstance(field_value, str):
                errs = _validate_variable_syntax(field_value)
                for err in errs:
                    all_errors.append(f"config.{field_name}: {err}")
        if all_errors:
            raise ValueError("\n".join(all_errors))
        return v

    model_config = {"populate_by_name": True}


# ─── Edge ────────────────────────────────────────────────────────────────────

class WorkflowEdge(BaseModel):
    """
    A connection between two node ports.
    sourcePort and targetPort are the critical fields that were
    previously hardcoded as 'output' and 'input' — now explicit.
    """
    id: str = Field(..., min_length=1)
    source: str = Field(..., min_length=1)       # Source node ID
    source_port: str = Field(..., alias="sourcePort", min_length=1)  # Output port ID from metadata
    target: str = Field(..., min_length=1)       # Target node ID
    target_port: str = Field(..., alias="targetPort", min_length=1)  # Input port ID from metadata
    enabled: bool = True
    condition: Optional[str] = None              # Template expression or null

    @field_validator("condition")
    @classmethod
    def validate_condition_syntax(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            errors = _validate_variable_syntax(v)
            if errors:
                raise ValueError(f"Invalid condition syntax: {'; '.join(errors)}")
        return v

    @model_validator(mode="after")
    def no_self_loop(self) -> "WorkflowEdge":
        if self.source == self.target:
            raise ValueError(
                f"Edge '{self.id}' connects node '{self.source}' to itself. "
                f"Self-loops are not allowed."
            )
        return self

    model_config = {"populate_by_name": True}


# ─── Execution Config ────────────────────────────────────────────────────────

class RetryPolicy(BaseModel):
    max_retries: int = Field(3, alias="maxRetries", ge=0, le=10)
    backoff_ms: int = Field(1000, alias="backoffMs", ge=0)

    model_config = {"populate_by_name": True}


class ExecutionConfig(BaseModel):
    timeout_ms: int = Field(30000, alias="timeoutMs", ge=1000)
    retry_policy: RetryPolicy = Field(default_factory=RetryPolicy, alias="retryPolicy")
    parallel_execution: bool = Field(False, alias="parallelExecution")
    debug_mode: bool = Field(False, alias="debugMode")

    model_config = {"populate_by_name": True}


# ─── Metadata ────────────────────────────────────────────────────────────────

class WorkflowMetadata(BaseModel):
    tags: List[str] = Field(default_factory=list)
    is_public: bool = Field(False, alias="isPublic")
    collaborators: List[str] = Field(default_factory=list)  # User IDs

    model_config = {"populate_by_name": True}


# ─── Main Workflow Model ──────────────────────────────────────────────────────

class WorkflowV2(BaseModel):
    """
    NexAgent Workflow Schema v2.
    This is the single source of truth for workflow structure
    used by the API, Firestore, LangGraph executor, and MCP server.
    """
    schema_version: int = Field(2, alias="schemaVersion")
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    version: int = Field(1, ge=1)
    status: WorkflowStatus = WorkflowStatus.DRAFT
    created_at: str = Field(..., alias="createdAt")   # ISO 8601 string
    updated_at: str = Field(..., alias="updatedAt")   # ISO 8601 string
    variables: Dict[str, WorkflowVariable] = Field(default_factory=dict)
    nodes: List[WorkflowNode] = Field(default_factory=list)
    edges: List[WorkflowEdge] = Field(default_factory=list)
    execution_config: ExecutionConfig = Field(
        default_factory=ExecutionConfig, alias="executionConfig"
    )
    metadata: WorkflowMetadata = Field(default_factory=WorkflowMetadata)

    @field_validator("schema_version")
    @classmethod
    def must_be_v2(cls, v: int) -> int:
        if v != 2:
            raise ValueError(f"Expected schemaVersion 2, got {v}")
        return v

    @field_validator("created_at", "updated_at")
    @classmethod
    def validate_iso_timestamp(cls, v: str) -> str:
        try:
            datetime.fromisoformat(v.replace("Z", "+00:00"))
        except ValueError:
            raise ValueError(f"Timestamp must be ISO 8601 format, got: {v}")
        return v

    @model_validator(mode="after")
    def validate_graph_integrity(self) -> "WorkflowV2":
        node_ids = {n.id for n in self.nodes}
        errors = []

        # Duplicate node IDs
        seen_ids: set[str] = set()
        for node in self.nodes:
            if node.id in seen_ids:
                errors.append(f"Duplicate node ID: '{node.id}'")
            seen_ids.add(node.id)

        # Duplicate edge IDs
        seen_edge_ids: set[str] = set()
        for edge in self.edges:
            if edge.id in seen_edge_ids:
                errors.append(f"Duplicate edge ID: '{edge.id}'")
            seen_edge_ids.add(edge.id)

        # Edge references must point to existing nodes
        for edge in self.edges:
            if edge.source not in node_ids:
                errors.append(
                    f"Edge '{edge.id}' references unknown source node '{edge.source}'"
                )
            if edge.target not in node_ids:
                errors.append(
                    f"Edge '{edge.id}' references unknown target node '{edge.target}'"
                )

        if errors:
            raise ValueError("\n".join(errors))

        return self

    model_config = {"populate_by_name": True}


# ─── API Request/Response Models ──────────────────────────────────────────────

class WorkflowCreateRequest(BaseModel):
    """Used for POST /api/v1/workflows"""
    name: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    nodes: List[WorkflowNode] = Field(default_factory=list)
    edges: List[WorkflowEdge] = Field(default_factory=list)
    variables: Dict[str, WorkflowVariable] = Field(default_factory=dict)
    execution_config: ExecutionConfig = Field(
        default_factory=ExecutionConfig, alias="executionConfig"
    )
    metadata: WorkflowMetadata = Field(default_factory=WorkflowMetadata)
    status: WorkflowStatus = WorkflowStatus.DRAFT

    model_config = {"populate_by_name": True}


class WorkflowUpdateRequest(BaseModel):
    """Used for PATCH /api/v1/workflows/{id}"""
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = None
    nodes: Optional[List[WorkflowNode]] = None
    edges: Optional[List[WorkflowEdge]] = None
    variables: Optional[Dict[str, WorkflowVariable]] = None
    execution_config: Optional[ExecutionConfig] = Field(None, alias="executionConfig")
    metadata: Optional[WorkflowMetadata] = None
    status: Optional[WorkflowStatus] = None

    model_config = {"populate_by_name": True}


class WorkflowResponse(BaseModel):
    """Returned by all workflow endpoints"""
    id: str
    user_id: str = Field(..., alias="userId")
    schema_version: int = Field(2, alias="schemaVersion")
    name: str
    description: Optional[str] = None
    version: int
    status: WorkflowStatus
    created_at: str = Field(..., alias="createdAt")
    updated_at: str = Field(..., alias="updatedAt")
    last_executed_at: Optional[str] = Field(None, alias="lastExecutedAt")
    execution_count: int = Field(0, alias="executionCount")
    nodes: List[WorkflowNode]
    edges: List[WorkflowEdge]
    variables: Dict[str, WorkflowVariable]
    execution_config: ExecutionConfig = Field(..., alias="executionConfig")
    metadata: WorkflowMetadata

    model_config = {"populate_by_name": True}


# ─── Execute Endpoint Models ──────────────────────────────────────────────────

class NodeExecutionLog(BaseModel):
    """Per-node execution record returned in the response"""
    node_id: str = Field(..., alias="nodeId")
    node_type: str = Field(..., alias="nodeType")
    status: str                                          # 'completed' | 'failed' | 'skipped'
    started_at: Optional[str] = Field(None, alias="startedAt")
    completed_at: Optional[str] = Field(None, alias="completedAt")
    duration_ms: Optional[float] = Field(None, alias="durationMs")
    output: Optional[Dict[str, Any]] = None              # Resolved using outputMap
    error: Optional[str] = None

    model_config = {"populate_by_name": True}


class ExecutionSummary(BaseModel):
    workflow_id: str = Field(..., alias="workflowId")
    total_nodes: int = Field(..., alias="totalNodes")
    completed_nodes: int = Field(..., alias="completedNodes")
    failed_nodes: int = Field(..., alias="failedNodes")
    skipped_nodes: int = Field(0, alias="skippedNodes")

    model_config = {"populate_by_name": True}


class ExecuteWorkflowRequest(BaseModel):
    """POST /api/v1/workflows/{id}/execute"""
    input: Optional[Any] = None
    config_override: Optional[ExecutionConfig] = Field(None, alias="configOverride")

    model_config = {"populate_by_name": True}


class ExecuteWorkflowResponse(BaseModel):
    """Response from /execute endpoint"""
    status: str                                          # 'success' | 'error' | 'partial'
    summary: Optional[ExecutionSummary] = None
    final_output: Optional[Any] = Field(None, alias="finalOutput")
    node_logs: Optional[List[NodeExecutionLog]] = Field(None, alias="nodeLogs")
    execution_time_ms: Optional[float] = Field(None, alias="executionTimeMs")
    error: Optional[str] = None
    partial_results: Optional[List[Dict[str, Any]]] = Field(None, alias="partialResults")

    model_config = {"populate_by_name": True}


# ─── LangGraph Internal Format ────────────────────────────────────────────────

class LangGraphConnection(BaseModel):
    """
    Internal format used when passing workflow to LangGraph.
    Replaces the old format that hardcoded sourcePortId='output'.
    """
    id: str
    source_node_id: str = Field(..., alias="sourceNodeId")
    source_port_id: str = Field(..., alias="sourcePortId")   # Actual output port, never hardcoded
    target_node_id: str = Field(..., alias="targetNodeId")
    target_port_id: str = Field(..., alias="targetPortId")   # Actual input port, never hardcoded
    enabled: bool = True
    condition: Optional[str] = None

    model_config = {"populate_by_name": True}


class LangGraphWorkflow(BaseModel):
    """
    Transformed format sent to LangGraph for execution.
    Created by workflow_service.py from WorkflowV2.
    """
    id: str
    name: str
    nodes: List[WorkflowNode]
    connections: List[LangGraphConnection]
    variables: Dict[str, WorkflowVariable]
    config: ExecutionConfig

    @classmethod
    def from_workflow(cls, workflow: WorkflowV2) -> "LangGraphWorkflow":
        """Convert WorkflowV2 → LangGraph format. Replaces the broken transformation."""
        connections = [
            LangGraphConnection(
                id=f"conn_{i}",
                sourceNodeId=edge.source,
                sourcePortId=edge.source_port,    # Now uses real port, not hardcoded 'output'
                targetNodeId=edge.target,
                targetPortId=edge.target_port,    # Now uses real port, not hardcoded 'input'
                enabled=edge.enabled,
                condition=edge.condition,
            )
            for i, edge in enumerate(workflow.edges)
            if edge.enabled
        ]
        return cls(
            id=workflow.id,
            name=workflow.name,
            nodes=workflow.nodes,
            connections=connections,
            variables=workflow.variables,
            config=workflow.execution_config,
        )

    model_config = {"populate_by_name": True}


# ─── Variable Resolver ────────────────────────────────────────────────────────

class VariableContext(BaseModel):
    """
    Runtime context used to resolve {{$node.x.y}} variables during execution.
    The Python equivalent of the frontend variableReplacer.ts.
    """
    trigger: Dict[str, Any] = Field(default_factory=dict)
    nodes: Dict[str, Dict[str, Any]] = Field(default_factory=dict)   # nodeId → resolved outputs
    variables: Dict[str, Any] = Field(default_factory=dict)


def _get_nested(obj: Dict[str, Any], path: str) -> Any:
    """Traverse dot-separated path through a nested dict."""
    parts = path.split(".")
    current: Any = obj
    for part in parts:
        if not isinstance(current, dict):
            return None
        current = current.get(part)
    return current


def resolve_variables(template: str, context: VariableContext) -> str:
    """
    Backend equivalent of variableReplacer.ts replaceVariables().
    Call this on every config field before passing config to an executor.

    Example:
        template = "Hello {{$node.chat_1.message}}"
        context.nodes = {"chat_1": {"message": "world"}}
        → "Hello world"
    """
    def replace(match: re.Match) -> str:
        expr = match.group(1).strip()

        if expr.startswith("$trigger."):
            path = expr[9:]
            val = _get_nested(context.trigger, path)
            return str(val) if val is not None else f"[undefined: {expr}]"

        if expr.startswith("$node."):
            parts = expr[6:].split(".", 1)
            if len(parts) < 2:
                return f"[invalid: {expr}]"
            node_id, field_path = parts[0], parts[1]
            node_outputs = context.nodes.get(node_id, {})
            val = _get_nested(node_outputs, field_path)
            return str(val) if val is not None else f"[undefined: {expr}]"

        if expr.startswith("$vars."):
            path = expr[6:]
            val = _get_nested(context.variables, path)
            return str(val) if val is not None else f"[undefined: {expr}]"

        return f"[invalid: {expr}]"

    return VARIABLE_PATTERN.sub(replace, template)


def resolve_node_config(
    config: Dict[str, Any],
    context: VariableContext
) -> Dict[str, Any]:
    """
    Resolve all template variables in a node's config dict.
    Call this before passing config to any executor.
    """
    resolved: Dict[str, Any] = {}
    for key, value in config.items():
        if isinstance(value, str):
            resolved[key] = resolve_variables(value, context)
        elif isinstance(value, dict):
            resolved[key] = resolve_node_config(value, context)
        else:
            resolved[key] = value
    return resolved


def map_executor_output(
    raw_output: Dict[str, Any],
    output_map: Dict[str, str]
) -> Dict[str, Any]:
    """
    Translate executor return keys → metadata output IDs using outputMap.
    This is the fix for the Delay executor key mismatch problem.

    Example:
        raw_output = {"delayedData": ..., "timestamp": "2026-..."}
        output_map = {"delayed": "delayedData", "delayedUntil": "timestamp"}
        → {"delayed": ..., "delayedUntil": "2026-..."}

    The returned dict uses metadata output IDs that match {{$node.x.y}} references.
    """
    # Invert the map: executorKey → metadataOutputId
    inverted = {executor_key: meta_id for meta_id, executor_key in output_map.items()}
    mapped: Dict[str, Any] = {}
    for executor_key, value in raw_output.items():
        meta_id = inverted.get(executor_key, executor_key)  # fallback to original key
        mapped[meta_id] = value
    return mapped

Here's what's in each file and what problems they fix:
workflowSchema.ts — Full TypeScript types + validateWorkflow() function. Give it a workflow JSON and your node registry and it returns every error with a path, code, and message. It catches: wrong schema version, missing fields, invalid variable syntax, duplicate node/edge IDs, unknown node types, max instance violations, edges pointing to non-existent nodes, and invalid port names on both ends of an edge.
workflow_schema.py — Python Pydantic v2 models covering everything. Key things included beyond just models: resolve_node_config() which is the backend equivalent of your TypeScript variableReplacer (this was completely missing before), map_executor_output() which fixes the Delay key mismatch problem using outputMap, and LangGraphWorkflow.from_workflow() which replaces the broken transformation that was hardcoding sourcePortId="output".
How to use with your AI IDE — paste both files in and tell it:

Place workflowSchema.ts at src/schemas/workflowSchema.ts
Place workflow_schema.py at app/schemas/workflow_schema.py
Replace WorkflowCreateRequest and WorkflowUpdateRequest in workflow_models.py with imports from the new schema
Call resolve_node_config(node.config, context) before every executor call
Call map_executor_output(raw_output, node.output_map) after every executor returns