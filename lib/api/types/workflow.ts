/**
 * TypeScript types for Workflow API
 * Matches FastAPI backend schemas
 */

import { ApiError } from './auth';

// Backend workflow structure
export interface BackendWorkflowNode {
  [key: string]: any;  // Flexible node structure
}

export interface BackendWorkflowEdge {
  [key: string]: any;  // Flexible edge structure
}

// Create workflow request
export interface WorkflowCreateRequest {
  name: string;  // 3-100 characters
  description?: string;
  canBeListed?: boolean;
  nodes?: BackendWorkflowNode[];
  edges?: BackendWorkflowEdge[];
  variables?: Record<string, any>;
}

// Update workflow request
export interface WorkflowUpdateRequest {
  name?: string;
  description?: string;
  canBeListed?: boolean;
  nodes?: BackendWorkflowNode[];
  edges?: BackendWorkflowEdge[];
  variables?: Record<string, any>;
  status?: 'draft' | 'active' | 'archived';
}

// Workflow response from backend
export interface BackendWorkflow {
  id: string;
  userId: string;
  name: string;
  description?: string;
  canBeListed: boolean;
  nodes: BackendWorkflowNode[];
  edges: BackendWorkflowEdge[];
  variables: Record<string, any>;
  status: 'draft' | 'active' | 'archived';
  version: number;
  createdAt: string;
  updatedAt: string;
  lastExecutedAt?: string;
  executionCount: number;
}

// Single workflow response
export interface WorkflowDetailResponse {
  success: boolean;
  workflow: BackendWorkflow;
}

// List workflows response
export interface WorkflowListResponse {
  success: boolean;
  workflows: BackendWorkflow[];
  total: number;
  page: number;
  pageSize: number;
}

// Delete workflow response
export interface WorkflowDeleteResponse {
  success: boolean;
  message: string;
}

// Query parameters for listing workflows
export interface WorkflowListParams {
  page?: number;
  pageSize?: number;
  status?: 'draft' | 'active' | 'archived';
}

export type { ApiError };
