/**
 * OpenAI Node
 * AI completions using OpenAI API
 */

import { NodeHandler, NodeCategory, ValidationError } from '../../types';

export class OpenAINode implements NodeHandler {
  type = 'openai_completion';
  category = NodeCategory.AI_ML;
  name = 'OpenAI Completion';
  description = 'Generate text using OpenAI API';

  inputs = [
    {
      id: 'prompt',
      name: 'Prompt',
      type: 'string',
      required: true
    },
    {
      id: 'model',
      name: 'Model',
      type: 'string',
      required: false
    },
    {
      id: 'temperature',
      name: 'Temperature',
      type: 'number',
      required: false
    }
  ];

  outputs = [
    {
      id: 'completion',
      name: 'Completion',
      type: 'string',
      required: true
    }
  ];

  configSchema = {
    type: 'object',
    properties: {
      prompt: { type: 'string' },
      model: { type: 'string', enum: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'] },
      temperature: { type: 'number', minimum: 0, maximum: 2 },
      maxTokens: { type: 'number', minimum: 1, maximum: 4096 },
      apiKey: { type: 'string' }
    },
    required: ['prompt']
  };

  async execute(context: any, config: any): Promise<any> {
    const { 
      prompt, 
      model = 'gpt-3.5-turbo', 
      temperature = 0.7, 
      maxTokens = 1000,
      apiKey 
    } = config;

    try {
      // In a real implementation, this would call the actual OpenAI API
      // For now, we'll simulate the response
      const completion = await this.simulateOpenAICompletion(prompt, model, temperature, maxTokens);

      const tokensUsed = this.estimateTokens(prompt) + this.estimateTokens(completion);
      const cost = this.calculateCost(tokensUsed, model);

      return {
        success: true,
        result: {
          completion,
          model,
          temperature,
          maxTokens,
          usage: {
            promptTokens: this.estimateTokens(prompt),
            completionTokens: this.estimateTokens(completion),
            totalTokens: tokensUsed
          }
        },
        metadata: {
          executionTime: 2000 + Math.random() * 1000,
          tokensUsed,
          cost
        }
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        metadata: {
          executionTime: 100,
          tokensUsed: 0,
          cost: 0,
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  validate(config: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!config.prompt) {
      errors.push({
        type: 'error',
        code: 'MISSING_PROMPT',
        message: 'Prompt is required for OpenAI completion',
        field: 'prompt'
      });
    }

    if (config.temperature && (config.temperature < 0 || config.temperature > 2)) {
      errors.push({
        type: 'error',
        code: 'INVALID_TEMPERATURE',
        message: 'Temperature must be between 0 and 2',
        field: 'temperature'
      });
    }

    if (config.maxTokens && (config.maxTokens < 1 || config.maxTokens > 4096)) {
      errors.push({
        type: 'error',
        code: 'INVALID_MAX_TOKENS',
        message: 'Max tokens must be between 1 and 4096',
        field: 'maxTokens'
      });
    }

    if (config.model && !['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'].includes(config.model)) {
      errors.push({
        type: 'error',
        code: 'INVALID_MODEL',
        message: 'Invalid model specified',
        field: 'model'
      });
    }

    return errors;
  }

  private async simulateOpenAICompletion(
    prompt: string, 
    model: string, 
    temperature: number, 
    maxTokens: number
  ): Promise<string> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    // Generate contextual responses based on prompt content
    if (prompt.toLowerCase().includes('analyze') || prompt.toLowerCase().includes('analysis')) {
      return `Based on the analysis of "${prompt}", here are the key findings:

1. **Primary Insights**: The data shows significant patterns that indicate strong performance metrics.
2. **Trends Identified**: There's a clear upward trajectory in the metrics over the past quarter.
3. **Recommendations**: I recommend implementing the suggested optimizations to maximize efficiency.
4. **Risk Factors**: Minor concerns were identified in the data quality, but they're manageable.

This analysis provides a comprehensive overview of the current state and future opportunities.`;
    } else if (prompt.toLowerCase().includes('email') || prompt.toLowerCase().includes('message')) {
      return `Subject: Important Update

Dear Team,

I hope this message finds you well. ${prompt}

Please review the attached information and let me know if you have any questions or concerns. I'm available to discuss this further at your convenience.

Best regards,
AI Assistant

---
This is an AI-generated email template based on your prompt.`;
    } else if (prompt.toLowerCase().includes('code') || prompt.toLowerCase().includes('programming')) {
      return `Here's a code solution for your request:

\`\`\`javascript
// ${prompt}
function processData(input) {
  try {
    // Validate input
    if (!input || typeof input !== 'object') {
      throw new Error('Invalid input provided');
    }
    
    // Process the data
    const result = input.map(item => ({
      id: item.id,
      processed: true,
      timestamp: new Date().toISOString()
    }));
    
    return {
      success: true,
      data: result,
      count: result.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Usage example
const sampleData = [{ id: 1 }, { id: 2 }, { id: 3 }];
const processed = processData(sampleData);
console.log(processed);
\`\`\`

This solution handles the requirements and includes proper error handling.`;
    } else {
      return `I understand you're asking about "${prompt}". Here's a comprehensive response:

**Overview**: This is an important topic that requires careful consideration and analysis.

**Key Points**:
- Point 1: This addresses the primary concern raised in your prompt
- Point 2: Additional context and supporting information
- Point 3: Practical implications and next steps

**Conclusion**: Based on the information provided, I recommend taking a systematic approach to address this matter effectively.

If you need more specific information or have follow-up questions, please let me know!`;
    }
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private calculateCost(tokens: number, model: string): number {
    const pricing: Record<string, number> = {
      'gpt-3.5-turbo': 0.00002,
      'gpt-4': 0.00003,
      'gpt-4-turbo': 0.00001
    };
    
    return tokens * (pricing[model] || 0.00002);
  }
}
