import {
  existsSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function countPhysicalTableDefinitions(
  source: string,
  physicalTableName: string,
): number {
  const escapedName = physicalTableName.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  );

  return (
    source.match(
      new RegExp(
        `mysqlTable\\(\\s*['"]${escapedName}['"]`,
        'g',
      ),
    ) ?? []
  ).length;
}

describe('database canonical model authority', () => {
  it('retires the duplicate root listing schema', () => {
    expect(
      existsSync(path.join(ROOT, 'drizzle/listing-schema.ts')),
    ).toBe(false);
  });

  it('retires the unadopted economic actor abstraction', () => {
    expect(
      existsSync(path.join(ROOT, 'drizzle/schema/economicActors.ts')),
    ).toBe(false);

    const schemaIndex = readRepoFile('drizzle/schema/index.ts');
    const runtimeCapabilities = readRepoFile(
      'server/services/runtimeSchemaCapabilities.ts',
    );
    const cleanupScript = readRepoFile('cleanup-production-data.ts');

    expect(schemaIndex).not.toContain(
      "export * from './economicActors';",
    );

    const retiredRuntimeAuthority = [
      'economicActorsReady',
      'economicActorsDetails',
      'economicActorsTable',
      "'economic_actors'",
    ];

    for (const authorityName of retiredRuntimeAuthority) {
      expect(runtimeCapabilities).not.toContain(authorityName);
    }

    expect(cleanupScript).not.toContain(
      'DELETE FROM agent_profiles',
    );
  });

  it('retires inactive analytics and affordability models while preserving recent searches', () => {
    const analyticsSchema = readRepoFile('drizzle/schema/analytics.ts');
    const referralSchema = readRepoFile('drizzle/schema/referrals.ts');
    const demandScoringService = readRepoFile(
      'server/services/demandScoringService.ts',
    );

    expect(analyticsSchema).not.toContain(
      "mysqlTable(\n  'location_analytics_events'",
    );
    expect(analyticsSchema).not.toContain(
      'export const locationAnalyticsEvents',
    );

    expect(referralSchema).not.toContain(
      "mysqlTable(\n  'affordability_config'",
    );
    expect(referralSchema).not.toContain(
      'export const affordabilityConfig',
    );
    expect(referralSchema).not.toContain(
      'AFFORDABILITY_CONFIG_VALUE_TYPE_VALUES',
    );

    expect(
      countPhysicalTableDefinitions(
        analyticsSchema,
        'recent_searches',
      ),
    ).toBe(1);

    expect(demandScoringService).not.toContain(
      'locationAnalyticsEvents',
    );
  });

  it('matches the committed launch table inventory and Explore classification', () => {
    const inventory = JSON.parse(
      readRepoFile(
        'drizzle/schema/canonical-model-inventory.json',
      ),
    ) as {
      tableCount: number;
      tables: string[];
      explore: {
        primaryLaunchAuthority: string[];
        activeLaunchAuthority: string[];
        compatibilityAuthority: string[];
        bootstrapPresent: string[];
        bootstrapGaps: string[];
      };
    };

    const schemaDirectory = path.join(ROOT, 'drizzle/schema');

    const modularSchemaSource = readdirSync(schemaDirectory)
      .filter(fileName => fileName.endsWith('.ts'))
      .map(fileName =>
        readFileSync(
          path.join(schemaDirectory, fileName),
          'utf8',
        ),
      )
      .join('\n');

    const modelTables = Array.from(
      modularSchemaSource.matchAll(
        /mysqlTable\(\s*['"]([^'"]+)['"]/g,
      ),
      match => String(match[1]),
    ).sort();

    expect(inventory.tableCount).toBe(180);
    expect(inventory.tables).toHaveLength(180);
    expect(new Set(inventory.tables).size).toBe(180);
    expect([...inventory.tables].sort()).toEqual(
      inventory.tables,
    );
    expect(modelTables).toEqual(inventory.tables);

    expect(inventory.explore.primaryLaunchAuthority).toEqual([
      'explore_content',
    ]);

    expect(inventory.explore.activeLaunchAuthority).toEqual([
      'explore_discovery_videos',
      'explore_engagements',
      'explore_feed_sessions',
      'explore_partners',
      'topics',
    ]);

    expect(inventory.explore.compatibilityAuthority).toEqual([
      'content_topics',
      'explore_shorts',
    ]);

    expect(inventory.explore.bootstrapPresent).toEqual([
      'content_topics',
      'explore_content',
      'explore_partners',
      'explore_shorts',
      'topics',
    ]);

    expect(inventory.explore.bootstrapGaps).toEqual([
      'explore_discovery_videos',
      'explore_engagements',
      'explore_feed_sessions',
    ]);
  });

  it('aligns Explore compatibility models to active baseline shapes', () => {
    const exploreSchema = readRepoFile(
      'drizzle/schema/explore.ts',
    );

    expect(exploreSchema).toContain(
      "contentId: varchar('content_id', { length: 36 }).notNull()",
    );
    expect(exploreSchema).toContain(
      "relevanceScore: decimal('relevance_score'",
    );
    expect(exploreSchema).toContain(
      "index('idx_content_topic').on(t.topicId)",
    );
    expect(exploreSchema).not.toContain(
      "index('idx_ct_content')",
    );
    expect(exploreSchema).not.toContain(
      "index('idx_ct_topic')",
    );

    const requiredShortColumns = [
      "listingId: int('listing_id')",
      "developmentId: int('development_id')",
      "agentId: int('agent_id')",
      "agencyId: int('agency_id')",
      "primaryMediaId: int('primary_media_id').notNull()",
      "mediaIds: json('media_ids').notNull()",
      "performanceScore: decimal('performance_score'",
      "viewCount: int('view_count').default(0).notNull()",
      "saveCount: int('save_count').default(0).notNull()",
      "shareCount: int('share_count').default(0).notNull()",
      "isPublished: tinyint('is_published').default(1).notNull()",
      "publishedAt: timestamp('published_at')",
    ];

    for (const requiredColumn of requiredShortColumns) {
      expect(exploreSchema).toContain(requiredColumn);
    }

    const exploreShortsBlock = exploreSchema.slice(
      exploreSchema.indexOf('export const exploreShorts ='),
    );

    expect(exploreShortsBlock).not.toContain(
      "exploreContentId: int('explore_content_id')",
    );
  });

  it('defines each canonical listing physical table once', () => {
    const schemaDirectory = path.join(ROOT, 'drizzle/schema');

    const modularSchemaSource = readdirSync(schemaDirectory)
      .filter(fileName => fileName.endsWith('.ts'))
      .map(fileName =>
        readFileSync(
          path.join(schemaDirectory, fileName),
          'utf8',
        ),
      )
      .join('\n');

    const listingTables = [
      'listings',
      'listing_analytics',
      'listing_approval_queue',
      'listing_leads',
      'listing_media',
      'listing_settings',
      'listing_viewings',
    ];

    for (const physicalTableName of listingTables) {
      expect(
        countPhysicalTableDefinitions(
          modularSchemaSource,
          physicalTableName,
        ),
        physicalTableName,
      ).toBe(1);
    }
  });

  it('exports the canonical listing and Google Places modules', () => {
    const schemaIndex = readRepoFile('drizzle/schema/index.ts');

    expect(schemaIndex).toContain("export * from './listings';");
    expect(schemaIndex).toContain(
      "export * from './googlePlacesMonitoring';",
    );
  });

  it('models all active Google Places monitoring tables', () => {
    const monitoringSchema = readRepoFile(
      'drizzle/schema/googlePlacesMonitoring.ts',
    );

    const tableNames = [
      'google_places_api_logs',
      'google_places_api_daily_summary',
      'google_places_api_alerts',
      'google_places_api_config',
    ];

    for (const physicalTableName of tableNames) {
      expect(
        countPhysicalTableDefinitions(
          monitoringSchema,
          physicalTableName,
        ),
        physicalTableName,
      ).toBe(1);
    }
  });

  it('preserves the active Google Places migration indexes and constraints', () => {
    const monitoringSchema = readRepoFile(
      'drizzle/schema/googlePlacesMonitoring.ts',
    );

    const authorityNames = [
      'idx_gpal_timestamp',
      'idx_gpal_request_type',
      'idx_gpal_success',
      'idx_gpal_session_token',
      'idx_gpal_user_id',
      'google_places_api_daily_summary_date_uq',
      'idx_gpads_date',
      'idx_gpaa_triggered',
      'idx_gpaa_type',
      'idx_gpaa_severity',
      'idx_gpaa_resolved',
      'google_places_api_config_key_uq',
      'idx_gpac_key',
    ];

    for (const authorityName of authorityNames) {
      expect(monitoringSchema).toContain(`'${authorityName}'`);
    }
  });
});
