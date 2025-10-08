/**
 * Workflow validation utilities
 */

import { 
  Workflow, 
  WorkflowValidationResult, 
  ValidationError, 
  ValidationWarning,
  NodeHandler
} from '../types';

export class WorkflowValidator {
  /**
   * Validate a workflow
   */
  validate(workflow: Workflow, nodeHandlers: Map<string, NodeHandler>): WorkflowValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic workflow validation
    this.validateWorkflowStructure(workflow, errors);
    
    // Node validation
    this.validateNodes(workflow, nodeHandlers, errors, warnings);
    
    // Connection validation
    this.validateConnections(workflow, errors);
    
    // Circular dependency validation
    this.validateNoCircularDependencies(workflow, errors);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate workflow structure
   */
  private validateWorkflowStructure(workflow: Workflow, errors: ValidationError[]): void {
    if (!workflow.name || workflow.name.trim().length === 0) {
      errors.push({
        type: 'error',
        code: 'MISSING_WORKFLOW_NAME',
        message: 'Workflow name is required',
        field: 'name'
      });
    }

    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push({
        type: 'error',
        code: 'EMPTY_WORKFLOW',
        message: 'Workflow must have at least one node',
        field: 'nodes'
      });
    }
  }

  /**
   * Validate all nodes
   */
  private validateNodes(
    workflow: Workflow, 
    nodeHandlers: Map<string, NodeHandler>, 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): void {
    for (const node of workflow.nodes) {
      if (node.enabled) {
        // Check if handler exists
        const handler = nodeHandlers.get(node.type);
        if (!handler) {
          errors.push({
            type: 'error',
            code: 'NO_HANDLER',
            message: `No handler found for node type: ${node.type}`,
            nodeId: node.id,
            field: 'type'
          });
          continue;
        }

        // Validate node configuration
        if (handler.validate) {
          const nodeErrors = handler.validate(node.config);
          errors.push(...nodeErrors);
        }

        // Check required fields
        this.validateRequiredFields(node, handler, errors);
      }
    }
  }

  /**
   * Validate required fields for a node
   */
  private validateRequiredFields(
    node: any, 
    handler: NodeHandler, 
    errors: ValidationError[]
  ): void {
    for (const input of handler.inputs) {
      if (input.required && (!node.config || !(input.id in node.config) || node.config[input.id] === undefined)) {
        errors.push({
          type: 'error',
          code: 'MISSING_REQUIRED_FIELD',
          message: `Required field '${input.name}' is missing for node '${node.name}'`,
          nodeId: node.id,
          field: input.id
        });
      }
    }
  }

  /**
   * Validate connections
   */
  private validateConnections(workflow: Workflow, errors: ValidationError[]): void {
    const nodeIds = new Set(workflow.nodes.map(n => n.id));

    for (const connection of workflow.connections) {
      if (!nodeIds.has(connection.sourceNodeId)) {
        errors.push({
          type: 'error',
          code: 'INVALID_SOURCE_NODE',
          message: `Connection references non-existent source node: ${connection.sourceNodeId}`,
          field: 'connections'
        });
      }

      if (!nodeIds.has(connection.targetNodeId)) {
        errors.push({
          type: 'error',
          code: 'INVALID_TARGET_NODE',
          message: `Connection references non-existent target node: ${connection.targetNodeId}`,
          field: 'connections'
        });
      }
    }
  }

  /**
   * Validate no circular dependencies
   */
  private validateNoCircularDependencies(workflow: Workflow, errors: ValidationError[]): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) {
        return true;
      }
      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoingConnections = workflow.connections.filter(c => c.sourceNodeId === nodeId);
      for (const connection of outgoingConnections) {
        if (hasCycle(connection.targetNodeId)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of workflow.nodes) {
      if (!visited.has(node.id) && hasCycle(node.id)) {
        errors.push({
          type: 'error',
          code: 'CIRCULAR_DEPENDENCY',
          message: `Circular dependency detected involving node '${node.name}'`,
          field: 'connections'
        });
        break;
      }
    }
  }
}
