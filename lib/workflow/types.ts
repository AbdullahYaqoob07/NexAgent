/**
 * NexAgent Workflow Engine - Type Definitions
 * Enterprise-grade JSON schema for workflow automation
 * 
 * This file defines the complete type system for NexAgent workflows,
 * enabling JSON-based workflow creation, AI-driven automation,
 * and enterprise-scale workflow management.
 */

import { z } from 'zod';

// ============================================================================
// CORE NODE TYPES & ENUMS
// ============================================================================

export enum NodeCategory {
  TRIGGER = 'trigger',
  ACTION = 'action',
  LOGIC = 'logic',
  AI_ML = 'ai_ml',
  DATA = 'data',
  INTEGRATION = 'integration',
}

export enum NodeType {
  // Triggers
  HTTP_WEBHOOK = 'http_webhook',
  SCHEDULE = 'schedule',
  FILE_WATCH = 'file_watch',
  DATABASE_TRIGGER = 'database_trigger',
  EMAIL_TRIGGER = 'email_trigger',
  
  // Actions
  HTTP_REQUEST = 'http_request',
  EMAIL_SEND = 'email_send',
  DATABASE_QUERY = 'database_query',
  FILE_OPERATION = 'file_operation',
  SLACK_MESSAGE = 'slack_message',
  
  // Logic
  CONDITION = 'condition',
  SWITCH = 'switch',
  LOOP = 'loop',
  MERGE = 'merge',
  DELAY = 'delay',
  
  // AI/ML
  OPENAI_COMPLETION = 'openai_completion',
  TEXT_ANALYSIS = 'text_analysis',
  IMAGE_PROCESSING = 'image_processing',
  DATA_TRANSFORM = 'data_transform',
  
  // Data
  JSON_PARSE = 'json_parse',
  XML_PARSE = 'xml_parse',
  CSV_PARSE = 'csv_parse',
  DATA_FILTER = 'data_filter',
}

export enum ConnectionType {
  SUCCESS = 'success',
  ERROR = 'error',
  CONDITIONAL = 'conditional',
  DEFAULT = 'default',
}

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

// Position schema for node placement
const PositionSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
});

// Node configuration schema (flexible for different node types)
const NodeConfigSchema = z.record(z.unknown()).optional();

// Node input/output port schema
const NodePortSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['input', 'output']),
  dataType: z.string().optional(),
  required: z.boolean().default(false),
  description: z.string().optional(),
});

// Base node schema
const BaseNodeSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(NodeType),
  category: z.nativeEnum(NodeCategory),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  position: PositionSchema,
  config: NodeConfigSchema,
  inputs: z.array(NodePortSchema).default([]),
  outputs: z.array(NodePortSchema).default([]),
  metadata: z.record(z.unknown()).optional(),
  version: z.string().default('1.0.0'),
  enabled: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Connection schema
const ConnectionSchema = z.object({
  id: z.string().uuid(),
  sourceNodeId: z.string().uuid(),
  sourcePortId: z.string(),
  targetNodeId: z.string().uuid(),
  targetPortId: z.string(),
  type: z.nativeEnum(ConnectionType).default(ConnectionType.DEFAULT),
  condition: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  enabled: z.boolean().default(true),
});

// Workflow metadata schema
const WorkflowMetadataSchema = z.object({
  author: z.string().optional(),
  version: z.string().default('1.0.0'),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  category: z.string().optional(),
  isPublic: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  executionCount: z.number().default(0),
  lastExecuted: z.string().datetime().optional(),
});

// Main workflow schema
const WorkflowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  nodes: z.array(BaseNodeSchema),
  connections: z.array(ConnectionSchema),
  metadata: WorkflowMetadataSchema,
  settings: z.object({
    timeout: z.number().positive().default(300000), // 5 minutes
    retryCount: z.number().min(0).max(5).default(3),
    concurrency: z.number().positive().default(1),
    errorHandling: z.enum(['stop', 'continue', 'retry']).default('stop'),
    logging: z.boolean().default(true),
  }).default({}),
  variables: z.record(z.unknown()).default({}),
  triggers: z.array(z.string()).default([]),
  status: z.enum(['draft', 'active', 'paused', 'archived']).default('draft'),
});

