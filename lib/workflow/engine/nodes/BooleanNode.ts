import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class BooleanNode implements NodeClass {
  type = 'BooleanNode';
  name = 'Boolean';
  description = 'Evaluates conditions and returns true/false values';
  category = 'logic' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { leftValue, operator, rightValue } = config;
      
      // Perform comparison
      const result = this.evaluateCondition(leftValue, operator, rightValue);
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        result: {
          result,
          leftValue,
          operator,
          rightValue,
          evaluatedAt: new Date().toISOString()
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
    
    if (config.leftValue === undefined) {
      errors.push('Left value is required');
    }
    
    if (!config.operator) {
      errors.push('Operator is required');
    } else {
      const validOperators = ['==', '!=', '>', '<', '>=', '<=', 'in', 'not_in'];
      if (!validOperators.includes(config.operator)) {
        errors.push(`Invalid operator. Must be one of: ${validOperators.join(', ')}`);
      }
    }
    
    if (config.rightValue === undefined) {
      errors.push('Right value is required');
    }
    
    return errors;
  }

  private evaluateCondition(left: any, op: string, right: any): boolean {
    switch (op) {
      case '==':
        return left == right;
      case '!=':
        return left != right;
      case '>':
        return left > right;
      case '<':
        return left < right;
      case '>=':
        return left >= right;
      case '<=':
        return left <= right;
      case 'in':
        return Array.isArray(right) ? right.includes(left) : (typeof right === 'string' ? right.includes(left) : false);
      case 'not_in':
        return Array.isArray(right) ? !right.includes(left) : (typeof right === 'string' ? !right.includes(left) : true);
      default:
        throw new Error(`Unsupported operator: ${op}`);
    }
  }

  private calculateTokens(data: any): number {
    return Math.ceil(JSON.stringify(data).length / 4);
  }

  private calculateCost(data: any): number {
    return this.calculateTokens(data) * 0.00001;
  }
}