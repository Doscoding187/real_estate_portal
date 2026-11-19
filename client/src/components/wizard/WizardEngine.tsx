import React, { useEffect, useState } from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { DevelopmentTypePhase } from '../development-wizard/phases/DevelopmentTypePhase';
import { ResidentialConfigPhase } from '../development-wizard/phases/ResidentialConfigPhase';
import { IdentityPhase } from '../development-wizard/phases/IdentityPhase';
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

const STEP_COMPONENTS: Record<string, React.ComponentType<any>> = {
  ConfigurationStep: ResidentialConfigPhase,
  IdentityMarketStep: IdentityPhase,
  LocationStep: LocationPhase,
  GovernanceStep: EstateProfilePhase,
  AmenitiesStep: AmenitiesPhase,
  MarketingStep: OverviewPhase,
  MediaStep: MediaPhase,
  UnitTypesStep: UnitTypesPhase,
  ReviewStep: FinalisationPhase,
};

export const PROJECT_SETUP_STEP_ID = 'project_setup';

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
    stepErrors,
    developmentData,
    developmentType,
    listingIdentity,
    setWorkflowStep,
    unitTypes,
    getWizardData,
  } = useDevelopmentWizard();

  // Project Setup can be revisited with Back / the step list without losing the draft.
  const [showProjectSetup, setShowProjectSetup] = useState(false);

  // Compute workflow data early (needed for useEffect)
  const workflow = workflowId ? WORKFLOWS[workflowId] : null;
  const wizardData = { ...developmentData, developmentType, listingIdentity } as WizardData;
  const visibleSteps = workflow ? getVisibleSteps(workflow, wizardData) : [];
  const currentStepIndex = visibleSteps.findIndex(s => s.id === currentStepId);

  // Auto-correct if on invalid step (MUST be before any conditional returns)
  useEffect(() => {
    if (workflow && currentStepIndex === -1 && visibleSteps.length > 0) {
      setWorkflowStep(visibleSteps[0].id);
    }
  }, [workflow, currentStepIndex, visibleSteps, setWorkflowStep]);

  const workflowReady = Boolean(workflowId && developmentType && developmentData.transactionType);
  const onProjectSetup = !workflowReady || showProjectSetup;

  // The store re-renders this component on every change, so the preview is
  // rebuilt from the live canonical wizard data each time (cheap, pure).
  const previewModel = buildPreviewModel(getWizardData?.() ?? developmentData, unitTypes);

  const currentStep = visibleSteps[currentStepIndex];

  const maxVisitedIndex = Math.max(
    currentStepIndex,
    ...visibleSteps.map((step, index) => (completedSteps?.includes(step.id) ? index : -1)),
  );
  const shellSteps: WizardShellStep[] = [
    { id: PROJECT_SETUP_STEP_ID, title: 'Project Setup', done: workflowReady, visited: true },
    ...visibleSteps.map((step, index) => ({
      id: step.id,
      title: step.title,
      done: Boolean(completedSteps?.includes(step.id)),
      visited: workflowReady && index <= maxVisitedIndex,
    })),
  ];
  const currentIndex = onProjectSetup ? 0 : currentStepIndex + 1;

  const progress = computeWizardProgress({
    visibleStepIds: visibleSteps.map(step => step.id),
    currentStepId,
    onProjectSetup,
  });

  const selectStep = (stepId: string) => {
    if (stepId === PROJECT_SETUP_STEP_ID) {
      setShowProjectSetup(true);
      return;
    }
    setShowProjectSetup(false);
    setWorkflowStep(stepId as any);
  };

  const shellCommon = {
    steps: shellSteps,
    onSelectStep: selectStep,
    progress,
    save,
    onRetrySave,
    onSaveAndExit: onExit,
    publisherName,
    changePublisherHref,
    draftsHref,
    draftsLabel,
    previewModel,
  };

  // Project Setup: first visit, or revisited from Back / the step list.
  if (onProjectSetup) {
    return (
      <WizardShell
        {...shellCommon}
        currentIndex={0}
        description="Define the core structure of your development. These choices determine the workflow."
        canGoBack={false}
        onBack={() => undefined}
      >
        <DevelopmentTypePhase onResume={workflowReady ? () => setShowProjectSetup(false) : undefined} />
      </WizardShell>
    );
  }

  if (!workflow) return <div>Invalid Workflow</div>;
  if (!currentStep) return <div>Loading step...</div>;

  const StepComponent = STEP_COMPONENTS[currentStep.componentKey];

  // Validation Display
  const currentErrors = currentStepId ? stepErrors[currentStepId] : [];

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
        {...shellCommon}
        currentIndex={currentIndex}
        description={currentStep.description}
        canGoBack
        // First workflow step goes back to Project Setup instead of being stuck.
        onBack={currentStepIndex === 0 ? () => setShowProjectSetup(true) : goWorkflowBack}
        onNext={isLastStep ? undefined : goWorkflowNext}
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
