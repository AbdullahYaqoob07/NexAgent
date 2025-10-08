/**
 * NexAgent Workflow Engine
 * Core engine that executes workflows with step-by-step logging
 */

import { 
  WorkflowConfig, 
  WorkflowExecutionResult, 
  ExecutionContext, 
  ExecutionLog,
  NodeClass 
} from './types';
import { WorkflowLogger } from './logger';
import { getNodeMapping, createNodeInstance } from './nodeTypeMapping';

export class WorkflowEngine {
  private logger: WorkflowLogger;

  constructor(loggerConfig?: any) {
    this.logger = new WorkflowLogger(loggerConfig);
  }

  /**
   * Execute a workflow with step-by-step logging
   */
  async executeWorkflow(
    workflow: WorkflowConfig,
    context: ExecutionContext = {},
    options: import('./types').ExecuteOptions = {}
  ): Promise<WorkflowExecutionResult> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    this.logger.clearLogs();
    
    try {
      console.log(`🚀 Starting workflow execution: ${workflow.name} (${executionId})`);
      
      // Validate workflow before execution
      const validationErrors = this.validateWorkflow(workflow);
      if (validationErrors.length > 0) {
        throw new Error(`Workflow validation failed: ${validationErrors.join(', ')}`);
      }

      // Execute nodes in order
      const executionResult = await this.executeNodes(workflow, context, options);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      const logs = this.logger.getLogs();
      const summary = this.logger.getExecutionSummary();

      console.log(`✅ Workflow execution completed: ${workflow.name} (${duration}ms)`);

      return {
        success: true,
        workflowId: workflow.id,
        executionId,
        status: 'completed',
        startTime,
        endTime,
        duration,
        totalTokensUsed: summary.totalTokensUsed,
        totalCost: summary.totalCost,
        logs,
        context: executionResult.context,
        error: undefined
      };

    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      const logs = this.logger.getLogs();
      const summary = this.logger.getExecutionSummary();

      console.error(`❌ Workflow execution failed: ${workflow.name} (${duration}ms)`, error);

      return {
        success: false,
        workflowId: workflow.id,
        executionId,
        status: 'failed',
        startTime,
        endTime,
        duration,
        totalTokensUsed: summary.totalTokensUsed,
        totalCost: summary.totalCost,
        logs,
        context,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Execute all nodes in the workflow
   */
  private async executeNodes(
    workflow: WorkflowConfig,
    context: ExecutionContext,
    options: any
  ): Promise<{ context: ExecutionContext }> {
    const executionContext = { ...context };
    const executedNodes = new Set<string>();
    const nodeQueue = this.getExecutionOrder(workflow);
    
    console.log(`📋 Executing ${nodeQueue.length} nodes in order`);

    for (let i = 0; i < nodeQueue.length; i++) {
      const nodeConfig = nodeQueue[i];
      const stepNumber = i + 1;

      try {
        // Check if node was already executed (for parallel execution)
        if (executedNodes.has(nodeConfig.id)) {
          console.log(`⏭️ Skipping already executed node: ${nodeConfig.name}`);
          continue;
        }

        // Get node mapping
        const mapping = getNodeMapping(nodeConfig.sidebarType);
        if (!mapping) {
          const error = `Unknown node type: ${nodeConfig.sidebarType}`;
          console.error(`❌ ${error}`);
          
          const log = this.logger.startStep(
            stepNumber,
            nodeConfig.sidebarType,
            'Unknown',
            nodeConfig.name,
            executionContext,
            nodeConfig.id
          );
          options.onStepStart?.(log);
          this.logger.failStep(log, error);
          
          if (options.errorHandling === 'stop') {
            throw new Error(error);
          }
          continue;
        }

        // Create node instance
        const nodeInstance = createNodeInstance(nodeConfig.sidebarType);
        if (!nodeInstance) {
          const error = `Failed to create node instance: ${nodeConfig.sidebarType}`;
          console.error(`❌ ${error}`);
          
          const log = this.logger.startStep(
            stepNumber,
            nodeConfig.sidebarType,
            mapping.engineType,
            nodeConfig.name,
            executionContext,
            nodeConfig.id
          );
          options.onStepStart?.(log);
          this.logger.failStep(log, error);
          
          if (options.errorHandling === 'stop') {
            throw new Error(error);
          }
          continue;
        }

        // Start logging the step
        const log = this.logger.startStep(
          stepNumber,
          nodeConfig.sidebarType,
          mapping.engineType,
          nodeConfig.name,
          executionContext
        );

        // Execute the node
        console.log(`🔄 Executing step ${stepNumber}: ${nodeConfig.sidebarType} → ${mapping.engineType}`);
        
        const nodeResult = await this.executeNodeWithRetry(
          nodeInstance,
          executionContext,
          nodeConfig.config,
          options.retryCount || 0
        );

        if (nodeResult.success) {
          // Update context with node output
          if (nodeResult.result) {
            executionContext[`${nodeConfig.id}_output`] = nodeResult.result;
            executionContext[`${nodeConfig.sidebarType}_output`] = nodeResult.result;
          }

          // Complete the step
          this.logger.completeStep(log, nodeResult.result, nodeResult.metadata);
          options.onStepComplete?.(log);
          
          console.log(`✅ Step ${stepNumber} completed: ${nodeConfig.sidebarType} → ${mapping.engineType}`);
        } else {
          // Handle node execution failure
          this.logger.failStep(log, nodeResult.error || 'Node execution failed', nodeResult.metadata);
          options.onStepFail?.(log);
          
          console.error(`❌ Step ${stepNumber} failed: ${nodeConfig.sidebarType} → ${mapping.engineType}: ${nodeResult.error}`);
          
          if (options.errorHandling === 'stop') {
            throw new Error(`Node execution failed: ${nodeResult.error}`);
          }
        }

        executedNodes.add(nodeConfig.id);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error(`❌ Step ${stepNumber} error: ${nodeConfig.sidebarType}: ${errorMessage}`);
        
        const log = this.logger.startStep(
          stepNumber,
          nodeConfig.sidebarType,
          'Unknown',
          nodeConfig.name,
          executionContext,
          nodeConfig.id
        );
        options.onStepStart?.(log);
        this.logger.failStep(log, errorMessage);
        options.onStepFail?.(log);
        
        if (options.errorHandling === 'stop') {
          throw error;
        }
      }
    }

    return { context: executionContext };
  }

  /**
   * Execute a single node with retry logic
   */
  private async executeNodeWithRetry(
    nodeInstance: NodeClass,
    context: ExecutionContext,
    config: Record<string, any>,
    maxRetries: number
  ): Promise<any> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 Retrying node execution (attempt ${attempt + 1}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        }
        
        return await nodeInstance.execute(context, config);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === maxRetries) {
          return {
            success: false,
            error: lastError.message,
            metadata: {
              executionTime: 0,
              tokensUsed: 0,
              cost: 0,
              retryCount: attempt
            }
          };
        }
      }
    }
    
    return {
      success: false,
      error: lastError?.message || 'Max retries exceeded',
      metadata: {
        executionTime: 0,
        tokensUsed: 0,
        cost: 0,
        retryCount: maxRetries
      }
    };
  }

  /**
   * Get execution order for nodes (topological sort)
   */
  private getExecutionOrder(workflow: WorkflowConfig): any[] {
    // For now, return nodes in the order they appear
    // In a real implementation, this would do topological sorting based on connections
    return workflow.nodes.filter(node => node.enabled);
  }

  /**
   * Validate workflow configuration
   */
  private validateWorkflow(workflow: WorkflowConfig): string[] {
    const errors: string[] = [];

    if (!workflow.id) {
      errors.push('Workflow ID is required');
    }

    if (!workflow.name) {
      errors.push('Workflow name is required');
    }

    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push('Workflow must have at least one node');
    }

    // Validate each node
    workflow.nodes.forEach((node, index) => {
      if (!node.id) {
        errors.push(`Node ${index + 1} is missing ID`);
      }

      if (!node.sidebarType) {
        errors.push(`Node ${index + 1} is missing sidebar type`);
      }

      if (!node.name) {
        errors.push(`Node ${index + 1} is missing name`);
      }

      // Check if node type is supported
      if (node.sidebarType && !getNodeMapping(node.sidebarType)) {
        errors.push(`Node ${index + 1} has unsupported type: ${node.sidebarType}`);
      }
    });

    return errors;
  }

  /**
   * Get execution logs
   */
  getLogs(): ExecutionLog[] {
    return this.logger.getLogs();
  }

  /**
   * Get execution summary
   */
  getExecutionSummary() {
    return this.logger.getExecutionSummary();
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return this.logger.exportLogs();
  }
}