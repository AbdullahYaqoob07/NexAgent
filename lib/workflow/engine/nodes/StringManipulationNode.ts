import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class StringManipulationNode implements NodeClass {
  type = 'StringManipulationNode';
  name = 'String Manipulation';
  description = 'Performs basic string operations like case conversion and formatting';
  category = 'data' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { inputField, operation } = config;
      
      if (!operation) {
        throw new Error('Operation is required');
      }
      
      // Extract the string to manipulate
      let text;
      if (inputField && typeof context.input === 'object' && context.input !== null) {
        text = (context.input as Record<string, any>)[inputField] || '';
      } else {
        text = typeof context.input === 'string' ? context.input : String(context.input);
      }
      
      // Perform operation
      const result = this.performOperation(text, operation);
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        result: {
          originalText: text,
          result,
          operation,
          input: context.input,
          manipulatedAt: new Date().toISOString()
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
    
    if (!config.operation) {
      errors.push('Operation is required');
    } else {
      const validOperations = ['uppercase', 'lowercase', 'trim', 'capitalize', 'reverse'];
      if (!validOperations.includes(config.operation)) {
        errors.push(`Invalid operation. Must be one of: ${validOperations.join(', ')}`);
      }
    }
    
    return errors;
  }

  private performOperation(text: string, operation: string): string {
    switch (operation) {
      case 'uppercase':
        return text.toUpperCase();
      case 'lowercase':
        return text.toLowerCase();
      case 'trim':
        return text.trim();
      case 'capitalize':
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
      case 'reverse':
        return text.split('').reverse().join('');
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  private calculateTokens(data: any): number {
    return Math.ceil(JSON.stringify(data).length / 4);
  }

  private calculateCost(data: any): number {
    return this.calculateTokens(data) * 0.00001;
  }
}