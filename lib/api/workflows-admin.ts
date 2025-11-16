/**
 * Workflows Admin Service
 * Admin-level workflow management and statistics
 */

import apiClient from './client';
import { BackendWorkflow, WorkflowListResponse } from './types/workflow';

const WORKFLOWS_BASE = '/api/v1/workflows';

// Admin-specific types
export interface WorkflowStats {
  success: boolean;
  totalWorkflows: number;
  draftWorkflows: number;
  activeWorkflows: number;
  archivedWorkflows: number;
  publicWorkflows: number;
  privateWorkflows: number;
  totalExecutions: number;
  avgExecutionsPerWorkflow: number;
  workflowsByUser: Array<{ userId: string; count: number }>;
  topWorkflows: Array<{ id: string; name: string; executionCount: number }>;
  recentActivity: Array<{ timestamp: string; action: string; workflowId: string }>;
}

export interface AdminWorkflowListParams {
  page?: number;
  pageSize?: number;
  status?: 'draft' | 'active' | 'archived' | 'all';
  userId?: string;
  canBeListed?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'executionCount' | 'name';
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

const workflowsAdminService = {
  /**
   * Get all workflows (admin view)
   * GET /api/v1/workflows with admin params
   */
  async getAllWorkflows(params?: AdminWorkflowListParams): Promise<WorkflowListResponse> {
    try {
      const response = await apiClient.get<WorkflowListResponse>(WORKFLOWS_BASE, {
        params: {
          page: params?.page || 1,
          page_size: params?.pageSize || 50,
          status: params?.status !== 'all' ? params?.status : undefined,
          user_id: params?.userId,
          can_be_listed: params?.canBeListed,
          sort_by: params?.sortBy,
          sort_order: params?.sortOrder,
          search: params?.search,
        },
      });
      return response.data;
    } catch (error) {
      console.error('❌ Get all workflows error:', error);
      return {
        success: false,
        workflows: [],
        total: 0,
        page: 1,
        pageSize: 50,
      };
    }
  },

  /**
   * Get public workflows
   * GET /api/v1/workflows/public/list
   */
  async getPublicWorkflows(params?: { page?: number; pageSize?: number }): Promise<WorkflowListResponse> {
    try {
      const response = await apiClient.get<WorkflowListResponse>(`${WORKFLOWS_BASE}/public/list`, {
        params: {
          page: params?.page || 1,
          page_size: params?.pageSize || 50,
        },
      });
      return response.data;
    } catch (error) {
      console.error('❌ Get public workflows error:', error);
      return {
        success: false,
        workflows: [],
        total: 0,
        page: 1,
        pageSize: 50,
      };
    }
  },

  /**
   * Get workflow statistics (computed from list)
   */
  async getWorkflowStats(): Promise<WorkflowStats> {
    try {
      // Fetch all workflows with large page size
      const response = await this.getAllWorkflows({ page: 1, pageSize: 1000 });
      
      if (!response.success) {
        throw new Error('Failed to fetch workflows');
      }

      const workflows = response.workflows;
      const totalWorkflows = workflows.length;
      
      // Calculate statistics
      const draftWorkflows = workflows.filter(w => w.status === 'draft').length;
      const activeWorkflows = workflows.filter(w => w.status === 'active').length;
      const archivedWorkflows = workflows.filter(w => w.status === 'archived').length;
      const publicWorkflows = workflows.filter(w => w.canBeListed).length;
      const privateWorkflows = workflows.filter(w => !w.canBeListed).length;
      
      const totalExecutions = workflows.reduce((sum, w) => sum + (w.executionCount || 0), 0);
      const avgExecutionsPerWorkflow = totalWorkflows > 0 ? totalExecutions / totalWorkflows : 0;
      
      // Group by user
      const userCounts: Record<string, number> = {};
      workflows.forEach(w => {
        userCounts[w.userId] = (userCounts[w.userId] || 0) + 1;
      });
      const workflowsByUser = Object.entries(userCounts).map(([userId, count]) => ({
        userId,
        count,
      })).sort((a, b) => b.count - a.count).slice(0, 10);
      
      // Top workflows by execution count
      const topWorkflows = workflows
        .sort((a, b) => (b.executionCount || 0) - (a.executionCount || 0))
        .slice(0, 10)
        .map(w => ({
          id: w.id,
          name: w.name,
          executionCount: w.executionCount || 0,
        }));
      
      // Recent activity (based on updatedAt)
      const recentActivity = workflows
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 20)
        .map(w => ({
          timestamp: w.updatedAt,
          action: 'updated',
          workflowId: w.id,
        }));

      return {
        success: true,
        totalWorkflows,
        draftWorkflows,
        activeWorkflows,
        archivedWorkflows,
        publicWorkflows,
        privateWorkflows,
        totalExecutions,
        avgExecutionsPerWorkflow,
        workflowsByUser,
        topWorkflows,
        recentActivity,
      };
    } catch (error) {
      console.error('❌ Get workflow stats error:', error);
      return {
        success: false,
        totalWorkflows: 0,
        draftWorkflows: 0,
        activeWorkflows: 0,
        archivedWorkflows: 0,
        publicWorkflows: 0,
        privateWorkflows: 0,
        totalExecutions: 0,
        avgExecutionsPerWorkflow: 0,
        workflowsByUser: [],
        topWorkflows: [],
        recentActivity: [],
      };
    }
  },

  /**
   * Delete workflow (admin action)
   * DELETE /api/v1/workflows/{id}
   */
  async deleteWorkflow(workflowId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.delete<{ success: boolean; message: string }>(
        `${WORKFLOWS_BASE}/${workflowId}`
      );
      return response.data;
    } catch (error) {
      console.error('❌ Delete workflow error:', error);
      return {
        success: false,
        message: 'Failed to delete workflow',
      };
    }
  },

  /**
   * Update workflow status (admin action)
   * PUT /api/v1/workflows/{id}
   */
  async updateWorkflowStatus(
    workflowId: string,
    status: 'draft' | 'active' | 'archived'
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.put<{ success: boolean; workflow: BackendWorkflow }>(
        `${WORKFLOWS_BASE}/${workflowId}`,
        { status }
      );
      return {
        success: response.data.success,
        message: `Workflow ${status} successfully`,
      };
    } catch (error) {
      console.error('❌ Update workflow status error:', error);
      return {
        success: false,
        message: 'Failed to update workflow status',
      };
    }
  },

  /**
   * Toggle workflow visibility (admin action)
   * PUT /api/v1/workflows/{id}
   */
  async toggleWorkflowVisibility(
    workflowId: string,
    canBeListed: boolean
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.put<{ success: boolean; workflow: BackendWorkflow }>(
        `${WORKFLOWS_BASE}/${workflowId}`,
        { canBeListed }
      );
      return {
        success: response.data.success,
        message: `Workflow visibility updated`,
      };
    } catch (error) {
      console.error('❌ Toggle workflow visibility error:', error);
      return {
        success: false,
        message: 'Failed to update workflow visibility',
      };
    }
  },
};

export default workflowsAdminService;
export type { BackendWorkflow };
