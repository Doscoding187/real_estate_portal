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

  // Determine if origin shares the same root domain (e.g. www.prop.co.za vs api.prop.co.za)
  const origin = req.headers.origin;
  const rootDomain = getRootDomain(hostname);
  const isSameRoot = origin && origin.includes(rootDomain);

  // Cross-domain is ONLY when totally different domains (e.g. vercel.app -> custom domain)
  // If sharing subdomains, we can use 'Lax' which is more reliable than 'None'
  const isExternalCrossDomain =
    origin?.includes('.vercel.app') ||
    origin?.includes('.railway.app') ||
    (origin?.startsWith('https://') && !isSameRoot);

  const options: Pick<CookieOptions, 'domain' | 'httpOnly' | 'path' | 'sameSite' | 'secure'> = {
    domain,
    httpOnly: true,
    path: '/',
    // Use 'none' only for truly external cross-domain (e.g. Vercel preview URLs)
    // Use 'lax' for production subdomains (same eTLD+1)
    sameSite: isProduction && isSecure && isExternalCrossDomain ? 'none' : 'lax',
    secure: (isProduction && isSecure) || isExternalCrossDomain,
  };

  // Debug log for production auth issues
  if (req.path.includes('/auth') && req.method === 'POST') {
    console.log('[Cookies] Setting session cookie:', {
      hostname,
      rootDomain,
      origin,
      isSameRoot,
      isExternalCrossDomain,
      options,
    });
  }

  return options;
}
