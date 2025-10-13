import { z } from 'zod';

// Base credential schema
export const BaseCredentialSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  platform: z.enum(['shopify', 'stripe', 'openai', 'slack', 'gmail', 'facebook', 'instagram', 'whatsapp']),
  type: z.enum(['oauth2', 'api_key', 'basic_auth', 'webhook']),
  status: z.enum(['active', 'inactive', 'expired', 'error']),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastUsed: z.date().optional(),
  expiresAt: z.date().optional(),
});

// Shopify specific credential schema
export const ShopifyCredentialSchema = BaseCredentialSchema.extend({
  platform: z.literal('shopify'),
  type: z.literal('oauth2'),
  data: z.object({
    shopDomain: z.string().min(1, 'Shop domain is required'),
    accessToken: z.string().min(1, 'Access token is required'), // Encrypted
    scope: z.string().array().default(['read_orders', 'read_products', 'read_customers']),
    installedAt: z.date(),
    webhookEndpoint: z.string().url().optional(),
    webhookId: z.string().optional(),
    apiVersion: z.string().default('2023-10'),
  }),
  metadata: z.object({
    shopName: z.string().optional(),
    shopOwner: z.string().optional(),
    shopEmail: z.string().email().optional(),
    planName: z.string().optional(),
    country: z.string().optional(),
    timezone: z.string().optional(),
  }).optional(),
});

// API Key credential schema (for OpenAI, etc.)
export const ApiKeyCredentialSchema = BaseCredentialSchema.extend({
  platform: z.enum(['openai', 'anthropic', 'stripe']),
  type: z.literal('api_key'),
  data: z.object({
    apiKey: z.string().min(1, 'API key is required'), // Encrypted
    apiUrl: z.string().url().optional(),
    organization: z.string().optional(), // For OpenAI
    project: z.string().optional(),
  }),
});

// OAuth2 credential schema (for Gmail, Facebook, etc.)
export const OAuth2CredentialSchema = BaseCredentialSchema.extend({
  platform: z.enum(['gmail', 'facebook', 'instagram', 'slack']),
  type: z.literal('oauth2'),
  data: z.object({
    accessToken: z.string().min(1, 'Access token is required'), // Encrypted
    refreshToken: z.string().optional(), // Encrypted
    tokenType: z.string().default('Bearer'),
    scope: z.string().array(),
    clientId: z.string(),
    expiresIn: z.number().optional(),
  }),
});

// Webhook credential schema
export const WebhookCredentialSchema = BaseCredentialSchema.extend({
  type: z.literal('webhook'),
  data: z.object({
    webhookUrl: z.string().url(),
    secret: z.string().optional(), // Encrypted
    headers: z.record(z.string(), z.string()).optional(),
    method: z.enum(['POST', 'PUT', 'PATCH']).default('POST'),
  }),
});

// WhatsApp credential schema (Cloud API)
export const WhatsAppCredentialSchema = BaseCredentialSchema.extend({
  platform: z.literal('whatsapp'),
  type: z.literal('api_key'),
  data: z.object({
    businessAccountId: z.string().min(1, 'Business Account ID is required'),
    phoneNumberId: z.string().min(1, 'Phone Number ID is required'),
    token: z.string().min(1, 'Access token is required'), // Encrypted
    defaultTemplateLanguage: z.string().default('en_US'),
    webhookVerifyToken: z.string().min(1, 'Webhook verify token is required'), // Encrypted optional? we encrypt for safety
  }),
  metadata: z.object({
    phoneNumber: z.string().optional(),
    displayName: z.string().optional(),
  }).optional(),
});

// Union type for all credentials
export const CredentialSchema = z.discriminatedUnion('platform', [
  ShopifyCredentialSchema,
  ApiKeyCredentialSchema,
  OAuth2CredentialSchema,
  WebhookCredentialSchema,
  WhatsAppCredentialSchema,
]);

// Types
export type BaseCredential = z.infer<typeof BaseCredentialSchema>;
export type ShopifyCredential = z.infer<typeof ShopifyCredentialSchema>;
export type ApiKeyCredential = z.infer<typeof ApiKeyCredentialSchema>;
export type OAuth2Credential = z.infer<typeof OAuth2CredentialSchema>;
export type WebhookCredential = z.infer<typeof WebhookCredentialSchema>;
export type WhatsAppCredential = z.infer<typeof WhatsAppCredentialSchema>;
export type Credential = z.infer<typeof CredentialSchema>;

// Credential creation schemas (without auto-generated fields)
const OMIT_AUTO_FIELDS = {
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUsed: true,
} as const;

export const CreateCredentialSchema = z.discriminatedUnion('platform', [
  ShopifyCredentialSchema.omit(OMIT_AUTO_FIELDS),
  ApiKeyCredentialSchema.omit(OMIT_AUTO_FIELDS),
  OAuth2CredentialSchema.omit(OMIT_AUTO_FIELDS),
  WebhookCredentialSchema.omit(OMIT_AUTO_FIELDS),
  WhatsAppCredentialSchema.omit(OMIT_AUTO_FIELDS),
]);

export type CreateCredential = z.infer<typeof CreateCredentialSchema>;

// Platform-specific events that can trigger workflows
export const PlatformEventSchema = z.object({
  platform: z.string(),
  event: z.string(),
  label: z.string(),
  description: z.string(),
  dataStructure: z.record(z.string(), z.any()).optional(),
});

export type PlatformEvent = z.infer<typeof PlatformEventSchema>;

// Shopify events
export const SHOPIFY_EVENTS: PlatformEvent[] = [
  {
    platform: 'shopify',
    event: 'orders/create',
    label: 'New Order',
    description: 'Triggered when a new order is created',
    dataStructure: {
      id: 'number',
      email: 'string',
      total_price: 'string',
      customer: 'object',
      line_items: 'array',
    },
  },
  {
    platform: 'shopify',
    event: 'orders/updated',
    label: 'Order Updated',
    description: 'Triggered when an order is updated',
  },
  {
    platform: 'shopify',
    event: 'orders/paid',
    label: 'Order Paid',
    description: 'Triggered when an order is paid',
  },
  {
    platform: 'shopify',
    event: 'orders/cancelled',
    label: 'Order Cancelled',
    description: 'Triggered when an order is cancelled',
  },
  {
    platform: 'shopify',
    event: 'customers/create',
    label: 'New Customer',
    description: 'Triggered when a new customer signs up',
  },
  {
    platform: 'shopify',
    event: 'products/create',
    label: 'New Product',
    description: 'Triggered when a new product is added',
  },
];