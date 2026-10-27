import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const source = (relativePath: string) => readFileSync(resolve(repoRoot, relativePath), 'utf8');

describe('local publisher discovery contract', () => {
  it('uses public-development eligibility and exact reviewed Place assignments for organic ranking', () => {
    const identityService = source('server/services/developerIdentityService.ts');

    expect(identityService).toContain('listPublicPublishersByPlace');
    expect(identityService).toContain('listDevelopmentIdsForCanonicalPlace(placeId)');
    expect(identityService).toContain('inArray(developments.id, developmentIds)');
    expect(identityService).toContain('publicDevelopmentEligibilityConditions()');
    expect(identityService).toContain("inArray(cataloguePublishers.publisherType, ['developer', 'hybrid'])");
    expect(identityService).toContain('desc(sql`COUNT(*)`)');
    expect(identityService).not.toContain('locationTargeting');
    expect(identityService).not.toContain('developments.province');
  });

  it('keeps the homepage endpoint separate from monetized placement', () => {
    const router = source('server/cataloguePublisherRouter.ts');
    const service = source('server/services/cataloguePublisherService.ts');

    expect(router).toContain('listPublishersByPlace');
    expect(router).toContain('canonicalPlaceId: z.string().trim().refine(isPlaceId');
    expect(service).toContain('listPublicPublishersByPlace');
    expect(router).not.toContain('listPublishersByProvince');
  });
});
