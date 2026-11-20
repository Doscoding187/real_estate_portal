import { describe, expect, it, vi } from 'vitest';

vi.mock('../../db', () => ({ getDb: vi.fn() }));

import {
  fillWeeklySeries,
  parseAuditMetadata,
  sortInbox,
  toIsoUtc,
  type AdminInboxItem,
} from '../adminInboxService';

const item = (id: string, waitingSince: string): AdminInboxItem => ({
  id,
  kind: 'payment',
  title: id,
  subtitle: '',
  waitingSince,
  href: '/admin/finance',
});

describe('adminInboxService helpers', () => {
  it('reads database timestamps as UTC', () => {
    expect(toIsoUtc('2026-11-18 10:00:00')).toBe('2026-11-18T10:00:00.000Z');
    expect(toIsoUtc(null)).toBeNull();
    expect(toIsoUtc('not a date')).toBeNull();
  });

  it('sorts the merged inbox oldest waiting first', () => {
    const sorted = sortInbox([
      item('b', '2026-11-19T10:00:00.000Z'),
      item('a', '2026-11-17T10:00:00.000Z'),
      item('c', '2026-11-18T10:00:00.000Z'),
    ]);
    expect(sorted.map(i => i.id)).toEqual(['a', 'c', 'b']);
  });

  it('builds 8 weekly points, oldest first, with honest zeros', () => {
    const now = new Date('2026-11-20T12:00:00.000Z');
    const points = fillWeeklySeries(now, {
      signups: [
        { weeksAgo: 0, count: 5 },
        { weeksAgo: 7, count: 2 },
      ],
      paidAccounts: [],
      enquiries: [{ weeksAgo: 1, count: 3 }],
    });
    expect(points).toHaveLength(8);
    expect(points[7].signups).toBe(5);
    expect(points[0].signups).toBe(2);
    expect(points[6].enquiries).toBe(3);
    expect(points.every(p => p.paidAccounts === 0)).toBe(true);
    expect(points[7].weekStart).toBe('2026-11-13');
  });

  it('parses audit metadata safely', () => {
    expect(parseAuditMetadata(null)).toBeNull();
    expect(parseAuditMetadata('{"a":1}')).toEqual({ a: 1 });
    expect(parseAuditMetadata('not json')).toEqual({ note: 'not json' });
    expect(parseAuditMetadata('[1,2]')).toEqual({ value: [1, 2] });
  });

  it('ignores buckets outside the window', () => {
    const points = fillWeeklySeries(new Date('2026-11-20T12:00:00.000Z'), {
      signups: [{ weeksAgo: 12, count: 99 }],
      paidAccounts: [],
      enquiries: [],
    });
    expect(points.reduce((s, p) => s + p.signups, 0)).toBe(0);
  });
});
