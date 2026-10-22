import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';
import { ReferralIntakePausedCard } from '@/components/distribution/partner/ReferralIntakePausedCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { CheckCircle2, FileCheck2, Info, Loader2, Send, ShieldCheck } from 'lucide-react';

type MarketMode = 'sale' | 'rent';
type IntakeEvidenceType =
  | 'sharing_permission'
  | 'privacy_notice'
  | 'identity_document'
  | 'credit_authorization';

const REQUIRED_EVIDENCE: Array<{ type: IntakeEvidenceType; title: string; instructions: string }> = [
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
  const to = mode.priceTo === mode.priceFrom ? null : `R${Math.round(mode.priceTo).toLocaleString('en-ZA')}`;
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

export default function PartnerSubmitReferralPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [developmentId, setDevelopmentId] = useState<number | null>(null);
  const [marketMode, setMarketMode] = useState<MarketMode | null>(null);
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

  useEffect(() => {
    if (!loading && !isAuthenticated) setLocation('/login');
  }, [isAuthenticated, loading, setLocation]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedDevelopmentId = Number(params.get('developmentId') || 0);
    const requestedMode = params.get('marketMode');
    const requestedCheckFitId = params.get('checkFitId');
    if (requestedDevelopmentId > 0) setDevelopmentId(requestedDevelopmentId);
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
    if (!developmentId || !eligibleDevelopments.some(item => Number(item.developmentId) === developmentId)) {
      setDevelopmentId(Number(eligibleDevelopments[0].developmentId));
      setSessionUuid(null);
    }
  }, [developmentId, eligibleDevelopments]);

  const selectedDevelopment = eligibleDevelopments.find(
    item => Number(item.developmentId) === Number(developmentId || 0),
  ) || null;
  const selectedModeProjection = marketMode
    ? selectedDevelopment?.inventory?.modes?.[marketMode === 'sale' ? 'for_sale' : 'for_rent']
    : null;

  useEffect(() => {
    if (marketMode && selectedDevelopment && !selectedDevelopment.inventory?.modes?.[
      marketMode === 'sale' ? 'for_sale' : 'for_rent'
    ]) {
      setMarketMode(null);
    }
  }, [marketMode, selectedDevelopment]);

  const requirementsQuery = trpc.distribution.partner.getReferralIntakeRequirements.useQuery(
    { developmentId: Number(developmentId || 0) },
    { enabled: isAuthenticated && Boolean(developmentId) && selectedDevelopment?.opportunity?.openForReferral === true, retry: false },
  );
  const sessionQuery = trpc.distribution.partner.getReferralIntakeSession.useQuery(
    { sessionUuid: sessionUuid || '00000000-0000-0000-0000-000000000000' },
    { enabled: isAuthenticated && Boolean(sessionUuid), retry: false, refetchOnWindowFocus: false },
  );
  const utils = trpc.useUtils();

  const startSessionMutation = trpc.distribution.partner.createReferralIntakeSession.useMutation({
    onSuccess: result => {
      setSessionUuid(result.sessionUuid);
      toast.success('Referral steps started.');
    },
    onError: error => toast.error(error.message || 'Could not start the referral steps.'),
  });

  const uploadEvidenceMutation = trpc.distribution.partner.uploadReferralIntakeEvidence.useMutation({
    onSuccess: async (_result, variables) => {
      await utils.distribution.partner.getReferralIntakeSession.invalidate({ sessionUuid: variables.sessionUuid });
      toast.success('Document added.');
    },
    onError: error => toast.error(error.message || 'Could not upload this document.'),
  });

  const submitReferralMutation = trpc.distribution.partner.submitReferral.useMutation({
    onSuccess: result => {
      toast.success('Introduction sent. Your team will guide the next steps.');
      setLocation(`/distribution/partner/referrals/${Number(result.dealId)}`);
    },
    onError: error => {
      setEligibilityError(error.message || 'The referral could not be submitted.');
    },
  });

  const documentPackQuery = trpc.distribution.partner.getProspectDocumentPacks.useQuery(
    { developmentIds: developmentId ? [Number(developmentId)] : [] },
    { enabled: Boolean(developmentId) && isAuthenticated, retry: false },
  );
  const documentPack = (documentPackQuery.data || [])[0] || null;

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

  if (loading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading your referral…
      </div>
    );
  }

  return (
    <ReferralAppShell>
      <main className="mx-auto w-full max-w-[1180px] space-y-6 px-4 pb-10 pt-7 md:px-7">
        <section>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#cfe0f8] bg-[#eff5fe] px-3 py-1 text-[12px] font-medium text-[#1d6fe3]">
            <Send className="h-3.5 w-3.5" /> Start a referral
          </span>
          <h1 className="mt-3 text-[30px] font-bold leading-tight tracking-[-0.02em] text-[#0b1c3f]">
            Introduce someone to a property opportunity
          </h1>
          <p className="mt-2 max-w-3xl text-[15px] leading-6 text-muted-foreground">
            We’ll guide you through permission and documents first. Once those are ready, you can
            share their details and follow the introduction from My deals.
          </p>
        </section>

        <section className="grid gap-4 rounded-xl border border-[#cfe0f8] bg-[#eff5fe] p-5 text-[12.5px] leading-5 text-[#33507e] md:grid-cols-2 md:p-6">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#1d6fe3]" />
            <p>
              <span className="font-semibold text-[#0b1c3f]">Permission and documents come first.</span>{' '}
              The steps below ask for the person’s agreement and signed documents before any contact
              details are shared.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1d6fe3]" />
            <p>
              <span className="font-semibold text-[#0b1c3f]">Nothing is shared until they agree.</span>{' '}
              You can stop at any step. Documents are stored with the referral only for the
              responsible team to review.
            </p>
          </div>
        </section>

        {programsQuery.isLoading ? (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-white p-5 text-sm text-muted-foreground shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading available opportunities…
          </div>
        ) : eligibleDevelopments.length === 0 ? (
          <ReferralIntakePausedCard />
        ) : (
          <>
            <section className="rounded-xl border border-border bg-white p-5 shadow-sm md:p-6">
              <StepHeading
                step={1}
                title="Choose an opportunity and market"
                description="Choose the option and whether the person wants to buy or rent. Prices and availability are checked again when you send the introduction."
              />
              <div className="mt-4 space-y-3">
                <select
                  className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm"
                  value={developmentId || ''}
                  onChange={event => {
                    setDevelopmentId(Number(event.target.value));
                    setSessionUuid(null);
                    setMarketMode(null);
                  }}
                >
                  {eligibleDevelopments.map(item => (
                    <option key={item.developmentId} value={item.developmentId}>{item.developmentName}</option>
                  ))}
                </select>
                {selectedDevelopment ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(['sale', 'rent'] as const).map(mode => {
                      const projection = selectedDevelopment.inventory?.modes?.[mode === 'sale' ? 'for_sale' : 'for_rent'];
                      const available = Boolean(projection && projection.availableCount > 0);
                      return (
                        <button
                          key={mode}
                          type="button"
                          disabled={!available}
                          onClick={() => setMarketMode(mode)}
                          className={cn(
                            'rounded-xl border p-3.5 text-left transition',
                            marketMode === mode
                              ? 'border-[#1d6fe3] bg-[#eff5fe]'
                              : 'border-border bg-white hover:border-[#9cc0ee]',
                            !available && 'cursor-not-allowed opacity-50',
                          )}
                        >
                          <span className="block text-sm font-semibold text-[#0b1c3f]">{mode === 'sale' ? 'Buy' : 'Rent'}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {available ? `${projection.availableCount} available · ${formatPrice(projection, mode)}` : 'Not currently available'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </section>

            {!selectedDevelopment?.opportunity?.openForReferral ? (
              <ReferralIntakePausedCard />
            ) : requirementsQuery.isLoading ? (
              <div className="flex items-center gap-2 rounded-xl border border-border bg-white p-5 text-sm text-muted-foreground shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading the documents for this opportunity…
              </div>
            ) : requirementsQuery.isError || !requirementsQuery.data ? (
              <ReferralIntakePausedCard />
            ) : !sessionUuid ? (
              <section className="rounded-xl border border-border bg-white p-5 shadow-sm md:p-6">
                <StepHeading
                  step={2}
                  title="Get the documents, then confirm the prospect has seen them"
                  description="Download the documents for the prospect, review them with the person, and confirm below. We’ll ask for their contact details after the signed documents and ID are added."
                />
                <div className="mt-4 space-y-4">
                  {documentPack && documentPack.downloads.length ? (
                    <div className="mt-4 rounded-lg border border-[#cfe0f8] bg-[#eff5fe] p-3.5">
                      <p className="text-sm font-semibold text-[#0b1c3f]">
                        Download these for the prospect
                      </p>
                      <p className="mt-1 text-xs text-[#33507e]">
                        Give the prospect these documents, let them complete and sign them, then upload
                        the signed copies below. The referral is only sent once the required documents
                        are in, and it then appears in My deals.
                      </p>
                      <ul className="mt-2 space-y-1">
                        {documentPack.downloads.map(download => (
                          <li key={download.key} className="text-xs">
                            <a
                              href={download.url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-[#1d6fe3] underline"
                            >
                              Download {download.label}
                            </a>
                            {download.instructions ? (
                              <span className="ml-1 text-[#33507e]">{download.instructions}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {[requirementsQuery.data.sharingPermissionDocument, requirementsQuery.data.privacyNoticeDocument].map(document => (
                    <section key={`${document.title}-${document.version}`} className="rounded-lg border border-border p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[#0b1c3f]">{document.title} · version {document.version}</p>
                        <Button type="button" size="sm" variant="outline" onClick={() => window.print()}>Print</Button>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{document.content}</p>
                    </section>
                  ))}
                  <div className="rounded-lg border border-[#cfe0f8] bg-[#eff5fe] p-3.5 text-xs leading-5 text-[#33507e]">
                    <p><strong className="text-[#0b1c3f]">Why their details are shared:</strong> {requirementsQuery.data.sharingPurpose}</p>
                    <p className="mt-1"><strong className="text-[#0b1c3f]">Who will receive them:</strong> {requirementsQuery.data.namedRecipients.map(recipient => `${recipient.name} · ${recipient.organization} (${recipient.role})`).join('; ')}</p>
                    <p className="mt-1"><strong className="text-[#0b1c3f]">How to sign:</strong> {requirementsQuery.data.signatureMethod}</p>
                  </div>
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={confirmedPermission} onChange={event => setConfirmedPermission(event.target.checked)} className="mt-1" />
                    <span>The person agreed to share their details for this introduction and signed the permission form.</span>
                  </label>
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={confirmedPrivacyNotice} onChange={event => setConfirmedPrivacyNotice(event.target.checked)} className="mt-1" />
                    <span>I shared the privacy notice and explained who will receive their details.</span>
                  </label>
                  <Button
                    variant="conversion"
                    disabled={!marketMode || !selectedModeProjection || !confirmedPermission || !confirmedPrivacyNotice || startSessionMutation.isPending}
                    onClick={() => startSessionMutation.mutate({
                      developmentId: Number(developmentId),
                      confirmedPermission: true,
                      confirmedPrivacyNotice: true,
                    })}
                  >
                    {startSessionMutation.isPending ? 'Starting…' : 'Continue to add documents'}
                  </Button>
                </div>
              </section>
            ) : (
              <>
                <section className="rounded-xl border border-border bg-white p-5 shadow-sm md:p-6">
                  <StepHeading
                    step={3}
                    title="Add the signed documents"
                    description="These documents confirm permission and identity. They are stored with the referral for the responsible team to review."
                  />
                  <div className="mt-4 space-y-4">
                    {REQUIRED_EVIDENCE.map(item => {
                      const uploaded = uploadedTypes.has(item.type);
                      return (
                        <div key={item.type} className="flex flex-col gap-3 rounded-lg border border-border p-3.5 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="flex items-center gap-2 text-sm font-semibold text-[#0b1c3f]">
                              {uploaded ? <CheckCircle2 className="h-4 w-4 text-[#2f8f4e]" /> : <FileCheck2 className="h-4 w-4 text-muted-foreground" />}
                              {item.title}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.instructions}</p>
                          </div>
                          <Input
                            type="file"
                            accept={requirementsQuery.data.identityEvidence.allowedMimeTypes.join(',')}
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
                        <p className="font-semibold text-[#b07a1e]">Credit checks need separate permission</p>
                        <p className="mt-1 text-xs text-[#b07a1e]">This introduction does not request a credit report. If a later step needs one, the person must separately sign the authorization for {requirementsQuery.data.creditReport.providerName}.</p>
                        <p className="mt-2 whitespace-pre-wrap text-xs text-[#b07a1e]">{requirementsQuery.data.creditReport.authorizationDocument?.content}</p>
                        <label className="mt-3 block text-xs font-medium text-[#b07a1e]">Add the signed authorization (optional for this introduction)
                          <Input type="file" accept={requirementsQuery.data.identityEvidence.allowedMimeTypes.join(',')} className="mt-2 bg-white" disabled={uploadEvidenceMutation.isPending} onChange={event => { const file = event.currentTarget.files?.[0]; void uploadEvidence('credit_authorization', file); event.currentTarget.value = ''; }} />
                        </label>
                      </div>
                    ) : null}
                    {intakeComplete ? (
                      <p className="rounded-lg border border-[#cde9d2] bg-[#f5fcf6] p-3.5 text-sm text-[#2f8f4e]">The required documents are ready. You can now add the person’s contact details below.</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Add all three required documents to continue.</p>
                    )}
                  </div>
                </section>

                {intakeComplete ? (
                  <section className="rounded-xl border border-border bg-white p-5 shadow-sm md:p-6">
                    <StepHeading
                      step={4}
                      title="Add their contact details"
                      description="The team responsible for this opportunity will use these details to follow up. You can track recorded updates in My deals."
                    />
                    <div className="mt-4 space-y-3">
                      <div className="rounded-lg border border-border bg-surface p-3.5 text-sm">
                        <p className="font-semibold text-[#0b1c3f]">{selectedDevelopment?.developmentName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{marketMode ? `${marketMode === 'sale' ? 'Sale' : 'Rental'} · ${formatPrice(selectedModeProjection, marketMode)}` : 'Choose sale or rental above'}</p>
                      </div>
                      <Input placeholder="Full name" autoComplete="off" value={buyerName} onChange={event => setBuyerName(event.target.value)} />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input placeholder="Phone number" autoComplete="off" value={buyerPhone} onChange={event => setBuyerPhone(event.target.value)} />
                        <Input placeholder="Email address" type="email" autoComplete="off" value={buyerEmail} onChange={event => setBuyerEmail(event.target.value)} />
                      </div>
                      <Input placeholder="Your reference (optional)" autoComplete="off" value={clientReference} onChange={event => setClientReference(event.target.value)} />
                      <Textarea placeholder="Anything you’d like the team to know? Don’t include ID or financial account numbers." rows={4} value={buyerNotes} onChange={event => setBuyerNotes(event.target.value)} />
                      {eligibilityError ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{eligibilityError}</p> : null}
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
                    </div>
                  </section>
                ) : null}
              </>
            )}
          </>
        )}
      </main>
    </ReferralAppShell>
  );
}
