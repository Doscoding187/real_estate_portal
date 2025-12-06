/**
 * Motion-Safe Components
 * 
 * Components that respect prefers-reduced-motion setting
 * and provide static alternatives when needed.
 */

import React from 'react';
import { useReducedMotion } from '@/hooks/useAccessibility';

interface MotionSafeProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

/**
 * Wrapper that shows fallback content when reduced motion is preferred
 */
export function MotionSafe({ children, fallback, className }: MotionSafeProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion && fallback) {
    return <>{fallback}</>;
  }

  return <div className={className}>{children}</div>;
}

interface AnimatedContainerProps {
  children: React.ReactNode;
  animation?: 'fade' | 'slide-up' | 'slide-down' | 'scale' | 'none';
  duration?: 'fast' | 'normal' | 'slow';
  delay?: number;
  className?: string;
}

/**
 * Container with motion-safe animations
 */
export function AnimatedContainer({
  children,
  animation = 'fade',
  duration = 'normal',
  delay = 0,
  className = '',
}: AnimatedContainerProps) {
  const prefersReducedMotion = useReducedMotion();

  const durationClasses = {
    fast: 'duration-150',
    normal: 'duration-300',
    slow: 'duration-500',
  };

  const animationClasses = {
    fade: 'animate-fade-in',
    'slide-up': 'animate-slide-up',
    'slide-down': 'animate-slide-down',
    scale: 'animate-scale-in',
    none: '',
  };

  // No animation for reduced motion
  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={`
        ${animationClasses[animation]}
        ${durationClasses[duration]}
        ${className}
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

interface TransitionProps {
  show: boolean;
  children: React.ReactNode;
  enter?: string;
  enterFrom?: string;
  enterTo?: string;
  leave?: string;
  leaveFrom?: string;
  leaveTo?: string;
  className?: string;
}

/**
 * Motion-safe transition component
 */
export function Transition({
  show,
  children,
  enter = 'transition-opacity duration-300',
  enterFrom = 'opacity-0',
  enterTo = 'opacity-100',
  leave = 'transition-opacity duration-200',
  leaveFrom = 'opacity-100',
  leaveTo = 'opacity-0',
  className = '',
}: TransitionProps) {
  const prefersReducedMotion = useReducedMotion();
  const [shouldRender, setShouldRender] = React.useState(show);
  const [isEntering, setIsEntering] = React.useState(false);

  React.useEffect(() => {
    if (show) {
      setShouldRender(true);
      // Small delay to trigger enter animation
      requestAnimationFrame(() => setIsEntering(true));
    } else {
      setIsEntering(false);
      // Wait for leave animation
      if (!prefersReducedMotion) {
        const timer = setTimeout(() => setShouldRender(false), 300);
        return () => clearTimeout(timer);
      } else {
        setShouldRender(false);
      }
    }
  }, [show, prefersReducedMotion]);

  if (!shouldRender) return null;

  // Instant show/hide for reduced motion
  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const transitionClasses = isEntering
    ? `${enter} ${enterTo}`
    : `${leave} ${leaveTo}`;

  return (
    <div className={`${transitionClasses} ${className}`}>
      {children}
    </div>
  );
}

/**
 * Pulse animation that respects reduced motion
 */
export function Pulse({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={`${prefersReducedMotion ? '' : 'animate-pulse'} ${className}`}>
      {children}
    </div>
  );
}

/**
 * Spinner that respects reduced motion
 */
export function Spinner({ 
  size = 'md',
  className = '',
}: { 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  if (prefersReducedMotion) {
    return (
      <div 
        className={`${sizeClasses[size]} ${className}`}
        role="status"
        aria-label="Loading"
      >
        <span className="text-blue-600">●●●</span>
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <svg
        className="animate-spin text-blue-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * CSS for motion-safe animations (add to global styles)
 */
export const motionSafeStyles = `
  /* Respect reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  /* Animation keyframes */
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slide-up {
    from { 
      opacity: 0;
      transform: translateY(10px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slide-down {
    from { 
      opacity: 0;
      transform: translateY(-10px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes scale-in {
    from { 
      opacity: 0;
      transform: scale(0.95);
    }
    to { 
      opacity: 1;
      transform: scale(1);
    }
  }

  .animate-fade-in {
    animation: fade-in var(--duration, 300ms) ease-out forwards;
  }

  .animate-slide-up {
    animation: slide-up var(--duration, 300ms) ease-out forwards;
  }

  .animate-slide-down {
    animation: slide-down var(--duration, 300ms) ease-out forwards;
  }

  .animate-scale-in {
    animation: scale-in var(--duration, 300ms) ease-out forwards;
  }
`;

export default MotionSafe;
