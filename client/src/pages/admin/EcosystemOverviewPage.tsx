import React from 'react';
import { trpc } from '@/lib/trpc';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  AlertTriangle,
  BellRing,
  Building2,
  CheckCircle2,
  Clock3,
  Code,
  RefreshCw,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

function formatDateTime(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAgo(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

const EcosystemOverviewPage: React.FC = () => {
  const { data: stats, isLoading } = trpc.admin.getEcosystemStats.useQuery();
  const {
    data: schedulerStatus,
    isLoading: schedulerLoading,
    isFetching: schedulerFetching,
    error: schedulerError,
    refetch: refetchSchedulerStatus,
  } = trpc.system.savedSearchSchedulerStatus.useQuery(undefined, {
    refetchInterval: 60_000,
  });
  const runScheduler = trpc.system.runSavedSearchScheduler.useMutation({
    onSuccess: async () => {
      toast.success('Saved search scheduler run completed');
      await refetchSchedulerStatus();
    },
    onError: error => {
      toast.error(error.message || 'Unable to run saved search scheduler');
    },
  });

  const StatCard = ({
    title,
    icon: Icon,
    total,
    active,
    growth,
    color,
  }: {
    title: string;
    icon: any;
    total?: number;
    active?: number;
    growth?: number;
    color: string;
  }) => (
    <GlassCard className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium text-slate-700 flex items-center gap-2">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          {title}
        </CardTitle>
        {growth !== undefined && (
          <Badge
            variant="secondary"
            className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
          >
            <TrendingUp className="h-3 w-3 mr-1" />+{growth} new
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-3xl font-bold text-slate-800">{total ?? '-'}</p>
            <p className="text-sm text-slate-500">Total Registered</p>
          </div>

          {active !== undefined && (
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">Active / Verified</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-700">{active}</span>
                <span className="text-xs text-slate-400">
                  ({total && total > 0 ? Math.round((active / total) * 100) : 0}%)
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </GlassCard>
  );

  const SchedulerMetric = ({
    label,
    value,
    subtext,
  }: {
    label: string;
    value: string;
    subtext?: string | null;
  }) => (
    <div className="rounded-xl border border-slate-200 bg-white/70 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
      {subtext ? <p className="mt-1 text-xs text-slate-500">{subtext}</p> : null}
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <Activity className="h-8 w-8 text-indigo-600" />
          Ecosystem Health
        </h1>
        <p className="text-slate-500 mt-2">
          High-level overview of platform participants and growth metrics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Agencies"
          icon={Building2}
          total={stats?.agencies.total}
          active={stats?.agencies.active}
          growth={stats?.agencies.growth}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Agents"
          icon={Users}
          total={stats?.agents.total}
          active={stats?.agents.active}
          growth={stats?.agents.growth}
          color="bg-purple-100 text-purple-600"
        />
        <StatCard
          title="Developers"
          icon={Code}
          total={stats?.developers.total}
          active={stats?.developers.active}
          growth={stats?.developers.growth}
          color="bg-amber-100 text-amber-600"
        />
        <StatCard
          title="End Users"
          icon={User}
          total={stats?.users.total}
          active={stats?.users.active} // Treating total as active for now
          growth={stats?.users.growth}
          color="bg-emerald-100 text-emerald-600"
        />
      </div>

      <GlassCard className="border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)]">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="text-slate-800 flex items-center gap-2">
              <BellRing className="h-5 w-5 text-indigo-600" />
              Saved Search Scheduler
            </CardTitle>
            <p className="mt-2 text-sm text-slate-500">
              Operational status for automated saved-search delivery and recent scheduler runs.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {schedulerStatus?.enabled ? (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                Enabled
              </Badge>
            ) : (
              <Badge variant="secondary">Disabled</Badge>
            )}
            {schedulerStatus?.running ? (
              <Badge className="bg-blue-100 text-blue-700 border-blue-200">Running</Badge>
            ) : null}
            {schedulerStatus?.lastError ? (
              <Badge variant="destructive">Last run failed</Badge>
            ) : (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                Healthy
              </Badge>
            )}
            <Button
              size="sm"
              className="bg-slate-900 text-white hover:bg-slate-800"
              onClick={() => runScheduler.mutate()}
              disabled={schedulerFetching || runScheduler.isPending}
            >
              <BellRing className={`mr-2 h-4 w-4 ${runScheduler.isPending ? 'animate-pulse' : ''}`} />
              Run now
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/70"
              onClick={() => void refetchSchedulerStatus()}
              disabled={schedulerFetching || runScheduler.isPending}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${schedulerFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {schedulerLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map(item => (
                <Skeleton key={item} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : schedulerError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Failed to load scheduler status: {schedulerError.message}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <SchedulerMetric
                  label="Schedule"
                  value={
                    schedulerStatus?.intervalMs
                      ? `Every ${Math.max(1, Math.round(schedulerStatus.intervalMs / 60000))} min`
                      : '—'
                  }
                  subtext={`Started ${formatDateTime(schedulerStatus?.startedAt)}`}
                />
                <SchedulerMetric
                  label="Last Completed"
                  value={formatDateTime(schedulerStatus?.lastRunCompletedAt)}
                  subtext={formatAgo(schedulerStatus?.lastRunCompletedAt)}
                />
                <SchedulerMetric
                  label="Last Trigger"
                  value={schedulerStatus?.recentRuns?.[0]?.trigger || '—'}
                  subtext={schedulerStatus?.running ? 'Manual run in progress' : null}
                />
                <SchedulerMetric
                  label="Notifications"
                  value={String(schedulerStatus?.lastResult?.emittedNotifications ?? 0)}
                  subtext={`Emails sent: ${schedulerStatus?.lastResult?.emailedNotifications ?? 0}`}
                />
                <SchedulerMetric
                  label="Searches Processed"
                  value={String(schedulerStatus?.lastResult?.dueSearches ?? 0)}
                  subtext={`Scanned: ${schedulerStatus?.lastResult?.scannedSearches ?? 0}`}
                />
              </div>

              {schedulerStatus?.lastError ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700" />
                    <div>
                      <p className="text-sm font-medium text-amber-900">Last scheduler error</p>
                      <p className="mt-1 text-sm text-amber-800">{schedulerStatus.lastError}</p>
                      <p className="mt-1 text-xs text-amber-700">
                        Failed at {formatDateTime(schedulerStatus.lastRunFailedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-slate-200 bg-white/70">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Recent Runs</h3>
                    <p className="text-xs text-slate-500">
                      Persisted scheduler history across restarts
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {(schedulerStatus?.recentRuns || []).length} recorded
                  </Badge>
                </div>

                {(schedulerStatus?.recentRuns || []).length > 0 ? (
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-slate-100 hover:bg-transparent">
                        <TableHead className="text-slate-500 font-semibold">Run</TableHead>
                        <TableHead className="text-slate-500 font-semibold">Started</TableHead>
                        <TableHead className="text-slate-500 font-semibold">Status</TableHead>
                        <TableHead className="text-slate-500 font-semibold">Due</TableHead>
                        <TableHead className="text-slate-500 font-semibold">In-App</TableHead>
                        <TableHead className="text-slate-500 font-semibold">Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedulerStatus?.recentRuns.map(run => {
                        const failed = Boolean(run.failedAt || run.error);
                        return (
                          <TableRow key={`${run.trigger}-${run.startedAt}`} className="border-slate-100">
                            <TableCell className="font-medium text-slate-700 capitalize">
                              <div className="flex items-center gap-2">
                                {failed ? (
                                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                )}
                                {run.trigger}
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-600">
                              <div>{formatDateTime(run.startedAt)}</div>
                              <div className="text-xs text-slate-400">{formatAgo(run.startedAt)}</div>
                            </TableCell>
                            <TableCell>
                              {failed ? (
                                <div className="space-y-1">
                                  <Badge variant="destructive">Failed</Badge>
                                  {run.error ? (
                                    <p className="max-w-xs text-xs text-rose-700">{run.error}</p>
                                  ) : null}
                                </div>
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                  Completed
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-slate-700">
                              {run.result?.dueSearches ?? 0}
                            </TableCell>
                            <TableCell className="text-slate-700">
                              {run.result?.emittedNotifications ?? 0}
                            </TableCell>
                            <TableCell className="text-slate-700">
                              {run.result?.emailedNotifications ?? 0}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="px-4 py-6 text-sm text-slate-500">
                    No scheduler runs have been recorded yet.
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </GlassCard>

      <GlassCard className="p-8 text-center border-dashed border-2 bg-slate-50/50">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="p-3 bg-slate-100 rounded-full">
            <Clock3 className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-700">More Ecosystem Analytics Pending</h3>
          <p className="text-slate-500 max-w-md">
            Retention, churn, and geographic distribution remain on the next analytics pass.
          </p>
        </div>
      </GlassCard>
    </div>
  );
};

export default EcosystemOverviewPage;
