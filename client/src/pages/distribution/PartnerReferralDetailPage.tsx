import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { FileText, Loader2, Mail, UserRound, WalletCards } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  downloadPrivateDocument,
  preparePrivateDocumentUpload,
} from '@/lib/privateDocumentUpload';
import { PayoutRulesDisclosure } from '@/components/distribution/partner/PayoutRulesDisclosure';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';
import {
  formatPartnerDealEvent,
  formatPartnerDealGuidance,
  formatPartnerDealStatus,
  formatPartnerDateTime,
  formatPartnerEventSource,
  formatPartnerProcessOwner,
  summarizeActivePartnerDealWorkflow,
  type PartnerViewingRecord,
} from '@/lib/distributionPartnerJourney';

function processStepTypeLabel(stepType: unknown) {
  const labels: Record<string, string> = {
    internal: 'Team step',
    document: 'Documents',
    bank: 'Home finance',
    decision: 'Decision',
    closure: 'Completion',
  };
  return labels[String(stepType || '').toLowerCase()] || 'Process step';
}

function dealStatusChipClass(statusValue: unknown) {
  const status = String(statusValue || '').toLowerCase();
  if (status === 'commission_paid') return 'border-[#cde9d2] bg-[#f5fcf6] text-[#2f8f4e]';
  if (['cancelled', 'lost', 'declined'].includes(status)) {
    return 'border-border bg-surface text-muted-foreground';
  }
  return 'border-[#cfe0f8] bg-[#eff5fe] text-[#33507e]';
}

