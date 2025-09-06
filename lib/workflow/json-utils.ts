/**
 * NexAgent JSON Workflow Utils
 * Enterprise-grade JSON import/export utilities
 * 
 * Provides:
 * - Robust JSON serialization/deserialization
 * - Validation and error handling
 * - Batch operations
 * - Template generation
 */

import { 
  Workflow, 
  WorkflowJSON, 
  WorkflowNode, 
  WorkflowConnection,
  NodeType,
  NodeCategory,
  ConnectionType,
  ValidationSchemas,
  WorkflowValidationError 
} from './types';
import { workflowEngine } from './engine';
import crypto from 'crypto';

// ============================================================================
// JSON IMPORT/EXPORT CLASS
// ============================================================================

export class WorkflowJSONUtils {

  /**
   * Import workflow from JSON file or string
   */
  static async importFromJSON(jsonData: string | object): Promise<Workflow> {
    try {
      let workflowJSON: WorkflowJSON;
      
      if (typeof jsonData === 'string') {
        workflowJSON = JSON.parse(jsonData);
      } else {
        workflowJSON = jsonData as WorkflowJSON;
      }

      // Validate JSON structure
      if (!workflowJSON.schema || workflowJSON.schema !== 'nexagent-workflow-v1') {
        throw new WorkflowValidationError(
          'Invalid or missing schema version',
          'schema',
          workflowJSON.schema,
          'INVALID_SCHEMA'
        );
      }

      // Verify checksum if provided
      if (workflowJSON.checksum) {
        const calculatedChecksum = this.calculateChecksum(workflowJSON.workflow);
        if (calculatedChecksum !== workflowJSON.checksum) {
          throw new WorkflowValidationError(
            'Checksum mismatch - workflow may be corrupted',
            'checksum',
            workflowJSON.checksum,
            'CHECKSUM_MISMATCH'
          );
        }
      }

      // Import via engine
      return await workflowEngine.importWorkflow(workflowJSON);
    } catch (error) {
      if (error instanceof WorkflowValidationError) {
        throw error;
      }
      throw new WorkflowValidationError(
        `JSON import failed: ${error instanceof Error ? error.message : String(error)}`,
        'import',
        jsonData,
        'IMPORT_ERROR'
      );
    }
  }

  /**
   * Export workflow to JSON
   */
  static async exportToJSON(workflowId: string, options: {
    includeMetadata?: boolean;
    prettify?: boolean;
    exportedBy?: string;
  } = {}): Promise<string> {
    try {
      const { includeMetadata = true, prettify = true, exportedBy } = options;
      
      const workflowJSON = await workflowEngine.exportWorkflow(workflowId, exportedBy);
      
      let jsonToExport: WorkflowJSON | Omit<WorkflowJSON, 'exportedAt' | 'exportedBy' | 'checksum'> = workflowJSON;
      if (!includeMetadata) {
        // Remove metadata fields if not needed
        jsonToExport = {
          version: workflowJSON.version,
          workflow: workflowJSON.workflow,
          schema: workflowJSON.schema,
        };
      }

      return JSON.stringify(jsonToExport, null, prettify ? 2 : 0);
    } catch (error) {
      throw new WorkflowValidationError(
        `JSON export failed: ${error instanceof Error ? error.message : String(error)}`,
        'export',
        workflowId,
        'EXPORT_ERROR'
      );
    }
  }

