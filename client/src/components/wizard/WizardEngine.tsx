import React, { useEffect } from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Gavel,
  Home,
  Image as ImageIcon,
  KeyRound,
  ListChecks,
  Save,
  Tag,
} from 'lucide-react';
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
type WizardRemediationIntent = 'pricing' | null;
type PublicPreviewSignalState = 'complete' | 'attention';

type PublicPreviewSignal = {
  detail: string;
  label: string;
  state: PublicPreviewSignalState;
};

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

const asTrimmedString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const asPositiveNumber = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(value);

const getMediaUrl = (value: unknown) => {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object' && 'url' in value) {
    return asTrimmedString((value as { url?: unknown }).url);
  }
  return '';
};

export function getWizardPublicPreviewFeedback(data: Partial<WizardData>): PublicPreviewSignal[] {
  const name = asTrimmedString(data.name);
  const status = asTrimmedString((data as any).status);
  const highlights = Array.isArray((data as any).highlights)
    ? ((data as any).highlights as unknown[]).filter(item => asTrimmedString(item).length > 0)
    : [];
  const media = ((data as any).media ?? {}) as Record<string, any>;
  const heroUrl = getMediaUrl((data as any).heroImage) || getMediaUrl(media.heroImage);
  const photos = Array.isArray(media.photos) ? media.photos : [];
  const usablePhotoCount = photos.filter(photo => getMediaUrl(photo).length > 0).length;
  const hasHero = heroUrl.length > 0 || usablePhotoCount > 0;

  return [
    {
      label: 'Identity',
      state: name && status ? 'complete' : 'attention',
      detail:
        name && status
          ? `${name} is ready to anchor the public preview.`
          : 'Add the development name and market status for public page and card previews.',
    },
    {
      label: 'Highlights',
      state: highlights.length >= 3 ? 'complete' : 'attention',
      detail:
        highlights.length >= 3
          ? `${highlights.length} highlights ready for buyer-facing chips.`
          : `Add ${Math.max(3 - highlights.length, 0)} more highlight${3 - highlights.length === 1 ? '' : 's'} for buyer-facing chips.`,
    },
    {
      label: 'Media',
      state: hasHero ? 'complete' : 'attention',
      detail: hasHero
        ? `Hero media ready with ${usablePhotoCount} gallery photo${usablePhotoCount === 1 ? '' : 's'}.`
        : 'Add hero media so the public page and search cards do not launch visually empty.',
    },
  ];
}

export function getWizardRentalPackagingFeedback(data: Partial<WizardData>): PublicPreviewSignal[] {
  const units = Array.isArray((data as any).unitTypes) ? ((data as any).unitTypes as any[]) : [];
  const rentValues = units
    .map(unit => asPositiveNumber(unit?.monthlyRentFrom ?? unit?.monthlyRent))
    .filter(Boolean);
  const depositValues = units.map(unit => asPositiveNumber(unit?.depositRequired)).filter(Boolean);
  const leaseTerms = units
    .map(unit => asTrimmedString(unit?.leaseTerm))
    .filter(term => term.length > 0);
  const furnishedStates = units.filter(unit => typeof unit?.isFurnished === 'boolean');
  const availableUnits = units.reduce(
    (sum, unit) => sum + asPositiveNumber(unit?.availableUnits),
    0,
  );
  const hasRent = rentValues.length > 0;
  const hasDeposit = depositValues.length > 0;
  const hasLeaseTerm = leaseTerms.length > 0;
  const hasFurnishedState = furnishedStates.length > 0;
  const hasAvailability = availableUnits > 0;

  return [
    {
      label: 'Rent range',
      state: hasRent ? 'complete' : 'attention',
      detail: hasRent
        ? `Rent from ${formatCurrency(Math.min(...rentValues))} / month.`
        : 'Add monthly rent so renters understand the lease offer.',
    },
    {
      label: 'Deposit',
      state: hasDeposit ? 'complete' : 'attention',
      detail: hasDeposit
        ? `Deposit from ${formatCurrency(Math.min(...depositValues))}.`
        : 'Add deposit expectations for renter qualification.',
    },
    {
      label: 'Lease term',
      state: hasLeaseTerm ? 'complete' : 'attention',
      detail: hasLeaseTerm
        ? `${leaseTerms[0]} lease term ready.`
        : 'Add the lease term renters should expect.',
    },
    {
      label: 'Furnished state',
      state: hasFurnishedState ? 'complete' : 'attention',
      detail: hasFurnishedState
        ? furnishedStates.some(unit => unit?.isFurnished)
          ? 'Furnished option visible.'
          : 'Unfurnished status visible.'
        : 'Confirm whether units are furnished or unfurnished.',
    },
    {
      label: 'Availability',
      state: hasAvailability ? 'complete' : 'attention',
      detail: hasAvailability
        ? `${availableUnits} rental units available.`
        : 'Add available units so renters see live leasing inventory.',
    },
    {
      label: 'Renter qualification',
      state: hasRent && hasDeposit && hasLeaseTerm ? 'complete' : 'attention',
      detail:
        hasRent && hasDeposit && hasLeaseTerm
          ? 'Lead context can carry rent, deposit, and lease expectations.'
          : 'Complete rent, deposit, and lease term before qualification feels clear.',
    },
  ];
}

