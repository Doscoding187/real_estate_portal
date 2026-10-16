export type CalendarViewMode = 'month' | 'week' | 'day';

// Database timestamps without an offset represent UTC, like the CRM workspace.
export function calendarTimestamp(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const normalized =
    value instanceof Date ? value : value.includes('T') ? value : value.replace(' ', 'T');
  const date =
    normalized instanceof Date
      ? normalized
      : new Date(/(?:Z|[+-]\d{2}:?\d{2})$/.test(normalized) ? normalized : `${normalized}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function calendarDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function calendarDateTimeInput(date: Date): string {
  return `${calendarDayKey(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function calendarDays(currentDate: Date, view: CalendarViewMode): Date[] {
  const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  if (view === 'month') start.setDate(1);
  if (view !== 'day') start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: view === 'month' ? 42 : view === 'week' ? 7 : 1 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export function calendarDateRange(currentDate: Date, view: CalendarViewMode) {
  const days = calendarDays(currentDate, view);
  const start = days[0];
  const end = new Date(days[days.length - 1]);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function calendarDateFromSearch(search: string): Date | null {
  const value = new URLSearchParams(search).get('date');
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return calendarDayKey(date) === value ? date : null;
}

export function calendarDayHref(date: Date): string {
  return `/agent/productivity?tab=calendar&date=${calendarDayKey(date)}`;
}
