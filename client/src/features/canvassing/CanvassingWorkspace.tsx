import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FilePlus2,
  Handshake,
  MapPin,
  MessageSquareText,
  PhoneCall,
  Plus,
  Search,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

type CanvassingWorkspaceProps = {
  mode: 'agency' | 'agent';
  onNavigate: (path: string) => void;
};

const STAGES = [
  'new',
  'contact_attempted',
  'contacted',
  'follow_up_required',
  'appointment_scheduled',
  'qualified',
  'mandate_won',
  'converted_to_listing',
  'not_interested',
  'lost',
  'archived',
] as const;

const EDITABLE_STAGES = STAGES.filter(stage => stage !== 'converted_to_listing');
const TERMINAL_STAGES = new Set(['converted_to_listing', 'not_interested', 'lost', 'archived']);
const HANDOFF_STAGES = new Set(['qualified', 'mandate_won']);
const METHODS = [
  'door_knocking',
  'phone',
  'referral',
  'sphere',
  'signboard',
  'open_house',
  'digital',
  'walk_in',
  'other',
] as const;
const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
const PROPERTY_TYPES = ['apartment', 'house', 'farm', 'land', 'commercial', 'shared_living'] as const;

type ProspectForm = {
  ownerName: string;
  email: string;
  phone: string;
  propertyAddress: string;
  suburb: string;
  city: string;
  province: string;
  propertyType: string;
  source: string;
  canvassingMethod: (typeof METHODS)[number];
  priority: (typeof PRIORITIES)[number];
  assignedAgentId: string;
  nextFollowUp: string;
  initialNote: string;
};

const emptyProspectForm = (): ProspectForm => ({
  ownerName: '',
  email: '',
  phone: '',
  propertyAddress: '',
  suburb: '',
  city: '',
  province: '',
  propertyType: '',
  source: '',
  canvassingMethod: 'door_knocking',
  priority: 'normal',
  assignedAgentId: '',
  nextFollowUp: '',
  initialNote: '',
});

function titleCase(value?: string | null) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase());
}

