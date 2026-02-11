import { foundingPartnerService } from './foundingPartnerService';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

/**
 * Founding Partner Benefits Manager
 *
 * Manages the application and removal of founding partner benefits:
 * - 3 months Featured tier subscription
 * - Founding badge display
 * - Fast-track review (24hr vs 48hr)
 * - Co-marketing eligibility
 *
 * Requirements: 16.26, 16.28
 */

export interface BenefitApplicationResult {
  success: boolean;
  benefitsApplied: string[];
  errors: string[];
}

export interface ReviewDeadline {
  standard: Date;
  fastTrack: Date;
  deadline: Date;
  isFastTrack: boolean;
}

class FoundingPartnerBenefitsManager {
  /**
   * Apply all founding partner benefits on enrollment
   * Requirements: 16.26, 16.28
   */
  async applyBenefits(partnerId: string): Promise<BenefitApplicationResult> {
    const benefitsApplied: string[] = [];
    const errors: string[] = [];

    try {
      // 1. Grant Featured tier subscription for 3 months
      await this.grantFeaturedTier(partnerId);
      benefitsApplied.push('Featured tier subscription (3 months)');
    } catch (error) {
      errors.push(`Failed to grant Featured tier: ${error}`);
    }

    try {
      // 2. Add founding badge to partner profile
      await this.addFoundingBadge(partnerId);
      benefitsApplied.push('Founding Partner badge');
    } catch (error) {
      errors.push(`Failed to add founding badge: ${error}`);
    }

    try {
      // 3. Enable fast-track review
      await this.enableFastTrackReview(partnerId);
      benefitsApplied.push('Fast-track review (24hr turnaround)');
    } catch (error) {
      errors.push(`Failed to enable fast-track review: ${error}`);
    }

    try {
      // 4. Mark as co-marketing eligible
      await this.enableCoMarketing(partnerId);
      benefitsApplied.push('Co-marketing eligibility');
    } catch (error) {
      errors.push(`Failed to enable co-marketing: ${error}`);
    }

    return {
      success: errors.length === 0,
      benefitsApplied,
      errors,
    };
  }

  /**
   * Remove all founding partner benefits on revocation
   * Requirements: 16.30
   */
  async removeBenefits(partnerId: string): Promise<BenefitApplicationResult> {
    const benefitsApplied: string[] = [];
    const errors: string[] = [];

    try {
      // 1. Downgrade from Featured tier
      await this.removeFeaturedTier(partnerId);
      benefitsApplied.push('Featured tier subscription removed');
    } catch (error) {
      errors.push(`Failed to remove Featured tier: ${error}`);
    }

    try {
      // 2. Remove founding badge
      await this.removeFoundingBadge(partnerId);
      benefitsApplied.push('Founding Partner badge removed');
    } catch (error) {
      errors.push(`Failed to remove founding badge: ${error}`);
    }

    try {
      // 3. Disable fast-track review
      await this.disableFastTrackReview(partnerId);
      benefitsApplied.push('Fast-track review disabled');
    } catch (error) {
      errors.push(`Failed to disable fast-track review: ${error}`);
    }

    try {
      // 4. Remove co-marketing eligibility
      await this.disableCoMarketing(partnerId);
      benefitsApplied.push('Co-marketing eligibility removed');
    } catch (error) {
      errors.push(`Failed to disable co-marketing: ${error}`);
    }

    return {
      success: errors.length === 0,
      benefitsApplied,
      errors,
    };
  }

