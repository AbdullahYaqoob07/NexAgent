/**
 * JSON Parse Node
 * Parse JSON data
 */

import { NodeHandler, NodeCategory, ValidationError } from '../../types';

export class JsonParseNode implements NodeHandler {
  type = 'json_parse';
  category = NodeCategory.DATA;
  name = 'JSON Parse';
  description = 'Parse JSON data';

  inputs = [
    {
      id: 'json_string',
      name: 'JSON String',
      type: 'string',
      required: true
    }
  ];

  outputs = [
    {
      id: 'parsed_data',
      name: 'Parsed Data',
      type: 'object',
      required: true
    }
  ];

  configSchema = {
    type: 'object',
    properties: {
      jsonString: { type: 'string' },
      validate: { type: 'boolean' },
      schema: { type: 'object' }
    },
    required: ['jsonString']
  };

  async execute(context: any, config: any): Promise<any> {
    const { jsonString, validate = true, schema } = config;

    try {
      const startTime = Date.now();
      
      // Parse JSON
      const parsed = JSON.parse(jsonString);
      
      // Validate if requested
      if (validate && schema) {
        this.validateAgainstSchema(parsed, schema);
      }

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result: {
          data: parsed,
          valid: true,
          size: jsonString.length,
          parsedAt: new Date().toISOString()
        },
        metadata: {
          executionTime,
          tokensUsed: 0,
          cost: 0
        }
      };
    } catch (error) {
      return {
        success: false,
        result: {
          data: null,
          valid: false,
          error: error instanceof Error ? error.message : String(error),
          size: jsonString.length,
          parsedAt: new Date().toISOString()
        },
        metadata: {
          executionTime: 10,
          tokensUsed: 0,
          cost: 0
        }
      };
    }
  }

  validate(config: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!config.jsonString) {
      errors.push({
        type: 'error',
        code: 'MISSING_JSON_STRING',
        message: 'JSON string is required for parsing',
        field: 'jsonString'
      });
    } else {
      // Validate JSON format
      try {
        JSON.parse(config.jsonString);
      } catch {
        errors.push({
          type: 'error',
          code: 'INVALID_JSON',
          message: 'Invalid JSON format',
          field: 'jsonString'
        });
      }
    }

    if (config.validate && !config.schema) {
      errors.push({
        type: 'warning',
        code: 'MISSING_SCHEMA',
        message: 'Schema is recommended when validation is enabled',
        field: 'schema'
      });
    }

    return errors;
  }

  private validateAgainstSchema(data: any, schema: any): void {
    // Basic schema validation (in a real implementation, use a proper JSON schema validator)
    if (schema.type && typeof data !== schema.type) {
      throw new Error(`Expected ${schema.type}, got ${typeof data}`);
    }

    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (!(field in data)) {
          throw new Error(`Required field '${field}' is missing`);
        }
      }
    }
  }
}
