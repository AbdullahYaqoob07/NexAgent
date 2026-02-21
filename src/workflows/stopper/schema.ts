// ─── Stopper Node Schema & Types ──────────────────────────────────────────────

/**
 * Config for the Stopper node - minimal config needed
 */
export interface StopperNodeConfig {
  logLevel?: 'info' | 'success' | 'error' | 'warning';
  customMessage?: string;
}

/**
 * Output from the Stopper node
 */
export interface StopperNodeOutput {
  status: 'success' | 'error';
  message: string;
  timestamp: string;
  workflowDuration?: number;  // in milliseconds
  nodeCount?: number;
  completedNodes?: string[];
  failedNodes?: string[];
}

/**
 * Options passed to the stopper executor
 */
export interface StopperExecutorOptions {
  config: StopperNodeConfig;
  workflowStatus: 'success' | 'error' | 'cancelled';
  workflowDuration?: number;
  workflowErrors?: string[];
  completedNodeCount?: number;
  failedNodeCount?: number;
}

/**
 * Custom Error for Stopper
 */
export class StopperError extends Error {
  constructor(
    message: string,
    public readonly code: 'INVALID_CONFIG' | 'WORKFLOW_FAILED'
  ) {
    super(message);
    this.name = 'StopperError';
  }
}
