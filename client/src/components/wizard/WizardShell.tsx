import React, { useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, FolderOpen, RotateCw, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { describeSaveStatus } from '@/lib/wizardSaveStatus';
import type { WizardProgress } from '@/lib/wizardProgress';
import { iconForStep } from './wizardIcons';
import { WizardLivePreview } from './WizardLivePreview';
import type { DevelopmentPreviewModel } from './previewModel';
import { ProgressBar } from './ui/WizardUi';
import { wizardTokens as t } from './ui/wizardTokens';

export interface WizardShellStep {
  id: string;
  title: string;
  /** Done steps show a tick. */
  done: boolean;
  /** Visited steps can be jumped to. */
  visited: boolean;
}

export interface WizardSaveInput {
  isSaving: boolean;
  hasError: boolean;
  lastSavedAt: Date | null | undefined;
}

export interface WizardShellProps {
  steps: WizardShellStep[];
  currentIndex: number;
  onSelectStep: (stepId: string) => void;
  description?: string;
  progress: WizardProgress;
  save: WizardSaveInput;
  onRetrySave?: () => void;
  onSaveAndExit?: () => void;
  /** Set when a super admin is creating for a catalogue publisher. */
  publisherName?: string | null;
  changePublisherHref?: string;
  draftsHref?: string;
  draftsLabel?: string;
  previewModel: DevelopmentPreviewModel;
  canGoBack: boolean;
  onBack: () => void;
  /** Omit to hide the Continue button (last step has its own publish action). */
  onNext?: () => void;
  nextLabel?: string;
  /** Rendered above the step content (validation messages, banners). */
  notice?: React.ReactNode;
  children: React.ReactNode;
}

const STEP_TIPS: Record<string, string> = {
  project_setup: 'Two quick choices to begin.',
  configuration: 'What kind of place is it?',
  identity_market: 'Name it and say where it is in its life.',
  location: 'Buyers see the suburb, not the street.',
  governance_finances: 'The running costs every buyer asks about.',
  amenities_features: 'Tap what the development really has.',
  marketing_summary: 'A few honest words that sell it.',
  development_media: 'Good photos get the most attention.',
  unit_types: 'One card per house type.',
  review_publish: 'Check everything before it goes out.',
};

/** Save status text, refreshed every 30 seconds so "min ago" stays true. */
function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function SaveIndicator({
  save,
  onRetry,
}: {
  save: WizardSaveInput;
  onRetry?: () => void;
}) {
  const now = useNow(30_000);
  const status = describeSaveStatus({ ...save, now });

  if (status.kind === 'error') {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-red-700 hover:underline"
      >
        <TriangleAlert className="h-4 w-4" aria-hidden="true" />
        {status.text}
      </button>
    );
  }
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        'inline-flex items-center gap-1.5 text-[13px]',
        status.kind === 'saved' ? 'text-green-700' : 'text-slate-600',
      )}
    >
      {status.kind === 'saving' && <RotateCw className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {status.kind === 'saved' && <Check className="h-4 w-4" aria-hidden="true" />}
      {status.text}
    </span>
  );
}

export function WizardShell({
  steps,
  currentIndex,
  onSelectStep,
  description,
  progress,
  save,
  onRetrySave,
  onSaveAndExit,
  publisherName,
  changePublisherHref,
  draftsHref,
  draftsLabel = 'Your drafts',
  previewModel,
  canGoBack,
  onBack,
  onNext,
  nextLabel = 'Continue',
  notice,
  children,
}: WizardShellProps) {
  const current = steps[currentIndex];
  const HeadIcon = iconForStep(current?.id);

  return (
    <div className={cn('flex min-h-screen flex-col font-sans text-slate-900', t.pageBackground)}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3.5 sm:px-7">
        <div className="flex flex-wrap items-center gap-3.5">
          <div className="text-base font-bold">New development</div>
          {publisherName ? (
            <div className="inline-flex h-8 items-center gap-2 rounded-full bg-slate-100 px-3 text-[13px] text-slate-800">
              <span className="text-slate-600">Creating for</span>
              <strong>{publisherName}</strong>
              {changePublisherHref && (
                <a href={changePublisherHref} className="text-xs text-blue-700 hover:text-blue-900">
                  Change
                </a>
              )}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {draftsHref && (
            <a
              href={draftsHref}
              className="inline-flex items-center gap-1.5 text-[13px] text-blue-700 hover:text-blue-900"
            >
              <FolderOpen className="h-4 w-4" aria-hidden="true" />
              {draftsLabel}
            </a>
          )}
          <SaveIndicator save={save} onRetry={onRetrySave} />
          {onSaveAndExit && (
            <button
              type="button"
              onClick={onSaveAndExit}
              className={cn(t.button, t.buttonGhost)}
            >
              Save &amp; exit
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 items-start gap-4 px-3 py-6 sm:px-5 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-4 xl:grid-cols-[190px_minmax(0,1fr)_300px] xl:gap-4">
        <nav aria-label="Wizard steps" className="min-w-0">
          <div className="hidden px-2.5 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-slate-600 lg:block">
            Step {progress.position} of {progress.total}
          </div>
          <ol className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {steps.map((step, index) => {
              const Icon = iconForStep(step.id);
              const isCurrent = index === currentIndex;
              return (
                <li key={step.id} className="flex-none lg:flex-auto">
                  <button
                    type="button"
                    disabled={!step.visited && !isCurrent}
                    aria-current={isCurrent ? 'step' : undefined}
                    onClick={() => onSelectStep(step.id)}
                    className={cn(
                      'flex min-h-11 w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left text-sm text-slate-700 transition-colors',
                      'enabled:hover:bg-white disabled:cursor-not-allowed disabled:opacity-60',
                      isCurrent && 'bg-blue-50 font-semibold text-blue-900',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full border-[1.5px] border-slate-400 bg-white text-slate-600',
                        step.done && !isCurrent && 'border-green-700 bg-green-700 text-white',
                        isCurrent && 'border-blue-700 bg-blue-700 text-white',
                      )}
                    >
                      {step.done && !isCurrent ? (
                        <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-label="Done" />
                      ) : (
                        <Icon className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                      )}
                    </span>
                    <span className="hidden lg:inline">{step.title}</span>
                    <span className="sr-only lg:hidden">{step.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <main className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center gap-4">
            <span className={t.headIconTile}>
              <HeadIcon className="h-[26px] w-[26px]" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-[22px] font-bold leading-tight">{current?.title}</h1>
              <div className="text-[13px] text-slate-600">
                Step {progress.position} of {progress.total}
                {current && STEP_TIPS[current.id] ? ` · ${STEP_TIPS[current.id]}` : ''}
              </div>
              {description && <div className="sr-only">{description}</div>}
              <div className="mt-2">
                <ProgressBar percent={progress.percent} />
              </div>
            </div>
          </div>

          {notice}

          <div>{children}</div>

          <div className="flex flex-wrap justify-between gap-3">
            <button type="button" onClick={onBack} disabled={!canGoBack} className={t.button}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </button>
            {onNext && (
              <button type="button" onClick={onNext} className={cn(t.button, t.buttonPrimary)}>
                {nextLabel}
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </main>

        <div className="min-w-0 lg:col-span-2 xl:col-span-1 xl:sticky xl:top-6">
          <WizardLivePreview model={previewModel} publisherName={publisherName} />
        </div>
      </div>
    </div>
  );
}
