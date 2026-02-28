/**
 * Hardcoded Node Configuration Definitions
 * Maps node types to their configuration fields
 * Loads instantly without API calls
 * 
 * Architecture follows n8n's hybrid approach:
 * - Input fields: Configuration parameters
 * - Output fields: Data available to downstream nodes
 */

export type FieldValueType = 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'password' | 'email' | 'url';
export type OutputFieldType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date' | 'json';

export interface NodeField {
  name: string;
  label: string;
  type: FieldValueType;
  placeholder?: string;
  description?: string;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  group?: string;
  rows?: number;
}

export interface OutputField {
  name: string;
  path: string[];
  type: OutputFieldType;
  description: string;
  children?: OutputField[];
}

export interface NodeOutput {
  type: 'main' | 'error';
  displayName?: string;
  fields: OutputField[];
  dynamic?: boolean; // Indicates fields may vary at runtime
}

export interface NodeDefinition {
  type: string;
  name: string;
  description: string;
  category: string;
  fields: NodeField[];
  outputs?: Record<string, NodeOutput>;
}

export const NODE_DEFINITIONS: Record<string, NodeDefinition> = {
  // Triggers
  ManualTrigger: {
    type: 'ManualTrigger',
    name: 'Manual Trigger',
    description: 'Start workflow manually by clicking Run',
    category: 'Triggers',
    fields: [],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        fields: [
          {
            name: 'timestamp',
            path: ['timestamp'],
            type: 'date',
            description: 'Timestamp when the workflow was triggered',
          },
          {
            name: 'executionId',
            path: ['executionId'],
            type: 'string',
            description: 'Unique ID for this workflow execution',
          },
        ],
      },
    },
  },
  Scheduling: {
    type: 'Scheduling',
    name: 'Schedule',
    description: 'Start workflow at scheduled times',
    category: 'Triggers',
    fields: [
      {
        name: 'frequency',
        label: 'Frequency',
        type: 'select',
        description: 'How often to run this workflow',
        required: true,
        options: [
          { label: 'Every minute', value: '* * * * *' },
          { label: 'Every 5 minutes', value: '*/5 * * * *' },
          { label: 'Every 15 minutes', value: '*/15 * * * *' },
          { label: 'Every hour', value: '0 * * * *' },
          { label: 'Daily (9am)', value: '0 9 * * *' },
          { label: 'Daily (6pm)', value: '0 18 * * *' },
          { label: 'Weekly (Monday 9am)', value: '0 9 ? * MON' },
          { label: 'Monthly (1st at 9am)', value: '0 9 1 * *' },
        ],
        group: 'Schedule',
      },
      {
        name: 'timezone',
        label: 'Timezone',
        type: 'select',
        description: 'Timezone for scheduled execution',
        required: true,
        options: [
          { label: 'UTC', value: 'UTC' },
          { label: 'EST (Eastern)', value: 'America/New_York' },
          { label: 'CST (Central)', value: 'America/Chicago' },
          { label: 'MST (Mountain)', value: 'America/Denver' },
          { label: 'PST (Pacific)', value: 'America/Los_Angeles' },
          { label: 'GMT (London)', value: 'Europe/London' },
          { label: 'CET (Paris)', value: 'Europe/Paris' },
          { label: 'IST (India)', value: 'Asia/Kolkata' },
          { label: 'SGT (Singapore)', value: 'Asia/Singapore' },
          { label: 'JST (Tokyo)', value: 'Asia/Tokyo' },
          { label: 'AEST (Sydney)', value: 'Australia/Sydney' },
        ],
        group: 'Schedule',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        fields: [
          {
            name: 'timestamp',
            path: ['timestamp'],
            type: 'date',
            description: 'When the scheduled execution triggered',
          },
          {
            name: 'executionId',
            path: ['executionId'],
            type: 'string',
            description: 'Unique ID for this scheduled execution',
          },
          {
            name: 'frequency',
            path: ['frequency'],
            type: 'string',
            description: 'The cron expression used',
          },
        ],
      },
    },
  },
  Webhook: {
    type: 'Webhook',
    name: 'Webhook',
    description: 'Start workflow from external webhook',
    category: 'Triggers',
    fields: [
      {
        name: 'method',
        label: 'HTTP Method',
        type: 'select',
        description: 'Which HTTP methods to accept',
        required: true,
        options: [
          { label: 'POST', value: 'POST' },
          { label: 'GET', value: 'GET' },
          { label: 'PUT', value: 'PUT' },
          { label: 'PATCH', value: 'PATCH' },
          { label: 'DELETE', value: 'DELETE' },
        ],
        group: 'Settings',
      },
      {
        name: 'path',
        label: 'Path (optional)',
        type: 'text',
        placeholder: 'custom/webhook/path',
        description: 'Custom path for webhook URL',
        group: 'Settings',
      },
    ],
  },

  // Communication
  ChatInput: {
    type: 'ChatInput',
    name: 'Chat Input',
    description: 'User enters text message',
    category: 'Communication',
    fields: [
      {
        name: 'label',
        label: 'Input Label',
        type: 'text',
        placeholder: 'e.g., "Ask a question"',
        description: 'Display name for this input',
        required: true,
        group: 'General',
      },
      {
        name: 'placeholder',
        label: 'Placeholder Text',
        type: 'text',
        placeholder: 'e.g., "Type your message..."',
        description: 'Hint text shown to users',
        group: 'General',
      },
      {
        name: 'maxLength',
        label: 'Max Characters',
        type: 'number',
        placeholder: '4096',
        description: 'Maximum message length',
        validation: { min: 1, max: 10000 },
        group: 'Validation',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        fields: [
          {
            name: 'message',
            path: ['message'],
            type: 'string',
            description: 'The user input message text',
          },
          {
            name: 'user',
            path: ['user'],
            type: 'object',
            description: 'Information about the user who sent the message',
            children: [
              {
                name: 'id',
                path: ['user', 'id'],
                type: 'string',
                description: 'Unique user identifier',
              },
              {
                name: 'name',
                path: ['user', 'name'],
                type: 'string',
                description: 'User display name',
              },
              {
                name: 'email',
                path: ['user', 'email'],
                type: 'string',
                description: 'User email address',
              },
            ],
          },
          {
            name: 'timestamp',
            path: ['timestamp'],
            type: 'date',
            description: 'When the message was sent',
          },
          {
            name: 'metadata',
            path: ['metadata'],
            type: 'object',
            description: 'Additional contextual data',
          },
        ],
      },
    },
  },
  TelegramSend: {
    type: 'TelegramSend',
    name: 'Telegram Send',
    description: 'Send message to Telegram bot',
    category: 'Communication',
    fields: [
      {
        name: 'botToken',
        label: 'Bot Token',
        type: 'password',
        placeholder: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
        description: 'Get from @BotFather on Telegram',
        required: true,
        group: 'Authentication',
      },
      {
        name: 'chatId',
        label: 'Chat ID',
        type: 'text',
        placeholder: '-1001234567890 or 12345678',
        description: 'User ID, channel ID, or group ID',
        required: true,
        group: 'Target',
      },
      {
        name: 'message',
        label: 'Message',
        type: 'textarea',
        placeholder: 'Hello {{$node["chat_input_1"].message}}',
        description: 'Message to send (supports variables)',
        required: true,
        rows: 4,
        group: 'Content',
      },
      {
        name: 'parseMode',
        label: 'Parse Mode',
        type: 'select',
        description: 'Text formatting',
        options: [
          { label: 'HTML', value: 'HTML' },
          { label: 'Markdown', value: 'Markdown' },
          { label: 'MarkdownV2', value: 'MarkdownV2' },
        ],
        group: 'Formatting',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        fields: [
          {
            name: 'success',
            path: ['success'],
            type: 'boolean',
            description: 'Whether the message was sent successfully',
          },
          {
            name: 'messageId',
            path: ['messageId'],
            type: 'string',
            description: 'Unique Telegram message ID',
          },
          {
            name: 'chatId',
            path: ['chatId'],
            type: 'string',
            description: 'The chat ID where message was sent',
          },
          {
            name: 'timestamp',
            path: ['timestamp'],
            type: 'date',
            description: 'When the message was sent',
          },
          {
            name: 'response',
            path: ['response'],
            type: 'object',
            description: 'Full Telegram API response',
            children: [
              {
                name: 'ok',
                path: ['response', 'ok'],
                type: 'boolean',
                description: 'Telegram API success indicator',
              },
              {
                name: 'result',
                path: ['response', 'result'],
                type: 'object',
                description: 'Message details from Telegram',
              },
            ],
          },
        ],
      },
      error: {
        type: 'error',
        displayName: 'Error Output',
        fields: [
          {
            name: 'error',
            path: ['error'],
            type: 'string',
            description: 'Error message if sending failed',
          },
          {
            name: 'code',
            path: ['code'],
            type: 'string',
            description: 'Error code',
          },
        ],
      },
    },
  },

  // Communication (continued)
  EmailSend: {
    type: 'EmailSend',
    name: 'Email Send',
    description: 'Send email message',
    category: 'Communication',
    fields: [
      {
        name: 'to',
        label: 'To Email',
        type: 'email',
        placeholder: 'recipient@example.com',
        description: 'Recipient email address',
        required: true,
        group: 'Recipients',
      },
      {
        name: 'cc',
        label: 'CC (optional)',
        type: 'text',
        placeholder: 'cc1@example.com, cc2@example.com',
        description: 'CC email addresses (comma separated)',
        group: 'Recipients',
      },
      {
        name: 'subject',
        label: 'Subject',
        type: 'text',
        placeholder: 'Hello {{$node.user_1.name}}',
        description: 'Email subject (supports variables)',
        required: true,
        group: 'Content',
      },
      {
        name: 'body',
        label: 'Body',
        type: 'textarea',
        placeholder: 'Your message here...',
        description: 'Email body (supports HTML)',
        required: true,
        rows: 6,
        group: 'Content',
      },
      {
        name: 'provider',
        label: 'Email Provider',
        type: 'select',
        description: 'Email service to use',
        required: true,
        options: [
          { label: 'Gmail', value: 'gmail' },
          { label: 'SendGrid', value: 'sendgrid' },
          { label: 'Mailgun', value: 'mailgun' },
          { label: 'SMTP', value: 'smtp' },
        ],
        group: 'Settings',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        fields: [
          {
            name: 'success',
            path: ['success'],
            type: 'boolean',
            description: 'Whether email was sent successfully',
          },
          {
            name: 'messageId',
            path: ['messageId'],
            type: 'string',
            description: 'Unique message identifier from email service',
          },
          {
            name: 'sentTime',
            path: ['sentTime'],
            type: 'date',
            description: 'Timestamp when email was sent',
          },
          {
            name: 'recipient',
            path: ['recipient'],
            type: 'string',
            description: 'Email address that received the message',
          },
        ],
      },
      error: {
        type: 'error',
        displayName: 'Error Output',
        fields: [
          {
            name: 'error',
            path: ['error'],
            type: 'string',
            description: 'Error message if sending failed',
          },
        ],
      },
    },
  },
  SlackMessage: {
    type: 'SlackMessage',
    name: 'Slack Message',
    description: 'Send message to Slack channel',
    category: 'Communication',
    fields: [
      {
        name: 'webhookUrl',
        label: 'Webhook URL',
        type: 'password',
        placeholder: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX',
        description: 'Slack webhook URL',
        required: true,
        group: 'Authentication',
      },
      {
        name: 'channel',
        label: 'Channel',
        type: 'text',
        placeholder: '#general or @username',
        description: 'Channel or user to send to',
        required: true,
        group: 'Target',
      },
      {
        name: 'message',
        label: 'Message',
        type: 'textarea',
        placeholder: 'Hello {{$node.chat_1.message}}',
        description: 'Message text',
        required: true,
        rows: 4,
        group: 'Content',
      },
      {
        name: 'username',
        label: 'Bot Name (optional)',
        type: 'text',
        placeholder: 'MyBot',
        description: 'Display name for the bot',
        group: 'Settings',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        fields: [
          {
            name: 'success',
            path: ['success'],
            type: 'boolean',
            description: 'Whether message was sent successfully',
          },
          {
            name: 'messageId',
            path: ['messageId'],
            type: 'string',
            description: 'Slack message timestamp ID',
          },
          {
            name: 'channel',
            path: ['channel'],
            type: 'string',
            description: 'Channel/user message was sent to',
          },
          {
            name: 'timestamp',
            path: ['timestamp'],
            type: 'date',
            description: 'When message was posted',
          },
        ],
      },
      error: {
        type: 'error',
        displayName: 'Error Output',
        fields: [
          {
            name: 'error',
            path: ['error'],
            type: 'string',
            description: 'Error message if sending failed',
          },
        ],
      },
    },
  },
  HTTPRequest: {
    type: 'HTTPRequest',
    name: 'HTTP Request',
    description: 'Make HTTP request to external API',
    category: 'Communication',
    fields: [
      {
        name: 'method',
        label: 'Method',
        type: 'select',
        description: 'HTTP method',
        required: true,
        options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'PATCH', value: 'PATCH' },
          { label: 'DELETE', value: 'DELETE' },
        ],
        group: 'Request',
      },
      {
        name: 'url',
        label: 'URL',
        type: 'url',
        placeholder: 'https://api.example.com/endpoint',
        description: 'API endpoint URL',
        required: true,
        group: 'Request',
      },
      {
        name: 'headers',
        label: 'Headers (JSON)',
        type: 'textarea',
        placeholder: '{"Authorization": "Bearer token", "Content-Type": "application/json"}',
        description: 'Request headers as JSON',
        rows: 3,
        group: 'Headers',
      },
      {
        name: 'body',
        label: 'Body (JSON)',
        type: 'textarea',
        placeholder: '{"message": "{{$node["chat_1"].message}}"}',
        description: 'Request body as JSON (supports variables)',
        rows: 4,
        group: 'Body',
      },
      {
        name: 'timeout',
        label: 'Timeout (seconds)',
        type: 'number',
        placeholder: '30',
        description: 'Request timeout',
        validation: { min: 1, max: 300 },
        group: 'Settings',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        dynamic: true,
        fields: [
          {
            name: 'json',
            path: ['json'],
            type: 'json',
            description: 'Response body as JSON (structure depends on API)',
          },
          {
            name: 'status',
            path: ['status'],
            type: 'number',
            description: 'HTTP status code (200, 404, 500, etc.)',
          },
          {
            name: 'headers',
            path: ['headers'],
            type: 'object',
            description: 'Response headers as key-value pairs',
          },
        ],
      },
      error: {
        type: 'error',
        displayName: 'Error Output',
        fields: [
          {
            name: 'error',
            path: ['error'],
            type: 'string',
            description: 'Error message if request failed',
          },
          {
            name: 'statusCode',
            path: ['statusCode'],
            type: 'number',
            description: 'HTTP error status code',
          },
        ],
      },
    },
  },

  // Logic
  Conditional: {
    type: 'Conditional',
    name: 'Conditional',
    description: 'Branch workflow based on conditions',
    category: 'Logic',
    fields: [
      {
        name: 'condition',
        label: 'Condition',
        type: 'select',
        description: 'Logical operator',
        required: true,
        options: [
          { label: 'AND (all must be true)', value: 'AND' },
          { label: 'OR (any can be true)', value: 'OR' },
        ],
        group: 'Settings',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        fields: [
          {
            name: 'matched',
            path: ['matched'],
            type: 'boolean',
            description: 'Whether condition evaluated to true',
          },
          {
            name: 'matchedBranch',
            path: ['matchedBranch'],
            type: 'string',
            description: 'Name of the branch that matched (true/false)',
          },
        ],
      },
    },
  },
  Loop: {
    type: 'Loop',
    name: 'Loop',
    description: 'Repeat actions for each item',
    category: 'Logic',
    fields: [
      {
        name: 'array',
        label: 'Array to Loop',
        type: 'text',
        placeholder: '{{$node.fetch_items.items}}',
        description: 'Array variable to iterate over',
        required: true,
        group: 'Loop',
      },
      {
        name: 'itemName',
        label: 'Item Variable Name',
        type: 'text',
        placeholder: 'item',
        description: 'Variable name for current item',
        required: true,
        group: 'Loop',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        dynamic: true,
        fields: [
          {
            name: 'currentItem',
            path: ['currentItem'],
            type: 'json',
            description: 'The current item being processed in loop',
          },
          {
            name: 'index',
            path: ['index'],
            type: 'number',
            description: 'Zero-based index of current item',
          },
          {
            name: 'iteration',
            path: ['iteration'],
            type: 'number',
            description: 'One-based iteration number',
          },
        ],
      },
    },
  },
  Delay: {
    type: 'Delay',
    name: 'Delay',
    description: 'Wait for specified time',
    category: 'Logic',
    fields: [
      {
        name: 'duration',
        label: 'Duration (seconds)',
        type: 'number',
        placeholder: '5',
        description: 'How long to wait in seconds',
        required: true,
        validation: { min: 1, max: 3600 },
        group: 'Settings',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        fields: [
          {
            name: 'delayed',
            path: ['delayed'],
            type: 'boolean',
            description: 'Always true - delay completed',
          },
          {
            name: 'delayedUntil',
            path: ['delayedUntil'],
            type: 'date',
            description: 'Timestamp when delay completed',
          },
          {
            name: 'duration',
            path: ['duration'],
            type: 'number',
            description: 'Duration in seconds that was delayed',
          },
        ],
      },
    },
  },

  // Data
  DataFormatter: {
    type: 'DataFormatter',
    name: 'Data Formatter',
    description: 'Transform and format data',
    category: 'Data',
    fields: [
      {
        name: 'formatType',
        label: 'Format Type',
        type: 'select',
        description: 'Transformation type',
        required: true,
        options: [
          { label: 'JSON to String', value: 'json_to_string' },
          { label: 'String to JSON', value: 'string_to_json' },
          { label: 'Uppercase', value: 'uppercase' },
          { label: 'Lowercase', value: 'lowercase' },
          { label: 'Trim Whitespace', value: 'trim' },
          { label: 'Custom Expression', value: 'custom' },
        ],
        group: 'Format',
      },
      {
        name: 'input',
        label: 'Input Data',
        type: 'textarea',
        placeholder: '{{$node.previous_node.output}}',
        description: 'Data to format',
        required: true,
        rows: 4,
        group: 'Data',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        dynamic: true,
        fields: [
          {
            name: 'formatted',
            path: ['formatted'],
            type: 'string',
            description: 'The formatted output (type depends on format type)',
          },
          {
            name: 'formatType',
            path: ['formatType'],
            type: 'string',
            description: 'The format type that was applied',
          },
          {
            name: 'originalInput',
            path: ['originalInput'],
            type: 'json',
            description: 'The original input before formatting',
          },
        ],
      },
      error: {
        type: 'error',
        displayName: 'Error Output',
        fields: [
          {
            name: 'error',
            path: ['error'],
            type: 'string',
            description: 'Error message if formatting failed',
          },
        ],
      },
    },
  },
  JSONParser: {
    type: 'JSONParser',
    name: 'JSON Parser',
    description: 'Parse and manipulate JSON data',
    category: 'Data',
    fields: [
      {
        name: 'json_string',
        label: 'JSON Input',
        type: 'textarea',
        placeholder: '{{$node.http_request.response_body}}',
        description: 'JSON string to parse. Supports {{$node.x.y}} expressions.',
        required: true,
        rows: 4,
        group: 'Input',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        dynamic: true,
        fields: [
          {
            name: 'parsed',
            path: ['parsed'],
            type: 'json',
            description: 'The complete parsed JSON object',
          },
          {
            name: 'keys',
            path: ['keys'],
            type: 'array',
            description: 'Top-level keys of the parsed object',
          },
          {
            name: 'is_array',
            path: ['is_array'],
            type: 'boolean',
            description: 'Whether the parsed value is an array',
          },
        ],
      },
    },
  },
  Logger: {
    type: 'Logger',
    name: 'Logger',
    description: 'Log messages for debugging',
    category: 'Data',
    fields: [
      {
        name: 'level',
        label: 'Log Level',
        type: 'select',
        description: 'Severity level',
        required: true,
        options: [
          { label: '📝 Info', value: 'info' },
          { label: '⚠️ Warning', value: 'warning' },
          { label: '❌ Error', value: 'error' },
        ],
        group: 'Settings',
      },
      {
        name: 'message',
        label: 'Log Message',
        type: 'textarea',
        placeholder: 'Processing: {{$node.chat_input.message}}',
        description: 'Message to log (supports variables)',
        required: true,
        rows: 3,
        group: 'Content',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        fields: [
          {
            name: 'logId',
            path: ['logId'],
            type: 'string',
            description: 'Unique identifier for this log entry',
          },
          {
            name: 'message',
            path: ['message'],
            type: 'string',
            description: 'The message that was logged',
          },
          {
            name: 'level',
            path: ['level'],
            type: 'string',
            description: 'Log level (info, warning, error)',
          },
          {
            name: 'timestamp',
            path: ['timestamp'],
            type: 'date',
            description: 'When the message was logged',
          },
        ],
      },
    },
  },

  'Variable Setter': {
    type: 'Variable Setter',
    name: 'Variable Setter',
    description: 'Store a value in a workflow variable for later use',
    category: 'Data',
    fields: [
      {
        name: 'variable_name',
        label: 'Variable Name',
        type: 'text',
        placeholder: 'myVariable',
        description: 'Name of the variable to set (use {{$vars.myVariable}} to read it later)',
        required: true,
        group: 'Variable',
      },
      {
        name: 'value',
        label: 'Value',
        type: 'textarea',
        placeholder: '{{$node.json_parser.parsed}}',
        description: 'Value to store. Supports {{$node.x.y}} expressions.',
        required: true,
        rows: 3,
        group: 'Variable',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        fields: [
          {
            name: 'variable_name',
            path: ['variable_name'],
            type: 'string',
            description: 'Name of the variable that was set',
          },
          {
            name: 'value',
            path: ['value'],
            type: 'json',
            description: 'Value that was stored',
          },
          {
            name: 'set_at',
            path: ['set_at'],
            type: 'string',
            description: 'Timestamp when the variable was set',
          },
        ],
      },
    },
  },

  // Integrations
  GoogleSheets: {
    type: 'GoogleSheets',
    name: 'Google Sheets',
    description: 'Read/Write to Google Sheets',
    category: 'Integrations',
    fields: [
      {
        name: 'operation',
        label: 'Operation',
        type: 'select',
        description: 'What to do with the sheet',
        required: true,
        options: [
          { label: 'Read Rows', value: 'read' },
          { label: 'Append Row', value: 'append' },
          { label: 'Update Row', value: 'update' },
          { label: 'Delete Row', value: 'delete' },
        ],
        group: 'Operation',
      },
      {
        name: 'spreadsheetId',
        label: 'Spreadsheet ID',
        type: 'text',
        placeholder: '1A2B3C4D5E6F7G8H9I...',
        description: 'Google Sheet ID from URL',
        required: true,
        group: 'Sheet',
      },
      {
        name: 'sheetName',
        label: 'Sheet Name',
        type: 'text',
        placeholder: 'Sheet1',
        description: 'Name of the sheet tab',
        required: true,
        group: 'Sheet',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        dynamic: true,
        fields: [
          {
            name: 'rows',
            path: ['rows'],
            type: 'array',
            description: 'Array of rows read or affected (structure depends on sheet)',
          },
          {
            name: 'rowCount',
            path: ['rowCount'],
            type: 'number',
            description: 'Number of rows read, written, or deleted',
          },
          {
            name: 'rangeRead',
            path: ['rangeRead'],
            type: 'string',
            description: 'The range of cells affected (e.g., A1:B10)',
          },
        ],
      },
      error: {
        type: 'error',
        displayName: 'Error Output',
        fields: [
          {
            name: 'error',
            path: ['error'],
            type: 'string',
            description: 'Error message if operation failed',
          },
        ],
      },
    },
  },
  GoogleDrive: {
    type: 'GoogleDrive',
    name: 'Google Drive',
    description: 'Upload/Download files from Google Drive',
    category: 'Integrations',
    fields: [
      {
        name: 'operation',
        label: 'Operation',
        type: 'select',
        description: 'File operation',
        required: true,
        options: [
          { label: 'Upload File', value: 'upload' },
          { label: 'Download File', value: 'download' },
          { label: 'List Files', value: 'list' },
          { label: 'Delete File', value: 'delete' },
        ],
        group: 'Operation',
      },
      {
        name: 'folderId',
        label: 'Folder ID',
        type: 'text',
        placeholder: '1A2B3C4D5E6F7G8H9I...',
        description: 'Google Drive folder ID',
        group: 'Path',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        fields: [
          {
            name: 'fileId',
            path: ['fileId'],
            type: 'string',
            description: 'Google Drive file ID',
          },
          {
            name: 'fileName',
            path: ['fileName'],
            type: 'string',
            description: 'Name of the file',
          },
          {
            name: 'mimeType',
            path: ['mimeType'],
            type: 'string',
            description: 'MIME type of file (e.g., application/pdf)',
          },
          {
            name: 'size',
            path: ['size'],
            type: 'number',
            description: 'File size in bytes',
          },
          {
            name: 'webViewLink',
            path: ['webViewLink'],
            type: 'string',
            description: 'Shareable link to the file',
          },
        ],
      },
      error: {
        type: 'error',
        displayName: 'Error Output',
        fields: [
          {
            name: 'error',
            path: ['error'],
            type: 'string',
            description: 'Error message if operation failed',
          },
        ],
      },
    },
  },
  Stripe: {
    type: 'Stripe',
    name: 'Stripe',
    description: 'Handle Stripe payments and webhooks',
    category: 'Integrations',
    fields: [
      {
        name: 'operation',
        label: 'Operation',
        type: 'select',
        description: 'Stripe operation',
        required: true,
        options: [
          { label: 'Create Payment Intent', value: 'create_payment' },
          { label: 'Retrieve Payment', value: 'retrieve_payment' },
          { label: 'Refund', value: 'refund' },
          { label: 'List Charges', value: 'list_charges' },
        ],
        group: 'Operation',
      },
      {
        name: 'amount',
        label: 'Amount (cents)',
        type: 'number',
        placeholder: '1000',
        description: 'Amount in cents (e.g., 1000 = $10.00)',
        required: false,
        group: 'Payment',
      },
      {
        name: 'currency',
        label: 'Currency',
        type: 'select',
        description: 'Currency code',
        options: [
          { label: 'USD', value: 'usd' },
          { label: 'EUR', value: 'eur' },
          { label: 'GBP', value: 'gbp' },
        ],
        group: 'Payment',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        dynamic: true,
        fields: [
          {
            name: 'id',
            path: ['id'],
            type: 'string',
            description: 'Stripe object ID (payment intent, charge, refund, etc.)',
          },
          {
            name: 'status',
            path: ['status'],
            type: 'string',
            description: 'Status of operation (succeeded, pending, failed, etc.)',
          },
          {
            name: 'amount',
            path: ['amount'],
            type: 'number',
            description: 'Amount in cents',
          },
          {
            name: 'currency',
            path: ['currency'],
            type: 'string',
            description: 'Currency code',
          },
          {
            name: 'createdAt',
            path: ['createdAt'],
            type: 'date',
            description: 'When the object was created',
          },
        ],
      },
      error: {
        type: 'error',
        displayName: 'Error Output',
        fields: [
          {
            name: 'error',
            path: ['error'],
            type: 'string',
            description: 'Stripe API error message',
          },
          {
            name: 'code',
            path: ['code'],
            type: 'string',
            description: 'Stripe error code',
          },
        ],
      },
    },
  },

  // AI/ML
  OpenAI: {
    type: 'OpenAI',
    name: 'OpenAI',
    description: 'Use OpenAI API (GPT, DALL-E, etc)',
    category: 'AI/ML',
    fields: [
      {
        name: 'model',
        label: 'Model',
        type: 'select',
        description: 'GPT model to use',
        required: true,
        options: [
          { label: 'GPT-4', value: 'gpt-4' },
          { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
          { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
        ],
        group: 'Model',
      },
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        placeholder: 'You are a helpful assistant...',
        description: 'System prompt for the AI',
        required: true,
        rows: 3,
        group: 'Prompt',
      },
      {
        name: 'input',
        label: 'User Input',
        type: 'textarea',
        placeholder: '{{$node["chat_input"].message}}',
        description: 'User message (supports variables)',
        required: true,
        rows: 3,
        group: 'Input',
      },
      {
        name: 'temperature',
        label: 'Temperature (0-2)',
        type: 'number',
        placeholder: '0.7',
        description: 'Randomness of response',
        validation: { min: 0, max: 2 },
        group: 'Settings',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        fields: [
          {
            name: 'response',
            path: ['response'],
            type: 'string',
            description: 'The AI generated response text',
          },
          {
            name: 'usage',
            path: ['usage'],
            type: 'object',
            description: 'Token usage information',
            children: [
              {
                name: 'prompt_tokens',
                path: ['usage', 'prompt_tokens'],
                type: 'number',
                description: 'Number of input tokens used',
              },
              {
                name: 'completion_tokens',
                path: ['usage', 'completion_tokens'],
                type: 'number',
                description: 'Number of output tokens used',
              },
              {
                name: 'total_tokens',
                path: ['usage', 'total_tokens'],
                type: 'number',
                description: 'Total tokens used',
              },
            ],
          },
          {
            name: 'model',
            path: ['model'],
            type: 'string',
            description: 'The model that was used',
          },
        ],
      },
    },
  },
  ClaudeAI: {
    type: 'ClaudeAI',
    name: 'Claude AI',
    description: 'Use Anthropic Claude API',
    category: 'AI/ML',
    fields: [
      {
        name: 'model',
        label: 'Model',
        type: 'select',
        description: 'Claude model to use',
        required: true,
        options: [
          { label: 'Claude 3 Opus', value: 'claude-3-opus' },
          { label: 'Claude 3 Sonnet', value: 'claude-3-sonnet' },
          { label: 'Claude 3 Haiku', value: 'claude-3-haiku' },
        ],
        group: 'Model',
      },
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        placeholder: 'You are a helpful assistant...',
        description: 'System prompt for Claude',
        required: true,
        rows: 3,
        group: 'Prompt',
      },
      {
        name: 'input',
        label: 'User Input',
        type: 'textarea',
        placeholder: '{{$node["chat_input"].message}}',
        description: 'User message (supports variables)',
        required: true,
        rows: 3,
        group: 'Input',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        fields: [
          {
            name: 'response',
            path: ['response'],
            type: 'string',
            description: 'The Claude generated response text',
          },
          {
            name: 'usage',
            path: ['usage'],
            type: 'object',
            description: 'Token usage information',
            children: [
              {
                name: 'input_tokens',
                path: ['usage', 'input_tokens'],
                type: 'number',
                description: 'Number of input tokens used',
              },
              {
                name: 'output_tokens',
                path: ['usage', 'output_tokens'],
                type: 'number',
                description: 'Number of output tokens used',
              },
            ],
          },
          {
            name: 'model',
            path: ['model'],
            type: 'string',
            description: 'The Claude model that was used',
          },
        ],
      },
    },
  },
};

/**
 * Get node definition by type
 */
export function getNodeDefinitionByType(nodeType: string): NodeDefinition | null {
  // Try exact match
  let definition: NodeDefinition | undefined = NODE_DEFINITIONS[nodeType];

  // Try case-insensitive match
  if (!definition) {
    const key = Object.keys(NODE_DEFINITIONS).find(
      (k) => k.toLowerCase() === nodeType.toLowerCase()
    );
    definition = key ? NODE_DEFINITIONS[key] : undefined;
  }

  return definition || null;
}

/**
 * Get all node definitions
 */
export function getAllNodeDefinitions(): NodeDefinition[] {
  return Object.values(NODE_DEFINITIONS);
}
