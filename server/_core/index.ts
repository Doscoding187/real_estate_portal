import { randomUUID } from 'crypto';
import { createAuthMeTimingMiddleware } from './authMeTiming';

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { registerAuthRoutes } from './authRoutes';
import { registerFounderGoogleIdentityRoutes } from './founderGoogleIdentityRoutes';
import { appRouter } from '../routers';
import { createContext } from './context';
import { serveStatic, setupVite } from './vite';
import { domainRoutingMiddleware, customDomainMiddleware } from './domainRouter';
import { initializeCache, shutdownCache } from './cache/redis';
import { cache } from '../lib/cache';
import { redisCache } from '../lib/redis';
import { stopGooglePlacesService } from '../services/googlePlacesServiceLifecycle';
import { registerHealthEndpoint, registerVersionEndpoint } from './health';
import { stopHostedDatabaseReadinessMonitor } from './hostedDatabaseReadinessMonitor';
import { getDistributionSchemaReadinessSnapshot } from '../services/runtimeSchemaCapabilities';
import { savedSearchDeliveryScheduler } from '../services/savedSearchDeliveryScheduler';
import { commercialTermNoticeScheduler } from '../services/commercialTermNoticeScheduler';
import sitemapRouter from '../routes/sitemap';
import developmentSupersessionRedirectRouter from '../routes/developmentSupersessionRedirect';
import agentOnboardingRouter from '../routes/agentOnboarding';
import { ENV } from './env';
import { registerLocalMediaRoutes } from './localMediaRoutes';
import { createAuthRateLimitStore, RedisAuthRateLimitStore } from './authRateLimitStore';
import { shutdownDb } from '../db-connection';
import { handleAuthRateLimitStoreUnavailable } from './authRateLimitBoundary';
import {
  configurePublicLeadRateLimitStore,
  shutdownPublicLeadRateLimitStore,
} from '../services/publicLeadRateLimitService';
import {
  getCommercialActivationOperatorStatus,
  initializeCommercialActivationPolicy,
} from '../services/commercialActivationPolicy';
import { assertDeployedSecurityConfiguration } from './securityRuntimeConfiguration';
import { assertHostedRuntimeConfiguration, resolveHostedBuildSha } from './hostedRuntimeConfiguration';
import { registerRequestBodyBoundary } from './requestBodyBoundary';
import {
  applyApiSecurityHeaders,
  assertBrowserSecurityPolicy,
  createStateChangingOriginGuard,
  isAllowedCorsOrigin,
  resolveBrowserSecurityPolicy,
} from './browserSecurity';
import {
  assertDeployedTrustProxyConfiguration,
  resolveAppRuntimeEnv,
  resolveTrustProxySetting,
} from './runtimeBootstrap';

// -------------------- BOOT-SAFE OPTIONAL ROUTER LOADER --------------------
async function mountOptionalRouter(app: express.Express, mountPath: string, importPath: string) {
  try {
    const mod: any = await import(importPath);
    if (shuttingDown) return;

    const routerCandidate = mod?.default ?? mod?.router ?? mod?.routes ?? mod?.partnerRouter ?? mod;

    const isMiddleware =
      typeof routerCandidate === 'function' ||
      (routerCandidate &&
        typeof routerCandidate === 'object' &&
        typeof routerCandidate.use === 'function');

    if (!isMiddleware) {
      console.warn(
        `[Routes] ⚠️  Skipping ${mountPath} (no usable router export) from ${importPath}. Exports:`,
        Object.keys(mod ?? {}),
      );
      return;
    }

    app.use(mountPath, routerCandidate);
    console.log(`[Routes] ✅ Mounted ${mountPath} <- ${importPath}`);
  } catch (err: any) {
    console.warn(
      `[Routes] ⚠️  Skipping ${mountPath} (failed import) from ${importPath}:`,
      err?.message,
    );
  }
}

