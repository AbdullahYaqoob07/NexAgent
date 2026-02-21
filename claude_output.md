Architecture Decisions (answering your questions upfront)Cancellation: Use AbortController — it's the modern standard, composable with fetch/other async ops, and gives you a clean signal to thread through the executor chain.Progress updates: Yes, emit them via a callback — but make it optional so the executor works without a UI context.Error handling: A delay itself can't really "fail" (no network), but cancellation and validation can throw — use a custom DelayError subclass so callers can distinguish it.Type structure: One schema.ts for inputs/outputs, one delayExecutor.ts for logic, one index.ts for the barrel export.
File 1: src/workflows/delay/schema.ts
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


File 2: src/workflows/delay/delayExecutor.ts
// ─── Delay Node Executor ──────────────────────────────────────────────────────

import {
  DelayExecutorOptions,
  DelayNodeOutput,
  DelayError,
  DELAY_LIMITS,
  UNIT_TO_MS,
} from './schema';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Converts user-supplied duration + unit into a clamped millisecond value.
 * Throws DelayError if the config values are unusable.
 */
export function resolveDelayMs(duration: number, unit: string): number {
  if (!Number.isFinite(duration) || duration < 0) {
    throw new DelayError(
      `Invalid duration: "${duration}". Must be a non-negative number.`,
      'INVALID_CONFIG'
    );
  }

  const multiplier = UNIT_TO_MS[unit as keyof typeof UNIT_TO_MS];
  if (multiplier === undefined) {
    throw new DelayError(
      `Unknown time unit: "${unit}". Expected ms | s | m.`,
      'INVALID_CONFIG'
    );
  }

  const raw = duration * multiplier;

  // Clamp to allowed range (mirrors NodeDefinitions validation)
  return Math.min(Math.max(raw, DELAY_LIMITS.MIN_MS), DELAY_LIMITS.MAX_MS);
}

/**
 * Promise-based sleep that:
 *  - resolves after `ms` milliseconds
 *  - rejects immediately if `signal` is already aborted
 *  - rejects with DelayError('CANCELLED') if signal fires mid-wait
 *  - fires `onProgress` roughly every second while waiting
 */
function sleep(
  ms: number,
  signal?: AbortSignal,
  onProgress?: (elapsed: number, total: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Already cancelled before we even start
    if (signal?.aborted) {
      reject(new DelayError('Delay cancelled before it started.', 'CANCELLED'));
      return;
    }

    // Zero-duration fast path
    if (ms === 0) {
      resolve();
      return;
    }

    const startTime = Date.now();
    let mainTimer: ReturnType<typeof setTimeout>;
    let progressInterval: ReturnType<typeof setInterval> | undefined;

    const cleanup = () => {
      clearTimeout(mainTimer);
      clearInterval(progressInterval);
    };

    // Cancellation handler
    const onAbort = () => {
      cleanup();
      reject(new DelayError('Delay was cancelled by workflow abort signal.', 'CANCELLED'));
    };

    signal?.addEventListener('abort', onAbort, { once: true });

    // Optional progress ticker (~1s granularity)
    if (onProgress) {
      progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        onProgress(Math.min(elapsed, ms), ms);
      }, 1_000);
    }

    // Main delay
    mainTimer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      cleanup();
      resolve();
    }, ms);
  });
}

// ─── Main Executor ────────────────────────────────────────────────────────────

/**
 * Executes the Delay node.
 *
 * Usage:
 *   const output = await executeDelayNode({
 *     config: { duration: 5, unit: 's' },
 *     inputData: previousNodeOutput,
 *     signal: abortController.signal,
 *     onProgress: (elapsed, total) => console.log(`${elapsed}/${total}ms`),
 *   });
 */
export async function executeDelayNode(
  options: DelayExecutorOptions
): Promise<DelayNodeOutput> {
  const { config, inputData, signal, onProgress } = options;

  // 1. Resolve and validate delay duration
  const delayMs = resolveDelayMs(config.duration, config.unit);

  // 2. Wait (respects cancellation + emits progress)
  await sleep(delayMs, signal, onProgress);

  // 3. Build structured output (matches NodeDefinitions schema)
  return {
    delayedData: inputData ?? null,
    delayDuration: delayMs,
    timestamp: new Date().toISOString(),
  };
}

File 3: src/workflows/delay/index.ts
// ─── Delay Node — Public API ──────────────────────────────────────────────────

export { executeDelayNode, resolveDelayMs } from './delayExecutor';
export type {
  DelayNodeConfig,
  DelayNodeOutput,
  DelayExecutorOptions,
  DelayProgressCallback,
  TimeUnit,
} from './schema';
export { DelayError, DELAY_LIMITS, UNIT_TO_MS } from './schema';

File 4: Root nodes/index.ts — Registry Integration
// ─── Node Executor Registry ───────────────────────────────────────────────────
// Add new node executors here. WorkflowExecutor.executeNode() looks them up
// by the `type` string that matches NodeDefinitions.ts keys.

import { executeDelayNode } from '../src/workflows/delay';
// import { executeHttpNode }  from '../src/workflows/http';
// import { executeIfNode }    from '../src/workflows/if';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NodeExecutionContext {
  nodeId: string;
  nodeType: string;
  config: Record<string, unknown>;
  inputData: unknown;
  signal?: AbortSignal;
  onProgress?: (elapsed: number, total: number) => void;
}

export type NodeExecutorFn = (ctx: NodeExecutionContext) => Promise<unknown>;

// ─── Registry ─────────────────────────────────────────────────────────────────

