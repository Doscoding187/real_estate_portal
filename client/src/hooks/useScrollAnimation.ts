/**
 * useScrollAnimation Hook
 *
 * Detects when elements enter the viewport and triggers animations.
 * Uses Intersection Observer API for performance.
 */

import { useEffect, useState, useRef, RefObject } from 'react';

interface UseScrollAnimationOptions {
  /**
   * Threshold for triggering animation (0-1)
   * 0 = as soon as any part is visible
   * 1 = when fully visible
   * @default 0.1
   */
  threshold?: number;

  /**
   * Root margin for early/late triggering
   * @default '0px'
   */
  rootMargin?: string;

  /**
   * Whether to trigger animation only once
   * @default true
   */
  triggerOnce?: boolean;

  /**
   * Whether animation is enabled
   * Respects prefers-reduced-motion
   * @default true
   */
  enabled?: boolean;
}

interface UseScrollAnimationReturn {
  /**
   * Ref to attach to the element to observe
   */
  ref: RefObject<HTMLElement>;

  /**
   * Whether the element is currently visible
   */
  isVisible: boolean;

  /**
   * Whether the element has been visible at least once
   */
  hasBeenVisible: boolean;
}

/**
 * Hook to detect when an element enters the viewport
 *
 * @example
 * ```tsx
 * const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });
 *
 * return (
 *   <motion.div
 *     ref={ref}
 *     initial="initial"
 *     animate={isVisible ? "animate" : "initial"}
 *     variants={fadeUp}
 *   >
 *     Content
 *   </motion.div>
 * );
 * ```
 */
export function useScrollAnimation(
  options: UseScrollAnimationOptions = {},
): UseScrollAnimationReturn {
  const { threshold = 0.1, rootMargin = '0px', triggerOnce = true, enabled = true } = options;

  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  // Check for prefers-reduced-motion
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    // If animations are disabled or user prefers reduced motion, show immediately
    if (!enabled || prefersReducedMotion) {
      setIsVisible(true);
      setHasBeenVisible(true);
      return;
    }

    const element = ref.current;
    if (!element) return;

    // If already visible and triggerOnce is true, don't observe
    if (hasBeenVisible && triggerOnce) {
      return;
    }

    // Create intersection observer
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const isIntersecting = entry.isIntersecting;

          setIsVisible(isIntersecting);

          if (isIntersecting) {
            setHasBeenVisible(true);

            // If triggerOnce, disconnect after first intersection
            if (triggerOnce) {
              observer.disconnect();
            }
          }
        });
      },
      {
        threshold,
        rootMargin,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce, enabled, prefersReducedMotion, hasBeenVisible]);

  return {
    ref,
    isVisible,
    hasBeenVisible,
  };
}

/**
 * Hook variant that returns multiple refs for observing multiple elements
 *
 * @example
 * ```tsx
 * const { refs, visibilityMap } = useMultipleScrollAnimations(3);
 *
 * return (
 *   <>
 *     {items.map((item, index) => (
 *       <motion.div
 *         key={item.id}
 *         ref={refs[index]}
 *         animate={visibilityMap[index] ? "animate" : "initial"}
 *       >
 *         {item.content}
 *       </motion.div>
 *     ))}
 *   </>
 * );
 * ```
 */
export function useMultipleScrollAnimations(
  count: number,
  options: UseScrollAnimationOptions = {},
) {
  const refs = useRef<(HTMLElement | null)[]>(Array(count).fill(null));
  const [visibilityMap, setVisibilityMap] = useState<boolean[]>(Array(count).fill(false));

  const { threshold = 0.1, rootMargin = '0px', triggerOnce = true, enabled = true } = options;

  // Check for prefers-reduced-motion
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    // If animations are disabled or user prefers reduced motion, show all immediately
    if (!enabled || prefersReducedMotion) {
      setVisibilityMap(Array(count).fill(true));
      return;
    }

    const observers: IntersectionObserver[] = [];

    refs.current.forEach((element, index) => {
      if (!element) return;

      const observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              setVisibilityMap(prev => {
                const newMap = [...prev];
                newMap[index] = true;
                return newMap;
              });

              if (triggerOnce) {
                observer.disconnect();
              }
            } else if (!triggerOnce) {
              setVisibilityMap(prev => {
                const newMap = [...prev];
                newMap[index] = false;
                return newMap;
              });
            }
          });
        },
        {
          threshold,
          rootMargin,
        },
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => {
      observers.forEach(observer => observer.disconnect());
    };
  }, [count, threshold, rootMargin, triggerOnce, enabled, prefersReducedMotion]);

  return {
    refs,
    visibilityMap,
    setRef: (index: number) => (el: HTMLElement | null) => {
      refs.current[index] = el;
    },
  };
}
