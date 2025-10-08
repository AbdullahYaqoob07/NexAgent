/**
 * Email Node - Sends emails via SMTP
 */

import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class EmailNode implements NodeClass {
  type = 'EmailNode';
  name = 'Email Send';
  description = 'Send emails via SMTP';
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
      const { to, subject, body, from, smtpConfig } = config;
      
      // Simulate email sending (replace with actual SMTP implementation)
      const emailResult = await this.sendEmail({
        to,
        subject,
        body,
        from: from || 'noreply@nexagent.com',
        smtpConfig: smtpConfig || {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false
        }
      });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result: emailResult,
        metadata: {
          executionTime,
          tokensUsed: this.calculateTokens(body),
          cost: this.calculateCost(body),
          emailId: emailResult.id,
          recipientCount: Array.isArray(to) ? to.length : 1
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

    if (!config.to) {
      errors.push('Recipient email address (to) is required');
    }

    if (!config.subject) {
      errors.push('Email subject is required');
    }

    if (!config.body) {
      errors.push('Email body is required');
    }

    // Validate email format
    if (config.to && !this.isValidEmail(config.to)) {
      errors.push('Invalid email address format');
    }

    if (config.from && !this.isValidEmail(config.from)) {
      errors.push('Invalid sender email address format');
    }

    return errors;
  }

  private async sendEmail(emailData: {
    to: string | string[];
    subject: string;
    body: string;
    from: string;
    smtpConfig: any;
  }): Promise<any> {
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Simulate occasional failures (5% chance)
    if (Math.random() < 0.05) {
      throw new Error('SMTP server unavailable');
    }

    // Return simulated email result
    return {
      id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'sent',
      timestamp: new Date().toISOString(),
      recipient: emailData.to,
      subject: emailData.subject,
      messageId: `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@nexagent.com>`
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private calculateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private calculateCost(text: string): number {
    // Simulate cost calculation (very low cost for demo)
    const tokens = this.calculateTokens(text);
    return tokens * 0.0001; // $0.0001 per token
  }
}
