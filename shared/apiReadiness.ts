export const API_READINESS_TIMEOUT_MS = 1500;
export const API_READINESS_RETRY_DELAY_MS = 250;
export const API_READINESS_ATTEMPTS = 2;

export interface ApiReadinessProbeOptions {
  attempts?: number;
  timeoutMs?: number;
  retryDelayMs?: number;
  fetcher?: typeof fetch;
}

export interface ApiReadinessProbeResult {
  ready: boolean;
  statusCode: number | null;
}

export function resolveApiReadinessUrl(apiBaseUrl: string): string | null {
  try {
    const url = new URL('/api/readiness', apiBaseUrl);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function isSuccessfulReadinessPayload(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const payload = value as { kind?: unknown; ok?: unknown };
  return payload.kind === 'readiness' && payload.ok === true;
}

function wait(delayMs: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, delayMs));
}

/**
 * Treat readiness as available only when the API returns a successful response.
 * A bounded retry avoids turning a slow first response into a maintenance page.
 */
export async function probeApiReadiness(
  apiBaseUrl: string,
  options: ApiReadinessProbeOptions = {},
): Promise<ApiReadinessProbeResult> {
  const endpoint = resolveApiReadinessUrl(apiBaseUrl);
  if (!endpoint) return { ready: false, statusCode: null };

  const attempts = Math.max(1, options.attempts ?? API_READINESS_ATTEMPTS);
  const timeoutMs = Math.max(1, options.timeoutMs ?? API_READINESS_TIMEOUT_MS);
  const retryDelayMs = Math.max(0, options.retryDelayMs ?? API_READINESS_RETRY_DELAY_MS);
  const fetcher = options.fetcher ?? fetch;
  let statusCode: number | null = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetcher(endpoint, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal,
      });
      statusCode = response.status;
      const contentType = response.headers
        .get('content-type')
        ?.split(';', 1)[0]
        ?.trim()
        .toLowerCase();
      if (response.ok && contentType === 'application/json') {
        const payload: unknown = await response.json();
        if (isSuccessfulReadinessPayload(payload)) {
          return { ready: true, statusCode: response.status };
        }
      }
    } catch {
      // A network failure or timeout counts as an unsuccessful readiness probe.
    } finally {
      clearTimeout(timeout);
    }

    if (attempt + 1 < attempts && retryDelayMs > 0) await wait(retryDelayMs);
  }

  return { ready: false, statusCode };
}

export async function isApiReady(
  apiBaseUrl: string,
  options: ApiReadinessProbeOptions = {},
): Promise<boolean> {
  return (await probeApiReadiness(apiBaseUrl, options)).ready;
}
