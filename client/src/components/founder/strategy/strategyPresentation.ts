import type {
  ComparisonDirection,
  ObjectiveStatus,
  PlanningPeriod,
  StrategicObjective,
} from './types';

export type PeriodState = 'current' | 'upcoming' | 'past';

export function todayAsDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getPeriodState(period: PlanningPeriod, dateKey = todayAsDateKey()): PeriodState {
  if (period.startDate <= dateKey && dateKey <= period.endDate) return 'current';
  return dateKey < period.startDate ? 'upcoming' : 'past';
}

/**
 * Select the unambiguous useful period without inventing a priority between
 * overlapping current periods. A sole historical or upcoming period is still
 * a useful default when it is the only available choice.
 */
export function getInitialPeriodId(
  periods: PlanningPeriod[],
  dateKey = todayAsDateKey(),
): number | null {
  const currentPeriods = periods.filter(period => getPeriodState(period, dateKey) === 'current');
  if (currentPeriods.length === 1) return currentPeriods[0].id;
  return periods.length === 1 ? periods[0].id : null;
}

export function formatDateOnly(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

export function formatPeriodRange(period: PlanningPeriod): string {
  return `${formatDateOnly(period.startDate)} – ${formatDateOnly(period.endDate)}`;
}

export function statusLabel(status: ObjectiveStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function statusClasses(status: ObjectiveStatus): string {
  switch (status) {
    case 'active':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'completed':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'cancelled':
      return 'border-slate-200 bg-slate-100 text-slate-600';
    default:
      return 'border-amber-200 bg-amber-50 text-amber-700';
  }
}

export function periodStateLabel(state: PeriodState): string {
  return state === 'current' ? 'Current' : state === 'upcoming' ? 'Upcoming' : 'Past';
}

export function comparisonLabel(direction: ComparisonDirection): string {
  return direction === 'at_least' ? 'At least' : 'At most';
}

export function comparisonSentence(
  direction: ComparisonDirection,
  targetValue: number,
  satisfied: boolean,
): string {
  if (satisfied) return 'Current observation meets this target.';
  return direction === 'at_least'
    ? `Current observation is below the target of ${targetValue.toLocaleString()}.`
    : `Current observation is above the ceiling of ${targetValue.toLocaleString()}.`;
}

export function objectiveOwnerLabel(
  objective: Pick<StrategicObjective, 'ownerUserId'>,
  owners: Map<number, string>,
): string {
  if (!objective.ownerUserId) return 'Unassigned';
  return owners.get(objective.ownerUserId) ?? `User #${objective.ownerUserId}`;
}
