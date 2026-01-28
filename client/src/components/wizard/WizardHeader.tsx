import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, RotateCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export interface WizardHeaderProps {
  title: string;
  description?: string;
  progressPercent: number;
  showExit?: boolean;
  onExit?: () => void;
  saveStatus?: 'saved' | 'saving' | 'error';
  lastSavedAt?: Date;
  className?: string;
}

export function WizardHeader({
  title,
  description,
  progressPercent,
  showExit = true,
  onExit,
  saveStatus = 'saved',
  lastSavedAt,
  className,
}: WizardHeaderProps) {
  return (
    <div
      className={cn(
        'w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-10 sticky top-0',
        className,
      )}
    >
      <div className="max-w-5xl mx-auto px-4 py-4">
        {/* Top Row: Title & Controls */}
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-900 to-slate-900 bg-clip-text text-transparent leading-tight">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-slate-500 max-w-2xl text-balance">{description}</p>
            )}
          </div>

          <div className="flex items-center gap-4 pl-4">
            {/* Save Status */}
            <div className="hidden md:flex items-center">
              {saveStatus === 'saving' && (
                <span className="flex items-center text-xs text-slate-400 font-medium">
                  <RotateCw className="w-3 h-3 mr-1.5 animate-spin" />
                  Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span
                  className="flex items-center text-xs text-slate-400 font-medium"
                  title={lastSavedAt ? `Saved at ${lastSavedAt.toLocaleTimeString()}` : 'Saved'}
                >
                  <CheckCircle2 className="w-3 h-3 mr-1.5 text-emerald-500" />
                  Saved
                </span>
              )}
              {saveStatus === 'error' && (
                <Badge variant="destructive" className="text-[10px] h-5">
                  Save Failed
                </Badge>
              )}
            </div>

            {/* Separator */}
            <div className="h-6 w-px bg-slate-200 hidden md:block" />

            {/* Progress Percentage Badge (The only "stepper") */}
            <div className="flex flex-col items-end">
              <span className="text-2xl font-bold text-slate-900 leading-none font-mono tracking-tight">
                {Math.round(progressPercent)}%
              </span>
            </div>

            {/* Exit Button */}
            {showExit && onExit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onExit}
                className="ml-2 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-full h-9 w-9 transition-colors"
                title="Exit Wizard"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Thin Progress Bar */}
        <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${Math.max(progressPercent, 5)}%` }} // Min 5% so its visible
          />
        </div>
      </div>
    </div>
  );
}
