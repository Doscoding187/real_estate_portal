import { publicProcedure, router } from './_core/trpc';
import { getDb } from './db';
import { platformSettings } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

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
      return {
        sarb_prime_rate: '10.50',
        sarb_repo_rate: '7.00',
      };
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

      // Ensure SARB rates are always present with fallback values
      return {
        sarb_prime_rate: settingsObj.sarb_prime_rate || '10.50',
        sarb_repo_rate: settingsObj.sarb_repo_rate || '7.00',
        ...settingsObj,
      };
    } catch (error) {
      console.error('[Settings] Error fetching public settings:', error);
      // Return fallback values
      return {
        sarb_prime_rate: '10.50',
        sarb_repo_rate: '7.00',
      };
    }
  }),

  /**
   * Get SARB Prime Rate
   * Convenience endpoint for getting just the prime rate
   */
  getSARBPrimeRate: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return { rate: 10.50, lastUpdated: null };
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

      return { rate: 10.50, lastUpdated: null };
    } catch (error) {
      console.error('[Settings] Error fetching SARB prime rate:', error);
      return { rate: 10.50, lastUpdated: null };
    }
  }),
});
