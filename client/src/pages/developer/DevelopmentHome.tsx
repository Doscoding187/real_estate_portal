import { useState } from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import { ArrowLeft, ExternalLink, Pencil, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';

const lifecycleLabels = {
  live: 'Live',
  approved_private: 'Approved — private',
  in_review: 'In review',
  changes_required: 'Changes required',
  rejected: 'Rejected',
  draft_ready_to_submit: 'Draft — ready to submit',
  draft_action_required: 'Draft — action required',
} as const;

const lifecycleClasses = {
  live: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  approved_private: 'bg-blue-100 text-blue-800 border-blue-200',
  in_review: 'bg-amber-100 text-amber-800 border-amber-200',
  changes_required: 'bg-orange-100 text-orange-800 border-orange-200',
  rejected: 'bg-rose-100 text-rose-800 border-rose-200',
  draft_ready_to_submit: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  draft_action_required: 'bg-slate-100 text-slate-700 border-slate-200',
} as const;

const readinessExplanations = {
  live: 'This development is approved and publicly visible on Listify.',
  approved_private: 'Approval remains valid, but this development is not publicly visible.',
  in_review: 'Awaiting review',
  changes_required: 'Changes were requested before this development can be resubmitted.',
  rejected:
    'This submission was rejected. Review the reason and update the development in the editor.',
  draft_ready_to_submit:
    'Persisted submission requirements are currently satisfied. Submission remains subject to review.',
  draft_action_required: 'Persisted submission requirements need attention before submission.',
} as const;

const rangeLabels = {
  '7d': 'last 7 days',
  '30d': 'last 30 days',
  '90d': 'last 90 days',
} as const;

const funnelStages = [
  { key: 'new', label: 'New', crmStage: 'new' },
  { key: 'contacted', label: 'Contacted', crmStage: 'contacted' },
  { key: 'qualified', label: 'Qualified', crmStage: 'qualified' },
  { key: 'viewing', label: 'Viewing', crmStage: 'viewing' },
  { key: 'offer', label: 'Offer', crmStage: 'offer' },
  { key: 'dealInProgress', label: 'Deal in progress', crmStage: 'deal' },
  { key: 'closedWon', label: 'Closed won', crmStage: 'won' },
  { key: 'closedLost', label: 'Closed lost', crmStage: 'lost' },
] as const;

function leadStageCrmFilter(stage: string) {
  if (stage === 'viewing_scheduled' || stage === 'viewing_completed') return 'viewing';
  if (stage === 'offer_made') return 'offer';
  if (stage === 'deal_in_progress') return 'deal';
  if (stage === 'closed_won') return 'won';
  if (stage === 'closed_lost' || stage === 'spam' || stage === 'duplicate' || stage === 'archived')
    return 'lost';
  return stage;
}

function formatTimestamp(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function formatAmount(value: number | null) {
  return value === null
    ? 'Not available'
    : new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: 'ZAR',
        maximumFractionDigits: 0,
      }).format(value);
}

function DevelopmentHomeLoading() {
  return (
    <div className="space-y-6" aria-label="Loading Development Home">
      <div className="h-10 w-48 animate-pulse rounded bg-slate-200" />
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="h-8 w-2/3 animate-pulse rounded bg-slate-200" />
          <div className="h-5 w-1/2 animate-pulse rounded bg-slate-100" />
          <div className="h-10 w-full animate-pulse rounded bg-slate-100 sm:w-96" />
        </CardContent>
      </Card>
    </div>
  );
}

function PrivateNotFound() {
  return (
    <Card>
      <CardContent className="space-y-4 p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Development not found</h1>
        <p className="text-sm text-slate-600">
          This development is unavailable in your current workspace.
        </p>
        <Link
          href="/developer/developments"
          className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to developments
        </Link>
      </CardContent>
    </Card>
  );
}

