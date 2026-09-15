import { describe, expect, it } from 'vitest';
import { agencyViewingDateKey, groupAgencyViewingsByDate } from './agencyViewingDates';

describe('agency viewing dates', () => {
  it('uses Johannesburg day boundaries for an instant around local midnight', () => {
    expect(agencyViewingDateKey('2026-09-16T21:59:59.999Z')).toBe('2026-09-16');
    expect(agencyViewingDateKey('2026-09-16T22:00:00.000Z')).toBe('2026-09-17');
  });

  it('groups a post-midnight Johannesburg viewing under its local operating day', () => {
    const grouped = groupAgencyViewingsByDate([
      { id: 'before-midnight', scheduledAt: '2026-09-16T21:30:00.000Z' },
      { id: 'after-midnight', scheduledAt: '2026-09-16T22:30:00.000Z' },
      { id: 'unscheduled', scheduledAt: null },
    ]);

    expect(
      grouped.map(group => ({ date: group.date, ids: group.items.map(item => item.id) })),
    ).toEqual([
      { date: '2026-09-16', ids: ['before-midnight'] },
      { date: '2026-09-17', ids: ['after-midnight'] },
      { date: 'unscheduled', ids: ['unscheduled'] },
    ]);
  });

  it('does not assign invalid timestamps to an operating day', () => {
    expect(agencyViewingDateKey('not-a-date')).toBeNull();
  });
});
