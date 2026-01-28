import { getDb } from './db';
// TODO: Re-enable when marketing campaign schema is added
// import { marketingCampaigns, campaignBudgets, campaignChannels } from '../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

// TEMPORARY: Placeholder types until schema is implemented
const marketingCampaigns = { id: null, targetType: null, targetId: null, status: null } as any;
const campaignBudgets = { campaignId: null, budgetAmount: null, budgetType: null } as any;
const campaignChannels = { campaignId: null, type: null, enabled: null } as any;

/**
 * Calculate boost score for a listing based on active campaigns
 * Higher score = higher priority in feed/search results
 */
export async function calculateListingBoostScore(listingId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    // Find active campaigns targeting this listing
    const activeCampaigns = await db
      .select({
        campaignId: marketingCampaigns.id,
        budgetAmount: campaignBudgets.budgetAmount,
        budgetType: campaignBudgets.budgetType,
      })
      .from(marketingCampaigns)
      .leftJoin(campaignBudgets, eq(campaignBudgets.campaignId, marketingCampaigns.id))
      .where(
        and(
          eq(marketingCampaigns.targetType, 'listing'),
          eq(marketingCampaigns.targetId, listingId),
          eq(marketingCampaigns.status, 'active'),
        ),
      );

    if (activeCampaigns.length === 0) return 0;

    // Calculate boost score based on budget
    let totalBoost = 0;
    for (const campaign of activeCampaigns) {
      const budget = parseFloat(campaign.budgetAmount || '0');

      // Higher budget = higher boost
      // Daily budgets get a multiplier
      const multiplier = campaign.budgetType === 'daily' ? 1.5 : 1.0;

      // Logarithmic scaling to prevent excessive dominance
      const boost = Math.log10(budget + 1) * multiplier;
      totalBoost += boost;
    }

    return totalBoost;
  } catch (error) {
    console.error('Error calculating boost score:', error);
    return 0;
  }
}

/**
 * Get boosted listings for a specific channel
 * Returns listing IDs sorted by boost score
 */
export async function getBoostedListingsForChannel(
  channel: 'feed' | 'search' | 'carousel' | 'showcase',
  limit: number = 10,
): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    // Find all active campaigns with this channel enabled
    const boostedListings = await db
      .select({
        listingId: marketingCampaigns.targetId,
        budgetAmount: campaignBudgets.budgetAmount,
        budgetType: campaignBudgets.budgetType,
      })
      .from(marketingCampaigns)
      .leftJoin(campaignBudgets, eq(campaignBudgets.campaignId, marketingCampaigns.id))
      .leftJoin(campaignChannels, eq(campaignChannels.campaignId, marketingCampaigns.id))
      .where(
        and(
          eq(marketingCampaigns.targetType, 'listing'),
          eq(marketingCampaigns.status, 'active'),
          eq(campaignChannels.type, channel),
          eq(campaignChannels.enabled, true),
        ),
      );

    // Calculate scores and sort
    const scoredListings = boostedListings.map(
      (item: { listingId: number; budgetAmount: string | null; budgetType: string | null }) => {
        const budget = parseFloat(item.budgetAmount || '0');
        const multiplier = item.budgetType === 'daily' ? 1.5 : 1.0;
        const score = Math.log10(budget + 1) * multiplier;

        return {
          listingId: item.listingId,
          score,
        };
      },
    );

    // Sort by score descending and return top N
    return scoredListings
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
      .slice(0, limit)
      .map((item: { listingId: number }) => item.listingId);
  } catch (error) {
    console.error('Error getting boosted listings:', error);
    return [];
  }
}

/**
 * Track impression for a campaign
 */
export async function trackCampaignImpression(campaignId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // This would ideally use a proper analytics table with daily aggregation
    // For now, we'll increment the performance counter
    await db.execute(sql`
      INSERT INTO campaign_performance (campaign_id, impressions, date)
      VALUES (${campaignId}, 1, CURDATE())
      ON DUPLICATE KEY UPDATE impressions = impressions + 1
    `);
  } catch (error) {
    console.error('Error tracking impression:', error);
  }
}

/**
 * Track click for a campaign
 */
export async function trackCampaignClick(campaignId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.execute(sql`
      INSERT INTO campaign_performance (campaign_id, clicks, date)
      VALUES (${campaignId}, 1, CURDATE())
      ON DUPLICATE KEY UPDATE clicks = clicks + 1
    `);
  } catch (error) {
    console.error('Error tracking click:', error);
  }
}

/**
 * Get active campaign for a listing (for tracking purposes)
 */
export async function getActiveCampaignForListing(listingId: number): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const campaign = await db.query.marketingCampaigns.findFirst({
      where: and(
        eq(marketingCampaigns.targetType, 'listing'),
        eq(marketingCampaigns.targetId, listingId),
        eq(marketingCampaigns.status, 'active'),
      ),
    });

    return campaign?.id || null;
  } catch (error) {
    console.error('Error getting active campaign:', error);
    return null;
  }
}
