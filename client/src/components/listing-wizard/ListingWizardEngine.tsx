import React, { ComponentType } from 'react';
import { useListingWizardContext } from './contexts/ListingWizardContext';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ListingWizardHeader } from './ui/ListingWizardHeader';
import { ValidationErrorsPanel, StepProgressIndicator } from './ui/ValidationErrorsPanel';
import { PayloadPreviewPanel } from './ui/PayloadPreviewPanel';

/**
 * Safely lazy-load a step component, supporting both default and named exports.
 * If the named export is provided, it is wrapped as the default.
 */
function safeLazy<T extends ComponentType<any>>(
  importFn: () => Promise<{ default?: T; [key: string]: any }>,
  namedExport?: string,
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    try {
      const mod = await importFn();
      if (namedExport && mod[namedExport]) {
        return { default: mod[namedExport] as T };
      }
      if (mod.default) {
        return { default: mod.default };
      }
      console.error(`[V2 Engine] Step module has no default export${namedExport ? ` and no named export "${namedExport}"` : ''}`);
      return {
        default: ((() => (
          <div className="text-center p-12 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p className="font-semibold">Step component failed to load</p>
            <p className="text-sm mt-1">The module has no recognized export.</p>
          </div>
        )) as unknown as T),
      };
    } catch (err) {
      console.error('[V2 Engine] Failed to lazy-load step component:', err);
      return {
        default: ((() => (
          <div className="text-center p-12 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p className="font-semibold">Step component failed to load</p>
            <p className="text-sm mt-1">{(err as Error)?.message ?? 'Unknown error'}</p>
          </div>
        )) as unknown as T),
      };
    }
  });
}

const ActionStep = safeLazy(() => import('./steps/ActionStep'));
const PropertyTypeStep = safeLazy(() => import('./steps/PropertyTypeStep'));
const BasicInformationStep = safeLazy(() => import('./steps/BasicInformationStep'));
const AdditionalInformationStep = safeLazy(() => import('./steps/AdditionalInformationStep'), 'AdditionalInformationStep');
const PricingStep = safeLazy(() => import('./steps/PricingStep'));
const LocationStep = safeLazy(() => import('./steps/LocationStep'));
const MediaUploadStep = safeLazy(() => import('./steps/MediaUploadStep'));
const PreviewStep = safeLazy(() => import('./steps/PreviewStep'));

/*
 * FUTURE PARITY: Each step below uses the existing V1 component.
 * These will be rebuilt with full business completeness in later phases:
 *
 * BasicInformationStep — currently 1,348 lines with @ts-nocheck; needs type-safe rebuild
 * PricingStep           — currently 552 lines; needs transfer costs, lease terms, utilities, auction dates
 * LocationStep          — currently 315 lines; needs full Google Maps integration (pin drop, autocomplete)
 * MediaUploadStep       — currently 396 lines; needs client-side compression, alt text, virtual tours
 * PreviewStep           — currently 203 lines with @ts-nocheck; needs quality score, preview modes, social media cards
 */
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

export interface ListingWizardEngineProps {
  onExit?: () => void;
}

export function ListingWizardEngine({
  onExit,
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
    isValidating,
  } = useListingWizardContext();

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

  const stepTitles = visibleSteps.map(s => s.title);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50">
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

      <main className="flex-1 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <StepProgressIndicator
            currentIndex={currentStepIndex}
            totalSteps={visibleSteps.length}
            completedStepIds={[]}
            currentStepId={currentStep.id}
            stepTitles={stepTitles}
          />

          <ValidationErrorsPanel errors={stepErrors as any} />

          <div className="mb-20">
            {StepComponent ? (
              <React.Suspense
                fallback={
                  <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                  </div>
                }
              >
                <StepComponent />
              </React.Suspense>
            ) : (
              <div className="text-center p-12 bg-red-50 border border-red-200 rounded-lg text-red-700" role="alert">
                <p className="font-semibold text-base">Unknown step: &quot;{currentStep.componentKey}&quot;</p>
                <p className="text-sm mt-1">No component is registered for this step key. The workflow configuration may be out of date.</p>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-6 border-t border-slate-200 mt-8">
            <Button
              variant="outline"
              onClick={goBack}
              disabled={currentStepIndex === 0 || isValidating}
              className="px-6 h-12 text-slate-600"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {currentStepIndex < visibleSteps.length - 1 ? (
              <Button
                onClick={goNext}
                disabled={isValidating}
                size="lg"
                className="px-8 h-12 bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
              >
                {isValidating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Validating…
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            ) : (
              <div />
            )}
          </div>
        </div>
      </main>

      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-2 right-2 p-2 bg-slate-900/80 text-white rounded text-[10px] font-mono opacity-50 hover:opacity-100 z-50">
          <p>Workflow: {workflow.id}</p>
          <p>Step: {currentStep.id} ({currentStepIndex + 1}/{visibleSteps.length})</p>
        </div>
      )}

      <PayloadPreviewPanel />
    </div>
  );
}
