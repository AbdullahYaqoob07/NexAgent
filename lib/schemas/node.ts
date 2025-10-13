import { z } from 'zod';

// Base field types for dynamic form generation
export const FieldTypeSchema = z.enum([
  'text',
  'textarea', 
  'number',
  'boolean',
  'select',
  'multiselect',
  'json',
  'code',
  'url',
  'email',
  'password',
  'date',
  'datetime',
  'file',
  'color',
  'range',
  'credential' // For selecting stored credentials
]);

export type FieldType = z.infer<typeof FieldTypeSchema>;

// Field configuration schema
export const NodeFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: FieldTypeSchema,
  required: z.boolean().default(false),
  defaultValue: z.any().optional(),
  placeholder: z.string().optional(),
  description: z.string().optional(),
  helpText: z.string().optional(),
  
  // For select/multiselect fields
  options: z.array(z.object({
    label: z.string(),
    value: z.any()
  })).optional(),
  
  // For credential fields
  platform: z.string().optional(), // Platform filter for credential selection
  
  // Validation rules
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    pattern: z.string().optional(),
    custom: z.string().optional() // Custom validation function
  }).optional(),
  
  // Conditional display
  showIf: z.object({
    field: z.string(),
    operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains']),
    value: z.any()
  }).optional(),
  
  // Field grouping
  group: z.string().optional(),
  order: z.number().default(0)
});

export type NodeField = z.infer<typeof NodeFieldSchema>;

// Node trigger/action types
export const NodeTriggerTypeSchema = z.enum([
  'manual', // User initiated
  'webhook', // HTTP webhook
  'schedule', // Cron-based
  'event', // Platform events (shopify order, customer message, etc)
  'file_watch', // File system events
  'database', // Database changes
  'api_poll' // Regular API polling
]);

export type NodeTriggerType = z.infer<typeof NodeTriggerTypeSchema>;

// Platform-specific triggers
export const PlatformTriggerSchema = z.object({
  platform: z.enum(['shopify', 'woocommerce', 'stripe', 'mailchimp', 'slack', 'discord', 'gmail', 'hubspot']),
  event: z.string(), // e.g., 'orders/create', 'customers/update', 'products/delete'
  conditions: z.record(z.string(), z.any()).optional() // Additional filtering conditions
});

// Trigger configuration
export const NodeTriggerSchema = z.object({
  type: NodeTriggerTypeSchema,
  
  // For webhook triggers
  webhook: z.object({
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('POST'),
    authentication: z.object({
      type: z.enum(['none', 'basic', 'bearer', 'api_key', 'custom']),
      config: z.record(z.string(), z.any()).optional()
    }).optional()
  }).optional(),
  
  // For scheduled triggers
  schedule: z.object({
    cron: z.string(),
    timezone: z.string().default('UTC')
  }).optional(),
  
  // For platform event triggers
  platform: PlatformTriggerSchema.optional(),
  
  // For file watch triggers
  fileWatch: z.object({
    path: z.string(),
    pattern: z.string().optional(),
    events: z.array(z.enum(['created', 'modified', 'deleted'])).default(['created', 'modified'])
  }).optional(),
  
  // For API polling
  polling: z.object({
    url: z.string(),
    interval: z.number(), // in seconds
    method: z.enum(['GET', 'POST']).default('GET'),
    headers: z.record(z.string(), z.string()).optional()
  }).optional()
});

export type NodeTrigger = z.infer<typeof NodeTriggerSchema>;

// Node execution configuration
export const NodeExecutionSchema = z.object({
  timeout: z.number().default(30000), // milliseconds
  retryCount: z.number().default(3),
  retryDelay: z.number().default(1000), // milliseconds
  continueOnError: z.boolean().default(false),
  rateLimit: z.object({
    maxRequests: z.number(),
    timeWindow: z.number() // milliseconds
  }).optional()
});

// Node output schema
export const NodeOutputSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.string(),
  description: z.string().optional(),
  example: z.any().optional()
});

