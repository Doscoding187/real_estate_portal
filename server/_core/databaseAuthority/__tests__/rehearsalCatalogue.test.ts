import { describe, expect, it } from 'vitest';
import { compileRehearsalProbe, rehearsalCleanup } from '../rehearsalProbes';
const nonce = '12345678-1234-1234-1234-123456789abc';
describe('bounded billing rehearsal catalogue', () => {
  it('binds every write to reserved identities without accepting caller SQL', () => {
    for (const probe of [
      'account.insert',
      'account.delete',
      'subscription.insert',
      'subscription.activate',
      'subscription.delete',
      'invoice.insert',
      'invoice.delete',
      'payment.insert',
      'payment.verify',
    ] as const) {
      const p = compileRehearsalProbe(probe, [0], nonce);
      expect(p.sql.match(/\?/g)?.length).toBe(p.values.length);
      expect(p.values).toContain(1900000000);
      expect(p.sql).not.toMatch(/^(CREATE|DROP|ALTER|TRUNCATE)/);
      expect(p.sql).not.toMatch(
        /^(INSERT INTO|UPDATE|DELETE FROM) (plans|plan_entitlements|sql_migration)/,
      );
      expect(() => compileRehearsalProbe(probe, [32], nonce)).toThrow();
    }
  });
  it('cleans billing children across all slots before parent deletion', () => {
    const q = rehearsalCleanup(nonce).map(x => x.sql.split(' ')[2]);
    for (const [child, parent] of [
      ['billing_payments', 'billing_invoices'],
      ['billing_invoices', 'subscriptions'],
      ['subscriptions', 'billable_accounts'],
      ['billable_accounts', 'users'],
    ])
      expect(q.lastIndexOf(child)).toBeLessThan(q.indexOf(parent));
  });
});
