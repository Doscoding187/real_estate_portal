import { z } from 'zod';
import { router, superAdminProcedure } from './_core/trpc';
import { listStrategicWorkForToday } from './services/strategicCommitmentService';
import { getDb } from './db';
import {
  getPlatformAnalytics,
  getEcosystemStats,
  countPendingAgents,
  countPendingListings,
  countPendingDevelopments,
} from './db';
import {
  leads,
  developments,
  cataloguePublishers,
  developerOrganisations,
  users,
  agents,
  agencies,
  developers,
  listings,
  commissions,
  savedSearches,
  favorites,
  recentlyViewed,
  slPlaces,
  slSpaces,
  slLeadContexts,
} from '../drizzle/schema';
import { desc, sql, and, eq, gte, isNotNull, asc, count } from 'drizzle-orm';
import { assessRuntimeDatabaseReadiness } from './_core/databaseAuthority/readiness';
import { getCacheHealth } from './_core/cache/redis';
import { savedSearchDeliveryScheduler } from './services/savedSearchDeliveryScheduler';

const LEAD_PIPELINE_ORDER = [
  'new',
  'contacted',
  'qualified',
  'viewing_scheduled',
  'offer_sent',
  'converted',
  'closed',
  'lost',
] as const;

/**
 * Founder Command Centre Router — read-only aggregation layer.
 *
 * This router queries existing canonical data. It does NOT create new tables,
 * write to existing tables, or introduce new persistence. Every endpoint is
 * super_admin-only.
 */
