export const AGENCY_WORKSPACE_TIME_ZONE = 'Africa/Johannesburg';

const AGENCY_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: AGENCY_WORKSPACE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const AGENCY_DATE_LABEL_FORMATTER = new Intl.DateTimeFormat('en-ZA', {
  timeZone: AGENCY_WORKSPACE_TIME_ZONE,
  day: '2-digit',
  month: 'short',
});

const AGENCY_DATE_TIME_INPUT_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: AGENCY_WORKSPACE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hourCycle: 'h23',
  hour: '2-digit',
  minute: '2-digit',
});

type DatedViewing = {
  scheduledAt?: string | Date | null;
};

function dateKeyFromParts(parts: Intl.DateTimeFormatPart[]) {
  const year = parts.find(part => part.type === 'year')?.value;
  const month = parts.find(part => part.type === 'month')?.value;
  const day = parts.find(part => part.type === 'day')?.value;
  return year && month && day ? `${year}-${month}-${day}` : null;
}

export function agencyViewingDateKey(value?: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return dateKeyFromParts(AGENCY_DATE_FORMATTER.formatToParts(date));
}

export function formatAgencyViewingDateKey(value?: string | null) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return 'Recently';
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
  if (Number.isNaN(date.getTime())) return 'Recently';
  return AGENCY_DATE_LABEL_FORMATTER.format(date);
}

export function formatAgencyViewingDateTimeInput(value?: string | Date | null) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = AGENCY_DATE_TIME_INPUT_FORMATTER.formatToParts(date);
  const dateKey = dateKeyFromParts(parts);
  const hour = parts.find(part => part.type === 'hour')?.value;
  const minute = parts.find(part => part.type === 'minute')?.value;
  return dateKey && hour && minute ? `${dateKey}T${hour}:${minute}` : '';
}

export function groupAgencyViewingsByDate<T extends DatedViewing>(viewings: T[]) {
  const groups = new Map<string, T[]>();
  viewings.forEach(viewing => {
    const dateKey = agencyViewingDateKey(viewing.scheduledAt) || 'unscheduled';
    groups.set(dateKey, [...(groups.get(dateKey) || []), viewing]);
  });

  return Array.from(groups.entries()).map(([date, items]) => ({
    date,
    label: date === 'unscheduled' ? 'Unscheduled' : formatAgencyViewingDateKey(date),
    items,
  }));
}
