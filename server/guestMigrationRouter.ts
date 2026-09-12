import { z } from 'zod';
import { protectedProcedure, router } from './_core/trpc';
import { allocateUserRecentViewTimestamp, getDb } from './db';
import { favorites, recentlyViewed, users } from '../drizzle/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { requireUser } from './_core/requireUser';
import { isCommercialMarketingPropertyType } from '../shared/commercial-domain';
import { resolvePublicPropertyEligibilities } from './services/publicPropertyEligibilityService';

export type GuestActivityMigrationCommand = {
  userId: number;
  viewedProperties?: readonly number[];
  favoriteProperties?: readonly number[];
};

/**
 * The database dependency is injectable so physical integration tests can
 * exercise this exact transaction with more than one independent pool. The
 * router supplies no dependency and therefore always uses the canonical
 * runtime database.
 */
export type GuestActivityMigrationDependencies = {
  database?: any;
  resolvePublicProperties?: typeof resolvePublicPropertyEligibilities;
};

export async function migrateGuestActivity(
  command: GuestActivityMigrationCommand,
  dependencies: GuestActivityMigrationDependencies = {},
) {
  const viewedIds = [...new Set(command.viewedProperties ?? [])];
  const favoriteIds = [...new Set(command.favoriteProperties ?? [])];
  const propertyIds = [...new Set([...viewedIds, ...favoriteIds])];

  // Guest activity is admitted only through the same public projection and
  // source-listing authority used by authenticated activity. A missing,
  // stale, ambiguous, or commercial projection is rejected before any
  // account row is written.
  const resolveProperties =
    dependencies.resolvePublicProperties || resolvePublicPropertyEligibilities;
  const publicResolutions = await resolveProperties(propertyIds);
  const missing = propertyIds.filter(id => !publicResolutions.has(id));
  if (missing.length) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Guest activity references inventory that is not publicly available.',
    });
  }

  if (
    [...publicResolutions.values()].some(resolution =>
      isCommercialMarketingPropertyType(resolution.property.propertyType),
    )
  ) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Commercial activity requires the Commercial journey.',
    });
  }

  const listingByProperty = new Map<number, number>();
  for (const [propertyId, resolution] of publicResolutions) {
    const listingId = Number(resolution.sourceListingId);
    if (!Number.isSafeInteger(listingId) || listingId <= 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Guest activity has no canonical authored listing.',
      });
    }
    listingByProperty.set(propertyId, listingId);
  }

  const database = dependencies.database ?? (await getDb());
  if (!database) throw new Error('Database not available');

  try {
    return await database.transaction(async (tx: any) => {
      // Serialize transfers for one authenticated user before reading
      // activity. The user row is the account-level transaction mutex.
      const [owner] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, command.userId))
        .for('update');
      if (!owner) throw new TRPCError({ code: 'UNAUTHORIZED' });

      // Property IDs are public projection identities. Consumer activity is
      // listing-owned, so only the resolver's explicit sourceListingId may
      // cross this boundary.
      const viewRows = [...new Set(viewedIds.map(id => listingByProperty.get(id)!))].map(
        listingId => ({ userId: command.userId, listingId }),
      );
      const existingViews = viewRows.length
        ? await tx
            .select({ listingId: recentlyViewed.listingId })
            .from(recentlyViewed)
            .where(
              and(
                eq(recentlyViewed.userId, command.userId),
                inArray(
                  recentlyViewed.listingId,
                  viewRows.map(row => row.listingId),
                ),
              ),
            )
        : [];
      const existingViewIds = new Set(existingViews.map((row: any) => row.listingId));
      const insertedViewRows = viewRows.filter(row => !existingViewIds.has(row.listingId));
      // Guest history is stored newest-first. Allocate timestamps oldest-first
      // so the authenticated list preserves that observed order exactly.
      for (const row of [...insertedViewRows].reverse()) {
        await tx.insert(recentlyViewed).values({
          ...row,
          viewedAt: await allocateUserRecentViewTimestamp(tx, command.userId),
        });
      }

      const existingFavorites = favoriteIds.length
        ? await tx
            .select({ propertyId: favorites.propertyId })
            .from(favorites)
            .where(
              and(
                eq(favorites.userId, command.userId),
                inArray(favorites.propertyId, favoriteIds),
              ),
            )
        : [];
      const existingFavoriteIds = new Set(existingFavorites.map((row: any) => row.propertyId));
      for (const propertyId of favoriteIds.filter(id => !existingFavoriteIds.has(id))) {
        await tx.insert(favorites).values({
          userId: command.userId,
          propertyId,
        });
      }
      const migratedViews = insertedViewRows.length;
      const migratedFavorites = favoriteIds.filter(id => !existingFavoriteIds.has(id)).length;

      return {
        success: true,
        migratedViews,
        migratedFavorites,
      };
    });
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    console.error('Guest migration error:', error);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to migrate guest data',
    });
  }
}

export const guestMigrationRouter = router({
  // Migrate guest activity data to user account
  migrateGuestData: protectedProcedure
    .input(
      z.object({
        viewedProperties: z.array(z.number().int().positive()).max(500).optional(),
        favoriteProperties: z.array(z.number().int().positive()).max(500).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) =>
      migrateGuestActivity({ userId: requireUser(ctx).id, ...input }),
    ),
});
