import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('dashboard analytics authority boundary', () => {
  it('does not represent unavailable admin or agency analytics as zero data', () => {
    const admin = readFileSync(path.resolve(process.cwd(), 'server/adminRouter.ts'), 'utf8');
    const agency = readFileSync(path.resolve(process.cwd(), 'server/agencyRouter.ts'), 'utf8');

    expect(admin).toContain("message: 'Platform analytics are unavailable'");
    expect(admin).toContain("message: 'Listing statistics are unavailable'");
    expect(admin).not.toContain('Returning safe defaults due to error');
    expect(agency).toContain("message: 'Agency dashboard statistics are unavailable'");
    expect(agency).toContain("message: 'Agency performance data is unavailable'");
    expect(agency).not.toContain('Returning safe defaults due to error');
  });
});
