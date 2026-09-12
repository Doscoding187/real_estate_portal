import { publicProcedure, router } from './_core/trpc';
import { getDb } from './db';
import { platformSettings } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

/**
 * Settings Router
 * Handles public platform settings like SARB rates
 */
export const settingsRouter = router({
  /**
   * Get public platform settings
   * Returns key-value pairs for public settings
   */
  getPublic: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    }

    try {
      const settings = await db
        .select()
        .from(platformSettings)
        .where(eq(platformSettings.isPublic, 1));

      // Convert array to key-value object
      const settingsObj: Record<string, string> = {};
      settings.forEach(setting => {
        settingsObj[setting.settingKey] = setting.settingValue || '';
      });

      return settingsObj;
    } catch (error) {
      console.error('[Settings] Error fetching public settings:', error);
      throw error;
    }
  }),

  /**
   * Get SARB Prime Rate
   * Convenience endpoint for getting just the prime rate
   */
  getSARBPrimeRate: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    }

    try {
      const result = await db
        .select()
        .from(platformSettings)
        .where(eq(platformSettings.settingKey, 'sarb_prime_rate'))
        .limit(1);

      if (result.length > 0) {
        return {
          rate: parseFloat(result[0].settingValue || '10.50'),
          lastUpdated: result[0].updatedAt,
        };
      }

      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'SARB prime rate is not configured in canonical platform settings',
      });
    } catch (error) {
      console.error('[Settings] Error fetching SARB prime rate:', error);
      throw error;
    }
  }),
});
