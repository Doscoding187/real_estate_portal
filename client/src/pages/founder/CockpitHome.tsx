import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  UserCheck,
  Factory,
  Home,
  TrendingUp,
  Clock,
  AlertTriangle,
  Activity,
  Target,
  Server,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from 'lucide-react';

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          </div>
          <div className="p-2 bg-slate-100 rounded-lg">
            <Icon className="h-4 w-4 text-slate-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  operational: CheckCircle2,
  degraded: AlertCircle,
  unavailable: XCircle,
};

const STATUS_COLORS: Record<string, string> = {
  operational: 'text-emerald-600',
  degraded: 'text-amber-600',
  unavailable: 'text-slate-400',
};

const STATUS_BG: Record<string, string> = {
  operational: 'bg-emerald-50',
  degraded: 'bg-amber-50',
  unavailable: 'bg-slate-50',
};

const PIPELINE_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  viewing_scheduled: 'Viewing Scheduled',
  offer_sent: 'Offer Sent',
  converted: 'Converted',
  closed: 'Closed',
  lost: 'Lost',
};

const PIPELINE_COLORS: Record<string, string> = {
  new: 'bg-blue-500',
  contacted: 'bg-indigo-500',
  qualified: 'bg-violet-500',
  viewing_scheduled: 'bg-purple-500',
  offer_sent: 'bg-amber-500',
  converted: 'bg-emerald-500',
  closed: 'bg-emerald-700',
  lost: 'bg-red-400',
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return iso;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function humanizeDetail(detail: string): string {
  return detail.replace(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z/g,
    ts => relativeTime(ts),
  );
}

export default function CockpitHome() {
  const { data: metrics, isLoading: metricsLoading } =
    trpc.founder.getDashboardMetrics.useQuery();
  const { data: attentionData, isLoading: attentionLoading } =
    trpc.founder.getAttentionCandidates.useQuery();
  const { data: pipeline, isLoading: pipelineLoading } =
    trpc.founder.getLeadPipeline.useQuery();
  const { data: health, isLoading: healthLoading } =
    trpc.founder.getOperationalHealth.useQuery();

  const cockpit = metrics?.cockpit;
  const pending = metrics?.pendingApprovals;
  const attentionCount = attentionData?.items?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Good morning</h1>
        <p className="text-slate-500 text-sm mt-1">
          Your cockpit — how is the company doing right now?
        </p>
      </div>

      {/* KPI Row: Leads · Agents · Agencies · Developers · Listings · Revenue */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Platform Snapshot
        </h2>
        {metricsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="animate-pulse space-y-2">
                    <div className="h-3 bg-slate-200 rounded w-16" />
                    <div className="h-6 bg-slate-200 rounded w-12" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard
              label="Leads (30d)"
              value={cockpit?.totalLeadsRecent ?? 0}
              icon={Target}
            />
            <MetricCard
              label="Active Agents"
              value={cockpit?.activeAgents ?? 0}
              icon={UserCheck}
            />
            <MetricCard
              label="Active Agencies"
              value={cockpit?.activeAgencies ?? 0}
              icon={Building2}
            />
            <MetricCard
              label="Active Developers"
              value={cockpit?.activeDevelopers ?? 0}
              icon={Factory}
            />
            <MetricCard
              label="Active Listings"
              value={cockpit?.activeListings ?? 0}
              icon={Home}
            />
            <MetricCard
              label="Revenue (30d)"
              value={
                cockpit?.monthlyRevenue
                  ? `R ${cockpit.monthlyRevenue.toLocaleString()}`
                  : 'R 0'
              }
              icon={TrendingUp}
            />
          </div>
        )}
      </div>

      {/* Lead Pipeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-violet-500" />
            Lead Pipeline
            <span className="text-xs font-normal text-slate-400 ml-1">
              Current lead distribution by stage
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pipelineLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse h-6 bg-slate-100 rounded" />
              ))}
            </div>
          ) : pipeline && pipeline.stages.length > 0 ? (
            <div className="space-y-3">
              {pipeline.stages
                .filter(s => s.status !== 'lost')
                .map(stage => (
                  <div key={stage.status} className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 w-36 shrink-0">
                      {PIPELINE_LABELS[stage.status] ?? stage.status}
                    </span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${PIPELINE_COLORS[stage.status] ?? 'bg-slate-400'}`}
                        style={{
                          width: pipeline.total > 0
                            ? `${Math.max((stage.count / pipeline.total) * 100, stage.count > 0 ? 2 : 0)}%`
                            : '0%',
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-900 w-12 text-right">
                      {stage.count}
                    </span>
                  </div>
                ))}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Total leads</span>
                <span className="text-sm font-semibold text-slate-900">{pipeline.total}</span>
              </div>
              {pipeline.stages.some(s => s.status === 'lost') && (
                <>
                  <div className="border-t border-dashed border-slate-200 pt-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-500 w-36 shrink-0">
                        Exited (Lost)
                      </span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-red-400"
                          style={{
                            width: pipeline.total > 0
                              ? `${Math.max((pipeline.stages.find(s => s.status === 'lost')?.count ?? 0) / pipeline.total * 100, 0)}%`
                              : '0%',
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-900 w-12 text-right">
                        {pipeline.stages.find(s => s.status === 'lost')?.count ?? 0}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">No lead data available</p>
          )}
        </CardContent>
      </Card>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Actions */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Pending Actions
              {attentionCount > 0 && (
                <Badge variant="warning" className="ml-auto">
                  {attentionCount}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {metricsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse h-8 bg-slate-100 rounded" />
                ))}
              </div>
            ) : pending ? (
              <>
                <ActionItem
                  label="Agent approvals"
                  count={pending.agents}
                  href="/admin/agent-approvals"
                />
                <ActionItem
                  label="Listing reviews"
                  count={pending.listings}
                  href="/admin/listing-approvals"
                />
                <ActionItem
                  label="Development approvals"
                  count={pending.developments}
                  href="/admin/development-approvals"
                />
              </>
            ) : (
              <p className="text-sm text-slate-400">No pending actions</p>
            )}
          </CardContent>
        </Card>

        {/* Founder Attention Preview */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Founder Attention
              <a href="/founder/attention" className="ml-auto text-xs text-blue-600 hover:underline">
                View all
              </a>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attentionLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse h-12 bg-slate-100 rounded" />
                ))}
              </div>
            ) : attentionData?.items && attentionData.items.length > 0 ? (
              <div className="space-y-2">
                {attentionData.items.slice(0, 5).map((item, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50"
                  >
                    <div
                      className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                        item.urgency === 'critical'
                          ? 'bg-red-500'
                          : item.urgency === 'high'
                            ? 'bg-amber-500'
                            : 'bg-blue-500'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
                      <p className="text-xs text-slate-500 truncate">{item.summary}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">
                No attention items right now
              </p>
            )}
          </CardContent>
        </Card>

        {/* Ecosystem Health */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              Ecosystem Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {metricsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse h-8 bg-slate-100 rounded" />
                ))}
              </div>
            ) : metrics?.ecosystem ? (
              <>
                <EcosystemRow
                  label="Agencies"
                  active={metrics.ecosystem.agencies.active}
                  total={metrics.ecosystem.agencies.total}
                  growth={metrics.ecosystem.agencies.growth}
                />
                <EcosystemRow
                  label="Agents"
                  active={metrics.ecosystem.agents.active}
                  total={metrics.ecosystem.agents.total}
                  growth={metrics.ecosystem.agents.growth}
                />
                <EcosystemRow
                  label="Developers"
                  active={metrics.ecosystem.developers.active}
                  total={metrics.ecosystem.developers.total}
                  growth={metrics.ecosystem.developers.growth}
                />
                <EcosystemRow
                  label="Buyers"
                  active={metrics.ecosystem.users.active}
                  total={metrics.ecosystem.users.total}
                  growth={metrics.ecosystem.users.growth}
                />
              </>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">Ecosystem data unavailable</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Operational Health Footer */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Server className="h-4 w-4 text-slate-500" />
            Operational Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse h-16 bg-slate-100 rounded-lg" />
              ))}
            </div>
          ) : health && health.services.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {health.services.map(service => {
                const StatusIcon = STATUS_ICONS[service.status] ?? XCircle;
                return (
                  <div
                    key={service.name}
                    className={`rounded-lg p-3 ${STATUS_BG[service.status] ?? 'bg-slate-50'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <StatusIcon className={`h-3.5 w-3.5 ${STATUS_COLORS[service.status] ?? 'text-slate-400'}`} />
                      <span className="text-xs font-medium text-slate-700">{service.name}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{humanizeDetail(service.detail)}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">Health data unavailable</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ActionItem({ label, count, href }: { label: string; count: number; href: string }) {
  return (
    <a
      href={href}
      className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors"
    >
      <span className="text-sm text-slate-700">{label}</span>
      <Badge variant={count > 0 ? 'warning' : 'outline'} className="text-xs">
        {count}
      </Badge>
    </a>
  );
}

function EcosystemRow({
  label,
  active,
  total,
  growth,
}: {
  label: string;
  active: number;
  total: number;
  growth: number;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-slate-700">{label}</span>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-slate-900 font-medium">{active}</span>
        {growth > 0 && (
          <span className="text-emerald-600 text-xs">+{growth}</span>
        )}
        <span className="text-slate-400 text-xs">/ {total}</span>
      </div>
    </div>
  );
}