let activeServer: ReturnType<typeof createServer> | null = null;
let activeAuthStore: RedisAuthRateLimitStore | null = null;
let stopFounderGoogleIdentityProof: (() => Promise<void>) | null = null;
let shuttingDown = false;
const listenerCancellation = new AbortController();
let startupFailed = false;

async function startServer() {
  const runtimeEnvironment = resolveAppRuntimeEnv();
  assertDeployedSecurityConfiguration(process.env, runtimeEnvironment);
  assertHostedRuntimeConfiguration(process.env, runtimeEnvironment);
  initializeCommercialActivationPolicy();

  console.log('[Server] startServer() called');
  console.log('[BUILD_MARKER][SERVER]', {
    commit: resolveHostedBuildSha() ?? 'local-dev',
    env: runtimeEnvironment,
    startedAt: new Date().toISOString(),
  });
  console.info('[CommercialActivation] Resolved release configuration',
    getCommercialActivationOperatorStatus(),
  );

  console.log('[Server] Initializing cache...');
  await initializeCache();
  if (shuttingDown) return;
  console.log('[Server] Cache initialized');

  console.log('[Server] Probing distribution schema readiness...');
  try {
    const distributionSchemaSnapshot = await getDistributionSchemaReadinessSnapshot({
      forceRefresh: true,
    });
    console.log('[DistributionSchema] Snapshot', distributionSchemaSnapshot);
    if (ENV.distributionNetworkEnabled && !distributionSchemaSnapshot.ready) {
      const missing = distributionSchemaSnapshot.missingItems.join(', ');
      console.error(
        `[DistributionSchema] Distribution routes will be guarded because required schema items are missing: ${missing}`,
      );
    }
  } catch (error) {
    console.error(
      '[DistributionSchema] Startup readiness probe failed. Continuing so core API routes can serve traffic; guarded distribution routes will report schema readiness errors on access.',
      error,
    );
  }

  if (shuttingDown) return;
  const browserSecurityPolicy = resolveBrowserSecurityPolicy();
  assertBrowserSecurityPolicy(browserSecurityPolicy);
  assertDeployedTrustProxyConfiguration();

  const app = express();
  app.set('trust proxy', resolveTrustProxySetting());
  const server = createServer(app);
  activeServer = server;

  const isDeployedRuntime =
    browserSecurityPolicy.runtimeEnv === 'production' ||
    browserSecurityPolicy.runtimeEnv === 'staging';
  const authRateLimitMax = Number(process.env.AUTH_RATE_LIMIT_MAX || (isDeployedRuntime ? 5 : 50));

  const authRateLimitStore = createAuthRateLimitStore({
    runtimeEnv: browserSecurityPolicy.runtimeEnv,
  });
  activeAuthStore = authRateLimitStore instanceof RedisAuthRateLimitStore ? authRateLimitStore : null;
  configurePublicLeadRateLimitStore({ runtimeEnv: browserSecurityPolicy.runtimeEnv });
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number.isFinite(authRateLimitMax) && authRateLimitMax > 0 ? authRateLimitMax : 5,
    message: 'Too many authentication requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    // Keep the security boundary fail-closed. The adjacent error middleware
    // converts the store's bounded availability failure into a CORS-bearing
    // retryable response instead of silently allowing unrate-limited auth.
    passOnStoreError: false,
    store: authRateLimitStore,
  });

  app.use((req, res, next) => {
    const headerRequestId = req.headers['x-request-id'];
    const requestId =
      typeof headerRequestId === 'string' && /^[A-Za-z0-9._-]{8,128}$/.test(headerRequestId)
        ? headerRequestId
        : randomUUID();

    (req as any).requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  });

  app.use(createAuthMeTimingMiddleware());
  app.use((req, res, next) => applyApiSecurityHeaders(browserSecurityPolicy, req, res, next));

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        callback(null, isAllowedCorsOrigin(browserSecurityPolicy, origin));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'trpc-batch-mode',
        'x-operating-as-publisher',
        'x-request-id',
      ],
      maxAge: 86400,
    }),
  );

  app.use(createStateChangingOriginGuard(browserSecurityPolicy));

  // Apply auth rate limits after CORS so both 429 and a bounded fail-closed
  // dependency response include browser CORS headers.
  for (const authPath of [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/resend-verification',
    '/api/auth/google/start',
    '/api/auth/google/callback',
  ]) {
    app.use(authPath, authLimiter, handleAuthRateLimitStoreUnavailable);
  }

  registerRequestBodyBoundary(app);
  registerLocalMediaRoutes(app);

  // Force WWW redirect for the main production domain.
  app.use((req, res, next) => {
    const host = req.hostname.toLowerCase();

    if (host === 'propertylistifysa.co.za') {
      return res.redirect(301, `https://www.propertylistifysa.co.za${req.originalUrl}`);
    }

    next();
  });

  app.use(domainRoutingMiddleware);
  app.use(customDomainMiddleware);

  app.use('/', sitemapRouter);
  app.use('/', developmentSupersessionRedirectRouter);
  registerAuthRoutes(app);
  stopFounderGoogleIdentityProof = registerFounderGoogleIdentityRoutes(app);
  app.use('/api/agent', agentOnboardingRouter);
  registerHealthEndpoint(app, { authRateLimitStore });
  registerVersionEndpoint(app);

  app.use(
    '/api/trpc',
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError({ error, path, type, req }) {
        console.error('[tRPC] Request failed', {
          requestId: (req as any)?.requestId || 'unknown',
          path,
          type,
          code: error.code,
        });
      },
    }),
  );

  // -------------------- OPTIONAL ROUTERS (FIXED PATHS) --------------------
  console.log('[Server] Loading optional routers...');

  await mountOptionalRouter(app, '/api/analytics', '../routes/analytics');
  if (shuttingDown) return;

  console.log('[Routes] ℹ️  /api/partners is handled by tRPC, skipping Express mount');

  // Legacy partner analytics routes are intentionally disabled. They expose
  // commercial analytics without canonical partner identity or ownership checks.
  await mountOptionalRouter(app, '/api/content', '../contentRouter');
  if (shuttingDown) return;
  await mountOptionalRouter(app, '/api/topics', '../topicsRouter');
  if (shuttingDown) return;
  // Legacy partner subscription routes are intentionally disabled.
  // They require canonical authentication, ownership, and entitlement controls before remounting.
  // Legacy boost campaign routes are intentionally disabled. They lack canonical
  // publisher ownership, entitlement, billing, and abuse controls.
  // Legacy partner-lead routes are intentionally disabled. They bypass the
  // canonical public lead-capture consent, rate-limit, routing, and custody boundary.

  await mountOptionalRouter(app, '/api/explore', '../routes/exploreShorts');
  if (shuttingDown) return;
  await mountOptionalRouter(app, '/api/explore/video', '../routes/exploreVideoUpload');
  if (shuttingDown) return;

  console.log('[Server] Optional routers loaded');

  const savedSearchSchedulerStatus = await savedSearchDeliveryScheduler.start();
  if (shuttingDown) return;
  await commercialTermNoticeScheduler.start();
  if (shuttingDown) return;
  console.log('[SavedSearchScheduler] Startup status', savedSearchSchedulerStatus);

  if (process.env.NODE_ENV === 'development' && process.env.SKIP_FRONTEND !== 'true') {
    console.log('[Server] Using Vite development server');
    await setupVite(app, server);
  } else if (process.env.NODE_ENV !== 'development' && process.env.SKIP_FRONTEND !== 'true') {
    console.log('[Server] Serving static files');
    serveStatic(app);
  } else {
    console.log('[Server] Skipping frontend static file serving (backend-only mode)');
  }

  if (shuttingDown) return;
  const port = parseInt(process.env.PORT || '5000', 10);
  console.log('----------------------------------------');
  console.log(`[Server] Starting on port ${port}`);
  console.log('----------------------------------------');

  server.listen({ port, host: '0.0.0.0', signal: listenerCancellation.signal }, () => {
    if (shuttingDown) return;
    console.log(`Backend running on http://localhost:${port}`);
    console.log(`tRPC endpoint: http://localhost:${port}/api/trpc`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

const startup = startServer().catch(error => {
  startupFailed = true;
  console.error('[Startup] Application initialization failed.', {
    message: error instanceof Error ? error.message : 'Unknown startup error.',
  });
  process.exitCode = 1;
});

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[Shutdown] ${signal} received; draining HTTP and stopping local schedulers.`);
  const deadline = setTimeout(() => {
    console.error('[Shutdown] Drain deadline exceeded.');
    activeServer?.closeAllConnections();
    process.exit(1);
  }, 20_000);
  const failures: { resource: string; error: unknown }[] = [];
  const attempt = async (
    resource: string,
    close: () => void | Promise<unknown>,
  ): Promise<boolean> => {
    try {
      await close();
      return true;
    } catch (error) {
      failures.push({ resource, error });
      process.exitCode = 1;
      console.error(`[Shutdown] Failed to close ${resource}.`, error);
      return false;
    }
  };
  let consumersDrained = false;
  try {
    // Cancel scheduler startup immediately, before awaiting any other drain.
    const savedDrain = attempt('saved-search scheduler', () => savedSearchDeliveryScheduler.stop());
    const commercialDrain = attempt('commercial scheduler', () =>
      commercialTermNoticeScheduler.stop(),
    );
    const server = activeServer;
    const wasListening = Boolean(server?.listening);
    const httpDrain = attempt('HTTP server', () => {
      if (!wasListening || !server) return;
      return new Promise<void>((resolve, reject) => {
        server.close(error => (error ? reject(error) : resolve()));
      });
    });
    // A pending listen must not bind after the shutdown signal. A listening
    // server uses the awaited graceful close above to drain existing requests.
    if (!wasListening) listenerCancellation.abort();
    await startup;
    const [httpStopped, savedStopped, commercialStopped] = await Promise.all([
      httpDrain,
      savedDrain,
      commercialDrain,
    ]);
    const readinessStopped = await attempt('readiness monitor', stopHostedDatabaseReadinessMonitor);
    consumersDrained = httpStopped && savedStopped && commercialStopped && readinessStopped;

    await attempt('auth rate-limit store', async () => {
      await activeAuthStore?.shutdown();
    });
    await attempt('founder Google state store', async () => {
      await stopFounderGoogleIdentityProof?.();
    });
    await attempt('public lead rate-limit store', shutdownPublicLeadRateLimitStore);
    await attempt('core Redis cache', shutdownCache);
    await attempt('Google Places', stopGooglePlacesService);
    await attempt('Explore Redis cache', () => redisCache.disconnect());
    await attempt('in-memory cache', () => cache.destroy());
    if (consumersDrained) {
      await attempt('database', shutdownDb);
    } else {
      console.error('[Shutdown] Database closure deferred: consumers did not finish their drain.');
    }
    if (failures.length) {
      // Keep the original failure object and log every failed resource above.
      console.error('[Shutdown] Failed to close cleanly.', failures[0].error);
      process.exitCode = 1;
    } else if (startupFailed) {
      process.exitCode = 1;
    } else {
      console.log('[Shutdown] Cleanup completed.');
      process.exitCode = 0;
    }
  } catch (error) {
    failures.push({ resource: 'shutdown', error });
    console.error('[Shutdown] Failed to close cleanly.', error);
    process.exitCode = 1;
  } finally {
    // A failed consumer drain must not close its database or disable the bound.
    // After all attempts settle, failures may exit naturally with code 1. Keep
    // the same watchdog for any failed resource that still holds the loop open.
    if (consumersDrained) {
      if (failures.length || startupFailed) deadline.unref();
      else clearTimeout(deadline);
    }
  }
}

process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
process.on('SIGINT', () => { void shutdown('SIGINT'); });
