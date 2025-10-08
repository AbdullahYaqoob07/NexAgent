/**
 * Double Fork Node - Splits input into 2 parallel execution paths
 */

import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class DoubleForkNode implements NodeClass {
  type = 'DoubleForkNode';
  name = 'Double Fork';
  description = 'Splits input data into 2 parallel execution paths';
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
        description = 'Splits input into 2 parallel paths'
      } = config;

      // Get input data from context
      const inputData = this.extractInputData(context);
      
      // Execute fork operation
      const forkResult = await this.executeFork(inputData, splitType);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result: forkResult,
        metadata: {
          executionTime,
          tokensUsed: 0,
          cost: 0,
          splitType,
          outputCount: 2,
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

  private async executeFork(inputData: any, splitType: string): Promise<any> {
    // Simulate minimal processing delay
    await new Promise(resolve => setTimeout(resolve, 50));

    let output1: any;
    let output2: any;

    switch (splitType) {
      case 'duplicate':
        // Duplicate the input to both outputs
        output1 = this.deepClone(inputData);
        output2 = this.deepClone(inputData);
        break;
        
      case 'distribute':
        // If input is an array, distribute elements
        if (Array.isArray(inputData)) {
          const mid = Math.ceil(inputData.length / 2);
          output1 = inputData.slice(0, mid);
          output2 = inputData.slice(mid);
        } else {
          // For objects, split properties
          const keys = Object.keys(inputData);
          const mid = Math.ceil(keys.length / 2);
          const keys1 = keys.slice(0, mid);
          const keys2 = keys.slice(mid);
          
          output1 = {};
          output2 = {};
          
          keys1.forEach(key => output1[key] = inputData[key]);
          keys2.forEach(key => output2[key] = inputData[key]);
        }
        break;
        
      case 'round_robin':
        // For arrays, alternate elements
        if (Array.isArray(inputData)) {
          output1 = inputData.filter((_, index) => index % 2 === 0);
          output2 = inputData.filter((_, index) => index % 2 === 1);
        } else {
          // For objects, alternate keys
          const keys = Object.keys(inputData);
          const keys1 = keys.filter((_, index) => index % 2 === 0);
          const keys2 = keys.filter((_, index) => index % 2 === 1);
          
          output1 = {};
          output2 = {};
          
          keys1.forEach(key => output1[key] = inputData[key]);
          keys2.forEach(key => output2[key] = inputData[key]);
        }
        break;
        
      default:
        output1 = this.deepClone(inputData);
        output2 = this.deepClone(inputData);
    }

    return {
      success: true,
      splitType: splitType,
      inputData: inputData,
      outputs: {
        output_1: output1,
        output_2: output2
      },
      outputCount: 2,
      timestamp: new Date().toISOString(),
      metadata: {
        originalInputSize: this.getDataSize(inputData),
        output1Size: this.getDataSize(output1),
        output2Size: this.getDataSize(output2)
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