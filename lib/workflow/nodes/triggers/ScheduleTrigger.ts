/**
 * Schedule Trigger Node
 * Triggers workflow on a schedule
 */

import { NodeHandler, NodeCategory, ValidationError } from '../../types';

export class ScheduleTrigger implements NodeHandler {
  type = 'schedule_trigger';
  category = NodeCategory.TRIGGER;
  name = 'Schedule Trigger';
  description = 'Triggers workflow on a schedule';

  inputs = [
    {
      id: 'cron',
      name: 'Cron Expression',
      type: 'string',
      required: true
    }
  ];

  outputs = [
    {
      id: 'schedule_data',
      name: 'Schedule Data',
      type: 'object',
      required: true
    }
  ];

  configSchema = {
    type: 'object',
    properties: {
      cron: { type: 'string' },
      timezone: { type: 'string' },
      enabled: { type: 'boolean' }
    },
    required: ['cron']
  };

  async execute(context: any, config: any): Promise<any> {
    const { cron, timezone = 'UTC', enabled = true } = config;

    // Simulate schedule trigger
    const scheduleData = {
      cron,
      timezone,
      enabled,
      lastRun: new Date().toISOString(),
      nextRun: this.calculateNextRun(cron),
      triggerId: `schedule_${Date.now()}`
    };

    return {
      success: true,
      result: scheduleData,
      metadata: {
        executionTime: 50,
        tokensUsed: 0,
        cost: 0
      }
    };
  }

  validate(config: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!config.cron) {
      errors.push({
        type: 'error',
        code: 'MISSING_CRON',
        message: 'Cron expression is required for schedule trigger',
        field: 'cron'
      });
    } else if (!this.isValidCron(config.cron)) {
      errors.push({
        type: 'error',
        code: 'INVALID_CRON',
        message: 'Invalid cron expression format',
        field: 'cron'
      });
    }

    return errors;
  }

  private isValidCron(cron: string): boolean {
    // Basic cron validation (5 fields: minute hour day month weekday)
    const cronRegex = /^(\*|([0-5]?\d)) (\*|([01]?\d|2[0-3])) (\*|([012]?\d|3[01])) (\*|([0]?\d|1[0-2])) (\*|([0-6]))$/;
    return cronRegex.test(cron);
  }

  private calculateNextRun(cron: string): string {
    // Simplified next run calculation (in real implementation, use a cron library)
    const now = new Date();
    const nextRun = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
    return nextRun.toISOString();
  }
}
