import { router, superAdminProcedure } from './_core/trpc';
import { getDb } from './db';
import {
  getPlatformAnalytics,
  getEcosystemStats,
  countPendingAgents,
  countPendingListings,
  countPendingDevelopments,
} from './db';
import { leads, developments, cataloguePublishers, developerOrganisations } from '../drizzle/schema';
import { desc, sql, and, eq, gte, isNotNull } from 'drizzle-orm';

/**
 * Founder Command Centre Router — read-only aggregation layer.
 *
 * This router queries existing canonical data. It does NOT create new tables,
 * write to existing tables, or introduce new persistence. Every endpoint is
 * super_admin-only.
 */
export const founderRouter = router({
  /**
   * Cockpit: platform snapshot with real metrics from existing analytics.
   */
  getDashboardMetrics: superAdminProcedure.query(async () => {
    const [analytics, ecosystem, pendingAgents, pendingListings, pendingDevelopments] =
      await Promise.all([
        getPlatformAnalytics(),
        getEcosystemStats(),
        countPendingAgents(),
        countPendingListings(),
        countPendingDevelopments(),
      ]);

    return {
      platform: {
        totalUsers: analytics.totalUsers,
        totalAgencies: analytics.totalAgencies,
        totalAgents: analytics.totalAgents,
        totalDevelopers: analytics.totalDevelopers ?? 0,
        totalListings: analytics.totalProperties,
        activeListings: analytics.activeProperties,
        monthlyRevenue: analytics.monthlyRevenue,
        userGrowth: analytics.userGrowth,
        propertyGrowth: analytics.propertyGrowth,
      },
      ecosystem,
      pendingApprovals: {
        agents: pendingAgents,
        listings: pendingListings,
        developments: pendingDevelopments,
      },
    };
  }),

  /**
   * Founder Attention: read-only attention candidates derived from existing
   * canonical signals. No new persistence — this queries leads and pending
   * action items that already exist in the platform.
   */
  getAttentionCandidates: superAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { items: [] };

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const items: Array<{
      id: number;
      type: 'decision' | 'opportunity' | 'escalation' | 'awareness';
      title: string;
      summary: string;
      source: string;
      sourceReference: string | null;
      workstream: string;
      urgency: 'critical' | 'high' | 'medium' | 'low';
      createdAt: string;
      waitingHours: number;
    }> = [];

    // 1. High-value developer leads (new, unassigned or awaiting response)
    try {
      const highValueLeads = await db
        .select({
          id: leads.id,
          name: leads.name,
          email: leads.email,
          status: leads.status,
          qualificationScore: leads.qualificationScore,
          developmentId: leads.developmentId,
          createdAt: leads.createdAt,
        })
        .from(leads)
        .where(
          and(
            isNotNull(leads.developmentId),
            eq(leads.status, 'new'),
            gte(leads.qualificationScore, 60),
          ),
        )
        .orderBy(desc(leads.qualificationScore), desc(leads.createdAt))
        .limit(10);

      for (const lead of highValueLeads) {
        const created = new Date(lead.createdAt);
        const hours = Math.round((now.getTime() - created.getTime()) / (1000 * 60 * 60));
        const score = lead.qualificationScore ?? 0;

        items.push({
          id: lead.id,
          type: score >= 80 ? 'opportunity' : 'escalation',
          title: `Developer lead: ${lead.name}`,
          summary: `New inquiry (score ${score}/100) awaiting response.`,
          source: 'leads',
          sourceReference: `/developer/leads`,
          workstream: 'Commercial',
          urgency: hours > 24 ? 'critical' : hours > 6 ? 'high' : 'medium',
          createdAt: lead.createdAt,
          waitingHours: hours,
        });
      }
    } catch {
      // Leads query may fail if schema differs — skip gracefully
    }

    // 2. Pending agent approvals (超过24小时)
    try {
      const pendingAgentCount = await countPendingAgents();
      if (pendingAgentCount > 0) {
        items.push({
          id: -1,
          type: 'escalation',
          title: `${pendingAgentCount} agent registration(s) pending approval`,
          summary: 'Agent registrations awaiting platform review.',
          source: 'admin',
          sourceReference: '/admin/agent-approvals',
          workstream: 'Operations',
          urgency: pendingAgentCount > 5 ? 'high' : 'medium',
          createdAt: now.toISOString(),
          waitingHours: 0,
        });
      }
    } catch {
      // Skip
    }

    // 3. Pending listing approvals
    try {
      const pendingListingCount = await countPendingListings();
      if (pendingListingCount > 0) {
        items.push({
          id: -2,
          type: 'escalation',
          title: `${pendingListingCount} listing(s) pending review`,
          summary: 'Property listings awaiting verification.',
          source: 'admin',
          sourceReference: '/admin/listing-approvals',
          workstream: 'Operations',
          urgency: pendingListingCount > 10 ? 'high' : 'medium',
          createdAt: now.toISOString(),
          waitingHours: 0,
        });
      }
    } catch {
      // Skip
    }

    // 4. Pending development approvals
    try {
      const pendingDevCount = await countPendingDevelopments();
      if (pendingDevCount > 0) {
        items.push({
          id: -3,
          type: 'decision',
          title: `${pendingDevCount} development(s) awaiting approval`,
          summary: 'Developer submissions pending platform review.',
          source: 'admin',
          sourceReference: '/admin/development-approvals',
          workstream: 'Commercial',
          urgency: pendingDevCount > 3 ? 'high' : 'medium',
          createdAt: now.toISOString(),
          waitingHours: 0,
        });
      }
    } catch {
      // Skip
    }

    // Sort by urgency priority
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    items.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

    return { items };
  }),

  /**
   * Company Map: ecosystem node data for the visual business model.
   * Returns real counts from existing ecosystem stats.
   */
  getCompanyMapData: superAdminProcedure.query(async () => {
    const ecosystem = await getEcosystemStats();

    return {
      nodes: [
        {
          id: 'agents',
          label: 'Agents',
          total: ecosystem.agents.total,
          active: ecosystem.agents.active,
          growth: ecosystem.agents.growth,
          status: ecosystem.agents.active > 0 ? 'healthy' : 'attention',
        },
        {
          id: 'agencies',
          label: 'Agencies',
          total: ecosystem.agencies.total,
          active: ecosystem.agencies.active,
          growth: ecosystem.agencies.growth,
          status: ecosystem.agencies.active > 0 ? 'healthy' : 'attention',
        },
        {
          id: 'developers',
          label: 'Developers',
          total: ecosystem.developers.total,
          active: ecosystem.developers.active,
          growth: ecosystem.developers.growth,
          status: ecosystem.developers.active > 0 ? 'healthy' : 'attention',
        },
        {
          id: 'buyers',
          label: 'Buyers',
          total: ecosystem.users.total,
          active: ecosystem.users.active,
          growth: ecosystem.users.growth,
          status: ecosystem.users.total > 0 ? 'healthy' : 'attention',
        },
      ],
      foundations: {
        technology: { status: 'not_connected', label: 'Technology Platform' },
        data: { status: 'not_connected', label: 'Data & Intelligence' },
        marketing: { status: 'not_connected', label: 'Marketing & Traffic' },
        payments: { status: 'not_connected', label: 'Payments & Revenue' },
        operations: { status: 'not_connected', label: 'Operations' },
      },
    };
  }),
});
