import type { LucideIcon } from 'lucide-react';

export type WorkspaceId =
  | 'overview'
  | 'attention'
  | 'my-day'
  | 'leads'
  | 'listings'
  | 'canvassing'
  | 'viewings'
  | 'transactions'
  | 'commission'
  | 'team'
  | 'growth'
  | 'reporting'
  | 'compliance'
  | 'billing'
  | 'settings'
  | 'help';

export type AgencyStats = {
  totalListings: number;
  totalSales: number;
  totalLeads: number;
  totalAgents: number;
  activeListings: number;
  pendingListings: number;
  recentLeads: number;
  recentSales: number;
};

export type AgencyLead = {
  id: number;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  leadType?: string | null;
  status?: string | null;
  source?: string | null;
  leadSource?: string | null;
  qualificationScore?: number | null;
  funnelStage?: string | null;
  assignedTo?: number | null;
  lastContactedAt?: string | Date | null;
  firstRespondedAt?: string | Date | null;
  firstResponseMinutes?: number | null;
  firstResponseOverdue?: boolean;
  firstResponseDueAt?: string | Date | null;
  nextFollowUp?: string | Date | null;
  createdAt?: string | Date | null;
  agentId?: number | null;
  propertyId?: number | null;
  notes?: string | null;
  lostReason?: string | null;
  overdueFollowUp?: boolean;
  nextAction?: string;
  temperature?: {
    label: 'hot' | 'warm' | 'cool';
    score: number;
    source: 'server-derived';
  };
  readiness?: {
    canMoveToOffer: boolean;
    blockers: string[];
    source: 'server-derived';
  };
  agent?: { id: number; userId?: number | null; name: string; email?: string | null; phone?: string | null } | null;
  property?: {
    id: number;
    title: string;
    city?: string | null;
    province?: string | null;
    price?: number | null;
    status?: string | null;
  } | null;
  activities?: Array<{
    id: number;
    leadId: number;
    userId?: number | null;
    type: 'note' | 'call' | 'email' | 'meeting' | 'status_change' | 'contact_attempt';
    description?: string | null;
    metadata?: Record<string, unknown> | null;
    createdAt?: string | Date | null;
  }>;
  viewings?: Array<{
    id: number;
    leadId?: number | null;
    propertyId?: number | null;
    agentId?: number | null;
    scheduledAt?: string | Date | null;
    status?: string | null;
    durationMinutes?: number | null;
    notes?: string | null;
    feedback?: string | null;
    agent?: { id: number; name: string; email?: string | null } | null;
  }>;
};

export type AgencyListing = {
  id: number;
  title?: string | null;
  price?: number | string | null;
  status?: string | null;
  city?: string | null;
  views?: number | null;
  enquiries?: number | null;
  createdAt?: string | Date | null;
};

export type PerformanceDatum = {
  month: string;
  listings: number;
  leads: number;
  sales: number;
};

export type ConversionStats = {
  total: number;
  converted: number;
  conversionRate: number;
  byStatus: Array<{ status: string; count: number; percentage: number }>;
};

export type CommissionStats = {
  totalEarnings: number;
  paidCommissions: number;
  pendingCommissions: number;
  monthlyBreakdown: Array<{ month: string; earnings: number }>;
};

export type AgentLeaderboardRow = {
  agentId: number;
  agentName: string;
  earnings: number;
  propertiesListed: number;
  leadsGenerated: number;
  propertiesSold: number;
  conversionRate: number;
};

export type Tone = 'emerald' | 'teal' | 'sky' | 'amber' | 'rose' | 'slate';

export type LeadSignals = {
  newLeadCount: number;
  unassignedCount: number;
  contactedFollowUpCount: number;
  firstResponseOverdueCount: number;
  viewingCount: number;
  offerCount: number;
};

export type ListingHealthItem = { label: string; value: number; tone: Tone };

export type AttentionItem = {
  title: string;
  detail: string;
  value: string;
  tone: Tone;
  icon: LucideIcon;
  route: WorkspaceId;
  action: string;
};

export type AgendaItem = {
  time: string;
  title: string;
  detail: string;
  tone: Tone;
  route: WorkspaceId;
};

export type SourceEfficiencyDatum = {
  source: string;
  leads: number;
  converted: number;
  hot: number;
};

export type SuburbHeatmapDatum = {
  suburb: string;
  views: number;
  leads: number;
};

export type WorkspaceContentProps = {
  workspace: WorkspaceId;
  stats: AgencyStats;
  recentLeads: AgencyLead[];
  leads: AgencyLead[];
  pagedLeads: AgencyLead[];
  filteredLeads: AgencyLead[];
  listings: AgencyListing[];
  conversion: ConversionStats;
  commission: CommissionStats;
  leaderboard: AgentLeaderboardRow[];
  performance: PerformanceDatum[];
  activeReportMonth: string;
  selectedMetric: 'leads' | 'listings' | 'sales';
  setSelectedMetric: (value: 'leads' | 'listings' | 'sales') => void;
  setSelectedReportMonth: (value: string | null) => void;
  leadSignals: LeadSignals;
  listingHealth: ListingHealthItem[];
  attentionItems: AttentionItem[];
  agendaItems: AgendaItem[];
  sourceEfficiencyData: SourceEfficiencyDatum[];
  suburbHeatmapData: SuburbHeatmapDatum[];
  maxSuburbViews: number;
  leadView: 'kanban' | 'table';
  setLeadView: (value: 'kanban' | 'table') => void;
  leadSearch: string;
  setLeadSearch: (value: string) => void;
  leadStatus: string;
  setLeadStatus: (value: string) => void;
  leadSource: string;
  setLeadSource: (value: string) => void;
  uniqueSources: string[];
  leadPage: number;
  maxLeadPage: number;
  setLeadPage: (value: number) => void;
  isLoading: Record<string, boolean>;
  hasError: Record<string, boolean>;
  onNavigate: (workspace: WorkspaceId) => void;
  setLocation: (path: string) => void;
  setupComplete: boolean;
};
