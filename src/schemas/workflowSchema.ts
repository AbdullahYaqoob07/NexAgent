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
  executorKey?: string;
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
