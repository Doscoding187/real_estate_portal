import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Download, FileText, Loader2, UploadCloud, UserRound, WalletCards } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PayoutRulesDisclosure } from '@/components/distribution/partner/PayoutRulesDisclosure';
import { toast } from 'sonner';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';

const JOURNEY_STAGES = [
  'viewing_scheduled',
  'viewing_completed',
  'application_submitted',
  'contract_signed',
  'bond_approved',
  'commission_pending',
  'commission_paid',
] as const;

function normalizeStage(stage: string | null | undefined) {
  const value = String(stage || '').toLowerCase();
  if (!value) return 'viewing_scheduled';
  if (value === 'submitted' || value === 'lead') return 'viewing_scheduled';
  return value;
}

function getStageLabel(stage: string | null | undefined) {
  return normalizeStage(stage)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

type ReferralDetailTransaction = 'sale' | 'rent' | 'auction';

export function normalizeReferralDetailTransactionType(value: unknown): ReferralDetailTransaction {
  const normalized = String(value || '').trim().toLowerCase();
  if (['for_rent', 'rent', 'rental', 'to_rent', 'to-rent'].includes(normalized)) return 'rent';
  if (['auction', 'on_auction', 'on-auction'].includes(normalized)) return 'auction';
  return 'sale';
}

export function getReferralDetailTransactionCopy(transactionType: unknown) {
  const lane = normalizeReferralDetailTransactionType(transactionType);
  if (lane === 'rent') {
    return {
      referralTypeLabel: 'Rental referral',
      participantLabel: 'Renter',
      participantLower: 'renter',
      statusTitle: 'Renter Status and Reward Progress',
      backLabel: 'Back to My Referrals',
      submitAnotherLabel: 'Submit Another Referral',
      contactLabel: 'WhatsApp Renter',
      applicationDocumentsTitle: 'Renter application documents',
      applicationDocumentsDescription:
        'These are renter qualification files such as ID, proof of income, bank statements, deposit confirmation, or lease-readiness evidence.',
      noApplicationDocuments:
        'No renter application documents are configured for this referral yet.',
      supportingDocumentsDescription:
        'Share these with the renter. They do not change application progress.',
    };
  }
  if (lane === 'auction') {
    return {
      referralTypeLabel: 'Auction referral',
      participantLabel: 'Bidder',
      participantLower: 'bidder',
      statusTitle: 'Bidder Status and Reward Progress',
      backLabel: 'Back to My Referrals',
      submitAnotherLabel: 'Submit Another Referral',
      contactLabel: 'WhatsApp Bidder',
      applicationDocumentsTitle: 'Bidder application documents',
      applicationDocumentsDescription:
        'These are bidder readiness files such as ID, FICA, proof of funds, auction registration, or auction terms evidence.',
      noApplicationDocuments:
        'No bidder application documents are configured for this referral yet.',
      supportingDocumentsDescription:
        'Share these with the bidder. They do not change application progress.',
    };
  }
  return {
    referralTypeLabel: 'Buyer referral',
    participantLabel: 'Buyer',
    participantLower: 'buyer',
    statusTitle: 'Buyer Status and Reward Progress',
    backLabel: 'Back to My Referrals',
    submitAnotherLabel: 'Submit Another Referral',
    contactLabel: 'WhatsApp Buyer',
    applicationDocumentsTitle: 'Buyer application documents',
    applicationDocumentsDescription:
      'These are buyer qualification files such as ID, income proof, bank statements, pre-approval, or proof of funds.',
    noApplicationDocuments:
      'No buyer application documents are configured for this referral yet.',
    supportingDocumentsDescription:
      'Share these with the buyer. They do not change application progress.',
  };
}

export function getReferralDetailStageLabel(
  stage: string | null | undefined,
  transactionType: unknown,
) {
  const normalized = normalizeStage(stage);
  const lane = normalizeReferralDetailTransactionType(transactionType);
  const labels: Record<ReferralDetailTransaction, Record<string, string>> = {
    sale: {
      viewing_scheduled: 'Submitted',
      viewing_completed: 'Viewing completed',
      application_submitted: 'Application submitted',
      contract_signed: 'Contract signed',
      bond_approved: 'Bond approved',
      commission_pending: 'Reward pending',
      commission_paid: 'Reward paid',
    },
    rent: {
      viewing_scheduled: 'Renter submitted',
      viewing_completed: 'Rental viewing completed',
      application_submitted: 'Rental application submitted',
      contract_signed: 'Lease signed',
      bond_approved: 'Lease conditions met',
      commission_pending: 'Rental reward pending',
      commission_paid: 'Rental reward paid',
    },
    auction: {
      viewing_scheduled: 'Bidder submitted',
      viewing_completed: 'Bidder contacted',
      application_submitted: 'Bidder registered',
      contract_signed: 'Auction terms accepted',
      bond_approved: 'Bidder approved',
      commission_pending: 'Auction reward pending',
      commission_paid: 'Auction reward paid',
    },
  };
  return labels[lane][normalized] || getStageLabel(normalized);
}

function getStageProgress(stage: string | null | undefined) {
  const normalized = normalizeStage(stage);
  const index = JOURNEY_STAGES.indexOf(normalized as (typeof JOURNEY_STAGES)[number]);
  if (index < 0) return { index: 0, percent: 0 };
  return { index, percent: Math.round(((index + 1) / JOURNEY_STAGES.length) * 100) };
}

function getNextActionHint(input: {
  status: string;
  docProgress: { requiredCount: number; verifiedRequiredCount: number };
  transactionType?: unknown;
}) {
  const normalized = normalizeStage(input.status);
  const lane = normalizeReferralDetailTransactionType(input.transactionType);
  if (normalized === 'commission_paid') {
    return 'Referral reward paid. Download supporting documents and submit your next referral.';
  }
  if (normalized === 'commission_pending') {
    if (lane === 'rent') return 'Renter converted. Monitor rental reward approval and payment timing.';
    if (lane === 'auction') return 'Bidder converted. Monitor auction reward approval and payment timing.';
    return 'Buyer converted. Monitor reward approval and payment timing.';
  }
  if (normalized === 'bond_approved' || normalized === 'contract_signed') {
    if (lane === 'rent') return 'Keep renter documents complete while lease reward review is processed.';
    if (lane === 'auction') return 'Keep bidder documents complete while auction reward review is processed.';
    return 'Keep all required documents complete while payout milestone is processed.';
  }
  if (normalized === 'application_submitted') {
    if (input.docProgress.verifiedRequiredCount < input.docProgress.requiredCount) {
      if (lane === 'rent') return 'Upload and verify remaining renter documents to avoid reward delays.';
      if (lane === 'auction') return 'Upload and verify remaining bidder documents to avoid reward delays.';
      return 'Upload and verify remaining required documents to avoid reward delays.';
    }
    if (lane === 'rent') return 'Rental application submitted. Track manager feedback and lease progression.';
    if (lane === 'auction') return 'Bidder registration submitted. Track manager feedback and auction readiness.';
    return 'Application submitted. Track manager feedback and bond progression.';
  }
  if (lane === 'rent') return 'Coordinate renter viewing and progress this renter to application stage.';
  if (lane === 'auction') return 'Coordinate bidder follow-up and progress this bidder to registration stage.';
  return 'Coordinate buyer viewing and progress this buyer to application stage.';
}

function formatOwnerRole(ownerRole: string | null | undefined) {
  const value = String(ownerRole || '').toLowerCase();
  if (!value) return 'Team';
  return value.replace(/\b\w/g, char => char.toUpperCase());
}

function normalizePhoneForWhatsApp(value: string | null | undefined) {
  const digits = String(value || '').replace(/[^\d]/g, '');
  if (!digits) return null;
  if (digits.startsWith('0')) return `27${digits.slice(1)}`;
  if (digits.startsWith('27')) return digits;
  return digits;
}

function base64ToBlob(base64: string, mimeType: string) {
  const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}

type ReferralAffordabilityDisplayType = 'sale' | 'rent' | 'auction';

export function normalizeReferralAffordabilityDisplayType(value: unknown): ReferralAffordabilityDisplayType {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'rent' || normalized === 'rental' || normalized === 'for_rent' || normalized === 'to-rent') {
    return 'rent';
  }
  if (normalized === 'auction') return 'auction';
  return 'sale';
}

