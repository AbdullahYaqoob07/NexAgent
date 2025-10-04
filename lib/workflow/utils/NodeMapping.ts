/**
 * Node Mapping Utility
 * Maps display names from the WorkflowSidebar to actual node types in the engine
 */

export interface NodeMapping {
  displayName: string;
  nodeType: string;
  category: string;
  defaultConfig: Record<string, any>;
  inputs: Array<{ id: string; name: string; type: string; required: boolean }>;
  outputs: Array<{ id: string; name: string; type: string; required: boolean }>;
}

export const NODE_MAPPINGS: NodeMapping[] = [
  // Triggers
  {
    displayName: 'On Clicking Execute',
    nodeType: 'on_click_execute_trigger',
    category: 'trigger',
    defaultConfig: { executeOnRun: true, description: 'Triggered when Execute button is clicked' },
    inputs: [],
    outputs: [
      { id: 'execute_data', name: 'Execute Data', type: 'object', required: true }
    ]
  },
  {
    displayName: 'HTTP Request',
    nodeType: 'http_request_trigger',
    category: 'trigger',
    defaultConfig: { url: 'https://api.example.com', method: 'GET' },
    inputs: [
      { id: 'url', name: 'URL', type: 'string', required: true },
      { id: 'method', name: 'Method', type: 'string', required: false }
    ],
    outputs: [
      { id: 'request_data', name: 'Request Data', type: 'object', required: true }
    ]
  },
  {
    displayName: 'Schedule',
    nodeType: 'schedule_trigger',
    category: 'trigger',
    defaultConfig: { cron: '0 */5 * * * *', timezone: 'UTC' },
    inputs: [
      { id: 'cron', name: 'Cron Expression', type: 'string', required: true }
    ],
    outputs: [
      { id: 'schedule_data', name: 'Schedule Data', type: 'object', required: true }
    ]
  },
  {
    displayName: 'Webhook',
    nodeType: 'http_webhook',
    category: 'trigger',
    defaultConfig: { url: 'https://api.example.com/webhook', method: 'POST' },
    inputs: [
      { id: 'url', name: 'Webhook URL', type: 'string', required: true }
    ],
    outputs: [
      { id: 'webhook_data', name: 'Webhook Data', type: 'object', required: true }
    ]
  },
  {
    displayName: 'File Watch',
    nodeType: 'file_watch',
    category: 'trigger',
    defaultConfig: { path: '/tmp', eventType: 'modified' },
    inputs: [
      { id: 'path', name: 'Watch Path', type: 'string', required: true }
    ],
    outputs: [
      { id: 'file_data', name: 'File Data', type: 'object', required: true }
    ]
  },
  {
    displayName: 'Database Trigger',
    nodeType: 'database_trigger',
    category: 'trigger',
    defaultConfig: { table: 'users', event: 'INSERT', database: 'main' },
    inputs: [
      { id: 'table', name: 'Table Name', type: 'string', required: true }
    ],
    outputs: [
      { id: 'trigger_data', name: 'Trigger Data', type: 'object', required: true }
    ]
  },
  {
    displayName: 'Email Trigger',
    nodeType: 'email_trigger',
    category: 'trigger',
    defaultConfig: { from: 'sender@example.com', subject: 'New Email' },
    inputs: [
      { id: 'from', name: 'From Email', type: 'string', required: true }
    ],
    outputs: [
      { id: 'email_data', name: 'Email Data', type: 'object', required: true }
    ]
  },

  // Actions
  {
    displayName: 'HTTP Request',
    nodeType: 'http_request_action',
    category: 'action',
    defaultConfig: { url: 'https://api.example.com', method: 'GET' },
    inputs: [
      { id: 'url', name: 'URL', type: 'string', required: true },
      { id: 'method', name: 'Method', type: 'string', required: false },
      { id: 'headers', name: 'Headers', type: 'object', required: false },
      { id: 'body', name: 'Body', type: 'object', required: false }
    ],
    outputs: [
      { id: 'response_data', name: 'Response Data', type: 'object', required: true }
    ]
  },
  {
    displayName: 'Database',
    nodeType: 'database_query',
    category: 'action',
    defaultConfig: { query: 'SELECT * FROM table', connectionString: 'postgresql://demo' },
    inputs: [
      { id: 'query', name: 'SQL Query', type: 'string', required: true }
    ],
    outputs: [
      { id: 'query_result', name: 'Query Result', type: 'object', required: true }
    ]
  },
  {
    displayName: 'Email',
    nodeType: 'email_send',
    category: 'action',
    defaultConfig: { to: 'test@example.com', subject: 'Test Email', body: 'Hello' },
    inputs: [
      { id: 'to', name: 'To Email', type: 'string', required: true },
      { id: 'subject', name: 'Subject', type: 'string', required: true },
      { id: 'body', name: 'Body', type: 'string', required: true }
    ],
    outputs: [
      { id: 'email_result', name: 'Email Result', type: 'object', required: true }
    ]
  },
  {
    displayName: 'Slack',
    nodeType: 'slack_message',
    category: 'action',
    defaultConfig: { channel: '#general', text: 'Hello from NexAgent!' },
    inputs: [
      { id: 'channel', name: 'Channel', type: 'string', required: true },
      { id: 'text', name: 'Message', type: 'string', required: true }
    ],
    outputs: [
      { id: 'slack_result', name: 'Slack Result', type: 'object', required: true }
    ]
  },
  {
    displayName: 'Save',
    nodeType: 'save_action',
    category: 'action',
    defaultConfig: { data: '{{input}}', key: 'save_key', storageType: 'memory' },
    inputs: [
      { id: 'data', name: 'Data to Save', type: 'object', required: true }
    ],
    outputs: [
      { id: 'save_result', name: 'Save Result', type: 'object', required: true }
    ]
  },
  {
    displayName: 'File Operation',
    nodeType: 'file_operation',
    category: 'action',
    defaultConfig: { operation: 'read', path: '/tmp/sample.txt' },
    inputs: [
      { id: 'operation', name: 'Operation', type: 'string', required: true },
      { id: 'path', name: 'File Path', type: 'string', required: true }
    ],
    outputs: [
      { id: 'file_result', name: 'File Result', type: 'object', required: true }
    ]
  },

  // Logic
  {
    displayName: 'If',
    nodeType: 'if_logic',
    category: 'logic',
    defaultConfig: { condition: true, trueValue: 'true', falseValue: 'false' },
    inputs: [
      { id: 'condition', name: 'Condition', type: 'boolean', required: true },
      { id: 'true_value', name: 'True Value', type: 'any', required: false },
      { id: 'false_value', name: 'False Value', type: 'any', required: false }
    ],
    outputs: [
      { id: 'result', name: 'Result', type: 'any', required: true }
    ]
  },
  {
    displayName: 'Switch',
    nodeType: 'switch',
    category: 'logic',
    defaultConfig: { field: 'type', cases: [{ name: 'default', value: 'default', result: 'default' }] },
    inputs: [
      { id: 'field', name: 'Field', type: 'string', required: true },
      { id: 'cases', name: 'Cases', type: 'array', required: true }
    ],
    outputs: [
      { id: 'switch_result', name: 'Switch Result', type: 'any', required: true }
    ]
  },
  {
    displayName: 'Loop',
    nodeType: 'loop',
    category: 'logic',
    defaultConfig: { items: [], maxIterations: 100 },
    inputs: [
      { id: 'items', name: 'Items', type: 'array', required: true }
    ],
    outputs: [
      { id: 'loop_result', name: 'Loop Result', type: 'array', required: true }
    ]
  },
  {
    displayName: 'Merge',
    nodeType: 'merge',
    category: 'logic',
    defaultConfig: { parallelNodes: [] },
    inputs: [
      { id: 'input1', name: 'Input 1', type: 'any', required: true },
      { id: 'input2', name: 'Input 2', type: 'any', required: true }
    ],
    outputs: [
      { id: 'merged_result', name: 'Merged Result', type: 'object', required: true }
    ]
  },
  {
    displayName: 'Delay',
    nodeType: 'delay',
    category: 'logic',
    defaultConfig: { duration: 1000 },
    inputs: [
      { id: 'duration', name: 'Duration (ms)', type: 'number', required: true }
    ],
    outputs: [
      { id: 'delay_result', name: 'Delay Result', type: 'object', required: true }
    ]
  },

  // AI/ML
  {
    displayName: 'OpenAI',
    nodeType: 'openai_completion',
    category: 'ai_ml',
    defaultConfig: { model: 'gpt-3.5-turbo', prompt: 'Hello world', temperature: 0.7 },
    inputs: [
      { id: 'prompt', name: 'Prompt', type: 'string', required: true },
      { id: 'model', name: 'Model', type: 'string', required: false },
      { id: 'temperature', name: 'Temperature', type: 'number', required: false }
    ],
    outputs: [
      { id: 'completion', name: 'Completion', type: 'string', required: true }
    ]
  },
  {
    displayName: 'Text Analysis',
    nodeType: 'text_analysis',
    category: 'ai_ml',
    defaultConfig: { text: 'Sample text to analyze' },
    inputs: [
      { id: 'text', name: 'Text', type: 'string', required: true }
    ],
    outputs: [
      { id: 'analysis_result', name: 'Analysis Result', type: 'object', required: true }
    ]
  },
  {
    displayName: 'Image Processing',
    nodeType: 'image_processing',
    category: 'ai_ml',
    defaultConfig: { imageUrl: 'https://example.com/image.jpg', width: 800, height: 600 },
    inputs: [
      { id: 'imageUrl', name: 'Image URL', type: 'string', required: true }
    ],
    outputs: [
      { id: 'image_result', name: 'Image Result', type: 'object', required: true }
    ]
  },
  {
    displayName: 'Data Transform',
    nodeType: 'data_transform',
    category: 'ai_ml',
    defaultConfig: { script: 'return input;' },
    inputs: [
      { id: 'input', name: 'Input Data', type: 'any', required: true }
    ],
    outputs: [
      { id: 'transformed_data', name: 'Transformed Data', type: 'any', required: true }
    ]
  },

  // Data
  {
    displayName: 'JSON Parse',
    nodeType: 'json_parse',
    category: 'data',
    defaultConfig: { jsonString: '{"test": "value"}' },
    inputs: [
      { id: 'json_string', name: 'JSON String', type: 'string', required: true }
    ],
    outputs: [
      { id: 'parsed_data', name: 'Parsed Data', type: 'object', required: true }
    ]
  },
  {
    displayName: 'XML Parse',
    nodeType: 'xml_parse',
    category: 'data',
    defaultConfig: { xmlString: '<root><item>test</item></root>' },
    inputs: [
      { id: 'xml_string', name: 'XML String', type: 'string', required: true }
    ],
    outputs: [
      { id: 'parsed_data', name: 'Parsed Data', type: 'object', required: true }
    ]
  },
  {
    displayName: 'CSV Parse',
    nodeType: 'csv_parse',
    category: 'data',
    defaultConfig: { csvString: 'name,age\nJohn,30\nJane,25' },
    inputs: [
      { id: 'csv_string', name: 'CSV String', type: 'string', required: true }
    ],
    outputs: [
      { id: 'parsed_data', name: 'Parsed Data', type: 'array', required: true }
    ]
  },
  {
    displayName: 'Data Filter',
    nodeType: 'data_filter',
    category: 'data',
    defaultConfig: { field: 'value', operator: 'equals', value: 'test' },
    inputs: [
      { id: 'data', name: 'Data to Filter', type: 'array', required: true },
      { id: 'field', name: 'Field', type: 'string', required: true },
      { id: 'operator', name: 'Operator', type: 'string', required: true },
      { id: 'value', name: 'Value', type: 'any', required: true }
    ],
    outputs: [
      { id: 'filtered_data', name: 'Filtered Data', type: 'array', required: true }
    ]
  }
];

/**
 * Get node mapping by display name
 */
export function getNodeMapping(displayName: string): NodeMapping | undefined {
  return NODE_MAPPINGS.find(mapping => mapping.displayName === displayName);
}

/**
 * Get all node mappings by category
 */
export function getNodeMappingsByCategory(category: string): NodeMapping[] {
  return NODE_MAPPINGS.filter(mapping => mapping.category === category);
}

/**
 * Convert canvas node to workflow node
 */
export function convertCanvasNodeToWorkflowNode(
  canvasNode: any,
  nodeMapping: NodeMapping
): any {
  return {
    id: canvasNode.id,
    type: nodeMapping.displayName, // Use displayName as the type
    category: nodeMapping.category,
    name: canvasNode.name || nodeMapping.displayName,
    description: `Node: ${nodeMapping.displayName}`,
    position: { x: canvasNode.x || 0, y: canvasNode.y || 0 },
    config: { ...nodeMapping.defaultConfig, ...(canvasNode.config || {}) },
    inputs: nodeMapping.inputs,
    outputs: nodeMapping.outputs,
    version: '1.0.0',
    enabled: true,
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
