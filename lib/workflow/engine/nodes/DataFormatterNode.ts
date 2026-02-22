/**
 * Data Formatter Node - Formats and transforms data between formats
 */

import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class DataFormatterNode implements NodeClass {
  type = 'DataFormatterNode';
  name = 'Data Formatter';
  description = 'Format and transform data between different formats';
  category = 'data' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      const { format = 'json', template, inputPath } = config;
      const inputData = inputPath ? this.getNestedValue(context.input, inputPath) : context.input;

      let formatted: any;

      switch (format) {
        case 'json':
          formatted = typeof inputData === 'string' ? JSON.parse(inputData) : inputData;
          break;
        case 'string':
          formatted = typeof inputData === 'string' ? inputData : JSON.stringify(inputData, null, 2);
          break;
        case 'csv':
          formatted = this.toCsv(inputData);
          break;
        case 'template':
          formatted = this.applyTemplate(template || '', inputData);
          break;
        default:
          formatted = inputData;
      }

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result: {
          data: formatted,
          inputFormat: typeof inputData,
          outputFormat: format,
          timestamp: new Date().toISOString()
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

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  }

  private toCsv(data: any): string {
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      const headers = Object.keys(data[0]);
      const rows = data.map((row: any) => headers.map(h => JSON.stringify(row[h] ?? '')).join(','));
      return [headers.join(','), ...rows].join('\n');
    }
    return String(data);
  }

  private applyTemplate(template: string, data: any): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
      const value = this.getNestedValue(data, path);
      return value !== undefined ? String(value) : '';
    });
  }

  validate(config: Record<string, any>): string[] {
    const errors: string[] = [];
    if (config.format === 'template' && !config.template) {
      errors.push('Template is required when format is "template"');
    }
    return errors;
  }
}
