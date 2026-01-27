/**
 * Keyboard Mode Detection Hook
 *
 * Detects when user is navigating with keyboard vs mouse.
 * Adds 'keyboard-navigation' class to body for enhanced focus styles.
 * Requirements: 5.1
 *
 * Features:
 * - Automatic detection of keyboard usage
 * - Body class management
 * - Focus style optimization
 */

import { useEffect } from 'react';

export function useKeyboardMode() {
  useEffect(() => {
    let isKeyboardMode = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Tab key indicates keyboard navigation
      if (e.key === 'Tab' && !isKeyboardMode) {
        isKeyboardMode = true;
        document.body.classList.add('keyboard-navigation');
      }
    };

    const handleMouseDown = () => {
      // Mouse click indicates mouse navigation
      if (isKeyboardMode) {
        isKeyboardMode = false;
        document.body.classList.remove('keyboard-navigation');
      }
    };

    // Listen for keyboard and mouse events
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
      document.body.classList.remove('keyboard-navigation');
    };
  }, []);
}

/**
 * Focus Management Hook
 *
 * Provides utilities for managing focus programmatically.
 */

export function useFocusManagement() {
  const focusElement = (selector: string) => {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) {
      element.focus();
      return true;
    }
    return false;
  };

  const focusFirstInteractive = (container?: HTMLElement) => {
    const root = container || document.body;
    const firstInteractive = root.querySelector<HTMLElement>(
      'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    );
    if (firstInteractive) {
      firstInteractive.focus();
      return true;
    }
    return false;
  };

  const focusLastInteractive = (container?: HTMLElement) => {
    const root = container || document.body;
    const interactiveElements = Array.from(
      root.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      ),
    );
    const lastInteractive = interactiveElements[interactiveElements.length - 1];
    if (lastInteractive) {
      lastInteractive.focus();
      return true;
    }
    return false;
  };

  const saveFocus = () => {
    return document.activeElement as HTMLElement;
  };

  const restoreFocus = (element: HTMLElement | null) => {
    if (element && element.focus) {
      element.focus();
    }
  };

  return {
    focusElement,
    focusFirstInteractive,
    focusLastInteractive,
    saveFocus,
    restoreFocus,
  };
}
