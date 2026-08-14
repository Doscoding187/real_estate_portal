import { useState, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock3,
  ExternalLink,
  PackageOpen,
  Plus,
  RefreshCw,
  Users,
} from 'lucide-react';

import { useAuth } from '@/_core/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDeveloperOnboardingStatus } from '@/hooks/useDeveloperOnboardingStatus';
import { trpc } from '@/lib/trpc';

type Range = '7d' | '30d' | '90d';

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat().format(Number(value));
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return 'No expiry recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'No expiry recorded' : date.toLocaleDateString();
}

function lifecycleLabel(state: string): string {
  return (
    {
      live: 'Live',
      approved_private: 'Approved · private',
      in_review: 'In review',
      changes_required: 'Changes requested',
      rejected: 'Rejected',
      draft_ready_to_submit: 'Ready to submit',
      draft_action_required: 'Draft · action required',
    }[state] ?? state
  );
}

function lifecycleVariant(state: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (state === 'live') return 'default';
  if (state === 'rejected') return 'destructive';
  if (state === 'changes_required' || state === 'draft_action_required') return 'secondary';
  return 'outline';
}

function accessLabel(reason: string): string {
  if (reason === 'active_launch_access') return 'Launch Access active';
  if (reason === 'expired_launch_access') return 'Launch Access expired';
  if (reason === 'inactive_launch_access') return 'Launch Access inactive';
  if (reason === 'invalid_launch_access') return 'Launch Access needs attention';
  return 'Launch Access required for public publication';
}

