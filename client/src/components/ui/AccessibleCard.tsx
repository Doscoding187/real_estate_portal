/**
 * Accessible Card Components
 *
 * Provides accessible card components with proper ARIA attributes,
 * keyboard navigation, and focus management.
 */

import React, { forwardRef } from 'react';
import { focusStyles } from './FocusIndicator';

interface AccessibleCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
  title: string;
  description?: string;
  isSelected?: boolean;
  isDisabled?: boolean;
  role?: 'article' | 'listitem' | 'button' | 'link';
  tabIndex?: number;
}

/**
 * Accessible card component with proper semantics
 */
export const AccessibleCard = forwardRef<HTMLDivElement, AccessibleCardProps>(
  function AccessibleCard(
    {
      children,
      className = '',
      onClick,
      href,
      title,
      description,
      isSelected = false,
      isDisabled = false,
      role = 'article',
      tabIndex,
    },
    ref,
  ) {
    const isInteractive = onClick || href;
    const computedRole = href ? 'link' : onClick ? 'button' : role;
    const computedTabIndex = tabIndex ?? (isInteractive ? 0 : undefined);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (isDisabled) return;

      if ((e.key === 'Enter' || e.key === ' ') && onClick) {
        e.preventDefault();
        onClick();
      }
    };

    const handleClick = () => {
      if (isDisabled || !onClick) return;
      onClick();
    };

    const baseClasses = `
      relative rounded-lg overflow-hidden
      ${isInteractive ? 'cursor-pointer' : ''}
      ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
      ${isSelected ? 'ring-2 ring-blue-500' : ''}
      ${isInteractive ? focusStyles.visible : ''}
    `;

    if (href && !isDisabled) {
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={`${baseClasses} ${className}`}
          aria-label={title}
          aria-describedby={description ? `${title}-desc` : undefined}
          aria-disabled={isDisabled}
        >
          {children}
          {description && (
            <span id={`${title}-desc`} className="sr-only">
              {description}
            </span>
          )}
        </a>
      );
    }

    return (
      <div
        ref={ref}
        role={computedRole}
        tabIndex={computedTabIndex}
        className={`${baseClasses} ${className}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={title}
        aria-describedby={description ? `${title}-desc` : undefined}
        aria-selected={isSelected}
        aria-disabled={isDisabled}
      >
        {children}
        {description && (
          <span id={`${title}-desc`} className="sr-only">
            {description}
          </span>
        )}
      </div>
    );
  },
);

/**
 * Accessible card grid with keyboard navigation
 */
interface AccessibleCardGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: 'sm' | 'md' | 'lg';
  label: string;
}

export function AccessibleCardGrid({
  children,
  className = '',
  columns = 3,
  gap = 'md',
  label,
}: AccessibleCardGridProps) {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  };

  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  return (
    <div
      role="list"
      aria-label={label}
      className={`grid ${columnClasses[columns]} ${gapClasses[gap]} ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Accessible horizontal scroll container
 */
interface AccessibleScrollContainerProps {
  children: React.ReactNode;
  className?: string;
  label: string;
  showScrollHint?: boolean;
}

export function AccessibleScrollContainer({
  children,
  className = '',
  label,
  showScrollHint = true,
}: AccessibleScrollContainerProps) {
  return (
    <div className="relative">
      <div
        role="region"
        aria-label={label}
        tabIndex={0}
        className={`
          flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory
          scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent
          ${focusStyles.ring}
          ${className}
        `}
      >
        {children}
      </div>
      {showScrollHint && (
        <div className="sr-only" aria-live="polite">
          Use left and right arrow keys to scroll through items
        </div>
      )}
    </div>
  );
}

export default AccessibleCard;
