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
import {
  closestCorners,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
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
  Building2,
  CheckCircle2,
  Clock3,
  GripVertical,
  Flame,
  Lock,
  MessageCircle,
  MapPin,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  DEFAULT_AGENT_LEAD_OFFER_READINESS,
  type AgentLeadOfferReadiness,
} from '@shared/agentLeadOfferReadiness';

interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  message: string | null;
  source: string | null;
  consent?: {
    capturedAt: string | null;
    version: string | null;
    source: string | null;
  };
  delivery?: {
    status: string;
    attempts: unknown;
    lastAttemptAt: string | null;
    lastError: string | null;
  };
  notes?: string | null;
  nextFollowUp?: string | null;
  createdAt: string;
  property?: {
    id: number;
    title: string;
    city: string;
    price: number;
  } | null;
  commercial?: {
    listingId: number;
    listingSlug: string;
    listingTitle: string;
    commercialAssetId: number;
    assetName: string;
    commercialSpaceId: number;
    spaceIdentifier: string;
    commercialAvailabilityId: number;
    useType: string;
    rentableAreaM2: number | null;
    usableAreaM2: number | null;
    availabilityState: string;
    transactionType: 'lease';
    city: string | null;
    province: string | null;
  } | null;
}

interface PipelineColumnState {
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

const LEAD_STATUS_BY_STAGE: Record<PipelineStageId, string> = {
  new: 'new',
  contacted: 'contacted',
  viewing: 'viewing_scheduled',
  offer: 'offer_sent',
  closed: 'closed',
};

function getPipelineStageForLeadStatus(status: string | null | undefined): PipelineStageId {
  switch (status) {
    case 'contacted':
    case 'qualified':
      return 'contacted';
    case 'viewing_scheduled':
      return 'viewing';
    case 'offer_sent':
    case 'converted':
      return 'offer';
    case 'closed':
    case 'lost':
      return 'closed';
    default:
      return 'new';
  }
}

const READINESS_ITEMS: Array<{ key: keyof AgentLeadOfferReadiness; label: string }> = [
  { key: 'viewingCompleted', label: 'Viewing completed' },
  { key: 'feedbackLogged', label: 'Feedback logged' },
  { key: 'affordabilityConfirmed', label: 'Buyer affordability confirmed' },
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

function getLeadInitials(name: string | null | undefined) {
  const initials = (name || 'Lead')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');

  return initials || 'L';
}

function getLeadNextMove(lead: Lead) {
  const stage = getPipelineStageForLeadStatus(lead.status);

  if (lead.commercial) {
    return {
      eyebrow: 'Commercial handoff',
      title: 'Keep the enquiry moving',
      description: 'Capture the next conversation and coordinate with the verified advertiser.',
      action: 'note',
      actionLabel: 'Add CRM note',
    };
  }

  switch (stage) {
    case 'new':
      return {
        eyebrow: 'First response',
        title: 'Make contact while interest is fresh',
        description: 'Use the buyer’s contact details, then record the real outcome and next step.',
        action: lead.phone ? 'phone' : 'followUp',
        actionLabel: lead.phone ? 'Call buyer' : 'Set follow-up',
      };
    case 'contacted':
      return {
        eyebrow: 'Progress the lead',
        title: 'Turn the conversation into a viewing',
        description: 'Offer a time that works and keep the property context in the record.',
        action: 'showing',
        actionLabel: 'Schedule showing',
      };
    case 'viewing':
      return {
        eyebrow: 'Viewing in progress',
        title: 'Capture the outcome and agree the next step',
        description: 'Set a follow-up before the viewing momentum goes cold.',
        action: 'followUp',
        actionLabel: 'Set follow-up',
      };
    case 'offer':
      return {
        eyebrow: 'Offer work',
        title: 'Keep the deal checks current',
        description: 'Record the viewing outcome, feedback, and budget before progressing.',
        action: 'readiness',
        actionLabel: 'Review deal checks',
      };
    default:
      return {
        eyebrow: 'Lead record',
        title: 'Keep the close-out context complete',
        description: 'Add a note if there is anything the team should retain.',
        action: 'note',
        actionLabel: 'Add CRM note',
      };
  }
}

function getDeliveryMeta(status?: string | null) {
  switch (status) {
    case 'delivered':
      return {
        label: 'Delivered',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      };
    case 'failed':
      return {
        label: 'Delivery failed',
        className: 'border-rose-200 bg-rose-50 text-rose-700',
      };
    case 'attention_required':
      return {
        label: 'Recipient follow-up needed',
        className: 'border-amber-200 bg-amber-50 text-amber-700',
      };
    default:
      return {
        label: 'Delivery pending',
        className: 'border-sky-200 bg-sky-50 text-sky-700',
      };
  }
}

function getDeliveryAttemptCount(attempts: unknown) {
  const parsed =
    typeof attempts === 'string'
      ? (() => {
          try {
            return JSON.parse(attempts);
          } catch {
            return null;
          }
        })()
      : attempts;

  if (!Array.isArray(parsed)) return 0;
  return parsed.reduce((highest, attempt) => {
    const count = Number((attempt as { attemptCount?: unknown })?.attemptCount || 0);
    return Math.max(highest, Number.isFinite(count) ? count : 0);
  }, 0);
}

interface LeadPipelineProps {
  className?: string;
  propertyId?: number;
  selectedLeadId?: number;
}

export function LeadPipeline({ className, propertyId, selectedLeadId }: LeadPipelineProps) {
  const [pipeline, setPipeline] = useState<Record<string, PipelineColumnState>>({
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
  const [openedSearchLeadId, setOpenedSearchLeadId] = useState<number | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor),
  );

  const utils = trpc.useUtils();
  const { data: availableListings = [] } = trpc.agent.getShowingListingOptions.useQuery();
  const resolvedListings = availableListings;
  const { data: leadActivities = [], isLoading: activitiesLoading } =
    trpc.agent.getLeadActivities.useQuery(
      { leadId: selectedLead?.id ?? 0 },
      {
        enabled: !!selectedLead?.id,
      },
    );
  const { data: offerReadiness, isLoading: offerReadinessLoading } =
    trpc.agent.getLeadOfferReadiness.useQuery(
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
    onSuccess: (_result, input) => {
      toast.success('Lead moved successfully');
      setSelectedLead(current =>
        current?.id === input.leadId
          ? { ...current, status: LEAD_STATUS_BY_STAGE[input.targetStage as PipelineStageId] }
          : current,
      );
      utils.agent.getLeadsPipeline.invalidate();
      utils.agent.getDashboardStats.invalidate();
      if (selectedLead?.id) {
        utils.agent.getLeadOfferReadiness.invalidate({ leadId: selectedLead.id });
      }
    },
    onError: error => {
      toast.error(error.message || 'Failed to move lead');
      void utils.agent.getLeadsPipeline.invalidate();
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
    onSuccess: (_result, input) => {
      toast.success(input.activityType === 'note' ? 'CRM note added' : 'Contact outcome recorded');
      setNewActivityNote('');
      if (selectedLead?.id) {
        utils.agent.getLeadActivities.invalidate({ leadId: selectedLead.id });
        utils.agent.getLeadOfferReadiness.invalidate({ leadId: selectedLead.id });
      }
      utils.agent.getActivationMilestones.invalidate();
    },
    onError: error => {
      toast.error(error.message || 'Failed to add CRM note');
    },
  });
  const setLeadOfferReadinessMutation = trpc.agent.setLeadOfferReadiness.useMutation({
    onSuccess: (_result, input) => {
      toast.success('Offer readiness saved to the lead record');
      utils.agent.getLeadOfferReadiness.invalidate({ leadId: input.leadId });
      utils.agent.getLeadActivities.invalidate({ leadId: input.leadId });
    },
    onError: error => {
      toast.error(error.message || 'Failed to save offer readiness');
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

  const filteredLeads = (leads: Lead[]) => {
    if (!searchQuery) return leads;
    return leads.filter(
      lead =>
        lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.property?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.commercial?.listingTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.commercial?.assetName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.commercial?.spaceIdentifier?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  };

  const openScheduleDialog = (lead: Lead) => {
    if (lead.commercial) {
      toast.info('Commercial enquiries use the dedicated Commercial workflow for viewings.');
      return;
    }
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

  useEffect(() => {
    if (!selectedLeadId || openedSearchLeadId === selectedLeadId) return;

    const matchingLead = Object.values(pipeline)
      .flatMap(column => column.leads)
      .find(lead => lead.id === selectedLeadId);

    if (!matchingLead) return;

    openLeadDetail(matchingLead);
    setOpenedSearchLeadId(selectedLeadId);
  }, [openedSearchLeadId, pipeline, selectedLeadId]);

  const runLeadNextMove = (lead: Lead) => {
    const nextMove = getLeadNextMove(lead);

    switch (nextMove.action) {
      case 'phone': {
        const dialableNumber = lead.phone?.replace(/[^\d+]/g, '');
        if (dialableNumber) {
          window.location.href = `tel:${dialableNumber}`;
          return;
        }
        requestAnimationFrame(() => {
          document.getElementById(`lead-follow-up-${lead.id}`)?.focus();
        });
        break;
      }
      case 'showing':
        openScheduleDialog(lead);
        break;
      case 'followUp':
        requestAnimationFrame(() => {
          document.getElementById(`lead-follow-up-${lead.id}`)?.focus();
        });
        break;
      case 'readiness':
        document
          .getElementById(`lead-readiness-${lead.id}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      default:
        requestAnimationFrame(() => {
          document.getElementById(`lead-note-${lead.id}`)?.focus();
        });
    }
  };

  const getReadinessForLead = (leadId: number) => {
    if (selectedLead?.id !== leadId) return DEFAULT_AGENT_LEAD_OFFER_READINESS;
    return offerReadiness?.readiness || DEFAULT_AGENT_LEAD_OFFER_READINESS;
  };

  const toggleReadinessItem = (leadId: number, key: keyof AgentLeadOfferReadiness) => {
    const current = getReadinessForLead(leadId);
    setLeadOfferReadinessMutation.mutate({
      leadId,
      readiness: {
        ...current,
        [key]: !current[key],
      },
    });
  };

  const canMoveLeadToStage = (lead: Lead, targetStage: PipelineStageId) => {
    if (targetStage !== 'offer') return true;
    if (['offer_sent', 'converted', 'closed'].includes(lead.status)) return true;
    return selectedLead?.id === lead.id && Boolean(offerReadiness?.canMoveToOffer);
  };

  const moveLeadToStage = (
    lead: Lead,
    targetStage: PipelineStageId,
    sourceStage?: PipelineStageId,
  ) => {
    if (!canMoveLeadToStage(lead, targetStage)) {
      if (targetStage === 'offer') {
        if (selectedLead?.id !== lead.id) {
          openLeadDetail(lead);
          toast.info('Open the lead checks before moving it to Offer.');
        } else if (offerReadinessLoading) {
          toast.info('Checking the lead record before moving it to Offer.');
        } else {
          toast.error(
            offerReadiness?.blockers?.[0] ||
              'Complete the recorded offer checks before moving this lead to Offer.',
          );
        }
        return;
      }
      return;
    }

    const currentStage =
      sourceStage ||
      (PIPELINE_STAGES.find(stage => pipeline[stage.id]?.leads.some(item => item.id === lead.id))
        ?.id as PipelineStageId | undefined);

    if (!currentStage || currentStage === targetStage) return;

    setPipeline(current => {
      const sourceColumn = current[currentStage];
      const targetColumn = current[targetStage];
      const leadToMove = sourceColumn?.leads.find(item => item.id === lead.id);

      if (!sourceColumn || !targetColumn || !leadToMove) return current;

      return {
        ...current,
        [currentStage]: {
          ...sourceColumn,
          leads: sourceColumn.leads.filter(item => item.id !== lead.id),
        },
        [targetStage]: {
          ...targetColumn,
          leads: [
            ...targetColumn.leads,
            { ...leadToMove, status: LEAD_STATUS_BY_STAGE[targetStage] },
          ],
        },
      };
    });

    updateLeadStatusMutation.mutate({
      leadId: lead.id,
      targetStage: targetStage as any,
      notes:
        targetStage === 'offer'
          ? 'Moved to offer after recorded readiness checks were completed'
          : `Moved to ${targetStage}`,
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;

    const lead = active.data.current?.lead as Lead | undefined;
    const sourceStage = active.data.current?.stageId as PipelineStageId | undefined;
    const targetStage = over.data.current?.stageId as PipelineStageId | undefined;

    if (!lead || !sourceStage || !targetStage || sourceStage === targetStage) return;
    moveLeadToStage(lead, targetStage, sourceStage);
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

  const selectedLeadStage = selectedLead
    ? PIPELINE_STAGES.find(stage => stage.id === getPipelineStageForLeadStatus(selectedLead.status))
    : null;
  const selectedLeadNextMove = selectedLead ? getLeadNextMove(selectedLead) : null;
  const selectedOfferReadiness = selectedLead
    ? getReadinessForLead(selectedLead.id)
    : DEFAULT_AGENT_LEAD_OFFER_READINESS;
  const selectedOfferCanMove = Boolean(offerReadiness?.canMoveToOffer);
  const selectedOfferBlockers = offerReadiness?.blockers || [];

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
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Lead Pipeline</h2>
          <Badge variant="secondary">
            {Object.values(pipeline).reduce((sum, col) => sum + col.leads.length, 0)} leads
          </Badge>
          {propertyId ? <Badge variant="outline">Property #{propertyId}</Badge> : null}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => setShowFilters(!showFilters)}
          >
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

      <div className="flex flex-col gap-1">
        <p className="text-xs text-slate-500">
          Click a lead to work the full record. Use the grip to move it between pipeline stages.
        </p>
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          {/* The board owns horizontal scrolling; the page and CRM summary do not. */}
          <div
            className="max-w-full overflow-x-auto overscroll-x-contain pb-3"
            aria-label="Lead pipeline board"
          >
            <div className="grid min-w-[1360px] grid-cols-5 gap-4 pr-1">
              {PIPELINE_STAGES.map(stage => {
                const column = pipeline[stage.id];
                const leads = filteredLeads(column.leads);

                return (
                  <PipelineColumn
                    key={stage.id}
                    stage={stage}
                    leads={leads}
                    onOpenLead={openLeadDetail}
                  />
                );
              })}
            </div>
          </div>
        </DndContext>
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
              <div className="text-gray-600">
                {leadToSchedule?.commercial?.listingTitle ||
                  leadToSchedule?.property?.title ||
                  'No property linked'}
              </div>
              {leadToSchedule?.email ? (
                <div className="text-gray-500">{leadToSchedule.email}</div>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Listing</label>
              {availableListings.length === 0 ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  No schedulable inventory is currently available. Publish the listing so its
                  canonical property projection exists before booking from CRM.
                </div>
              ) : null}
              <select
                value={bookingForm.listingId}
                onChange={e =>
                  setBookingForm(prev => ({
                    ...prev,
                    listingId: e.target.value,
                  }))
                }
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="">Select listing</option>
                {resolvedListings.map(listing => (
                  <option key={listing.id} value={listing.id}>
                    {listing.title} {listing.city ? `- ${listing.city}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Scheduled for</label>
                <Input
                  type="datetime-local"
                  value={bookingForm.scheduledAt}
                  onChange={e => setBookingForm(prev => ({ ...prev, scheduledAt: e.target.value }))}
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
        <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto overflow-x-hidden rounded-[24px] border-slate-200 bg-[#f8fafc] p-0 shadow-2xl sm:max-w-5xl [&_[data-slot=dialog-close]]:top-6 [&_[data-slot=dialog-close]]:right-6 [&_[data-slot=dialog-close]]:z-20 [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:border [&_[data-slot=dialog-close]]:border-slate-200 [&_[data-slot=dialog-close]]:bg-white [&_[data-slot=dialog-close]]:p-2 [&_[data-slot=dialog-close]]:opacity-100">
          {selectedLead ? (
            <div>
              <DialogHeader className="relative overflow-hidden border-b border-slate-200 bg-white px-5 py-6 text-left sm:px-7">
                <div
                  className="absolute inset-y-0 left-0 w-1 bg-[var(--primary)]"
                  aria-hidden="true"
                />
                <div
                  className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-sky-100/70 blur-3xl"
                  aria-hidden="true"
                />
                <div className="relative flex flex-col gap-5 pr-9 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)] text-sm font-bold text-white shadow-sm">
                        {getLeadInitials(selectedLead.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                          Lead workspace
                        </p>
                        <DialogTitle className="mt-1 truncate text-2xl font-bold tracking-tight text-slate-950">
                          {selectedLead.name || 'Unnamed lead'}
                        </DialogTitle>
                        <DialogDescription className="mt-1.5">
                          {SOURCE_LABELS[selectedLead.source || ''] || selectedLead.source || 'Web'}{' '}
                          enquiry · received {formatLeadCardDate(selectedLead.createdAt)}
                        </DialogDescription>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                      {selectedLead.email ? (
                        <span className="inline-flex min-w-0 items-center gap-2">
                          <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="truncate">{selectedLead.email}</span>
                        </span>
                      ) : null}
                      {selectedLead.phone ? (
                        <span className="inline-flex items-center gap-2">
                          <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                          {selectedLead.phone}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="shrink-0 rounded-2xl border border-slate-200 bg-white/90 p-3.5 shadow-sm lg:w-[220px]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Pipeline stage
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${selectedLeadStage?.color || 'bg-blue-500'}`}
                      />
                      {selectedLeadStage?.title || 'New Leads'}
                    </div>
                    <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                      <Flame
                        className={`h-3.5 w-3.5 ${getLeadTemperature(selectedLead).label === 'Hot' ? 'text-rose-500' : 'text-amber-500'}`}
                      />
                      {getLeadTemperature(selectedLead).label} intent
                    </div>
                  </div>
                </div>

                {selectedLead.commercial ? (
                  <div className="relative mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                        Commercial lease enquiry
                      </p>
                      <p className="mt-1 truncate font-semibold text-emerald-950">
                        {selectedLead.commercial.listingTitle}
                      </p>
                      <p className="mt-1 text-emerald-800">
                        {selectedLead.commercial.useType.replace(/_/g, ' ')} ·{' '}
                        {selectedLead.commercial.spaceIdentifier} ·{' '}
                        {selectedLead.commercial.rentableAreaM2 != null
                          ? `${selectedLead.commercial.rentableAreaM2.toLocaleString()} m² rentable`
                          : 'Rentable area not recorded'}
                      </p>
                      <p className="mt-2 text-xs text-emerald-700">
                        This enquiry stays with the verified commercial advertiser.
                      </p>
                    </div>
                  </div>
                ) : selectedLead.property ? (
                  <div className="relative mt-5 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-4 text-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--primary)] shadow-sm">
                      <Home className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Enquiry about
                      </p>
                      <p className="mt-1 truncate font-semibold text-slate-950">
                        {selectedLead.property.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          {selectedLead.property.city}
                        </span>
                        <span className="font-medium text-slate-700">
                          R{selectedLead.property.price.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative mt-5 flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
                    <Home className="h-5 w-5 text-slate-400" />
                    No property is linked to this enquiry yet.
                  </div>
                )}

                {selectedLead.message ? (
                  <div className="relative mt-4 border-l-2 border-[var(--primary)] pl-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Buyer message
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">
                      “{selectedLead.message}”
                    </p>
                  </div>
                ) : null}
              </DialogHeader>

              <div className="grid items-start gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_304px] lg:p-7">
                <main className="min-w-0 space-y-5">
                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Activity
                        </p>
                        <h3 className="mt-1 font-semibold text-slate-950">Lead timeline</h3>
                      </div>
                      {!selectedLead.commercial ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-slate-200 bg-white sm:w-auto"
                          onClick={() => openScheduleDialog(selectedLead)}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          Schedule showing
                        </Button>
                      ) : null}
                    </div>

                    {activitiesLoading ? (
                      <p className="px-5 py-8 text-sm text-slate-500 sm:px-6">Loading activity…</p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {communicationTimeline.map((activity: any, index) => {
                          const ActivityIcon =
                            activity.type === 'whatsapp'
                              ? MessageCircle
                              : activity.type === 'email'
                                ? Mail
                                : activity.type === 'phone'
                                  ? Phone
                                  : activity.type === 'status_change'
                                    ? CheckCircle2
                                    : Clock3;

                          return (
                            <div
                              key={activity.id}
                              className="relative flex gap-3 px-5 py-4 sm:px-6"
                            >
                              {index < communicationTimeline.length - 1 ? (
                                <span
                                  className="absolute left-[2.55rem] top-[3.35rem] h-[calc(100%-1.35rem)] w-px bg-slate-100 sm:left-[3.05rem]"
                                  aria-hidden="true"
                                />
                              ) : null}
                              <div
                                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${activity.tone}`}
                              >
                                <ActivityIcon className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                                  <p className="text-sm font-semibold capitalize text-slate-800">
                                    {String(activity.type).replace(/_/g, ' ')}
                                  </p>
                                  <time className="shrink-0 text-xs text-slate-400">
                                    {new Date(activity.createdAt).toLocaleString()}
                                  </time>
                                </div>
                                <p className="mt-1 text-sm leading-6 text-slate-600">
                                  {activity.description}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[var(--primary)]">
                        <MessageCircle className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Shared context
                        </p>
                        <h3 className="mt-1 font-semibold text-slate-950">Capture the outcome</h3>
                      </div>
                    </div>
                    <Textarea
                      id={`lead-note-${selectedLead.id}`}
                      rows={4}
                      className="mt-4 min-h-28 border-slate-200 bg-slate-50/60 focus-visible:bg-white"
                      value={newActivityNote}
                      onChange={e => setNewActivityNote(e.target.value)}
                      placeholder="Log the real contact outcome, buyer feedback, a reminder, or context another team member needs."
                    />
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs leading-5 text-slate-500">
                        Recording a contact outcome also updates this lead’s first-response
                        evidence.
                      </p>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                          variant="outline"
                          disabled={addLeadActivityMutation.isPending || !newActivityNote.trim()}
                          onClick={() =>
                            addLeadActivityMutation.mutate({
                              leadId: selectedLead.id,
                              activityType: selectedLead.phone ? 'call' : 'email',
                              description: newActivityNote.trim(),
                            })
                          }
                        >
                          <Phone className="mr-2 h-4 w-4" />
                          {addLeadActivityMutation.isPending ? 'Saving…' : 'Record contact'}
                        </Button>
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
                          {addLeadActivityMutation.isPending ? 'Saving…' : 'Save note'}
                        </Button>
                      </div>
                    </div>
                  </section>
                </main>

                <aside className="space-y-4">
                  <section className="relative overflow-hidden rounded-2xl bg-[var(--primary)] p-5 text-white shadow-sm">
                    <div
                      className="absolute -right-9 -top-10 h-36 w-36 rounded-full bg-white/10"
                      aria-hidden="true"
                    />
                    <div className="relative">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/65">
                        {selectedLeadNextMove?.eyebrow}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold leading-6">
                        {selectedLeadNextMove?.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-white/75">
                        {selectedLeadNextMove?.description}
                      </p>
                      <Button
                        className="mt-5 w-full bg-white text-[var(--primary)] hover:bg-slate-50"
                        onClick={() => runLeadNextMove(selectedLead)}
                      >
                        {selectedLeadNextMove?.action === 'showing' ||
                        selectedLeadNextMove?.action === 'followUp' ? (
                          <Calendar className="mr-2 h-4 w-4" />
                        ) : selectedLeadNextMove?.action === 'phone' ? (
                          <Phone className="mr-2 h-4 w-4" />
                        ) : selectedLeadNextMove?.action === 'readiness' ? (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        ) : (
                          <MessageCircle className="mr-2 h-4 w-4" />
                        )}
                        {selectedLeadNextMove?.actionLabel}
                      </Button>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Keep momentum
                        </p>
                        <h3 className="mt-1 font-semibold text-slate-950">Follow-up</h3>
                      </div>
                      <Calendar className="mt-1 h-4 w-4 text-slate-400" />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {selectedLead.nextFollowUp
                        ? `Due ${parseDatabaseTimestamp(selectedLead.nextFollowUp).toLocaleString()}`
                        : 'No reminder is set yet.'}
                    </p>
                    <div className="mt-4 space-y-3">
                      <Input
                        id={`lead-follow-up-${selectedLead.id}`}
                        type="datetime-local"
                        className="border-slate-200 bg-slate-50/60"
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
                        className="border-slate-200 bg-slate-50/60"
                        value={followUpForm.note}
                        onChange={event =>
                          setFollowUpForm(current => ({ ...current, note: event.target.value }))
                        }
                        placeholder="What should happen next?"
                      />
                      <Button
                        className="w-full"
                        disabled={setLeadFollowUpMutation.isPending || !followUpForm.nextFollowUp}
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
                          ? 'Scheduling…'
                          : selectedLead.nextFollowUp
                            ? 'Reschedule follow-up'
                            : 'Schedule follow-up'}
                      </Button>
                      {selectedLead.nextFollowUp ? (
                        <Button
                          variant="outline"
                          className="w-full border-slate-200"
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
                            ? 'Completing…'
                            : 'Complete follow-up'}
                        </Button>
                      ) : null}
                    </div>
                  </section>

                  <section
                    id={`lead-readiness-${selectedLead.id}`}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Deal checks
                        </p>
                        <h3 className="mt-1 font-semibold text-slate-950">Offer readiness</h3>
                      </div>
                      {offerReadinessLoading ? (
                        <span className="text-xs font-semibold text-slate-500">Checking…</span>
                      ) : selectedOfferCanMove ? (
                        <span className="text-xs font-semibold text-emerald-700">
                          Ready to offer
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-amber-700">In progress</span>
                      )}
                    </div>
                    <div className="mt-4 space-y-1.5">
                      {READINESS_ITEMS.map(item => {
                        const checked = selectedOfferReadiness[item.key];
                        return (
                          <button
                            key={item.key}
                            type="button"
                            disabled={
                              setLeadOfferReadinessMutation.isPending || offerReadinessLoading
                            }
                            onClick={() => toggleReadinessItem(selectedLead.id, item.key)}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition disabled:cursor-wait disabled:opacity-70 ${
                              checked
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <span>{item.label}</span>
                            {checked ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0" />
                            ) : (
                              <span className="h-4 w-4 shrink-0 rounded-full border border-slate-300" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {!offerReadinessLoading && !selectedOfferCanMove ? (
                      <div className="mt-3 flex gap-2 text-xs leading-5 text-amber-800">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        <span>
                          {selectedOfferBlockers[0] ||
                            'Complete every recorded deal check before moving this lead to Offer.'}
                        </span>
                      </div>
                    ) : null}
                    {selectedLeadStage?.id !== 'offer' && selectedLeadStage?.id !== 'closed' ? (
                      <Button
                        className="mt-4 w-full"
                        disabled={!selectedOfferCanMove || offerReadinessLoading}
                        onClick={() => moveLeadToStage(selectedLead, 'offer')}
                      >
                        {!selectedOfferCanMove ? (
                          <Lock className="mr-2 h-4 w-4" />
                        ) : (
                          <ArrowRight className="mr-2 h-4 w-4" />
                        )}
                        Move to Offer
                      </Button>
                    ) : null}
                  </section>

                  <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 [&::-webkit-details-marker]:hidden">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Record health
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          Delivery & consent
                        </p>
                      </div>
                      <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="space-y-4 border-t border-slate-100 px-5 pb-5 pt-4 text-sm">
                      <div>
                        <p className="font-medium text-slate-800">Consent evidence</p>
                        {selectedLead.consent?.capturedAt ? (
                          <>
                            <p className="mt-1 text-slate-600">
                              Recorded{' '}
                              {parseDatabaseTimestamp(
                                selectedLead.consent.capturedAt,
                              ).toLocaleString()}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Version {selectedLead.consent.version || 'unspecified'} ·{' '}
                              {selectedLead.consent.source || 'unspecified source'}
                            </p>
                          </>
                        ) : (
                          <p className="mt-1 text-amber-700">No consent evidence recorded.</p>
                        )}
                      </div>
                      <div className="border-t border-slate-100 pt-4">
                        <p className="font-medium text-slate-800">Recipient delivery</p>
                        <p className="mt-1 text-slate-600">
                          {getDeliveryMeta(selectedLead.delivery?.status).label}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {getDeliveryAttemptCount(selectedLead.delivery?.attempts)} attempt(s)
                          {selectedLead.delivery?.lastAttemptAt
                            ? ` · last ${parseDatabaseTimestamp(selectedLead.delivery.lastAttemptAt).toLocaleString()}`
                            : ''}
                        </p>
                        {selectedLead.delivery?.lastError ? (
                          <p className="mt-2 text-xs text-rose-700">
                            {selectedLead.delivery.lastError}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </details>
                </aside>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatLeadCardDate(value: string) {
  const date = parseDatabaseTimestamp(value);
  if (Number.isNaN(date.getTime())) return 'Recently';

  return date.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
}

function PipelineColumn({
  stage,
  leads,
  onOpenLead,
}: {
  stage: (typeof PIPELINE_STAGES)[number];
  leads: Lead[];
  onOpenLead: (lead: Lead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { stageId: stage.id },
  });

  return (
    <section className="min-w-0" aria-label={`${stage.title} pipeline stage`}>
      <Card
        className={cn(
          'h-full min-h-[340px] border-slate-200 transition-colors',
          isOver &&
            'border-[var(--primary)] ring-2 ring-[color:color-mix(in_oklab,var(--primary)_18%,transparent)]',
        )}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <span className={`h-2.5 w-2.5 rounded-full ${stage.color}`} aria-hidden="true" />
            {stage.title}
            <Badge variant="outline" className="ml-auto">
              {leads.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div
            ref={setNodeRef}
            className={cn(
              'min-h-[252px] space-y-3 rounded-xl p-1 transition-colors',
              isOver && 'bg-[color:color-mix(in_oklab,var(--primary)_6%,transparent)]',
            )}
          >
            {leads.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                stageId={stage.id as PipelineStageId}
                onOpenDetail={() => onOpenLead(lead)}
              />
            ))}
            {leads.length === 0 ? (
              <div className="flex min-h-[190px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 px-4 text-center text-slate-500">
                <Plus className="mb-2 h-7 w-7 opacity-45" />
                <p className="text-sm font-medium">{isOver ? 'Drop lead here' : 'No leads'}</p>
                <p className="mt-1 text-xs">Drag a lead here when its stage changes.</p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function LeadCard({
  lead,
  stageId,
  onOpenDetail,
}: {
  lead: Lead;
  stageId: PipelineStageId;
  onOpenDetail: () => void;
}) {
  const temperature = getLeadTemperature(lead);
  const ageDays = getLeadAgeDays(lead);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useDraggable({
    id: `lead-${lead.id}`,
    data: { lead, stageId },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const sourceLabel = lead.source ? SOURCE_LABELS[lead.source] || lead.source : 'Web';
  const stageColor = PIPELINE_STAGES.find(stage => stage.id === stageId)?.color || 'bg-blue-500';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('min-w-0', isDragging && 'relative z-20 opacity-55')}
    >
      <Card
        tabIndex={0}
        role="button"
        aria-label={`Open lead for ${lead.name || 'unnamed lead'}`}
        className="relative min-w-0 cursor-pointer overflow-hidden border-slate-200 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        onClick={onOpenDetail}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpenDetail();
          }
        }}
      >
        <span className={`absolute inset-y-0 left-0 w-1 ${stageColor}`} aria-hidden="true" />
        <CardContent className="p-3.5 pl-4">
          <div className="min-w-0 space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color:color-mix(in_srgb,var(--primary)_10%,white)] text-[11px] font-bold text-[var(--primary)]">
                {getLeadInitials(lead.name)}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="line-clamp-2 text-sm font-semibold leading-5 text-slate-900">
                  {lead.name || 'Unnamed lead'}
                </h4>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatLeadCardDate(lead.createdAt)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{ageDays === 0 ? 'Today' : `${ageDays}d old`}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-[10px] ${temperature.className}`}
                  >
                    <span
                      className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${temperature.dotClassName}`}
                    />
                    {temperature.label}
                  </Badge>
                </div>
              </div>
              <span
                {...attributes}
                {...listeners}
                aria-label={`Move ${lead.name || 'lead'} to another stage`}
                title="Drag to move stage"
                className="mt-0.5 shrink-0 cursor-grab rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
                onClick={event => event.stopPropagation()}
              >
                <GripVertical className="h-4 w-4" />
              </span>
            </div>

            {lead.commercial ? (
              <div className="flex min-w-0 items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs">
                <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />
                <div className="min-w-0">
                  <p className="truncate font-medium text-emerald-950">
                    {lead.commercial.listingTitle}
                  </p>
                  <p className="mt-0.5 truncate text-emerald-800">
                    {lead.commercial.spaceIdentifier} · {lead.commercial.useType.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
            ) : lead.property ? (
              <div className="flex min-w-0 items-start gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs">
                <Home className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{lead.property.title}</p>
                  <p className="mt-0.5 truncate text-slate-500">
                    {lead.property.city} · R{lead.property.price.toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
                No property linked yet
              </div>
            )}

            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
              <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-[11px] font-medium text-slate-500">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${stageColor}`}
                  aria-hidden="true"
                />
                <span className="truncate">{sourceLabel}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[var(--primary)]">
                View workspace
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
