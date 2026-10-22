import type { InteractionType } from '../../../../shared/types';
import { getPublicLeadClientIp } from '../../../services/publicLeadRateLimitService';

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_EVENTS_PER_WINDOW = 24;
const DEFAULT_MAX_TRACKED_ACTORS = 10_000;
const DEFAULT_MAX_TRACKED_COOLDOWNS = 50_000;

const DEFAULT_COOLDOWN_MS_BY_INTERACTION_TYPE: Record<InteractionType, number> = {
  impression: 60_000,
  view: 60_000,
  complete: 5 * 60_000,
  like: 10 * 60_000,
  skip: 60_000,
  save: 10 * 60_000,
  share: 10 * 60_000,
  click_cta: 10 * 60_000,
  contact: 10 * 60_000,
  comment: 10 * 60_000,
  whatsapp: 10 * 60_000,
  book_viewing: 10 * 60_000,
};

export interface DiscoveryEngagementRequestContext {
  user?: {
    id: number;
  } | null;
  req?: {
    headers?: Record<string, string | string[] | undefined>;
    ip?: string;
    socket?: {
      remoteAddress?: string;
    };
  };
}

export interface DiscoveryEngagementRateLimitInput {
  actorKey: string;
  contentId: number;
  interactionType: InteractionType;
}

export type DiscoveryEngagementRateLimitDecision =
  | {
      allowed: true;
    }
  | {
      allowed: false;
      reason: 'window' | 'cooldown' | 'capacity';
      retryAfterMs: number;
    };

export interface DiscoveryEngagementRateLimiter {
  check(input: DiscoveryEngagementRateLimitInput): DiscoveryEngagementRateLimitDecision;
}

export interface DiscoveryEngagementRateLimitOptions {
  windowMs?: number;
  maxEventsPerWindow?: number;
  maxTrackedActors?: number;
  maxTrackedCooldowns?: number;
  cooldownMsByInteractionType?: Partial<Record<InteractionType, number>>;
  now?: () => number;
}

function toBoundedKeyPart(value: string): string {
  return value.trim().slice(0, 128);
}

/**
 * User identity is authoritative when available. Guests are keyed from Express's
 * resolved request IP, never directly from x-forwarded-for. The latter is
 * caller-controlled unless the application has explicitly configured trusted
 * proxies.
 */
export function getDiscoveryEngagementActorKey(context: DiscoveryEngagementRequestContext): string {
  if (context.user?.id) return `user:${context.user.id}`;

  return `guest:${toBoundedKeyPart(getPublicLeadClientIp({ req: context.req })) || 'unknown'}`;
}

/**
 * Best-effort discovery analytics must not become a ranking-write oracle. This
 * in-process limiter caps each actor's event rate and suppresses repeated
 * content/action signals. Its storage has hard bounds so forged event keys
 * cannot grow a worker's memory without limit.
 */
export class InMemoryDiscoveryEngagementRateLimiter implements DiscoveryEngagementRateLimiter {
  private readonly eventTimestampsByActor = new Map<string, number[]>();
  private readonly cooldownUntilByActorContentAction = new Map<string, number>();
  private readonly windowMs: number;
  private readonly maxEventsPerWindow: number;
  private readonly maxTrackedActors: number;
  private readonly maxTrackedCooldowns: number;
  private readonly cooldownMsByInteractionType: Record<InteractionType, number>;
  private readonly now: () => number;

  constructor(options: DiscoveryEngagementRateLimitOptions = {}) {
    this.windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
    this.maxEventsPerWindow = options.maxEventsPerWindow ?? DEFAULT_MAX_EVENTS_PER_WINDOW;
    this.maxTrackedActors = options.maxTrackedActors ?? DEFAULT_MAX_TRACKED_ACTORS;
    this.maxTrackedCooldowns = options.maxTrackedCooldowns ?? DEFAULT_MAX_TRACKED_COOLDOWNS;
    this.cooldownMsByInteractionType = {
      ...DEFAULT_COOLDOWN_MS_BY_INTERACTION_TYPE,
      ...options.cooldownMsByInteractionType,
    };
    this.now = options.now ?? Date.now;
  }

  check(input: DiscoveryEngagementRateLimitInput): DiscoveryEngagementRateLimitDecision {
    const now = this.now();
    const cooldownKey = `${input.actorKey}:${input.contentId}:${input.interactionType}`;
    const cooldownUntil = this.cooldownUntilByActorContentAction.get(cooldownKey);

    if (cooldownUntil && cooldownUntil > now) {
      return {
        allowed: false,
        reason: 'cooldown',
        retryAfterMs: cooldownUntil - now,
      };
    }

    const windowStart = now - this.windowMs;
    const activeEvents = (this.eventTimestampsByActor.get(input.actorKey) ?? []).filter(
      timestamp => timestamp > windowStart,
    );

    if (activeEvents.length >= this.maxEventsPerWindow) {
      return {
        allowed: false,
        reason: 'window',
        retryAfterMs: Math.max(1, activeEvents[0] + this.windowMs - now),
      };
    }

    this.pruneExpiredEntries(now);

    const isKnownActor = this.eventTimestampsByActor.has(input.actorKey);
    if (!isKnownActor && this.eventTimestampsByActor.size >= this.maxTrackedActors) {
      return {
        allowed: false,
        reason: 'capacity',
        retryAfterMs: this.windowMs,
      };
    }

    const isKnownCooldown = this.cooldownUntilByActorContentAction.has(cooldownKey);
    if (
      !isKnownCooldown &&
      this.cooldownUntilByActorContentAction.size >= this.maxTrackedCooldowns
    ) {
      return {
        allowed: false,
        reason: 'capacity',
        retryAfterMs: this.windowMs,
      };
    }

    activeEvents.push(now);
    this.eventTimestampsByActor.set(input.actorKey, activeEvents);
    this.cooldownUntilByActorContentAction.set(
      cooldownKey,
      now + this.cooldownMsByInteractionType[input.interactionType],
    );

    return { allowed: true };
  }

  private pruneExpiredEntries(now: number): void {
    if (this.eventTimestampsByActor.size >= this.maxTrackedActors) {
      const windowStart = now - this.windowMs;
      for (const [actorKey, timestamps] of this.eventTimestampsByActor) {
        const activeEvents = timestamps.filter(timestamp => timestamp > windowStart);
        if (activeEvents.length === 0) {
          this.eventTimestampsByActor.delete(actorKey);
        } else {
          this.eventTimestampsByActor.set(actorKey, activeEvents);
        }
      }
    }

    if (this.cooldownUntilByActorContentAction.size >= this.maxTrackedCooldowns) {
      for (const [cooldownKey, cooldownUntil] of this.cooldownUntilByActorContentAction) {
        if (cooldownUntil <= now) {
          this.cooldownUntilByActorContentAction.delete(cooldownKey);
        }
      }
    }
  }
}

export const discoveryEngagementRateLimiter = new InMemoryDiscoveryEngagementRateLimiter();

export const discoveryEngagementRateLimitConstants = {
  windowMs: DEFAULT_WINDOW_MS,
  maxEventsPerWindow: DEFAULT_MAX_EVENTS_PER_WINDOW,
  cooldownMsByInteractionType: DEFAULT_COOLDOWN_MS_BY_INTERACTION_TYPE,
};