export const founderRouter = router({
  getStrategicCommitments: superAdminProcedure.query(async () => {
    try { return { items: await listStrategicWorkForToday() }; } catch { return { items: [] }; }
  }),
  /**
   * Cockpit: platform snapshot with real metrics from existing analytics.
   *
   * KPI composition (V2):
   *   Leads · Active Agents · Active Agencies · Active Developers · Active Listings · Revenue
   *
   * Uses getPlatformAnalytics() for all metrics — no duplicate SQL.
   */
  getDashboardMetrics: superAdminProcedure.query(async () => {
    const db = await getDb();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [analytics, ecosystem, pendingAgents, pendingListings, pendingDevelopments, recentLeadCount] =
      await Promise.all([
        getPlatformAnalytics(),
        getEcosystemStats(),
        countPendingAgents(),
        countPendingListings(),
        countPendingDevelopments(),
        db
          ? db
              .select({ count: sql<number>`count(*)` })
              .from(leads)
              .where(sql`${leads.createdAt} >= ${thirtyDaysAgo}`)
              .then(r => r[0]?.count ?? 0)
          : Promise.resolve(0),
      ]);

    return {
      // V1 response contract — preserved exactly as at commit cd7d504b
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
      // V2 Cockpit fields — added, not replacing V1 fields
      cockpit: {
        totalLeadsRecent: recentLeadCount,
        activeAgents: ecosystem.agents.active,
        activeAgencies: ecosystem.agencies.active,
        activeDevelopers: ecosystem.developers.active,
        activeListings: analytics.activeProperties,
        monthlyRevenue: analytics.monthlyRevenue,
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
   * Cockpit: Lead Pipeline — current lead distribution by canonical status.
   *
   * Groups leads by the 8 canonical statuses defined in drizzle/schema/leads.ts.
   * Does NOT compute stage-to-stage conversion rates from snapshot counts.
   * Shows lost separately as exited/lost leads.
   */
  getLeadPipeline: superAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { stages: [], total: 0 };

    const rows = await db
      .select({
        status: leads.status,
        count: sql<number>`count(*)`,
      })
      .from(leads)
      .groupBy(leads.status);

    const statusCounts = new Map<string, number>();
    for (const row of rows) {
      statusCounts.set(row.status, row.count);
    }

    const stages = LEAD_PIPELINE_ORDER.map(status => ({
      status,
      count: statusCounts.get(status) ?? 0,
    }));

    const total = stages.reduce((sum, s) => sum + s.count, 0);

    return { stages, total };
  }),

  /**
   * Cockpit: Operational Health — aggregated health from existing authorities.
   *
   * This procedure reuses existing health endpoints. It does NOT create new
   * health checks or invent new monitoring. Each source is displayed only if
   * it genuinely provides health data.
   *
   * Sources:
   *   1. Database readiness — assessRuntimeDatabaseReadiness() (17-layer TiDB probe)
   *   2. Cache — getCacheHealth() (Redis connection, fallback mode)
   *   3. Saved Search Scheduler — savedSearchDeliveryScheduler.getStatus()
   *   4. Google Places API — internal REST health check (usage, errors, latency)
   *
   * Services without health sources are shown as explicitly unavailable.
   */
  getOperationalHealth: superAdminProcedure.query(async () => {
    const services: Array<{
      name: string;
      status: 'operational' | 'degraded' | 'unavailable';
      detail: string;
    }> = [];

    // 1. Database readiness (TiDB)
    try {
      const dbReadiness = await assessRuntimeDatabaseReadiness();
      services.push({
        name: 'Database',
        status: dbReadiness.applicationReady ? 'operational' : 'degraded',
        detail: dbReadiness.applicationReady
          ? 'TiDB connected — all schema layers verified'
          : `Readiness check failed`,
      });
    } catch {
      services.push({
        name: 'Database',
        status: 'unavailable',
        detail: 'Health check not available',
      });
    }

    // 2. Cache (Redis)
    try {
      const cacheHealth = await getCacheHealth();
      services.push({
        name: 'Cache',
        status: cacheHealth.status === 'healthy' ? 'operational' : cacheHealth.status === 'degraded' ? 'degraded' : 'unavailable',
        detail: cacheHealth.status === 'healthy'
          ? 'Redis connected'
          : cacheHealth.status === 'degraded'
            ? 'Running in in-memory fallback mode'
            : 'Connection issues detected',
      });
    } catch {
      services.push({
        name: 'Cache',
        status: 'unavailable',
        detail: 'Health check not available',
      });
    }

    // 3. Saved Search Scheduler
    try {
      const schedulerStatus = savedSearchDeliveryScheduler.getStatus();
      services.push({
        name: 'Saved Search Scheduler',
        status: schedulerStatus.enabled && !schedulerStatus.lastError
          ? 'operational'
          : schedulerStatus.lastError
            ? 'degraded'
            : 'unavailable',
        detail: schedulerStatus.enabled
          ? schedulerStatus.lastError
            ? `Last run had errors: ${schedulerStatus.lastError}`
            : `Running — last completed ${schedulerStatus.lastRunCompletedAt ?? 'never'}`
          : 'Scheduler disabled',
      });
    } catch {
      services.push({
        name: 'Saved Search Scheduler',
        status: 'unavailable',
        detail: 'Health check not available',
      });
    }

    // 4. Google Places API (internal REST call)
    try {
      const port = process.env.PORT || process.env.API_PORT || 5000;
      const response = await fetch(`http://127.0.0.1:${port}/api/google-places-monitoring/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const data = await response.json();
        services.push({
          name: 'Google Places API',
          status: data.status === 'healthy' ? 'operational' : data.status === 'degraded' ? 'degraded' : 'unavailable',
          detail: data.status === 'healthy'
            ? 'Usage within limits'
            : `Degraded — usage ${data.metrics?.usagePercentage ?? 'unknown'}%, error rate ${data.metrics?.errorRate ?? 'unknown'}%`,
        });
      } else {
        services.push({
          name: 'Google Places API',
          status: 'unavailable',
          detail: 'Health endpoint returned an error',
        });
      }
    } catch {
      services.push({
        name: 'Google Places API',
        status: 'unavailable',
        detail: 'Not connected',
      });
    }

    return { services };
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
      whyItMatters: string;
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
          whyItMatters: `Qualification score ${score}/100, waiting ${hours}h for a response.`,
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
          title: `${pendingAgentCount} agent registration${pendingAgentCount > 1 ? 's' : ''} pending approval`,
          summary: 'Agent registrations awaiting platform review.',
          whyItMatters: `${pendingAgentCount} agent registration${pendingAgentCount > 1 ? 's' : ''} awaiting approval.`,
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
          title: `${pendingListingCount} listing${pendingListingCount > 1 ? 's' : ''} pending review`,
          summary: 'Property listings awaiting verification.',
          whyItMatters: `${pendingListingCount} listing${pendingListingCount > 1 ? 's' : ''} awaiting review.`,
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
          title: `${pendingDevCount} development${pendingDevCount > 1 ? 's' : ''} awaiting approval`,
          summary: 'Developer submissions pending platform review.',
          whyItMatters: `${pendingDevCount} development submission${pendingDevCount > 1 ? 's' : ''} awaiting approval.`,
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
   * Founder Attention: detail view for a selected attention candidate.
   *
   * Supports two modes:
   *   - Entity detail: developer_lead with a real lead ID
   *   - Aggregate queue detail: agent_approval, listing_approval, development_approval
   *
   * Type is the authoritative discriminator. Type/ID pairing is explicitly validated.
   */
  getAttentionDetail: superAdminProcedure
    .input(
      z.object({
        type: z.enum(['developer_lead', 'agent_approval', 'listing_approval', 'development_approval']),
        id: z.number(),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      // --- Entity detail: developer lead ---
      if (input.type === 'developer_lead') {
        if (input.id <= 0) return null;

        const now = new Date();
        const rows = await db
          .select({
            id: leads.id,
            name: leads.name,
            email: leads.email,
            phone: leads.phone,
            status: leads.status,
            leadType: leads.leadType,
            source: leads.source,
            qualificationScore: leads.qualificationScore,
            qualificationStatus: leads.qualificationStatus,
            nextAction: leads.nextAction,
            nextFollowUp: leads.nextFollowUp,
            firstRespondedAt: leads.firstRespondedAt,
            lastContactedAt: leads.lastContactedAt,
            assignedTo: leads.assignedTo,
            agentId: leads.agentId,
            developmentId: leads.developmentId,
            createdAt: leads.createdAt,
            devName: developments.name,
            devCity: developments.city,
            devProvince: developments.province,
          })
          .from(leads)
          .leftJoin(developments, eq(leads.developmentId, developments.id))
          .where(eq(leads.id, input.id))
          .limit(1);

        const lead = rows[0];
        if (!lead) return null;

        const created = new Date(lead.createdAt);
        const waitingHours = Math.round((now.getTime() - created.getTime()) / (1000 * 60 * 60));

        // Resolve ownership: assignedTo → agentId → null
        let operationalOwner: string | null = null;
        let ownerLabel = 'No owner identified';

        if (lead.assignedTo) {
          const ownerUser = await db.select({ name: users.name }).from(users).where(eq(users.id, lead.assignedTo)).limit(1);
          if (ownerUser[0]) {
            operationalOwner = ownerUser[0].name;
            ownerLabel = `Assigned to ${ownerUser[0].name}`;
          }
        } else if (lead.agentId) {
          const ownerAgent = await db
            .select({ name: agents.displayName })
            .from(agents)
            .where(eq(agents.id, lead.agentId))
            .limit(1);
          if (ownerAgent[0]?.name) {
            operationalOwner = ownerAgent[0].name;
            ownerLabel = `Owned by agent ${ownerAgent[0].name}`;
          }
        }

        // Suggested action: prefer canonical nextAction, then narrow fallback
        let suggestedAction = 'Review lead activity';
        if (lead.nextAction && String(lead.nextAction).trim()) {
          suggestedAction = String(lead.nextAction).trim();
        } else if (!lead.assignedTo && !lead.agentId) {
          suggestedAction = 'Assign owner';
        } else if (lead.status === 'new') {
          suggestedAction = 'Make first contact';
        } else if (lead.status === 'contacted') {
          suggestedAction = 'Qualify lead';
        } else if (lead.status === 'qualified') {
          suggestedAction = 'Schedule viewing';
        } else if (lead.status === 'viewing_scheduled') {
          suggestedAction = 'Capture viewing outcome';
        } else if (lead.status === 'offer_sent') {
          suggestedAction = 'Track offer';
        }

        return {
          type: 'developer_lead' as const,
          kind: 'entity' as const,
          lead: {
            id: lead.id,
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            status: lead.status,
            leadType: lead.leadType,
            source: lead.source,
            qualificationScore: lead.qualificationScore,
            qualificationStatus: lead.qualificationStatus,
            nextAction: lead.nextAction,
            nextFollowUp: lead.nextFollowUp,
            firstRespondedAt: lead.firstRespondedAt,
            lastContactedAt: lead.lastContactedAt,
            createdAt: lead.createdAt,
            waitingHours,
          },
          development: lead.devName
            ? { id: lead.developmentId!, name: lead.devName, city: lead.devCity, province: lead.devProvince }
            : null,
          ownership: { operationalOwner, ownerLabel },
          suggestedAction,
          operationalRoute: null,
        };
      }

      // --- Aggregate queue detail ---
      const AGGREGATE_IDS: Record<string, number> = {
        agent_approval: -1,
        listing_approval: -2,
        development_approval: -3,
      };

      const expectedId = AGGREGATE_IDS[input.type];
      if (expectedId === undefined || input.id !== expectedId) return null;

      if (input.type === 'agent_approval') {
        try {
          const totalResult = await db.select({ c: count() }).from(agents).where(eq(agents.status, 'pending'));
          const totalPending = totalResult[0]?.c ?? 0;

          let oldestWaitingHours: number | null = null;
          let oldestWaitingSince: string | null = null;
          let preview: Array<{ id: number; name: string; agencyName: string | null; role: string; createdAt: string; waitingHours: number }> = [];
          let previewUnavailable = false;

          if (totalPending > 0) {
            const oldest = await db.select({ createdAt: agents.createdAt }).from(agents).where(eq(agents.status, 'pending')).orderBy(asc(agents.createdAt)).limit(1);
            if (oldest[0]) {
              oldestWaitingSince = oldest[0].createdAt;
              oldestWaitingHours = Math.round((Date.now() - new Date(oldest[0].createdAt).getTime()) / (1000 * 60 * 60));
            }

            try {
              const previewRows = await db
                .select({
                  id: agents.id,
                  firstName: agents.firstName,
                  lastName: agents.lastName,
                  role: agents.role,
                  createdAt: agents.createdAt,
                  agencyId: agents.agencyId,
                })
                .from(agents)
                .where(eq(agents.status, 'pending'))
                .orderBy(asc(agents.createdAt))
                .limit(5);

              const agencyIds = [...new Set(previewRows.map(r => r.agencyId).filter(Boolean))] as number[];
              const agencyNames = agencyIds.length > 0
                ? await db.select({ id: agencies.id, name: agencies.name }).from(agencies).where(sql`${agencies.id} IN ${agencyIds}`)
                : [];
              const agencyMap = new Map(agencyNames.map(a => [a.id, a.name]));

              const now = Date.now();
              preview = previewRows.map(r => ({
                id: r.id,
                name: `${r.firstName} ${r.lastName}`,
                agencyName: agencyMap.get(r.agencyId) ?? null,
                role: r.role,
                createdAt: r.createdAt,
                waitingHours: Math.round((now - new Date(r.createdAt).getTime()) / (1000 * 60 * 60)),
              }));
            } catch (err) {
              console.error('[FounderAttention] Agent preview query failed:', err);
              previewUnavailable = true;
            }
          }

          return {
            type: 'agent_approval' as const,
            kind: 'aggregate' as const,
            summary: { totalPending, oldestWaitingHours, oldestWaitingSince },
            preview,
            previewUnavailable,
            ownership: { operationalOwner: null, ownerLabel: 'Platform approval queue' },
            suggestedAction: 'Review pending agent registrations',
            operationalRoute: '/admin/agent-approvals',
          };
        } catch (err) {
          console.error('[FounderAttention] Agent aggregate query failed:', err);
          return null;
        }
      }

      if (input.type === 'listing_approval') {
        try {
          const totalResult = await db.select({ c: count() }).from(listings).where(eq(listings.status, 'pending_review'));
          const totalPending = totalResult[0]?.c ?? 0;

          let oldestWaitingHours: number | null = null;
          let oldestWaitingSince: string | null = null;
          let preview: Array<{ id: number; title: string; action: string; propertyType: string; city: string; askingPrice: string | null; createdAt: string; waitingHours: number }> = [];
          let previewUnavailable = false;

          if (totalPending > 0) {
            const oldest = await db.select({ createdAt: listings.createdAt }).from(listings).where(eq(listings.status, 'pending_review')).orderBy(asc(listings.createdAt)).limit(1);
            if (oldest[0]) {
              oldestWaitingSince = oldest[0].createdAt;
              oldestWaitingHours = Math.round((Date.now() - new Date(oldest[0].createdAt).getTime()) / (1000 * 60 * 60));
            }

            try {
              const now = Date.now();
              const previewRows = await db
                .select({
                  id: listings.id,
                  title: listings.title,
                  action: listings.action,
                  propertyType: listings.propertyType,
                  city: listings.city,
                  askingPrice: listings.askingPrice,
                  createdAt: listings.createdAt,
                })
                .from(listings)
                .where(eq(listings.status, 'pending_review'))
                .orderBy(asc(listings.createdAt))
                .limit(5);

              preview = previewRows.map(r => ({
                id: r.id,
                title: r.title,
                action: r.action,
                propertyType: r.propertyType,
                city: r.city,
                askingPrice: r.askingPrice,
                createdAt: r.createdAt,
                waitingHours: Math.round((now - new Date(r.createdAt).getTime()) / (1000 * 60 * 60)),
              }));
            } catch (err) {
              console.error('[FounderAttention] Listing preview query failed:', err);
              previewUnavailable = true;
            }
          }

          return {
            type: 'listing_approval' as const,
            kind: 'aggregate' as const,
            summary: { totalPending, oldestWaitingHours, oldestWaitingSince },
            preview,
            previewUnavailable,
            ownership: { operationalOwner: null, ownerLabel: 'Platform approval queue' },
            suggestedAction: 'Review pending listings',
            operationalRoute: '/admin/listing-approvals',
          };
        } catch (err) {
          console.error('[FounderAttention] Listing aggregate query failed:', err);
          return null;
        }
      }

      if (input.type === 'development_approval') {
        try {
          const totalResult = await db.select({ c: count() }).from(developments).where(eq(developments.approvalStatus, 'pending'));
          const totalPending = totalResult[0]?.c ?? 0;

          let oldestWaitingHours: number | null = null;
          let oldestWaitingSince: string | null = null;
          let preview: Array<{ id: number; name: string; developmentType: string; city: string; province: string; totalUnits: number | null; priceFrom: number | null; priceTo: number | null; createdAt: string; waitingHours: number }> = [];
          let previewUnavailable = false;

          if (totalPending > 0) {
            const oldest = await db.select({ createdAt: developments.createdAt }).from(developments).where(eq(developments.approvalStatus, 'pending')).orderBy(asc(developments.createdAt)).limit(1);
            if (oldest[0]) {
              oldestWaitingSince = oldest[0].createdAt;
              oldestWaitingHours = Math.round((Date.now() - new Date(oldest[0].createdAt).getTime()) / (1000 * 60 * 60));
            }

            try {
              const now = Date.now();
              const previewRows = await db
                .select({
                  id: developments.id,
                  name: developments.name,
                  developmentType: developments.developmentType,
                  city: developments.city,
                  province: developments.province,
                  totalUnits: developments.totalUnits,
                  priceFrom: developments.priceFrom,
                  priceTo: developments.priceTo,
                  createdAt: developments.createdAt,
                })
                .from(developments)
                .where(eq(developments.approvalStatus, 'pending'))
                .orderBy(asc(developments.createdAt))
                .limit(5);

              preview = previewRows.map(r => ({
                id: r.id,
                name: r.name,
                developmentType: r.developmentType,
                city: r.city,
                province: r.province,
                totalUnits: r.totalUnits,
                priceFrom: r.priceFrom,
                priceTo: r.priceTo,
                createdAt: r.createdAt,
                waitingHours: Math.round((now - new Date(r.createdAt).getTime()) / (1000 * 60 * 60)),
              }));
            } catch (err) {
              console.error('[FounderAttention] Development preview query failed:', err);
              previewUnavailable = true;
            }
          }

          return {
            type: 'development_approval' as const,
            kind: 'aggregate' as const,
            summary: { totalPending, oldestWaitingHours, oldestWaitingSince },
            preview,
            previewUnavailable,
            ownership: { operationalOwner: null, ownerLabel: 'Platform approval queue' },
            suggestedAction: 'Review development submissions',
            operationalRoute: '/admin/development-approvals',
          };
        } catch (err) {
          console.error('[FounderAttention] Development aggregate query failed:', err);
          return null;
        }
      }

      return null;
    }),

  /**
   * Company Map: ecosystem node data for the visual business model.
   * Returns real counts from existing ecosystem stats.
   */
  getCompanyMapData: superAdminProcedure.query(async () => {
    const db = await getDb();
    const ecosystem = await getEcosystemStats();

    // Shared Living: count places by status
    let slPublished = 0;
    let slTotal = 0;
    if (db) {
      try {
        const [totalResult, publishedResult] = await Promise.all([
          db.select({ c: count() }).from(slPlaces),
          db.select({ c: count() }).from(slPlaces).where(eq(slPlaces.status, 'published')),
        ]);
        slTotal = totalResult[0]?.c ?? 0;
        slPublished = publishedResult[0]?.c ?? 0;
      } catch {
        // Shared Living tables may not exist in all environments
      }
    }

    return {
      nodes: [
        {
          id: 'agents' as const,
          label: 'Agents',
          approved: ecosystem.agents.active,
          total: ecosystem.agents.total,
          newInPeriod: ecosystem.agents.growth,
          periodLabel: 'Last 30 days',
        },
        {
          id: 'agencies' as const,
          label: 'Agencies',
          verified: ecosystem.agencies.active,
          total: ecosystem.agencies.total,
          newInPeriod: ecosystem.agencies.growth,
          periodLabel: 'Last 30 days',
        },
        {
          id: 'developers' as const,
          label: 'Developers',
          approved: ecosystem.developers.active,
          total: ecosystem.developers.total,
          newInPeriod: ecosystem.developers.growth,
          periodLabel: 'Last 30 days',
        },
        {
          id: 'buyers' as const,
          label: 'Buyers',
          registered: ecosystem.users.total,
          total: ecosystem.users.total,
          newInPeriod: ecosystem.users.growth,
          periodLabel: 'Last 30 days',
        },
        {
          id: 'shared_living' as const,
          label: 'Shared Living',
          published: slPublished,
          total: slTotal,
          newInPeriod: 0,
          periodLabel: 'Last 30 days',
        },
      ],
      foundations: {
        technology: { status: 'not_connected' as const, label: 'Technology Platform' },
        data: { status: 'not_connected' as const, label: 'Data & Intelligence' },
        marketing: { status: 'not_connected' as const, label: 'Marketing & Traffic' },
        payments: { status: 'not_connected' as const, label: 'Payments & Revenue' },
        operations: { status: 'not_connected' as const, label: 'Operations' },
      },
    };
  }),

  /**
   * Company Map: detail view for a selected ecosystem node.
   *
   * Returns factual metrics only — no health scoring, no interpretation.
   * Each node type has a discriminated response shape.
   */
  getCompanyNodeDetail: superAdminProcedure
    .input(z.object({ nodeId: z.enum(['agents', 'agencies', 'developers', 'buyers', 'shared_living']) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const dateStr = thirtyDaysAgo.toISOString();

      // --- Agents ---
      if (input.nodeId === 'agents') {
        const [totalResult, approvedResult, newResult] = await Promise.all([
          db.select({ c: count() }).from(agents),
          db.select({ c: count() }).from(agents).where(eq(agents.status, 'approved')),
          db.select({ c: count() }).from(agents).where(sql`${agents.createdAt} > ${dateStr}`),
        ]);

        const total = totalResult[0]?.c ?? 0;
        const approved = approvedResult[0]?.c ?? 0;
        const newInPeriod = newResult[0]?.c ?? 0;

        // Value: listings, leads, commissions
        const [listingsResult, leadsResult, commissionsPendingResult, commissionsPaidResult] = await Promise.all([
          db.select({ c: count() }).from(listings).where(sql`${listings.agentId} IS NOT NULL`),
          db.select({ c: count() }).from(leads).where(sql`${leads.agentId} IS NOT NULL`),
          db.select({ c: count() }).from(commissions).where(eq(commissions.status, 'pending')),
          db.select({ c: sql<number>`coalesce(sum(${commissions.amount}), 0)` }).from(commissions).where(eq(commissions.status, 'paid')),
        ]);

        return {
          type: 'agents' as const,
          scale: { approved, total },
          movement: { newInPeriod, periodLabel: 'Last 30 days' },
          value: {
            listingsCount: listingsResult[0]?.c ?? 0,
            leadsCount: leadsResult[0]?.c ?? 0,
            commissionsPendingCount: commissionsPendingResult[0]?.c ?? 0,
            commissionsPaidTotal: Number(commissionsPaidResult[0]?.c ?? 0),
          },
          operationalRoute: '/admin/agents',
        };
      }

      // --- Agencies ---
      if (input.nodeId === 'agencies') {
        const [totalResult, verifiedResult, newResult] = await Promise.all([
          db.select({ c: count() }).from(agencies),
          db.select({ c: count() }).from(agencies).where(eq(agencies.isVerified, 1)),
          db.select({ c: count() }).from(agencies).where(sql`${agencies.createdAt} > ${dateStr}`),
        ]);

        const total = totalResult[0]?.c ?? 0;
        const verified = verifiedResult[0]?.c ?? 0;
        const newInPeriod = newResult[0]?.c ?? 0;

        // Value: agents, listings, leads
        const [agentsResult, listingsResult, leadsResult] = await Promise.all([
          db.select({ c: count() }).from(agents).where(sql`${agents.agencyId} IS NOT NULL`),
          db.select({ c: count() }).from(listings).where(sql`${listings.agencyId} IS NOT NULL`),
          db.select({ c: count() }).from(leads).where(sql`${leads.agencyId} IS NOT NULL`),
        ]);

        return {
          type: 'agencies' as const,
          scale: { verified, total },
          movement: { newInPeriod, periodLabel: 'Last 30 days' },
          value: {
            agentsCount: agentsResult[0]?.c ?? 0,
            listingsCount: listingsResult[0]?.c ?? 0,
            leadsCount: leadsResult[0]?.c ?? 0,
          },
          operationalRoute: '/admin/agencies',
        };
      }

      // --- Developers (catalogue_publishers authority) ---
      if (input.nodeId === 'developers') {
        const firstPartyPublisher = eq(cataloguePublishers.authorityKind, 'developer_first_party');

        const [totalResult, approvedResult, newResult] = await Promise.all([
          db.select({ c: count() }).from(cataloguePublishers).where(firstPartyPublisher),
          db.select({ c: count() }).from(cataloguePublishers)
            .innerJoin(developerOrganisations, eq(cataloguePublishers.developerOrganisationId, developerOrganisations.id))
            .where(and(firstPartyPublisher, eq(developerOrganisations.status, 'approved'))),
          db.select({ c: count() }).from(cataloguePublishers)
            .where(and(firstPartyPublisher, sql`${cataloguePublishers.createdAt} > ${dateStr}`)),
        ]);

        const total = totalResult[0]?.c ?? 0;
        const approved = approvedResult[0]?.c ?? 0;
        const newInPeriod = newResult[0]?.c ?? 0;

        return {
          type: 'developers' as const,
          scale: { approved, total },
          movement: { newInPeriod, periodLabel: 'Last 30 days' },
          value: {},
          note: 'Developer scale currently reflects approved first-party publishing identities. Development and lead metrics are not yet connected to this view.',
          operationalRoute: '/admin/developers',
        };
      }

      // --- Buyers (users with role = visitor) ---
      if (input.nodeId === 'buyers') {
        const visitorRole = eq(users.role, 'visitor');

        const [totalResult, newResult] = await Promise.all([
          db.select({ c: count() }).from(users).where(visitorRole),
          db.select({ c: count() }).from(users).where(and(visitorRole, sql`${users.createdAt} > ${dateStr}`)),
        ]);

        const total = totalResult[0]?.c ?? 0;
        const newInPeriod = newResult[0]?.c ?? 0;

        // Value: saved searches, favorites, recently viewed
        const [savedSearchesResult, favoritesResult, recentlyViewedResult] = await Promise.all([
          db.select({ c: count() }).from(savedSearches),
          db.select({ c: count() }).from(favorites),
          db.select({ c: count() }).from(recentlyViewed),
        ]);

        return {
          type: 'buyers' as const,
          scale: { registered: total },
          movement: { newInPeriod, periodLabel: 'Last 30 days' },
          value: {
            savedSearchesCount: savedSearchesResult[0]?.c ?? 0,
            favoritesCount: favoritesResult[0]?.c ?? 0,
            recentlyViewedCount: recentlyViewedResult[0]?.c ?? 0,
          },
          operationalRoute: '/admin/users',
        };
      }

      // --- Shared Living ---
      if (input.nodeId === 'shared_living') {
        const [totalResult, publishedResult, newResult] = await Promise.all([
          db.select({ c: count() }).from(slPlaces),
          db.select({ c: count() }).from(slPlaces).where(eq(slPlaces.status, 'published')),
          db.select({ c: count() }).from(slPlaces).where(sql`${slPlaces.createdAt} > ${dateStr}`),
        ]);

        const total = totalResult[0]?.c ?? 0;
        const published = publishedResult[0]?.c ?? 0;
        const newInPeriod = newResult[0]?.c ?? 0;

        // Value: spaces, available spaces, leads
        let spacesCount = 0;
        let availableSpacesCount = 0;
        let leadsCount = 0;
        try {
          const [spacesResult, availableResult, leadsResult] = await Promise.all([
            db.select({ c: count() }).from(slSpaces),
            db.select({ c: count() }).from(slSpaces).where(eq(slSpaces.status, 'available')),
            db.select({ c: count() }).from(slLeadContexts),
          ]);
          spacesCount = spacesResult[0]?.c ?? 0;
          availableSpacesCount = availableResult[0]?.c ?? 0;
          leadsCount = leadsResult[0]?.c ?? 0;
        } catch {
          // Shared Living value tables may not exist
        }

        return {
          type: 'shared_living' as const,
          scale: { published, total },
          movement: { newInPeriod, periodLabel: 'Last 30 days' },
          value: { spacesCount, availableSpacesCount, leadsCount },
          emptyState: total === 0 ? 'No data yet' : undefined,
          operationalRoute: null,
        };
      }

      return null;
    }),
});
