import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { AgentAppShell } from '@/components/agent/AgentAppShell';
import { agentPageStyles } from '@/components/agent/agentPageStyles';
import { AgentFeatureLockedState } from '@/components/agent/AgentFeatureLockedState';
import { AgentJourneyStatusErrorState } from '@/components/agent/AgentJourneyStatusErrorState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { useAgentOnboardingStatus } from '@/hooks/useAgentOnboardingStatus';
import { getAgentJourneyAction, isAgentProfileJourneyStep } from '@/lib/agentJourney';
import { toast } from 'sonner';
import { BarChart3, Download, Eye, Home, Target, TrendingUp, Users } from 'lucide-react';

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
  commercial?: {
    listingTitle: string;
    spaceIdentifier: string;
    useType: string;
    city: string | null;
    province: string | null;
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

const TIME_RANGES: Array<{
  value: TimeRange;
  label: string;
  period: PerformancePeriod;
  days: number;
}> = [
  { value: '7d', label: '7 Days', period: 'week', days: 7 },
  { value: '30d', label: '30 Days', period: 'month', days: 30 },
  { value: '90d', label: '90 Days', period: 'quarter', days: 90 },
  { value: '1y', label: '1 Year', period: 'year', days: 365 },
];

const PIPELINE_STAGE_META: Array<{ key: PipelineStageKey; label: string; tone: string }> = [
  { key: 'new', label: 'New', tone: 'bg-slate-100 text-slate-700' },
  { key: 'contacted', label: 'Contacted', tone: 'bg-blue-100 text-blue-700' },
  { key: 'viewing', label: 'Viewing', tone: 'bg-violet-100 text-violet-700' },
  { key: 'offer', label: 'Offer', tone: 'bg-amber-100 text-amber-700' },
  { key: 'closed', label: 'Closed', tone: 'bg-emerald-100 text-emerald-700' },
];

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

function escapeCsvValue(value: string | number | null | undefined) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
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
  const {
    status,
    isLoading: statusLoading,
    error: statusError,
    retry: retryStatus,
  } = useAgentOnboardingStatus({
    requireDashboardUnlocked: true,
  });

  const selectedRange = TIME_RANGES.find(range => range.value === timeRange) || TIME_RANGES[1];
  const selectedRangeStart = useMemo(
    () => new Date(Date.now() - selectedRange.days * 24 * 60 * 60 * 1000).toISOString(),
    [selectedRange.days],
  );
  const analyticsEnabled = !statusLoading && Boolean(status?.fullFeaturesUnlocked);
  const hasRecordedSurfaceView = useRef(false);

  const { data: performance, isLoading: performanceLoading } =
    trpc.agent.getPerformanceAnalytics.useQuery(
      {
        period: selectedRange.period,
      },
      {
        enabled: analyticsEnabled,
        retry: false,
      },
    );
  const { data: pipelineData, isLoading: pipelineLoading } = trpc.agent.getLeadsPipeline.useQuery(
    {
      filters: { dateRange: { start: selectedRangeStart } },
    },
    {
      enabled: analyticsEnabled,
      retry: false,
    },
  );
  const { data: listingsData, isLoading: listingsLoading } = trpc.agent.getMyListings.useQuery(
    {
      status: 'active',
      limit: 50,
    },
    {
      enabled: analyticsEnabled,
      retry: false,
    },
  );

  const analyticsLocked = !statusLoading && !status?.fullFeaturesUnlocked;
  const journeyAction = getAgentJourneyAction(status);
  const needsProfileCompletion = isAgentProfileJourneyStep(status);

  const recordSurfaceView = trpc.agent.recordSurfaceView.useMutation();
  useEffect(() => {
    if (!analyticsEnabled || hasRecordedSurfaceView.current) return;
    hasRecordedSurfaceView.current = true;
    recordSurfaceView.mutate({ surface: 'analytics' });
  }, [analyticsEnabled, recordSurfaceView]);

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

  const isLoading = performanceLoading || pipelineLoading || listingsLoading;

  const handleExport = () => {
    if (isLoading) {
      toast.message('Your live analytics are still loading. Try exporting again in a moment.');
      return;
    }

    const reportRows: Array<Array<string | number>> = [
      ['Property Listify analytics report'],
      ['Lead and conversion period', selectedRange.label],
      ['Current inventory scope', 'All current live listings; listing engagement is cumulative'],
      ['Generated', new Date().toLocaleString('en-ZA')],
      [],
      ['Summary'],
      ['Cumulative listing views on current live inventory', totalListingViews],
      ['Current live listings', listings.length],
      ['Leads captured in selected period', performance?.totalLeads ?? allLeads.length],
      ['Converted lead cohort', performance?.convertedLeads ?? 0],
      ['Lead cohort conversion rate', `${performance?.conversionRate ?? 0}%`],
      [],
      ['Current pipeline stage', 'Leads captured in selected period'],
      ...PIPELINE_STAGE_META.map(stage => [stage.label, pipeline[stage.key].length]),
      [],
      ['Current live inventory snapshot'],
      ['Property', 'City', 'Type', 'Views', 'Enquiries', 'Price', 'Status'],
      ...listings.map(listing => [
        listing.title,
        listing.city,
        formatPropertyType(listing.propertyType),
        listing.views || 0,
        listing.enquiries || 0,
        formatPrice(listing.price),
        formatStatus(listing.status),
      ]),
      [],
      ['Leads captured in selected period'],
      ['Name', 'Property', 'Stage', 'Source', 'Received'],
      ...allLeads.map(lead => [
        lead.name,
        lead.commercial?.listingTitle || lead.property?.title || 'General enquiry',
        formatStatus(lead.status),
        lead.source || 'Direct',
        new Date(lead.createdAt).toLocaleString('en-ZA'),
      ]),
    ];
    const csv = reportRows.map(row => row.map(escapeCsvValue).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `property-listify-analytics-${timeRange}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
    toast.success('Analytics report downloaded');
  };

  return (
    <AgentAppShell>
      <div className="min-h-screen bg-[#f7f6f3]">
        <header className="border-b border-slate-200/80 bg-white/92 backdrop-blur-xl">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className={agentPageStyles.title}>Analytics Dashboard</h1>
                <p className={cn(agentPageStyles.subtitle, 'mt-1')}>
                  Lead activity for {selectedRange.label}, plus your current live inventory.
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
                {!statusLoading && !analyticsLocked ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className={agentPageStyles.ghostButton}
                    onClick={handleExport}
                    disabled={isLoading}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {isLoading ? 'Preparing…' : 'Export'}
                  </Button>
                ) : null}
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
          ) : statusError ? (
            <AgentJourneyStatusErrorState onRetry={retryStatus} />
          ) : analyticsLocked ? (
            <AgentFeatureLockedState
              title={
                needsProfileCompletion
                  ? 'Complete your profile before using analytics'
                  : journeyAction.title
              }
              description={
                needsProfileCompletion
                  ? 'Finish your professional profile, then activate Launch Access to see the reporting that supports your daily decisions.'
                  : journeyAction.description
              }
              actionLabel={journeyAction.waiting ? 'Return to dashboard' : journeyAction.label}
              onAction={() =>
                setLocation(journeyAction.waiting ? '/agent/dashboard' : journeyAction.href)
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Current Listing Views"
                  value={isLoading ? '—' : totalListingViews.toLocaleString('en-ZA')}
                  subtitle={`Cumulative across ${listings.length} live listing${listings.length === 1 ? '' : 's'}`}
                  icon={Eye}
                />
                <MetricCard
                  title="Lead Volume"
                  value={isLoading ? '—' : (performance?.totalLeads ?? allLeads.length)}
                  subtitle={`Leads received in ${selectedRange.label}`}
                  icon={Users}
                />
                <MetricCard
                  title="Lead Cohort Conversion"
                  value={isLoading ? '—' : `${performance?.conversionRate ?? 0}%`}
                  subtitle={`Of leads received in ${selectedRange.label}`}
                  icon={Target}
                />
                <MetricCard
                  title="Properties Closed"
                  value={isLoading ? '—' : (performance?.propertiesClosed ?? 0)}
                  subtitle={`Sold or rented in ${selectedRange.label}`}
                  icon={Home}
                />
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className={cn(agentPageStyles.tabsList, 'mt-2 grid w-full grid-cols-3')}>
                  <TabsTrigger value="overview" className={agentPageStyles.tabTrigger}>
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="listings" className={agentPageStyles.tabTrigger}>
                    Listings
                  </TabsTrigger>
                  <TabsTrigger value="leads" className={agentPageStyles.tabTrigger}>
                    Leads
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6 space-y-6">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <Card className={agentPageStyles.panel}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-blue-600" />
                          Lead Sources · {selectedRange.label}
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
                          Pipeline now · {selectedRange.label} leads
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
                        Current live inventory
                      </CardTitle>
                      <p className="text-sm text-slate-500">
                        Views and enquiries are cumulative for the live listings shown.
                      </p>
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
                      <CardTitle>Current live inventory snapshot</CardTitle>
                      <p className="text-sm text-slate-500">
                        Listing engagement is cumulative and is not filtered by the lead period.
                      </p>
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
                      <CardTitle>Leads received in {selectedRange.label}</CardTitle>
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
                                  {lead.commercial?.listingTitle ||
                                    lead.property?.title ||
                                    'General enquiry'}
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
                          title={`No leads received in ${selectedRange.label}`}
                          description="When enquiries arrive, their source and current pipeline stage will appear here."
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
