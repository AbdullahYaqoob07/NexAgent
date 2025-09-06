/**
 * NexAgent Workflow Engine - Core Implementation
 * Enterprise-grade workflow automation engine with JSON support
 * 
 * This engine provides:
 * - JSON-based workflow creation and management
 * - Real-time workflow execution
 * - AI-driven workflow generation
 * - Enterprise-scale validation and error handling
 */

import { 
  Workflow, 
  WorkflowNode, 
  WorkflowConnection, 
  NodeType, 
  NodeCategory,
  ValidationSchemas,
  WorkflowJSON,
  WorkflowValidationError,
  NodeValidationError,
  ConnectionValidationError,
  ExecutionResult,
  CreateWorkflowRequest,
  CreateNodeRequest,
  CreateConnectionRequest,
  NodeTemplate
} from './types';
import { NodeTemplateRegistry } from './node-templates';
import crypto from 'crypto';

// ============================================================================
// WORKFLOW ENGINE CLASS
// ============================================================================

export class WorkflowEngine {
  private workflows: Map<string, Workflow> = new Map();
  private nodeTemplates: NodeTemplateRegistry;
  private executionHistory: Map<string, ExecutionResult[]> = new Map();

  constructor() {
    this.nodeTemplates = new NodeTemplateRegistry();
  }

  // ========================================================================
  // WORKFLOW MANAGEMENT
  // ========================================================================

  /**
   * Create a new workflow from JSON or structured data
   */
  async createWorkflow(request: CreateWorkflowRequest): Promise<Workflow> {
    try {
      const workflowId = crypto.randomUUID();
      const now = new Date().toISOString();
      
      // Create default settings
      const defaultSettings = {
        timeout: 300000,
        retryCount: 3,
        concurrency: 1,
        errorHandling: 'stop' as const,
        logging: true,
      };

      const workflow: Workflow = {
        id: workflowId,
        name: request.workflow.name,
        description: request.workflow.description,
        nodes: [],
        connections: [],
        metadata: {
          createdAt: now,
          updatedAt: now,
          executionCount: 0,
          version: '1.0.0',
          tags: [],
          isPublic: false,
          ...request.metadata,
        },
        status: 'draft',
        settings: {
          ...defaultSettings,
          ...(request.workflow.settings || {}),
        },
        variables: request.workflow.variables || {},
        triggers: request.workflow.triggers || [],
      };

      // Validate workflow structure
      const validationResult = ValidationSchemas.Workflow.safeParse(workflow);
      if (!validationResult.success) {
        throw new WorkflowValidationError(
          'Invalid workflow structure',
          'workflow',
          workflow,
          'INVALID_STRUCTURE'
        );
      }

      this.workflows.set(workflowId, workflow);
      return workflow;
    } catch (error) {
      if (error instanceof WorkflowValidationError) {
        throw error;
      }
      throw new WorkflowValidationError(
        `Failed to create workflow: ${error instanceof Error ? error.message : String(error)}`,
        'workflow',
        request,
        'CREATION_FAILED'
      );
    }
  }

  /**
   * Import workflow from JSON
   */
  async importWorkflow(workflowJSON: WorkflowJSON): Promise<Workflow> {
    try {
      // Validate JSON structure
      if (workflowJSON.schema !== 'nexagent-workflow-v1') {
        throw new WorkflowValidationError(
          `Unsupported schema version: ${workflowJSON.schema}`,
          'schema',
          workflowJSON.schema,
          'UNSUPPORTED_SCHEMA'
        );
      }

      // Validate workflow data
      const validationResult = ValidationSchemas.Workflow.safeParse(workflowJSON.workflow);
      if (!validationResult.success) {
        throw new WorkflowValidationError(
          'Invalid workflow JSON structure',
          'workflow',
          workflowJSON.workflow,
          'INVALID_JSON_STRUCTURE'
        );
      }

      // Validate all nodes exist in templates
      for (const node of workflowJSON.workflow.nodes) {
        await this.validateNodeTemplate(node);
      }

      // Validate connections
      await this.validateWorkflowConnections(workflowJSON.workflow);

      // Store workflow
      this.workflows.set(workflowJSON.workflow.id, workflowJSON.workflow);
      
      return workflowJSON.workflow;
    } catch (error) {
      if (error instanceof WorkflowValidationError) {
        throw error;
      }
      throw new WorkflowValidationError(
        `Failed to import workflow: ${error instanceof Error ? error.message : String(error)}`,
        'import',
        workflowJSON,
        'IMPORT_FAILED'
      );
    }
  }

