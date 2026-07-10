// @ts-nocheck
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
// TODO: Migrate to dnd-kit for drag-and-drop functionality
// import { Droppable, Draggable, DragDropContext } from '@hello-pangea/dnd';
import {
  Users,
  Mail,
  Phone,
  Home,
  Calendar,
  Search,
  Filter,
  ChevronDown,
  Plus,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Flame,
  Lock,
  MessageCircle,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  message: string | null;
  source: string | null;
  notes?: string | null;
  nextFollowUp?: string | null;
  createdAt: string;
  property?: {
    id: number;
    title: string;
    city: string;
    price: number;
  } | null;
}

interface PipelineColumn {
  id: string;
  title: string;
  leads: Lead[];
  color: string;
}

const PIPELINE_STAGES = [
  { id: 'new', title: 'New Leads', color: 'bg-blue-500' },
  { id: 'contacted', title: 'Contacted', color: 'bg-yellow-500' },
  { id: 'viewing', title: 'Viewing', color: 'bg-purple-500' },
  { id: 'offer', title: 'Offer', color: 'bg-orange-500' },
  { id: 'closed', title: 'Closed', color: 'bg-green-500' },
];

type PipelineStageId = (typeof PIPELINE_STAGES)[number]['id'];
type LeadReadiness = {
  viewingCompleted: boolean;
  feedbackLogged: boolean;
  affordabilityConfirmed: boolean;
};

const DEFAULT_READINESS: LeadReadiness = {
  viewingCompleted: false,
  feedbackLogged: false,
  affordabilityConfirmed: false,
};

const READINESS_ITEMS: Array<{ key: keyof LeadReadiness; label: string }> = [
  { key: 'viewingCompleted', label: 'Viewing completed' },
  { key: 'feedbackLogged', label: 'Feedback logged' },
  { key: 'affordabilityConfirmed', label: 'Budget confirmed' },
];

const SOURCE_OPTIONS = [
  { value: '', label: 'All Sources' },
  { value: 'web', label: 'Web' },
  { value: 'property_detail', label: 'Property Detail' },
  { value: 'agent_profile', label: 'Agent Profile' },
  { value: 'development_detail', label: 'Development Detail' },
  { value: 'demand', label: 'Demand' },
  { value: 'demand_engine', label: 'Demand Engine' },
  { value: 'referral', label: 'Referral' },
];

const SOURCE_LABELS: Record<string, string> = {
  web: 'Web',
  property_detail: 'Property Detail',
  agent_profile: 'Agent Profile',
  development_detail: 'Development Detail',
  demand: 'Demand',
  demand_engine: 'Demand Engine',
  referral: 'Referral',
};

function getLeadAgeDays(lead: Lead) {
  const created = new Date(lead.createdAt);
  if (Number.isNaN(created.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - created.getTime()) / 86_400_000));
}

function parseDatabaseTimestamp(value: string) {
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  return /(?:Z|[+-]\d{2}:?\d{2})$/.test(normalized)
    ? new Date(normalized)
    : new Date(`${normalized}Z`);
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return '';
  const date = parseDatabaseTimestamp(value);
  if (Number.isNaN(date.getTime())) return '';

  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 16);
}

function getLeadTemperature(lead: Lead) {
  const ageDays = getLeadAgeDays(lead);
  const highIntentSource = ['whatsapp', 'property_detail', 'agent_profile', 'referral'].includes(
    lead.source || '',
  );
  const highIntentStage = ['viewing_scheduled', 'offer_sent', 'converted'].includes(lead.status);
  const hasMessage = Boolean(lead.message?.trim());

  if (highIntentStage || (highIntentSource && ageDays <= 3) || (hasMessage && ageDays <= 1)) {
    return {
      label: 'Hot',
      className: 'border-rose-200 bg-rose-50 text-rose-700',
      dotClassName: 'bg-rose-500',
    };
  }

  if (ageDays <= 7 || lead.status === 'contacted' || lead.status === 'qualified') {
    return {
      label: 'Warm',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
      dotClassName: 'bg-amber-500',
    };
  }

  return {
    label: 'Cold',
    className: 'border-slate-200 bg-slate-50 text-slate-600',
    dotClassName: 'bg-slate-400',
  };
}

function getNextStage(stageId: PipelineStageId): PipelineStageId | null {
  const index = PIPELINE_STAGES.findIndex(stage => stage.id === stageId);
  if (index < 0 || index >= PIPELINE_STAGES.length - 1) return null;
  return PIPELINE_STAGES[index + 1].id;
}

