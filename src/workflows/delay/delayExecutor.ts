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
