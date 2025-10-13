export type WhatsAppOperation = 'send_text' | 'send_template' | 'mark_read';

export interface WhatsAppActionConfig {
  operation: WhatsAppOperation;
  // Either use direct fields or a credentialId to fetch server-side
  credentialId?: string;
  token?: string; // if provided directly (dev only)
  phoneNumberId?: string; // if provided directly (dev only)

  // Operation params
  to?: string; // for send_text, send_template
  text?: string; // for send_text
  templateName?: string; // for send_template
  language?: string; // e.g., "en_US"
  components?: Array<any>; // template components
  messageId?: string; // for mark_read
}