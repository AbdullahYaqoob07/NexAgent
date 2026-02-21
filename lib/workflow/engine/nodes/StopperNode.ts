import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class StopperNode implements NodeClass {
  type = 'StopperNode';
  name = 'Stopper';
  description = 'Mark workflow completion';
  category = 'logic' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    try {
      // Log workflow completion
      console.log('🛑 Stopper Node: Workflow execution complete');
      
      return {
        success: true,
        result: {
          status: 'completed',
          completedAt: new Date().toISOString(),
          message: 'Workflow execution completed successfully'
        },
        metadata: {
          executionTime: 0,
          tokensUsed: 0,
          cost: 0
        }
      };
    } catch (error) {
      console.error('Stopper Node execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          executionTime: 0,
          tokensUsed: 0,
          cost: 0
        }
      };
    }
  }

  validate(config: Record<string, any>): string[] {
    // Stopper node has no required configuration
    return [];
  }
}
