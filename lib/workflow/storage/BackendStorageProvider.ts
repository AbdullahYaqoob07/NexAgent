/**
 * Backend API Storage Provider for Workflows and Executions
 * Uses FastAPI backend instead of direct Firestore access
 */

import { Workflow, WorkflowExecution, StorageProvider as IStorageProvider } from '../types';
import * as workflowApi from '@/lib/api/services/workflowApi';

export class BackendStorageProvider implements IStorageProvider {
  /**
   * Save a workflow to backend
   */
  async saveWorkflow(workflow: Workflow): Promise<void> {
    try {
      const savedWorkflow = await workflowApi.saveWorkflow(workflow);
      // Update the workflow ID if it was newly created
      if (!workflow.id) {
        workflow.id = savedWorkflow.id;
      }
      console.log(`✅ Workflow saved via backend: ${workflow.id}`);
    } catch (error) {
      console.error('❌ Failed to save workflow to backend:', error);
      throw error;
    }
  }

  /**
   * Load a workflow from backend
   */
  async loadWorkflow(workflowId: string): Promise<Workflow | null> {
    try {
      const workflow = await workflowApi.getWorkflow(workflowId);
      console.log(`✅ Workflow loaded from backend: ${workflowId}`);
      return workflow;
    } catch (error: any) {
      if (error.message?.includes('not found') || error.message?.includes('404')) {
        console.log(`⚠️ Workflow not found: ${workflowId}`);
        return null;
      }
      console.error('❌ Failed to load workflow from backend:', error);
      throw error;
    }
  }

  /**
   * List all workflows from backend
   */
  async listWorkflows(): Promise<Workflow[]> {
    try {
      const response = await workflowApi.listWorkflows({
        page: 1,
        pageSize: 100, // Get first 100 workflows
      });
      
      console.log(`✅ Loaded ${response.workflows.length} workflows from backend`);
      return response.workflows;
    } catch (error) {
      console.error('❌ Failed to list workflows from backend:', error);
      return [];
    }
  }

  /**
   * Save execution (not yet implemented in backend)
   * For now, just log it
   */
  async saveExecution(execution: WorkflowExecution): Promise<void> {
    console.log('⚠️ Execution save not yet implemented in backend', execution.id);
    // TODO: Implement execution save endpoint in backend
  }

  /**
   * Load execution (not yet implemented in backend)
   */
  async loadExecution(executionId: string): Promise<WorkflowExecution | null> {
    console.log('⚠️ Execution load not yet implemented in backend', executionId);
    // TODO: Implement execution load endpoint in backend
    return null;
  }

  /**
   * List executions (not yet implemented in backend)
   */
  async listExecutions(workflowId?: string): Promise<WorkflowExecution[]> {
    console.log('⚠️ Execution list not yet implemented in backend', workflowId);
    // TODO: Implement execution list endpoint in backend
    return [];
  }
}
