/**
 * Custom Fork Node - Splits input into configurable number of parallel execution paths
 */

import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class CustomForkNode implements NodeClass {
  type = 'CustomForkNode';
  name = 'Custom Fork';
  description = 'Splits input data into configurable number of parallel execution paths';
  category = 'fork' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Validate required configuration
      const validationErrors = this.validate(config);
      if (validationErrors.length > 0) {
        throw new Error(`Configuration validation failed: ${validationErrors.join(', ')}`);
      }

      // Extract configuration
      const { 
        splitType = 'duplicate',
        outputCount = 2,
        description = `Splits input into ${outputCount} parallel paths`
      } = config;

      // Get input data from context
      const inputData = this.extractInputData(context);
      
      // Execute fork operation
      const forkResult = await this.executeFork(inputData, splitType, outputCount);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result: forkResult,
        metadata: {
          executionTime,
          tokensUsed: 0,
          cost: 0,
          splitType,
          outputCount,
          inputDataSize: this.getDataSize(inputData)
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

    if (config.splitType && !this.isValidSplitType(config.splitType)) {
      errors.push('Invalid split type. Use: duplicate, distribute, or round_robin');
    }

    if (!config.outputCount) {
      errors.push('Output count is required');
    }

    if (config.outputCount && (typeof config.outputCount !== 'number' || config.outputCount < 2 || config.outputCount > 10)) {
      errors.push('Output count must be a number between 2 and 10');
    }

    return errors;
  }

  private extractInputData(context: ExecutionContext): any {
    // Look for data from previous nodes in the context
    const contextKeys = Object.keys(context);
    const dataKeys = contextKeys.filter(key => key.endsWith('_output'));
    
    if (dataKeys.length > 0) {
      // Use the most recent output data
      const latestKey = dataKeys[dataKeys.length - 1];
      return context[latestKey];
    }
    
    // Fallback to any available data
    return context.input || context.data || { message: 'No input data available' };
  }

  private async executeFork(inputData: any, splitType: string, outputCount: number): Promise<any> {
    // Simulate processing delay based on output count
    await new Promise(resolve => setTimeout(resolve, 50 + (outputCount * 10)));

    const outputs: Record<string, any> = {};
    const outputMetadata: Record<string, number> = {};

    switch (splitType) {
      case 'duplicate':
        // Duplicate the input to all outputs
        for (let i = 1; i <= outputCount; i++) {
          const outputKey = `output_${i}`;
          outputs[outputKey] = this.deepClone(inputData);
          outputMetadata[`${outputKey}Size`] = this.getDataSize(outputs[outputKey]);
        }
        break;
        
      case 'distribute':
        // If input is an array, distribute elements
        if (Array.isArray(inputData)) {
          const chunkSize = Math.ceil(inputData.length / outputCount);
          for (let i = 1; i <= outputCount; i++) {
            const outputKey = `output_${i}`;
            const startIndex = (i - 1) * chunkSize;
            const endIndex = Math.min(startIndex + chunkSize, inputData.length);
            outputs[outputKey] = inputData.slice(startIndex, endIndex);
            outputMetadata[`${outputKey}Size`] = this.getDataSize(outputs[outputKey]);
          }
        } else {
          // For objects, distribute properties
          const keys = Object.keys(inputData);
          const chunkSize = Math.ceil(keys.length / outputCount);
          
          for (let i = 1; i <= outputCount; i++) {
            const outputKey = `output_${i}`;
            const startIndex = (i - 1) * chunkSize;
            const endIndex = Math.min(startIndex + chunkSize, keys.length);
            const chunkKeys = keys.slice(startIndex, endIndex);
            
            outputs[outputKey] = {};
            chunkKeys.forEach(key => {
              outputs[outputKey][key] = inputData[key];
            });
            outputMetadata[`${outputKey}Size`] = this.getDataSize(outputs[outputKey]);
          }
        }
        break;
        
      case 'round_robin':
        // Initialize all outputs
        for (let i = 1; i <= outputCount; i++) {
          const outputKey = `output_${i}`;
          outputs[outputKey] = Array.isArray(inputData) ? [] : {};
        }
        
        // Distribute data in round-robin fashion
        if (Array.isArray(inputData)) {
          inputData.forEach((item, index) => {
            const outputIndex = (index % outputCount) + 1;
            const outputKey = `output_${outputIndex}`;
            outputs[outputKey].push(item);
          });
        } else {
          const keys = Object.keys(inputData);
          keys.forEach((key, index) => {
            const outputIndex = (index % outputCount) + 1;
            const outputKey = `output_${outputIndex}`;
            outputs[outputKey][key] = inputData[key];
          });
        }
        
        // Calculate metadata for round-robin
        for (let i = 1; i <= outputCount; i++) {
          const outputKey = `output_${i}`;
          outputMetadata[`${outputKey}Size`] = this.getDataSize(outputs[outputKey]);
        }
        break;
        
      default:
        // Fallback to duplicate
        for (let i = 1; i <= outputCount; i++) {
          const outputKey = `output_${i}`;
          outputs[outputKey] = this.deepClone(inputData);
          outputMetadata[`${outputKey}Size`] = this.getDataSize(outputs[outputKey]);
        }
    }

    return {
      success: true,
      splitType: splitType,
      inputData: inputData,
      outputs: outputs,
      outputCount: outputCount,
      timestamp: new Date().toISOString(),
      metadata: {
        originalInputSize: this.getDataSize(inputData),
        ...outputMetadata
      }
    };
  }

  private isValidSplitType(splitType: string): boolean {
    const validTypes = ['duplicate', 'distribute', 'round_robin'];
    return validTypes.includes(splitType);
  }

  private deepClone(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item));
    }
    
    const cloned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    
    return cloned;
  }

  private getDataSize(data: any): number {
    if (data === null || data === undefined) {
      return 0;
    }
    
    if (typeof data === 'string') {
      return data.length;
    }
    
    if (Array.isArray(data)) {
      return data.length;
    }
    
    if (typeof data === 'object') {
      return Object.keys(data).length;
    }
    
    return 1;
  }
}