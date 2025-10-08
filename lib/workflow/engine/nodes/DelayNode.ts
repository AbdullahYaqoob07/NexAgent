import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class DelayNode implements NodeClass {
  type = 'DelayNode';
  name = 'Delay';
  description = 'Wait for specified time';
  category = 'logic' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { duration = 1000 } = config;
      
      const result = await this.delay({
        duration,
        context
      });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result: result,
        metadata: {
          executionTime,
          tokensUsed: 0,
          cost: 0,
          delayDuration: duration,
          actualDelay: result.actualDelay
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
    if (config.duration && (typeof config.duration !== 'number' || config.duration < 0)) {
      errors.push('Duration must be a positive number');
    }
    return errors;
  }

  private async delay(delayData: { duration: number; context: ExecutionContext }): Promise<any> {
    const startDelay = Date.now();
    await new Promise(resolve => setTimeout(resolve, delayData.duration));
    const actualDelay = Date.now() - startDelay;
    
    return {
      requestedDelay: delayData.duration,
      actualDelay,
      delayedAt: new Date().toISOString()
    };
  }

  private calculateTokens(data: any): number {
    return Math.ceil(JSON.stringify(data).length / 4);
  }

  private calculateCost(data: any): number {
    return this.calculateTokens(data) * 0.00001;
  }
}
