/**
 * Execution Logger for NexAgent Workflow Engine
 * Handles step-by-step execution logging with sidebar and engine node names
 */

import { ExecutionLog, LoggerConfig } from './types';

export class WorkflowLogger {
  private logs: ExecutionLog[] = [];
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      enableConsoleLogging: true,
      enableFileLogging: false,
      logLevel: 'info',
      maxLogEntries: 1000,
      ...config
    };
  }

  /**
   * Start logging a new step
   */
  startStep(
    stepNumber: number,
    sidebarNodeType: string,
    engineNodeClass: string,
    nodeName: string,
    input?: any
  ): ExecutionLog {
    const log: ExecutionLog = {
      stepNumber,
      sidebarNodeType,
      engineNodeClass,
      nodeName,
      status: 'running',
      startTime: Date.now(),
      retryCount: 0,
      input,
      metadata: {}
    };

    this.logs.push(log);
    this.logInfo(`Step ${stepNumber}: ${sidebarNodeType} → ${engineNodeClass} → 🟡 Running`);
    
    return log;
  }

  /**
   * Complete a step successfully
   */
  completeStep(
    log: ExecutionLog,
    output: any,
    metadata: Record<string, any> = {}
  ): void {
    log.status = 'completed';
    log.endTime = Date.now();
    log.duration = log.endTime - log.startTime;
    log.output = output;
    log.metadata = { ...log.metadata, ...metadata };

    this.logInfo(
      `Step ${log.stepNumber}: ${log.sidebarNodeType} → ${log.engineNodeClass} → ✅ Success (${log.duration}ms)`
    );
  }

  /**
   * Mark a step as failed
   */
  failStep(
    log: ExecutionLog,
    error: string,
    metadata: Record<string, any> = {}
  ): void {
    log.status = 'failed';
    log.endTime = Date.now();
    log.duration = log.endTime - log.startTime;
    log.error = error;
    log.metadata = { ...log.metadata, ...metadata };

    this.logError(
      `Step ${log.stepNumber}: ${log.sidebarNodeType} → ${log.engineNodeClass} → ❌ Failed: ${error}`
    );
  }

  /**
   * Skip a step
   */
  skipStep(
    log: ExecutionLog,
    reason: string,
    metadata: Record<string, any> = {}
  ): void {
    log.status = 'skipped';
    log.endTime = Date.now();
    log.duration = log.endTime - log.startTime;
    log.error = reason;
    log.metadata = { ...log.metadata, ...metadata };

    this.logWarn(
      `Step ${log.stepNumber}: ${log.sidebarNodeType} → ${log.engineNodeClass} → ⏭️ Skipped: ${reason}`
    );
  }

  /**
   * Retry a step
   */
  retryStep(log: ExecutionLog, retryCount: number): void {
    log.retryCount = retryCount;
    log.status = 'running';
    log.startTime = Date.now();
    log.endTime = undefined;
    log.duration = undefined;
    log.error = undefined;

    this.logInfo(
      `Step ${log.stepNumber}: ${log.sidebarNodeType} → ${log.engineNodeClass} → 🔄 Retry ${retryCount}`
    );
  }

  /**
   * Get all execution logs
   */
  getLogs(): ExecutionLog[] {
    return [...this.logs];
  }

  /**
   * Get logs by status
   */
  getLogsByStatus(status: ExecutionLog['status']): ExecutionLog[] {
    return this.logs.filter(log => log.status === status);
  }

  /**
   * Get execution summary
   */
  getExecutionSummary(): {
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    skippedSteps: number;
    totalDuration: number;
    totalTokensUsed: number;
    totalCost: number;
  } {
    const totalSteps = this.logs.length;
    const completedSteps = this.logs.filter(log => log.status === 'completed').length;
    const failedSteps = this.logs.filter(log => log.status === 'failed').length;
    const skippedSteps = this.logs.filter(log => log.status === 'skipped').length;
    
    const totalDuration = this.logs.reduce((sum, log) => sum + (log.duration || 0), 0);
    const totalTokensUsed = this.logs.reduce((sum, log) => sum + (log.metadata.tokensUsed || 0), 0);
    const totalCost = this.logs.reduce((sum, log) => sum + (log.metadata.cost || 0), 0);

    return {
      totalSteps,
      completedSteps,
      failedSteps,
      skippedSteps,
      totalDuration,
      totalTokensUsed,
      totalCost
    };
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Private logging methods
   */
  private logInfo(message: string): void {
    if (this.config.enableConsoleLogging && this.shouldLog('info')) {
      console.log(`[WorkflowEngine] ${message}`);
    }
  }

  private logWarn(message: string): void {
    if (this.config.enableConsoleLogging && this.shouldLog('warn')) {
      console.warn(`[WorkflowEngine] ${message}`);
    }
  }

  private logError(message: string): void {
    if (this.config.enableConsoleLogging && this.shouldLog('error')) {
      console.error(`[WorkflowEngine] ${message}`);
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }
}
