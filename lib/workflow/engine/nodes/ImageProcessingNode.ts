import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class ImageProcessingNode implements NodeClass {
  type = 'ImageProcessingNode';
  name = 'Image Processing';
  description = 'Process images';
  category = 'ai_ml' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { imageUrl, width, height } = config;
      
      const result = await this.processImage({ imageUrl: imageUrl || '', width, height });

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
    if (!config.imageUrl) {
      errors.push('Image URL is required');
    }
    return errors;
  }

  private async processImage(processData: { imageUrl: string; width?: number; height?: number }): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    return {
      processed: true,
      originalUrl: processData.imageUrl,
      processedUrl: processData.imageUrl.replace('.jpg', '_processed.jpg'),
      dimensions: {
        width: processData.width || 800,
        height: processData.height || 600
      },
      processedAt: new Date().toISOString()
    };
  }

  private calculateTokens(data: any): number {
    return Math.ceil(JSON.stringify(data).length / 4);
  }

  private calculateCost(data: any): number {
    return this.calculateTokens(data) * 0.00001;
  }
}
