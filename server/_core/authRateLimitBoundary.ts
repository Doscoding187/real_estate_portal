import type { ErrorRequestHandler, Request } from 'express';
import {
  AuthRateLimitStoreUnavailableError,
  AUTH_RATE_LIMIT_STORE_UNAVAILABLE_CODE,
} from './authRateLimitStore';

const AUTH_RATE_LIMIT_UNAVAILABLE_MESSAGE =
  'Authentication is temporarily unavailable. Please try again shortly.';

function getRequestId(request: Request): string {
  const requestId = (request as { requestId?: unknown }).requestId;
  return typeof requestId === 'string' && requestId.trim().length > 0 ? requestId : 'unknown';
}

/**
 * Keeps a failed distributed auth limiter fail-closed without allowing it to
 * become a hanging browser request. CORS and request-ID middleware run before
 * this handler, so the response remains actionable to the client and support.
 */
export const handleAuthRateLimitStoreUnavailable: ErrorRequestHandler = (
  error,
  request,
  response,
  next,
) => {
  if (!(error instanceof AuthRateLimitStoreUnavailableError)) {
    next(error);
    return;
  }

  if (response.headersSent) {
    next(error);
    return;
  }

  response.setHeader('Retry-After', String(error.retryAfterSeconds));
  response.status(503).json({
    error: AUTH_RATE_LIMIT_UNAVAILABLE_MESSAGE,
    code: AUTH_RATE_LIMIT_STORE_UNAVAILABLE_CODE,
    requestId: getRequestId(request),
  });
};
