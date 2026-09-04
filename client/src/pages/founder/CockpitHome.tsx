import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Building2,
  UserCheck,
  Factory,
  Home,
  TrendingUp,
  Clock,
  AlertTriangle,
  Activity,
} from 'lucide-react';

function MetricCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: 'up' | 'down';
  trendLabel?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
            {trend && trendLabel && (
              <p
                className={`text-xs mt-1 font-medium ${
                  trend === 'up' ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {trend === 'up' ? '+' : ''}
                {trendLabel} this month
              </p>
            )}
          </div>
          <div className="p-2 bg-slate-100 rounded-lg">
            <Icon className="h-4 w-4 text-slate-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DataUnavailable({ label }: { label: string }) {
  return (
    <div className="text-center py-8 text-slate-400">
      <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
      <p className="text-sm">{label}</p>
      <p className="text-xs mt-1">Not yet connected</p>
    </div>
  );
}

export default function CockpitHome() {
  const { data: metrics, isLoading: metricsLoading } =
    trpc.founder.getDashboardMetrics.useQuery();
  const { data: attentionData, isLoading: attentionLoading } =
    trpc.founder.getAttentionCandidates.useQuery();

  const platform = metrics?.platform;
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

      {/* Platform Metrics */}
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
              label="Total Users"
              value={platform?.totalUsers ?? 0}
              icon={Users}
              trend={platform?.userGrowth ? 'up' : undefined}
              trendLabel={platform?.userGrowth ? `+${platform.userGrowth}` : undefined}
            />
            <MetricCard
              label="Active Agents"
              value={platform?.totalAgents ?? 0}
              icon={UserCheck}
            />
            <MetricCard
              label="Agencies"
              value={platform?.totalAgencies ?? 0}
              icon={Building2}
            />
            <MetricCard
              label="Developers"
              value={platform?.totalDevelopers ?? 0}
              icon={Factory}
            />
            <MetricCard
              label="Active Listings"
              value={platform?.activeListings ?? 0}
              icon={Home}
              trend={platform?.propertyGrowth ? 'up' : undefined}
              trendLabel={platform?.propertyGrowth ? `+${platform.propertyGrowth}` : undefined}
            />
            <MetricCard
              label="Monthly Revenue"
              value={
                platform?.monthlyRevenue
                  ? `R ${platform.monthlyRevenue.toLocaleString()}`
                  : 'R 0'
              }
              icon={TrendingUp}
            />
          </div>
        )}
      </div>

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
              Ecosystem Health
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
              <DataUnavailable label="Ecosystem data unavailable" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Traffic & Analytics — Not Connected */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Traffic & Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <DataUnavailable label="Traffic analytics not connected" />
        </CardContent>
      </Card>

      {/* System Health — Not Connected */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <DataUnavailable label="System health monitoring not connected" />
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
