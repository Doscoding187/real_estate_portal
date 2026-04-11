import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Clock3,
  PhoneCall,
  Search,
  UserPlus,
  UserX,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { stageGroupMatches, useDeveloperLeadsQuery } from '@/hooks/useDeveloperLeadsQuery';
import { useLocation } from 'wouter';

type StageTab = 'new' | 'contacted' | 'qualified' | 'viewing' | 'offer' | 'deal' | 'won' | 'lost';

type LeadItem = {
  id: string;
  developmentId: string;
  createdAt: string;
  updatedAt?: string;
  lastActivityAt: string | null;
  contact: { name?: string; phone?: string; email?: string };
  source: { channel: string; utmSource?: string; utmCampaign?: string };
  stage: string;
  allowedTransitions?: string[];
  owner: { ownerType: string; ownerId: string | null; ownerName?: string | null };
  sla: { status: 'ok' | 'warning' | 'breach'; timeToFirstContactMins?: number | null };
  nextAction: { type?: string | null; at?: string | null };
  flags?: { duplicate?: boolean; spam?: boolean; priority?: 'low' | 'med' | 'high' };
  notes?: string | null;
};

const STAGE_TABS: Array<{ key: StageTab; label: string }> = [
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'viewing', label: 'Viewing' },
  { key: 'offer', label: 'Offer' },
  { key: 'deal', label: 'Deal' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
];

