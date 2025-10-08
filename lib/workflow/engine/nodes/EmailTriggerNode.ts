import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class EmailTriggerNode implements NodeClass {
  type = 'EmailTriggerNode';
  name = 'Email Trigger';
  description = 'Email received triggers';
  category = 'trigger' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { from } = config;
      
      const result = await this.triggerEmail({ from: from || '' });

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
    if (!config.from) {
      errors.push('From email is required');
    }
    return errors;
  }

  private async triggerEmail(triggerData: { from: string }): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    return {
      triggered: true,
      from: triggerData.from,
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
