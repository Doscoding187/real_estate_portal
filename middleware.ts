import { next } from '@vercel/functions';
import {
  addMaintenanceGateDiagnostics,
  evaluateMaintenanceGateForRequest,
} from './server/maintenanceGate';
import {
  probeDevelopmentSupersession,
  publicApiOrigin,
} from './shared/developmentSupersessionRouting';

export const config = {
  matcher: '/:path*',
};

export default async function middleware(request: Request): Promise<Response> {
  const maintenanceGate = await evaluateMaintenanceGateForRequest(request, {
    environment: process.env.VERCEL_ENV,
    apiBaseUrl: publicApiOrigin(process.env),
    previewGateEnabled: process.env.VITE_MAINTENANCE_GATE_ENABLED === 'true',
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
