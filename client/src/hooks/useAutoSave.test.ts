import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutoSave } from './useAutoSave';

describe('useAutoSave status transitions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('has no lastSaved until a write has succeeded, then saves after the debounce', async () => {
    let resolveSave: () => void = () => undefined;
    const onSave = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveSave = resolve;
        }),
    );
    const { result, rerender } = renderHook(({ data }) => useAutoSave(data, { debounceMs: 2000, onSave }), {
      initialProps: { data: { a: 1 } },
    });

    expect(result.current.lastSaved).toBeNull();
    expect(result.current.isSaving).toBe(false);

    rerender({ data: { a: 2 } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1999);
    });
    expect(onSave).not.toHaveBeenCalled();
    expect(result.current.lastSaved).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2);
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(result.current.isSaving).toBe(true);
    expect(result.current.lastSaved).toBeNull(); // still not "saved"

    await act(async () => {
      resolveSave();
    });
    expect(result.current.isSaving).toBe(false);
    expect(result.current.lastSaved).toBeInstanceOf(Date);
    expect(result.current.error).toBeNull();
  });

  it('reports an error and never sets lastSaved when the write fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('network down'));
    const { result, rerender } = renderHook(({ data }) => useAutoSave(data, { debounceMs: 100, onSave }), {
      initialProps: { data: { a: 1 } },
    });

    rerender({ data: { a: 2 } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(result.current.error?.message).toBe('network down');
    expect(result.current.lastSaved).toBeNull();
    expect(result.current.isSaving).toBe(false);
  });

  it('does not save when disabled, but saveNow works with schedule=false', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const disabled = renderHook(
      ({ data }) => useAutoSave(data, { debounceMs: 100, onSave, enabled: false }),
      { initialProps: { data: { a: 1 } } },
    );
    disabled.rerender({ data: { a: 2 } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(onSave).not.toHaveBeenCalled();

    const manual = renderHook(
      ({ data }) => useAutoSave(data, { debounceMs: 100, onSave, schedule: false }),
      { initialProps: { data: { a: 1 } } },
    );
    manual.rerender({ data: { a: 2 } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(onSave).not.toHaveBeenCalled();

    await act(async () => {
      await manual.result.current.saveNow();
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(manual.result.current.lastSaved).toBeInstanceOf(Date);
  });

  it('skips the write (and stays idle) when shouldSkipSave says nothing changed', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, { debounceMs: 100, onSave, shouldSkipSave: () => true }),
      { initialProps: { data: { a: 1 } } },
    );
    rerender({ data: { a: 2 } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(onSave).not.toHaveBeenCalled();
    expect(result.current.lastSaved).toBeNull();
  });
});
