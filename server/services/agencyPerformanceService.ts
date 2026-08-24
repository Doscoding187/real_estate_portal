import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { leads, listings, properties, showings } from '../../drizzle/schema';

type DbLike = any;

export type AgencyValueScorecard = {
  response: {
    respondedLeads: number;
    avgFirstResponseMinutes: number | null;
    withinFifteenMinutesPct: number | null;
    platformAvgFirstResponseMinutes: number | null;
  };
  engagement: {
    portfolioViews: number;
    portfolioEnquiries: number;
    conversionRate: number | null; // enquiries ÷ views
  };
  inventory: {
    liveListings: number;
    avgDaysLive: number | null;
  };
  pipeline: {
    totalLeads: number;
    leadsWithViewings: number;
    viewingConversionPct: number | null;
    convertedLeads: number;
  };
};

/**
 * Value-visibility scorecard for an agency: is Property Listify delivering
 * attention, enquiries and progression? Every metric is flat-cost SQL over
 * canonical tables (properties mirror counters, leads first-response truth,
 * showings progression) — no per-listing N+1.
 */
export async function getAgencyValueScorecard(
  db: DbLike,
  agencyId: number,
): Promise<AgencyValueScorecard> {
  const [responseRow] = await db
    .select({
      respondedLeads: sql<number>`COUNT(*)`,
      avgMinutes: sql<number | null>`AVG(TIMESTAMPDIFF(MINUTE, ${leads.createdAt}, ${leads.firstRespondedAt}))`,
      withinFifteen: sql<number>`SUM(CASE WHEN TIMESTAMPDIFF(MINUTE, ${leads.createdAt}, ${leads.firstRespondedAt}) <= 15 THEN 1 ELSE 0 END)`,
    })
    .from(leads)
    .where(and(eq(leads.agencyId, agencyId), isNotNull(leads.firstRespondedAt)));

  const [platformRow] = await db
    .select({
      avgMinutes: sql<number | null>`AVG(TIMESTAMPDIFF(MINUTE, ${leads.createdAt}, ${leads.firstRespondedAt}))`,
    })
    .from(leads)
    .where(isNotNull(leads.firstRespondedAt));

  const [engagementRow] = await db
    .select({
      views: sql<number>`COALESCE(SUM(${properties.views}), 0)`,
      enquiries: sql<number>`COALESCE(SUM(${properties.enquiries}), 0)`,
    })
    .from(properties)
    .innerJoin(listings, eq(properties.sourceListingId, listings.id))
    .where(eq(listings.agencyId, agencyId));

  const [inventoryRow] = await db
    .select({
      liveListings: sql<number>`COUNT(*)`,
      avgDaysLive: sql<number | null>`AVG(DATEDIFF(NOW(), ${listings.publishedAt}))`,
    })
    .from(listings)
    .where(and(eq(listings.agencyId, agencyId), eq(listings.status, 'published')));

  const [pipelineRow] = await db
    .select({
      totalLeads: sql<number>`COUNT(*)`,
      converted: sql<number>`SUM(CASE WHEN ${leads.status} = 'converted' THEN 1 ELSE 0 END)`,
      withViewings: sql<number>`COUNT(DISTINCT ${showings.leadId})`,
    })
    .from(leads)
    .leftJoin(showings, eq(showings.leadId, leads.id))
    .where(eq(leads.agencyId, agencyId));

  const respondedLeads = Number(responseRow?.respondedLeads || 0);
  const avgFirstResponseMinutes =
    responseRow?.avgMinutes != null ? Math.round(Number(responseRow.avgMinutes)) : null;
  const withinFifteenMinutesPct =
    respondedLeads > 0
      ? Math.round((Number(responseRow.withinFifteen || 0) / respondedLeads) * 100)
      : null;

  const portfolioViews = Number(engagementRow?.views || 0);
  const portfolioEnquiries = Number(engagementRow?.enquiries || 0);
  const conversionRate =
    portfolioViews > 0 ? Math.round((portfolioEnquiries / portfolioViews) * 1000) / 10 : null;

  const totalLeads = Number(pipelineRow?.totalLeads || 0);
  const leadsWithViewings = Number(pipelineRow?.withViewings || 0);
  const viewingConversionPct =
    totalLeads > 0 ? Math.round((leadsWithViewings / totalLeads) * 100) : null;

  return {
    response: {
      respondedLeads,
      avgFirstResponseMinutes,
      withinFifteenMinutesPct,
      platformAvgFirstResponseMinutes:
        platformRow?.avgMinutes != null ? Math.round(Number(platformRow.avgMinutes)) : null,
    },
    engagement: {
      portfolioViews,
      portfolioEnquiries,
      conversionRate,
    },
    inventory: {
      liveListings: Number(inventoryRow?.liveListings || 0),
      avgDaysLive:
        inventoryRow?.avgDaysLive != null ? Math.round(Number(inventoryRow.avgDaysLive)) : null,
    },
    pipeline: {
      totalLeads,
      leadsWithViewings,
      viewingConversionPct,
      convertedLeads: Number(pipelineRow?.converted || 0),
    },
  };
}
