/**
 * Core TypeScript interfaces for the NexAgent Workflow Engine
 */

export interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  description?: string;
  config: Record<string, any>;
  inputs: NodePort[];
  outputs: NodePort[];
  position: { x: number; y: number };
  enabled: boolean;
  category: NodeCategory;
}

export interface NodePort {
  id: string;
  name: string;
  type: string;
  required: boolean;
}

export interface WorkflowConnection {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  condition?: 'true' | 'false'; // IfCondition branch routing
  enabled: boolean;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  settings: WorkflowSettings;
  createdAt: string;
  updatedAt: string;
  version: string;
}

export interface WorkflowSettings {
  timeout: number;
  retryCount: number;
  errorHandling: 'stop' | 'continue' | 'retry';
  concurrency: number;
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

export interface NodeExecutionLog {
  nodeId: string;
  nodeName: string;
  nodeType: string;
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

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: number;
  endTime?: number;
  duration?: number;
  input: ExecutionContext;
  output?: ExecutionContext;
  error?: string;
  nodeLogs: NodeExecutionLog[];
  metadata: {
    tokensUsed: number;
    cost: number;
    [key: string]: any;
  };
}

export interface WorkflowValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'error' | 'warning';
  code: string;
  message: string;
  nodeId?: string;
  field?: string;
  value?: any;
  suggestion?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  nodeId?: string;
  field?: string;
  suggestion?: string;
}

export enum NodeCategory {
  TRIGGER = 'trigger',
  ACTION = 'action',
  LOGIC = 'logic',
  AI_ML = 'ai_ml',
  DATA = 'data'
}

export interface NodeHandler {
  type: string;
  category: NodeCategory;
  name: string;
  description: string;
  inputs: NodePort[];
  outputs: NodePort[];
  configSchema: Record<string, any>;
  execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult>;
  validate?(config: Record<string, any>): ValidationError[];
}

export interface StorageProvider {
  saveWorkflow(workflow: Workflow): Promise<void>;
  loadWorkflow(workflowId: string): Promise<Workflow | null>;
  listWorkflows(): Promise<Workflow[]>;
  saveExecution(execution: WorkflowExecution): Promise<void>;
  loadExecution(executionId: string): Promise<WorkflowExecution | null>;
  listExecutions(workflowId?: string): Promise<WorkflowExecution[]>;
}