/**
 * WhatsApp Cloud API client wrapper
 * NOTE: For production, avoid calling from the browser; proxy via server routes.
 */

export interface WhatsAppClientConfig {
  token: string; // Permanent/page/system user token
  phoneNumberId: string; // WA_PHONE_NUMBER_ID
  apiBaseUrl?: string; // default https://graph.facebook.com/v20.0
}

export interface SendTextParams {
  to: string; // E.164 format, e.g., "+15551234567"
  text: string;
}

export interface SendTemplateParams {
  to: string;
  templateName: string;
  language: string; // e.g., "en_US"
  components?: Array<any>;
}

export interface MarkReadParams {
  messageId: string;
}

export class WhatsAppClient {
  private token: string;
  private phoneNumberId: string;
  private apiBaseUrl: string;

  constructor(cfg: WhatsAppClientConfig) {
    this.token = cfg.token;
    this.phoneNumberId = cfg.phoneNumberId;
    this.apiBaseUrl = cfg.apiBaseUrl || 'https://graph.facebook.com/v20.0';
  }

  private get messagesUrl() {
    return `${this.apiBaseUrl}/${this.phoneNumberId}/messages`;
  }

  private headers() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    } as Record<string, string>;
  }

  async sendText(params: SendTextParams) {
    const body = {
      messaging_product: 'whatsapp',
      to: params.to,
      type: 'text',
      text: { body: params.text },
    };

    const res = await fetch(this.messagesUrl, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`WhatsApp API error: ${res.status} ${res.statusText} ${JSON.stringify(data)}`);
    }
    return data;
  }

  async sendTemplate(params: SendTemplateParams) {
    const body = {
      messaging_product: 'whatsapp',
      to: params.to,
      type: 'template',
      template: {
        name: params.templateName,
        language: { code: params.language },
        components: params.components || [],
      },
    };

    const res = await fetch(this.messagesUrl, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`WhatsApp API error: ${res.status} ${res.statusText} ${JSON.stringify(data)}`);
    }
    return data;
  }

  async markRead(params: MarkReadParams) {
    const body = {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: params.messageId,
    };

    const res = await fetch(this.messagesUrl, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`WhatsApp API error: ${res.status} ${res.statusText} ${JSON.stringify(data)}`);
    }
    return data;
  }
}