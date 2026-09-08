import { z } from 'zod';
import { protectedProcedure, router } from './_core/trpc';
import { getDb } from './db';
import { favorites, recentlyViewed, properties, users } from '../drizzle/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { requireUser } from './_core/requireUser';
import { isCommercialMarketingPropertyType } from '../shared/commercial-domain';

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
          const viewedIds = [...new Set(input.viewedProperties ?? [])];
          const favoriteIds = [...new Set(input.favoriteProperties ?? [])];
          const propertyIds = [...new Set([...viewedIds, ...favoriteIds])];
          const propertyRows = propertyIds.length
            ? await tx
                .select({
                  id: properties.id,
                  sourceListingId: properties.sourceListingId,
                  propertyType: properties.propertyType,
                })
                .from(properties)
                .where(inArray(properties.id, propertyIds))
            : [];
          const byId = new Map(propertyRows.map(row => [row.id, row]));
          const missing = propertyIds.filter(id => !byId.has(id));
          if (missing.length)
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Guest activity references unknown properties.',
            });

          if (propertyRows.some(row => isCommercialMarketingPropertyType(row.propertyType))) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Commercial activity requires the Commercial journey.',
            });
          }
          if (viewedIds.some(id => byId.get(id)?.sourceListingId == null)) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Viewed property is not backed by a listing.',
            });
          }

          // Property IDs are public projection identities. Prospect activity is
          // listing-owned, so only an explicit sourceListingId may cross this boundary.
          const listingByProperty = new Map(propertyRows.map(row => [row.id, row.sourceListingId]));
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