function parseTimestamp(value?: string | Date | null) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const timestamp = /(?:Z|[+-]\d{2}:?\d{2})$/.test(normalized)
    ? normalized
    : `${normalized}Z`;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatFollowUp(value?: string | Date | null) {
  const date = parseTimestamp(value);
  if (!date) return 'No follow-up set';
  return date.toLocaleString('en-ZA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatLocalDateTimeInput(value?: string | Date | null) {
  const date = parseTimestamp(value);
  if (!date) return '';
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

function locationLabel(prospect: any) {
  return [prospect.propertyAddress, prospect.suburb, prospect.city, prospect.province]
    .filter(Boolean)
    .join(', ');
}

function stageClass(stage?: string | null) {
  if (stage === 'converted_to_listing' || stage === 'mandate_won') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  if (stage === 'lost' || stage === 'not_interested' || stage === 'archived') {
    return 'border-slate-200 bg-slate-100 text-slate-600';
  }
  if (stage === 'qualified' || stage === 'appointment_scheduled') {
    return 'border-sky-200 bg-sky-50 text-sky-700';
  }
  if (stage === 'follow_up_required') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }
  return 'border-violet-200 bg-violet-50 text-violet-700';
}

function priorityClass(priority?: string | null) {
  if (priority === 'urgent') return 'bg-rose-100 text-rose-700';
  if (priority === 'high') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-600';
}

export function CanvassingWorkspace({ mode, onNavigate }: CanvassingWorkspaceProps) {
  const utils = trpc.useUtils();
  const isManager = mode === 'agency';
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('all');
  const [city, setCity] = useState('');
  const [suburb, setSuburb] = useState('');
  const [followUpStatus, setFollowUpStatus] = useState<'all' | 'scheduled' | 'overdue' | 'none'>(
    'all',
  );
  const [agentFilter, setAgentFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedProspectId, setSelectedProspectId] = useState<number | null>(null);
  const [form, setForm] = useState<ProspectForm>(emptyProspectForm);

  const dashboardQuery = trpc.canvassing.getDashboard.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const agentsQuery = trpc.canvassing.listAssignableAgents.useQuery(undefined, {
    enabled: isManager,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const listQuery = trpc.canvassing.list.useQuery(
    {
      stage: stage as any,
      agentId: isManager && agentFilter !== 'all' ? Number(agentFilter) : undefined,
      search: search || undefined,
      city: city || undefined,
      suburb: suburb || undefined,
      followUpStatus,
      limit: 100,
    },
    { retry: false, refetchOnWindowFocus: false },
  );
  const followUpQuery = trpc.canvassing.getFollowUpQueue.useQuery(
    {
      agentId: isManager && agentFilter !== 'all' ? Number(agentFilter) : undefined,
      limit: 12,
    },
    { retry: false, refetchOnWindowFocus: false },
  );
  const detailQuery = trpc.canvassing.getById.useQuery(
    { sellerProspectId: selectedProspectId || 0 },
    { enabled: Boolean(selectedProspectId), retry: false },
  );

  const refresh = async () => {
    await Promise.all([
      utils.canvassing.getDashboard.invalidate(),
      utils.canvassing.list.invalidate(),
      utils.canvassing.getFollowUpQueue.invalidate(),
      utils.canvassing.getById.invalidate(),
    ]);
  };

  const createMutation = trpc.canvassing.create.useMutation({
    onSuccess: async result => {
      toast.success('Seller prospect captured');
      setCreateOpen(false);
      setForm(emptyProspectForm());
      await refresh();
      setSelectedProspectId(result.sellerProspectId);
    },
    onError: error => toast.error(error.message || 'Could not capture seller prospect'),
  });
  const updateStageMutation = trpc.canvassing.updateStage.useMutation({
    onSuccess: async () => {
      toast.success('Pipeline stage updated');
      await refresh();
    },
    onError: error => toast.error(error.message || 'Could not update stage'),
  });
  const addActivityMutation = trpc.canvassing.addActivity.useMutation({
    onSuccess: async () => {
      toast.success('Activity recorded');
      await refresh();
    },
    onError: error => toast.error(error.message || 'Could not record activity'),
  });
  const setFollowUpMutation = trpc.canvassing.setFollowUp.useMutation({
    onSuccess: async () => {
      toast.success('Follow-up scheduled');
      await refresh();
    },
    onError: error => toast.error(error.message || 'Could not schedule follow-up'),
  });
  const completeFollowUpMutation = trpc.canvassing.completeFollowUp.useMutation({
    onSuccess: async () => {
      toast.success('Follow-up completed');
      await refresh();
    },
    onError: error => toast.error(error.message || 'Could not complete follow-up'),
  });
  const assignMutation = trpc.canvassing.assign.useMutation({
    onSuccess: async () => {
      toast.success('Assignment updated');
      await refresh();
    },
    onError: error => toast.error(error.message || 'Could not update assignment'),
  });

  const prospects = (listQuery.data || []) as any[];
  const followUps = (followUpQuery.data || []) as any[];
  const agents = (agentsQuery.data || []) as any[];
  const dashboard = dashboardQuery.data as any;

  const visiblePipeline = useMemo(
    () =>
      STAGES.filter(item => item !== 'archived').map(item => ({
        stage: item,
        count: Number(dashboard?.stageCounts?.[item] || 0),
      })),
    [dashboard?.stageCounts],
  );

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    createMutation.mutate({
      ownerName: form.ownerName || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      propertyAddress: form.propertyAddress || undefined,
      suburb: form.suburb || undefined,
      city: form.city || undefined,
      province: form.province || undefined,
      propertyType: form.propertyType ? (form.propertyType as any) : undefined,
      source: form.source || undefined,
      canvassingMethod: form.canvassingMethod,
      priority: form.priority,
      assignedAgentId:
        isManager && form.assignedAgentId ? Number(form.assignedAgentId) : undefined,
      nextFollowUp: form.nextFollowUp ? new Date(form.nextFollowUp).toISOString() : undefined,
      initialNote: form.initialNote || undefined,
    });
  };

  const openCreate = () => {
    setForm(emptyProspectForm());
    setCreateOpen(true);
  };

  return (
    <section className="space-y-5" data-testid={`${mode}-canvassing-workspace`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {isManager ? 'Agency acquisition' : 'Seller acquisition'}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Canvassing</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Capture private seller opportunities, maintain a clear follow-up rhythm, and hand off
            qualified mandates to the canonical Listing Engine.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2" data-testid="create-seller-prospect">
          <Plus className="h-4 w-4" />
          Capture prospect
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          icon={Users}
          label="Active prospects"
          value={dashboard?.active}
          detail="Private agency acquisition work"
        />
        <MetricCard
          icon={Clock3}
          label="Overdue follow-ups"
          value={dashboard?.overdueFollowUps}
          detail="Work these before new outreach"
          tone="rose"
        />
        <MetricCard
          icon={CalendarClock}
          label="Scheduled follow-ups"
          value={dashboard?.scheduledFollowUps}
          detail="Active non-terminal reminders"
          tone="amber"
        />
        <MetricCard
          icon={Handshake}
          label="Converted listings"
          value={dashboard?.converted}
          detail={`${dashboard?.conversionRate || 0}% acquisition conversion`}
          tone="emerald"
        />
        {isManager ? (
          <MetricCard
            icon={UserRoundCheck}
            label="Unassigned"
            value={dashboard?.unassigned}
            detail="Assign to establish ownership"
            tone="sky"
          />
        ) : (
          <MetricCard
            icon={CheckCircle2}
            label="Your pipeline"
            value={dashboard?.total}
            detail="Only opportunities assigned to you"
            tone="sky"
          />
        )}
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_170px_170px_170px_170px]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search seller, address, area, or phone"
              className="pl-9"
            />
          </div>
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="w-full"><SelectValue placeholder="All stages" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {STAGES.map(item => <SelectItem key={item} value={item}>{titleCase(item)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={followUpStatus} onValueChange={value => setFollowUpStatus(value as any)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Follow-ups" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All follow-ups</SelectItem>
              <SelectItem value="overdue">Overdue only</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="none">No follow-up</SelectItem>
            </SelectContent>
          </Select>
          {isManager ? (
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="w-full"><SelectValue placeholder="All agents" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All agents</SelectItem>
                {agents.map(agent => <SelectItem key={agent.id} value={String(agent.id)}>{agent.name}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : <div className="hidden lg:block" />}
          <div className="flex gap-2">
            <Input value={city} onChange={event => setCity(event.target.value)} placeholder="City" />
            <Input value={suburb} onChange={event => setSuburb(event.target.value)} placeholder="Area" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Pipeline</p>
                <h3 className="text-lg font-semibold text-slate-950">Seller prospect work queue</h3>
              </div>
              <span className="text-sm text-slate-500">{prospects.length} shown</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {visiblePipeline.map(item => (
                <button
                  key={item.stage}
                  type="button"
                  onClick={() => setStage(stage === item.stage ? 'all' : item.stage)}
                  className={cn(
                    'shrink-0 rounded-lg border px-3 py-2 text-left transition',
                    stage === item.stage
                      ? 'border-slate-900 bg-slate-950 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300',
                  )}
                >
                  <span className="block text-xs font-medium">{titleCase(item.stage)}</span>
                  <span className="mt-1 block text-lg font-semibold">{item.count}</span>
                </button>
              ))}
            </div>

            {listQuery.isLoading ? (
              <WorkspaceLoading />
            ) : listQuery.isError ? (
              <WorkspaceError />
            ) : prospects.length ? (
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                {prospects.map(prospect => (
                  <button
                    key={prospect.id}
                    type="button"
                    onClick={() => setSelectedProspectId(prospect.id)}
                    className="grid w-full gap-3 p-4 text-left transition hover:bg-slate-50 md:grid-cols-[minmax(0,1fr)_170px_170px_auto] md:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-slate-900">
                          {prospect.ownerName || 'Unnamed seller opportunity'}
                        </p>
                        <Badge variant="outline" className={stageClass(prospect.stage)}>{titleCase(prospect.stage)}</Badge>
                        <Badge variant="secondary" className={priorityClass(prospect.priority)}>{titleCase(prospect.priority)}</Badge>
                      </div>
                      <p className="mt-1 flex items-center gap-1 truncate text-sm text-slate-500">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {locationLabel(prospect) || 'Location still to be recorded'}
                      </p>
                    </div>
                    <div className="text-sm text-slate-600">
                      <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">Owner</span>
                      {prospect.assignedAgent?.name || 'Unassigned'}
                    </div>
                    <div className={cn('text-sm', prospect.nextFollowUp && parseTimestamp(prospect.nextFollowUp)?.getTime()! < Date.now() ? 'text-rose-700' : 'text-slate-600')}>
                      <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">Follow-up</span>
                      {formatFollowUp(prospect.nextFollowUp)}
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </button>
                ))}
              </div>
            ) : (
              <EmptyPipeline onCreate={openCreate} />
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm" data-testid="seller-follow-up-queue">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-amber-50 p-2 text-amber-700"><Clock3 className="h-4 w-4" /></div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Daily queue</p>
                <h3 className="font-semibold text-slate-950">Seller follow-ups</h3>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {followUpQuery.isLoading ? <WorkspaceLoading compact /> : null}
            {!followUpQuery.isLoading && !followUps.length ? (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No active seller follow-ups are scheduled.
              </p>
            ) : null}
            {followUps.map(prospect => (
              <button
                key={prospect.id}
                type="button"
                onClick={() => setSelectedProspectId(prospect.id)}
                className="w-full rounded-lg border border-slate-100 p-3 text-left transition hover:border-slate-200 hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-slate-900">{prospect.ownerName || 'Seller opportunity'}</p>
                  {prospect.overdue ? <span className="text-xs font-semibold text-rose-700">Overdue</span> : null}
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-slate-500">{locationLabel(prospect)}</p>
                <p className={cn('mt-2 text-xs', prospect.overdue ? 'text-rose-700' : 'text-slate-600')}>
                  {formatFollowUp(prospect.nextFollowUp)}
                </p>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <CreateProspectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        form={form}
        setForm={setForm}
        agents={agents}
        isManager={isManager}
        isPending={createMutation.isPending}
        onSubmit={handleCreate}
      />
      <ProspectDetailDialog
        open={Boolean(selectedProspectId)}
        onOpenChange={open => {
          if (!open) setSelectedProspectId(null);
        }}
        prospect={detailQuery.data as any}
        loading={detailQuery.isLoading}
        isManager={isManager}
        agents={agents}
        onNavigate={onNavigate}
        onStageChange={(sellerProspectId, nextStage, outcome) =>
          updateStageMutation.mutate({ sellerProspectId, stage: nextStage as any, outcome })
        }
        onAddActivity={(sellerProspectId, activityType, description) =>
          addActivityMutation.mutate({ sellerProspectId, activityType, description })
        }
        onSetFollowUp={(sellerProspectId, nextFollowUp, note) =>
          setFollowUpMutation.mutate({ sellerProspectId, nextFollowUp, note })
        }
        onCompleteFollowUp={(sellerProspectId, note) =>
          completeFollowUpMutation.mutate({ sellerProspectId, note })
        }
        onAssign={(sellerProspectId, assignedAgentId) =>
          assignMutation.mutate({ sellerProspectId, agentId: assignedAgentId })
        }
        pending={{
          stage: updateStageMutation.isPending,
          activity: addActivityMutation.isPending,
          followUp: setFollowUpMutation.isPending || completeFollowUpMutation.isPending,
          assignment: assignMutation.isPending,
        }}
      />
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = 'slate',
}: {
  icon: typeof Users;
  label: string;
  value?: number;
  detail: string;
  tone?: 'slate' | 'rose' | 'amber' | 'emerald' | 'sky';
}) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    rose: 'bg-rose-50 text-rose-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    sky: 'bg-sky-50 text-sky-700',
  };
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{Number(value || 0).toLocaleString('en-ZA')}</p>
          </div>
          <div className={cn('rounded-lg p-2', tones[tone])}><Icon className="h-4 w-4" /></div>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
      </CardContent>
    </Card>
  );
}

function WorkspaceLoading({ compact = false }: { compact?: boolean }) {
  return <div className={cn('rounded-lg bg-slate-50 text-sm text-slate-500', compact ? 'p-3' : 'p-8 text-center')}>Loading live acquisition work…</div>;
}

function WorkspaceError() {
  return (
    <div className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      Seller prospects could not be loaded. Check agency access and try again.
    </div>
  );
}

function EmptyPipeline({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center">
      <Handshake className="mx-auto h-9 w-9 text-slate-300" />
      <h4 className="mt-3 font-semibold text-slate-900">No seller prospects match these filters</h4>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Capture a property opportunity as private agency work. It cannot appear in public discovery until a complete canonical listing is created and approved.
      </p>
      <Button variant="outline" onClick={onCreate} className="mt-4 gap-2"><Plus className="h-4 w-4" />Capture prospect</Button>
    </div>
  );
}

function CreateProspectDialog({
  open,
  onOpenChange,
  form,
  setForm,
  agents,
  isManager,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ProspectForm;
  setForm: Dispatch<SetStateAction<ProspectForm>>;
  agents: any[];
  isManager: boolean;
  isPending: boolean;
  onSubmit: (event: FormEvent) => void;
}) {
  const update = (field: keyof ProspectForm, value: string) => setForm(current => ({ ...current, [field]: value }));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Capture seller prospect</DialogTitle>
          <DialogDescription>
            Keep owner details and canvassing history private. A prospect is not a public listing.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-5">
          <p className="text-sm text-slate-500">
            Record an owner/contact or a property location to capture this private opportunity.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Owner or contact name"><Input value={form.ownerName} onChange={event => update('ownerName', event.target.value)} placeholder="Known owner or contact" /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={event => update('phone', event.target.value)} placeholder="Lawfully captured contact" /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={event => update('email', event.target.value)} placeholder="Optional" /></Field>
            <Field label="Source"><Input value={form.source} onChange={event => update('source', event.target.value)} placeholder="e.g. Door-to-door, referral" /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Property address, suburb, or city" className="sm:col-span-2"><Input value={form.propertyAddress} onChange={event => update('propertyAddress', event.target.value)} placeholder="Target property or address" /></Field>
            <Field label="Suburb"><Input value={form.suburb} onChange={event => update('suburb', event.target.value)} placeholder="e.g. Sandton" /></Field>
            <Field label="City"><Input value={form.city} onChange={event => update('city', event.target.value)} placeholder="e.g. Johannesburg" /></Field>
            <Field label="Province"><Input value={form.province} onChange={event => update('province', event.target.value)} placeholder="e.g. Gauteng" /></Field>
            <Field label="Property type">
              <Select value={form.propertyType || 'unknown'} onValueChange={value => update('propertyType', value === 'unknown' ? '' : value)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unknown">Not known yet</SelectItem>
                  {PROPERTY_TYPES.map(item => <SelectItem key={item} value={item}>{titleCase(item)}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Canvassing method">
              <Select value={form.canvassingMethod} onValueChange={value => update('canvassingMethod', value)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{METHODS.map(item => <SelectItem key={item} value={item}>{titleCase(item)}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={form.priority} onValueChange={value => update('priority', value)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map(item => <SelectItem key={item} value={item}>{titleCase(item)}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            {isManager ? (
              <Field label="Assigned agent">
                <Select value={form.assignedAgentId || 'unassigned'} onValueChange={value => update('assignedAgentId', value === 'unassigned' ? '' : value)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Leave unassigned</SelectItem>
                    {agents.map(agent => <SelectItem key={agent.id} value={String(agent.id)}>{agent.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
            <Field label="Next follow-up"><Input type="datetime-local" value={form.nextFollowUp} onChange={event => update('nextFollowUp', event.target.value)} /></Field>
          </div>
          <Field label="Private initial note"><Textarea value={form.initialNote} onChange={event => update('initialNote', event.target.value)} placeholder="Context for the next agency action. Never copied into public listing content." /></Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Capturing…' : 'Capture prospect'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProspectDetailDialog({
  open,
  onOpenChange,
  prospect,
  loading,
  isManager,
  agents,
  onNavigate,
  onStageChange,
  onAddActivity,
  onSetFollowUp,
  onCompleteFollowUp,
  onAssign,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect: any;
  loading: boolean;
  isManager: boolean;
  agents: any[];
  onNavigate: (path: string) => void;
  onStageChange: (sellerProspectId: number, stage: string, outcome?: string) => void;
  onAddActivity: (sellerProspectId: number, activityType: 'note' | 'call' | 'email' | 'meeting', description: string) => void;
  onSetFollowUp: (sellerProspectId: number, nextFollowUp: string, note?: string) => void;
  onCompleteFollowUp: (sellerProspectId: number, note?: string) => void;
  onAssign: (sellerProspectId: number, agentId: number | null) => void;
  pending: { stage: boolean; activity: boolean; followUp: boolean; assignment: boolean };
}) {
  const [nextStage, setNextStage] = useState('new');
  const [outcome, setOutcome] = useState('');
  const [activityType, setActivityType] = useState<'note' | 'call' | 'email' | 'meeting'>('note');
  const [activityDescription, setActivityDescription] = useState('');
  const [followUpAt, setFollowUpAt] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');
  const [assignedAgentId, setAssignedAgentId] = useState('unassigned');

  useEffect(() => {
    if (!prospect) return;
    setNextStage(prospect.stage || 'new');
    setOutcome(prospect.outcome || '');
    setFollowUpAt(formatLocalDateTimeInput(prospect.nextFollowUp));
    setFollowUpNote('');
    setActivityDescription('');
    setAssignedAgentId(prospect.assignedAgentId ? String(prospect.assignedAgentId) : 'unassigned');
  }, [prospect]);

  const canStartListing = Boolean(
    prospect && !prospect.convertedListingId && HANDOFF_STAGES.has(prospect.stage),
  );
  const terminal = TERMINAL_STAGES.has(prospect?.stage || '');
  const mustProvideOutcome = nextStage === 'lost' || nextStage === 'not_interested';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        {loading || !prospect ? <WorkspaceLoading /> : (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
                <div>
                  <DialogTitle>{prospect.ownerName || 'Seller opportunity'}</DialogTitle>
                  <DialogDescription className="mt-2 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{locationLabel(prospect) || 'Location to be completed'}</DialogDescription>
                </div>
                <Badge variant="outline" className={stageClass(prospect.stage)}>{titleCase(prospect.stage)}</Badge>
              </div>
            </DialogHeader>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-5">
                <Card className="border-slate-200 shadow-none">
                  <CardContent className="space-y-4 p-4">
                    <div className="flex items-center gap-2"><Handshake className="h-4 w-4 text-slate-600" /><h4 className="font-semibold text-slate-900">Pipeline and conversion</h4></div>
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <Select value={nextStage} onValueChange={setNextStage} disabled={terminal}>
                        <SelectTrigger className="w-full" aria-label="Pipeline stage"><SelectValue /></SelectTrigger>
                        <SelectContent>{EDITABLE_STAGES.map(item => <SelectItem key={item} value={item}>{titleCase(item)}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button disabled={terminal || pending.stage || (mustProvideOutcome && !outcome.trim())} onClick={() => onStageChange(prospect.id, nextStage, outcome || undefined)}>
                        {pending.stage ? 'Saving…' : 'Update stage'}
                      </Button>
                    </div>
                    {mustProvideOutcome ? <Textarea value={outcome} onChange={event => setOutcome(event.target.value)} placeholder="Outcome is required for this terminal stage" /> : null}
                    {canStartListing ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                        <div>
                          <p className="font-medium text-emerald-900">Ready for a canonical listing draft</p>
                          <p className="mt-1 text-xs leading-5 text-emerald-800">Only property context is made available to the listing wizard. Private notes and owner contacts never transfer.</p>
                        </div>
                        <Button className="gap-2 bg-emerald-700 hover:bg-emerald-800" onClick={() => onNavigate(`/listings/create?sellerProspectId=${prospect.id}`)}><FilePlus2 className="h-4 w-4" />Start listing</Button>
                      </div>
                    ) : null}
                    {prospect.convertedListingId ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Converted to canonical listing #{prospect.convertedListingId}. The prospect remains private and its follow-ups are closed.</div> : null}
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-none">
                  <CardContent className="space-y-4 p-4">
                    <div className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-slate-600" /><h4 className="font-semibold text-slate-900">Follow-up</h4></div>
                    <p className={cn('text-sm', prospect.nextFollowUp && parseTimestamp(prospect.nextFollowUp)?.getTime()! < Date.now() ? 'text-rose-700' : 'text-slate-600')}>{formatFollowUp(prospect.nextFollowUp)}</p>
                    {!terminal ? <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <Input type="datetime-local" value={followUpAt} onChange={event => setFollowUpAt(event.target.value)} />
                      <Button variant="outline" disabled={!followUpAt || pending.followUp} onClick={() => onSetFollowUp(prospect.id, new Date(followUpAt).toISOString(), followUpNote || undefined)}>{pending.followUp ? 'Saving…' : 'Schedule'}</Button>
                    </div> : null}
                    {!terminal ? <Input value={followUpNote} onChange={event => setFollowUpNote(event.target.value)} placeholder="Optional follow-up context" /> : null}
                    {!terminal && prospect.nextFollowUp ? <Button variant="secondary" className="gap-2" disabled={pending.followUp} onClick={() => onCompleteFollowUp(prospect.id, followUpNote || undefined)}><CheckCircle2 className="h-4 w-4" />Complete follow-up</Button> : null}
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-none">
                  <CardContent className="space-y-4 p-4">
                    <div className="flex items-center gap-2"><MessageSquareText className="h-4 w-4 text-slate-600" /><h4 className="font-semibold text-slate-900">Private activity</h4></div>
                    <div className="grid gap-3 sm:grid-cols-[150px_minmax(0,1fr)_auto]">
                      <Select value={activityType} onValueChange={value => setActivityType(value as any)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="note">Note</SelectItem><SelectItem value="call">Call</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="meeting">Meeting</SelectItem></SelectContent></Select>
                      <Input value={activityDescription} onChange={event => setActivityDescription(event.target.value)} placeholder="What happened?" />
                      <Button disabled={!activityDescription.trim() || pending.activity} onClick={() => { onAddActivity(prospect.id, activityType, activityDescription.trim()); setActivityDescription(''); }}>{pending.activity ? 'Adding…' : 'Add'}</Button>
                    </div>
                    <div className="space-y-3">
                      {(prospect.activities || []).map((activity: any) => <div key={activity.id} className="border-l-2 border-slate-200 pl-3"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{titleCase(activity.activityType)}</span><span className="text-xs text-slate-400">{formatFollowUp(activity.createdAt)}</span>{activity.actorName ? <span className="text-xs text-slate-500">by {activity.actorName}</span> : null}</div><p className="mt-1 text-sm text-slate-700">{activity.description}</p></div>)}
                      {!prospect.activities?.length ? <p className="text-sm text-slate-500">No activity has been recorded yet.</p> : null}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="border-slate-200 shadow-none"><CardContent className="space-y-3 p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Private contact</p><p className="font-medium text-slate-900">{prospect.ownerName || 'Name not recorded'}</p><p className="text-sm text-slate-600">{prospect.phone || 'No phone recorded'}</p><p className="text-sm text-slate-600">{prospect.email || 'No email recorded'}</p><p className="pt-2 text-xs leading-5 text-slate-500">This data is visible only inside the agency workspace and is not a marketing-consent record.</p></CardContent></Card>
                <Card className="border-slate-200 shadow-none"><CardContent className="space-y-3 p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Acquisition context</p><DetailRow label="Source" value={prospect.source || 'Not recorded'} /><DetailRow label="Method" value={titleCase(prospect.canvassingMethod)} /><DetailRow label="Property" value={titleCase(prospect.propertyType) || 'Not known'} /><DetailRow label="Priority" value={titleCase(prospect.priority)} /></CardContent></Card>
                {isManager ? <Card className="border-slate-200 shadow-none"><CardContent className="space-y-3 p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Agency assignment</p><Select value={assignedAgentId} onValueChange={setAssignedAgentId}><SelectTrigger className="w-full" aria-label="Assigned agent"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{agents.map(agent => <SelectItem key={agent.id} value={String(agent.id)}>{agent.name}</SelectItem>)}</SelectContent></Select><Button variant="outline" className="w-full" disabled={pending.assignment} onClick={() => onAssign(prospect.id, assignedAgentId === 'unassigned' ? null : Number(assignedAgentId))}>{pending.assignment ? 'Saving…' : 'Save assignment'}</Button></CardContent></Card> : null}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return <div className={className}><Label className="mb-1.5 block">{label}</Label>{children}</div>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 text-sm"><span className="text-slate-500">{label}</span><span className="text-right font-medium text-slate-800">{value}</span></div>;
}
