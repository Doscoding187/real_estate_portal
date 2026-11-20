import React, { useEffect, useState } from 'react';
import { StartScreen, type StartTransaction } from './StartScreen';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { BasicsPhase } from '../development-wizard/phases/BasicsPhase';
import { AboutPhase } from '../development-wizard/phases/AboutPhase';
import { LocationPhase } from '../development-wizard/phases/LocationPhase';
import { EstateProfilePhase } from '../development-wizard/phases/EstateProfilePhase';
import { AmenitiesPhase } from '../development-wizard/phases/AmenitiesPhase';
import { OverviewPhase } from '../development-wizard/phases/OverviewPhase';
import { MediaPhase } from '../development-wizard/phases/MediaPhase';
import { UnitTypesPhase } from '../development-wizard/phases/UnitTypesPhase';
import { FinalisationPhase } from '../development-wizard/phases/FinalisationPhase';
import { WORKFLOWS, getVisibleSteps } from '@/lib/workflows';
import { WizardData } from '@/lib/types/wizard-workflows';
import { computeWizardProgress } from '@/lib/wizardProgress';
import { WizardShell, type WizardSaveInput, type WizardShellStep } from './WizardShell';
import { buildPreviewModel } from './previewModel';

/**
 * The eight residential steps, in order: Basics, About, Location, Monthly
 * costs, Amenities, Media, House types, Review & publish. Steps that have not
 * been rebuilt yet still render their existing screens.
 */
const STEP_COMPONENTS: Record<string, React.ComponentType<any>> = {
  ConfigurationStep: BasicsPhase,
  IdentityMarketStep: AboutPhase,
  LocationStep: LocationPhase,
  GovernanceStep: EstateProfilePhase,
  AmenitiesStep: AmenitiesPhase,
  // Only the auction workflow still has a separate marketing step.
  MarketingStep: OverviewPhase,
  MediaStep: MediaPhase,
  UnitTypesStep: UnitTypesPhase,
  ReviewStep: FinalisationPhase,
};

/** Residential sale is the starting point until the publisher says "for rent" in Basics. */
const DEFAULT_WORKFLOW = WORKFLOWS.residential_sale;

interface WizardEngineProps {
  onExit?: () => void;
  onSaveDraft?: () => Promise<void> | void;
  isSavingDraft?: boolean;
  save?: WizardSaveInput;
  onRetrySave?: () => void;
  publisherName?: string | null;
  changePublisherHref?: string;
  draftsHref?: string;
  draftsLabel?: string;
}

