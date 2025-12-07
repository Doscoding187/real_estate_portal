/**
 * Keyboard Navigation Hook Tests
 * 
 * Tests keyboard shortcuts, focus management, and navigation utilities.
 * Requirements: 5.1, 5.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useKeyboardNavigation,
  useEscapeKey,
  useArrowKeyNavigation,
  useFocusTrap,
} from '../useKeyboardNavigation';

describe('useKeyboardNavigation', () => {
  beforeEach(() => {
    // Clear any existing event listeners
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up
    vi.restoreAllMocks();
  });

  it('should call action when matching shortcut is pressed', () => {
    const mockAction = vi.fn();
    const shortcuts = [
      {
        key: 'f',
        description: 'Open filters',
        action: mockAction,
      },
    ];

    renderHook(() =>
      useKeyboardNavigation({
        shortcuts,
        enabled: true,
      })
    );

    // Simulate 'f' key press
    const event = new KeyboardEvent('keydown', { key: 'f' });
    act(() => {
      window.dispatchEvent(event);
    });

    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('should handle Ctrl+key combinations', () => {
    const mockAction = vi.fn();
    const shortcuts = [
      {
        key: 'k',
        ctrl: true,
        description: 'Search',
        action: mockAction,
      },
    ];

    renderHook(() =>
      useKeyboardNavigation({
        shortcuts,
        enabled: true,
      })
    );

    // Simulate Ctrl+K
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
    act(() => {
      window.dispatchEvent(event);
    });

    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('should not call action when disabled', () => {
    const mockAction = vi.fn();
    const shortcuts = [
      {
        key: 'f',
        description: 'Open filters',
        action: mockAction,
      },
    ];

    renderHook(() =>
      useKeyboardNavigation({
        shortcuts,
        enabled: false,
      })
    );

    const event = new KeyboardEvent('keydown', { key: 'f' });
    act(() => {
      window.dispatchEvent(event);
    });

    expect(mockAction).not.toHaveBeenCalled();
  });

  it('should prevent default for specified keys', () => {
    const mockAction = vi.fn();
    const shortcuts = [
      {
        key: 'ArrowDown',
        description: 'Navigate down',
        action: mockAction,
      },
    ];

    renderHook(() =>
      useKeyboardNavigation({
        shortcuts,
        enabled: true,
        preventDefaultKeys: ['ArrowDown'],
      })
    );

    const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    act(() => {
      window.dispatchEvent(event);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});

describe('useEscapeKey', () => {
  it('should call onEscape when Escape is pressed', () => {
    const mockOnEscape = vi.fn();

    renderHook(() => useEscapeKey(mockOnEscape, true));

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    act(() => {
      window.dispatchEvent(event);
    });

    expect(mockOnEscape).toHaveBeenCalledTimes(1);
  });

  it('should not call onEscape when disabled', () => {
    const mockOnEscape = vi.fn();

    renderHook(() => useEscapeKey(mockOnEscape, false));

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    act(() => {
      window.dispatchEvent(event);
    });

    expect(mockOnEscape).not.toHaveBeenCalled();
  });
});

describe('useArrowKeyNavigation', () => {
  it('should navigate down with ArrowDown', () => {
    const mockOnNavigate = vi.fn();

    renderHook(() => useArrowKeyNavigation(5, mockOnNavigate, true));

    const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    act(() => {
      window.dispatchEvent(event);
    });

    expect(mockOnNavigate).toHaveBeenCalledWith(1);
  });

  it('should navigate up with ArrowUp', () => {
    const mockOnNavigate = vi.fn();

    const { result } = renderHook(() =>
      useArrowKeyNavigation(5, mockOnNavigate, true)
    );

    // Set current index to 2
    act(() => {
      result.current.setCurrentIndex(2);
    });

    const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    act(() => {
      window.dispatchEvent(event);
    });

    expect(mockOnNavigate).toHaveBeenCalledWith(1);
  });

  it('should wrap around at boundaries', () => {
    const mockOnNavigate = vi.fn();

    renderHook(() => useArrowKeyNavigation(5, mockOnNavigate, true));

    // Navigate up from index 0 should wrap to 4
    const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    act(() => {
      window.dispatchEvent(event);
    });

    expect(mockOnNavigate).toHaveBeenCalledWith(4);
  });

  it('should navigate to first item with Home', () => {
    const mockOnNavigate = vi.fn();

    const { result } = renderHook(() =>
      useArrowKeyNavigation(5, mockOnNavigate, true)
    );

    // Set current index to 3
    act(() => {
      result.current.setCurrentIndex(3);
    });

    const event = new KeyboardEvent('keydown', { key: 'Home' });
    act(() => {
      window.dispatchEvent(event);
    });

    expect(mockOnNavigate).toHaveBeenCalledWith(0);
  });

  it('should navigate to last item with End', () => {
    const mockOnNavigate = vi.fn();

    renderHook(() => useArrowKeyNavigation(5, mockOnNavigate, true));

    const event = new KeyboardEvent('keydown', { key: 'End' });
    act(() => {
      window.dispatchEvent(event);
    });

    expect(mockOnNavigate).toHaveBeenCalledWith(4);
  });
});

describe('useFocusTrap', () => {
  it('should trap focus within container', () => {
    const container = document.createElement('div');
    const button1 = document.createElement('button');
    const button2 = document.createElement('button');
    
    container.appendChild(button1);
    container.appendChild(button2);
    document.body.appendChild(container);

    const containerRef = { current: container };

    renderHook(() => useFocusTrap(containerRef, true));

    // Focus first button
    button1.focus();
    expect(document.activeElement).toBe(button1);

    // Simulate Tab from last button (should wrap to first)
    button2.focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab' });
    act(() => {
      container.dispatchEvent(event);
    });

    // Clean up
    document.body.removeChild(container);
  });
});
