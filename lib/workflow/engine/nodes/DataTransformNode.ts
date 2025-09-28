import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class DataTransformNode implements NodeClass {
  type = 'DataTransformNode';
  name = 'Data Transform';
  description = 'Transform data';
  category = 'ai_ml' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { script, input } = config;
      
      const result = await this.transformData({ script: script || 'return input;', input: input || {} });

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
    if (!config.script) {
      errors.push('Transform script is required');
    }
    return errors;
  }

  private async transformData(transformData: { script: string; input: any }): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 300));
    
    // Simulate script execution
    const transformed = {
      ...transformData.input,
      transformed: true,
      timestamp: new Date().toISOString()
    };
    
    return {
      original: transformData.input,
      transformed,
      script: transformData.script,
      transformedAt: new Date().toISOString()
    };
  }

  private calculateTokens(data: any): number {
    return Math.ceil(JSON.stringify(data).length / 4);
  }

  private calculateCost(data: any): number {
    return this.calculateTokens(data) * 0.00001;
  }
}
