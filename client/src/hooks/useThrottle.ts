import { useEffect, useRef, useState } from 'react';

/**
 * Throttle hook that limits how often a value can update
 * 
 * @param value - The value to throttle
 * @param delay - Delay in milliseconds (default: 250ms)
 * @returns The throttled value
 * 
 * @example
 * const throttledSearchTerm = useThrottle(searchTerm, 250);
 */
export function useThrottle<T>(value: T, delay: number = 250): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastRan = now - lastRan.current;

    if (timeSinceLastRan >= delay) {
      // Enough time has passed, update immediately
      setThrottledValue(value);
      lastRan.current = now;
    } else {
      // Schedule update for when delay period completes
      const timeoutId = setTimeout(() => {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }, delay - timeSinceLastRan);

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [value, delay]);

  return throttledValue;
}
