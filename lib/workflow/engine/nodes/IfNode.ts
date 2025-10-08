/**
 * If Node - Conditional logic
 */

import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class IfNode implements NodeClass {
  type = 'IfNode';
  name = 'If Condition';
  description = 'Conditional logic based on input data';
  category = 'logic' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const validationErrors = this.validate(config);
      if (validationErrors.length > 0) {
        throw new Error(`Configuration validation failed: ${validationErrors.join(', ')}`);
      }

      const { condition, trueValue, falseValue, field, operator, value } = config;
      
      const result = await this.evaluateCondition({
        condition,
        trueValue,
        falseValue,
        field,
        operator: operator || 'equals',
        value,
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
          conditionResult: result.conditionResult,
          branch: result.branch
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

    if (!config.condition && !config.field) {
      errors.push('Either condition or field must be specified');
    }

    if (config.operator && !this.isValidOperator(config.operator)) {
      errors.push('Invalid operator. Use equals, not_equals, greater_than, less_than, contains, or exists');
    }

    return errors;
  }

  private async evaluateCondition(conditionData: {
    condition?: any;
    trueValue?: any;
    falseValue?: any;
    field?: string;
    operator: string;
    value?: any;
    context: ExecutionContext;
  }): Promise<any> {
    // Simulate evaluation delay
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));

    let conditionResult: boolean;

    if (conditionData.condition !== undefined) {
      // Direct condition evaluation
      conditionResult = Boolean(conditionData.condition);
    } else if (conditionData.field) {
      // Field-based condition evaluation
      const fieldValue = this.getFieldValue(conditionData.context, conditionData.field);
      conditionResult = this.evaluateFieldCondition(
        fieldValue,
        conditionData.operator,
        conditionData.value
      );
    } else {
      throw new Error('No valid condition specified');
    }

    const result = conditionResult ? conditionData.trueValue : conditionData.falseValue;

    return {
      conditionResult,
      result,
      branch: conditionResult ? 'true' : 'false',
      field: conditionData.field,
      operator: conditionData.operator,
      fieldValue: conditionData.field ? this.getFieldValue(conditionData.context, conditionData.field) : undefined,
      evaluatedAt: new Date().toISOString()
    };
  }

  private getFieldValue(context: ExecutionContext, field: string): any {
    // Support dot notation for nested fields
    const keys = field.split('.');
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

  private evaluateFieldCondition(fieldValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === expectedValue;
      case 'not_equals':
        return fieldValue !== expectedValue;
      case 'greater_than':
        return Number(fieldValue) > Number(expectedValue);
      case 'less_than':
        return Number(fieldValue) < Number(expectedValue);
      case 'greater_than_or_equal':
        return Number(fieldValue) >= Number(expectedValue);
      case 'less_than_or_equal':
        return Number(fieldValue) <= Number(expectedValue);
      case 'contains':
        return String(fieldValue).includes(String(expectedValue));
      case 'not_contains':
        return !String(fieldValue).includes(String(expectedValue));
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      case 'not_exists':
        return fieldValue === undefined || fieldValue === null;
      case 'is_empty':
        return fieldValue === '' || fieldValue === null || fieldValue === undefined;
      case 'is_not_empty':
        return fieldValue !== '' && fieldValue !== null && fieldValue !== undefined;
      default:
        return false;
    }
  }

  private isValidOperator(operator: string): boolean {
    const validOperators = [
      'equals', 'not_equals', 'greater_than', 'less_than',
      'greater_than_or_equal', 'less_than_or_equal',
      'contains', 'not_contains', 'exists', 'not_exists',
      'is_empty', 'is_not_empty'
    ];
    return validOperators.includes(operator);
  }

  private calculateTokens(data: any): number {
    const text = JSON.stringify(data);
    return Math.ceil(text.length / 4);
  }

  private calculateCost(data: any): number {
    const tokens = this.calculateTokens(data);
    return tokens * 0.00001; // $0.00001 per token
  }
}
