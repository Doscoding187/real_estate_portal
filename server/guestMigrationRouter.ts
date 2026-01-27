import { z } from 'zod';
import { protectedProcedure, router } from './_core/trpc';
import { getDb } from './db';
import { favorites, recentlyViewed } from '../drizzle/schema';
import { TRPCError } from '@trpc/server';

export const guestMigrationRouter = router({
  // Migrate guest activity data to user account
  migrateGuestData: protectedProcedure
    .input(
      z.object({
        viewedProperties: z.array(z.number()).optional(),
        favoriteProperties: z.array(z.number()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        // Migrate viewed properties
        if (input.viewedProperties && input.viewedProperties.length > 0) {
          const viewedRecords = input.viewedProperties.map(propertyId => ({
            userId,
            propertyId,
            viewedAt: new Date(),
          }));

          // Insert viewed properties (ignore duplicates)
          for (const record of viewedRecords) {
            try {
              await db.insert(recentlyViewed).values(record);
            } catch (error) {
              // Ignore duplicate key errors
              console.log(`Property ${record.propertyId} already in recently viewed`);
            }
          }
        }

        // Migrate favorites
        if (input.favoriteProperties && input.favoriteProperties.length > 0) {
          const favoriteRecords = input.favoriteProperties.map(propertyId => ({
            userId,
            propertyId,
            createdAt: new Date(),
          }));

          // Insert favorites (ignore duplicates)
          for (const record of favoriteRecords) {
            try {
              await db.insert(favorites).values(record);
            } catch (error) {
              // Ignore duplicate key errors
              console.log(`Property ${record.propertyId} already in favorites`);
            }
          }
        }

        return {
          success: true,
          migratedViews: input.viewedProperties?.length || 0,
          migratedFavorites: input.favoriteProperties?.length || 0,
        };
      } catch (error) {
        console.error('Guest migration error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to migrate guest data',
        });
      }
    }),
});
