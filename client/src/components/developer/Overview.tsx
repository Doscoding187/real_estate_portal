import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Building2,
  Clock3,
  Filter,
  PhoneCall,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

type Range = '7d' | '30d' | '90d';

function formatNumber(n?: number): string {
  if (typeof n !== 'number' || Number.isNaN(n)) return '0';
  return new Intl.NumberFormat().format(n);
}

function formatHours(hours?: number): string {
  if (typeof hours !== 'number' || Number.isNaN(hours)) return '0h';
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

function formatMinutes(mins?: number): string {
  if (typeof mins !== 'number' || Number.isNaN(mins)) return '0m';
  if (mins < 60) return `${mins.toFixed(0)}m`;
  return `${(mins / 60).toFixed(1)}h`;
}

export default function Overview() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [location, setLocation] = useLocation();
  const [range, setRange] = useState<Range>('30d');
  const [developmentFilter, setDevelopmentFilter] = useState<string>('all');
  const [isReferralAccessOpen, setIsReferralAccessOpen] = useState(false);
  const [allowedTiers, setAllowedTiers] = useState({
    tier_1: true,
    tier_2: true,
    tier_3: false,
    tier_4: false,
  });

  const isSuperAdmin = user?.role === 'super_admin';

  const {
    data: developerProfile,
    isLoading: profileLoading,
    error: profileError,
  } = trpc.developer.getProfile.useQuery(undefined, { retry: false });

  const {
    data: developments = [],
    isLoading: developmentsLoading,
    error: developmentsError,
  } = trpc.developer.getDevelopments.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const selectedDevelopmentId =
    developmentFilter === 'all' ? undefined : Number(developmentFilter);

  const distributionSettingsQuery = trpc.developer.getDistributionSettings.useQuery(
    {
      developmentId: selectedDevelopmentId || 0,
    },
    {
      enabled: !!developerProfile && !!selectedDevelopmentId,
      refetchOnWindowFocus: false,
    },
  );

  const setDistributionEnabledMutation = trpc.developer.setDistributionEnabled.useMutation({
    onSuccess: async data => {
      toast.success(
        data.distributionEnabled
          ? 'Referral distribution enabled for this development.'
          : 'Referral distribution disabled for this development.',
      );
      await Promise.all([
        distributionSettingsQuery.refetch(),
        utils.developer.getLeads.invalidate(),
        utils.developer.getFunnelKPIs.invalidate(),
      ]);
    },
    onError: error => {
      toast.error(error.message || 'Could not update referral distribution setting.');
    },
  });

  const distributionDashboardQuery = trpc.distribution.developer.dashboard.useQuery(
    {
      dealLimit: 1000,
    },
    {
      enabled:
        !!selectedDevelopmentId && distributionSettingsQuery.data?.distributionEnabled === true,
      refetchOnWindowFocus: false,
    },
  );

  const funnelKpisQuery = trpc.developer.getFunnelKPIs.useQuery(
    {
      range,
      developmentId: selectedDevelopmentId,
    },
    {
      enabled: !!developerProfile,
      refetchOnWindowFocus: false,
    },
  );

  const funnelAttentionQuery = trpc.developer.getFunnelAttention.useQuery(
    {
      range,
      developmentId: selectedDevelopmentId,
      limit: 5,
    },
    {
      enabled: !!developerProfile,
      refetchOnWindowFocus: false,
    },
  );

  const isNewDeveloper = !developments || developments.length === 0;
  const profileStatus = (developerProfile as any)?.status as string | undefined;
  const profileRejectionReason = (developerProfile as any)?.rejectionReason as string | undefined;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rangeFromUrl = params.get('range');
    const developmentFromUrl = params.get('developmentId');

    const nextRange: Range =
      rangeFromUrl === '7d' || rangeFromUrl === '30d' || rangeFromUrl === '90d'
        ? rangeFromUrl
        : '30d';
    const nextDevelopment =
      developmentFromUrl && developmentFromUrl.trim().length > 0 ? developmentFromUrl : 'all';

    if (range !== nextRange) setRange(nextRange);
    if (developmentFilter !== nextDevelopment) setDevelopmentFilter(nextDevelopment);
  }, [location]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const currentRange = params.get('range') || '30d';
    const currentDevelopment = params.get('developmentId') || 'all';

    if (currentRange === range && currentDevelopment === developmentFilter) return;

    params.set('range', range);
    params.set('developmentId', developmentFilter || 'all');
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}?${nextSearch}`;
    window.history.replaceState(window.history.state, '', nextUrl);
  }, [range, developmentFilter, location]);

  const goToLeads = (params: {
    view?: 'pipeline' | 'attention';
    stage?: string;
    sla?: 'warning' | 'breach';
    source?: string;
    leadId?: string;
  }) => {
    const search = new URLSearchParams();
    search.set('range', range);
    if (params.view) search.set('view', params.view);
    if (params.stage) search.set('stage', params.stage);
    if (params.sla) search.set('sla', params.sla);
    if (params.source) search.set('source', params.source);
    if (params.leadId) search.set('leadId', params.leadId);
    if (selectedDevelopmentId) search.set('developmentId', String(selectedDevelopmentId));
    setLocation(`/developer/leads?${search.toString()}`);
  };

  const kpis: any = funnelKpisQuery.data || {};
  const stageCounts: any = kpis.stageCounts || {};
  const conversion: any = kpis.conversion || {};
  const velocity: any = kpis.velocity || {};
  const bySource: Record<string, number> = kpis.bySource || {};
  const attention: any = funnelAttentionQuery.data || { items: [], breachCount: 0, warningCount: 0 };
  const distributionSettings: any = distributionSettingsQuery.data || null;
  const distributionSummary = useMemo(() => {
    if (!selectedDevelopmentId) return null;
    const rows = (distributionDashboardQuery.data as any)?.developments || [];
    return rows.find((row: any) => Number(row.developmentId) === selectedDevelopmentId) || null;
  }, [distributionDashboardQuery.data, selectedDevelopmentId]);
  const distributionPanelVisible =
    !!selectedDevelopmentId && distributionSettings?.distributionEnabled === true;

  const toggleTier = (tier: keyof typeof allowedTiers) => {
    setAllowedTiers(prev => ({ ...prev, [tier]: !prev[tier] }));
  };

  const snapshotTiles = [
    { label: 'New', value: stageCounts.new || 0, stage: 'new' },
    { label: 'Contacted', value: stageCounts.contacted || 0, stage: 'contacted' },
    { label: 'Qualified', value: stageCounts.qualified || 0, stage: 'qualified' },
    { label: 'Viewings Scheduled', value: stageCounts.viewing_scheduled || 0, stage: 'viewing' },
    { label: 'Offers', value: stageCounts.offer_made || 0, stage: 'offer' },
    { label: 'Closed Won', value: stageCounts.closed_won || 0, stage: 'won' },
    {
      label: 'Closed Lost',
      value:
        (stageCounts.closed_lost || 0) + (stageCounts.spam || 0) + (stageCounts.duplicate || 0),
      stage: 'lost',
    },
  ];

  const sourceRows = useMemo(() => {
    return Object.entries(bySource)
      .map(([channel, count]) => ({ channel, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [bySource]);

  const contactRate =
    Number(stageCounts.new || 0) > 0
      ? ((Number(stageCounts.contacted || 0) / Number(stageCounts.new || 1)) * 100).toFixed(1)
      : '0.0';
  const qualificationRate =
    Number(stageCounts.contacted || 0) > 0
      ? ((Number(stageCounts.qualified || 0) / Number(stageCounts.contacted || 1)) * 100).toFixed(1)
      : '0.0';
  const closeFromQualifiedRate =
    Number(stageCounts.qualified || 0) > 0
      ? ((Number(stageCounts.closed_won || 0) / Number(stageCounts.qualified || 1)) * 100).toFixed(1)
      : '0.0';

  const topLeakage = useMemo(() => {
    const pairs = [
      { from: 'new', fromLabel: 'New', to: 'contacted', toLabel: 'Contacted' },
      { from: 'contacted', fromLabel: 'Contacted', to: 'qualified', toLabel: 'Qualified' },
      {
        from: 'qualified',
        fromLabel: 'Qualified',
        to: 'viewing_scheduled',
        toLabel: 'Viewing Scheduled',
      },
      {
        from: 'viewing_scheduled',
        fromLabel: 'Viewing Scheduled',
        to: 'offer_made',
        toLabel: 'Offer Made',
      },
      { from: 'offer_made', fromLabel: 'Offer Made', to: 'closed_won', toLabel: 'Closed Won' },
    ];

    let best: { label: string; dropPct: number } = { label: 'n/a', dropPct: 0 };

    for (const pair of pairs) {
      const fromVal = Number(stageCounts[pair.from] || 0);
      const toVal = Number(stageCounts[pair.to] || 0);
      if (fromVal <= 0) continue;
      const dropPct = ((fromVal - Math.min(fromVal, toVal)) / fromVal) * 100;
      if (dropPct > best.dropPct) {
        best = {
          label: `${pair.fromLabel} -> ${pair.toLabel}`,
          dropPct,
        };
      }
    }

    return best;
  }, [stageCounts]);

  if (profileLoading || developmentsLoading) {
    return (
      <div className="space-y-6">
        <div className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (profileError || developmentsError) {
    return (
      <Card className="card">
        <CardContent className="py-12 text-center space-y-3">
          <h3 className="text-lg font-semibold">Unable to load control tower</h3>
          <p className="text-slate-600 text-sm">
            {profileError?.message || developmentsError?.message || 'Unknown dashboard error'}
          </p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  if (!developerProfile) {
    return (
      <Card className="card">
        <CardContent className="py-12 text-center space-y-3">
          <Building2 className="w-10 h-10 mx-auto text-blue-600" />
          <h3 className="text-lg font-semibold">Complete your developer profile</h3>
          <Button onClick={() => (window.location.href = '/developer/setup')}>Go to Setup</Button>
        </CardContent>
      </Card>
    );
  }

  if (profileStatus === 'pending') {
    return (
      <Card className="card">
        <CardContent className="py-12 text-center space-y-3">
          <h3 className="text-lg font-semibold">Profile under review</h3>
          <p className="text-slate-600 text-sm">
            Your profile is currently being verified by the admin team.
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Refresh Status
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (profileStatus === 'rejected') {
    return (
      <Card className="card">
        <CardContent className="py-12 text-center space-y-3">
          <h3 className="text-lg font-semibold">Profile rejected</h3>
          <p className="text-slate-600 text-sm">
            {profileRejectionReason || 'Please update and resubmit.'}
          </p>
          <Button onClick={() => (window.location.href = '/developer/setup')}>Update Profile</Button>
        </CardContent>
      </Card>
    );
  }

  if (isNewDeveloper) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <Building2 className="w-12 h-12 text-blue-600" />
        <h2 className="text-3xl font-bold text-slate-900">Launch your first development funnel</h2>
        <p className="text-slate-600 text-center max-w-xl">
          Build your first project, start capturing leads, and this control tower will track your funnel health.
        </p>
        <Button onClick={() => (window.location.href = '/developer/create-development')}>
          Create Development
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="card">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="typ-h2">Developer Control Tower</h2>
            <p className="text-muted-foreground text-sm">
              {isSuperAdmin ? 'Emulation mode' : 'Live'} funnel operations and revenue signals.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={range} onValueChange={value => setRange(value as Range)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7d</SelectItem>
                <SelectItem value="30d">30d</SelectItem>
                <SelectItem value="90d">90d</SelectItem>
              </SelectContent>
            </Select>

            <Select value={developmentFilter} onValueChange={setDevelopmentFilter}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="All developments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All developments</SelectItem>
                {developments.map((dev: any) => (
                  <SelectItem key={dev.id} value={String(dev.id)}>
                    {dev.name || `Development #${dev.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedDevelopmentId && (
        <Card className="card">
          <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Referral Distribution</p>
              <p className="text-xs text-muted-foreground">
                Distribution is opt-in per development. Keep it private by default and enable only
                when ready.
              </p>
              <Badge variant={distributionSettings?.distributionEnabled ? 'default' : 'outline'}>
                {distributionSettings?.distributionEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <Button
              variant={distributionSettings?.distributionEnabled ? 'outline' : 'default'}
              disabled={setDistributionEnabledMutation.isPending}
              onClick={() =>
                setDistributionEnabledMutation.mutate({
                  developmentId: selectedDevelopmentId,
                  enabled: !distributionSettings?.distributionEnabled,
                })
              }
            >
              {distributionSettings?.distributionEnabled ? 'Disable Distribution' : 'Enable Distribution'}
            </Button>
            <Button variant="outline" onClick={() => setIsReferralAccessOpen(true)}>
              Manage Referral Access
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isReferralAccessOpen} onOpenChange={setIsReferralAccessOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Manage Referral Access</DialogTitle>
            <DialogDescription>
              Configure who can refer this development and review the referral commission setup.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="border rounded-md p-3 space-y-2">
              <p className="text-sm font-medium">Access</p>
              <p className="text-xs text-muted-foreground">
                Allowed tiers for referral partners. Final enforcement remains server-side.
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {(['tier_1', 'tier_2', 'tier_3', 'tier_4'] as const).map(tier => (
                  <label key={tier} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allowedTiers[tier]}
                      onChange={() => toggleTier(tier)}
                    />
                    <span>{tier.replace('_', ' ').toUpperCase()}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="border rounded-md p-3 space-y-2">
              <p className="text-sm font-medium">Commission</p>
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">
                  Tier policy: <span className="font-medium text-foreground">{distributionSettings?.tierAccessPolicy || 'restricted'}</span>
                </p>
                <p className="text-muted-foreground">
                  Default commission: <span className="font-medium text-foreground">{distributionSettings?.defaultCommissionPercent ?? 0}%</span>
                </p>
              </div>
            </div>

            <div className="border rounded-md p-3 space-y-1">
              <p className="text-sm font-medium">Visibility</p>
              <p className="text-xs text-muted-foreground">
                This development is visible only to eligible referral partners when distribution is enabled.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReferralAccessOpen(false)}>
              Close
            </Button>
            <Button disabled>Save Changes (Coming Soon)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-4">
        {snapshotTiles.map(tile => (
          <button
            key={tile.label}
            className="text-left"
            onClick={() => goToLeads({ view: 'pipeline', stage: tile.stage })}
          >
            <Card className="card h-full hover:border-blue-300 transition-colors">
              <CardContent className="p-4 space-y-1">
                <p className="text-xs text-muted-foreground">{tile.label}</p>
                <p className="text-2xl font-semibold">{formatNumber(tile.value)}</p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="card xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Attention Required
            </CardTitle>
            <CardDescription>Prioritize SLA risk before pipeline work.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button className="text-left" onClick={() => goToLeads({ view: 'attention', sla: 'breach' })}>
                <div className="border rounded-md p-3 hover:border-rose-300 transition-colors">
                  <p className="text-xs text-muted-foreground">Breaches</p>
                  <p className="text-xl font-semibold text-rose-600">{formatNumber(attention.breachCount)}</p>
                </div>
              </button>
              <button className="text-left" onClick={() => goToLeads({ view: 'attention', sla: 'warning' })}>
                <div className="border rounded-md p-3 hover:border-amber-300 transition-colors">
                  <p className="text-xs text-muted-foreground">Warnings</p>
                  <p className="text-xl font-semibold text-amber-600">{formatNumber(attention.warningCount)}</p>
                </div>
              </button>
            </div>

            <div className="space-y-2">
              {(attention.items || []).slice(0, 5).map((lead: any) => (
                <div key={lead.id} className="border rounded-md p-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium truncate">{lead.contact?.name || 'Unnamed lead'}</p>
                    <Badge variant="outline">{lead.stage}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {lead.attentionReason || 'Needs follow-up'}
                  </p>
                  <div className="flex justify-end mt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => goToLeads({ view: 'attention', leadId: String(lead.id) })}
                    >
                      Open
                      <ArrowUpRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              ))}
              {(!attention.items || attention.items.length === 0) && (
                <p className="text-sm text-muted-foreground">No warning/breach leads in this range.</p>
              )}
            </div>

            <Button variant="outline" className="w-full" onClick={() => goToLeads({ view: 'attention' })}>
              Work Queue
            </Button>
          </CardContent>
        </Card>

        <Card className="card xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="w-4 h-4 text-blue-600" />
              Conversion and Leakage
            </CardTitle>
            <CardDescription>Find where the funnel is leaking.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contact rate</span>
                <span className="font-medium">{contactRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Qualification rate</span>
                <span className="font-medium">{qualificationRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Close rate (from qualified)</span>
                <span className="font-medium">{closeFromQualifiedRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Overall close rate</span>
                <span className="font-medium">{conversion.overallConversionRate ?? 0}%</span>
              </div>
            </div>

            <div className="border rounded-md p-3 bg-slate-50">
              <p className="text-xs text-muted-foreground">Top drop-off stage</p>
              <p className="font-medium text-sm">{topLeakage.label}</p>
              <p className="text-xs text-rose-600">-{topLeakage.dropPct.toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>

        <Card className="card xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock3 className="w-4 h-4 text-indigo-600" />
              Velocity
            </CardTitle>
            <CardDescription>Lead response and movement speed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                <PhoneCall className="w-3 h-3" />
                Avg time to first contact
              </span>
              <span className="font-medium">{formatMinutes(velocity.avgTimeToFirstContactMins)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Avg age of open leads</span>
              <span className="font-medium">{formatHours(velocity.avgOpenLeadAgeHours)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Avg age in qualified (proxy)</span>
              <span className="font-medium">{formatHours(velocity.avgQualifiedLeadAgeHoursProxy)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            Source Performance
          </CardTitle>
          <CardDescription>Top channels driving leads in the selected range.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {sourceRows.map(row => (
            <button
              key={row.channel}
              className="w-full text-left border rounded-md p-3 hover:border-emerald-300 transition-colors"
              onClick={() => goToLeads({ view: 'pipeline', source: row.channel })}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{row.channel}</span>
                <Badge variant="outline">{formatNumber(row.count)}</Badge>
              </div>
            </button>
          ))}
          {sourceRows.length === 0 && (
            <p className="text-sm text-muted-foreground">No source data available for this range.</p>
          )}
        </CardContent>
      </Card>

      {selectedDevelopmentId && (
        <Card className="card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-4 h-4 text-cyan-600" />
              Distribution Impact
            </CardTitle>
            <CardDescription>
              Referral distribution metrics for the selected development.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!distributionPanelVisible && (
              <p className="text-sm text-muted-foreground">
                Distribution is disabled for this development. Enable it to unlock referral KPIs.
              </p>
            )}

            {distributionPanelVisible && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                  <div className="border rounded-md p-3">
                    <p className="text-xs text-muted-foreground">Referral Deals</p>
                    <p className="text-xl font-semibold">
                      {formatNumber(Number(distributionSummary?.totalDeals || 0))}
                    </p>
                  </div>
                  <div className="border rounded-md p-3">
                    <p className="text-xs text-muted-foreground">Closed Deals</p>
                    <p className="text-xl font-semibold">
                      {formatNumber(Number(distributionSummary?.closedDeals || 0))}
                    </p>
                  </div>
                  <div className="border rounded-md p-3">
                    <p className="text-xs text-muted-foreground">Conversion</p>
                    <p className="text-xl font-semibold">
                      {Number(distributionSummary?.conversionRate || 0).toFixed(1)}%
                    </p>
                  </div>
                  <div className="border rounded-md p-3">
                    <p className="text-xs text-muted-foreground">Commission Pending</p>
                    <p className="text-xl font-semibold">
                      {formatNumber(Number(distributionSummary?.commissionPendingAmount || 0))}
                    </p>
                  </div>
                  <div className="border rounded-md p-3">
                    <p className="text-xs text-muted-foreground">Commission Paid</p>
                    <p className="text-xl font-semibold">
                      {formatNumber(Number(distributionSummary?.commissionPaidAmount || 0))}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => goToLeads({ view: 'pipeline', source: 'distribution' })}
                  >
                    Open Referral Leads
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

