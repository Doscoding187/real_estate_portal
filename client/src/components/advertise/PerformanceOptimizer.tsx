/**
 * PerformanceOptimizer Component
 *
 * Task 12.3: Optimize CSS delivery
 * Requirements: 10.1
 *
 * Initializes performance optimizations for the advertise landing page.
 * Should be rendered at the top of the page.
 */

import { useEffect } from 'react';
import { initAdvertisePagePerformance } from '@/lib/performance/resourceHints';

export const PerformanceOptimizer: React.FC = () => {
  useEffect(() => {
    // Initialize performance optimizations on mount
    initAdvertisePagePerformance();
  }, []);

  // This component doesn't render anything
  return null;
};

export default PerformanceOptimizer;
