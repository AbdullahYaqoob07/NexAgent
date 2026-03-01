/**
 * Workflow Service
 * Handles all workflow-related API calls to FastAPI backend
 */

import apiClient from '../client';
import {
  WorkflowCreateRequest,
  WorkflowUpdateRequest,
  WorkflowDetailResponse,
  WorkflowListResponse,
  WorkflowDeleteResponse,
  WorkflowListParams,
  BackendWorkflow,
  ApiError,
} from '../types/workflow';

interface ExecuteWorkflowRequest {
  input?: any;
  config?: Record<string, any>;
}

interface ExecuteWorkflowResponse {
  status: string;
  summary?: Record<string, any>;
  final_output?: any;
  node_logs?: Array<Record<string, any>>;
  execution_time_ms?: number;
  error?: string;
  partial_results?: Array<Record<string, any>>;
}

const WORKFLOWS_BASE = '/api/v1/workflows';

export const workflowService = {
  /**
   * Create a new workflow
   * POST /api/v1/workflows
   */
  async createWorkflow(data: WorkflowCreateRequest): Promise<WorkflowDetailResponse> {
    try {
      const response = await apiClient.post<WorkflowDetailResponse>(WORKFLOWS_BASE, data);
      return response.data;
    } catch (error) {
      throw error as ApiError;
    }
  },

  /**
   * Get all workflows for the authenticated user
   * GET /api/v1/workflows
   */
  async listWorkflows(params?: WorkflowListParams): Promise<WorkflowListResponse> {
    try {
      const response = await apiClient.get<WorkflowListResponse>(WORKFLOWS_BASE, {
        params: {
          page: params?.page || 1,
          page_size: params?.pageSize || 20,
          status: params?.status,
        },
      });
      return response.data;
    } catch (error) {
      throw error as ApiError;
    }
  },

  /**
   * Get a specific workflow by ID
   * GET /api/v1/workflows/{id}
   */
  async getWorkflow(workflowId: string): Promise<WorkflowDetailResponse> {
    try {
      const response = await apiClient.get<WorkflowDetailResponse>(
        `${WORKFLOWS_BASE}/${workflowId}`
      );
      return response.data;
    } catch (error) {
      throw error as ApiError;
    }
  },

  /**
   * Update a workflow
   * PUT /api/v1/workflows/{id}
   */
  async updateWorkflow(
    workflowId: string,
    data: WorkflowUpdateRequest
  ): Promise<WorkflowDetailResponse> {
    try {
      const response = await apiClient.put<WorkflowDetailResponse>(
        `${WORKFLOWS_BASE}/${workflowId}`,
        data
      );
      return response.data;
    } catch (error) {
      throw error as ApiError;
    }
  },

  /**
   * Delete a workflow
   * DELETE /api/v1/workflows/{id}
   */
  async deleteWorkflow(workflowId: string): Promise<WorkflowDeleteResponse> {
    try {
      const response = await apiClient.delete<WorkflowDeleteResponse>(
        `${WORKFLOWS_BASE}/${workflowId}`
      );
      return response.data;
    } catch (error) {
      throw error as ApiError;
    }
  },

  /**
   * Get all public workflows
   * GET /api/v1/workflows/public/list
   */
  async listPublicWorkflows(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<WorkflowListResponse> {
    try {
      const response = await apiClient.get<WorkflowListResponse>(
        `${WORKFLOWS_BASE}/public/list`,
        {
          params: {
            page: params?.page || 1,
            page_size: params?.pageSize || 20,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw error as ApiError;
    }
  },

  /**
   * Check if user owns a workflow
   */
  async checkOwnership(workflowId: string): Promise<boolean> {
    try {
      const response = await this.getWorkflow(workflowId);
      return response.success;
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.status === 403 || apiError.status === 404) {
        return false;
      }
      throw error;
    }
  },

  /**
   * Execute a workflow using the backend LangGraph engine
   * POST /api/v1/workflows/{id}/execute
   */
  async executeWorkflow(
    workflowId: string,
    data: ExecuteWorkflowRequest
  ): Promise<ExecuteWorkflowResponse> {
    try {
      const response = await apiClient.post<ExecuteWorkflowResponse>(
        `${WORKFLOWS_BASE}/${workflowId}/execute`,
        data,
        { timeout: 300_000 } // 5-minute timeout — workflows can have long Delay nodes
      );
      return response.data;
    } catch (error) {
      throw error as ApiError;
    }
  },
};

export default workflowService;
