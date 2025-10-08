/**
 * Save Action Node
 * Saves data to storage
 */

import { NodeHandler, NodeCategory, ValidationError } from '../../types';

export class SaveAction implements NodeHandler {
  type = 'save_action';
  category = NodeCategory.ACTION;
  name = 'Save Data';
  description = 'Save data to storage';

  inputs = [
    {
      id: 'data',
      name: 'Data to Save',
      type: 'object',
      required: true
    },
    {
      id: 'key',
      name: 'Storage Key',
      type: 'string',
      required: false
    }
  ];

  outputs = [
    {
      id: 'save_result',
      name: 'Save Result',
      type: 'object',
      required: true
    }
  ];

  configSchema = {
    type: 'object',
    properties: {
      data: { type: 'object' },
      key: { type: 'string' },
      storageType: { type: 'string', enum: ['memory', 'localStorage', 'database'] },
      overwrite: { type: 'boolean' }
    },
    required: ['data']
  };

  async execute(context: any, config: any): Promise<any> {
    const { data, key, storageType = 'memory', overwrite = true } = config;

    try {
      // Simulate save operation
      const saveKey = key || `save_${Date.now()}`;
      const saveResult = {
        key: saveKey,
        data,
        storageType,
        overwrite,
        savedAt: new Date().toISOString(),
        size: JSON.stringify(data).length,
        success: true
      };

      // In a real implementation, this would actually save to the specified storage
      console.log(`[SAVE] Saving data with key: ${saveKey}`, data);

      return {
        success: true,
        result: saveResult,
        metadata: {
          executionTime: 50,
          tokensUsed: 0,
          cost: 0
        }
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        metadata: {
          executionTime: 25,
          tokensUsed: 0,
          cost: 0,
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  validate(config: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!config.data) {
      errors.push({
        type: 'error',
        code: 'MISSING_DATA',
        message: 'Data to save is required',
        field: 'data'
      });
    }

    if (config.storageType && !['memory', 'localStorage', 'database'].includes(config.storageType)) {
      errors.push({
        type: 'error',
        code: 'INVALID_STORAGE_TYPE',
        message: 'Invalid storage type',
        field: 'storageType'
      });
    }

    if (config.key && typeof config.key !== 'string') {
      errors.push({
        type: 'error',
        code: 'INVALID_KEY',
        message: 'Storage key must be a string',
        field: 'key'
      });
    }

    return errors;
  }
}
