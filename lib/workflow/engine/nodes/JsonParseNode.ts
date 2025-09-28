/**
 * JSON Parse Node - Parse JSON data
 */

import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class JsonParseNode implements NodeClass {
  type = 'JsonParseNode';
  name = 'JSON Parse';
  description = 'Parse JSON data';
  category = 'data' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const validationErrors = this.validate(config);
      if (validationErrors.length > 0) {
        throw new Error(`Configuration validation failed: ${validationErrors.join(', ')}`);
      }

      const { jsonString, validateSchema, schema } = config;
      
      const parseResult = await this.parseJson({
        jsonString,
        validateSchema: validateSchema || false,
        schema: schema || null
      });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result: parseResult,
        metadata: {
          executionTime,
          tokensUsed: this.calculateTokens(parseResult),
          cost: this.calculateCost(parseResult),
          isValid: parseResult.isValid,
          parsedKeys: parseResult.parsedKeys,
          dataSize: jsonString.length
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

    if (!config.jsonString) {
      errors.push('JSON string is required');
    }

    if (config.jsonString && typeof config.jsonString !== 'string') {
      errors.push('JSON string must be a string');
    }

    if (config.validateSchema && !config.schema) {
      errors.push('Schema is required when validation is enabled');
    }

    return errors;
  }

  private async parseJson(parseData: {
    jsonString: string;
    validateSchema: boolean;
    schema: any;
  }): Promise<any> {
    // Simulate parsing delay
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 150));

    try {
      // Parse JSON
      const parsed = JSON.parse(parseData.jsonString);
      
      // Validate schema if requested
      if (parseData.validateSchema && parseData.schema) {
        const validationResult = this.validateSchema(parsed, parseData.schema);
        if (!validationResult.isValid) {
          throw new Error(`Schema validation failed: ${validationResult.errors.join(', ')}`);
        }
      }

      // Get parsed keys
      const parsedKeys = this.getObjectKeys(parsed);

      return {
        data: parsed,
        isValid: true,
        parsedKeys,
        originalString: parseData.jsonString,
        parsedAt: new Date().toISOString(),
        size: parseData.jsonString.length
      };

    } catch (error) {
      return {
        data: null,
        isValid: false,
        error: error instanceof Error ? error.message : 'JSON parsing failed',
        originalString: parseData.jsonString,
        parsedAt: new Date().toISOString(),
        size: parseData.jsonString.length
      };
    }
  }

  private validateSchema(data: any, schema: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic schema validation
    if (schema.type) {
      if (schema.type === 'object' && typeof data !== 'object') {
        errors.push('Expected object type');
      } else if (schema.type === 'array' && !Array.isArray(data)) {
        errors.push('Expected array type');
      } else if (schema.type === 'string' && typeof data !== 'string') {
        errors.push('Expected string type');
      } else if (schema.type === 'number' && typeof data !== 'number') {
        errors.push('Expected number type');
      } else if (schema.type === 'boolean' && typeof data !== 'boolean') {
        errors.push('Expected boolean type');
      }
    }

    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (!(field in data)) {
          errors.push(`Required field '${field}' is missing`);
        }
      }
    }

    if (schema.properties && typeof data === 'object' && data !== null) {
      for (const [key, value] of Object.entries(schema.properties)) {
        if (key in data) {
          const fieldSchema = value as any;
          if (fieldSchema.type && typeof data[key] !== fieldSchema.type) {
            errors.push(`Field '${key}' has wrong type. Expected ${fieldSchema.type}, got ${typeof data[key]}`);
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private getObjectKeys(obj: any, prefix = ''): string[] {
    const keys: string[] = [];
    
    if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        keys.push(fullKey);
        
        if (typeof value === 'object' && value !== null) {
          keys.push(...this.getObjectKeys(value, fullKey));
        }
      }
    }
    
    return keys;
  }

  private calculateTokens(data: any): number {
    const text = JSON.stringify(data);
    return Math.ceil(text.length / 4);
  }

  private calculateCost(data: any): number {
    const tokens = this.calculateTokens(data);
    return tokens * 0.00001; // $0.00001 per token
  }
}
