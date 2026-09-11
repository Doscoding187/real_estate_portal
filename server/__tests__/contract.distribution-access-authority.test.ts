import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('distribution access authority boundary', () => {
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
  });
});
