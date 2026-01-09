import { db } from "../db";
import { topics, contentTopics, exploreContent, exploreShorts } from "../../drizzle/schema";
import { eq, and, inArray, sql, desc, asc } from "drizzle-orm";

export interface Topic {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  displayOrder: number | null;
  isActive: boolean | null;
  contentTags: string[] | null;
  propertyFeatures: string[] | null;
  partnerCategories: string[] | null;
  createdAt: string | null;
}

export interface TopicContentCount {
  topicId: string;
  count: number;
}

export interface Pagination {
  page: number;
  limit: number;
}

export interface TopicFeedRequest {
  topicId?: string;
  userId: string;
  pagination: Pagination;
  filters?: {
    contentTypes?: string[];
    priceMin?: number;
    priceMax?: number;
  };
}

/**
 * Topics Navigation Service
 * Manages intent-based navigation and feed reconfiguration
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 16.36
 */
export class TopicsService {
  /**
   * Get all active topics ordered by display order
   * Requirement 3.1: Display horizontal scrollable list of Topics
   */
  async getAllTopics(): Promise<Topic[]> {
    const result = await db
      .select()
      .from(topics)
      .where(eq(topics.isActive, true))
      .orderBy(asc(topics.displayOrder), asc(topics.name));

    return result.map(this.mapTopicFromDb);
  }

  /**
   * Get a single topic by its slug for URL routing
   * Requirement 3.1: Support URL routing with topic slugs
   */
  async getTopicBySlug(slug: string): Promise<Topic | null> {
    const result = await db
      .select()
      .from(topics)
      .where(and(
        eq(topics.slug, slug),
        eq(topics.isActive, true)
      ))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapTopicFromDb(result[0]);
  }

