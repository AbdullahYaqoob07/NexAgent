#!/usr/bin/env node
/**
 * Generate nodes-metadata.json from TypeScript metadata files
 * Runs during build: npm run build:metadata
 * 
 * Output: public/nodes-metadata.json
 * Used by: Backend FastAPI server for node registration
 */

const fs = require('fs');
const path = require('path');

// Metadata definitions (these are normally imported from src/workflows)
// We replicate them here to avoid TypeScript compilation
const MANUAL_TRIGGER_METADATA = {
  type: 'ManualTrigger',
  schemaVersion: 1,
  name: 'Manual Trigger',
  category: 'Triggers',
  icon: '⚡',
  description: 'Start workflow manually by clicking Run',
  inputs: [],
  outputs: [
    {
      id: 'timestamp',
      label: 'Timestamp',
      type: 'date',
      description: 'Timestamp when the workflow was triggered',
    },
    {
      id: 'executionId',
      label: 'Execution ID',
      type: 'string',
      description: 'Unique ID for this workflow execution',
    },
  ],
  executor: 'ManualTriggerExecutor',
  isStartNode: true,
  maxInstances: 1,
  requiredSecrets: [],
  requiredIntegrations: [],
};

const DELAY_METADATA = {
  type: 'Delay',
  schemaVersion: 1,
  name: 'Delay',
  category: 'Logic',
  icon: '⏱️',
  description: 'Pauses workflow execution for a specified duration',
  inputs: [
    {
      id: 'duration',
      label: 'Duration',
      type: 'number',
      required: true,
      default: 5,
      validation: { min: 1, max: 3600 },
      description: 'How long to wait in seconds',
    },
  ],
  outputs: [
    {
      id: 'delayed',
      label: 'Delayed',
      type: 'trigger',
      description: 'Fires after the delay completes',
    },
    {
      id: 'delayedUntil',
      label: 'Delayed Until',
      type: 'date',
      description: 'Timestamp when delay completed',
    },
    {
      id: 'duration',
      label: 'Duration',
      type: 'number',
      description: 'Duration in seconds that was delayed',
    },
  ],
  executor: 'DelayExecutor',
  isStartNode: false,
  requiredSecrets: [],
  requiredIntegrations: [],
};

const STOPPER_METADATA = {
  type: 'Stopper',
  schemaVersion: 1,
  name: 'Stopper',
  category: 'Logic',
  icon: '🛑',
  description: 'Stop and log workflow completion',
  inputs: [
    {
      id: 'logLevel',
      label: 'Log Level',
      type: 'select',
      required: false,
      default: 'info',
      options: [
        { value: 'info', label: 'Info' },
        { value: 'success', label: 'Success' },
        { value: 'warning', label: 'Warning' },
        { value: 'error', label: 'Error' },
      ],
      description: 'Logging level for completion message',
    },
    {
      id: 'customMessage',
      label: 'Custom Message',
      type: 'textarea',
      required: false,
      description: 'Optional custom message to log',
    },
  ],
  outputs: [
    {
      id: 'status',
      label: 'Status',
      type: 'string',
      description: 'Workflow completion status (success or error)',
    },
    {
      id: 'message',
      label: 'Message',
      type: 'string',
      description: 'Completion message',
    },
    {
      id: 'timestamp',
      label: 'Timestamp',
      type: 'date',
      description: 'When the workflow was stopped',
    },
  ],
  executor: 'StopperExecutor',
  isStartNode: false,
  requiredSecrets: [],
  requiredIntegrations: [],
};

const ALL_NODES = [
  MANUAL_TRIGGER_METADATA,
  DELAY_METADATA,
  STOPPER_METADATA,
];

/**
 * Validation function to ensure metadata integrity
 */
function validateMetadata(nodes) {
  const errors = [];
  const nodeTypes = new Set();

  nodes.forEach((node, idx) => {
    const nodeLabel = `Node[${idx}] (${node.type})`;

    // Check required fields
    if (!node.type) errors.push(`${nodeLabel}: Missing 'type'`);
    if (!node.name) errors.push(`${nodeLabel}: Missing 'name'`);
    if (!node.category) errors.push(`${nodeLabel}: Missing 'category'`);
    if (!node.description) errors.push(`${nodeLabel}: Missing 'description'`);
    if (!node.executor) errors.push(`${nodeLabel}: Missing 'executor'`);
    if (!Array.isArray(node.inputs)) errors.push(`${nodeLabel}: 'inputs' must be an array`);
    if (!Array.isArray(node.outputs)) errors.push(`${nodeLabel}: 'outputs' must be an array`);

    // Check for duplicate types
    if (nodeTypes.has(node.type)) {
      errors.push(`${nodeLabel}: Duplicate node type '${node.type}'`);
    }
    nodeTypes.add(node.type);
  });

  return { valid: errors.length === 0, errors };
}

// Output path
const sharedDir = path.join(__dirname, '..', 'shared');
const outputFile = path.join(sharedDir, 'nodes-metadata.json');

// Ensure shared directory exists
if (!fs.existsSync(sharedDir)) {
  fs.mkdirSync(sharedDir, { recursive: true });
  console.log(`📁 Created directory: ${sharedDir}`);
}

// Validate metadata
console.log('🔍 Validating metadata...');
const validation = validateMetadata(ALL_NODES);

if (!validation.valid) {
  console.error('❌ Metadata validation failed:');
  validation.errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

console.log('✅ Metadata validation passed');

// Build JSON export
const jsonContent = {
  version: '1.0.0',
  timestamp: new Date().toISOString(),
  schemaVersion: 1,
  nodeCount: ALL_NODES.length,
  nodes: ALL_NODES,
};

// Write JSON file
fs.writeFileSync(outputFile, JSON.stringify(jsonContent, null, 2), 'utf-8');
console.log(`✅ Generated: ${outputFile}`);
console.log(`📊 Total nodes: ${ALL_NODES.length}`);
console.log(`🎯 Nodes: ${ALL_NODES.map((n) => `${n.type} (${n.category})`).join(', ')}`);
console.log(`⏰ Generated at: ${jsonContent.timestamp}`);
