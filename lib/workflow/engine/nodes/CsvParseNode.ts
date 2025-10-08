import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class CsvParseNode implements NodeClass {
  type = 'CsvParseNode';
  name = 'CSV Parse';
  description = 'Parse CSV data';
  category = 'data' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { csvString } = config;
      
      const result = await this.parseCsv({ csvString: csvString || '' });

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
    if (!config.csvString) {
      errors.push('CSV string is required');
    }
    return errors;
  }

  private async parseCsv(parseData: { csvString: string }): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    const lines = parseData.csvString.split('\n');
    const headers = lines[0]?.split(',') || [];
    const rows = lines.slice(1).map(line => {
      const values = line.split(',');
      const row: any = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim() || '';
      });
      return row;
    });
    
    return {
      headers,
      rows,
      rowCount: rows.length,
      parsedAt: new Date().toISOString()
    };
  }

  private calculateTokens(data: any): number {
    return Math.ceil(JSON.stringify(data).length / 4);
  }

  private calculateCost(data: any): number {
    return this.calculateTokens(data) * 0.00001;
  }
}
