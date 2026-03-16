import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
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
  const [isSalesPackOpen, setIsSalesPackOpen] = useState(false);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [salesDocCategory, setSalesDocCategory] = useState<'brochures' | 'floorPlans' | 'videos'>('brochures');
  const [salesDocUrl, setSalesDocUrl] = useState('');
  const [salesDocName, setSalesDocName] = useState('');
  const [newChecklistLabel, setNewChecklistLabel] = useState('');

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

  const setupSnapshotQuery = trpc.distribution.developer.getSetupSnapshot.useQuery(
    { developmentId: selectedDevelopmentId as number },
    { enabled: !!selectedDevelopmentId, refetchOnWindowFocus: false, retry: false },
  );

  const salesPackQuery = trpc.distribution.developer.getDevelopmentDocuments.useQuery(
    { developmentId: selectedDevelopmentId as number },
    { enabled: !!selectedDevelopmentId, refetchOnWindowFocus: false, retry: false },
  );

  const checklistQuery = trpc.distribution.developer.listSubmissionChecklist.useQuery(
    { developmentId: selectedDevelopmentId as number },
    { enabled: !!selectedDevelopmentId && isChecklistOpen, refetchOnWindowFocus: false, retry: false },
  );

  const setSalesPackMutation = trpc.distribution.developer.setDevelopmentDocuments.useMutation({
    onSuccess: () => {
      toast.success('Sales pack updated');
      setSalesDocUrl('');
      setSalesDocName('');
      salesPackQuery.refetch();
      setupSnapshotQuery.refetch();
    },
    onError: err => toast.error(err.message || 'Unable to update sales pack'),
  });

  const requestAdminHelpMutation = trpc.distribution.developer.requestAdminHelp.useMutation({
    onSuccess: () => toast.success('Request sent to admin'),
    onError: err => toast.error(err.message || 'Unable to request admin help'),
  });

  const upsertChecklistMutation = trpc.distribution.developer.upsertSubmissionChecklistItem.useMutation({
    onSuccess: () => {
      toast.success('Submission requirements updated');
      setNewChecklistLabel('');
      checklistQuery.refetch();
      setupSnapshotQuery.refetch();
    },
    onError: err => toast.error(err.message || 'Unable to update submission requirements'),
  });

  const deleteChecklistMutation = trpc.distribution.developer.deleteSubmissionChecklistItem.useMutation({
    onSuccess: () => {
      toast.success('Removed');
      checklistQuery.refetch();
      setupSnapshotQuery.refetch();
    },
    onError: err => toast.error(err.message || 'Unable to remove item'),
  });

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
  const setupSnapshot: any = setupSnapshotQuery.data?.setup || null;
  const canGoLive = setupSnapshot?.readyToGoLive === true;
  const isLive = setupSnapshot?.setupState === 'submit_ready_live';
  const setupBadgeVariant = isLive ? 'default' : canGoLive ? 'secondary' : 'outline';
  const missingAdminKeys = useMemo(() => {
    const items = (setupSnapshot?.items || []) as any[];
    return items
      .filter(item => item && item.done === false && item.actor === 'admin')
      .map(item => String(item.key || ''))
      .filter(Boolean);
  }, [setupSnapshot]);

  const nextSetupKey = useMemo(() => {
    const missing = Array.isArray(setupSnapshot?.missing) ? (setupSnapshot.missing as string[]) : [];
    if (!isLive && canGoLive) return 'make_live' as const;
    if (missing.includes('sales_pack')) return 'sales_pack' as const;
    if (missing.includes('submission_checklist')) return 'submission_checklist' as const;
    if (missingAdminKeys.length > 0) return 'admin_help' as const;
    return null;
  }, [setupSnapshot, missingAdminKeys.length, isLive, canGoLive]);

  const nextSetupLabel =
    nextSetupKey === 'make_live'
      ? 'Make Live'
      : nextSetupKey === 'sales_pack'
        ? 'Upload Sales Pack'
        : nextSetupKey === 'submission_checklist'
          ? 'Submission Requirements'
          : nextSetupKey === 'admin_help'
            ? 'Request Admin Help'
            : null;

  const runNextSetupAction = () => {
    if (!selectedDevelopmentId || !nextSetupKey) return;
    if (nextSetupKey === 'sales_pack') return void setIsSalesPackOpen(true);
    if (nextSetupKey === 'submission_checklist') return void setIsChecklistOpen(true);
    if (nextSetupKey === 'admin_help') {
      if (missingAdminKeys.length === 0) return;
      requestAdminHelpMutation.mutate({
        developmentId: selectedDevelopmentId,
        missingKeys: missingAdminKeys,
        message: `Please help with: ${missingAdminKeys.join(', ')}`,
      });
      return;
    }
    if (nextSetupKey === 'make_live') {
      if (setDistributionEnabledMutation.isPending || isLive || !canGoLive) return;
      setDistributionEnabledMutation.mutate({ developmentId: selectedDevelopmentId, enabled: true });
    }
  };

  const appendSalesPackDoc = () => {
    if (!selectedDevelopmentId) return;
    const url = salesDocUrl.trim();
    if (!url) {
      toast.error('Add a document URL.');
      return;
    }
    const current = (salesPackQuery.data || {}) as any;
    const nextList = [...(current[salesDocCategory] || [])].map((item: any) => ({
      url: String(item?.url || item || '').trim(),
      name: item?.name ? String(item.name) : null,
    }));
    nextList.push({ url, name: salesDocName.trim() || null });

    setSalesPackMutation.mutate({
      developmentId: selectedDevelopmentId,
      [salesDocCategory]: nextList,
    } as any);
  };
  const distributionSummary = useMemo(() => {
    if (!selectedDevelopmentId) return null;
    const rows = (distributionDashboardQuery.data as any)?.developments || [];
    return rows.find((row: any) => Number(row.developmentId) === selectedDevelopmentId) || null;
  }, [distributionDashboardQuery.data, selectedDevelopmentId]);
  const distributionPanelVisible =
    !!selectedDevelopmentId && distributionSettings?.distributionEnabled === true;

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="card">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Distribution Setup</p>
                  <p className="text-xs text-muted-foreground">
                    Finish setup before making this development live to referrers.
                  </p>
                </div>
                <Badge variant={setupBadgeVariant as any}>{setupSnapshot?.setupLabel || 'Setup'}</Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{setupSnapshot?.progressPercent ?? 0}%</span>
                </div>
                <Progress value={setupSnapshot?.progressPercent ?? 0} />
              </div>

              <div className="space-y-1 text-sm">
                {(setupSnapshot?.items || []).map((item: any) => (
                  <div key={item.key} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className={item.done ? 'text-foreground' : 'text-slate-700'}>{item.label}</span>
                      {!item.done && item.actor === 'admin' ? (
                        <span className="ml-2 text-xs text-muted-foreground">(Admin)</span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.done ? 'default' : 'outline'}>{item.done ? 'Done' : 'Missing'}</Badge>
                      {!item.done && String(item.key) === 'sales_pack' ? (
                        <Button size="sm" variant="outline" onClick={() => setIsSalesPackOpen(true)}>
                          Upload
                        </Button>
                      ) : null}
                      {!item.done && String(item.key) === 'submission_checklist' ? (
                        <Button size="sm" variant="outline" onClick={() => setIsChecklistOpen(true)}>
                          Edit
                        </Button>
                      ) : null}
                      {!item.done && item.actor === 'admin' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={requestAdminHelpMutation.isPending}
                          onClick={() =>
                            requestAdminHelpMutation.mutate({
                              developmentId: selectedDevelopmentId,
                              missingKeys: [String(item.key)],
                              message: `Please help with: ${String(item.label || item.key)}`,
                            })
                          }
                        >
                          Request
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              {nextSetupLabel ? (
                <div className="rounded-md border bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Next step:</span>{' '}
                      <span className="font-medium">{nextSetupLabel}</span>
                    </div>
                    <Button
                      disabled={
                        !selectedDevelopmentId ||
                        (nextSetupKey === 'admin_help' && requestAdminHelpMutation.isPending) ||
                        (nextSetupKey === 'make_live' &&
                          (setDistributionEnabledMutation.isPending || isLive || !canGoLive))
                      }
                      onClick={runNextSetupAction}
                    >
                      {nextSetupLabel}
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setIsSalesPackOpen(true)}>
                  Upload Sales Pack
                </Button>
                <Button variant="outline" onClick={() => setIsChecklistOpen(true)}>
                  Submission Requirements
                </Button>
                {missingAdminKeys.length > 0 ? (
                  <Button
                    variant="outline"
                    disabled={requestAdminHelpMutation.isPending}
                    onClick={() =>
                      requestAdminHelpMutation.mutate({
                        developmentId: selectedDevelopmentId,
                        missingKeys: missingAdminKeys,
                        message: `Please help with: ${missingAdminKeys.join(', ')}`,
                      })
                    }
                  >
                    Request Admin Help
                  </Button>
                ) : null}
                <Button variant="outline" onClick={() => setupSnapshotQuery.refetch()} disabled={setupSnapshotQuery.isLoading}>
                  Refresh
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Minimum to go live: 1 brochure, floor plan, or video plus 1 submission requirement.
              </p>
            </CardContent>
          </Card>

          <Card className="card">
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Referral Distribution</p>
                <p className="text-xs text-muted-foreground">
                  Referrers only see developments that are fully configured and live.
                </p>
                <Badge variant={setupBadgeVariant as any}>{setupSnapshot?.setupLabel || 'Setup'}</Badge>
              </div>
              <Button
                variant={isLive ? 'outline' : 'default'}
                disabled={setDistributionEnabledMutation.isPending || (!isLive && !canGoLive)}
                onClick={() =>
                  setDistributionEnabledMutation.mutate({
                    developmentId: selectedDevelopmentId,
                    enabled: !isLive,
                  })
                }
              >
                {isLive ? 'Take Offline' : canGoLive ? 'Make Live' : 'Setup Needed'}
              </Button>
              <Button variant="outline" onClick={() => setIsReferralAccessOpen(true)}>
                Manage Referral Access
              </Button>
            </CardContent>
          </Card>
        </div>
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
            <div className="border rounded-md p-3 space-y-3">
              <p className="text-sm font-medium">Status</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Distribution</p>
                  <p className="font-medium">
                    {distributionSettings?.distributionEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Eligible Partners</p>
                  <p className="font-medium">{formatNumber(distributionSettings?.eligiblePartnerCount || 0)}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Visibility is enforced server-side: only eligible referral partners can access this
                development.
              </p>
            </div>

            <div className="border rounded-md p-3 space-y-2">
              <p className="text-sm font-medium">Eligibility Controls</p>
              <p className="text-xs text-muted-foreground">
                Access model: <span className="font-medium text-foreground">{distributionSettings?.accessModel || 'unknown'}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Tier policy: <span className="font-medium text-foreground">{distributionSettings?.tierAccessPolicy || 'restricted'}</span>
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {(['tier_1', 'tier_2', 'tier_3', 'tier_4'] as const).map(tier => (
                  <div key={tier} className="border rounded-md p-2">
                    <p className="text-muted-foreground">{tier.replace('_', ' ').toUpperCase()}</p>
                    <p className="font-medium">
                      {formatNumber(distributionSettings?.eligiblePartnersByTier?.[tier] || 0)} partner(s)
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Allowed tiers: {(distributionSettings?.allowedTiers || []).join(', ') || 'none'}
              </p>
            </div>

            <div className="border rounded-md p-3 space-y-2">
              <p className="text-sm font-medium">Commission</p>
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">
                  Model: <span className="font-medium text-foreground">{distributionSettings?.commissionModel || 'flat_percentage'}</span>
                </p>
                <p className="text-muted-foreground">
                  Default percent: <span className="font-medium text-foreground">{distributionSettings?.defaultCommissionPercent ?? 0}%</span>
                </p>
                <p className="text-muted-foreground">
                  Default amount: <span className="font-medium text-foreground">{formatNumber(distributionSettings?.defaultCommissionAmount || 0)}</span>
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
            <Button disabled>Request Changes (Coming Soon)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isSalesPackOpen}
        onOpenChange={open => {
          setIsSalesPackOpen(open);
          if (!open) {
            setSalesDocUrl('');
            setSalesDocName('');
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Upload Sales Pack</DialogTitle>
            <DialogDescription>
              Add at least one brochure, floor plan, or video so referrers can understand the development.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2">
              <p className="text-sm font-medium">Category</p>
              <select
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={salesDocCategory}
                onChange={e => setSalesDocCategory(e.target.value as any)}
              >
                <option value="brochures">Brochure</option>
                <option value="floorPlans">Floor plan</option>
                <option value="videos">Video</option>
              </select>
            </div>

            <div className="grid gap-2">
              <p className="text-sm font-medium">Document</p>
              <Input
                value={salesDocName}
                onChange={e => setSalesDocName(e.target.value)}
                placeholder="Optional name"
              />
              <Input
                value={salesDocUrl}
                onChange={e => setSalesDocUrl(e.target.value)}
                placeholder="https://..."
              />
              <Button
                disabled={!salesDocUrl.trim() || setSalesPackMutation.isPending}
                onClick={appendSalesPackDoc}
              >
                Upload
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {(
                [
                  { key: 'brochures', label: 'Brochures' },
                  { key: 'floorPlans', label: 'Floor Plans' },
                  { key: 'videos', label: 'Videos' },
                ] as const
              ).map(group => {
                const rows = ((salesPackQuery.data as any)?.[group.key] || []) as Array<{
                  name?: string | null;
                  url: string;
                }>;
                return (
                  <div key={group.key} className="rounded border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium">{group.label}</p>
                      <Badge variant="outline">{rows.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {rows.map((row, index) => (
                        <div key={`${group.key}-${index}`} className="rounded border bg-slate-50 p-2">
                          <p className="truncate text-xs font-medium text-slate-800">
                            {row.name || row.url}
                          </p>
                          <p className="truncate text-[11px] text-slate-500">{row.url}</p>
                          <div className="mt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(row.url, '_blank', 'noopener,noreferrer')}
                            >
                              Open
                            </Button>
                          </div>
                        </div>
                      ))}
                      {!rows.length ? <p className="text-xs text-slate-500">No documents yet.</p> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSalesPackOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isChecklistOpen}
        onOpenChange={open => {
          setIsChecklistOpen(open);
          if (!open) setNewChecklistLabel('');
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Submission Requirements</DialogTitle>
            <DialogDescription>
              Define what the referrer must upload when submitting a client. Minimum to go live: at least 1 required item.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newChecklistLabel}
                onChange={e => setNewChecklistLabel(e.target.value)}
                placeholder="Add required document (e.g. ID Document)"
              />
              <Button
                disabled={!newChecklistLabel.trim() || upsertChecklistMutation.isPending || !selectedDevelopmentId}
                onClick={() =>
                  upsertChecklistMutation.mutate({
                    developmentId: selectedDevelopmentId as number,
                    documentLabel: newChecklistLabel.trim(),
                    isRequired: true,
                    displayOrder: 0,
                  } as any)
                }
              >
                Add
              </Button>
            </div>

            {checklistQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (checklistQuery.data?.items || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No required documents yet.</p>
            ) : (
              <div className="space-y-2">
                {(checklistQuery.data?.items || []).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between rounded border px-2 py-1 text-sm">
                    <span className="truncate">{item.documentLabel}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={deleteChecklistMutation.isPending}
                      onClick={() =>
                        deleteChecklistMutation.mutate({
                          developmentId: selectedDevelopmentId as number,
                          id: Number(item.id),
                        })
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChecklistOpen(false)}>
              Close
            </Button>
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