// Workflow execution result schema
const ExecutionResultSchema = z.object({
  id: z.string().uuid(),
  workflowId: z.string().uuid(),
  status: z.enum(['running', 'completed', 'failed', 'cancelled']),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  duration: z.number().optional(),
  nodeResults: z.record(z.unknown()).default({}),
  error: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
});

// ============================================================================
// TYPESCRIPT TYPES (Inferred from Zod schemas)
// ============================================================================

export type Position = z.infer<typeof PositionSchema>;
export type NodeConfig = z.infer<typeof NodeConfigSchema>;
export type NodePort = z.infer<typeof NodePortSchema>;
export type WorkflowNode = z.infer<typeof BaseNodeSchema>;
export type WorkflowConnection = z.infer<typeof ConnectionSchema>;
export type WorkflowMetadata = z.infer<typeof WorkflowMetadataSchema>;
export type Workflow = z.infer<typeof WorkflowSchema>;
export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;

// ============================================================================
// NODE TEMPLATES & CONFIGURATIONS
// ============================================================================

export interface NodeTemplate {
  type: NodeType;
  category: NodeCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
  inputs: NodePort[];
  outputs: NodePort[];
  configSchema: z.ZodSchema;
  defaultConfig: Record<string, unknown>;
  documentation?: string;
  examples?: Array<{
    name: string;
    description: string;
    config: Record<string, unknown>;
  }>;
}

// ============================================================================
// VALIDATION SCHEMAS EXPORT
// ============================================================================

export const ValidationSchemas = {
  Position: PositionSchema,
  NodeConfig: NodeConfigSchema,
  NodePort: NodePortSchema,
  WorkflowNode: BaseNodeSchema,
  WorkflowConnection: ConnectionSchema,
  WorkflowMetadata: WorkflowMetadataSchema,
  Workflow: WorkflowSchema,
  ExecutionResult: ExecutionResultSchema,
};

// ============================================================================
// JSON WORKFLOW FORMAT
// ============================================================================

/**
 * Standard JSON format for NexAgent workflows
 * This is the format used for:
 * - Workflow import/export
 * - AI-generated workflows
 * - API workflow creation
 * - Template sharing
 */
export interface WorkflowJSON {
  version: string;
  workflow: Workflow;
  schema: 'nexagent-workflow-v1';
  exportedAt: string;
  exportedBy?: string;
  checksum?: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class WorkflowValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: unknown,
    public code: string
  ) {
    super(message);
    this.name = 'WorkflowValidationError';
  }
}

export class NodeValidationError extends Error {
  constructor(
    message: string,
    public nodeId: string,
    public field: string,
    public code: string
  ) {
    super(message);
    this.name = 'NodeValidationError';
  }
}

export class ConnectionValidationError extends Error {
  constructor(
    message: string,
    public connectionId: string,
    public code: string
  ) {
    super(message);
    this.name = 'ConnectionValidationError';
  }
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type NodeUpdate = DeepPartial<Omit<WorkflowNode, 'id' | 'createdAt'>> & {
  id: string;
  updatedAt: string;
};

export type WorkflowUpdate = DeepPartial<Omit<Workflow, 'id' | 'metadata'>> & {
  id: string;
  metadata: Partial<WorkflowMetadata> & {
    updatedAt: string;
  };
};

// ============================================================================
// API TYPES
// ============================================================================

export interface CreateWorkflowRequest {
  workflow: Omit<Workflow, 'id' | 'metadata'>;
  metadata?: Partial<WorkflowMetadata>;
}

export interface CreateNodeRequest {
  workflowId: string;
  node: Omit<WorkflowNode, 'id' | 'createdAt' | 'updatedAt'>;
}

export interface CreateConnectionRequest {
  workflowId: string;
  connection: Omit<WorkflowConnection, 'id'>;
}

export interface ExecuteWorkflowRequest {
  workflowId: string;
  input?: Record<string, unknown>;
  variables?: Record<string, unknown>;
  options?: {
    timeout?: number;
    retryCount?: number;
    dryRun?: boolean;
  };
}

export interface WorkflowSearchQuery {
  query?: string;
  category?: string;
  tags?: string[];
  author?: string;
  status?: Workflow['status'];
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'executionCount';
  sortOrder?: 'asc' | 'desc';
}
