import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class TextAnalysisNode implements NodeClass {
  type = 'TextAnalysisNode';
  name = 'Text Analysis';
  description = 'Analyze text content';
  category = 'ai_ml' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { text } = config;
      
      const result = await this.analyzeText({ text: text || '' });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result: result,
        metadata: {
          executionTime,
          tokensUsed: this.calculateTokens(result),
          cost: this.calculateCost(result),
          textLength: text?.length || 0
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
    if (!config.text) {
      errors.push('Text to analyze is required');
    }
    return errors;
  }

  private async analyzeText(analysisData: { text: string }): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 500));
    
    const words = analysisData.text.split(/\s+/).length;
    const sentences = analysisData.text.split(/[.!?]+/).length;
    const characters = analysisData.text.length;
    
    return {
      wordCount: words,
      sentenceCount: sentences,
      characterCount: characters,
      averageWordsPerSentence: words / sentences,
      analyzedAt: new Date().toISOString()
    };
  }

  private calculateTokens(data: any): number {
    return Math.ceil(JSON.stringify(data).length / 4);
  }

  private calculateCost(data: any): number {
    return this.calculateTokens(data) * 0.00001;
  }
}
