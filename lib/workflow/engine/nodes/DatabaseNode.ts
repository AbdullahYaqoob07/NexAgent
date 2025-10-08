/**
 * Database Node - Executes database queries
 */

import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class DatabaseNode implements NodeClass {
  type = 'DatabaseNode';
  name = 'Database Query';
  description = 'Execute database queries';
  category = 'action' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const validationErrors = this.validate(config);
      if (validationErrors.length > 0) {
        throw new Error(`Configuration validation failed: ${validationErrors.join(', ')}`);
      }

      const { query, connectionString, database, table } = config;
      
      const dbResult = await this.executeQuery({
        query,
        connectionString: connectionString || 'postgresql://demo:demo@localhost:5432/demo',
        database: database || 'demo',
        table: table || 'users'
      });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result: dbResult,
        metadata: {
          executionTime,
          tokensUsed: this.calculateTokens(dbResult),
          cost: this.calculateCost(dbResult),
          rowCount: dbResult.rowCount,
          queryType: this.getQueryType(query)
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

    if (!config.query) {
      errors.push('SQL query is required');
    }

    if (config.query && !this.isValidQuery(config.query)) {
      errors.push('Invalid SQL query format');
    }

    return errors;
  }

  private async executeQuery(queryData: {
    query: string;
    connectionString: string;
    database: string;
    table: string;
  }): Promise<any> {
    // Simulate database connection delay
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 700));

    // Simulate connection errors (10% chance)
    if (Math.random() < 0.1) {
      throw new Error('Database connection failed');
    }

    // Simulate query execution
    const queryType = this.getQueryType(queryData.query);
    let result: any;

    switch (queryType) {
      case 'SELECT':
        result = {
          rows: this.generateSampleRows(queryData.table),
          rowCount: Math.floor(Math.random() * 100) + 1,
          fields: ['id', 'name', 'email', 'created_at']
        };
        break;
      case 'INSERT':
        result = {
          rowCount: 1,
          insertId: Math.floor(Math.random() * 10000),
          message: 'Record inserted successfully'
        };
        break;
      case 'UPDATE':
        result = {
          rowCount: Math.floor(Math.random() * 10) + 1,
          message: 'Records updated successfully'
        };
        break;
      case 'DELETE':
        result = {
          rowCount: Math.floor(Math.random() * 5) + 1,
          message: 'Records deleted successfully'
        };
        break;
      default:
        result = {
          rowCount: 0,
          message: 'Query executed successfully'
        };
    }

    return {
      ...result,
      query: queryData.query,
      executionTime: Math.floor(Math.random() * 1000) + 100,
      timestamp: new Date().toISOString()
    };
  }

  private isValidQuery(query: string): boolean {
    // Basic SQL validation
    const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER'];
    const upperQuery = query.toUpperCase().trim();
    return sqlKeywords.some(keyword => upperQuery.startsWith(keyword));
  }

  private getQueryType(query: string): string {
    const upperQuery = query.toUpperCase().trim();
    if (upperQuery.startsWith('SELECT')) return 'SELECT';
    if (upperQuery.startsWith('INSERT')) return 'INSERT';
    if (upperQuery.startsWith('UPDATE')) return 'UPDATE';
    if (upperQuery.startsWith('DELETE')) return 'DELETE';
    return 'OTHER';
  }

  private generateSampleRows(table: string): any[] {
    const count = Math.floor(Math.random() * 10) + 1;
    const rows = [];
    
    for (let i = 0; i < count; i++) {
      rows.push({
        id: i + 1,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        created_at: new Date(Date.now() - Math.random() * 10000000000).toISOString()
      });
    }
    
    return rows;
  }

  private calculateTokens(data: any): number {
    const text = JSON.stringify(data);
    return Math.ceil(text.length / 4);
  }

  private calculateCost(data: any): number {
    const tokens = this.calculateTokens(data);
    return tokens * 0.00005; // $0.00005 per token
  }
}
