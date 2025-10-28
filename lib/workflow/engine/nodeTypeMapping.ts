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
import { ShopifyNode } from './nodes/ShopifyNode';
import { InstagramNode } from './nodes/InstagramNode';
import { FacebookNode } from './nodes/FacebookNode';
import { WhatsAppActionNode } from './nodes/whatsapp/WhatsAppActionNode';
import { DoubleForkNode } from './nodes/DoubleForkNode';
import { TripleForkNode } from './nodes/TripleForkNode';
import { QuadraForkNode } from './nodes/QuadraForkNode';
import { CustomForkNode } from './nodes/CustomForkNode';

/**
 * Central mapping registry for sidebar node types to engine node classes
 * Now supports dynamic backend node types with fallback aliases
 */
export const NODE_TYPE_MAPPINGS: NodeTypeMapping[] = [
  // Triggers
  {
    sidebarType: 'Manual Trigger',
    engineType: 'OnClickExecuteTriggerNode',
    nodeClass: OnClickExecuteTriggerNode,
    category: 'trigger',
    aliases: ['On Clicking Execute', 'Manual', 'On Click Execute']
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
    category: 'trigger',
    aliases: ['Incoming Webhook']
  },
  {
    sidebarType: 'Shopify Trigger',
    engineType: 'ShopifyNode',
    nodeClass: ShopifyNode,
    category: 'trigger',
    aliases: ['Shopify']
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

  // Actions
  {
    sidebarType: 'HTTP Request',
    engineType: 'HttpNode',
    nodeClass: HttpNode,
    category: 'action',
    aliases: ['HTTP Request Action', 'Http', 'API Request']
  },
  {
    sidebarType: 'Database Query',
    engineType: 'DatabaseNode',
    nodeClass: DatabaseNode,
    category: 'action',
    aliases: ['Database', 'SQL Query', 'DB Query']
  },
  {
    sidebarType: 'Send Email',
    engineType: 'EmailNode',
    nodeClass: EmailNode,
    category: 'action',
    aliases: ['Email']
  },
  {
    sidebarType: 'Slack Message',
    engineType: 'SlackNode',
    nodeClass: SlackNode,
    category: 'action',
    aliases: ['Slack']
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
    sidebarType: 'If Condition',
    engineType: 'IfNode',
    nodeClass: IfNode,
    category: 'logic',
    aliases: ['If', 'Conditional']
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
    sidebarType: 'OpenAI GPT',
    engineType: 'OpenAINode',
    nodeClass: OpenAINode,
    category: 'ai_ml',
    aliases: ['OpenAI', 'GPT', 'ChatGPT']
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
    sidebarType: 'Data Transformation',
    engineType: 'DataTransformNode',
    nodeClass: DataTransformNode,
    category: 'ai_ml',
    aliases: ['Data Transform', 'Transform']
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
  },

  // Ecommerce
  {
    sidebarType: 'Shopify Action',
    engineType: 'ShopifyNode',
    nodeClass: ShopifyNode,
    category: 'ecommerce',
    aliases: ['Shopify']
  },
  {
    sidebarType: 'Instagram',
    engineType: 'InstagramNode',
    nodeClass: InstagramNode,
    category: 'ecommerce'
  },
  {
    sidebarType: 'Facebook',
    engineType: 'FacebookNode',
    nodeClass: FacebookNode,
    category: 'ecommerce'
  },
  {
    sidebarType: 'WhatsApp',
    engineType: 'WhatsAppActionNode',
    nodeClass: WhatsAppActionNode,
    category: 'ecommerce'
  },

  // Fork
  {
    sidebarType: 'Double',
    engineType: 'DoubleForkNode',
    nodeClass: DoubleForkNode,
    category: 'fork'
  },
  {
    sidebarType: 'Triple',
    engineType: 'TripleForkNode',
    nodeClass: TripleForkNode,
    category: 'fork'
  },
  {
    sidebarType: 'Quadra',
    engineType: 'QuadraForkNode',
    nodeClass: QuadraForkNode,
    category: 'fork'
  },
  {
    sidebarType: 'Custom',
    engineType: 'CustomForkNode',
    nodeClass: CustomForkNode,
    category: 'fork'
  }
];

/**
 * Get node mapping by sidebar type (with alias support)
 */
export function getNodeMapping(sidebarType: string): NodeTypeMapping | undefined {
  // First try exact match
  let mapping = NODE_TYPE_MAPPINGS.find(mapping => mapping.sidebarType === sidebarType);
  
  // If no exact match, try aliases
  if (!mapping) {
    mapping = NODE_TYPE_MAPPINGS.find(mapping => 
      mapping.aliases?.some(alias => 
        alias.toLowerCase() === sidebarType.toLowerCase()
      )
    );
  }
  
  return mapping;
}

/**
 * Get all node mappings by category
 */
export function getNodeMappingsByCategory(category: 'trigger' | 'action' | 'logic' | 'ai_ml' | 'data' | 'ecommerce' | 'fork'): NodeTypeMapping[] {
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
