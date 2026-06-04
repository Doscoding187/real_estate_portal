import React, { useEffect } from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Gavel, KeyRound, Save, Tag } from 'lucide-react';
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

type WizardTransactionEngine = 'sale' | 'rental' | 'auction';

const TRANSACTION_ENGINE_COPY: Record<
  WizardTransactionEngine,
  {
    accentClass: string;
    icon: typeof Tag;
    label: string;
    outcome: string;
    signals: string[];
    summary: string;
    title: string;
  }
> = {
  sale: {
    accentClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: Tag,
    label: 'Sale Engine',
    title: 'Buyer-ready development package',
    summary: 'Shape sale inventory around price bands, ownership confidence, and purchase enquiry context.',
    signals: ['Sale price bands', 'Buyer costs', 'Available and reserved stock'],
    outcome: 'Public output: price ranges, unit cards, buyer CTAs, and purchase lead context.',
  },
  rental: {
    accentClass: 'border-sky-200 bg-sky-50 text-sky-700',
    icon: KeyRound,
    label: 'Rental Engine',
    title: 'Renter-ready development package',
    summary: 'Shape leasing inventory around monthly rent, tenant fit, availability, and move-in terms.',
    signals: ['Monthly rent ranges', 'Deposit and lease terms', 'Rental availability'],
    outcome: 'Public output: rent language, unit fit, rental CTAs, and lease lead context.',
  },
  auction: {
    accentClass: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: Gavel,
    label: 'Auction Engine',
    title: 'Bid-ready development package',
    summary: 'Shape auction inventory around opening bid, timing, eligibility, and bidder urgency.',
    signals: ['Starting bid', 'Auction window', 'Bidder readiness'],
    outcome: 'Public output: bid language, auction timing, registration CTAs, and auction lead context.',
  },
};

const STEP_FOCUS: Record<string, string> = {
  configuration: 'commercial branch and inventory shape',
  identity_market: 'market identity, launch posture, and developer promise',
  location: 'location story and buyer/renter confidence',
  governance_finances: 'legal, ownership, costs, and rules',
  amenities_features: 'amenity value and lifestyle proof',
  marketing_summary: 'highlights and buyer-facing positioning',
  development_media: 'media hierarchy, brochures, and visual trust',
  unit_types: 'commercial unit inventory and transaction pricing',
  review_publish: 'readiness, publish safety, and public conversion',
};

export function normalizeWizardTransactionEngine(value: unknown): WizardTransactionEngine {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-');

  if (['for-rent', 'rent', 'rental', 'to-rent', 'lease'].includes(normalized)) return 'rental';
  if (['auction', 'on-auction'].includes(normalized)) return 'auction';
  return 'sale';
}

export function getWizardTransactionEngineCopy(value: unknown) {
  return TRANSACTION_ENGINE_COPY[normalizeWizardTransactionEngine(value)];
}

function TransactionEngineGuidance({
  currentStepId,
  transactionType,
}: {
  currentStepId: string | null;
  transactionType: unknown;
}) {
  const copy = getWizardTransactionEngineCopy(transactionType);
  const Icon = copy.icon;
  const focus = currentStepId ? STEP_FOCUS[currentStepId] : null;

  return (
    <section
      aria-label={`${copy.label} packaging context`}
      className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="grid gap-4 md:grid-cols-[1.1fr_1fr] md:items-center">
        <div className="flex gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${copy.accentClass}`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {copy.label}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">{copy.title}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{copy.summary}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {copy.signals.map(signal => (
              <span
                key={signal}
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
              >
                {signal}
              </span>
            ))}
          </div>
          <p className="text-sm text-slate-600">{copy.outcome}</p>
          {focus && (
            <p className="text-xs font-medium text-slate-500">
              Current packaging focus: <span className="text-slate-700">{focus}</span>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

interface WizardEngineProps {
  onExit?: () => void;
  saveStatus?: 'saved' | 'saving' | 'error' | 'unsaved';
  lastSavedAt?: Date;
  onManualSaveDraft?: () => void | Promise<unknown>;
  isManualSaveDraftPending?: boolean;
  onSaveProgress?: () => void | Promise<unknown>;
  isSaveProgressPending?: boolean;
}

export function WizardEngine({
  onExit,
  saveStatus,
  lastSavedAt,
  onManualSaveDraft,
  isManualSaveDraftPending,
  onSaveProgress,
  isSaveProgressPending,
}: WizardEngineProps) {
  const {
    workflowId,
    currentStepId,
    goWorkflowNext,
    goWorkflowBack,
    stepErrors,
    developmentData,
    developmentType,
    transactionType,
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
  const activeTransactionType = developmentData.transactionType ?? transactionType;

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
          <TransactionEngineGuidance
            currentStepId={currentStepId}
            transactionType={activeTransactionType}
          />

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
              <StepComponent
                onManualSaveDraft={onManualSaveDraft}
                isManualSaveDraftPending={isManualSaveDraftPending}
              />
            ) : (
              <div className="text-center p-12 bg-slate-50 border border-dashed rounded-lg">
                Component {currentStep.componentKey} not found
              </div>
            )}
          </div>

          {/* Navigation Footer */}
          <div className="flex items-center justify-between gap-3 pt-6 border-t border-slate-200 mt-8">
            <Button
              variant="outline"
              onClick={goWorkflowBack}
              disabled={currentStepIndex === 0}
              className="px-6 h-12 text-slate-600"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <div className="flex items-center gap-3">
              {onManualSaveDraft &&
                !onSaveProgress &&
                currentStep.componentKey !== 'ReviewStep' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onManualSaveDraft}
                    disabled={isManualSaveDraftPending}
                    className="h-12 px-5"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isManualSaveDraftPending ? 'Saving...' : 'Save Draft'}
                  </Button>
                )}

              {onSaveProgress && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onSaveProgress}
                  disabled={isSaveProgressPending}
                  className="h-12 px-5"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaveProgressPending ? 'Saving...' : 'Save Progress'}
                </Button>
              )}

              {currentStepIndex < visibleSteps.length - 1 && (
                <Button
                  onClick={goWorkflowNext}
                  size="lg"
                  className="px-8 h-12 bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
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