export default function Overview() {
  const { user } = useAuth();
  const { status: onboardingStatus, isLoading: onboardingLoading } = useDeveloperOnboardingStatus();
  const [, setLocation] = useLocation();
  const [range, setRange] = useState<Range>('30d');
  const isSuperAdmin = user?.role === 'super_admin';

  const profileQuery = trpc.developer.getProfile.useQuery(undefined, {
    retry: false,
    enabled: isSuperAdmin || Boolean(onboardingStatus?.hasProfile),
  });
  const operatingHomeQuery = trpc.developer.getOperatingHome.useQuery(
    { range },
    {
      enabled: isSuperAdmin || Boolean(onboardingStatus?.dashboardUnlocked),
      refetchOnWindowFocus: false,
    },
  );

  const profile = profileQuery.data as { status?: string; rejectionReason?: string } | undefined;
  const home = operatingHomeQuery.data;

  if (onboardingLoading || profileQuery.isLoading || operatingHomeQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].map(item => (
            <div key={item} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile && !isSuperAdmin) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <Building2 className="mx-auto h-10 w-10 text-blue-600" />
          <h3 className="text-lg font-semibold">Complete your developer profile</h3>
          <p className="text-sm text-slate-600">
            Set up your Developer Organisation before opening the workspace.
          </p>
          <Button onClick={() => setLocation('/developer/setup')}>Go to Setup</Button>
        </CardContent>
      </Card>
    );
  }

  if (profile?.status === 'pending' || profile?.status === 'rejected') {
    const pending = profile.status === 'pending';
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <Building2 className="mx-auto h-10 w-10 text-blue-600" />
          <h3 className="text-lg font-semibold">
            {pending ? 'Developer Organisation under review' : 'Developer Organisation rejected'}
          </h3>
          <p className="text-sm text-slate-600">
            {pending
              ? 'You can review your organisation details while approval is in progress.'
              : profile.rejectionReason || 'Update your organisation details and resubmit.'}
          </p>
          <Button onClick={() => setLocation('/developer/setup')}>
            {pending ? 'Review Organisation' : 'Update Organisation'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (operatingHomeQuery.error) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <h3 className="text-lg font-semibold">Unable to load Developer Workspace</h3>
          <p className="text-sm text-slate-600">{operatingHomeQuery.error.message}</p>
          <Button variant="outline" onClick={() => operatingHomeQuery.refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!home || home.developments.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-5 text-center">
        <Building2 className="h-12 w-12 text-blue-600" />
        <h2 className="text-3xl font-bold text-slate-900">Start your development portfolio</h2>
        <p className="max-w-xl text-slate-600">
          Create and save a private draft first. Launch Access is only needed when an approved
          development is ready for public publication.
        </p>
        <Button onClick={() => setLocation('/developer/create-development')}>
          <Plus className="mr-2 h-4 w-4" />
          Create Development
        </Button>
      </div>
    );
  }

  const access = home.commercialAccess;
  const portfolio = home.portfolio;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Developer Workspace</p>
            <h1 className="text-2xl font-bold text-slate-900">Operate your portfolio</h1>
            <p className="text-sm text-muted-foreground">
              One server-owned view of lifecycle, readiness, inventory, publication, and demand.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={range} onValueChange={value => setRange(value as Range)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setLocation('/developer/create-development')}>
              <Plus className="mr-2 h-4 w-4" />
              New Development
            </Button>
          </div>
        </CardContent>
      </Card>

      {access && !access.eligible && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-medium text-amber-950">{accessLabel(access.reason)}</p>
                <p className="text-sm text-amber-900">
                  Private drafting, editing, and review remain available. Public eligibility is
                  paused without deleting your work.
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setLocation('/developer/plans')}>
              Activate Launch Access
            </Button>
          </CardContent>
        </Card>
      )}

      {access?.eligible && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="flex flex-col gap-1 p-4 md:flex-row md:items-center md:justify-between">
            <p className="font-medium text-emerald-950">Launch Access active</p>
            <p className="text-sm text-emerald-900">
              Public publication eligibility runs through {formatDate(access.expiresAt)}.
            </p>
          </CardContent>
        </Card>
      )}

      {portfolio.nextAction && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
                Next action · {portfolio.nextAction.developmentName}
              </p>
              <p className="font-semibold text-blue-950">{portfolio.nextAction.label}</p>
              <p className="text-sm text-blue-900">{portfolio.nextAction.explanation}</p>
            </div>
            <Button onClick={() => setLocation(portfolio.nextAction!.href)}>
              Open action <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Developments" value={portfolio.developmentCount} icon={<Building2 />} />
        <StatCard
          label="Ready to progress"
          value={portfolio.readiness.readyDevelopmentCount}
          icon={<CheckCircle2 />}
        />
        <StatCard
          label="Units available"
          value={portfolio.inventory.availableUnits}
          icon={<PackageOpen />}
        />
        <StatCard label="Open leads" value={portfolio.leads.openLeadCount} icon={<Users />} />
        <StatCard label="Attention items" value={portfolio.attentionCount} icon={<Clock3 />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Portfolio attention</CardTitle>
          <CardDescription>
            Server-ranked actions across your organisation’s developments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {home.attention.length === 0 ? (
            <p className="text-sm text-muted-foreground">No outstanding attention items.</p>
          ) : (
            home.attention.map(item => (
              <button
                key={`${item.developmentId}-${item.type}-${item.href}`}
                className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left hover:border-blue-300"
                onClick={() => setLocation(item.href)}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{item.developmentName}</span>
                  <span className="block text-sm text-muted-foreground">{item.explanation}</span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-blue-600" />
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Developments</CardTitle>
          <CardDescription>
            Resume drafts, address review feedback, or manage publication.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {home.developments.map(development => (
            <div key={development.identity.id} className="rounded-lg border p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold">{development.identity.name}</h3>
                    <Badge variant={lifecycleVariant(development.lifecycle.state)}>
                      {lifecycleLabel(development.lifecycle.state)}
                    </Badge>
                    <Badge variant="outline">
                      {development.readiness.status === 'ready' ? 'Ready' : 'Readiness blocked'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {development.identity.location.city}, {development.identity.location.province}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {development.nextAction && (
                    <Button size="sm" onClick={() => setLocation(development.nextAction!.href)}>
                      {development.nextAction.label}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setLocation(`/developer/developments/${development.identity.id}`)
                    }
                  >
                    Open <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
                <SummaryMetric label="Blockers" value={development.readiness.blockerCount} />
                <SummaryMetric label="Total units" value={development.inventory.totalUnits} />
                <SummaryMetric label="Available" value={development.inventory.availableUnits} />
                <SummaryMetric label="Open leads" value={development.leads.openLeadCount} />
                <SummaryMetric label="SLA breaches" value={development.leads.slaBreachCount} />
              </div>
              {development.lifecycle.latestReview?.feedback && (
                <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                  Review feedback: {development.lifecycle.latestReview.feedback}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | null | undefined;
  icon: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{formatNumber(value)}</p>
        </div>
        <span className="text-blue-600">{icon}</span>
      </CardContent>
    </Card>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="rounded-md bg-slate-50 p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{formatNumber(value)}</p>
    </div>
  );
}
