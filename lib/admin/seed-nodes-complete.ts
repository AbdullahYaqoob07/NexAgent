import { nodeDefinitionsService } from '@/lib/firestore';
import { NodeDefinition } from '@/lib/schemas/node';

// Comprehensive seed data for all workflow nodes
export const seedNodes: Omit<NodeDefinition, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // ============ TRIGGERS ============
  {
    name: 'On Clicking Execute',
    type: 'On Clicking Execute',
    category: 'Triggers',
    version: '1.0.0',
    description: 'Manually trigger the workflow by clicking execute',
    icon: '▶️',
    color: '#FF6900',
    tags: ['trigger', 'manual'],
    trigger: { type: 'manual' },
    isStartNode: true,
    isEndNode: false,
    fields: [],
    outputs: [
      {
        key: 'triggered',
        label: 'Triggered',
        type: 'boolean',
        description: 'Execution status',
        example: true
      },
      {
        key: 'timestamp',
        label: 'Timestamp', 
        type: 'string',
        description: 'Execution time',
        example: '2024-01-01T00:00:00Z'
      }
    ],
    examples: [
      {
        name: 'Basic Manual Trigger',
        description: 'Simple manual trigger setup',
        config: {},
        expectedOutput: { triggered: true, timestamp: 'current_time' }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        // Manual trigger implementation
        return {
          triggered: true,
          timestamp: new Date().toISOString()
        };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },

  {
    name: 'HTTP Request',
    type: 'HTTP Request',
    category: 'Triggers',
    version: '1.0.0',
    description: 'Trigger workflow via HTTP request',
    icon: '🌐',
    color: '#4CAF50',
    tags: ['trigger', 'http', 'api'],
    trigger: {
      type: 'webhook',
      webhook: {
        method: 'POST'
      }
    },
    isStartNode: true,
    isEndNode: false,
    fields: [
      {
        key: 'endpoint',
        label: 'Webhook Endpoint',
        type: 'text',
        required: true,
        placeholder: '/webhook/my-workflow',
        description: 'Endpoint path for webhook',
        order: 0
      }
    ],
    outputs: [
      {
        key: 'headers',
        label: 'Headers',
        type: 'object',
        description: 'Request headers'
      },
      {
        key: 'body',
        label: 'Body',
        type: 'object',
        description: 'Request payload'
      },
      {
        key: 'method',
        label: 'Method',
        type: 'string',
        description: 'HTTP method'
      }
    ],
    examples: [
      {
        name: 'Basic Webhook',
        description: 'Simple webhook trigger',
        config: { endpoint: '/webhook/test' }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        // HTTP trigger captures incoming request data
        const { headers, body, method } = context.request || {};
        return { headers, body, method };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },

  {
    name: 'Schedule',
    type: 'Schedule',
    category: 'Triggers',
    version: '1.0.0',
    description: 'Trigger workflow on a schedule',
    icon: '⏰',
    color: '#9C27B0',
    tags: ['trigger', 'cron', 'schedule'],
    trigger: {
      type: 'schedule'
    },
    isStartNode: true,
    isEndNode: false,
    fields: [
      {
        key: 'cron',
        label: 'Cron Expression',
        type: 'text',
        required: true,
        placeholder: '*/1 * * * *',
        description: 'Cron schedule expression (5 fields: minute hour day month weekday)',
        order: 0
      }
    ],
    outputs: [
      {
        key: 'scheduledTime',
        label: 'Scheduled Time',
        type: 'string',
        description: 'Time the schedule triggered'
      }
    ],
    examples: [
      {
        name: 'Every 5 minutes',
        description: 'Run every 5 minutes',
        config: { cron: '*/5 * * * *' }
      },
      {
        name: 'Every minute',
        description: 'Run every minute',
        config: { cron: '*/1 * * * *' }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        return { scheduledTime: new Date().toISOString() };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },

  {
    name: 'Webhook',
    type: 'Webhook',
    category: 'Triggers',
    version: '1.0.0',
    description: 'Listen for webhook events',
    icon: '🔗',
    color: '#FF9800',
    tags: ['trigger', 'webhook', 'event'],
    trigger: {
      type: 'webhook'
    },
    isStartNode: true,
    isEndNode: false,
    fields: [
      {
        key: 'url',
        label: 'Webhook URL',
        type: 'url',
        required: true,
        placeholder: 'https://api.example.com/webhook',
        description: 'URL to receive webhook',
        order: 0
      }
    ],
    outputs: [
      {
        key: 'payload',
        label: 'Payload',
        type: 'object',
        description: 'Webhook payload data'
      }
    ],
    examples: [
      {
        name: 'Basic Webhook',
        description: 'Simple webhook listener',
        config: { url: 'https://example.com/webhook' }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        const payload = context.webhook?.payload || {};
        return { payload };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },

  // ============ ECOMMERCE ============
  {
    name: 'Shopify Trigger',
    type: 'Shopify Trigger',
    category: 'Triggers',
    version: '1.0.0',
    description: 'Trigger workflow when Shopify events occur (orders, customers, products)',
    icon: '🛍️',
    color: '#96bf48',
    tags: ['trigger', 'shopify', 'webhook', 'orders'],
    trigger: {
      type: 'event',
      platform: {
        platform: 'shopify',
        event: 'orders/create'
      }
    },
    isStartNode: true,
    isEndNode: false,
    fields: [
      {
        key: 'credentialId',
        label: 'Shopify Connection',
        type: 'credential',
        required: true,
        platform: 'shopify',
        description: 'Select your Shopify store connection',
        order: 0
      },
      {
        key: 'event',
        label: 'Trigger Event',
        type: 'select',
        required: true,
        defaultValue: 'orders/create',
        options: [
          { label: 'New Order Created', value: 'orders/create' },
          { label: 'Order Updated', value: 'orders/updated' },
          { label: 'Order Paid', value: 'orders/paid' },
          { label: 'Order Cancelled', value: 'orders/cancelled' },
          { label: 'New Customer', value: 'customers/create' },
          { label: 'New Product', value: 'products/create' }
        ],
        description: 'Choose which Shopify event should trigger the workflow',
        order: 1
      }
    ],
    outputs: [
      {
        key: 'order',
        label: 'Order Data',
        type: 'object',
        description: 'Complete order information from Shopify',
        example: {
          id: 12345,
          email: 'customer@example.com',
          total_price: '29.99',
          currency: 'USD'
        }
      },
      {
        key: 'customer',
        label: 'Customer Data',
        type: 'object',
        description: 'Customer information',
        example: {
          id: 67890,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com'
        }
      },
      {
        key: 'shop',
        label: 'Shop Data',
        type: 'object',
        description: 'Store information'
      }
    ],
    examples: [
      {
        name: 'New Order Alert',
        description: 'Trigger when a new order is placed',
        config: {
          event: 'orders/create'
        },
        expectedOutput: {
          order: { id: 12345, total_price: '29.99' },
          customer: { email: 'customer@example.com' }
        }
      },
      {
        name: 'Customer Signup',
        description: 'Trigger when a new customer registers',
        config: {
          event: 'customers/create'
        }
      }
    ],
    implementation: {
      type: 'builtin',
      builtinHandler: 'shopifyWebhook',
      code: `
        // Handled by the Shopify webhook system
        // The webhook data is automatically passed to the workflow
        const { event, data } = context.webhook;
        return {
          order: data,
          customer: data.customer,
          shop: context.shop
        };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },

  {
    name: 'Shopify Action',
    type: 'Shopify Action',
    category: 'Ecommerce',
    version: '1.0.0',
    description: 'Perform actions on your Shopify store (get orders, products, customers)',
    icon: '🛍️',
    color: '#96bf48',
    tags: ['ecommerce', 'shopify', 'store', 'api'],
    isStartNode: false,
    isEndNode: false,
    fields: [
      {
        key: 'credentialId',
        label: 'Shopify Connection',
        type: 'credential',
        required: true,
        platform: 'shopify',
        description: 'Select your Shopify store connection',
        order: 0
      },
      {
        key: 'operation',
        label: 'Operation',
        type: 'select',
        required: true,
        defaultValue: 'get_orders',
        options: [
          { label: 'Get Orders', value: 'get_orders' },
          { label: 'Get Products', value: 'get_products' },
          { label: 'Get Customers', value: 'get_customers' },
          { label: 'Get Order by ID', value: 'get_order' },
          { label: 'Update Order', value: 'update_order' }
        ],
        order: 1
      },
      {
        key: 'limit',
        label: 'Limit',
        type: 'number',
        required: false,
        defaultValue: 50,
        validation: { min: 1, max: 250 },
        description: 'Maximum number of items to retrieve',
        order: 2
      },
      {
        key: 'orderId',
        label: 'Order ID',
        type: 'text',
        required: false,
        placeholder: '12345',
        description: 'Required for get_order and update_order operations',
        order: 3
      }
    ],
    outputs: [
      {
        key: 'data',
        label: 'Response Data',
        type: 'object',
        description: 'Shopify API response data'
      },
      {
        key: 'count',
        label: 'Item Count',
        type: 'number',
        description: 'Number of items returned'
      }
    ],
    examples: [
      {
        name: 'Get Recent Orders',
        description: 'Fetch the 10 most recent orders',
        config: {
          operation: 'get_orders',
          limit: 10
        }
      },
      {
        name: 'Get All Products',
        description: 'Fetch all products from the store',
        config: {
          operation: 'get_products',
          limit: 100
        }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        const { credentialId, operation, limit, orderId } = inputs;
        
        // Get credential from credential service
        const credential = await context.getCredential(credentialId);
        if (!credential) {
          throw new Error('Shopify credential not found');
        }
        
        const { shopDomain, accessToken, apiVersion } = credential.data;
        const baseUrl = \`https://\${shopDomain}.myshopify.com/admin/api/\${apiVersion}\`;
        
        let endpoint = '';
        switch (operation) {
          case 'get_orders':
            endpoint = \`/orders.json?limit=\${limit || 50}\`;
            break;
          case 'get_products':
            endpoint = \`/products.json?limit=\${limit || 50}\`;
            break;
          case 'get_customers':
            endpoint = \`/customers.json?limit=\${limit || 50}\`;
            break;
          case 'get_order':
            if (!orderId) throw new Error('Order ID is required');
            endpoint = \`/orders/\${orderId}.json\`;
            break;
          default:
            throw new Error('Unsupported operation');
        }
        
        const response = await fetch(baseUrl + endpoint, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(\`Shopify API error: \${response.status} \${response.statusText}\`);
        }
        
        const data = await response.json();
        const items = data.orders || data.products || data.customers || [data.order].filter(Boolean);
        
        return {
          data: items,
          count: Array.isArray(items) ? items.length : 1
        };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },

  {
    name: 'Instagram',
    type: 'Instagram',
    category: 'Ecommerce',
    version: '1.0.0',
    description: 'Post to Instagram',
    icon: '📷',
    color: '#E4405F',
    tags: ['social', 'instagram', 'media'],
    isStartNode: false,
    isEndNode: false,
    fields: [
      {
        key: 'accessToken',
        label: 'Access Token',
        type: 'password',
        required: true,
        description: 'Instagram Graph API token',
        order: 0
      },
      {
        key: 'content',
        label: 'Content',
        type: 'textarea',
        required: false,
        placeholder: 'Caption or content',
        order: 1
      }
    ],
    outputs: [
      {
        key: 'postId',
        label: 'Post ID',
        type: 'string'
      },
      {
        key: 'success',
        label: 'Success',
        type: 'boolean'
      }
    ],
    examples: [
      {
        name: 'Post Photo',
        description: 'Post a photo to Instagram',
        config: { content: 'Check out this photo!' }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        return { postId: 'ig_' + Date.now(), success: true };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },

  {
    name: 'Facebook',
    type: 'Facebook',
    category: 'Ecommerce',
    version: '1.0.0',
    description: 'Post to Facebook pages',
    icon: '👍',
    color: '#1877F2',
    tags: ['social', 'facebook', 'marketing'],
    isStartNode: false,
    isEndNode: false,
    fields: [
      {
        key: 'pageId',
        label: 'Page ID',
        type: 'text',
        required: true,
        description: 'Facebook Page ID',
        order: 0
      },
      {
        key: 'accessToken',
        label: 'Access Token',
        type: 'password',
        required: true,
        description: 'Facebook Graph API token',
        order: 1
      },
      {
        key: 'message',
        label: 'Message',
        type: 'textarea',
        required: true,
        placeholder: "What's on your mind?",
        order: 2
      }
    ],
    outputs: [
      {
        key: 'postId',
        label: 'Post ID',
        type: 'string'
      }
    ],
    examples: [
      {
        name: 'Page Post',
        description: 'Post to Facebook page',
        config: { message: 'Hello from NexAgent!' }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        return { postId: 'fb_' + Date.now() };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },

  {
    name: 'WhatsApp',
    type: 'WhatsApp',
    category: 'Ecommerce',
    version: '1.0.0',
    description: 'Send WhatsApp messages',
    icon: '💬',
    color: '#25D366',
    tags: ['messaging', 'whatsapp', 'communication'],
    isStartNode: false,
    isEndNode: false,
    fields: [
      {
        key: 'phoneNumber',
        label: 'Phone Number',
        type: 'text',
        required: true,
        placeholder: '+1234567890',
        description: 'Recipient phone number',
        order: 0
      },
      {
        key: 'message',
        label: 'Message',
        type: 'textarea',
        required: true,
        placeholder: 'Your message...',
        order: 1
      }
    ],
    outputs: [
      {
        key: 'messageId',
        label: 'Message ID',
        type: 'string'
      },
      {
        key: 'status',
        label: 'Status',
        type: 'string'
      }
    ],
    examples: [
      {
        name: 'Send Message',
        description: 'Send WhatsApp message',
        config: { phoneNumber: '+1234567890', message: 'Hello!' }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        return { messageId: 'msg_' + Date.now(), status: 'sent' };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },

  // ============ FORK ============
  {
    name: 'Double',
    type: 'Double',
    category: 'Fork',
    version: '1.0.0',
    description: 'Split workflow into 2 parallel paths',
    icon: '🔀',
    color: '#9C27B0',
    tags: ['fork', 'parallel', 'split'],
    isStartNode: false,
    isEndNode: false,
    fields: [],
    outputs: [
      {
        key: 'output_1',
        label: 'Output 1',
        type: 'any',
        description: 'First fork output'
      },
      {
        key: 'output_2',
        label: 'Output 2',
        type: 'any',
        description: 'Second fork output'
      }
    ],
    examples: [
      {
        name: 'Split Data',
        description: 'Split input to two paths',
        config: {}
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        const input = inputs.data || inputs;
        return { output_1: input, output_2: input };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },

  {
    name: 'Triple',
    type: 'Triple',
    category: 'Fork',
    version: '1.0.0',
    description: 'Split workflow into 3 parallel paths',
    icon: '🔀',
    color: '#9C27B0',
    tags: ['fork', 'parallel', 'split'],
    isStartNode: false,
    isEndNode: false,
    fields: [],
    outputs: [
      {
        key: 'output_1',
        label: 'Output 1',
        type: 'any'
      },
      {
        key: 'output_2',
        label: 'Output 2',
        type: 'any'
      },
      {
        key: 'output_3',
        label: 'Output 3',
        type: 'any'
      }
    ],
    examples: [
      {
        name: 'Split Data',
        description: 'Split input to three paths',
        config: {}
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        const input = inputs.data || inputs;
        return { output_1: input, output_2: input, output_3: input };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },

  {
    name: 'Quadra',
    type: 'Quadra',
    category: 'Fork',
    version: '1.0.0',
    description: 'Split workflow into 4 parallel paths',
    icon: '🔀',
    color: '#9C27B0',
    tags: ['fork', 'parallel', 'split'],
    isStartNode: false,
    isEndNode: false,
    fields: [],
    outputs: [
      {
        key: 'output_1',
        label: 'Output 1',
        type: 'any'
      },
      {
        key: 'output_2',
        label: 'Output 2',
        type: 'any'
      },
      {
        key: 'output_3',
        label: 'Output 3',
        type: 'any'
      },
      {
        key: 'output_4',
        label: 'Output 4',
        type: 'any'
      }
    ],
    examples: [
      {
        name: 'Split Data',
        description: 'Split input to four paths',
        config: {}
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        const input = inputs.data || inputs;
        return { output_1: input, output_2: input, output_3: input, output_4: input };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },

  {
    name: 'Custom',
    type: 'Custom',
    category: 'Fork',
    version: '1.0.0',
    description: 'Split workflow into 2-6 custom parallel paths',
    icon: '🔀',
    color: '#9C27B0',
    tags: ['fork', 'parallel', 'split', 'custom'],
    isStartNode: false,
    isEndNode: false,
    fields: [
      {
        key: 'outputCount',
        label: 'Number of Outputs',
        type: 'number',
        required: true,
        defaultValue: 2,
        validation: {
          min: 2,
          max: 6
        },
        description: 'Number of parallel outputs (2-6)',
        order: 0
      }
    ],
    outputs: [
      {
        key: 'outputs',
        label: 'Dynamic Outputs',
        type: 'array',
        description: 'Array of outputs based on count'
      }
    ],
    examples: [
      {
        name: '3-Way Split',
        description: 'Split input to 3 custom paths',
        config: { outputCount: 3 }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        const input = inputs.data || inputs;
        const count = inputs.outputCount || 2;
        const outputs = {};
        for (let i = 1; i <= count; i++) {
          outputs[\`output_\${i}\`] = input;
        }
        return outputs;
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },

  // ============ ACTIONS ============
  {
    name: 'HTTP Request',
    type: 'HTTP Request Action',
    category: 'Actions',
    version: '1.0.0',
    description: 'Make HTTP API requests',
    icon: '🌐',
    color: '#4CAF50',
    tags: ['http', 'api', 'request'],
    isStartNode: false,
    isEndNode: false,
    fields: [
      {
        key: 'url',
        label: 'URL',
        type: 'url',
        required: true,
        placeholder: 'https://api.example.com/endpoint',
        description: 'API endpoint URL',
        order: 0
      },
      {
        key: 'method',
        label: 'Method',
        type: 'select',
        required: true,
        defaultValue: 'GET',
        options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' }
        ],
        order: 1
      }
    ],
    outputs: [
      {
        key: 'status',
        label: 'Status Code',
        type: 'number'
      },
      {
        key: 'data',
        label: 'Response Data',
        type: 'object'
      }
    ],
    examples: [
      {
        name: 'GET Request',
        description: 'Simple GET request',
        config: { url: 'https://api.example.com/users', method: 'GET' }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        const { url, method } = inputs;
        try {
          const response = await fetch(url, { method });
          const data = await response.json();
          return { status: response.status, data };
        } catch (error) {
          return { status: 500, data: { error: error.message } };
        }
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },

  {
    name: 'Database',
    type: 'Database',
    category: 'Actions',
    version: '1.0.0',
    description: 'Execute database queries',
    icon: '🗃️',
    color: '#2196F3',
    tags: ['database', 'sql', 'query'],
    isStartNode: false,
    isEndNode: false,
    fields: [
      {
        key: 'connectionString',
        label: 'Connection String',
        type: 'password',
        required: true,
        placeholder: 'postgresql://user:pass@host/db',
        description: 'Database connection string',
        order: 0
      },
      {
        key: 'query',
        label: 'SQL Query',
        type: 'textarea',
        required: true,
        placeholder: 'SELECT * FROM users WHERE active = true',
        description: 'SQL query to execute',
        order: 1
      }
    ],
    outputs: [
      {
        key: 'rows',
        label: 'Result Rows',
        type: 'array'
      },
      {
        key: 'rowCount',
        label: 'Row Count',
        type: 'number'
      }
    ],
    examples: [
      {
        name: 'Select Users',
        description: 'Fetch active users',
        config: { query: 'SELECT * FROM users WHERE active = true' }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        // Database query implementation (demo)
        return {
          rows: [{ id: 1, name: 'Sample Row' }],
          rowCount: 1
        };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },

  {
    name: 'Email',
    type: 'Email',
    category: 'Actions',
    version: '1.0.0',
    description: 'Send emails',
    icon: '📧',
    color: '#EA4335',
    tags: ['email', 'mail', 'notification'],
    isStartNode: false,
    isEndNode: false,
    fields: [
      {
        key: 'to',
        label: 'To',
        type: 'email',
        required: true,
        placeholder: 'recipient@example.com',
        description: 'Recipient email address',
        order: 0
      },
      {
        key: 'subject',
        label: 'Subject',
        type: 'text',
        required: true,
        placeholder: 'Email subject',
        order: 1
      },
      {
        key: 'body',
        label: 'Body',
        type: 'textarea',
        required: true,
        placeholder: 'Email content...',
        description: 'Email body content',
        order: 2
      }
    ],
    outputs: [
      {
        key: 'messageId',
        label: 'Message ID',
        type: 'string'
      },
      {
        key: 'success',
        label: 'Success',
        type: 'boolean'
      }
    ],
    examples: [
      {
        name: 'Simple Email',
        description: 'Send notification email',
        config: {
          to: 'user@example.com',
          subject: 'Workflow Complete',
          body: 'Your workflow finished successfully!'
        }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        return {
          messageId: 'msg_' + Date.now(),
          success: true
        };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },

  {
    name: 'Slack',
    type: 'Slack',
    category: 'Actions',
    version: '1.0.0',
    description: 'Send Slack messages',
    icon: '💬',
    color: '#4A154B',
    tags: ['slack', 'messaging', 'notification'],
    isStartNode: false,
    isEndNode: false,
    fields: [
      {
        key: 'webhook',
        label: 'Webhook URL',
        type: 'url',
        required: true,
        placeholder: 'https://hooks.slack.com/services/...',
        description: 'Slack webhook URL',
        order: 0
      },
      {
        key: 'channel',
        label: 'Channel',
        type: 'text',
        required: false,
        placeholder: '#general',
        defaultValue: '#general',
        order: 1
      },
      {
        key: 'message',
        label: 'Message',
        type: 'textarea',
        required: true,
        placeholder: 'Your message...',
        order: 2
      }
    ],
    outputs: [
      {
        key: 'success',
        label: 'Success',
        type: 'boolean'
      }
    ],
    examples: [
      {
        name: 'Channel Alert',
        description: 'Send alert to Slack channel',
        config: {
          channel: '#alerts',
          message: 'Workflow completed successfully!'
        }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        return { success: true };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },

  // ============ LOGIC ============
  {
    name: 'If',
    type: 'If',
    category: 'Logic',
    version: '1.0.0',
    description: 'Conditional branching logic',
    icon: '❓',
    color: '#FF5722',
    tags: ['logic', 'condition', 'branch'],
    isStartNode: false,
    isEndNode: false,
    fields: [
      {
        key: 'condition',
        label: 'Condition',
        type: 'text',
        required: true,
        placeholder: 'value > 10',
        description: 'JavaScript condition expression',
        order: 0
      },
      {
        key: 'value',
        label: 'Value to Test',
        type: 'text',
        required: true,
        placeholder: '{{previousNode.output}}',
        order: 1
      }
    ],
    outputs: [
      {
        key: 'true',
        label: 'True Branch',
        type: 'any'
      },
      {
        key: 'false',
        label: 'False Branch',
        type: 'any'
      }
    ],
    examples: [
      {
        name: 'Number Check',
        description: 'Check if number is greater than 10',
        config: { condition: 'value > 10', value: '15' }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        const { condition, value } = inputs;
        let result = false;
        try {
          result = eval(condition.replace('value', JSON.stringify(value)));
        } catch (e) {
          console.error('Condition evaluation error:', e);
        }
        return {
          true: result ? value : null,
          false: !result ? value : null
        };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },

  {
    name: 'Switch',
    type: 'Switch',
    category: 'Logic',
    version: '1.0.0',
    description: 'Multi-way branching based on value',
    icon: '🔄',
    color: '#FF5722',
    tags: ['logic', 'switch', 'branch'],
    isStartNode: false,
    isEndNode: false,
    fields: [
      {
        key: 'value',
        label: 'Value to Switch',
        type: 'text',
        required: true,
        placeholder: '{{previousNode.status}}',
        order: 0
      },
      {
        key: 'cases',
        label: 'Cases (JSON)',
        type: 'json',
        required: true,
        placeholder: '{"success": "output1", "error": "output2"}',
        description: 'Map of cases to outputs',
        order: 1
      }
    ],
    outputs: [
      {
        key: 'output',
        label: 'Matched Output',
        type: 'any'
      }
    ],
    examples: [
      {
        name: 'Status Switch',
        description: 'Route based on status',
        config: {
          value: 'success',
          cases: '{"success": "continue", "error": "stop"}'
        }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        const { value, cases } = inputs;
        const casesObj = JSON.parse(cases || '{}');
        const matchedCase = casesObj[value] || casesObj.default;
        return { output: matchedCase };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },

  {
    name: 'Loop',
    type: 'Loop',
    category: 'Logic',
    version: '1.0.0',
    description: 'Iterate over arrays or repeat actions',
    icon: '🔁',
    color: '#FF5722',
    tags: ['logic', 'loop', 'iteration'],
    isStartNode: false,
    isEndNode: false,
    fields: [
      {
        key: 'items',
        label: 'Items to Loop',
        type: 'json',
        required: true,
        placeholder: '[1, 2, 3]',
        description: 'Array to iterate over',
        order: 0
      }
    ],
    outputs: [
      {
        key: 'results',
        label: 'Loop Results',
        type: 'array'
      }
    ],
    examples: [
      {
        name: 'Process Array',
        description: 'Process list of items',
        config: { items: '[1, 2, 3, 4, 5]' }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        const { items } = inputs;
        const itemsArray = typeof items === 'string' ? JSON.parse(items) : items;
        return { results: itemsArray };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },

  {
    name: 'Merge',
    type: 'Merge',
    category: 'Logic',
    version: '1.0.0',
    description: 'Merge multiple inputs into one',
    icon: '🔀',
    color: '#FF5722',
    tags: ['logic', 'merge', 'combine'],
    isStartNode: false,
    isEndNode: false,
    fields: [
      {
        key: 'mergeType',
        label: 'Merge Type',
        type: 'select',
        required: true,
        defaultValue: 'combine',
        options: [
          { label: 'Combine Objects', value: 'combine' },
          { label: 'Concatenate Arrays', value: 'concat' }
        ],
        order: 0
      }
    ],
    outputs: [
      {
        key: 'merged',
        label: 'Merged Result',
        type: 'any'
      }
    ],
    examples: [
      {
        name: 'Combine Data',
        description: 'Merge multiple data sources',
        config: { mergeType: 'combine' }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        const { mergeType, ...allInputs } = inputs;
        let merged;
        switch(mergeType) {
          case 'combine':
            merged = { ...allInputs };
            break;
          case 'concat':
            merged = Object.values(allInputs).flat();
            break;
          default:
            merged = allInputs;
        }
        return { merged };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },

  {
    name: 'Delay',
    type: 'Delay',
    category: 'Logic',
    version: '1.0.0',
    description: 'Add a delay to workflow execution',
    icon: '⏱️',
    color: '#FF5722',
    tags: ['logic', 'delay', 'wait'],
    isStartNode: false,
    isEndNode: false,
    fields: [
      {
        key: 'duration',
        label: 'Duration (ms)',
        type: 'number',
        required: true,
        defaultValue: 1000,
        validation: {
          min: 0,
          max: 60000
        },
        description: 'Delay in milliseconds',
        order: 0
      }
    ],
    outputs: [
      {
        key: 'delayed',
        label: 'Delayed Output',
        type: 'any'
      }
    ],
    examples: [
      {
        name: '1 Second Delay',
        description: 'Wait for 1 second',
        config: { duration: 1000 }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        const { duration, ...data } = inputs;
        await new Promise(resolve => setTimeout(resolve, duration || 1000));
        return { delayed: data };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },

  // ============ AI/ML ============
  {
    name: 'OpenAI',
    type: 'OpenAI',
    category: 'AI/ML',
    version: '1.0.0',
    description: 'Generate text with OpenAI GPT',
    icon: '🤖',
    color: '#10A37F',
    tags: ['ai', 'openai', 'gpt', 'llm'],
    isStartNode: false,
    isEndNode: false,
    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-...',
        description: 'OpenAI API key',
        order: 0
      },
      {
        key: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Generate a summary of...',
        description: 'Text prompt for GPT',
        order: 1
      },
      {
        key: 'model',
        label: 'Model',
        type: 'select',
        required: true,
        defaultValue: 'gpt-3.5-turbo',
        options: [
          { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
          { label: 'GPT-4', value: 'gpt-4' }
        ],
        order: 2
      }
    ],
    outputs: [
      {
        key: 'text',
        label: 'Generated Text',
        type: 'string'
      },
      {
        key: 'usage',
        label: 'Token Usage',
        type: 'object'
      }
    ],
    examples: [
      {
        name: 'Text Summarization',
        description: 'Summarize text content',
        config: {
          prompt: 'Summarize this text in 2-3 sentences',
          model: 'gpt-3.5-turbo'
        }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        return {
          text: 'This is a sample AI-generated response.',
          usage: { prompt_tokens: 10, completion_tokens: 15, total_tokens: 25 }
        };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },

  {
    name: 'Text Analysis',
    type: 'Text Analysis',
    category: 'AI/ML',
    version: '1.0.0',
    description: 'Analyze text for sentiment, entities, etc',
    icon: '📊',
    color: '#9C27B0',
    tags: ['ai', 'nlp', 'analysis'],
    isStartNode: false,
    isEndNode: false,
    fields: [
      {
        key: 'text',
        label: 'Text to Analyze',
        type: 'textarea',
        required: true,
        placeholder: 'Enter text to analyze...',
        order: 0
      },
      {
        key: 'analysisType',
        label: 'Analysis Type',
        type: 'select',
        required: true,
        defaultValue: 'sentiment',
        options: [
          { label: 'Sentiment Analysis', value: 'sentiment' },
          { label: 'Entity Extraction', value: 'entities' },
          { label: 'Keyword Extraction', value: 'keywords' }
        ],
        order: 1
      }
    ],
    outputs: [
      {
        key: 'result',
        label: 'Analysis Result',
        type: 'object'
      }
    ],
    examples: [
      {
        name: 'Sentiment Check',
        description: 'Analyze text sentiment',
        config: {
          text: 'This is a great product!',
          analysisType: 'sentiment'
        }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        return {
          result: {
            sentiment: 'positive',
            score: 0.8,
            confidence: 0.95
          }
        };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },

  {
    name: 'Image Processing',
    type: 'Image Processing',
    category: 'AI/ML',
    version: '1.0.0',
    description: 'Process and analyze images',
    icon: '🖼️',
    color: '#9C27B0',
    tags: ['ai', 'image', 'vision'],
    isStartNode: false,
    isEndNode: false,
    fields: [
      {
        key: 'imageUrl',
        label: 'Image URL',
        type: 'url',
        required: true,
        placeholder: 'https://example.com/image.jpg',
        order: 0
      },
      {
        key: 'operation',
        label: 'Operation',
        type: 'select',
        required: true,
        defaultValue: 'analyze',
        options: [
          { label: 'Analyze Content', value: 'analyze' },
          { label: 'Extract Text (OCR)', value: 'ocr' }
        ],
        order: 1
      }
    ],
    outputs: [
      {
        key: 'result',
        label: 'Processing Result',
        type: 'object'
      }
    ],
    examples: [
      {
        name: 'Image Analysis',
        description: 'Analyze image content',
        config: {
          imageUrl: 'https://example.com/image.jpg',
          operation: 'analyze'
        }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        return {
          result: {
            description: 'Image contains objects and scenery',
            tags: ['outdoor', 'nature'],
            confidence: 0.89
          }
        };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },

  {
    name: 'Data Transformation',
    type: 'Data Transformation',
    category: 'AI/ML',
    version: '1.0.0',
    description: 'Transform data using AI/ML models',
    icon: '🔄',
    color: '#9C27B0',
    tags: ['ai', 'transform', 'data'],
    isStartNode: false,
    isEndNode: false,
    fields: [
      {
        key: 'data',
        label: 'Input Data',
        type: 'json',
        required: true,
        placeholder: '{"key": "value"}',
        order: 0
      },
      {
        key: 'transformation',
        label: 'Transformation',
        type: 'select',
        required: true,
        defaultValue: 'normalize',
        options: [
          { label: 'Normalize', value: 'normalize' },
          { label: 'Aggregate', value: 'aggregate' }
        ],
        order: 1
      }
    ],
    outputs: [
      {
        key: 'transformed',
        label: 'Transformed Data',
        type: 'object'
      }
    ],
    examples: [
      {
        name: 'Normalize Data',
        description: 'Normalize array values',
        config: {
          data: '[1, 2, 3, 4, 5]',
          transformation: 'normalize'
        }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        return {
          transformed: { normalized: true, processed: Date.now() }
        };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },

  // ============ DATA ============
  {
    name: 'JSON Parse',
    type: 'JSON Parse',
    category: 'Data',
    version: '1.0.0',
    description: 'Parse JSON strings to objects',
    icon: '{}',
    color: '#FFC107',
    tags: ['data', 'json', 'parse'],
    isStartNode: false,
    isEndNode: false,
    fields: [
      {
        key: 'jsonString',
        label: 'JSON String',
        type: 'textarea',
        required: true,
        placeholder: '{"key": "value"}',
        description: 'JSON string to parse',
        order: 0
      }
    ],
    outputs: [
      {
        key: 'parsed',
        label: 'Parsed Object',
        type: 'object'
      }
    ],
    examples: [
      {
        name: 'Parse JSON',
        description: 'Convert JSON string to object',
        config: { jsonString: '{"name": "John", "age": 30}' }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        const { jsonString } = inputs;
        try {
          const parsed = JSON.parse(jsonString);
          return { parsed };
        } catch (error) {
          return { parsed: null, error: error.message };
        }
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },

  {
    name: 'XML Parse',
    type: 'XML Parse',
    category: 'Data',
    version: '1.0.0',
    description: 'Parse XML strings to objects',
    icon: '</>',
    color: '#FFC107',
    tags: ['data', 'xml', 'parse'],
    isStartNode: false,
    isEndNode: false,
    fields: [
      {
        key: 'xmlString',
        label: 'XML String',
        type: 'textarea',
        required: true,
        placeholder: '<root><item>value</item></root>',
        description: 'XML string to parse',
        order: 0
      }
    ],
    outputs: [
      {
        key: 'parsed',
        label: 'Parsed Object',
        type: 'object'
      }
    ],
    examples: [
      {
        name: 'Parse XML',
        description: 'Convert XML to object',
        config: { xmlString: '<root><name>John</name></root>' }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        const { xmlString } = inputs;
        // Simple XML parsing (would use proper parser in production)
        const parsed = { root: xmlString.replace(/<[^>]+>/g, '') };
        return { parsed };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },

  {
    name: 'CSV Parse',
    type: 'CSV Parse',
    category: 'Data',
    version: '1.0.0',
    description: 'Parse CSV data to arrays',
    icon: '📊',
    color: '#FFC107',
    tags: ['data', 'csv', 'parse'],
    isStartNode: false,
    isEndNode: false,
    fields: [
      {
        key: 'csvString',
        label: 'CSV String',
        type: 'textarea',
        required: true,
        placeholder: 'name,age\nJohn,30\nJane,25',
        description: 'CSV string to parse',
        order: 0
      },
      {
        key: 'hasHeaders',
        label: 'Has Headers',
        type: 'boolean',
        required: false,
        defaultValue: true,
        description: 'First row contains headers',
        order: 1
      }
    ],
    outputs: [
      {
        key: 'parsed',
        label: 'Parsed Data',
        type: 'array'
      }
    ],
    examples: [
      {
        name: 'Parse CSV',
        description: 'Convert CSV to array',
        config: {
          csvString: 'name,age\nJohn,30\nJane,25',
          hasHeaders: true
        }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        const { csvString, hasHeaders } = inputs;
        const lines = csvString.split('\\n').filter(line => line.trim());
        const parsed = [];
        
        if (lines.length > 0) {
          const headers = hasHeaders ? lines[0].split(',').map(h => h.trim()) : null;
          const dataLines = hasHeaders ? lines.slice(1) : lines;
          
          for (const line of dataLines) {
            const values = line.split(',').map(v => v.trim());
            if (headers) {
              const row = {};
              headers.forEach((header, i) => {
                row[header] = values[i];
              });
              parsed.push(row);
            } else {
              parsed.push(values);
            }
          }
        }
        return { parsed };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },

  {
    name: 'Data Filter',
    type: 'Data Filter',
    category: 'Data',
    version: '1.0.0',
    description: 'Filter data based on conditions',
    icon: '🔍',
    color: '#FFC107',
    tags: ['data', 'filter', 'query'],
    isStartNode: false,
    isEndNode: false,
    fields: [
      {
        key: 'data',
        label: 'Input Data',
        type: 'json',
        required: true,
        placeholder: '[{"name": "John", "age": 30}]',
        description: 'Array of data to filter',
        order: 0
      },
      {
        key: 'field',
        label: 'Field to Filter',
        type: 'text',
        required: true,
        placeholder: 'age',
        order: 1
      },
      {
        key: 'operator',
        label: 'Operator',
        type: 'select',
        required: true,
        defaultValue: 'equals',
        options: [
          { label: 'Equals', value: 'equals' },
          { label: 'Greater Than', value: 'gt' },
          { label: 'Less Than', value: 'lt' },
          { label: 'Contains', value: 'contains' }
        ],
        order: 2
      },
      {
        key: 'value',
        label: 'Filter Value',
        type: 'text',
        required: true,
        placeholder: '30',
        order: 3
      }
    ],
    outputs: [
      {
        key: 'filtered',
        label: 'Filtered Data',
        type: 'array'
      }
    ],
    examples: [
      {
        name: 'Filter by Age',
        description: 'Filter users older than 25',
        config: {
          data: '[{"name": "John", "age": 30}, {"name": "Jane", "age": 20}]',
          field: 'age',
          operator: 'gt',
          value: '25'
        }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        const { data, field, operator, value } = inputs;
        const dataArray = typeof data === 'string' ? JSON.parse(data) : data;
        
        const filtered = dataArray.filter(item => {
          const itemValue = item[field];
          switch(operator) {
            case 'equals':
              return itemValue == value;
            case 'gt':
              return Number(itemValue) > Number(value);
            case 'lt':
              return Number(itemValue) < Number(value);
            case 'contains':
              return String(itemValue).includes(value);
            default:
              return true;
          }
        });
        return { filtered };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  }
];

// Function to seed all nodes
export async function seedAllNodes(): Promise<void> {
  console.log('🌱 Starting node seeding process...');
  
  let created = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const nodeData of seedNodes) {
    try {
      // Check if node already exists
      const existing = await nodeDefinitionsService.getByType(nodeData.type);
      
      if (existing.success) {
        console.log(`⏭️  Skipping ${nodeData.name} - already exists`);
        skipped++;
        continue;
      }
      
      // Create the node (service handles adding id, createdAt, updatedAt)
      const result = await nodeDefinitionsService.create(nodeData as any);
      
      if (result.success) {
        console.log(`✅ Created ${nodeData.name}`);
        created++;
      } else {
        console.error(`❌ Failed to create ${nodeData.name}:`, result.error);
        errors++;
      }
    } catch (error) {
      console.error(`❌ Error creating ${nodeData.name}:`, error);
      errors++;
    }
  }
  
  console.log(`\n🎉 Seeding complete!`);
  console.log(`   Created: ${created} nodes`);
  console.log(`   Skipped: ${skipped} nodes`);
  console.log(`   Errors: ${errors} nodes`);
  console.log(`   Total: ${created + skipped + errors} nodes processed`);
}