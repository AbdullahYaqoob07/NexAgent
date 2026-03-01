/**
 * Workflow Adapter
 * Converts between frontend Workflow type and backend API format
 */

import { Workflow, WorkflowNode, WorkflowConnection } from '@/lib/workflow/types';
import { 
  BackendWorkflow, 
  BackendWorkflowNode, 
  BackendWorkflowEdge,
  WorkflowCreateRequest,
  WorkflowUpdateRequest 
} from '../types/workflow';
import { convertSidebarTypeToEngineType, convertEngineTypeToSidebarType } from '@/lib/workflow/engine/nodeTypeMapping';

/**
 * Convert frontend WorkflowNode to backend format
 */
export function frontendNodeToBackend(node: WorkflowNode): BackendWorkflowNode {
  return {
    id: node.id,
    type: convertSidebarTypeToEngineType(node.type),
    name: node.name,
    description: node.description,
    config: node.config,
    position: node.position,
    enabled: node.enabled,
    category: node.category,
    inputs: node.inputs,
    outputs: node.outputs,
  };
}

/**
 * Convert frontend WorkflowConnection to backend edge
 */
export function frontendConnectionToBackendEdge(connection: WorkflowConnection): BackendWorkflowEdge {
  return {
    id: connection.id,
    source: connection.sourceNodeId,
    target: connection.targetNodeId,
    sourceHandle: connection.sourcePortId,
    targetHandle: connection.targetPortId,
    condition: connection.condition ?? null,
    enabled: connection.enabled,
  };
}

/**
 * Convert backend node to frontend WorkflowNode
 */
export function backendNodeToFrontend(backendNode: BackendWorkflowNode): WorkflowNode {
  return {
    id: backendNode.id || `node_${Date.now()}`,
    type: convertEngineTypeToSidebarType(backendNode.type) || 'unknown',
    name: backendNode.name || 'Unnamed Node',
    description: backendNode.description,
    config: backendNode.config || {},
    inputs: backendNode.inputs || [],
    outputs: backendNode.outputs || [],
    position: backendNode.position || { x: 0, y: 0 },
    enabled: backendNode.enabled !== false,
    category: backendNode.category || 'action',
  };
}

/**
 * Convert backend edge to frontend WorkflowConnection
 */
export function backendEdgeToFrontendConnection(backendEdge: BackendWorkflowEdge): WorkflowConnection {
  return {
    id: backendEdge.id || `conn_${Date.now()}`,
    sourceNodeId: backendEdge.source || backendEdge.sourceNodeId || '',
    sourcePortId: backendEdge.sourceHandle || backendEdge.sourcePortId || 'output',
    targetNodeId: backendEdge.target || backendEdge.targetNodeId || '',
    targetPortId: backendEdge.targetHandle || backendEdge.targetPortId || 'input',
    condition: backendEdge.condition || undefined,
    enabled: backendEdge.enabled !== false,
  };
}

/**
 * Convert frontend Workflow to backend create request
 */
export function workflowToCreateRequest(workflow: Workflow): WorkflowCreateRequest {
  return {
    name: workflow.name,
    description: workflow.description,
    canBeListed: false, // Default to private
    nodes: workflow.nodes.map(frontendNodeToBackend),
    edges: workflow.connections.map(frontendConnectionToBackendEdge),
    variables: {}, // Can be extended later
  };
}

/**
 * Convert frontend Workflow to backend update request
 */
export function workflowToUpdateRequest(workflow: Partial<Workflow>): WorkflowUpdateRequest {
  const request: WorkflowUpdateRequest = {};
  
  if (workflow.name !== undefined) request.name = workflow.name;
  if (workflow.description !== undefined) request.description = workflow.description;
  if (workflow.nodes !== undefined) {
    request.nodes = workflow.nodes.map(frontendNodeToBackend);
  }
  if (workflow.connections !== undefined) {
    request.edges = workflow.connections.map(frontendConnectionToBackendEdge);
  }
  
  return request;
}

/**
 * Convert backend workflow to frontend Workflow
 */
export function backendWorkflowToFrontend(backendWorkflow: BackendWorkflow): Workflow {
  return {
    id: backendWorkflow.id,
    name: backendWorkflow.name,
    description: backendWorkflow.description,
    nodes: backendWorkflow.nodes.map(backendNodeToFrontend),
    connections: backendWorkflow.edges.map(backendEdgeToFrontendConnection),
    settings: {
      timeout: 300000,
      retryCount: 3,
      concurrency: 1,
      errorHandling: 'stop',
    },
    createdAt: backendWorkflow.createdAt,
    updatedAt: backendWorkflow.updatedAt,
    version: backendWorkflow.version.toString(),
  };
}

/**
 * Prepare workflow for backend save (sanitize and validate)
 */
export function prepareWorkflowForBackend(workflow: Workflow): WorkflowCreateRequest {
  // Validate name length
  const name = workflow.name.trim();
  if (name.length < 3) {
    throw new Error('Workflow name must be at least 3 characters');
  }
  if (name.length > 100) {
    throw new Error('Workflow name must not exceed 100 characters');
  }

  return {
    name,
    description: workflow.description || '',
    canBeListed: false,
    nodes: workflow.nodes.map(frontendNodeToBackend),
    edges: workflow.connections.map(frontendConnectionToBackendEdge),
    variables: {},
  };
}
