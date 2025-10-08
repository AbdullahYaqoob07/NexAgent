/**
 * OpenAI Node - AI completions using OpenAI API
 */

import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class OpenAINode implements NodeClass {
  type = 'OpenAINode';
  name = 'OpenAI Completion';
  description = 'Generate text using OpenAI API';
  category = 'ai_ml' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const validationErrors = this.validate(config);
      if (validationErrors.length > 0) {
        throw new Error(`Configuration validation failed: ${validationErrors.join(', ')}`);
      }

      const { 
        prompt, 
        model = 'gpt-3.5-turbo', 
        temperature = 0.7, 
        maxTokens = 1000,
        apiKey 
      } = config;
      
      const aiResult = await this.generateCompletion({
        prompt,
        model,
        temperature,
        maxTokens,
        apiKey: apiKey || 'sk-demo-key'
      });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result: aiResult,
        metadata: {
          executionTime,
          tokensUsed: aiResult.usage?.total_tokens || 0,
          cost: this.calculateCost(aiResult.usage?.total_tokens || 0, model),
          model: model,
          temperature: temperature,
          promptLength: prompt.length
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

    if (!config.prompt) {
      errors.push('Prompt is required');
    }

    if (config.model && !this.isValidModel(config.model)) {
      errors.push('Invalid model. Use gpt-3.5-turbo, gpt-4, or text-davinci-003');
    }

    if (config.temperature && (config.temperature < 0 || config.temperature > 2)) {
      errors.push('Temperature must be between 0 and 2');
    }

    if (config.maxTokens && (config.maxTokens < 1 || config.maxTokens > 4000)) {
      errors.push('Max tokens must be between 1 and 4000');
    }

    return errors;
  }

  private async generateCompletion(completionData: {
    prompt: string;
    model: string;
    temperature: number;
    maxTokens: number;
    apiKey: string;
  }): Promise<any> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 3000));

    // Simulate API key validation (10% chance of failure)
    if (completionData.apiKey === 'invalid-key' || Math.random() < 0.1) {
      throw new Error('Invalid API key');
    }

    // Simulate rate limiting (5% chance)
    if (Math.random() < 0.05) {
      throw new Error('Rate limit exceeded');
    }

    // Generate mock completion based on prompt
    const completion = this.generateMockCompletion(completionData.prompt, completionData.model);
    const promptTokens = this.calculateTokens(completionData.prompt);
    const completionTokens = this.calculateTokens(completion);

    return {
      id: `chatcmpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: completionData.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: completion
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens
      }
    };
  }

  private generateMockCompletion(prompt: string, model: string): string {
    // Generate different responses based on prompt content
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('hello') || lowerPrompt.includes('hi')) {
      return 'Hello! How can I help you today?';
    }
    
    if (lowerPrompt.includes('write') && lowerPrompt.includes('email')) {
      return `Subject: ${prompt.includes('urgent') ? 'URGENT: ' : ''}Important Update

Dear Team,

I hope this email finds you well. I wanted to reach out regarding the matter we discussed earlier.

${prompt.includes('urgent') ? 'This is an urgent matter that requires immediate attention.' : 'Please let me know your thoughts on this.'}

Best regards,
[Your Name]`;
    }
    
    if (lowerPrompt.includes('code') || lowerPrompt.includes('programming')) {
      return `Here's a sample code snippet:

\`\`\`javascript
function example() {
  console.log('Hello, World!');
  return 'Success';
}

// Usage
const result = example();
console.log(result);
\`\`\`

This code demonstrates basic JavaScript function structure.`;
    }
    
    if (lowerPrompt.includes('explain') || lowerPrompt.includes('what is')) {
      return 'This is a comprehensive explanation of the topic you asked about. The key points include understanding the fundamental concepts, practical applications, and best practices.';
    }
    
    // Default response
    return `I understand you're asking about "${prompt}". Here's a thoughtful response that addresses your question with relevant information and insights.`;
  }

  private isValidModel(model: string): boolean {
    const validModels = ['gpt-3.5-turbo', 'gpt-4', 'text-davinci-003', 'gpt-3.5-turbo-16k'];
    return validModels.includes(model);
  }

  private calculateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private calculateCost(tokens: number, model: string): number {
    // Pricing per 1000 tokens (as of 2024)
    const pricing: Record<string, number> = {
      'gpt-3.5-turbo': 0.002,
      'gpt-4': 0.03,
      'text-davinci-003': 0.02,
      'gpt-3.5-turbo-16k': 0.004
    };
    
    const pricePerThousand = pricing[model] || 0.002;
    return (tokens / 1000) * pricePerThousand;
  }
}
