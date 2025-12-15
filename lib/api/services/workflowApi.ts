/**
 * Workflow API Service
 * Handles all workflow-related API calls to the backend
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
} from '../types/workflow';
import {
  workflowToCreateRequest,
  workflowToUpdateRequest,
  backendWorkflowToFrontend,
} from '../adapters/workflowAdapter';
import { Workflow } from '@/lib/workflow/types';

const WORKFLOW_BASE_PATH = '/api/v1/workflows';

/**
 * Create a new workflow
 */
export async function createWorkflow(workflow: Workflow): Promise<Workflow> {
  try {
    const request = workflowToCreateRequest(workflow);
    console.log('Creating workflow with request:', JSON.stringify(request, null, 2));
    
    const response = await apiClient.post<WorkflowDetailResponse>(
      WORKFLOW_BASE_PATH,
      request
    );
    
    if (!response.data.success || !response.data.workflow) {
      throw new Error('Failed to create workflow');
    }
    
    return backendWorkflowToFrontend(response.data.workflow);
  } catch (error: any) {
    console.error('Create workflow error - Full error object:', error);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    console.error('Error message:', error.message);
    
    // Extract detailed error message
    let errorMessage = 'Failed to create workflow';
    
    if (error.response?.data) {
      const data = error.response.data;
      errorMessage = data.detail || data.message || data.error || errorMessage;
      
      // If it's a validation error, include field details
      if (data.detail && Array.isArray(data.detail)) {
        const validationErrors = data.detail.map((err: any) => 
          `${err.loc?.join('.')}: ${err.msg}`
        ).join(', ');
        errorMessage = `Validation error: ${validationErrors}`;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * List user's workflows with pagination
 */
export async function listWorkflows(params?: WorkflowListParams): Promise<{
  workflows: Workflow[];
  total: number;
  page: number;
  pageSize: number;
}> {
  try {
    const response = await apiClient.get<WorkflowListResponse>(
      WORKFLOW_BASE_PATH,
      { params }
    );
    
    if (!response.data.success) {
      throw new Error('Failed to list workflows');
    }
    
    return {
      workflows: response.data.workflows.map(backendWorkflowToFrontend),
      total: response.data.total,
      page: response.data.page,
      pageSize: response.data.pageSize,
    };
  } catch (error: any) {
    console.error('List workflows error:', error);
    throw new Error(error.message || 'Failed to list workflows');
  }
}

/**
 * Get a workflow by ID
 */
export async function getWorkflow(workflowId: string): Promise<Workflow> {
  try {
    const response = await apiClient.get<WorkflowDetailResponse>(
      `${WORKFLOW_BASE_PATH}/${workflowId}`
    );
    
    if (!response.data.success || !response.data.workflow) {
      throw new Error('Workflow not found');
    }
    
    return backendWorkflowToFrontend(response.data.workflow);
  } catch (error: any) {
    console.error('Get workflow error:', error);
    throw new Error(error.message || 'Failed to get workflow');
  }
}

/**
 * Update a workflow
 */
export async function updateWorkflow(
  workflowId: string,
  updates: Partial<Workflow>
): Promise<Workflow> {
  try {
    const request = workflowToUpdateRequest(updates);
    const response = await apiClient.put<WorkflowDetailResponse>(
      `${WORKFLOW_BASE_PATH}/${workflowId}`,
      request
    );
    
    if (!response.data.success || !response.data.workflow) {
      throw new Error('Failed to update workflow');
    }
    
    return backendWorkflowToFrontend(response.data.workflow);
  } catch (error: any) {
    console.error('Update workflow error:', error);
    throw new Error(error.message || 'Failed to update workflow');
  }
}

/**
 * Delete a workflow
 */
export async function deleteWorkflow(workflowId: string): Promise<void> {
  try {
    const response = await apiClient.delete<WorkflowDeleteResponse>(
      `${WORKFLOW_BASE_PATH}/${workflowId}`
    );
    
    if (!response.data.success) {
      throw new Error('Failed to delete workflow');
    }
  } catch (error: any) {
    console.error('Delete workflow error:', error);
    throw new Error(error.message || 'Failed to delete workflow');
  }
}

/**
 * List public workflows (available to all users)
 */
export async function listPublicWorkflows(params?: WorkflowListParams): Promise<{
  workflows: Workflow[];
  total: number;
  page: number;
  pageSize: number;
}> {
  try {
    const response = await apiClient.get<WorkflowListResponse>(
      `${WORKFLOW_BASE_PATH}/public`,
      { params }
    );
    
    if (!response.data.success) {
      throw new Error('Failed to list public workflows');
    }
    
    return {
      workflows: response.data.workflows.map(backendWorkflowToFrontend),
      total: response.data.total,
      page: response.data.page,
      pageSize: response.data.pageSize,
    };
  } catch (error: any) {
    console.error('List public workflows error:', error);
    throw new Error(error.message || 'Failed to list public workflows');
  }
}

/**
 * Save workflow (create if new, update if exists)
 */
export async function saveWorkflow(workflow: Workflow): Promise<Workflow> {
  if (workflow.id) {
    // Try to update first, but if workflow doesn't exist, create it instead
    try {
      return await updateWorkflow(workflow.id, workflow);
    } catch (error: any) {
      // If workflow not found, create it instead
      if (error.message?.includes('not found') || error.message?.includes('404') || 
          error.response?.status === 404) {
        console.log(`⚠️ Workflow ${workflow.id} not found, creating new workflow instead`);
        // Create new workflow (backend will generate new ID)
        const { id, ...workflowWithoutId } = workflow;
        return await createWorkflow(workflowWithoutId as Workflow);
      }
      // Re-throw other errors
      throw error;
    }
  } else {
    return createWorkflow(workflow);
  }
}
