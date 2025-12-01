import { useEffect, useRef, useCallback } from 'react';

interface SwipeConfig {
  swipeThreshold: number; // Minimum distance for swipe (px)
  velocityThreshold: number; // Minimum velocity for swipe (px/ms)
  tapZoneWidth: number; // Width of tap zones as percentage (0-1)
  doubleTapDelay: number; // Max time between taps (ms)
  longPressDelay: number; // Time to trigger long press (ms)
}

interface SwipeCallbacks {
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onTapLeft?: () => void;
  onTapRight?: () => void;
  onTapCenter?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
}

const DEFAULT_CONFIG: SwipeConfig = {
  swipeThreshold: 50,
  velocityThreshold: 0.3,
  tapZoneWidth: 0.3,
  doubleTapDelay: 300,
  longPressDelay: 500,
};

export function useSwipeGestures(
  elementRef: React.RefObject<HTMLElement>,
  callbacks: SwipeCallbacks,
  config: Partial<SwipeConfig> = {}
) {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef<number>(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isDraggingRef = useRef(false);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;

      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      isDraggingRef.current = false;

      // Start long press timer
      clearLongPressTimer();
      longPressTimerRef.current = setTimeout(() => {
        if (!isDraggingRef.current && callbacks.onLongPress) {
          callbacks.onLongPress();
          touchStartRef.current = null; // Prevent other gestures
        }
      }, fullConfig.longPressDelay);
    },
    [callbacks, fullConfig.longPressDelay, clearLongPressTimer]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = e.touches[0];
      if (!touch) return;

      const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

      // If moved more than 10px, consider it dragging
      if (deltaX > 10 || deltaY > 10) {
        isDraggingRef.current = true;
        clearLongPressTimer();
      }
    },
    [clearLongPressTimer]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      clearLongPressTimer();

      if (!touchStartRef.current) return;

      const touch = e.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaTime = Date.now() - touchStartRef.current.time;
      const velocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / deltaTime;

      const element = elementRef.current;
      if (!element) return;

      // Check for swipe gestures
      if (
        Math.abs(deltaY) > fullConfig.swipeThreshold &&
        Math.abs(deltaY) > Math.abs(deltaX) * 1.5 && // Vertical bias
        velocity > fullConfig.velocityThreshold
      ) {
        if (deltaY < 0 && callbacks.onSwipeUp) {
          callbacks.onSwipeUp();
        } else if (deltaY > 0 && callbacks.onSwipeDown) {
          callbacks.onSwipeDown();
        }
        touchStartRef.current = null;
        return;
      }

      // Check for tap gestures (if not dragging)
      if (!isDraggingRef.current && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
        const now = Date.now();
        const timeSinceLastTap = now - lastTapRef.current;

        // Check for double tap
        if (timeSinceLastTap < fullConfig.doubleTapDelay && callbacks.onDoubleTap) {
          callbacks.onDoubleTap();
          lastTapRef.current = 0; // Reset to prevent triple tap
          touchStartRef.current = null;
          return;
        }

        lastTapRef.current = now;

        // Determine tap zone
        const rect = element.getBoundingClientRect();
        const tapX = touch.clientX - rect.left;
        const leftZone = rect.width * fullConfig.tapZoneWidth;
        const rightZone = rect.width * (1 - fullConfig.tapZoneWidth);

        if (tapX < leftZone && callbacks.onTapLeft) {
          callbacks.onTapLeft();
        } else if (tapX > rightZone && callbacks.onTapRight) {
          callbacks.onTapRight();
        } else if (callbacks.onTapCenter) {
          callbacks.onTapCenter();
        }
      }

      touchStartRef.current = null;
      isDraggingRef.current = false;
    },
    [callbacks, fullConfig, elementRef, clearLongPressTimer]
  );

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      clearLongPressTimer();
    };
  }, [elementRef, handleTouchStart, handleTouchMove, handleTouchEnd, clearLongPressTimer]);

  return null;
}
