import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class TimerNode implements NodeClass {
  type = 'TimerNode';
  name = 'Timer';
  description = 'Measures execution time between nodes or workflow segments';
  category = 'logic' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { timerName, action = 'start' } = config;
      
      if (!timerName) {
        throw new Error('Timer name is required');
      }
      
      // In a real implementation, this would access shared timer state
      // For now, we'll simulate by returning the operation details
      const timestamp = new Date().toISOString();
      console.log(`${action.charAt(0).toUpperCase() + action.slice(1)} timer '${timerName}' at ${timestamp}`);
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        result: {
          timerName,
          action,
          timestamp,
          input: context.input,
          executedAt: timestamp
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
    
    if (!config.timerName) {
      errors.push('Timer name is required');
    } else if (typeof config.timerName !== 'string') {
      errors.push('Timer name must be a string');
    }
    
    if (config.action && !['start', 'stop', 'lap'].includes(config.action)) {
      errors.push("Action must be either 'start', 'stop', or 'lap'");
    }
    
    return errors;
  }

  private calculateTokens(data: any): number {
    return Math.ceil(JSON.stringify(data).length / 4);
  }

  private calculateCost(data: any): number {
    return this.calculateTokens(data) * 0.00001;
  }
}