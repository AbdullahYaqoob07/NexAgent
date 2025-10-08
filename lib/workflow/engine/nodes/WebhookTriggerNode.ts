import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class WebhookTriggerNode implements NodeClass {
  type = 'WebhookTriggerNode';
  name = 'Webhook Trigger';
  description = 'Receive webhook data';
  category = 'trigger' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { url } = config;
      
      const result = await this.triggerWebhook({ url: url || '' });

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
    if (!config.url) {
      errors.push('Webhook URL is required');
    }
    return errors;
  }

  private async triggerWebhook(triggerData: { url: string }): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    return {
      triggered: true,
      url: triggerData.url,
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
