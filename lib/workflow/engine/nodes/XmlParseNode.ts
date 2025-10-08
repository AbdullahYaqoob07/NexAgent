import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class XmlParseNode implements NodeClass {
  type = 'XmlParseNode';
  name = 'XML Parse';
  description = 'Parse XML data';
  category = 'data' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { xmlString } = config;
      
      const result = await this.parseXml({ xmlString: xmlString || '' });

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
    if (!config.xmlString) {
      errors.push('XML string is required');
    }
    return errors;
  }

  private async parseXml(parseData: { xmlString: string }): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    return {
      parsed: true,
      originalString: parseData.xmlString,
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
