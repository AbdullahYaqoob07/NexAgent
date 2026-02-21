// ─── Delay Node Schema & Types ───────────────────────────────────────────────

export type TimeUnit = 'ms' | 's' | 'm';

/**
 * Config values coming from the node's UI fields (NodeDefinitions.ts).
 * These map 1:1 to the field `name` values defined there.
 */
export interface DelayNodeConfig {
  duration: number;   // raw number the user typed
  unit: TimeUnit;     // selected time unit
}

/**
 * Output shape that must match NodeDefinitions outputs.main.fields
 */
export interface DelayNodeOutput {
  delayedData: unknown;        // original input data, passed through
  delayDuration: number;       // actual milliseconds waited
  timestamp: string;           // ISO 8601 — when delay completed
}

/**
 * Optional progress callback: fires ~every second during the delay.
 * `elapsed` and `total` are both in milliseconds.
 */
export type DelayProgressCallback = (elapsed: number, total: number) => void;

/**
 * Options passed to the executor function.
 */
export interface DelayExecutorOptions {
  config: DelayNodeConfig;
  inputData: unknown;
  signal?: AbortSignal;                  // for cancellation
  onProgress?: DelayProgressCallback;   // optional live updates
}

// ─── Validation Constants ────────────────────────────────────────────────────

export const DELAY_LIMITS = {
  MIN_MS: 0,
  MAX_MS: 3_600_000,  // 1 hour, matches NodeDefinitions validation
} as const;

export const UNIT_TO_MS: Record<TimeUnit, number> = {
  ms: 1,
  s:  1_000,
  m:  60_000,
};

// ─── Custom Error ────────────────────────────────────────────────────────────

export class DelayError extends Error {
  constructor(
    message: string,
    public readonly code: 'CANCELLED' | 'INVALID_CONFIG' | 'TIMEOUT'
  ) {
    super(message);
    this.name = 'DelayError';
  }
}
