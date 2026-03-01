/**
 * Workflow Manager
 * Main entry point for the workflow engine
 */

import { WorkflowEngine } from './engine/WorkflowEngine';
import { AdvancedWorkflowEngine } from './engine/AdvancedWorkflowEngine';
import { InMemoryStorageProvider, LocalStorageProvider } from './storage/StorageProvider';
import { FirestoreStorageProvider } from './storage/FirestoreStorageProvider';
import { BackendStorageProvider } from './storage/BackendStorageProvider';
import { authService } from '../auth';
import { getAuthToken } from '../api/client';
import { Workflow, WorkflowExecution, ExecutionContext, StorageProvider as IStorageProvider } from './types';
import { WorkflowConfig } from './engine/types';
import { workflowService } from '@/lib/api/services/workflowService';

export class WorkflowManager {
  private engine: WorkflowEngine;
  private advancedEngine: AdvancedWorkflowEngine;
  private storage: IStorageProvider;
  private useBackendAPI: boolean = true; // Use backend API by default

  constructor(useLocalStorage: boolean = false, useBackendAPI: boolean = true) {
    if (typeof window !== 'undefined') {
      // Priority: BackendAPI > Firestore > LocalStorage
      const uid = authService.getUserId();
      const hasBackendToken = !!getAuthToken();
      
      if (uid && hasBackendToken && useBackendAPI) {
        // Use backend API when user is authenticated with backend
        this.storage = new BackendStorageProvider();
        console.log('✅ Using BackendStorageProvider');
      } else if (uid && !useLocalStorage) {
        // Fallback to Firestore for direct access
        this.storage = new FirestoreStorageProvider();
        console.log('⚠️ Using FirestoreStorageProvider (fallback)');
      } else {
        // Development/demo mode
        this.storage = new LocalStorageProvider();
        console.log('⚠️ Using LocalStorageProvider (dev mode)');
      }
    } else {
      // Server-side fallback (no browser APIs)
      this.storage = new InMemoryStorageProvider();
    }
    this.engine = new WorkflowEngine();
    this.advancedEngine = new AdvancedWorkflowEngine();
  }

  private ensureStorage() {
    if (typeof window === 'undefined') return;
    const uid = authService.getUserId();
    const hasBackendToken = !!getAuthToken();
    
    // Switch to backend storage if authenticated
    if (uid && hasBackendToken && !(this.storage instanceof BackendStorageProvider)) {
      this.storage = new BackendStorageProvider();
      console.log('✅ Switched to BackendStorageProvider');
    } else if (uid && !hasBackendToken && !(this.storage instanceof FirestoreStorageProvider)) {
      this.storage = new FirestoreStorageProvider();
      console.log('⚠️ Switched to FirestoreStorageProvider');
    }
  }

  /**
   * Create a new workflow
   */
  createWorkflow(name: string, description?: string): Workflow {
    const now = new Date().toISOString();
    
    return {
      id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      nodes: [],
      connections: [],
      settings: {
        timeout: 300000,
        retryCount: 3,
        concurrency: 1,
        errorHandling: 'stop'
      },
      createdAt: now,
      updatedAt: now,
      version: '1.0.0'
    };
  }