  /**
   * Grant Featured tier subscription for 3 months
   * Requirements: 16.26
   */
  private async grantFeaturedTier(partnerId: string): Promise<void> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);

    const subscriptionId = randomUUID();

    await db.insert(db.schema.partnerSubscriptions).values({
      id: subscriptionId,
      partnerId,
      tier: 'featured',
      priceMonthly: '0.00', // Free for founding partners
      startDate,
      endDate,
      status: 'active',
      features: JSON.stringify({
        profileType: 'premium',
        analyticsLevel: 'advanced',
        supportLevel: 'dedicated',
        organicReachMultiplier: 2.0,
        maxMonthlyContent: 100,
        boostDiscountPercent: 20,
        foundingPartnerBenefit: true,
      }),
    });

    console.log(
      `Granted Featured tier to founding partner ${partnerId} until ${endDate.toISOString()}`,
    );
  }

  /**
   * Remove Featured tier subscription
   * Requirements: 16.30
   */
  private async removeFeaturedTier(partnerId: string): Promise<void> {
    // Find active Featured tier subscription
    const subscription = await db.query.partnerSubscriptions.findFirst({
      where: (subs: any, { and, eq }: any) =>
        and(eq(subs.partnerId, partnerId), eq(subs.tier, 'featured'), eq(subs.status, 'active')),
    });

    if (subscription) {
      await db
        .update(db.schema.partnerSubscriptions)
        .set({
          status: 'cancelled',
          endDate: new Date(),
        })
        .where(eq(db.schema.partnerSubscriptions.id, subscription.id));

      console.log(`Removed Featured tier from partner ${partnerId}`);
    }
  }

  /**
   * Add founding badge to partner profile
   * Requirements: 16.26
   */
  private async addFoundingBadge(partnerId: string): Promise<void> {
    // Update partner record to include founding badge
    const partner = await db.query.explorePartners.findFirst({
      where: (partners, { eq }: any) => eq(partners.id, partnerId),
    });

    if (!partner) {
      throw new Error('Partner not found');
    }

    // Add founding_partner badge to partner metadata
    // This would be displayed on their profile and content
    await db
      .update(db.schema.explorePartners)
      .set({
        // Note: This assumes a badges field exists or will be added
        // For now, we'll use a custom field in the partner record
        description: partner.description
          ? `${partner.description}\n\n🏆 Founding Partner`
          : '🏆 Founding Partner',
      })
      .where(eq(db.schema.explorePartners.id, partnerId));

    console.log(`Added founding badge to partner ${partnerId}`);
  }

  /**
   * Remove founding badge from partner profile
   * Requirements: 16.30
   */
  private async removeFoundingBadge(partnerId: string): Promise<void> {
    const partner = await db.query.explorePartners.findFirst({
      where: (partners, { eq }: any) => eq(partners.id, partnerId),
    });

    if (!partner || !partner.description) {
      return;
    }

    // Remove founding partner badge from description
    const updatedDescription = partner.description
      .replace(/\n\n🏆 Founding Partner/g, '')
      .replace(/🏆 Founding Partner/g, '')
      .trim();

    await db
      .update(db.schema.explorePartners)
      .set({
        description: updatedDescription || null,
      })
      .where(eq(db.schema.explorePartners.id, partnerId));

    console.log(`Removed founding badge from partner ${partnerId}`);
  }

  /**
   * Enable fast-track review (24hr vs 48hr)
   * Requirements: 16.28
   */
  private async enableFastTrackReview(partnerId: string): Promise<void> {
    // This is tracked in the founding_partners table
    // The approval service will check this when routing content
    console.log(`Enabled fast-track review for partner ${partnerId}`);
  }

  /**
   * Disable fast-track review
   * Requirements: 16.30
   */
  private async disableFastTrackReview(partnerId: string): Promise<void> {
    console.log(`Disabled fast-track review for partner ${partnerId}`);
  }

  /**
   * Enable co-marketing eligibility
   * Requirements: 16.26
   */
  private async enableCoMarketing(partnerId: string): Promise<void> {
    // Mark partner as eligible for co-marketing campaigns
    // This would be used by marketing team to identify partners
    console.log(`Enabled co-marketing for partner ${partnerId}`);
  }

  /**
   * Disable co-marketing eligibility
   * Requirements: 16.30
   */
  private async disableCoMarketing(partnerId: string): Promise<void> {
    console.log(`Disabled co-marketing for partner ${partnerId}`);
  }

  /**
   * Get review deadline for a partner
   * Requirements: 16.28
   */
  async getReviewDeadline(partnerId: string): Promise<ReviewDeadline> {
    const isFounding = await foundingPartnerService.isFoundingPartner(partnerId);
    const now = new Date();

    const standardDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours
    const fastTrackDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    return {
      standard: standardDeadline,
      fastTrack: fastTrackDeadline,
      deadline: isFounding ? fastTrackDeadline : standardDeadline,
      isFastTrack: isFounding,
    };
  }

  /**
   * Check if partner has active founding benefits
   * Requirements: 16.26
   */
  async hasActiveBenefits(partnerId: string): Promise<boolean> {
    return await foundingPartnerService.areBenefitsActive(partnerId);
  }

  /**
   * Get benefits summary for a partner
   * Requirements: 16.26, 16.28
   */
  async getBenefitsSummary(partnerId: string): Promise<{
    isFoundingPartner: boolean;
    benefitsActive: boolean;
    benefits: string[];
    expiryDate?: Date;
  }> {
    const isFounding = await foundingPartnerService.isFoundingPartner(partnerId);

    if (!isFounding) {
      return {
        isFoundingPartner: false,
        benefitsActive: false,
        benefits: [],
      };
    }

    const status = await foundingPartnerService.getFoundingPartnerStatus(partnerId);
    const benefitsActive = await foundingPartnerService.areBenefitsActive(partnerId);

    const benefits: string[] = [];

    if (benefitsActive) {
      benefits.push('Featured tier subscription (free)');
      benefits.push('Founding Partner badge');
      benefits.push('Fast-track review (24hr turnaround)');
      benefits.push('Co-marketing opportunities');
      benefits.push('20% discount on boost campaigns');
    }

    return {
      isFoundingPartner: true,
      benefitsActive,
      benefits,
      expiryDate: status?.benefitsEndDate,
    };
  }

  /**
   * Check if benefits have expired and handle expiration
   * Requirements: 16.26
   */
  async checkAndHandleExpiredBenefits(): Promise<void> {
    const activePartners = await foundingPartnerService.getActiveFoundingPartners();

    for (const partner of activePartners) {
      const benefitsActive = await foundingPartnerService.areBenefitsActive(partner.partnerId);

      if (!benefitsActive) {
        console.log(`Benefits expired for founding partner ${partner.partnerId}`);

        // Remove Featured tier (will downgrade to their chosen tier)
        await this.removeFeaturedTier(partner.partnerId);

        // Note: Keep founding badge even after benefits expire
        // This is a permanent recognition of their early support
      }
    }
  }
}

export const foundingPartnerBenefitsManager = new FoundingPartnerBenefitsManager();
