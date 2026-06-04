import { StrictMode, type PropsWithChildren } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAutoSave } from '../useAutoSave';

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useAutoSave', () => {
  it('does not schedule a save merely because StrictMode mounts effects twice', async () => {
    vi.useFakeTimers();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const wrapper = ({ children }: PropsWithChildren) => <StrictMode>{children}</StrictMode>;

    renderHook(() => useAutoSave({ revision: 1 }, { debounceMs: 100, onSave }), {
      wrapper,
    });
    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('skips the initial mount and debounces the latest changed snapshot', async () => {
    vi.useFakeTimers();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, { debounceMs: 300, onSave }),
      { initialProps: { data: { revision: 1 } } },
    );

    expect(onSave).not.toHaveBeenCalled();
    await act(async () => {
      await Promise.resolve();
    });

    rerender({ data: { revision: 2 } });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(onSave).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({ revision: 2 });
    expect(result.current.lastSaved).toBeInstanceOf(Date);
    expect(result.current.isSaving).toBe(false);
  });

  it('serializes three rapid manual saves and preserves each requested snapshot', async () => {
    const saves = [deferred(), deferred(), deferred()];
    let activeSaves = 0;
    let maxActiveSaves = 0;
    const snapshots: number[] = [];
    const onSave = vi.fn(async (data: { revision: number }) => {
      const save = saves[snapshots.length];
      snapshots.push(data.revision);
      activeSaves += 1;
      maxActiveSaves = Math.max(maxActiveSaves, activeSaves);
      await save.promise;
      activeSaves -= 1;
    });
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, { onSave }),
      { initialProps: { data: { revision: 1 } } },
    );

    let firstSave!: Promise<void>;
    act(() => {
      firstSave = result.current.saveNow();
    });
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));

    rerender({ data: { revision: 2 } });
    let secondSave!: Promise<void>;
    act(() => {
      secondSave = result.current.saveNow();
    });

    rerender({ data: { revision: 3 } });
    let thirdSave!: Promise<void>;
    act(() => {
      thirdSave = result.current.saveNow();
    });

    await Promise.resolve();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(result.current.isSaving).toBe(true);

    await act(async () => {
      saves[0].resolve();
      await firstSave;
    });
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
    expect(result.current.isSaving).toBe(true);

    await act(async () => {
      saves[1].resolve();
      await secondSave;
    });
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(3));
    expect(result.current.isSaving).toBe(true);

    await act(async () => {
      saves[2].resolve();
      await thirdSave;
    });

    expect(snapshots).toEqual([1, 2, 3]);
    expect(maxActiveSaves).toBe(1);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.lastSaved).toBeInstanceOf(Date);
  });

  it('lets only the latest queued revision own failure and success status', async () => {
    const first = deferred();
    const second = deferred();
    const onError = vi.fn();
    const onSave = vi
      .fn<(data: { revision: number }) => Promise<void>>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, { onError, onSave }),
      { initialProps: { data: { revision: 1 } } },
    );

    let firstSave!: Promise<void>;
    act(() => {
      firstSave = result.current.saveNow();
    });
    const handledFirstSave = firstSave.catch(error => error);
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));

    rerender({ data: { revision: 2 } });
    let secondSave!: Promise<void>;
    act(() => {
      secondSave = result.current.saveNow();
    });

    const staleFailure = new Error('stale failure');
    await act(async () => {
      first.reject(staleFailure);
      await handledFirstSave;
    });
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));

    expect(result.current.error).toBeNull();
    expect(result.current.isSaving).toBe(true);
    expect(onError).not.toHaveBeenCalled();

    await act(async () => {
      second.resolve();
      await secondSave;
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isSaving).toBe(false);
    expect(result.current.lastSaved).toBeInstanceOf(Date);
  });

  it('catches a debounced background failure and exposes it through status', async () => {
    vi.useFakeTimers();
    const saveFailure = new Error('background save failed');
    const onError = vi.fn();
    const onSave = vi.fn().mockRejectedValue(saveFailure);
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, { debounceMs: 50, onError, onSave }),
      { initialProps: { data: { revision: 1 } } },
    );

    await act(async () => {
      await Promise.resolve();
    });
    rerender({ data: { revision: 2 } });
    await act(async () => {
      vi.advanceTimersByTime(50);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onSave).toHaveBeenCalledWith({ revision: 2 });
    expect(onError).toHaveBeenCalledWith(saveFailure);
    expect(result.current.error).toBe(saveFailure);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.lastSaved).toBeNull();
  });

  it('uses the save destination captured when a queued save is requested', async () => {
    const first = deferred();
    const second = deferred();
    const saveDraftOne = vi.fn(() => first.promise);
    const saveDraftTwo = vi.fn(() => second.promise);
    const saveDraftThree = vi.fn().mockResolvedValue(undefined);
    const stableData = { revision: 1 };
    const { result, rerender } = renderHook(
      ({ onSave }) => useAutoSave(stableData, { onSave }),
      { initialProps: { onSave: saveDraftOne } },
    );

    let firstSave!: Promise<void>;
    act(() => {
      firstSave = result.current.saveNow();
    });
    await waitFor(() => expect(saveDraftOne).toHaveBeenCalledTimes(1));

    rerender({ onSave: saveDraftTwo });
    let secondSave!: Promise<void>;
    act(() => {
      secondSave = result.current.saveNow();
    });
    rerender({ onSave: saveDraftThree });

    await act(async () => {
      first.resolve();
      await firstSave;
    });
    await waitFor(() => expect(saveDraftTwo).toHaveBeenCalledTimes(1));

    expect(saveDraftOne).toHaveBeenCalledTimes(1);
    expect(saveDraftTwo).toHaveBeenCalledTimes(1);
    expect(saveDraftThree).not.toHaveBeenCalled();

    await act(async () => {
      second.resolve();
      await secondSave;
    });
  });

  it('does not schedule a save when only callback identity changes', async () => {
    vi.useFakeTimers();
    const firstOnSave = vi.fn().mockResolvedValue(undefined);
    const latestOnSave = vi.fn().mockResolvedValue(undefined);
    const stableData = { revision: 1 };
    const { result, rerender } = renderHook(
      ({ onSave }) => useAutoSave(stableData, { debounceMs: 100, onSave }),
      { initialProps: { onSave: firstOnSave } },
    );

    rerender({ onSave: latestOnSave });
    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(firstOnSave).not.toHaveBeenCalled();
    expect(latestOnSave).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.saveNow();
    });
    expect(latestOnSave).toHaveBeenCalledWith(stableData);
  });

  it('keeps manual saves inert while disabled', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoSave({ revision: 1 }, { enabled: false, onSave }),
    );

    await act(async () => {
      await result.current.saveNow();
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(result.current.lastSaved).toBeNull();
  });
});