function formatRelative(ts?: string | null): string {
  if (!ts) return 'n/a';
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return 'n/a';
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

function toIsoRangeDateStart(date: string): string | undefined {
  if (!date) return undefined;
  return new Date(`${date}T00:00:00`).toISOString();
}

function toIsoRangeDateEnd(date: string): string | undefined {
  if (!date) return undefined;
  return new Date(`${date}T23:59:59`).toISOString();
}

function toLocalDateTimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function stageBadgeClass(stage: string): string {
  if (stage === 'closed_won') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (stage === 'closed_lost' || stage === 'spam' || stage === 'duplicate')
    return 'bg-rose-100 text-rose-700 border-rose-200';
  if (stage === 'deal_in_progress') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (stage.includes('viewing')) return 'bg-indigo-100 text-indigo-700 border-indigo-200';
  if (stage === 'qualified') return 'bg-sky-100 text-sky-700 border-sky-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function slaBadgeClass(status: 'ok' | 'warning' | 'breach'): string {
  if (status === 'breach') return 'bg-rose-100 text-rose-700 border-rose-200';
  if (status === 'warning') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-emerald-100 text-emerald-700 border-emerald-200';
}

export default function LeadsManager() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [location] = useLocation();

  const [selectedStage, setSelectedStage] = useState<StageTab>('new');
  const [viewMode, setViewMode] = useState<'pipeline' | 'attention'>('pipeline');
  const [attentionFilter, setAttentionFilter] = useState<'all' | 'warning' | 'breach'>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<
    'all' | 'developer_sales' | 'agency' | 'distribution_partner' | 'unassigned'
  >('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [developmentFilter, setDevelopmentFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [rangeFilter, setRangeFilter] = useState<'7d' | '30d' | '90d'>('30d');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [activityType, setActivityType] = useState<
    'note' | 'call' | 'email' | 'meeting' | 'status_change' | 'whatsapp'
  >('call');
  const [activityDescription, setActivityDescription] = useState('');
  const [transitionTarget, setTransitionTarget] = useState('');
  const [transitionNotes, setTransitionNotes] = useState('');
  const [nextActionType, setNextActionType] = useState<
    'call' | 'email' | 'whatsapp' | 'schedule_viewing' | 'send_brochure' | 'other'
  >('call');
  const [nextActionAtLocal, setNextActionAtLocal] = useState('');

  const selectedDevelopmentId = developmentFilter === 'all' ? undefined : Number(developmentFilter);

  const { data: developments = [] } = trpc.developer.getDevelopments.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const stage = params.get('stage');
    const sla = params.get('sla');
    const q = params.get('q');
    const source = params.get('source');
    const leadId = params.get('leadId');
    const developmentId = params.get('developmentId');
    const range = params.get('range');

    if (view === 'attention' || view === 'pipeline') {
      setViewMode(view);
    }

    if (
      stage &&
      ['new', 'contacted', 'qualified', 'viewing', 'offer', 'deal', 'won', 'lost'].includes(stage)
    ) {
      setSelectedStage(stage as StageTab);
    }

    if (sla && ['all', 'warning', 'breach'].includes(sla)) {
      setAttentionFilter(sla as 'all' | 'warning' | 'breach');
    }

    if (q != null) {
      setSearch(q);
      setDebouncedSearch(q);
    }

    if (source) {
      setSourceFilter(source);
    }

    if (leadId) {
      setSelectedLeadId(leadId);
    }

    if (developmentId && Number.isFinite(Number(developmentId))) {
      setDevelopmentFilter(String(Number(developmentId)));
    }

    if (range && ['7d', '30d', '90d'].includes(range)) {
      setRangeFilter(range as '7d' | '30d' | '90d');
      const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - days);
      const toDateInput = (d: Date) => d.toISOString().slice(0, 10);
      setDateFrom(toDateInput(start));
      setDateTo(toDateInput(end));
    }
  }, [location]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const leadsQuery = useDeveloperLeadsQuery({
    developmentId: selectedDevelopmentId,
    owner: ownerFilter === 'all' ? undefined : ownerFilter,
    source: sourceFilter === 'all' ? undefined : sourceFilter,
    q: debouncedSearch || undefined,
    from: toIsoRangeDateStart(dateFrom),
    to: toIsoRangeDateEnd(dateTo),
    limit: 500,
    offset: 0,
  });

  const attentionQuery = trpc.developer.getFunnelAttention.useQuery(
    {
      developmentId: selectedDevelopmentId,
      range: rangeFilter,
      sla: attentionFilter === 'all' ? undefined : attentionFilter,
      limit: 500,
    },
    {
      refetchOnWindowFocus: false,
    },
  );

  const invalidateLeadViews = async () => {
    await Promise.all([
      utils.developer.getLeads.invalidate(),
      utils.developer.getFunnelAttention.invalidate(),
      utils.developer.getFunnelKPIs.invalidate(),
    ]);
  };

  const assignMutation = trpc.developer.assignLead.useMutation({
    onSuccess: async () => {
      toast.success('Lead assignment updated.');
      await invalidateLeadViews();
    },
    onError: error => toast.error(error.message || 'Could not update assignment.'),
  });

  const transitionMutation = trpc.developer.transitionLead.useMutation({
    onSuccess: async () => {
      toast.success('Lead stage updated.');
      setTransitionNotes('');
      await invalidateLeadViews();
    },
    onError: error => toast.error(error.message || 'Could not transition lead.'),
  });

  const logActivityMutation = trpc.developer.logLeadActivity.useMutation({
    onSuccess: async () => {
      toast.success('Activity logged.');
      setActivityDescription('');
      await invalidateLeadViews();
    },
    onError: error => toast.error(error.message || 'Could not log activity.'),
  });

  const nextActionMutation = trpc.developer.setLeadNextAction.useMutation({
    onSuccess: async () => {
      toast.success('Next action saved.');
      await invalidateLeadViews();
    },
    onError: error => toast.error(error.message || 'Could not save next action.'),
  });

  const allLeads = (leadsQuery.items ?? []) as LeadItem[];
  const pipelineLeads = useMemo(() => {
    if (selectedStage === 'new') return allLeads.filter(lead => stageGroupMatches('new', lead.stage));
    if (selectedStage === 'contacted') return allLeads.filter(lead => stageGroupMatches('contacted', lead.stage));
    if (selectedStage === 'qualified') return allLeads.filter(lead => stageGroupMatches('qualified', lead.stage));
    if (selectedStage === 'viewing') return allLeads.filter(lead => stageGroupMatches('viewing', lead.stage));
    if (selectedStage === 'offer') return allLeads.filter(lead => stageGroupMatches('offer', lead.stage));
    if (selectedStage === 'deal') return allLeads.filter(lead => stageGroupMatches('deal', lead.stage));
    if (selectedStage === 'won') return allLeads.filter(lead => stageGroupMatches('won', lead.stage));
    return allLeads.filter(lead => stageGroupMatches('lost', lead.stage));
  }, [allLeads, selectedStage]);

  const attentionLeads = useMemo(() => {
    const raw = ((attentionQuery.data?.items ?? []) as LeadItem[]).slice();
    const rank = { high: 0, med: 1, low: 2 };
    raw.sort((a, b) => rank[a.flags?.priority || 'low'] - rank[b.flags?.priority || 'low']);
    return raw;
  }, [attentionQuery.data?.items]);

  const activeLeads = viewMode === 'attention' ? attentionLeads : pipelineLeads;

  useEffect(() => {
    setPage(1);
  }, [
    viewMode,
    selectedStage,
    attentionFilter,
    debouncedSearch,
    ownerFilter,
    sourceFilter,
    developmentFilter,
    rangeFilter,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    if (!activeLeads.length) {
      setSelectedLeadId(null);
      return;
    }
    if (!selectedLeadId || !activeLeads.some(lead => lead.id === selectedLeadId)) {
      setSelectedLeadId(activeLeads[0].id);
    }
  }, [activeLeads, selectedLeadId]);

  const selectedLead = useMemo(
    () => activeLeads.find(lead => lead.id === selectedLeadId) || null,
    [activeLeads, selectedLeadId],
  );

  useEffect(() => {
    if (!selectedLead) {
      setTransitionTarget('');
      return;
    }
    setTransitionTarget(selectedLead.allowedTransitions?.[0] || '');
  }, [selectedLead?.id]);

  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(activeLeads.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedLeads = activeLeads.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const loading = leadsQuery.isLoading || (viewMode === 'attention' && attentionQuery.isLoading);

  const handleAssignToMe = () => {
    if (!selectedLead) return;
    if (!user?.id) {
      toast.error('User context missing. Please refresh and try again.');
      return;
    }
    const ownerId = Number(user.id);
    if (!Number.isFinite(ownerId) || ownerId <= 0) {
      toast.error('Invalid user identifier for assignment.');
      return;
    }
    assignMutation.mutate({
      leadId: Number(selectedLead.id),
      ownerType: 'developer_sales',
      ownerId,
      assignmentMode: 'manual',
    });
  };

  const handleUnassign = () => {
    if (!selectedLead) return;
    assignMutation.mutate({
      leadId: Number(selectedLead.id),
      ownerType: 'unassigned',
      ownerId: null,
      assignmentMode: 'manual',
    });
  };

  const handleTransition = () => {
    if (!selectedLead || !transitionTarget) return;
    transitionMutation.mutate({
      leadId: Number(selectedLead.id),
      toStage: transitionTarget as any,
      notes: transitionNotes.trim() || undefined,
    });
  };

  const handleLogActivity = () => {
    if (!selectedLead) return;
    logActivityMutation.mutate({
      leadId: Number(selectedLead.id),
      type: activityType,
      description: activityDescription.trim() || undefined,
    });
  };

  const handleSaveNextAction = () => {
    if (!selectedLead) return;
    if (!nextActionAtLocal) {
      toast.error('Set a date/time for the next action.');
      return;
    }

    nextActionMutation.mutate({
      leadId: Number(selectedLead.id),
      type: nextActionType,
      at: new Date(nextActionAtLocal).toISOString(),
    });
  };

  const quickActionPreset = (kind: 'call' | 'whatsapp' | 'email', hoursFromNow: number) => {
    setNextActionType(kind);
    setNextActionAtLocal(toLocalDateTimeInput(new Date(Date.now() + hoursFromNow * 60 * 60 * 1000)));
  };

  const timeline = useMemo(() => {
    if (!selectedLead?.notes) return [];
    return selectedLead.notes
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .reverse();
  }, [selectedLead?.notes]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="typ-h2">Leads Control Center</h2>
          <p className="text-muted-foreground text-sm">
            Work new leads, clear SLA risk, and move deals through the funnel.
          </p>
        </div>
        <Badge variant="outline">{leadsQuery.total} total leads</Badge>
      </div>

      <Card className="card">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
          <div className="relative xl:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email, phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={developmentFilter} onValueChange={setDevelopmentFilter}>
            <SelectTrigger>
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

          <Select value={ownerFilter} onValueChange={value => setOwnerFilter(value as any)}>
            <SelectTrigger>
              <SelectValue placeholder="All owners" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All owners</SelectItem>
              <SelectItem value="developer_sales">Developer sales</SelectItem>
              <SelectItem value="agency">Agency</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="web">Web</SelectItem>
              <SelectItem value="development_detail">Development detail</SelectItem>
              <SelectItem value="property_listify">Property listify</SelectItem>
              <SelectItem value="direct">Direct</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Card className="card xl:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pipeline Views</CardTitle>
            <CardDescription>Choose a stage or work queue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant={viewMode === 'pipeline' ? 'default' : 'outline'}
              className="w-full justify-start"
              onClick={() => setViewMode('pipeline')}
            >
              <CircleDot className="h-4 w-4 mr-2" />
              Pipeline
            </Button>
            <Button
              variant={viewMode === 'attention' ? 'default' : 'outline'}
              className="w-full justify-start"
              onClick={() => setViewMode('attention')}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Attention Queue
              <Badge className="ml-auto" variant="secondary">
                {attentionQuery.data?.total ?? 0}
              </Badge>
            </Button>

            <Separator className="my-3" />

            {viewMode === 'pipeline' && (
              <div className="space-y-2">
                {STAGE_TABS.map(tab => (
                  <Button
                    key={tab.key}
                    variant={selectedStage === tab.key ? 'secondary' : 'ghost'}
                    className="w-full justify-between"
                    onClick={() => setSelectedStage(tab.key)}
                  >
                    <span>{tab.label}</span>
                    <Badge variant="outline">{leadsQuery.stageCounts[tab.key]}</Badge>
                  </Button>
                ))}
              </div>
            )}

            {viewMode === 'attention' && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Filter by SLA severity</p>
                <Select
                  value={attentionFilter}
                  onValueChange={value => setAttentionFilter(value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Warnings + Breaches</SelectItem>
                    <SelectItem value="breach">Breaches only</SelectItem>
                    <SelectItem value="warning">Warnings only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card xl:col-span-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {viewMode === 'attention'
                ? 'Needs Action'
                : `${STAGE_TABS.find(t => t.key === selectedStage)?.label} Leads`}
            </CardTitle>
            <CardDescription>
              {activeLeads.length} lead{activeLeads.length === 1 ? '' : 's'} in this view
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 text-sm text-muted-foreground">Loading leads...</div>
            ) : (
              <>
                <ScrollArea className="h-[62vh] px-4 pb-4">
                  <div className="space-y-2 pt-2">
                    {pagedLeads.map(lead => (
                      <button
                        key={lead.id}
                        className={`w-full text-left border rounded-lg p-3 transition-colors ${
                          selectedLeadId === lead.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-slate-50'
                        }`}
                        onClick={() => setSelectedLeadId(lead.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-sm">{lead.contact.name || 'Unnamed lead'}</p>
                            <p className="text-xs text-muted-foreground">{lead.contact.email || '-'}</p>
                          </div>
                          <Badge className={stageBadgeClass(lead.stage)}>{lead.stage}</Badge>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{lead.source.channel}</span>
                          <span>•</span>
                          <span>{formatRelative(lead.lastActivityAt || lead.createdAt)}</span>
                          <Badge className={slaBadgeClass(lead.sla.status)}>{lead.sla.status}</Badge>
                        </div>
                      </button>
                    ))}

                    {!pagedLeads.length && (
                      <div className="py-12 text-center text-sm text-muted-foreground">
                        No leads in this view.
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="border-t px-4 py-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Page {safePage} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={safePage <= 1}
                    >
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={safePage >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="card xl:col-span-5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Lead Detail</CardTitle>
            <CardDescription>
              {selectedLead
                ? `${selectedLead.contact.name || 'Lead'} • ${selectedLead.source.channel}`
                : 'Select a lead to take action'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedLead && <p className="text-sm text-muted-foreground">No lead selected.</p>}

            {selectedLead && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div className="border rounded-md p-2">
                    <p className="font-medium">{selectedLead.contact.name || 'Unnamed lead'}</p>
                    <p className="text-muted-foreground">{selectedLead.contact.email || '-'}</p>
                    <p className="text-muted-foreground">{selectedLead.contact.phone || '-'}</p>
                  </div>
                  <div className="border rounded-md p-2 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Stage</span>
                      <Badge className={stageBadgeClass(selectedLead.stage)}>{selectedLead.stage}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SLA</span>
                      <Badge className={slaBadgeClass(selectedLead.sla.status)}>{selectedLead.sla.status}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Owner</span>
                      <span>{selectedLead.owner.ownerName || selectedLead.owner.ownerType}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border rounded-md p-3">
                  <p className="text-sm font-medium">Assignment</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAssignToMe}
                      disabled={assignMutation.isPending}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Assign to Me
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleUnassign}
                      disabled={assignMutation.isPending}
                    >
                      <UserX className="h-4 w-4 mr-1" />
                      Unassign
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 border rounded-md p-3">
                  <p className="text-sm font-medium">Transition Stage</p>
                  <Select value={transitionTarget} onValueChange={setTransitionTarget}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select next stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {(selectedLead.allowedTransitions || []).map(next => (
                        <SelectItem key={next} value={next}>
                          {next}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    value={transitionNotes}
                    onChange={e => setTransitionNotes(e.target.value)}
                    placeholder="Optional transition note..."
                    rows={2}
                  />
                  <Button
                    size="sm"
                    onClick={handleTransition}
                    disabled={
                      transitionMutation.isPending ||
                      !transitionTarget ||
                      !(selectedLead.allowedTransitions || []).includes(transitionTarget)
                    }
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Move Lead
                  </Button>
                </div>

                <div className="space-y-2 border rounded-md p-3">
                  <p className="text-sm font-medium">Log Activity</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Select value={activityType} onValueChange={v => setActivityType(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="call">Call</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="note">Note</SelectItem>
                        <SelectItem value="status_change">Status Change</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => quickActionPreset('call', 1)}
                      className="justify-start"
                    >
                      <PhoneCall className="h-4 w-4 mr-1" />
                      Quick: Call in 1h
                    </Button>
                  </div>
                  <Textarea
                    value={activityDescription}
                    onChange={e => setActivityDescription(e.target.value)}
                    placeholder="What happened?"
                    rows={3}
                  />
                  <Button
                    size="sm"
                    onClick={handleLogActivity}
                    disabled={logActivityMutation.isPending}
                  >
                    Save Activity
                  </Button>
                </div>

                <div className="space-y-2 border rounded-md p-3">
                  <p className="text-sm font-medium">Next Action</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => quickActionPreset('call', 1)}>
                      Call in 1h
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => quickActionPreset('whatsapp', 24)}
                    >
                      WhatsApp tomorrow
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => quickActionPreset('email', 48)}
                    >
                      Follow up in 2 days
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Select value={nextActionType} onValueChange={v => setNextActionType(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="call">Call</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="schedule_viewing">Schedule viewing</SelectItem>
                        <SelectItem value="send_brochure">Send brochure</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="datetime-local"
                      value={nextActionAtLocal}
                      onChange={e => setNextActionAtLocal(e.target.value)}
                    />
                  </div>

                  <Button
                    size="sm"
                    onClick={handleSaveNextAction}
                    disabled={nextActionMutation.isPending}
                  >
                    <CalendarClock className="h-4 w-4 mr-1" />
                    Save Next Action
                  </Button>
                </div>

                <div className="space-y-2 border rounded-md p-3">
                  <p className="text-sm font-medium">Activity Timeline</p>
                  {timeline.length === 0 && (
                    <p className="text-xs text-muted-foreground">No timeline entries yet.</p>
                  )}
                  {timeline.length > 0 && (
                    <ScrollArea className="h-36">
                      <div className="space-y-2 pr-2">
                        {timeline.slice(0, 12).map((line, idx) => (
                          <div key={`${line}-${idx}`} className="text-xs border rounded p-2 bg-slate-50">
                            {line}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}

                  <Separator />

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>
                      <Clock3 className="inline h-3 w-3 mr-1" />
                      Created: {formatRelative(selectedLead.createdAt)}
                    </p>
                    <p>
                      <Clock3 className="inline h-3 w-3 mr-1" />
                      Last activity:{' '}
                      {formatRelative(
                        selectedLead.lastActivityAt || selectedLead.updatedAt || selectedLead.createdAt,
                      )}
                    </p>
                    {selectedLead.nextAction?.at && (
                      <p>
                        <CalendarClock className="inline h-3 w-3 mr-1" />
                        Next action: {selectedLead.nextAction.type || 'follow-up'} @{' '}
                        {new Date(selectedLead.nextAction.at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
