import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  CircleDollarSign,
  CreditCard,
  MessageSquare,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useAgencyOnboardingStatus } from '@/hooks/useAgencyOnboardingStatus';
import { trpc } from '@/lib/trpc';
import {
  DETAIL_WORKSPACES,
  EMPTY_COMMISSION,
  EMPTY_CONVERSION,
  EMPTY_STATS,
  PIPELINE_STAGES,
} from './constants';
import type {
  AgencyLead,
  AgencyListing,
  AgencyStats,
  AgentLeaderboardRow,
  CommissionStats,
  ConversionStats,
  PerformanceDatum,
  SourceEfficiencyDatum,
  SuburbHeatmapDatum,
  Tone,
  WorkspaceContentProps,
  WorkspaceId,
} from './types';
import { sourceLabel } from './utils';

type WorkspaceDataProps = Omit<
  WorkspaceContentProps,
  'workspace' | 'onNavigate' | 'setLocation' | 'setupComplete'
>;

export function useAgencyWorkspaceData(workspace: WorkspaceId) {
  const [leadView, setLeadView] = useState<'kanban' | 'table'>('kanban');
  const [leadSearch, setLeadSearch] = useState('');
  const [leadStatus, setLeadStatus] = useState('all');
  const [leadSource, setLeadSource] = useState('all');
  const [leadPage, setLeadPage] = useState(1);
  const [selectedMetric, setSelectedMetric] = useState<'leads' | 'listings' | 'sales'>('leads');
  const [selectedReportMonth, setSelectedReportMonth] = useState<string | null>(null);
  const { user } = useAuth();
  const { status, isLoading: statusLoading } = useAgencyOnboardingStatus({
    requireDashboardUnlocked: true,
  });

  const dashboardReady = Boolean(status?.dashboardUnlocked);
  const needsDetailedLeads = DETAIL_WORKSPACES.has(workspace);
  const needsListings = ['overview', 'listings', 'growth', 'reporting'].includes(workspace);
  const needsPerformance = ['overview', 'growth', 'reporting'].includes(workspace);
  const needsConversion = ['overview', 'leads', 'reporting'].includes(workspace);
  const needsCommission = ['overview', 'transactions', 'commission'].includes(workspace);
  const needsSettlementWork = ['commission', 'attention'].includes(workspace);
  const needsTeam = ['overview', 'team'].includes(workspace);

  const statsQuery = trpc.agency.getDashboardStats.useQuery(undefined, { enabled: dashboardReady });
  const recentLeadsQuery = trpc.agency.getRecentLeads.useQuery(
    { limit: 8 },
    { enabled: dashboardReady },
  );
  const leadsQuery = trpc.agency.getLeads.useQuery(
    { status: 'all', limit: 100 },
    { enabled: dashboardReady && needsDetailedLeads },
  );
  const listingsQuery = trpc.agency.getRecentListings.useQuery(
    { limit: workspace === 'listings' ? 60 : 20 },
    { enabled: dashboardReady && needsListings },
  );
  const performanceQuery = trpc.agency.getPerformanceData.useQuery(
    { months: 6 },
    { enabled: dashboardReady && needsPerformance },
  );
  const conversionQuery = trpc.agency.getLeadConversionStats.useQuery(
    { months: 6 },
    { enabled: dashboardReady && needsConversion },
  );
  const commissionQuery = trpc.agency.getCommissionStats.useQuery(
    { months: 6 },
    { enabled: dashboardReady && needsCommission && user?.role !== 'agent' },
  );
  const settlementQuery = trpc.agency.getCommissionSettlements.useQuery(undefined, {
    enabled: dashboardReady && needsSettlementWork,
  });
  const leaderboardQuery = trpc.agency.getAgentLeaderboard.useQuery(
    { months: 3 },
    { enabled: dashboardReady && needsTeam },
  );
  const performanceQueueQuery = trpc.agency.getListingPerformanceQueue.useQuery(undefined, {
    enabled: dashboardReady && ['overview', 'attention'].includes(workspace),
  });

  const stats = (statsQuery.data || EMPTY_STATS) as AgencyStats;
  const recentLeads = (recentLeadsQuery.data || []) as AgencyLead[];
  const detailLeads = (leadsQuery.data || []) as AgencyLead[];
  const leads = detailLeads.length ? detailLeads : recentLeads;
  const listings = (listingsQuery.data || []) as AgencyListing[];
  const performance = (performanceQuery.data || []) as PerformanceDatum[];
  const conversion = (conversionQuery.data || EMPTY_CONVERSION) as ConversionStats;
  const commission = (commissionQuery.data || EMPTY_COMMISSION) as CommissionStats;
  const settlements = (settlementQuery.data || []) as Array<{
    id: number;
    status?: string | null;
    expectedCommission?: number | null;
    amountReceived?: number | null;
    expectedPaymentDate?: string | null;
    overdue?: boolean;
  }>;
  const leaderboard = (leaderboardQuery.data || []) as AgentLeaderboardRow[];
  const performanceExceptions = (performanceQueueQuery.data || []) as Array<any>;

  const agencyName = status?.agency?.name || 'Agency';
  const principalName =
    user?.firstName || user?.name?.split(' ')?.[0] || user?.email?.split('@')?.[0] || 'there';
  const setupComplete = Boolean(status?.fullFeaturesUnlocked);
  const billingNeedsAttention = Boolean(status?.hasAgency && !status?.billingActivated);
  const teamNeedsAttention = Boolean(status?.billingActivated && !status?.teamReady);

  const leadSignals = useMemo(() => {
    const source = leads.length ? leads : recentLeads;
    const newLeadCount = source.filter(lead => (lead.status || 'new') === 'new').length;
    const unassignedCount = source.filter(lead => !lead.agentId).length;
    const contactedFollowUpCount = source.filter(lead => {
      if (lead.overdueFollowUp) return true;
      if ((lead.status || 'new') !== 'contacted') return false;
      const anchor = lead.lastContactedAt || lead.createdAt;
      const lastTouch = anchor ? new Date(anchor) : null;
      if (!lastTouch || Number.isNaN(lastTouch.getTime())) return false;
      return (Date.now() - lastTouch.getTime()) / 86_400_000 >= 3;
    }).length;
    const firstResponseOverdueCount = source.filter(lead => lead.firstResponseOverdue).length;
    const viewingCount = source.filter(lead =>
      ['viewing_scheduled', 'viewing'].includes(String(lead.status || '')),
    ).length;
    const offerCount = source.filter(lead =>
      ['offer_sent', 'converted', 'closed'].includes(String(lead.status || '')),
    ).length;

    return {
      newLeadCount,
      unassignedCount,
      contactedFollowUpCount,
      firstResponseOverdueCount,
      viewingCount,
      offerCount,
    };
  }, [leads, recentLeads]);

  const listingHealth = useMemo(() => {
    const pending = Math.max(
      stats.pendingListings,
      listings.filter(listing => listing.status === 'pending').length,
    );
    const draftLike = listings.filter(listing =>
      ['draft', 'incomplete', 'rejected'].includes(listing.status || ''),
    ).length;
    const staleRisk = listings.filter(listing => {
      const created = listing.createdAt ? new Date(listing.createdAt) : null;
      if (!created || Number.isNaN(created.getTime())) return false;
      return (Date.now() - created.getTime()) / 86_400_000 > 21 && listing.status === 'available';
    }).length;

    return [
      { label: 'Public', value: stats.activeListings, tone: 'emerald' as Tone },
      { label: 'Pending review', value: pending, tone: 'amber' as Tone },
      { label: 'Needs correction', value: draftLike, tone: 'rose' as Tone },
      { label: 'Visibility risk', value: staleRisk, tone: 'sky' as Tone },
    ];
  }, [listings, stats]);

  const attentionItems = useMemo(() => {
    const items: WorkspaceDataProps['attentionItems'] = [];

    if (billingNeedsAttention) {
      items.push({
        title: 'Subscription activation is pending',
        detail: 'Publishing and full agency workflows unlock after billing activation.',
        value: 'High',
        tone: 'amber',
        icon: CreditCard,
        route: 'billing',
        action: 'Review billing',
      });
    }
    if (teamNeedsAttention || stats.totalAgents === 0) {
      items.push({
        title: 'Team coverage is thin',
        detail: 'Invite or activate agents so leads and listings have clear ownership.',
        value: `${stats.totalAgents || status?.teamMembersCount || 0} agents`,
        tone: 'sky',
        icon: UserPlus,
        route: 'team',
        action: 'Open team',
      });
    }
    if (leadSignals.newLeadCount > 0) {
      items.push({
        title: 'New enquiries need first response',
        detail: 'Fresh leads are waiting in the agency lead queue.',
        value: String(leadSignals.newLeadCount),
        tone: 'rose',
        icon: MessageSquare,
        route: 'leads',
        action: 'Work leads',
      });
    }
    if (leadSignals.firstResponseOverdueCount > 0) {
      items.push({
        title: 'Buyer enquiries have missed first-response SLA',
        detail: 'These active leads have not received a recorded first response within 15 minutes.',
        value: String(leadSignals.firstResponseOverdueCount),
        tone: 'rose',
        icon: Clock3,
        route: 'leads',
        action: 'Respond now',
      });
    }
    if (leadSignals.unassignedCount > 0) {
      items.push({
        title: 'Unassigned leads are building up',
        detail: 'Assignment gaps slow response time and make ownership unclear.',
        value: String(leadSignals.unassignedCount),
        tone: 'amber',
        icon: Users,
        route: 'leads',
        action: 'Assign',
      });
    }
    if (leadSignals.contactedFollowUpCount > 0) {
      items.push({
        title: 'Follow-up required on contacted leads',
        detail: 'Contacted prospects have gone quiet for three or more days.',
        value: String(leadSignals.contactedFollowUpCount),
        tone: 'rose',
        icon: Clock3,
        route: 'leads',
        action: 'Follow up',
      });
    }
    if (stats.pendingListings > 0) {
      items.push({
        title: 'Listings are waiting for review',
        detail: 'Pending inventory is not yet doing public work for the agency.',
        value: String(stats.pendingListings),
        tone: 'amber',
        icon: ClipboardCheck,
        route: 'listings',
        action: 'Review listings',
      });
    }
    const actionablePerformance = performanceExceptions.filter(item => item.actionable);
    if (actionablePerformance.length) {
      const exception = actionablePerformance[0];
      items.push({
        title: exception.reason,
        detail: `${exception.listing.title} · ${exception.responsibleAgent?.name || 'Unassigned agent'}. Clear this by completing the seller-review, revision, or availability action.`,
        value: `${actionablePerformance.length} listing${actionablePerformance.length === 1 ? '' : 's'}`,
        tone: exception.reason.toLowerCase().includes('overdue') ? 'rose' : 'amber',
        icon: ClipboardCheck,
        route: 'performance',
        action: 'Open performance',
      });
    }
    const financialExceptions = settlements.filter(item =>
      Boolean(item.overdue) || ['disputed', 'reconciliation_required'].includes(String(item.status || '')),
    );
    if (financialExceptions.length) {
      const amount = financialExceptions.reduce(
        (sum, item) => sum + Math.max(0, Number(item.expectedCommission || 0) - Number(item.amountReceived || 0)),
        0,
      );
      items.push({
        title: 'Commission receipts need attention',
        detail: 'Only overdue, disputed, or reconciliation-required settlements are surfaced here.',
        value: `${financialExceptions.length} · R${amount.toLocaleString('en-ZA')}`,
        tone: 'rose',
        icon: CircleDollarSign,
        route: 'commission',
        action: 'Reconcile',
      });
    }
    if (!items.length) {
      items.push({
        title: 'No urgent exceptions right now',
        detail: 'The operating queue is clear based on available signals.',
        value: 'Clear',
        tone: 'emerald',
        icon: CheckCircle2,
        route: 'overview',
        action: 'Stay here',
      });
    }
    return items;
  }, [
    billingNeedsAttention,
    leadSignals,
    stats.pendingListings,
    stats.totalAgents,
    performanceExceptions,
    settlements,
    status?.teamMembersCount,
    teamNeedsAttention,
  ]);

  const agendaItems = useMemo(
    () => [
      {
        time: 'Now',
        title: `${leadSignals.newLeadCount} new enquiry ${leadSignals.newLeadCount === 1 ? 'reply' : 'replies'}`,
        detail: leadSignals.newLeadCount ? 'First-response queue' : 'Lead queue is clear',
        tone: leadSignals.newLeadCount ? ('rose' as Tone) : ('emerald' as Tone),
        route: 'leads' as WorkspaceId,
      },
      {
        time: 'Today',
        title: `${leadSignals.viewingCount} viewing ${leadSignals.viewingCount === 1 ? 'follow-through' : 'follow-throughs'}`,
        detail: 'Confirmations, feedback, and offer readiness',
        tone: leadSignals.viewingCount ? ('amber' as Tone) : ('teal' as Tone),
        route: 'viewings' as WorkspaceId,
      },
      {
        time: 'This week',
        title: `${stats.pendingListings} listing ${stats.pendingListings === 1 ? 'review' : 'reviews'}`,
        detail: 'Inventory readiness',
        tone: stats.pendingListings ? ('amber' as Tone) : ('sky' as Tone),
        route: 'listings' as WorkspaceId,
      },
    ],
    [leadSignals.newLeadCount, leadSignals.viewingCount, stats.pendingListings],
  );

  const sourceEfficiencyData = useMemo<SourceEfficiencyDatum[]>(() => {
    const groups = new Map<string, SourceEfficiencyDatum>();

    leads.forEach(lead => {
      const rawSource = String(lead.leadSource || lead.source || 'web');
      const existing =
        groups.get(rawSource) || {
          source: sourceLabel(rawSource),
          leads: 0,
          converted: 0,
          hot: 0,
        };
      existing.leads += 1;
      existing.converted += ['converted', 'closed'].includes(String(lead.status || '')) ? 1 : 0;
      existing.hot += lead.temperature?.label === 'hot' ? 1 : 0;
      groups.set(rawSource, existing);
    });

    return Array.from(groups.values()).sort((a, b) => b.leads - a.leads).slice(0, 6);
  }, [leads]);

  const suburbHeatmapData = useMemo<SuburbHeatmapDatum[]>(() => {
    const groups = new Map<string, SuburbHeatmapDatum>();
    listings.forEach(listing => {
      const suburb = listing.city || 'Unplaced';
      const existing = groups.get(suburb) || { suburb, views: 0, leads: 0 };
      existing.views += Number(listing.views || 0);
      existing.leads += Number(listing.enquiries || 0);
      groups.set(suburb, existing);
    });
    return Array.from(groups.values()).sort((a, b) => b.views - a.views).slice(0, 8);
  }, [listings]);

  const filteredLeads = useMemo(() => {
    const query = leadSearch.trim().toLowerCase();
    return leads.filter(lead => {
      const statusMatches =
        leadStatus === 'all' ||
        (leadStatus === 'unassigned' ? !lead.agentId : false) ||
        (leadStatus === 'overdue' ? Boolean(lead.overdueFollowUp) : false) ||
        lead.status === leadStatus;
      const sourceMatches =
        leadSource === 'all' || lead.source === leadSource || lead.leadSource === leadSource;
      const searchMatches =
        !query ||
        [lead.name, lead.email, lead.phone, lead.property?.title]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(query));
      return statusMatches && sourceMatches && searchMatches;
    });
  }, [leadSearch, leadSource, leadStatus, leads]);

  const pageSize = 12;
  const pagedLeads = filteredLeads.slice((leadPage - 1) * pageSize, leadPage * pageSize);
  const maxLeadPage = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const uniqueSources = Array.from(
    new Set(leads.map(lead => lead.leadSource || lead.source).filter(Boolean) as string[]),
  );

  const workspaceContent: WorkspaceDataProps = {
    stats,
    recentLeads,
    leads,
    pagedLeads,
    filteredLeads,
    listings,
    conversion,
    commission,
    leaderboard,
    performance,
    activeReportMonth: selectedReportMonth || performance[performance.length - 1]?.month || '',
    selectedMetric,
    setSelectedMetric,
    setSelectedReportMonth,
    leadSignals,
    listingHealth,
    attentionItems,
    agendaItems,
    sourceEfficiencyData,
    suburbHeatmapData,
    maxSuburbViews: Math.max(...suburbHeatmapData.map(item => item.views), 1),
    leadView,
    setLeadView,
    leadSearch,
    setLeadSearch: value => {
      setLeadSearch(value);
      setLeadPage(1);
    },
    leadStatus,
    setLeadStatus: value => {
      setLeadStatus(value);
      setLeadPage(1);
    },
    leadSource,
    setLeadSource: value => {
      setLeadSource(value);
      setLeadPage(1);
    },
    uniqueSources,
    leadPage,
    maxLeadPage,
    setLeadPage,
    isLoading: {
      stats: statsQuery.isLoading,
      recentLeads: recentLeadsQuery.isLoading,
      leads: leadsQuery.isLoading,
      listings: listingsQuery.isLoading,
      performance: performanceQuery.isLoading,
      conversion: conversionQuery.isLoading,
      commission: commissionQuery.isLoading,
      leaderboard: leaderboardQuery.isLoading,
    },
    hasError: {
      stats: Boolean(statsQuery.error),
      recentLeads: Boolean(recentLeadsQuery.error),
      leads: Boolean(leadsQuery.error),
      listings: Boolean(listingsQuery.error),
      performance: Boolean(performanceQuery.error),
      conversion: Boolean(conversionQuery.error),
      commission: Boolean(commissionQuery.error),
      leaderboard: Boolean(leaderboardQuery.error),
    },
  };

  return {
    status,
    statusLoading,
    agencyName,
    principalName,
    setupComplete,
    billingNeedsAttention,
    teamNeedsAttention,
    workspaceContent,
  };
}
