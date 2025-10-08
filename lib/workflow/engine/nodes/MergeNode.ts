import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class MergeNode implements NodeClass {
  type = 'MergeNode';
  name = 'Merge';
  description = 'Combine data from multiple sources';
  category = 'logic' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { input1, input2, mergeStrategy = 'combine' } = config;
      
      const result = await this.mergeData({
        input1: input1 || {},
        input2: input2 || {},
        mergeStrategy,
        context
      });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result: result,
        metadata: {
          executionTime,
          tokensUsed: this.calculateTokens(result),
          cost: this.calculateCost(result),
          mergeStrategy,
          input1Keys: Object.keys(input1 || {}).length,
          input2Keys: Object.keys(input2 || {}).length
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
    return [];
  }

  private async mergeData(mergeData: { input1: any; input2: any; mergeStrategy: string; context: ExecutionContext }): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    
    return {
      merged: { ...mergeData.input1, ...mergeData.input2 },
      strategy: mergeData.mergeStrategy,
      mergedAt: new Date().toISOString()
    };
  }

  private calculateTokens(data: any): number {
    return Math.ceil(JSON.stringify(data).length / 4);
  }

  private calculateCost(data: any): number {
    return this.calculateTokens(data) * 0.00001;
  }
}