  /**
   * Convert Workflow to WorkflowConfig for engine
   */
  private convertToWorkflowConfig(workflow: Workflow): WorkflowConfig {
    const convertedNodes = workflow.nodes.map(node => ({
      id: node.id,
      sidebarType: node.type, // Map type to sidebarType
      engineType: node.type,  // Will be mapped by engine
      name: node.name,
      description: node.description,
      config: node.config,
      position: node.position,
      enabled: node.enabled,
      category: node.category
    }));
    
    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      nodes: convertedNodes,
      connections: workflow.connections.map(conn => ({
        id: conn.id,
        sourceNodeId: conn.sourceNodeId,
        sourcePortId: conn.sourcePortId,
        targetNodeId: conn.targetNodeId,
        targetPortId: conn.targetPortId,
        condition: conn.condition,
        enabled: conn.enabled
      })),
      settings: {
        timeout: workflow.settings.timeout,
        retryCount: workflow.settings.retryCount,
        concurrency: workflow.settings.concurrency,
        errorHandling: workflow.settings.errorHandling
      },
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      version: workflow.version
    };
  }

  /**
   * Save a workflow
   */
  async saveWorkflow(workflow: Workflow): Promise<void> {
    this.ensureStorage();
    workflow.updatedAt = new Date().toISOString();
    await this.storage.saveWorkflow(workflow);
  }

  /**
   * Load a workflow
   */
  async loadWorkflow(workflowId: string): Promise<Workflow | null> {
    this.ensureStorage();
    return this.storage.loadWorkflow(workflowId);
  }

  /**
   * List all workflows
   */
  async listWorkflows(): Promise<Workflow[]> {
    this.ensureStorage();
    return this.storage.listWorkflows();
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    this.ensureStorage();
    // Check if storage provider supports deletion
    if (this.storage instanceof BackendStorageProvider) {
      const { deleteWorkflow } = await import('@/lib/api/services/workflowApi');
      await deleteWorkflow(workflowId);
      console.log(`✅ Workflow deleted: ${workflowId}`);
    } else {
      throw new Error('Delete operation not supported by current storage provider');
    }
  }

  /**
   * Execute a workflow using the backend LangGraph engine
   */
  async executeWorkflow(
    workflow: Workflow,
    input: ExecutionContext = {},
    options: import('./engine/types').ExecuteOptions = {}
  ): Promise<WorkflowExecution> {
    try {
      // Always use backend API with LangGraph engine when possible
      const uid = authService.getUserId();
      const hasBackendToken = !!getAuthToken();
      
      if (uid && hasBackendToken && this.useBackendAPI) {
        // Use backend API with LangGraph engine
        console.log('🚀 Using Backend LangGraph Engine');
        try {
          // Save workflow first to ensure it exists in backend
          await this.saveWorkflow(workflow);
          
          // Execute workflow through backend API
          const executionStartTime = Date.now();
          const response = await workflowService.executeWorkflow(workflow.id, {
            input: input,
            config: {}
          });

          // Convert backend response to WorkflowExecution format
          const execution: WorkflowExecution = {
            id: `exec_${executionStartTime}_${Math.random().toString(36).substr(2, 9)}`,
            workflowId: workflow.id,
            status: response.status === 'completed' || response.status === 'success' ? 'completed' : 'failed',
            startTime: executionStartTime,
            endTime: Date.now(),
            duration: response.execution_time_ms || 0,
            input: input,
            nodeLogs: response.node_logs || [],
            metadata: {
              tokensUsed: 0,
              cost: 0
            },
            output: response.final_output || {},
            error: response.error
          };
          
          // Save execution to storage
          try {
            this.ensureStorage();
            await this.storage.saveExecution(execution);
          } catch (error) {
            console.error('Failed to save execution:', error);
          }
          
          return execution;
        } catch (error) {
          console.error('Backend workflow execution failed:', error);
          throw error;
        }
      }
      
      // If we can't use backend API, throw an error to make it clear
      throw new Error('Cannot execute workflow: Backend API not available or user not authenticated. Please ensure you are logged in and the backend server is running.');
    } catch (error) {
      console.error('Workflow execution failed:', error);
      throw error;
    }
  }

  /**
   * Get execution by ID
   */
  async getExecution(executionId: string): Promise<WorkflowExecution | null> {
    this.ensureStorage();
    return this.storage.loadExecution(executionId);
  }

  /**
   * List executions for a workflow
   */
  async listExecutions(workflowId: string): Promise<WorkflowExecution[]> {
    this.ensureStorage();
    return this.storage.listExecutions(workflowId);
  }

  /**
   * Validate a workflow
   */
  async validateWorkflow(workflow: Workflow): Promise<any> {
    const workflowConfig = this.convertToWorkflowConfig(workflow);
    // The engine will validate during execution
    return { valid: true, errors: [] };
  }

  /**
   * Get execution logs from engine
   */
  getExecutionLogs(): any[] {
    return this.engine.getLogs();
  }

  /**
   * Get execution summary from engine
   */
  getExecutionSummary(): any {
    return this.engine.getExecutionSummary();
  }
}

// Export singleton instance
export const workflowManager = new WorkflowManager(typeof window !== 'undefined');