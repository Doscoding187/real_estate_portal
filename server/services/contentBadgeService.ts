import { db } from '../db';
import { exploreContent, exploreShorts } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Content Badge Types
 * Maps to the badge_type column in explore_content and explore_shorts
 */
export type BadgeType = 'property' | 'expert_tip' | 'service' | 'finance' | 'design';

/**
 * Content Category Types
 * Maps to the content_category column
 */
export type ContentCategory = 'primary' | 'secondary' | 'tertiary';

/**
 * Content Badge Configuration
 * Defines visual properties for each badge type
 */
export interface ContentBadge {
  type: BadgeType;
  icon: string;
  color: string;
  label: string;
}

/**
 * Badge Configuration Map
 * Requirement 4.2, 4.3, 4.4, 4.5, 4.6: Define icons, colors, labels for each badge type
 */
export const BADGE_CONFIG: Record<BadgeType, ContentBadge> = {
  property: {
    type: 'property',
    icon: '🏠',
    color: 'primary',
    label: 'Property',
  },
  expert_tip: {
    type: 'expert_tip',
    icon: '💡',
    color: 'amber',
    label: 'Expert Tip',
  },
  service: {
    type: 'service',
    icon: '🛠️',
    color: 'blue',
    label: 'Service',
  },
  finance: {
    type: 'finance',
    icon: '💰',
    color: 'green',
    label: 'Finance',
  },
  design: {
    type: 'design',
    icon: '📐',
    color: 'purple',
    label: 'Design',
  },
};

/**
 * Content Type to Badge Type Mapping
 * Maps content types to their corresponding badge types
 */
const CONTENT_TYPE_TO_BADGE: Record<string, BadgeType> = {
  // Property-related content (Primary)
  property: 'property',
  property_tour: 'property',
  development_showcase: 'property',
  agent_walkthrough: 'property',
  listing: 'property',

  // Educational content (Secondary)
  educational: 'expert_tip',
  how_to: 'expert_tip',
  market_insight: 'expert_tip',
  trend: 'expert_tip',

  // Service-related content (Secondary)
  service: 'service',
  showcase: 'service',
  renovation: 'service',
  home_improvement: 'service',

  // Finance-related content (Secondary)
  finance: 'finance',
  investment: 'finance',
  bond: 'finance',
  mortgage: 'finance',
  affordability: 'finance',

  // Design-related content (Tertiary)
  design: 'design',
  architecture: 'design',
  interior: 'design',
  inspiration: 'design',
  decor: 'design',
};

/**
 * Content Category Mapping
 * Maps content types to their hierarchy category
 */
const CONTENT_TYPE_TO_CATEGORY: Record<string, ContentCategory> = {
  // Primary content (Properties & Developments)
  property: 'primary',
  property_tour: 'primary',
  development_showcase: 'primary',
  agent_walkthrough: 'primary',
  listing: 'primary',

  // Secondary content (Services, Finance, Education)
  educational: 'secondary',
  how_to: 'secondary',
  market_insight: 'secondary',
  service: 'secondary',
  showcase: 'secondary',
  renovation: 'secondary',
  home_improvement: 'secondary',
  finance: 'secondary',
  investment: 'secondary',
  bond: 'secondary',
  mortgage: 'secondary',
  affordability: 'secondary',

  // Tertiary content (Inspiration, Trends)
  design: 'tertiary',
  architecture: 'tertiary',
  interior: 'tertiary',
  inspiration: 'tertiary',
  decor: 'tertiary',
  trend: 'tertiary',
};

/**
 * Explore Content Interface
 * Represents content from explore_content or explore_shorts tables
 */
export interface ExploreContentItem {
  id: string | number;
  contentType: string;
  tags?: string[] | null;
  metadata?: any;
  badgeType?: string | null;
  contentCategory?: string | null;
}

