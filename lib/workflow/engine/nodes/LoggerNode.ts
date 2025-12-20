import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class LoggerNode implements NodeClass {
  type = 'LoggerNode';
  name = 'Logger';
  description = 'Outputs input data to logs for debugging and monitoring';
  category = 'action' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { logLevel = 'info', message = 'Workflow node execution' } = config;
      
      // Prepare data for logging
      const logData = {
        nodeId: context.nodeId,
        nodeName: context.nodeName,
        message,
        inputData: context.input,
        timestamp: new Date().toISOString()
      };
      
      // Log at appropriate level (simulated)
      console.log(`[${logLevel.toUpperCase()}] ${JSON.stringify(logData, null, 2)}`);
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        result: {
          logged: true,
          logLevel,
          message,
          input: context.input,
          loggedAt: new Date().toISOString()
        },
        metadata: {
          executionTime,
          tokensUsed: 0,
          cost: 0
        }
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          executionTime,
          tokensUsed: 0,
          cost: 0
        }
      };
    }
  }

  validate(config: Record<string, any>): string[] {
    const errors: string[] = [];
    // No required fields for LoggerNode
    return errors;
  }

  private calculateTokens(data: any): number {
    return Math.ceil(JSON.stringify(data).length / 4);
  }

  private calculateCost(data: any): number {
    return this.calculateTokens(data) * 0.00001;
  }
}