  /**
   * Export workflow to JSON
   */
  async exportWorkflow(workflowId: string, exportedBy?: string): Promise<WorkflowJSON> {
    const workflow = this.getWorkflow(workflowId);
    const now = new Date().toISOString();
    
    const workflowJSON: WorkflowJSON = {
      version: '1.0.0',
      workflow,
      schema: 'nexagent-workflow-v1',
      exportedAt: now,
      exportedBy,
      checksum: this.calculateChecksum(workflow),
    };

    return workflowJSON;
  }

  // ========================================================================
  // NODE MANAGEMENT
  // ========================================================================

  /**
   * Add a node to workflow from JSON or structured data
   */
  async addNode(request: CreateNodeRequest): Promise<WorkflowNode> {
    try {
      const workflow = this.getWorkflow(request.workflowId);
      const nodeId = crypto.randomUUID();
      const now = new Date().toISOString();

      const node: WorkflowNode = {
        id: nodeId,
        type: request.node.type,
        category: request.node.category,
        name: request.node.name,
        description: request.node.description,
        position: request.node.position,
        config: request.node.config,
        metadata: request.node.metadata,
        createdAt: now,
        updatedAt: now,
        version: '1.0.0',
        enabled: true,
        tags: [],
        inputs: [],
        outputs: [],
      };

      // Validate node structure
      const validationResult = ValidationSchemas.WorkflowNode.safeParse(node);
      if (!validationResult.success) {
        throw new NodeValidationError(
          'Invalid node structure',
          nodeId,
          'node',
          'INVALID_STRUCTURE'
        );
      }

      // Validate node template exists
      await this.validateNodeTemplate(node);

      // Add node to workflow
      workflow.nodes.push(node);
      workflow.metadata.updatedAt = now;

      return node;
    } catch (error) {
      if (error instanceof NodeValidationError) {
        throw error;
      }
      throw new NodeValidationError(
        `Failed to add node: ${error instanceof Error ? error.message : String(error)}`,
        'unknown',
        'creation',
        'CREATION_FAILED'
      );
    }
  }

  /**
   * Update node configuration
   */
  async updateNode(workflowId: string, nodeId: string, updates: Partial<WorkflowNode>): Promise<WorkflowNode> {
    const workflow = this.getWorkflow(workflowId);
    const nodeIndex = workflow.nodes.findIndex(n => n.id === nodeId);
    
    if (nodeIndex === -1) {
      throw new NodeValidationError(
        `Node not found: ${nodeId}`,
        nodeId,
        'id',
        'NODE_NOT_FOUND'
      );
    }

    const node = workflow.nodes[nodeIndex];
    const updatedNode = {
      ...node,
      ...updates,
      id: nodeId, // Ensure ID cannot be changed
      updatedAt: new Date().toISOString(),
    };

    // Validate updated node
    const validationResult = ValidationSchemas.WorkflowNode.safeParse(updatedNode);
    if (!validationResult.success) {
      throw new NodeValidationError(
        'Invalid node update',
        nodeId,
        'update',
        'INVALID_UPDATE'
      );
    }

    workflow.nodes[nodeIndex] = updatedNode;
    workflow.metadata.updatedAt = new Date().toISOString();

    return updatedNode;
  }

  /**
   * Remove node from workflow
   */
  async removeNode(workflowId: string, nodeId: string): Promise<void> {
    const workflow = this.getWorkflow(workflowId);
    
    // Remove node
    workflow.nodes = workflow.nodes.filter(n => n.id !== nodeId);
    
    // Remove associated connections
    workflow.connections = workflow.connections.filter(
      c => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId
    );
    
    workflow.metadata.updatedAt = new Date().toISOString();
  }