export function getReferralAffordabilityDisplay(input: {
  transactionType?: unknown;
  purchasePriceEstimate?: number | null;
  listingPriceFrom?: number | null;
  listingPriceTo?: number | null;
}) {
  const transactionType = normalizeReferralAffordabilityDisplayType(input.transactionType);
  const listingPriceFrom = Number(input.listingPriceFrom || 0);
  const listingPriceTo = Number(input.listingPriceTo || 0);
  const hasListingPrice = Number.isFinite(listingPriceFrom) && listingPriceFrom > 0;
  const rangeText =
    hasListingPrice && listingPriceTo > listingPriceFrom
      ? `R${listingPriceFrom.toLocaleString('en-ZA')} - R${listingPriceTo.toLocaleString('en-ZA')}`
      : hasListingPrice
        ? `R${listingPriceFrom.toLocaleString('en-ZA')}`
        : null;

  if (transactionType === 'rent' && rangeText) {
    return {
      label: 'Matched monthly rent',
      value: `${rangeText} / month`,
    };
  }

  if (transactionType === 'auction' && rangeText) {
    return {
      label: 'Matched starting bid',
      value: rangeText,
    };
  }

  const purchasePriceEstimate = Number(input.purchasePriceEstimate || 0);
  if (Number.isFinite(purchasePriceEstimate) && purchasePriceEstimate > 0) {
    return {
      label: 'Purchase price estimate',
      value: `R${purchasePriceEstimate.toLocaleString('en-ZA')}`,
    };
  }

  return null;
}