function isReadinessComplete(readiness?: LeadReadiness) {
  const value = readiness || DEFAULT_READINESS;
  return value.viewingCompleted && value.feedbackLogged && value.affordabilityConfirmed;
}

interface LeadPipelineProps {
  className?: string;
  propertyId?: number;
}

export function LeadPipeline({ className, propertyId }: LeadPipelineProps) {
  const [pipeline, setPipeline] = useState<Record<string, PipelineColumn>>({
    new: { id: 'new', title: 'New Leads', leads: [], color: 'bg-blue-500' },
    contacted: { id: 'contacted', title: 'Contacted', leads: [], color: 'bg-yellow-500' },
    viewing: { id: 'viewing', title: 'Viewing', leads: [], color: 'bg-purple-500' },
    offer: { id: 'offer', title: 'Offer', leads: [], color: 'bg-orange-500' },
    closed: { id: 'closed', title: 'Closed', leads: [], color: 'bg-green-500' },
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [leadToSchedule, setLeadToSchedule] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newActivityNote, setNewActivityNote] = useState('');
  const [followUpForm, setFollowUpForm] = useState({ nextFollowUp: '', note: '' });
  const [bookingForm, setBookingForm] = useState({
    listingId: '',
    scheduledAt: '',
    durationMinutes: '30',
    notes: '',
  });
  const [leadReadiness, setLeadReadiness] = useState<Record<number, LeadReadiness>>({});

  const utils = trpc.useUtils();
  const { data: availableListings = [] } = trpc.agent.getShowingListingOptions.useQuery();
  const resolvedListings = availableListings.filter((listing: any) => listing.isResolved);
  const legacyListings = availableListings.filter((listing: any) => !listing.isResolved);
  const { data: leadActivities = [], isLoading: activitiesLoading } =
    trpc.agent.getLeadActivities.useQuery(
      { leadId: selectedLead?.id ?? 0 },
      {
        enabled: !!selectedLead?.id,
      },
    );

  // Fetch leads pipeline
  const { data: pipelineData, isLoading } = trpc.agent.getLeadsPipeline.useQuery({
    filters: {
      propertyId,
      source: selectedSource || undefined,
    },
  });

  // Update lead status mutation
  const updateLeadStatusMutation = trpc.agent.moveLeadToStage.useMutation({
    onSuccess: () => {
      toast.success('Lead moved successfully');
      utils.agent.getLeadsPipeline.invalidate();
      utils.agent.getDashboardStats.invalidate();
    },
    onError: error => {
      toast.error(error.message || 'Failed to move lead');
    },
  });
  const bookShowingMutation = trpc.agent.bookShowing.useMutation({
    onSuccess: () => {
      toast.success('Showing booked from CRM');
      setLeadToSchedule(null);
      setBookingForm({
        listingId: '',
        scheduledAt: '',
        durationMinutes: '30',
        notes: '',
      });
      utils.agent.getLeadsPipeline.invalidate();
      utils.agent.getMyShowings.invalidate();
      utils.agent.getDashboardStats.invalidate();
      utils.agent.getActivationMilestones.invalidate();
    },
    onError: error => {
      toast.error(error.message || 'Failed to book showing');
    },
  });
  const addLeadActivityMutation = trpc.agent.addLeadActivity.useMutation({
    onSuccess: () => {
      toast.success('CRM note added');
      setNewActivityNote('');
      if (selectedLead?.id) {
        utils.agent.getLeadActivities.invalidate({ leadId: selectedLead.id });
      }
      utils.agent.getActivationMilestones.invalidate();
    },
    onError: error => {
      toast.error(error.message || 'Failed to add CRM note');
    },
  });
  const setLeadFollowUpMutation = trpc.agent.setLeadFollowUp.useMutation({
    onSuccess: result => {
      toast.success('Follow-up scheduled');
      setSelectedLead(current =>
        current ? { ...current, nextFollowUp: result.nextFollowUp } : current,
      );
      void utils.agent.getLeadsPipeline.invalidate();
      void utils.agent.getMyFollowUps.invalidate();
      void utils.agent.getActivationMilestones.invalidate();
    },
    onError: error => {
      toast.error(error.message || 'Failed to schedule follow-up');
    },
  });
  const completeLeadFollowUpMutation = trpc.agent.completeLeadFollowUp.useMutation({
    onSuccess: () => {
      toast.success('Follow-up completed');
      setSelectedLead(current => (current ? { ...current, nextFollowUp: null } : current));
      setFollowUpForm(current => ({ ...current, nextFollowUp: '' }));
      void utils.agent.getLeadsPipeline.invalidate();
      void utils.agent.getMyFollowUps.invalidate();
      void utils.agent.getActivationMilestones.invalidate();
    },
    onError: error => {
      toast.error(error.message || 'Failed to complete follow-up');
    },
  });

  // Update pipeline when data changes
  useEffect(() => {
    if (pipelineData) {
      setPipeline({
        new: { id: 'new', title: 'New Leads', leads: pipelineData.new || [], color: 'bg-blue-500' },
        contacted: {
          id: 'contacted',
          title: 'Contacted',
          leads: pipelineData.contacted || [],
          color: 'bg-yellow-500',
        },
        viewing: {
          id: 'viewing',
          title: 'Viewing',
          leads: pipelineData.viewing || [],
          color: 'bg-purple-500',
        },
        offer: {
          id: 'offer',
          title: 'Offer',
          leads: pipelineData.offer || [],
          color: 'bg-orange-500',
        },
        closed: {
          id: 'closed',
          title: 'Closed',
          leads: pipelineData.closed || [],
          color: 'bg-green-500',
        },
      });
    }
  }, [pipelineData]);

  const handleDragEnd = (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const sourceColumn = pipeline[source.droppableId];
    const destColumn = pipeline[destination.droppableId];
    const draggedLead = sourceColumn.leads.find(lead => lead.id.toString() === draggableId);

    if (!draggedLead) return;

    // Create new arrays
    const sourceLeads = Array.from(sourceColumn.leads);
    sourceLeads.splice(source.index, 1);

    const destLeads = Array.from(destColumn.leads);
    destLeads.splice(destination.index, 0, draggedLead);

    // Update pipeline state
    setPipeline({
      ...pipeline,
      [source.droppableId]: {
        ...sourceColumn,
        leads: sourceLeads,
      },
      [destination.droppableId]: {
        ...destColumn,
        leads: destLeads,
      },
    });

    // Update lead status on the server
    updateLeadStatusMutation.mutate({
      leadId: draggedLead.id,
      targetStage: destination.droppableId as any,
      notes: `Moved from ${source.droppableId} to ${destination.droppableId}`,
    });
  };

  const filteredLeads = (leads: Lead[]) => {
    if (!searchQuery) return leads;
    return leads.filter(
      lead =>
        lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.property?.title?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  };

  const openScheduleDialog = (lead: Lead) => {
    const defaultDateTime = new Date();
    defaultDateTime.setHours(defaultDateTime.getHours() + 1, 0, 0, 0);

    const matchedListing = availableListings.find(
      (listing: any) =>
        lead.property &&
        ((listing.propertyId && listing.propertyId === lead.property.id) ||
          listing.title?.trim().toLowerCase() === lead.property.title?.trim().toLowerCase()),
    );

    setLeadToSchedule(lead);
    setSelectedLead(null);
    setBookingForm({
      listingId: matchedListing ? String(matchedListing.id) : '',
      scheduledAt: defaultDateTime.toISOString().slice(0, 16),
      durationMinutes: '30',
      notes: lead.message || '',
    });
  };

  const openLeadDetail = (lead: Lead) => {
    setSelectedLead(lead);
    setNewActivityNote('');
    setFollowUpForm({ nextFollowUp: toDateTimeLocal(lead.nextFollowUp), note: '' });
  };

  const getReadinessForLead = (leadId: number) => leadReadiness[leadId] || DEFAULT_READINESS;

  const toggleReadinessItem = (leadId: number, key: keyof LeadReadiness) => {
    setLeadReadiness(prev => {
      const current = prev[leadId] || DEFAULT_READINESS;
      return {
        ...prev,
        [leadId]: {
          ...current,
          [key]: !current[key],
        },
      };
    });
  };

  const canMoveLeadToStage = (lead: Lead, targetStage: PipelineStageId) => {
    if (targetStage !== 'offer') return true;
    if (['offer_sent', 'converted', 'closed'].includes(lead.status)) return true;
    return isReadinessComplete(getReadinessForLead(lead.id));
  };

  const moveLeadToStage = (lead: Lead, targetStage: PipelineStageId) => {
    if (!canMoveLeadToStage(lead, targetStage)) {
      toast.error('Complete the viewing checklist before moving this lead to Offer.');
      return;
    }

    updateLeadStatusMutation.mutate({
      leadId: lead.id,
      targetStage: targetStage as any,
      notes:
        targetStage === 'offer'
          ? 'Moved to offer after viewing readiness checklist was completed'
          : `Moved to ${targetStage}`,
    });
  };

  const communicationTimeline = selectedLead
    ? [
        {
          id: `created-${selectedLead.id}`,
          type: 'lead captured',
          description: selectedLead.message || 'Lead captured from listing enquiry.',
          createdAt: selectedLead.createdAt,
          tone: 'bg-slate-50 text-slate-700 border-slate-200',
        },
        selectedLead.email
          ? {
              id: `email-${selectedLead.id}`,
              type: 'email',
              description: `Email available: ${selectedLead.email}`,
              createdAt: selectedLead.createdAt,
              tone: 'bg-sky-50 text-sky-700 border-sky-200',
            }
          : null,
        selectedLead.phone
          ? {
              id: `phone-${selectedLead.id}`,
              type: selectedLead.source === 'whatsapp' ? 'whatsapp' : 'phone',
              description: `Phone channel available: ${selectedLead.phone}`,
              createdAt: selectedLead.createdAt,
              tone:
                selectedLead.source === 'whatsapp'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-violet-50 text-violet-700 border-violet-200',
            }
          : null,
        ...leadActivities.map((activity: any) => ({
          id: `activity-${activity.id}`,
          type: activity.type,
          description: activity.description,
          createdAt: activity.createdAt,
          tone: 'bg-white text-gray-700 border-gray-100',
        })),
      ].filter(Boolean)
    : [];

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-96 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Lead Pipeline</h2>
          <Badge variant="secondary">
            {Object.values(pipeline).reduce((sum, col) => sum + col.leads.length, 0)} leads
          </Badge>
          {propertyId ? <Badge variant="outline">Property #{propertyId}</Badge> : null}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filters
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div>
                <label className="text-sm font-medium">Source</label>
                <select
                  value={selectedSource}
                  onChange={e => setSelectedSource(e.target.value)}
                  className="ml-2 px-3 py-1 border rounded text-sm"
                >
                  {SOURCE_OPTIONS.map(option => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kanban Board - Drag-and-drop temporarily disabled */}
      <div className="grid grid-cols-5 gap-4 overflow-x-auto">
        {PIPELINE_STAGES.map(stage => {
          const column = pipeline[stage.id];
          const leads = filteredLeads(column.leads);

          return (
            <div key={stage.id} className="flex flex-col min-w-80">
              <Card className="h-fit">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <div className={`w-3 h-3 rounded-full ${stage.color}`}></div>
                    {stage.title}
                    <Badge variant="outline" className="ml-auto">
                      {leads.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3 min-h-[200px] p-1 rounded">
                    {leads.map(lead => (
                      <div key={lead.id}>
                        <LeadCard
                          lead={lead}
                          stageId={stage.id as PipelineStageId}
                          readiness={getReadinessForLead(lead.id)}
                          onScheduleShowing={() => openScheduleDialog(lead)}
                          onOpenDetail={() => openLeadDetail(lead)}
                          onMoveLead={targetStage => moveLeadToStage(lead, targetStage)}
                        />
                      </div>
                    ))}
                    {leads.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No leads</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      <Dialog
        open={!!leadToSchedule}
        onOpenChange={open => {
          if (!open) {
            setLeadToSchedule(null);
            setBookingForm({
              listingId: '',
              scheduledAt: '',
              durationMinutes: '30',
              notes: '',
            });
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Book Showing From CRM</DialogTitle>
            <DialogDescription>
              This books a real showing and links it back to the selected lead.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl bg-gray-50 p-4 text-sm">
              <div className="font-semibold text-gray-900">{leadToSchedule?.name || 'Lead'}</div>
              <div className="text-gray-600">{leadToSchedule?.property?.title || 'No property linked'}</div>
              {leadToSchedule?.email ? <div className="text-gray-500">{leadToSchedule.email}</div> : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Listing</label>
              {availableListings.length === 0 ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  No schedulable inventory is currently available. Publish and bridge listings into
                  Agent OS inventory before booking from CRM.
                </div>
              ) : null}
              {resolvedListings.length > 0 && legacyListings.length > 0 ? (
                <p className="text-xs text-amber-700">
                  Legacy listing options are fallback only until inventory bridging is fully backfilled.
                </p>
              ) : null}
              <select
                value={bookingForm.listingId}
                onChange={e => setBookingForm(prev => ({ ...prev, listingId: e.target.value }))}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="">Select listing</option>
                {resolvedListings.length > 0 ? (
                  <optgroup label="Resolved inventory">
                    {resolvedListings.map((listing: any) => (
                      <option key={listing.id} value={listing.id}>
                        {listing.title} {listing.city ? `- ${listing.city}` : ''}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {legacyListings.length > 0 ? (
                  <optgroup label="Legacy fallback">
                    {legacyListings.map((listing: any) => (
                      <option key={listing.id} value={listing.id}>
                        {listing.title} {listing.city ? `- ${listing.city}` : ''} (Legacy listing)
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Scheduled for</label>
                <Input
                  type="datetime-local"
                  value={bookingForm.scheduledAt}
                  onChange={e =>
                    setBookingForm(prev => ({ ...prev, scheduledAt: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Duration (minutes)</label>
                <Input
                  type="number"
                  min={15}
                  max={240}
                  step={15}
                  value={bookingForm.durationMinutes}
                  onChange={e =>
                    setBookingForm(prev => ({ ...prev, durationMinutes: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                rows={4}
                value={bookingForm.notes}
                onChange={e => setBookingForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Showing context or follow-up notes"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLeadToSchedule(null)}>
                Cancel
              </Button>
              <Button
                disabled={
                  bookShowingMutation.isPending ||
                  availableListings.length === 0 ||
                  !leadToSchedule ||
                  !bookingForm.listingId ||
                  !bookingForm.scheduledAt
                }
                onClick={() =>
                  bookShowingMutation.mutate({
                    listingId: Number(bookingForm.listingId),
                    visitorName: leadToSchedule?.name || 'Prospective buyer',
                    scheduledAt: new Date(bookingForm.scheduledAt).toISOString(),
                    durationMinutes: Number(bookingForm.durationMinutes || 30),
                    notes: bookingForm.notes.trim() || undefined,
                    leadId: leadToSchedule?.id,
                  })
                }
              >
                {bookShowingMutation.isPending ? 'Booking...' : 'Book Showing'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedLead}
        onOpenChange={open => {
          if (!open) {
            setSelectedLead(null);
            setNewActivityNote('');
            setFollowUpForm({ nextFollowUp: '', note: '' });
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lead Detail</DialogTitle>
            <DialogDescription>
              View the canonical lead record, recent CRM activity, and add notes without leaving the
              pipeline.
            </DialogDescription>
          </DialogHeader>

          {selectedLead ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-gray-900">{selectedLead.name}</p>
                      <Badge
                        variant="outline"
                        className={`text-xs ${getLeadTemperature(selectedLead).className}`}
                      >
                        <Flame className="mr-1 h-3 w-3" />
                        {getLeadTemperature(selectedLead).label}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">{selectedLead.email}</p>
                    {selectedLead.phone ? (
                      <p className="text-sm text-gray-500">{selectedLead.phone}</p>
                    ) : null}
                    <p className="text-xs text-gray-500">
                      Created {new Date(selectedLead.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline">{SOURCE_LABELS[selectedLead.source || ''] || selectedLead.source || 'Web'}</Badge>
                </div>

                {selectedLead.property ? (
                  <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3 text-sm">
                    <div className="font-medium text-gray-900">{selectedLead.property.title}</div>
                    <div className="text-gray-500">
                      {selectedLead.property.city} | R
                      {selectedLead.property.price.toLocaleString()}
                    </div>
                  </div>
                ) : null}

                {selectedLead.message ? (
                  <div className="mt-4 text-sm text-gray-700">
                    <span className="font-medium">Lead message:</span> {selectedLead.message}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Unified Timeline</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openScheduleDialog(selectedLead)}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Showing
                    </Button>
                  </div>

                  {activitiesLoading ? (
                    <p className="text-sm text-gray-500">Loading activity...</p>
                  ) : (
                    <div className="space-y-3">
                      {communicationTimeline.map((activity: any) => (
                        <div
                          key={activity.id}
                          className="relative rounded-xl border border-gray-100 bg-white p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <Badge variant="outline" className={activity.tone}>
                              {activity.type === 'whatsapp' ? (
                                <MessageCircle className="mr-1 h-3 w-3" />
                              ) : activity.type === 'email' ? (
                                <Mail className="mr-1 h-3 w-3" />
                              ) : activity.type === 'phone' ? (
                                <Phone className="mr-1 h-3 w-3" />
                              ) : activity.type === 'status_change' ? (
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                              ) : (
                                <Clock3 className="mr-1 h-3 w-3" />
                              )}
                              {String(activity.type).replace(/_/g, ' ')}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(activity.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-gray-700">
                            {activity.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <aside className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-gray-900">Follow-up</h3>
                      {selectedLead.nextFollowUp ? (
                        <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                          Scheduled
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                          Not set
                        </Badge>
                      )}
                    </div>
                    {selectedLead.nextFollowUp ? (
                      <p className="mt-2 text-xs leading-5 text-slate-600">
                        Due {parseDatabaseTimestamp(selectedLead.nextFollowUp).toLocaleString()}
                      </p>
                    ) : null}
                    <div className="mt-4 space-y-3">
                      <Input
                        type="datetime-local"
                        value={followUpForm.nextFollowUp}
                        onChange={event =>
                          setFollowUpForm(current => ({
                            ...current,
                            nextFollowUp: event.target.value,
                          }))
                        }
                      />
                      <Textarea
                        rows={2}
                        value={followUpForm.note}
                        onChange={event =>
                          setFollowUpForm(current => ({ ...current, note: event.target.value }))
                        }
                        placeholder="Outcome or reminder context"
                      />
                      <Button
                        className="w-full"
                        disabled={
                          setLeadFollowUpMutation.isPending || !followUpForm.nextFollowUp
                        }
                        onClick={() =>
                          setLeadFollowUpMutation.mutate({
                            leadId: selectedLead.id,
                            nextFollowUp: new Date(followUpForm.nextFollowUp).toISOString(),
                            note: followUpForm.note.trim() || undefined,
                          })
                        }
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {setLeadFollowUpMutation.isPending
                          ? 'Scheduling...'
                          : selectedLead.nextFollowUp
                            ? 'Reschedule Follow-up'
                            : 'Schedule Follow-up'}
                      </Button>
                      {selectedLead.nextFollowUp ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          disabled={completeLeadFollowUpMutation.isPending}
                          onClick={() =>
                            completeLeadFollowUpMutation.mutate({
                              leadId: selectedLead.id,
                              note: followUpForm.note.trim() || undefined,
                            })
                          }
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          {completeLeadFollowUpMutation.isPending
                            ? 'Completing...'
                            : 'Complete Follow-up'}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-gray-900">Offer Readiness</h3>
                      {isReadinessComplete(getReadinessForLead(selectedLead.id)) ? (
                        <Badge className="bg-emerald-100 text-emerald-700">Ready</Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-200 text-amber-700">
                          Locked
                        </Badge>
                      )}
                    </div>
                    <div className="mt-4 space-y-2">
                      {READINESS_ITEMS.map(item => {
                        const checked = getReadinessForLead(selectedLead.id)[item.key];
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => toggleReadinessItem(selectedLead.id, item.key)}
                            className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                              checked
                                ? 'border-emerald-200 bg-white text-emerald-800'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-amber-200'
                            }`}
                          >
                            <span>{item.label}</span>
                            {checked ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <span className="h-4 w-4 rounded-full border border-slate-300" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {!isReadinessComplete(getReadinessForLead(selectedLead.id)) ? (
                      <div className="mt-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        Offer stage remains locked until every viewing prerequisite is done.
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        addLeadActivityMutation.mutate({
                          leadId: selectedLead.id,
                          activityType: 'call',
                          description: 'Follow-up call logged from CRM hub.',
                        });
                      }}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Log call
                    </Button>
                    <Button
                      disabled={!canMoveLeadToStage(selectedLead, 'offer')}
                      onClick={() => moveLeadToStage(selectedLead, 'offer')}
                    >
                      {!canMoveLeadToStage(selectedLead, 'offer') ? (
                        <Lock className="h-4 w-4 mr-2" />
                      ) : (
                        <ArrowRight className="h-4 w-4 mr-2" />
                      )}
                      Move to Offer
                    </Button>
                  </div>
                </aside>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Add CRM Note</h3>
                <Textarea
                  rows={4}
                  value={newActivityNote}
                  onChange={e => setNewActivityNote(e.target.value)}
                  placeholder="Log a call outcome, follow-up reminder, or client note"
                />
                <div className="flex justify-end">
                  <Button
                    disabled={addLeadActivityMutation.isPending || !newActivityNote.trim()}
                    onClick={() =>
                      addLeadActivityMutation.mutate({
                        leadId: selectedLead.id,
                        activityType: 'note',
                        description: newActivityNote.trim(),
                      })
                    }
                  >
                    {addLeadActivityMutation.isPending ? 'Saving...' : 'Save Note'}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LeadCard({
  lead,
  stageId,
  readiness,
  onScheduleShowing,
  onOpenDetail,
  onMoveLead,
}: {
  lead: Lead;
  stageId: PipelineStageId;
  readiness: LeadReadiness;
  onScheduleShowing: () => void;
  onOpenDetail: () => void;
  onMoveLead: (targetStage: PipelineStageId) => void;
}) {
  const temperature = getLeadTemperature(lead);
  const nextStage = getNextStage(stageId);
  const offerBlocked = nextStage === 'offer' && !isReadinessComplete(readiness);
  const ageDays = getLeadAgeDays(lead);

  return (
    <Card
      className="cursor-pointer border-gray-100 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft"
      onClick={onOpenDetail}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Lead Name & Contact */}
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <h4 className="font-semibold text-sm text-gray-900">{lead.name || 'Unnamed Lead'}</h4>
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                <Calendar className="h-3 w-3" />
                {new Date(lead.createdAt).toLocaleDateString()}
              </div>
            </div>
            <Badge variant="outline" className={`shrink-0 text-xs ${temperature.className}`}>
              <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${temperature.dotClassName}`} />
              {temperature.label}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-lg border border-gray-100 bg-gray-50 p-2 text-center text-[11px]">
            <div>
              <p className="font-semibold text-gray-900">{ageDays}d</p>
              <p className="text-gray-500">age</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{lead.status.replace(/_/g, ' ')}</p>
              <p className="text-gray-500">stage</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{lead.source ? SOURCE_LABELS[lead.source] || lead.source : 'Web'}</p>
              <p className="text-gray-500">source</p>
            </div>
          </div>

          {/* Property Info */}
          {lead.property && (
            <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg text-xs">
              <Home className="h-3.5 w-3.5 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-gray-900">{lead.property.title}</p>
                <p className="text-gray-500">
                  {lead.property.city} | R{lead.property.price.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div className="space-y-1.5">
            {lead.email && (
              <div className="flex items-center gap-2 text-xs">
                <Mail className="h-3.5 w-3.5 text-gray-400" />
                <span className="truncate text-gray-600">{lead.email}</span>
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center gap-2 text-xs">
                <Phone className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-gray-600">{lead.phone}</span>
              </div>
            )}
          </div>

          {/* Message Preview */}
          {lead.message && (
            <p className="text-xs text-gray-500 line-clamp-2 italic">"{lead.message}"</p>
          )}

          {/* Source */}
          {lead.source && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              {SOURCE_LABELS[lead.source || ''] || lead.source}
            </Badge>
          )}

          {nextStage === 'offer' ? (
            <div
              className={`rounded-lg border p-2.5 text-xs ${
                offerBlocked
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800'
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                {offerBlocked ? <Lock className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {offerBlocked ? 'Offer locked' : 'Offer ready'}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {READINESS_ITEMS.map(item => (
                  <span
                    key={item.key}
                    className={`rounded border px-1.5 py-1 text-center ${
                      readiness[item.key]
                        ? 'border-emerald-200 bg-white text-emerald-700'
                        : 'border-amber-200 bg-white/70 text-amber-700'
                    }`}
                  >
                    {readiness[item.key] ? 'Done' : 'Open'}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={event => {
                event.stopPropagation();
                onScheduleShowing();
              }}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Showing
            </Button>
            {nextStage ? (
              <Button
                size="sm"
                className="w-full"
                variant={offerBlocked ? 'outline' : 'default'}
                onClick={event => {
                  event.stopPropagation();
                  onMoveLead(nextStage);
                }}
              >
                {offerBlocked ? <Lock className="h-4 w-4 mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                {PIPELINE_STAGES.find(stage => stage.id === nextStage)?.title || 'Next'}
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="w-full" disabled>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
