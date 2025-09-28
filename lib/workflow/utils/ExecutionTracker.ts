/**
 * Execution tracking utilities
 */

export class ExecutionTracker {
  private activeExecutions: Map<string, { startTime: number; workflowId: string }> = new Map();

  /**
   * Start tracking an execution
   */
  startExecution(executionId: string, workflowId: string): void {
    this.activeExecutions.set(executionId, {
      startTime: Date.now(),
      workflowId
    });
  }

  /**
   * Stop tracking an execution
   */
  stopExecution(executionId: string): void {
    this.activeExecutions.delete(executionId);
  }

  /**
   * Get active executions
   */
  getActiveExecutions(): string[] {
    return Array.from(this.activeExecutions.keys());
  }

  /**
   * Get execution info
   */
  getExecutionInfo(executionId: string): { startTime: number; workflowId: string } | null {
    return this.activeExecutions.get(executionId) || null;
  }

  /**
   * Check if execution is active
   */
  isActive(executionId: string): boolean {
    return this.activeExecutions.has(executionId);
  }
}
