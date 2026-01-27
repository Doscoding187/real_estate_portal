/**
 * Feature Unlock Indicator Component
 *
 * Displays progress toward unlocking features.
 * Implements Requirements 14.2, 14.3, 14.4
 */

import { motion } from 'framer-motion';
import { Lock, Unlock, Filter, Bookmark, Users } from 'lucide-react';
import { useFeatureUnlockProgress } from '@/hooks/useProgressiveDisclosure';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface FeatureUnlockIndicatorProps {
  feature: 'filters_save' | 'topics' | 'partner_profiles';
  compact?: boolean;
}

const FEATURE_CONFIG = {
  filters_save: {
    icon: Filter,
    title: 'Filters & Save',
    description: 'Filter properties and save favorites',
  },
  topics: {
    icon: Bookmark,
    title: 'Topics Navigation',
    description: 'Browse by interest categories',
  },
  partner_profiles: {
    icon: Users,
    title: 'Partner Profiles',
    description: 'View verified partner information',
  },
};

export function FeatureUnlockIndicator({ feature, compact = false }: FeatureUnlockIndicatorProps) {
  const { unlocked, progress, threshold, percentage } = useFeatureUnlockProgress(feature);
  const config = FEATURE_CONFIG[feature];
  const Icon = config.icon;

  if (unlocked) {
    return null; // Don't show indicator for unlocked features
  }

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-sm"
      >
        <Lock className="w-3 h-3 text-gray-500" />
        <span className="text-gray-700 dark:text-gray-300">
          {progress}/{threshold}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
            <Icon className="w-5 h-5 text-primary" />
          </div>

          {/* Content */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 dark:text-white">{config.title}</h4>
              <Lock className="w-4 h-4 text-gray-400" />
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">{config.description}</p>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Progress</span>
                <span className="font-medium text-primary">
                  {progress}/{threshold}
                </span>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>

            {/* Unlock Message */}
            <p className="text-xs text-gray-500 dark:text-gray-500">
              {getUnlockMessage(feature, threshold - progress)}
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function getUnlockMessage(feature: string, remaining: number): string {
  switch (feature) {
    case 'filters_save':
      return `View ${remaining} more ${remaining === 1 ? 'item' : 'items'} to unlock`;
    case 'topics':
      return `Save ${remaining} more ${remaining === 1 ? 'item' : 'items'} to unlock`;
    case 'partner_profiles':
      return `Engage with partner content to unlock`;
    default:
      return '';
  }
}

/**
 * Feature Unlock Toast
 * Shows when a feature is newly unlocked
 */
interface FeatureUnlockToastProps {
  feature: 'filters_save' | 'topics' | 'partner_profiles';
  onDismiss: () => void;
}

export function FeatureUnlockToast({ feature, onDismiss }: FeatureUnlockToastProps) {
  const config = FEATURE_CONFIG[feature];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.9 }}
      className="fixed bottom-4 right-4 z-50"
    >
      <Card className="p-4 bg-gradient-to-br from-primary to-primary/80 text-white shadow-2xl max-w-sm">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="p-2 bg-white/20 rounded-lg"
          >
            <Unlock className="w-5 h-5" />
          </motion.div>

          {/* Content */}
          <div className="flex-1">
            <h4 className="font-semibold mb-1">Feature Unlocked! 🎉</h4>
            <p className="text-sm text-white/90 mb-2">
              You can now use <strong>{config.title}</strong>
            </p>
            <p className="text-xs text-white/70">{config.description}</p>
          </div>

          {/* Close Button */}
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </Card>
    </motion.div>
  );
}
