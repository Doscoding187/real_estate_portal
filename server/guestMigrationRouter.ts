import { z } from 'zod';
import { protectedProcedure, router } from './_core/trpc';
import { getDb } from './db';
import { favorites, recentlyViewed, users } from '../drizzle/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { requireUser } from './_core/requireUser';
import { isCommercialMarketingPropertyType } from '../shared/commercial-domain';
import { resolvePublicPropertyEligibilities } from './services/publicPropertyEligibilityService';

export const guestMigrationRouter = router({
  // Migrate guest activity data to user account
  migrateGuestData: protectedProcedure
    .input(
      z.object({
        viewedProperties: z.array(z.number().int().positive()).max(500).optional(),
        favoriteProperties: z.array(z.number().int().positive()).max(500).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = requireUser(ctx).id;
      const viewedIds = [...new Set(input.viewedProperties ?? [])];
      const favoriteIds = [...new Set(input.favoriteProperties ?? [])];
      const propertyIds = [...new Set([...viewedIds, ...favoriteIds])];

      // Guest activity is admitted only through the same public projection and
      // source-listing authority used by authenticated activity. A missing,
      // stale, ambiguous, or commercial projection is rejected before any
      // account row is written.
      const publicResolutions = await resolvePublicPropertyEligibilities(propertyIds);
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

      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        return await db.transaction(async tx => {
          // Serialize transfers for one authenticated user before reading activity.
          const [owner] = await tx
            .select({ id: users.id })
            .from(users)
            .where(eq(users.id, userId))
            .for('update');
          if (!owner) throw new TRPCError({ code: 'UNAUTHORIZED' });
          // Property IDs are public projection identities. Consumer activity is
          // listing-owned, so only the resolver's explicit sourceListingId may
          // cross this boundary.
          const viewRows = [...new Set(viewedIds.map(id => listingByProperty.get(id)!))].map(
            listingId => ({ userId, listingId }),
          );
          const existingViews = viewRows.length
            ? await tx
                .select({ listingId: recentlyViewed.listingId })
                .from(recentlyViewed)
                .where(
                  and(
                    eq(recentlyViewed.userId, userId),
                    inArray(
                      recentlyViewed.listingId,
                      viewRows.map(row => row.listingId),
                    ),
                  ),
                )
            : [];
          const existingViewIds = new Set(existingViews.map(row => row.listingId));
          const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
          for (const row of viewRows.filter(row => !existingViewIds.has(row.listingId))) {
            await tx.insert(recentlyViewed).values({ ...row, viewedAt: now });
          }

          const existingFavorites = favoriteIds.length
            ? await tx
                .select({ propertyId: favorites.propertyId })
                .from(favorites)
                .where(
                  and(eq(favorites.userId, userId), inArray(favorites.propertyId, favoriteIds)),
                )
            : [];
          const existingFavoriteIds = new Set(existingFavorites.map(row => row.propertyId));
          for (const propertyId of favoriteIds.filter(id => !existingFavoriteIds.has(id))) {
            await tx.insert(favorites).values({ userId, propertyId, createdAt: now });
          }
          const migratedViews = viewRows.filter(row => !existingViewIds.has(row.listingId)).length;
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
    }),
});
