/**
 * NexAgent Node Template Registry
 * Comprehensive node templates for workflow automation
 * 
 * This registry provides:
 * - Pre-defined node templates with validation
 * - Configuration schemas for each node type
 * - Default configurations and examples
 * - Documentation for node usage
 */

import { z } from 'zod';
import { NodeType, NodeCategory, NodeTemplate } from './types';

// ============================================================================
// NODE CONFIGURATION SCHEMAS
// ============================================================================

// HTTP Request Node Configuration
const HttpRequestConfigSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']),
  url: z.string().url(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().optional(),
  timeout: z.number().positive().default(30000),
  retries: z.number().min(0).max(5).default(3),
  authentication: z.object({
    type: z.enum(['none', 'bearer', 'basic', 'api_key']),
    token: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    apiKey: z.string().optional(),
    apiKeyHeader: z.string().optional(),
  }).optional(),
});

// Schedule Node Configuration
const ScheduleConfigSchema = z.object({
  type: z.enum(['interval', 'cron', 'once']),
  interval: z.number().positive().optional(),
  cron: z.string().optional(),
  timezone: z.string().default('UTC'),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
});

// Email Node Configuration
const EmailConfigSchema = z.object({
  to: z.array(z.string().email()),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  subject: z.string().min(1),
  body: z.string().min(1),
  htmlBody: z.string().optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.string(),
    contentType: z.string(),
  })).optional(),
  smtp: z.object({
    host: z.string(),
    port: z.number().positive(),
    secure: z.boolean().default(true),
    auth: z.object({
      user: z.string(),
      pass: z.string(),
    }),
  }),
});

// Database Query Configuration
const DatabaseQueryConfigSchema = z.object({
  connectionString: z.string(),
  query: z.string(),
  parameters: z.record(z.string(), z.unknown()).optional(),
  timeout: z.number().positive().default(30000),
  database: z.enum(['postgresql', 'mysql', 'sqlite', 'mongodb', 'redis']),
});

// Condition Node Configuration
const ConditionConfigSchema = z.object({
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'starts_with', 'ends_with', 'regex']),
    value: z.unknown(),
    type: z.enum(['string', 'number', 'boolean', 'date']).optional(),
  })),
  logic: z.enum(['and', 'or']).default('and'),
});

// OpenAI Configuration
const OpenAIConfigSchema = z.object({
  model: z.enum(['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k']),
  prompt: z.string().min(1),
  maxTokens: z.number().positive().default(1000),
  temperature: z.number().min(0).max(2).default(0.7),
  topP: z.number().min(0).max(1).default(1),
  frequencyPenalty: z.number().min(-2).max(2).default(0),
  presencePenalty: z.number().min(-2).max(2).default(0),
  apiKey: z.string().min(1),
});

// Data Transform Configuration
const DataTransformConfigSchema = z.object({
  transformations: z.array(z.object({
    type: z.enum(['map', 'filter', 'reduce', 'sort', 'group', 'aggregate']),
    field: z.string().optional(),
    expression: z.string(),
    target: z.string().optional(),
  })),
  outputFormat: z.enum(['json', 'csv', 'xml']).default('json'),
});

// ============================================================================
// NODE TEMPLATE REGISTRY CLASS
// ============================================================================

export class NodeTemplateRegistry {
  private templates: Map<NodeType, NodeTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    // ====================================================================
    // TRIGGER NODES
    // ====================================================================

    this.registerTemplate({
      type: NodeType.HTTP_WEBHOOK,
      category: NodeCategory.TRIGGER,
      name: 'HTTP Webhook',
      description: 'Receives HTTP requests to trigger workflows',
      icon: 'Globe',
      color: '#10B981',
      inputs: [],
      outputs: [
        {
          id: 'output',
          name: 'Request Data',
          type: 'output',
          dataType: 'object',
          required: false,
          description: 'HTTP request data including headers, body, and parameters',
        }
      ],
      configSchema: z.object({
        path: z.string().default('/webhook'),
        methods: z.array(z.enum(['GET', 'POST', 'PUT', 'DELETE'])).default(['POST']),
        authentication: z.object({
          required: z.boolean().default(false),
          type: z.enum(['bearer', 'api_key', 'signature']).optional(),
        }).optional(),
      }),
      defaultConfig: {
        path: '/webhook',
        methods: ['POST'],
        authentication: { required: false },
      },
      documentation: 'Triggers workflow execution when an HTTP request is received at the specified endpoint.',
      examples: [
        {
          name: 'Simple POST Webhook',
          description: 'Basic webhook that accepts POST requests',
          config: {
            path: '/webhook/simple',
            methods: ['POST'],
          }
        }
      ]
    });

