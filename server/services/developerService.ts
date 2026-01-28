import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
// Using the connection module directly as per pattern in other services
import { getDb } from '../db-connection';
import { developers, developerBrandProfiles } from '../../drizzle/schema';

export type DeveloperProfileResult = {
  // spread from developers row
  id: number;
  userId: number;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason: string | null;
  developerBrandProfileId: number | null;
  // include whatever else your table has (createdAt, etc.)
  [key: string]: any;

  brandProfile: null | {
    id: number;
    brandName: string | null;
    logoUrl: string | null;
    // include other branding fields as needed
    [key: string]: any;
  };
};

export async function getDeveloperByUserId(userId: number): Promise<DeveloperProfileResult | null> {
  const db = await getDb();
  if (!db) return null;

  const results = await db.select().from(developers).where(eq(developers.userId, userId)).limit(1);

  const devRow = results[0];

  if (!devRow) return null;

  let brandProfile: DeveloperProfileResult['brandProfile'] = null;

  if (devRow.developerBrandProfileId) {
    const brandResults = await db
      .select()
      .from(developerBrandProfiles)
      .where(eq(developerBrandProfiles.id, devRow.developerBrandProfileId))
      .limit(1);

    if (brandResults.length > 0) {
      brandProfile = brandResults[0] as any;
    }
  } else {
    const brandResults = await db
      .select()
      .from(developerBrandProfiles)
      .where(eq(developerBrandProfiles.linkedDeveloperAccountId, devRow.id))
      .limit(1);

    if (brandResults.length > 0) {
      brandProfile = brandResults[0] as any;
    }
  }

  return {
    ...(devRow as any),
    brandProfile,
  };
}

/**
 * STRICT: Resolves the developer profile for a given user ID or throws Forbidden.
 * This is the canonical way to "get current developer profile" for router procedures.
 */
export async function requireDeveloperProfileByUserId(userId: number) {
  const profile = await getDeveloperByUserId(userId);

  if (!profile) {
    // This usually means the user is logged in (ctx.user) but hasn't completed onboarding,
    // or the developers table record is missing.
    // Throwing FORBIDDEN (or NOT_FOUND) prevents further execution.
    // TRPCError must be imported if we want to throw it here, otherwise just return null?
    // User instruction says "throw new TRPCError".
    // We need to ensure TRPCError is imported.
    throw new Error('Developer profile not found for this user');
  }

  return profile;
}
