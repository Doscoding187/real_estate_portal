import { describe, expect, it } from 'vitest';

import { sanitizeDate } from '../developmentService';

describe('development date persistence normalization', () => {
  it('normalizes browser ISO timestamps to MySQL date-time values', () => {
    expect(sanitizeDate('2026-09-01T00:00:00.000Z')).toBe('2026-09-01 00:00:00');
    expect(sanitizeDate(new Date('2027-12-31T00:00:00.000Z'))).toBe('2027-12-31 00:00:00');
  });

  it('keeps date-only and already-normalized values stable', () => {
    expect(sanitizeDate('2026-09-01')).toBe('2026-09-01 00:00:00');
    expect(sanitizeDate('2027-12-31 00:00:00')).toBe('2027-12-31 00:00:00');
    expect(sanitizeDate('')).toBeNull();
  });
});
