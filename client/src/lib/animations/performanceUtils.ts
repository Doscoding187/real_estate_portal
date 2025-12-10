/**
 * Animation Performance Utilities
 * 
 * Provides utilities for optimizing animation performance
 * - GPU-accelerated properties (transform, opacity)
 * - Device capability detection
 * - Frame rate monitoring
 * 
 * Requirements: 11.2, 11.5 - Optimize animation performance, maintain 60fps
 */

/**
 * Check if device is low-end based on hardware capabilities
 * 
 * @returns boolean indicating if device is low-end
 */
export function isLowEndDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  // Check hardware concurrency (CPU cores)
  // Low-end devices typically have 2 or fewer cores
  const cores = navigator.hardwareConcurrency;
  if (cores && cores <= 2) {
    return true;
  }

  // Check device memory (if available)
  // @ts-ignore - deviceMemory is not in TypeScript types yet
  const memory = navigator.deviceMemory;
  if (memory && memory <= 2) {
    return true;
  }

  // Check connection speed (if available)
  // @ts-ignore - connection is not in TypeScript types yet
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection) {
    const effectiveType = connection.effectiveType;
    // 2g or slow-2g indicates low-end device or poor connection
    if (effectiveType === '2g' || effectiveType === 'slow-2g') {
      return true;
    }
  }

  return false;
}

/**
 * Get recommended animation complexity based on device capabilities
 * 
 * @returns 'full' | 'reduced' | 'minimal'
 */
export function getAnimationComplexity(): 'full' | 'reduced' | 'minimal' {
  if (typeof window === 'undefined') {
    return 'full';
  }

  // Check for reduced motion preference first
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    return 'minimal';
  }

  // Check device capabilities
  if (isLowEndDevice()) {
    return 'reduced';
  }

  return 'full';
}

/**
 * GPU-accelerated animation properties
 * These properties trigger GPU acceleration for better performance
 */
export const gpuAcceleratedProps = [
  'transform',
  'opacity',
  'filter',
] as const;

/**
 * Properties that should be avoided in animations (cause layout reflow)
 */
export const layoutProps = [
  'width',
  'height',
  'top',
  'left',
  'right',
  'bottom',
  'margin',
  'padding',
] as const;

/**
 * Check if a property is GPU-accelerated
 * 
 * @param property - CSS property name
 * @returns boolean indicating if property is GPU-accelerated
 */
export function isGPUAccelerated(property: string): boolean {
  return gpuAcceleratedProps.includes(property as any);
}

/**
 * Check if a property causes layout reflow
 * 
 * @param property - CSS property name
 * @returns boolean indicating if property causes layout reflow
 */
export function causesLayoutReflow(property: string): boolean {
  return layoutProps.includes(property as any);
}

/**
 * Frame rate monitor for debugging animation performance
 */
export class FrameRateMonitor {
  private frames: number[] = [];
  private lastTime: number = 0;
  private rafId: number | null = null;

  /**
   * Start monitoring frame rate
   */
  start(): void {
    this.frames = [];
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick.bind(this));
  }

  /**
   * Stop monitoring frame rate
   */
  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Get average frame rate
   * 
   * @returns Average FPS
   */
  getAverageFPS(): number {
    if (this.frames.length === 0) return 0;
    
    const sum = this.frames.reduce((a, b) => a + b, 0);
    return sum / this.frames.length;
  }

  /**
   * Get minimum frame rate
   * 
   * @returns Minimum FPS
   */
  getMinFPS(): number {
    if (this.frames.length === 0) return 0;
    return Math.min(...this.frames);
  }

  /**
   * Check if frame rate is acceptable (>= 60fps)
   * 
   * @returns boolean indicating if frame rate is acceptable
   */
  isAcceptable(): boolean {
    return this.getAverageFPS() >= 55; // Allow 5fps margin
  }

  private tick(time: number): void {
    const delta = time - this.lastTime;
    const fps = 1000 / delta;
    
    this.frames.push(fps);
    
    // Keep only last 60 frames (1 second at 60fps)
    if (this.frames.length > 60) {
      this.frames.shift();
    }
    
    this.lastTime = time;
    this.rafId = requestAnimationFrame(this.tick.bind(this));
  }
}

/**
 * Optimize animation config based on device capabilities
 * 
 * @param config - Animation configuration
 * @returns Optimized animation configuration
 */
export function optimizeAnimationConfig(config: {
  duration: number;
  stagger?: number;
  complexity?: 'full' | 'reduced' | 'minimal';
}): {
  duration: number;
  stagger: number;
  shouldAnimate: boolean;
} {
  const complexity = config.complexity || getAnimationComplexity();
  
  switch (complexity) {
    case 'minimal':
      return {
        duration: 0.01,
        stagger: 0,
        shouldAnimate: false,
      };
    
    case 'reduced':
      return {
        duration: config.duration * 0.5, // Half duration
        stagger: (config.stagger || 0.1) * 0.5, // Half stagger
        shouldAnimate: true,
      };
    
    case 'full':
    default:
      return {
        duration: config.duration,
        stagger: config.stagger || 0.1,
        shouldAnimate: true,
      };
  }
}

/**
 * Create optimized animation variants based on device capabilities
 * 
 * @param variants - Original animation variants
 * @returns Optimized variants
 */
export function optimizeVariants(variants: any): any {
  const complexity = getAnimationComplexity();
  
  if (complexity === 'minimal') {
    // Return opacity-only variants
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.01 } },
      exit: { opacity: 0, transition: { duration: 0.01 } },
    };
  }
  
  if (complexity === 'reduced') {
    // Reduce animation distances and durations
    const optimized: any = {};
    
    Object.keys(variants).forEach((key) => {
      const variant = variants[key];
      if (typeof variant === 'object' && variant !== null) {
        optimized[key] = {
          ...variant,
          // Reduce movement distances by half
          y: variant.y ? variant.y * 0.5 : undefined,
          x: variant.x ? variant.x * 0.5 : undefined,
          // Reduce durations by half
          transition: variant.transition ? {
            ...variant.transition,
            duration: (variant.transition.duration || 0.3) * 0.5,
          } : undefined,
        };
      } else {
        optimized[key] = variant;
      }
    });
    
    return optimized;
  }
  
  return variants;
}

/**
 * Debounce function for performance optimization
 * 
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for performance optimization
 * 
 * @param func - Function to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Request idle callback wrapper with fallback
 * 
 * @param callback - Callback to execute during idle time
 * @param options - Options for idle callback
 */
export function requestIdleCallback(
  callback: () => void,
  options?: { timeout?: number }
): number {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  }
  
  // Fallback to setTimeout
  return setTimeout(callback, 1) as any;
}

/**
 * Cancel idle callback wrapper with fallback
 * 
 * @param id - ID returned from requestIdleCallback
 */
export function cancelIdleCallback(id: number): void {
  if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    window.cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}
