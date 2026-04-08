/**
 * Database Type Utilities
 *
 * Canonical helpers for type conversion at database boundaries.
 * Schema uses string timestamps - these ensure consistent conversion.
 */

/**
 * Convert Date to MySQL timestamp string for database insertion
 * Schema expects timestamp({ mode: 'string' })
 */
export function toDbTimestamp(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  if (typeof date === 'string') return date;
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Convert Date to MySQL timestamp string, required (throws if null)
 */
export function toDbTimestampRequired(date: Date | string): string {
  if (typeof date === 'string') return date;
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Get current timestamp as a MySQL-safe timestamp string
 */
export function nowAsDbTimestamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Default values for required user fields
 */
export const USER_DEFAULTS = {
  emailVerified: 0,
  isSubaccount: 0,
} as const;
