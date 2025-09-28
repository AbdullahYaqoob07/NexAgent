/**
 * If Logic Node
 * Conditional logic based on conditions
 */

import { NodeHandler, NodeCategory, ValidationError } from '../../types';

export class IfNode implements NodeHandler {
  type = 'if_logic';
  category = NodeCategory.LOGIC;
  name = 'If Condition';
  description = 'Execute different paths based on conditions';

  inputs = [
    {
      id: 'condition',
      name: 'Condition',
      type: 'boolean',
      required: true
    },
    {
      id: 'true_value',
      name: 'True Value',
      type: 'any',
      required: false
    },
    {
      id: 'false_value',
      name: 'False Value',
      type: 'any',
      required: false
    }
  ];

  outputs = [
    {
      id: 'result',
      name: 'Result',
      type: 'any',
      required: true
    }
  ];

  configSchema = {
    type: 'object',
    properties: {
      condition: { type: 'boolean' },
      trueValue: { type: 'any' },
      falseValue: { type: 'any' },
      operator: { 
        type: 'string', 
        enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'exists'] 
      },
      field: { type: 'string' },
      value: { type: 'any' }
    },
    required: ['condition']
  };

  async execute(context: any, config: any): Promise<any> {
    const { condition, trueValue, falseValue, operator, field, value } = config;

    try {
      let result: boolean;

      if (operator && field) {
        // Evaluate condition based on operator
        result = this.evaluateCondition(context, operator, field, value);
      } else {
        // Use direct condition value
        result = Boolean(condition);
      }

      const output = result ? (trueValue !== undefined ? trueValue : true) : (falseValue !== undefined ? falseValue : false);

      return {
        success: true,
        result: {
          condition: result,
          value: output,
          evaluatedAt: new Date().toISOString()
        },
        metadata: {
          executionTime: 10,
          tokensUsed: 0,
          cost: 0
        }
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        metadata: {
          executionTime: 5,
          tokensUsed: 0,
          cost: 0,
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  validate(config: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (config.operator && !config.field) {
      errors.push({
        type: 'error',
        code: 'MISSING_FIELD',
        message: 'Field is required when using operator',
        field: 'field'
      });
    }

    if (config.operator && !['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'exists'].includes(config.operator)) {
      errors.push({
        type: 'error',
        code: 'INVALID_OPERATOR',
        message: 'Invalid operator',
        field: 'operator'
      });
    }

    return errors;
  }

  private evaluateCondition(context: any, operator: string, field: string, value: any): boolean {
    const fieldValue = this.getNestedProperty(context, field);

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      case 'contains':
        return String(fieldValue).includes(String(value));
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      default:
        return false;
    }
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
}
