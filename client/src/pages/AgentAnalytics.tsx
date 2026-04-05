import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { AgentAppShell } from '@/components/agent/AgentAppShell';
import { agentPageStyles } from '@/components/agent/agentPageStyles';
import { AgentFeatureLockedState } from '@/components/agent/AgentFeatureLockedState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { useAgentOnboardingStatus } from '@/hooks/useAgentOnboardingStatus';
import {
  BarChart3,
  DollarSign,
  Download,
  Eye,
  Home,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';

type TimeRange = '7d' | '30d' | '90d' | '1y';
type PerformancePeriod = 'week' | 'month' | 'quarter' | 'year';

type PipelineStageKey = 'new' | 'contacted' | 'viewing' | 'offer' | 'closed';

type LeadItem = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  source: string | null;
  createdAt: string | Date;
  property: {
    id: number;
    title: string;
    city: string;
    price: number;
  } | null;
};

type PipelineData = Record<PipelineStageKey, LeadItem[]>;

type ListingItem = {
  id: number;
  title: string;
  city: string;
  price: number;
  status: string;
  propertyType?: string | null;
  views: number;
  enquiries: number;
};

type CommissionItem = {
  id: number;
  amount: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  createdAt: string;
  payoutDate: string | null;
  property?: {
    id: number;
    title: string;
  } | null;
  client?: {
    name: string;
  } | null;
};

const TIME_RANGES: Array<{ value: TimeRange; label: string; period: PerformancePeriod }> = [
  { value: '7d', label: '7 Days', period: 'week' },
  { value: '30d', label: '30 Days', period: 'month' },
  { value: '90d', label: '90 Days', period: 'quarter' },
  { value: '1y', label: '1 Year', period: 'year' },
];

const PIPELINE_STAGE_META: Array<{ key: PipelineStageKey; label: string; tone: string }> = [
  { key: 'new', label: 'New', tone: 'bg-slate-100 text-slate-700' },
  { key: 'contacted', label: 'Contacted', tone: 'bg-blue-100 text-blue-700' },
  { key: 'viewing', label: 'Viewing', tone: 'bg-violet-100 text-violet-700' },
  { key: 'offer', label: 'Offer', tone: 'bg-amber-100 text-amber-700' },
  { key: 'closed', label: 'Closed', tone: 'bg-emerald-100 text-emerald-700' },
];