/**
 * Content Badge Service
 * Determines and manages content type badges for the Explore feed
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */
export class ContentBadgeService {
  /**
   * Determine badge type for content based on content type and metadata
   * Requirement 4.1: Map content categories to badge types
   * Requirement 4.7: Handle multi-category content (primary badge only)
   *
   * @param content - The content item to determine badge for
   * @returns The badge type for the content
   */
  determineBadgeType(content: ExploreContentItem): BadgeType {
    // First, check if content already has a badge type assigned
    if (content.badgeType && this.isValidBadgeType(content.badgeType)) {
      return content.badgeType as BadgeType;
    }

    // Determine badge from content type
    const contentType = content.contentType?.toLowerCase() || '';

    // Direct mapping from content type
    if (CONTENT_TYPE_TO_BADGE[contentType]) {
      return CONTENT_TYPE_TO_BADGE[contentType];
    }

    // Check tags for additional context
    if (content.tags && Array.isArray(content.tags)) {
      const badgeFromTags = this.determineBadgeFromTags(content.tags);
      if (badgeFromTags) {
        return badgeFromTags;
      }
    }

    // Check metadata for partner category or other hints
    if (content.metadata) {
      const badgeFromMetadata = this.determineBadgeFromMetadata(content.metadata);
      if (badgeFromMetadata) {
        return badgeFromMetadata;
      }
    }

    // Default to property badge for primary content
    return 'property';
  }

  /**
   * Determine badge type from content tags
   * Requirement 4.7: Handle multi-category content (primary badge only)
   */
  private determineBadgeFromTags(tags: string[]): BadgeType | null {
    const lowerTags = tags.map(t => t.toLowerCase());

    // Priority order: property > finance > service > design > expert_tip
    // This ensures primary category takes precedence for multi-category content

    // Check for property-related tags
    const propertyTags = ['property', 'listing', 'for_sale', 'development', 'estate'];
    if (lowerTags.some(tag => propertyTags.some(pt => tag.includes(pt)))) {
      return 'property';
    }

    // Check for finance-related tags
    const financeTags = ['finance', 'investment', 'bond', 'mortgage', 'affordability'];
    if (lowerTags.some(tag => financeTags.some(ft => tag.includes(ft)))) {
      return 'finance';
    }

    // Check for service-related tags
    const serviceTags = ['service', 'renovation', 'security', 'maintenance', 'repair'];
    if (lowerTags.some(tag => serviceTags.some(st => tag.includes(st)))) {
      return 'service';
    }

    // Check for design-related tags
    const designTags = ['design', 'architecture', 'interior', 'decor', 'inspiration'];
    if (lowerTags.some(tag => designTags.some(dt => tag.includes(dt)))) {
      return 'design';
    }

    // Check for educational/expert tip tags
    const expertTags = ['educational', 'how_to', 'tips', 'advice', 'guide'];
    if (lowerTags.some(tag => expertTags.some(et => tag.includes(et)))) {
      return 'expert_tip';
    }

    return null;
  }

  /**
   * Determine badge type from content metadata
   * Requirement 4.7: Handle multi-category content (primary badge only)
   */
  private determineBadgeFromMetadata(metadata: any): BadgeType | null {
    if (!metadata || typeof metadata !== 'object') {
      return null;
    }

    // Check partner category in metadata
    const partnerCategory = metadata.partnerCategory?.toLowerCase();
    if (partnerCategory) {
      if (partnerCategory.includes('property')) return 'property';
      if (partnerCategory.includes('financial')) return 'finance';
      if (partnerCategory.includes('service')) return 'service';
      if (partnerCategory.includes('educator')) return 'expert_tip';
    }

    // Check content category hint
    const categoryHint = metadata.categoryHint?.toLowerCase();
    if (categoryHint) {
      if (categoryHint === 'property') return 'property';
      if (categoryHint === 'finance') return 'finance';
      if (categoryHint === 'service') return 'service';
      if (categoryHint === 'design') return 'design';
      if (categoryHint === 'education') return 'expert_tip';
    }

    return null;
  }

