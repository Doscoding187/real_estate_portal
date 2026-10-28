import { isApiReady, type ApiReadinessProbeOptions } from '../shared/apiReadiness';

const MAINTENANCE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow, noarchive" />
    <title>We’re upgrading Property Listify</title>
    <style>
      :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172554; background: #f8fafc; }
      * { box-sizing: border-box; }
      body { min-height: 100vh; margin: 0; display: grid; place-items: center; padding: 24px; }
      main { width: min(100%, 560px); padding: 48px 32px; text-align: center; background: #fff; border: 1px solid #e2e8f0; border-radius: 24px; box-shadow: 0 24px 70px rgb(15 23 42 / 8%); }
      .mark { display: grid; width: 52px; height: 52px; margin: 0 auto 24px; place-items: center; border-radius: 16px; background: #e0f2fe; color: #0369a1; font-size: 24px; font-weight: 800; }
      h1 { margin: 0; font-size: clamp(1.65rem, 5vw, 2.2rem); line-height: 1.15; letter-spacing: -0.03em; }
      p { margin: 16px 0 0; color: #475569; font-size: 1.05rem; line-height: 1.65; }
      .note { margin-top: 28px; color: #64748b; font-size: .9rem; }
    </style>
  </head>
  <body>
    <main role="status" aria-live="polite">
      <div class="mark" aria-hidden="true">P</div>
      <h1>We’re upgrading Property Listify</h1>
      <p>We’ll be back shortly. Search and listing services are temporarily unavailable while we restore the service.</p>
      <p class="note">Please try again in a few minutes.</p>
    </main>
  </body>
</html>`;

export interface MaintenanceGateOptions {
  environment: string | undefined;
  apiBaseUrl: string | undefined;
  fetcher?: typeof fetch;
  probeOptions?: Omit<ApiReadinessProbeOptions, 'fetcher'>;
}

export async function maintenanceResponseForRequest(
  request: Request,
  options: MaintenanceGateOptions,
): Promise<Response | null> {
  if (options.environment !== 'production') return null;
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  if (!request.headers.get('accept')?.toLowerCase().includes('text/html')) return null;

  const ready = await isApiReady(options.apiBaseUrl ?? '', {
    ...options.probeOptions,
    ...(options.fetcher ? { fetcher: options.fetcher } : {}),
  });
  if (ready) return null;

  const headers = new Headers({
    'Cache-Control': 'no-store, max-age=0',
    'Content-Security-Policy':
      "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    'Content-Type': 'text/html; charset=utf-8',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Retry-After': '120',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
  });

  return new Response(request.method === 'HEAD' ? null : MAINTENANCE_HTML, {
    status: 503,
    headers,
  });
}
