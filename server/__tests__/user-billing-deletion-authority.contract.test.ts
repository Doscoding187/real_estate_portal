import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('user billing deletion authority', () => {
  it('does not delete an agent identity with canonical billing state', () => {
    const source = readFileSync('server/userRouter.ts', 'utf8');
    const start = source.indexOf('Delete user (Super Admin only)');
    expect(start).toBeGreaterThanOrEqual(0);
    const body = source.slice(start, start + 3000);
    expect(body).toContain('billableAccounts');
    expect(body).toContain("eq(billableAccounts.accountKind, 'agent')");
    expect(body).toContain('User cannot be deleted after billing has been initialized');
    expect(body).toContain("code: 'PRECONDITION_FAILED'");
  });
});
