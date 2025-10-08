import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class DataFilterNode implements NodeClass {
  type = 'DataFilterNode';
  name = 'Data Filter';
  description = 'Filter data based on conditions';
  category = 'data' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { data, field, operator, value } = config;
      
      const result = await this.filterData({ data: data || [], field, operator, value });

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
    if (!config.data || !Array.isArray(config.data)) {
      errors.push('Data array is required');
    }
    if (!config.field) {
      errors.push('Field to filter on is required');
    }
    if (!config.operator) {
      errors.push('Filter operator is required');
    }
    return errors;
  }

  private async filterData(filterData: { data: any[]; field: string; operator: string; value: any }): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 150));
    
    const filtered = filterData.data.filter(item => {
      const fieldValue = this.getFieldValue(item, filterData.field);
      return this.evaluateCondition(fieldValue, filterData.operator, filterData.value);
    });
    
    return {
      original: filterData.data,
      filtered,
      originalCount: filterData.data.length,
      filteredCount: filtered.length,
      filterCriteria: {
        field: filterData.field,
        operator: filterData.operator,
        value: filterData.value
      },
      filteredAt: new Date().toISOString()
    };
  }

  private getFieldValue(item: any, field: string): any {
    const keys = field.split('.');
    let value = item;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  private evaluateCondition(fieldValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals': return fieldValue === expectedValue;
      case 'not_equals': return fieldValue !== expectedValue;
      case 'greater_than': return Number(fieldValue) > Number(expectedValue);
      case 'less_than': return Number(fieldValue) < Number(expectedValue);
      case 'contains': return String(fieldValue).includes(String(expectedValue));
      case 'not_contains': return !String(fieldValue).includes(String(expectedValue));
      default: return false;
    }
  }

  private calculateTokens(data: any): number {
    return Math.ceil(JSON.stringify(data).length / 4);
  }

  private calculateCost(data: any): number {
    return this.calculateTokens(data) * 0.00001;
  }
}
