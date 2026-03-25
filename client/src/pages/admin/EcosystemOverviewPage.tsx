import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  AlertTriangle,
  Ban,
  BellRing,
  Building2,
  CheckCircle2,
  Clock3,
  Code,
  Download,
  RefreshCw,
  RotateCcw,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const [leadAuditDays, setLeadAuditDays] = useState<7 | 30 | 90>(30);
  const [activeCorrectionLeadId, setActiveCorrectionLeadId] = useState<number | null>(null);
  const [correctionRouteType, setCorrectionRouteType] = useState<
    'agent' | 'agency' | 'brand' | 'private' | 'clear'
  >('agent');
  const [correctionTargetId, setCorrectionTargetId] = useState('');
  const [correctionNote, setCorrectionNote] = useState('');
  const [deliveryFilter, setDeliveryFilter] = useState<
    'all' | 'attention' | 'pending_retry' | 'abandoned' | 'recovered'
  >('all');
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
  const {
    data: deliveryHistory,
    isLoading: deliveryHistoryLoading,
    isFetching: deliveryHistoryFetching,
    error: deliveryHistoryError,
    refetch: refetchDeliveryHistory,
  } = trpc.system.savedSearchDeliveryHistory.useQuery(
    { limit: 10, filter: deliveryFilter },
    {
      refetchInterval: 60_000,
    },
  );
  const {
    data: leadRoutingAudit,
    isLoading: leadRoutingAuditLoading,
    isFetching: leadRoutingAuditFetching,
    error: leadRoutingAuditError,
    refetch: refetchLeadRoutingAudit,
  } = trpc.system.leadRoutingAudit.useQuery(
    { days: leadAuditDays, attentionLimit: 8 },
    {
      refetchInterval: 60_000,
    },
  );
  const runScheduler = trpc.system.runSavedSearchScheduler.useMutation({
    onSuccess: async () => {
      toast.success('Saved search scheduler run completed');
      await Promise.all([refetchSchedulerStatus(), refetchDeliveryHistory()]);
    },
    onError: error => {
      toast.error(error.message || 'Unable to run saved search scheduler');
    },
  });
  const updateRetryState = trpc.system.updateSavedSearchDeliveryRetryState.useMutation({
    onSuccess: async (_, variables) => {
      toast.success(
        variables.action === 'requeue'
          ? 'Delivery requeued for retry'
          : 'Delivery retry abandoned',
      );
      await Promise.all([refetchSchedulerStatus(), refetchDeliveryHistory()]);
    },
    onError: error => {
      toast.error(error.message || 'Unable to update delivery retry state');
    },
  });
  const exportDeliveryHistory = trpc.system.exportSavedSearchDeliveryHistory.useMutation({
    onSuccess: data => {
      const blob = new Blob([data.content], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Saved-search delivery history exported');
    },
    onError: error => {
      toast.error(error.message || 'Unable to export delivery history');
    },
  });
  const correctLeadRoutingMutation = trpc.system.correctLeadRouting.useMutation({
    onSuccess: async () => {
      toast.success('Lead routing updated');
      setActiveCorrectionLeadId(null);
      setCorrectionTargetId('');
      setCorrectionNote('');
      setCorrectionRouteType('agent');
      await refetchLeadRoutingAudit();
    },
    onError: error => {
      toast.error(error.message || 'Unable to update lead routing');
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

  const pendingRetryActionId = updateRetryState.variables?.deliveryHistoryId;

  const requiresTargetId =
    correctionRouteType === 'agent' ||
    correctionRouteType === 'agency' ||
    correctionRouteType === 'brand';

  const getCorrectionInputLabel = () => {
    if (correctionRouteType === 'agent') return 'Agent ID';
    if (correctionRouteType === 'agency') return 'Agency ID';
    if (correctionRouteType === 'brand') return 'Developer Brand ID';
    return 'Target ID';
  };

  const applyLeadCorrection = (leadId: number) => {
    const trimmedNote = correctionNote.trim();
    const numericTargetId = correctionTargetId.trim() ? Number(correctionTargetId.trim()) : undefined;

    if (requiresTargetId && (!numericTargetId || Number.isNaN(numericTargetId) || numericTargetId <= 0)) {
      toast.error(`${getCorrectionInputLabel()} is required`);
      return;
    }

    correctLeadRoutingMutation.mutate({
      leadId,
      routeType: correctionRouteType,
      agentId: correctionRouteType === 'agent' ? numericTargetId : undefined,
      agencyId: correctionRouteType === 'agency' ? numericTargetId : undefined,
      developerBrandProfileId: correctionRouteType === 'brand' ? numericTargetId : undefined,
      note: trimmedNote || undefined,
    });
  };

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
              onClick={() =>
                void Promise.all([
                  refetchSchedulerStatus(),
                  refetchDeliveryHistory(),
                  refetchLeadRoutingAudit(),
                ])
              }
              disabled={
                schedulerFetching ||
                deliveryHistoryFetching ||
                leadRoutingAuditFetching ||
                runScheduler.isPending ||
                updateRetryState.isPending
              }
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${
                  schedulerFetching || deliveryHistoryFetching || leadRoutingAuditFetching
                    ? 'animate-spin'
                    : ''
                }`}
              />
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
                    subtext={`Emails sent: ${schedulerStatus?.lastResult?.emailedNotifications ?? 0} · Retries recovered: ${schedulerStatus?.lastResult?.retriedEmailDeliveries ?? 0}`}
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
                          <TableHead className="text-slate-500 font-semibold">Retries</TableHead>
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
                            <TableCell className="text-slate-700">
                              <div className="text-xs">
                                Recovered: {run.result?.retriedEmailDeliveries ?? 0}
                              </div>
                              <div className="text-xs text-slate-500">
                                Failed: {run.result?.failedEmailRetries ?? 0} · Abandoned:{' '}
                                {run.result?.abandonedEmailRetries ?? 0}
                              </div>
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

              <div className="rounded-xl border border-slate-200 bg-white/70">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Recent Deliveries</h3>
                    <p className="text-xs text-slate-500">
                      Per-search delivery audit for recent saved-search alerts
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{(deliveryHistory || []).length} recorded</Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 bg-white/80"
                      onClick={() => exportDeliveryHistory.mutate({ filter: deliveryFilter })}
                      disabled={exportDeliveryHistory.isPending}
                    >
                      <Download
                        className={`mr-2 h-3.5 w-3.5 ${
                          exportDeliveryHistory.isPending ? 'animate-pulse' : ''
                        }`}
                      />
                      Export CSV
                    </Button>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ['all', 'All'],
                        ['attention', 'Attention'],
                        ['pending_retry', 'Pending Retry'],
                        ['abandoned', 'Abandoned'],
                        ['recovered', 'Recovered'],
                      ].map(([value, label]) => (
                        <Button
                          key={value}
                          type="button"
                          variant={deliveryFilter === value ? 'default' : 'outline'}
                          size="sm"
                          className="h-8"
                          onClick={() =>
                            setDeliveryFilter(
                              value as
                                | 'all'
                                | 'attention'
                                | 'pending_retry'
                                | 'abandoned'
                                | 'recovered',
                            )
                          }
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {deliveryHistoryLoading ? (
                  <div className="space-y-3 px-4 py-4">
                    {[1, 2, 3].map(item => (
                      <Skeleton key={item} className="h-12 rounded-lg" />
                    ))}
                  </div>
                ) : deliveryHistoryError ? (
                  <div className="px-4 py-6 text-sm text-rose-700">
                    Failed to load delivery history: {deliveryHistoryError.message}
                  </div>
                ) : (deliveryHistory?.length || 0) > 0 ? (
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-slate-100 hover:bg-transparent">
                          <TableHead className="text-slate-500 font-semibold">Processed</TableHead>
                          <TableHead className="text-slate-500 font-semibold">Search</TableHead>
                          <TableHead className="text-slate-500 font-semibold">Status</TableHead>
                          <TableHead className="text-slate-500 font-semibold">Diagnostics</TableHead>
                          <TableHead className="text-slate-500 font-semibold">Matches</TableHead>
                          <TableHead className="text-slate-500 font-semibold">Channels</TableHead>
                          <TableHead className="text-slate-500 font-semibold">Retry</TableHead>
                          <TableHead className="text-slate-500 font-semibold">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveryHistory?.map(entry => {
                        const canRequeue =
                          (entry.retryState === 'pending' || entry.retryState === 'abandoned') &&
                          entry.emailRequested &&
                          !entry.emailDelivered;
                        const canAbandon =
                          (entry.retryState === 'pending' || entry.retryState === 'retrying') &&
                          entry.emailRequested &&
                          !entry.emailDelivered;

                        return (
                        <TableRow key={entry.id} className="border-slate-100">
                          <TableCell className="text-slate-600">
                            <div>{formatDateTime(entry.processedAt)}</div>
                            <div className="text-xs text-slate-400">{formatAgo(entry.processedAt)}</div>
                          </TableCell>
                          <TableCell className="text-slate-700">
                            <div className="font-medium">{entry.searchName}</div>
                            <div className="text-xs text-slate-500">{entry.title}</div>
                          </TableCell>
                          <TableCell>
                            {entry.status === 'failed' ? (
                              <div className="space-y-1">
                                <Badge variant="destructive">Failed</Badge>
                                {entry.error ? (
                                  <p className="max-w-xs text-xs text-rose-700">{entry.error}</p>
                                ) : null}
                              </div>
                            ) : entry.status === 'partial' ? (
                              <Badge className="border-amber-200 bg-amber-100 text-amber-800">
                                Partial
                              </Badge>
                            ) : entry.status === 'skipped' ? (
                              <Badge variant="secondary">Skipped</Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                Delivered
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-700">
                            <div className="space-y-1">
                              <Badge
                                variant={
                                  entry.recoveryState === 'terminal'
                                    ? 'destructive'
                                    : entry.recoveryState === 'recoverable'
                                      ? 'secondary'
                                      : 'outline'
                                }
                                className={
                                  entry.recoveryState === 'recovered'
                                    ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                                    : entry.recoveryState === 'recoverable'
                                      ? 'border-amber-200 bg-amber-100 text-amber-800'
                                      : ''
                                }
                              >
                                {entry.diagnosticCategory.replace(/_/g, ' ')}
                              </Badge>
                              <div className="text-xs text-slate-500 capitalize">
                                {entry.recoveryState.replace(/_/g, ' ')}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-700">
                            <div>{entry.newMatchCount} new</div>
                            <div className="text-xs text-slate-500">{entry.totalMatches} total</div>
                          </TableCell>
                            <TableCell className="text-slate-700">
                              <div className="space-y-1 text-xs">
                                <div>
                                  In-app: {entry.inAppDelivered ? 'sent' : entry.inAppRequested ? 'requested' : 'off'}
                                </div>
                              <div>
                                Email: {entry.emailDelivered ? 'sent' : entry.emailRequested ? 'requested' : 'off'}
                              </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-700">
                              <div className="space-y-1 text-xs">
                                <div>
                                  {entry.retryState === 'pending'
                                    ? `Pending retry ${entry.retryCount}/${entry.maxRetryCount}`
                                    : entry.retryState === 'succeeded'
                                      ? `Recovered after ${entry.retryCount} ${entry.retryCount === 1 ? 'retry' : 'retries'}`
                                      : entry.retryState === 'abandoned'
                                        ? 'Retry abandoned'
                                        : 'No retry needed'}
                                </div>
                                {entry.nextRetryAt ? (
                                  <div className="text-slate-500">
                                    Next: {formatDateTime(entry.nextRetryAt)}
                                  </div>
                                ) : null}
                                {entry.lastRetryAt ? (
                                  <div className="text-slate-500">
                                    Last: {formatDateTime(entry.lastRetryAt)}
                                  </div>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-700">
                              <div className="flex flex-wrap gap-2">
                                {canRequeue ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8"
                                    disabled={updateRetryState.isPending}
                                    onClick={() =>
                                      updateRetryState.mutate({
                                        deliveryHistoryId: entry.id,
                                        action: 'requeue',
                                      })
                                    }
                                  >
                                    <RotateCcw
                                      className={`mr-2 h-3.5 w-3.5 ${
                                        updateRetryState.isPending &&
                                        pendingRetryActionId === entry.id
                                          ? 'animate-spin'
                                          : ''
                                      }`}
                                    />
                                    Requeue
                                  </Button>
                                ) : null}
                                {canAbandon ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50"
                                    disabled={updateRetryState.isPending}
                                    onClick={() =>
                                      updateRetryState.mutate({
                                        deliveryHistoryId: entry.id,
                                        action: 'abandon',
                                      })
                                    }
                                  >
                                    <Ban className="mr-2 h-3.5 w-3.5" />
                                    Abandon
                                  </Button>
                                ) : null}
                                {!canRequeue && !canAbandon ? (
                                  <span className="text-xs text-slate-400">No action</span>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="px-4 py-6 text-sm text-slate-500">
                    No saved-search deliveries have been recorded yet.
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </GlassCard>

      <GlassCard className="border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)]">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="text-slate-800 flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-600" />
              Lead Routing Audit
            </CardTitle>
            <p className="mt-2 text-sm text-slate-500">
              Audit current lead destinations across manual, private, and brand-routed enquiries.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[7, 30, 90].map(days => (
              <Button
                key={days}
                type="button"
                variant={leadAuditDays === days ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLeadAuditDays(days as 7 | 30 | 90)}
              >
                Last {days}d
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {leadRoutingAuditLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
              {[1, 2, 3, 4, 5, 6].map(item => (
                <Skeleton key={item} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : leadRoutingAuditError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Failed to load lead-routing audit: {leadRoutingAuditError.message}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
                <SchedulerMetric
                  label="Total Leads"
                  value={String(leadRoutingAudit?.summary.totalLeads ?? 0)}
                  subtext={`Last ${leadRoutingAudit?.days ?? leadAuditDays} days`}
                />
                <SchedulerMetric
                  label="Brand Route"
                  value={String(leadRoutingAudit?.summary.brandRoute ?? 0)}
                  subtext={`Email ${leadRoutingAudit?.summary.brandDeliveredEmail ?? 0} · Subscriber ${leadRoutingAudit?.summary.brandDeliveredSubscriber ?? 0}`}
                />
                <SchedulerMetric
                  label="Brand Capture Only"
                  value={String(leadRoutingAudit?.summary.brandCapturedOnly ?? 0)}
                  subtext="Leads held without external delivery"
                />
                <SchedulerMetric
                  label="Direct to Agent"
                  value={String(leadRoutingAudit?.summary.directToAgent ?? 0)}
                  subtext={`Agency ${leadRoutingAudit?.summary.directToAgency ?? 0}`}
                />
                <SchedulerMetric
                  label="Direct to Private"
                  value={String(leadRoutingAudit?.summary.directToPrivate ?? 0)}
                  subtext={`Context only ${leadRoutingAudit?.summary.directContextOnly ?? 0}`}
                />
                <SchedulerMetric
                  label="Unknown"
                  value={String(leadRoutingAudit?.summary.unknownRoute ?? 0)}
                  subtext={`Brand + agent context ${leadRoutingAudit?.summary.brandWithAgentContext ?? 0}`}
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-white/70 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Top Lead Sources</h3>
                    <p className="text-xs text-slate-500">
                      Current routing volume by source channel
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(leadRoutingAudit?.topSources || []).map(source => (
                      <Badge key={source.source} variant="secondary">
                        {source.source}: {source.count}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white/70">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Needs Attention</h3>
                    <p className="text-xs text-slate-500">
                      Recent leads where routing needs review or manual follow-up.
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {(leadRoutingAudit?.attentionLeads || []).length} flagged
                  </Badge>
                </div>

                {(leadRoutingAudit?.attentionLeads || []).length > 0 ? (
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-slate-100 hover:bg-transparent">
                        <TableHead className="text-slate-500 font-semibold">Created</TableHead>
                        <TableHead className="text-slate-500 font-semibold">Lead</TableHead>
                        <TableHead className="text-slate-500 font-semibold">Issue</TableHead>
                        <TableHead className="text-slate-500 font-semibold">Route</TableHead>
                        <TableHead className="text-slate-500 font-semibold">Source</TableHead>
                        <TableHead className="text-slate-500 font-semibold">Context</TableHead>
                        <TableHead className="text-slate-500 font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leadRoutingAudit?.attentionLeads.map(entry => (
                        <TableRow key={entry.id} className="border-slate-100">
                          <TableCell className="text-slate-600">
                            <div>{formatDateTime(entry.createdAt)}</div>
                            <div className="text-xs text-slate-400">{formatAgo(entry.createdAt)}</div>
                          </TableCell>
                          <TableCell className="text-slate-700">
                            <div className="font-medium">{entry.name}</div>
                            <div className="text-xs text-slate-500">{entry.email}</div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                entry.issue === 'brand_capture_only' ? 'secondary' : 'destructive'
                              }
                              className={
                                entry.issue === 'brand_capture_only'
                                  ? 'border-amber-200 bg-amber-100 text-amber-800'
                                  : ''
                              }
                            >
                              {entry.issue.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-700">
                            <div className="capitalize">{entry.routeType}</div>
                            <div className="text-xs text-slate-500 capitalize">
                              {entry.recipientType.replace(/_/g, ' ')}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-700">{entry.leadSource}</TableCell>
                          <TableCell className="text-xs text-slate-500">
                            Property: {entry.propertyId ?? '—'} · Development:{' '}
                            {entry.developmentId ?? '—'}
                          </TableCell>
                          <TableCell className="text-slate-700">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant={activeCorrectionLeadId === entry.id ? 'default' : 'outline'}
                                size="sm"
                                className="h-8"
                                onClick={() => {
                                  if (activeCorrectionLeadId === entry.id) {
                                    setActiveCorrectionLeadId(null);
                                    setCorrectionTargetId('');
                                    setCorrectionNote('');
                                    setCorrectionRouteType('agent');
                                    return;
                                  }

                                  setActiveCorrectionLeadId(entry.id);
                                  setCorrectionTargetId('');
                                  setCorrectionNote('');
                                  setCorrectionRouteType(
                                    entry.issue === 'brand_capture_only' ? 'brand' : 'agent',
                                  );
                                }}
                              >
                                {activeCorrectionLeadId === entry.id ? 'Close' : 'Correct'}
                              </Button>
                            </div>
                            {activeCorrectionLeadId === entry.id ? (
                              <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                <div className="flex flex-wrap gap-2">
                                  {[
                                    ['agent', 'Agent'],
                                    ['agency', 'Agency'],
                                    ['brand', 'Brand'],
                                    ['private', 'Private'],
                                    ['clear', 'Clear'],
                                  ].map(([value, label]) => (
                                    <Button
                                      key={value}
                                      type="button"
                                      size="sm"
                                      variant={correctionRouteType === value ? 'default' : 'outline'}
                                      className="h-8"
                                      onClick={() =>
                                        setCorrectionRouteType(
                                          value as 'agent' | 'agency' | 'brand' | 'private' | 'clear',
                                        )
                                      }
                                    >
                                      {label}
                                    </Button>
                                  ))}
                                </div>

                                {requiresTargetId ? (
                                  <Input
                                    value={correctionTargetId}
                                    onChange={event => setCorrectionTargetId(event.target.value)}
                                    placeholder={getCorrectionInputLabel()}
                                    inputMode="numeric"
                                  />
                                ) : null}

                                <Input
                                  value={correctionNote}
                                  onChange={event => setCorrectionNote(event.target.value)}
                                  placeholder="Optional correction note"
                                />

                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => applyLeadCorrection(entry.id)}
                                    disabled={correctLeadRoutingMutation.isPending}
                                  >
                                    Apply
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setActiveCorrectionLeadId(null);
                                      setCorrectionTargetId('');
                                      setCorrectionNote('');
                                      setCorrectionRouteType('agent');
                                    }}
                                    disabled={correctLeadRoutingMutation.isPending}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="px-4 py-6 text-sm text-slate-500">
                    No routing issues found in this period.
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
