import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class LoopNode implements NodeClass {
  type = 'LoopNode';
  name = 'Loop';
  description = 'Iterate over data';
  category = 'logic' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { items, itemsPath, startRange, endRange, maxIterations = 100 } = config;
      
      // Determine items to loop over
      let loopItems: any[] = [];
      
      if (startRange !== undefined && endRange !== undefined) {
        // Range iteration
        const start = parseInt(startRange);
        const end = parseInt(endRange);
        loopItems = Array.from({ length: end - start + 1 }, (_, i) => start + i);
      } else if (itemsPath && context) {
        // Extract from context using path
        loopItems = this.getValueFromPath(context, itemsPath) || [];
      } else if (items) {
        // Direct items
        loopItems = Array.isArray(items) ? items : [items];
      }
      
      const result = await this.executeLoop({
        items: loopItems,
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
          totalItems: loopItems.length
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
    
    const hasItems = config.items !== undefined && config.items !== null;
    const hasPath = config.itemsPath !== undefined && config.itemsPath !== null;
    const hasRange = (config.startRange !== undefined && config.startRange !== null) && 
                     (config.endRange !== undefined && config.endRange !== null);
    
    if (!hasItems && !hasPath && !hasRange) {
      errors.push('Must provide either items, itemsPath, or both startRange and endRange');
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

  private getValueFromPath(context: any, path: string): any {
    const keys = path.split('.');
    let value = context;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  private calculateTokens(data: any): number {
    return Math.ceil(JSON.stringify(data).length / 4);
  }

  private calculateCost(data: any): number {
    return this.calculateTokens(data) * 0.00001;
  }
}
