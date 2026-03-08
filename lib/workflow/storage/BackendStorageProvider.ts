/**
 * Backend API Storage Provider for Workflows and Executions
 * Uses FastAPI backend instead of direct Firestore access
 */

import { Workflow, WorkflowExecution, StorageProvider as IStorageProvider } from '../types';
import * as workflowApi from '@/lib/api/services/workflowApi';
import apiClient from '@/lib/api/client';

export class BackendStorageProvider implements IStorageProvider {
  /**
   * Save a workflow to backend
   */
  async saveWorkflow(workflow: Workflow): Promise<void> {
    try {
      const savedWorkflow = await workflowApi.saveWorkflow(workflow);
      // Update the workflow ID if it was newly created or if backend generated a different ID
      if (!workflow.id || workflow.id !== savedWorkflow.id) {
        workflow.id = savedWorkflow.id;
        console.log(`✅ Workflow ID updated: ${workflow.id} -> ${savedWorkflow.id}`);
      }
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

  async saveExecution(_execution: WorkflowExecution): Promise<void> {
    // Execution is saved by the backend automatically during execute_workflow
  }

  async loadExecution(executionId: string): Promise<WorkflowExecution | null> {
    try {
      // execution_id format: exec_{startMs}_{random} — we need workflowId to build the URL.
      // Fall back to listing all and finding by ID (rare code path).
      const res = await apiClient.get<any>(`/api/v1/executions/${executionId}`);
      return this._normalize(res.data);
    } catch {
      return null;
    }
  }

  async listExecutions(workflowId?: string): Promise<WorkflowExecution[]> {
    if (!workflowId) return [];
    try {
      const res = await apiClient.get<{ executions: any[] }>(
        `/api/v1/workflows/${workflowId}/executions`
      );
      return (res.data.executions || []).map(this._normalize);
    } catch {
      return [];
    }
  }

  /** Convert Firestore execution doc → WorkflowExecution shape the frontend expects */
  private _normalize(doc: any): WorkflowExecution {
    return {
      id: doc.id,
      workflowId: doc.workflowId,
      status: doc.status,
      startTime: doc.startTime ?? 0,
      endTime: doc.endTime ?? undefined,
      duration: doc.duration ?? doc.execution_time_ms ?? 0,
      input: doc.input ?? {},
      output: doc.output ?? {},
      error: doc.error ?? undefined,
      nodeLogs: (doc.nodeLogs || []).map((log: any) => ({
        nodeId: log.nodeId ?? log.node_id ?? '',
        nodeName: log.nodeName ?? log.node_name ?? log.nodeId ?? '',
        nodeType: log.nodeType ?? log.node_type ?? '',
        status: log.status ?? 'completed',
        startTime: log.startedAt ?? log.started_at ?? 0,
        endTime: log.completedAt ?? log.completed_at ?? undefined,
        duration: log.executionTimeMs ?? log.duration_ms ?? log.duration ?? 0,
        input: log.input ?? undefined,
        output: log.output ?? undefined,
        error: log.error ?? undefined,
      })),
      metadata: {
        tokensUsed: doc.metadata?.tokensUsed ?? 0,
        cost: doc.metadata?.cost ?? 0,
      },
    };
  }
}
