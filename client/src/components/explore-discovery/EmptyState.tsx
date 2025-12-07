/**
 * EmptyState Component for Explore Feature
 * 
 * Provides user-friendly empty states for different scenarios:
 * - No results found
 * - No location access
 * - Offline mode
 * - No saved items
 * - No followed items
 * 
 * Features:
 * - Modern design with clear messaging
 * - Suggested actions for each state
 * - Smooth animations
 * - Accessible with proper ARIA labels
 * 
 * Requirements: 7.2
 */

import { motion } from 'framer-motion';
import { 
  Search, 
  MapPin, 
  WifiOff, 
  Heart, 
  Users, 
  Compass,
  Filter,
  Home,
  LucideIcon
} from 'lucide-react';
import { ModernCard } from '@/components/ui/soft/ModernCard';
import { designTokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

/**
 * Empty State Types
 */
export type EmptyStateType = 
  | 'noResults'
  | 'noLocation'
  | 'offline'
  | 'noSavedProperties'
  | 'noFollowedItems'
  | 'noContent'
  | 'noFiltersMatch';

/**
 * Empty State Configuration
 */
interface EmptyStateConfig {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  secondaryActionLabel?: string;
  iconColor: string;
  iconBgGradient: string;
}

/**
 * Empty State Configurations
 */
const emptyStateConfigs: Record<EmptyStateType, EmptyStateConfig> = {
  noResults: {
    icon: Search,
    title: 'No properties found',
    description: 'We couldn\'t find any properties matching your search. Try adjusting your filters or exploring a different area.',
    actionLabel: 'Clear Filters',
    secondaryActionLabel: 'Browse All',
    iconColor: 'text-blue-500',
    iconBgGradient: 'from-blue-50 to-blue-100',
  },
  noLocation: {
    icon: MapPin,
    title: 'Enable location access',
    description: 'Get personalized property recommendations based on your location. We\'ll show you homes and developments nearby.',
    actionLabel: 'Enable Location',
    secondaryActionLabel: 'Search Manually',
    iconColor: 'text-green-500',
    iconBgGradient: 'from-green-50 to-green-100',
  },
  offline: {
    icon: WifiOff,
    title: 'You\'re offline',
    description: 'It looks like you\'re not connected to the internet. Check your connection and try again.',
    actionLabel: 'Retry Connection',
    secondaryActionLabel: 'View Cached Content',
    iconColor: 'text-orange-500',
    iconBgGradient: 'from-orange-50 to-orange-100',
  },
  noSavedProperties: {
    icon: Heart,
    title: 'No saved properties yet',
    description: 'Start exploring and save properties you love. They\'ll appear here for easy access later.',
    actionLabel: 'Explore Properties',
    iconColor: 'text-pink-500',
    iconBgGradient: 'from-pink-50 to-pink-100',
  },
  noFollowedItems: {
    icon: Users,
    title: 'Not following anyone yet',
    description: 'Follow developers, agents, or neighborhoods to see their latest updates and properties in your feed.',
    actionLabel: 'Discover Creators',
    iconColor: 'text-purple-500',
    iconBgGradient: 'from-purple-50 to-purple-100',
  },
  noContent: {
    icon: Compass,
    title: 'No content available',
    description: 'There\'s no content to display right now. Check back later or explore other sections.',
    actionLabel: 'Go to Home',
    iconColor: 'text-indigo-500',
    iconBgGradient: 'from-indigo-50 to-indigo-100',
  },
  noFiltersMatch: {
    icon: Filter,
    title: 'No matches for these filters',
    description: 'Try broadening your search criteria or removing some filters to see more results.',
    actionLabel: 'Reset Filters',
    secondaryActionLabel: 'Adjust Filters',
    iconColor: 'text-teal-500',
    iconBgGradient: 'from-teal-50 to-teal-100',
  },
};

/**
 * EmptyState Component Props
 */
interface EmptyStateProps {
  type: EmptyStateType;
  onAction?: () => void;
  onSecondaryAction?: () => void;
  className?: string;
  compact?: boolean;
  customTitle?: string;
  customDescription?: string;
  customActionLabel?: string;
}

/**
 * EmptyState Component
 * 
 * Displays a user-friendly empty state with icon, message, and suggested actions
 */
export function EmptyState({
  type,
  onAction,
  onSecondaryAction,
  className,
  compact = false,
  customTitle,
  customDescription,
  customActionLabel,
}: EmptyStateProps) {
  const config = emptyStateConfigs[type];
  const Icon = config.icon;

  const title = customTitle || config.title;
  const description = customDescription || config.description;
  const actionLabel = customActionLabel || config.actionLabel;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'flex items-center justify-center',
        compact ? 'p-6' : 'p-12',
        className
      )}
    >
      <div className={cn(
        'flex flex-col items-center text-center',
        compact ? 'max-w-sm' : 'max-w-md'
      )}>
        {/* Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            delay: 0.1, 
            type: 'spring', 
            stiffness: 200, 
            damping: 15 
          }}
          className={cn(
            compact ? 'w-16 h-16 mb-4' : 'w-20 h-20 mb-6',
            'rounded-full flex items-center justify-center',
            `bg-gradient-to-br ${config.iconBgGradient}`
          )}
          role="img"
          aria-label={`${type} icon`}
        >
          <Icon className={cn(
            compact ? 'w-8 h-8' : 'w-10 h-10',
            config.iconColor
          )} />
        </motion.div>

        {/* Title */}
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            compact ? 'text-lg mb-2' : 'text-xl mb-3',
            'font-semibold'
          )}
          style={{ color: designTokens.colors.text.primary }}
        >
          {title}
        </motion.h3>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={cn(
            compact ? 'text-sm mb-4' : 'text-base mb-6',
            'leading-relaxed'
          )}
          style={{ color: designTokens.colors.text.secondary }}
        >
          {description}
        </motion.p>

        {/* Action Buttons */}
        {(actionLabel || config.secondaryActionLabel) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto"
          >
            {/* Primary Action */}
            {actionLabel && onAction && (
              <motion.button
                onClick={onAction}
                className={cn(
                  'px-6 py-3 rounded-lg',
                  'bg-gradient-to-r from-indigo-500 to-indigo-600',
                  'text-white font-medium',
                  'transition-all duration-200',
                  'hover:from-indigo-600 hover:to-indigo-700',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                  'active:scale-95',
                  compact ? 'text-sm' : 'text-base'
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                aria-label={actionLabel}
              >
                {actionLabel}
              </motion.button>
            )}

            {/* Secondary Action */}
            {config.secondaryActionLabel && onSecondaryAction && (
              <motion.button
                onClick={onSecondaryAction}
                className={cn(
                  'px-6 py-3 rounded-lg',
                  'bg-white border-2 border-gray-200',
                  'text-gray-700 font-medium',
                  'transition-all duration-200',
                  'hover:border-gray-300 hover:bg-gray-50',
                  'focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2',
                  'active:scale-95',
                  compact ? 'text-sm' : 'text-base'
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                aria-label={config.secondaryActionLabel}
              >
                {config.secondaryActionLabel}
              </motion.button>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * EmptyStateCard Component
 * 
 * EmptyState wrapped in a ModernCard for use within other components
 */
interface EmptyStateCardProps extends EmptyStateProps {
  cardClassName?: string;
}

export function EmptyStateCard({
  cardClassName,
  ...emptyStateProps
}: EmptyStateCardProps) {
  return (
    <ModernCard 
      variant="elevated" 
      className={cn('w-full', cardClassName)}
      hoverable={false}
    >
      <EmptyState {...emptyStateProps} />
    </ModernCard>
  );
}

/**
 * InlineEmptyState Component
 * 
 * Compact empty state for inline use (e.g., within lists or grids)
 */
interface InlineEmptyStateProps {
  icon?: LucideIcon;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function InlineEmptyState({
  icon: CustomIcon,
  message,
  actionLabel,
  onAction,
  className,
}: InlineEmptyStateProps) {
  const Icon = CustomIcon || Search;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'flex flex-col items-center justify-center py-8 px-4',
        className
      )}
    >
      <Icon 
        className="w-12 h-12 text-gray-300 mb-3" 
        aria-hidden="true"
      />
      <p 
        className="text-sm text-center mb-3"
        style={{ color: designTokens.colors.text.secondary }}
      >
        {message}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className={cn(
            'text-sm font-medium text-indigo-600 hover:text-indigo-700',
            'underline focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded'
          )}
          aria-label={actionLabel}
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}

/**
 * Hook for managing empty states
 */
export function useEmptyState(
  hasData: boolean,
  isLoading: boolean,
  error: Error | null
) {
  if (isLoading) {
    return { showEmpty: false, emptyType: null };
  }

  if (error) {
    return { showEmpty: false, emptyType: null }; // Error boundary handles this
  }

  if (!hasData) {
    return { showEmpty: true, emptyType: 'noResults' as EmptyStateType };
  }

  return { showEmpty: false, emptyType: null };
}

// Default export for convenience
export default EmptyState;
