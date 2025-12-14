/**
 * Validate workflow before execution
 * Checks all node configurations
 */
import { validateNodeConfig, getNodeMapping } from '../engine/nodeTypeMapping';
import { WorkflowConfig } from '../engine/types';

export interface ValidationError {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  errors: string[];
}

export function validateWorkflow(workflow: WorkflowConfig): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!workflow.nodes || workflow.nodes.length === 0) {
    return [{
      nodeId: 'workflow',
      nodeName: 'Workflow',
      nodeType: 'workflow',
      errors: ['Workflow has no nodes']
    }];
  }
  
  // Validate each node
  for (const node of workflow.nodes) {
    const nodeErrors: string[] = [];
    
    // Get node type - handle both sidebarType and type properties
    const nodeType = (node as any).sidebarType || (node as any).type || 'Unknown';
    const nodeId = node.id || 'unknown';
    const nodeName = node.name || nodeId;
    
    // Check if node type is valid
    if (!nodeType || nodeType === 'Unknown') {
      nodeErrors.push(`Node type is missing or invalid`);
    } else {
      const mapping = getNodeMapping(nodeType);
      if (!mapping) {
        nodeErrors.push(`Unknown node type: ${nodeType}`);
      } else {
        // Validate node configuration
        try {
          const configErrors = validateNodeConfig(nodeType, node.config || {});
          nodeErrors.push(...configErrors);
        } catch (error) {
          nodeErrors.push(`Failed to validate configuration: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
    
    if (nodeErrors.length > 0) {
      errors.push({
        nodeId: nodeId,
        nodeName: nodeName,
        nodeType: nodeType,
        errors: nodeErrors
      });
    }
  }
  
  return errors;
}

export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return '';
  
  const messages = errors.map(err => {
    const errorList = err.errors.map(e => `  • ${e}`).join('\n');
    const nodeType = err.nodeType && err.nodeType !== 'Unknown' ? ` (${err.nodeType})` : '';
    return `${err.nodeName}${nodeType}:\n${errorList}`;
  });
  
  return `Configuration Errors Found:\n\n${messages.join('\n\n')}\n\nPlease configure all nodes properly before executing.`;
}