  /**
   * Create workflow from minimal JSON structure
   */
  static async createFromSimpleJSON(simpleJSON: {
    name: string;
    description?: string;
    nodes: Array<{
      type: string;
      name: string;
      position: { x: number; y: number };
      config?: unknown;
    }>;
    connections?: Array<{
      from: string;
      to: string;
      fromPort?: string;
      toPort?: string;
    }>;
  }): Promise<Workflow> {
    try {
      // Create base workflow
      const workflow = await workflowEngine.createWorkflow({
        workflow: {
          name: simpleJSON.name,
          description: simpleJSON.description,
          nodes: [],
          connections: [],
          settings: {
            timeout: 300000,
            retryCount: 3,
            concurrency: 1,
            errorHandling: 'stop',
            logging: true,
          },
          variables: {},
          triggers: [],
          status: 'draft',
        }
      });

      // Create nodes with UUID tracking
      const nodeMap = new Map<string, string>(); // originalName -> UUID

      for (const nodeData of simpleJSON.nodes) {
        const node = await workflowEngine.addNode({
          workflowId: workflow.id,
          node: {
            type: nodeData.type as NodeType,
            category: this.getNodeCategory(nodeData.type as NodeType),
            name: nodeData.name,
            position: nodeData.position,
            config: nodeData.config as Record<string, unknown>,
            inputs: [],
            outputs: [],
            version: '1.0.0',
            enabled: true,
            tags: [],
          }
        });
        nodeMap.set(nodeData.name, node.id);
      }

      // Create connections if provided
      if (simpleJSON.connections) {
        for (const connData of simpleJSON.connections) {
          const sourceNodeId = nodeMap.get(connData.from);
          const targetNodeId = nodeMap.get(connData.to);

          if (!sourceNodeId || !targetNodeId) {
            throw new WorkflowValidationError(
              `Connection references unknown node: ${connData.from} -> ${connData.to}`,
              'connection',
              connData,
              'UNKNOWN_NODE_REFERENCE'
            );
          }

          await workflowEngine.addConnection({
            workflowId: workflow.id,
            connection: {
              sourceNodeId,
              targetNodeId,
              sourcePortId: connData.fromPort || 'output',
              targetPortId: connData.toPort || 'input',
              type: ConnectionType.DEFAULT,
              enabled: true,
            }
          });
        }
      }

      return workflowEngine.getWorkflowById(workflow.id)!;
    } catch (error) {
      if (error instanceof WorkflowValidationError) {
        throw error;
      }
      throw new WorkflowValidationError(
        `Simple JSON creation failed: ${error instanceof Error ? error.message : String(error)}`,
        'creation',
        simpleJSON,
        'CREATION_ERROR'
      );
    }
  }

