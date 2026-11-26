import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { summarizeAuditDetails } from './auditSummary';

describe('summarizeAuditDetails', () => {
  it('summarises a viewed-users entry', () => {
    expect(summarizeAuditDetails({ count: 2, filters: { page: 1, limit: 20, role: 'agent' } })).toBe(
      '2 results · filter: agent',
    );
  });
  it('summarises a status change and a reason, clipping long text', () => {
    expect(summarizeAuditDetails({ status: 'rejected', previousStatus: 'pending' })).toBe(
      'status: rejected (was pending)',
    );
    const long = 'x'.repeat(200);
    expect(summarizeAuditDetails({ reason: long }).length).toBeLessThan(80);
  });
  it('returns nothing for empty or unknown metadata and never invents values', () => {
    expect(summarizeAuditDetails(null)).toBe('');
    expect(summarizeAuditDetails({ compliance: { a: 1 } })).toBe('');
    expect(summarizeAuditDetails({ filters: { page: 1, limit: 50 } })).toBe('');
  });
});

describe('admin page layout', () => {
  const pages = [
    'UsersPage',
    'DevelopersPage',
    'PlatformSettings',
    'AuditLogs',
    'OverviewPage',
    'PropertiesPage',
    'ListingOversight',
    'DevelopmentOversight',
    'AgencyList',
    'EcosystemOverviewPage',
    'publisher/SuperAdminPublisher',
  ];
  it.each(pages)('%s uses the single admin page container', page => {
    const source = readFileSync(
      resolve(process.cwd(), `client/src/pages/admin/${page}.tsx`),
      'utf8',
    );
    expect(source).toContain('ADMIN_PAGE_CLASS');
    expect(source).not.toMatch(/className="[^"]*\b(max-w-7xl|max-w-5xl|container) mx-auto/);
  });
});
