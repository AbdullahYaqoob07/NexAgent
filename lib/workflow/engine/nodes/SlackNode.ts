/**
 * Slack Node - Sends messages to Slack channels
 */

import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class SlackNode implements NodeClass {
  type = 'SlackNode';
  name = 'Slack Message';
  description = 'Send messages to Slack channels';
  category = 'action' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Validate required configuration
      const validationErrors = this.validate(config);
      if (validationErrors.length > 0) {
        throw new Error(`Configuration validation failed: ${validationErrors.join(', ')}`);
      }

      // Extract configuration
      const { channel, text, token, username, iconEmoji } = config;
      
      // Simulate Slack message sending
      const slackResult = await this.sendSlackMessage({
        channel,
        text,
        token: token || 'xoxb-demo-token',
        username: username || 'NexAgent Bot',
        iconEmoji: iconEmoji || ':robot_face:'
      });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result: slackResult,
        metadata: {
          executionTime,
          tokensUsed: this.calculateTokens(text),
          cost: this.calculateCost(text),
          channel: channel,
          messageId: slackResult.ts
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

    if (!config.channel) {
      errors.push('Slack channel is required');
    }

    if (!config.text) {
      errors.push('Message text is required');
    }

    if (!config.token) {
      errors.push('Slack bot token is required');
    }

    // Validate channel format
    if (config.channel && !this.isValidChannel(config.channel)) {
      errors.push('Invalid channel format. Use #channel-name or @username');
    }

    // Validate token format
    if (config.token && !this.isValidToken(config.token)) {
      errors.push('Invalid Slack token format');
    }

    return errors;
  }

  private async sendSlackMessage(messageData: {
    channel: string;
    text: string;
    token: string;
    username: string;
    iconEmoji: string;
  }): Promise<any> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Simulate token validation failure (10% chance)
    if (messageData.token === 'invalid-token' || Math.random() < 0.1) {
      throw new Error('Invalid Slack token');
    }

    // Simulate channel not found (5% chance)
    if (Math.random() < 0.05) {
      throw new Error('Channel not found');
    }

    // Return simulated Slack message result
    return {
      ok: true,
      channel: messageData.channel,
      ts: `${Date.now()}.${Math.floor(Math.random() * 1000000)}`,
      message: {
        text: messageData.text,
        username: messageData.username,
        icon_emoji: messageData.iconEmoji,
        type: 'message',
        subtype: 'bot_message'
      },
      response_metadata: {
        scopes: ['chat:write', 'channels:write'],
        acceptedScopes: ['chat:write']
      }
    };
  }

  private isValidChannel(channel: string): boolean {
    // Slack channels start with # or @
    return /^[#@][a-zA-Z0-9_-]+$/.test(channel);
  }

  private isValidToken(token: string): boolean {
    // Slack tokens start with xoxb- or xoxp-
    return /^xox[bp]-\w+/.test(token);
  }

  private calculateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private calculateCost(text: string): number {
    // Slack API is free, but we simulate minimal cost
    const tokens = this.calculateTokens(text);
    return tokens * 0.00001; // $0.00001 per token
  }
}
