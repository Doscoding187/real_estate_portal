import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { FileText, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

function fileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.onload = () => {
      const result = String(reader.result || '');
      const separator = result.indexOf(',');
      if (separator < 0) reject(new Error('The selected file could not be encoded.'));
      else resolve(result.slice(separator + 1));
    };
    reader.readAsDataURL(file);
  });
}

function formatMode(mode: 'sale' | 'rent') {
  return mode === 'sale' ? 'For sale' : 'For rent';
}

export default function PartnerSubmitReferralPage() {
  const { isAuthenticated, loading } = useAuth();
  const [location, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const developmentId = Number(params.get('developmentId') || 0);
  const sessionUuid = params.get('sessionUuid') || undefined;
  const [acceptSharingPermission, setAcceptSharingPermission] = useState(false);
  const [acknowledgePrivacyNotice, setAcknowledgePrivacyNotice] = useState(false);
  const [evidenceLabel, setEvidenceLabel] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [marketMode, setMarketMode] = useState<'sale' | 'rent'>('sale');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');

  const intakeQuery = trpc.distribution.partner.getReferralIntake.useQuery(
    { developmentId, ...(sessionUuid ? { sessionUuid } : {}) },
    { enabled: isAuthenticated && developmentId > 0, retry: false },
  );
  const startMutation = trpc.distribution.partner.startReferralIntake.useMutation({
    onSuccess: result => {
      setLocation(`/distribution/partner/submit?developmentId=${developmentId}&sessionUuid=${result.sessionUuid}`);
      void intakeQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const uploadMutation = trpc.distribution.partner.uploadReferralIdentityEvidence.useMutation({
    onSuccess: () => {
      setEvidenceFile(null);
      toast.success('Evidence uploaded for review');
      void intakeQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const submitMutation = trpc.distribution.partner.submitReferral.useMutation({
    onSuccess: result => {
      toast.success('Referral submitted');
      if (result.dealId) setLocation(`/distribution/partner/referrals/${result.dealId}`);
      else void intakeQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) setLocation('/login');
  }, [isAuthenticated, loading, setLocation]);

  useEffect(() => {
    const choices = intakeQuery.data?.configuration?.identityEvidence?.acceptedEvidenceTypes || [];
    if (choices.length && !choices.includes(evidenceLabel)) setEvidenceLabel(choices[0]);
    const modes = intakeQuery.data?.marketableModes;
    if (modes?.sale?.available && !modes?.rent?.available) setMarketMode('sale');
    if (!modes?.sale?.available && modes?.rent?.available) setMarketMode('rent');
  }, [intakeQuery.data, evidenceLabel, location]);

  if (loading || (isAuthenticated && developmentId > 0 && intakeQuery.isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f3]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  const data = intakeQuery.data as any;
  const session = data?.session;
  const latestEvidence = session?.evidence?.find((item: any) => item.evidenceType === 'identity_document');
  const config = data?.configuration;
  const modes = data?.marketableModes;
  const identity = config?.identityEvidence;

  const startIntake = () =>
    startMutation.mutate({
      developmentId,
      acceptSharingPermission: true,
      acknowledgePrivacyNotice: true,
    });

  const uploadEvidence = async () => {
    if (!sessionUuid || !evidenceFile) return;
    try {
      const contentBase64 = await fileAsBase64(evidenceFile);
      uploadMutation.mutate({
        sessionUuid,
        evidenceLabel,
        mimeType: evidenceFile.type,
        contentBase64,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not read the selected file.');
    }
  };

  const submitReferral = () => {
    if (!sessionUuid || !buyerName.trim()) return;
    submitMutation.mutate({
      developmentId,
      marketMode,
      intakeSessionUuid: sessionUuid,
      buyerName: buyerName.trim(),
      buyerPhone: buyerPhone.trim() || undefined,
      buyerEmail: buyerEmail.trim() || undefined,
    });
  };

  return (
    <ReferralAppShell>
      <main className="mx-auto w-full max-w-[900px] space-y-4 px-4 pb-10 pt-6 md:px-7">
        <div>
          <p className="text-sm font-medium text-slate-500">Partner workspace</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Submit a referral</h1>
          <p className="mt-1 text-sm text-slate-600">
            Confirm the programme rules, provide the required partner evidence, then submit the buyer referral.
          </p>
        </div>

        {developmentId <= 0 ? (
          <Card><CardContent className="py-8 text-sm text-slate-600">Choose a development from Partner Developments to start a referral.</CardContent></Card>
        ) : intakeQuery.error ? (
          <Card>
            <CardHeader><CardTitle>Referral intake is unavailable</CardTitle></CardHeader>
            <CardContent className="text-sm text-slate-600">{intakeQuery.error.message}</CardContent>
          </Card>
        ) : !data ? (
          <Card><CardContent className="py-8 text-sm text-slate-600">Loading this programme’s intake requirements…</CardContent></Card>
        ) : session?.status === 'submitted' ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600" />Referral submitted</CardTitle>
              <CardDescription>The buyer details were submitted under policy version {session.policyVersion}.</CardDescription>
            </CardHeader>
            <CardContent>
              {session.dealId ? <Button onClick={() => setLocation(`/distribution/partner/referrals/${session.dealId}`)}>View referral</Button> : null}
            </CardContent>
          </Card>
        ) : session && session.status !== 'draft' ? (
          <Card>
            <CardHeader><CardTitle>Intake session {session.status}</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>This session is no longer open. Start a new referral from the active development opportunity.</p>
              <Button variant="outline" onClick={() => setLocation(`/distribution/partner/submit?developmentId=${developmentId}`)}>Start again</Button>
            </CardContent>
          </Card>
        ) : !session ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Programme information and permission</CardTitle>
                <CardDescription>Policy version {data.activePolicy?.policyVersion}. Read both documents before acknowledging them.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <section className="rounded-lg border bg-white p-4">
                  <div className="flex items-center gap-2 font-medium"><FileText className="h-4 w-4" />{config.sharingPermissionDocument.title}</div>
                  <p className="mt-1 text-xs text-slate-500">Version {config.sharingPermissionDocument.version}</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{config.sharingPermissionDocument.content}</p>
                  <p className="mt-3 text-sm"><strong>Purpose:</strong> {config.sharingPurpose}</p>
                </section>
                <section className="rounded-lg border bg-white p-4">
                  <div className="flex items-center gap-2 font-medium"><FileText className="h-4 w-4" />{config.privacyNoticeDocument.title}</div>
                  <p className="mt-1 text-xs text-slate-500">Version {config.privacyNoticeDocument.version}</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{config.privacyNoticeDocument.content}</p>
                </section>
                <section>
                  <p className="mb-2 text-sm font-medium">Named recipients</p>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
                    {config.namedRecipients.map((recipient: any, index: number) => <li key={`${recipient.name}-${index}`}>{recipient.name} · {recipient.organization} · {recipient.role}</li>)}
                  </ul>
                </section>
                <label className="flex items-start gap-3 rounded border p-3 text-sm">
                  <input type="checkbox" checked={acceptSharingPermission} onChange={event => setAcceptSharingPermission(event.target.checked)} className="mt-1" />
                  <span>I acknowledge the information-sharing permission and purpose shown above.</span>
                </label>
                <label className="flex items-start gap-3 rounded border p-3 text-sm">
                  <input type="checkbox" checked={acknowledgePrivacyNotice} onChange={event => setAcknowledgePrivacyNotice(event.target.checked)} className="mt-1" />
                  <span>I acknowledge the privacy notice shown above.</span>
                </label>
                <p className="text-xs text-slate-500">Property Listify records your account, time, and policy version. This record does not determine whether the policy wording or acknowledgement method is legally sufficient.</p>
                <Button disabled={!acceptSharingPermission || !acknowledgePrivacyNotice || startMutation.isPending || !data.storageConfigured} onClick={startIntake}>
                  {startMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Acknowledge and continue
                </Button>
                {!data.storageConfigured ? <p className="text-sm text-amber-700">Private evidence storage is not available, so a referral cannot be started.</p> : null}
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Partner identity evidence</CardTitle>
                  <CardDescription>Session pinned to policy version {session.policyVersion}; draft expires {new Date(session.draftExpiresAt).toLocaleString()}.</CardDescription>
                </div>
                <Badge variant={latestEvidence?.reviewStatus === 'verified' ? 'default' : 'secondary'}>{latestEvidence?.reviewStatus || 'not uploaded'}</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">{identity.verificationInstructions}</p>
                {latestEvidence ? (
                    <p className="text-sm text-slate-600">
                    Latest file: {latestEvidence.mimeType || 'document'} · {latestEvidence.byteSize ? `${Math.ceil(latestEvidence.byteSize / 1024)} KB` : ''}. {latestEvidence.reviewStatus === 'pending' ? 'A development manager must check it against the configured requirement before buyer details can be submitted.' : latestEvidence.reviewStatus === 'rejected' ? 'The reviewer could not accept this file. Upload a replacement to continue.' : 'A reviewer marked this file as meeting the configured operational requirement.'}
                  </p>
                ) : null}
                {latestEvidence?.reviewStatus !== 'verified' ? (
                  <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto] md:items-end">
                    <label className="space-y-1 text-sm">Evidence type
                      <select className="h-10 w-full rounded-md border bg-white px-3" value={evidenceLabel} onChange={event => setEvidenceLabel(event.target.value)}>
                        {identity.acceptedEvidenceTypes.map((item: string) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </label>
                    <label className="space-y-1 text-sm">Private evidence file
                      <Input type="file" accept={identity.allowedMimeTypes.join(',')} onChange={event => setEvidenceFile(event.target.files?.[0] || null)} />
                    </label>
                    <Button disabled={!evidenceFile || uploadMutation.isPending || session.status !== 'draft'} onClick={() => void uploadEvidence()}>
                      {uploadMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Upload
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {latestEvidence?.reviewStatus === 'verified' ? (
              <Card>
                <CardHeader><CardTitle>Buyer referral details</CardTitle><CardDescription>Buyer details are collected only after programme acknowledgement and partner identity review.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <label className="block space-y-1 text-sm">Market mode
                    <select className="h-10 w-full rounded-md border bg-white px-3" value={marketMode} onChange={event => setMarketMode(event.target.value as 'sale' | 'rent')}>
                      <option value="sale" disabled={!modes?.sale?.available}>For sale{modes?.sale?.available ? ` · ${modes.sale.availableCount} available` : ' · unavailable'}</option>
                      <option value="rent" disabled={!modes?.rent?.available}>For rent{modes?.rent?.available ? ` · ${modes.rent.availableCount} available` : ' · unavailable'}</option>
                    </select>
                  </label>
                  <label className="block space-y-1 text-sm">Buyer name<Input value={buyerName} onChange={event => setBuyerName(event.target.value)} maxLength={200} /></label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block space-y-1 text-sm">Buyer phone<Input value={buyerPhone} onChange={event => setBuyerPhone(event.target.value)} maxLength={50} /></label>
                    <label className="block space-y-1 text-sm">Buyer email<Input type="email" value={buyerEmail} onChange={event => setBuyerEmail(event.target.value)} maxLength={320} /></label>
                  </div>
                  <Button disabled={!buyerName.trim() || (!modes?.sale?.available && !modes?.rent?.available) || submitMutation.isPending} onClick={submitReferral}>
                    {submitMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Submit {formatMode(marketMode).toLowerCase()} referral
                  </Button>
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </main>
    </ReferralAppShell>
  );
}
