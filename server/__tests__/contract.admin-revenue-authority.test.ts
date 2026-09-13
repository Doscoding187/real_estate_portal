import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('admin revenue authority boundary', () => {
  it('does not report an empty revenue object without a billing analytics authority', () => {
    const source = readFileSync(path.resolve(process.cwd(), 'server/adminRouter.ts'), 'utf8');
    const start = source.lastIndexOf('getRevenueAnalytics:');
    expect(start).toBeGreaterThan(0);
    const section = source.slice(start, start + 500);
    expect(section).toContain("code: 'PRECONDITION_FAILED'");
    expect(section).toContain('canonical billing analytics authority');
    expect(section).not.toContain('return {};');
  });
});
