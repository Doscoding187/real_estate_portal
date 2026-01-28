import { db } from '../db';
import {
  explorePartners,
  partnerTiers,
  users,
  contentQualityScores,
  exploreContent,
  exploreShorts,
} from '../../drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface PartnerRegistration {
  userId: string;
  tierId: number;
  companyName: string;
  description?: string;
  logoUrl?: string;
  serviceLocations?: string[];
}

export interface PartnerProfileUpdate {
  companyName?: string;
  description?: string;
  logoUrl?: string;
  serviceLocations?: string[];
}

export interface VerificationData {
  credentials: string;
  documentUrls?: string[];
  licenseNumber?: string;
}

export interface PartnerProfile {
  id: string;
  userId: string;
  tier: {
    id: number;
    name: string;
    allowedContentTypes: string[];
    allowedCTAs: string[];
  };
  companyName: string;
  description: string | null;
  logoUrl: string | null;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  trustScore: number;
  serviceLocations: string[];
  subscriptionTier: 'free' | 'basic' | 'premium' | 'featured';
  approvedContentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// PARTNER SERVICE
// ============================================================================

export class PartnerService {
  /**
   * Register a new partner with tier assignment
   * Requirement 1.1, 1.6
   */
  async registerPartner(data: PartnerRegistration): Promise<any> {
    // Validate tier exists
    const tier = await db.query.partnerTiers.findFirst({
      where: eq(partnerTiers.id, data.tierId),
    });

    if (!tier) {
      throw new Error(`Invalid tier ID: ${data.tierId}`);
    }

    // Check if user already has a partner account
    const existingPartner = await db.query.explorePartners.findFirst({
      where: eq(explorePartners.userId, data.userId),
    });

    if (existingPartner) {
      throw new Error('User already has a partner account');
    }

    // Create partner with UUID
    const partnerId = randomUUID();
    const [partner] = await db.insert(explorePartners).values({
      id: partnerId,
      userId: data.userId,
      tierId: data.tierId,
      companyName: data.companyName,
      description: data.description || null,
      logoUrl: data.logoUrl || null,
      verificationStatus: 'pending',
      trustScore: '50.00', // Default starting score
      serviceLocations: data.serviceLocations || [],
      approvedContentCount: 0,
    });

    return partner;
  }

