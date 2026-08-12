import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(import.meta.dirname, '../..');

function source(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8');
}

describe('Developer Engine S3 discovery convergence contracts', () => {
  it('keeps /new-developments on the canonical public development list projection', () => {
    const page = source('client/src/pages/DevelopmentsDemo.tsx');
    const router = source('server/developerRouter.ts');
    const service = source('server/services/developmentService.ts');

    expect(page).toContain('trpc.developer.listPublicDevelopments.useQuery');
    expect(page).toContain('canonicalRoute={dev.canonicalRoute}');
    expect(router).toContain('listPublicDevelopments: publicProcedure');
    expect(router).toContain('developmentService.listPublicDevelopments');
    expect(service).toContain(
      'const conditions: any[] = [publicDevelopmentEligibilityConditions()];',
    );
  });

  it('routes Listing Wizard autocomplete through canonical discovery instead of the legacy db query', () => {
    const wizard = source('client/src/components/listing-wizard/steps/BasicInformationStep.tsx');
    const router = source('server/developerRouter.ts');
    const db = source('server/db.ts');

    expect(wizard).toContain('trpc.developer.searchDevelopments.useQuery');
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
