import { and, eq, gte, inArray } from 'drizzle-orm';

import { analyticsEvents, agents } from '../../drizzle/schema';
import { PUBLIC_AGENT_PROFILE_EVENTS } from '../../shared/analytics/public-agent-profile-events';

export interface AgentPresenceSummary {
  windowDays: 30;
  profileViews: number;
  listingTaps: number;
  areaGuideOpens: number;
  whatsappClicks: number;
  contactActions: number;
  shares: number;
  totalInteractions: number;
  profileViewsPreviousWindow: number;
}

type PresenceRow = { eventType: string; createdAt: string | Date };

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function toTimestamp(value: string | Date): number {
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

/**
 * Pure aggregation over recorded public presence events. Rows cover the two
 * most recent 30-day windows; the current window drives the surfaced counts
 * and the previous window provides the honest comparison signal.
 */
export function buildAgentPresenceSummary(rows: PresenceRow[], now: Date): AgentPresenceSummary {
  const currentWindowStart = now.getTime() - THIRTY_DAYS_MS;
  const previousWindowStart = currentWindowStart - THIRTY_DAYS_MS;

  const known = new Set<string>(PUBLIC_AGENT_PROFILE_EVENTS);
  let profileViews = 0;
  let listingTaps = 0;
  let areaGuideOpens = 0;
  let whatsappClicks = 0;
  let contactActions = 0;
  let shares = 0;
  let totalInteractions = 0;
  let profileViewsPreviousWindow = 0;

  for (const row of rows) {
    if (!known.has(row.eventType)) continue;
    const at = toTimestamp(row.createdAt);
    if (!at) continue;

    if (at >= currentWindowStart) {
      totalInteractions += 1;
      switch (row.eventType) {
        case 'agent_profile_view':
          profileViews += 1;
          break;
        case 'agent_profile_listing_click':
          listingTaps += 1;
          break;
        case 'agent_profile_area_guide_click':
          areaGuideOpens += 1;
          break;
        case 'agent_profile_whatsapp_click':
          whatsappClicks += 1;
          break;
        case 'agent_profile_call_click':
        case 'agent_profile_email_click':
        case 'agent_profile_contact_cta':
          contactActions += 1;
          break;
        case 'agent_profile_share':
          shares += 1;
          break;
      }
    } else if (at >= previousWindowStart && row.eventType === 'agent_profile_view') {
      profileViewsPreviousWindow += 1;
    }
  }

  return {
    windowDays: 30,
    profileViews,
    listingTaps,
    areaGuideOpens,
    whatsappClicks,
    contactActions,
    shares,
    totalInteractions,
    profileViewsPreviousWindow,
  };
}

export async function loadAgentPresenceSummary(
  db: any,
  userId: number,
): Promise<AgentPresenceSummary> {
  const [agent] = await db
    .select({ id: agents.id })
    .from(agents)
    .where(eq(agents.userId, userId))
    .limit(1);

  if (!agent) {
    return buildAgentPresenceSummary([], new Date());
  }

  const windowStart = new Date(Date.now() - THIRTY_DAYS_MS * 2)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');

  const rows: PresenceRow[] = await db
    .select({
      eventType: analyticsEvents.eventType,
      createdAt: analyticsEvents.createdAt,
    })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.userId, userId),
        inArray(analyticsEvents.eventType, [...PUBLIC_AGENT_PROFILE_EVENTS]),
        gte(analyticsEvents.createdAt, windowStart),
      ),
    );

  return buildAgentPresenceSummary(rows, new Date());
}
