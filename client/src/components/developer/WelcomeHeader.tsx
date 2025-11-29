/**
 * Welcome Header Component for Mission Control Dashboard
 * Shows time-based greeting and time range selector
 * Requirements: 2.1, 2.2
 */

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WelcomeHeaderProps {
  developerName?: string;
  onTimeRangeChange?: (range: '7d' | '30d' | '90d') => void;
  selectedTimeRange?: '7d' | '30d' | '90d';
}

const TIME_RANGES = [
  { value: '7d' as const, label: '7 Days' },
  { value: '30d' as const, label: '30 Days' },
  { value: '90d' as const, label: '90 Days' },
];

export function WelcomeHeader({
  developerName = 'Developer',
  onTimeRangeChange,
  selectedTimeRange = '30d',
}: WelcomeHeaderProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>(selectedTimeRange);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handleTimeRangeChange = (range: '7d' | '30d' | '90d') => {
    setTimeRange(range);
    onTimeRangeChange?.(range);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {getGreeting()}, {developerName}! 👋
        </h1>
        <p className="text-gray-600 mt-1">
          Here's what's happening with your developments today
        </p>
      </div>

      {/* Time Range Selector */}
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-gray-400" />
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          {TIME_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => handleTimeRangeChange(range.value)}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
                timeRange === range.value
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