    this.registerTemplate({
      type: NodeType.SCHEDULE,
      category: NodeCategory.TRIGGER,
      name: 'Schedule',
      description: 'Triggers workflows on a schedule',
      icon: 'Calendar',
      color: '#8B5CF6',
      inputs: [],
      outputs: [
        {
          id: 'output',
          name: 'Trigger Data',
          type: 'output',
          dataType: 'object',
          required: false,
          description: 'Schedule trigger information',
        }
      ],
      configSchema: ScheduleConfigSchema,
      defaultConfig: {
        type: 'interval',
        interval: 3600000, // 1 hour
        timezone: 'UTC',
      },
      documentation: 'Executes workflow on a defined schedule using intervals, cron expressions, or one-time execution.',
      examples: [
        {
          name: 'Daily at 9 AM',
          description: 'Runs every day at 9:00 AM',
          config: {
            type: 'cron',
            cron: '0 9 * * *',
            timezone: 'UTC',
          }
        },
        {
          name: 'Every 30 minutes',
          description: 'Runs every 30 minutes',
          config: {
            type: 'interval',
            interval: 1800000,
          }
        }
      ]
    });

    // ====================================================================
    // ACTION NODES
    // ====================================================================

    this.registerTemplate({
      type: NodeType.HTTP_REQUEST,
      category: NodeCategory.ACTION,
      name: 'HTTP Request',
      description: 'Makes HTTP requests to external APIs',
      icon: 'Globe',
      color: '#3B82F6',
      inputs: [
        {
          id: 'input',
          name: 'Request Data',
          type: 'input',
          dataType: 'object',
          required: false,
          description: 'Optional data to include in the request',
        }
      ],
      outputs: [
        {
          id: 'success',
          name: 'Success',
          type: 'output',
          dataType: 'object',
          required: false,
          description: 'Successful response data',
        },
        {
          id: 'error',
          name: 'Error',
          type: 'output',
          dataType: 'object',
          required: false,
          description: 'Error information if request fails',
        }
      ],
      configSchema: HttpRequestConfigSchema,
      defaultConfig: {
        method: 'GET',
        url: 'https://api.example.com/data',
        timeout: 30000,
        retries: 3,
      },
      documentation: 'Performs HTTP requests with support for various methods, authentication, and error handling.',
      examples: [
        {
          name: 'REST API Call',
          description: 'GET request to fetch user data',
          config: {
            method: 'GET',
            url: 'https://jsonplaceholder.typicode.com/users/1',
            headers: {
              'Content-Type': 'application/json'
            }
          }
        }
      ]
    });

