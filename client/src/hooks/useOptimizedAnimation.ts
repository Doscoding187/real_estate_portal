/**
 * useOptimizedAnimation Hook
 *
 * Provides optimized animation configuration based on device capabilities
 * and user preferences.
 *
 * Requirements: 11.2, 11.5 - Optimize animation performance, maintain 60fps
 */

import { useEffect, useState } from 'react';
import { Variants } from 'framer-motion';
import {
  getAnimationComplexity,
  optimizeAnimationConfig,
  optimizeVariants,
  isLowEndDevice,
} from '@/lib/animations/performanceUtils';
import { useReducedMotion } from './useReducedMotion.advertise';

interface OptimizedAnimationConfig {
  /**
   * Whether animations should be enabled
   */
  shouldAnimate: boolean;

  /**
   * Optimized animation duration
   */
  duration: number;

  /**
   * Optimized stagger delay
   */
  stagger: number;

  /**
   * Animation complexity level
   */
  complexity: 'full' | 'reduced' | 'minimal';

  /**
   * Whether device is low-end
   */
  isLowEnd: boolean;

  /**
   * Whether user prefers reduced motion
   */
  prefersReducedMotion: boolean;
}

/**
 * Hook to get optimized animation configuration
 *
 * @param baseDuration - Base animation duration in seconds
 * @param baseStagger - Base stagger delay in seconds
 * @returns Optimized animation configuration
 *
 * @example
 * ```tsx
 * const { shouldAnimate, duration, stagger } = useOptimizedAnimation(0.4, 0.1);
 *
 * return (
 *   <motion.div
 *     animate={shouldAnimate ? "animate" : "initial"}
 *     transition={{ duration, staggerChildren: stagger }}
 *   >
 *     Content
 *   </motion.div>
 * );
 * ```
 */
export function useOptimizedAnimation(
  baseDuration: number = 0.4,
  baseStagger: number = 0.1,
): OptimizedAnimationConfig {
  const prefersReducedMotion = useReducedMotion();
  const [complexity, setComplexity] = useState<'full' | 'reduced' | 'minimal'>('full');
  const [isLowEnd, setIsLowEnd] = useState(false);

  useEffect(() => {
    // Detect device capabilities
    const detectedComplexity = getAnimationComplexity();
    setComplexity(detectedComplexity);
    setIsLowEnd(isLowEndDevice());
  }, []);

  // Optimize animation config
  const optimized = optimizeAnimationConfig({
    duration: baseDuration,
    stagger: baseStagger,
    complexity,
  });

  return {
    shouldAnimate: optimized.shouldAnimate && !prefersReducedMotion,
    duration: optimized.duration,
    stagger: optimized.stagger,
    complexity,
    isLowEnd,
    prefersReducedMotion,
  };
}

/**
 * Hook to get optimized animation variants
 *
 * @param variants - Base animation variants
 * @returns Optimized variants based on device capabilities
 *
 * @example
 * ```tsx
 * const fadeUp = {
 *   initial: { opacity: 0, y: 20 },
 *   animate: { opacity: 1, y: 0 }
 * };
 *
 * const optimizedVariants = useOptimizedVariants(fadeUp);
 *
 * return <motion.div variants={optimizedVariants}>Content</motion.div>;
 * ```
 */
export function useOptimizedVariants(variants: Variants): Variants {
  const [optimized, setOptimized] = useState<Variants>(variants);

  useEffect(() => {
    const optimizedVariants = optimizeVariants(variants);
    setOptimized(optimizedVariants);
  }, [variants]);

  return optimized;
}

/**
 * Hook to monitor animation performance
 *
 * @returns Performance metrics
 *
 * @example
 * ```tsx
 * const { fps, isAcceptable } = useAnimationPerformance();
 *
 * if (!isAcceptable) {
 *   console.warn('Animation performance is below 60fps');
 * }
 * ```
 */
export function useAnimationPerformance() {
  const [fps, setFps] = useState(60);
  const [isAcceptable, setIsAcceptable] = useState(true);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let rafId: number;

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      const delta = currentTime - lastTime;

      // Update FPS every second
      if (delta >= 1000) {
        const currentFPS = (frameCount * 1000) / delta;
        setFps(Math.round(currentFPS));
        setIsAcceptable(currentFPS >= 55); // Allow 5fps margin

        frameCount = 0;
        lastTime = currentTime;
      }

      rafId = requestAnimationFrame(measureFPS);
    };

    rafId = requestAnimationFrame(measureFPS);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, []);

  return {
    fps,
    isAcceptable,
  };
}

/**
 * Hook to get GPU-accelerated animation props
 *
 * @returns Object with GPU-accelerated properties
 *
 * @example
 * ```tsx
 * const gpuProps = useGPUAcceleration();
 *
 * return (
 *   <motion.div
 *     style={gpuProps}
 *     animate={{ opacity: 1, transform: 'translateY(0)' }}
 *   >
 *     Content
 *   </motion.div>
 * );
 * ```
 */
export function useGPUAcceleration() {
  return {
    // Force GPU acceleration
    transform: 'translateZ(0)',
    willChange: 'transform, opacity',
  };
}
