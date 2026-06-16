/**
 * ListingWizardEngine
 *
 * Generic wizard renderer for single-property listings.
 * Mirrors the Development WizardEngine pattern:
 *   - Resolves workflow & visible steps from context
 *   - Renders the active step component via a component registry
 *   - Provides Back / Next navigation with validation gating
 *   - Shows step-level errors inline
 *
 * This component does NOT own state — it reads everything from
 * ListingWizardContext. The orchestrator (ListingWizard) owns
 * the Provider and handles persistence / submission.
 */

import React, { useEffect, useMemo } from 'react';
import { useListingWizardContext } from './contexts/ListingWizardContext';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ListingWizardHeader } from './ui/ListingWizardHeader';

// ─── Step Component Registry ─────────────────────────────────────────
// Lazy-load heavy step components to keep the initial bundle small.

const ActionStep = React.lazy(() => import('./steps/ActionStep'));
const PropertyTypeStep = React.lazy(() => import('./steps/PropertyTypeStep'));
const BasicInformationStep = React.lazy(() => import('./steps/BasicInformationStep'));
const AdditionalInformationStep = React.lazy(
  () => import('./steps/AdditionalInformationStep'),
);
const PricingStep = React.lazy(() => import('./steps/PricingStep'));
const LocationStep = React.lazy(() => import('./steps/LocationStep'));
const MediaUploadStep = React.lazy(() => import('./steps/MediaUploadStep'));
const PreviewStep = React.lazy(() => import('./steps/PreviewStep'));

const STEP_COMPONENTS: Record<string, React.ComponentType<any>> = {
  ActionStep,
  PropertyTypeStep,
  BasicInformationStep,
  AdditionalInformationStep,
  PricingStep,
  LocationStep,
  MediaUploadStep,
  PreviewStep,
};

// ─── Props ───────────────────────────────────────────────────────────

export interface ListingWizardEngineProps {
  onExit?: () => void;
  onSaveDraft?: () => Promise<void> | void;
  isSavingDraft?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────

export function ListingWizardEngine({
  onExit,
  onSaveDraft,
  isSavingDraft,
}: ListingWizardEngineProps) {
  const {
    workflow,
    visibleSteps,
    currentStep,
    currentStepIndex,
    progress,
    goNext,
    goBack,
    stepErrors,
    isPreWorkflow,
    saveStatus,
    lastSavedAt,
  } = useListingWizardContext();

  // ── Pre-workflow state: show ActionStep directly ────────────────
  if (isPreWorkflow || !workflow) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50/50">
        <ListingWizardHeader
          title="Create New Listing"
          description="What would you like to do with your property?"
          progressPercent={0}
          onExit={onExit}
          showExit={!!onExit}
          saveStatus={saveStatus}
          lastSavedAt={lastSavedAt}
        />
        <main className="flex-1 py-8 px-4">
          <div className="max-w-5xl mx-auto">
            <React.Suspense
              fallback={
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                </div>
              }
            >
              <ActionStep />
            </React.Suspense>
          </div>
        </main>
      </div>
    );
  }

  if (!currentStep) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const StepComponent = STEP_COMPONENTS[currentStep.componentKey];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50">
      {/* ── Header with progress ─────────────────────────────────── */}
      <ListingWizardHeader
        title={currentStep.title}
        description={currentStep.description}
        progressPercent={progress}
        onExit={onExit}
        showExit={!!onExit}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
        workflowTitle={workflow.title}
      />

      {/* ── Step Content ─────────────────────────────────────────── */}
      <main className="flex-1 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Validation errors */}
          {stepErrors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg animate-in fade-in slide-in-from-top-2">
              <h4 className="text-red-800 font-semibold mb-2">
                Please fix the following:
              </h4>
              <ul className="list-disc list-inside text-red-700 text-sm space-y-1 ml-1">
                {stepErrors.map((err, idx) => (
                  <li key={idx}>{err.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Step component */}
          <div className="mb-20">
            {StepComponent ? (
              <React.Suspense
                fallback={
                  <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                  </div>
                }
              >
                <StepComponent onSaveDraft={onSaveDraft} isSavingDraft={isSavingDraft} />
              </React.Suspense>
            ) : (
              <div className="text-center p-12 bg-slate-50 border border-dashed rounded-lg text-slate-500">
                Step component "{currentStep.componentKey}" not found
              </div>
            )}
          </div>

          {/* ── Navigation Footer ─────────────────────────────────── */}
          <div className="flex justify-between pt-6 border-t border-slate-200 mt-8">
            <Button
              variant="outline"
              onClick={goBack}
              disabled={currentStepIndex === 0}
              className="px-6 h-12 text-slate-600"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {currentStepIndex < visibleSteps.length - 1 ? (
              <Button
                onClick={goNext}
                size="lg"
                className="px-8 h-12 bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              /* Last step — the step component itself renders the submit button */
              <div />
            )}
          </div>
        </div>
      </main>

      {/* ── Dev Debug Info (hidden in production) ─────────────────── */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-2 right-2 p-2 bg-slate-900/80 text-white rounded text-[10px] font-mono opacity-50 hover:opacity-100 z-50">
          <p>Workflow: {workflow.id}</p>
          <p>Step: {currentStep.id} ({currentStepIndex + 1}/{visibleSteps.length})</p>
        </div>
      )}
    </div>
  );
}