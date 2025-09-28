/**
 * HTTP Request Trigger Node
 * Triggers workflow via HTTP request
 */

import { NodeHandler, NodeCategory, ValidationError } from '../../types';

export class HttpRequestTrigger implements NodeHandler {
  type = 'http_request_trigger';
  category = NodeCategory.TRIGGER;
  name = 'HTTP Request Trigger';
  description = 'Triggers workflow via HTTP request';

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
    }
  ];

  outputs = [
    {
      id: 'request_data',
      name: 'Request Data',
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
      body: { type: 'object' }
    },
    required: ['url']
  };

  async execute(context: any, config: any): Promise<any> {
    const { url, method = 'GET', headers = {}, body } = config;

    // Simulate HTTP request processing
    const requestData = {
      url,
      method,
      headers,
      body,
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
      query: context.query || {},
      params: context.params || {}
    };

    return {
      success: true,
      result: requestData,
      metadata: {
        executionTime: 100,
        tokensUsed: 0,
        cost: 0
      }
    };
  }

  validate(config: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!config.url) {
      errors.push({
        type: 'error',
        code: 'MISSING_URL',
        message: 'URL is required for HTTP request trigger',
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

    return errors;
  }
}
