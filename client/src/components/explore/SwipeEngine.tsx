import { useRef, ReactNode } from 'react';
import { useSwipeGestures } from '@/hooks/useSwipeGestures';

interface SwipeEngineProps {
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onTapLeft?: () => void;
  onTapRight?: () => void;
  onTapCenter?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  children: ReactNode;
  className?: string;
}

export function SwipeEngine({
  onSwipeUp,
  onSwipeDown,
  onTapLeft,
  onTapRight,
  onTapCenter,
  onDoubleTap,
  onLongPress,
  children,
  className = '',
}: SwipeEngineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useSwipeGestures(containerRef as React.RefObject<HTMLElement>, {
    onSwipeUp,
    onSwipeDown,
    onTapLeft,
    onTapRight,
    onTapCenter,
    onDoubleTap,
    onLongPress,
  });

  return (
    <div
      ref={containerRef}
      className={`touch-none select-none ${className}`}
      style={{ touchAction: 'none' }}
    >
      {children}
    </div>
  );
}
