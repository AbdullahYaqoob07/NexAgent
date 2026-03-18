/**
 * Manual Trigger Node Metadata
 * Single source of truth - used by frontend TypeScript and backend via shared/nodes-metadata.json
 */

import type { NodeMetadata } from '@/lib/workflow/types/metadata';

export const MANUAL_TRIGGER_METADATA: NodeMetadata = {
  // Core identification
  type: 'ManualTrigger',
  aliases: ['Manual Trigger', 'OnClickExecuteTriggerNode', 'manual_trigger'],
  schemaVersion: 1,
  name: 'Manual Trigger',
  category: 'Triggers',
  icon: '⚡',
  description: 'Start workflow manually by clicking Run',

  // No configuration needed for manual trigger
  inputs: [],

  // Output structure available to downstream nodes
  outputs: [
    {
      id: 'triggered_at',
      label: 'Triggered At',
      type: 'date',
      description: 'ISO 8601 timestamp when the workflow was triggered',
    },
    {
      id: 'timestamp',
      label: 'Timestamp',
      type: 'date',
      description: 'Alias for triggered_at — ISO 8601 timestamp',
    },
    {
      id: 'input_data',
      label: 'Input Data',
      type: 'object',
      description: 'Any input data passed when triggering the workflow',
    },
  ],

  // Backend integration
  executor: 'ManualTriggerExecutor',

  // Workflow properties
  isStartNode: true,
  maxInstances: 1,
  requiredSecrets: [],
  requiredIntegrations: [],
};