function formatCurrency(amountInCents: number) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format((amountInCents || 0) / 100);
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatPropertyType(value: string | null | undefined) {
  if (!value) return 'Property';
  return value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function formatStatus(value: string | null | undefined) {
  if (!value) return 'Unknown';
  return value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: typeof Eye;
}) {
  return (
    <Card className={cn(agentPageStyles.statCard, 'transition-all duration-200')}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={agentPageStyles.statLabel}>{title}</p>
            <p className={agentPageStyles.statValue}>{value}</p>
            <p className={cn(agentPageStyles.statSub, 'mt-2')}>{subtitle}</p>
          </div>
          <div className="rounded-xl bg-blue-50 p-3">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[18px] border border-dashed border-slate-200 bg-[#fbfaf7] px-6 py-12 text-center">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export default function AgentAnalytics() {
  const [, setLocation] = useLocation();
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [activeTab, setActiveTab] = useState('overview');
  const { status, isLoading: statusLoading } = useAgentOnboardingStatus({
    requireDashboardUnlocked: true,
  });

  const selectedPeriod = TIME_RANGES.find(range => range.value === timeRange)?.period || 'month';

  const { data: stats, isLoading: statsLoading } = trpc.agent.getDashboardStats.useQuery();
  const { data: performance, isLoading: performanceLoading } =
    trpc.agent.getPerformanceAnalytics.useQuery({
      period: selectedPeriod,
    });
  const { data: pipelineData, isLoading: pipelineLoading } = trpc.agent.getLeadsPipeline.useQuery({
    filters: {},
  });
  const { data: listingsData, isLoading: listingsLoading } = trpc.agent.getMyListings.useQuery({
    status: 'active',
    limit: 50,
  });
  const { data: commissionsData, isLoading: commissionsLoading } =
    trpc.agent.getMyCommissions.useQuery({
      status: 'all',
    });

  const analyticsLocked =
    !statusLoading &&
    (!status?.fullFeaturesUnlocked || !status?.entitlements?.featureFlags?.hasRevenueDashboard);

  const pipeline = useMemo(
    () =>
      (pipelineData || {
        new: [],
        contacted: [],
        viewing: [],
        offer: [],
        closed: [],
      }) as PipelineData,
    [pipelineData],
  );
  const listings = useMemo(() => (listingsData || []) as ListingItem[], [listingsData]);
  const commissions = useMemo(() => (commissionsData || []) as CommissionItem[], [commissionsData]);

  const allLeads = useMemo(
    () =>
      [
        ...pipeline.new,
        ...pipeline.contacted,
        ...pipeline.viewing,
        ...pipeline.offer,
        ...pipeline.closed,
      ] as LeadItem[],
    [pipeline],
  );

  const totalListingViews = listings.reduce((sum, listing) => sum + (listing.views || 0), 0);
  const topListings = useMemo(
    () =>
      [...listings]
        .sort((left, right) => right.enquiries - left.enquiries || right.views - left.views)
        .slice(0, 5),
    [listings],
  );
  const recentLeads = useMemo(
    () =>
      [...allLeads]
        .sort(
          (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        )
        .slice(0, 8),
    [allLeads],
  );
  const leadSources = useMemo(() => {
    const counts = new Map<string, number>();
    for (const lead of allLeads) {
      const source = lead.source?.trim() || 'Direct';
      counts.set(source, (counts.get(source) || 0) + 1);
    }
    const total = allLeads.length || 1;
    return [...counts.entries()]
      .map(([source, count]) => ({
        source,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 6);
  }, [allLeads]);
  const commissionSummary = useMemo(
    () =>
      commissions.reduce(
        (summary, commission) => {
          summary.total += commission.amount || 0;
          summary[commission.status] += commission.amount || 0;
          return summary;
        },
        {
          total: 0,
          pending: 0,
          approved: 0,
          paid: 0,
          cancelled: 0,
        },
      ),
    [commissions],
  );

  const isLoading =
    statsLoading || performanceLoading || pipelineLoading || listingsLoading || commissionsLoading;

  return (
    <AgentAppShell>
      <div className="min-h-screen bg-[#f7f6f3]">
        <header className="border-b border-slate-200/80 bg-white/92 backdrop-blur-xl">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className={agentPageStyles.title}>Analytics Dashboard</h1>
                <p className={cn(agentPageStyles.subtitle, 'mt-1')}>
                  Live performance across listings, leads, and commission flow.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-xl bg-gray-100 p-1">
                  {TIME_RANGES.map(range => (
                    <button
                      key={range.value}
                      onClick={() => setTimeRange(range.value)}
                      className={cn(
                        'rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
                        timeRange === range.value
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900',
                      )}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
                <Button variant="outline" size="sm" className={agentPageStyles.ghostButton}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className={agentPageStyles.container}>
          {statusLoading ? (
            <AgentFeatureLockedState
              title="Preparing your analytics workspace"
              description="We are confirming your package and onboarding access before loading advanced reporting."
              actionLabel="Loading"
              onAction={() => {}}
              isLoading
            />
          ) : analyticsLocked ? (
            <AgentFeatureLockedState
              title="Analytics unlock after setup and access alignment"
              description={
                !status?.fullFeaturesUnlocked
                  ? 'Complete the remaining onboarding steps to unlock the full analytics workspace and reporting stack.'
                  : 'Your current access state does not include the full revenue and analytics dashboard yet.'
              }
              actionLabel={!status?.fullFeaturesUnlocked ? 'Finish setup' : 'Review access'}
              onAction={() =>
                setLocation(!status?.fullFeaturesUnlocked ? '/agent/setup' : '/agent/settings')
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Total Listing Views"
                  value={isLoading ? '—' : totalListingViews.toLocaleString('en-ZA')}
                  subtitle={`${listings.length} live listing${listings.length === 1 ? '' : 's'}`}
                  icon={Eye}
                />
                <MetricCard
                  title="Lead Volume"
                  value={isLoading ? '—' : (performance?.totalLeads ?? allLeads.length)}
                  subtitle={`${pipeline.offer.length} active offer${pipeline.offer.length === 1 ? '' : 's'}`}
                  icon={Users}
                />
                <MetricCard
                  title="Conversion Rate"
                  value={isLoading ? '—' : `${performance?.conversionRate ?? 0}%`}
                  subtitle={`${performance?.convertedLeads ?? 0} converted lead${(performance?.convertedLeads ?? 0) === 1 ? '' : 's'}`}
                  icon={Target}
                />
                <MetricCard
                  title="Commission Pipeline"
                  value={
                    isLoading
                      ? '—'
                      : formatCurrency(commissionSummary.pending + commissionSummary.approved)
                  }
                  subtitle={`Pending ${formatCurrency(stats?.commissionsPending ?? commissionSummary.pending)}`}
                  icon={DollarSign}
                />
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className={cn(agentPageStyles.tabsList, 'mt-2 grid w-full grid-cols-4')}>
                  <TabsTrigger value="overview" className={agentPageStyles.tabTrigger}>
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="listings" className={agentPageStyles.tabTrigger}>
                    Listings
                  </TabsTrigger>
                  <TabsTrigger value="leads" className={agentPageStyles.tabTrigger}>
                    Leads
                  </TabsTrigger>
                  <TabsTrigger value="revenue" className={agentPageStyles.tabTrigger}>
                    Revenue
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6 space-y-6">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <Card className={agentPageStyles.panel}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-blue-600" />
                          Lead Sources
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {leadSources.length > 0 ? (
                          leadSources.map(item => (
                            <div key={item.source} className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-gray-700">{item.source}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">{item.count} leads</span>
                                  <span className="font-semibold text-gray-900">
                                    {item.percentage}%
                                  </span>
                                </div>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-sky-500"
                                  style={{ width: `${item.percentage}%` }}
                                />
                              </div>
                            </div>
                          ))
                        ) : (
                          <EmptyPanel
                            title="No lead-source data yet"
                            description="Lead attribution will appear here as soon as enquiries start flowing into the pipeline."
                          />
                        )}
                      </CardContent>
                    </Card>

                    <Card className={agentPageStyles.panel}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-blue-600" />
                          Pipeline Snapshot
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                          {PIPELINE_STAGE_META.map(stage => (
                            <div
                              key={stage.key}
                              className="rounded-[14px] border border-slate-200/70 bg-[#fbfaf7] p-4"
                            >
                              <Badge className={cn('mb-3 border-0', stage.tone)}>
                                {stage.label}
                              </Badge>
                              <p className="text-2xl font-semibold text-slate-900">
                                {pipeline[stage.key].length}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className={agentPageStyles.panel}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Home className="h-5 w-5 text-blue-600" />
                        Top Performing Listings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {topListings.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-100">
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                                  Property
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                                  Views
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                                  Enquiries
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                                  Price
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {topListings.map(listing => (
                                <tr
                                  key={listing.id}
                                  className="border-b border-slate-100 transition-colors hover:bg-[#fbfaf7]"
                                >
                                  <td className="px-4 py-3">
                                    <p className="text-sm font-medium text-gray-900">
                                      {listing.title}
                                    </p>
                                    <p className="text-xs text-slate-500">{listing.city}</p>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {listing.views.toLocaleString('en-ZA')}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {listing.enquiries}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                    {formatPrice(listing.price)}
                                  </td>
                                  <td className="px-4 py-3">
                                    <Badge variant="outline" className="rounded-full">
                                      {formatStatus(listing.status)}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <EmptyPanel
                          title="No live listings to analyze yet"
                          description="Publish a listing and performance data will begin to accumulate here."
                        />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="listings" className="mt-6">
                  <Card className={agentPageStyles.panel}>
                    <CardHeader>
                      <CardTitle>Listing Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {listings.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-100">
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                                  Property
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                                  Type
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                                  Views
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                                  Enquiries
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                                  Price
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {listings.map(listing => (
                                <tr key={listing.id} className="border-b border-slate-100">
                                  <td className="px-4 py-3">
                                    <p className="text-sm font-medium text-gray-900">
                                      {listing.title}
                                    </p>
                                    <p className="text-xs text-slate-500">{listing.city}</p>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {formatPropertyType(listing.propertyType)}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {listing.views.toLocaleString('en-ZA')}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {listing.enquiries}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                    {formatPrice(listing.price)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <EmptyPanel
                          title="No live listings found"
                          description="Once your inventory is active, listing-by-listing analytics will show here."
                        />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="leads" className="mt-6 space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                    {PIPELINE_STAGE_META.map(stage => (
                      <Card key={stage.key} className={agentPageStyles.statCard}>
                        <CardContent className="p-5">
                          <Badge className={cn('mb-3 border-0', stage.tone)}>{stage.label}</Badge>
                          <p className="text-2xl font-semibold text-slate-900">
                            {pipeline[stage.key].length}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Card className={agentPageStyles.panel}>
                    <CardHeader>
                      <CardTitle>Recent Leads</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {recentLeads.length > 0 ? (
                        <div className="space-y-3">
                          {recentLeads.map(lead => (
                            <div
                              key={lead.id}
                              className="flex items-center justify-between rounded-[12px] border border-slate-200/70 bg-[#fbfaf7] px-4 py-3"
                            >
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{lead.name}</p>
                                <p className="text-xs text-slate-500">
                                  {lead.property?.title || 'General enquiry'}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-slate-700">
                                  {formatStatus(lead.status)}
                                </p>
                                <p className="text-xs text-slate-500">{lead.source || 'Direct'}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <EmptyPanel
                          title="No lead activity yet"
                          description="Lead analytics will appear once enquiries start moving through your pipeline."
                        />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="revenue" className="mt-6 space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <MetricCard
                      title="Pending"
                      value={formatCurrency(commissionSummary.pending)}
                      subtitle="Awaiting payout"
                      icon={DollarSign}
                    />
                    <MetricCard
                      title="Approved"
                      value={formatCurrency(commissionSummary.approved)}
                      subtitle="Ready for payout"
                      icon={TrendingUp}
                    />
                    <MetricCard
                      title="Paid"
                      value={formatCurrency(commissionSummary.paid)}
                      subtitle="Completed commission income"
                      icon={Target}
                    />
                  </div>

                  <Card className={agentPageStyles.panel}>
                    <CardHeader>
                      <CardTitle>Recent Commission Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {commissions.length > 0 ? (
                        <div className="space-y-3">
                          {commissions.slice(0, 8).map(commission => (
                            <div
                              key={commission.id}
                              className="flex items-center justify-between rounded-[12px] border border-slate-200/70 bg-[#fbfaf7] px-4 py-3"
                            >
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {commission.property?.title || 'Commission entry'}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {commission.client?.name || 'No client linked'}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-slate-900">
                                  {formatCurrency(commission.amount)}
                                </p>
                                <Badge variant="outline" className="mt-1 rounded-full">
                                  {formatStatus(commission.status)}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <EmptyPanel
                          title="No commission activity yet"
                          description="Commission analytics will appear here as transactions move into pending, approved, and paid states."
                        />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </main>
      </div>
    </AgentAppShell>
  );
}
