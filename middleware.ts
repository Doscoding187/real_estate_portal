import { next } from '@vercel/functions';
import {
  addMaintenanceGateDiagnostics,
  evaluateMaintenanceGateForRequest,
} from './server/maintenanceGate';
import {
  MAINTENANCE_BYPASS_PATH,
  handleBypassUnlockRequest,
  requestHasValidBypassCookie,
  usableBypassSecret,
} from './server/maintenanceBypass';
import {
  probeDevelopmentSupersession,
  publicApiOrigin,
} from './shared/developmentSupersessionRouting';

export const config = {
  matcher: '/:path*',
};

export default async function middleware(request: Request): Promise<Response> {
  const environment = process.env.VERCEL_ENV;
  const previewGateEnabled = process.env.VITE_MAINTENANCE_GATE_ENABLED === 'true';
  const gateActive =
    environment === 'production' || (environment === 'preview' && previewGateEnabled);
  // TEMPORARY private bypass (remove after launch). Secret is read only here.
  const bypassSecret = gateActive
    ? usableBypassSecret(process.env.MAINTENANCE_BYPASS_SECRET)
    : null;
  if (gateActive && new URL(request.url).pathname === MAINTENANCE_BYPASS_PATH) {
    return handleBypassUnlockRequest(request, bypassSecret);
  }
  const bypassValid =
    bypassSecret !== null && (await requestHasValidBypassCookie(request, bypassSecret));

  const maintenanceGate = await evaluateMaintenanceGateForRequest(request, {
    environment,
    apiBaseUrl: publicApiOrigin(process.env),
    previewGateEnabled,
    bypassValid,
  });
  if (maintenanceGate.response) {
    return addMaintenanceGateDiagnostics(maintenanceGate.response, maintenanceGate);
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return addMaintenanceGateDiagnostics(next(), maintenanceGate);
  }

  const target = await probeDevelopmentSupersession({
    requestUrl: new URL(request.url),
    apiOrigin: publicApiOrigin(process.env),
    signal: AbortSignal.timeout(2_000),
  });
  if (!target) return addMaintenanceGateDiagnostics(next(), maintenanceGate);

  return addMaintenanceGateDiagnostics(
    new Response(null, {
      status: 307,
      headers: {
        Location: target,
        'Cache-Control': 'no-store',
      },
    }),
    maintenanceGate,
  );
}
