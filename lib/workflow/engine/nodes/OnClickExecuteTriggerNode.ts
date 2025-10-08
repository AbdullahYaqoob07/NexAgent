import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class OnClickExecuteTriggerNode implements NodeClass {
  type = 'OnClickExecuteTriggerNode';
  name = 'On Click Execute Trigger';
  description = 'Triggered when the Execute button is clicked';
  category = 'trigger' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { description = 'Manual execution trigger' } = config;
      
      const result = await this.triggerExecution({ description });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result: result,
        metadata: {
          executionTime,
          tokensUsed: 0,
          cost: 0,
          triggerType: 'manual',
          description
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
    // No validation required for manual execution trigger
    return [];
  }

  private async triggerExecution(triggerData: { description: string }): Promise<any> {
    // Minimal delay to simulate processing
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return {
      triggered: true,
      triggerType: 'manual',
      description: triggerData.description,
      triggeredAt: new Date().toISOString(),
      executionId: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      source: 'execute_button'
    };
  }

  private calculateTokens(data: any): number {
    return 0; // No tokens used for manual triggers
  }

  private calculateCost(data: any): number {
    return 0; // No cost for manual triggers
  }
}