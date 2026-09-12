import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('demand authority boundary', () => {
  it('fails closed when the canonical demand schema is unavailable', () => {
    const source = readFileSync(path.resolve(process.cwd(), 'server/demandRouter.ts'), 'utf8');

    expect(source).toContain('function demandSchemaUnavailable(): never');
    expect(source).toContain("code: 'PRECONDITION_FAILED'");
    expect(source).not.toContain('Returning empty list.');
    expect(source).not.toContain('Returning safe defaults.');
    expect(source).not.toContain('Returning empty campaigns due to error');
    expect(source).not.toContain('Returning safe defaults due to error');
  });
});
