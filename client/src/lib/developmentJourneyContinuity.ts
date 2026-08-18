export const DEVELOPMENT_SEARCH_PATH = '/new-developments';
export const DEVELOPMENT_SEARCH_RETURN_PARAM = 'returnTo';

const MAX_RETURN_URL_LENGTH = 2048;
const FALLBACK_ORIGIN = 'http://property-listify.local';

function applicationOrigin(): string {
  return typeof window !== 'undefined' ? window.location.origin : FALLBACK_ORIGIN;
}

function toSearchParams(search: string | URLSearchParams): URLSearchParams {
  if (search instanceof URLSearchParams) return new URLSearchParams(search);
  return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
}

/**
 * Accept only a same-origin canonical developments search path as a return
 * destination. Detail and unit URLs are intentionally not accepted here so
 * the journey cannot create a nested or ambiguous return chain.
 */
export function normalizeDevelopmentSearchReturn(value: string | null | undefined): string | null {
  if (!value || value.length > MAX_RETURN_URL_LENGTH || !value.startsWith('/')) return null;

  try {
    const url = new URL(value, applicationOrigin());
    if (url.origin !== applicationOrigin()) return null;
    if (url.pathname !== DEVELOPMENT_SEARCH_PATH || url.hash) return null;

    const searchParams = new URLSearchParams(url.search);
    if (searchParams.has(DEVELOPMENT_SEARCH_RETURN_PARAM)) return null;

    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

export function getDevelopmentSearchReturn(search: string | URLSearchParams): string | null {
  return normalizeDevelopmentSearchReturn(
    toSearchParams(search).get(DEVELOPMENT_SEARCH_RETURN_PARAM),
  );
}

/**
 * Add a validated search return to an internal development journey URL while
 * preserving any route query and hash already present on that URL.
 */
export function appendDevelopmentSearchReturn(path: string, returnTo: string | null): string {
  const normalizedReturn = normalizeDevelopmentSearchReturn(returnTo);
  if (!normalizedReturn) return path;

  try {
    const url = new URL(path, applicationOrigin());
    if (url.origin !== applicationOrigin()) return path;
    url.searchParams.set(DEVELOPMENT_SEARCH_RETURN_PARAM, normalizedReturn);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return path;
  }
}