export function getWizardAuctionPackagingFeedback(data: Partial<WizardData>): PublicPreviewSignal[] {
  const units = Array.isArray((data as any).unitTypes) ? ((data as any).unitTypes as any[]) : [];
  const bidValues = units.map(unit => asPositiveNumber(unit?.startingBid)).filter(Boolean);
  const reserveValues = units.map(unit => asPositiveNumber(unit?.reservePrice)).filter(Boolean);
  const hasAuctionWindow = units.some(
    unit => asTrimmedString(unit?.auctionStartDate) && asTrimmedString(unit?.auctionEndDate),
  );
  const lifecycleValues = units
    .map(unit => asTrimmedString(unit?.auctionStatus))
    .filter(status => status.length > 0);
  const availableLots = units.reduce((sum, unit) => sum + asPositiveNumber(unit?.availableUnits), 0);
  const media = ((data as any).media ?? {}) as Record<string, any>;
  const documents = [
    ...(Array.isArray(media.documents) ? media.documents : []),
    ...(Array.isArray(media.brochures) ? media.brochures : []),
  ].filter(document => getMediaUrl(document).length > 0);
  const hasStartingBid = bidValues.length > 0;
  const hasReserve = reserveValues.length > 0;
  const hasLifecycle = lifecycleValues.length > 0;
  const hasLegalPack = documents.length > 0;
  const hasUrgency = hasAuctionWindow && availableLots > 0;

  return [
    {
      label: 'Starting bid',
      state: hasStartingBid ? 'complete' : 'attention',
      detail: hasStartingBid
        ? `Bid from ${formatCurrency(Math.min(...bidValues))}.`
        : 'Add the opening bid before sending bidders to this lot.',
    },
    {
      label: 'Auction window',
      state: hasAuctionWindow ? 'complete' : 'attention',
      detail: hasAuctionWindow
        ? 'Auction window scheduled.'
        : 'Set when bidding opens and closes.',
    },
    {
      label: 'Reserve strategy',
      state: hasReserve ? 'complete' : 'attention',
      detail: hasReserve
        ? 'Reserve tracked internally.'
        : 'Confirm the reserve before registration opens.',
    },
    {
      label: 'Bidder registration',
      state: hasLifecycle ? 'complete' : 'attention',
      detail: hasLifecycle
        ? `${lifecycleValues[0].replace(/-/g, ' ').replace(/_/g, ' ')} lifecycle ready.`
        : 'Set the auction lifecycle before bidder routing starts.',
    },
    {
      label: 'Legal pack',
      state: hasLegalPack ? 'complete' : 'attention',
      detail: hasLegalPack
        ? `${documents.length} bidder document${documents.length === 1 ? '' : 's'} attached.`
        : 'Attach bidder documents, auction terms, or legal-pack material.',
    },
    {
      label: 'Auction urgency',
      state: hasUrgency ? 'complete' : 'attention',
      detail: hasUrgency
        ? `${availableLots} lots open inside a scheduled auction window.`
        : 'Pair an auction window with open lots so urgency feels real.',
    },
  ];
}

function TransactionEngineGuidance({
  currentStepId,
  remediationIntent,
  transactionType,
}: {
  currentStepId: string | null;
  remediationIntent?: WizardRemediationIntent;
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

      {remediationIntent === 'pricing' && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-950">Pricing health review</p>
          <p className="mt-1 text-sm text-amber-900">
            You opened this package from dashboard pricing health. Align the public pricing mirror
            with the live unit inventory before promotion, follow-up, or distribution.
          </p>
        </div>
      )}
    </section>
  );
}

