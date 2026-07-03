const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_DATETIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/;
const ZONED_DATETIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/;

function isValidDateParts(year: number, month: number, day: number) {
  if (!Number.isInteger(year) || year < 1) return false;
  if (!Number.isInteger(month) || month < 1 || month > 12) return false;
  if (!Number.isInteger(day) || day < 1) return false;

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth;
}

function isValidTimeParts(hour: number, minute: number, second = 0) {
  return (
    Number.isInteger(hour) &&
    hour >= 0 &&
    hour <= 23 &&
    Number.isInteger(minute) &&
    minute >= 0 &&
    minute <= 59 &&
    Number.isInteger(second) &&
    second >= 0 &&
    second <= 59
  );
}

function isValidOffset(value: string) {
  if (value === 'Z') return true;
  const match = value.match(/^([+-])(\d{2}):(\d{2})$/);
  if (!match) return false;
  const hour = Number(match[2]);
  const minute = Number(match[3]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function toNumberParts(parts: RegExpMatchArray) {
  return {
    year: Number(parts[1]),
    month: Number(parts[2]),
    day: Number(parts[3]),
    hour: parts[4] === undefined ? undefined : Number(parts[4]),
    minute: parts[5] === undefined ? undefined : Number(parts[5]),
    second: parts[6] === undefined ? 0 : Number(parts[6]),
  };
}

export function normalizeDateTimeForDb(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 19).replace('T', ' ');
  }
  if (typeof value !== 'string') return null;

  const raw = value.trim();
  if (!raw) return null;

  const dateOnlyMatch = raw.match(DATE_ONLY_RE);
  if (dateOnlyMatch) {
    const { year, month, day } = toNumberParts(dateOnlyMatch);
    if (!isValidDateParts(year, month, day)) return null;
    return `${dateOnlyMatch[1]}-${dateOnlyMatch[2]}-${dateOnlyMatch[3]} 00:00:00`;
  }

  const localDateTimeMatch = raw.match(LOCAL_DATETIME_RE);
  if (localDateTimeMatch) {
    const { year, month, day, hour, minute, second } = toNumberParts(localDateTimeMatch);
    if (
      !isValidDateParts(year, month, day) ||
      hour === undefined ||
      minute === undefined ||
      !isValidTimeParts(hour, minute, second)
    ) {
      return null;
    }
    return `${localDateTimeMatch[1]}-${localDateTimeMatch[2]}-${localDateTimeMatch[3]} ${localDateTimeMatch[4]}:${localDateTimeMatch[5]}:${localDateTimeMatch[6] ?? '00'}`;
  }

  const zonedDateTimeMatch = raw.match(ZONED_DATETIME_RE);
  if (zonedDateTimeMatch) {
    const { year, month, day, hour, minute, second } = toNumberParts(zonedDateTimeMatch);
    const offset = zonedDateTimeMatch[7];
    if (
      !isValidDateParts(year, month, day) ||
      hour === undefined ||
      minute === undefined ||
      !isValidTimeParts(hour, minute, second) ||
      !isValidOffset(offset)
    ) {
      return null;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 19).replace('T', ' ');
  }

  return null;
}
