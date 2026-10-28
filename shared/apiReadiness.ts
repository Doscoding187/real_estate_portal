export const API_READINESS_TIMEOUT_MS = 1500;
export const API_READINESS_RETRY_DELAY_MS = 250;
export const API_READINESS_ATTEMPTS = 2;

export interface ApiReadinessProbeOptions {
  attempts?: number;
  timeoutMs?: number;
  retryDelayMs?: number;
  fetcher?: typeof fetch;
}

export function resolveApiReadinessUrl(apiBaseUrl: string): string | null {
  try {
    const url = new URL('/api/readiness', apiBaseUrl);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function wait(delayMs: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, delayMs));
}

/**
 * Treat readiness as available only when the API returns a successful response.
 * A bounded retry avoids turning a slow first response into a maintenance page.
 */
export async function isApiReady(
  apiBaseUrl: string,
  options: ApiReadinessProbeOptions = {},
): Promise<boolean> {
  const endpoint = resolveApiReadinessUrl(apiBaseUrl);
  if (!endpoint) return false;

  const attempts = Math.max(1, options.attempts ?? API_READINESS_ATTEMPTS);
  const timeoutMs = Math.max(1, options.timeoutMs ?? API_READINESS_TIMEOUT_MS);
  const retryDelayMs = Math.max(0, options.retryDelayMs ?? API_READINESS_RETRY_DELAY_MS);
  const fetcher = options.fetcher ?? fetch;

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
      if (response.ok) return true;
    } catch {
      // A network failure or timeout counts as an unsuccessful readiness probe.
    } finally {
      clearTimeout(timeout);
    }

    if (attempt + 1 < attempts && retryDelayMs > 0) await wait(retryDelayMs);
  }

  return false;
}