  /**
   * Get a single topic by its ID
   */
  async getTopicById(topicId: string): Promise<Topic | null> {
    const result = await db
      .select()
      .from(topics)
      .where(eq(topics.id, topicId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapTopicFromDb(result[0]);
  }

  /**
   * Get content count for a specific topic
   * Used to determine if topic has sufficient content (min 20 items)
   * Requirements: 3.6, 16.36
   */
  async getTopicContentCount(topicId: string): Promise<number> {
    // Count from content_topics mapping table
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(contentTopics)
      .where(eq(contentTopics.topicId, topicId));

    return result[0]?.count || 0;
  }

  /**
   * Get related topics for a given topic
   * Used when a topic has insufficient content
   * Requirement 3.6: Suggest related topics when content is insufficient
   */
  async getRelatedTopics(topicId: string, limit: number = 3): Promise<Topic[]> {
    const currentTopic = await this.getTopicById(topicId);
    if (!currentTopic) {
      return [];
    }

    // Find topics with overlapping tags, features, or categories
    const allTopics = await this.getAllTopics();
    
    const scoredTopics = allTopics
      .filter(t => t.id !== topicId)
      .map(topic => {
        let score = 0;
        
        // Score based on overlapping content tags
        if (currentTopic.contentTags && topic.contentTags) {
          const overlap = currentTopic.contentTags.filter(tag => 
            topic.contentTags?.includes(tag)
          );
          score += overlap.length * 3;
        }

        // Score based on overlapping property features
        if (currentTopic.propertyFeatures && topic.propertyFeatures) {
          const overlap = currentTopic.propertyFeatures.filter(feature => 
            topic.propertyFeatures?.includes(feature)
          );
          score += overlap.length * 2;
        }

        // Score based on overlapping partner categories
        if (currentTopic.partnerCategories && topic.partnerCategories) {
          const overlap = currentTopic.partnerCategories.filter(category => 
            topic.partnerCategories?.includes(category)
          );
          score += overlap.length * 2;
        }

        return { topic, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.topic);

    return scoredTopics;
  }

  /**
   * Check if a topic has sufficient content (minimum 20 items)
   * Requirements: 3.6, 16.36
   */
  async hasSufficientContent(topicId: string): Promise<boolean> {
    const count = await this.getTopicContentCount(topicId);
    return count >= 20;
  }

  /**
   * Map database topic to service interface
   */
  private mapTopicFromDb(dbTopic: any): Topic {
    return {
      id: dbTopic.id,
      slug: dbTopic.slug,
      name: dbTopic.name,
      description: dbTopic.description,
      icon: dbTopic.icon,
      displayOrder: dbTopic.displayOrder,
      isActive: dbTopic.isActive,
      contentTags: dbTopic.contentTags as string[] | null,
      propertyFeatures: dbTopic.propertyFeatures as string[] | null,
      partnerCategories: dbTopic.partnerCategories as string[] | null,
      createdAt: dbTopic.createdAt,
    };
  }

  /**
   * Get content for a specific topic with filtering
   * Filters by content_tags, property_features, partner_categories
   * Applies to all content types (videos, cards, neighbourhoods)
   * Requirements: 3.2, 3.3, 3.4
   */
  async getContentForTopic(
    topicId: string,
    pagination: Pagination,
    filters?: {
      contentTypes?: string[];
      priceMin?: number;
      priceMax?: number;
    }
  ): Promise<any[]> {
    const topic = await this.getTopicById(topicId);
    if (!topic) {
      return [];
    }

    const offset = (pagination.page - 1) * pagination.limit;

    // Get content IDs that are explicitly tagged with this topic
    const taggedContentIds = await db
      .select({ contentId: contentTopics.contentId })
      .from(contentTopics)
      .where(eq(contentTopics.topicId, topicId));

    const taggedIds = taggedContentIds.map(item => item.contentId);

    // Build filter conditions for explore_content
    const conditions: any[] = [eq(exploreContent.isActive, 1)];

    // If we have tagged content, include those IDs
    if (taggedIds.length > 0) {
      conditions.push(
        sql`${exploreContent.id} IN ${taggedIds.map(id => parseInt(id))}`
      );
    } else {
      // Otherwise, filter by topic's tags, features, and categories
      const tagConditions: any[] = [];

      // Filter by content tags
      if (topic.contentTags && topic.contentTags.length > 0) {
        for (const tag of topic.contentTags) {
          tagConditions.push(
            sql`JSON_CONTAINS(${exploreContent.tags}, JSON_QUOTE(${tag}))`
          );
        }
      }

      // Filter by property features (stored in metadata)
      if (topic.propertyFeatures && topic.propertyFeatures.length > 0) {
        for (const feature of topic.propertyFeatures) {
          tagConditions.push(
            sql`JSON_CONTAINS(${exploreContent.metadata}, JSON_QUOTE(${feature}), '$.propertyFeatures')`
          );
        }
      }

      // Filter by partner categories (stored in metadata)
      if (topic.partnerCategories && topic.partnerCategories.length > 0) {
        for (const category of topic.partnerCategories) {
          tagConditions.push(
            sql`JSON_CONTAINS(${exploreContent.metadata}, JSON_QUOTE(${category}), '$.partnerCategory')`
          );
        }
      }

      // Combine tag conditions with OR
      if (tagConditions.length > 0) {
        conditions.push(sql`(${sql.join(tagConditions, sql` OR `)})`);
      }
    }

    // Apply additional filters
    if (filters?.contentTypes && filters.contentTypes.length > 0) {
      conditions.push(inArray(exploreContent.contentType, filters.contentTypes));
    }

    if (filters?.priceMin !== undefined) {
      conditions.push(sql`${exploreContent.priceMin} >= ${filters.priceMin}`);
    }

    if (filters?.priceMax !== undefined) {
      conditions.push(sql`${exploreContent.priceMax} <= ${filters.priceMax}`);
    }

    // Query explore_content
    const content = await db
      .select()
      .from(exploreContent)
      .where(and(...conditions))
      .orderBy(desc(exploreContent.engagementScore), desc(exploreContent.createdAt))
      .limit(pagination.limit)
      .offset(offset);

    return content;
  }

  /**
   * Get shorts (videos) for a specific topic
   * Requirements: 3.2, 3.3, 3.4
   */
  async getShortsForTopic(
    topicId: string,
    pagination: Pagination,
    filters?: {
      contentTypes?: string[];
    }
  ): Promise<any[]> {
    const topic = await this.getTopicById(topicId);
    if (!topic) {
      return [];
    }

    const offset = (pagination.page - 1) * pagination.limit;

    // Build filter conditions
    const conditions: any[] = [
      eq(exploreShorts.isPublished, 1)
    ];

    // Filter by topic's tags and categories
    const tagConditions: any[] = [];

    // Filter by content type if specified
    if (filters?.contentTypes && filters.contentTypes.length > 0) {
      conditions.push(inArray(exploreShorts.contentType, filters.contentTypes as any));
    }

    // Filter by highlights that match topic tags
    if (topic.contentTags && topic.contentTags.length > 0) {
      for (const tag of topic.contentTags) {
        tagConditions.push(
          sql`JSON_CONTAINS(${exploreShorts.highlights}, JSON_QUOTE(${tag}))`
        );
      }
    }

    // Combine tag conditions with OR
    if (tagConditions.length > 0) {
      conditions.push(sql`(${sql.join(tagConditions, sql` OR `)})`);
    }

    // Query explore_shorts
    const shorts = await db
      .select()
      .from(exploreShorts)
      .where(and(...conditions))
      .orderBy(desc(exploreShorts.performanceScore), desc(exploreShorts.publishedAt))
      .limit(pagination.limit)
      .offset(offset);

    return shorts;
  }

  /**
   * Tag content with topics and calculate relevance scores
   * Creates content-topic mapping with relevance scoring
   * Requirement 3.2: Create tagContentWithTopics() for content-topic mapping
   */
  async tagContentWithTopics(
    contentId: string,
    topicIds: string[],
    contentData?: {
      tags?: string[];
      propertyFeatures?: string[];
      partnerCategory?: string;
    }
  ): Promise<void> {
    // Remove existing mappings for this content
    await db
      .delete(contentTopics)
      .where(eq(contentTopics.contentId, contentId));

    // Create new mappings with relevance scores
    for (const topicId of topicIds) {
      const topic = await this.getTopicById(topicId);
      if (!topic) continue;

      // Calculate relevance score based on matching tags, features, and categories
      const relevanceScore = this.calculateRelevanceScore(topic, contentData);

      await db.insert(contentTopics).values({
        contentId,
        topicId,
        relevanceScore: relevanceScore.toString(),
        createdAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Calculate relevance score for content-topic mapping
   * Score is based on matching tags, features, and categories
   * Requirement 3.2: Calculate relevance scores
   */
  private calculateRelevanceScore(
    topic: Topic,
    contentData?: {
      tags?: string[];
      propertyFeatures?: string[];
      partnerCategory?: string;
    }
  ): number {
    if (!contentData) return 1.0;

    let score = 0;
    let maxScore = 0;

    // Score based on matching content tags (weight: 3 points per match)
    if (topic.contentTags && contentData.tags) {
      maxScore += topic.contentTags.length * 3;
      const matches = topic.contentTags.filter(tag => 
        contentData.tags?.includes(tag)
      ).length;
      score += matches * 3;
    }

    // Score based on matching property features (weight: 2 points per match)
    if (topic.propertyFeatures && contentData.propertyFeatures) {
      maxScore += topic.propertyFeatures.length * 2;
      const matches = topic.propertyFeatures.filter(feature => 
        contentData.propertyFeatures?.includes(feature)
      ).length;
      score += matches * 2;
    }

    // Score based on matching partner category (weight: 5 points for exact match)
    if (topic.partnerCategories && contentData.partnerCategory) {
      maxScore += 5;
      if (topic.partnerCategories.includes(contentData.partnerCategory)) {
        score += 5;
      }
    }

    // Normalize score to 0-10 range
    if (maxScore === 0) return 1.0;
    
    const normalizedScore = (score / maxScore) * 10;
    return Math.max(0.1, Math.min(10.0, normalizedScore));
  }

  /**
   * Auto-tag content based on its attributes
   * Automatically suggests topics for content based on tags, features, and categories
   * Requirement 3.2: Intelligent topic suggestion
   */
  async suggestTopicsForContent(
    contentData: {
      tags?: string[];
      propertyFeatures?: string[];
      partnerCategory?: string;
    }
  ): Promise<{ topicId: string; relevanceScore: number }[]> {
    const allTopics = await this.getAllTopics();
    
    const scoredTopics = allTopics
      .map(topic => ({
        topicId: topic.id,
        relevanceScore: this.calculateRelevanceScore(topic, contentData)
      }))
      .filter(item => item.relevanceScore >= 3.0) // Only suggest topics with score >= 3.0
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    return scoredTopics;
  }

  /**
   * Get topic feed with insufficient content handling
   * Shows "Coming Soon" for topics with <20 items and suggests related topics
   * Requirements: 3.6, 16.36
   */
  async getTopicFeedWithFallback(
    topicId: string,
    pagination: Pagination,
    filters?: {
      contentTypes?: string[];
      priceMin?: number;
      priceMax?: number;
    }
  ): Promise<{
    topic: Topic | null;
    hasSufficientContent: boolean;
    content: any[];
    shorts: any[];
    relatedTopics: Topic[];
    message?: string;
  }> {
    const topic = await this.getTopicById(topicId);
    if (!topic) {
      return {
        topic: null,
        hasSufficientContent: false,
        content: [],
        shorts: [],
        relatedTopics: [],
        message: "Topic not found"
      };
    }

    const hasSufficientContent = await this.hasSufficientContent(topicId);

    if (!hasSufficientContent) {
      // Get related topics to suggest
      const relatedTopics = await this.getRelatedTopics(topicId, 3);
      
      return {
        topic,
        hasSufficientContent: false,
        content: [],
        shorts: [],
        relatedTopics,
        message: "Coming Soon - This topic doesn't have enough content yet. Check out these related topics!"
      };
    }

    // Get content for the topic
    const { content, shorts } = await this.getAllContentForTopic(topicId, pagination, filters);

    return {
      topic,
      hasSufficientContent: true,
      content,
      shorts,
      relatedTopics: [],
    };
  }

  /**
   * Get topic statistics including content count and readiness
   * Requirements: 3.6, 16.36
   */
  async getTopicStatistics(topicId: string): Promise<{
    topicId: string;
    contentCount: number;
    hasSufficientContent: boolean;
    minimumRequired: number;
    percentageComplete: number;
  }> {
    const contentCount = await this.getTopicContentCount(topicId);
    const minimumRequired = 20;
    const hasSufficientContent = contentCount >= minimumRequired;
    const percentageComplete = Math.min(100, (contentCount / minimumRequired) * 100);

    return {
      topicId,
      contentCount,
      hasSufficientContent,
      minimumRequired,
      percentageComplete,
    };
  }

  /**
   * Get all topics with their content counts and readiness status
   * Useful for admin dashboards to monitor topic health
   * Requirements: 3.6, 16.36
   */
  async getAllTopicsWithStatistics(): Promise<Array<{
    topic: Topic;
    statistics: {
      contentCount: number;
      hasSufficientContent: boolean;
      minimumRequired: number;
      percentageComplete: number;
    };
  }>> {
    const allTopics = await this.getAllTopics();
    
    const topicsWithStats = await Promise.all(
      allTopics.map(async (topic) => {
        const statistics = await this.getTopicStatistics(topic.id);
        return { topic, statistics };
      })
    );

    return topicsWithStats;
  }

  /**
   * Get all topics for a specific content item
   */
  async getTopicsForContent(contentId: string): Promise<Topic[]> {
    const mappings = await db
      .select({
        topicId: contentTopics.topicId,
        relevanceScore: contentTopics.relevanceScore,
      })
      .from(contentTopics)
      .where(eq(contentTopics.contentId, contentId))
      .orderBy(desc(contentTopics.relevanceScore));

    const topicIds = mappings.map(m => m.topicId);
    if (topicIds.length === 0) return [];

    const topicsData = await db
      .select()
      .from(topics)
      .where(inArray(topics.id, topicIds));

    return topicsData.map(this.mapTopicFromDb);
  }

  /**
   * Get all content types for a topic (combines explore_content and explore_shorts)
   * Requirements: 3.2, 3.4
   */
  async getAllContentForTopic(
    topicId: string,
    pagination: Pagination,
    filters?: {
      contentTypes?: string[];
      priceMin?: number;
      priceMax?: number;
    }
  ): Promise<{ content: any[]; shorts: any[] }> {
    const [content, shorts] = await Promise.all([
      this.getContentForTopic(topicId, pagination, filters),
      this.getShortsForTopic(topicId, { page: pagination.page, limit: Math.floor(pagination.limit / 2) }, filters)
    ]);

    return { content, shorts };
  }
}

export const topicsService = new TopicsService();
