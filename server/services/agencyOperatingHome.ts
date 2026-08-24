import { and, eq, inArray, isNull, lt, sql } from 'drizzle-orm';
import { leads, listings } from '../../drizzle/schema';
import {
  evaluateAgencyPublicationReadiness,
  type AgencyPublicationReadiness,
} from './listingPublicationEntitlementService';

export type AgencyOperatingActionSeverity = 'critical' | 'warning' | 'clear';

export type AgencyOperatingActionCode =
  | 'resolve_publication_blocker'
  | 'renew_launch_access'
  | 'respond_sla_breach'
  | 'chase_overdue_follow_up'
  | 'assign_new_leads'
  | 'fix_rejected_listings'
  | 'review_pending_listings'
  | 'assign_unassigned_listings';

export type AgencyOperatingAction = {
  code: AgencyOperatingActionCode;
  severity: AgencyOperatingActionSeverity;
  rank: number;
  title: string;
  valueLabel: string;
  href: string;
};

export type AgencyOperatingHomeInputs = {
  agencyId: number;
  now?: Date;
  leads: {
    newToday: number;
    unassigned: number;
    firstResponseOverdueCount: number;
    oldestOverdueWaitingMinutes: number | null;
    followUpsOverdueCount: number;
    oldestOverdueFollowUpName: string | null;
  };
  listings: {
    pendingReviewCount: number;
    oldestPendingReviewAgeDays: number | null;
    rejectedCount: number;
    unassignedCount: number;
  };
  publication: AgencyPublicationReadiness;
};

export type AgencyOperatingHome = {
  date: string;
  ready: boolean;
  brief: {
    leads: AgencyOperatingHomeInputs['leads'];
    listings: AgencyOperatingHomeInputs['listings'];
    publication: AgencyPublicationReadiness['facts'];
  };
  actions: AgencyOperatingAction[];
};

const SUBSCRIPTION_BLOCKERS = new Set([
  'subscription_required',
  'subscription_pending_payment',
  'subscription_suspended',
  'subscription_period_ended',
  'subscription_expired',
  'subscription_plan_unresolved',
  'subscription_plan_ineligible',
]);

/**
 * Pure ranking/copy layer. Database access lives in getAgencyOperatingHome so
 * this stays unit-testable and the query composition mirrors getMyDay.
 */
