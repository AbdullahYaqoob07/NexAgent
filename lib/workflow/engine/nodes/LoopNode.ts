import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class LoopNode implements NodeClass {
  type = 'LoopNode';
  name = 'Loop';
  description = 'Iterate over data';
  category = 'logic' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { items, maxIterations = 100 } = config;
      
      const result = await this.executeLoop({
        items: items || [],
        maxIterations,
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
          iterations: result.iterations,
          totalItems: items?.length || 0
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
    if (!config.items || !Array.isArray(config.items)) {
      errors.push('Items array is required');
    }
    return errors;
  }

  private async executeLoop(loopData: { items: any[]; maxIterations: number; context: ExecutionContext }): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    const results = [];
    const iterations = Math.min(loopData.items.length, loopData.maxIterations);
    
    for (let i = 0; i < iterations; i++) {
      results.push({
        index: i,
        item: loopData.items[i],
        processed: true
      });
    }

    return {
      results,
      iterations,
      totalItems: loopData.items.length,
      processedAt: new Date().toISOString()
    };
  }

  private calculateTokens(data: any): number {
    return Math.ceil(JSON.stringify(data).length / 4);
  }

  private calculateCost(data: any): number {
    return this.calculateTokens(data) * 0.00001;
  }
}
