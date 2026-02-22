/**
 * Chat Input Node - Accepts user text input as a trigger
 */

import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class ChatInputNode implements NodeClass {
  type = 'ChatInputNode';
  name = 'Chat Input';
  description = 'User enters text message to start or continue a workflow';
  category = 'trigger' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      const {
        inputLabel = 'text',
        placeholderText = 'Enter your message...',
        maxCharacters = 500
      } = config;

      // In execution mode, the user input comes from context.input
      const userInput = context.input?.message || context.input?.text || config.testMessage || '';

      if (maxCharacters && userInput.length > maxCharacters) {
        throw new Error(`Input exceeds maximum character limit of ${maxCharacters}`);
      }

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result: {
          text: userInput,
          inputLabel,
          characterCount: userInput.length,
          maxCharacters,
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

  validate(config: Record<string, any>): string[] {
    const errors: string[] = [];
    // Chat input has sensible defaults, no strict requirements
    return errors;
  }
}
