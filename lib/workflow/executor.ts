/**
 * Workflow Execution Engine
 * Executes workflow nodes in topological order
 */

import { replaceVariables, type VariableContext } from './utils/variableReplacer';
import type { TelegramSendConfig } from './nodes/telegram/schema';
import { executeDelayNode, type DelayNodeConfig } from '@/src/workflows/delay';
import { executeStopperNode, type StopperNodeConfig } from '@/src/workflows/stopper';

export interface WorkflowNode {
  id: string;
  type: string;
  config: Record<string, any>;
}

export interface WorkflowEdge {
  source: string;
  target: string;
}

export interface ExecutionResult {
  success: boolean;
  nodeId: string;
  nodeType: string;
  output: any;
  error?: string;
  executedAt: string;
}

export interface WorkflowExecutionResult {
  success: boolean;
  results: ExecutionResult[];
  totalTime: number;
  errors: string[];
}

export class WorkflowExecutor {
  private context: VariableContext = {
    trigger: {},
    nodes: {},
    variables: {},
  };
  private apiBaseUrl: string;
  private startTime: number = 0;

  constructor(apiBaseUrl: string = '/') {
    this.apiBaseUrl = apiBaseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Execute a complete workflow
   */
  async executeWorkflow(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    triggerData?: Record<string, any>
  ): Promise<WorkflowExecutionResult> {
    this.startTime = Date.now();
    
    // Initialize context with trigger data
    this.context.trigger = triggerData || {};
    this.context.nodes = {};
    this.context.variables = {};

    // Separate Stopper nodes from regular nodes
    const stopperNodes = nodes.filter((n) => n.type === 'Stopper');
    const regularNodes = nodes.filter((n) => n.type !== 'Stopper');

    // Topological sort to execute nodes in order
    const executionOrder = this.topologicalSort(regularNodes, edges);
    const results: ExecutionResult[] = [];
    const errors: string[] = [];

    console.log(`🚀 Starting workflow execution. Order: ${executionOrder.join(' → ')}`);

    // Execute regular nodes
    for (const nodeId of executionOrder) {
      const node = regularNodes.find((n) => n.id === nodeId);
      if (!node) {
        errors.push(`Node ${nodeId} not found`);
        continue;
      }

      try {
        console.log(`⏳ Executing node: ${node.id} (${node.type})`);

        const result = await this.executeNode(node);

        // Store result in context for next nodes
        if (this.context.nodes) {
          this.context.nodes[node.id] = result.output;
        }

        results.push(result);

        console.log(`✅ Node ${node.id} completed successfully`);

        // If node failed, continue (non-blocking) for now
        // Remove this condition if you want to stop on first error
        // if (result.output?.success === false) {
        //   errors.push(`Node ${node.id} failed: ${result.output?.error}`);
        //   break;
        // }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Node ${node.id} threw error: ${errorMessage}`);
        console.error(`❌ Node ${node.id} error:`, errorMessage);

        results.push({
          success: false,
          nodeId: node.id,
          nodeType: node.type,
          output: { error: errorMessage },
          error: errorMessage,
          executedAt: new Date().toISOString(),
        });

        // Don't break - continue executing remaining nodes
      }
    }

    const totalTime = Date.now() - this.startTime;

    // Execute Stopper node (if any) to summarize workflow
    for (const stopperNode of stopperNodes) {
      try {
        console.log(`⏳ Executing Stopper node: ${stopperNode.id}`);

        const result = await this.executeStopper(
          stopperNode,
          errors.length === 0 ? 'success' : 'error',
          totalTime,
          errors,
          regularNodes.length,
          results.filter((r) => !r.success).length
        );

        results.push(result);
        console.log(`✅ Stopper node ${stopperNode.id} executed`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Stopper node error:`, errorMessage);

        results.push({
          success: false,
          nodeId: stopperNode.id,
          nodeType: stopperNode.type,
          output: { error: errorMessage },
          error: errorMessage,
          executedAt: new Date().toISOString(),
        });
      }
    }

    console.log(`\n🏁 Workflow execution complete in ${totalTime}ms`);
    console.log(`Results: ${results.length} nodes, ${errors.length} errors`);

    return {
      success: errors.length === 0,
      results,
      totalTime,
      errors,
    };
  }

  /**
   * Execute a single node based on its type
   */
  private async executeNode(node: WorkflowNode): Promise<ExecutionResult> {
    const executedAt = new Date().toISOString();

    switch (node.type) {
      case 'ManualTrigger':
        return {
          success: true,
          nodeId: node.id,
          nodeType: node.type,
          output: {
            success: true,
            triggeredAt: executedAt,
            ...node.config,
          },
          executedAt,
        };

      case 'Delay':
        return await this.executeDelay(node, executedAt);

      case 'TelegramSend':
        return await this.executeTelegramSend(node, executedAt);

      case 'ChatInput':
        return {
          success: true,
          nodeId: node.id,
          nodeType: node.type,
          output: {
            success: true,
            message: node.config.currentMessage || '',
            messageLength: (node.config.currentMessage || '').length,
            timestamp: executedAt,
          },
          executedAt,
        };

      case 'Logger':
        return {
          success: true,
          nodeId: node.id,
          nodeType: node.type,
          output: this.executeLogger(node),
          executedAt,
        };

      case 'Stopper':
        // Stopper nodes are handled separately in executeWorkflow
        return {
          success: true,
          nodeId: node.id,
          nodeType: node.type,
          output: {
            success: true,
            message: 'Stopper node executed',
            timestamp: executedAt,
          },
          executedAt,
        };

      case 'Scheduling':
        return {
          success: true,
          nodeId: node.id,
          nodeType: node.type,
          output: {
            success: true,
            frequency: node.config.frequency || 'Not set',
            timezone: node.config.timezone || 'UTC',
            timestamp: executedAt,
          },
          executedAt,
        };

      case 'Webhook':
        return {
          success: true,
          nodeId: node.id,
          nodeType: node.type,
          output: {
            success: true,
            method: node.config.method || 'POST',
            path: node.config.path || 'webhook',
            timestamp: executedAt,
          },
          executedAt,
        };

      case 'Conditional':
      case 'Loop':
      case 'DataFormatter':
      case 'JSONParser':
      case 'EmailSend':
      case 'SlackMessage':
      case 'HTTPRequest':
      case 'OpenAI':
      case 'ClaudeAI':
      case 'GoogleSheets':
      case 'GoogleDrive':
      case 'Stripe':
        // Placeholder for nodes that need backend implementation
        return {
          success: true,
          nodeId: node.id,
          nodeType: node.type,
          output: {
            success: true,
            message: `${node.type} node executed (implementation pending)`,
            timestamp: executedAt,
          },
          executedAt,
        };

      default:
        console.warn(`⚠️ Unknown node type: ${node.type}. This may cause unexpected behavior.`);
        return {
          success: false,
          nodeId: node.id,
          nodeType: node.type,
          output: {
            success: false,
            error: `Unknown node type: ${node.type}`,
          },
          error: `Unknown node type: ${node.type}`,
          executedAt,
        };
    }
  }

  /**
   * Execute Telegram Send node
   */
  private async executeTelegramSend(
    node: WorkflowNode,
    executedAt: string
  ): Promise<ExecutionResult> {
    const config = node.config as TelegramSendConfig;

    try {
      // Replace variables in message
      const processedMessage = replaceVariables(config.message, this.context);

      console.log(
        `  📱 Telegram: Sending to ${config.chatId}, msg length: ${processedMessage.length}`
      );

      // Call backend API
      const response = await fetch(`${this.apiBaseUrl}/api/v1/telegram/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bot_token: config.botToken,
          chat_id: config.chatId,
          message: processedMessage,
          parse_mode: config.parseMode || 'HTML',
          disable_notification: config.disableNotification || false,
          protect_content: config.protectContent || false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorMessage = `HTTP ${response.status}: ${errorText}`;
        return {
          success: false,
          nodeId: node.id,
          nodeType: node.type,
          output: {
            success: false,
            error: errorMessage,
          },
          error: errorMessage,
          executedAt,
        };
      }

      const result = await response.json();

      if (result.success) {
        console.log(`  ✅ Telegram message sent! ID: ${result.message_id}`);
      } else {
        console.error(`  ❌ Telegram error: ${result.error}`);
      }

      return {
        success: result.success,
        nodeId: node.id,
        nodeType: node.type,
        output: result,
        error: result.error,
        executedAt,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ Telegram execution error:`, errorMessage);

      return {
        success: false,
        nodeId: node.id,
        nodeType: node.type,
        output: {
          success: false,
          error: errorMessage,
        },
        error: errorMessage,
        executedAt,
      };
    }
  }

  /**
   * Execute Delay node
   */
  private async executeDelay(
    node: WorkflowNode,
    executedAt: string
  ): Promise<ExecutionResult> {
    const config = node.config as DelayNodeConfig;

    try {
      console.log(
        `  ⏳ Delay: Waiting for ${config.duration}${config.unit}`
      );

      // Get the input data from context (pass-through from previous node)
      const inputData = this.context.nodes ? Object.values(this.context.nodes).pop() : null;

      // Execute the delay
      const result = await executeDelayNode({
        config: {
          duration: config.duration || 0,
          unit: config.unit || 'ms',
        },
        inputData: inputData,
        onProgress: (elapsed, total) => {
          const percent = Math.round((elapsed / total) * 100);
          console.log(`    ⏱️ Progress: ${percent}% (${elapsed}/${total}ms)`);
        },
      });

      console.log(
        `  ✅ Delay completed! Waited ${result.delayDuration}ms`
      );

      return {
        success: true,
        nodeId: node.id,
        nodeType: node.type,
        output: result,
        executedAt,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ Delay execution error:`, errorMessage);

      return {
        success: false,
        nodeId: node.id,
        nodeType: node.type,
        output: {
          success: false,
          error: errorMessage,
        },
        error: errorMessage,
        executedAt,
      };
    }
  }

  /**
   * Execute Stopper node - marks end of workflow and logs summary
   */
  private async executeStopper(
    node: WorkflowNode,
    workflowStatus: 'success' | 'error',
    workflowDuration: number,
    workflowErrors: string[],
    totalNodeCount: number,
    failedNodeCount: number
  ): Promise<ExecutionResult> {
    const config = node.config as StopperNodeConfig;
    const executedAt = new Date().toISOString();

    try {
      // Execute stopper
      const result = await executeStopperNode({
        config: {
          logLevel: config.logLevel || 'info',
          customMessage: config.customMessage,
        },
        workflowStatus,
        workflowDuration,
        workflowErrors,
        completedNodeCount: totalNodeCount - failedNodeCount,
        failedNodeCount,
      });

      return {
        success: workflowStatus === 'success',
        nodeId: node.id,
        nodeType: node.type,
        output: result,
        executedAt,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ Stopper execution error:`, errorMessage);

      return {
        success: false,
        nodeId: node.id,
        nodeType: node.type,
        output: {
          success: false,
          error: errorMessage,
        },
        error: errorMessage,
        executedAt,
      };
    }
  }

  /**
   * Execute Logger node
   */
  private executeLogger(node: WorkflowNode): any {
    const message = replaceVariables(
      node.config.message || 'Logging...',
      this.context
    );

    const output = {
      success: true,
      logged: message,
      timestamp: new Date().toISOString(),
    };

    console.log(`  📝 Logger: "${message}"`);

    // Also log to browser console
    console.log(`[${node.id}]:`, message);

    return output;
  }

  /**
   * Topological sort using Kahn's algorithm
   * Returns nodes in execution order (dependencies first)
   */
  private topologicalSort(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();

    // Initialize
    nodes.forEach((node) => {
      inDegree.set(node.id, 0);
      adjList.set(node.id, []);
    });

    // Build graph
    edges.forEach((edge) => {
      adjList.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });

    // Find nodes with no dependencies (start nodes)
    const queue: string[] = [];
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) queue.push(nodeId);
    });

    // Process queue (BFS)
    const result: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      adjList.get(current)?.forEach((neighbor) => {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      });
    }

    return result;
  }
}
