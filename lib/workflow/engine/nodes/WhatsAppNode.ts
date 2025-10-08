/**
 * WhatsApp Node - Integrates with WhatsApp Business API
 */

import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class WhatsAppNode implements NodeClass {
  type = 'WhatsAppNode';
  name = 'WhatsApp';
  description = 'Integrate with WhatsApp Business API for messaging';
  category = 'ecommerce' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Validate required configuration
      const validationErrors = this.validate(config);
      if (validationErrors.length > 0) {
        throw new Error(`Configuration validation failed: ${validationErrors.join(', ')}`);
      }

      // Extract configuration
      const { 
        operation = 'send_message',
        phoneNumber,
        message,
        apiKey,
        mediaUrl,
        templateName,
        templateParams,
        contactId
      } = config;
      
      // Execute WhatsApp operation
      const whatsappResult = await this.executeWhatsAppOperation({
        operation,
        phoneNumber,
        message,
        apiKey,
        mediaUrl,
        templateName,
        templateParams,
        contactId
      });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result: whatsappResult,
        metadata: {
          executionTime,
          tokensUsed: 0,
          cost: this.calculateCost(operation, message),
          operation,
          phoneNumber: phoneNumber ? this.maskPhoneNumber(phoneNumber) : undefined,
          messageLength: message ? message.length : 0
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

    if (!config.apiKey) {
      errors.push('API key is required');
    }

    if (!config.operation) {
      errors.push('Operation is required');
    }

    if (config.operation && !this.isValidOperation(config.operation)) {
      errors.push('Invalid operation. Use: send_message, send_template, send_media, get_contacts, get_messages');
    }

    // Operation-specific validation
    if (['send_message', 'send_media'].includes(config.operation)) {
      if (!config.phoneNumber) {
        errors.push('Phone number is required for messaging operations');
      }
      if (config.operation === 'send_message' && !config.message) {
        errors.push('Message is required for send_message operation');
      }
      if (config.operation === 'send_media' && !config.mediaUrl) {
        errors.push('Media URL is required for send_media operation');
      }
    }

    if (config.operation === 'send_template') {
      if (!config.phoneNumber) {
        errors.push('Phone number is required for template messages');
      }
      if (!config.templateName) {
        errors.push('Template name is required for send_template operation');
      }
    }

    // Phone number format validation
    if (config.phoneNumber && !this.isValidPhoneNumber(config.phoneNumber)) {
      errors.push('Invalid phone number format. Use international format (e.g., +1234567890)');
    }

    // Message length validation
    if (config.message && config.message.length > 4096) {
      errors.push('Message length cannot exceed 4096 characters');
    }

    return errors;
  }

  private async executeWhatsAppOperation(operationData: {
    operation: string;
    phoneNumber?: string;
    message?: string;
    apiKey: string;
    mediaUrl?: string;
    templateName?: string;
    templateParams?: any[];
    contactId?: string;
  }): Promise<any> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 1000));

    // Simulate authentication errors (7% chance)
    if (operationData.apiKey === 'invalid-key' || Math.random() < 0.07) {
      throw new Error('Invalid WhatsApp API key');
    }

    // Simulate rate limiting (3% chance)
    if (Math.random() < 0.03) {
      throw new Error('WhatsApp API rate limit exceeded');
    }

    // Execute different operations
    switch (operationData.operation) {
      case 'send_message':
        return this.mockSendMessage(operationData.phoneNumber!, operationData.message!);
      
      case 'send_template':
        return this.mockSendTemplate(
          operationData.phoneNumber!, 
          operationData.templateName!, 
          operationData.templateParams
        );
      
      case 'send_media':
        return this.mockSendMedia(
          operationData.phoneNumber!, 
          operationData.mediaUrl!, 
          operationData.message
        );
      
      case 'get_contacts':
        return this.mockGetContacts();
      
      case 'get_messages':
        return this.mockGetMessages(operationData.contactId);
      
      default:
        throw new Error(`Unsupported operation: ${operationData.operation}`);
    }
  }

  private mockSendMessage(phoneNumber: string, message: string): any {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate delivery status (90% delivered, 8% pending, 2% failed)
    const statusRand = Math.random();
    let status: string;
    if (statusRand < 0.9) {
      status = 'delivered';
    } else if (statusRand < 0.98) {
      status = 'pending';
    } else {
      status = 'failed';
    }
    
    return {
      success: status !== 'failed',
      data: {
        message_id: messageId,
        phone_number: phoneNumber,
        message: message,
        status: status,
        sent_at: new Date().toISOString(),
        delivered_at: status === 'delivered' ? new Date().toISOString() : null,
        read_at: status === 'delivered' && Math.random() > 0.3 ? new Date().toISOString() : null,
        message_type: 'text',
        cost: this.calculateCost('send_message', message)
      },
      operation: 'send_message'
    };
  }

  private mockSendTemplate(phoneNumber: string, templateName: string, templateParams?: any[]): any {
    const messageId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate template message content
    const templateContent = this.generateTemplateContent(templateName, templateParams || []);
    
    return {
      success: true,
      data: {
        message_id: messageId,
        phone_number: phoneNumber,
        template_name: templateName,
        template_params: templateParams || [],
        resolved_content: templateContent,
        status: 'sent',
        sent_at: new Date().toISOString(),
        message_type: 'template',
        cost: this.calculateCost('send_template', templateContent)
      },
      operation: 'send_template'
    };
  }

  private mockSendMedia(phoneNumber: string, mediaUrl: string, caption?: string): any {
    const messageId = `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const mediaType = this.getMediaType(mediaUrl);
    
    return {
      success: true,
      data: {
        message_id: messageId,
        phone_number: phoneNumber,
        media_url: mediaUrl,
        media_type: mediaType,
        caption: caption || null,
        status: 'sent',
        sent_at: new Date().toISOString(),
        delivered_at: new Date().toISOString(),
        message_type: 'media',
        cost: this.calculateCost('send_media', caption || '')
      },
      operation: 'send_media'
    };
  }

  private mockGetContacts(): any {
    const contacts = [];
    for (let i = 1; i <= 10; i++) {
      contacts.push({
        id: `contact_${i}`,
        phone_number: `+1555000${String(i).padStart(4, '0')}`,
        name: `Contact ${i}`,
        profile_name: `Contact${i}`,
        last_seen: new Date(Date.now() - (Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
        status: Math.random() > 0.3 ? 'online' : 'offline',
        messages_count: Math.floor(Math.random() * 50 + 1),
        last_message_at: new Date(Date.now() - (Math.random() * 24 * 60 * 60 * 1000)).toISOString()
      });
    }
    
    return {
      success: true,
      data: contacts,
      count: contacts.length,
      operation: 'get_contacts'
    };
  }

  private mockGetMessages(contactId?: string): any {
    const messages = [];
    const messageCount = Math.floor(Math.random() * 20 + 5);
    
    for (let i = 1; i <= messageCount; i++) {
      const isIncoming = Math.random() > 0.4;
      const messageTime = new Date(Date.now() - (i * 3600000)); // 1 hour intervals
      
      messages.push({
        id: `msg_${Date.now()}_${i}`,
        contact_id: contactId || `contact_${Math.floor(Math.random() * 10) + 1}`,
        direction: isIncoming ? 'incoming' : 'outgoing',
        message_type: Math.random() > 0.8 ? 'media' : 'text',
        content: isIncoming 
          ? this.generateIncomingMessage() 
          : this.generateOutgoingMessage(),
        status: isIncoming ? 'received' : 'delivered',
        timestamp: messageTime.toISOString(),
        read_at: Math.random() > 0.2 ? messageTime.toISOString() : null
      });
    }
    
    // Sort by timestamp (newest first)
    messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return {
      success: true,
      data: messages,
      count: messages.length,
      contact_id: contactId,
      operation: 'get_messages'
    };
  }

  private generateTemplateContent(templateName: string, params: any[]): string {
    const templates: Record<string, string> = {
      'welcome': `Welcome {{1}}! Thank you for joining our service.`,
      'order_confirmation': `Hi {{1}}, your order #{{2}} has been confirmed and will be delivered by {{3}}.`,
      'appointment_reminder': `Hi {{1}}, this is a reminder for your appointment on {{2}} at {{3}}.`,
      'promotional': `Hi {{1}}! Don't miss our {{2}} sale - up to {{3}}% off selected items!`,
      'support': `Hi {{1}}, thank you for contacting support. We'll get back to you within {{2}} hours.`
    };
    
    let content = templates[templateName] || `Template message: ${templateName}`;
    
    // Replace placeholders with parameters
    params.forEach((param, index) => {
      content = content.replace(`{{${index + 1}}}`, param);
    });
    
    return content;
  }

  private generateIncomingMessage(): string {
    const messages = [
      "Hello! I'm interested in your products.",
      "Can you tell me more about your services?",
      "What are your business hours?",
      "Do you offer delivery?",
      "I have a question about my order.",
      "Thank you for the quick response!",
      "When will my order be ready?",
      "Can I change my order details?",
      "Is this still available?",
      "Great, thank you!"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  private generateOutgoingMessage(): string {
    const messages = [
      "Hello! Thank you for contacting us.",
      "Yes, we offer that service. Let me get you the details.",
      "We're open Monday to Friday, 9 AM to 6 PM.",
      "Yes, we do offer delivery in your area.",
      "Let me check on your order status for you.",
      "You're welcome! Is there anything else I can help with?",
      "Your order will be ready by tomorrow afternoon.",
      "I can help you with that. What would you like to change?",
      "Yes, it's still available. Would you like to place an order?",
      "Have a great day!"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  private getMediaType(mediaUrl: string): string {
    const extension = mediaUrl.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return 'image';
    } else if (['mp4', 'avi', 'mov', 'wmv'].includes(extension || '')) {
      return 'video';
    } else if (['mp3', 'wav', 'ogg', 'aac'].includes(extension || '')) {
      return 'audio';
    } else if (['pdf', 'doc', 'docx', 'txt'].includes(extension || '')) {
      return 'document';
    }
    return 'unknown';
  }

  private isValidOperation(operation: string): boolean {
    const validOperations = [
      'send_message', 'send_template', 'send_media', 'get_contacts', 'get_messages'
    ];
    return validOperations.includes(operation);
  }

  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic validation for international format
    const phoneRegex = /^\+[1-9]\d{6,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length < 4) return phoneNumber;
    const visible = phoneNumber.slice(0, 3) + phoneNumber.slice(-2);
    const masked = '*'.repeat(phoneNumber.length - 5);
    return visible.slice(0, 3) + masked + visible.slice(-2);
  }

  private calculateCost(operation: string, message: string): number {
    // Simulate WhatsApp Business API pricing
    const baseCosts: Record<string, number> = {
      'send_message': 0.005, // $0.005 per message
      'send_template': 0.004, // $0.004 per template
      'send_media': 0.008    // $0.008 per media message
    };
    
    let cost = baseCosts[operation] || 0.005;
    
    // Add cost for message length (longer messages cost more)
    if (message && message.length > 160) {
      cost += Math.ceil(message.length / 160) * 0.001;
    }
    
    return cost;
  }
}