// ─── Stopper Node Executor ────────────────────────────────────────────────────

import {
  StopperExecutorOptions,
  StopperNodeOutput,
  StopperError,
} from './schema';

/**
 * Executes the Stopper node - final node in a workflow
 * Logs completion status and any errors
 *
 * Usage:
 *   const output = await executeStopperNode({
 *     config: { logLevel: 'success' },
 *     workflowStatus: 'success',
 *     workflowDuration: 5000,
 *     workflowErrors: [],
 *     completedNodeCount: 10,
 *     failedNodeCount: 0,
 *   });
 */
export async function executeStopperNode(
  options: StopperExecutorOptions
): Promise<StopperNodeOutput> {
  const {
    config,
    workflowStatus,
    workflowDuration = 0,
    workflowErrors = [],
    completedNodeCount = 0,
    failedNodeCount = 0,
  } = options;

  const logLevel = config.logLevel || 'info';
  const timestamp = new Date().toISOString();

  // Build status message
  let statusMessage = '';
  let status: 'success' | 'error' = 'success';

  if (workflowStatus === 'error' || failedNodeCount > 0) {
    status = 'error';
    statusMessage = config.customMessage || '❌ Workflow completed with errors';
  } else if (workflowStatus === 'cancelled') {
    statusMessage = config.customMessage || '⚠️  Workflow was cancelled';
  } else {
    statusMessage = config.customMessage || '✅ Workflow completed successfully';
  }

  // Log workflow completion
  console.log('\n' + '='.repeat(60));
  console.log('🏁 WORKFLOW COMPLETION SUMMARY');
  console.log('='.repeat(60));
  console.log(statusMessage);

  if (workflowDuration > 0) {
    const seconds = (workflowDuration / 1000).toFixed(2);
    console.log(`⏱️  Total Duration: ${seconds}s`);
  }

  console.log(`✓ Completed Nodes: ${completedNodeCount}`);

  if (failedNodeCount > 0) {
    console.log(`✗ Failed Nodes: ${failedNodeCount}`);
  }

  // Log any errors
  if (workflowErrors.length > 0) {
    console.log('\n📋 Errors:');
    workflowErrors.forEach((error, idx) => {
      console.log(`  ${idx + 1}. ${error}`);
    });
  }

  console.log('='.repeat(60) + '\n');

  // Build output
  return {
    status,
    message: statusMessage,
    timestamp,
    workflowDuration,
    nodeCount: completedNodeCount + failedNodeCount,
    completedNodes: Array.from({ length: completedNodeCount }, (_, i) => `node_${i}`),
    failedNodes: failedNodeCount > 0 ? Array.from({ length: failedNodeCount }, (_, i) => `node_${completedNodeCount + i}`) : [],
  };
}
