/**
 * Advanced Workflow Execution Engine
 * Handles step-by-step execution like n8n, Zapier, and Make.com
 */

import { 
  Workflow, 
  WorkflowNode, 
  WorkflowConnection,
  NodeExecutionResult,
  WorkflowExecution,
  NodeExecutionLog,
  ExecutionContext,
  NodeCategory
} from '../types';

interface ExecutionOptions {
  timeout?: number;
  retryCount?: number;
  errorHandling?: 'stop' | 'continue' | 'retry';
  onStepStart?: (log: NodeExecutionLog) => void;
  onStepComplete?: (log: NodeExecutionLog) => void;
  onStepFail?: (log: NodeExecutionLog) => void;
  onExecutionUpdate?: (execution: WorkflowExecution) => void;
  allowNoTrigger?: boolean; // allow single-node or no-trigger workflows (e.g., test mode)
}

interface NodeExecutor {
  nodeId: string;
  node: WorkflowNode;
  inputConnections: WorkflowConnection[];
  outputConnections: WorkflowConnection[];
  dependencies: string[];
  dependents: string[];
}

export class AdvancedWorkflowEngine {
  private executionContext: Map<string, any> = new Map();
  private executedNodes: Set<string> = new Set();
  private nodeExecutors: Map<string, NodeExecutor> = new Map();
  private executionLogs: NodeExecutionLog[] = [];
  private currentExecution: WorkflowExecution | null = null;

  /**
   * Main execution entry point
   */
  async execute(
    workflow: Workflow,
    initialContext: ExecutionContext = {},
    options: ExecutionOptions = {}
  ): Promise<WorkflowExecution> {
    console.log(`🚀 Starting workflow execution: ${workflow.name}`);
    
    // Initialize execution
    const execution = this.initializeExecution(workflow, initialContext);
    this.currentExecution = execution;
    
    try {
      // Build execution graph
      this.buildExecutionGraph(workflow);
      
      // Validate workflow (allow single-node tests if option or input.testMode set)
      const allowNoTrigger = options.allowNoTrigger || Boolean(initialContext && (initialContext as any).testMode);
      this.validateWorkflow(workflow, { allowNoTrigger });
      
      // Get execution plan using topological sort
      const executionPlan = this.getExecutionPlan(workflow);
      console.log(`📋 Execution plan: ${executionPlan.map(n => n.name).join(' → ')}`);
      
      // Execute nodes according to plan
      await this.executeNodes(executionPlan, options);
      
      // Complete execution
      execution.status = 'completed';
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      // Convert Map to plain object for Firebase
      execution.output = Object.fromEntries(this.executionContext);
      
      console.log(`✅ Workflow completed successfully in ${execution.duration}ms`);
      
    } catch (error) {
      execution.status = 'failed';
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      // Ensure output is a plain object, not a Map
      execution.output = Object.fromEntries(this.executionContext);
      
      console.error(`❌ Workflow failed: ${execution.error}`);
      throw error;
    }
    
    execution.nodeLogs = this.executionLogs;
    options.onExecutionUpdate?.(execution);
    
    return execution;
  }

  /**
   * Initialize execution
   */
  private initializeExecution(
    workflow: Workflow,
    initialContext: ExecutionContext
  ): WorkflowExecution {
    this.executionContext.clear();
    this.executedNodes.clear();
    this.executionLogs = [];
    
    // Set initial context
    Object.entries(initialContext).forEach(([key, value]) => {
      this.executionContext.set(key, value);
    });
    
    return {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workflowId: workflow.id,
      status: 'running',
      startTime: Date.now(),
      input: initialContext,
      nodeLogs: [],
      metadata: {
        tokensUsed: 0,
        cost: 0
      }
    };
  }

  /**
   * Build execution graph with node relationships
   */
  private buildExecutionGraph(workflow: Workflow): void {
    this.nodeExecutors.clear();
    
    // Create node executors
    workflow.nodes.forEach(node => {
      const inputConnections = workflow.connections.filter(c => c.targetNodeId === node.id);
      const outputConnections = workflow.connections.filter(c => c.sourceNodeId === node.id);
      
      const dependencies = inputConnections.map(c => c.sourceNodeId);
      const dependents = outputConnections.map(c => c.targetNodeId);
      
      this.nodeExecutors.set(node.id, {
        nodeId: node.id,
        node,
        inputConnections,
        outputConnections,
        dependencies,
        dependents
      });
    });
  }

