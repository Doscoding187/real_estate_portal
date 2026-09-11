import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('similar-property history authority boundary', () => {
  it('does not acknowledge unimplemented history as an empty successful feed', () => {
    const source = readFileSync(
      path.resolve(process.cwd(), 'server/similarPropertiesRouter.ts'),
      'utf8',
    );

    expect(source).toContain("code: 'PRECONDITION_FAILED'");
    expect(source).toContain('Similar-property history is not available');
    expect(source).not.toContain('For now, return empty array');
  });
});
