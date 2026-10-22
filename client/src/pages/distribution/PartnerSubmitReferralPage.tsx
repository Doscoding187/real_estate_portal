import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';
import { ReferralIntakePausedCard } from '@/components/distribution/partner/ReferralIntakePausedCard';
import { DevelopmentBrochureDialog } from '@/components/distribution/partner/DevelopmentBrochureDialog';
import DevelopmentOpportunityCard from '@/components/distribution/partner/DevelopmentOpportunityCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Download,
  FileCheck2,
  FileText,
  Info,
  Loader2,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { DISTRIBUTION_PRICE_BANDS } from '@shared/distributionOpportunityMatching';

type MarketMode = 'sale' | 'rent';
type IntakeEvidenceType =
  | 'sharing_permission'
  | 'privacy_notice'
  | 'identity_document'
  | 'credit_authorization';

type PackDownload = {
  key: string;
  label: string;
  url: string;
  instructions: string | null;
  category: 'consent' | 'privacy_notice' | 'information_sheet' | 'other';
  developmentId: number;
};

const REQUIRED_EVIDENCE: Array<{ type: IntakeEvidenceType; title: string; instructions: string }> =
  [
    {
      type: 'sharing_permission',
      title: 'Permission to share their details',
      instructions: 'Ask the person to read and sign the permission form.',
    },
    {
      type: 'privacy_notice',
      title: 'Privacy notice acknowledgement',
      instructions: 'Share the privacy notice and upload the signed acknowledgement.',
    },
    {
      type: 'identity_document',
      title: 'Identity document',
      instructions: 'Upload their ID or another document accepted for this opportunity.',
    },
  ];

const WIZARD_STEPS = [
  {
    title: 'Choose developments',
    description: 'Select the developments you want to share with your prospect.',
  },
  {
    title: 'Prepare documents',
    description: 'Download and complete the required documents.',
  },
  {
    title: 'Submit introduction',
    description: 'Send the completed referral with your prospect’s details.',
  },
  {
    title: 'Manager-led progress',
    description: 'Our team will follow up and keep you updated.',
  },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      if (comma < 0) reject(new Error('Could not read the selected file.'));
      else resolve(result.slice(comma + 1));
    };
    reader.readAsDataURL(file);
  });
}

function formatPrice(mode: any, marketMode: MarketMode) {
  if (!mode || mode.availableCount <= 0 || mode.priceFrom <= 0 || mode.priceTo < mode.priceFrom) {
    return 'Unavailable';
  }
  const from = `R${Math.round(mode.priceFrom).toLocaleString('en-ZA')}`;
  const to =
    mode.priceTo === mode.priceFrom ? null : `R${Math.round(mode.priceTo).toLocaleString('en-ZA')}`;
  const range = to ? `${from} – ${to}` : from;
  return marketMode === 'rent' ? `${range} / month` : range;
}

