export function normalizeDateTimeForDb(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 19).replace('T', ' ');
  }
  if (typeof value !== 'string') return null;

  const raw = value.trim();
  if (!raw) return null;

  const normalized = raw.replace('T', ' ');
  const datetimeMatch = normalized.match(
    /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})(?::(\d{2}))?/,
  );

  if (datetimeMatch) {
    const seconds = datetimeMatch[3] ?? '00';
    return `${datetimeMatch[1]} ${datetimeMatch[2]}:${seconds}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 19).replace('T', ' ');
}
