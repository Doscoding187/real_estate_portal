const LEAD_RATE_LIMIT_WINDOW_MS = 60_000;
const LEAD_RATE_LIMIT_MAX_PER_WINDOW = 12;
const leadRateLimitStore = new Map<string, number[]>();

export function getPublicLeadClientIp(ctx: any): string {
  // Express resolves req.ip using its configured trust-proxy policy. Never
  // interpret x-forwarded-for here: doing so would let an arbitrary public
  // client choose the rate-limit key when the proxy chain is not trusted.
  const reqIp = ctx?.req?.ip;
  if (typeof reqIp === 'string' && reqIp.trim().length > 0) return reqIp.trim();

  const socketIp = ctx?.req?.socket?.remoteAddress;
  if (typeof socketIp === 'string' && socketIp.trim().length > 0) return socketIp.trim();

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
