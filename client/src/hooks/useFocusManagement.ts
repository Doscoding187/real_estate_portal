/**
 * useFocusManagement Hook
 * 
 * React hook for managing focus indicators and keyboard navigation.
 * 
 * Requirements: 10.5
 */

import { useEffect, useRef } from 'react';
import { initializeFocusManager, createFocusTrap, FocusTrap } from '@/lib/accessibility/focusManager';

/**
 * Initialize global focus management
 * 
 * Should be called once at the app level to set up keyboard/mouse detection.
 */
export function useFocusManager(): void {
  useEffect(() => {
    const cleanup = initializeFocusManager();
    return cleanup;
  }, []);
}

/**
 * Create a focus trap for a modal or overlay
 * 
 * @param isActive - Whether the focus trap should be active
 * @returns Ref to attach to the container element
 */
export function useFocusTrap<T extends HTMLElement>(
  isActive: boolean
): React.RefObject<T> {
  const ref = useRef<T>(null);
  const focusTrapRef = useRef<FocusTrap | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    if (isActive) {
      focusTrapRef.current = createFocusTrap(ref.current);
      focusTrapRef.current.activate();
    }

    return () => {
      if (focusTrapRef.current) {
        focusTrapRef.current.deactivate();
        focusTrapRef.current = null;
      }
    };
  }, [isActive]);

  return ref;
}

/**
 * Auto-focus an element when it mounts
 * 
 * @param shouldFocus - Whether to focus the element
 * @param delay - Optional delay before focusing (in ms)
 * @returns Ref to attach to the element
 */
export function useAutoFocus<T extends HTMLElement>(
  shouldFocus: boolean = true,
  delay: number = 0
): React.RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!ref.current || !shouldFocus) return;

    const timeoutId = setTimeout(() => {
      ref.current?.focus();
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [shouldFocus, delay]);

  return ref;
}

/**
 * Restore focus to a previous element
 * 
 * Useful for modals and overlays that need to return focus
 * to the trigger element when closed.
 * 
 * @returns Object with methods to save and restore focus
 */
export function useFocusRestore() {
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  const saveFocus = () => {
    previouslyFocusedElement.current = document.activeElement as HTMLElement;
  };

  const restoreFocus = () => {
    if (previouslyFocusedElement.current) {
      previouslyFocusedElement.current.focus();
      previouslyFocusedElement.current = null;
    }
  };

  return { saveFocus, restoreFocus };
}

/**
 * Track focus within a container
 * 
 * @returns Object with ref and boolean indicating if focus is within
 */
export function useFocusWithin<T extends HTMLElement>(): {
  ref: React.RefObject<T>;
  isFocusWithin: boolean;
} {
  const ref = useRef<T>(null);
  const [isFocusWithin, setIsFocusWithin] = React.useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleFocusIn = () => setIsFocusWithin(true);
    const handleFocusOut = (e: FocusEvent) => {
      // Check if focus moved outside the container
      if (!element.contains(e.relatedTarget as Node)) {
        setIsFocusWithin(false);
      }
    };

    element.addEventListener('focusin', handleFocusIn);
    element.addEventListener('focusout', handleFocusOut);

    return () => {
      element.removeEventListener('focusin', handleFocusIn);
      element.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  return { ref, isFocusWithin };
}

/**
 * Handle focus visible state
 * 
 * Provides a way to style elements differently when focused via keyboard
 * vs mouse/touch.
 * 
 * @returns Object with ref and boolean indicating if focus is visible
 */
export function useFocusVisible<T extends HTMLElement>(): {
  ref: React.RefObject<T>;
  isFocusVisible: boolean;
} {
  const ref = useRef<T>(null);
  const [isFocusVisible, setIsFocusVisible] = React.useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleFocus = () => {
      // Check if body has 'using-keyboard' class
      const isUsingKeyboard = document.body.classList.contains('using-keyboard');
      setIsFocusVisible(isUsingKeyboard);
    };

    const handleBlur = () => {
      setIsFocusVisible(false);
    };

    element.addEventListener('focus', handleFocus);
    element.addEventListener('blur', handleBlur);

    return () => {
      element.removeEventListener('focus', handleFocus);
      element.removeEventListener('blur', handleBlur);
    };
  }, []);

  return { ref, isFocusVisible };
}
