import { randomUUID } from 'crypto';

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { registerAuthRoutes } from './authRoutes';
import { appRouter } from '../routers';
import { createContext } from './context';
import { serveStatic, setupVite } from './vite';
import { domainRoutingMiddleware, customDomainMiddleware } from './domainRouter';
import { initializeCache, shutdownCache } from './cache/redis';
import { registerHealthEndpoint, registerVersionEndpoint } from './health';
import { getDistributionSchemaReadinessSnapshot } from '../services/runtimeSchemaCapabilities';
import { savedSearchDeliveryScheduler } from '../services/savedSearchDeliveryScheduler';
import { commercialTermNoticeScheduler } from '../services/commercialTermNoticeScheduler';
import sitemapRouter from '../routes/sitemap';
import developmentSupersessionRedirectRouter from '../routes/developmentSupersessionRedirect';
import agentOnboardingRouter from '../routes/agentOnboarding';
import { ENV } from './env';
import { registerLocalMediaRoutes } from './localMediaRoutes';
import { createAuthRateLimitStore } from './authRateLimitStore';
import {
  applyApiSecurityHeaders,
  assertBrowserSecurityPolicy,
  createStateChangingOriginGuard,
  isAllowedCorsOrigin,
  resolveBrowserSecurityPolicy,
} from './browserSecurity';
import {
  assertDeployedTrustProxyConfiguration,
  resolveTrustProxySetting,
} from './runtimeBootstrap';

// -------------------- BOOT-SAFE OPTIONAL ROUTER LOADER --------------------
async function mountOptionalRouter(app: express.Express, mountPath: string, importPath: string) {
  try {
    const mod: any = await import(importPath);

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

async function startServer() {
  console.log('[Server] startServer() called');
  console.log('[BUILD_MARKER][SERVER]', {
    commit: process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? 'unknown',
    env: process.env.NODE_ENV,
    startedAt: new Date().toISOString(),
  });

  if (!process.env.JWT_SECRET) {
    console.error('\n❌ CRITICAL ERROR: JWT_SECRET is not defined in environment variables.');
    console.error('   Login functionality will fail with HTTP 500 errors.');
    console.error('   Please set JWT_SECRET in your .env file or deployment configuration.\n');
  }

  console.log('[Server] Initializing cache...');
  await initializeCache();
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

  const browserSecurityPolicy = resolveBrowserSecurityPolicy();
  assertBrowserSecurityPolicy(browserSecurityPolicy);
  assertDeployedTrustProxyConfiguration();

  const app = express();
  app.set('trust proxy', resolveTrustProxySetting());
  const server = createServer(app);

  const isDeployedRuntime =
    browserSecurityPolicy.runtimeEnv === 'production' ||
    browserSecurityPolicy.runtimeEnv === 'staging';
  const authRateLimitMax = Number(process.env.AUTH_RATE_LIMIT_MAX || (isDeployedRuntime ? 5 : 50));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number.isFinite(authRateLimitMax) && authRateLimitMax > 0 ? authRateLimitMax : 5,
    message: 'Too many authentication requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    store: createAuthRateLimitStore({ runtimeEnv: browserSecurityPolicy.runtimeEnv }),
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

  // Apply auth rate limits after CORS so even 429 responses include CORS headers.
  for (const authPath of [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/resend-verification',
  ]) {
    app.use(authPath, authLimiter);
  }

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
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
  app.use('/api/agent', agentOnboardingRouter);
  registerHealthEndpoint(app);
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

  console.log('[Routes] ℹ️  /api/partners is handled by tRPC, skipping Express mount');

  await mountOptionalRouter(app, '/api/partner-analytics', '../partnerAnalyticsRouter');
  await mountOptionalRouter(app, '/api/content', '../contentRouter');
  await mountOptionalRouter(app, '/api/topics', '../topicsRouter');
  // Legacy partner subscription routes are intentionally disabled.
  // They require canonical authentication, ownership, and entitlement controls before remounting.
  // Legacy boost campaign routes are intentionally disabled. They lack canonical
  // publisher ownership, entitlement, billing, and abuse controls.
  await mountOptionalRouter(app, '/api/leads', '../partnerLeadRouter');

  await mountOptionalRouter(app, '/api/explore', '../routes/exploreShorts');
  await mountOptionalRouter(app, '/api/explore/video', '../routes/exploreVideoUpload');

  console.log('[Server] Optional routers loaded');

  const savedSearchSchedulerStatus = await savedSearchDeliveryScheduler.start();
  await commercialTermNoticeScheduler.start();
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

  const port = parseInt(process.env.PORT || '5000', 10);
  console.log('----------------------------------------');
  console.log(`[Server] Starting on port ${port}`);
  console.log('----------------------------------------');

  server.listen(port, '0.0.0.0', () => {
    console.log(`Backend running on http://localhost:${port}`);
    console.log(`tRPC endpoint: http://localhost:${port}/api/trpc`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch(console.error);

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await savedSearchDeliveryScheduler.stop();
  await shutdownCache();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down...');
  await savedSearchDeliveryScheduler.stop();
  await shutdownCache();
  process.exit(0);
});
