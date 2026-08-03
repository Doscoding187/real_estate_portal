const LEAD_RATE_LIMIT_WINDOW_MS = 60_000;
const LEAD_RATE_LIMIT_MAX_PER_WINDOW = 12;
const leadRateLimitStore = new Map<string, number[]>();

export function getPublicLeadClientIp(ctx: any): string {
  const forwarded = ctx?.req?.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }

  const socketIp = ctx?.req?.socket?.remoteAddress;
  if (typeof socketIp === 'string' && socketIp.length > 0) return socketIp;

  const reqIp = ctx?.req?.ip;
  if (typeof reqIp === 'string' && reqIp.length > 0) return reqIp;

  return 'unknown';
}

export function checkPublicLeadRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - LEAD_RATE_LIMIT_WINDOW_MS;
  const activeAttempts = (leadRateLimitStore.get(ip) || []).filter(
    timestamp => timestamp > windowStart,
  );

  if (activeAttempts.length >= LEAD_RATE_LIMIT_MAX_PER_WINDOW) return false;

  activeAttempts.push(now);
  leadRateLimitStore.set(ip, activeAttempts);
  return true;
}

export const publicLeadRateLimitConstants = {
  windowMs: LEAD_RATE_LIMIT_WINDOW_MS,
  maxPerWindow: LEAD_RATE_LIMIT_MAX_PER_WINDOW,
};
