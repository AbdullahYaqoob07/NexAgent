/**
 * NexAgent Workflow Engine - Main Entry Point
 * 
 * This file provides the main workflow engine functionality
 */

export { WorkflowManager, workflowManager } from '@/lib/workflow/WorkflowManager';
export { WorkflowEngine } from '@/lib/workflow/engine/WorkflowEngine';
export { InMemoryStorageProvider, LocalStorageProvider } from '@/lib/workflow/storage/StorageProvider';
export * from '@/lib/workflow/types';

// Re-export for backward compatibility
export { workflowManager as workflowEngine } from '@/lib/workflow/WorkflowManager';