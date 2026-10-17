import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';
import { ReferralIntakePausedCard } from '@/components/distribution/partner/ReferralIntakePausedCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { CheckCircle2, FileCheck2, Loader2, ShieldCheck } from 'lucide-react';

type MarketMode = 'sale' | 'rent';
type IntakeEvidenceType =
  | 'sharing_permission'
  | 'privacy_notice'
  | 'identity_document'
  | 'credit_authorization';

const REQUIRED_EVIDENCE: Array<{ type: IntakeEvidenceType; title: string; instructions: string }> = [
  {
    type: 'sharing_permission',
    title: 'Signed permission to share details',
    instructions: 'Have the prospect read and sign the approved sharing permission document.',
  },
  {
    type: 'privacy_notice',
    title: 'Signed privacy notice',
    instructions: 'Give the prospect the privacy notice and upload the signed acknowledgement.',
  },
  {
    type: 'identity_document',
    title: 'Prospect identity document',
    instructions: 'Upload the prospect’s ID or another identity document allowed by this program.',
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

export default function PartnerSubmitReferralPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [developmentId, setDevelopmentId] = useState<number | null>(null);
  const [marketMode, setMarketMode] = useState<MarketMode | null>(null);
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
    if (requestedDevelopmentId > 0) setDevelopmentId(requestedDevelopmentId);
    if (requestedMode === 'sale' || requestedMode === 'rent') setMarketMode(requestedMode);
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
      toast.success('Secure referral checklist started.');
    },
    onError: error => toast.error(error.message || 'Could not start referral intake.'),
  });

  const uploadEvidenceMutation = trpc.distribution.partner.uploadReferralIntakeEvidence.useMutation({
    onSuccess: async (_result, variables) => {
      await utils.distribution.partner.getReferralIntakeSession.invalidate({ sessionUuid: variables.sessionUuid });
      toast.success('Private evidence uploaded securely.');
    },
    onError: error => toast.error(error.message || 'Could not upload this document.'),
  });

  const submitReferralMutation = trpc.distribution.partner.submitReferral.useMutation({
    onSuccess: result => {
      toast.success('Referral submitted. Your team will guide the next steps.');
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

  if (loading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading secure referral access…
      </div>
    );
  }

  return (
    <ReferralAppShell>
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-8 sm:px-6">
        <header className="space-y-2">
          <p className="text-sm font-semibold text-primary">Distribution Network</p>
          <h1 className="text-2xl font-bold text-foreground">Refer a prospect</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            First get the prospect’s permission, share the privacy notice, and securely upload the
            signed documents and ID. Buyer details appear only after those files are recorded.
          </p>
        </header>

        {programsQuery.isLoading ? (
          <Card><CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading partner-enabled opportunities…</CardContent></Card>
        ) : eligibleDevelopments.length === 0 ? (
          <ReferralIntakePausedCard />
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>1. Choose an opportunity and market</CardTitle>
                <CardDescription>Sale and rental availability are checked separately against the current Developer projection.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
                          className={`rounded-lg border p-3 text-left ${marketMode === mode ? 'border-primary bg-primary/5' : 'border-border'} ${!available ? 'cursor-not-allowed opacity-50' : ''}`}
                        >
                          <span className="block text-sm font-semibold">{mode === 'sale' ? 'Buy' : 'Rent'}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {available ? `${projection.availableCount} available · ${formatPrice(projection, mode)}` : 'Not currently available'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {!selectedDevelopment?.opportunity?.openForReferral ? (
              <ReferralIntakePausedCard />
            ) : requirementsQuery.isLoading ? (
              <Card><CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading the current approved intake documents…</CardContent></Card>
            ) : requirementsQuery.isError || !requirementsQuery.data ? (
              <ReferralIntakePausedCard />
            ) : !sessionUuid ? (
              <Card>
                <CardHeader>
                  <CardTitle>2. Confirm the prospect has seen the documents</CardTitle>
                  <CardDescription>Use the current policy version for this program. Do not enter buyer details at this stage.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[requirementsQuery.data.sharingPermissionDocument, requirementsQuery.data.privacyNoticeDocument].map(document => (
                    <section key={`${document.title}-${document.version}`} className="rounded-md border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">{document.title} · version {document.version}</p>
                        <Button type="button" size="sm" variant="outline" onClick={() => window.print()}>Print</Button>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{document.content}</p>
                    </section>
                  ))}
                  <div className="rounded-md bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
                    <p><strong>Purpose:</strong> {requirementsQuery.data.sharingPurpose}</p>
                    <p className="mt-1"><strong>Recipients:</strong> {requirementsQuery.data.namedRecipients.map(recipient => `${recipient.name} · ${recipient.organization} (${recipient.role})`).join('; ')}</p>
                    <p className="mt-1"><strong>Signature method:</strong> {requirementsQuery.data.signatureMethod}</p>
                  </div>
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={confirmedPermission} onChange={event => setConfirmedPermission(event.target.checked)} className="mt-1" />
                    <span>The prospect agreed to share their details for this referral and signed the permission document.</span>
                  </label>
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={confirmedPrivacyNotice} onChange={event => setConfirmedPrivacyNotice(event.target.checked)} className="mt-1" />
                    <span>I gave the prospect the privacy notice and explained the named recipients.</span>
                  </label>
                  <Button
                    disabled={!marketMode || !selectedModeProjection || !confirmedPermission || !confirmedPrivacyNotice || startSessionMutation.isPending}
                    onClick={() => startSessionMutation.mutate({
                      developmentId: Number(developmentId),
                      confirmedPermission: true,
                      confirmedPrivacyNotice: true,
                    })}
                  >
                    {startSessionMutation.isPending ? 'Starting secure checklist…' : 'Continue to secure document upload'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />3. Upload the signed documents privately</CardTitle>
                    <CardDescription>Files are kept in Distribution’s private evidence storage. They are not Developer sales resources and no file URLs are shared with partners.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {REQUIRED_EVIDENCE.map(item => {
                      const uploaded = uploadedTypes.has(item.type);
                      return (
                        <div key={item.type} className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="flex items-center gap-2 text-sm font-semibold">
                              {uploaded ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <FileCheck2 className="h-4 w-4 text-muted-foreground" />}
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
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
                        <p className="font-semibold text-amber-950">Credit-report authorization is separate</p>
                        <p className="mt-1 text-xs text-amber-900">This referral does not request a credit report. If a later step needs one, the prospect must separately sign the authorization for {requirementsQuery.data.creditReport.providerName}.</p>
                        <p className="mt-2 whitespace-pre-wrap text-xs text-amber-950">{requirementsQuery.data.creditReport.authorizationDocument?.content}</p>
                        <label className="mt-3 block text-xs font-medium text-amber-950">Upload the separate signed authorization (optional at referral intake)
                          <Input type="file" accept={requirementsQuery.data.identityEvidence.allowedMimeTypes.join(',')} className="mt-2 bg-white" disabled={uploadEvidenceMutation.isPending} onChange={event => { const file = event.currentTarget.files?.[0]; void uploadEvidence('credit_authorization', file); event.currentTarget.value = ''; }} />
                        </label>
                      </div>
                    ) : null}
                    {intakeComplete ? (
                      <p className="rounded-md bg-green-50 p-3 text-sm text-green-800">All required evidence is recorded. Buyer details are now available below.</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Upload all three required items to continue. The policy remains pinned to this session.</p>
                    )}
                  </CardContent>
                </Card>

                {intakeComplete ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>4. Enter buyer details</CardTitle>
                      <CardDescription>These details are submitted to the assigned Distribution team and the developer process stated in this program’s terms.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="rounded-md border bg-muted/30 p-3 text-sm">
                        <p className="font-semibold">{selectedDevelopment?.developmentName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{marketMode ? `${marketMode === 'sale' ? 'Sale' : 'Rental'} · ${formatPrice(selectedModeProjection, marketMode)}` : 'Choose sale or rental above'}</p>
                      </div>
                      <Input placeholder="Prospect’s full name" autoComplete="off" value={buyerName} onChange={event => setBuyerName(event.target.value)} />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input placeholder="Phone number" autoComplete="off" value={buyerPhone} onChange={event => setBuyerPhone(event.target.value)} />
                        <Input placeholder="Email address" type="email" autoComplete="off" value={buyerEmail} onChange={event => setBuyerEmail(event.target.value)} />
                      </div>
                      <Input placeholder="Your referral reference (optional)" autoComplete="off" value={clientReference} onChange={event => setClientReference(event.target.value)} />
                      <Textarea placeholder="Anything the manager should know? Do not include financial account or ID numbers here." rows={4} value={buyerNotes} onChange={event => setBuyerNotes(event.target.value)} />
                      {eligibilityError ? <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{eligibilityError}</p> : null}
                      <Button
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
                          });
                        }}
                      >
                        {submitReferralMutation.isPending ? 'Submitting referral…' : 'Submit referral'}
                      </Button>
                    </CardContent>
                  </Card>
                ) : null}
              </>
            )}
          </>
        )}
      </main>
    </ReferralAppShell>
  );
}