  /**
   * Assign or change partner tier with permission validation
   * Requirement 1.1, 1.6
   */
  async assignTier(partnerId: string, tierId: number): Promise<void> {
    // Validate tier exists
    const tier = await db.query.partnerTiers.findFirst({
      where: eq(partnerTiers.id, tierId),
    });

    if (!tier) {
      throw new Error(`Invalid tier ID: ${tierId}`);
    }

    // Validate partner exists
    const partner = await db.query.explorePartners.findFirst({
      where: eq(explorePartners.id, partnerId),
    });

    if (!partner) {
      throw new Error('Partner not found');
    }

    // Update partner tier
    await db
      .update(explorePartners)
      .set({
        tierId,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(explorePartners.id, partnerId));
  }

  /**
   * Update partner profile information
   * Requirement 5.1, 5.2, 5.3, 5.4
   */
  async updateProfile(partnerId: string, data: PartnerProfileUpdate): Promise<any> {
    const updateData: any = {
      updatedAt: sql`CURRENT_TIMESTAMP`,
    };

    if (data.companyName !== undefined) updateData.companyName = data.companyName;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;
    if (data.serviceLocations !== undefined) {
      updateData.serviceLocations = data.serviceLocations;
    }

    const [updated] = await db
      .update(explorePartners)
      .set(updateData)
      .where(eq(explorePartners.id, partnerId));

    return updated;
  }

  /**
   * Get partner profile with aggregated data
   * Requirement 5.1, 5.2, 5.3, 5.4
   */
  async getPartnerProfile(partnerId: string): Promise<PartnerProfile | null> {
    const partner = await db.query.explorePartners.findFirst({
      where: eq(explorePartners.id, partnerId),
      with: {
        tier: true,
      },
    });

    if (!partner) {
      return null;
    }

    // Parse service locations from JSON
    let serviceLocations: string[] = [];
    try {
      serviceLocations =
        typeof partner.serviceLocations === 'string'
          ? JSON.parse(partner.serviceLocations)
          : partner.serviceLocations || [];
    } catch (e) {
      serviceLocations = [];
    }

    return {
      id: partner.id,
      userId: partner.userId,
      tier: {
        id: partner.tier.id,
        name: partner.tier.name,
        allowedContentTypes:
          typeof partner.tier.allowedContentTypes === 'string'
            ? JSON.parse(partner.tier.allowedContentTypes)
            : partner.tier.allowedContentTypes,
        allowedCTAs:
          typeof partner.tier.allowedCTAs === 'string'
            ? JSON.parse(partner.tier.allowedCTAs)
            : partner.tier.allowedCTAs,
      },
      companyName: partner.companyName,
      description: partner.description,
      logoUrl: partner.logoUrl,
      verificationStatus: partner.verificationStatus,
      trustScore: parseFloat(partner.trustScore.toString()),
      serviceLocations,
      subscriptionTier: 'free', // Default for now
      approvedContentCount: partner.approvedContentCount,
      createdAt: new Date(partner.createdAt),
      updatedAt: new Date(partner.updatedAt),
    };
  }

  /**
   * Verify partner with credential validation
   * Requirement 5.5, 5.6
   *
   * This method marks a partner as verified and propagates the verification
   * badge to all their content automatically via the partner_id relationship.
   */
  async verifyPartner(partnerId: string, credentials: VerificationData): Promise<void> {
    // Validate partner exists
    const partner = await db.query.explorePartners.findFirst({
      where: eq(explorePartners.id, partnerId),
    });

    if (!partner) {
      throw new Error('Partner not found');
    }

    // In a real implementation, this would validate credentials against external systems
    // For now, we'll mark as verified

    await db
      .update(explorePartners)
      .set({
        verificationStatus: 'verified',
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(explorePartners.id, partnerId));

    // Recalculate trust score after verification
    await this.calculateTrustScore(partnerId);

    // Note: Verification badge propagation to content happens automatically
    // via the partner_id foreign key relationship. When content is queried,
    // it joins with the partner table and includes the verification status.
  }

  /**
   * Calculate and update partner trust score
   * Requirement 10.5
   *
   * Trust score is calculated based on:
   * - Verification status (30%)
   * - Content quality average (30%)
   * - User reviews/ratings (20%)
   * - Engagement metrics (20%)
   */
  async calculateTrustScore(partnerId: string): Promise<number> {
    const partner = await db.query.explorePartners.findFirst({
      where: eq(explorePartners.id, partnerId),
    });

    if (!partner) {
      throw new Error('Partner not found');
    }

    let score = 0;

    // 1. Verification status (30 points)
    if (partner.verificationStatus === 'verified') {
      score += 30;
    } else if (partner.verificationStatus === 'pending') {
      score += 15;
    }
    // rejected = 0 points

    // 2. Content quality average (30 points)
    // Query average quality score for partner's content
    const contentQualityResult = await db
      .select({
        avgQuality: sql<number>`AVG(${contentQualityScores.overallScore})`,
      })
      .from(contentQualityScores)
      .innerJoin(exploreContent, eq(exploreContent.id, contentQualityScores.contentId))
      .where(eq(exploreContent.partnerId, partnerId))
      .limit(1);

    const avgContentQuality = contentQualityResult[0]?.avgQuality || 50;
    // Scale from 0-100 to 0-30
    score += (avgContentQuality / 100) * 30;

    // 3. Reviews/ratings (20 points)
    // TODO: Implement when reviews system is added
    // For now, use a baseline score
    score += 10;

    // 4. Engagement metrics (20 points)
    // Calculate based on content engagement (views, saves, shares)
    // TODO: Implement when engagement tracking is complete
    // For now, use a baseline score
    score += 10;

    // Round to 2 decimal places
    const finalScore = Math.round(score * 100) / 100;

    // Update trust score
    await db
      .update(explorePartners)
      .set({
        trustScore: finalScore.toString(),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(explorePartners.id, partnerId));

    return finalScore;
  }

  /**
   * Get partners by tier
   */
  async getPartnersByTier(tierId: number): Promise<any[]> {
    return await db.query.explorePartners.findMany({
      where: eq(explorePartners.tierId, tierId),
      orderBy: [desc(explorePartners.trustScore)],
    });
  }

  /**
   * Increment approved content count
   * Called when content is approved
   */
  async incrementApprovedContentCount(partnerId: string): Promise<void> {
    const partner = await db.query.explorePartners.findFirst({
      where: eq(explorePartners.id, partnerId),
    });

    if (!partner) {
      throw new Error('Partner not found');
    }

    await db
      .update(explorePartners)
      .set({
        approvedContentCount: partner.approvedContentCount + 1,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(explorePartners.id, partnerId));
  }

  /**
   * Check if partner is eligible for auto-approval
   * Partners with 3+ approved content pieces are eligible
   */
  async isEligibleForAutoApproval(partnerId: string): Promise<boolean> {
    const partner = await db.query.explorePartners.findFirst({
      where: eq(explorePartners.id, partnerId),
    });

    if (!partner) {
      return false;
    }

    return partner.approvedContentCount >= 3;
  }
}

// Export singleton instance
export const partnerService = new PartnerService();
