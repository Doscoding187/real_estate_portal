import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ReadinessIndicatorProps {
  score: number;
  missing?: Record<string, string[]>;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ring' | 'bar' | 'compact';
  className?: string;
}

export const ReadinessIndicator: React.FC<ReadinessIndicatorProps> = ({
  score,
  missing = {},
  size = 'md',
  variant = 'ring',
  className,
}) => {
  const isReady = score >= 90;

  // Determine color based on score
  const getColor = (s: number) => {
    if (s >= 90) return 'text-green-500';
    if (s >= 50) return 'text-amber-500';
    return 'text-red-500';
  };

  const colorClass = getColor(score);

  // Flatten missing fields for display
  const missingItems = Object.entries(missing).flatMap(([section, fields]) =>
    fields.map(f => `${section.charAt(0).toUpperCase() + section.slice(1)}: ${f}`),
  );

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('flex items-center gap-2', className)}>
              <div className={cn('font-bold', colorClass)}>{score}%</div>
              {isReady ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-500" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-1">
              <p className="font-semibold text-xs border-b pb-1 mb-1">
                {isReady ? 'Ready to Submit' : 'Fix Required'}
              </p>
              {missingItems.length > 0 ? (
                <ul className="text-xs list-disc pl-3 space-y-0.5">
                  {missingItems.slice(0, 5).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                  {missingItems.length > 5 && <li>+ {missingItems.length - 5} more</li>}
                </ul>
              ) : (
                <p className="text-xs text-green-500">All checks passed</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Ring Implementation (SVG)
  const sizePx = size === 'sm' ? 32 : size === 'md' ? 48 : 64;
  const strokeWidth = size === 'sm' ? 3 : 4;
  const radius = (sizePx - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <div className="relative" style={{ width: sizePx, height: sizePx }}>
              <svg className="transform -rotate-90 w-full h-full">
                <circle
                  className="text-gray-200"
                  strokeWidth={strokeWidth}
                  stroke="currentColor"
                  fill="transparent"
                  r={radius}
                  cx={sizePx / 2}
                  cy={sizePx / 2}
                />
                <circle
                  className={cn('transition-all duration-500', colorClass)}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r={radius}
                  cx={sizePx / 2}
                  cy={sizePx / 2}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className={cn('font-bold', size === 'sm' ? 'text-[10px]' : 'text-xs', colorClass)}
                >
                  {score}%
                </span>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-1">
              <p className="font-semibold text-xs border-b pb-1 mb-1">
                {isReady ? 'Ready for Submission' : 'Completion Status'}
              </p>
              {missingItems.length > 0 ? (
                <ul className="text-xs list-disc pl-3 space-y-0.5">
                  {missingItems.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-green-500">All checks passed!</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
