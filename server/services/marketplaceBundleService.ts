/**
 * Marketplace Bundle Service
 *
 * Manages marketplace bundles that group curated partners by category
 * (e.g., First-Time Buyer Bundle with Finance, Legal, Inspection, Insurance partners).
 *
 * Key Features:
 * - Bundle CRUD operations
 * - Partner inclusion in bundles with category assignment
 * - Bundle display with partner ratings and verification status
 * - Performance tracking for bundle partners
 *
 * Requirements: 12.1, 12.4
 */

import { db } from '../db';
import { nanoid } from 'nanoid';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface MarketplaceBundle {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  targetAudience: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
}

export interface BundlePartner {
  bundleId: string;
  partnerId: string;
  category: string;
  displayOrder: number;
  inclusionFee: number | null;
  performanceScore: number;
}

export interface BundleWithPartners {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  targetAudience: string | null;
  isActive: boolean;
  displayOrder: number;
  partners: BundlePartnerInfo[];
}

export interface BundlePartnerInfo {
  partnerId: string;
  companyName: string;
  description: string | null;
  logoUrl: string | null;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  trustScore: number;
  category: string;
  displayOrder: number;
  performanceScore: number;
  // Aggregated ratings (would come from reviews table in full implementation)
  averageRating?: number;
  reviewCount?: number;
}

export interface CreateBundleInput {
  slug: string;
  name: string;
  description?: string;
  targetAudience?: string;
  displayOrder?: number;
}

export interface AddPartnerToBundleInput {
  bundleId: string;
  partnerId: string;
  category: string;
  displayOrder?: number;
  inclusionFee?: number;
}

// ============================================================================
// Marketplace Bundle Service
// ============================================================================

export class MarketplaceBundleService {
  /**
   * Create a new marketplace bundle
   */
  async createBundle(input: CreateBundleInput): Promise<MarketplaceBundle> {
    const id = nanoid();

    const result = await db.execute(
      `INSERT INTO marketplace_bundles 
       (id, slug, name, description, target_audience, display_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, true)`,
      [
        id,
        input.slug,
        input.name,
        input.description || null,
        input.targetAudience || null,
        input.displayOrder || 0,
      ],
    );

    return this.getBundleById(id);
  }

