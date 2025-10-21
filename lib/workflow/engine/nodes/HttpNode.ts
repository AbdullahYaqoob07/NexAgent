/**
 * HTTP Node - Makes real HTTP requests to external APIs (server-side)
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
      const validationErrors = this.validate(config);
      if (validationErrors.length > 0) {
        throw new Error(`Configuration validation failed: ${validationErrors.join(', ')}`);
      }

      const method = String((config.method || 'GET')).toUpperCase();
      const timeout = Number(config.timeout || 30000);
      const maxResponseSize = Number(config.maxResponseSize || 5 * 1024 * 1024); // 5MB default

      // Build URL with optional paramsList
      let url = String(config.url);
      if (Array.isArray(config.paramsList) && config.paramsList.length > 0) {
        try {
          const u = new URL(url);
          for (const p of config.paramsList) {
            if (p?.key) u.searchParams.set(p.key, p.value ?? '');
          }
          url = u.toString();
        } catch { /* ignore, keep original url */ }
      }

      // Headers
      const headers: Record<string, string> = { ...(config.headers || {}) };
      // Default content-type for JSON bodies
      const hasBody = !['GET', 'HEAD'].includes(method) && config.body !== undefined && config.body !== null;
      if (hasBody && !Object.keys(headers).some(h => h.toLowerCase() === 'content-type')) {
        headers['Content-Type'] = 'application/json';
      }
      // User-Agent
      if (!Object.keys(headers).some(h => h.toLowerCase() === 'user-agent')) {
        headers['User-Agent'] = 'NexAgent-HTTPNode/1.0';
      }

      // Body serialization
      let body: any = undefined;
      if (hasBody) {
        const ct = Object.entries(headers).find(([k]) => k.toLowerCase() === 'content-type')?.[1] || '';
        if (typeof config.body === 'string') {
          body = config.body;
        } else if (ct.includes('application/json')) {
          body = JSON.stringify(config.body);
        } else {
          // Fallback to JSON
          body = JSON.stringify(config.body);
        }
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const requestInit: RequestInit = {
        method,
        headers,
        body,
        signal: controller.signal,
        redirect: 'follow',
      };

      // Retry policy (exponential backoff) on network errors and 5xx
      const maxRetries = Number(config.retryCount ?? 0);
      let attempt = 0;
      let response: Response;
      while (true) {
        try {
          response = await fetch(url, requestInit);
          if (response.status >= 500 && attempt < maxRetries) {
            attempt++;
            await this.delay(2 ** attempt * 200);
            continue;
          }
          break;
        } catch (err) {
          if (attempt < maxRetries && (err instanceof Error)) {
            attempt++;
            await this.delay(2 ** attempt * 200);
            continue;
          }
          throw err;
        }
      }

      clearTimeout(timer);

      // Extract headers
      const respHeaders: Record<string, string> = {};
      response.headers.forEach((v, k) => { respHeaders[k] = v; });

      const contentType = response.headers.get('content-type') || '';
      const contentLengthHeader = response.headers.get('content-length');
      const contentLength = contentLengthHeader ? Number(contentLengthHeader) : undefined;

      // Read body with size protection
      let data: any = null;
      if (contentType.includes('application/json')) {
        const text = await response.text();
        const limited = text.length > maxResponseSize ? text.slice(0, maxResponseSize) : text;
        try { data = JSON.parse(limited); } catch { data = limited; }
      } else if (contentType.startsWith('text/')) {
        const text = await response.text();
        data = text.length > maxResponseSize ? text.slice(0, maxResponseSize) : text;
      } else {
        const buf = Buffer.from(await response.arrayBuffer());
        const limited = buf.length > maxResponseSize ? buf.subarray(0, maxResponseSize) : buf;
        data = limited.toString('base64');
      }

      const executionTime = Date.now() - startTime;
      const resultPayload = {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        redirected: response.redirected,
        headers: respHeaders,
        contentType,
        contentLength,
        data,
      };

      const success = response.ok;

      return {
        success,
        result: resultPayload,
        error: success ? undefined : `HTTP ${response.status} ${response.statusText}`,
        metadata: {
          executionTime,
          statusCode: response.status,
          retryCountUsed: attempt,
          responseSize: (typeof data === 'string') ? data.length : JSON.stringify(data).length,
        },
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: { executionTime },
      };
    }
  }

  validate(config: Record<string, any>): string[] {
    const errors: string[] = [];
    if (!config?.url) errors.push('URL is required');
    if (config?.url && !this.isValidUrl(config.url)) errors.push('Invalid URL format');
    if (config?.method && !this.isValidMethod(config.method)) errors.push('Invalid HTTP method');
    if (config?.timeout && (typeof config.timeout !== 'number' || config.timeout <= 0)) errors.push('Timeout must be a positive number');
    return errors;
  }

  private isValidUrl(url: string): boolean {
    try { new URL(url); return true; } catch { return false; }
  }

  private isValidMethod(method: string): boolean {
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    return validMethods.includes(String(method).toUpperCase());
  }

  private delay(ms: number) {
    return new Promise(res => setTimeout(res, ms));
  }
}