  // ========================================================================
  // CONNECTION MANAGEMENT
  // ========================================================================

  /**
   * Add connection between nodes
   */
  async addConnection(request: CreateConnectionRequest): Promise<WorkflowConnection> {
    try {
      const workflow = this.getWorkflow(request.workflowId);
      const connectionId = crypto.randomUUID();

      const connection: WorkflowConnection = {
        id: connectionId,
        sourceNodeId: request.connection.sourceNodeId,
        sourcePortId: request.connection.sourcePortId,
        targetNodeId: request.connection.targetNodeId,
        targetPortId: request.connection.targetPortId,
        type: request.connection.type || 'default',
        condition: request.connection.condition,
        metadata: request.connection.metadata,
        enabled: request.connection.enabled ?? true,
      };

      // Validate connection structure
      const validationResult = ValidationSchemas.WorkflowConnection.safeParse(connection);
      if (!validationResult.success) {
        throw new ConnectionValidationError(
          'Invalid connection structure',
          connectionId,
          'INVALID_STRUCTURE'
        );
      }

      // Validate nodes exist
      const sourceNode = workflow.nodes.find(n => n.id === connection.sourceNodeId);
      const targetNode = workflow.nodes.find(n => n.id === connection.targetNodeId);

      if (!sourceNode) {
        throw new ConnectionValidationError(
          `Source node not found: ${connection.sourceNodeId}`,
          connectionId,
          'SOURCE_NODE_NOT_FOUND'
        );
      }

      if (!targetNode) {
        throw new ConnectionValidationError(
          `Target node not found: ${connection.targetNodeId}`,
          connectionId,
          'TARGET_NODE_NOT_FOUND'
        );
      }

      // Check for duplicate connections
      const duplicateConnection = workflow.connections.find(
        c => c.sourceNodeId === connection.sourceNodeId &&
             c.targetNodeId === connection.targetNodeId &&
             c.sourcePortId === connection.sourcePortId &&
             c.targetPortId === connection.targetPortId
      );

      if (duplicateConnection) {
        throw new ConnectionValidationError(
          'Connection already exists',
          connectionId,
          'DUPLICATE_CONNECTION'
        );
      }

      // Add connection to workflow
      workflow.connections.push(connection);
      workflow.metadata.updatedAt = new Date().toISOString();

      return connection;
    } catch (error) {
      if (error instanceof ConnectionValidationError) {
        throw error;
      }
      throw new ConnectionValidationError(
        `Failed to add connection: ${error instanceof Error ? error.message : String(error)}`,
        'unknown',
        'CREATION_FAILED'
      );
    }
  }

  /**
   * Remove connection
   */
  async removeConnection(workflowId: string, connectionId: string): Promise<void> {
    const workflow = this.getWorkflow(workflowId);
    
    const connectionExists = workflow.connections.some(c => c.id === connectionId);
    if (!connectionExists) {
      throw new ConnectionValidationError(
        `Connection not found: ${connectionId}`,
        connectionId,
        'CONNECTION_NOT_FOUND'
      );
    }

    workflow.connections = workflow.connections.filter(c => c.id !== connectionId);
    workflow.metadata.updatedAt = new Date().toISOString();
  }

  // ========================================================================
  // JSON OPERATIONS
  // ========================================================================

  /**
   * Create workflow from JSON string
   */
  async createWorkflowFromJSON(jsonString: string): Promise<Workflow> {
    try {
      const workflowData = JSON.parse(jsonString);
      return await this.importWorkflow(workflowData);
    } catch (error) {
      throw new WorkflowValidationError(
        `Invalid JSON format: ${error instanceof Error ? error.message : String(error)}`,
        'json',
        jsonString,
        'INVALID_JSON'
      );
    }
  }

  /**
   * Convert workflow to JSON string
   */
  async workflowToJSON(workflowId: string, exportedBy?: string): Promise<string> {
    const workflowJSON = await this.exportWorkflow(workflowId, exportedBy);
    return JSON.stringify(workflowJSON, null, 2);
  }

