import { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Eye,
  ListChecks,
  MessageSquare,
  Phone,
  Search,
  UserPlus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { SourcePerformancePanel } from '../growth/GrowthPanels';
import { PIPELINE_STAGES } from '../workspace/constants';
import { EmptyPanel, ErrorPanel, SectionTitle } from '../workspace/WorkspacePrimitives';
import { PipelineSnapshot } from '../workspace/WorkspacePanels';
import type { AgencyLead, WorkspaceContentProps } from '../workspace/types';
import { formatAge, formatDate, numberLabel, sourceLabel, toneClasses } from '../workspace/utils';

const STATUS_OPTIONS = PIPELINE_STAGES.map(stage => stage.key);
const STATUS_LABELS = new Map(PIPELINE_STAGES.map(stage => [stage.key, stage.label]));

function statusLabel(status?: string | null) {
  return STATUS_LABELS.get(String(status || 'new')) || String(status || 'new').replace(/_/g, ' ');
}

function toInputDateTime(value?: string | Date | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function money(value?: number | string | null) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function AgencyLeadsWorkspace(props: WorkspaceContentProps) {
  const utils = trpc.useUtils();
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [draftLeadId, setDraftLeadId] = useState<number | null>(null);
  const [draftStatus, setDraftStatus] = useState('new');
  const [statusNote, setStatusNote] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [noteText, setNoteText] = useState('');
  const [contactChannel, setContactChannel] = useState('call');
  const [contactOutcome, setContactOutcome] = useState('reached');
  const [contactSummary, setContactSummary] = useState('');
  const [contactNextAction, setContactNextAction] = useState('');
  const [contactFollowUpAt, setContactFollowUpAt] = useState('');
  const [followUpAt, setFollowUpAt] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');
  const [viewingAt, setViewingAt] = useState('');
  const [viewingAgentId, setViewingAgentId] = useState('current');
  const [viewingNotes, setViewingNotes] = useState('');

  const assignableAgentsQuery = trpc.agency.listAssignableAgents.useQuery(undefined, {
    enabled: true,
  });
  const detailQuery = trpc.agency.getLeadDetail.useQuery(
    { leadId: selectedLeadId || 0 },
    { enabled: Boolean(selectedLeadId) },
  );

  const selectedLead =
    (detailQuery.data as AgencyLead | undefined) ||
    props.leads.find(lead => lead.id === selectedLeadId) ||
    null;
  const assignableAgents = assignableAgentsQuery.data || [];
  const selectedAgentId = selectedLead?.agentId ? String(selectedLead.agentId) : 'unassigned';

  useEffect(() => {
    if (!selectedLead || selectedLead.id === draftLeadId) return;
    setDraftLeadId(selectedLead.id);
    setDraftStatus(String(selectedLead.status || 'new'));
    setStatusNote('');
    setLostReason('');
    setNoteText('');
    setContactChannel('call');
    setContactOutcome('reached');
    setContactSummary('');
    setContactNextAction(selectedLead.nextAction || 'Continue buyer conversation');
    setContactFollowUpAt(toInputDateTime(selectedLead.nextFollowUp));
    setFollowUpAt(toInputDateTime(selectedLead.nextFollowUp));
    setFollowUpNote('');
    setViewingAt('');
    setViewingAgentId(selectedLead.agentId ? String(selectedLead.agentId) : 'current');
    setViewingNotes('');
  }, [draftLeadId, selectedLead]);

  const invalidateLeads = async () => {
    await Promise.all([
      utils.agency.getLeads.invalidate(),
      utils.agency.getRecentLeads.invalidate(),
      utils.agency.getDashboardStats.invalidate(),
      utils.agency.getLeadConversionStats.invalidate(),
      utils.agency.getAgentLeaderboard.invalidate(),
      selectedLeadId ? utils.agency.getLeadDetail.invalidate({ leadId: selectedLeadId }) : Promise.resolve(),
    ]);
  };

  const assignLead = trpc.agency.assignLead.useMutation({
    onSuccess: async () => {
      await invalidateLeads();
      toast.success('Lead assignment updated');
    },
    onError: error => toast.error(error.message || 'Assignment failed'),
  });

  const updateLeadStatus = trpc.agency.updateLeadStatus.useMutation({
    onSuccess: async () => {
      await invalidateLeads();
      setStatusNote('');
      setLostReason('');
      toast.success('Lead stage updated');
    },
    onError: error => toast.error(error.message || 'Stage update failed'),
  });

  const addNote = trpc.agency.addLeadNote.useMutation({
    onSuccess: async () => {
      await invalidateLeads();
      setNoteText('');
      toast.success('Note saved');
    },
    onError: error => toast.error(error.message || 'Note could not be saved'),
  });
  const recordContact = trpc.agency.recordLeadContactAttempt.useMutation({
    onSuccess: async () => {
      await invalidateLeads();
      setContactSummary('');
      toast.success('Buyer contact attempt recorded');
    },
    onError: error => toast.error(error.message || 'Buyer contact could not be recorded'),
  });

  const setFollowUp = trpc.agency.setLeadFollowUp.useMutation({
    onSuccess: async () => {
      await invalidateLeads();
      setFollowUpNote('');
      toast.success('Follow-up scheduled');
    },
    onError: error => toast.error(error.message || 'Follow-up could not be scheduled'),
  });

  const completeFollowUp = trpc.agency.completeLeadFollowUp.useMutation({
    onSuccess: async () => {
      await invalidateLeads();
      toast.success('Follow-up completed');
    },
    onError: error => toast.error(error.message || 'Follow-up could not be completed'),
  });

  const scheduleViewing = trpc.agency.scheduleLeadViewing.useMutation({
    onSuccess: async () => {
      await invalidateLeads();
      setViewingAt('');
      setViewingNotes('');
      toast.success('Viewing scheduled');
    },
    onError: error => toast.error(error.message || 'Viewing could not be scheduled'),
  });

  const busy =
    assignLead.isPending ||
    updateLeadStatus.isPending ||
    addNote.isPending ||
    recordContact.isPending ||
    setFollowUp.isPending ||
    completeFollowUp.isPending ||
    scheduleViewing.isPending;

  const counters = useMemo(
    () => [
      { label: 'New', value: props.leadSignals.newLeadCount, filter: 'new' },
      { label: 'Unassigned', value: props.leadSignals.unassignedCount, filter: 'unassigned' },
      { label: 'Overdue', value: props.leadSignals.contactedFollowUpCount, filter: 'overdue' },
    ],
    [props.leadSignals],
  );

  const openLead = (lead: AgencyLead) => {
    setSelectedLeadId(lead.id);
    setDraftLeadId(null);
  };

  const activeViewingAgentId =
    viewingAgentId === 'current'
      ? selectedLead?.agentId || undefined
      : Number(viewingAgentId || 0) || undefined;

  return (
    <section className="space-y-5">
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_180px_190px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={props.leadSearch}
                onChange={event => props.setLeadSearch(event.target.value)}
                placeholder="Search leads, contact details, or listing"
                className="pl-9"
              />
            </div>
            <select
              value={props.leadStatus}
              onChange={event => props.setLeadStatus(event.target.value)}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="all">All stages</option>
              <option value="unassigned">Unassigned</option>
              <option value="overdue">Overdue</option>
              {PIPELINE_STAGES.map(stage => (
                <option key={stage.key} value={stage.key}>
                  {stage.label}
                </option>
              ))}
            </select>
            <select
              value={props.leadSource}
              onChange={event => props.setLeadSource(event.target.value)}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="all">All sources</option>
              {props.uniqueSources.map(source => (
                <option key={source} value={source}>
                  {sourceLabel(source)}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 rounded-md border border-slate-200 bg-slate-50 p-1">
              {(['kanban', 'table'] as const).map(view => (
                <button
                  key={view}
                  type="button"
                  onClick={() => props.setLeadView(view)}
                  className={cn(
                    'rounded px-3 py-1.5 text-sm font-medium capitalize',
                    props.leadView === view && 'bg-white shadow-sm',
                  )}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {counters.map(item => (
              <Button
                key={item.filter}
                type="button"
                variant={props.leadStatus === item.filter ? 'default' : 'outline'}
                size="sm"
                onClick={() => props.setLeadStatus(item.filter)}
              >
                {item.label}
                <Badge variant="secondary" className="ml-2 bg-white/70">
                  {numberLabel(item.value)}
                </Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <SectionTitle
              icon={MessageSquare}
              title="Lead Workspace"
              eyebrow={`${numberLabel(props.filteredLeads.length)} matching leads`}
            />
          </CardHeader>
          <CardContent>
            {props.hasError.leads ? <ErrorPanel title="Lead data could not be loaded" /> : null}
            {props.isLoading.leads ? (
              <div className="h-44 animate-pulse rounded-lg bg-slate-100" />
            ) : null}
            {!props.isLoading.leads && props.leadView === 'kanban' ? (
              <KanbanLeads leads={props.filteredLeads} onOpen={openLead} />
            ) : null}
            {!props.isLoading.leads && props.leadView === 'table' ? (
              <>
                <LeadTable leads={props.pagedLeads} onOpen={openLead} />
                <Pagination
                  page={props.leadPage}
                  maxPage={props.maxLeadPage}
                  onPage={props.setLeadPage}
                />
              </>
            ) : null}
          </CardContent>
        </Card>
        <div className="space-y-5">
          <PipelineSnapshot
            conversion={props.conversion}
            leadsTotal={Math.max(props.conversion.total, props.filteredLeads.length, 1)}
            onNavigate={props.onNavigate}
          />
          <SourcePerformancePanel data={props.sourceEfficiencyData} />
        </div>
      </section>

      <Dialog open={Boolean(selectedLeadId)} onOpenChange={open => !open && setSelectedLeadId(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{selectedLead?.name || 'Lead detail'}</DialogTitle>
            <DialogDescription>
              {selectedLead?.email || selectedLead?.phone || 'No contact details'} ·{' '}
              {selectedLead ? statusLabel(selectedLead.status) : 'Loading'}
            </DialogDescription>
          </DialogHeader>

          {detailQuery.isLoading && !selectedLead ? (
            <div className="h-56 animate-pulse rounded-lg bg-slate-100" />
          ) : selectedLead ? (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-4">
                <LeadContextCard lead={selectedLead} />

                <Card className="border-slate-200">
                  <CardHeader className="pb-2">
                    <SectionTitle icon={Phone} title="Record buyer contact" eyebrow="Keep the next action explicit" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <select
                        aria-label="Buyer contact channel"
                        value={contactChannel}
                        onChange={event => setContactChannel(event.target.value)}
                        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                      >
                        {['call', 'whatsapp', 'email', 'sms', 'other'].map(channel => (
                          <option key={channel} value={channel}>{channel.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                      <select
                        aria-label="Buyer contact outcome"
                        value={contactOutcome}
                        onChange={event => setContactOutcome(event.target.value)}
                        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                      >
                        {['reached', 'replied', 'no_answer', 'voicemail', 'viewing_booked', 'follow_up_required', 'not_interested', 'invalid_contact', 'other'].map(outcome => (
                          <option key={outcome} value={outcome}>{outcome.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    </div>
                    <Textarea
                      aria-label="Buyer contact summary"
                      value={contactSummary}
                      onChange={event => setContactSummary(event.target.value)}
                      placeholder="What happened?"
                    />
                    {!['not_interested', 'invalid_contact'].includes(contactOutcome) ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input
                          aria-label="Buyer contact next action"
                          value={contactNextAction}
                          onChange={event => setContactNextAction(event.target.value)}
                          placeholder="Required next action"
                        />
                        <Input
                          aria-label="Buyer contact next follow-up"
                          type="datetime-local"
                          value={contactFollowUpAt}
                          onChange={event => setContactFollowUpAt(event.target.value)}
                        />
                      </div>
                    ) : null}
                    <Button
                      disabled={
                        busy ||
                        !contactSummary.trim() ||
                        (!['not_interested', 'invalid_contact'].includes(contactOutcome) && !contactNextAction.trim()) ||
                        (contactOutcome === 'follow_up_required' && !contactFollowUpAt)
                      }
                      onClick={() =>
                        recordContact.mutate({
                          leadId: selectedLead.id,
                          channel: contactChannel as any,
                          outcome: contactOutcome as any,
                          summary: contactSummary.trim(),
                          nextAction: ['not_interested', 'invalid_contact'].includes(contactOutcome)
                            ? undefined
                            : contactNextAction.trim(),
                          nextFollowUp: contactFollowUpAt || undefined,
                        })
                      }
                    >
                      <Phone className="h-4 w-4" />
                      Record contact and next action
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-slate-200">
                  <CardHeader className="pb-2">
                    <SectionTitle icon={MessageSquare} title="Notes" eyebrow="Persisted context" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      value={noteText}
                      onChange={event => setNoteText(event.target.value)}
                      placeholder="Add contact notes"
                      className="min-h-24"
                    />
                    <Button
                      disabled={busy || !noteText.trim()}
                      onClick={() => addNote.mutate({ leadId: selectedLead.id, note: noteText })}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Save note
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-slate-200">
                  <CardHeader className="pb-2">
                    <SectionTitle icon={Clock3} title="Timeline" eyebrow="Lead activity" />
                  </CardHeader>
                  <CardContent>
                    {selectedLead.activities?.length ? (
                      <div className="space-y-3">
                        {selectedLead.activities.map(activity => (
                          <div key={activity.id} className="rounded-lg border border-slate-200 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <Badge variant="outline" className="capitalize">
                                {activity.type.replace(/_/g, ' ')}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                {formatDate(activity.createdAt)}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-700">
                              {activity.description || 'Activity recorded.'}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyPanel
                        icon={Clock3}
                        title="No activity yet"
                        text="Notes, stage changes, follow-ups, and viewings appear here."
                      />
                    )}
                  </CardContent>
                </Card>
              </div>

              <aside className="space-y-4">
                <Card className="border-slate-200">
                  <CardHeader className="pb-2">
                    <SectionTitle icon={UserPlus} title="Assignment" eyebrow="Agency agent" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <select
                      aria-label="Lead assignee"
                      value={selectedAgentId}
                      disabled={busy || assignableAgentsQuery.isLoading}
                      onChange={event =>
                        assignLead.mutate({
                          leadId: selectedLead.id,
                          agentId:
                            event.target.value === 'unassigned' ? null : Number(event.target.value),
                        })
                      }
                      className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    >
                      <option value="unassigned">Unassigned</option>
                      {assignableAgents.map(agent => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-sm text-slate-500">
                      {selectedLead.agent?.name || 'No agent assigned'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-slate-200">
                  <CardHeader className="pb-2">
                    <SectionTitle icon={ListChecks} title="Stage" eyebrow="Workflow" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <select
                      aria-label="Lead stage"
                      value={draftStatus}
                      onChange={event => setDraftStatus(event.target.value)}
                      className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    >
                      {STATUS_OPTIONS.map(status => (
                        <option key={status} value={status}>
                          {statusLabel(status)}
                        </option>
                      ))}
                    </select>
                    {draftStatus === 'lost' ? (
                      <Input
                        value={lostReason}
                        onChange={event => setLostReason(event.target.value)}
                        placeholder="Lost reason"
                      />
                    ) : null}
                    <Textarea
                      aria-label="Lead stage note"
                      value={statusNote}
                      onChange={event => setStatusNote(event.target.value)}
                      placeholder="Stage note"
                    />
                    {selectedLead.readiness && !selectedLead.readiness.canMoveToOffer ? (
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        {selectedLead.readiness.blockers.join(' ')}
                      </div>
                    ) : null}
                    <Button
                      disabled={busy || draftStatus === selectedLead.status}
                      onClick={() =>
                        updateLeadStatus.mutate({
                          leadId: selectedLead.id,
                          status: draftStatus as any,
                          notes: statusNote || undefined,
                          lostReason: lostReason || undefined,
                        })
                      }
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Update stage
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-slate-200">
                  <CardHeader className="pb-2">
                    <SectionTitle icon={CalendarClock} title="Follow-up" eyebrow="Next action" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      aria-label="Lead follow-up at"
                      type="datetime-local"
                      value={followUpAt}
                      onChange={event => setFollowUpAt(event.target.value)}
                    />
                    <Textarea
                      value={followUpNote}
                      onChange={event => setFollowUpNote(event.target.value)}
                      placeholder="Follow-up note"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={busy || !followUpAt}
                        onClick={() =>
                          setFollowUp.mutate({
                            leadId: selectedLead.id,
                            nextFollowUp: followUpAt,
                            note: followUpNote || undefined,
                          })
                        }
                      >
                        <CalendarClock className="h-4 w-4" />
                        Schedule
                      </Button>
                      <Button
                        variant="outline"
                        disabled={busy || !selectedLead.nextFollowUp}
                        onClick={() =>
                          completeFollowUp.mutate({
                            leadId: selectedLead.id,
                            note: 'Follow-up completed from agency workspace.',
                          })
                        }
                      >
                        Complete
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200">
                  <CardHeader className="pb-2">
                    <SectionTitle icon={Eye} title="Viewing" eyebrow="Appointment" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      type="datetime-local"
                      value={viewingAt}
                      onChange={event => setViewingAt(event.target.value)}
                    />
                    <select
                      value={viewingAgentId}
                      onChange={event => setViewingAgentId(event.target.value)}
                      className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    >
                      <option value="current">Current assignee</option>
                      {assignableAgents.map(agent => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                    <Textarea
                      value={viewingNotes}
                      onChange={event => setViewingNotes(event.target.value)}
                      placeholder="Viewing note"
                    />
                    <Button
                      disabled={busy || !viewingAt}
                      onClick={() =>
                        scheduleViewing.mutate({
                          leadId: selectedLead.id,
                          agentId: activeViewingAgentId,
                          scheduledAt: viewingAt,
                          durationMinutes: 45,
                          status: 'confirmed',
                          notes: viewingNotes || undefined,
                        })
                      }
                    >
                      <Eye className="h-4 w-4" />
                      Schedule viewing
                    </Button>
                    <ViewingList lead={selectedLead} />
                  </CardContent>
                </Card>
              </aside>
            </div>
          ) : (
            <ErrorPanel title="Lead detail could not be loaded" />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function LeadContextCard({ lead }: { lead: AgencyLead }) {
  const priceLabel = money(lead.property?.price);
  return (
    <Card className="border-slate-200">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {statusLabel(lead.status)}
              </Badge>
              {lead.overdueFollowUp ? (
                <Badge className="bg-rose-100 text-rose-700">Overdue</Badge>
              ) : null}
              {lead.temperature ? (
                <Badge className="bg-amber-100 text-amber-700 capitalize">
                  {lead.temperature.label} · {lead.temperature.score}
                </Badge>
              ) : null}
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              {lead.message || 'No buyer message recorded.'}
            </p>
          </div>
          <div className="text-right text-sm text-slate-500">
            <p>{formatAge(lead.createdAt)}</p>
            <p>{lead.nextAction || 'Review activity'}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <InfoBlock label="Contact" value={lead.email || lead.phone || 'No contact'} icon={Phone} />
          <InfoBlock
            label="Listing"
            value={lead.property?.title || 'No listing context'}
            detail={
              lead.property
                ? [lead.property.city, lead.property.province].filter(Boolean).join(', ')
                : undefined
            }
            icon={Eye}
          />
          <InfoBlock
            label="Value"
            value={priceLabel || 'Not recorded'}
            detail={sourceLabel(lead.leadSource || lead.source)}
            icon={ListChecks}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function InfoBlock({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-slate-950">{value}</p>
      {detail ? <p className="mt-1 truncate text-xs text-slate-500">{detail}</p> : null}
    </div>
  );
}

function KanbanLeads({
  leads,
  onOpen,
}: {
  leads: AgencyLead[];
  onOpen: (lead: AgencyLead) => void;
}) {
  return (
    <div className="grid gap-3 overflow-x-auto pb-2 xl:grid-cols-4">
      {PIPELINE_STAGES.slice(0, 6).map(stage => {
        const stageLeads = leads.filter(lead => (lead.status || 'new') === stage.key).slice(0, 8);
        const classes = toneClasses(stage.tone);
        return (
          <div key={stage.key} className="min-w-64 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span className={cn('h-2 w-2 rounded-full', classes.dot)} />
                {stage.label}
              </span>
              <Badge variant="outline" className="bg-white">
                {stageLeads.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {stageLeads.map(lead => (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => onOpen(lead)}
                  className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-teal-300 hover:bg-teal-50/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-950">{lead.name}</p>
                    {lead.overdueFollowUp ? <Clock3 className="h-4 w-4 text-rose-500" /> : null}
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {lead.email || lead.phone || 'No contact'}
                  </p>
                  <p className="mt-2 truncate text-xs text-slate-500">
                    {lead.agent?.name || 'Unassigned'} · {sourceLabel(lead.leadSource || lead.source)}
                  </p>
                </button>
              ))}
              {!stageLeads.length ? (
                <p className="py-6 text-center text-sm text-slate-400">No leads</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LeadTable({
  leads,
  onOpen,
}: {
  leads: AgencyLead[];
  onOpen: (lead: AgencyLead) => void;
}) {
  if (!leads.length) {
    return (
      <EmptyPanel
        icon={MessageSquare}
        title="No leads in this view"
        text="Adjust filters or wait for new enquiries."
      />
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="hidden grid-cols-[minmax(180px,1fr)_150px_150px_140px_120px] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 lg:grid">
        <span>Lead</span>
        <span>Owner</span>
        <span>Stage</span>
        <span>Next</span>
        <span />
      </div>
      {leads.map(lead => (
        <div
          key={lead.id}
          className="grid gap-2 border-t border-slate-200 px-4 py-3 text-sm lg:grid-cols-[minmax(180px,1fr)_150px_150px_140px_120px] lg:items-center"
        >
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-950">{lead.name || `Lead #${lead.id}`}</p>
            <p className="truncate text-xs text-slate-500">
              {lead.property?.title || lead.email || lead.phone || 'No context'}
            </p>
          </div>
          <span className={cn('truncate text-slate-500', !lead.agentId && 'font-medium text-amber-700')}>
            {lead.agent?.name || 'Unassigned'}
          </span>
          <Badge variant="outline" className="w-fit border-slate-200 capitalize text-slate-600">
            {statusLabel(lead.status)}
          </Badge>
          <span className={cn('text-slate-500', lead.overdueFollowUp && 'font-medium text-rose-600')}>
            {lead.nextFollowUp ? formatDate(lead.nextFollowUp) : lead.nextAction || 'Review'}
          </span>
          <Button variant="outline" size="sm" onClick={() => onOpen(lead)}>
            Open
          </Button>
        </div>
      ))}
    </div>
  );
}

function ViewingList({ lead }: { lead: AgencyLead }) {
  if (!lead.viewings?.length) return null;
  return (
    <div className="space-y-2 pt-1">
      {lead.viewings.map(viewing => (
        <div key={viewing.id} className="rounded-md border border-slate-200 p-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-slate-700">{formatDate(viewing.scheduledAt)}</span>
            <Badge variant="outline" className="capitalize">
              {viewing.status || 'scheduled'}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {viewing.agent?.name || 'Agent'} · {viewing.notes || 'No note'}
          </p>
        </div>
      ))}
    </div>
  );
}

function Pagination({
  page,
  maxPage,
  onPage,
}: {
  page: number;
  maxPage: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between">
      <span className="text-sm text-slate-500">
        Page {page} of {maxPage}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button variant="outline" disabled={page >= maxPage} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

export function LeadRow({ lead }: { lead: AgencyLead }) {
  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-[minmax(0,1fr)_140px_120px] md:items-center">
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-950">{lead.name || `Lead #${lead.id}`}</p>
        <p className="truncate text-sm text-slate-500">
          {lead.property?.title || lead.message || 'No listing context'}
        </p>
      </div>
      <Badge variant="outline" className="w-fit capitalize">
        {statusLabel(lead.status)}
      </Badge>
      <span className="text-sm text-slate-500">{formatAge(lead.createdAt)}</span>
    </div>
  );
}