  /**
   * Generate workflow template JSON
   */
  static generateTemplate(templateType: 'customer_onboarding' | 'data_processing' | 'api_integration'): WorkflowJSON {
    const templates = {
      customer_onboarding: {
        name: 'Customer Onboarding Workflow',
        description: 'Automated customer onboarding process with welcome emails and profile setup',
        nodes: [
          {
            type: 'http_webhook',
            name: 'New Customer Signup',
            position: { x: 100, y: 100 },
            config: {
              path: '/webhook/customer-signup',
              methods: ['POST']
            }
          },
          {
            type: 'email_send',
            name: 'Send Welcome Email',
            position: { x: 400, y: 100 },
            config: {
              subject: 'Welcome to our platform!',
              body: 'Thank you for joining us, {{input.customer_name}}!'
            }
          },
          {
            type: 'database_query',
            name: 'Create Customer Profile',
            position: { x: 700, y: 100 },
            config: {
              query: 'INSERT INTO customers (name, email, created_at) VALUES ($1, $2, NOW())',
              database: 'postgresql'
            }
          }
        ],
        connections: [
          { from: 'New Customer Signup', to: 'Send Welcome Email' },
          { from: 'Send Welcome Email', to: 'Create Customer Profile' }
        ]
      },
      
      data_processing: {
        name: 'Data Processing Pipeline',
        description: 'Automated data ingestion, transformation, and analysis',
        nodes: [
          {
            type: 'schedule',
            name: 'Daily Data Import',
            position: { x: 100, y: 100 },
            config: {
              type: 'cron',
              cron: '0 2 * * *',
              timezone: 'UTC'
            }
          },
          {
            type: 'http_request',
            name: 'Fetch Data from API',
            position: { x: 400, y: 100 },
            config: {
              method: 'GET',
              url: 'https://api.example.com/data'
            }
          },
          {
            type: 'data_transform',
            name: 'Process and Clean Data',
            position: { x: 700, y: 100 },
            config: {
              transformations: [
                {
                  type: 'filter',
                  expression: 'item => item.status === "active"'
                },
                {
                  type: 'map',
                  expression: 'item => ({ ...item, processed_at: new Date().toISOString() })'
                }
              ]
            }
          },
          {
            type: 'database_query',
            name: 'Store Processed Data',
            position: { x: 1000, y: 100 },
            config: {
              query: 'INSERT INTO processed_data (data, created_at) VALUES ($1, NOW())',
              database: 'postgresql'
            }
          }
        ],
        connections: [
          { from: 'Daily Data Import', to: 'Fetch Data from API' },
          { from: 'Fetch Data from API', to: 'Process and Clean Data' },
          { from: 'Process and Clean Data', to: 'Store Processed Data' }
        ]
      },

      api_integration: {
        name: 'API Integration Workflow',
        description: 'Synchronize data between multiple APIs with error handling',
        nodes: [
          {
            type: 'http_webhook',
            name: 'Data Update Trigger',
            position: { x: 100, y: 100 },
            config: {
              path: '/webhook/data-update',
              methods: ['POST', 'PUT']
            }
          },
          {
            type: 'condition',
            name: 'Validate Data',
            position: { x: 400, y: 100 },
            config: {
              conditions: [
                {
                  field: 'id',
                  operator: 'not_equals',
                  value: null
                }
              ]
            }
          },
          {
            type: 'http_request',
            name: 'Update Primary API',
            position: { x: 700, y: 50 },
            config: {
              method: 'PUT',
              url: 'https://primary-api.com/update'
            }
          },
          {
            type: 'http_request',
            name: 'Sync to Secondary API',
            position: { x: 1000, y: 50 },
            config: {
              method: 'POST',
              url: 'https://secondary-api.com/sync'
            }
          },
          {
            type: 'email_send',
            name: 'Send Error Alert',
            position: { x: 700, y: 200 },
            config: {
              subject: 'API Sync Error',
              body: 'Error occurred during API synchronization: {{error.message}}'
            }
          }
        ],
        connections: [
          { from: 'Data Update Trigger', to: 'Validate Data' },
          { from: 'Validate Data', to: 'Update Primary API', fromPort: 'true' },
          { from: 'Update Primary API', to: 'Sync to Secondary API', fromPort: 'success' },
          { from: 'Update Primary API', to: 'Send Error Alert', fromPort: 'error' },
          { from: 'Validate Data', to: 'Send Error Alert', fromPort: 'false' }
        ]
      }
    };

    const template = templates[templateType];
    const workflowId = crypto.randomUUID();
    const now = new Date().toISOString();

    const workflow: Workflow = {
      id: workflowId,
      name: template.name,
      description: template.description,
      nodes: template.nodes.map(node => ({
        id: crypto.randomUUID(),
        type: node.type as NodeType,
        category: this.getNodeCategory(node.type as NodeType),
        name: node.name,
        position: node.position,
        config: node.config,
        inputs: [],
        outputs: [],
        version: '1.0.0',
        enabled: true,
        tags: [],
        createdAt: now,
        updatedAt: now,
      })),
      connections: [],
      metadata: {
        createdAt: now,
        updatedAt: now,
        version: '1.0.0',
        executionCount: 0,
        tags: ['template', templateType],
        isPublic: false,
      },
      settings: {
        timeout: 300000,
        retryCount: 3,
        concurrency: 1,
        errorHandling: 'stop',
        logging: true,
      },
      variables: {},
      triggers: [],
      status: 'draft',
    };

    return {
      version: '1.0.0',
      workflow,
      schema: 'nexagent-workflow-v1',
      exportedAt: now,
      exportedBy: 'NexAgent Template Generator',
      checksum: this.calculateChecksum(workflow),
    };
  }

  /**
   * Batch import multiple workflows
   */
  static async batchImport(workflowsJSON: WorkflowJSON[]): Promise<{
    successful: Workflow[];
    failed: Array<{ error: string; data: WorkflowJSON }>;
  }> {
    const results = {
      successful: [] as Workflow[],
      failed: [] as Array<{ error: string; data: WorkflowJSON }>,
    };

    for (const workflowJSON of workflowsJSON) {
      try {
        const workflow = await workflowEngine.importWorkflow(workflowJSON);
        results.successful.push(workflow);
      } catch (error) {
        results.failed.push({
          error: error instanceof Error ? error.message : String(error),
          data: workflowJSON,
        });
      }
    }

    return results;
  }

