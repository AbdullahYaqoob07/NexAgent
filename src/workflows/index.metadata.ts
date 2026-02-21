/**
 * Node Metadata Registry
 * Central export of all node metadata from src/workflows/
 * This is the SINGLE SOURCE OF TRUTH for node definitions
 */

export { MANUAL_TRIGGER_METADATA } from './manualtrigger/manualtrigger.metadata';
export { DELAY_METADATA } from './delay/delay.metadata';
export { STOPPER_METADATA } from './stopper/stopper.metadata';

import { MANUAL_TRIGGER_METADATA } from './manualtrigger/manualtrigger.metadata';
import { DELAY_METADATA } from './delay/delay.metadata';
import { STOPPER_METADATA } from './stopper/stopper.metadata';

/**
 * Array of all node metadata
 * Frontend: Import directly from this file for type safety
 * Backend: Uses shared/nodes-metadata.json generated from this
 */
export const ALL_NODE_METADATA = [
  MANUAL_TRIGGER_METADATA,
  DELAY_METADATA,
  STOPPER_METADATA,
] as const;

/**
 * Metadata lookup by type
 */
export const NODE_METADATA_MAP = new Map(
  ALL_NODE_METADATA.map((metadata) => [metadata.type, metadata])
);

/**
 * Get metadata for a specific node type
 */
export function getNodeMetadata(type: string) {
  return NODE_METADATA_MAP.get(type);
}

/**
 * Get all metadata for a specific category
 */
export function getNodesByCategory(category: string) {
  return ALL_NODE_METADATA.filter((metadata) => metadata.category === category);
}

/**
 * Convert to JSON-serializable format
 * Used by backend via shared/nodes-metadata.json
 */
export function getMetadataAsJSON() {
  return ALL_NODE_METADATA.map((metadata) => ({
    type: metadata.type,
    schemaVersion: metadata.schemaVersion,
    name: metadata.name,
    category: metadata.category,
    icon: metadata.icon,
    description: metadata.description,
    inputs: metadata.inputs,
    outputs: metadata.outputs,
    executor: metadata.executor,
    isStartNode: metadata.isStartNode,
    requiredSecrets: metadata.requiredSecrets,
    requiredIntegrations: metadata.requiredIntegrations,
  }));
}
