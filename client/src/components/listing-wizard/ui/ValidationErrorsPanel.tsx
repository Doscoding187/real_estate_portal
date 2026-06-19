import React from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, X } from 'lucide-react';
import type { ListingFieldError } from '@shared/listing-workflow-types';

interface ValidationErrorsPanelProps {
  errors: ListingFieldError[];
  onDismiss?: () => void;
}

export function ValidationErrorsPanel({ errors, onDismiss }: ValidationErrorsPanelProps) {
  if (errors.length === 0) return null;

  return (
    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg animate-in fade-in slide-in-from-top-2">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <h4 className="text-red-800 font-semibold text-sm">
            {errors.length === 1 ? '1 issue needs attention' : `${errors.length} issues need attention`}
          </h4>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-400 hover:text-red-600 transition-colors"
            aria-label="Dismiss errors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <ul className="mt-3 space-y-1.5">
        {errors.map((err, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-red-700">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
            <span>
              {err.field ? (
                <>
                  <strong className="font-medium capitalize">{err.field.replace(/([A-Z])/g, ' $1')}</strong>
                  {': '}
                </>
              ) : null}
              {err.message}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface StepIndicatorProps {
  currentIndex: number;
  totalSteps: number;
  completedStepIds: string[];
  currentStepId: string;
  stepTitles: string[];
  onStepClick?: (index: number) => void;
}

export function StepProgressIndicator({
  currentIndex,
  totalSteps,
  completedStepIds,
  currentStepId,
  stepTitles,
  onStepClick,
}: StepIndicatorProps) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center gap-1">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepId = stepTitles[index]?.toLowerCase().replace(/\s+/g, '_') || String(index);
          const isCompleted = completedStepIds.includes(stepId);
          const isCurrent = index === currentIndex;
          const isClickable = isCompleted || isCurrent || index < currentIndex;

          return (
            <li key={index} className="flex-1">
              {isClickable && onStepClick ? (
                <button
                  onClick={() => onStepClick(index)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all
                    ${isCurrent
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : isCompleted
                        ? 'text-green-700 hover:bg-green-50'
                        : 'text-slate-400 cursor-default'
                    }`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  ) : isCurrent ? (
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold shrink-0">
                      {index + 1}
                    </span>
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[10px] flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                  )}
                  <span className="hidden md:inline truncate">{stepTitles[index] || `Step ${index + 1}`}</span>
                </button>
              ) : (
                <div
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
                    ${isCurrent ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-400'}`}
                >
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[10px] flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <span className="hidden md:inline truncate">{stepTitles[index] || `Step ${index + 1}`}</span>
                </div>
              )}
              {index < totalSteps - 1 && (
                <div className={`hidden md:block h-0.5 mt-2 ${isCompleted ? 'bg-green-300' : 'bg-slate-200'}`} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

interface StepWarningProps {
  warnings: string[];
  onDismiss?: () => void;
}

export function StepWarnings({ warnings, onDismiss }: StepWarningProps) {
  if (warnings.length === 0) return null;

  return (
    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <h4 className="text-amber-800 font-medium text-sm">Suggestions</h4>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-amber-400 hover:text-amber-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <ul className="mt-2 space-y-1">
        {warnings.map((w, idx) => (
          <li key={idx} className="flex items-start gap-2 text-xs text-amber-700">
            <span className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 shrink-0" />
            {w}
          </li>
        ))}
      </ul>
    </div>
  );
}
