/**
 * HTTP Node - Makes HTTP requests to external APIs
 */

import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class HttpNode implements NodeClass {
  type = 'HttpNode';
  name = 'HTTP Request';
  description = 'Make HTTP requests to external APIs';
  category = 'action' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Validate required configuration
      const validationErrors = this.validate(config);
      if (validationErrors.length > 0) {
        throw new Error(`Configuration validation failed: ${validationErrors.join(', ')}`);
      }

      // Extract configuration
      const { url, method = 'GET', headers = {}, body, timeout = 30000 } = config;
      
      // Make HTTP request
      const httpResult = await this.makeHttpRequest({
        url,
        method: method.toUpperCase(),
        headers,
        body,
        timeout
      });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result: httpResult,
        metadata: {
          executionTime,
          tokensUsed: this.calculateTokens(httpResult.data),
          cost: this.calculateCost(httpResult.data),
          statusCode: httpResult.status,
          responseSize: JSON.stringify(httpResult.data).length
        }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          executionTime,
          tokensUsed: 0,
          cost: 0
        }
      };
    }
  }

  validate(config: Record<string, any>): string[] {
    const errors: string[] = [];

    if (!config.url) {
      errors.push('URL is required');
    }

    if (config.url && !this.isValidUrl(config.url)) {
      errors.push('Invalid URL format');
    }

    if (config.method && !this.isValidMethod(config.method)) {
      errors.push('Invalid HTTP method. Use GET, POST, PUT, DELETE, PATCH, or HEAD');
    }

    if (config.timeout && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
      errors.push('Timeout must be a positive number');
    }

    return errors;
  }

  private async makeHttpRequest(requestData: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: any;
    timeout: number;
  }): Promise<any> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 800));

    // Simulate network errors (15% chance)
    if (Math.random() < 0.15) {
      const errorTypes = [
        'Network timeout',
        'Connection refused',
        'DNS resolution failed',
        'SSL certificate error'
      ];
      const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];
      throw new Error(randomError);
    }

    // Simulate HTTP status codes
    const statusCodes = [200, 201, 400, 401, 403, 404, 500, 502, 503];
    const status = statusCodes[Math.floor(Math.random() * statusCodes.length)];

    // Simulate different response types based on URL
    let responseData: any;
    if (requestData.url.includes('api.example.com')) {
      responseData = {
        success: true,
        message: 'Request processed successfully',
        timestamp: new Date().toISOString(),
        data: {
          id: Math.floor(Math.random() * 10000),
          name: 'Sample Data',
          value: Math.random() * 100
        }
      };
    } else if (requestData.url.includes('jsonplaceholder.typicode.com')) {
      responseData = {
        id: Math.floor(Math.random() * 100),
        title: 'Sample Post',
        body: 'This is a sample response body',
        userId: Math.floor(Math.random() * 10)
      };
    } else {
      responseData = {
        message: 'Generic API response',
        timestamp: new Date().toISOString(),
        requestMethod: requestData.method,
        requestUrl: requestData.url
      };
    }

    return {
      status,
      statusText: this.getStatusText(status),
      headers: {
        'content-type': 'application/json',
        'x-request-id': `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        'x-response-time': `${Math.floor(Math.random() * 1000)}ms`
      },
      data: responseData,
      config: {
        url: requestData.url,
        method: requestData.method,
        timeout: requestData.timeout
      }
    };
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidMethod(method: string): boolean {
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    return validMethods.includes(method.toUpperCase());
  }

  private getStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable'
    };
    return statusTexts[status] || 'Unknown';
  }

  private calculateTokens(data: any): number {
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    return Math.ceil(text.length / 4);
  }

  private calculateCost(data: any): number {
    const tokens = this.calculateTokens(data);
    return tokens * 0.0001; // $0.0001 per token
  }
}
