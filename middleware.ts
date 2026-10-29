import { next } from '@vercel/functions';
import { maintenanceResponseForRequest } from './server/maintenanceGate';
import {
  probeDevelopmentSupersession,
  publicApiOrigin,
} from './shared/developmentSupersessionRouting';

export const config = {
  matcher: '/:path*',
};

export default async function middleware(request: Request): Promise<Response> {
  const maintenanceResponse = await maintenanceResponseForRequest(request, {
    environment: process.env.VERCEL_ENV,
    apiBaseUrl: publicApiOrigin(process.env),
    previewGateEnabled: process.env.VITE_MAINTENANCE_GATE_ENABLED === 'true',
  });
  if (maintenanceResponse) return maintenanceResponse;

  if (request.method !== 'GET' && request.method !== 'HEAD') return next();

  const target = await probeDevelopmentSupersession({
    requestUrl: new URL(request.url),
    apiOrigin: publicApiOrigin(process.env),
    signal: AbortSignal.timeout(2_000),
  });
  if (!target) return next();

  return new Response(null, {
    status: 307,
    headers: {
      Location: target,
      'Cache-Control': 'no-store',
    },
  });
}
