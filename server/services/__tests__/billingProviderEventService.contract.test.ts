import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('server/services/billingProviderEventService.ts', 'utf8');

describe('billing provider event processing authority', () => {
  it('uses durable identity, row locking, and compare-and-set completion', () => {
    expect(source).toContain('recordBillingProviderEvent');
    expect(source).toContain('ER_DUP_ENTRY');
    expect(source).toContain("inArray(billingProviderEvents.status, ['received', 'failed'])");
    expect(source).toContain(".for('update')");
    expect(source).toContain("eq(billingProviderEvents.status, 'processing')");
    expect(source).toContain('normalizeIdentity(input.provider');
    expect(source).toContain('Billing provider event payload must be an object');
    expect(source).toContain('Invalid billing provider event timestamp');
  });
});
