import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from '../useOnlineStatus';
import { vi } from 'vitest';

describe('useOnlineStatus', () => {
  let onlineGetter: any;

  beforeEach(() => {
    // Mock navigator.onLine
    onlineGetter = vi.spyOn(navigator, 'onLine', 'get');
  });

  afterEach(() => {
    onlineGetter.mockRestore();
  });

  it('should return true when online', () => {
    onlineGetter.mockReturnValue(true);
    
    const { result } = renderHook(() => useOnlineStatus());
    
    expect(result.current).toBe(true);
  });

  it('should return false when offline', () => {
    onlineGetter.mockReturnValue(false);
    
    const { result } = renderHook(() => useOnlineStatus());
    
    expect(result.current).toBe(false);
  });

  it('should update to false when going offline', () => {
    onlineGetter.mockReturnValue(true);
    
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    // Simulate going offline
    act(() => {
      onlineGetter.mockReturnValue(false);
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current).toBe(false);
  });

  it('should update to true when coming back online', () => {
    onlineGetter.mockReturnValue(false);
    
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);

    // Simulate coming back online
    act(() => {
      onlineGetter.mockReturnValue(true);
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current).toBe(true);
  });

  it('should clean up event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    
    const { unmount } = renderHook(() => useOnlineStatus());
    
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    
    removeEventListenerSpy.mockRestore();
  });

  it('should handle rapid online/offline transitions', () => {
    onlineGetter.mockReturnValue(true);
    
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    // Rapid transitions
    act(() => {
      onlineGetter.mockReturnValue(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);

    act(() => {
      onlineGetter.mockReturnValue(true);
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current).toBe(true);

    act(() => {
      onlineGetter.mockReturnValue(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);
  });
});
