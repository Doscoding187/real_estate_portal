import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { economicActors, users } from '../../drizzle/schema';
import { getRuntimeSchemaCapabilities, warnSchemaCapabilityOnce } from './runtimeSchemaCapabilities';

export type EconomicActorType = 'agent' | 'developer' | 'contractor' | 'finance_partner';
type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

function mapRoleToActorType(role?: string | null): EconomicActorType {
  if (role === 'agent') return 'agent';
  if (role === 'property_developer') return 'developer';
  return 'contractor';
}

function getInitialVerificationStatus(actorType: EconomicActorType): VerificationStatus {
  if (actorType === 'agent' || actorType === 'developer') return 'pending';
  return 'unverified';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getInitialProfileCompleteness(actorType: EconomicActorType): number {
  if (actorType === 'agent' || actorType === 'developer') return 35;
  return 20;
}

function getInitialTrustScore(
  verificationStatus: VerificationStatus,
  profileCompleteness: number,
): string {
  let score = 50;
  if (verificationStatus === 'verified') score += 20;
  if (verificationStatus === 'pending') score += 5;
  score += Math.floor(profileCompleteness * 0.1);
  return clamp(score, 0, 100).toFixed(2);
}

export async function getOrCreateEconomicActorForUser(params: {
  userId: number;
  roleHint?: string | null;
  actorTypeHint?: EconomicActorType;
}): Promise<{
  id: number;
  actorType: EconomicActorType;
  verificationStatus: VerificationStatus;
  profileCompleteness: number;
  trustScore: number;
}> {
  const { userId, roleHint, actorTypeHint } = params;
  const capabilities = await getRuntimeSchemaCapabilities();
  if (!capabilities.economicActorsReady) {
    warnSchemaCapabilityOnce(
      'economic-actor-service-schema-not-ready',
      '[economicActorService] Economic actor schema not ready; cannot provision actor row.',
      capabilities.economicActorsDetails,
    );
    throw new Error('Economic actor schema not ready');
  }

  const user = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const actorType = actorTypeHint ?? mapRoleToActorType(roleHint ?? user[0]?.role ?? null);

  const existing = await db
    .select({
      id: economicActors.id,
      actorType: economicActors.actorType,
      verificationStatus: economicActors.verificationStatus,
      profileCompleteness: economicActors.profileCompleteness,
      trustScore: economicActors.trustScore,
    })
    .from(economicActors)
    .where(and(eq(economicActors.userId, userId), eq(economicActors.actorType, actorType)))
    .limit(1);

  if (existing[0]) {
    return {
      id: existing[0].id,
      actorType: existing[0].actorType as EconomicActorType,
      verificationStatus: existing[0].verificationStatus as VerificationStatus,
      profileCompleteness: Number(existing[0].profileCompleteness ?? 0),
      trustScore: Number(existing[0].trustScore ?? 50),
    };
  }

  const verificationStatus = getInitialVerificationStatus(actorType);
  const profileCompleteness = getInitialProfileCompleteness(actorType);
  const trustScore = getInitialTrustScore(verificationStatus, profileCompleteness);

  const created = await db.insert(economicActors).values({
    userId,
    actorType,
    verificationStatus,
    subscriptionTier: 'free',
    trustScore,
    momentumScore: '0.00',
    profileCompleteness,
  });

  return {
    id: Number((created as any).insertId),
    actorType,
    verificationStatus,
    profileCompleteness,
    trustScore: Number(trustScore),
  };
}
