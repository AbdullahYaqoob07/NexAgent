/**
 * Node Registry
 * Central registry for all node handlers
 */

import { NodeHandler } from '../types';
import { HttpRequestTrigger } from './triggers/HttpRequestTrigger';
import { ScheduleTrigger } from './triggers/ScheduleTrigger';
import { HttpRequestAction } from './actions/HttpRequestAction';
import { SaveAction } from './actions/SaveAction';
import { IfNode } from './logic/IfNode';
import { OpenAINode } from './ai/OpenAINode';
import { JsonParseNode } from './data/JsonParseNode';

export class NodeRegistry {
  private static instance: NodeRegistry;
  private handlers: Map<string, NodeHandler> = new Map();

  private constructor() {
    this.registerDefaultHandlers();
  }

  static getInstance(): NodeRegistry {
    if (!NodeRegistry.instance) {
      NodeRegistry.instance = new NodeRegistry();
    }
    return NodeRegistry.instance;
  }

  /**
   * Register a node handler
   */
  registerHandler(handler: NodeHandler): void {
    this.handlers.set(handler.type, handler);
  }

  /**
   * Get a node handler by type
   */
  getHandler(type: string): NodeHandler | undefined {
    return this.handlers.get(type);
  }

  /**
   * Get all registered handlers
   */
  getAllHandlers(): NodeHandler[] {
    return Array.from(this.handlers.values());
  }

  /**
   * Get handlers by category
   */
  getHandlersByCategory(category: string): NodeHandler[] {
    return this.getAllHandlers().filter(handler => handler.category === category);
  }

  /**
   * Register default handlers
   */
  private registerDefaultHandlers(): void {
    // Triggers
    this.registerHandler(new HttpRequestTrigger());
    this.registerHandler(new ScheduleTrigger());

    // Actions
    this.registerHandler(new HttpRequestAction());
    this.registerHandler(new SaveAction());

    // Logic
    this.registerHandler(new IfNode());

    // AI/ML
    this.registerHandler(new OpenAINode());

    // Data
    this.registerHandler(new JsonParseNode());
  }
}
