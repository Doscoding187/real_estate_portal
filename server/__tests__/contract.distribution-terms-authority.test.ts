import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('distribution terms authority boundary', () => {
  it('does not probe alternate schema or omit the canonical brochure field', () => {
    const source = readFileSync(
      path.resolve(process.cwd(), 'server/services/distributionPartnerTermsService.ts'),
      'utf8',
    );

    expect(source).toContain('selectFields.brochureConfigJson = distributionDevelopmentAccess.brochureConfigJson');
    expect(source).not.toContain('canReadBrochureConfigColumn');
    expect(source).not.toContain('isMissingBrochureConfigColumnError');
    expect(source).not.toContain('selectPartnerRows(false)');
    expect(source).not.toContain('Continuing without brochure overrides');
  });
});
