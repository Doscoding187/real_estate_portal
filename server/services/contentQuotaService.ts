import { db } from '../db';
import { eq, inArray, and } from 'drizzle-orm';
import { launchService } from './launchService';
import { unitTypes, developmentPhases, exploreContent } from '../../drizzle/schema';

/**
 * Content Quota Service
 *
 * Tracks progress toward launch content quotas and provides
 * detailed reporting on content inventory.
 *
 * Requirements: 16.3, 16.5
 */

export interface ContentQuotaProgress {
  contentType: string;
  requiredCount: number;
  currentCount: number;
  percentComplete: number;
  isMet: boolean;
  remaining: number;
}

export interface ContentInventoryReport {
  totalContent: number;
  totalRequired: number;
  overallProgress: number;
  isLaunchReady: boolean;
  quotas: ContentQuotaProgress[];
  breakdown: {
    met: number;
    unmet: number;
    total: number;
  };
}

export interface ContentTypeMapping {
  [key: string]: string;
}

class ContentQuotaService {
  // Map content types to quota categories
  private contentTypeMapping: ContentTypeMapping = {
    property_tour: 'property_tours',
    development_showcase: 'property_tours',
    agent_walkthrough: 'property_tours',
    neighbourhood_guide: 'neighbourhood_guides',
    area_overview: 'neighbourhood_guides',
    expert_tip: 'expert_tips',
    how_to: 'expert_tips',
    educational: 'expert_tips',
    market_insight: 'market_insights',
    market_analysis: 'market_insights',
    price_trends: 'market_insights',
    service_showcase: 'service_showcases',
    service_demo: 'service_showcases',
    inspiration: 'inspiration_pieces',
    design_showcase: 'inspiration_pieces',
    trend: 'inspiration_pieces',
  };

  /**
   * Get detailed progress for all content quotas
   * Requirements: 16.3, 16.5
   */
  async getQuotaProgress(): Promise<ContentQuotaProgress[]> {
    const quotas = await launchService.getContentQuotas();

    return quotas.map(quota => {
      const percentComplete = (quota.currentCount / quota.requiredCount) * 100;
      const remaining = Math.max(0, quota.requiredCount - quota.currentCount);

      return {
        contentType: quota.contentType,
        requiredCount: quota.requiredCount,
        currentCount: quota.currentCount,
        percentComplete: Math.round(percentComplete * 10) / 10,
        isMet: quota.currentCount >= quota.requiredCount,
        remaining,
      };
    });
  }

  /**
   * Get comprehensive content inventory report
   * Requirements: 16.3, 16.5
   */
  async getInventoryReport(): Promise<ContentInventoryReport> {
    const progress = await this.getQuotaProgress();

    const totalContent = progress.reduce((sum, p) => sum + p.currentCount, 0);
    const totalRequired = progress.reduce((sum, p) => sum + p.requiredCount, 0);
    const overallProgress = (totalContent / totalRequired) * 100;

    const met = progress.filter(p => p.isMet).length;
    const unmet = progress.filter(p => !p.isMet).length;

    return {
      totalContent,
      totalRequired,
      overallProgress: Math.round(overallProgress * 10) / 10,
      isLaunchReady: totalContent >= 200 && unmet === 0,
      quotas: progress,
      breakdown: {
        met,
        unmet,
        total: progress.length,
      },
    };
  }

  /**
   * Track content creation and update quotas
   * Requirements: 16.3, 16.5
   */
  async trackContentCreation(contentType: string, _partnerId: string): Promise<void> {
    const quotaType = this.contentTypeMapping[contentType];

    if (quotaType) {
      await launchService.incrementContentQuota(quotaType);
      console.log(`Incremented quota for ${quotaType} (content type: ${contentType})`);
    } else {
      console.warn(`No quota mapping found for content type: ${contentType}`);
    }
  }

  /**
   * Bulk update quota counts from actual content
   * Requirements: 16.3, 16.5
   */
  async syncQuotasFromContent(): Promise<void> {
    // Count property tours
    const propertyTours = await db.query.exploreContent.findMany({
      where: (content: typeof exploreContent) =>
        and(
          inArray(content.contentType, [
            'property_tour',
            'development_showcase',
            'agent_walkthrough',
          ]),
          eq(content.isLaunchContent, true),
        ),
    });

    // Count neighbourhood guides
    const neighbourhoodGuides = await db.query.exploreContent.findMany({
      where: (content: typeof exploreContent) =>
        and(
          inArray(content.contentType, ['neighbourhood_guide', 'area_overview']),
          eq(content.isLaunchContent, true),
        ),
    });

    // Count expert tips
    const expertTips = await db.query.exploreContent.findMany({
      where: (content: typeof exploreContent) =>
        and(
          inArray(content.contentType, ['expert_tip', 'how_to', 'educational']),
          eq(content.isLaunchContent, true),
        ),
    });

    // Count market insights
    const marketInsights = await db.query.exploreContent.findMany({
      where: (content: typeof exploreContent) =>
        and(
          inArray(content.contentType, ['market_insight', 'market_analysis', 'price_trends']),
          eq(content.isLaunchContent, true),
        ),
    });

    // Count service showcases
    const serviceShowcases = await db.query.exploreContent.findMany({
      where: (content: typeof exploreContent) =>
        and(
          inArray(content.contentType, ['service_showcase', 'service_demo']),
          eq(content.isLaunchContent, true),
        ),
    });

    // Count inspiration pieces
    const inspirationPieces = await db.query.exploreContent.findMany({
      where: (content: typeof exploreContent) =>
        and(
          inArray(content.contentType, ['inspiration', 'design_showcase', 'trend']),
          eq(content.isLaunchContent, true),
        ),
    });

    // Update all quotas
    await launchService.updateContentQuota('property_tours', propertyTours.length);
    await launchService.updateContentQuota('neighbourhood_guides', neighbourhoodGuides.length);
    await launchService.updateContentQuota('expert_tips', expertTips.length);
    await launchService.updateContentQuota('market_insights', marketInsights.length);
    await launchService.updateContentQuota('service_showcases', serviceShowcases.length);
    await launchService.updateContentQuota('inspiration_pieces', inspirationPieces.length);

    console.log('Content quotas synced from database');
  }

  /**
   * Get quota status for a specific content type
   * Requirements: 16.3, 16.5
   */
  async getQuotaStatus(contentType: string): Promise<ContentQuotaProgress | null> {
    const progress = await this.getQuotaProgress();
    return progress.find(p => p.contentType === contentType) || null;
  }

  /**
   * Check if a specific quota is met
   * Requirements: 16.3, 16.5
   */
  async isQuotaMet(contentType: string): Promise<boolean> {
    const status = await this.getQuotaStatus(contentType);
    return status?.isMet || false;
  }

  /**
   * Get list of unmet quotas
   * Requirements: 16.3, 16.5
   */
  async getUnmetQuotas(): Promise<ContentQuotaProgress[]> {
    const progress = await this.getQuotaProgress();
    return progress.filter(p => !p.isMet);
  }

  /**
   * Get content type mapping for a given content type
   */
  getQuotaCategory(contentType: string): string | null {
    return this.contentTypeMapping[contentType] || null;
  }

  /**
   * Add custom content type mapping
   */
  addContentTypeMapping(contentType: string, quotaCategory: string): void {
    this.contentTypeMapping[contentType] = quotaCategory;
  }

  /**
   * Get all content type mappings
   */
  getContentTypeMappings(): ContentTypeMapping {
    return { ...this.contentTypeMapping };
  }
}

export const contentQuotaService = new ContentQuotaService();