export function buildAgencyOperatingHome(
  inputs: AgencyOperatingHomeInputs,
): AgencyOperatingHome {
  const now = inputs.now ?? new Date();
  const actions: AgencyOperatingAction[] = [];
  let rank = 0;
  const add = (
    code: AgencyOperatingActionCode,
    severity: AgencyOperatingActionSeverity,
    title: string,
    valueLabel: string,
    href: string,
  ) => {
    actions.push({ code, severity, rank: rank++, title, valueLabel, href });
  };

  // 1. Commercial gates first: publishing is impossible until they clear.
  const subscriptionBlocker = inputs.publication.blockers.find(blocker =>
    SUBSCRIPTION_BLOCKERS.has(blocker.reason),
  );
  if (subscriptionBlocker) {
    add(
      'resolve_publication_blocker',
      'critical',
      'Subscription issue — publishing is locked',
      subscriptionBlocker.message,
      '/agency/billing',
    );
  }

  const verificationBlocker = inputs.publication.blockers.find(
    blocker => blocker.reason === 'agency_unverified',
  );
  if (verificationBlocker) {
    add(
      'resolve_publication_blocker',
      'critical',
      'Agency verification required before publication',
      verificationBlocker.message,
      '/contact',
    );
  }

  const completenessBlocker = inputs.publication.blockers.find(
    blocker =>
      blocker.reason === 'agency_profile_incomplete' || blocker.reason === 'agency_branding_incomplete',
  );
  if (completenessBlocker) {
    add(
      'resolve_publication_blocker',
      'critical',
      'Complete agency profile and branding',
      completenessBlocker.message,
      '/agency/setup',
    );
  }

  // 2. Lead responsiveness — the platform's public promise.
  if (inputs.leads.firstResponseOverdueCount > 0) {
    const waiting =
      inputs.leads.oldestOverdueWaitingMinutes !== null
        ? `${inputs.leads.oldestOverdueWaitingMinutes} min`
        : '';
    add(
      'respond_sla_breach',
      'critical',
      `${inputs.leads.firstResponseOverdueCount} enquiries past the 15-minute first-response promise`,
      waiting ? `Oldest waiting ${waiting}` : '',
      '/agency/leads',
    );
  }

  if (inputs.leads.followUpsOverdueCount > 0) {
    add(
      'chase_overdue_follow_up',
      'critical',
      `${inputs.leads.followUpsOverdueCount} promised follow-ups are past due`,
      inputs.leads.oldestOverdueFollowUpName
        ? `Oldest: ${inputs.leads.oldestOverdueFollowUpName}`
        : '',
      '/agency/leads',
    );
  }

  if (inputs.leads.unassigned > 0) {
    add(
      'assign_new_leads',
      'warning',
      `${inputs.leads.newToday || inputs.leads.unassigned} fresh enquiries need owners`,
      inputs.leads.newToday > 0 ? `${inputs.leads.newToday} arrived today` : '',
      '/agency/leads',
    );
  }

  // 3. Inventory pipeline.
  if (inputs.listings.rejectedCount > 0) {
    add(
      'fix_rejected_listings',
      'critical',
      `${inputs.listings.rejectedCount} rejected listings need corrections`,
      '',
      '/agency/listings',
    );
  }

  if (inputs.listings.pendingReviewCount > 0) {
    add(
      'review_pending_listings',
      'warning',
      `${inputs.listings.pendingReviewCount} listings awaiting review`,
      inputs.listings.oldestPendingReviewAgeDays !== null
        ? `oldest ${inputs.listings.oldestPendingReviewAgeDays} days`
        : '',
      '/agency/listings',
    );
  }

  if (inputs.listings.unassignedCount > 0) {
    add(
      'assign_unassigned_listings',
      'warning',
      `${inputs.listings.unassignedCount} listings have no responsible agent`,
      '',
      '/agency/listings',
    );
  }

  // 4. Term horizon.
  const daysRemaining = inputs.publication.facts.daysRemaining;
  if (daysRemaining !== null && daysRemaining <= 7 && !subscriptionBlocker) {
    add(
      'renew_launch_access',
      'warning',
      'Launch Access term ending soon',
      `${daysRemaining} days remaining`,
      '/agency/billing',
    );
  }

  return {
    date: now.toISOString().slice(0, 10),
    ready:
      actions.filter(action => action.severity === 'critical').length === 0 &&
      inputs.publication.ready,
    brief: {
      leads: inputs.leads,
      listings: inputs.listings,
      publication: inputs.publication.facts,
    },
    actions,
  };
}

type OperatingHomeDb = Parameters<typeof evaluateAgencyPublicationReadiness>[0];

/**
 * Compose the daily brief with flat-cost queries (aggregates + bounded
 * oldest-N fetches), mirroring the getMyDay composition pattern. Never calls
 * full-scan stats or per-member N+1 helpers.
 */
