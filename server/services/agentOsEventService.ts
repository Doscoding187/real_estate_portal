import { eq } from 'drizzle-orm';
import { analyticsEvents, agents } from '../../drizzle/schema';
import { getDb } from '../db';

export type AgentOsEventType =
  | 'agent_profile_completed'
  | 'agent_profile_published'
  | 'agent_listing_created'
  | 'agent_listing_submitted'
  | 'agent_listing_submit_failed'
  | 'agent_listing_live'
  | 'agent_lead_received'
  | 'agent_lead_stage_updated'
  | 'agent_crm_action_logged'
  | 'agent_showing_booked'
  | 'agent_showing_updated'
  | 'agent_showing_completed'
  | 'agent_dashboard_viewed'
  | 'agent_analytics_viewed';

type RequestLike = {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  url?: string;
  originalUrl?: string;
  socket?: {
    remoteAddress?: string;
  };
};

function getHeader(req: RequestLike | undefined, name: string): string | null {
  const value = req?.headers?.[name];
  if (Array.isArray(value)) return value[0] || null;
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function getIpAddress(req: RequestLike | undefined): string | null {
  const forwardedFor = getHeader(req, 'x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || null;
  }

  const realIp = getHeader(req, 'x-real-ip');
  if (realIp) return realIp;

  if (req?.ip) return req.ip;
  if (req?.socket?.remoteAddress) return req.socket.remoteAddress;
  return null;
}

function buildSessionId({
  sessionId,
  userId,
  requestId,
}: {
  sessionId?: string;
  userId?: number | null;
  requestId?: string;
}) {
  if (sessionId && sessionId.trim().length > 0) return sessionId;
  if (userId) return `agent-os-user-${userId}`;
  if (requestId && requestId.trim().length > 0) return `agent-os-request-${requestId}`;
  return `agent-os-${Date.now()}`;
}

export async function recordAgentOsEvent({
  userId,
  eventType,
  eventData,
  req,
  requestId,
  sessionId,
}: {
  userId?: number | null;
  eventType: AgentOsEventType;
  eventData?: Record<string, unknown>;
  req?: RequestLike;
  requestId?: string;
  sessionId?: string;
}): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    await db.insert(analyticsEvents).values({
      userId: userId ?? null,
      sessionId: buildSessionId({ sessionId, userId, requestId }),
      eventType,
      eventData: eventData ?? null,
      url: req?.originalUrl || req?.url || null,
      referrer: getHeader(req, 'referer'),
      userAgent: getHeader(req, 'user-agent'),
      ipAddress: getIpAddress(req),
    });
  } catch (error) {
    console.warn('[agentOsEventService] Failed to record event', {
      eventType,
      userId: userId ?? null,
      message: (error as Error)?.message || String(error),
    });
  }
}

export async function recordAgentOsEventForAgentId({
  agentId,
  eventType,
  eventData,
  req,
  requestId,
  sessionId,
}: {
  agentId?: number | null;
  eventType: AgentOsEventType;
  eventData?: Record<string, unknown>;
  req?: RequestLike;
  requestId?: string;
  sessionId?: string;
}): Promise<void> {
  if (!agentId) return;

  try {
    const db = await getDb();
    if (!db) return;

    const [agent] = await db
      .select({ userId: agents.userId })
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);

    if (!agent?.userId) return;

    await recordAgentOsEvent({
      userId: agent.userId,
      eventType,
      eventData: {
        agentId,
        ...eventData,
      },
      req,
      requestId,
      sessionId,
    });
  } catch (error) {
    console.warn('[agentOsEventService] Failed to resolve agent event target', {
      agentId,
      eventType,
      message: (error as Error)?.message || String(error),
    });
  }
}
