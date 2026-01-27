import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Content Badge Types
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */
export type BadgeType = 'property' | 'expert_tip' | 'service' | 'finance' | 'design';

/**
 * Content Badge Props
 */
export interface ContentBadgeProps {
  type: BadgeType;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

/**
 * Badge Configuration
 * Requirement 4.2, 4.3, 4.4, 4.5, 4.6: Define icons, colors, labels for each badge type
 */
const BADGE_CONFIG: Record<
  BadgeType,
  { icon: string; color: string; label: string; bgColor: string; textColor: string }
> = {
  property: {
    icon: '🏠',
    color: 'primary',
    label: 'Property',
    bgColor: 'bg-primary',
    textColor: 'text-primary-foreground',
  },
  expert_tip: {
    icon: '💡',
    color: 'amber',
    label: 'Expert Tip',
    bgColor: 'bg-amber-500',
    textColor: 'text-white',
  },
  service: {
    icon: '🛠️',
    color: 'blue',
    label: 'Service',
    bgColor: 'bg-blue-500',
    textColor: 'text-white',
  },
  finance: {
    icon: '💰',
    color: 'green',
    label: 'Finance',
    bgColor: 'bg-green-500',
    textColor: 'text-white',
  },
  design: {
    icon: '📐',
    color: 'purple',
    label: 'Design',
    bgColor: 'bg-purple-500',
    textColor: 'text-white',
  },
};

/**
 * Size configuration for badge
 */
const SIZE_CONFIG = {
  sm: {
    container: 'px-1.5 py-0.5 text-[10px] gap-0.5',
    icon: 'text-xs',
    rounded: 'rounded',
  },
  md: {
    container: 'px-2 py-1 text-xs gap-1',
    icon: 'text-sm',
    rounded: 'rounded-md',
  },
  lg: {
    container: 'px-2.5 py-1.5 text-sm gap-1.5',
    icon: 'text-base',
    rounded: 'rounded-lg',
  },
};

/**
 * Content Badge Component
 *
 * Displays a badge in the top-left corner of content cards/videos
 * to indicate content type (Property, Expert Tip, Service, Finance, Design)
 *
 * Requirements:
 * - 4.1: Display badge on all content cards and videos
 * - 4.2: Property badge (🏠, primary color)
 * - 4.3: Expert Tip badge (💡, amber)
 * - 4.4: Service badge (🛠️, blue)
 * - 4.5: Finance badge (💰, green)
 * - 4.6: Design badge (📐, purple)
 * - 4.7: Display primary category badge only for multi-category content
 *
 * @example
 * ```tsx
 * <ContentBadge type="property" />
 * <ContentBadge type="expert_tip" showLabel />
 * <ContentBadge type="service" size="lg" />
 * ```
 */
export const ContentBadge: React.FC<ContentBadgeProps> = ({
  type,
  className,
  size = 'md',
  showLabel = false,
}) => {
  const config = BADGE_CONFIG[type];
  const sizeConfig = SIZE_CONFIG[size];

  if (!config) {
    console.warn(`Invalid badge type: ${type}`);
    return null;
  }

  return (
    <div
      className={cn(
        // Base styles
        'inline-flex items-center justify-center font-medium',
        'shadow-sm backdrop-blur-sm',
        'transition-all duration-200',
        // Size-specific styles
        sizeConfig.container,
        sizeConfig.rounded,
        // Color styles
        config.bgColor,
        config.textColor,
        // Custom className
        className,
      )}
      role="img"
      aria-label={`${config.label} content`}
      data-badge-type={type}
    >
      <span className={cn('leading-none', sizeConfig.icon)} aria-hidden="true">
        {config.icon}
      </span>
      {showLabel && (
        <span className="font-semibold leading-none whitespace-nowrap">{config.label}</span>
      )}
    </div>
  );
};

/**
 * Content Badge Overlay Component
 *
 * Positions the badge in the top-left corner of a container
 * Typically used on video cards and content cards
 *
 * Requirement 4.1: Render badge in top-left corner
 *
 * @example
 * ```tsx
 * <div className="relative">
 *   <img src="..." />
 *   <ContentBadgeOverlay type="property" />
 * </div>
 * ```
 */
export const ContentBadgeOverlay: React.FC<ContentBadgeProps> = props => {
  return (
    <div className="absolute top-2 left-2 z-10">
      <ContentBadge {...props} />
    </div>
  );
};

/**
 * Get badge configuration for a badge type
 * Useful for custom badge implementations
 */
export const getBadgeConfig = (type: BadgeType) => {
  return BADGE_CONFIG[type];
};

/**
 * Get all available badge types
 * Useful for filters or badge type selectors
 */
export const getAllBadgeTypes = (): BadgeType[] => {
  return Object.keys(BADGE_CONFIG) as BadgeType[];
};

/**
 * Validate if a string is a valid badge type
 */
export const isValidBadgeType = (type: string): type is BadgeType => {
  return type in BADGE_CONFIG;
};

export default ContentBadge;
