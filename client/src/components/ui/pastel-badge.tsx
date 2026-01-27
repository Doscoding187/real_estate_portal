import React from 'react';
import { cn } from '@/lib/utils';

interface PastelBadgeProps {
  children: React.ReactNode;
  variant?: 'mint' | 'apricot' | 'lavender' | 'sky' | 'rose';
  className?: string;
}

const variantStyles = {
  mint: 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border-emerald-200',
  apricot: 'bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 border-orange-200',
  lavender: 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-200',
  sky: 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border-blue-200',
  rose: 'bg-gradient-to-r from-rose-100 to-pink-100 text-rose-700 border-rose-200',
};

export const PastelBadge: React.FC<PastelBadgeProps> = ({
  children,
  variant = 'mint',
  className,
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
};