export function WizardEngine({
  onExit,
  onSaveDraft,
  isSavingDraft,
  save = { isSaving: false, hasError: false, lastSavedAt: null },
  onRetrySave,
  publisherName,
  changePublisherHref,
  draftsHref,
  draftsLabel,
}: WizardEngineProps) {
  const {
    workflowId,
    currentStepId,
    completedSteps,
    goWorkflowNext,
    goWorkflowBack,
    ensureResidentialWorkflow,
    switchResidentialTransaction,
    transactionType,
    stepData,
    stepErrors,
    developmentData,
    developmentType,
    listingIdentity,
    setWorkflowStep,
    unitTypes,
    getWizardData,
  } = useDevelopmentWizard();

  // The unnumbered start screen shows for a brand-new wizard (no workflow yet),
  // and again when the publisher goes Back from step 1. A resumed draft or a
  // development being edited already has its answers, so it skips the screen.
  const [showStart, setShowStart] = useState(false);
  const [pendingTx, setPendingTx] = useState<StartTransaction | null>(null);
  const [warnChange, setWarnChange] = useState(false);
  const onStartScreen = !workflowId || showStart;
  const storedTx: StartTransaction | null =
    (transactionType ?? developmentData?.transactionType) === 'for_rent'
      ? 'for_rent'
      : (transactionType ?? developmentData?.transactionType) === 'for_sale'
        ? 'for_sale'
        : null;
  const selectedTx = pendingTx ?? (workflowId ? storedTx : null);

  const workflow = (workflowId ? WORKFLOWS[workflowId] : null) ?? DEFAULT_WORKFLOW;
  const activeStepId = workflowId ? currentStepId : null;
  const wizardData = { ...developmentData, developmentType, listingIdentity } as WizardData;
  const visibleSteps = getVisibleSteps(workflow, wizardData);
  const currentStepIndex = visibleSteps.findIndex(s => s.id === activeStepId);

  // Auto-correct if on a step this wizard no longer has (for example a draft
  // saved on the old "Marketing Summary" step).
  useEffect(() => {
    if (workflowId && currentStepIndex === -1 && visibleSteps.length > 0) {
      setWorkflowStep(visibleSteps[0].id);
    }
  }, [workflowId, currentStepIndex, visibleSteps, setWorkflowStep]);

  // The store re-renders this component on every change, so the preview is
  // rebuilt from the live canonical wizard data each time (cheap, pure).
  const baseData = (getWizardData?.() ?? developmentData) as Record<string, any>;
  const previewModel = buildPreviewModel(
    onStartScreen && selectedTx ? { ...baseData, transactionType: selectedTx } : baseData,
    unitTypes,
  );

  const currentStep = onStartScreen ? undefined : visibleSteps[currentStepIndex];

  const maxVisitedIndex = Math.max(
    currentStepIndex,
    ...visibleSteps.map((step, index) => (completedSteps?.includes(step.id) ? index : -1)),
  );
  // Nothing is numbered until Start.
  const shellSteps: WizardShellStep[] = onStartScreen
    ? []
    : visibleSteps.map((step, index) => ({
        id: step.id,
        title: step.title,
        done: Boolean(completedSteps?.includes(step.id)),
        visited: index <= maxVisitedIndex,
      }));

  const progress = onStartScreen
    ? { position: 0, total: 0, percent: 0 }
    : computeWizardProgress({
        visibleStepIds: visibleSteps.map(step => step.id),
        currentStepId: activeStepId,
      });

  const hasEnteredAnswers = Boolean(stepData && Object.keys(stepData).length > 0);

  const pickTransaction = (value: StartTransaction) => {
    setPendingTx(value);
    setWarnChange(false);
  };

  const start = () => {
    if (!selectedTx) return;
    if (!workflowId) {
      ensureResidentialWorkflow(selectedTx);
    } else if (selectedTx !== storedTx) {
      if (hasEnteredAnswers && !warnChange) {
        setWarnChange(true);
        return;
      }
      switchResidentialTransaction(selectedTx);
    }
    setShowStart(false);
    setPendingTx(null);
    setWarnChange(false);
  };

  const backToStart = () => {
    setPendingTx(null);
    setWarnChange(false);
    setShowStart(true);
  };

  const selectStep = (stepId: string) => {
    ensureResidentialWorkflow();
    setWorkflowStep(stepId as any);
  };

  const goNext = () => {
    ensureResidentialWorkflow();
    goWorkflowNext();
  };

  if (onStartScreen) {
    return (
      <WizardShell
        steps={[]}
        currentIndex={-1}
        onSelectStep={() => undefined}
        progress={progress}
        save={save}
        onRetrySave={onRetrySave}
        onSaveAndExit={onExit}
        publisherName={publisherName}
        changePublisherHref={changePublisherHref}
        draftsHref={draftsHref}
        draftsLabel={draftsLabel}
        previewModel={previewModel}
        heading="Start a new development"
        hideBack
        canGoBack={false}
        onBack={() => undefined}
      >
        <StartScreen
          transaction={selectedTx}
          onTransaction={pickTransaction}
          onStart={start}
          startLabel={warnChange ? 'Change anyway' : workflowId ? 'Continue' : 'Start'}
          warning={
            warnChange
              ? 'Some of the answers you have already entered may not apply to this kind of listing. They are kept, but please review each step.'
              : null
          }
        />
      </WizardShell>
    );
  }

  if (!currentStep) return <div>Loading step...</div>;

  const StepComponent = STEP_COMPONENTS[currentStep.componentKey];

  // Validation Display
  const currentErrors = activeStepId ? stepErrors[activeStepId] : [];

  const notice =
    currentErrors && currentErrors.length > 0 ? (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 animate-in fade-in slide-in-from-top-2">
        <h4 className="mb-2 flex items-center gap-2 font-semibold text-red-800">
          Please check the following:
        </h4>
        <ul className="ml-1 list-inside list-disc space-y-1 text-sm text-red-700">
          {currentErrors.map((err: any, idx: number) => (
            <li key={idx}>{typeof err === 'string' ? err : err.message}</li>
          ))}
        </ul>
      </div>
    ) : null;

  const isLastStep = currentStepIndex >= visibleSteps.length - 1;

  return (
    <>
      <WizardShell
        steps={shellSteps}
        currentIndex={currentStepIndex}
        onSelectStep={selectStep}
        progress={progress}
        save={save}
        onRetrySave={onRetrySave}
        onSaveAndExit={onExit}
        publisherName={publisherName}
        changePublisherHref={changePublisherHref}
        draftsHref={draftsHref}
        draftsLabel={draftsLabel}
        previewModel={previewModel}
        description={currentStep.description}
        canGoBack
        // Back from step 1 returns to the start screen.
        onBack={currentStepIndex === 0 ? backToStart : goWorkflowBack}
        onNext={isLastStep ? undefined : goNext}
        notice={notice}
      >
        {StepComponent ? (
          <StepComponent onSaveDraft={onSaveDraft} isSavingDraft={isSavingDraft} />
        ) : (
          <div className="rounded-lg border border-dashed bg-slate-50 p-12 text-center">
            Component {currentStep.componentKey} not found
          </div>
        )}
      </WizardShell>

      {/* Dev Debug Info (Hidden in Prod) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-2 right-2 z-50 rounded bg-slate-900/80 p-2 font-mono text-[10px] text-white opacity-50 hover:opacity-100">
          <p>Workflow: {workflowId}</p>
          <p>Step: {currentStepId}</p>
        </div>
      )}
    </>
  );
}
