/**
 * KPI Card Component for Mission Control Dashboard
 * Displays individual KPI with value, trend, and icon
 * Requirements: 2.3, 2.4, 2.5
 */

import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number; // Percentage change
  trend?: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
  iconColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  loading?: boolean;
}

export function KPICard({
  title,
  value,
  change,
  trend = 'neutral',
  icon: Icon,
  iconColor = 'text-blue-600',
  gradientFrom = 'from-blue-500',
  gradientTo = 'to-indigo-600',
  loading = false,
}: KPICardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4" />;
      case 'down':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600 bg-green-50';
      case 'down':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 bg-gray-200 rounded-lg" />
          <div className="w-16 h-6 bg-gray-200 rounded" />
        </div>
        <div className="space-y-2">
          <div className="w-24 h-4 bg-gray-200 rounded" />
          <div className="w-32 h-8 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-200 p-6',
        'hover:shadow-lg hover:scale-[1.02] transition-all duration-300',
        'cursor-pointer group'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        {/* Icon */}
        <div
          className={cn(
            'w-12 h-12 rounded-lg flex items-center justify-center',
            'bg-gradient-to-br',
            gradientFrom,
            gradientTo,
            'group-hover:scale-110 transition-transform duration-300'
          )}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>

        {/* Trend Badge */}
        {change !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold',
              getTrendColor()
            )}
          >
            {getTrendIcon()}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>

      {/* Hover Effect Line */}
      <div
        className={cn(
          'mt-4 h-1 rounded-full bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300',
          gradientFrom,
          gradientTo
        )}
      />
    </div>
  );
}
