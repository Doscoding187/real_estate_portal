/**
 * Quick Actions Panel for Mission Control Dashboard
 * Provides quick access to common developer actions
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import { Building2, Home, Image, Megaphone, UserPlus, Plus, Zap, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  onClick?: () => void;
  gradientFrom: string;
  gradientTo: string;
  requiresTier?: 'basic' | 'premium';
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'add-development',
    label: 'Add Development',
    description: 'Create a new development project',
    icon: Building2,
    path: '/developer/create-development',
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-indigo-600',
  },
  {
    id: 'add-unit',
    label: 'Add Unit',
    description: 'Add units to your development',
    icon: Home,
    path: '/developer/units/new',
    gradientFrom: 'from-green-500',
    gradientTo: 'to-emerald-600',
  },
  {
    id: 'upload-media',
    label: 'Upload to Explore',
    description: 'Share content on Explore feed',
    icon: Image,
    path: '/explore/upload',
    gradientFrom: 'from-purple-500',
    gradientTo: 'to-pink-600',
  },
  {
    id: 'launch-campaign',
    label: 'Launch Campaign',
    description: 'Start a marketing campaign',
    icon: Megaphone,
    path: '/developer/campaigns/new',
    gradientFrom: 'from-orange-500',
    gradientTo: 'to-red-600',
    requiresTier: 'basic',
  },
  {
    id: 'add-team-member',
    label: 'Add Team Member',
    description: 'Invite a team member',
    icon: UserPlus,
    path: '/developer/settings/team',
    gradientFrom: 'from-teal-500',
    gradientTo: 'to-cyan-600',
  },
];

interface QuickActionsProps {
  className?: string;
}

export function QuickActions({ className }: QuickActionsProps) {
  const [, setLocation] = useLocation();
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  // Fetch subscription to check tier limits
  const { data: subscription } = trpc.developer.getSubscription.useQuery();

  const isActionDisabled = (action: QuickAction): boolean => {
    if (!action.requiresTier) return false;
    if (!subscription) return false;

    const tierHierarchy = { free_trial: 0, basic: 1, premium: 2 };
    const currentTier = tierHierarchy[subscription.tier];
    const requiredTier = tierHierarchy[action.requiresTier];

    return currentTier < requiredTier;
  };

  const getDisabledReason = (action: QuickAction): string => {
    if (!action.requiresTier) return '';
    return `Upgrade to ${action.requiresTier} plan to use this feature`;
  };

  const handleActionClick = (action: QuickAction) => {
    if (isActionDisabled(action)) {
      // Show upgrade modal or navigate to subscription page
      setLocation('/developer/settings/subscription');
      return;
    }

    if (action.onClick) {
      action.onClick();
    } else if (action.path) {
      setLocation(action.path);
    }
  };

  return (
    <div className={cn('bg-white rounded-xl border border-gray-100 p-6 shadow-soft', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Zap className="w-5 h-5 text-yellow-500" />
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {QUICK_ACTIONS.map(action => {
          const Icon = action.icon;
          const disabled = isActionDisabled(action);
          const isHovered = hoveredAction === action.id;

          return (
            <button
              key={action.id}
              onClick={() => handleActionClick(action)}
              onMouseEnter={() => setHoveredAction(action.id)}
              onMouseLeave={() => setHoveredAction(null)}
              disabled={disabled}
              className={cn(
                'relative group p-4 rounded-xl border-2 transition-all duration-200',
                'text-left',
                disabled
                  ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                  : 'border-gray-100 hover:border-transparent hover:shadow-hover hover:scale-105 cursor-pointer',
              )}
              title={disabled ? getDisabledReason(action) : action.description}
            >
              {/* Gradient Background (on hover) */}
              {!disabled && (
                <div
                  className={cn(
                    'absolute inset-0 rounded-xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                    action.gradientFrom,
                    action.gradientTo,
                  )}
                />
              )}

              {/* Content */}
              <div className="relative z-10">
                {/* Icon */}
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all duration-200 shadow-soft',
                    disabled
                      ? 'bg-gray-200'
                      : cn(
                          'bg-gradient-to-br',
                          action.gradientFrom,
                          action.gradientTo,
                          'group-hover:bg-white/20',
                        ),
                  )}
                >
                  <Icon
                    className={cn(
                      'w-6 h-6 transition-colors duration-300',
                      disabled ? 'text-gray-400' : 'text-white',
                    )}
                  />
                  {disabled && <Lock className="absolute -top-1 -right-1 w-4 h-4 text-gray-500" />}
                </div>

                {/* Text */}
                <h3
                  className={cn(
                    'font-semibold mb-1 transition-colors duration-300',
                    disabled ? 'text-gray-500' : 'text-gray-900 group-hover:text-white',
                  )}
                >
                  {action.label}
                </h3>
                <p
                  className={cn(
                    'text-sm transition-colors duration-300',
                    disabled ? 'text-gray-400' : 'text-gray-600 group-hover:text-white/90',
                  )}
                >
                  {action.description}
                </p>

                {/* Plus Icon (on hover) */}
                {!disabled && isHovered && (
                  <div className="absolute top-2 right-2">
                    <Plus className="w-5 h-5 text-white animate-in fade-in zoom-in duration-200" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Help Text */}
      <p className="text-xs text-gray-500 mt-4 text-center">
        Quick access to your most common tasks
      </p>
    </div>
  );
}
