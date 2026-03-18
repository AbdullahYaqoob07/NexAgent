/**
 * Delay Node Metadata
 * Single source of truth - used by frontend TypeScript and backend via shared/nodes-metadata.json
 */

import type { NodeMetadata } from '@/lib/workflow/types/metadata';

export const DELAY_METADATA: NodeMetadata = {
  // Core identification
  type: 'Delay',
  aliases: ['DelayNode', 'delay'],
  schemaVersion: 1,
  name: 'Delay',
  category: 'Logic',
  icon: '⏱️',
  description: 'Pauses workflow execution for a specified duration',

  // Input fields for configuration
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

  // Output structure available to downstream nodes
  outputs: [
    {
      id: 'duration',
      label: 'Duration',
      type: 'number',
      description: 'Configured delay duration value',
    },
    {
      id: 'unit',
      label: 'Unit',
      type: 'string',
      description: 'Configured delay unit (seconds, minutes, milliseconds)',
    },
    {
      id: 'actual_duration_ms',
      label: 'Actual Duration (ms)',
      type: 'number',
      description: 'How long the delay actually took in milliseconds',
    },
    {
      id: 'delayed_until',
      label: 'Delayed Until',
      type: 'date',
      description: 'ISO timestamp when the delay ended',
    },
  ],

  // Backend integration
  executor: 'DelayExecutor',

  // Workflow properties
  isStartNode: false,
  requiredSecrets: [],
  requiredIntegrations: [],
};
