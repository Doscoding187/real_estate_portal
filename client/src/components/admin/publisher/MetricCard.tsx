import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { publisherTheme, gradients, animations } from '@/lib/publisherTheme';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtext?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

// Simple sparkline component
const Sparkline: React.FC<{ data: number[]; isPositive?: boolean }> = ({ data, isPositive }) => {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = ((max - value) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 100" className="w-full h-8">
      <polyline
        points={points}
        fill="none"
        stroke={isPositive ? '#10b981' : '#ef4444'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon: Icon,
  subtext,
  trend,
  className,
}) => {
  const [currentValue, setCurrentValue] = useState(0);
  const [isAnimated, setIsAnimated] = useState(false);

  // Generate sample sparkline data
  const sparklineData = React.useMemo(() => {
    const base = typeof value === 'number' ? value : parseInt(value.toString()) || 100;
    return Array.from({ length: 7 }, () => {
      const variation = (Math.random() - 0.5) * base * 0.3;
      return Math.max(0, base + variation);
    });
  }, [value]);

  // Animated counter effect
  useEffect(() => {
    if (!isAnimated && typeof value === 'number') {
      setIsAnimated(true);
      const target = value;
      const duration = 1000;
      const steps = 30;
      const increment = target / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          setCurrentValue(target);
          clearInterval(timer);
        } else {
          setCurrentValue(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    } else {
      setCurrentValue(typeof value === 'number' ? value : 0);
    }
  }, [value, isAnimated]);

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-2 cursor-pointer',
        'border-0 bg-white group',
        animations.fadeIn,
        className,
      )}
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Decorative orb */}
      <div className="absolute top-4 right-4 w-16 h-16 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-gray-600">{title}</h3>
          {trend && (
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
                  trend.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
                )}
              >
                {trend.isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>{Math.abs(trend.value)}%</span>
              </div>
              <span className="text-xs text-gray-500">vs last month</span>
            </div>
          )}
        </div>

        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
          <Icon className="h-6 w-6 text-white" />
        </div>
      </CardHeader>

      <CardContent className="relative z-10 space-y-4">
        {/* Main value with animation */}
        <div className="flex items-baseline gap-3">
          <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent leading-tight">
            {currentValue}
          </div>
          {trend && (
            <div
              className={cn(
                'inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full animate-pulse',
                trend.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
              )}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </div>
          )}
        </div>

        {/* Sparkline */}
        {sparklineData.length > 1 && (
          <div className="h-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <Sparkline data={sparklineData} isPositive={trend?.isPositive} />
          </div>
        )}

        {subtext && <p className="text-sm text-gray-600 font-medium">{subtext}</p>}
      </CardContent>
    </Card>
  );
};