export async function getAgencyOperatingHome(input: {
  db: OperatingHomeDb;
  agencyId: number;
  now?: Date;
}): Promise<AgencyOperatingHome> {
  const database = input.db as any;
  const now = input.now ?? new Date();
  const dayStart = new Date(now);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayStartDb = dayStart.toISOString().slice(0, 19).replace('T', ' ');
  const threeDaysAgoDb = new Date(now.getTime() - 3 * 86_400_000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');
  const twentyOneDaysAgoDb = new Date(now.getTime() - 21 * 86_400_000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');

  const ACTIVE_WORK = ['new', 'contacted', 'qualified', 'viewing_scheduled', 'offer_sent'];

  const [leadStats] = await database
    .select({
      newToday: sql<number>`SUM(CASE WHEN ${leads.status} = 'new' AND ${leads.createdAt} >= ${dayStartDb} THEN 1 ELSE 0 END)`,
      unassigned: sql<number>`SUM(CASE WHEN ${leads.agentId} IS NULL AND ${leads.status} IN ('new','contacted','qualified','viewing_scheduled','offer_sent') THEN 1 ELSE 0 END)`,
      slaOverdue: sql<number>`SUM(CASE WHEN ${leads.firstRespondedAt} IS NULL AND ${leads.status} IN ('new','contacted','qualified','viewing_scheduled','offer_sent') AND ${leads.createdAt} <= DATE_SUB(NOW(), INTERVAL 15 MINUTE) THEN 1 ELSE 0 END)`,
      oldestSlaMinutes: sql<number | null>`MAX(CASE WHEN ${leads.firstRespondedAt} IS NULL AND ${leads.status} IN ('new','contacted','qualified','viewing_scheduled','offer_sent') AND ${leads.createdAt} <= DATE_SUB(NOW(), INTERVAL 15 MINUTE) THEN TIMESTAMPDIFF(MINUTE, ${leads.createdAt}, NOW()) ELSE NULL END)`,
      followUpsOverdue: sql<number>`SUM(CASE WHEN ${leads.nextFollowUp} IS NOT NULL AND ${leads.nextFollowUp} < NOW() AND ${leads.status} IN ('new','contacted','qualified','viewing_scheduled','offer_sent') THEN 1 ELSE 0 END)`,
    })
    .from(leads)
    .where(eq(leads.agencyId, input.agencyId));

  const [oldestOverdueLead] = await database
    .select({ name: leads.name })
    .from(leads)
    .where(
      and(
        eq(leads.agencyId, input.agencyId),
        inArray(leads.status, ACTIVE_WORK as any),
        isNull(leads.firstRespondedAt),
        lt(leads.createdAt, new Date(now.getTime() - 15 * 60_000).toISOString().slice(0, 19).replace('T', ' ')),
      ),
    )
    .orderBy(leads.createdAt)
    .limit(1);

  const oldestOverdueFollowUp = await database
    .select({ name: leads.name })
    .from(leads)
    .where(
      and(
        eq(leads.agencyId, input.agencyId),
        inArray(leads.status, ACTIVE_WORK as any),
        lt(leads.nextFollowUp, now.toISOString().slice(0, 19).replace('T', ' ')),
      ),
    )
    .orderBy(leads.nextFollowUp)
    .limit(1);

  const [listingStats] = await database
    .select({
      pendingReview: sql<number>`SUM(CASE WHEN ${listings.status} = 'pending_review' THEN 1 ELSE 0 END)`,
      oldestPendingAge: sql<number | null>`MAX(CASE WHEN ${listings.status} = 'pending_review' THEN DATEDIFF(NOW(), COALESCE(${listings.updatedAt}, ${listings.createdAt})) ELSE NULL END)`,
      rejected: sql<number>`SUM(CASE WHEN ${listings.status} = 'rejected' THEN 1 ELSE 0 END)`,
      unassigned: sql<number>`SUM(CASE WHEN ${listings.agentId} IS NULL AND ${listings.agencyId} = ${input.agencyId} THEN 1 ELSE 0 END)`,
      stalePublic: sql<number>`SUM(CASE WHEN ${listings.status} IN ('published','approved') AND ${listings.updatedAt} <= ${twentyOneDaysAgoDb} THEN 1 ELSE 0 END)`,
    })
    .from(listings)
    .where(eq(listings.agencyId, input.agencyId));

  const publication = await evaluateAgencyPublicationReadiness(input.db as any, input.agencyId, {
    includeCapacityCount: true,
    now,
  });

  const num = (value: unknown) => Number(value || 0);

  return buildAgencyOperatingHome({
    agencyId: input.agencyId,
    now,
    leads: {
      newToday: num(leadStats?.newToday),
      unassigned: num(leadStats?.unassigned),
      firstResponseOverdueCount: num(leadStats?.slaOverdue),
      oldestOverdueWaitingMinutes:
        leadStats?.oldestSlaMinutes != null ? num(leadStats.oldestSlaMinutes) : null,
      followUpsOverdueCount: num(leadStats?.followUpsOverdue),
      oldestOverdueFollowUpName: oldestOverdueFollowUp?.name ?? null,
    },
    listings: {
      pendingReviewCount: num(listingStats?.pendingReview),
      oldestPendingReviewAgeDays:
        listingStats?.oldestPendingAge != null ? num(listingStats.oldestPendingAge) : null,
      rejectedCount: num(listingStats?.rejected),
      unassignedCount: num(listingStats?.unassigned),
    },
    publication,
  });
}
