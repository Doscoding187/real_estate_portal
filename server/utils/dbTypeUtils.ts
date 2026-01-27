/**
 * Database Type Utilities
 *
 * Canonical helpers for type conversion at database boundaries.
 * Schema uses string timestamps - these ensure consistent conversion.
 */

/**
 * Convert Date to ISO string for database insertion
 * Schema expects timestamp({ mode: 'string' })
 */
export function toDbTimestamp(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  if (typeof date === 'string') return date;
  return date.toISOString();
}

/**
 * Convert Date to ISO string, required (throws if null)
 */
export function toDbTimestampRequired(date: Date | string): string {
  if (typeof date === 'string') return date;
  return date.toISOString();
}

/**
 * Get current timestamp as ISO string
 */
export function nowAsDbTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Default values for required user fields
 */
export const USER_DEFAULTS = {
  emailVerified: 0,
  isSubaccount: 0,
} as const;