  /**
   * Get bundle by ID
   */
  async getBundleById(bundleId: string): Promise<MarketplaceBundle | null> {
    const result = await db.execute(
      `SELECT id, slug, name, description, target_audience as targetAudience,
              is_active as isActive, display_order as displayOrder, created_at as createdAt
       FROM marketplace_bundles
       WHERE id = ?`,
      [bundleId],
    );

    const rows = result.rows as any[];
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Get bundle by slug
   */
  async getBundleBySlug(slug: string): Promise<MarketplaceBundle | null> {
    const result = await db.execute(
      `SELECT id, slug, name, description, target_audience as targetAudience,
              is_active as isActive, display_order as displayOrder, created_at as createdAt
       FROM marketplace_bundles
       WHERE slug = ?`,
      [slug],
    );

    const rows = result.rows as any[];
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Get all active bundles
   */
  async getActiveBundles(): Promise<MarketplaceBundle[]> {
    const result = await db.execute(
      `SELECT id, slug, name, description, target_audience as targetAudience,
              is_active as isActive, display_order as displayOrder, created_at as createdAt
       FROM marketplace_bundles
       WHERE is_active = true
       ORDER BY display_order ASC, name ASC`,
    );

    return result.rows as MarketplaceBundle[];
  }

  /**
   * Add a partner to a bundle
   */
  async addPartnerToBundle(input: AddPartnerToBundleInput): Promise<void> {
    // Verify bundle exists
    const bundle = await this.getBundleById(input.bundleId);
    if (!bundle) {
      throw new Error(`Bundle not found: ${input.bundleId}`);
    }

    // Verify partner exists
    const partnerResult = await db.execute(`SELECT id FROM explore_partners WHERE id = ?`, [
      input.partnerId,
    ]);
    if ((partnerResult.rows as any[]).length === 0) {
      throw new Error(`Partner not found: ${input.partnerId}`);
    }

    // Add partner to bundle
    await db.execute(
      `INSERT INTO bundle_partners 
       (bundle_id, partner_id, category, display_order, inclusion_fee, performance_score)
       VALUES (?, ?, ?, ?, ?, 50.00)
       ON DUPLICATE KEY UPDATE
         category = VALUES(category),
         display_order = VALUES(display_order),
         inclusion_fee = VALUES(inclusion_fee)`,
      [
        input.bundleId,
        input.partnerId,
        input.category,
        input.displayOrder || 0,
        input.inclusionFee || null,
      ],
    );
  }

  /**
   * Remove a partner from a bundle
   */
  async removePartnerFromBundle(bundleId: string, partnerId: string): Promise<void> {
    await db.execute(
      `DELETE FROM bundle_partners 
       WHERE bundle_id = ? AND partner_id = ?`,
      [bundleId, partnerId],
    );
  }

  /**
   * Get bundle with full partner information
   * Includes partner ratings and verification status
   *
   * Validates: Requirements 12.4
   */
  async getBundleWithPartners(bundleId: string): Promise<BundleWithPartners | null> {
    // Get bundle
    const bundle = await this.getBundleById(bundleId);
    if (!bundle) {
      return null;
    }

    // Get partners with their info
    const result = await db.execute(
      `SELECT 
         bp.partner_id as partnerId,
         bp.category,
         bp.display_order as displayOrder,
         bp.performance_score as performanceScore,
         p.company_name as companyName,
         p.description,
         p.logo_url as logoUrl,
         p.verification_status as verificationStatus,
         p.trust_score as trustScore
       FROM bundle_partners bp
       INNER JOIN explore_partners p ON bp.partner_id = p.id
       WHERE bp.bundle_id = ?
       ORDER BY bp.category ASC, bp.display_order ASC`,
      [bundleId],
    );

    const partners = (result.rows as any[]).map(row => ({
      partnerId: row.partnerId,
      companyName: row.companyName,
      description: row.description,
      logoUrl: row.logoUrl,
      verificationStatus: row.verificationStatus,
      trustScore: parseFloat(row.trustScore),
      category: row.category,
      displayOrder: row.displayOrder,
      performanceScore: parseFloat(row.performanceScore),
      // In a full implementation, these would come from a reviews table
      averageRating: undefined,
      reviewCount: undefined,
    }));

    return {
      ...bundle,
      partners,
    };
  }

  /**
   * Get bundle with partners by slug
   */
  async getBundleWithPartnersBySlug(slug: string): Promise<BundleWithPartners | null> {
    const bundle = await this.getBundleBySlug(slug);
    if (!bundle) {
      return null;
    }
    return this.getBundleWithPartners(bundle.id);
  }

  /**
   * Get partners in a bundle by category
   */
  async getPartnersByCategory(bundleId: string, category: string): Promise<BundlePartnerInfo[]> {
    const result = await db.execute(
      `SELECT 
         bp.partner_id as partnerId,
         bp.category,
         bp.display_order as displayOrder,
         bp.performance_score as performanceScore,
         p.company_name as companyName,
         p.description,
         p.logo_url as logoUrl,
         p.verification_status as verificationStatus,
         p.trust_score as trustScore
       FROM bundle_partners bp
       INNER JOIN explore_partners p ON bp.partner_id = p.id
       WHERE bp.bundle_id = ? AND bp.category = ?
       ORDER BY bp.display_order ASC`,
      [bundleId, category],
    );

    return (result.rows as any[]).map(row => ({
      partnerId: row.partnerId,
      companyName: row.companyName,
      description: row.description,
      logoUrl: row.logoUrl,
      verificationStatus: row.verificationStatus,
      trustScore: parseFloat(row.trustScore),
      category: row.category,
      displayOrder: row.displayOrder,
      performanceScore: parseFloat(row.performanceScore),
    }));
  }

  /**
   * Update partner performance score in bundle
   */
  async updatePartnerPerformance(
    bundleId: string,
    partnerId: string,
    performanceScore: number,
  ): Promise<void> {
    if (performanceScore < 0 || performanceScore > 100) {
      throw new Error('Performance score must be between 0 and 100');
    }

    await db.execute(
      `UPDATE bundle_partners 
       SET performance_score = ?
       WHERE bundle_id = ? AND partner_id = ?`,
      [performanceScore, bundleId, partnerId],
    );
  }

  /**
   * Get underperforming partners in a bundle
   * Returns partners with performance score below threshold
   */
  async getUnderperformingPartners(
    bundleId: string,
    threshold: number = 40,
  ): Promise<BundlePartnerInfo[]> {
    const result = await db.execute(
      `SELECT 
         bp.partner_id as partnerId,
         bp.category,
         bp.display_order as displayOrder,
         bp.performance_score as performanceScore,
         p.company_name as companyName,
         p.description,
         p.logo_url as logoUrl,
         p.verification_status as verificationStatus,
         p.trust_score as trustScore
       FROM bundle_partners bp
       INNER JOIN explore_partners p ON bp.partner_id = p.id
       WHERE bp.bundle_id = ? AND bp.performance_score < ?
       ORDER BY bp.performance_score ASC`,
      [bundleId, threshold],
    );

    return (result.rows as any[]).map(row => ({
      partnerId: row.partnerId,
      companyName: row.companyName,
      description: row.description,
      logoUrl: row.logoUrl,
      verificationStatus: row.verificationStatus,
      trustScore: parseFloat(row.trustScore),
      category: row.category,
      displayOrder: row.displayOrder,
      performanceScore: parseFloat(row.performanceScore),
    }));
  }

  /**
   * Validate bundle has required categories
   * For example, First-Time Buyer Bundle should have Finance, Legal, Inspection, Insurance
   *
   * Validates: Requirements 12.1
   */
  async validateBundleCategories(
    bundleId: string,
    requiredCategories: string[],
  ): Promise<{ valid: boolean; missingCategories: string[] }> {
    const result = await db.execute(
      `SELECT DISTINCT category
       FROM bundle_partners
       WHERE bundle_id = ?`,
      [bundleId],
    );

    const existingCategories = (result.rows as any[]).map(row => row.category);
    const missingCategories = requiredCategories.filter(cat => !existingCategories.includes(cat));

    return {
      valid: missingCategories.length === 0,
      missingCategories,
    };
  }

  /**
   * Update bundle active status
   */
  async updateBundleStatus(bundleId: string, isActive: boolean): Promise<void> {
    await db.execute(
      `UPDATE marketplace_bundles 
       SET is_active = ?
       WHERE id = ?`,
      [isActive, bundleId],
    );
  }

  /**
   * Delete a bundle (and all partner associations)
   */
  async deleteBundle(bundleId: string): Promise<void> {
    // Foreign key cascade will handle bundle_partners deletion
    await db.execute(`DELETE FROM marketplace_bundles WHERE id = ?`, [bundleId]);
  }

  /**
   * Get all bundles (active and inactive)
   */
  async getAllBundles(): Promise<MarketplaceBundle[]> {
    const result = await db.execute(
      `SELECT id, slug, name, description, target_audience as targetAudience,
              is_active as isActive, display_order as displayOrder, created_at as createdAt
       FROM marketplace_bundles
       ORDER BY display_order ASC, name ASC`,
    );

    return (result.rows as any[]).map(row => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      targetAudience: row.targetAudience,
      isActive: Boolean(row.isActive),
      displayOrder: row.displayOrder,
      createdAt: row.createdAt,
    }));
  }

