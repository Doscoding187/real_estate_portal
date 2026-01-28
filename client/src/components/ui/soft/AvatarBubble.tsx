/**
 * AvatarBubble Component
 *
 * A modern avatar component with soft shadows and optional status indicators.
 * Supports images, initials, and placeholder states.
 *
 * Features:
 * - Image loading with fallback
 * - Initials generation
 * - Status indicator (online, offline, busy)
 * - Multiple sizes
 * - Accessible alt text
 */

import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { useState } from 'react';
import { designTokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

interface AvatarBubbleProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'busy' | null;
  onClick?: () => void;
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
} as const;

const statusColors = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  busy: 'bg-red-500',
} as const;

const statusSizes = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-4 h-4',
} as const;

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function AvatarBubble({
  src,
  alt,
  name,
  size = 'md',
  status = null,
  onClick,
  className = '',
}: AvatarBubbleProps) {
  const [imageError, setImageError] = useState(false);
  const isInteractive = !!onClick;
  const displayName = alt || name || 'User';
  const initials = name ? getInitials(name) : null;

  const renderContent = () => {
    if (src && !imageError) {
      return (
        <img
          src={src}
          alt={displayName}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      );
    }

    if (initials) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-indigo-600 text-white font-semibold">
          {initials}
        </div>
      );
    }

    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
        <User className="w-1/2 h-1/2" />
      </div>
    );
  };

  return (
    <motion.div
      className={cn(
        sizeClasses[size],
        'rounded-full overflow-hidden shadow-md',
        'relative flex-shrink-0',
        isInteractive && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
      whileHover={isInteractive ? { scale: 1.05 } : undefined}
      whileTap={isInteractive ? { scale: 0.95 } : undefined}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      role={isInteractive ? 'button' : undefined}
      aria-label={isInteractive ? `View ${displayName}'s profile` : displayName}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={
        isInteractive
          ? e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      {renderContent()}

      {status && (
        <div
          className={cn(
            statusSizes[size],
            statusColors[status],
            'absolute bottom-0 right-0',
            'rounded-full border-2 border-white',
            'shadow-sm',
          )}
          aria-label={`Status: ${status}`}
        />
      )}
    </motion.div>
  );
}
