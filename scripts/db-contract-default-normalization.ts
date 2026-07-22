/**
 * Normalize semantically equivalent defaults returned by MySQL metadata.
 *
 * MySQL may expose Drizzle's timestamp defaultNow() expression as now(),
 * CURRENT_TIMESTAMP, or CURRENT_TIMESTAMP(). These values represent the
 * same current-time default and should satisfy the same database contract.
 *
 * All non-current-time defaults retain exact comparison semantics.
 */

const CURRENT_TIMESTAMP_DEFAULT = Symbol('CURRENT_TIMESTAMP_DEFAULT');

function normalizedDatabaseDefault(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  let candidate = value
    .trim()
    .toUpperCase()
    .replace(/\\s+/g, '');

  while (
    candidate.length >= 2 &&
    candidate.startsWith('(') &&
    candidate.endsWith(')')
  ) {
    candidate = candidate.slice(1, -1);
  }

  if (
    candidate === 'CURRENT_TIMESTAMP' ||
    candidate === 'CURRENT_TIMESTAMP()' ||
    candidate === 'NOW' ||
    candidate === 'NOW()'
  ) {
    return CURRENT_TIMESTAMP_DEFAULT;
  }

  return value;
}

export function databaseDefaultMatches(
  actual: unknown,
  expected: unknown,
): boolean {
  return (
    normalizedDatabaseDefault(actual) ===
    normalizedDatabaseDefault(expected)
  );
}
