import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Loader2, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';
import {
  findScheduledPartnerViewing,
  formatPartnerDealStatus,
  formatPartnerDateTime,
  summarizePartnerReferralWorkflow,
  type PartnerViewingRecord,
} from '@/lib/distributionPartnerJourney';

type DealFilter = 'all' | 'in_progress' | 'closed';

function isClosed(statusValue: unknown) {
  return ['commission_paid', 'cancelled'].includes(String(statusValue || '').toLowerCase());
}

export default function PartnerMyReferralsPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<DealFilter>('all');

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) setLocation('/login');
  }, [isAuthenticated, loading, setLocation]);

  const referralsQuery = trpc.distribution.partner.listMyReferrals.useQuery(
    { limit: 100 },
    { enabled: isAuthenticated, retry: false },
  );
  const viewingsQuery = trpc.distribution.referrer.myViewings.useQuery(
    { includePast: true, limit: 500 },
    { enabled: isAuthenticated, retry: false },
  );

  const items = referralsQuery.data?.items || [];
  const recordedViewings = (viewingsQuery.data || []) as PartnerViewingRecord[];
  const filteredItems = useMemo(() => items.filter((item: any) => {
    if (filter === 'in_progress') return !isClosed(item.status);
    if (filter === 'closed') return isClosed(item.status);
    return true;
  }), [filter, items]);

  if (loading || referralsQuery.isLoading || viewingsQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <ReferralAppShell>
      <main className="mx-auto w-full max-w-[1180px] space-y-5 px-4 pb-10 pt-6 md:px-7">
        <Card className="overflow-hidden border-primary/15 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-[var(--brand-blue)] via-[var(--info)] to-[var(--brand-blue-hover)] px-5 py-6 text-white md:px-7">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">Your introductions</p>
            <h1 className="mt-2 text-3xl font-semibold">My deals</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50">
              See the latest status that has been recorded for each person you introduced. A viewing
              appears here only when a booking has been recorded.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="conversion" onClick={() => setLocation('/distribution/partner/developments')}>
                <Search className="mr-2 h-4 w-4" /> Find opportunities
              </Button>
              <Button
                variant="outline"
                className="border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white"
                onClick={() => setLocation('/distribution/partner/payouts')}
              >
                View referral payouts
              </Button>
            </div>
          </div>

          <CardContent className="flex flex-wrap items-center gap-2 bg-primary/5 py-4">
            {([
              ['all', 'All deals'],
              ['in_progress', 'In progress'],
              ['closed', 'Closed'],
            ] as const).map(([value, label]) => (
              <Button
                key={value}
                type="button"
                variant={filter === value ? 'default' : 'outline'}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
              </Button>
            ))}
          </CardContent>
        </Card>

        {referralsQuery.error || viewingsQuery.error ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="py-5 text-sm text-amber-900">
              We could not load the latest deal updates. Refresh and try again.
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-primary/15 bg-white shadow-sm">
          <CardContent className="divide-y divide-border p-5">
            {filteredItems.map((item: any) => {
              const dealId = Number(item.dealId);
              const scheduledViewing = findScheduledPartnerViewing(dealId, recordedViewings);
              const processSummary = summarizePartnerReferralWorkflow(item.workflowProgress);
              return (
                <article key={dealId} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-semibold text-foreground">
                      {item.development?.name || `Referral ${dealId}`}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.marketMode === 'rent' ? 'Rental' : 'Purchase'} · Deal #{dealId}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Updated {formatPartnerDateTime(item.updatedAt)}
                    </p>
                    {processSummary ? (
                      <p className="mt-2 max-w-2xl text-xs text-muted-foreground">
                        Saved process: {processSummary}
                      </p>
                    ) : null}
                    {scheduledViewing ? (
                      <p className="mt-2 text-xs font-medium text-primary">
                        {new Date(String(scheduledViewing.scheduledStartAt || '')).getTime() < Date.now()
                          ? `Viewing recorded for ${formatPartnerDateTime(scheduledViewing.scheduledStartAt)} — outcome update pending`
                          : `Viewing booked for ${formatPartnerDateTime(scheduledViewing.scheduledStartAt)}`}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {item.manager?.displayName
                        ? `Responsible contact: ${item.manager.displayName}`
                        : 'Responsible contact: Pending assignment'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {formatPartnerDealStatus(item.status, dealId, recordedViewings)}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/distribution/partner/referrals/${dealId}`)}
                    >
                      View deal
                    </Button>
                  </div>
                </article>
              );
            })}

            {!referralsQuery.error && filteredItems.length === 0 ? (
              <div className="py-8 text-center">
                <h2 className="font-semibold text-foreground">
                  {items.length ? 'No deals in this view' : 'Your introductions will appear here'}
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                  {items.length
                    ? 'Choose another filter to see the rest of your deals.'
                    : 'Explore current opportunities first. If someone wants to proceed, we will guide you through the permission and information steps.'}
                </p>
                {!items.length ? (
                  <Button className="mt-4" onClick={() => setLocation('/distribution/partner/developments')}>
                    Browse opportunities <Search className="ml-2 h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </ReferralAppShell>
  );
}