export default function PartnerReferralDetailPage() {
  const [match, params] = useRoute('/distribution/partner/referrals/:dealId');
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [uploadingTemplateId, setUploadingTemplateId] = useState<number | null>(null);
  const [downloadingTemplateId, setDownloadingTemplateId] = useState<number | null>(null);
  const dealId = Number(params?.dealId || 0);

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
  const viewingsQuery = trpc.distribution.referrer.myViewings.useQuery(
    { includePast: true, limit: 500 },
    { enabled: isAuthenticated && match && dealId > 0, retry: false },
  );
  const submitDocumentMutation = trpc.distribution.partner.submitReferralDocument.useMutation();
  const downloadDocumentMutation = trpc.distribution.partner.downloadReferralDocument.useMutation();

  if (loading || referralQuery.isLoading || viewingsQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (referralQuery.error || viewingsQuery.error) {
    return (
      <ReferralAppShell>
        <main className="mx-auto w-full max-w-[1180px] px-4 pb-10 pt-7 md:px-7">
          <div className="rounded-xl border border-[#f5d9a8] bg-[#fffbf2] p-4 text-sm text-[#b07a1e] shadow-sm" role="alert">
            {referralQuery.error?.message || 'We could not confirm the latest viewing information. Refresh and try again.'}
          </div>
        </main>
      </ReferralAppShell>
    );
  }

  const referral = referralQuery.data;
  if (!referral) {
    return (
      <ReferralAppShell>
        <main className="mx-auto w-full max-w-[1180px] px-4 pb-10 pt-7 md:px-7">
          <div className="rounded-xl border border-border bg-white p-6 text-sm text-muted-foreground shadow-sm">
            Referral not found.
          </div>
        </main>
      </ReferralAppShell>
    );
  }

  const recordedViewings = (viewingsQuery.data || []) as PartnerViewingRecord[];
  const statusLabel = formatPartnerDealStatus(
    referral.status,
    Number(referral.dealId),
    recordedViewings,
  );
  const workflowProgress = (referral as any).workflowProgress;
  const processSummary = summarizeActivePartnerDealWorkflow(workflowProgress, referral.status);
  const nextActionHint = processSummary || formatPartnerDealGuidance(
    referral.status,
    Number(referral.dealId),
    recordedViewings,
  );
  const applicationDocuments = Array.isArray((referral as any).applicationDocuments)
    ? (referral as any).applicationDocuments
    : [];
  const processSteps = Array.isArray(workflowProgress?.steps) ? workflowProgress.steps : [];
  const progressByStepKey = new Map<string, any>(
    (Array.isArray(workflowProgress?.progress) ? workflowProgress.progress : []).map((item: any) => [
      String(item.stepKey),
      item,
    ]),
  );
  const documentRequirementsSnapshotAvailable = Array.isArray(
    (referral as any).programTermsSnapshot?.requiredDocuments,
  );

  async function handleUploadDocument(templateId: number, file: File) {
    setUploadingTemplateId(templateId);
    try {
      const payload = await preparePrivateDocumentUpload(file);
      await submitDocumentMutation.mutateAsync({
        dealId,
        templateId,
        file: payload,
      });
      await referralQuery.refetch();
      toast.success('Document uploaded securely.');
    } catch (error: any) {
      toast.error(error?.message || 'Could not upload the document.');
    } finally {
      setUploadingTemplateId(null);
    }
  }

  async function handleDownloadDocument(templateId: number) {
    setDownloadingTemplateId(templateId);
    try {
      const result = await downloadDocumentMutation.mutateAsync({ dealId, templateId });
      downloadPrivateDocument(result);
    } catch (error: any) {
      toast.error(error?.message || 'Could not retrieve the document.');
    } finally {
      setDownloadingTemplateId(null);
    }
  }

  return (
    <ReferralAppShell>
      <main className="mx-auto w-full max-w-[1180px] space-y-6 px-4 pb-10 pt-7 md:px-7">
        <section>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#cfe0f8] bg-[#eff5fe] px-3 py-1 text-[12px] font-medium text-[#1d6fe3]">
            <FileText className="h-3.5 w-3.5" /> My deal
          </span>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[30px] font-bold leading-tight tracking-[-0.02em] text-[#0b1c3f]">
                {referral.development.name}
              </h1>
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                Deal #{referral.dealId} · Introduced {formatPartnerDateTime(referral.createdAt)}
              </p>
            </div>
            <span
              className={cn(
                'rounded-full border px-3 py-1.5 text-[12px] font-medium',
                dealStatusChipClass(referral.status),
              )}
            >
              {statusLabel}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setLocation('/distribution/partner/referrals')}>
              Back to my deals
            </Button>
            <Button variant="outline" onClick={() => setLocation('/distribution/partner/developments')}>
              Find opportunities
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center gap-2">
            <WalletCards className="h-4 w-4 text-[#1d6fe3]" />
            <h2 className="text-[16px] font-semibold text-[#0b1c3f]">Current progress</h2>
          </div>
          <div className="mt-4 rounded-lg border border-[#cfe0f8] bg-[#eff5fe] p-3.5 text-sm text-[#33507e]">
            {nextActionHint}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Last recorded update: {formatPartnerDateTime(referral.updatedAt)}
          </p>
          {referral.manager?.displayName ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Responsible contact: {referral.manager.displayName}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {['commission_pending', 'commission_paid'].includes(String(referral.status || '').toLowerCase()) ? (
              <Button variant="conversion" size="sm" onClick={() => setLocation('/distribution/partner/payouts')}>
                View referral payout
              </Button>
            ) : null}
            {referral.manager?.email ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const subject = encodeURIComponent(
                    `Referral follow-up: Deal #${referral.dealId} - ${referral.development.name}`,
                  );
                  const body = encodeURIComponent(
                    `Hi,\n\nI am following up on deal #${referral.dealId}.\nCurrent progress: ${nextActionHint}\n\nThanks.`,
                  );
                  window.open(`mailto:${referral.manager?.email}?subject=${subject}&body=${body}`);
                }}
              >
                <Mail className="mr-1.5 h-3.5 w-3.5" /> Contact the responsible team
              </Button>
            ) : null}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-white p-5 shadow-sm md:p-6">
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-[#1d6fe3]" />
              <h2 className="text-[16px] font-semibold text-[#0b1c3f]">Referral Summary</h2>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Introduced:</span> {formatPartnerDateTime(referral.createdAt)}
              </p>
              {referral.marketMode ? (
                <p>
                  <span className="text-muted-foreground">Looking to:</span>{' '}
                  {referral.marketMode === 'sale' ? 'Buy' : 'Rent'}
                </p>
              ) : null}
              <p>
                <span className="text-muted-foreground">Person introduced:</span> {referral.buyer.name || 'Not provided'}
              </p>
              <p>
                <span className="text-muted-foreground">Phone:</span> {referral.buyer.phone || 'Not provided'}
              </p>
              <p>
                <span className="text-muted-foreground">Email:</span> {referral.buyer.email || 'Not provided'}
              </p>
              {referral.manager ? (
                <p>
                  <span className="text-muted-foreground">Assigned manager:</span>{' '}
                  {referral.manager.displayName || `User #${referral.manager.userId}`}
                </p>
              ) : (
                <p>
                  <span className="text-muted-foreground">Assigned manager:</span> Pending assignment
                </p>
              )}
            </div>
          </section>

          <PayoutRulesDisclosure
            developmentId={Number(referral.development.developmentId)}
            termsSnapshot={referral.programTermsSnapshot || null}
            historical
          />
        </div>

        <section className="rounded-xl border border-border bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-[16px] font-semibold text-[#0b1c3f]">Steps for this opportunity</h2>
          <p className="mt-0.5 text-[12.5px] leading-5 text-muted-foreground">
            These steps were saved when this referral started. The responsible team updates each step as the deal progresses.
          </p>
          <div className="mt-4">
            {processSteps.length ? (
              <ol className="space-y-3">
                {processSteps.map((step: any, index: number) => (
                  <li key={`${String(step.stepKey || index)}-${index}`} className="flex items-start gap-3 rounded-lg border border-border bg-white p-3.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e7f0fd] text-sm font-semibold text-[#1d6fe3]">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-[#0b1c3f]">
                          {String(step.stepLabel || 'Next step to be confirmed')}
                        </p>
                        <Badge variant={progressByStepKey.get(String(step.stepKey))?.status === 'completed' ? 'default' : 'secondary'}>
                          {{
                            not_started: 'Not started',
                            in_progress: 'In progress',
                            waiting: 'Waiting',
                            completed: 'Completed',
                            not_applicable: 'Not needed',
                          }[String(progressByStepKey.get(String(step.stepKey))?.status || 'not_started')] || 'Not started'}
                        </Badge>
                      </div>
                      <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                        {step.stepType ? <p>{processStepTypeLabel(step.stepType)}</p> : null}
                        <p>
                          {step.isBlocking === true || Number(step.isBlocking) === 1
                            ? 'Required to continue'
                            : 'As needed'}
                        </p>
                        {step.ownerRole ? <p>Handled by: {formatPartnerProcessOwner(step.ownerRole)}</p> : null}
                        {step.partnerInstructions ? (
                          <p className="whitespace-pre-line text-sm leading-5 text-foreground/80">
                            {step.partnerInstructions}
                          </p>
                        ) : null}
                      </div>
                      {progressByStepKey.get(String(step.stepKey))?.partnerUpdate ? (
                        <div className="mt-3 rounded-lg border border-[#cfe0f8] bg-[#eff5fe] p-3">
                          <p className="whitespace-pre-line text-sm text-[#33507e]">
                            {progressByStepKey.get(String(step.stepKey)).partnerUpdate}
                          </p>
                          {progressByStepKey.get(String(step.stepKey))?.updatedAt ? (
                            <p className="mt-1 text-xs text-[#33507e]/80">
                              Updated {formatPartnerDateTime(progressByStepKey.get(String(step.stepKey)).updatedAt)}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : workflowProgress === null ? (
              <p className="rounded-lg border border-[#f5d9a8] bg-[#fffbf2] p-3.5 text-sm text-[#b07a1e]">
                The saved process details could not be verified. Contact the responsible team for your next step.
              </p>
            ) : (
              <p className="rounded-lg border border-dashed border-border p-3.5 text-sm text-muted-foreground">
                The steps for this opportunity have not been added yet. Follow the recorded updates here for now.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#1d6fe3]" />
            <h2 className="text-[16px] font-semibold text-[#0b1c3f]">Documents for this referral</h2>
          </div>
          <p className="mt-0.5 text-[12.5px] leading-5 text-muted-foreground">
            This checklist is saved from the referral’s original program requirements. Later program edits do not change it.
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-3">
              <p className="rounded-lg border border-[#cfe0f8] bg-[#eff5fe] p-3.5 text-sm text-[#33507e]">
                Files are stored in private Distribution storage. Developer delivery is not connected yet.
              </p>
              {applicationDocuments.map((document: any) => {
                const templateId = Number(document.templateId);
                const hasTemplateId =
                  document.templateId !== null &&
                  document.templateId !== undefined &&
                  Number.isInteger(templateId) &&
                  templateId > 0;
                const canUpload =
                  hasTemplateId &&
                  document.status !== 'verified' &&
                  document.status !== 'unavailable';
                return (
                  <div key={document.documentCode} className="rounded-lg border border-border bg-white p-3.5 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[#0b1c3f]">{document.documentLabel}</p>
                        <p className="text-xs text-muted-foreground">{document.documentCode}</p>
                      </div>
                      <Badge variant={document.status === 'verified' ? 'default' : 'secondary'}>
                        {document.status === 'verified'
                          ? 'Verified by our team'
                          : document.status === 'received'
                            ? 'Received by our team'
                            : document.status === 'unavailable'
                              ? 'Needs team update'
                              : document.status === 'rejected'
                                ? 'Update needed'
                                : 'Needed'}
                      </Badge>
                    </div>
                    {document.status === 'unavailable' ? (
                      <p className="mt-2 text-xs text-[#b07a1e]">
                        This saved requirement is no longer available in the document library. Contact the responsible team.
                      </p>
                    ) : null}
                    {document.hasFile ? (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded border bg-surface p-2.5">
                        <p className="text-xs text-muted-foreground">
                          {document.submittedFileName || 'Secure file attached'}
                        </p>
                        {hasTemplateId ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={downloadingTemplateId === templateId}
                            onClick={() => void handleDownloadDocument(templateId)}
                          >
                            {downloadingTemplateId === templateId ? 'Opening…' : 'Download'}
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                    {canUpload ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent">
                          {uploadingTemplateId === templateId
                            ? 'Uploading…'
                            : document.hasFile
                              ? 'Replace file'
                              : 'Upload file'}
                          <input
                            type="file"
                            className="sr-only"
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            disabled={uploadingTemplateId === templateId}
                            onChange={event => {
                              const file = event.target.files?.[0];
                              event.target.value = '';
                              if (file) {
                                void handleUploadDocument(templateId, file);
                              }
                            }}
                          />
                        </label>
                        <span className="text-xs text-muted-foreground">PDF, JPEG, PNG or WebP · max 10 MB</span>
                      </div>
                    ) : null}
                    {document.status === 'received' || document.status === 'verified' ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        This file is held privately for the Distribution team. Developer receipt will be shown here when it is confirmed.
                      </p>
                    ) : null}
                  </div>
                );
              })}
              {!applicationDocuments.length && documentRequirementsSnapshotAvailable ? (
                <p className="rounded-lg border border-dashed border-border p-3.5 text-sm text-muted-foreground">
                  No referral documents were required when this referral was submitted.
                </p>
              ) : null}
              {!applicationDocuments.length && !documentRequirementsSnapshotAvailable ? (
                <p className="rounded-lg border border-[#f5d9a8] bg-[#fffbf2] p-3.5 text-sm text-[#b07a1e]">
                  This older referral does not contain a saved document checklist. Contact the responsible team before uploading files.
                </p>
              ) : null}
            </div>

            <div className="rounded-lg border border-border bg-surface p-3.5">
              <p className="text-sm font-semibold text-[#0b1c3f]">Developer documents</p>
              <p className="mt-1 text-xs text-muted-foreground">
                No additional developer documents are available for this opportunity yet.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#1d6fe3]" />
            <h2 className="text-[16px] font-semibold text-[#0b1c3f]">Timeline</h2>
          </div>
          <p className="mt-0.5 text-[12.5px] leading-5 text-muted-foreground">Latest referral lifecycle events.</p>
          <div className="mt-4 space-y-2">
            {(referral.timeline || []).map((event, index) => (
              <div key={`${event.at}-${index}`} className="rounded-lg border border-border bg-surface p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-[#0b1c3f]">{formatPartnerDealEvent(event.event)}</p>
                  <Badge variant="secondary">{formatPartnerEventSource(event.byRole)}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{formatPartnerDateTime(event.at)}</p>
                {event.note ? <p className="mt-1 text-sm">{event.note}</p> : null}
              </div>
            ))}

            {!referral.timeline?.length ? (
              <p className="text-sm text-muted-foreground">No timeline events yet.</p>
            ) : null}
          </div>
        </section>
      </main>
    </ReferralAppShell>
  );
}
