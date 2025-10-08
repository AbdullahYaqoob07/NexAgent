import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class HttpRequestTriggerNode implements NodeClass {
  type = 'HttpRequestTriggerNode';
  name = 'HTTP Request Trigger';
  description = 'Trigger workflow via HTTP';
  category = 'trigger' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { url, method = 'GET' } = config;
      
      const result = await this.triggerHttp({ url: url || '', method });

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
      errors.push('URL is required');
    }
    return errors;
  }

  private async triggerHttp(triggerData: { url: string; method: string }): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 500));
    
    return {
      triggered: true,
      url: triggerData.url,
      method: triggerData.method,
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
