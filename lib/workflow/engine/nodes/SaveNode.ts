/**
 * Save Node - Saves data to storage
 */

import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class SaveNode implements NodeClass {
  type = 'SaveNode';
  name = 'Save Data';
  description = 'Save data to storage';
  category = 'action' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const validationErrors = this.validate(config);
      if (validationErrors.length > 0) {
        throw new Error(`Configuration validation failed: ${validationErrors.join(', ')}`);
      }

      const { data, key, storageType = 'memory' } = config;
      
      const saveResult = await this.saveData({
        data,
        key: key || `save_${Date.now()}`,
        storageType
      });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result: saveResult,
        metadata: {
          executionTime,
          tokensUsed: this.calculateTokens(data),
          cost: this.calculateCost(data),
          storageType,
          dataSize: JSON.stringify(data).length
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

    if (config.data === undefined || config.data === null) {
      errors.push('Data to save is required');
    }

    if (config.storageType && !this.isValidStorageType(config.storageType)) {
      errors.push('Invalid storage type. Use memory, file, or database');
    }

    return errors;
  }

  private async saveData(saveData: {
    data: any;
    key: string;
    storageType: string;
  }): Promise<any> {
    // Simulate save operation delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 300));

    // Simulate storage errors (5% chance)
    if (Math.random() < 0.05) {
      throw new Error('Storage operation failed');
    }

    // Simulate different storage types
    let result: any;

    switch (saveData.storageType) {
      case 'memory':
        result = {
          id: saveData.key,
          status: 'saved',
          storageType: 'memory',
          timestamp: new Date().toISOString(),
          size: JSON.stringify(saveData.data).length
        };
        break;
      case 'file':
        result = {
          id: saveData.key,
          status: 'saved',
          storageType: 'file',
          filePath: `/tmp/${saveData.key}.json`,
          timestamp: new Date().toISOString(),
          size: JSON.stringify(saveData.data).length
        };
        break;
      case 'database':
        result = {
          id: saveData.key,
          status: 'saved',
          storageType: 'database',
          table: 'workflow_data',
          recordId: Math.floor(Math.random() * 10000),
          timestamp: new Date().toISOString(),
          size: JSON.stringify(saveData.data).length
        };
        break;
      default:
        result = {
          id: saveData.key,
          status: 'saved',
          storageType: saveData.storageType,
          timestamp: new Date().toISOString(),
          size: JSON.stringify(saveData.data).length
        };
    }

    return result;
  }

  private isValidStorageType(storageType: string): boolean {
    const validTypes = ['memory', 'file', 'database', 's3', 'redis'];
    return validTypes.includes(storageType);
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
