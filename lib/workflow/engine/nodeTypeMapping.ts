/**
 * Node Type Mapping for NexAgent Workflow Engine
 * Maps sidebar node types to engine node classes
 */

import { NodeTypeMapping } from './types';
import { EmailNode } from './nodes/EmailNode';
import { SlackNode } from './nodes/SlackNode';
import { HttpNode } from './nodes/HttpNode';
import { DatabaseNode } from './nodes/DatabaseNode';
import { SaveNode } from './nodes/SaveNode';
import { IfNode } from './nodes/IfNode';
import { SwitchNode } from './nodes/SwitchNode';
import { LoopNode } from './nodes/LoopNode';
import { MergeNode } from './nodes/MergeNode';
import { DelayNode } from './nodes/DelayNode';
import { OpenAINode } from './nodes/OpenAINode';
import { TextAnalysisNode } from './nodes/TextAnalysisNode';
import { ImageProcessingNode } from './nodes/ImageProcessingNode';
import { DataTransformNode } from './nodes/DataTransformNode';
import { JsonParseNode } from './nodes/JsonParseNode';
import { XmlParseNode } from './nodes/XmlParseNode';
import { CsvParseNode } from './nodes/CsvParseNode';
import { DataFilterNode } from './nodes/DataFilterNode';
import { HttpRequestTriggerNode } from './nodes/HttpRequestTriggerNode';
import { ScheduleTriggerNode } from './nodes/ScheduleTriggerNode';
import { WebhookTriggerNode } from './nodes/WebhookTriggerNode';
import { FileWatchTriggerNode } from './nodes/FileWatchTriggerNode';
import { DatabaseTriggerNode } from './nodes/DatabaseTriggerNode';
import { EmailTriggerNode } from './nodes/EmailTriggerNode';
import { OnClickExecuteTriggerNode } from './nodes/OnClickExecuteTriggerNode';

/**
 * Central mapping registry for sidebar node types to engine node classes
 */
export const NODE_TYPE_MAPPINGS: NodeTypeMapping[] = [
  // Triggers
  {
    sidebarType: 'HTTP Request',
    engineType: 'HttpRequestTriggerNode',
    nodeClass: HttpRequestTriggerNode,
    category: 'trigger'
  },
  {
    sidebarType: 'Schedule',
    engineType: 'ScheduleTriggerNode',
    nodeClass: ScheduleTriggerNode,
    category: 'trigger'
  },
  {
    sidebarType: 'Webhook',
    engineType: 'WebhookTriggerNode',
    nodeClass: WebhookTriggerNode,
    category: 'trigger'
  },
  {
    sidebarType: 'File Watch',
    engineType: 'FileWatchTriggerNode',
    nodeClass: FileWatchTriggerNode,
    category: 'trigger'
  },
  {
    sidebarType: 'Database Trigger',
    engineType: 'DatabaseTriggerNode',
    nodeClass: DatabaseTriggerNode,
    category: 'trigger'
  },
  {
    sidebarType: 'Email Trigger',
    engineType: 'EmailTriggerNode',
    nodeClass: EmailTriggerNode,
    category: 'trigger'
  },
  {
    sidebarType: 'On Clicking Execute',
    engineType: 'OnClickExecuteTriggerNode',
    nodeClass: OnClickExecuteTriggerNode,
    category: 'trigger'
  },

  // Actions
  {
    sidebarType: 'HTTP Request',
    engineType: 'HttpNode',
    nodeClass: HttpNode,
    category: 'action'
  },
  {
    sidebarType: 'Database',
    engineType: 'DatabaseNode',
    nodeClass: DatabaseNode,
    category: 'action'
  },
  {
    sidebarType: 'Email',
    engineType: 'EmailNode',
    nodeClass: EmailNode,
    category: 'action'
  },
  {
    sidebarType: 'Slack',
    engineType: 'SlackNode',
    nodeClass: SlackNode,
    category: 'action'
  },
  {
    sidebarType: 'Save',
    engineType: 'SaveNode',
    nodeClass: SaveNode,
    category: 'action'
  },
  {
    sidebarType: 'File Operation',
    engineType: 'FileOperationNode',
    nodeClass: SaveNode, // Reuse SaveNode for file operations
    category: 'action'
  },

  // Logic
  {
    sidebarType: 'If',
    engineType: 'IfNode',
    nodeClass: IfNode,
    category: 'logic'
  },
  {
    sidebarType: 'Switch',
    engineType: 'SwitchNode',
    nodeClass: SwitchNode,
    category: 'logic'
  },
  {
    sidebarType: 'Loop',
    engineType: 'LoopNode',
    nodeClass: LoopNode,
    category: 'logic'
  },
  {
    sidebarType: 'Merge',
    engineType: 'MergeNode',
    nodeClass: MergeNode,
    category: 'logic'
  },
  {
    sidebarType: 'Delay',
    engineType: 'DelayNode',
    nodeClass: DelayNode,
    category: 'logic'
  },

  // AI/ML
  {
    sidebarType: 'OpenAI',
    engineType: 'OpenAINode',
    nodeClass: OpenAINode,
    category: 'ai_ml'
  },
  {
    sidebarType: 'Text Analysis',
    engineType: 'TextAnalysisNode',
    nodeClass: TextAnalysisNode,
    category: 'ai_ml'
  },
  {
    sidebarType: 'Image Processing',
    engineType: 'ImageProcessingNode',
    nodeClass: ImageProcessingNode,
    category: 'ai_ml'
  },
  {
    sidebarType: 'Data Transform',
    engineType: 'DataTransformNode',
    nodeClass: DataTransformNode,
    category: 'ai_ml'
  },

  // Data
  {
    sidebarType: 'JSON Parse',
    engineType: 'JsonParseNode',
    nodeClass: JsonParseNode,
    category: 'data'
  },
  {
    sidebarType: 'XML Parse',
    engineType: 'XmlParseNode',
    nodeClass: XmlParseNode,
    category: 'data'
  },
  {
    sidebarType: 'CSV Parse',
    engineType: 'CsvParseNode',
    nodeClass: CsvParseNode,
    category: 'data'
  },
  {
    sidebarType: 'Data Filter',
    engineType: 'DataFilterNode',
    nodeClass: DataFilterNode,
    category: 'data'
  }
];

