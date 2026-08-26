import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SERVICE_TAXONOMY_SEED } from '../../shared/services-taxonomy';

const ROOT = process.cwd();

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

describe('canonical Services database authority', () => {
  const servicesSchema = read('drizzle/schema/services.ts');
  const indexSchema = read('drizzle/schema/index.ts');

  it('replaces the retired servicesEngine schema authority', () => {
    expect(indexSchema).toContain("export * from './services'");
    expect(() => read('drizzle/schema/servicesEngine.ts')).toThrow();
    expect(() => read('server/services/servicesEngineService.ts')).toThrow();
    expect(() => read('server/servicesEngineRouter.ts')).toThrow();
    expect(() => read('server/services/leadGenerationService.ts')).toThrow();
    expect(() => read('server/partnerLeadRouter.ts')).toThrow();
  });

  it('anchors every supply-side table to integer service_providers.id', () => {
    const providerReferences = [
      ['service_offerings', 'service_providers'],
      ['provider_service_areas', 'service_verifications_placeholder'],
      ['provider_verifications', 'service_reviews_placeholder'],
      ['provider_reviews', 'service_portfolio_placeholder'],
    ];

    for (const [table] of providerReferences) {
      const start = servicesSchema.indexOf(`'${table}'`);
      expect(start).toBeGreaterThanOrEqual(0);
      const block = servicesSchema.slice(start, start + 2200);
      expect(block).toContain("references(() => serviceProviders.id");
    }
  });

  it('models the one-request-many-introductions separation', () => {
    const introductions = servicesSchema.slice(
      servicesSchema.indexOf("'service_introductions'"),
      servicesSchema.indexOf("'service_request_events'"),
    );
    expect(introductions).toContain(
      "unique('ux_service_introductions_request_provider').on(table.requestId, table.providerId)",
    );
    expect(introductions).toContain('.references(() => serviceRequests.id');

    // Requests never carry a provider column: assignment lives on introductions.
    const requests = servicesSchema.slice(
      servicesSchema.indexOf("'service_requests'"),
      servicesSchema.indexOf("'service_introductions'"),
    );
    expect(requests).not.toMatch(/providerId/);
  });

  it('uses canonical geography foreign keys instead of free-text geography', () => {
    for (const tableName of ['provider_service_areas', 'service_requests']) {
      const block = servicesSchema.slice(
        servicesSchema.indexOf(`'${tableName}'`),
        servicesSchema.indexOf(`'${tableName}'`) + 3000,
      );
      expect(block).toContain('.references(() => provinces.id');
      expect(block).not.toMatch(/province:\s*varchar\(/);
      expect(block).not.toMatch(/geoCity|geo_province/);
    }
  });

  it('carries evidence-based verification instead of opaque trust scores', () => {
    expect(servicesSchema).toContain('PROVIDER_VERIFICATION_DIMENSION_VALUES');
    expect(servicesSchema).toContain("'business_registration'");
    expect(servicesSchema).not.toContain('trustScore');
    expect(servicesSchema).not.toContain('moderationTier');
  });

  it('seeds taxonomy through governed data, not runtime enums', () => {
    expect(servicesSchema).not.toContain("SERVICE_CATEGORY_VALUES");
    expect(servicesSchema).toContain('enumPair(SERVICE_TAXONOMY_NODE_LEVEL_VALUES)');
  });

  it('keeps the seed migration in exact parity with the shared taxonomy module', () => {
    const seedSql = read('server/migrations/0072_services_taxonomy_seed.sql');
    const rowPattern = /\((\d+), (?:NULL|\d+), '([a-z0-9-]+)', '(family|category|service|capability)', '((?:[^'\\]|\\.)*)'/g;
    const sqlRows = new Map<string, string>();
    for (const match of seedSql.matchAll(rowPattern)) {
      sqlRows.set(match[2], `${match[1]}:${match[3]}:${match[4].replace(/\\'/g, "'")}`);
    }

    const expected = new Map(
      SERVICE_TAXONOMY_SEED.map(node => [
        node.slug,
        `${node.id}:${node.level}:${node.name}`,
      ]),
    );

    expect(sqlRows.size).toBe(expected.size);
    for (const [slug, descriptor] of expected) {
      expect(sqlRows.get(slug)).toBe(descriptor);
    }
  });
});
