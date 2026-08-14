import { next } from '@vercel/functions';
import {
  probeDevelopmentSupersession,
  publicApiOrigin,
} from './shared/developmentSupersessionRouting';

export const config = {
  matcher: '/development/:path*',
};

export default async function developmentSupersessionMiddleware(
  request: Request,
): Promise<Response> {
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
