import { useState, useEffect } from 'react';

/**
 * Debounce hook - delays updating a value until after a specified delay
 * Useful for search inputs to avoid excessive API calls
 */
export function useDebounce\u003cT\u003e(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState\u003cT\u003e(value);

  useEffect(() => {
    // Set up the timeout
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if value changes before delay expires
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
