import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(import.meta.dirname, '../..');

function source(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8');
}

describe('Developer Engine S3 discovery convergence contracts', () => {
  it('keeps /new-developments on the canonical public development search projection', () => {
    const page = source('client/src/pages/DevelopmentsDemo.tsx');
    const router = source('server/routers.ts');
    const searchService = source('server/services/publicDevelopmentSearchService.ts');

    expect(page).toContain('trpc.properties.searchDevelopments.useQuery');
    expect(page).not.toContain('trpc.developer.listPublicDevelopments.useQuery');
    expect(router).toContain('searchDevelopments: publicProcedure');
    expect(router).toContain('publicDevelopmentSearchService.search(input)');
    expect(searchService).toContain('publicDevelopmentEligibilityConditions()');
    expect(searchService).toContain('eq(unitTypes.isActive, 1)');
  });

  it('keeps the manual Listing Wizard independent from Developer Engine lifecycle queries', () => {
    const wizard = source('client/src/components/listing-wizard/steps/BasicInformationStep.tsx');
    const router = source('server/developerRouter.ts');
    const db = source('server/db.ts');

    expect(wizard).not.toContain('trpc.developer.searchDevelopments.useQuery');
    expect(wizard).not.toContain('trpc.developer.searchDevelopers.useQuery');
    expect(router).toContain('developmentService.searchPublicDevelopments');
    expect(router).not.toContain('db.searchDevelopments');
    expect(db).not.toContain('Search developments by name (for autocomplete)');
    expect(db).not.toContain(
      'eq(developments.isPublished, 1), // Only show published developments',
    );
  });

  it('keeps discovery route identity and canonical unit inventory on the service side', () => {
    const service = source('server/services/developmentService.ts');
    const routeAuthority = source('server/services/developmentRouteAuthority.ts');

    expect(service).toContain('searchPublicDevelopments');
    expect(service).toContain('canonicalRoute: buildDevelopmentRootPath(d)');
    expect(service).toContain('canonicalRoute: buildDevelopmentRootPath(result)');
    expect(service).toContain('eq(unitTypes.isActive, 1)');
    expect(service).not.toContain('developmentUnits');
    expect(routeAuthority).toContain('buildDevelopmentRootPath');
  });
});
