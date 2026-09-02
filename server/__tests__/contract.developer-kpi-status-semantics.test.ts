import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'server/services/kpiService.ts'), 'utf8');

describe('developer KPI lead-status semantics', () => {
  it('uses the canonical developer lead statuses for qualified and closed-won reporting', () => {
    expect(source).toContain('const QUALIFIED_LEAD_STATUSES = [');
    expect(source).toContain("'offer_sent',");
    expect(source).toContain("'closed',");
    expect(source).toContain('inArray(leads.status, QUALIFIED_LEAD_STATUSES)');

    // `converted` means a deal is in progress; only `closed` is a completed
    // sale in the canonical developer funnel.
    expect(source).toContain("eq(leads.status, 'closed')");
    expect(source).not.toContain("eq(leads.status, 'converted')");
  });
});