function StepHeading({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e7f0fd] text-[13px] font-semibold text-[#1d6fe3]">
        {step}
      </span>
      <div>
        <h2 className="text-[16px] font-semibold text-[#0b1c3f]">{title}</h2>
        <p className="mt-0.5 text-[12.5px] leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function WizardStepper({ currentStep }: { currentStep: number }) {
  return (
    <ol
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0"
      aria-label="Referral progress"
    >
      {WIZARD_STEPS.map((step, index) => {
        const stepNumber = index + 1;
        const active = stepNumber === currentStep;
        const done = stepNumber < currentStep;
        const state = done ? 'complete' : active ? 'active' : 'upcoming';
        return (
          <li
            key={step.title}
            data-state={state}
            className="relative flex items-start gap-3 lg:pr-5"
            aria-current={active ? 'step' : undefined}
          >
            {index < WIZARD_STEPS.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute left-8 right-4 top-3.5 hidden h-px lg:block',
                  done ? 'bg-[#9cc0ee]' : 'bg-border',
                )}
              />
            ) : null}
            <span
              className={cn(
                'relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold',
                active || done
                  ? 'bg-[#1d6fe3] text-white'
                  : 'border border-border bg-white text-muted-foreground',
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : stepNumber}
            </span>
            <div className="min-w-0">
              <p
                className={cn(
                  'text-[13.5px] font-semibold',
                  active || done ? 'text-[#0b1c3f]' : 'text-muted-foreground',
                )}
              >
                {step.title}
              </p>
              <p className="mt-0.5 text-[12px] leading-5 text-muted-foreground">
                {step.description}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function DocumentRow({
  icon,
  iconClassName,
  title,
  description,
  status,
  complete,
  actions,
}: {
  icon: ReactNode;
  iconClassName: string;
  title: string;
  description: string;
  status: string;
  complete: boolean;
  actions: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border p-4 last:border-b-0 sm:flex-row sm:items-center">
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          iconClassName,
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[#0b1c3f]">{title}</p>
        <p className="mt-0.5 text-[11.5px] leading-5 text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:ml-auto sm:justify-end">
        <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#1d6fe3]">
          {status}
          {complete ? <CheckCircle2 className="h-4 w-4 text-[#2f8f4e]" /> : null}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-[#9cc0ee]" /> Required
        </span>
        <div className="flex flex-wrap items-center gap-1.5">{actions}</div>
      </div>
    </div>
  );
}

export default function PartnerSubmitReferralPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [developmentId, setDevelopmentId] = useState<number | null>(null);
  const [marketMode, setMarketMode] = useState<MarketMode>('sale');
  const [checkFitId, setCheckFitId] = useState<string | null>(null);
  const [sessionUuid, setSessionUuid] = useState<string | null>(null);
  const [confirmedPermission, setConfirmedPermission] = useState(false);
  const [confirmedPrivacyNotice, setConfirmedPrivacyNotice] = useState(false);
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerNotes, setBuyerNotes] = useState('');
  const [clientReference, setClientReference] = useState('');
  const [eligibilityError, setEligibilityError] = useState('');
  const [sharedDevelopmentIds, setSharedDevelopmentIds] = useState<number[]>([]);
  const [downloadedBrochureIds, setDownloadedBrochureIds] = useState<number[]>([]);
  const [downloadedDocumentKeys, setDownloadedDocumentKeys] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState<string>('any');
  const [brochureItem, setBrochureItem] = useState<any>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) setLocation('/login');
  }, [isAuthenticated, loading, setLocation]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedDevelopmentId = Number(params.get('developmentId') || 0);
    const requestedMode = params.get('marketMode');
    const requestedCheckFitId = params.get('checkFitId');
    if (requestedDevelopmentId > 0) {
      setDevelopmentId(requestedDevelopmentId);
      setSharedDevelopmentIds([requestedDevelopmentId]);
    }
    if (requestedMode === 'sale' || requestedMode === 'rent') setMarketMode(requestedMode);
    if (requestedCheckFitId) setCheckFitId(requestedCheckFitId);
  }, []);

  const programsQuery = trpc.distribution.partner.listEligibleDevelopmentsForSubmission.useQuery(
    undefined,
    { enabled: isAuthenticated, retry: false },
  );
  const developments = programsQuery.data?.items || [];
  const eligibleDevelopments = useMemo(
    () => developments.filter(item => item.campaign?.visible === true),
    [developments],
  );

  useEffect(() => {
    if (!eligibleDevelopments.length) {
      setDevelopmentId(null);
      setSessionUuid(null);
      return;
    }
    if (
      !developmentId ||
      !eligibleDevelopments.some(item => Number(item.developmentId) === developmentId)
    ) {
      setDevelopmentId(Number(eligibleDevelopments[0].developmentId));
      setSessionUuid(null);
    }
  }, [developmentId, eligibleDevelopments]);

  useEffect(() => {
    if (!sharedDevelopmentIds.length) return;
    if (!developmentId || !sharedDevelopmentIds.includes(Number(developmentId))) {
      setDevelopmentId(sharedDevelopmentIds[0]);
      setSessionUuid(null);
    }
  }, [developmentId, sharedDevelopmentIds]);

  const selectedDevelopment =
    eligibleDevelopments.find(item => Number(item.developmentId) === Number(developmentId || 0)) ||
    null;
  const selectedModeProjection = selectedDevelopment?.inventory?.modes?.[marketMode] || null;

  const locationOptions = useMemo(() => {
    const values = new Set<string>();
    for (const item of eligibleDevelopments) {
      const city = String(item.city || '').trim();
      if (city) values.add(city);
    }
    return Array.from(values).sort();
  }, [eligibleDevelopments]);

  const typeOptions = useMemo(() => {
    const values = new Set<string>();
    for (const item of eligibleDevelopments) {
      const type = String(item.campaign?.developmentType || '').trim();
      if (type) values.add(type);
    }
    return Array.from(values).sort();
  }, [eligibleDevelopments]);

  const visibleDevelopments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return eligibleDevelopments.filter(item => {
      if (term) {
        const haystack = [item.developmentName, item.city, item.province]
          .map(value => String(value || '').toLowerCase())
          .join(' ');
        if (!haystack.includes(term)) return false;
      }
      if (locationFilter !== 'all' && String(item.city || '') !== locationFilter) return false;
      if (typeFilter !== 'all' && String(item.campaign?.developmentType || '') !== typeFilter) {
        return false;
      }
      if (priceFilter !== 'any') {
        const band = (DISTRIBUTION_PRICE_BANDS[marketMode] || []).find(
          candidate => candidate.key === priceFilter,
        );
        const mode = item.inventory?.modes?.[marketMode];
        const priceFrom = Number(mode?.priceFrom || 0);
        const priceTo = Number(mode?.priceTo || 0);
        if (!band || !priceFrom) return false;
        if (band.minPrice && priceTo && priceTo < band.minPrice) return false;
        if (band.maxPrice && priceFrom > band.maxPrice) return false;
      }
      return true;
    });
  }, [eligibleDevelopments, locationFilter, marketMode, priceFilter, search, typeFilter]);

  const sharedDevelopments = useMemo(
    () =>
      eligibleDevelopments.filter(item =>
        sharedDevelopmentIds.includes(Number(item.developmentId)),
      ),
    [eligibleDevelopments, sharedDevelopmentIds],
  );

  const requirementsQuery = trpc.distribution.partner.getReferralIntakeRequirements.useQuery(
    { developmentId: Number(developmentId || 0) },
    {
      enabled:
        isAuthenticated &&
        Boolean(developmentId) &&
        selectedDevelopment?.opportunity?.openForReferral === true,
      retry: false,
    },
  );
  const sessionQuery = trpc.distribution.partner.getReferralIntakeSession.useQuery(
    { sessionUuid: sessionUuid || '00000000-0000-0000-0000-000000000000' },
    { enabled: isAuthenticated && Boolean(sessionUuid), retry: false, refetchOnWindowFocus: false },
  );
  const utils = trpc.useUtils();

  const documentPackQuery = trpc.distribution.partner.getProspectDocumentPacks.useQuery(
    { developmentIds: sharedDevelopmentIds },
    { enabled: isAuthenticated && sharedDevelopmentIds.length > 0, retry: false },
  );
  const documentDownloads = ((documentPackQuery.data || []) as any[]).flatMap(
    pack => (pack.downloads || []) as PackDownload[],
  );
  const informationSheetDownloads = documentDownloads.filter(
    download => download.category === 'information_sheet',
  );
  const consentDownloads = documentDownloads.filter(download => download.category === 'consent');

  const hasSelection = sharedDevelopmentIds.length > 0;
  const brochureDownloadsComplete =
    hasSelection && sharedDevelopmentIds.every(id => downloadedBrochureIds.includes(Number(id)));
  const informationSheetDownloadsComplete = informationSheetDownloads.every(download =>
    downloadedDocumentKeys.includes(download.key),
  );
  const consentDownloadsComplete = consentDownloads.every(download =>
    downloadedDocumentKeys.includes(download.key),
  );
  const downloadsComplete =
    hasSelection &&
    documentPackQuery.isSuccess &&
    brochureDownloadsComplete &&
    informationSheetDownloadsComplete &&
    consentDownloadsComplete;
  const currentStep = !hasSelection ? 1 : !downloadsComplete ? 2 : 3;

  const startSessionMutation = trpc.distribution.partner.createReferralIntakeSession.useMutation({
    onSuccess: result => {
      setSessionUuid(result.sessionUuid);
      toast.success('Referral steps started.');
    },
    onError: error => toast.error(error.message || 'Could not start the referral steps.'),
  });

  const uploadEvidenceMutation = trpc.distribution.partner.uploadReferralIntakeEvidence.useMutation(
    {
      onSuccess: async (_result, variables) => {
        await utils.distribution.partner.getReferralIntakeSession.invalidate({
          sessionUuid: variables.sessionUuid,
        });
        toast.success('Document added.');
      },
      onError: error => toast.error(error.message || 'Could not upload this document.'),
    },
  );

  const submitReferralMutation = trpc.distribution.partner.submitReferral.useMutation({
    onSuccess: result => {
      toast.success('Introduction sent. Your team will guide the next steps.');
      setLocation(`/distribution/partner/referrals/${Number(result.dealId)}`);
    },
    onError: error => {
      setEligibilityError(error.message || 'The referral could not be submitted.');
    },
  });

  const session = sessionQuery.data;
  const uploadedTypes = new Set((session?.evidence || []).map(item => item.evidenceType));
  const intakeComplete = session?.requiredEvidenceComplete === true;

  async function uploadEvidence(evidenceType: IntakeEvidenceType, file?: File) {
    if (!sessionUuid || !file) return;
    const maxBytes = Number(requirementsQuery.data?.maxUploadBytes || 0);
    if (maxBytes > 0 && file.size > maxBytes) {
      toast.error(`Choose a file smaller than ${Math.floor(maxBytes / 1024 / 1024)} MB.`);
      return;
    }
    try {
      const base64Content = await fileToBase64(file);
      uploadEvidenceMutation.mutate({
        sessionUuid,
        evidenceType,
        mimeType: file.type as 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp',
        base64Content,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not read this file.');
    }
  }

  function toggleSharedDevelopment(item: any) {
    const id = Number(item.developmentId);
    const removing = sharedDevelopmentIds.includes(id);
    setSharedDevelopmentIds(current =>
      removing ? current.filter(value => value !== id) : [...current, id],
    );
    if (removing) {
      setDownloadedBrochureIds(current => current.filter(value => value !== id));
    }
    setSessionUuid(null);
  }

  function markBrochureDownloaded(item: any) {
    const id = Number(item?.developmentId);
    if (!Number.isSafeInteger(id) || id <= 0) return;
    setDownloadedBrochureIds(current => (current.includes(id) ? current : [...current, id]));
  }

  function downloadNextProspectDocument(downloads: PackDownload[]) {
    const next =
      downloads.find(download => !downloadedDocumentKeys.includes(download.key)) || downloads[0];
    if (!next) return;
    window.open(next.url, '_blank', 'noopener');
    setDownloadedDocumentKeys(current =>
      current.includes(next.key) ? current : [...current, next.key],
    );
  }

  function openNextSelectedBrochure() {
    const next =
      sharedDevelopments.find(
        item => !downloadedBrochureIds.includes(Number(item.developmentId)),
      ) || sharedDevelopments[0];
    if (next) setBrochureItem(next);
  }

  function continueToNextStep() {
    const targetId = downloadsComplete ? 'submit-introduction' : 'documents-to-prepare';
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (loading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading your referral…
      </div>
    );
  }

  return (
    <ReferralAppShell>
      <main className="mx-auto w-full max-w-[1180px] space-y-6 px-4 pb-10 pt-5 md:px-7">
        <section>
          <button
            type="button"
            onClick={() => setLocation('/distribution/partner/referrals')}
            className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#1d6fe3] transition hover:text-[#0b1c3f]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to referrals
          </button>
          <h1 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-[#0b1c3f]">
            Introduce a prospect to property opportunities
          </h1>
          <p className="mt-2 max-w-3xl text-[14px] leading-6 text-muted-foreground">
            Share selected developments with your prospect. You’ll provide the documents, and
            they’ll choose their preferred option. Our team will handle the rest.
          </p>
        </section>

        <WizardStepper currentStep={currentStep} />

        {programsQuery.isLoading ? (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-white p-5 text-sm text-muted-foreground shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading available opportunities…
          </div>
        ) : eligibleDevelopments.length === 0 ? (
          <ReferralIntakePausedCard />
        ) : (
          <>
            <section className="rounded-xl border border-[#cfe0f8] bg-[#eff5fe] p-4 text-[13px] leading-5 text-[#33507e]">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#1d6fe3]" />
                <p>
                  <span className="font-semibold text-[#0b1c3f]">
                    You can select multiple developments.
                  </span>{' '}
                  Your prospect will review the options and make their final choice.
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className="text-[12px] font-medium text-muted-foreground">Looking to</span>
                <div
                  className="inline-grid h-9 grid-cols-2 items-center rounded-lg border border-border bg-white p-1"
                  role="group"
                  aria-label="Buy or rent"
                >
                  {(['sale', 'rent'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={marketMode === mode}
                      onClick={() => setMarketMode(mode)}
                      className={cn(
                        'h-7 rounded-md px-4 text-[12.5px] transition',
                        marketMode === mode
                          ? 'bg-[#1d6fe3] font-semibold text-white shadow-sm'
                          : 'font-medium text-muted-foreground hover:text-[#0b1c3f]',
                      )}
                    >
                      {mode === 'sale' ? 'Buy' : 'Rent'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white shadow-sm">
                <div className="grid md:grid-cols-[minmax(0,2.1fr)_repeat(3,minmax(0,1fr))]">
                  <div className="relative flex h-[64px] items-center border-b border-border md:border-b-0 md:border-r">
                    <Search className="pointer-events-none absolute left-4 h-4 w-4 text-muted-foreground" />
                    <Input
                      aria-label="Search developments"
                      className="h-full rounded-none border-0 bg-transparent pl-10 text-[13.5px] shadow-none focus-visible:ring-0"
                      placeholder="Search developments…"
                      value={search}
                      onChange={event => setSearch(event.target.value)}
                    />
                  </div>
                  <label className="flex min-w-0 flex-col justify-center gap-0.5 border-b border-border px-4 py-2.5 md:border-b-0 md:border-r">
                    <span className="text-[11px] font-medium text-muted-foreground">Location</span>
                    <select
                      aria-label="Location"
                      className="h-6 w-full border-0 bg-transparent p-0 text-[13.5px] font-medium text-[#0b1c3f] focus:outline-none focus:ring-0"
                      value={locationFilter}
                      onChange={event => setLocationFilter(event.target.value)}
                    >
                      <option value="all">All locations</option>
                      {locationOptions.map(location => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex min-w-0 flex-col justify-center gap-0.5 border-b border-border px-4 py-2.5 md:border-b-0 md:border-r">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Property type
                    </span>
                    <select
                      aria-label="Property type"
                      className="h-6 w-full border-0 bg-transparent p-0 text-[13.5px] font-medium text-[#0b1c3f] focus:outline-none focus:ring-0"
                      value={typeFilter}
                      onChange={event => setTypeFilter(event.target.value)}
                    >
                      <option value="all">All types</option>
                      {typeOptions.map(type => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex min-w-0 flex-col justify-center gap-0.5 px-4 py-2.5">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Price range
                    </span>
                    <select
                      aria-label="Price range"
                      className="h-6 w-full border-0 bg-transparent p-0 text-[13.5px] font-medium text-[#0b1c3f] focus:outline-none focus:ring-0"
                      value={priceFilter}
                      onChange={event => setPriceFilter(event.target.value)}
                    >
                      {(DISTRIBUTION_PRICE_BANDS[marketMode] || []).map(band => (
                        <option key={band.key} value={band.key}>
                          {band.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {visibleDevelopments.length ? (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleDevelopments.map((item: any) => (
                    <DevelopmentOpportunityCard
                      key={item.developmentId}
                      item={item}
                      marketMode={marketMode}
                      variant="select"
                      selected={sharedDevelopmentIds.includes(Number(item.developmentId))}
                      onToggleSelected={toggleSharedDevelopment}
                      onDownloadBrochure={setBrochureItem}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-white p-8 text-center text-sm text-muted-foreground shadow-sm">
                  No developments match these choices.
                </div>
              )}
            </section>

            <section
              id="documents-to-prepare"
              className="scroll-mt-24 rounded-xl border border-border bg-white p-5 shadow-sm md:p-6"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e7f0fd] text-[#1d6fe3]">
                  <FileText className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-[16px] font-semibold text-[#0b1c3f]">Documents to prepare</h2>
                  <p className="mt-0.5 text-[12.5px] leading-5 text-muted-foreground">
                    Download the required documents below. Complete them with your prospect’s
                    details, before submitting the referral.
                  </p>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-border">
                <DocumentRow
                  icon={<FileText className="h-4 w-4" />}
                  iconClassName="bg-[#fdeaea] text-[#ef4444]"
                  title="Development brochures"
                  description="Showcases the development, pricing, floor plans and key features."
                  status={`${sharedDevelopmentIds.length} selected`}
                  complete={brochureDownloadsComplete}
                  actions={
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 min-w-[132px] border-[#9cc0ee] px-5 text-[12px] font-semibold text-[#1d6fe3] hover:bg-[#eff5fe]"
                      disabled={!sharedDevelopments.length}
                      onClick={openNextSelectedBrochure}
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                    </Button>
                  }
                />

                <DocumentRow
                  icon={<FileCheck2 className="h-4 w-4" />}
                  iconClassName="bg-[#e7f0fd] text-[#1d6fe3]"
                  title="Prospect information sheet"
                  description="Captures key details about your prospect and their requirements."
                  status={
                    informationSheetDownloads.length
                      ? `${informationSheetDownloads.length} file${
                          informationSheetDownloads.length === 1 ? '' : 's'
                        }`
                      : 'Not published yet'
                  }
                  complete={
                    informationSheetDownloads.length > 0 && informationSheetDownloadsComplete
                  }
                  actions={
                    informationSheetDownloads.length ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 min-w-[132px] border-[#9cc0ee] px-5 text-[12px] font-semibold text-[#1d6fe3] hover:bg-[#eff5fe]"
                        title={informationSheetDownloads[0]?.label}
                        onClick={() => downloadNextProspectDocument(informationSheetDownloads)}
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 min-w-[132px] border-[#9cc0ee] px-5 text-[12px] font-semibold text-[#1d6fe3]"
                        disabled
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                      </Button>
                    )
                  }
                />

                <DocumentRow
                  icon={<ShieldCheck className="h-4 w-4" />}
                  iconClassName="bg-[#f3e8ff] text-[#7c3aed]"
                  title="POPIA consent form"
                  description="Authorises us to share the prospect’s information with the relevant developer."
                  status={
                    consentDownloads.length
                      ? `${consentDownloads.length} file${consentDownloads.length === 1 ? '' : 's'}`
                      : 'Not published yet'
                  }
                  complete={consentDownloads.length > 0 && consentDownloadsComplete}
                  actions={
                    consentDownloads.length ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 min-w-[132px] border-[#9cc0ee] px-5 text-[12px] font-semibold text-[#1d6fe3] hover:bg-[#eff5fe]"
                        title={consentDownloads[0]?.label}
                        onClick={() => downloadNextProspectDocument(consentDownloads)}
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 min-w-[132px] border-[#9cc0ee] px-5 text-[12px] font-semibold text-[#1d6fe3]"
                        disabled
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                      </Button>
                    )
                  }
                />
              </div>

              {documentPackQuery.isError ? (
                <p className="mt-3 text-xs text-[#b07a1e]">
                  The prospect documents could not be loaded. Refresh and try again.
                </p>
              ) : null}

              <p className="mt-4 flex items-start gap-2 rounded-lg border border-[#cfe0f8] bg-[#eff5fe] p-3 text-xs leading-5 text-[#33507e]">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1d6fe3]" />
                <span>
                  Your prospect’s details are only shared after valid consent is received and all
                  required documents have been submitted.
                </span>
              </p>

              {downloadsComplete ? (
                <p className="mt-3 flex items-start gap-2 rounded-lg border border-[#cde9d2] bg-[#f5fcf6] p-3 text-xs leading-5 text-[#2f8f4e]">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    All documents are downloaded. Send the pack to your prospect, get the signed
                    forms back, then continue to upload them.
                  </span>
                </p>
              ) : null}

              <div className="mt-4 flex justify-end">
                <Button
                  variant="conversion"
                  className="h-10 px-5"
                  disabled={!hasSelection}
                  onClick={continueToNextStep}
                >
                  {downloadsComplete
                    ? 'Continue to submit introduction'
                    : 'Continue to document checklist'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </section>

            {downloadsComplete ? (
              <div id="submit-introduction" className="scroll-mt-24 space-y-4">
                {sessionUuid ? (
                  requirementsQuery.isLoading ? (
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-white p-5 text-sm text-muted-foreground shadow-sm">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading the documents for this
                      opportunity…
                    </div>
                  ) : requirementsQuery.isError || !requirementsQuery.data ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                      {requirementsQuery.error?.message ||
                        'The documents for this opportunity could not be loaded.'}
                    </div>
                  ) : (
                    <>
                      <section className="rounded-xl border border-border bg-white p-5 shadow-sm md:p-6">
                        <StepHeading
                          step={3}
                          title="Add the signed documents"
                          description="Upload the signed consent form, the completed information sheet and the prospect’s ID copy."
                        />
                        <div className="mt-4 space-y-4">
                          {REQUIRED_EVIDENCE.map(item => {
                            const uploaded = uploadedTypes.has(item.type);
                            return (
                              <div
                                key={item.type}
                                className="flex flex-col gap-3 rounded-lg border border-border p-3.5 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div>
                                  <p className="flex items-center gap-2 text-sm font-semibold text-[#0b1c3f]">
                                    {uploaded ? (
                                      <CheckCircle2 className="h-4 w-4 text-[#2f8f4e]" />
                                    ) : (
                                      <FileCheck2 className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    {item.title}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {item.instructions}
                                  </p>
                                </div>
                                <Input
                                  type="file"
                                  accept={requirementsQuery.data.identityEvidence.allowedMimeTypes.join(
                                    ',',
                                  )}
                                  disabled={uploadEvidenceMutation.isPending}
                                  onChange={event => {
                                    const file = event.currentTarget.files?.[0];
                                    void uploadEvidence(item.type, file);
                                    event.currentTarget.value = '';
                                  }}
                                  className="max-w-sm"
                                />
                              </div>
                            );
                          })}
                          {requirementsQuery.data.creditReport.enabled ? (
                            <div className="rounded-lg border border-[#f5d9a8] bg-[#fffbf2] p-3.5 text-sm">
                              <p className="font-semibold text-[#b07a1e]">
                                Credit checks need separate permission
                              </p>
                              <p className="mt-1 text-xs text-[#b07a1e]">
                                This introduction does not request a credit report. If a later step
                                needs one, the person must separately sign the authorization for{' '}
                                {requirementsQuery.data.creditReport.providerName}.
                              </p>
                              <p className="mt-2 whitespace-pre-wrap text-xs text-[#b07a1e]">
                                {requirementsQuery.data.creditReport.authorizationDocument?.content}
                              </p>
                              <label className="mt-3 block text-xs font-medium text-[#b07a1e]">
                                Add the signed authorization (optional for this introduction)
                                <Input
                                  type="file"
                                  accept={requirementsQuery.data.identityEvidence.allowedMimeTypes.join(
                                    ',',
                                  )}
                                  className="mt-2 bg-white"
                                  disabled={uploadEvidenceMutation.isPending}
                                  onChange={event => {
                                    const file = event.currentTarget.files?.[0];
                                    void uploadEvidence('credit_authorization', file);
                                    event.currentTarget.value = '';
                                  }}
                                />
                              </label>
                            </div>
                          ) : null}
                          {intakeComplete ? (
                            <p className="rounded-lg border border-[#cde9d2] bg-[#f5fcf6] p-3.5 text-sm text-[#2f8f4e]">
                              The required documents are ready. You can now add the person’s contact
                              details below.
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Add all three required documents to continue.
                            </p>
                          )}
                        </div>
                      </section>

                      {intakeComplete ? (
                        <section className="rounded-xl border border-border bg-white p-5 shadow-sm md:p-6">
                          <StepHeading
                            step={3}
                            title="Submit the introduction"
                            description="The team responsible for this opportunity will use these details to follow up. You can track recorded updates in My deals."
                          />
                          <div className="mt-4 space-y-3">
                            <div className="rounded-lg border border-border bg-surface p-3.5 text-sm">
                              <p className="font-semibold text-[#0b1c3f]">
                                {selectedDevelopment?.developmentName}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {marketMode
                                  ? `${marketMode === 'sale' ? 'Sale' : 'Rental'} · ${formatPrice(selectedModeProjection, marketMode)}`
                                  : 'Choose sale or rental above'}
                              </p>
                            </div>
                            <Input
                              placeholder="Full name"
                              autoComplete="off"
                              value={buyerName}
                              onChange={event => setBuyerName(event.target.value)}
                            />
                            <div className="grid gap-3 sm:grid-cols-2">
                              <Input
                                placeholder="Phone number"
                                autoComplete="off"
                                value={buyerPhone}
                                onChange={event => setBuyerPhone(event.target.value)}
                              />
                              <Input
                                placeholder="Email address"
                                type="email"
                                autoComplete="off"
                                value={buyerEmail}
                                onChange={event => setBuyerEmail(event.target.value)}
                              />
                            </div>
                            <Input
                              placeholder="Your reference (optional)"
                              autoComplete="off"
                              value={clientReference}
                              onChange={event => setClientReference(event.target.value)}
                            />
                            <Textarea
                              placeholder="Anything you’d like the team to know? Don’t include ID or financial account numbers."
                              rows={4}
                              value={buyerNotes}
                              onChange={event => setBuyerNotes(event.target.value)}
                            />
                            {eligibilityError ? (
                              <p
                                role="alert"
                                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                              >
                                {eligibilityError}
                              </p>
                            ) : null}
                            <Button
                              variant="conversion"
                              className="w-full"
                              disabled={
                                submitReferralMutation.isPending ||
                                !developmentId ||
                                !marketMode ||
                                !selectedModeProjection ||
                                (!buyerName.trim() && !buyerPhone.trim() && !buyerEmail.trim())
                              }
                              onClick={() => {
                                setEligibilityError('');
                                submitReferralMutation.mutate({
                                  developmentId: Number(developmentId),
                                  marketMode: marketMode!,
                                  intakeSessionUuid: sessionUuid!,
                                  buyerName: buyerName.trim() || undefined,
                                  buyerPhone: buyerPhone.trim() || undefined,
                                  buyerEmail: buyerEmail.trim() || undefined,
                                  notes: buyerNotes.trim() || undefined,
                                  clientReference: clientReference.trim() || undefined,
                                  checkFitId: checkFitId || undefined,
                                });
                              }}
                            >
                              {submitReferralMutation.isPending ? 'Sending…' : 'Send introduction'}
                            </Button>
                            <p className="text-center text-[11.5px] leading-5 text-muted-foreground">
                              After submission, our referral manager acknowledges the introduction,
                              arranges next checks and keeps you updated in My deals.
                            </p>
                          </div>
                        </section>
                      ) : null}
                    </>
                  )
                ) : requirementsQuery.isLoading ? (
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-white p-5 text-sm text-muted-foreground shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading the documents for this
                    opportunity…
                  </div>
                ) : requirementsQuery.isError || !requirementsQuery.data ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                    {requirementsQuery.error?.message ||
                      'The documents for this opportunity could not be loaded.'}
                  </div>
                ) : (
                  <section className="rounded-xl border border-border bg-white p-5 shadow-sm md:p-6">
                    <StepHeading
                      step={3}
                      title="Prepare the introduction"
                      description="Send the downloaded pack to your prospect. Once they return the signed documents, confirm the permissions below and start the upload."
                    />
                    <div className="mt-4 space-y-4">
                      {sharedDevelopmentIds.length > 1 ? (
                        <div className="rounded-lg border border-border p-3.5">
                          <p className="text-sm font-semibold text-[#0b1c3f]">
                            Which development did the prospect choose?
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            The referral is submitted for the development the prospect picked. The
                            other options stay with them.
                          </p>
                          <select
                            aria-label="Chosen development"
                            className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
                            value={String(developmentId || '')}
                            onChange={event => {
                              setDevelopmentId(Number(event.target.value));
                              setSessionUuid(null);
                            }}
                          >
                            {sharedDevelopments.map(item => (
                              <option key={item.developmentId} value={item.developmentId}>
                                {item.developmentName}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}

                      <div className="rounded-lg border border-border p-3.5 text-sm">
                        <p className="font-semibold text-[#0b1c3f]">
                          {selectedDevelopment?.developmentName || 'Choose a development above'}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {selectedDevelopment
                            ? `${marketMode === 'sale' ? 'Sale' : 'Rental'} · ${formatPrice(selectedModeProjection, marketMode)}`
                            : 'Select the development the prospect chose.'}
                        </p>
                      </div>

                      <details className="rounded-lg border border-border p-3.5">
                        <summary className="cursor-pointer text-sm font-semibold text-[#0b1c3f]">
                          Read the consent documents
                        </summary>
                        <div className="mt-3 space-y-3">
                          {[
                            requirementsQuery.data.sharingPermissionDocument,
                            requirementsQuery.data.privacyNoticeDocument,
                          ].map(document => (
                            <section
                              key={`${document.title}-${document.version}`}
                              className="rounded-lg border border-border p-3.5"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-[#0b1c3f]">
                                  {document.title} · version {document.version}
                                </p>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.print()}
                                >
                                  Print
                                </Button>
                              </div>
                              <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
                                {document.content}
                              </p>
                            </section>
                          ))}
                        </div>
                      </details>

                      <div className="rounded-lg border border-[#cfe0f8] bg-[#eff5fe] p-3.5 text-xs leading-5 text-[#33507e]">
                        <p>
                          <strong className="text-[#0b1c3f]">Why their details are shared:</strong>{' '}
                          {requirementsQuery.data.sharingPurpose}
                        </p>
                        <p className="mt-1">
                          <strong className="text-[#0b1c3f]">Who will receive them:</strong>{' '}
                          {requirementsQuery.data.namedRecipients
                            .map(
                              recipient =>
                                `${recipient.name} · ${recipient.organization} (${recipient.role})`,
                            )
                            .join('; ')}
                        </p>
                        <p className="mt-1">
                          <strong className="text-[#0b1c3f]">How to sign:</strong>{' '}
                          {requirementsQuery.data.signatureMethod}
                        </p>
                      </div>
                      <label className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={confirmedPermission}
                          onChange={event => setConfirmedPermission(event.target.checked)}
                          className="mt-1"
                        />
                        <span>
                          The person agreed to share their details for this introduction and signed
                          the permission form.
                        </span>
                      </label>
                      <label className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={confirmedPrivacyNotice}
                          onChange={event => setConfirmedPrivacyNotice(event.target.checked)}
                          className="mt-1"
                        />
                        <span>
                          I shared the privacy notice and explained who will receive their details.
                        </span>
                      </label>
                      <Button
                        variant="conversion"
                        disabled={
                          !marketMode ||
                          !selectedModeProjection ||
                          !confirmedPermission ||
                          !confirmedPrivacyNotice ||
                          startSessionMutation.isPending
                        }
                        onClick={() =>
                          startSessionMutation.mutate({
                            developmentId: Number(developmentId),
                            confirmedPermission: true,
                            confirmedPrivacyNotice: true,
                          })
                        }
                      >
                        {startSessionMutation.isPending ? 'Starting…' : 'Continue to add documents'}
                      </Button>
                    </div>
                  </section>
                )}
              </div>
            ) : null}
          </>
        )}
      </main>

      <DevelopmentBrochureDialog
        open={Boolean(brochureItem)}
        onOpenChange={open => {
          if (!open) setBrochureItem(null);
        }}
        item={brochureItem}
        onDownload={() => markBrochureDownloaded(brochureItem)}
      />
    </ReferralAppShell>
  );
}
