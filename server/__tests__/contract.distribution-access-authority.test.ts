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
  });
});
