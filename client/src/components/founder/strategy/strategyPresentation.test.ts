import { describe, expect, it } from 'vitest';
import {
  comparisonLabel,
  comparisonSentence,
  formatPeriodRange,
  getInitialPeriodId,
  getPeriodState,
  objectiveOwnerLabel,
  statusClasses,
} from './strategyPresentation';
import type { PlanningPeriod } from './types';

const period = (overrides: Partial<PlanningPeriod> = {}): PlanningPeriod => ({
  id: 1,
  name: 'Q3 2026',
  startDate: '2026-07-01',
  endDate: '2026-09-30',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('strategy presentation rules', () => {
  it('derives current, upcoming, and past from date-only boundaries', () => {
    expect(getPeriodState(period(), '2026-07-01')).toBe('current');
    expect(getPeriodState(period(), '2026-09-30')).toBe('current');
    expect(getPeriodState(period(), '2026-06-30')).toBe('upcoming');
    expect(getPeriodState(period(), '2026-10-01')).toBe('past');
  });

  it('allows overlapping periods without treating them as a single current period', () => {
    const first = period();
    const second = period({
      id: 2,
      name: 'H2 2026',
      startDate: '2026-07-01',
      endDate: '2026-12-31',
    });
    expect(getPeriodState(first, '2026-08-01')).toBe('current');
    expect(getPeriodState(second, '2026-08-01')).toBe('current');
  });

  it('selects a sole available period but never chooses between overlapping current periods', () => {
    expect(getInitialPeriodId([period()], '2026-06-01')).toBe(1);
    expect(
      getInitialPeriodId(
        [
          period(),
          period({ id: 2, name: 'H2 2026', startDate: '2026-07-01', endDate: '2026-12-31' }),
        ],
        '2026-08-01',
      ),
    ).toBeNull();
  });

  it('renders direction-aware comparison language', () => {
    expect(comparisonLabel('at_least')).toBe('At least');
    expect(comparisonLabel('at_most')).toBe('At most');
    expect(comparisonSentence('at_least', 10, true)).toContain('meets');
    expect(comparisonSentence('at_least', 10, false)).toContain('below');
    expect(comparisonSentence('at_most', 10, false)).toContain('above the ceiling');
  });

  it('uses a stable owner fallback when the bounded lookup has no name', () => {
    expect(objectiveOwnerLabel({ ownerUserId: null }, new Map())).toBe('Unassigned');
    expect(objectiveOwnerLabel({ ownerUserId: 42 }, new Map())).toBe('User #42');
    expect(objectiveOwnerLabel({ ownerUserId: 42 }, new Map([[42, 'Amina']]))).toBe('Amina');
  });

  it('formats the date-only period range without timezone conversion', () => {
    expect(formatPeriodRange(period())).toContain('2026');
    expect(formatPeriodRange(period())).toContain('Jul');
    expect(formatPeriodRange(period())).toContain('Sep');
  });

  it('keeps terminal status visually distinct from draft and active', () => {
    expect(statusClasses('draft')).toContain('amber');
    expect(statusClasses('active')).toContain('emerald');
    expect(statusClasses('completed')).toContain('blue');
    expect(statusClasses('cancelled')).toContain('slate');
  });
});
