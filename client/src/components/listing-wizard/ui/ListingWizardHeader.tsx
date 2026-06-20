import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Save, Check, AlertCircle, Loader2 } from 'lucide-react';

interface ListingWizardHeaderProps {
  title: string;
  description?: string;
  progressPercent: number;
  onExit?: () => void;
  showExit?: boolean;
  saveStatus?: 'saved' | 'saving' | 'error' | 'idle';
  lastSavedAt?: Date | null;
  workflowTitle?: string;
  onSaveDraft?: () => void;
  isSaving?: boolean;
  canSaveDraft?: boolean;
}

export function ListingWizardHeader({
  title,
  description,
  progressPercent,
  onExit,
  showExit = false,
  saveStatus = 'idle',
  lastSavedAt,
  workflowTitle,
  onSaveDraft,
  isSaving = false,
  canSaveDraft = true,
}: ListingWizardHeaderProps) {
  return (
    <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {showExit && onExit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onExit}
                className="text-slate-500 hover:text-slate-700"
              >
                <X className="w-4 h-4 mr-1" />
                Exit
              </Button>
            )}
            {workflowTitle && (
              <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {workflowTitle}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {onSaveDraft && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSaveDraft}
                disabled={isSaving || !canSaveDraft}
                className="text-slate-600 border-slate-300 hover:bg-slate-50"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                ) : (
                  <Save className="w-3.5 h-3.5 mr-1" />
                )}
                {isSaving ? 'Saving…' : 'Save Draft'}
              </Button>
            )}
            <SaveStatusBadge status={saveStatus} lastSavedAt={lastSavedAt} />
          </div>
        </div>

        <div className="mb-3">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
        </div>

        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <div className="flex justify-end mt-1">
          <span className="text-[11px] text-slate-400 font-medium">
            {Math.round(progressPercent)}% complete
          </span>
        </div>
      </div>
    </div>
  );
}

function SaveStatusBadge({
  status,
  lastSavedAt,
}: {
  status: 'saved' | 'saving' | 'error' | 'idle';
  lastSavedAt?: Date | null;
}) {
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (status === 'saving') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-blue-600">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Saving…</span>
      </div>
    );
  }

  if (status === 'saved') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600">
        <Check className="w-3.5 h-3.5" />
        <span>
          Saved{lastSavedAt ? ` at ${formatTime(lastSavedAt)}` : ''}
        </span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-red-600">
        <AlertCircle className="w-3.5 h-3.5" />
        <span>Save failed</span>
      </div>
    );
  }

  return null;
}
