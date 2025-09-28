import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class ScheduleTriggerNode implements NodeClass {
  type = 'ScheduleTriggerNode';
  name = 'Schedule Trigger';
  description = 'Time-based triggers';
  category = 'trigger' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { cron } = config;
      
      const result = await this.triggerSchedule({ cron: cron || '0 */5 * * * *' });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result: result,
        metadata: {
          executionTime,
          tokensUsed: this.calculateTokens(result),
          cost: this.calculateCost(result)
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
    if (!config.cron) {
      errors.push('Cron expression is required');
    }
    return errors;
  }

  private async triggerSchedule(triggerData: { cron: string }): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    
    return {
      triggered: true,
      cron: triggerData.cron,
      triggeredAt: new Date().toISOString()
    };
  }

  private calculateTokens(data: any): number {
    return Math.ceil(JSON.stringify(data).length / 4);
  }

  private calculateCost(data: any): number {
    return this.calculateTokens(data) * 0.00001;
  }
}
