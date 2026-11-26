import { describe, expect, it } from 'vitest';
import { ageTag, buildInboxTabs, weekOverWeek, type InboxItem } from './inboxModel';

const now = new Date('2026-11-20T12:00:00.000Z');
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600 * 1000).toISOString();
const mk = (id: string, kind: InboxItem['kind']): InboxItem => ({
  id,
  kind,
  title: id,
  subtitle: '',
  waitingSince: hoursAgo(1),
  href: '/',
});

describe('inboxModel', () => {
  it('tags age amber over 24h and red over 48h', () => {
    expect(ageTag(hoursAgo(0.2), now)).toEqual({ label: 'Just now', level: 'ok' });
    expect(ageTag(hoursAgo(5), now)).toEqual({ label: '5 h ago', level: 'ok' });
    expect(ageTag(hoursAgo(24), now).level).toBe('ok');
    expect(ageTag(hoursAgo(26), now)).toEqual({ label: '1 d 2 h', level: 'warn' });
    expect(ageTag(hoursAgo(49), now).level).toBe('late');
  });

  it('builds only tabs that have a real source', () => {
    const tabs = buildInboxTabs([mk('a', 'payment'), mk('b', 'listing'), mk('c', 'agent')]);
    expect(tabs.map(t => [t.label, t.count])).toEqual([
      ['All', 3],
      ['Payments', 1],
      ['Approvals', 2],
    ]);
  });

  it('shows week-over-week change only when last week has data', () => {
    expect(weekOverWeek([0, 5])).toBeNull();
    expect(weekOverWeek([4, 6])).toBe('+2 vs last week');
    expect(weekOverWeek([4, 3])).toBe('-1 vs last week');
  });
});