  /**
   * Get partners for a specific bundle
   * Alias for getBundleWithPartners that returns just the partners array
   */
  async getBundlePartners(bundleId: string): Promise<BundlePartnerInfo[]> {
    const bundleWithPartners = await this.getBundleWithPartners(bundleId);
    return bundleWithPartners?.partners || [];
  }

  /**
   * Track bundle engagement (user interaction with bundle partner)
   * Requirements: 12.3
   */
  async trackBundleEngagement(
    bundleId: string,
    partnerId: string,
    userId: string,
    engagementType: 'view' | 'click' | 'contact',
  ): Promise<void> {
    // In a full implementation, this would insert into a bundle_engagements table
    // For now, we'll log it
    console.log(
      `[BUNDLE ENGAGEMENT] Bundle: ${bundleId}, Partner: ${partnerId}, User: ${userId}, Type: ${engagementType}`,
    );

    // This would be used for:
    // 1. Attribution tracking
    // 2. Partner performance scoring
    // 3. Bundle effectiveness analytics
    // 4. Partner billing/commission
  }

  /**
   * Get analytics for a bundle
   */
  async getBundleAnalytics(bundleId: string): Promise<{
    totalPartners: number;
    averagePerformanceScore: number;
    categoryCoverage: string[];
    engagementCount: number;
  }> {
    const partners = await this.getBundlePartners(bundleId);

    const totalPartners = partners.length;
    const averagePerformanceScore =
      totalPartners > 0
        ? partners.reduce((sum, p) => sum + (p.performanceScore || 0), 0) / totalPartners
        : 0;

    const categoryCoverage = [...new Set(partners.map(p => p.category))];

    // In a full implementation, this would query bundle_engagements table
    const engagementCount = 0;

    return {
      totalPartners,
      averagePerformanceScore,
      categoryCoverage,
      engagementCount,
    };
  }
}

// Export singleton instance
export const marketplaceBundleService = new MarketplaceBundleService();
