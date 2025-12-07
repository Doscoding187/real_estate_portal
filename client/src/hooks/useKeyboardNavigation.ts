/**
 * Keyboard Navigation Hook
 * 
 * Provides keyboard shortcuts and navigation support for Explore pages.
 * Requirements: 5.1, 5.6
 * 
 * Features:
 * - Common keyboard shortcuts (Escape, Enter, Arrow keys)
 * - Focus management
 * - Keyboard event handling
 * - Accessibility compliance
 */

import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
}

interface UseKeyboardNavigationOptions {
  shortcuts?: KeyboardShortcut[];
  enabled?: boolean;
  preventDefaultKeys?: string[];
}

export function useKeyboardNavigation({
  shortcuts = [],
  enabled = true,
  preventDefaultKeys = [],
}: UseKeyboardNavigationOptions = {}) {
  const shortcutsRef = useRef(shortcuts);

  // Update shortcuts ref when they change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Prevent default for specified keys
      if (preventDefaultKeys.includes(event.key)) {
        event.preventDefault();
      }

      // Check if any shortcut matches
      for (const shortcut of shortcutsRef.current) {
        const keyMatches = event.key === shortcut.key;
        const ctrlMatches = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatches = shortcut.alt ? event.altKey : !event.altKey;

        if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    },
    [enabled, preventDefaultKeys]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  return {
    shortcuts: shortcutsRef.current,
  };
}

/**
 * Focus Management Utilities
 */

export function useFocusTrap(containerRef: React.RefObject<HTMLElement>, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    return () => container.removeEventListener('keydown', handleTabKey);
  }, [containerRef, enabled]);
}

export function useFocusOnMount(elementRef: React.RefObject<HTMLElement>, enabled: boolean = true) {
  useEffect(() => {
    if (enabled && elementRef.current) {
      // Small delay to ensure element is fully rendered
      const timer = setTimeout(() => {
        elementRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [elementRef, enabled]);
}

/**
 * Arrow Key Navigation for Lists
 */

export function useArrowKeyNavigation(
  itemsCount: number,
  onNavigate: (index: number) => void,
  enabled: boolean = true
) {
  const currentIndexRef = useRef(0);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || itemsCount === 0) return;

      let newIndex = currentIndexRef.current;

      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          event.preventDefault();
          newIndex = (currentIndexRef.current + 1) % itemsCount;
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          event.preventDefault();
          newIndex = (currentIndexRef.current - 1 + itemsCount) % itemsCount;
          break;
        case 'Home':
          event.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          event.preventDefault();
          newIndex = itemsCount - 1;
          break;
        default:
          return;
      }

      currentIndexRef.current = newIndex;
      onNavigate(newIndex);
    },
    [enabled, itemsCount, onNavigate]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  return {
    setCurrentIndex: (index: number) => {
      currentIndexRef.current = index;
    },
  };
}

/**
 * Escape Key Handler
 */

export function useEscapeKey(onEscape: () => void, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onEscape, enabled]);
}
