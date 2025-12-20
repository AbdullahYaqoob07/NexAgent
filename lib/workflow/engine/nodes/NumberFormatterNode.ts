import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class NumberFormatterNode implements NodeClass {
  type = 'NumberFormatterNode';
  name = 'Number Formatter';
  description = 'Formats numbers with specific decimal places and formatting';
  category = 'data' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { inputField, decimalPlaces = 2, thousandsSeparator = false, prefix = '', suffix = '' } = config;
      
      // Extract the number to format
      let value;
      if (inputField && typeof context.input === 'object' && context.input !== null) {
        value = (context.input as Record<string, any>)[inputField];
      } else {
        value = context.input;
      }
      
      // Convert to number if it's a string
      if (typeof value === 'string') {
        const parsed = parseFloat(value);
        if (isNaN(parsed)) {
          throw new Error(`Cannot convert '${value}' to a number`);
        }
        value = parsed;
      }
      
      // Ensure it's a number
      if (typeof value !== 'number') {
        throw new Error(`Value must be a number, got ${typeof value}`);
      }
      
      // Format the number
      let formatted: string;
      if (thousandsSeparator) {
        formatted = value.toLocaleString(undefined, {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces
        });
      } else {
        formatted = value.toFixed(decimalPlaces);
      }
      
      const result = `${prefix}${formatted}${suffix}`;
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        result: {
          originalValue: value,
          formattedValue: result,
          decimalPlaces,
          thousandsSeparator,
          prefix,
          suffix,
          input: context.input,
          formattedAt: new Date().toISOString()
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
    
    // No required fields for NumberFormatterNode
    return errors;
  }

  private calculateTokens(data: any): number {
    return Math.ceil(JSON.stringify(data).length / 4);
  }

  private calculateCost(data: any): number {
    return this.calculateTokens(data) * 0.00001;
  }
}