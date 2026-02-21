/**
 * Manual Trigger Node Metadata
 * Single source of truth - used by frontend TypeScript and backend via shared/nodes-metadata.json
 */

import type { NodeMetadata } from '@/lib/workflow/types/metadata';

export const MANUAL_TRIGGER_METADATA: NodeMetadata = {
  // Core identification
  type: 'ManualTrigger',
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

  // Backend integration
  executor: 'ManualTriggerExecutor',

  // Workflow properties
  isStartNode: true,
  maxInstances: 1,
  requiredSecrets: [],
  requiredIntegrations: [],
};
