import { PROVINCE_SLUGS } from '@shared/location-contract';

export { PROVINCE_SLUGS };

/** Normalize display text for matching within an explicitly selected Place. */
export function normalizeLocationKey(value: string): string {
  if (!value) return '';
  return value.toLowerCase().trim().replace(/\s+/g, '-');
}
