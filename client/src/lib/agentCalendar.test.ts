import { describe, expect, it } from 'vitest';
import {
  calendarTimestamp,
  calendarDayKey,
  calendarDateTimeInput,
  calendarDays,
  calendarDateRange,
} from './agentCalendar';

describe('agent calendar dates', () => {
  it('interprets offset-free database timestamps as UTC', () => {
    expect(calendarTimestamp('2026-10-15 19:00:00')?.toISOString()).toBe(
      '2026-10-15T19:00:00.000Z',
    );
    expect(calendarTimestamp('2026-10-15T19:00:00')?.toISOString()).toBe(
      '2026-10-15T19:00:00.000Z',
    );
    expect(calendarTimestamp('2026-10-15T21:00:00+02:00')?.toISOString()).toBe(
      '2026-10-15T19:00:00.000Z',
    );
  });
  it('does not turn absent or invalid dates into calendar entries', () => {
    expect(calendarTimestamp(null)).toBeNull();
    expect(calendarTimestamp('not-a-date')).toBeNull();
  });
  it('uses the visible local date and time for cells and booking defaults', () => {
    const date = new Date(2026, 9, 15, 0, 30);
    expect(calendarDayKey(date)).toBe('2026-10-15');
    expect(calendarDateTimeInput(date)).toBe('2026-10-15T00:30');
  });
  it('includes all 42 visible month cells, including adjacent months', () => {
    const days = calendarDays(new Date(2026, 9, 31), 'month');
    expect(days).toHaveLength(42);
    expect(calendarDayKey(days[0])).toBe('2026-09-27');
    expect(calendarDayKey(days[41])).toBe('2026-11-07');
  });
  it('includes the whole last visible day in query bounds', () => {
    const range = calendarDateRange(new Date(2026, 9, 15), 'month');
    expect(new Date(range.start).getTime()).toBe(new Date(2026, 8, 27, 0, 0, 0, 0).getTime());
    expect(new Date(range.end).getTime()).toBe(new Date(2026, 10, 7, 23, 59, 59, 999).getTime());
  });
  it('provides complete week and single-day bounds', () => {
    expect(calendarDays(new Date(2026, 9, 15), 'week')).toHaveLength(7);
    const range = calendarDateRange(new Date(2026, 9, 15), 'day');
    expect(new Date(range.start).getTime()).toBe(new Date(2026, 9, 15, 0).getTime());
    expect(new Date(range.end).getTime()).toBe(new Date(2026, 9, 15, 23, 59, 59, 999).getTime());
  });
});
