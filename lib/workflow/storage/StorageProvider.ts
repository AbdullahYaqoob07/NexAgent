/**
 * Storage provider interface and implementations
 */

import { Workflow, WorkflowExecution, StorageProvider as IStorageProvider } from '../types';

/**
 * In-memory storage implementation
 */
export class InMemoryStorageProvider implements IStorageProvider {
  private workflows: Map<string, Workflow> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();

  async saveWorkflow(workflow: Workflow): Promise<void> {
    this.workflows.set(workflow.id, workflow);
  }

  async loadWorkflow(workflowId: string): Promise<Workflow | null> {
    return this.workflows.get(workflowId) || null;
  }

  async listWorkflows(): Promise<Workflow[]> {
    return Array.from(this.workflows.values());
  }

  async saveExecution(execution: WorkflowExecution): Promise<void> {
    this.executions.set(execution.id, execution);
  }

  async loadExecution(executionId: string): Promise<WorkflowExecution | null> {
    return this.executions.get(executionId) || null;
  }

  async listExecutions(workflowId?: string): Promise<WorkflowExecution[]> {
    const allExecutions = Array.from(this.executions.values());
    
    if (workflowId) {
      return allExecutions.filter(execution => execution.workflowId === workflowId);
    }
    
    return allExecutions;
  }
}

/**
 * Local storage implementation for browser
 */
export class LocalStorageProvider implements IStorageProvider {
  private readonly WORKFLOWS_KEY = 'nexagent_workflows';
  private readonly EXECUTIONS_KEY = 'nexagent_executions';

  async saveWorkflow(workflow: Workflow): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('LocalStorage is not available in this environment');
    }

    const workflows = await this.listWorkflows();
    const existingIndex = workflows.findIndex(w => w.id === workflow.id);
    
    if (existingIndex >= 0) {
      workflows[existingIndex] = workflow;
    } else {
      workflows.push(workflow);
    }
    
    localStorage.setItem(this.WORKFLOWS_KEY, JSON.stringify(workflows));
  }

  async loadWorkflow(workflowId: string): Promise<Workflow | null> {
    if (typeof window === 'undefined') {
      return null;
    }

    const workflows = await this.listWorkflows();
    return workflows.find(w => w.id === workflowId) || null;
  }

  async listWorkflows(): Promise<Workflow[]> {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const data = localStorage.getItem(this.WORKFLOWS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load workflows from localStorage:', error);
      return [];
    }
  }

  async saveExecution(execution: WorkflowExecution): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('LocalStorage is not available in this environment');
    }

    const executions = await this.listExecutions();
    const existingIndex = executions.findIndex(e => e.id === execution.id);
    
    if (existingIndex >= 0) {
      executions[existingIndex] = execution;
    } else {
      executions.push(execution);
    }
    
    localStorage.setItem(this.EXECUTIONS_KEY, JSON.stringify(executions));
  }

  async loadExecution(executionId: string): Promise<WorkflowExecution | null> {
    if (typeof window === 'undefined') {
      return null;
    }

    const executions = await this.listExecutions();
    return executions.find(e => e.id === executionId) || null;
  }

  async listExecutions(workflowId?: string): Promise<WorkflowExecution[]> {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const data = localStorage.getItem(this.EXECUTIONS_KEY);
      const executions = data ? JSON.parse(data) : [];
      
      if (workflowId) {
        return executions.filter((e: WorkflowExecution) => e.workflowId === workflowId);
      }
      
      return executions;
    } catch (error) {
      console.error('Failed to load executions from localStorage:', error);
      return [];
    }
  }
}
