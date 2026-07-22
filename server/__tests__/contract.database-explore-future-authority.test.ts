import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

function block(
  source: string,
  startMarker: string,
  endMarker: string,
): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);

  return source.slice(start, end);
}

describe('future Explore database authority', () => {
  const exploreSchema = read('drizzle/schema/explore.ts');
  const marketplaceSchema = read('drizzle/schema/marketplace.ts');
  const servicesSchema = read('drizzle/schema/servicesEngine.ts');

  const inventory = JSON.parse(
    read('drizzle/schema/canonical-model-inventory.json'),
  );

  it('retires duplicate and compatibility Explore authorities', () => {
    expect(inventory.tables).not.toEqual(
      expect.arrayContaining([
        'explore_shorts',
        'explore_discovery_videos',
        'explore_partners',
        'service_explore_videos',
      ]),
    );

    expect(exploreSchema).not.toMatch(
      /export const (exploreShorts|exploreDiscoveryVideos|explorePartners)\s*=/,
    );

    expect(servicesSchema).not.toContain(
      'export const serviceExploreVideos =',
    );

    expect(inventory.explore.compatibilityAuthority).toEqual([]);
  });

  it('defines one typed Explore publication envelope', () => {
    const content = block(
      exploreSchema,
      'export const exploreContent =',
      'export const exploreEngagements =',
    );

    const required = [
      "contentFormat: mysqlEnum('content_format'",
      "sourceType: mysqlEnum('source_type'",
      "listingId: int('listing_id')",
      '.references(() => listings.id',
      "developmentId: int('development_id')",
      '.references(() => developments.id',
      "locationId: int('location_id')",
      '.references(() => locations.id',
      "publisherUserId: int('publisher_user_id')",
      '.references(() => users.id',
      "publisherAgencyId: int('publisher_agency_id')",
      '.references(() => agencies.id',
      "publisherDeveloperId: int('publisher_developer_id')",
      '.references(() => developers.id',
      "publisherPartnerId: int('publisher_partner_id')",
      '.references(() => partners.id',
      "primaryVideoId: int('primary_video_id')",
      '.references(() => videos.id',
      "publicationStatus: mysqlEnum('publication_status'",
      "'draft'",
      "'submitted'",
      "'reviewing'",
      "'changes_requested'",
      "'approved'",
      "'scheduled'",
      "'published'",
      "'withdrawn'",
      "'rejected'",
      "'archived'",
    ];

    for (const expected of required) {
      expect(content).toContain(expected);
    }

    expect(content).not.toContain('referenceId:');
    expect(content).not.toContain('creatorType:');
    expect(content).not.toContain('videoUrl:');
  });

  it('uses type-safe topics, sessions and engagement facts', () => {
    const topicsBlock = block(
      exploreSchema,
      'export const topics =',
      'export const contentTopics =',
    );

    expect(topicsBlock).toMatch(
      /id:\s*int\([^)]*\)\.autoincrement\(\)\.primaryKey\(\)/,
    );

    const mappingBlock = block(
      exploreSchema,
      'export const contentTopics =',
      'export const exploreFeedSessions =',
    );

    expect(mappingBlock).toContain(
      "contentId: int('content_id')",
    );
    expect(mappingBlock).toContain(
      '.references(() => exploreContent.id',
    );
    expect(mappingBlock).toContain(
      "topicId: int('topic_id')",
    );
    expect(mappingBlock).toContain(
      '.references(() => topics.id',
    );
    expect(mappingBlock).toContain(
      "unique('uq_content_topics_content_topic')",
    );

    const sessionsBlock = block(
      exploreSchema,
      'export const exploreFeedSessions =',
      'export const exploreEngagements =',
    );

    expect(sessionsBlock).toContain(
      "userId: int('user_id')",
    );
    expect(sessionsBlock).toContain(
      '.references(() => users.id',
    );
    expect(sessionsBlock).toContain(
      "algorithmVersion: varchar('algorithm_version'",
    );

    const engagementsBlock = block(
      exploreSchema,
      'export const exploreEngagements =',
      'export const topics =',
    );

    expect(engagementsBlock).toContain(
      "sessionId: varchar('session_id'",
    );
    expect(engagementsBlock).toContain(
      '.references(() => exploreFeedSessions.id',
    );
    expect(engagementsBlock).toContain(
      "userId: int('user_id')",
    );
    expect(engagementsBlock).toContain(
      '.references(() => users.id',
    );
    expect(engagementsBlock).toContain(
      "dedupeKey: varchar('dedupe_key'",
    );
  });

  it('consolidates service providers and boosts onto canonical IDs', () => {
    expect(servicesSchema).not.toContain(
      "providerId: varchar('provider_id'",
    );
    expect(servicesSchema).toContain(
      "providerId: int('provider_id')",
    );
    expect(servicesSchema).toContain(
      '.references(() => partners.id',
    );

    const boostBlock = block(
      marketplaceSchema,
      'export const boostCampaigns =',
      'export const contentApprovalQueue =',
    );

    expect(boostBlock).toContain(
      "partnerId: int('partner_id')",
    );
    expect(boostBlock).toContain(
      '.references(() => partners.id',
    );
    expect(boostBlock).toContain(
      "contentId: int('content_id')",
    );
    expect(boostBlock).toContain(
      '.references(() => exploreContent.id',
    );
    expect(boostBlock).toContain(
      "topicId: int('topic_id')",
    );
    expect(boostBlock).toContain(
      '.references(() => topics.id',
    );
  });
});
