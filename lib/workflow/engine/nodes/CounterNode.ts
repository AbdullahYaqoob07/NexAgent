import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class CounterNode implements NodeClass {
  type = 'CounterNode';
  name = 'Counter';
  description = 'Increments or decrements a numerical counter';
  category = 'logic' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { counterName, operation = 'increment', step = 1 } = config;
      
      if (!counterName) {
        throw new Error('Counter name is required');
      }
      
      // In a real implementation, this would access shared state
      // For now, we'll simulate by returning the operation details
      console.log(`${operation.charAt(0).toUpperCase() + operation.slice(1)} counter '${counterName}' by ${step}`);
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        result: {
          counterName,
          operation,
          step,
          input: context.input,
          executedAt: new Date().toISOString()
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
    
    if (!config.counterName) {
      errors.push('Counter name is required');
    } else if (typeof config.counterName !== 'string') {
      errors.push('Counter name must be a string');
    }
    
    if (config.operation && !['increment', 'decrement'].includes(config.operation)) {
      errors.push("Operation must be either 'increment' or 'decrement'");
    }
    
    if (config.step !== undefined && typeof config.step !== 'number') {
      errors.push('Step must be a number');
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