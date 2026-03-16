import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { economicActors, interactionEvents } from '../../drizzle/schema';

type ActorSignal = {
  impressions: number;
  viewProgress: number;
  viewComplete: number;
  saves: number;
  shares: number;
  profileClicks: number;
  listingOpens: number;
  contactClicks: number;
  notInterested: number;
  reports: number;
};

type MomentumSignal = {
  positive: number;
  negative: number;
  exposure: number;
};

const SCHEDULER_INTERVAL_MS = 60_000;
let schedulerHandle: NodeJS.Timeout | null = null;
let lastRunKey: string | null = null;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function calculateAbuseScore(signal: ActorSignal): number {
  const exposure = Math.max(1, signal.impressions + signal.viewProgress + signal.viewComplete);
  const reportRate = signal.reports / exposure;
  const notInterestedRate = signal.notInterested / exposure;
  const penalty = reportRate * 70 + notInterestedRate * 35;
  return clamp(100 - penalty * 100, 0, 100);
}

function calculateTrustScore(params: {
  verificationStatus: string;
  profileCompleteness: number;
  abuseScore: number;
  signal: ActorSignal;
}): number {
  const { verificationStatus, profileCompleteness, abuseScore, signal } = params;
  const verificationBonus =
    verificationStatus === 'verified'
      ? 15
      : verificationStatus === 'pending'
        ? 5
        : verificationStatus === 'rejected'
          ? -12
          : 0;
  const completenessBonus = clamp(profileCompleteness, 0, 100) * 0.2;
  const exposure = Math.max(1, signal.impressions + signal.viewProgress + signal.viewComplete);
  const positiveRate =
    (signal.viewComplete + signal.saves + signal.shares + signal.profileClicks + signal.listingOpens) /
    exposure;
  const qualityBonus = clamp(positiveRate * 100 * 0.08, -6, 8);
  const abuseAdjustment = (abuseScore - 50) * 0.25;
  const score = 50 + verificationBonus + completenessBonus + qualityBonus + abuseAdjustment;
  return clamp(score, 0, 100);
}

function calculateMomentumScore(signal: MomentumSignal): number {
  const exposure = Math.max(1, signal.exposure);
  const netRate = (signal.positive - signal.negative) / exposure;
  return clamp(50 + netRate * 50, 0, 100);
}

function hourKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:00Z`;
}

function shouldRunScheduledNow(date: Date): boolean {
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  return hour % 6 === 0 && minute === 10;
}

export async function runExploreActorScoringRollup() {
  const actors = await db
    .select({
      id: economicActors.id,
      verificationStatus: economicActors.verificationStatus,
      profileCompleteness: economicActors.profileCompleteness,
    })
    .from(economicActors);

  if (!actors.length) {
    return { ok: true, updated: 0 };
  }

  const signalRows = await db
    .select({
      actorId: interactionEvents.actorId,
      impressions: sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} = 'impression' THEN 1 ELSE 0 END)`,
      viewProgress: sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} = 'viewProgress' THEN 1 ELSE 0 END)`,
      viewComplete: sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} = 'viewComplete' THEN 1 ELSE 0 END)`,
      saves: sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} = 'save' THEN 1 ELSE 0 END)`,
      shares: sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} = 'share' THEN 1 ELSE 0 END)`,
      profileClicks: sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} = 'profileClick' THEN 1 ELSE 0 END)`,
      listingOpens: sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} = 'listingOpen' THEN 1 ELSE 0 END)`,
      contactClicks: sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} = 'contactClick' THEN 1 ELSE 0 END)`,
      notInterested: sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} = 'notInterested' THEN 1 ELSE 0 END)`,
      reports: sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} = 'report' THEN 1 ELSE 0 END)`,
    })
    .from(interactionEvents)
    .where(
      and(
        sql`${interactionEvents.actorId} IS NOT NULL`,
        sql`${interactionEvents.createdAt} >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      ),
    )
    .groupBy(interactionEvents.actorId);

  const momentumRows = await db
    .select({
      actorId: interactionEvents.actorId,
      positive: sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} IN ('viewComplete', 'save', 'share', 'profileClick', 'listingOpen', 'contactClick') THEN 1 ELSE 0 END)`,
      negative: sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} IN ('notInterested', 'report') THEN 1 ELSE 0 END)`,
      exposure: sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} IN ('impression', 'viewProgress', 'viewComplete') THEN 1 ELSE 0 END)`,
    })
    .from(interactionEvents)
    .where(
      and(
        sql`${interactionEvents.actorId} IS NOT NULL`,
        sql`${interactionEvents.createdAt} >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
      ),
    )
    .groupBy(interactionEvents.actorId);

  const signalByActorId = new Map<number, ActorSignal>();
  for (const row of signalRows) {
    const actorId = toFiniteNumber(row.actorId, 0);
    if (actorId <= 0) continue;
    signalByActorId.set(actorId, {
      impressions: toFiniteNumber(row.impressions, 0),
      viewProgress: toFiniteNumber(row.viewProgress, 0),
      viewComplete: toFiniteNumber(row.viewComplete, 0),
      saves: toFiniteNumber(row.saves, 0),
      shares: toFiniteNumber(row.shares, 0),
      profileClicks: toFiniteNumber(row.profileClicks, 0),
      listingOpens: toFiniteNumber(row.listingOpens, 0),
      contactClicks: toFiniteNumber(row.contactClicks, 0),
      notInterested: toFiniteNumber(row.notInterested, 0),
      reports: toFiniteNumber(row.reports, 0),
    });
  }

  const momentumByActorId = new Map<number, MomentumSignal>();
  for (const row of momentumRows) {
    const actorId = toFiniteNumber(row.actorId, 0);
    if (actorId <= 0) continue;
    momentumByActorId.set(actorId, {
      positive: toFiniteNumber(row.positive, 0),
      negative: toFiniteNumber(row.negative, 0),
      exposure: toFiniteNumber(row.exposure, 0),
    });
  }

  let updated = 0;
  for (const actor of actors) {
    const actorId = toFiniteNumber(actor.id, 0);
    if (actorId <= 0) continue;

    const signal = signalByActorId.get(actorId) ?? {
      impressions: 0,
      viewProgress: 0,
      viewComplete: 0,
      saves: 0,
      shares: 0,
      profileClicks: 0,
      listingOpens: 0,
      contactClicks: 0,
      notInterested: 0,
      reports: 0,
    };

    const momentumSignal = momentumByActorId.get(actorId) ?? {
      positive: 0,
      negative: 0,
      exposure: 0,
    };

    const abuseScore = calculateAbuseScore(signal);
    const trustScore = calculateTrustScore({
      verificationStatus: String(actor.verificationStatus ?? 'unverified'),
      profileCompleteness: toFiniteNumber(actor.profileCompleteness, 0),
      abuseScore,
      signal,
    });
    const momentumScore = calculateMomentumScore(momentumSignal);

    await db
      .update(economicActors)
      .set({
        trustScore: trustScore.toFixed(2),
        momentumScore: momentumScore.toFixed(2),
        abuseScore: abuseScore.toFixed(2),
      })
      .where(eq(economicActors.id, actorId));
    updated += 1;
  }

  return { ok: true, updated };
}

export async function recomputeActorScores() {
  return runExploreActorScoringRollup();
}

export function startExploreActorScoringScheduler() {
  if (schedulerHandle) return;

  const tick = async () => {
    const now = new Date();
    if (!shouldRunScheduledNow(now)) return;
    const key = hourKey(now);
    if (lastRunKey === key) return;
    lastRunKey = key;

    try {
      const result = await runExploreActorScoringRollup();
      console.log(`[ExploreActorScoring] Scheduled rollup completed (updated=${result.updated})`);
    } catch (error) {
      console.error('[ExploreActorScoring] Scheduled rollup failed:', error);
    }
  };

  schedulerHandle = setInterval(tick, SCHEDULER_INTERVAL_MS);
  schedulerHandle.unref?.();

  setTimeout(async () => {
    try {
      const result = await runExploreActorScoringRollup();
      console.log(`[ExploreActorScoring] Startup rollup completed (updated=${result.updated})`);
    } catch (error) {
      console.error('[ExploreActorScoring] Startup rollup failed:', error);
    }
  }, 15_000);
}