export default function PartnerReferralDetailPage() {
  const [match, params] = useRoute('/distribution/partner/referrals/:dealId');
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const dealId = Number(params?.dealId || 0);
  const [uploadingTemplateId, setUploadingTemplateId] = useState<number | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      setLocation('/login');
      return;
    }
    if (!match) {
      setLocation('/distribution/partner/referrals');
    }
  }, [isAuthenticated, loading, match, setLocation]);

  const referralQuery = trpc.distribution.partner.getReferral.useQuery(
    { dealId },
    {
      enabled: isAuthenticated && match && dealId > 0,
      retry: false,
    },
  );

  const exportQualificationPackMutation =
    trpc.distribution.partner.exportQualificationPackPdfForReferral.useMutation({
      onSuccess: payload => {
        const blob = base64ToBlob(payload.base64, payload.mimeType);
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = payload.fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
        toast.success('Qualification Pack downloaded.');
      },
      onError: error => {
        toast.error(error.message || 'Unable to export qualification pack.');
      },
    });

  const presignUploadMutation = trpc.upload.presign.useMutation();
  const submitDocumentMutation = trpc.distribution.partner.submitReferralDocument.useMutation({
    onSuccess: () => {
      toast.success('Application document uploaded for manager review.');
      void referralQuery.refetch();
    },
    onError: error => {
      toast.error(error.message || 'Unable to upload application document.');
    },
  });

  async function handleApplicationDocumentUpload(document: any, file: File | null) {
    if (!file || !referralQuery.data) return;
    setUploadingTemplateId(Number(document.templateId));
    try {
      const { url, publicUrl } = await presignUploadMutation.mutateAsync({
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        propertyId: `distribution-referral-${dealId}`,
      });
      const uploadResponse = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      });
      if (!uploadResponse.ok) {
        throw new Error(`Document upload failed (${uploadResponse.status}).`);
      }
      await submitDocumentMutation.mutateAsync({
        dealId,
        templateId: Number(document.templateId),
        submittedFileUrl: publicUrl,
        submittedFileName: file.name,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to upload application document.');
    } finally {
      setUploadingTemplateId(null);
    }
  }

  if (loading || referralQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f3]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (referralQuery.error) {
    return (
      <ReferralAppShell>
        <main className="mx-auto w-full max-w-4xl px-4 pb-8 pt-6 md:px-7">
          <Card>
            <CardContent className="py-6 text-sm text-red-600">{referralQuery.error.message}</CardContent>
          </Card>
        </main>
      </ReferralAppShell>
    );
  }

  const referral = referralQuery.data;
  if (!referral) {
    return (
      <ReferralAppShell>
        <main className="mx-auto w-full max-w-4xl px-4 pb-8 pt-6 md:px-7">
          <Card>
            <CardContent className="py-6 text-sm text-slate-500">Referral not found.</CardContent>
          </Card>
        </main>
      </ReferralAppShell>
    );
  }

  const affordabilityAssumptions = (referral.affordability?.assumptions || null) as
    | {
        interestRateAnnual?: number | null;
        termMonths?: number | null;
        maxRepaymentRatio?: number | null;
        calcVersion?: string | null;
      }
    | null;
  const transactionType =
    referral.development?.transactionType || referral.affordability?.transactionType || 'sale';
  const transactionCopy = getReferralDetailTransactionCopy(transactionType);
  const journeyProgress = getStageProgress(referral.status);
  const nextActionHint =
    referral.journey?.nextAction ||
    getNextActionHint({
      status: String(referral.status || ''),
      docProgress: referral.docProgress,
      transactionType,
    });
  const actionCode = String(referral.journey?.actionCode || '');
  const applicationDocuments = Array.isArray((referral as any).applicationDocuments)
    ? (referral as any).applicationDocuments
    : [];
  const buyerApplicationDocuments = applicationDocuments.filter(
    (document: any) => document.category !== 'developer_document',
  );
  const developerApplicationDocuments = applicationDocuments.filter(
    (document: any) => document.category === 'developer_document',
  );
  const supportingDocuments = Array.isArray(referral.programTerms?.sourceDocuments)
    ? referral.programTerms.sourceDocuments
    : [];
  const affordabilityDisplay = getReferralAffordabilityDisplay({
    transactionType,
    purchasePriceEstimate: referral.affordability?.purchasePriceEstimate,
    listingPriceFrom: referral.affordability?.listingPriceFrom,
    listingPriceTo: referral.affordability?.listingPriceTo,
  });

  return (
    <ReferralAppShell>
      <main className="mx-auto w-full max-w-[1180px] px-4 pb-10 pt-6 md:px-7">
        <Card className="mb-5 overflow-hidden border-primary/15 bg-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 bg-gradient-to-br from-[var(--brand-blue)] via-[var(--info)] to-[var(--brand-blue-hover)] px-6 py-5 text-white">
            <div>
              <p className="text-[10px] font-semibold uppercase text-blue-100">
                {transactionCopy.referralTypeLabel}
              </p>
              <h1 className="mt-1 text-[28px] font-semibold">{referral.development.name}</h1>
              <p className="mt-2 text-[13px] text-[#ece6da]">Referral #{referral.dealId}</p>
            </div>
            <Badge className="bg-white text-primary hover:bg-white">
              {getReferralDetailStageLabel(referral.status, transactionType)}
            </Badge>
          </div>
          <CardContent className="flex flex-wrap gap-2 bg-primary/5 py-4">
            <Button variant="outline" onClick={() => setLocation('/distribution/partner/referrals')}>
              {transactionCopy.backLabel}
            </Button>
            <Button variant="outline" onClick={() => setLocation('/distribution/partner/submit')}>
              {transactionCopy.submitAnotherLabel}
            </Button>
            {referral.matchSnapshotId ? (
              <Button
                variant="outline"
                disabled={exportQualificationPackMutation.isPending}
                onClick={() =>
                  exportQualificationPackMutation.mutate({
                    dealId: Number(referral.dealId),
                  })
                }
              >
                {exportQualificationPackMutation.isPending
                  ? 'Preparing Qualification Pack...'
                  : 'Download Qualification Pack'}
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card className="mb-5 border-primary/15 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <WalletCards className="h-4 w-4 text-primary" />
              {transactionCopy.statusTitle}
            </CardTitle>
            <CardDescription>
              Stage {journeyProgress.index + 1} of {JOURNEY_STAGES.length} ({journeyProgress.percent}
              % complete)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 h-2 overflow-hidden rounded bg-[#e7dfd3]">
              <div className="h-full rounded bg-primary" style={{ width: `${journeyProgress.percent}%` }} />
            </div>
            <div className="mb-3 flex flex-wrap gap-1">
              {JOURNEY_STAGES.map(stage => {
                const currentIndex = journeyProgress.index;
                const stageIndex = JOURNEY_STAGES.indexOf(stage);
                const reached = stageIndex <= currentIndex;
                return (
                  <span
                    key={stage}
                    className={`rounded px-2 py-1 text-[11px] ${
                      reached ? 'bg-primary/10 text-primary' : 'bg-[#f5f0e8] text-muted-foreground'
                    }`}
                  >
                    {getReferralDetailStageLabel(stage, transactionType)}
                  </span>
                );
              })}
            </div>
            <div className="rounded-md border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
              {nextActionHint}
            </div>
            {referral.journey?.slaDueAt ? (
              <p className={`mt-2 text-xs ${referral.journey?.atRisk ? 'text-red-600' : 'text-slate-600'}`}>
                Owner: {formatOwnerRole(referral.journey.ownerRole)} • SLA due {String(referral.journey.slaDueAt)}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {actionCode === 'track_payout' ? (
                <Button size="sm" onClick={() => setLocation('/distribution/partner/commissions')}>
                  Open Rewards
                </Button>
              ) : null}
              {(actionCode === 'follow_up_manager' || referral.journey?.ownerRole === 'manager') &&
              referral.manager?.email ? (
                <Button
                  size="sm"
                  variant="conversion"
                  onClick={() => {
                    const subject = encodeURIComponent(
                      `Referral follow-up: Referral #${referral.dealId} - ${referral.development.name}`,
                    );
                    const body = encodeURIComponent(
                      `Hi,\n\nI am following up on referral #${referral.dealId}.\nNext action: ${nextActionHint}\n\nThanks.`,
                    );
                    window.open(`mailto:${referral.manager?.email}?subject=${subject}&body=${body}`);
                  }}
                >
                  Contact Manager
                </Button>
              ) : null}
              {(() => {
                const whatsappPhone = normalizePhoneForWhatsApp(referral.buyer?.phone || null);
                if (!whatsappPhone) return null;
                const msg = encodeURIComponent(
                  `Hi ${referral.buyer?.name || ''}, quick update on your ${referral.development.name} referral. ${nextActionHint}`,
                );
                return (
                  <Button
                    size="sm"
                    variant="conversion"
                    onClick={() =>
                      window.open(`https://wa.me/${whatsappPhone}?text=${msg}`, '_blank', 'noopener,noreferrer')
                    }
                  >
                    {transactionCopy.contactLabel}
                  </Button>
                );
              })()}
              {actionCode === 'submit_next_referral' ? (
                <Button size="sm" variant="conversion" onClick={() => setLocation('/distribution/partner/submit')}>
                  Submit Next Referral
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Card className="border-primary/15 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserRound className="h-4 w-4 text-primary" />
                Referral Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-slate-500">Created:</span> {referral.createdAt}
              </p>
              <p>
                <span className="text-slate-500">{transactionCopy.participantLabel}:</span>{' '}
                {referral.buyer.name || 'Not provided'}
              </p>
              <p>
                <span className="text-slate-500">Phone:</span> {referral.buyer.phone || 'Not provided'}
              </p>
              <p>
                <span className="text-slate-500">Email:</span> {referral.buyer.email || 'Not provided'}
              </p>
              <p>
                <span className="text-slate-500">Document progress:</span>{' '}
                {referral.docProgress.verifiedRequiredCount}/{referral.docProgress.requiredCount}
              </p>
              {affordabilityDisplay ? (
                <p>
                  <span className="text-slate-500">{affordabilityDisplay.label}:</span>{' '}
                  {affordabilityDisplay.value}
                </p>
              ) : null}
              {affordabilityAssumptions ? (
                <>
                  <p>
                    <span className="text-slate-500">Assumptions:</span>{' '}
                    {[
                      affordabilityAssumptions.interestRateAnnual
                        ? `${affordabilityAssumptions.interestRateAnnual}% interest`
                        : null,
                      affordabilityAssumptions.termMonths
                        ? `${affordabilityAssumptions.termMonths} months`
                        : null,
                      affordabilityAssumptions.maxRepaymentRatio
                        ? `${Math.round(affordabilityAssumptions.maxRepaymentRatio * 100)}% ratio`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' | ') || 'Not available'}
                  </p>
                  {affordabilityAssumptions.calcVersion ? (
                    <p>
                      <span className="text-slate-500">Calculation version:</span>{' '}
                      {affordabilityAssumptions.calcVersion}
                    </p>
                  ) : null}
                </>
              ) : null}
              {referral.manager ? (
                <p>
                  <span className="text-slate-500">Assigned manager:</span>{' '}
                  {referral.manager.displayName || `User #${referral.manager.userId}`}
                </p>
              ) : (
                <p>
                  <span className="text-slate-500">Assigned manager:</span> Pending assignment
                </p>
              )}
            </CardContent>
          </Card>

          <PayoutRulesDisclosure developmentId={Number(referral.development.developmentId)} />
        </div>

        <Card className="mt-5 border-primary/15 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Application and Supporting Documents
            </CardTitle>
            <CardDescription>
              Upload completed application documents here. Supporting files are
              {` ${transactionCopy.participantLower}`}-facing reference files.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-3">
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-semibold text-amber-950">Developer application documents</p>
                <p className="mt-1 text-xs text-amber-800">
                  Download the template, get it signed or completed, then upload the signed copy for manager review.
                </p>
                <div className="mt-3 space-y-2">
                  {developerApplicationDocuments.map((document: any) => (
                    <div
                      key={document.templateId}
                      className="rounded-md border border-amber-200 bg-white p-3 text-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-foreground">{document.documentLabel}</p>
                          <p className="text-xs text-muted-foreground">
                            Status: {String(document.status || 'pending').replace(/_/g, ' ')}
                          </p>
                          {document.submittedFileName ? (
                            <p className="text-xs text-muted-foreground">
                              Uploaded: {document.submittedFileName}
                            </p>
                          ) : null}
                        </div>
                        <Badge variant={document.status === 'verified' ? 'default' : 'secondary'}>
                          {document.status === 'verified'
                            ? 'Verified'
                            : document.status === 'received'
                              ? 'Uploaded'
                              : 'Needed'}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {document.templateFileUrl ? (
                          <Button asChild size="sm" variant="outline">
                            <a href={document.templateFileUrl} target="_blank" rel="noreferrer">
                              <Download className="mr-1 h-3.5 w-3.5" />
                              Download template
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Template pending upload</span>
                        )}
                        {document.submittedFileUrl ? (
                          <Button asChild size="sm" variant="outline">
                            <a href={document.submittedFileUrl} target="_blank" rel="noreferrer">
                              View uploaded file
                            </a>
                          </Button>
                        ) : null}
                        <label className="inline-flex cursor-pointer items-center rounded-md border border-primary/15 bg-white px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/5">
                          <UploadCloud className="mr-1 h-3.5 w-3.5" />
                          {uploadingTemplateId === Number(document.templateId) ? 'Uploading...' : 'Upload signed copy'}
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                            className="sr-only"
                            disabled={uploadingTemplateId === Number(document.templateId)}
                            onChange={event => {
                              const file = event.currentTarget.files?.[0] || null;
                              void handleApplicationDocumentUpload(document, file);
                              event.currentTarget.value = '';
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                  {!developerApplicationDocuments.length ? (
                    <p className="rounded border border-dashed border-amber-200 bg-white p-3 text-sm text-amber-800">
                      No developer application documents are configured for this referral yet.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-md border border-primary/15 bg-primary/5 p-3">
                <p className="text-sm font-semibold text-foreground">
                  {transactionCopy.applicationDocumentsTitle}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {transactionCopy.applicationDocumentsDescription}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {buyerApplicationDocuments.map((document: any) => (
                    <div key={document.templateId} className="rounded border border-primary/15 bg-white p-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-foreground">{document.documentLabel}</p>
                        <Badge variant={document.status === 'verified' ? 'default' : 'secondary'}>
                          {document.status === 'verified'
                            ? 'Verified'
                            : document.status === 'received'
                              ? 'Received'
                              : 'Needed'}
                        </Badge>
                      </div>
                      {document.submittedFileName ? (
                        <p className="mt-1 text-muted-foreground">{document.submittedFileName}</p>
                      ) : null}
                    </div>
                  ))}
                  {!buyerApplicationDocuments.length ? (
                    <p className="rounded border border-dashed bg-white p-3 text-sm text-muted-foreground sm:col-span-2">
                      {transactionCopy.noApplicationDocuments}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-md border border-primary/15 bg-white p-3">
              <p className="text-sm font-semibold text-foreground">Supporting documents</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {transactionCopy.supportingDocumentsDescription}
              </p>
              <div className="mt-3 space-y-2">
                {supportingDocuments.map((document: any) => (
                  <div key={document.templateId} className="rounded border border-primary/15 bg-surface p-2 text-sm">
                    <p className="font-medium text-foreground">{document.documentLabel}</p>
                    <p className="text-xs text-muted-foreground">{document.fileName || 'File pending upload'}</p>
                    {document.fileUrl ? (
                      <Button asChild size="sm" variant="outline" className="mt-2">
                        <a href={document.fileUrl} target="_blank" rel="noreferrer">
                          <Download className="mr-1 h-3.5 w-3.5" />
                          Open file
                        </a>
                      </Button>
                    ) : null}
                  </div>
                ))}
                {!supportingDocuments.length ? (
                  <p className="rounded border border-dashed p-3 text-sm text-muted-foreground">
                    No supporting files have been uploaded for this development yet.
                  </p>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-5 border-primary/15 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Timeline
            </CardTitle>
            <CardDescription>Latest referral lifecycle events.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(referral.timeline || []).map((event, index) => (
              <div key={`${event.at}-${index}`} className="rounded-md border border-primary/15 bg-primary/5/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{event.event}</p>
                  <Badge variant="secondary">{event.byRole}</Badge>
                </div>
                <p className="text-xs text-slate-500">{event.at}</p>
                {event.note ? <p className="mt-1 text-sm">{event.note}</p> : null}
              </div>
            ))}

            {!referral.timeline?.length ? (
              <p className="text-sm text-slate-500">No timeline events yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </ReferralAppShell>
  );
}