  /**
   * Validate JSON structure without importing
   */
  static validateJSON(jsonData: string | object): { 
    valid: boolean; 
    errors: string[]; 
    warnings: string[] 
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      let workflowJSON: WorkflowJSON;
      
      if (typeof jsonData === 'string') {
        try {
          workflowJSON = JSON.parse(jsonData);
        } catch (error) {
          errors.push('Invalid JSON format');
          return { valid: false, errors, warnings };
        }
      } else {
        workflowJSON = jsonData as WorkflowJSON;
      }

      // Validate schema version
      if (!workflowJSON.schema) {
        errors.push('Missing schema version');
      } else if (workflowJSON.schema !== 'nexagent-workflow-v1') {
        errors.push(`Unsupported schema version: ${workflowJSON.schema}`);
      }

      // Validate workflow structure
      const workflowValidation = ValidationSchemas.Workflow.safeParse(workflowJSON.workflow);
      if (!workflowValidation.success) {
        workflowValidation.error.issues.forEach(issue => {
          errors.push(`${issue.path.join('.')}: ${issue.message}`);
        });
      }

      // Validate nodes
      if (workflowJSON.workflow?.nodes) {
        workflowJSON.workflow.nodes.forEach((node, index) => {
          const template = workflowEngine.getNodeTemplate(node.type);
          if (!template) {
            errors.push(`Node ${index}: Unknown node type '${node.type}'`);
          } else {
            // Validate node configuration
            if (node.config) {
              const configValidation = template.configSchema.safeParse(node.config);
              if (!configValidation.success) {
                configValidation.error.issues.forEach(issue => {
                  errors.push(`Node ${index} config.${issue.path.join('.')}: ${issue.message}`);
                });
              }
            }
          }
        });
      }

      // Check for warnings
      if (workflowJSON.checksum) {
        const calculatedChecksum = this.calculateChecksum(workflowJSON.workflow);
        if (calculatedChecksum !== workflowJSON.checksum) {
          warnings.push('Checksum mismatch - workflow may be corrupted');
        }
      } else {
        warnings.push('No checksum provided - integrity cannot be verified');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
      return { valid: false, errors, warnings };
    }
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  private static calculateChecksum(workflow: Workflow): string {
    const workflowString = JSON.stringify(workflow, null, 0);
    return crypto.createHash('sha256').update(workflowString).digest('hex');
  }

  private static getNodeCategory(nodeType: NodeType): NodeCategory {
    const categoryMap: Record<string, NodeCategory> = {
      'http_webhook': NodeCategory.TRIGGER,
      'schedule': NodeCategory.TRIGGER,
      'file_watch': NodeCategory.TRIGGER,
      'database_trigger': NodeCategory.TRIGGER,
      'email_trigger': NodeCategory.TRIGGER,
      
      'http_request': NodeCategory.ACTION,
      'email_send': NodeCategory.ACTION,
      'database_query': NodeCategory.ACTION,
      'file_operation': NodeCategory.ACTION,
      'slack_message': NodeCategory.ACTION,
      
      'condition': NodeCategory.LOGIC,
      'switch': NodeCategory.LOGIC,
      'loop': NodeCategory.LOGIC,
      'merge': NodeCategory.LOGIC,
      'delay': NodeCategory.LOGIC,
      
      'openai_completion': NodeCategory.AI_ML,
      'text_analysis': NodeCategory.AI_ML,
      'image_processing': NodeCategory.AI_ML,
      'data_transform': NodeCategory.DATA,
      
      'json_parse': NodeCategory.DATA,
      'xml_parse': NodeCategory.DATA,
      'csv_parse': NodeCategory.DATA,
      'data_filter': NodeCategory.DATA,
    };

    return categoryMap[nodeType] || NodeCategory.ACTION;
  }
}
