/**
 * Switch Node - Multiple condition logic
 */

import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class SwitchNode implements NodeClass {
  type = 'SwitchNode';
  name = 'Switch';
  description = 'Multiple condition logic';
  category = 'logic' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const validationErrors = this.validate(config);
      if (validationErrors.length > 0) {
        throw new Error(`Configuration validation failed: ${validationErrors.join(', ')}`);
      }

      const { value, cases, defaultCase } = config;
      
      const result = await this.evaluateSwitch({
        value,
        cases: cases || [],
        defaultCase,
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
          matchedCase: result.matchedCase,
          totalCases: cases?.length || 0
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

    if (!config.value && config.value !== 0 && config.value !== false) {
      errors.push('Value to evaluate is required');
    }

    if (!config.cases || !Array.isArray(config.cases)) {
      errors.push('Cases array is required');
    }

    return errors;
  }

  private async evaluateSwitch(switchData: {
    value: any;
    cases: any[];
    defaultCase?: any;
    context: ExecutionContext;
  }): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));

    const fieldValue = switchData.value;
    let matchedCase = null;
    let result = switchData.defaultCase;

    for (const caseItem of switchData.cases) {
      if (this.evaluateCase(fieldValue, caseItem)) {
        matchedCase = caseItem;
        result = caseItem.result;
        break;
      }
    }

    return {
      result,
      matchedCase,
      fieldValue,
      evaluatedAt: new Date().toISOString()
    };
  }

  private getFieldValue(context: ExecutionContext, field: string): any {
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

  private evaluateCase(fieldValue: any, caseItem: any): boolean {
    if (caseItem.value !== undefined) {
      return fieldValue === caseItem.value;
    }
    if (caseItem.operator && caseItem.expectedValue !== undefined) {
      return this.evaluateCondition(fieldValue, caseItem.operator, caseItem.expectedValue);
    }
    return false;
  }

  private evaluateCondition(fieldValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals': return fieldValue === expectedValue;
      case 'not_equals': return fieldValue !== expectedValue;
      case 'greater_than': return Number(fieldValue) > Number(expectedValue);
      case 'less_than': return Number(fieldValue) < Number(expectedValue);
      case 'contains': return String(fieldValue).includes(String(expectedValue));
      default: return false;
    }
  }

  private calculateTokens(data: any): number {
    const text = JSON.stringify(data);
    return Math.ceil(text.length / 4);
  }

  private calculateCost(data: any): number {
    const tokens = this.calculateTokens(data);
    return tokens * 0.00001;
  }
}
