const MAX_MESSAGE_LENGTH = 300;
const QUOTED_SEGMENT = /'[^']*'|"[^"]*"/g;
const EMAIL_LIKE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

export interface SafeErrorSummary {
  name: string;
  message: string;
  code?: string;
  errno?: number;
  sqlState?: string;
}

/**
 * Reduces any thrown value to stable, log-safe fields.
 *
 * Raw Error objects can carry enumerable properties (for example mysql2's
 * `sql`/`sqlMessage`) whose values embed user input. This summary keeps only
 * the error name, a bounded message with quoted segments and email-like
 * tokens redacted, and non-sensitive driver codes.
 */
export function safeErrorSummary(error: unknown): SafeErrorSummary {
  const source =
    error instanceof Error
      ? error
      : new Error(typeof error === 'string' ? error : 'Non-Error failure');
  const message = source.message
    .replace(QUOTED_SEGMENT, "'<redacted>'")
    .replace(EMAIL_LIKE, '<redacted>')
    .slice(0, MAX_MESSAGE_LENGTH);
  const summary: SafeErrorSummary = { name: source.name, message };
  if (error && typeof error === 'object') {
    const details = error as { code?: unknown; errno?: unknown; sqlState?: unknown };
    if (typeof details.code === 'string') summary.code = details.code;
    if (typeof details.errno === 'number') summary.errno = details.errno;
    if (typeof details.sqlState === 'string') summary.sqlState = details.sqlState;
  }
  return summary;
}