  /**
   * Get the primary category for content (primary/secondary/tertiary)
   * Used by Content Hierarchy Engine
   * Requirement 4.1: Map content categories to badge types
   */
  getPrimaryCategory(content: ExploreContentItem): ContentCategory {
    // Check if content already has a category assigned
    if (content.contentCategory && this.isValidContentCategory(content.contentCategory)) {
      return content.contentCategory as ContentCategory;
    }

    // Determine category from content type
    const contentType = content.contentType?.toLowerCase() || '';

    if (CONTENT_TYPE_TO_CATEGORY[contentType]) {
      return CONTENT_TYPE_TO_CATEGORY[contentType];
    }

    // Default to primary for property-related content
    const badgeType = this.determineBadgeType(content);

    if (badgeType === 'property') return 'primary';
    if (badgeType === 'finance' || badgeType === 'service' || badgeType === 'expert_tip')
      return 'secondary';
    if (badgeType === 'design') return 'tertiary';

    return 'primary';
  }

  /**
   * Get badge configuration for a specific badge type
   * Requirement 4.2, 4.3, 4.4, 4.5, 4.6: Return badge rendering configuration
   *
   * @param badgeType - The badge type to get configuration for
   * @returns The badge configuration with icon, color, and label
   */
  getBadgeConfig(badgeType: BadgeType): ContentBadge {
    return BADGE_CONFIG[badgeType];
  }

  /**
   * Get badge configuration for content
   * Combines badge type determination with configuration retrieval
   * Requirement 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
   */
  getBadgeForContent(content: ExploreContentItem): ContentBadge {
    const badgeType = this.determineBadgeType(content);
    return this.getBadgeConfig(badgeType);
  }

  /**
   * Get all available badge configurations
   * Useful for UI components that need to display all badge types
   */
  getAllBadgeConfigs(): ContentBadge[] {
    return Object.values(BADGE_CONFIG);
  }

  /**
   * Update content with badge type and category
   * Updates the badge_type and content_category columns in the database
   *
   * @param contentId - The content ID to update
   * @param isShort - Whether this is a short (video) or regular content
   */
  async updateContentBadge(contentId: string | number, isShort: boolean = false): Promise<void> {
    // Fetch the content
    const table = isShort ? exploreShorts : exploreContent;
    const content = await db.select().from(table).where(eq(table.id, contentId)).limit(1);

    if (content.length === 0) {
      throw new Error(`Content not found: ${contentId}`);
    }

    const contentItem = content[0] as ExploreContentItem;

    // Determine badge type and category
    const badgeType = this.determineBadgeType(contentItem);
    const contentCategory = this.getPrimaryCategory(contentItem);

    // Update the content
    await db
      .update(table)
      .set({
        badgeType,
        contentCategory,
      })
      .where(eq(table.id, contentId));
  }

  /**
   * Batch update badges for multiple content items
   * Useful for backfilling or bulk operations
   *
   * @param contentIds - Array of content IDs to update
   * @param isShort - Whether these are shorts (videos) or regular content
   */
  async batchUpdateContentBadges(
    contentIds: (string | number)[],
    isShort: boolean = false,
  ): Promise<void> {
    for (const contentId of contentIds) {
      try {
        await this.updateContentBadge(contentId, isShort);
      } catch (error) {
        console.error(`Failed to update badge for content ${contentId}:`, error);
        // Continue with other items even if one fails
      }
    }
  }

  /**
   * Validate if a string is a valid badge type
   */
  private isValidBadgeType(type: string): boolean {
    return ['property', 'expert_tip', 'service', 'finance', 'design'].includes(type);
  }

  /**
   * Validate if a string is a valid content category
   */
  private isValidContentCategory(category: string): boolean {
    return ['primary', 'secondary', 'tertiary'].includes(category);
  }

  /**
   * Get badge type from string (with validation)
   * Returns null if invalid
   */
  parseBadgeType(type: string): BadgeType | null {
    if (this.isValidBadgeType(type)) {
      return type as BadgeType;
    }
    return null;
  }

  /**
   * Get content category from string (with validation)
   * Returns null if invalid
   */
  parseContentCategory(category: string): ContentCategory | null {
    if (this.isValidContentCategory(category)) {
      return category as ContentCategory;
    }
    return null;
  }
}

// Export singleton instance
export const contentBadgeService = new ContentBadgeService();
