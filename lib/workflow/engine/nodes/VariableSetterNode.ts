import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class VariableSetterNode implements NodeClass {
  type = 'VariableSetterNode';
  name = 'Variable Setter';
  description = 'Sets or updates workflow variables';
  category = 'action' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { variableName, variableValue, valueSource = 'config' } = config;
      
      if (!variableName) {
        throw new Error('Variable name is required');
      }
      
      // Determine the value to set
      let value;
      if (valueSource === 'input') {
        value = context.input;
      } else {
        value = variableValue;
      }
      
      // In a real implementation, this would set the variable in the workflow context
      // For now, we'll just log that we would set it
      console.log(`Setting variable '${variableName}' to: ${JSON.stringify(value)}`);
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        result: {
          variableSet: true,
          variableName,
          variableValue: value,
          valueSource,
          input: context.input,
          setAt: new Date().toISOString()
        },
        metadata: {
          executionTime,
          tokensUsed: 0,
          cost: 0
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
    
    if (!config.variableName) {
      errors.push('Variable name is required');
    } else if (typeof config.variableName !== 'string') {
      errors.push('Variable name must be a string');
    }
    
    return errors;
  }

  private calculateTokens(data: any): number {
    return Math.ceil(JSON.stringify(data).length / 4);
  }

  private calculateCost(data: any): number {
    return this.calculateTokens(data) * 0.00001;
  }
}