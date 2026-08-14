const DEVELOPMENT_ROUTE = /^\/development\/[^/?#]+\/?$/;
const DEFAULT_PUBLIC_API_ORIGIN = 'https://api.propertylistifysa.co.za';

export type SupersessionProbeInput = {
  requestUrl: URL;
  apiOrigin?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
};

function normalizedDevelopmentPath(pathname: string): string | null {
  if (!DEVELOPMENT_ROUTE.test(pathname)) return null;
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function validApiOrigin(value: string | undefined): URL {
  const candidate = new URL(value?.trim() || DEFAULT_PUBLIC_API_ORIGIN);
  if (
    !['http:', 'https:'].includes(candidate.protocol) ||
    candidate.username ||
    candidate.password
  ) {
    throw new Error('Public API origin must be an uncredentialed HTTP(S) origin.');
  }
  candidate.pathname = '/';
  candidate.search = '';
  candidate.hash = '';
  return candidate;
}

export function resolveCanonicalDevelopmentRedirect(
  requestUrl: URL,
  location: string | null,
): string | null {
  const sourcePath = normalizedDevelopmentPath(requestUrl.pathname);
  if (!sourcePath || !location?.startsWith('/') || location.startsWith('//')) return null;

  const target = new URL(location, requestUrl.origin);
  const targetPath = normalizedDevelopmentPath(target.pathname);
  if (!targetPath || target.origin !== requestUrl.origin || targetPath === sourcePath) return null;

  return `${targetPath}${target.search}`;
}

export async function probeDevelopmentSupersession(
  input: SupersessionProbeInput,
): Promise<string | null> {
  const sourcePath = normalizedDevelopmentPath(input.requestUrl.pathname);
  if (!sourcePath) return null;

  let apiOrigin: URL;
  try {
    apiOrigin = validApiOrigin(input.apiOrigin);
  } catch {
    return null;
  }
  if (apiOrigin.origin === input.requestUrl.origin) return null;

  const probeUrl = new URL(`${sourcePath}${input.requestUrl.search}`, apiOrigin);
  try {
    const response = await (input.fetchImpl ?? fetch)(probeUrl, {
      method: 'HEAD',
      redirect: 'manual',
      signal: input.signal,
    });
    if (response.status !== 307) return null;
    return resolveCanonicalDevelopmentRedirect(input.requestUrl, response.headers.get('location'));
  } catch {
    // The public SPA remains available if the route-authority probe is unavailable.
    return null;
  }
}

export function publicApiOrigin(environment: Record<string, string | undefined>): string {
  return (
    environment.PUBLIC_API_ORIGIN ||
    environment.VITE_API_URL ||
    environment.VITE_API_BASE_URL ||
    DEFAULT_PUBLIC_API_ORIGIN
  );
}
