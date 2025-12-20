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
  },
  
  // ============ NEWLY ADDED ACTION NODES ============
  {
    name: 'Logger',
    type: 'Logger',
    category: 'Actions',
    version: '1.0.0',
    description: 'Outputs input data to logs for debugging and monitoring',
    icon: '📝',
    color: '#4CAF50',
    tags: ['logging', 'debugging', 'monitoring'],
    trigger: null,
    isStartNode: false,
    isEndNode: false,
    fields: [
      {
        key: 'logLevel',
        label: 'Log Level',
        type: 'select',
        description: 'Severity level for the log entry',
        required: false,
        defaultValue: 'info',
        options: [
          { label: 'Debug', value: 'debug' },
          { label: 'Info', value: 'info' },
          { label: 'Warning', value: 'warning' },
          { label: 'Error', value: 'error' }
        ]
      },
      {
        key: 'message',
        label: 'Log Message',
        type: 'string',
        description: 'Custom message to include in the log',
        required: false,
        defaultValue: 'Workflow node execution'
      }
    ],
    inputs: [
      {
        key: 'data',
        label: 'Input Data',
        type: 'any',
        description: 'Data to be logged',
        required: false
      }
    ],
    outputs: [
      {
        key: 'logged',
        label: 'Logged',
        type: 'boolean',
        description: 'Indicates if data was logged successfully',
        example: true
      },
      {
        key: 'logLevel',
        label: 'Log Level',
        type: 'string',
        description: 'The log level used',
        example: 'info'
      },
      {
        key: 'message',
        label: 'Message',
        type: 'string',
        description: 'The log message',
        example: 'Workflow node execution'
      }
    ],
    examples: [
      {
        name: 'Basic Logging',
        description: 'Log workflow data with default settings',
        config: {},
        expectedOutput: { logged: true, logLevel: 'info', message: 'Workflow node execution' }
      },
      {
        name: 'Error Logging',
        description: 'Log workflow data as an error',
        config: { logLevel: 'error', message: 'Critical workflow error occurred' },
        expectedOutput: { logged: true, logLevel: 'error', message: 'Critical workflow error occurred' }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        // Logger node implementation
        const logLevel = config.logLevel || 'info';
        const message = config.message || 'Workflow node execution';
        
        // Log data based on level
        switch(logLevel) {
          case 'debug':
            console.debug(message, input);
            break;
          case 'warning':
            console.warn(message, input);
            break;
          case 'error':
            console.error(message, input);
            break;
          default:
            console.log(message, input);
        }
        
        return {
          logged: true,
          logLevel: logLevel,
          message: message,
          input: input
        };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },
  {
    name: 'Variable Setter',
    type: 'Variable Setter',
    category: 'Actions',
    version: '1.0.0',
    description: 'Sets or updates workflow variables',
    icon: ':variables:',
    color: '#2196F3',
    tags: ['variables', 'data', 'state'],
    trigger: null,
    isStartNode: false,
    isEndNode: false,
    fields: [
      {
        key: 'variableName',
        label: 'Variable Name',
        type: 'string',
        description: 'Name of the variable to set',
        required: true
      },
      {
        key: 'valueSource',
        label: 'Value Source',
        type: 'select',
        description: 'Where to get the value from',
        required: true,
        defaultValue: 'config',
        options: [
          { label: 'From Configuration', value: 'config' },
          { label: 'From Input Data', value: 'input' }
        ]
      },
      {
        key: 'variableValue',
        label: 'Variable Value',
        type: 'string',
        description: 'Value to set (used when Value Source is Configuration)',
        required: false
      }
    ],
    inputs: [
      {
        key: 'data',
        label: 'Input Data',
        type: 'any',
        description: 'Data to use as variable value (when Value Source is Input Data)',
        required: false
      }
    ],
    outputs: [
      {
        key: 'variableSet',
        label: 'Variable Set',
        type: 'boolean',
        description: 'Indicates if variable was set successfully',
        example: true
      },
      {
        key: 'variableName',
        label: 'Variable Name',
        type: 'string',
        description: 'Name of the variable that was set',
        example: 'userId'
      },
      {
        key: 'variableValue',
        label: 'Variable Value',
        type: 'any',
        description: 'The value that was set',
        example: '12345'
      }
    ],
    examples: [
      {
        name: 'Set Static Variable',
        description: 'Set a workflow variable to a static value',
        config: { variableName: 'status', valueSource: 'config', variableValue: 'processing' },
        expectedOutput: { variableSet: true, variableName: 'status', variableValue: 'processing' }
      },
      {
        name: 'Set Variable from Input',
        description: 'Set a workflow variable from input data',
        config: { variableName: 'userId', valueSource: 'input' },
        expectedOutput: { variableSet: true, variableName: 'userId', variableValue: 'input_data' }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        // Variable Setter node implementation
        const variableName = config.variableName;
        const valueSource = config.valueSource || 'config';
        
        let value;
        if (valueSource === 'input') {
          value = input;
        } else {
          value = config.variableValue;
        }
        
        // In a real implementation, this would set the variable in the workflow context
        console.log(\`Setting variable '\${variableName}' to: \${JSON.stringify(value)}\`);
        
        return {
          variableSet: true,
          variableName: variableName,
          variableValue: value,
          valueSource: valueSource
        };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },
  
  // ============ NEWLY ADDED LOGIC NODES ============
  {
    name: 'Boolean',
    type: 'Boolean',
    category: 'Logic',
    version: '1.0.0',
    description: 'Evaluates conditions and returns true/false values',
    icon: '❓',
    color: '#9C27B0',
    tags: ['condition', 'comparison', 'logic'],
    trigger: null,
    isStartNode: false,
    isEndNode: false,
    fields: [
      {
        key: 'leftValue',
        label: 'Left Value',
        type: 'string',
        description: 'Left side of the comparison',
        required: true
      },
      {
        key: 'operator',
        label: 'Operator',
        type: 'select',
        description: 'Comparison operator',
        required: true,
        options: [
          { label: 'Equals', value: '==' },
          { label: 'Not Equals', value: '!=' },
          { label: 'Greater Than', value: '>' },
          { label: 'Less Than', value: '<' },
          { label: 'Greater Than or Equal', value: '>=' },
          { label: 'Less Than or Equal', value: '<=' },
          { label: 'In', value: 'in' },
          { label: 'Not In', value: 'not_in' }
        ]
      },
      {
        key: 'rightValue',
        label: 'Right Value',
        type: 'string',
        description: 'Right side of the comparison',
        required: true
      }
    ],
    inputs: [
      {
        key: 'data',
        label: 'Input Data',
        type: 'any',
        description: 'Data for variable interpolation',
        required: false
      }
    ],
    outputs: [
      {
        key: 'result',
        label: 'Result',
        type: 'boolean',
        description: 'The result of the boolean evaluation',
        example: true
      },
      {
        key: 'leftValue',
        label: 'Left Value',
        type: 'any',
        description: 'The left value used in comparison',
        example: 'value1'
      },
      {
        key: 'operator',
        label: 'Operator',
        type: 'string',
        description: 'The operator used',
        example: '=='
      },
      {
        key: 'rightValue',
        label: 'Right Value',
        type: 'any',
        description: 'The right value used in comparison',
        example: 'value2'
      }
    ],
    examples: [
      {
        name: 'Simple Equality Check',
        description: 'Check if two values are equal',
        config: { leftValue: '{{input.status}}', operator: '==', rightValue: 'active' },
        expectedOutput: { result: true, leftValue: 'active', operator: '==', rightValue: 'active' }
      },
      {
        name: 'Numeric Comparison',
        description: 'Check if a number is greater than another',
        config: { leftValue: '{{input.amount}}', operator: '>', rightValue: '100' },
        expectedOutput: { result: false, leftValue: 50, operator: '>', rightValue: 100 }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        // Boolean node implementation
        const leftValue = config.leftValue;
        const operator = config.operator;
        const rightValue = config.rightValue;
        
        // Simple evaluation function
        function evaluate(left, op, right) {
          switch(op) {
            case '==': return left == right;
            case '!=': return left != right;
            case '>': return left > right;
            case '<': return left < right;
            case '>=': return left >= right;
            case '<=': return left <= right;
            case 'in': return Array.isArray(right) ? right.includes(left) : (typeof right === 'string' ? right.includes(left) : false);
            case 'not_in': return Array.isArray(right) ? !right.includes(left) : (typeof right === 'string' ? !right.includes(left) : true);
            default: throw new Error(\`Unsupported operator: \${op}\`);
          }
        }
        
        const result = evaluate(leftValue, operator, rightValue);
        
        return {
          result: result,
          leftValue: leftValue,
          operator: operator,
          rightValue: rightValue
        };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },
  {
    name: 'Counter',
    type: 'Counter',
    category: 'Logic',
    version: '1.0.0',
    description: 'Increments or decrements a numerical counter',
    icon: '🔢',
    color: '#FF9800',
    tags: ['counter', 'increment', 'decrement'],
    trigger: null,
    isStartNode: false,
    isEndNode: false,
    fields: [
      {
        key: 'counterName',
        label: 'Counter Name',
        type: 'string',
        description: 'Name of the counter to modify',
        required: true
      },
      {
        key: 'operation',
        label: 'Operation',
        type: 'select',
        description: 'Whether to increment or decrement',
        required: true,
        defaultValue: 'increment',
        options: [
          { label: 'Increment', value: 'increment' },
          { label: 'Decrement', value: 'decrement' }
        ]
      },
      {
        key: 'step',
        label: 'Step',
        type: 'number',
        description: 'Amount to increment or decrement by',
        required: false,
        defaultValue: 1
      }
    ],
    inputs: [
      {
        key: 'data',
        label: 'Input Data',
        type: 'any',
        description: 'Data for variable interpolation',
        required: false
      }
    ],
    outputs: [
      {
        key: 'counterName',
        label: 'Counter Name',
        type: 'string',
        description: 'Name of the counter that was modified',
        example: 'processCount'
      },
      {
        key: 'operation',
        label: 'Operation',
        type: 'string',
        description: 'The operation performed',
        example: 'increment'
      },
      {
        key: 'step',
        label: 'Step',
        type: 'number',
        description: 'The step size used',
        example: 1
      }
    ],
    examples: [
      {
        name: 'Increment Process Counter',
        description: 'Increment a process counter by 1',
        config: { counterName: 'processCount', operation: 'increment' },
        expectedOutput: { counterName: 'processCount', operation: 'increment', step: 1 }
      },
      {
        name: 'Decrement Retry Counter',
        description: 'Decrement a retry counter by 2',
        config: { counterName: 'retryCount', operation: 'decrement', step: 2 },
        expectedOutput: { counterName: 'retryCount', operation: 'decrement', step: 2 }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        // Counter node implementation
        const counterName = config.counterName;
        const operation = config.operation || 'increment';
        const step = config.step || 1;
        
        // In a real implementation, this would access shared state
        console.log(\`\${operation.charAt(0).toUpperCase() + operation.slice(1)} counter '\${counterName}' by \${step}\`);
        
        return {
          counterName: counterName,
          operation: operation,
          step: step
        };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },
  {
    name: 'Timer',
    type: 'Timer',
    category: 'Logic',
    version: '1.0.0',
    description: 'Measures execution time between nodes or workflow segments',
    icon: '⏱️',
    color: '#00BCD4',
    tags: ['timer', 'performance', 'benchmark'],
    trigger: null,
    isStartNode: false,
    isEndNode: false,
    fields: [
      {
        key: 'timerName',
        label: 'Timer Name',
        type: 'string',
        description: 'Name of the timer to use',
        required: true
      },
      {
        key: 'action',
        label: 'Action',
        type: 'select',
        description: 'Timer action to perform',
        required: true,
        defaultValue: 'start',
        options: [
          { label: 'Start', value: 'start' },
          { label: 'Stop', value: 'stop' },
          { label: 'Lap', value: 'lap' }
        ]
      }
    ],
    inputs: [
      {
        key: 'data',
        label: 'Input Data',
        type: 'any',
        description: 'Data for variable interpolation',
        required: false
      }
    ],
    outputs: [
      {
        key: 'timerName',
        label: 'Timer Name',
        type: 'string',
        description: 'Name of the timer used',
        example: 'workflowTimer'
      },
      {
        key: 'action',
        label: 'Action',
        type: 'string',
        description: 'The action performed',
        example: 'start'
      },
      {
        key: 'timestamp',
        label: 'Timestamp',
        type: 'string',
        description: 'Timestamp when action was performed',
        example: '2024-01-01T00:00:00Z'
      }
    ],
    examples: [
      {
        name: 'Start Workflow Timer',
        description: 'Start timing a workflow segment',
        config: { timerName: 'workflowTimer', action: 'start' },
        expectedOutput: { timerName: 'workflowTimer', action: 'start', timestamp: '2024-01-01T00:00:00Z' }
      },
      {
        name: 'Stop Workflow Timer',
        description: 'Stop timing a workflow segment',
        config: { timerName: 'workflowTimer', action: 'stop' },
        expectedOutput: { timerName: 'workflowTimer', action: 'stop', timestamp: '2024-01-01T00:00:05Z' }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        // Timer node implementation
        const timerName = config.timerName;
        const action = config.action || 'start';
        const timestamp = new Date().toISOString();
        
        // In a real implementation, this would access shared timer state
        console.log(\`\${action.charAt(0).toUpperCase() + action.slice(1)} timer '\${timerName}' at \${timestamp}\`);
        
        return {
          timerName: timerName,
          action: action,
          timestamp: timestamp
        };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },
  
  // ============ NEWLY ADDED DATA NODES ============
  {
    name: 'String Manipulation',
    type: 'String Manipulation',
    category: 'Data',
    version: '1.0.0',
    description: 'Performs basic string operations like case conversion and formatting',
    icon: '🔤',
    color: '#E91E63',
    tags: ['string', 'text', 'formatting'],
    trigger: null,
    isStartNode: false,
    isEndNode: false,
    fields: [
      {
        key: 'inputField',
        label: 'Input Field',
        type: 'string',
        description: 'Field from input data to manipulate (leave empty for direct input)',
        required: false
      },
      {
        key: 'operation',
        label: 'Operation',
        type: 'select',
        description: 'String operation to perform',
        required: true,
        options: [
          { label: 'Uppercase', value: 'uppercase' },
          { label: 'Lowercase', value: 'lowercase' },
          { label: 'Trim', value: 'trim' },
          { label: 'Capitalize', value: 'capitalize' },
          { label: 'Reverse', value: 'reverse' }
        ]
      }
    ],
    inputs: [
      {
        key: 'data',
        label: 'Input Data',
        type: 'any',
        description: 'Data containing the string to manipulate',
        required: true
      }
    ],
    outputs: [
      {
        key: 'originalText',
        label: 'Original Text',
        type: 'string',
        description: 'The original text before manipulation',
        example: 'hello world'
      },
      {
        key: 'result',
        label: 'Result',
        type: 'string',
        description: 'The manipulated text',
        example: 'HELLO WORLD'
      },
      {
        key: 'operation',
        label: 'Operation',
        type: 'string',
        description: 'The operation performed',
        example: 'uppercase'
      }
    ],
    examples: [
      {
        name: 'Uppercase Text',
        description: 'Convert text to uppercase',
        config: { inputField: 'name', operation: 'uppercase' },
        expectedOutput: { originalText: 'john doe', result: 'JOHN DOE', operation: 'uppercase' }
      },
      {
        name: 'Trim Whitespace',
        description: 'Remove leading and trailing whitespace',
        config: { inputField: 'email', operation: 'trim' },
        expectedOutput: { originalText: '  user@example.com  ', result: 'user@example.com', operation: 'trim' }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        // String Manipulation node implementation
        const inputField = config.inputField;
        const operation = config.operation;
        
        // Extract the string to manipulate
        let text;
        if (inputField && typeof input === 'object' && input !== null) {
          text = input[inputField] || '';
        } else {
          text = typeof input === 'string' ? input : String(input);
        }
        
        // Perform operation
        let result;
        switch(operation) {
          case 'uppercase':
            result = text.toUpperCase();
            break;
          case 'lowercase':
            result = text.toLowerCase();
            break;
          case 'trim':
            result = text.trim();
            break;
          case 'capitalize':
            result = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
            break;
          case 'reverse':
            result = text.split('').reverse().join('');
            break;
          default:
            throw new Error(\`Unsupported operation: \${operation}\`);
        }
        
        return {
          originalText: text,
          result: result,
          operation: operation
        };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },
  {
    name: 'Number Formatter',
    type: 'Number Formatter',
    category: 'Data',
    version: '1.0.0',
    description: 'Formats numbers with specific decimal places and formatting',
    icon: '#️⃣',
    color: '#8BC34A',
    tags: ['number', 'format', 'currency'],
    trigger: null,
    isStartNode: false,
    isEndNode: false,
    fields: [
      {
        key: 'inputField',
        label: 'Input Field',
        type: 'string',
        description: 'Field from input data to format (leave empty for direct input)',
        required: false
      },
      {
        key: 'decimalPlaces',
        label: 'Decimal Places',
        type: 'number',
        description: 'Number of decimal places to show',
        required: false,
        defaultValue: 2
      },
      {
        key: 'thousandsSeparator',
        label: 'Thousands Separator',
        type: 'boolean',
        description: 'Add thousands separator (comma)',
        required: false,
        defaultValue: false
      },
      {
        key: 'prefix',
        label: 'Prefix',
        type: 'string',
        description: 'Text to add before the number (e.g., currency symbol)',
        required: false
      },
      {
        key: 'suffix',
        label: 'Suffix',
        type: 'string',
        description: 'Text to add after the number',
        required: false
      }
    ],
    inputs: [
      {
        key: 'data',
        label: 'Input Data',
        type: 'any',
        description: 'Data containing the number to format',
        required: true
      }
    ],
    outputs: [
      {
        key: 'originalValue',
        label: 'Original Value',
        type: 'number',
        description: 'The original number before formatting',
        example: 1234.567
      },
      {
        key: 'formattedValue',
        label: 'Formatted Value',
        type: 'string',
        description: 'The formatted number as a string',
        example: '$1,234.57'
      },
      {
        key: 'decimalPlaces',
        label: 'Decimal Places',
        type: 'number',
        description: 'Number of decimal places used',
        example: 2
      }
    ],
    examples: [
      {
        name: 'Currency Formatting',
        description: 'Format a number as currency',
        config: { inputField: 'amount', decimalPlaces: 2, thousandsSeparator: true, prefix: '$' },
        expectedOutput: { originalValue: 1234.567, formattedValue: '$1,234.57', decimalPlaces: 2 }
      },
      {
        name: 'Percentage Formatting',
        description: 'Format a number as percentage',
        config: { inputField: 'ratio', decimalPlaces: 1, suffix: '%' },
        expectedOutput: { originalValue: 0.875, formattedValue: '87.5%', decimalPlaces: 1 }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        // Number Formatter node implementation
        const inputField = config.inputField;
        const decimalPlaces = config.decimalPlaces || 2;
        const thousandsSeparator = config.thousandsSeparator || false;
        const prefix = config.prefix || '';
        const suffix = config.suffix || '';
        
        // Extract the number to format
        let value;
        if (inputField && typeof input === 'object' && input !== null) {
          value = input[inputField];
        } else {
          value = input;
        }
        
        // Convert to number if it's a string
        if (typeof value === 'string') {
          const parsed = parseFloat(value);
          if (isNaN(parsed)) {
            throw new Error(\`Cannot convert '\${value}' to a number\`);
          }
          value = parsed;
        }
        
        // Ensure it's a number
        if (typeof value !== 'number') {
          throw new Error(\`Value must be a number, got \${typeof value}\`);
        }
        
        // Format the number
        let formatted;
        if (thousandsSeparator) {
          formatted = value.toLocaleString(undefined, {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces
          });
        } else {
          formatted = value.toFixed(decimalPlaces);
        }
        
        const result = \`\${prefix}\${formatted}\${suffix}\`;
        
        return {
          originalValue: value,
          formattedValue: result,
          decimalPlaces: decimalPlaces,
          thousandsSeparator: thousandsSeparator,
          prefix: prefix,
          suffix: suffix
        };
      `
    },
    createdBy: 'system',
    isActive: true,
    isPublic: true
  },
  {
    name: 'Date Formatter',
    type: 'Date Formatter',
    category: 'Data',
    version: '1.0.0',
    description: 'Converts dates between different formats and timezones',
    icon: '📅',
    color: '#795548',
    tags: ['date', 'time', 'format'],
    trigger: null,
    isStartNode: false,
    isEndNode: false,
    fields: [
      {
        key: 'inputField',
        label: 'Input Field',
        type: 'string',
        description: 'Field from input data containing the date (leave empty for direct input)',
        required: false
      },
      {
        key: 'inputFormat',
        label: 'Input Format',
        type: 'select',
        description: 'Format of the input date',
        required: false,
        defaultValue: 'auto',
        options: [
          { label: 'Auto Detect', value: 'auto' },
          { label: 'ISO 8601', value: 'iso' },
          { label: 'Unix Timestamp', value: 'timestamp' }
        ]
      },
      {
        key: 'outputFormat',
        label: 'Output Format',
        type: 'select',
        description: 'Desired output format',
        required: false,
        defaultValue: 'YYYY-MM-DD HH:mm:ss',
        options: [
          { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
          { label: 'YYYY-MM-DD HH:mm:ss', value: 'YYYY-MM-DD HH:mm:ss' },
          { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
          { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
          { label: 'Full ISO String', value: 'iso' }
        ]
      }
    ],
    inputs: [
      {
        key: 'data',
        label: 'Input Data',
        type: 'any',
        description: 'Data containing the date to format',
        required: true
      }
    ],
    outputs: [
      {
        key: 'originalDate',
        label: 'Original Date',
        type: 'any',
        description: 'The original date value',
        example: '2024-01-01T12:00:00Z'
      },
      {
        key: 'formattedDate',
        label: 'Formatted Date',
        type: 'string',
        description: 'The formatted date as a string',
        example: '2024-01-01 12:00:00'
      },
      {
        key: 'inputFormat',
        label: 'Input Format',
        type: 'string',
        description: 'The input format used',
        example: 'auto'
      },
      {
        key: 'outputFormat',
        label: 'Output Format',
        type: 'string',
        description: 'The output format used',
        example: 'YYYY-MM-DD HH:mm:ss'
      }
    ],
    examples: [
      {
        name: 'Standard Date Format',
        description: 'Format a date in YYYY-MM-DD format',
        config: { inputField: 'createdAt', outputFormat: 'YYYY-MM-DD' },
        expectedOutput: { originalDate: '2024-01-01T12:00:00Z', formattedDate: '2024-01-01', inputFormat: 'auto', outputFormat: 'YYYY-MM-DD' }
      },
      {
        name: 'US Date Format',
        description: 'Format a date in MM/DD/YYYY format',
        config: { inputField: 'timestamp', outputFormat: 'MM/DD/YYYY' },
        expectedOutput: { originalDate: 1704110400000, formattedDate: '01/01/2024', inputFormat: 'auto', outputFormat: 'MM/DD/YYYY' }
      }
    ],
    implementation: {
      type: 'javascript',
      code: `
        // Date Formatter node implementation
        const inputField = config.inputField;
        const inputFormat = config.inputFormat || 'auto';
        const outputFormat = config.outputFormat || 'YYYY-MM-DD HH:mm:ss';
        
        // Extract the date to format
        let dateValue;
        if (inputField && typeof input === 'object' && input !== null) {
          dateValue = input[inputField];
        } else {
          dateValue = input;
        }
        
        // Parse the date
        let parsedDate;
        if (typeof dateValue === 'string') {
          if (inputFormat === 'auto') {
            // Try to parse automatically
            parsedDate = new Date(dateValue);
            if (isNaN(parsedDate.getTime())) {
              throw new Error(\`Failed to parse date: \${dateValue}\`);
            }
          } else {
            parsedDate = new Date(dateValue);
            if (isNaN(parsedDate.getTime())) {
              throw new Error(\`Failed to parse date with format \${inputFormat}: \${dateValue}\`);
            }
          }
        } else if (typeof dateValue === 'number') {
          // Assume it's a timestamp
          parsedDate = new Date(dateValue);
          if (isNaN(parsedDate.getTime())) {
            throw new Error(\`Invalid timestamp: \${dateValue}\`);
          }
        } else if (dateValue instanceof Date) {
          parsedDate = dateValue;
        } else {
          throw new Error(\`Unsupported date type: \${typeof dateValue}\`);
        }
        
        // Format the date
        let formattedDate;
        switch (outputFormat) {
          case 'YYYY-MM-DD':
            formattedDate = parsedDate.toISOString().split('T')[0];
            break;
          case 'YYYY-MM-DD HH:mm:ss':
            formattedDate = parsedDate.toISOString().replace('T', ' ').split('.')[0];
            break;
          case 'MM/DD/YYYY':
            formattedDate = \`\${(parsedDate.getMonth() + 1).toString().padStart(2, '0')}/\${parsedDate.getDate().toString().padStart(2, '0')}/\${parsedDate.getFullYear()}\`;
            break;
          case 'DD/MM/YYYY':
            formattedDate = \`\${parsedDate.getDate().toString().padStart(2, '0')}/\${(parsedDate.getMonth() + 1).toString().padStart(2, '0')}/\${parsedDate.getFullYear()}\`;
            break;
          default:
            // Fallback to ISO string
            formattedDate = parsedDate.toISOString();
        }
        
        return {
          originalDate: dateValue,
          formattedDate: formattedDate,
          inputFormat: inputFormat,
          outputFormat: outputFormat
        };
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