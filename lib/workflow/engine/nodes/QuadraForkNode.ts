/**
 * Quadra Fork Node - Splits input into 4 parallel execution paths
 */

import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class QuadraForkNode implements NodeClass {
  type = 'QuadraForkNode';
  name = 'Quadra Fork';
  description = 'Splits input data into 4 parallel execution paths';
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
        description = 'Splits input into 4 parallel paths'
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
          outputCount: 4,
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
    await new Promise(resolve => setTimeout(resolve, 80));

    let output1: any;
    let output2: any;
    let output3: any;
    let output4: any;

    switch (splitType) {
      case 'duplicate':
        // Duplicate the input to all outputs
        output1 = this.deepClone(inputData);
        output2 = this.deepClone(inputData);
        output3 = this.deepClone(inputData);
        output4 = this.deepClone(inputData);
        break;
        
      case 'distribute':
        // If input is an array, distribute elements
        if (Array.isArray(inputData)) {
          const quarter = Math.ceil(inputData.length / 4);
          output1 = inputData.slice(0, quarter);
          output2 = inputData.slice(quarter, quarter * 2);
          output3 = inputData.slice(quarter * 2, quarter * 3);
          output4 = inputData.slice(quarter * 3);
        } else {
          // For objects, split properties
          const keys = Object.keys(inputData);
          const quarter = Math.ceil(keys.length / 4);
          const keys1 = keys.slice(0, quarter);
          const keys2 = keys.slice(quarter, quarter * 2);
          const keys3 = keys.slice(quarter * 2, quarter * 3);
          const keys4 = keys.slice(quarter * 3);
          
          output1 = {};
          output2 = {};
          output3 = {};
          output4 = {};
          
          keys1.forEach(key => output1[key] = inputData[key]);
          keys2.forEach(key => output2[key] = inputData[key]);
          keys3.forEach(key => output3[key] = inputData[key]);
          keys4.forEach(key => output4[key] = inputData[key]);
        }
        break;
        
      case 'round_robin':
        // For arrays, distribute by index modulo
        if (Array.isArray(inputData)) {
          output1 = inputData.filter((_, index) => index % 4 === 0);
          output2 = inputData.filter((_, index) => index % 4 === 1);
          output3 = inputData.filter((_, index) => index % 4 === 2);
          output4 = inputData.filter((_, index) => index % 4 === 3);
        } else {
          // For objects, distribute keys by index modulo
          const keys = Object.keys(inputData);
          const keys1 = keys.filter((_, index) => index % 4 === 0);
          const keys2 = keys.filter((_, index) => index % 4 === 1);
          const keys3 = keys.filter((_, index) => index % 4 === 2);
          const keys4 = keys.filter((_, index) => index % 4 === 3);
          
          output1 = {};
          output2 = {};
          output3 = {};
          output4 = {};
          
          keys1.forEach(key => output1[key] = inputData[key]);
          keys2.forEach(key => output2[key] = inputData[key]);
          keys3.forEach(key => output3[key] = inputData[key]);
          keys4.forEach(key => output4[key] = inputData[key]);
        }
        break;
        
      default:
        output1 = this.deepClone(inputData);
        output2 = this.deepClone(inputData);
        output3 = this.deepClone(inputData);
        output4 = this.deepClone(inputData);
    }

    return {
      success: true,
      splitType: splitType,
      inputData: inputData,
      outputs: {
        output_1: output1,
        output_2: output2,
        output_3: output3,
        output_4: output4
      },
      outputCount: 4,
      timestamp: new Date().toISOString(),
      metadata: {
        originalInputSize: this.getDataSize(inputData),
        output1Size: this.getDataSize(output1),
        output2Size: this.getDataSize(output2),
        output3Size: this.getDataSize(output3),
        output4Size: this.getDataSize(output4)
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