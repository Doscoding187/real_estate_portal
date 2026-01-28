import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useThrottle } from '../useThrottle';
import { useDebounce } from '../useDebounce';

describe('useThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useThrottle('initial', 250));
    expect(result.current).toBe('initial');
  });

  it('should throttle rapid value changes', () => {
    const { result, rerender } = renderHook(({ value }) => useThrottle(value, 250), {
      initialProps: { value: 'first' },
    });

    expect(result.current).toBe('first');

    // Change value rapidly
    rerender({ value: 'second' });
    rerender({ value: 'third' });
    rerender({ value: 'fourth' });

    // Should still be first value (throttled)
    expect(result.current).toBe('first');

    // Advance time by 250ms
    act(() => {
      vi.advanceTimersByTime(250);
    });

    // Should now have the latest value
    expect(result.current).toBe('fourth');
  });

  it('should work with different types', () => {
    const { result } = renderHook(() => useThrottle(42, 250));
    expect(result.current).toBe(42);
    expect(typeof result.current).toBe('number');
  });

  it('should work with complex objects', () => {
    const obj = { lat: 10, lng: 20 };
    const { result } = renderHook(() => useThrottle(obj, 250));
    expect(result.current).toEqual(obj);
  });
});

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('should debounce rapid value changes', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'first' },
    });

    expect(result.current).toBe('first');

    // Change value rapidly
    rerender({ value: 'second' });
    rerender({ value: 'third' });
    rerender({ value: 'fourth' });

    // Should still be first value (not debounced yet)
    expect(result.current).toBe('first');

    // Advance time by less than delay
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Should still be first value
    expect(result.current).toBe('first');

    // Advance time to complete delay
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Should now have the latest value
    expect(result.current).toBe('fourth');
  });

  it('should reset timer on each value change', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'first' },
    });

    rerender({ value: 'second' });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Change again before delay completes
    rerender({ value: 'third' });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Should still be first (timer was reset)
    expect(result.current).toBe('first');

    // Complete the delay
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Should now be third
    expect(result.current).toBe('third');
  });

  it('should work with different types', () => {
    const { result } = renderHook(() => useDebounce(42, 300));
    expect(result.current).toBe(42);
    expect(typeof result.current).toBe('number');
  });

  it('should work with complex objects', () => {
    const obj = { search: 'test', filters: ['a', 'b'] };
    const { result } = renderHook(() => useDebounce(obj, 300));
    expect(result.current).toEqual(obj);
  });
});
