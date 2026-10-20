import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';
import { Button } from '@/components/ui/button';
import { readSavedSelections } from '@/components/distribution/PropertyOpportunityShortlist';
import {
  formatPartnerDateTime,
  getPartnerPayoutRecordState,
  type PartnerViewingRecord,
} from '@/lib/distributionPartnerJourney';
import {
  ArrowRight,
  Bell,
  Calculator,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FolderOpen,
  Home,
  Info,
  Loader2,
  Search,
  ShieldCheck,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';

function formatPayoutTotals(amounts: Record<string, number>) {
  const totals = Object.entries(amounts)
    .filter(([, amount]) => Number.isFinite(amount) && amount > 0)
    .map(([currency, amount]) =>
      currency === 'ZAR'
        ? `R ${Math.round(amount).toLocaleString('en-ZA')}`
        : `${currency} ${Math.round(amount).toLocaleString('en-US')}`,
    );
  return totals.length ? totals.join(' · ') : 'Amount not recorded';
}

function JourneyStep({
  step,
  icon,
  title,
  points,
}: {
  step: number;
  icon: ReactNode;
  title: string;
  points: string[];
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#c7dbf5] bg-[#eef4fd] text-[12px] font-semibold text-[#1d6fe3]">
          {step}
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg text-[#1d6fe3]">{icon}</span>
      </div>
      <p className="mt-2 text-[15px] font-semibold text-[#0b1c3f]">{title}</p>
      <ul className="mt-1.5 space-y-1 text-[13px] leading-5 text-muted-foreground">
        {points.map(point => (
          <li key={point} className="flex items-start gap-2">
            <span className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type ActivityTone = 'attention' | 'progress' | 'payouts';

const ACTIVITY_TONE_CLASSES: Record<ActivityTone, { card: string; icon: string }> = {
  attention: { card: 'border-[#f5d9a8] bg-[#fffbf2]', icon: 'bg-[#fbe7c3] text-[#b07a1e]' },
  progress: { card: 'border-border bg-white', icon: 'bg-[#dbeafe] text-[#1d6fe3]' },
  payouts: { card: 'border-[#cde9d2] bg-[#f5fcf6]', icon: 'bg-[#d8f0dd] text-[#2f8f4e]' },
};

function ActivityCard({
  tone,
  icon,
  title,
  tag,
  value,
  caption,
  onClick,
}: {
  tone: ActivityTone;
  icon: ReactNode;
  title: string;
  tag?: string;
  value: string;
  caption: string;
  onClick: () => void;
}) {
  const toneClasses = ACTIVITY_TONE_CLASSES[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-xl border p-5 text-left shadow-sm transition hover:shadow-md',
        toneClasses.card,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            toneClasses.icon,
          )}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[15px] font-semibold text-[#0b1c3f]">{title}</p>
            {tag ? (
              <span className="rounded-full border border-border bg-white/70 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {tag}
              </span>
            ) : null}
            <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-[#0b1c3f]">{value}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{caption}</p>
        </div>
      </div>
    </button>
  );
}

export default function PartnerDashboardPage() {
  const { isAuthenticated, loading, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) setLocation('/login?next=/distribution/partner/overview');
  }, [isAuthenticated, loading, setLocation]);

  const statusQuery = trpc.distribution.referrer.status.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    refetchOnMount: 'always',
  });
  const hasDistributionIdentity = statusQuery.data?.hasIdentity === true;

  const pipelineQuery = trpc.distribution.referrer.myPipeline.useQuery(
    { limit: 500 },
    { enabled: isAuthenticated && hasDistributionIdentity, retry: false },
  );
  const viewingsQuery = trpc.distribution.referrer.myViewings.useQuery(
    { includePast: true, limit: 500 },
    { enabled: isAuthenticated && hasDistributionIdentity, retry: false },
  );
  const payoutsQuery = trpc.distribution.referrer.myCommissionEntries.useQuery(
    { limit: 500 },
    { enabled: isAuthenticated && hasDistributionIdentity, retry: false },
  );

  const deals = pipelineQuery.data?.deals || [];
  const activeDeals = useMemo(
    () => deals.filter(deal => !['commission_paid', 'cancelled'].includes(String(deal.currentStage))),
    [deals],
  );
  const recordedViewings = (viewingsQuery.data || []) as PartnerViewingRecord[];
  const upcomingViewings = useMemo(
    () =>
      recordedViewings
        .filter(
          (viewing: any) =>
            viewing.status === 'scheduled' &&
            new Date(String(viewing.scheduledStartAt)).getTime() >= Date.now(),
        )
        .sort(
          (a: any, b: any) =>
            new Date(String(a.scheduledStartAt)).getTime() - new Date(String(b.scheduledStartAt)).getTime(),
        ),
    [recordedViewings],
  );
  const payoutSummary = useMemo(() => {
    const counts = { potential: 0, pending: 0, approved: 0, paid: 0, needsReview: 0 };
    const amounts: Record<'potential' | 'pending' | 'approved' | 'paid', Record<string, number>> = {
      potential: {},
      pending: {},
      approved: {},
      paid: {},
    };
    for (const entry of payoutsQuery.data || []) {
      const state = getPartnerPayoutRecordState(entry.entryStatus, entry.dealStage);
      const currency = String(entry.currency || 'ZAR').trim().toUpperCase();
      const amount = Number(entry.commissionAmount);
      if (state === 'potential') counts.potential += 1;
      if (state === 'pending_approval') counts.pending += 1;
      if (state === 'approved') counts.approved += 1;
      if (state === 'paid') counts.paid += 1;
      if (state === 'needs_review') counts.needsReview += 1;
      const bucket = state === 'potential'
        ? 'potential'
        : state === 'pending_approval'
          ? 'pending'
          : state === 'approved'
            ? 'approved'
            : state === 'paid'
              ? 'paid'
              : null;
      if (bucket && currency && Number.isFinite(amount) && amount > 0) {
        amounts[bucket][currency] = (amounts[bucket][currency] || 0) + amount;
      }
    }
    return { counts, amounts };
  }, [payoutsQuery.data]);

  const [savedShortlistCount, setSavedShortlistCount] = useState(0);
  useEffect(() => {
    const scope = user?.id ?? 'unknown';
    let total = 0;
    for (const mode of ['sale', 'rent'] as const) {
      total += Object.keys(
        readSavedSelections(`property-listify:distribution-shortlist:v1:partner:${scope}:${mode}`),
      ).length;
    }
    setSavedShortlistCount(total);
  }, [user?.id]);

  const queryError = statusQuery.isError ||
    (hasDistributionIdentity && (
      pipelineQuery.isError || payoutsQuery.isError || viewingsQuery.isError
    ));
  const showLoading = loading || statusQuery.isLoading || (hasDistributionIdentity && (
    pipelineQuery.isLoading || payoutsQuery.isLoading || viewingsQuery.isLoading
  ));

  if (showLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  if (queryError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface px-4">
        <div className="w-full max-w-xl rounded-xl border border-border bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-foreground">Your network could not be loaded</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Try again to load your opportunities, deals, and referral payouts.
          </p>
          <Button className="mt-5" variant="outline" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </div>
      </main>
    );
  }

  if (!hasDistributionIdentity) {
    const networkEnabled = statusQuery.data?.networkEnabled !== false;
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
        <div className="w-full max-w-2xl rounded-xl border border-border bg-white p-6 shadow-sm sm:p-9">
          <div className="mx-auto max-w-xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1d6fe3]">
              Property Listify Distribution Network
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              {networkEnabled ? 'Request access to refer people' : 'The network is temporarily unavailable'}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {networkEnabled
                ? 'Distribution membership is separate from an Agent OS subscription. Once approved, you will receive a Distribution ID and can follow the people you introduce using this same login.'
                : 'The Distribution Network is not accepting access requests right now. Your account and any agent workspace access are unchanged.'}
            </p>
            {networkEnabled ? (
              <div className="mt-6 flex justify-center">
                <Button onClick={() => setLocation('/distribution-network/apply')}>
                  Apply for access <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : null}
            {user?.role === 'agent' ? (
              <p className="mt-4 text-xs text-muted-foreground">
                Your agent subscription and Distribution membership are managed separately.
              </p>
            ) : null}
          </div>
        </div>
      </main>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const attention = (() => {
    if (payoutSummary.counts.needsReview > 0) {
      return {
        value: String(payoutSummary.counts.needsReview),
        caption:
          'Referral payout records need a team check. The team will confirm how they fit together.',
        href: '/distribution/partner/payouts',
      };
    }
    if (upcomingViewings.length > 0) {
      const next = upcomingViewings[0] as any;
      return {
        value: String(upcomingViewings.length),
        caption: `Next: ${next.developmentName || 'Property viewing'} · ${formatPartnerDateTime(next.scheduledStartAt)}`,
        href: `/distribution/partner/referrals/${Number(next.dealId)}`,
      };
    }
    return {
      value: '—',
      caption: "No outstanding actions. Confirmed requests will appear here.",
      href: '/distribution/partner/referrals',
    };
  })();

  const payoutCard = (() => {
    const { counts, amounts } = payoutSummary;
    if (counts.paid > 0) {
      return {
        value: formatPayoutTotals(amounts.paid),
        caption: `${counts.paid} confirmed payment record${counts.paid === 1 ? '' : 's'}.`,
      };
    }
    if (counts.approved > 0) {
      return {
        value: formatPayoutTotals(amounts.approved),
        caption: 'Approved for payment · no estimated date is recorded.',
      };
    }
    if (counts.pending > 0) {
      return { value: formatPayoutTotals(amounts.pending), caption: 'Awaiting team approval.' };
    }
    if (counts.potential > 0) {
      return {
        value: formatPayoutTotals(amounts.potential),
        caption: 'Potential only — not yet payable.',
      };
    }
    return { value: '—', caption: 'No confirmed payouts yet.' };
  })();

  return (
    <ReferralAppShell>
      <main className="mx-auto w-full max-w-[1180px] space-y-6 px-4 pb-10 pt-7 md:px-7">
        <section>
          <p className="text-[13px] font-medium text-muted-foreground">{greeting}</p>
          <h1 className="mt-1 text-[30px] font-bold leading-tight tracking-[-0.02em] text-[#0b1c3f]">
            Turn introductions into property opportunities.
          </h1>
          <p className="mt-2 max-w-3xl text-[15px] leading-6 text-muted-foreground">
            Find a real option that fits someone you know, share a shortlist, and follow confirmed
            progress.
          </p>
        </section>

        <section className="rounded-xl border border-border bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e7f0fd] text-[#1d6fe3]">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-[#0b1c3f]">Start with the person you have in mind</h2>
              <p className="mt-1 text-[13.5px] leading-5 text-muted-foreground">
                Follow a simple 3-step process to find suitable opportunities and move forward when
                they're ready.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-start">
            <JourneyStep
              step={1}
              icon={<User className="h-5 w-5" />}
              title="Understand their needs"
              points={['Buy or rent', 'Preferred area', 'Property type']}
            />
            <ArrowRight className="mt-3 hidden h-4 w-4 shrink-0 text-[#c7dbf5] md:block" />
            <JourneyStep
              step={2}
              icon={<Home className="h-5 w-5" />}
              title="Find suitable properties"
              points={['Current sale and rental options', 'Preliminary affordability (not active yet)']}
            />
            <ArrowRight className="mt-3 hidden h-4 w-4 shrink-0 text-[#c7dbf5] md:block" />
            <JourneyStep
              step={3}
              icon={<ClipboardCheck className="h-5 w-5" />}
              title="Introduce when they're ready"
              points={['Permission first', 'Track confirmed progress']}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="conversion" onClick={() => setLocation('/distribution/partner/developments')}>
              <Search className="mr-2 h-4 w-4" /> Find opportunities
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation('/distribution/partner/how-it-works')}
            >
              <Info className="mr-2 h-4 w-4" /> How it works
            </Button>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-[#0b1c3f]">Your activity</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <ActivityCard
              tone="attention"
              icon={<Bell className="h-5 w-5" />}
              title="Needs your attention"
              value={attention.value}
              caption={attention.caption}
              onClick={() => setLocation(attention.href)}
            />
            <ActivityCard
              tone="progress"
              icon={<Clock className="h-5 w-5" />}
              title="Deals in progress"
              value={activeDeals.length > 0 ? String(activeDeals.length) : '—'}
              caption={
                activeDeals.length > 0
                  ? 'Introductions still moving through their recorded steps.'
                  : 'Your introductions will appear here. Updates appear when recorded.'
              }
              onClick={() => setLocation('/distribution/partner/referrals')}
            />
            <ActivityCard
              tone="payouts"
              icon={<TrendingUp className="h-5 w-5" />}
              title="Referral payouts"
              tag="Based on programme terms"
              value={payoutCard.value}
              caption={payoutCard.caption}
              onClick={() => setLocation('/distribution/partner/payouts')}
            />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-white p-5 shadow-sm md:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e7f0fd] text-[#1d6fe3]">
                <Calculator className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-[#0b1c3f]">Check fit before you refer</h2>
                <p className="mt-1 text-[13.5px] leading-5 text-muted-foreground">
                  Get a preliminary estimate and see what might be available. This is not a lender
                  decision.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="text-[12px] font-medium text-muted-foreground">Monthly income</span>
                <input
                  type="text"
                  disabled
                  placeholder="Optional"
                  aria-label="Monthly income"
                  className="mt-1.5 h-10 w-full cursor-not-allowed rounded-lg border border-border bg-surface px-3 text-sm text-muted-foreground"
                />
              </label>
              <label className="block">
                <span className="text-[12px] font-medium text-muted-foreground">Deposit</span>
                <input
                  type="text"
                  disabled
                  placeholder="Optional"
                  aria-label="Deposit"
                  className="mt-1.5 h-10 w-full cursor-not-allowed rounded-lg border border-border bg-surface px-3 text-sm text-muted-foreground"
                />
              </label>
              <div>
                <span className="text-[12px] font-medium text-muted-foreground">Looking to</span>
                <div className="mt-1.5 grid h-10 grid-cols-2 items-center rounded-lg border border-border bg-surface p-1">
                  <button
                    type="button"
                    disabled
                    className="cursor-not-allowed rounded-md bg-white text-[13px] font-semibold text-[#0b1c3f] shadow-sm"
                  >
                    Buy
                  </button>
                  <button
                    type="button"
                    disabled
                    className="cursor-not-allowed text-[13px] font-medium text-muted-foreground"
                  >
                    Rent
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-[#cfe0f8] bg-[#eff5fe] p-3">
              <Info className="h-4 w-4 shrink-0 text-[#1d6fe3]" />
              <p className="min-w-0 flex-1 text-[12.5px] leading-5 text-[#33507e]">
                Preliminary affordability is not active yet. Browse by listed price, area, and
                bedrooms while the approved assessment model is pending. This is not a lender
                decision.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="border-[#9cc0ee] bg-white text-[#1d6fe3]"
                onClick={() => setLocation('/distribution/partner/developments')}
              >
                Browse opportunities
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-lg font-semibold text-[#0b1c3f]">Continue your journey</h2>
            <div className="mt-2 divide-y divide-border">
              <div className="flex flex-wrap items-center gap-4 py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eef4fd] text-[#1d6fe3]">
                  <FolderOpen className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-[#0b1c3f]">Property shortlists</p>
                  <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">
                    Explore options before sharing someone's details.
                    {savedShortlistCount > 0
                      ? ` ${savedShortlistCount} saved on this device.`
                      : ''}
                  </p>
                </div>
                <Button
                  variant="conversion"
                  className="ml-auto"
                  onClick={() => setLocation('/distribution/partner/developments')}
                >
                  Explore opportunities <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-4 py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eef4fd] text-[#1d6fe3]">
                  <TrendingUp className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-[#0b1c3f]">My introductions</p>
                  <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">
                    Follow each confirmed update and next action.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="ml-auto"
                  onClick={() => setLocation('/distribution/partner/referrals')}
                >
                  View my deals <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="flex items-center gap-3 rounded-xl border border-[#cdddf4] bg-[#f4f8ff] p-4">
          <ShieldCheck className="h-5 w-5 shrink-0 text-[#1d6fe3]" />
          <p className="text-[13px] leading-5 text-[#33507e]">
            Explore first. Share someone's personal details only with their permission. Progress and
            referral payouts appear when verified.
          </p>
        </div>
      </main>
    </ReferralAppShell>
  );
}