/**
 * Get node mapping by sidebar type
 */
export function getNodeMapping(sidebarType: string): NodeTypeMapping | undefined {
  return NODE_TYPE_MAPPINGS.find(mapping => mapping.sidebarType === sidebarType);
}

/**
 * Get all node mappings by category
 */
export function getNodeMappingsByCategory(category: 'trigger' | 'action' | 'logic' | 'ai_ml' | 'data'): NodeTypeMapping[] {
  return NODE_TYPE_MAPPINGS.filter(mapping => mapping.category === category);
}

/**
 * Check if a sidebar type is supported
 */
export function isNodeTypeSupported(sidebarType: string): boolean {
  return NODE_TYPE_MAPPINGS.some(mapping => mapping.sidebarType === sidebarType);
}

/**
 * Get all supported sidebar types
 */
export function getSupportedSidebarTypes(): string[] {
  return NODE_TYPE_MAPPINGS.map(mapping => mapping.sidebarType);
}

/**
 * Get all supported engine types
 */
export function getSupportedEngineTypes(): string[] {
  return NODE_TYPE_MAPPINGS.map(mapping => mapping.engineType);
}

/**
 * Create a node instance from sidebar type
 */
export function createNodeInstance(sidebarType: string): any | null {
  const mapping = getNodeMapping(sidebarType);
  if (!mapping) {
    return null;
  }
  
  try {
    return new mapping.nodeClass();
  } catch (error) {
    console.error(`Failed to create node instance for ${sidebarType}:`, error);
    return null;
  }
}

/**
 * Validate node configuration
 */
export function validateNodeConfig(sidebarType: string, config: Record<string, any>): string[] {
  const mapping = getNodeMapping(sidebarType);
  if (!mapping) {
    return [`Unknown node type: ${sidebarType}`];
  }

  try {
    const nodeInstance = new mapping.nodeClass();
    if (nodeInstance.validate) {
      return nodeInstance.validate(config);
    }
    return [];
  } catch (error) {
    return [`Failed to validate node configuration: ${error}`];
  }
}
