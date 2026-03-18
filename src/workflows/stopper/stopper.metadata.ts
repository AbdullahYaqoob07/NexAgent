/**
 * Stopper Node Metadata
 * Single source of truth - used by frontend TypeScript and backend via shared/nodes-metadata.json
 */

import type { NodeMetadata } from '@/lib/workflow/types/metadata';

export const STOPPER_METADATA: NodeMetadata = {
  // Core identification
  type: 'Stopper',
  aliases: ['StopperNode', 'stopper'],
  schemaVersion: 1,
  name: 'Stopper',
  category: 'Logic',
  icon: '🛑',
  description: 'Stop and log workflow completion',

  // Input fields for configuration
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

  // Output structure available to downstream nodes
  outputs: [
    {
      id: 'status',
      label: 'Status',
      type: 'string',
      description: 'Workflow completion status (success or error)',
      executorKey: 'status',
    },
    {
      id: 'message',
      label: 'Message',
      type: 'string',
      description: 'Completion message',
      executorKey: 'message',
    },
    {
      id: 'stopped_at',
      label: 'Stopped At',
      type: 'date',
      description: 'ISO timestamp when the workflow was stopped',
    },
  ],

  // Backend integration
  executor: 'StopperExecutor',

  // Workflow properties
  isStartNode: false,
  requiredSecrets: [],
  requiredIntegrations: [],
};
