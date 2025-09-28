/**
 * Workflow Manager
 * Main entry point for the workflow engine
 */

import { WorkflowEngine } from './engine/WorkflowEngine';
import { InMemoryStorageProvider, LocalStorageProvider } from './storage/StorageProvider';
import { Workflow, WorkflowExecution, ExecutionContext } from './types';
import { WorkflowConfig } from './engine/types';

export class WorkflowManager {
  private engine: WorkflowEngine;
  private storage: InMemoryStorageProvider | LocalStorageProvider;

  constructor(useLocalStorage: boolean = false) {
    this.storage = useLocalStorage ? new LocalStorageProvider() : new InMemoryStorageProvider();
    this.engine = new WorkflowEngine();
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
        targetNodeId: conn.targetNodeId,
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
    workflow.updatedAt = new Date().toISOString();
    await this.storage.saveWorkflow(workflow);
  }

  /**
   * Load a workflow
   */
  async loadWorkflow(workflowId: string): Promise<Workflow | null> {
    return this.storage.loadWorkflow(workflowId);
  }

  /**
   * List all workflows
   */
  async listWorkflows(): Promise<Workflow[]> {
    return this.storage.listWorkflows();
  }

  /**
   * Execute a workflow using the new engine
   */
  async executeWorkflow(
    workflow: Workflow,
    input: ExecutionContext = {},
    options: {
      timeout?: number;
      retryCount?: number;
      errorHandling?: 'stop' | 'continue' | 'retry';
    } = {}
  ): Promise<WorkflowExecution> {
    try {
      // Convert Workflow to WorkflowConfig
      const workflowConfig = this.convertToWorkflowConfig(workflow);
      
      // Execute using the new engine
      const result = await this.engine.executeWorkflow(workflowConfig, input, options);
    
    // Convert result back to WorkflowExecution format
    const execution: WorkflowExecution = {
      id: result.executionId,
      workflowId: result.workflowId,
      status: result.status,
      startTime: result.startTime,
      endTime: result.endTime,
      duration: result.duration,
      input: input, // Use the original input
      nodeLogs: result.logs.map(log => ({
        nodeId: log.nodeName, // Map to nodeId
        nodeName: log.nodeName,
        nodeType: log.engineNodeClass,
        status: log.status,
        startTime: log.startTime,
        endTime: log.endTime,
        duration: log.duration,
        input: log.input,
        output: log.output,
        error: log.error,
        retryCount: log.retryCount,
        metadata: log.metadata
      })),
      metadata: {
        tokensUsed: result.totalTokensUsed,
        cost: result.totalCost,
        totalSteps: result.logs.length,
        completedSteps: result.logs.filter(log => log.status === 'completed').length,
        failedSteps: result.logs.filter(log => log.status === 'failed').length
      },
      output: result.context,
      error: result.error
    };

      // Save execution to storage
      try {
        await this.storage.saveExecution(execution);
      } catch (error) {
        console.error('Failed to save execution:', error);
        // Continue execution even if saving fails
      }
      
      return execution;
    } catch (error) {
      console.error('Workflow execution failed:', error);
      throw error;
    }
  }

  /**
   * Get execution by ID
   */
  async getExecution(executionId: string): Promise<WorkflowExecution | null> {
    return this.storage.loadExecution(executionId);
  }

  /**
   * List executions for a workflow
   */
  async listExecutions(workflowId: string): Promise<WorkflowExecution[]> {
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