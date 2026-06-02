import { describe, expect, it } from 'vitest';
import { sanitizeDevelopmentDate } from '../developmentService';

describe('sanitizeDevelopmentDate', () => {
  it('converts ISO wizard dates into MySQL-safe datetime strings', () => {
    expect(sanitizeDevelopmentDate('2026-08-01T00:00:00.000Z')).toBe('2026-08-01 00:00:00');
    expect(sanitizeDevelopmentDate('2027-06-30T00:00:00.000Z')).toBe('2027-06-30 00:00:00');
  });

  it('keeps date-only and MySQL datetime strings compatible', () => {
    expect(sanitizeDevelopmentDate('2026-08-01')).toBe('2026-08-01');
    expect(sanitizeDevelopmentDate('2026-08-01 09:30:00')).toBe('2026-08-01 09:30:00');
  });
});
