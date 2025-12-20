import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class DateFormatterNode implements NodeClass {
  type = 'DateFormatterNode';
  name = 'Date Formatter';
  description = 'Converts dates between different formats and timezones';
  category = 'data' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { inputField, inputFormat = 'auto', outputFormat = 'YYYY-MM-DD HH:mm:ss' } = config;
      
      // Extract the date to format
      let dateValue;
      if (inputField && typeof context.input === 'object' && context.input !== null) {
        dateValue = (context.input as Record<string, any>)[inputField];
      } else {
        dateValue = context.input;
      }
      
      // Parse the date
      let parsedDate: Date;
      if (typeof dateValue === 'string') {
        if (inputFormat === 'auto') {
          // Try to parse automatically
          parsedDate = new Date(dateValue);
          if (isNaN(parsedDate.getTime())) {
            throw new Error(`Failed to parse date: ${dateValue}`);
          }
        } else {
          // For simplicity, we'll use the built-in Date parser
          // In a real implementation, you might want to use a library like moment.js or date-fns
          parsedDate = new Date(dateValue);
          if (isNaN(parsedDate.getTime())) {
            throw new Error(`Failed to parse date with format ${inputFormat}: ${dateValue}`);
          }
        }
      } else if (typeof dateValue === 'number') {
        // Assume it's a timestamp
        parsedDate = new Date(dateValue);
        if (isNaN(parsedDate.getTime())) {
          throw new Error(`Invalid timestamp: ${dateValue}`);
        }
      } else if (dateValue instanceof Date) {
        parsedDate = dateValue;
      } else {
        throw new Error(`Unsupported date type: ${typeof dateValue}`);
      }
      
      // Format the date
      // For simplicity, we'll use toLocaleString with some common formats
      // In a real implementation, you might want to use a library like moment.js or date-fns
      let formattedDate: string;
      switch (outputFormat) {
        case 'YYYY-MM-DD':
          formattedDate = parsedDate.toISOString().split('T')[0];
          break;
        case 'YYYY-MM-DD HH:mm:ss':
          formattedDate = parsedDate.toISOString().replace('T', ' ').split('.')[0];
          break;
        case 'MM/DD/YYYY':
          formattedDate = `${(parsedDate.getMonth() + 1).toString().padStart(2, '0')}/${parsedDate.getDate().toString().padStart(2, '0')}/${parsedDate.getFullYear()}`;
          break;
        case 'DD/MM/YYYY':
          formattedDate = `${parsedDate.getDate().toString().padStart(2, '0')}/${(parsedDate.getMonth() + 1).toString().padStart(2, '0')}/${parsedDate.getFullYear()}`;
          break;
        default:
          // Fallback to ISO string
          formattedDate = parsedDate.toISOString();
      }
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        result: {
          originalDate: dateValue,
          formattedDate,
          inputFormat,
          outputFormat,
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
    
    // No required fields for DateFormatterNode
    return errors;
  }

  private calculateTokens(data: any): number {
    return Math.ceil(JSON.stringify(data).length / 4);
  }

  private calculateCost(data: any): number {
    return this.calculateTokens(data) * 0.00001;
  }
}