// Main node definition schema
export const NodeDefinitionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.string(), // Unique identifier for the node type
  category: z.string(),
  subcategory: z.string().optional(),
  version: z.string().default('1.0.0'),
  
  // Basic info
  description: z.string(),
  documentation: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  tags: z.array(z.string()).default([]),
  
  // Node behavior
  trigger: NodeTriggerSchema.optional(), // If this node can be triggered
  isStartNode: z.boolean().default(false), // Can this node start a workflow
  isEndNode: z.boolean().default(false), // Can this node end a workflow
  
  // Configuration fields
  fields: z.array(NodeFieldSchema).default([]),
  
  // Advanced configuration
  execution: NodeExecutionSchema.optional(),
  
  // Output definition
  outputs: z.array(NodeOutputSchema).default([]),
  
  // Documentation and examples
  examples: z.array(z.object({
    name: z.string(),
    description: z.string(),
    config: z.record(z.string(), z.any()),
    expectedOutput: z.any().optional()
  })).default([]),
  
  // Code/implementation
  implementation: z.object({
    type: z.enum(['javascript', 'python', 'api', 'builtin']),
    code: z.string().optional(), // For custom code
    apiEndpoint: z.string().optional(), // For API-based nodes
    builtinHandler: z.string().optional() // For built-in handlers
  }),
  
  // Metadata
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  createdBy: z.string(),
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(false) // Can other users use this node
});

export type NodeDefinition = z.infer<typeof NodeDefinitionSchema>;

// Node instance schema (when used in a workflow)
export const NodeInstanceSchema = z.object({
  id: z.string().uuid(),
  workflowId: z.string().uuid(),
  nodeDefinitionId: z.string().uuid(),
  
  // Instance-specific configuration
  name: z.string(),
  config: z.record(z.string(), z.any()).default({}),
  position: z.object({
    x: z.number(),
    y: z.number()
  }),
  
  // Runtime configuration
  enabled: z.boolean().default(true),
  execution: NodeExecutionSchema.optional(),
  
  // Metadata
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

export type NodeInstance = z.infer<typeof NodeInstanceSchema>;

// Popular platform events for quick setup
export const PLATFORM_EVENTS = {
  shopify: [
    { event: 'orders/create', label: 'New Order', description: 'Triggered when a new order is created' },
    { event: 'orders/updated', label: 'Order Updated', description: 'Triggered when an order is updated' },
    { event: 'orders/paid', label: 'Order Paid', description: 'Triggered when an order is paid' },
    { event: 'orders/cancelled', label: 'Order Cancelled', description: 'Triggered when an order is cancelled' },
    { event: 'customers/create', label: 'New Customer', description: 'Triggered when a new customer signs up' },
    { event: 'customers/update', label: 'Customer Updated', description: 'Triggered when customer info is updated' },
    { event: 'products/create', label: 'New Product', description: 'Triggered when a new product is added' },
    { event: 'products/update', label: 'Product Updated', description: 'Triggered when a product is updated' },
    { event: 'inventory_levels/update', label: 'Inventory Updated', description: 'Triggered when inventory changes' }
  ],
  stripe: [
    { event: 'payment_intent.succeeded', label: 'Payment Succeeded', description: 'Triggered when a payment is successful' },
    { event: 'payment_intent.payment_failed', label: 'Payment Failed', description: 'Triggered when a payment fails' },
    { event: 'customer.created', label: 'Customer Created', description: 'Triggered when a new customer is created' },
    { event: 'invoice.payment_succeeded', label: 'Invoice Paid', description: 'Triggered when an invoice is paid' },
    { event: 'subscription.created', label: 'New Subscription', description: 'Triggered when a new subscription starts' }
  ],
  slack: [
    { event: 'message', label: 'New Message', description: 'Triggered when a new message is posted' },
    { event: 'member_joined_channel', label: 'Member Joined', description: 'Triggered when someone joins a channel' },
    { event: 'file_shared', label: 'File Shared', description: 'Triggered when a file is shared' }
  ],
  gmail: [
    { event: 'message.received', label: 'Email Received', description: 'Triggered when a new email is received' },
    { event: 'message.sent', label: 'Email Sent', description: 'Triggered when an email is sent' }
  ]
} as const;