function PublicPreviewFeedback({ wizardData }: { wizardData: WizardData }) {
  const signals = getWizardPublicPreviewFeedback(wizardData);
  const readyCount = signals.filter(signal => signal.state === 'complete').length;

  return (
    <section
      aria-label="Public preview feedback"
      className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Public preview feedback
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            Buyer-facing basics before publish
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            See how identity, highlights, and media will support the public page, search cards, and
            unit enquiries.
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
          {readyCount} of {signals.length} ready
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {signals.map(signal => {
          const isComplete = signal.state === 'complete';
          const Icon = signal.label === 'Media' ? ImageIcon : signal.label === 'Highlights' ? ListChecks : Tag;

          return (
            <div
              key={signal.label}
              className={`rounded-lg border p-3 ${
                isComplete ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-md border ${
                    isComplete
                      ? 'border-emerald-200 bg-white text-emerald-700'
                      : 'border-amber-200 bg-white text-amber-700'
                  }`}
                >
                  {isComplete ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </span>
                <p className="text-sm font-semibold text-slate-900">{signal.label}</p>
              </div>
              <p className="mt-2 text-sm leading-5 text-slate-700">{signal.detail}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RentalPackagingFeedback({ wizardData }: { wizardData: WizardData }) {
  const signals = getWizardRentalPackagingFeedback(wizardData);
  const readyCount = signals.filter(signal => signal.state === 'complete').length;

  return (
    <section
      aria-label="Rental packaging feedback"
      className="mb-6 rounded-lg border border-sky-200 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
            Rental packaging feedback
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            Lease-ready renter journey
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Package rentals around rent, deposit, lease terms, furnishing, availability, and renter
            qualification before leads arrive.
          </p>
        </div>
        <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800">
          {readyCount} of {signals.length} ready
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {signals.map(signal => {
          const isComplete = signal.state === 'complete';
          const Icon =
            signal.label === 'Availability'
              ? Home
              : signal.label === 'Renter qualification'
                ? ListChecks
                : KeyRound;

          return (
            <div
              key={signal.label}
              className={`rounded-lg border p-3 ${
                isComplete ? 'border-emerald-200 bg-emerald-50' : 'border-sky-200 bg-sky-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-md border ${
                    isComplete
                      ? 'border-emerald-200 bg-white text-emerald-700'
                      : 'border-sky-200 bg-white text-sky-700'
                  }`}
                >
                  {isComplete ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </span>
                <p className="text-sm font-semibold text-slate-900">{signal.label}</p>
              </div>
              <p className="mt-2 text-sm leading-5 text-slate-700">{signal.detail}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AuctionPackagingFeedback({ wizardData }: { wizardData: WizardData }) {
  const signals = getWizardAuctionPackagingFeedback(wizardData);
  const readyCount = signals.filter(signal => signal.state === 'complete').length;

  return (
    <section
      aria-label="Auction packaging feedback"
      className="mb-6 rounded-lg border border-amber-200 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Auction packaging feedback
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            Bid-ready auction journey
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Package auctions around opening bid, auction window, reserve posture, bidder
            registration, legal-pack readiness, and urgency before traffic starts.
          </p>
        </div>
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
          {readyCount} of {signals.length} ready
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {signals.map(signal => {
          const isComplete = signal.state === 'complete';
          const Icon =
            signal.label === 'Auction window'
              ? Clock
              : signal.label === 'Legal pack'
                ? FileText
                : signal.label === 'Bidder registration'
                  ? ListChecks
                  : Gavel;

          return (
            <div
              key={signal.label}
              className={`rounded-lg border p-3 ${
                isComplete ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-md border ${
                    isComplete
                      ? 'border-emerald-200 bg-white text-emerald-700'
                      : 'border-amber-200 bg-white text-amber-700'
                  }`}
                >
                  {isComplete ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </span>
                <p className="text-sm font-semibold text-slate-900">{signal.label}</p>
              </div>
              <p className="mt-2 text-sm leading-5 text-slate-700">{signal.detail}</p>
            </div>
          );
        })}
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
  remediationIntent?: WizardRemediationIntent;
}

export function WizardEngine({
  onExit,
  saveStatus,
  lastSavedAt,
  onManualSaveDraft,
  isManualSaveDraftPending,
  onSaveProgress,
  isSaveProgressPending,
  remediationIntent,
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
    getWizardData,
  } = useDevelopmentWizard();

  // Compute workflow data early (needed for useEffect)
  const workflow = workflowId ? WORKFLOWS[workflowId] : null;
  const wizardData = getWizardData
    ? getWizardData()
    : ({ ...developmentData, developmentType, listingIdentity } as WizardData);
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
  const activeTransactionType = wizardData.transactionType ?? developmentData.transactionType ?? transactionType;
  const activeTransactionEngine = normalizeWizardTransactionEngine(activeTransactionType);

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
            remediationIntent={remediationIntent}
            transactionType={activeTransactionType}
          />
          <PublicPreviewFeedback wizardData={wizardData} />
          {activeTransactionEngine === 'rental' && <RentalPackagingFeedback wizardData={wizardData} />}
          {activeTransactionEngine === 'auction' && <AuctionPackagingFeedback wizardData={wizardData} />}

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
