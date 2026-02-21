/// <reference types="vitest" />

// ─── Delay Executor Tests ─────────────────────────────────────────────────────
// Run with: npx vitest  or  npx jest

import { describe, it, expect } from 'vitest';
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