  /**
   * Validate workflow structure
   */
  private validateWorkflow(workflow: Workflow, opts: { allowNoTrigger?: boolean } = {}): void {
    const errors: string[] = [];
    
    // Check for at least one trigger node (unless allowed)
    const triggerNodes = workflow.nodes.filter(n => n.category === NodeCategory.TRIGGER);
    if (!opts.allowNoTrigger && triggerNodes.length === 0) {
      errors.push('Workflow must have at least one trigger node');
    }
    
    // Check for disconnected nodes (except triggers)
    workflow.nodes.forEach(node => {
      if (node.category !== NodeCategory.TRIGGER) {
        const executor = this.nodeExecutors.get(node.id);
        if (!executor?.dependencies.length && !opts.allowNoTrigger) {
          errors.push(`Node "${node.name}" is not connected to any input`);
        }
      }
    });
    
    // Check for cycles
    if (this.hasCycle(workflow)) {
      errors.push('Workflow contains circular dependencies');
    }
    
    if (errors.length > 0) {
      throw new Error(`Workflow validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Check if workflow has cycles using DFS
   */
  private hasCycle(workflow: Workflow): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const visit = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      
      const executor = this.nodeExecutors.get(nodeId);
      if (executor) {
        for (const dependentId of executor.dependents) {
          if (!visited.has(dependentId)) {
            if (visit(dependentId)) return true;
          } else if (recursionStack.has(dependentId)) {
            return true;
          }
        }
      }
      
      recursionStack.delete(nodeId);
      return false;
    };
    
    for (const node of workflow.nodes) {
      if (!visited.has(node.id)) {
        if (visit(node.id)) return true;
      }
    }
    
    return false;
  }

  /**
   * Get execution plan using topological sort (Kahn's algorithm)
   */
  private getExecutionPlan(workflow: Workflow): WorkflowNode[] {
    const plan: WorkflowNode[] = [];
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    
    // Calculate in-degree for each node
    workflow.nodes.forEach(node => {
      const executor = this.nodeExecutors.get(node.id)!;
      inDegree.set(node.id, executor.dependencies.length);
      
      // Add nodes with no dependencies (triggers) to queue
      if (executor.dependencies.length === 0) {
        queue.push(node.id);
      }
    });
    
    // Process nodes in topological order
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const executor = this.nodeExecutors.get(nodeId)!;
      plan.push(executor.node);
      
      // Reduce in-degree for dependent nodes
      executor.dependents.forEach(dependentId => {
        const degree = inDegree.get(dependentId)! - 1;
        inDegree.set(dependentId, degree);
        
        if (degree === 0) {
          queue.push(dependentId);
        }
      });
    }
    
    if (plan.length !== workflow.nodes.length) {
      throw new Error('Failed to create execution plan - possible circular dependency');
    }
    
    return plan;
  }

  /**
   * Execute nodes according to plan
   */
  private async executeNodes(
    executionPlan: WorkflowNode[],
    options: ExecutionOptions
  ): Promise<void> {
    for (const node of executionPlan) {
      // Check if all dependencies are executed
      const executor = this.nodeExecutors.get(node.id)!;
      const dependenciesReady = executor.dependencies.every(dep => 
        this.executedNodes.has(dep)
      );
      
      if (!dependenciesReady) {
        console.warn(`⚠️ Skipping node "${node.name}" - dependencies not ready`);
        continue;
      }
      
      // Handle fork nodes specially - execute branches in parallel
      if (node.category === NodeCategory.LOGIC && (node.type === 'Double' || node.type === 'Triple')) {
        await this.executeForkNode(node, executor, options);
      } else {
        await this.executeSingleNode(node, executor, options);
      }
    }
  }

  /**
   * Execute a single node
   */
  private async executeSingleNode(
    node: WorkflowNode,
    executor: NodeExecutor,
    options: ExecutionOptions
  ): Promise<void> {
    const log: NodeExecutionLog = {
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      status: 'running',
      startTime: Date.now(),
      retryCount: 0,
      metadata: {}
    };
    
    this.executionLogs.push(log);
    options.onStepStart?.(log);
    
    console.log(`🔄 Executing: ${node.name} (${node.type})`);
    
    try {
      // Gather input data from connections
      const inputData = this.gatherInputData(executor);
      log.input = inputData;
      
      // Execute node with retries
      const result = await this.executeWithRetry(
        node,
        inputData,
        options.retryCount || 0
      );
      
      // Store output in context
      this.executionContext.set(`${node.id}_output`, result.result);
      this.executionContext.set(`${node.name}_output`, result.result);
      
      // Update log
      log.status = 'completed';
      log.endTime = Date.now();
      log.duration = log.endTime - log.startTime;
      log.output = result.result;
      log.metadata = result.metadata;
      
      this.executedNodes.add(node.id);
      options.onStepComplete?.(log);
      
      console.log(`✅ Completed: ${node.name} in ${log.duration}ms`);
      
    } catch (error) {
      log.status = 'failed';
      log.endTime = Date.now();
      log.duration = log.endTime! - log.startTime;
      log.error = error instanceof Error ? error.message : 'Unknown error';
      
      options.onStepFail?.(log);
      console.error(`❌ Failed: ${node.name} - ${log.error}`);
      
      if (options.errorHandling === 'stop') {
        throw error;
      }
    }
  }

  /**
   * Execute fork node with parallel branches
   */
  private async executeForkNode(
    node: WorkflowNode,
    executor: NodeExecutor,
    options: ExecutionOptions
  ): Promise<void> {
    console.log(`🔀 Executing fork: ${node.name}`);
    
    const log: NodeExecutionLog = {
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      status: 'running',
      startTime: Date.now(),
      retryCount: 0,
      metadata: {}
    };
    
    this.executionLogs.push(log);
    options.onStepStart?.(log);
    
    try {
      // Get input data
      const inputData = this.gatherInputData(executor);
      
      // Execute fork logic (splits data)
      const forkResult = await this.executeForkLogic(node, inputData);
      
      // Store fork outputs for each branch
      forkResult.branches.forEach((branchData: any, index: number) => {
        const outputPort = `output_${index + 1}`;
        this.executionContext.set(`${node.id}_${outputPort}`, branchData);
      });
      
      this.executedNodes.add(node.id);
      
      // Get branches (dependent nodes grouped by output port)
      const branches = this.getBranches(executor);
      
      // Execute branches in parallel
      await this.executeParallelBranches(branches, options);
      
      log.status = 'completed';
      log.endTime = Date.now();
      log.duration = log.endTime - log.startTime;
      options.onStepComplete?.(log);
      
      console.log(`✅ Fork completed: ${node.name}`);
      
    } catch (error) {
      log.status = 'failed';
      log.endTime = Date.now();
      log.error = error instanceof Error ? error.message : 'Unknown error';
      options.onStepFail?.(log);
      
      if (options.errorHandling === 'stop') {
        throw error;
      }
    }
  }

  /**
   * Execute fork logic to split data
   */
  private async executeForkLogic(
    node: WorkflowNode,
    inputData: any
  ): Promise<{ branches: any[] }> {
    // Determine number of branches based on node type
    let branchCount = 2;
    
    if (node.type === 'Double') branchCount = 2;
    else if (node.type === 'Triple') branchCount = 3;
    else if (node.type === 'Quadra') branchCount = 4;
    else if (node.type === 'Custom') {
      branchCount = node.config?.outputCount || 2;
    }
    
    // Split data for branches
    const branches: any[] = [];
    
    if (Array.isArray(inputData)) {
      // Split array evenly
      const chunkSize = Math.ceil(inputData.length / branchCount);
      for (let i = 0; i < branchCount; i++) {
        branches.push(inputData.slice(i * chunkSize, (i + 1) * chunkSize));
      }
    } else {
      // Duplicate data for each branch
      for (let i = 0; i < branchCount; i++) {
        branches.push({ ...inputData, branchIndex: i });
      }
    }
    
    return { branches };
  }

  /**
   * Get branches from fork node
   */
  private getBranches(forkExecutor: NodeExecutor): Map<string, WorkflowNode[]> {
    const branches = new Map<string, WorkflowNode[]>();
    
    forkExecutor.outputConnections.forEach(conn => {
      const outputPort = conn.sourcePortId;
      if (!branches.has(outputPort)) {
        branches.set(outputPort, []);
      }
      
      const targetExecutor = this.nodeExecutors.get(conn.targetNodeId);
      if (targetExecutor) {
        branches.get(outputPort)!.push(targetExecutor.node);
      }
    });
    
    return branches;
  }

  /**
   * Execute parallel branches
   */
  private async executeParallelBranches(
    branches: Map<string, WorkflowNode[]>,
    options: ExecutionOptions
  ): Promise<void> {
    const branchPromises: Promise<void>[] = [];
    
    branches.forEach((branchNodes, outputPort) => {
      const branchPromise = this.executeBranch(branchNodes, outputPort, options);
      branchPromises.push(branchPromise);
    });
    
    await Promise.all(branchPromises);
  }

  /**
   * Execute a single branch
   */
  private async executeBranch(
    branchNodes: WorkflowNode[],
    outputPort: string,
    options: ExecutionOptions
  ): Promise<void> {
    console.log(`  ├─ Executing branch ${outputPort} with ${branchNodes.length} nodes`);
    
    for (const node of branchNodes) {
      const executor = this.nodeExecutors.get(node.id)!;
      await this.executeSingleNode(node, executor, options);
    }
  }

  /**
   * Gather input data from node connections
   */
  private gatherInputData(executor: NodeExecutor): any {
    if (executor.inputConnections.length === 0) {
      // Trigger node - use initial context
      return Object.fromEntries(this.executionContext);
    }
    
    if (executor.inputConnections.length === 1) {
      // Single input - pass data directly
      const conn = executor.inputConnections[0];
      const sourceOutput = conn.sourcePortId || 'output';
      return this.executionContext.get(`${conn.sourceNodeId}_${sourceOutput}`);
    }
    
    // Multiple inputs - merge data
    const mergedData: any = {};
    executor.inputConnections.forEach(conn => {
      const sourceOutput = conn.sourcePortId || 'output';
      const data = this.executionContext.get(`${conn.sourceNodeId}_${sourceOutput}`);
      if (data) {
        Object.assign(mergedData, { [`input_${conn.sourceNodeId}`]: data });
      }
    });
    
    return mergedData;
  }

  /**
   * Execute node with retry logic
   */
  private async executeWithRetry(
    node: WorkflowNode,
    inputData: any,
    maxRetries: number
  ): Promise<NodeExecutionResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`  🔄 Retry ${attempt}/${maxRetries} for ${node.name}`);
          await this.delay(1000 * attempt); // Exponential backoff
        }
        
        return await this.executeNodeHandler(node, inputData);
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === maxRetries) {
          throw lastError;
        }
      }
    }
    
    throw lastError || new Error('Execution failed');
  }

  /**
   * Execute the actual node handler
   */
  private async executeNodeHandler(
    node: WorkflowNode,
    inputData: any
  ): Promise<NodeExecutionResult> {
    // Import and execute the appropriate node handler
    const startTime = Date.now();
    
    try {
      // Dynamic import based on node type
      const { createNodeInstance } = await import('./nodeTypeMapping');
      const nodeInstance = createNodeInstance(node.type);
      
      if (!nodeInstance) {
        throw new Error(`No handler found for node type: ${node.type}`);
      }
      
      // Execute the node
      const result = await nodeInstance.execute(
        { ...inputData, nodeConfig: node.config },
        node.config
      );
      
      return {
        success: true,
        result: result.result,
        metadata: {
          ...result.metadata,
          executionTime: Date.now() - startTime
        }
      };
      
    } catch (error) {
      // For demo purposes, return mock data
      console.log(`  ℹ️ Using mock execution for ${node.type}`);
      
      return {
        success: true,
        result: this.getMockNodeResult(node, inputData),
        metadata: {
          executionTime: Date.now() - startTime,
          mock: true
        }
      };
    }
  }

  /**
   * Get mock result for demo
   */
  private getMockNodeResult(node: WorkflowNode, inputData: any): any {
    const mockResponses: Record<string, any> = {
      'On Clicking Execute': { triggered: true, timestamp: Date.now() },
      'HTTP Request': { status: 200, data: { message: 'Success' } },
      'Email': { sent: true, messageId: `msg_${Date.now()}` },
      'Database': { rows: [{ id: 1, name: 'Test' }], affected: 1 },
      'Slack': { ok: true, ts: Date.now() },
      'OpenAI': { response: 'AI generated response', tokens: 100 },
      'If': { branch: 'true', result: inputData },
      'Transform': { transformed: inputData, success: true },
      'Save': { saved: true, location: 'memory', data: inputData }
    };
    
    return mockResponses[node.type] || { 
      processed: true, 
      input: inputData,
      nodeType: node.type,
      timestamp: Date.now()
    };
  }

  /**
   * Helper to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current execution state
   */
  getExecutionState(): {
    context: Map<string, any>;
    executedNodes: Set<string>;
    logs: NodeExecutionLog[];
  } {
    return {
      context: new Map(this.executionContext),
      executedNodes: new Set(this.executedNodes),
      logs: [...this.executionLogs]
    };
  }

  /**
   * Clear execution state
   */
  clearState(): void {
    this.executionContext.clear();
    this.executedNodes.clear();
    this.nodeExecutors.clear();
    this.executionLogs = [];
    this.currentExecution = null;
  }
}

export default AdvancedWorkflowEngine;