function DevelopmentHomeError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Unable to load Development Home</h1>
        <p className="text-sm text-slate-600">Please try again. No development data was loaded.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={onRetry}>Retry</Button>
          <Link
            href="/developer/developments"
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Back to developments
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DevelopmentHome() {
  const [, params] = useRoute('/developer/developments/:developmentId');
  const [, setLocation] = useLocation();
  const developmentId = Number(params?.developmentId);
  const hasValidDevelopmentId = Number.isInteger(developmentId) && developmentId > 0;
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const homeQuery = trpc.developer.getDevelopmentHome.useQuery(
    { developmentId, range },
    { enabled: hasValidDevelopmentId, retry: false, refetchOnWindowFocus: false },
  );

  if (!hasValidDevelopmentId) return <PrivateNotFound />;
  if (homeQuery.isLoading) return <DevelopmentHomeLoading />;
  if (homeQuery.error?.data?.code === 'NOT_FOUND') return <PrivateNotFound />;
  if (homeQuery.error || !homeQuery.data)
    return <DevelopmentHomeError onRetry={homeQuery.refetch} />;

  const { development, demand, funnel, inventory } = homeQuery.data;
  const selectedRangeLabel = rangeLabels[demand.range];
  const location = [
    development.location.suburb,
    development.location.city,
    development.location.province,
  ]
    .filter(Boolean)
    .join(', ');
  const lifecycleState = development.lifecycleState;
  const { readiness } = homeQuery.data;
  const latestSubmittedAt = formatTimestamp(readiness.latestReview?.submittedAt);
  const latestReviewedAt = formatTimestamp(readiness.latestReview?.reviewedAt);
  const publishedAt = formatTimestamp(development.publishedAt);
  const openEditor = () => setLocation(`/developer/create-development?id=${development.id}`);
  const openLeads = (params: Record<string, string | number | undefined> = {}) => {
    const search = new URLSearchParams({
      developmentId: String(development.id),
      range: demand.range,
    });
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) search.set(key, String(value));
    }
    setLocation(`/developer/leads?${search.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/developer/developments"
            className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Developments
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Development Home</h1>
        </div>
        <Badge className={lifecycleClasses[lifecycleState]}>
          {lifecycleLabels[lifecycleState]}
        </Badge>
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl">{development.name}</CardTitle>
            <p className="text-sm text-slate-600">
              {location || development.location.address || 'Location not available'}
            </p>
            <p className="text-sm capitalize text-slate-500">
              {development.transactionType.replace('_', ' ')}
            </p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={openEditor}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit development
          </Button>
          <Button variant="outline" onClick={() => openLeads()}>
            <Users className="mr-2 h-4 w-4" />
            Open leads
          </Button>
          {development.publicEligible && development.slug ? (
            <Button
              variant="outline"
              onClick={() => setLocation(`/development/${development.slug}`)}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View public page
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Market Readiness</CardTitle>
            <p className="text-sm text-slate-600">{readinessExplanations[readiness.state]}</p>
          </div>
          <Badge className={lifecycleClasses[readiness.state]}>
            {lifecycleLabels[readiness.state]}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-5">
          {(publishedAt || latestSubmittedAt || latestReviewedAt) && (
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              {publishedAt && (
                <div>
                  <dt className="text-slate-500">Published</dt>
                  <dd className="font-medium text-slate-900">{publishedAt}</dd>
                </div>
              )}
              {latestSubmittedAt && (
                <div>
                  <dt className="text-slate-500">Submitted</dt>
                  <dd className="font-medium text-slate-900">{latestSubmittedAt}</dd>
                </div>
              )}
              {latestReviewedAt && (
                <div>
                  <dt className="text-slate-500">Reviewed</dt>
                  <dd className="font-medium text-slate-900">{latestReviewedAt}</dd>
                </div>
              )}
            </dl>
          )}

          {readiness.latestReview?.feedback && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-900">Review feedback</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                {readiness.latestReview.feedback}
              </p>
            </div>
          )}

          {readiness.blockers.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-900">Submission blockers</p>
              <ul className="mt-2 space-y-2">
                {readiness.blockers.map(blocker => (
                  <li
                    key={`${blocker.field}-${blocker.message}`}
                    className="rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-900"
                  >
                    {blocker.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {readiness.recentReviewHistory.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-900">Recent review events</p>
              <ol className="mt-2 space-y-2">
                {readiness.recentReviewHistory.slice(0, 3).map((event, index) => (
                  <li
                    key={`${event.status}-${event.submittedAt}-${index}`}
                    className="rounded-md border border-slate-100 px-3 py-2 text-sm"
                  >
                    <p className="font-medium text-slate-900">{event.status.replace('_', ' ')}</p>
                    <p className="text-slate-600">Submitted {formatTimestamp(event.submittedAt)}</p>
                    {event.reviewedAt && (
                      <p className="text-slate-600">Reviewed {formatTimestamp(event.reviewedAt)}</p>
                    )}
                    {event.feedback && <p className="mt-1 text-slate-700">{event.feedback}</p>}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {readiness.state === 'live' && development.publicEligible && development.slug ? (
              <Button
                variant="outline"
                onClick={() => setLocation(`/development/${development.slug}`)}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View public page
              </Button>
            ) : readiness.state === 'in_review' ? (
              <Button variant="outline" onClick={openEditor}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit development
              </Button>
            ) : (
              <Button onClick={openEditor}>
                <Pencil className="mr-2 h-4 w-4" />
                {readiness.state === 'draft_ready_to_submit'
                  ? 'Open editor to submit'
                  : 'Open editor'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Aggregate Inventory</CardTitle>
            <p className="text-sm text-slate-600">
              Figures reflect the aggregate unit-type catalogue configured in Listify.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={openEditor}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit catalogue
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          {inventory.catalogueState === 'not_configured' ? (
            <p className="text-sm text-slate-600">Aggregate catalogue not configured.</p>
          ) : inventory.catalogueState === 'land_not_required' ? (
            <p className="text-sm text-slate-600">
              Aggregate catalogue is not required for this land development.
            </p>
          ) : (
            <>
              <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <dt className="text-slate-600">Active unit types</dt>
                  <dd className="font-semibold text-slate-950">{inventory.activeUnitTypeCount}</dd>
                </div>
                <div>
                  <dt className="text-slate-600">Aggregate total</dt>
                  <dd className="font-semibold text-slate-950">
                    {inventory.totalUnits ?? 'Not available'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-600">Aggregate available</dt>
                  <dd className="font-semibold text-slate-950">
                    {inventory.availableUnits ?? 'Not available'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-600">Aggregate reserved</dt>
                  <dd className="font-semibold text-slate-950">
                    {inventory.reservedUnits ?? 'Not available'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-600">Derived aggregate sold</dt>
                  <dd className="font-semibold text-slate-950">
                    {inventory.derivedSoldUnits ?? 'Not available'}
                  </dd>
                </div>
              </dl>
              {inventory.availableUnits === 0 && (
                <p className="text-sm text-amber-800">0 aggregate units are marked available.</p>
              )}
              {inventory.pricing.kind === 'sale' && (
                <p className="text-sm text-slate-700">
                  Sale pricing: {formatAmount(inventory.pricing.from)} to{' '}
                  {formatAmount(inventory.pricing.to)}
                </p>
              )}
              {inventory.pricing.kind === 'rent' && (
                <p className="text-sm text-slate-700">
                  Monthly rent: {formatAmount(inventory.pricing.from)} to{' '}
                  {formatAmount(inventory.pricing.to)}
                </p>
              )}
              {development.transactionType === 'auction' && (
                <p className="text-sm text-slate-700">
                  Auction terms are configured for {inventory.auctionTermsConfiguredCount} of{' '}
                  {inventory.activeUnitTypeCount} active unit types.
                </p>
              )}
              {inventory.pricing.kind === 'auction' && (
                <div className="text-sm text-slate-700">
                  <p>
                    Starting bids: {formatAmount(inventory.pricing.from)} to{' '}
                    {formatAmount(inventory.pricing.to)}
                  </p>
                </div>
              )}
            </>
          )}
          {inventory.warnings.length > 0 && (
            <ul className="space-y-2" aria-label="Inventory warnings">
              {inventory.warnings.map(warning => (
                <li
                  key={warning.code}
                  className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                >
                  {warning.message}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <section className="space-y-4" aria-label="Captured demand and sales funnel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              Captured demand and sales funnel
            </h2>
            <p className="text-sm text-slate-600">
              Listify-captured leads attached to this development during the selected period.
            </p>
          </div>
          <div
            className="flex gap-1 rounded-md border border-slate-200 p-1"
            aria-label="Selected period"
          >
            {(Object.keys(rangeLabels) as Array<keyof typeof rangeLabels>).map(value => (
              <Button
                key={value}
                size="sm"
                variant={range === value ? 'default' : 'ghost'}
                onClick={() => setRange(value)}
              >
                {value}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Demand</CardTitle>
                <p className="text-sm text-slate-600">
                  Captured channels from Listify lead records.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => openLeads()}>
                Open leads
              </Button>
            </CardHeader>
            <CardContent className="space-y-5">
              {demand.capturedLeadCount === 0 ? (
                <p className="text-sm text-slate-600">
                  No Listify-captured leads in the {selectedRangeLabel}.
                </p>
              ) : (
                <>
                  <dl className="grid grid-cols-2 gap-3">
                    <div className="rounded-md bg-slate-50 p-3">
                      <dt className="text-sm text-slate-600">
                        Captured leads — {selectedRangeLabel}
                      </dt>
                      <dd className="mt-1 text-2xl font-semibold text-slate-950">
                        {demand.capturedLeadCount}
                      </dd>
                    </div>
                    <div className="rounded-md bg-slate-50 p-3">
                      <dt className="text-sm text-slate-600">New leads — {selectedRangeLabel}</dt>
                      <dd className="mt-1 text-2xl font-semibold text-slate-950">
                        {demand.newLeadCount}
                      </dd>
                    </div>
                  </dl>

                  <div>
                    <p className="text-sm font-medium text-slate-900">Captured channels</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {demand.sources.map(source =>
                        source.channel === 'Unknown source' ? (
                          <span
                            key={source.channel}
                            className="inline-flex h-8 items-center rounded-md border border-input px-3 text-sm"
                          >
                            {source.channel} · {source.count}
                          </span>
                        ) : (
                          <Button
                            key={source.channel}
                            variant="outline"
                            size="sm"
                            onClick={() => openLeads({ source: source.channel })}
                          >
                            {source.channel} · {source.count}
                          </Button>
                        ),
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-900">Recent captured leads</p>
                    <ol className="mt-2 space-y-2">
                      {demand.recentLeads.map(lead => (
                        <li key={lead.id}>
                          <Button
                            className="h-auto w-full justify-between whitespace-normal px-3 py-2 text-left"
                            variant="outline"
                            onClick={() =>
                              openLeads({
                                stage: leadStageCrmFilter(lead.stage),
                                leadId: lead.id,
                              })
                            }
                          >
                            <span>{lead.name || 'Unnamed lead'}</span>
                            <span className="text-xs font-normal text-slate-500">
                              {lead.source} · {formatTimestamp(lead.createdAt)}
                            </span>
                          </Button>
                        </li>
                      ))}
                    </ol>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sales Funnel</CardTitle>
              <p className="text-sm text-slate-600">
                Selected-period Listify-captured leads in the canonical developer workflow.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {demand.capturedLeadCount === 0 ? (
                <p className="text-sm text-slate-600">
                  No captured funnel activity in the {selectedRangeLabel}.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {funnelStages.map(stage => (
                      <Button
                        key={stage.key}
                        className="h-auto justify-between px-3 py-2"
                        variant="outline"
                        onClick={() => openLeads({ stage: stage.crmStage })}
                      >
                        <span className="font-normal">{stage.label}</span>
                        <span>{funnel.stages[stage.key]}</span>
                      </Button>
                    ))}
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-slate-600">Open leads</dt>
                      <dd className="font-semibold text-slate-950">{funnel.openLeadCount}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-600">Closed won</dt>
                      <dd className="font-semibold text-slate-950">{funnel.closedWonCount}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-600">SLA warnings</dt>
                      <dd>
                        <Button
                          className="h-auto p-0 font-semibold text-amber-800 hover:bg-transparent"
                          variant="ghost"
                          onClick={() => openLeads({ view: 'attention', sla: 'warning' })}
                        >
                          {funnel.slaWarningCount}
                        </Button>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-600">SLA breaches</dt>
                      <dd>
                        <Button
                          className="h-auto p-0 font-semibold text-rose-800 hover:bg-transparent"
                          variant="ghost"
                          onClick={() => openLeads({ view: 'attention', sla: 'breach' })}
                        >
                          {funnel.slaBreachCount}
                        </Button>
                      </dd>
                    </div>
                  </dl>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
