import React, { useEffect } from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
import { WizardHeader } from './WizardHeader';

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

interface WizardEngineProps {
  onExit?: () => void;
  saveStatus?: 'saved' | 'saving' | 'error';
  lastSavedAt?: Date;
}

export function WizardEngine({ onExit, saveStatus, lastSavedAt }: WizardEngineProps) {
  const {
    workflowId,
    currentStepId,
    goWorkflowNext,
    goWorkflowBack,
    stepErrors,
    developmentData,
    developmentType,
    listingIdentity,
    setWorkflowStep,
  } = useDevelopmentWizard();

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

  // Handle Initial State (No Workflow or Missing Config)
  // We strictly require workflowId + developmentType + transactionType to render the engine
  if (!workflowId || !developmentType || !developmentData.transactionType) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50/50">
        <WizardHeader
          title="Project Setup"
          description="Define the core structure of your development. These choices determine the workflow."
          progressPercent={0}
          onExit={onExit}
          showExit={!!onExit}
          saveStatus={saveStatus}
          lastSavedAt={lastSavedAt}
        />
        <main className="flex-1 py-8 px-4">
          <div className="max-w-5xl mx-auto">
            <DevelopmentTypePhase />
          </div>
        </main>
      </div>
    );
  }

  if (!workflow) return <div>Invalid Workflow</div>;

  const currentStep = visibleSteps[currentStepIndex];
  if (!currentStep) return <div>Loading step...</div>;

  const StepComponent = STEP_COMPONENTS[currentStep.componentKey];
  const progress = ((currentStepIndex + 1) / visibleSteps.length) * 100;

  // Validation Display
  const currentErrors = currentStepId ? stepErrors[currentStepId] : [];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50">
      <WizardHeader
        title={currentStep.title}
        description={currentStep.description}
        progressPercent={progress}
        onExit={onExit}
        showExit={!!onExit}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
      />

      <main className="flex-1 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Validation Errors for Current Step */}
          {currentErrors && currentErrors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg animate-in fade-in slide-in-from-top-2">
              <h4 className="text-red-800 font-semibold mb-2 flex items-center gap-2">
                Please check the following:
              </h4>
              <ul className="list-disc list-inside text-red-700 text-sm space-y-1 ml-1">
                {currentErrors.map((err: any, idx: number) => (
                  <li key={idx}>{typeof err === 'string' ? err : err.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Step Content */}
          <div className="mb-20">
            {' '}
            {/* Add bottom margin for fixed footer if we had one, or just spacing */}
            {StepComponent ? (
              <StepComponent />
            ) : (
              <div className="text-center p-12 bg-slate-50 border border-dashed rounded-lg">
                Component {currentStep.componentKey} not found
              </div>
            )}
          </div>

          {/* Navigation Footer */}
          <div className="flex justify-between pt-6 border-t border-slate-200 mt-8">
            <Button
              variant="outline"
              onClick={goWorkflowBack}
              disabled={currentStepIndex === 0}
              className="px-6 h-12 text-slate-600"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <Button
              onClick={goWorkflowNext}
              size="lg"
              className="px-8 h-12 bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
            >
              {currentStepIndex === visibleSteps.length - 1 ? 'Review & Publish' : 'Next'}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </main>

      {/* Dev Debug Info (Hidden in Prod) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-2 right-2 p-2 bg-slate-900/80 text-white rounded text-[10px] font-mono opacity-50 hover:opacity-100 z-50">
          <p>Workflow: {workflowId}</p>
          <p>Step: {currentStepId}</p>
        </div>
      )}
    </div>
  );
}
