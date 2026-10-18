import { useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { FileText, Loader2, UserRound, WalletCards } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

export default function PartnerReferralDetailPage() {
  const [match, params] = useRoute('/distribution/partner/referrals/:dealId');
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
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

  if (loading || referralQuery.isLoading || viewingsQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f3]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (referralQuery.error || viewingsQuery.error) {
    return (
      <ReferralAppShell>
        <main className="mx-auto w-full max-w-4xl px-4 pb-8 pt-6 md:px-7">
          <Card>
            <CardContent className="py-6 text-sm text-red-600">
              {referralQuery.error?.message || 'We could not confirm the latest viewing information. Refresh and try again.'}
            </CardContent>
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

  return (
    <ReferralAppShell>
      <main className="mx-auto w-full max-w-[1180px] px-4 pb-10 pt-6 md:px-7">
        <Card className="mb-5 overflow-hidden border-primary/15 bg-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 bg-gradient-to-br from-[var(--brand-blue)] via-[var(--info)] to-[var(--brand-blue-hover)] px-6 py-5 text-white">
            <div>
              <p className="text-[10px] font-semibold uppercase text-blue-100">My deal</p>
              <h1 className="mt-1 text-[28px] font-semibold">{referral.development.name}</h1>
              <p className="mt-2 text-[13px] text-[#ece6da]">Deal #{referral.dealId}</p>
            </div>
            <Badge className="bg-white text-primary hover:bg-white">{statusLabel}</Badge>
          </div>
          <CardContent className="flex flex-wrap gap-2 bg-primary/5 py-4">
            <Button variant="outline" onClick={() => setLocation('/distribution/partner/referrals')}>
              Back to my deals
            </Button>
            <Button variant="outline" onClick={() => setLocation('/distribution/partner/developments')}>
              Find opportunities
            </Button>
          </CardContent>
        </Card>

        <Card className="mb-5 border-primary/15 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <WalletCards className="h-4 w-4 text-primary" />
              Current progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
              {nextActionHint}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Last recorded update: {formatPartnerDateTime(referral.updatedAt)}
            </p>
            {referral.manager?.displayName ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Responsible contact: {referral.manager.displayName}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {['commission_pending', 'commission_paid'].includes(String(referral.status || '').toLowerCase()) ? (
                <Button size="sm" onClick={() => setLocation('/distribution/partner/payouts')}>
                  View referral payout
                </Button>
              ) : null}
              {referral.manager?.email ? (
                <Button
                  size="sm"
                  variant="conversion"
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
                  Contact the responsible team
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
                <span className="text-slate-500">Introduced:</span> {formatPartnerDateTime(referral.createdAt)}
              </p>
              {referral.marketMode ? (
                <p>
                  <span className="text-slate-500">Looking to:</span>{' '}
                  {referral.marketMode === 'sale' ? 'Buy' : 'Rent'}
                </p>
              ) : null}
              <p>
                <span className="text-slate-500">Person introduced:</span> {referral.buyer.name || 'Not provided'}
              </p>
              <p>
                <span className="text-slate-500">Phone:</span> {referral.buyer.phone || 'Not provided'}
              </p>
              <p>
                <span className="text-slate-500">Email:</span> {referral.buyer.email || 'Not provided'}
              </p>
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

          <PayoutRulesDisclosure
            developmentId={Number(referral.development.developmentId)}
            termsSnapshot={referral.programTermsSnapshot || null}
            historical
          />
        </div>

        <Card className="mt-5 border-primary/15 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Steps for this opportunity</CardTitle>
            <CardDescription>
              These steps were saved when this referral started. The responsible team updates each step as the deal progresses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {processSteps.length ? (
              <ol className="space-y-3">
                {processSteps.map((step: any, index: number) => (
                  <li key={`${String(step.stepKey || index)}-${index}`} className="flex items-start gap-3 rounded-md border border-primary/10 bg-white p-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-foreground">
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
                        <div className="mt-3 rounded-md bg-primary/5 p-3">
                          <p className="whitespace-pre-line text-sm text-foreground">
                            {progressByStepKey.get(String(step.stepKey)).partnerUpdate}
                          </p>
                          {progressByStepKey.get(String(step.stepKey))?.updatedAt ? (
                            <p className="mt-1 text-xs text-muted-foreground">
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
              <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                The saved process details could not be verified. Contact the responsible team for your next step.
              </p>
            ) : (
              <p className="rounded border border-dashed p-3 text-sm text-muted-foreground">
                The steps for this opportunity have not been added yet. Follow the recorded updates here for now.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="mt-5 border-primary/15 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Documents for this referral
            </CardTitle>
            <CardDescription>
              This checklist is saved from the referral’s original program requirements. Later program edits do not change it.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Secure file storage and delivery to the developer are not connected yet. The responsible team will coordinate the document handover for this referral.
              </p>
              {applicationDocuments.map((document: any) => (
                <div key={document.documentCode} className="rounded-md border border-primary/15 bg-white p-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">{document.documentLabel}</p>
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
                    <p className="mt-2 text-xs text-amber-800">
                      This saved requirement is no longer available in the document library. Contact the responsible team.
                    </p>
                  ) : null}
                  {document.status === 'received' || document.status === 'verified' ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      This records a Distribution team update. Developer receipt will be shown here when it is confirmed.
                    </p>
                  ) : null}
                </div>
              ))}
              {!applicationDocuments.length && documentRequirementsSnapshotAvailable ? (
                <p className="rounded border border-dashed p-3 text-sm text-muted-foreground">
                  No referral documents were required when this referral was submitted.
                </p>
              ) : null}
              {!applicationDocuments.length && !documentRequirementsSnapshotAvailable ? (
                <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  This older referral does not contain a saved document checklist. Contact the responsible team before uploading files.
                </p>
              ) : null}
            </div>

            <div className="rounded-md border border-primary/15 bg-white p-3">
              <p className="text-sm font-semibold text-foreground">Developer documents</p>
              <p className="mt-1 text-xs text-muted-foreground">
                No additional developer documents are available for this opportunity yet.
              </p>
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
                  <p className="font-medium">{formatPartnerDealEvent(event.event)}</p>
                  <Badge variant="secondary">{formatPartnerEventSource(event.byRole)}</Badge>
                </div>
                <p className="text-xs text-slate-500">{formatPartnerDateTime(event.at)}</p>
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
