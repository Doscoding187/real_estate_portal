/**
 * Component for displaying validation errors in a list format
 * Shows field-specific errors with step navigation
 */

import React from 'react';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { FieldError } from '@/lib/errors/ValidationErrorParser';
import { getFieldDisplayName } from '@/lib/errors/ValidationErrorParser';

interface ValidationErrorListProps {
  fieldErrors: FieldError[];
  generalErrors: string[];
  onFieldClick?: (field: string, step?: number) => void;
  onDismiss?: () => void;
  className?: string;
}

export function ValidationErrorList({
  fieldErrors,
  generalErrors,
  onFieldClick,
  onDismiss,
  className = '',
}: ValidationErrorListProps) {
  const hasErrors = fieldErrors.length > 0 || generalErrors.length > 0;

  if (!hasErrors) {
    return null;
  }

  const totalErrors = fieldErrors.length + generalErrors.length;

  return (
    <Card className={`border-red-200 bg-red-50 ${className}`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">
                Validation Error{totalErrors > 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-red-700 mt-0.5">
                Please fix the following issue{totalErrors > 1 ? 's' : ''} before submitting:
              </p>
            </div>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="text-red-600 hover:text-red-700 hover:bg-red-100 -mt-1 -mr-2"
            >
              Dismiss
            </Button>
          )}
        </div>

        {/* Field Errors */}
        {fieldErrors.length > 0 && (
          <div className="space-y-2 mb-3">
            {fieldErrors.map((error, index) => (
              <div
                key={`${error.field}-${index}`}
                className={`flex items-start justify-between gap-3 p-3 rounded-lg bg-white border border-red-200 ${
                  onFieldClick && error.step !== undefined
                    ? 'cursor-pointer hover:border-red-300 hover:shadow-sm transition-all'
                    : ''
                }`}
                onClick={() => {
                  if (onFieldClick && error.step !== undefined) {
                    onFieldClick(error.field, error.step);
                  }
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-red-900 text-sm">
                    {getFieldDisplayName(error.field)}
                  </div>
                  <div className="text-sm text-red-700 mt-0.5">
                    {error.message}
                  </div>
                  {error.step !== undefined && (
                    <div className="text-xs text-red-600 mt-1">
                      Step {error.step}
                    </div>
                  )}
                </div>
                {onFieldClick && error.step !== undefined && (
                  <ChevronRight className="h-4 w-4 text-red-600 flex-shrink-0 mt-1" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* General Errors */}
        {generalErrors.length > 0 && (
          <div className="space-y-2">
            {generalErrors.map((error, index) => (
              <div
                key={`general-${index}`}
                className="p-3 rounded-lg bg-white border border-red-200"
              >
                <div className="text-sm text-red-700">{error}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Compact version for inline display
 */
export function ValidationErrorSummary({
  errorCount,
  onClick,
  className = '',
}: {
  errorCount: number;
  onClick?: () => void;
  className?: string;
}) {
  if (errorCount === 0) {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 ${
        onClick ? 'cursor-pointer hover:bg-red-100 transition-colors' : ''
      } ${className}`}
      onClick={onClick}
    >
      <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
      <span className="text-sm text-red-700 font-medium">
        {errorCount} validation error{errorCount > 1 ? 's' : ''} found
      </span>
      {onClick && <ChevronRight className="h-4 w-4 text-red-600 ml-auto" />}
    </div>
  );
}