const NODE_REGISTRY: Record<string, NodeExecutorFn> = {

  Delay: async (ctx) =>
    executeDelayNode({
      config: {
        duration: Number(ctx.config.duration ?? 0),
        unit: (ctx.config.unit as 's' | 'm' | 'ms') ?? 'ms',
      },
      inputData: ctx.inputData,
      signal: ctx.signal,
      onProgress: ctx.onProgress,
    }),

  // Http: async (ctx) => executeHttpNode({ ... }),
};

// ─── Lookup Helper (used by WorkflowExecutor) ─────────────────────────────────

export function getNodeExecutor(nodeType: string): NodeExecutorFn {
  const executor = NODE_REGISTRY[nodeType];
  if (!executor) {
    throw new Error(
      `No executor registered for node type "${nodeType}". ` +
      `Did you forget to add it to nodes/index.ts?`
    );
  }
  return executor;
}

File 5: delayExecutor.test.ts — Tests
// ─── Delay Executor Tests ─────────────────────────────────────────────────────
// Run with: npx vitest  or  npx jest

import { executeDelayNode, resolveDelayMs } from './delayExecutor';
import { DelayError } from './schema';

// ─── resolveDelayMs ───────────────────────────────────────────────────────────

describe('resolveDelayMs', () => {
  it('converts seconds to ms', () => {
    expect(resolveDelayMs(5, 's')).toBe(5_000);
  });

  it('converts minutes to ms', () => {
    expect(resolveDelayMs(2, 'm')).toBe(120_000);
  });

  it('passes ms through unchanged', () => {
    expect(resolveDelayMs(250, 'ms')).toBe(250);
  });

  it('clamps to MAX_MS (1 hour)', () => {
    expect(resolveDelayMs(999, 'm')).toBe(3_600_000);
  });

  it('clamps negative values to 0', () => {
    expect(resolveDelayMs(-100, 'ms')).toBe(0);
  });

  it('throws INVALID_CONFIG on NaN', () => {
    expect(() => resolveDelayMs(NaN, 'ms')).toThrow(DelayError);
  });

  it('throws INVALID_CONFIG on unknown unit', () => {
    expect(() => resolveDelayMs(10, 'hours' as never)).toThrow(DelayError);
  });
});

// ─── executeDelayNode ─────────────────────────────────────────────────────────

describe('executeDelayNode', () => {
  it('passes through inputData as delayedData', async () => {
    const input = { foo: 'bar' };
    const result = await executeDelayNode({
      config: { duration: 0, unit: 'ms' },
      inputData: input,
    });
    expect(result.delayedData).toEqual(input);
  });

  it('returns correct delayDuration in ms', async () => {
    const result = await executeDelayNode({
      config: { duration: 0, unit: 's' },
      inputData: null,
    });
    expect(result.delayDuration).toBe(0);
  });

  it('returns an ISO timestamp', async () => {
    const result = await executeDelayNode({
      config: { duration: 0, unit: 'ms' },
      inputData: null,
    });
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  it('resolves immediately for duration=0', async () => {
    const start = Date.now();
    await executeDelayNode({ config: { duration: 0, unit: 'ms' }, inputData: null });
    expect(Date.now() - start).toBeLessThan(50);
  });

  it('rejects with CANCELLED when signal is aborted during delay', async () => {
    const controller = new AbortController();

    const promise = executeDelayNode({
      config: { duration: 5, unit: 's' },
      inputData: null,
      signal: controller.signal,
    });

    // Cancel after 20ms
    setTimeout(() => controller.abort(), 20);

    await expect(promise).rejects.toMatchObject({
      code: 'CANCELLED',
      name: 'DelayError',
    });
  });

  it('rejects immediately if signal already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      executeDelayNode({
        config: { duration: 1, unit: 's' },
        inputData: null,
        signal: controller.signal,
      })
    ).rejects.toMatchObject({ code: 'CANCELLED' });
  });

  it('fires onProgress callback during delay', async () => {
    const ticks: number[] = [];

    await executeDelayNode({
      config: { duration: 2500, unit: 'ms' },
      inputData: null,
      onProgress: (elapsed) => ticks.push(elapsed),
    });

    // Should have fired at least twice (~1s and ~2s)
    expect(ticks.length).toBeGreaterThanOrEqual(2);
  });
});
Here's a summary of the implementation and the reasoning behind each decision:

What was built
5 files total:
FilePurposeschema.tsAll types, constants, DelayErrordelayExecutor.tsCore logic: resolveDelayMs() + executeDelayNode()delay/index.tsBarrel export for the modulenodes/index.tsRegistry — how WorkflowExecutor.executeNode() finds the Delay executordelayExecutor.test.tsTest coverage for all edge cases

Answers to your questions
1. Best structure for the executor file? Two-function design: resolveDelayMs() (pure, synchronous, easily testable) separated from executeDelayNode() (async orchestrator). This makes unit testing trivial.
2 & 3. AbortController vs. flag? AbortController — it's composable (works with fetch if you ever add HTTP nodes), supports the { once: true } listener pattern to avoid memory leaks, and is the standard browser/Node API. A manual flag would require polling.
4. Errors during delay? A pure setTimeout delay genuinely can't fail from network interrupts — the only real failure modes are cancellation and bad config. The sleep() function handles both cleanly. If you later need a "deadline" pattern (e.g., fail if delay exceeds wall time budget), you can add a second setTimeout race inside sleep().
5. Progress updates? Yes, via an optional onProgress callback that fires every ~1 second using setInterval. The interval is always cleared on resolve/reject so there are no leaks. Your UI can wire this to a progress bar without the executor knowing about React.
6. TypeScript types? DelayError extends Error with a discriminated code field, so callers can catch (e) { if (e instanceof DelayError && e.code === 'CANCELLED') { ... } } cleanly. Input/output types are strict interfaces that mirror NodeDefinitions field names exactly.