  /**
   * Batch create nodes from JSON array
   */
  async addNodesFromJSON(workflowId: string, nodesJSON: unknown[]): Promise<WorkflowNode[]> {
    const nodes: WorkflowNode[] = [];
    
    for (const nodeData of nodesJSON) {
      const node = await this.addNode({
        workflowId,
        node: nodeData as Omit<WorkflowNode, 'id' | 'createdAt' | 'updatedAt'>,
      });
      nodes.push(node);
    }

    return nodes;
  }

  /**
   * Batch create connections from JSON array
   */
  async addConnectionsFromJSON(workflowId: string, connectionsJSON: unknown[]): Promise<WorkflowConnection[]> {
    const connections: WorkflowConnection[] = [];
    
    for (const connectionData of connectionsJSON) {
      const connection = await this.addConnection({
        workflowId,
        connection: connectionData as Omit<WorkflowConnection, 'id'>,
      });
      connections.push(connection);
    }

    return connections;
  }

  // ========================================================================
  // VALIDATION HELPERS
  // ========================================================================

  private async validateNodeTemplate(node: WorkflowNode): Promise<void> {
    const template = this.nodeTemplates.getTemplate(node.type);
    if (!template) {
      throw new NodeValidationError(
        `Unknown node type: ${node.type}`,
        node.id,
        'type',
        'UNKNOWN_NODE_TYPE'
      );
    }

    // Validate node configuration against template
    if (template.configSchema && node.config) {
      const configValidation = template.configSchema.safeParse(node.config);
      if (!configValidation.success) {
        throw new NodeValidationError(
          `Invalid node configuration: ${configValidation.error.message}`,
          node.id,
          'config',
          'INVALID_CONFIG'
        );
      }
    }
  }

  private async validateWorkflowConnections(workflow: Workflow): Promise<void> {
    for (const connection of workflow.connections) {
      const sourceNode = workflow.nodes.find(n => n.id === connection.sourceNodeId);
      const targetNode = workflow.nodes.find(n => n.id === connection.targetNodeId);

      if (!sourceNode || !targetNode) {
        throw new ConnectionValidationError(
          'Connection references non-existent node',
          connection.id,
          'MISSING_NODE'
        );
      }
    }
  }

  private getWorkflow(workflowId: string): Workflow {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new WorkflowValidationError(
        `Workflow not found: ${workflowId}`,
        'id',
        workflowId,
        'WORKFLOW_NOT_FOUND'
      );
    }
    return workflow;
  }

  private calculateChecksum(workflow: Workflow): string {
    const workflowString = JSON.stringify(workflow, null, 0);
    return crypto.createHash('sha256').update(workflowString).digest('hex');
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Get all workflows
   */
  getWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Get workflow by ID
   */
  getWorkflowById(workflowId: string): Workflow | null {
    return this.workflows.get(workflowId) || null;
  }

  /**
   * Get available node templates
   */
  getNodeTemplates(): NodeTemplate[] {
    return this.nodeTemplates.getAllTemplates();
  }

  /**
   * Get node template by type
   */
  getNodeTemplate(nodeType: NodeType): NodeTemplate | null {
    return this.nodeTemplates.getTemplate(nodeType);
  }

  /**
   * Search workflows
   */
  searchWorkflows(query: {
    name?: string;
    category?: string;
    status?: string;
    tags?: string[];
  }): Workflow[] {
    return this.getWorkflows().filter(workflow => {
      if (query.name && !workflow.name.toLowerCase().includes(query.name.toLowerCase())) {
        return false;
      }
      if (query.category && workflow.metadata.category !== query.category) {
        return false;
      }
      if (query.status && workflow.status !== query.status) {
        return false;
      }
      if (query.tags && query.tags.length > 0) {
        const hasMatchingTag = query.tags.some(tag => 
          workflow.metadata.tags.includes(tag)
        );
        if (!hasMatchingTag) {
          return false;
        }
      }
      return true;
    });
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const workflowEngine = new WorkflowEngine();
