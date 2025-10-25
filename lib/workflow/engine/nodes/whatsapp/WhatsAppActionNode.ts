import { NodeClass, NodeExecutionResult, ExecutionContext } from '../../types';
import { WhatsAppClient } from './WhatsAppClient';
import { WhatsAppActionConfig } from './types';

export class WhatsAppActionNode implements NodeClass {
  type = 'WhatsAppActionNode';
  name = 'WhatsApp';
  description = 'WhatsApp Cloud API actions (send text, template, mark read)';
  category = 'ecommerce' as const;

  async execute(context: ExecutionContext, rawConfig: Record<string, any>): Promise<NodeExecutionResult> {
    const start = Date.now();
    const config: WhatsAppActionConfig = rawConfig as any;

    try {
      const errors = this.validate(rawConfig);
      if (errors.length) throw new Error(errors.join(', '));

      // Resolve credentials
      const token = config.token as string;
      const phoneNumberId = config.phoneNumberId as string;
      const client = new WhatsAppClient({ token, phoneNumberId });

      let result: any;
      if (config.operation === 'send_text') {
        result = await client.sendText({ to: config.to!, text: config.text! });
      } else if (config.operation === 'send_template') {
        result = await client.sendTemplate({
          to: config.to!,
          templateName: config.templateName!,
          language: config.language || 'en_US',
          components: config.components,
        });
      } else if (config.operation === 'mark_read') {
        result = await client.markRead({ messageId: config.messageId! });
      } else {
        throw new Error(`Unsupported operation: ${config.operation}`);
      }

      return {
        success: true,
        result,
        metadata: {
          executionTime: Date.now() - start,
          operation: config.operation,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          executionTime: Date.now() - start,
        },
      };
    }
  }

  validate(config: Record<string, any>): string[] {
    const c = config as WhatsAppActionConfig;
    const errors: string[] = [];

    if (!c.operation) errors.push('operation is required');

    // Require either credentialId with server-side resolution or direct token+phoneNumberId
    if (!c.credentialId && (!c.token || !c.phoneNumberId)) {
      errors.push('Provide credentialId or token+phoneNumberId');
    }

    if (c.operation === 'send_text') {
      if (!c.to) errors.push('to is required');
      if (!c.text) errors.push('text is required');
    }
    if (c.operation === 'send_template') {
      if (!c.to) errors.push('to is required');
      if (!c.templateName) errors.push('templateName is required');
    }
    if (c.operation === 'mark_read') {
      if (!c.messageId) errors.push('messageId is required');
    }

    // Basic phone format check for direct usage (E.164)
    if (c.to && !/^\+[1-9]\d{6,14}$/.test(c.to)) {
      errors.push('to must be in E.164 format (e.g., +15551234567)');
    }

    return errors;
  }
}