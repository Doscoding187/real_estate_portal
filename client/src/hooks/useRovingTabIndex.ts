/**
 * useRovingTabIndex Hook
 * 
 * Implements roving tabindex pattern for keyboard navigation in card grids.
 * Allows arrow key navigation between items while maintaining a single tab stop.
 * 
 * Requirements: 10.5
 */

import { useState, useEffect, useCallback, RefObject } from 'react';

export interface UseRovingTabIndexOptions {
  /**
   * Total number of items in the grid
   */
  itemCount: number;
  
  /**
   * Number of columns in the grid (for 2D navigation)
   */
  columns?: number;
  
  /**
   * Enable/disable the roving tabindex
   */
  enabled?: boolean;
  
  /**
   * Callback when an item is activated (Enter/Space)
   */
  onItemActivate?: (index: number) => void;
  
  /**
   * Enable looping (wrap around at edges)
   */
  loop?: boolean;
}

export interface UseRovingTabIndexReturn {
  /**
   * Current focused index
   */
  focusedIndex: number;
  
  /**
   * Get props for a specific item
   */
  getItemProps: (index: number) => {
    tabIndex: number;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onFocus: () => void;
    'data-roving-index': number;
  };
  
  /**
   * Manually set the focused index
   */
  setFocusedIndex: (index: number) => void;
}

/**
 * Hook for implementing roving tabindex pattern
 */
export function useRovingTabIndex({
  itemCount,
  columns = 1,
  enabled = true,
  onItemActivate,
  loop = true,
}: UseRovingTabIndexOptions): UseRovingTabIndexReturn {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const moveFocus = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right' | 'home' | 'end') => {
      if (!enabled || itemCount === 0) return;

      let newIndex = focusedIndex;

      switch (direction) {
        case 'up':
          newIndex = focusedIndex - columns;
          if (newIndex < 0) {
            newIndex = loop ? itemCount + newIndex : focusedIndex;
          }
          break;

        case 'down':
          newIndex = focusedIndex + columns;
          if (newIndex >= itemCount) {
            newIndex = loop ? newIndex - itemCount : focusedIndex;
          }
          break;

        case 'left':
          newIndex = focusedIndex - 1;
          if (newIndex < 0) {
            newIndex = loop ? itemCount - 1 : focusedIndex;
          }
          break;

        case 'right':
          newIndex = focusedIndex + 1;
          if (newIndex >= itemCount) {
            newIndex = loop ? 0 : focusedIndex;
          }
          break;

        case 'home':
          newIndex = 0;
          break;

        case 'end':
          newIndex = itemCount - 1;
          break;
      }

      if (newIndex !== focusedIndex && newIndex >= 0 && newIndex < itemCount) {
        setFocusedIndex(newIndex);
        
        // Focus the element
        setTimeout(() => {
          const element = document.querySelector(
            `[data-roving-index="${newIndex}"]`
          ) as HTMLElement;
          if (element) {
            element.focus();
          }
        }, 0);
      }
    },
    [focusedIndex, itemCount, columns, enabled, loop]
  );

  const handleKeyDown = useCallback(
    (index: number) => (e: React.KeyboardEvent) => {
      if (!enabled) return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          moveFocus('up');
          break;

        case 'ArrowDown':
          e.preventDefault();
          moveFocus('down');
          break;

        case 'ArrowLeft':
          e.preventDefault();
          moveFocus('left');
          break;

        case 'ArrowRight':
          e.preventDefault();
          moveFocus('right');
          break;

        case 'Home':
          e.preventDefault();
          moveFocus('home');
          break;

        case 'End':
          e.preventDefault();
          moveFocus('end');
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          if (onItemActivate) {
            onItemActivate(index);
          }
          break;
      }
    },
    [enabled, moveFocus, onItemActivate]
  );

  const getItemProps = useCallback(
    (index: number) => ({
      tabIndex: focusedIndex === index ? 0 : -1,
      onKeyDown: handleKeyDown(index),
      onFocus: () => setFocusedIndex(index),
      'data-roving-index': index,
    }),
    [focusedIndex, handleKeyDown]
  );

  return {
    focusedIndex,
    getItemProps,
    setFocusedIndex,
  };
}
