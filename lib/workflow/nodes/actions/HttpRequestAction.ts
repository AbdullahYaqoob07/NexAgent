/**
 * HTTP Request Action Node
 * Makes HTTP requests to external APIs
 */

import { NodeHandler, NodeCategory, ValidationError } from '../../types';

export class HttpRequestAction implements NodeHandler {
  type = 'http_request_action';
  category = NodeCategory.ACTION;
  name = 'HTTP Request';
  description = 'Make HTTP requests to external APIs';

  inputs = [
    {
      id: 'url',
      name: 'URL',
      type: 'string',
      required: true
    },
    {
      id: 'method',
      name: 'Method',
      type: 'string',
      required: false
    },
    {
      id: 'headers',
      name: 'Headers',
      type: 'object',
      required: false
    },
    {
      id: 'body',
      name: 'Body',
      type: 'object',
      required: false
    }
  ];

  outputs = [
    {
      id: 'response_data',
      name: 'Response Data',
      type: 'object',
      required: true
    }
  ];

  configSchema = {
    type: 'object',
    properties: {
      url: { type: 'string', format: 'uri' },
      method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
      headers: { type: 'object' },
      body: { type: 'object' },
      timeout: { type: 'number' },
      retries: { type: 'number' }
    },
    required: ['url']
  };

  async execute(context: any, config: any): Promise<any> {
    const { url, method = 'GET', headers = {}, body, timeout = 30000, retries = 3 } = config;

    try {
      // In a real implementation, this would make an actual HTTP request
      // For now, we'll simulate the request
      const response = await this.simulateHttpRequest(url, method, headers, body, timeout);

      return {
        success: true,
        result: response,
        metadata: {
          executionTime: Math.random() * 1000 + 200,
          tokensUsed: 0,
          cost: 0.001
        }
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        metadata: {
          executionTime: 100,
          tokensUsed: 0,
          cost: 0,
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  validate(config: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!config.url) {
      errors.push({
        type: 'error',
        code: 'MISSING_URL',
        message: 'URL is required for HTTP request',
        field: 'url'
      });
    } else {
      try {
        new URL(config.url);
      } catch {
        errors.push({
          type: 'error',
          code: 'INVALID_URL',
          message: 'Invalid URL format',
          field: 'url'
        });
      }
    }

    if (config.method && !['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method)) {
      errors.push({
        type: 'error',
        code: 'INVALID_METHOD',
        message: 'Invalid HTTP method',
        field: 'method'
      });
    }

    if (config.timeout && (config.timeout < 1000 || config.timeout > 300000)) {
      errors.push({
        type: 'error',
        code: 'INVALID_TIMEOUT',
        message: 'Timeout must be between 1000ms and 300000ms',
        field: 'timeout'
      });
    }

    return errors;
  }

  private async simulateHttpRequest(
    url: string, 
    method: string, 
    headers: any, 
    body: any, 
    timeout: number
  ): Promise<any> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));

    // Generate realistic mock response based on URL pattern
    let mockData;
    if (url.includes('users')) {
      mockData = {
        users: [
          { id: 1, name: 'John Doe', email: 'john@example.com' },
          { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
        ],
        total: 2,
        page: 1
      };
    } else if (url.includes('posts')) {
      mockData = {
        posts: [
          { id: 1, title: 'Sample Post', content: 'This is a sample post' },
          { id: 2, title: 'Another Post', content: 'This is another post' }
        ],
        total: 2
      };
    } else {
      mockData = {
        message: 'Request successful',
        url,
        method,
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`
      };
    }

    return {
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'application/json',
        ...headers
      },
      data: mockData,
      config: {
        url,
        method,
        headers,
        body
      }
    };
  }
}
