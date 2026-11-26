const MAX_TEXT = 60;

const isScalar = (v: unknown): v is string | number | boolean =>
  typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';

const clip = (text: string) => (text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT - 1)}...` : text);

/** Filter values worth showing, in the order an admin would read them. */
const FILTER_KEYS = ['role', 'status', 'action', 'agencyId', 'search'];

/**
 * A short human summary of an audit entry's metadata, e.g. "2 results · filter: agent".
 * Shows only values already present in the metadata; the raw JSON stays available separately.
 */
export function summarizeAuditDetails(metadata: Record<string, unknown> | null): string {
  if (!metadata) return '';
  const parts: string[] = [];

  const count = metadata.count ?? metadata.total ?? metadata.results;
  if (typeof count === 'number') parts.push(`${count} ${count === 1 ? 'result' : 'results'}`);

  const filters = metadata.filters;
  if (filters && typeof filters === 'object' && !Array.isArray(filters)) {
    const f = filters as Record<string, unknown>;
    const shown = FILTER_KEYS.filter(k => isScalar(f[k]) && f[k] !== '').map(k =>
      k === 'search' ? `"${clip(String(f[k]))}"` : String(f[k]),
    );
    if (shown.length) parts.push(`filter: ${shown.join(', ')}`);
  }

  if (isScalar(metadata.action)) parts.push(`action: ${metadata.action}`);
  if (isScalar(metadata.status)) {
    parts.push(
      isScalar(metadata.previousStatus)
        ? `status: ${metadata.status} (was ${metadata.previousStatus})`
        : `status: ${metadata.status}`,
    );
  }
  for (const key of ['reason', 'feedback', 'note']) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim()) parts.push(`${key}: ${clip(value.trim())}`);
  }
  if (typeof metadata.published === 'boolean') {
    parts.push(metadata.published ? 'published' : 'not published');
  }

  return parts.join(' · ');
}
