/**
 * Topics Navigation Service (BOOT-SAFE)
 *
 * IMPORTANT:
 * - Your current Drizzle schema exports do NOT include `contentTopics` or `exploreShorts`.
 * - This file MUST NOT import them, or the server will crash on boot.
 * - We use raw SQL so the app can boot on MySQL/TiDB even if tables are unfinished.
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

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

export interface Pagination {
  page: number;
  limit: number;
}

function safeJsonArray(v: any): string[] | null {
  try {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string' && v.trim().length > 0) return JSON.parse(v);
    return null;
  } catch {
    return null;
  }
}

export class TopicsService {
  /**
   * Get all active topics ordered by display order
   */
  async getAllTopics(): Promise<Topic[]> {
    try {
      const result = await db.execute(sql`
        SELECT *
        FROM topics
        WHERE is_active = 1
        ORDER BY COALESCE(display_order, 999999) ASC, name ASC
      `);

      return ((result as any).rows ?? []).map((t: any) => this.mapTopicFromDb(t));
    } catch (e: any) {
      console.warn('[TopicsService] getAllTopics fallback:', e?.message);
      return [];
    }
  }

  /**
   * Get a single topic by its slug
   */
  async getTopicBySlug(slug: string): Promise<Topic | null> {
    try {
      const result = await db.execute(sql`
        SELECT *
        FROM topics
        WHERE slug = ${slug} AND is_active = 1
        LIMIT 1
      `);

      const row = (result as any).rows?.[0];
      return row ? this.mapTopicFromDb(row) : null;
    } catch (e: any) {
      console.warn('[TopicsService] getTopicBySlug fallback:', e?.message);
      return null;
    }
  }

  /**
   * Get a single topic by ID
   */
  async getTopicById(topicId: string): Promise<Topic | null> {
    try {
      const result = await db.execute(sql`
        SELECT *
        FROM topics
        WHERE id = ${topicId}
        LIMIT 1
      `);

      const row = (result as any).rows?.[0];
      return row ? this.mapTopicFromDb(row) : null;
    } catch (e: any) {
      console.warn('[TopicsService] getTopicById fallback:', e?.message);
      return null;
    }
  }

  /**
   * Content count (BOOT-SAFE)
   * If content_topics table doesn't exist yet, returns 0.
   */
  async getTopicContentCount(topicId: string): Promise<number> {
    try {
      const result = await db.execute(sql`
        SELECT COUNT(*) AS cnt
        FROM content_topics
        WHERE topic_id = ${topicId}
      `);

      return Number((result as any).rows?.[0]?.cnt ?? 0);
    } catch {
      return 0;
    }
  }

  /**
   * Related topics (keeps your scoring behavior)
   */
  async getRelatedTopics(topicId: string, limit: number = 3): Promise<Topic[]> {
    const currentTopic = await this.getTopicById(topicId);
    if (!currentTopic) return [];

    const allTopics = await this.getAllTopics();

    const scored = allTopics
      .filter(t => t.id !== topicId)
      .map(topic => {
        let score = 0;

        if (currentTopic.contentTags && topic.contentTags) {
          const overlap = currentTopic.contentTags.filter(tag => topic.contentTags?.includes(tag));
          score += overlap.length * 3;
        }

        if (currentTopic.propertyFeatures && topic.propertyFeatures) {
          const overlap = currentTopic.propertyFeatures.filter(f =>
            topic.propertyFeatures?.includes(f),
          );
          score += overlap.length * 2;
        }

        if (currentTopic.partnerCategories && topic.partnerCategories) {
          const overlap = currentTopic.partnerCategories.filter(c =>
            topic.partnerCategories?.includes(c),
          );
          score += overlap.length * 2;
        }

        return { topic, score };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(x => x.topic);

    return scored;
  }

  async hasSufficientContent(topicId: string): Promise<boolean> {
    const count = await this.getTopicContentCount(topicId);
    return count >= 20;
  }

  /**
   * Content feed (BOOT-SAFE)
   *
   * We attempt:
   * - If content_topics mapping exists: join to explore_content
   * - Else: fallback to tag-based matching via JSON_CONTAINS on explore_content.tags
   */
  async getContentForTopic(
    topicId: string,
    pagination: Pagination,
    filters?: { contentTypes?: string[]; priceMin?: number; priceMax?: number },
  ): Promise<any[]> {
    const topic = await this.getTopicById(topicId);
    if (!topic) return [];

    const limit = Math.max(1, Math.min(100, pagination.limit));
    const offset = Math.max(0, (pagination.page - 1) * limit);

    const contentTypes = filters?.contentTypes ?? [];
    const priceMin = filters?.priceMin;
    const priceMax = filters?.priceMax;

    // 1) Try via content_topics mapping table
    try {
      const result = await db.execute(sql`
        SELECT ec.*
        FROM explore_content ec
        JOIN content_topics ct ON ct.content_id = ec.id
        WHERE ct.topic_id = ${topicId}
          AND ec.is_active = 1
          ${
            contentTypes.length
              ? sql`AND ec.content_type IN (${sql.join(
                  contentTypes.map(t => sql`${t}`),
                  sql`, `,
                )})`
              : sql``
          }
          ${priceMin != null ? sql`AND ec.price_min >= ${priceMin}` : sql``}
          ${priceMax != null ? sql`AND ec.price_max <= ${priceMax}` : sql``}
        ORDER BY ec.engagement_score DESC, ec.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);

      return (result as any).rows ?? [];
    } catch {
      // ignore and fall back
    }

    // 2) Fallback: match by tags/features/categories in explore_content JSON fields
    try {
      const tagConds: any[] = [];

      if (topic.contentTags?.length) {
        for (const tag of topic.contentTags) {
          tagConds.push(sql`JSON_CONTAINS(ec.tags, JSON_QUOTE(${tag}))`);
        }
      }

      if (topic.propertyFeatures?.length) {
        for (const feature of topic.propertyFeatures) {
          tagConds.push(
            sql`JSON_CONTAINS(ec.metadata, JSON_QUOTE(${feature}), '$.propertyFeatures')`,
          );
        }
      }

      if (topic.partnerCategories?.length) {
        for (const category of topic.partnerCategories) {
          tagConds.push(
            sql`JSON_CONTAINS(ec.metadata, JSON_QUOTE(${category}), '$.partnerCategory')`,
          );
        }
      }

      const result = await db.execute(sql`
        SELECT ec.*
        FROM explore_content ec
        WHERE ec.is_active = 1
          ${tagConds.length ? sql`AND (${sql.join(tagConds, sql` OR `)})` : sql``}
          ${
            contentTypes.length
              ? sql`AND ec.content_type IN (${sql.join(
                  contentTypes.map(t => sql`${t}`),
                  sql`, `,
                )})`
              : sql``
          }
          ${priceMin != null ? sql`AND ec.price_min >= ${priceMin}` : sql``}
          ${priceMax != null ? sql`AND ec.price_max <= ${priceMax}` : sql``}
        ORDER BY ec.engagement_score DESC, ec.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);

      return (result as any).rows ?? [];
    } catch {
      return [];
    }
  }

  /**
   * Shorts feed (BOOT-SAFE)
   *
   * Your schema does not export exploreShorts, so we treat explore_content videos/shorts as the shorts feed.
   */
  async getShortsForTopic(topicId: string, pagination: Pagination): Promise<any[]> {
    const limit = Math.max(1, Math.min(100, pagination.limit));
    const offset = Math.max(0, (pagination.page - 1) * limit);

    try {
      const result = await db.execute(sql`
        SELECT *
        FROM explore_content
        WHERE is_active = 1
          AND topic_id = ${topicId}
          AND content_type IN ('short', 'video')
        ORDER BY engagement_score DESC, created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);

      return (result as any).rows ?? [];
    } catch {
      return [];
    }
  }

  private mapTopicFromDb(dbTopic: any): Topic {
    return {
      id: String(dbTopic.id),
      slug: String(dbTopic.slug),
      name: String(dbTopic.name),
      description: dbTopic.description ?? null,
      icon: dbTopic.icon ?? null,
      displayOrder: dbTopic.display_order ?? dbTopic.displayOrder ?? null,
      isActive: dbTopic.is_active ?? dbTopic.isActive ?? null,
      contentTags: safeJsonArray(dbTopic.content_tags ?? dbTopic.contentTags),
      propertyFeatures: safeJsonArray(dbTopic.property_features ?? dbTopic.propertyFeatures),
      partnerCategories: safeJsonArray(dbTopic.partner_categories ?? dbTopic.partnerCategories),
      createdAt: dbTopic.created_at ?? dbTopic.createdAt ?? null,
    };
  }
}

export const topicsService = new TopicsService();