    this.registerTemplate({
      type: NodeType.EMAIL_SEND,
      category: NodeCategory.ACTION,
      name: 'Send Email',
      description: 'Sends emails via SMTP',
      icon: 'Mail',
      color: '#EF4444',
      inputs: [
        {
          id: 'input',
          name: 'Email Data',
          type: 'input',
          dataType: 'object',
          description: 'Dynamic email content and recipients',
        }
      ],
      outputs: [
        {
          id: 'success',
          name: 'Success',
          type: 'output',
          dataType: 'object',
          description: 'Email sent confirmation',
        },
        {
          id: 'error',
          name: 'Error',
          type: 'output',
          dataType: 'object',
          description: 'Email sending error details',
        }
      ],
      configSchema: EmailConfigSchema,
      defaultConfig: {
        to: [],
        subject: 'Workflow Notification',
        body: 'This is an automated message from NexAgent.',
        smtp: {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: '',
            pass: '',
          }
        }
      },
      documentation: 'Sends emails with support for HTML content, attachments, and various SMTP providers.',
    });

    this.registerTemplate({
      type: NodeType.DATABASE_QUERY,
      category: NodeCategory.ACTION,
      name: 'Database Query',
      description: 'Executes database queries',
      icon: 'Database',
      color: '#059669',
      inputs: [
        {
          id: 'input',
          name: 'Query Parameters',
          type: 'input',
          dataType: 'object',
          description: 'Parameters for the database query',
        }
      ],
      outputs: [
        {
          id: 'results',
          name: 'Query Results',
          type: 'output',
          dataType: 'array',
          description: 'Database query results',
        },
        {
          id: 'error',
          name: 'Error',
          type: 'output',
          dataType: 'object',
          description: 'Database error information',
        }
      ],
      configSchema: DatabaseQueryConfigSchema,
      defaultConfig: {
        connectionString: '',
        query: 'SELECT * FROM users WHERE active = true',
        timeout: 30000,
        database: 'postgresql',
      },
      documentation: 'Executes SQL queries on various database types with parameterized query support.',
    });

    // ====================================================================
    // LOGIC NODES
    // ====================================================================

    this.registerTemplate({
      type: NodeType.CONDITION,
      category: NodeCategory.LOGIC,
      name: 'Condition',
      description: 'Evaluates conditions and routes flow',
      icon: 'GitBranch',
      color: '#F59E0B',
      inputs: [
        {
          id: 'input',
          name: 'Data',
          type: 'input',
          dataType: 'any',
          description: 'Data to evaluate conditions against',
        }
      ],
      outputs: [
        {
          id: 'true',
          name: 'True',
          type: 'output',
          dataType: 'any',
          description: 'Executed when conditions are true',
        },
        {
          id: 'false',
          name: 'False',
          type: 'output',
          dataType: 'any',
          description: 'Executed when conditions are false',
        }
      ],
      configSchema: ConditionConfigSchema,
      defaultConfig: {
        conditions: [
          {
            field: 'status',
            operator: 'equals',
            value: 'active',
          }
        ],
        logic: 'and',
      },
      documentation: 'Evaluates multiple conditions and routes workflow execution based on results.',
    });

    this.registerTemplate({
      type: NodeType.DELAY,
      category: NodeCategory.LOGIC,
      name: 'Delay',
      description: 'Pauses workflow execution for a specified time',
      icon: 'Clock',
      color: '#6B7280',
      inputs: [
        {
          id: 'input',
          name: 'Input',
          type: 'input',
          dataType: 'any',
          description: 'Data to pass through after delay',
        }
      ],
      outputs: [
        {
          id: 'output',
          name: 'Output',
          type: 'output',
          dataType: 'any',
          description: 'Input data passed through after delay',
        }
      ],
      configSchema: z.object({
        duration: z.number().positive(),
        unit: z.enum(['ms', 's', 'm', 'h']).default('s'),
      }),
      defaultConfig: {
        duration: 5,
        unit: 's',
      },
      documentation: 'Introduces a delay in workflow execution for timing control.',
    });

    // ====================================================================
    // AI/ML NODES
    // ====================================================================

    this.registerTemplate({
      type: NodeType.OPENAI_COMPLETION,
      category: NodeCategory.AI_ML,
      name: 'OpenAI Completion',
      description: 'Generates text using OpenAI GPT models',
      icon: 'Bot',
      color: '#10B981',
      inputs: [
        {
          id: 'input',
          name: 'Prompt Data',
          type: 'input',
          dataType: 'object',
          description: 'Data to include in the prompt',
        }
      ],
      outputs: [
        {
          id: 'completion',
          name: 'Completion',
          type: 'output',
          dataType: 'string',
          description: 'Generated text response',
        },
        {
          id: 'metadata',
          name: 'Metadata',
          type: 'output',
          dataType: 'object',
          description: 'Response metadata including token usage',
        },
        {
          id: 'error',
          name: 'Error',
          type: 'output',
          dataType: 'object',
          description: 'Error information if generation fails',
        }
      ],
      configSchema: OpenAIConfigSchema,
      defaultConfig: {
        model: 'gpt-3.5-turbo',
        prompt: 'Analyze the following data and provide insights: {{input.data}}',
        maxTokens: 1000,
        temperature: 0.7,
        apiKey: '',
      },
      documentation: 'Integrates with OpenAI API to generate text completions using various GPT models.',
    });

    this.registerTemplate({
      type: NodeType.DATA_TRANSFORM,
      category: NodeCategory.DATA,
      name: 'Data Transform',
      description: 'Transforms and processes data',
      icon: 'Code',
      color: '#8B5CF6',
      inputs: [
        {
          id: 'input',
          name: 'Input Data',
          type: 'input',
          dataType: 'any',
          description: 'Data to transform',
        }
      ],
      outputs: [
        {
          id: 'output',
          name: 'Transformed Data',
          type: 'output',
          dataType: 'any',
          description: 'Processed and transformed data',
        },
        {
          id: 'error',
          name: 'Error',
          type: 'output',
          dataType: 'object',
          description: 'Transformation error details',
        }
      ],
      configSchema: DataTransformConfigSchema,
      defaultConfig: {
        transformations: [
          {
            type: 'map',
            expression: 'item => ({ ...item, processed: true })',
          }
        ],
        outputFormat: 'json',
      },
      documentation: 'Applies various data transformations including mapping, filtering, and aggregation.',
    });
  }

  // ========================================================================
  // REGISTRY METHODS
  // ========================================================================

  registerTemplate(template: NodeTemplate): void {
    this.templates.set(template.type, template);
  }

  getTemplate(type: NodeType): NodeTemplate | null {
    return this.templates.get(type) || null;
  }

  getAllTemplates(): NodeTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplatesByCategory(category: NodeCategory): NodeTemplate[] {
    return this.getAllTemplates().filter(template => template.category === category);
  }

  searchTemplates(query: string): NodeTemplate[] {
    const searchTerm = query.toLowerCase();
    return this.getAllTemplates().filter(template => 
      template.name.toLowerCase().includes(searchTerm) ||
      template.description.toLowerCase().includes(searchTerm) ||
      template.type.toLowerCase().includes(searchTerm)
    );
  }

  validateNodeConfig(type: NodeType, config: unknown): { valid: boolean; errors?: string[] } {
    const template = this.getTemplate(type);
    if (!template) {
      return { valid: false, errors: [`Unknown node type: ${type}`] };
    }

    const validation = template.configSchema.safeParse(config);
    if (!validation.success) {
      return { 
        valid: false, 
        errors: validation.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
      };
    }

    return { valid: true };
  }

  getNodeConfigSchema(type: NodeType): z.ZodSchema | null {
    const template = this.getTemplate(type);
    return template?.configSchema || null;
  }

  getDefaultConfig(type: NodeType): Record<string, unknown> | null {
    const template = this.getTemplate(type);
    return template?.defaultConfig || null;
  }
}
