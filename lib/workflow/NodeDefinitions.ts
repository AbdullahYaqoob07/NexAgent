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
  halfWidth?: boolean;
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
    description: 'Start workflow at scheduled times using a cron expression.',
    category: 'Triggers',
    fields: [
      {
        name: 'cron',
        label: 'Frequency',
        type: 'select',
        description: 'How often to run this workflow (sets cron expression)',
        required: true,
        options: [
          { label: 'Every minute', value: '* * * * *' },
          { label: 'Every 5 minutes', value: '*/5 * * * *' },
          { label: 'Every 15 minutes', value: '*/15 * * * *' },
          { label: 'Every hour', value: '0 * * * *' },
          { label: 'Daily (9am)', value: '0 9 * * *' },
          { label: 'Daily (6pm)', value: '0 18 * * *' },
          { label: 'Weekly (Monday 9am)', value: '0 9 * * 1' },
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
            name: 'triggered_at',
            path: ['triggered_at'],
            type: 'date',
            description: 'When the scheduled execution triggered',
          },
          {
            name: 'cron',
            path: ['cron'],
            type: 'string',
            description: 'The cron expression used',
          },
          {
            name: 'timezone',
            path: ['timezone'],
            type: 'string',
            description: 'The timezone the schedule runs in',
          },
          {
            name: 'next_run',
            path: ['next_run'],
            type: 'string',
            description: 'ISO timestamp of the next scheduled run',
          },
        ],
      },
    },
  },
  Webhook: {
    type: 'Webhook',
    name: 'Webhook',
    description: 'Start workflow from an inbound HTTP request. The webhook URL is: POST /api/v1/webhooks/{workflow_id}',
    category: 'Triggers',
    fields: [
      {
        name: 'allowed_methods',
        label: 'Allowed Methods',
        type: 'select',
        description: 'Which HTTP method this webhook accepts',
        required: false,
        options: [
          { label: 'POST', value: 'POST' },
          { label: 'GET', value: 'GET' },
          { label: 'Any', value: 'ANY' },
        ],
        group: 'Settings',
      },
      {
        name: 'path',
        label: 'Path (optional)',
        type: 'text',
        placeholder: 'custom/path',
        description: 'Optional custom path suffix for this webhook',
        group: 'Settings',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        fields: [
          { name: 'body', path: ['body'], type: 'object', description: 'Parsed JSON body of the incoming request' },
          { name: 'headers', path: ['headers'], type: 'object', description: 'HTTP headers from the incoming request' },
          { name: 'method', path: ['method'], type: 'string', description: 'HTTP method used (POST, GET, etc.)' },
          { name: 'query_params', path: ['query_params'], type: 'object', description: 'URL query parameters' },
          { name: 'triggered_at', path: ['triggered_at'], type: 'string', description: 'ISO timestamp when webhook was received' },
        ],
      },
    },
  },

  // Communication
  ChatInput: {
    type: 'ChatInput',
    name: 'Chat Input',
    description: 'Accepts a chat message as workflow input. Use {{$trigger.input_data.message}} to pass data from the trigger.',
    category: 'Communication',
    fields: [
      {
        name: 'message',
        label: 'Message',
        type: 'textarea',
        placeholder: '{{$trigger.input_data.message}}',
        description: 'The chat message text. Supports expressions like {{$vars.myMsg}}.',
        rows: 3,
        group: 'Input',
      },
      {
        name: 'session_id',
        label: 'Session ID',
        type: 'text',
        placeholder: '{{$trigger.input_data.session_id}}',
        description: 'Optional session identifier for multi-turn conversations.',
        group: 'Input',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        fields: [
          { name: 'message', path: ['message'], type: 'string', description: 'The chat message text' },
          { name: 'session_id', path: ['session_id'], type: 'string', description: 'Session identifier' },
          { name: 'timestamp', path: ['timestamp'], type: 'date', description: 'When the message was processed' },
          { name: 'word_count', path: ['word_count'], type: 'number', description: 'Number of words in the message' },
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
        name: 'token',
        label: 'Bot Token',
        type: 'password',
        placeholder: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
        description: 'Get from @BotFather on Telegram',
        required: true,
        group: 'Authentication',
      },
      {
        name: 'chat_id',
        label: 'Chat ID',
        type: 'text',
        placeholder: '@mychannel or 123456789',
        description: 'User ID, channel ID, or group ID',
        required: true,
        group: 'Target',
      },
      {
        name: 'message',
        label: 'Message',
        type: 'textarea',
        placeholder: 'Hello from NexAgent!',
        description: 'Message to send (supports variables)',
        required: true,
        rows: 4,
        group: 'Content',
      },
      {
        name: 'parse_mode',
        label: 'Parse Mode',
        type: 'select',
        description: 'Text formatting',
        options: [
          { label: 'HTML', value: 'HTML' },
          { label: 'Markdown', value: 'Markdown' },
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
    description: 'Send an email via SMTP. Enter credentials directly or configure via backend .env.',
    category: 'Communication',
    fields: [
      {
        name: 'to',
        label: 'To',
        type: 'email',
        placeholder: 'user@example.com',
        description: 'Recipient email address(es). Comma-separated for multiple.',
        required: true,
      },
      {
        name: 'subject',
        label: 'Subject',
        type: 'text',
        placeholder: 'Hello from NexAgent',
        required: true,
      },
      {
        name: 'body',
        label: 'Body',
        type: 'textarea',
        placeholder: 'Hi there!',
        description: 'Email body. Supports plain text or HTML.',
        required: true,
        rows: 5,
      },
      {
        name: 'smtp_host',
        label: 'SMTP Host',
        type: 'text',
        placeholder: 'smtp.gmail.com',
        description: 'Leave blank to use .env SMTP_HOST',
        halfWidth: true,
      },
      {
        name: 'smtp_port',
        label: 'SMTP Port',
        type: 'number',
        placeholder: '587',
        description: '587 for TLS, 465 for SSL',
        halfWidth: true,
      },
      {
        name: 'smtp_user',
        label: 'SMTP Username',
        type: 'text',
        placeholder: 'you@gmail.com',
        description: 'Leave blank to use .env SMTP_USERNAME',
        halfWidth: true,
      },
      {
        name: 'smtp_pass',
        label: 'SMTP Password',
        type: 'password',
        placeholder: '••••••••',
        description: 'App password or SMTP password. Leave blank to use .env SMTP_PASSWORD.',
        halfWidth: true,
      },
      {
        name: 'from_email',
        label: 'From Email',
        type: 'email',
        placeholder: 'noreply@example.com',
        description: 'Sender address. Leave blank to use .env EMAIL_FROM.',
        halfWidth: true,
      },
      {
        name: 'from_name',
        label: 'From Name',
        type: 'text',
        placeholder: 'NexAgent',
        halfWidth: true,
      },
      {
        name: 'is_html',
        label: 'Send as HTML',
        type: 'boolean',
        description: 'Treat body as HTML markup.',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        fields: [
          {
            name: 'sent',
            path: ['sent'],
            type: 'boolean',
            description: 'Whether email was sent successfully',
          },
          {
            name: 'message_id',
            path: ['message_id'],
            type: 'string',
            description: 'Unique message identifier',
          },
          {
            name: 'sent_at',
            path: ['sent_at'],
            type: 'string',
            description: 'Timestamp when email was sent',
          },
          {
            name: 'to',
            path: ['to'],
            type: 'string',
            description: 'Recipients',
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
        name: 'token',
        label: 'Bot Token',
        type: 'password',
        placeholder: 'xoxb-...',
        description: 'Slack Bot Token (xoxb-...). Create one at api.slack.com/apps.',
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
    description: 'Make an HTTP request to any URL. Supports GET, POST, PUT, DELETE, PATCH.',
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
        description: 'API endpoint URL. Supports {{$node.id.field}} expressions.',
        required: true,
        group: 'Request',
      },
      {
        name: 'headers',
        label: 'Headers (JSON)',
        type: 'textarea',
        placeholder: '{"Authorization": "Bearer {{$vars.token}}", "Content-Type": "application/json"}',
        description: 'Request headers as a JSON object',
        rows: 3,
        group: 'Headers',
      },
      {
        name: 'body',
        label: 'Body (JSON)',
        type: 'textarea',
        placeholder: '{"message": "{{$node.n1.message}}"}',
        description: 'Request body as JSON (supports variables)',
        rows: 4,
        group: 'Body',
      },
      {
        name: 'query_params',
        label: 'Query Parameters (JSON)',
        type: 'textarea',
        placeholder: '{"page": "1", "limit": "10"}',
        description: 'URL query parameters as a JSON object',
        rows: 2,
        group: 'Body',
      },
      {
        name: 'timeout',
        label: 'Timeout (seconds)',
        type: 'number',
        placeholder: '30',
        description: 'Request timeout in seconds',
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
          { name: 'status_code', path: ['status_code'], type: 'number', description: 'HTTP status code (200, 404, 500, etc.)' },
          { name: 'response_body', path: ['response_body'], type: 'object', description: 'Response body parsed as JSON object' },
          { name: 'response_text', path: ['response_text'], type: 'string', description: 'Raw response body as string' },
          { name: 'headers', path: ['headers'], type: 'object', description: 'Response headers as key-value pairs' },
          { name: 'ok', path: ['ok'], type: 'boolean', description: 'True if status code is 2xx' },
        ],
      },
    },
  },

  // Logic
  Conditional: {
    type: 'Conditional',
    name: 'If Condition',
    description: 'Branch workflow execution based on a comparison. Connect two downstream nodes — click the T/F badge on each connection to mark it as the true or false branch.',
    category: 'Logic',
    fields: [
      {
        name: 'left',
        label: 'Left Value',
        type: 'textarea',
        placeholder: '{{$node.prev.status_code}}',
        description: 'Left side of comparison. Supports {{$node.x.y}} expressions.',
        required: true,
        rows: 2,
        group: 'Condition',
      },
      {
        name: 'operator',
        label: 'Operator',
        type: 'select',
        description: 'Comparison operator',
        required: true,
        options: [
          { label: '== equals', value: '==' },
          { label: '!= not equals', value: '!=' },
          { label: '> greater than', value: '>' },
          { label: '< less than', value: '<' },
          { label: '>= greater or equal', value: '>=' },
          { label: '<= less or equal', value: '<=' },
          { label: 'contains', value: 'contains' },
          { label: 'does not contain', value: 'not_contains' },
          { label: 'starts with', value: 'starts_with' },
          { label: 'ends with', value: 'ends_with' },
          { label: 'is empty', value: 'is_empty' },
          { label: 'is not empty', value: 'is_not_empty' },
          { label: 'matches regex', value: 'regex' },
        ],
        group: 'Condition',
      },
      {
        name: 'right',
        label: 'Right Value',
        type: 'textarea',
        placeholder: '200',
        description: 'Right side of comparison (not needed for is_empty / is_not_empty).',
        rows: 2,
        group: 'Condition',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        fields: [
          {
            name: 'branch',
            path: ['branch'],
            type: 'string',
            description: '"true" or "false" — engine routes the connection whose T/F badge matches',
          },
          {
            name: 'result',
            path: ['result'],
            type: 'boolean',
            description: 'Boolean result of the comparison',
          },
          {
            name: 'left',
            path: ['left'],
            type: 'string',
            description: 'Left value used in comparison',
          },
          {
            name: 'right',
            path: ['right'],
            type: 'string',
            description: 'Right value used in comparison',
          },
        ],
      },
    },
  },
  Loop: {
    type: 'Loop',
    name: 'Loop',
    description: 'Iterate over an array. For each item, all connected downstream nodes execute once. Reference the current item via {{$node.<loopId>.current_item}}.',
    category: 'Logic',
    fields: [
      {
        name: 'items',
        label: 'Items (array)',
        type: 'textarea',
        placeholder: '{{$node.json_parser.parsed}}',
        description: 'Array to iterate over. Use {{$node.x.y}} to reference a previous node\'s output.',
        required: false,
        rows: 3,
        group: 'Input',
      },
      {
        name: 'items_path',
        label: 'Items Path (alternative)',
        type: 'text',
        placeholder: 'response_body.users',
        description: 'Dot-notation path into the previous node\'s output to find the array. Use this OR Items above.',
        required: false,
        group: 'Input',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Per-Iteration Output',
        dynamic: true,
        fields: [
          {
            name: 'current_item',
            path: ['current_item'],
            type: 'json',
            description: 'The item for the current iteration',
          },
          {
            name: 'index',
            path: ['index'],
            type: 'number',
            description: 'Zero-based index of current iteration',
          },
          {
            name: 'is_last',
            path: ['is_last'],
            type: 'boolean',
            description: 'True when this is the last iteration',
          },
          {
            name: 'total',
            path: ['total'],
            type: 'number',
            description: 'Total number of items in the array',
          },
          {
            name: 'items',
            path: ['items'],
            type: 'array',
            description: 'The full array being iterated',
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
    description: 'Transform a value using common string, number, or date operations.',
    category: 'Data',
    fields: [
      {
        name: 'input',
        label: 'Input Value',
        type: 'textarea',
        placeholder: '{{$node.prev.message}}',
        description: 'The value to format. Supports {{$node.x.y}} expressions.',
        required: true,
        rows: 3,
        group: 'Input',
      },
      {
        name: 'operation',
        label: 'Operation',
        type: 'select',
        description: 'Transformation to apply',
        required: true,
        options: [
          { label: 'Uppercase', value: 'uppercase' },
          { label: 'Lowercase', value: 'lowercase' },
          { label: 'Trim whitespace', value: 'trim' },
          { label: 'Capitalize', value: 'capitalize' },
          { label: 'Reverse string', value: 'reverse' },
          { label: 'Replace text', value: 'replace' },
          { label: 'Format number', value: 'number_format' },
          { label: 'Format date', value: 'date_format' },
          { label: 'Convert to string', value: 'to_string' },
          { label: 'Convert to number', value: 'to_number' },
        ],
        group: 'Operation',
      },
      {
        name: 'find',
        label: 'Find (for replace)',
        type: 'text',
        placeholder: 'old text',
        description: 'Text to find — used only with "Replace text" operation.',
        group: 'Replace Options',
      },
      {
        name: 'replace_with',
        label: 'Replace With',
        type: 'text',
        placeholder: 'new text',
        description: 'Replacement text — used only with "Replace text" operation.',
        group: 'Replace Options',
      },
      {
        name: 'decimal_places',
        label: 'Decimal Places',
        type: 'number',
        placeholder: '2',
        description: 'Number of decimal places — used only with "Format number" operation.',
        validation: { min: 0, max: 20 },
        group: 'Number Options',
      },
      {
        name: 'date_format',
        label: 'Date Format',
        type: 'text',
        placeholder: '%Y-%m-%d %H:%M:%S',
        description: 'strftime format string — used only with "Format date" operation.',
        group: 'Date Options',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        fields: [
          {
            name: 'formatted',
            path: ['formatted'],
            type: 'string',
            description: 'The formatted/transformed value',
          },
          {
            name: 'original',
            path: ['original'],
            type: 'string',
            description: 'The original input before formatting',
          },
          {
            name: 'operation',
            path: ['operation'],
            type: 'string',
            description: 'The operation that was applied',
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
    description: 'Read rows from or append/update rows in a Google Sheets spreadsheet.',
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
        ],
        group: 'Operation',
      },
      {
        name: 'credentials_json',
        label: 'Service Account JSON',
        type: 'textarea',
        placeholder: '{"type":"service_account","project_id":"..."}',
        description: 'Paste the full contents of your Google Service Account JSON key file.',
        required: true,
        rows: 5,
        group: 'Authentication',
      },
      {
        name: 'spreadsheet_id',
        label: 'Spreadsheet ID',
        type: 'text',
        placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms',
        description: 'The ID from the Google Sheets URL — part between /d/ and /edit',
        required: true,
        group: 'Sheet',
      },
      {
        name: 'range',
        label: 'Range',
        type: 'text',
        placeholder: 'Sheet1!A1:Z1000',
        description: 'Cell range in A1 notation, e.g. Sheet1!A1:D100',
        required: true,
        group: 'Sheet',
      },
      {
        name: 'values',
        label: 'Values (JSON)',
        type: 'textarea',
        placeholder: '[["Name", "Age"], ["Alice", "30"]]',
        description: 'JSON array of row arrays. Required for Append and Update.',
        required: false,
        rows: 4,
        group: 'Write',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        fields: [
          { name: 'data', path: ['data'], type: 'array', description: 'Rows as array of objects (read) or written values' },
          { name: 'rows_affected', path: ['rows_affected'], type: 'number', description: 'Number of rows read or written' },
          { name: 'range', path: ['range'], type: 'string', description: 'Actual range affected' },
          { name: 'operation', path: ['operation'], type: 'string', description: 'Operation performed' },
        ],
      },
    },
  },
  GoogleDrive: {
    type: 'GoogleDrive',
    name: 'Google Drive',
    description: 'List, download, upload, or delete files in Google Drive.',
    category: 'Integrations',
    fields: [
      {
        name: 'operation',
        label: 'Operation',
        type: 'select',
        description: 'File operation to perform',
        required: true,
        options: [
          { label: 'List Files', value: 'list' },
          { label: 'Download File', value: 'download' },
          { label: 'Upload Text File', value: 'upload' },
          { label: 'Delete File', value: 'delete' },
        ],
        group: 'Operation',
      },
      {
        name: 'credentials_json',
        label: 'Service Account JSON',
        type: 'textarea',
        placeholder: '{"type":"service_account","project_id":"..."}',
        description: 'Paste the full contents of your Google Service Account JSON key file.',
        required: true,
        rows: 5,
        group: 'Authentication',
      },
      {
        name: 'file_id',
        label: 'File ID',
        type: 'text',
        placeholder: '1ABC123def...',
        description: 'Google Drive file ID. Required for Download and Delete.',
        required: false,
        group: 'File',
      },
      {
        name: 'folder_id',
        label: 'Folder ID',
        type: 'text',
        placeholder: '1ABC123def...',
        description: 'Folder to list or upload into. Leave blank for root.',
        required: false,
        group: 'File',
      },
      {
        name: 'file_name',
        label: 'File Name',
        type: 'text',
        placeholder: 'my-file.txt',
        description: 'Name for the uploaded file. Required for Upload.',
        required: false,
        halfWidth: true,
        group: 'Upload',
      },
      {
        name: 'file_content',
        label: 'File Content',
        type: 'textarea',
        placeholder: 'Hello from NexAgent!',
        description: 'Text content to upload. Required for Upload.',
        required: false,
        rows: 4,
        group: 'Upload',
      },
      {
        name: 'query',
        label: 'Search Query',
        type: 'text',
        placeholder: "name contains 'report'",
        description: "Drive query filter for List. Leave blank to list all. E.g. name contains 'report'",
        required: false,
        halfWidth: true,
        group: 'List',
      },
      {
        name: 'limit',
        label: 'Limit',
        type: 'number',
        placeholder: '20',
        description: 'Max files to return for List (1–100).',
        required: false,
        halfWidth: true,
        group: 'List',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        fields: [
          { name: 'file_id', path: ['file_id'], type: 'string', description: 'File ID' },
          { name: 'name', path: ['name'], type: 'string', description: 'File name' },
          { name: 'url', path: ['url'], type: 'string', description: 'Web view URL' },
          { name: 'content', path: ['content'], type: 'string', description: 'Downloaded file content (text)' },
          { name: 'files', path: ['files'], type: 'array', description: 'Array of files (for List operation)' },
          { name: 'operation', path: ['operation'], type: 'string', description: 'Operation performed' },
        ],
      },
    },
  },
  Stripe: {
    type: 'Stripe',
    name: 'Stripe',
    description: 'Create payment intents, retrieve charges, and manage Stripe customers.',
    category: 'Integrations',
    fields: [
      {
        name: 'operation',
        label: 'Operation',
        type: 'select',
        description: 'Stripe operation to perform',
        required: true,
        options: [
          { label: 'Create Payment Intent', value: 'create_payment_intent' },
          { label: 'Retrieve Payment Intent', value: 'retrieve_payment_intent' },
          { label: 'Create Customer', value: 'create_customer' },
          { label: 'Retrieve Customer', value: 'retrieve_customer' },
          { label: 'List Charges', value: 'list_charges' },
        ],
        group: 'Operation',
      },
      {
        name: 'api_key',
        label: 'Secret Key',
        type: 'password',
        placeholder: 'sk_test_...',
        description: 'Stripe Secret Key (sk_test_... or sk_live_...)',
        required: true,
        group: 'Authentication',
      },
      {
        name: 'amount',
        label: 'Amount (cents)',
        type: 'number',
        placeholder: '1000',
        description: 'Amount in cents (e.g. 1000 = $10.00). Required for Create Payment Intent.',
        required: false,
        halfWidth: true,
        group: 'Payment',
      },
      {
        name: 'currency',
        label: 'Currency',
        type: 'select',
        description: 'Currency code. Used for Create Payment Intent.',
        options: [
          { label: 'USD', value: 'usd' },
          { label: 'EUR', value: 'eur' },
          { label: 'GBP', value: 'gbp' },
          { label: 'PKR', value: 'pkr' },
        ],
        halfWidth: true,
        group: 'Payment',
      },
      {
        name: 'payment_intent_id',
        label: 'Payment Intent ID',
        type: 'text',
        placeholder: 'pi_3abc...',
        description: 'Required for Retrieve Payment Intent.',
        required: false,
        group: 'Retrieve',
      },
      {
        name: 'customer_email',
        label: 'Customer Email',
        type: 'email',
        placeholder: 'user@example.com',
        description: 'Required for Create Customer.',
        required: false,
        halfWidth: true,
        group: 'Customer',
      },
      {
        name: 'customer_name',
        label: 'Customer Name',
        type: 'text',
        placeholder: 'John Doe',
        description: 'Optional. Used for Create Customer.',
        required: false,
        halfWidth: true,
        group: 'Customer',
      },
      {
        name: 'customer_id',
        label: 'Customer ID',
        type: 'text',
        placeholder: 'cus_abc...',
        description: 'Required for Retrieve Customer.',
        required: false,
        group: 'Customer',
      },
      {
        name: 'limit',
        label: 'Limit',
        type: 'number',
        placeholder: '10',
        description: 'Number of charges to return (1–100). Used for List Charges.',
        required: false,
        group: 'List',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        dynamic: true,
        fields: [
          { name: 'payment_id', path: ['payment_id'], type: 'string', description: 'Payment Intent ID (pi_...)' },
          { name: 'status', path: ['status'], type: 'string', description: 'Status (requires_payment_method, succeeded, etc.)' },
          { name: 'amount', path: ['amount'], type: 'number', description: 'Amount in cents' },
          { name: 'currency', path: ['currency'], type: 'string', description: 'Currency code' },
          { name: 'client_secret', path: ['client_secret'], type: 'string', description: 'Client secret for frontend confirmation' },
          { name: 'customer_id', path: ['customer_id'], type: 'string', description: 'Customer ID (cus_...)' },
          { name: 'data', path: ['data'], type: 'object', description: 'Full raw Stripe response' },
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

  PostgresQuery: {
    type: 'PostgresQuery',
    name: 'PostgreSQL Query',
    description: 'Execute SQL queries against a PostgreSQL database.',
    category: 'Databases',
    fields: [
      {
        name: 'operation',
        label: 'Operation',
        type: 'select',
        description: 'Type of SQL operation',
        required: true,
        options: [
          { label: 'SELECT', value: 'select' },
          { label: 'INSERT', value: 'insert' },
          { label: 'UPDATE', value: 'update' },
          { label: 'DELETE', value: 'delete' },
          { label: 'RAW SQL', value: 'raw' },
        ],
        group: 'Operation',
      },
      {
        name: 'connection_string',
        label: 'Connection String',
        type: 'password',
        placeholder: 'postgresql://user:password@localhost:5432/mydb',
        description: 'PostgreSQL database connection URL',
        required: true,
        group: 'Authentication',
      },
      {
        name: 'table',
        label: 'Table',
        type: 'text',
        placeholder: 'users',
        description: 'Table name (for SELECT/INSERT/UPDATE/DELETE)',
        required: false,
        group: 'Query',
      },
      {
        name: 'columns',
        label: 'Columns',
        type: 'text',
        placeholder: 'id, name, email',
        description: 'Columns to select (default: *)',
        required: false,
        group: 'Query',
      },
      {
        name: 'where_clause',
        label: 'WHERE Clause',
        type: 'textarea',
        placeholder: 'id = 1',
        description: 'Condition without WHERE keyword',
        required: false,
        rows: 2,
        group: 'Query',
      },
      {
        name: 'data',
        label: 'Data (JSON)',
        type: 'textarea',
        placeholder: '{"name":"Alice","email":"alice@example.com"}',
        description: 'JSON payload for INSERT/UPDATE',
        required: false,
        rows: 3,
        group: 'Query',
      },
      {
        name: 'raw_sql',
        label: 'Raw SQL',
        type: 'textarea',
        placeholder: 'SELECT * FROM users LIMIT 10',
        description: 'Used when operation is RAW SQL',
        required: false,
        rows: 3,
        group: 'Query',
      },
      {
        name: 'limit',
        label: 'Limit',
        type: 'number',
        placeholder: '100',
        description: 'Max rows for SELECT',
        required: false,
        halfWidth: true,
        group: 'Query',
      },
      {
        name: 'return_mode',
        label: 'Return Mode',
        type: 'select',
        description: 'How many rows to return',
        required: false,
        options: [
          { label: 'All Rows', value: 'all' },
          { label: 'First Row', value: 'first' },
        ],
        halfWidth: true,
        group: 'Query',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        fields: [
          { name: 'rows', path: ['rows'], type: 'array', description: 'Returned rows' },
          { name: 'row_count', path: ['row_count'], type: 'number', description: 'Number of rows returned' },
          { name: 'affected_rows', path: ['affected_rows'], type: 'number', description: 'Rows affected by write operation' },
          { name: 'first_row', path: ['first_row'], type: 'object', description: 'First row from result' },
          { name: 'success', path: ['success'], type: 'boolean', description: 'Whether query succeeded' },
          { name: 'sql_executed', path: ['sql_executed'], type: 'string', description: 'SQL query that was executed' },
        ],
      },
    },
  },

  MongoDBQuery: {
    type: 'MongoDBQuery',
    name: 'MongoDB Query',
    description: 'Run MongoDB operations on a collection.',
    category: 'Databases',
    fields: [
      {
        name: 'operation',
        label: 'Operation',
        type: 'select',
        description: 'MongoDB operation to execute',
        required: true,
        options: [
          { label: 'Find', value: 'find' },
          { label: 'Find One', value: 'find_one' },
          { label: 'Insert One', value: 'insert_one' },
          { label: 'Insert Many', value: 'insert_many' },
          { label: 'Update One', value: 'update_one' },
          { label: 'Update Many', value: 'update_many' },
          { label: 'Delete One', value: 'delete_one' },
          { label: 'Delete Many', value: 'delete_many' },
          { label: 'Aggregate', value: 'aggregate' },
          { label: 'Count', value: 'count' },
        ],
        group: 'Operation',
      },
      {
        name: 'connection_string',
        label: 'Connection String',
        type: 'password',
        placeholder: 'mongodb://localhost:27017',
        description: 'MongoDB connection URL',
        required: true,
        group: 'Authentication',
      },
      {
        name: 'database_name',
        label: 'Database Name',
        type: 'text',
        placeholder: 'mydb',
        description: 'Database to use',
        required: true,
        group: 'Collection',
      },
      {
        name: 'collection',
        label: 'Collection',
        type: 'text',
        placeholder: 'users',
        description: 'Collection name',
        required: true,
        group: 'Collection',
      },
      {
        name: 'filter',
        label: 'Filter (JSON)',
        type: 'textarea',
        placeholder: '{"status":"active"}',
        description: 'MongoDB filter object',
        required: false,
        rows: 2,
        group: 'Payload',
      },
      {
        name: 'document',
        label: 'Document (JSON)',
        type: 'textarea',
        placeholder: '{"name":"Alice"}',
        description: 'Document payload for insert operations',
        required: false,
        rows: 3,
        group: 'Payload',
      },
      {
        name: 'update',
        label: 'Update (JSON)',
        type: 'textarea',
        placeholder: '{"$set":{"status":"inactive"}}',
        description: 'Update operators for update operations',
        required: false,
        rows: 3,
        group: 'Payload',
      },
      {
        name: 'pipeline',
        label: 'Pipeline (JSON Array)',
        type: 'textarea',
        placeholder: '[{"$match":{"active":true}}]',
        description: 'Aggregation pipeline',
        required: false,
        rows: 3,
        group: 'Payload',
      },
      {
        name: 'limit',
        label: 'Limit',
        type: 'number',
        placeholder: '100',
        description: 'Max docs to return',
        required: false,
        halfWidth: true,
        group: 'Options',
      },
      {
        name: 'skip',
        label: 'Skip',
        type: 'number',
        placeholder: '0',
        description: 'Docs to skip for pagination',
        required: false,
        halfWidth: true,
        group: 'Options',
      },
      {
        name: 'upsert',
        label: 'Upsert',
        type: 'boolean',
        description: 'Insert document if update filter matches none',
        required: false,
        group: 'Options',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        fields: [
          { name: 'documents', path: ['documents'], type: 'array', description: 'Documents returned from query' },
          { name: 'document_count', path: ['document_count'], type: 'number', description: 'Count of returned documents' },
          { name: 'affected_count', path: ['affected_count'], type: 'number', description: 'Count of affected documents' },
          { name: 'first_document', path: ['first_document'], type: 'object', description: 'First document from result' },
          { name: 'inserted_id', path: ['inserted_id'], type: 'string', description: 'Inserted document ID' },
          { name: 'success', path: ['success'], type: 'boolean', description: 'Whether operation succeeded' },
        ],
      },
    },
  },

  PineconeQuery: {
    type: 'PineconeQuery',
    name: 'Pinecone Query',
    description: 'Query and manage vectors in a Pinecone index.',
    category: 'Databases',
    fields: [
      {
        name: 'operation',
        label: 'Operation',
        type: 'select',
        description: 'Pinecone operation to execute',
        required: true,
        options: [
          { label: 'Query', value: 'query' },
          { label: 'Upsert', value: 'upsert' },
          { label: 'Fetch', value: 'fetch' },
          { label: 'Delete', value: 'delete' },
          { label: 'Stats', value: 'stats' },
          { label: 'List', value: 'list' },
        ],
        group: 'Operation',
      },
      {
        name: 'api_key',
        label: 'API Key',
        type: 'password',
        placeholder: 'pcsk_...',
        description: 'Pinecone API key',
        required: true,
        group: 'Authentication',
      },
      {
        name: 'index_name',
        label: 'Index Name',
        type: 'text',
        placeholder: 'my-embeddings',
        description: 'Pinecone index name',
        required: true,
        group: 'Authentication',
      },
      {
        name: 'environment',
        label: 'Environment',
        type: 'text',
        placeholder: 'us-east-1',
        description: 'Pinecone environment/region',
        required: false,
        group: 'Authentication',
      },
      {
        name: 'namespace',
        label: 'Namespace',
        type: 'text',
        placeholder: 'my-namespace',
        description: 'Optional namespace for index operations',
        required: false,
        group: 'Query',
      },
      {
        name: 'vector',
        label: 'Vector (JSON Array)',
        type: 'textarea',
        placeholder: '[0.1, 0.2, 0.3]',
        description: 'Query vector used for similarity search',
        required: false,
        rows: 2,
        group: 'Query',
      },
      {
        name: 'top_k',
        label: 'Top K',
        type: 'number',
        placeholder: '10',
        description: 'Number of matches to return',
        required: false,
        halfWidth: true,
        group: 'Query',
      },
      {
        name: 'metadata_filter',
        label: 'Metadata Filter (JSON)',
        type: 'textarea',
        placeholder: '{"category":{"$eq":"science"}}',
        description: 'Filter query by metadata',
        required: false,
        rows: 2,
        group: 'Query',
      },
      {
        name: 'vectors',
        label: 'Vectors (JSON Array)',
        type: 'textarea',
        placeholder: '[{"id":"v1","values":[0.1,0.2],"metadata":{"text":"hello"}}]',
        description: 'Vectors payload for upsert',
        required: false,
        rows: 3,
        group: 'Payload',
      },
      {
        name: 'ids',
        label: 'IDs (JSON Array)',
        type: 'textarea',
        placeholder: '["id1","id2"]',
        description: 'Vector IDs for fetch or delete operations',
        required: false,
        rows: 2,
        group: 'Payload',
      },
      {
        name: 'include_metadata',
        label: 'Include Metadata',
        type: 'boolean',
        description: 'Include metadata in query results',
        required: false,
        group: 'Query',
      },
      {
        name: 'include_values',
        label: 'Include Vector Values',
        type: 'boolean',
        description: 'Include vector values in query results',
        required: false,
        group: 'Query',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        fields: [
          { name: 'matches', path: ['matches'], type: 'array', description: 'Similarity matches' },
          { name: 'match_count', path: ['match_count'], type: 'number', description: 'Number of matches returned' },
          { name: 'top_match', path: ['top_match'], type: 'object', description: 'Top scoring match' },
          { name: 'upserted_count', path: ['upserted_count'], type: 'number', description: 'Vectors upserted count' },
          { name: 'fetched_vectors', path: ['fetched_vectors'], type: 'object', description: 'Fetched vectors map' },
          { name: 'stats', path: ['stats'], type: 'object', description: 'Index stats' },
          { name: 'vector_ids', path: ['vector_ids'], type: 'array', description: 'Vector IDs in result' },
          { name: 'success', path: ['success'], type: 'boolean', description: 'Whether operation succeeded' },
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
      {
        name: 'enable_tools',
        label: 'Enable Tools',
        type: 'boolean',
        description: 'Allow this AI node to call workflow tools (database tools, etc.). Turn off to force direct response from provided prompt data.',
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
      {
        name: 'enable_tools',
        label: 'Enable Tools',
        type: 'boolean',
        description: 'Allow this AI node to call workflow tools (database tools, etc.). Turn off to force direct response from provided prompt data.',
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

  Groq: {
    type: 'Groq',
    name: 'Groq',
    description: 'Ultra-fast free AI inference — Llama 3, Mixtral, Gemma via Groq API.',
    category: 'AI/ML',
    fields: [
      {
        name: 'api_key',
        label: 'API Key',
        type: 'password',
        placeholder: 'gsk_...',
        description: 'Get a free API key at console.groq.com',
        required: true,
        group: 'Authentication',
      },
      {
        name: 'model',
        label: 'Model',
        type: 'select',
        description: 'Groq model to use',
        required: true,
        options: [
          { label: 'Llama 3.3 70B (recommended)', value: 'llama-3.3-70b-versatile' },
          { label: 'Llama 3.1 8B (fastest)', value: 'llama-3.1-8b-instant' },
          { label: 'Llama 3 8B', value: 'llama3-8b-8192' },
          { label: 'Mixtral 8x7B', value: 'mixtral-8x7b-32768' },
          { label: 'Gemma 2 9B', value: 'gemma2-9b-it' },
        ],
        group: 'Model',
      },
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        placeholder: 'Summarize this: {{$node.n1.response}}',
        description: 'User message to send. Supports {{$node.x.y}} variables.',
        required: true,
        rows: 4,
        group: 'Input',
      },
      {
        name: 'system_prompt',
        label: 'System Prompt',
        type: 'textarea',
        placeholder: 'You are a helpful assistant.',
        description: 'Optional system instructions for the model.',
        required: false,
        rows: 2,
        group: 'Input',
      },
      {
        name: 'temperature',
        label: 'Temperature',
        type: 'number',
        placeholder: '0.7',
        description: '0 = deterministic, 2 = very creative',
        validation: { min: 0, max: 2 },
        halfWidth: true,
        group: 'Settings',
      },
      {
        name: 'max_tokens',
        label: 'Max Tokens',
        type: 'number',
        placeholder: '1024',
        description: 'Maximum tokens in the response',
        halfWidth: true,
        group: 'Settings',
      },
      {
        name: 'enable_tools',
        label: 'Enable Database Access',
        type: 'boolean',
        description: 'Allow Groq to call database tools. Turn off to force direct reading of data already present in the prompt.',
        group: 'Settings',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        fields: [
          { name: 'response', path: ['response'], type: 'string', description: 'AI response text' },
          { name: 'model', path: ['model'], type: 'string', description: 'Model used' },
          { name: 'tokens_used', path: ['tokens_used'], type: 'number', description: 'Total tokens used' },
          { name: 'prompt_tokens', path: ['prompt_tokens'], type: 'number', description: 'Input tokens' },
          { name: 'completion_tokens', path: ['completion_tokens'], type: 'number', description: 'Output tokens' },
          { name: 'finish_reason', path: ['finish_reason'], type: 'string', description: 'Why generation stopped' },
        ],
      },
    },
  },

  Gemini: {
    type: 'Gemini',
    name: 'Gemini',
    description: 'Google Gemini AI — free tier available via Google AI Studio.',
    category: 'AI/ML',
    fields: [
      {
        name: 'api_key',
        label: 'API Key',
        type: 'password',
        placeholder: 'AIza...',
        description: 'Get a free API key at aistudio.google.com',
        required: true,
        group: 'Authentication',
      },
      {
        name: 'model',
        label: 'Model',
        type: 'select',
        description: 'Gemini model to use',
        required: true,
        options: [
          { label: 'Gemini 2.0 Flash (recommended, free)', value: 'gemini-2.0-flash' },
          { label: 'Gemini 1.5 Flash (free)', value: 'gemini-1.5-flash' },
          { label: 'Gemini 1.5 Pro (free with limits)', value: 'gemini-1.5-pro' },
        ],
        group: 'Model',
      },
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        placeholder: 'Explain this: {{$node.n1.response}}',
        description: 'User message to send. Supports {{$node.x.y}} variables.',
        required: true,
        rows: 4,
        group: 'Input',
      },
      {
        name: 'system_prompt',
        label: 'System Prompt',
        type: 'textarea',
        placeholder: 'You are a helpful assistant.',
        description: 'Optional system instructions for the model.',
        required: false,
        rows: 2,
        group: 'Input',
      },
      {
        name: 'temperature',
        label: 'Temperature',
        type: 'number',
        placeholder: '0.7',
        description: '0 = deterministic, 2 = very creative',
        validation: { min: 0, max: 2 },
        halfWidth: true,
        group: 'Settings',
      },
      {
        name: 'max_tokens',
        label: 'Max Output Tokens',
        type: 'number',
        placeholder: '1024',
        description: 'Maximum tokens in the response',
        halfWidth: true,
        group: 'Settings',
      },
      {
        name: 'enable_tools',
        label: 'Enable Tools',
        type: 'boolean',
        description: 'Allow this AI node to call workflow tools (database tools, etc.). Turn off to force direct response from provided prompt data.',
        group: 'Settings',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        fields: [
          { name: 'response', path: ['response'], type: 'string', description: 'AI response text' },
          { name: 'model', path: ['model'], type: 'string', description: 'Model used' },
          { name: 'prompt_tokens', path: ['prompt_tokens'], type: 'number', description: 'Input tokens' },
          { name: 'completion_tokens', path: ['completion_tokens'], type: 'number', description: 'Output tokens' },
          { name: 'finish_reason', path: ['finish_reason'], type: 'string', description: 'Why generation stopped' },
        ],
      },
    },
  },

  Stopper: {
    type: 'Stopper',
    name: 'Stopper',
    description: 'Stop the workflow at this point and log a completion message',
    category: 'Logic',
    fields: [
      {
        name: 'message',
        label: 'Stop Message',
        type: 'text',
        placeholder: 'Workflow completed successfully',
        description: 'Optional message to log when stopping',
        required: false,
        group: 'Settings',
      },
    ],
    outputs: {
      main: {
        type: 'main',
        displayName: 'Main Output',
        fields: [
          { name: 'stopped', path: ['stopped'], type: 'boolean', description: 'Always true' },
          { name: 'message', path: ['message'], type: 'string', description: 'Stop message' },
          { name: 'timestamp', path: ['timestamp'], type: 'date', description: 'When the workflow was stopped' },
        ],
      },
    },
  },
};

// Aliases: maps alternate type strings (engine types, sidebarTypes) → canonical NODE_DEFINITIONS key
const TYPE_ALIASES: Record<string, string> = {
  // IfCondition
  'IfCondition': 'Conditional',
  'If Condition': 'Conditional',
  'IfNode': 'Conditional',
  // DataFormatter (comes back from backend as 'String Manipulation')
  'String Manipulation': 'DataFormatter',
  'StringManipulationNode': 'DataFormatter',
  // Loop
  'LoopNode': 'Loop',
  // SetVariable
  'SetVariable': 'Variable Setter',
  // JSONParser
  'JsonParser': 'JSONParser',
  'JSON Parse': 'JSONParser',
  // Schedule
  'Schedule': 'Scheduling',
  'ScheduleTriggerNode': 'Scheduling',
  'ScheduleEvent': 'Scheduling',
  // HttpRequest
  'HttpRequest': 'HTTPRequest',
  'HTTP Request': 'HTTPRequest',
  'HttpNode': 'HTTPRequest',
  // ChatInput
  'Chat Input': 'ChatInput',
  // SendEmail (backend sends 'SendEmail', frontend key is 'EmailSend')
  'SendEmail': 'EmailSend',
  'Email Send': 'EmailSend',
  'EmailSend': 'EmailSend',
  // Slack
  'Slack Message': 'SlackMessage',
  // Telegram
  'Telegram Send': 'TelegramSend',
  // ManualTrigger
  'Manual Trigger': 'ManualTrigger',
  // Database nodes
  'PostgreSQL Query': 'PostgresQuery',
  'Postgres Query': 'PostgresQuery',
  'MongoDB Query': 'MongoDBQuery',
  'Pinecone Query': 'PineconeQuery',
};

/**
 * Get node definition by type — resolves aliases and engine type names.
 */
export function getNodeDefinitionByType(nodeType: string): NodeDefinition | null {
  if (!nodeType) return null;

  // 1. Exact match
  let definition: NodeDefinition | undefined = NODE_DEFINITIONS[nodeType];
  if (definition) return definition;

  // 2. Known alias → canonical key
  const canonical = TYPE_ALIASES[nodeType];
  if (canonical) {
    definition = NODE_DEFINITIONS[canonical];
    if (definition) return definition;
  }

  // 3. Case-insensitive match across all keys + aliases
  const lowerType = nodeType.toLowerCase();
  const aliasKey = Object.keys(TYPE_ALIASES).find(k => k.toLowerCase() === lowerType);
  if (aliasKey) {
    definition = NODE_DEFINITIONS[TYPE_ALIASES[aliasKey]];
    if (definition) return definition;
  }

  const defKey = Object.keys(NODE_DEFINITIONS).find(k => k.toLowerCase() === lowerType);
  if (defKey) return NODE_DEFINITIONS[defKey];

  return null;
}

/**
 * Get all node definitions
 */
export function getAllNodeDefinitions(): NodeDefinition[] {
  return Object.values(NODE_DEFINITIONS);
}
