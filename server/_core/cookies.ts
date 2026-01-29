import type { CookieOptions, Request } from 'express';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(':');
}

/**
 * Extract root domain for cookie sharing across subdomains
 * e.g., "api.propertylistifysa.co.za" -> "propertylistifysa.co.za"
 * This enables cookies to work across www and api subdomains
 */
function getRootDomain(hostname: string): string {
  const parts = hostname.split('.');
  // Handle domains like propertylistifysa.co.za (3+ parts with .co.za TLD)
  if (parts.length >= 3 && parts[parts.length - 2] === 'co') {
    // .co.za, .co.uk style TLDs - take last 3 parts
    return parts.slice(-3).join('.');
  }
  // Handle standard domains like example.com (2+ parts)
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }
  return hostname;
}

function isSecureRequest(req: Request) {
  if (req.protocol === 'https') return true;

  const forwardedProto = req.headers['x-forwarded-proto'];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(',');

  return protoList.some(proto => proto.trim().toLowerCase() === 'https');
}

export function getSessionCookieOptions(
  req: Request,
): Pick<CookieOptions, 'domain' | 'httpOnly' | 'path' | 'sameSite' | 'secure'> {
  const hostname = req.hostname;
  const shouldSetDomain =
    hostname &&
    !LOCAL_HOSTS.has(hostname) &&
    !isIpAddress(hostname) &&
    hostname !== '127.0.0.1' &&
    hostname !== '::1';

  const domain = shouldSetDomain
    ? `.${getRootDomain(hostname)}` // Use root domain for cross-subdomain cookie sharing
    : undefined;

  const isProduction = process.env.NODE_ENV === 'production';
  const isSecure = isSecureRequest(req);

  // For cross-domain scenarios (Vercel frontend + Railway backend), we need sameSite: 'none' and secure: true
  // This is required when frontend is served over HTTPS (like Vercel) and communicates with backend
  const isCrossDomain =
    req.headers.origin?.includes('.vercel.app') ||
    req.headers.origin?.includes('.railway.app') ||
    (req.headers.origin?.startsWith('https://') && !req.headers.origin?.includes(hostname));

  return {
    domain,
    httpOnly: true,
    path: '/',
    // For cross-domain (Vercel frontend + Railway backend), use 'none'
    // For same-domain or local dev, use 'lax'
    sameSite: (isProduction && isSecure) || isCrossDomain ? 'none' : 'lax',
    // Secure cookies required for sameSite: 'none'
    secure: (isProduction && isSecure) || isCrossDomain,
  };
}
