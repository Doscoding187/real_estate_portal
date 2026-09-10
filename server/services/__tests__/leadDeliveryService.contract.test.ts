import { describe, expect, it } from 'vitest';

import {
  parseMySqlUtcDateTime,
  publicStatusForDelivery,
  toMySqlDateTime,
} from '../leadDeliveryService';

describe('leadDeliveryService boundary contract', () => {
  it('serializes instants as UTC MySQL timestamp(6) text', () => {
    expect(toMySqlDateTime('2026-09-10T12:34:56.789Z')).toBe('2026-09-10 12:34:56.789000');
    expect(toMySqlDateTime(new Date('2026-09-10T12:34:56.789Z'))).toBe(
      '2026-09-10 12:34:56.789000',
    );
  });

  it('parses zone-less MySQL timestamps as UTC and rejects invalid calendar values', () => {
    expect(parseMySqlUtcDateTime('2026-09-10 12:34:56.789123')?.toISOString()).toBe(
      '2026-09-10T12:34:56.789Z',
    );
    expect(parseMySqlUtcDateTime('2026-02-30 12:34:56')).toBeNull();
    expect(parseMySqlUtcDateTime('not-a-timestamp')).toBeNull();
  });

  it('maps relational lifecycle states to truthful public statuses', () => {
    expect(
      publicStatusForDelivery({ state: 'completed', leadCustody: 'verified_customer_recipient' }),
    ).toBe('delivered');
    expect(
      publicStatusForDelivery({ state: 'retryable_failed', leadCustody: 'verified_customer_recipient' }),
    ).toBe('failed');
    expect(
      publicStatusForDelivery({ state: 'unknown', leadCustody: 'verified_customer_recipient' }),
    ).toBe('attention_required');
    expect(publicStatusForDelivery({ state: 'queued', leadCustody: 'platform_managed' })).toBe(
      'attention_required',
    );
    expect(publicStatusForDelivery({ state: 'queued', leadCustody: 'verified_customer_recipient' })).toBe(
      'pending',
    );
  });
});
