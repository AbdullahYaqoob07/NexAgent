import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class FileWatchTriggerNode implements NodeClass {
  type = 'FileWatchTriggerNode';
  name = 'File Watch Trigger';
  description = 'Monitor file changes';
  category = 'trigger' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { path } = config;
      
      const result = await this.triggerFileWatch({ path: path || '' });

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
    if (!config.path) {
      errors.push('File path is required');
    }
    return errors;
  }

  private async triggerFileWatch(triggerData: { path: string }): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    return {
      triggered: true,
      path: triggerData.path,
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
