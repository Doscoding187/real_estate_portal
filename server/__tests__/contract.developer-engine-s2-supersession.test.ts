import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(import.meta.dirname, '../..');

function source(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8');
}

describe('Developer Engine S2 supersession authority contracts', () => {
  it('uses one restrictive, lifecycle-constrained persistence authority', () => {
    const migration = source('server/migrations/0002_development_supersessions.sql');
    const schema = source('drizzle/schema/developments.ts');

    expect(migration).toContain('CREATE TABLE `development_supersessions`');
    expect(migration).toContain("enum('verified','active','reversed')");
    expect(migration).toContain('ON DELETE RESTRICT');
    expect(migration).toContain('uq_development_supersessions_pair');
    expect(migration).toContain('uq_development_supersessions_source_path');
    expect(migration).toContain('chk_development_supersessions_distinct_endpoints');
    expect(schema).toContain('export const developmentSupersessions = mysqlTable(');
  });

  it('composes cutover through caller-owned S1 transaction primitives', () => {
    const service = source('server/services/developmentSupersessionService.ts');
    const publication = source('server/services/developmentService.ts');

    expect(service).toContain('db.transaction(async (tx: any)');
    expect(service).toContain('unpublishDevelopmentInTransaction');
    expect(service).toContain('publishDeveloperOwnedDevelopmentInTransaction');
    expect(service).toContain("status: 'active'");
    expect(publication).toContain('publishPlatformCuratedDevelopmentInTransaction');
    expect(publication).toContain('completeReviewInTransaction');
    expect(publication).toContain('assertDevelopmentPublicTransitionAllowed');
  });

  it('blocks ordinary publication, excludes active sources, and preserves exact redirects', () => {
    const policy = source('server/services/developmentSupersessionPolicy.ts');
    const eligibility = source('server/services/publicDevelopmentEligibility.ts');
    const route = source('server/routes/developmentSupersessionRedirect.ts');
    const service = source('server/services/developmentSupersessionService.ts');

    expect(policy).toContain('SUPERSESSION_ACTIVATION_REQUIRED');
    expect(policy).toContain('SUPERSESSION_REVERSAL_REQUIRED');
    expect(eligibility).toContain('active_supersession_source');
    expect(eligibility).toContain("status} = 'active'");
    expect(route).toContain('res.redirect(308');
    expect(route).toContain('normalizeDevelopmentRootPath');
    expect(service).toContain('assertUniqueRouteIdentity');
    expect(service).toContain('sourcePublicRootPath');
  });

  it('retires the custody-changing legacy authority and keeps leads out of the transition', () => {
    const legacy = source('server/services/developerBrandProfileService.ts');
    const router = source('server/brandProfileRouter.ts');
    const service = source('server/services/developmentSupersessionService.ts');

    expect(legacy).toContain('SEPARATE_CATALOGUE_AND_SUPERSESSION_REQUIRED');
    expect(router).toContain('convertToSubscriber');
    expect(service).not.toContain('leads');
    expect(service).not.toContain('leadId');
  });
});
