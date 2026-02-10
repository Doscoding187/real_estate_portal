import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../db';
import {
  exploreShorts,
  exploreInteractions,
  exploreHighlightTags,
  exploreUserPreferences,
} from '../../../drizzle/schema';
import { sql } from 'drizzle-orm';
import fc from 'fast-check';

/**
 * Feature: property-explore-shorts, Property 16: Platform integration
 * Validates: Requirements 12.1
 *
 * Property: For any property displayed in Explore Shorts, the system SHALL retrieve data from the internal listings database
 *
 * This test verifies that the database schema is correctly set up and can handle
 * all required operations for the Explore Shorts feature.
 *
 * TODO: Migrate to exploreContent table after unification complete
 */

describe.skip('Explore Shorts Database Schema [LEGACY - uses exploreShorts]', () => {
  beforeAll(async () => {
    // Ensure tables exist
    try {
      await db.execute(sql`SELECT 1 FROM explore_shorts LIMIT 1`);
      await db.execute(sql`SELECT 1 FROM explore_interactions LIMIT 1`);
      await db.execute(sql`SELECT 1 FROM explore_highlight_tags LIMIT 1`);
      await db.execute(sql`SELECT 1 FROM explore_user_preferences LIMIT 1`);
    } catch (error) {
      console.error('Tables not found. Run migration first:', error);
      throw error;
    }
  });

  afterAll(async () => {
    // Cleanup test data
    await db.execute(sql`DELETE FROM explore_interactions WHERE session_id LIKE 'test-%'`);
    await db.execute(sql`DELETE FROM explore_shorts WHERE title LIKE 'TEST:%'`);
    await db.execute(sql`DELETE FROM explore_highlight_tags WHERE tag_key LIKE 'test_%'`);
  });

  it('should have all required tables with correct structure', async () => {
    // Verify explore_shorts table structure
    const shortsColumns = await db.execute(sql`DESCRIBE explore_shorts`);
    const shortsColumnNames = shortsColumns.rows.map((row: any) => row.Field);

    expect(shortsColumnNames).toContain('id');
    expect(shortsColumnNames).toContain('listing_id');
    expect(shortsColumnNames).toContain('development_id');
    expect(shortsColumnNames).toContain('title');
    expect(shortsColumnNames).toContain('performance_score');
    expect(shortsColumnNames).toContain('boost_priority');
    expect(shortsColumnNames).toContain('view_count');
    expect(shortsColumnNames).toContain('is_published');

    // Verify explore_interactions table structure
    const interactionsColumns = await db.execute(sql`DESCRIBE explore_interactions`);
    const interactionsColumnNames = interactionsColumns.rows.map((row: any) => row.Field);

    expect(interactionsColumnNames).toContain('id');
    expect(interactionsColumnNames).toContain('short_id');
    expect(interactionsColumnNames).toContain('user_id');
    expect(interactionsColumnNames).toContain('interaction_type');
    expect(interactionsColumnNames).toContain('feed_type');
    expect(interactionsColumnNames).toContain('device_type');

    // Verify explore_highlight_tags table structure
    const tagsColumns = await db.execute(sql`DESCRIBE explore_highlight_tags`);
    const tagsColumnNames = tagsColumns.rows.map((row: any) => row.Field);

    expect(tagsColumnNames).toContain('id');
    expect(tagsColumnNames).toContain('tag_key');
    expect(tagsColumnNames).toContain('label');
    expect(tagsColumnNames).toContain('category');
    expect(tagsColumnNames).toContain('display_order');

    // Verify explore_user_preferences table structure
    const prefsColumns = await db.execute(sql`DESCRIBE explore_user_preferences`);
    const prefsColumnNames = prefsColumns.rows.map((row: any) => row.Field);

    expect(prefsColumnNames).toContain('id');
    expect(prefsColumnNames).toContain('user_id');
    expect(prefsColumnNames).toContain('preferred_locations');
    expect(prefsColumnNames).toContain('budget_min');
    expect(prefsColumnNames).toContain('budget_max');
  });

  it('should have correct indexes on explore_shorts table', async () => {
    const indexes = await db.execute(sql`SHOW INDEX FROM explore_shorts`);
    const indexNames = indexes.rows.map((row: any) => row.Key_name);

    expect(indexNames).toContain('idx_explore_shorts_listing_id');
    expect(indexNames).toContain('idx_explore_shorts_development_id');
    expect(indexNames).toContain('idx_explore_shorts_agent_id');
    expect(indexNames).toContain('idx_explore_shorts_performance_score');
    expect(indexNames).toContain('idx_explore_shorts_boost_priority');
  });

  it('should have correct indexes on explore_interactions table', async () => {
    const indexes = await db.execute(sql`SHOW INDEX FROM explore_interactions`);
    const indexNames = indexes.rows.map((row: any) => row.Key_name);

    expect(indexNames).toContain('idx_explore_interactions_short_id');
    expect(indexNames).toContain('idx_explore_interactions_user_id');
    expect(indexNames).toContain('idx_explore_interactions_session_id');
    expect(indexNames).toContain('idx_explore_interactions_type');
    expect(indexNames).toContain('idx_explore_interactions_timestamp');
  });

  /**
   * Property-Based Test: Schema integrity for random data
   *
   * For any valid explore short data, the database should accept and store it correctly
   */
  it('should accept and store valid explore shorts data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 255 }).map(s => `TEST: ${s}`),
          caption: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
          primaryMediaId: fc.integer({ min: 1, max: 1000 }),
          mediaIds: fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 1, maxLength: 10 }),
          highlights: fc.option(
            fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 4 }),
            { nil: null },
          ),
          performanceScore: fc
            .float({ min: 0, max: 100, noNaN: true })
            .map(n => Number(n.toFixed(2))),
          boostPriority: fc.integer({ min: 0, max: 100 }),
          isPublished: fc.boolean(),
          isFeatured: fc.boolean(),
        }),
        async shortData => {
          // Insert the short
          const result = await db.insert(exploreShorts).values({
            title: shortData.title,
            caption: shortData.caption,
            primaryMediaId: shortData.primaryMediaId,
            mediaIds: JSON.stringify(shortData.mediaIds),
            highlights: shortData.highlights ? JSON.stringify(shortData.highlights) : null,
            performanceScore: shortData.performanceScore.toString(),
            boostPriority: shortData.boostPriority,
            isPublished: shortData.isPublished ? 1 : 0,
            isFeatured: shortData.isFeatured ? 1 : 0,
          });

          // Verify it was inserted
          expect(result).toBeDefined();

          // Clean up
          await db.execute(sql`DELETE FROM explore_shorts WHERE title = ${shortData.title}`);
        },
      ),
      { numRuns: 100 }, // Run 100 iterations as specified in design
    );
  });

  /**
   * Property-Based Test: Interaction tracking integrity
   *
   * For any valid interaction data, the database should accept and store it correctly
   */
  it('should accept and store valid interaction data', async () => {
    // First create a test short to reference
    const testShort = await db.insert(exploreShorts).values({
      title: 'TEST: Interaction Test Short',
      primaryMediaId: 1,
      mediaIds: JSON.stringify([1, 2, 3]),
      performanceScore: '50.00',
      boostPriority: 0,
      isPublished: 1,
      isFeatured: 0,
    });

    const shortId = Number(testShort.insertId);

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          sessionId: fc.uuid().map(id => `test-${id}`),
          interactionType: fc.constantFrom(
            'impression',
            'view',
            'skip',
            'save',
            'share',
            'contact',
            'whatsapp',
            'book_viewing',
          ),
          duration: fc.option(fc.integer({ min: 0, max: 300 }), { nil: null }),
          feedType: fc.constantFrom(
            'recommended',
            'area',
            'category',
            'agent',
            'developer',
            'agency',
          ),
          deviceType: fc.constantFrom('mobile', 'tablet', 'desktop'),
        }),
        async interactionData => {
          // Insert the interaction
          const result = await db.insert(exploreInteractions).values({
            shortId,
            sessionId: interactionData.sessionId,
            interactionType: interactionData.interactionType,
            duration: interactionData.duration,
            feedType: interactionData.feedType,
            deviceType: interactionData.deviceType,
          });

          // Verify it was inserted
          expect(result).toBeDefined();
        },
      ),
      { numRuns: 100 },
    );

    // Clean up
    await db.execute(sql`DELETE FROM explore_shorts WHERE id = ${shortId}`);
  });

  /**
   * Property-Based Test: Highlight tags integrity
   *
   * For any valid highlight tag, the database should accept and store it correctly
   */
  it('should accept and store valid highlight tags', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tagKey: fc
            .string({ minLength: 1, maxLength: 50 })
            .map(s => `test_${s.replace(/[^a-z0-9_]/gi, '')}`),
          label: fc.string({ minLength: 1, maxLength: 100 }),
          icon: fc.option(fc.string({ maxLength: 50 }), { nil: null }),
          color: fc.option(
            fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`),
            { nil: null },
          ),
          category: fc.option(fc.constantFrom('status', 'feature', 'financial'), { nil: null }),
          displayOrder: fc.integer({ min: 0, max: 100 }),
        }),
        async tagData => {
          try {
            // Insert the tag
            const result = await db.insert(exploreHighlightTags).values({
              tagKey: tagData.tagKey,
              label: tagData.label,
              icon: tagData.icon,
              color: tagData.color,
              category: tagData.category,
              displayOrder: tagData.displayOrder,
              isActive: 1,
            });

            // Verify it was inserted
            expect(result).toBeDefined();

            // Clean up
            await db.execute(
              sql`DELETE FROM explore_highlight_tags WHERE tag_key = ${tagData.tagKey}`,
            );
          } catch (error: any) {
            // Skip duplicate key errors (expected in property testing)
            if (!error.message?.includes('Duplicate entry')) {
              throw error;
            }
          }
        },
      ),
      { numRuns: 50 }, // Fewer runs due to unique constraint
    );
  });

  /**
   * Property-Based Test: Foreign key constraints
   *
   * The database should enforce referential integrity
   */
  it('should enforce foreign key constraints', async () => {
    // Try to insert an interaction with non-existent short_id
    await expect(async () => {
      await db.insert(exploreInteractions).values({
        shortId: 999999999, // Non-existent ID
        sessionId: 'test-fk-constraint',
        interactionType: 'view',
        feedType: 'recommended',
        deviceType: 'mobile',
      });
    }).rejects.toThrow();
  });
});
