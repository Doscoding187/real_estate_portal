import { useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PayoutRulesDisclosure } from '@/components/distribution/partner/PayoutRulesDisclosure';
import { toast } from 'sonner';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';

function base64ToBlob(base64: string, mimeType: string) {
  const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
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

  return (
    <ReferralAppShell>
      <main className="mx-auto w-full max-w-5xl px-4 pb-8 pt-6 md:px-7">
        <Card className="mb-4">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>{referral.development.name}</CardTitle>
                <CardDescription>Deal #{referral.dealId}</CardDescription>
              </div>
              <Badge>{referral.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setLocation('/distribution/partner/referrals')}>
              Back to My Referrals
            </Button>
            <Button variant="outline" onClick={() => setLocation('/distribution/partner/submit')}>
              Submit Another Referral
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

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Referral Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-slate-500">Created:</span> {referral.createdAt}
              </p>
              <p>
                <span className="text-slate-500">Buyer:</span> {referral.buyer.name || 'Not provided'}
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
              {referral.affordability?.purchasePriceEstimate ? (
                <p>
                  <span className="text-slate-500">Purchase price estimate:</span> R
                  {Number(referral.affordability.purchasePriceEstimate).toLocaleString('en-ZA')}
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

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Timeline</CardTitle>
            <CardDescription>Latest referral lifecycle events.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(referral.timeline || []).map((event, index) => (
              <div key={`${event.at}-${index}`} className="rounded border bg-white p-3">
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
