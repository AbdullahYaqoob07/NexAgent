/**
 * Metadata Type Definition
 * Single source of truth for node metadata structure
 * Used by frontend (TypeScript) and backend (JSON via shared/nodes-metadata.json)
 */

export interface NodeInput {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'password' | 'email' | 'url' | 'json' | 'trigger';
  required: boolean;
  default?: string | number | boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  options?: Array<{ value: string; label: string }>;
  description?: string;
}

export interface NodeOutput {
  id: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date' | 'trigger' | 'json';
  description?: string;
  executorKey?: string; // Maps to actual key returned by executor (for handling mismatches)
}

export interface NodeMetadata {
  // Core identification
  type: string; // Unique node type ID (lowercase, e.g., 'delay')
  aliases?: string[]; // Alternative names that resolve to this type (e.g., ['DelayNode', 'delay'])
  schemaVersion: number; // For version tracking during deployment
  name: string; // Display name (e.g., 'Delay')
  category: 'Triggers' | 'Communication' | 'Logic' | 'Data' | 'AI' | 'Ecommerce'; // Node category
  icon: string; // Icon name or emoji (e.g., 'Clock', '⏱️')
  description: string; // Human-readable description
  
  // Configuration & Execution
  inputs: NodeInput[]; // Input fields user configures
  outputs: NodeOutput[]; // Output ports available to downstream nodes
  
  // Backend Integration
  executor: string; // Backend executor class name (e.g., 'DelayExecutor')
  executorModule?: string; // Optional: which Python module contains executor (auto-discovered if not set)
  
  // Security & Integrations
  requiredSecrets?: string[]; // Credentials needed (e.g., ['STRIPE_API_KEY', 'OPENAI_API_KEY'])
  requiredIntegrations?: string[]; // External service integrations (e.g., ['stripe', 'openai'])
  
  // Workflow Properties
  isStartNode?: boolean; // Can this node be a workflow trigger?
  maxInstances?: number; // Max times this node can appear in one workflow
  
  // UI Hints
  docs?: string; // URL to documentation
  examples?: Array<{
    name: string;
    description: string;
    workflow: Record<string, any>;
  }>;
}

/**
 * Full metadata export structure as generated in shared/nodes-metadata.json
 */
export interface NodesMetadataExport {
  version: string; // Semantic version of metadata format
  timestamp: string; // ISO timestamp when generated
  schemaVersion: number; // Current schema version
  nodeCount: number; // Total number of nodes
  nodes: NodeMetadata[];
}
