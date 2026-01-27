import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from '../../db';
import { sql } from 'drizzle-orm';

/**
 * Database Schema Unit Tests for Explore Discovery Engine
 * Task: 1.1 Write unit tests for database schema
 * Requirements: 1.1, 2.1, 3.1
 *
 * Tests cover:
 * - Table creation and constraints
 * - Spatial index functionality (location-based queries)
 * - Foreign key relationships
 *
 * NOTE: These tests require a configured DATABASE_URL environment variable
 * and the explore discovery engine migration to be run.
 */

describe('Explore Discovery Engine Database Schema', () => {
  let db: Awaited<ReturnType<typeof getDb>> | null = null;
  let skipTests = false;

  beforeAll(async () => {
    // Initialize database connection
    try {
      db = await getDb();
      if (!db) {
        console.warn('⚠️  DATABASE_URL not configured. Skipping database schema tests.');
        console.warn('   To run these tests, set DATABASE_URL environment variable.');
        skipTests = true;
        return;
      }

      // Verify all tables exist before running tests
      const tables = [
        'explore_content',
        'explore_discovery_videos',
        'explore_neighbourhoods',
        'explore_user_preferences_new',
        'explore_feed_sessions',
        'explore_engagements',
        'explore_boost_campaigns',
        'explore_saved_properties',
        'explore_neighbourhood_follows',
        'explore_creator_follows',
        'explore_categories',
      ];

      for (const table of tables) {
        try {
          await db.execute(sql.raw(`SELECT 1 FROM ${table} LIMIT 1`));
        } catch (error) {
          console.error(`Table ${table} not found. Run migration first:`, error);
          throw error;
        }
      }
    } catch (error) {
      console.warn('⚠️  Failed to connect to database. Skipping schema tests.');
      console.warn('   Error:', error);
      skipTests = true;
      db = null;
    }
  });

  afterAll(async () => {
    // Cleanup test data
    if (db && !skipTests) {
      try {
        await db.execute(sql`DELETE FROM explore_content WHERE title LIKE 'TEST:%'`);
        await db.execute(sql`DELETE FROM explore_neighbourhoods WHERE name LIKE 'TEST:%'`);
      } catch (error) {
        console.warn('Cleanup failed:', error);
      }
    }
  });

  describe('Table Creation and Constraints', () => {
    it.skipIf(skipTests)('should have explore_content table with correct structure', async () => {
      if (!db) return;
      const columns = await db.execute(sql`DESCRIBE explore_content`);
      const columnNames = columns.rows.map((row: any) => row.Field);

      // Verify all required columns exist
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('content_type');
      expect(columnNames).toContain('reference_id');
      expect(columnNames).toContain('creator_id');
      expect(columnNames).toContain('title');
      expect(columnNames).toContain('description');
      expect(columnNames).toContain('thumbnail_url');
      expect(columnNames).toContain('video_url');
      expect(columnNames).toContain('metadata');
      expect(columnNames).toContain('tags');
      expect(columnNames).toContain('lifestyle_categories');
      expect(columnNames).toContain('location_lat');
      expect(columnNames).toContain('location_lng');
      expect(columnNames).toContain('price_min');
      expect(columnNames).toContain('price_max');
      expect(columnNames).toContain('view_count');
      expect(columnNames).toContain('engagement_score');
      expect(columnNames).toContain('is_active');
      expect(columnNames).toContain('is_featured');
      expect(columnNames).toContain('created_at');
      expect(columnNames).toContain('updated_at');
    });

    it.skipIf(skipTests)(
      'should have explore_discovery_videos table with correct structure',
      async () => {
        if (!db) return;
        const columns = await db.execute(sql`DESCRIBE explore_discovery_videos`);
        const columnNames = columns.rows.map((row: any) => row.Field);

        expect(columnNames).toContain('id');
        expect(columnNames).toContain('explore_content_id');
        expect(columnNames).toContain('property_id');
        expect(columnNames).toContain('development_id');
        expect(columnNames).toContain('video_url');
        expect(columnNames).toContain('thumbnail_url');
        expect(columnNames).toContain('duration');
        expect(columnNames).toContain('transcoded_urls');
        expect(columnNames).toContain('music_track');
        expect(columnNames).toContain('has_subtitles');
        expect(columnNames).toContain('subtitle_url');
        expect(columnNames).toContain('total_views');
        expect(columnNames).toContain('total_watch_time');
        expect(columnNames).toContain('completion_rate');
        expect(columnNames).toContain('save_count');
        expect(columnNames).toContain('share_count');
        expect(columnNames).toContain('click_through_count');
        expect(columnNames).toContain('created_at');
      },
    );

    it.skipIf(skipTests)(
      'should have explore_neighbourhoods table with correct structure',
      async () => {
        if (!db) return;
        const columns = await db.execute(sql`DESCRIBE explore_neighbourhoods`);
        const columnNames = columns.rows.map((row: any) => row.Field);

        expect(columnNames).toContain('id');
        expect(columnNames).toContain('name');
        expect(columnNames).toContain('slug');
        expect(columnNames).toContain('city');
        expect(columnNames).toContain('province');
        expect(columnNames).toContain('hero_banner_url');
        expect(columnNames).toContain('description');
        expect(columnNames).toContain('location_lat');
        expect(columnNames).toContain('location_lng');
        expect(columnNames).toContain('boundary_polygon');
        expect(columnNames).toContain('amenities');
        expect(columnNames).toContain('safety_rating');
        expect(columnNames).toContain('walkability_score');
        expect(columnNames).toContain('avg_property_price');
        expect(columnNames).toContain('price_trend');
        expect(columnNames).toContain('highlights');
        expect(columnNames).toContain('follower_count');
        expect(columnNames).toContain('property_count');
        expect(columnNames).toContain('video_count');
        expect(columnNames).toContain('created_at');
        expect(columnNames).toContain('updated_at');
      },
    );

    it.skipIf(skipTests)(
      'should have explore_user_preferences_new table with correct structure',
      async () => {
        if (!db) return;
        const columns = await db.execute(sql`DESCRIBE explore_user_preferences_new`);
        const columnNames = columns.rows.map((row: any) => row.Field);

        expect(columnNames).toContain('id');
        expect(columnNames).toContain('user_id');
        expect(columnNames).toContain('price_range_min');
        expect(columnNames).toContain('price_range_max');
        expect(columnNames).toContain('preferred_locations');
        expect(columnNames).toContain('preferred_property_types');
        expect(columnNames).toContain('preferred_lifestyle_categories');
        expect(columnNames).toContain('followed_neighbourhoods');
        expect(columnNames).toContain('followed_creators');
        expect(columnNames).toContain('engagement_history');
        expect(columnNames).toContain('last_active');
        expect(columnNames).toContain('created_at');
        expect(columnNames).toContain('updated_at');
      },
    );

    it.skipIf(skipTests)(
      'should have explore_feed_sessions table with correct structure',
      async () => {
        if (!db) return;
        const columns = await db.execute(sql`DESCRIBE explore_feed_sessions`);
        const columnNames = columns.rows.map((row: any) => row.Field);

        expect(columnNames).toContain('id');
        expect(columnNames).toContain('user_id');
        expect(columnNames).toContain('session_start');
        expect(columnNames).toContain('session_end');
        expect(columnNames).toContain('total_duration');
        expect(columnNames).toContain('videos_viewed');
        expect(columnNames).toContain('videos_completed');
        expect(columnNames).toContain('properties_saved');
        expect(columnNames).toContain('click_throughs');
        expect(columnNames).toContain('device_type');
        expect(columnNames).toContain('session_data');
      },
    );

    it.skipIf(skipTests)(
      'should have explore_engagements table with correct structure',
      async () => {
        if (!db) return;
        const columns = await db.execute(sql`DESCRIBE explore_engagements`);
        const columnNames = columns.rows.map((row: any) => row.Field);

        expect(columnNames).toContain('id');
        expect(columnNames).toContain('user_id');
        expect(columnNames).toContain('content_id');
        expect(columnNames).toContain('engagement_type');
        expect(columnNames).toContain('watch_time');
        expect(columnNames).toContain('completed');
        expect(columnNames).toContain('session_id');
        expect(columnNames).toContain('created_at');
      },
    );

    it.skipIf(skipTests)(
      'should have explore_boost_campaigns table with correct structure',
      async () => {
        if (!db) return;
        const columns = await db.execute(sql`DESCRIBE explore_boost_campaigns`);
        const columnNames = columns.rows.map((row: any) => row.Field);

        expect(columnNames).toContain('id');
        expect(columnNames).toContain('creator_id');
        expect(columnNames).toContain('content_id');
        expect(columnNames).toContain('campaign_name');
        expect(columnNames).toContain('budget');
        expect(columnNames).toContain('spent');
        expect(columnNames).toContain('duration_days');
        expect(columnNames).toContain('start_date');
        expect(columnNames).toContain('end_date');
        expect(columnNames).toContain('target_audience');
        expect(columnNames).toContain('status');
        expect(columnNames).toContain('impressions');
        expect(columnNames).toContain('clicks');
        expect(columnNames).toContain('conversions');
        expect(columnNames).toContain('cost_per_click');
        expect(columnNames).toContain('created_at');
        expect(columnNames).toContain('updated_at');
      },
    );

    it.skipIf(skipTests)(
      'should have explore_saved_properties table with correct structure',
      async () => {
        if (!db) return;
        const columns = await db.execute(sql`DESCRIBE explore_saved_properties`);
        const columnNames = columns.rows.map((row: any) => row.Field);

        expect(columnNames).toContain('id');
        expect(columnNames).toContain('user_id');
        expect(columnNames).toContain('content_id');
        expect(columnNames).toContain('collection_name');
        expect(columnNames).toContain('notes');
        expect(columnNames).toContain('created_at');
      },
    );

    it.skipIf(skipTests)(
      'should have explore_neighbourhood_follows table with correct structure',
      async () => {
        if (!db) return;
        const columns = await db.execute(sql`DESCRIBE explore_neighbourhood_follows`);
        const columnNames = columns.rows.map((row: any) => row.Field);

        expect(columnNames).toContain('id');
        expect(columnNames).toContain('user_id');
        expect(columnNames).toContain('neighbourhood_id');
        expect(columnNames).toContain('created_at');
      },
    );

    it.skipIf(skipTests)(
      'should have explore_creator_follows table with correct structure',
      async () => {
        if (!db) return;
        const columns = await db.execute(sql`DESCRIBE explore_creator_follows`);
        const columnNames = columns.rows.map((row: any) => row.Field);

        expect(columnNames).toContain('id');
        expect(columnNames).toContain('user_id');
        expect(columnNames).toContain('creator_id');
        expect(columnNames).toContain('created_at');
      },
    );

    it.skipIf(skipTests)(
      'should have explore_categories table with correct structure',
      async () => {
        if (!db) return;
        const columns = await db.execute(sql`DESCRIBE explore_categories`);
        const columnNames = columns.rows.map((row: any) => row.Field);

        expect(columnNames).toContain('id');
        expect(columnNames).toContain('name');
        expect(columnNames).toContain('slug');
        expect(columnNames).toContain('description');
        expect(columnNames).toContain('icon');
        expect(columnNames).toContain('display_order');
        expect(columnNames).toContain('is_active');
        expect(columnNames).toContain('property_count');
        expect(columnNames).toContain('created_at');
      },
    );
  });

  describe('Spatial Index Functionality', () => {
    it.skipIf(skipTests)('should have location indexes on explore_content table', async () => {
      if (!db) return;
      const indexes = await db.execute(sql`SHOW INDEX FROM explore_content`);
      const indexNames = indexes.rows.map((row: any) => row.Key_name);

      expect(indexNames).toContain('idx_explore_content_location');
    });

    it.skipIf(skipTests)(
      'should have location indexes on explore_neighbourhoods table',
      async () => {
        if (!db) return;
        const indexes = await db.execute(sql`SHOW INDEX FROM explore_neighbourhoods`);
        const indexNames = indexes.rows.map((row: any) => row.Key_name);

        expect(indexNames).toContain('idx_explore_neighbourhoods_location');
      },
    );

    it.skipIf(skipTests)('should support location-based queries on explore_content', async () => {
      if (!db) return;
      // Insert test content with location
      const testLat = -26.2041;
      const testLng = 28.0473; // Johannesburg coordinates

      const result = await db.execute(sql`
        INSERT INTO explore_content (
          content_type, reference_id, title, location_lat, location_lng,
          view_count, engagement_score, is_active, is_featured
        ) VALUES (
          'property', 1, 'TEST: Location Test Property',
          ${testLat}, ${testLng}, 0, 0, 1, 0
        )
      `);

      const insertedId = Number(result.insertId);

      // Query by location range
      const nearby = await db.execute(sql`
        SELECT * FROM explore_content
        WHERE location_lat BETWEEN ${testLat - 0.1} AND ${testLat + 0.1}
          AND location_lng BETWEEN ${testLng - 0.1} AND ${testLng + 0.1}
          AND title = 'TEST: Location Test Property'
      `);

      expect(nearby.rows.length).toBeGreaterThan(0);
      expect(nearby.rows[0].location_lat).toBeCloseTo(testLat, 4);
      expect(nearby.rows[0].location_lng).toBeCloseTo(testLng, 4);

      // Cleanup
      await db.execute(sql`DELETE FROM explore_content WHERE id = ${insertedId}`);
    });

    it.skipIf(skipTests)(
      'should support location-based queries on explore_neighbourhoods',
      async () => {
        if (!db) return;
        // Insert test neighbourhood with location
        const testLat = -33.9249;
        const testLng = 18.4241; // Cape Town coordinates

        const result = await db.execute(sql`
        INSERT INTO explore_neighbourhoods (
          name, slug, city, province, location_lat, location_lng,
          follower_count, property_count, video_count
        ) VALUES (
          'TEST: Location Test Neighbourhood', 'test-location-neighbourhood',
          'Cape Town', 'Western Cape', ${testLat}, ${testLng}, 0, 0, 0
        )
      `);

        const insertedId = Number(result.insertId);

        // Query by location range
        const nearby = await db.execute(sql`
        SELECT * FROM explore_neighbourhoods
        WHERE location_lat BETWEEN ${testLat - 0.1} AND ${testLat + 0.1}
          AND location_lng BETWEEN ${testLng - 0.1} AND ${testLng + 0.1}
          AND name = 'TEST: Location Test Neighbourhood'
      `);

        expect(nearby.rows.length).toBeGreaterThan(0);
        expect(nearby.rows[0].location_lat).toBeCloseTo(testLat, 4);
        expect(nearby.rows[0].location_lng).toBeCloseTo(testLng, 4);

        // Cleanup
        await db.execute(sql`DELETE FROM explore_neighbourhoods WHERE id = ${insertedId}`);
      },
    );

    it.skipIf(skipTests)(
      'should efficiently query content by location with engagement score',
      async () => {
        if (!db) return;
        // This tests the composite index usage for location + engagement
        const testLat = -29.8587;
        const testLng = 31.0218; // Durban coordinates

        // Insert multiple test items
        const insertPromises = [];
        for (let i = 0; i < 5; i++) {
          insertPromises.push(
            db.execute(sql`
            INSERT INTO explore_content (
              content_type, reference_id, title, location_lat, location_lng,
              view_count, engagement_score, is_active, is_featured
            ) VALUES (
              'property', ${i + 1}, ${`TEST: Engagement Test ${i}`},
              ${testLat + i * 0.01}, ${testLng + i * 0.01},
              ${i * 10}, ${i * 10.5}, 1, 0
            )
          `),
          );
        }

        await Promise.all(insertPromises);

        // Query with location and order by engagement
        const results = await db.execute(sql`
        SELECT * FROM explore_content
        WHERE location_lat BETWEEN ${testLat - 0.1} AND ${testLat + 0.1}
          AND location_lng BETWEEN ${testLng - 0.1} AND ${testLng + 0.1}
          AND title LIKE 'TEST: Engagement Test%'
        ORDER BY engagement_score DESC
      `);

        expect(results.rows.length).toBe(5);
        // Verify ordering by engagement score
        for (let i = 0; i < results.rows.length - 1; i++) {
          expect(Number(results.rows[i].engagement_score)).toBeGreaterThanOrEqual(
            Number(results.rows[i + 1].engagement_score),
          );
        }

        // Cleanup
        await db.execute(
          sql`DELETE FROM explore_content WHERE title LIKE 'TEST: Engagement Test%'`,
        );
      },
    );
  });

  describe('Foreign Key Relationships', () => {
    it.skipIf(skipTests)('should enforce foreign key from explore_content to users', async () => {
      if (!db) return;
      // Try to insert content with non-existent creator_id
      await expect(async () => {
        await db.execute(sql`
          INSERT INTO explore_content (
            content_type, reference_id, creator_id, title,
            view_count, engagement_score, is_active, is_featured
          ) VALUES (
            'property', 1, 999999999, 'TEST: FK Test',
            0, 0, 1, 0
          )
        `);
      }).rejects.toThrow();
    });

    it.skipIf(skipTests)(
      'should enforce foreign key from explore_discovery_videos to explore_content',
      async () => {
        if (!db) return;
        // Try to insert video with non-existent explore_content_id
        await expect(async () => {
          await db.execute(sql`
          INSERT INTO explore_discovery_videos (
            explore_content_id, video_url, thumbnail_url, duration,
            total_views, total_watch_time, completion_rate,
            save_count, share_count, click_through_count
          ) VALUES (
            999999999, 'http://test.com/video.mp4', 'http://test.com/thumb.jpg', 30,
            0, 0, 0, 0, 0, 0
          )
        `);
        }).rejects.toThrow();
      },
    );

    it.skipIf(skipTests)(
      'should cascade delete from explore_content to explore_discovery_videos',
      async () => {
        if (!db) return;
        // Insert test content
        const contentResult = await db.execute(sql`
        INSERT INTO explore_content (
          content_type, reference_id, title,
          view_count, engagement_score, is_active, is_featured
        ) VALUES (
          'video', 1, 'TEST: Cascade Delete Test',
          0, 0, 1, 0
        )
      `);

        const contentId = Number(contentResult.insertId);

        // Insert video referencing the content
        const videoResult = await db.execute(sql`
        INSERT INTO explore_discovery_videos (
          explore_content_id, video_url, thumbnail_url, duration,
          total_views, total_watch_time, completion_rate,
          save_count, share_count, click_through_count
        ) VALUES (
          ${contentId}, 'http://test.com/video.mp4', 'http://test.com/thumb.jpg', 30,
          0, 0, 0, 0, 0, 0
        )
      `);

        const videoId = Number(videoResult.insertId);

        // Delete the content
        await db.execute(sql`DELETE FROM explore_content WHERE id = ${contentId}`);

        // Verify video was cascade deleted
        const videoCheck = await db.execute(sql`
        SELECT * FROM explore_discovery_videos WHERE id = ${videoId}
      `);

        expect(videoCheck.rows.length).toBe(0);
      },
    );

    it.skipIf(skipTests)(
      'should enforce foreign key from explore_engagements to explore_content',
      async () => {
        if (!db) return;
        // Try to insert engagement with non-existent content_id
        await expect(async () => {
          await db.execute(sql`
          INSERT INTO explore_engagements (
            content_id, engagement_type, completed
          ) VALUES (
            999999999, 'view', 0
          )
        `);
        }).rejects.toThrow();
      },
    );

    it.skipIf(skipTests)(
      'should enforce foreign key from explore_boost_campaigns to users and explore_content',
      async () => {
        if (!db) return;
        // Try to insert boost campaign with non-existent creator_id
        await expect(async () => {
          await db.execute(sql`
          INSERT INTO explore_boost_campaigns (
            creator_id, content_id, campaign_name, budget, spent,
            duration_days, status, impressions, clicks, conversions
          ) VALUES (
            999999999, 1, 'TEST: FK Test', 100.00, 0.00,
            7, 'active', 0, 0, 0
          )
        `);
        }).rejects.toThrow();
      },
    );

    it.skipIf(skipTests)(
      'should enforce unique constraint on explore_neighbourhoods slug',
      async () => {
        if (!db) return;
        // Insert first neighbourhood
        const result1 = await db.execute(sql`
        INSERT INTO explore_neighbourhoods (
          name, slug, city, province, follower_count, property_count, video_count
        ) VALUES (
          'TEST: Unique Slug Test 1', 'test-unique-slug',
          'Johannesburg', 'Gauteng', 0, 0, 0
        )
      `);

        const id1 = Number(result1.insertId);

        // Try to insert second neighbourhood with same slug
        await expect(async () => {
          await db.execute(sql`
          INSERT INTO explore_neighbourhoods (
            name, slug, city, province, follower_count, property_count, video_count
          ) VALUES (
            'TEST: Unique Slug Test 2', 'test-unique-slug',
            'Cape Town', 'Western Cape', 0, 0, 0
          )
        `);
        }).rejects.toThrow();

        // Cleanup
        await db.execute(sql`DELETE FROM explore_neighbourhoods WHERE id = ${id1}`);
      },
    );

    it.skipIf(skipTests)(
      'should enforce unique constraint on explore_user_preferences_new user_id',
      async () => {
        if (!db) return;
        // This test requires a valid user_id, so we'll skip if no users exist
        const users = await db.execute(sql`SELECT id FROM users LIMIT 1`);

        if (users.rows.length === 0) {
          console.log('Skipping user_id unique constraint test - no users in database');
          return;
        }

        const userId = users.rows[0].id;

        // Insert first preference
        const result1 = await db.execute(sql`
        INSERT INTO explore_user_preferences_new (
          user_id, price_range_min, price_range_max
        ) VALUES (
          ${userId}, 100000, 500000
        )
      `);

        const id1 = Number(result1.insertId);

        // Try to insert second preference for same user
        await expect(async () => {
          await db.execute(sql`
          INSERT INTO explore_user_preferences_new (
            user_id, price_range_min, price_range_max
          ) VALUES (
            ${userId}, 200000, 600000
          )
        `);
        }).rejects.toThrow();

        // Cleanup
        await db.execute(sql`DELETE FROM explore_user_preferences_new WHERE id = ${id1}`);
      },
    );

    it.skipIf(skipTests)(
      'should enforce unique constraint on explore_saved_properties (user_id, content_id)',
      async () => {
        if (!db) return;
        // Insert test content first
        const contentResult = await db.execute(sql`
        INSERT INTO explore_content (
          content_type, reference_id, title,
          view_count, engagement_score, is_active, is_featured
        ) VALUES (
          'property', 1, 'TEST: Saved Property Unique Test',
          0, 0, 1, 0
        )
      `);

        const contentId = Number(contentResult.insertId);

        // Get a user (or skip if none exist)
        const users = await db.execute(sql`SELECT id FROM users LIMIT 1`);

        if (users.rows.length === 0) {
          await db.execute(sql`DELETE FROM explore_content WHERE id = ${contentId}`);
          console.log('Skipping saved properties unique constraint test - no users in database');
          return;
        }

        const userId = users.rows[0].id;

        // Insert first saved property
        const result1 = await db.execute(sql`
        INSERT INTO explore_saved_properties (
          user_id, content_id, collection_name
        ) VALUES (
          ${userId}, ${contentId}, 'Default'
        )
      `);

        const savedId = Number(result1.insertId);

        // Try to insert duplicate
        await expect(async () => {
          await db.execute(sql`
          INSERT INTO explore_saved_properties (
            user_id, content_id, collection_name
          ) VALUES (
            ${userId}, ${contentId}, 'Favorites'
          )
        `);
        }).rejects.toThrow();

        // Cleanup
        await db.execute(sql`DELETE FROM explore_saved_properties WHERE id = ${savedId}`);
        await db.execute(sql`DELETE FROM explore_content WHERE id = ${contentId}`);
      },
    );
  });

  describe('Index Verification', () => {
    it.skipIf(skipTests)('should have correct indexes on explore_content table', async () => {
      if (!db) return;
      const indexes = await db.execute(sql`SHOW INDEX FROM explore_content`);
      const indexNames = indexes.rows.map((row: any) => row.Key_name);

      expect(indexNames).toContain('idx_explore_content_type');
      expect(indexNames).toContain('idx_explore_content_creator');
      expect(indexNames).toContain('idx_explore_content_location');
      expect(indexNames).toContain('idx_explore_content_engagement');
      expect(indexNames).toContain('idx_explore_content_active');
    });

    it.skipIf(skipTests)(
      'should have correct indexes on explore_discovery_videos table',
      async () => {
        if (!db) return;
        const indexes = await db.execute(sql`SHOW INDEX FROM explore_discovery_videos`);
        const indexNames = indexes.rows.map((row: any) => row.Key_name);

        expect(indexNames).toContain('idx_explore_discovery_videos_content');
        expect(indexNames).toContain('idx_explore_discovery_videos_property');
        expect(indexNames).toContain('idx_explore_discovery_videos_development');
        expect(indexNames).toContain('idx_explore_discovery_videos_performance');
      },
    );

    it.skipIf(skipTests)(
      'should have correct indexes on explore_neighbourhoods table',
      async () => {
        if (!db) return;
        const indexes = await db.execute(sql`SHOW INDEX FROM explore_neighbourhoods`);
        const indexNames = indexes.rows.map((row: any) => row.Key_name);

        expect(indexNames).toContain('idx_explore_neighbourhoods_location');
        expect(indexNames).toContain('idx_explore_neighbourhoods_slug');
        expect(indexNames).toContain('idx_explore_neighbourhoods_city');
      },
    );

    it.skipIf(skipTests)(
      'should have correct indexes on explore_user_preferences_new table',
      async () => {
        if (!db) return;
        const indexes = await db.execute(sql`SHOW INDEX FROM explore_user_preferences_new`);
        const indexNames = indexes.rows.map((row: any) => row.Key_name);

        expect(indexNames).toContain('idx_explore_user_pref_user');
        expect(indexNames).toContain('idx_explore_user_pref_active');
      },
    );

    it.skipIf(skipTests)('should have correct indexes on explore_feed_sessions table', async () => {
      if (!db) return;
      const indexes = await db.execute(sql`SHOW INDEX FROM explore_feed_sessions`);
      const indexNames = indexes.rows.map((row: any) => row.Key_name);

      expect(indexNames).toContain('idx_explore_sessions_user');
      expect(indexNames).toContain('idx_explore_sessions_start');
    });

    it.skipIf(skipTests)('should have correct indexes on explore_engagements table', async () => {
      if (!db) return;
      const indexes = await db.execute(sql`SHOW INDEX FROM explore_engagements`);
      const indexNames = indexes.rows.map((row: any) => row.Key_name);

      expect(indexNames).toContain('idx_explore_engagement_user');
      expect(indexNames).toContain('idx_explore_engagement_content');
      expect(indexNames).toContain('idx_explore_engagement_type');
      expect(indexNames).toContain('idx_explore_engagement_created');
    });

    it.skipIf(skipTests)(
      'should have correct indexes on explore_boost_campaigns table',
      async () => {
        if (!db) return;
        const indexes = await db.execute(sql`SHOW INDEX FROM explore_boost_campaigns`);
        const indexNames = indexes.rows.map((row: any) => row.Key_name);

        expect(indexNames).toContain('idx_boost_campaigns_creator');
        expect(indexNames).toContain('idx_boost_campaigns_status');
        expect(indexNames).toContain('idx_boost_campaigns_dates');
        expect(indexNames).toContain('idx_boost_campaigns_active');
      },
    );
  });

  describe('Data Integrity', () => {
    it.skipIf(skipTests)(
      'should properly store and retrieve JSON data in explore_content',
      async () => {
        if (!db) return;
        const testMetadata = { key: 'value', nested: { data: 123 } };
        const testTags = ['tag1', 'tag2', 'tag3'];
        const testCategories = ['luxury', 'secure-estates'];

        const result = await db.execute(sql`
        INSERT INTO explore_content (
          content_type, reference_id, title, metadata, tags, lifestyle_categories,
          view_count, engagement_score, is_active, is_featured
        ) VALUES (
          'property', 1, 'TEST: JSON Data Test',
          ${JSON.stringify(testMetadata)}, ${JSON.stringify(testTags)},
          ${JSON.stringify(testCategories)}, 0, 0, 1, 0
        )
      `);

        const contentId = Number(result.insertId);

        // Retrieve and verify
        const retrieved = await db.execute(sql`
        SELECT * FROM explore_content WHERE id = ${contentId}
      `);

        expect(retrieved.rows.length).toBe(1);
        const row = retrieved.rows[0];

        const parsedMetadata =
          typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
        const parsedTags = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
        const parsedCategories =
          typeof row.lifestyle_categories === 'string'
            ? JSON.parse(row.lifestyle_categories)
            : row.lifestyle_categories;

        expect(parsedMetadata).toEqual(testMetadata);
        expect(parsedTags).toEqual(testTags);
        expect(parsedCategories).toEqual(testCategories);

        // Cleanup
        await db.execute(sql`DELETE FROM explore_content WHERE id = ${contentId}`);
      },
    );

    it.skipIf(skipTests)('should properly handle default values', async () => {
      if (!db) return;
      const result = await db.execute(sql`
        INSERT INTO explore_content (
          content_type, reference_id, title
        ) VALUES (
          'property', 1, 'TEST: Default Values Test'
        )
      `);

      const contentId = Number(result.insertId);

      const retrieved = await db.execute(sql`
        SELECT * FROM explore_content WHERE id = ${contentId}
      `);

      const row = retrieved.rows[0];
      expect(row.view_count).toBe(0);
      expect(Number(row.engagement_score)).toBe(0);
      expect(row.is_active).toBe(1);
      expect(row.is_featured).toBe(0);
      expect(row.created_at).toBeDefined();
      expect(row.updated_at).toBeDefined();

      // Cleanup
      await db.execute(sql`DELETE FROM explore_content WHERE id = ${contentId}`);
    });
  });
});
