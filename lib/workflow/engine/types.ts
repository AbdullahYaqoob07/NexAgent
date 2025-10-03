/**
 * Core types for the NexAgent Workflow Engine
 */

export interface WorkflowConfig {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNodeConfig[];
  connections: WorkflowConnectionConfig[];
  settings: WorkflowSettings;
  createdAt: string;
  updatedAt: string;
  version: string;
}

export interface WorkflowNodeConfig {
  id: string;
  sidebarType: string; // The type from the sidebar (e.g., 'email_send')
  engineType: string;  // The mapped engine type (e.g., 'EmailNode')
  name: string;
  description?: string;
  config: Record<string, any>;
  position: { x: number; y: number };
  enabled: boolean;
  category: 'trigger' | 'action' | 'logic' | 'ai_ml' | 'data';
}

export interface WorkflowConnectionConfig {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  enabled: boolean;
}

export interface WorkflowSettings {
  timeout: number;
  retryCount: number;
  concurrency: number;
  errorHandling: 'stop' | 'continue' | 'retry';
}

export interface ExecutionContext {
  [key: string]: any;
}

export interface NodeExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  metadata: {
    executionTime: number;
    tokensUsed?: number;
    cost?: number;
    [key: string]: any;
  };
}

export interface ExecutionLog {
  stepNumber: number;
  sidebarNodeType: string;
  engineNodeClass: string;
  nodeName: string;
  nodeId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime: number;
  endTime?: number;
  duration?: number;
  input?: any;
  output?: any;
  error?: string;
  retryCount: number;
  metadata: Record<string, any>;
}

export interface WorkflowExecutionResult {
  success: boolean;
  workflowId: string;
  executionId: string;
  status: 'completed' | 'failed' | 'cancelled';
  startTime: number;
  endTime: number;
  duration: number;
  totalTokensUsed: number;
  totalCost: number;
  logs: ExecutionLog[];
  context: ExecutionContext;
  error?: string;
}

export interface NodeClass {
  type: string;
  name: string;
  description: string;
  category: 'trigger' | 'action' | 'logic' | 'ai_ml' | 'data';
  execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult>;
  validate?(config: Record<string, any>): string[];
}

export interface NodeTypeMapping {
  sidebarType: string;
  engineType: string;
  nodeClass: new () => NodeClass;
  category: 'trigger' | 'action' | 'logic' | 'ai_ml' | 'data';
}

export interface LoggerConfig {
  enableConsoleLogging: boolean;
  enableFileLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxLogEntries: number;
}

export interface ExecuteOptions {
  timeout?: number;
  retryCount?: number;
  errorHandling?: 'stop' | 'continue' | 'retry';
  onStepStart?: (log: ExecutionLog) => void;
  onStepComplete?: (log: ExecutionLog) => void;
  onStepFail?: (log: ExecutionLog) => void;
}
