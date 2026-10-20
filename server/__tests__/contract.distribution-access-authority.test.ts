import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('distribution access authority boundary', () => {
  it('retires the legacy qualification and grant surfaces', () => {
    const router = readFileSync(
      path.resolve(process.cwd(), 'server/distributionRouter.ts'),
      'utf8',
    );
    const adminPage = readFileSync(
      path.resolve(
        process.cwd(),
        'client/src/pages/admin/DistributionNetworkPage.tsx',
      ),
      'utf8',
    );

    expect(
      existsSync(path.resolve(process.cwd(), 'server/distributionQualificationRouter.ts')),
    ).toBe(false);
    expect(
      existsSync(
        path.resolve(process.cwd(), 'server/services/referralQualificationService.ts'),
      ),
    ).toBe(false);
    expect(router).not.toContain('distributionAgentAccess');
    expect(router).not.toContain('grantAgentAccess');
    expect(router).not.toContain('revokeAgentAccess');
    expect(router).not.toContain('listAgentAccess');
    expect(router).not.toContain('listAgentsForDevelopment');
    expect(adminPage).not.toContain('listAgentAccess');
    expect(adminPage).not.toContain('Access Grants');
  });

  it('does not interpret a missing canonical table as an absent row', () => {
    const source = readFileSync(
      path.resolve(process.cwd(), 'server/services/distributionAccessRepository.ts'),
      'utf8',
    );

    expect(source).not.toContain('isMissingSchemaError');
    expect(source).not.toContain('if (isMissingSchemaError(error)) return null');
    expect(source).toContain('getBrandPartnershipByPublisherId');
    expect(source).toContain('getDevelopmentAccessByDevelopmentId');
    expect(source).not.toContain('if (isMissingSchemaError(error)) return null');
    expect(source).not.toContain('LEGACY_STATUS_FALLBACKS');
    expect(source).not.toContain('LEGACY_STATUS_NORMALIZATION');
    expect(source).not.toContain('normalizeDevelopmentAccessStatus');
    const policy = readFileSync(
      path.resolve(process.cwd(), 'server/services/distributionAccessPolicy.ts'),
      'utf8',
    );
    expect(policy).not.toContain('deriveLegacyFallback');
    expect(policy).not.toContain('legacy_fallback_program_present');
    expect(policy).not.toContain('legacy_fallback_brand_linked_visible');
    const router = readFileSync(path.resolve(process.cwd(), 'server/distributionRouter.ts'), 'utf8');
    expect(router).not.toContain('Fallback safety net');
    expect(router).not.toContain('fallbackConditions');
    expect(router).not.toContain('const [fallback] = await db');
    expect(router).not.toContain('const fallbackRows = await db');
  });
});
