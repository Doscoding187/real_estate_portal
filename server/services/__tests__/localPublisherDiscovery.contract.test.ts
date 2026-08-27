import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const source = (relativePath: string) => readFileSync(resolve(repoRoot, relativePath), 'utf8');

describe('local publisher discovery contract', () => {
  it('uses public-development eligibility and exact province evidence for organic ranking', () => {
    const identityService = source('server/services/developerIdentityService.ts');

    expect(identityService).toContain('listPublicPublishersByProvince');
    expect(identityService).toContain('eq(developments.province, province)');
    expect(identityService).toContain('publicDevelopmentEligibilityConditions()');
    expect(identityService).toContain("inArray(cataloguePublishers.publisherType, ['developer', 'hybrid'])");
    expect(identityService).toContain('desc(sql`COUNT(*)`)');
    expect(identityService).not.toContain('locationTargeting');
  });

  it('keeps the homepage endpoint separate from monetized placement', () => {
    const router = source('server/cataloguePublisherRouter.ts');
    const service = source('server/services/cataloguePublisherService.ts');

    expect(router).toContain('listPublishersByProvince');
    expect(router).toContain('province: z.string().trim().min(1).max(100)');
    expect(service).toContain('listPublicPublishersByProvince');
  });
});
