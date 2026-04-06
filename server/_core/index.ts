import dotenv from 'dotenv';
import path from 'path';
import { randomUUID } from 'crypto';

// Load .env first
dotenv.config();
// Load .env.local (overrides .env) - critical for secrets
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

import { sql } from 'drizzle-orm';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { registerAuthRoutes } from './authRoutes';
import { appRouter } from '../routers';
import { createContext } from './context';
import { serveStatic, setupVite } from './vite';
import { ENV } from './env';
import { handleStripeWebhook } from './stripeWebhooks';
import { domainRoutingMiddleware, customDomainMiddleware } from './domainRouter';
import { initializeCache, shutdownCache } from './cache/redis';
import { registerHealthEndpoint } from './health';
import {
  getDistributionSchemaReadinessSnapshot,
  getMissingRuntimeSchemaTargets,
  getRuntimeSchemaCapabilities,
  type RuntimeSchemaStrictTarget,
} from '../services/runtimeSchemaCapabilities';
import internalCronRouter from '../routes/internalCron';

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

  console.log('[Server] Probing runtime schema capabilities...');
  const schemaCapabilities = await getRuntimeSchemaCapabilities({ forceRefresh: true });
  const strictTargets = (ENV.schemaCapabilitiesStrictTargets.length
    ? ENV.schemaCapabilitiesStrictTargets
    : ['demand_engine', 'economic_actors', 'showings']
  ).filter((target): target is RuntimeSchemaStrictTarget =>
    ['demand_engine', 'economic_actors', 'showings'].includes(target),
  );
  const missingTargets = getMissingRuntimeSchemaTargets(schemaCapabilities, strictTargets);

  console.log('[SchemaCapabilities] Snapshot', {
    checkedAt: schemaCapabilities.checkedAt,
    demandEngineReady: schemaCapabilities.demandEngineReady,
    economicActorsReady: schemaCapabilities.economicActorsReady,
    showingsReady: schemaCapabilities.showingsReady,
    strictMode: ENV.schemaCapabilitiesStrict,
    strictTargets,
    missingTargets,
  });

  if (missingTargets.length > 0) {
    const failureMessage = `[SchemaCapabilities] Missing required schema capabilities: ${missingTargets.join(', ')}.`;
    if (ENV.schemaCapabilitiesStrict) {
      throw new Error(`${failureMessage} Refusing to boot because SCHEMA_CAPABILITIES_STRICT=true.`);
    }
    console.warn(`${failureMessage} Booting in compatibility mode because strict mode is disabled.`);
  }

  console.log('[Server] Probing distribution schema readiness...');
  const distributionSchema = await getDistributionSchemaReadinessSnapshot({ forceRefresh: true });
  console.log('[DistributionSchema] Snapshot', {
    checkedAt: distributionSchema.checkedAt,
    ready: distributionSchema.ready,
    missingItems: distributionSchema.missingItems,
    operations: Object.fromEntries(
      Object.entries(distributionSchema.operations).map(([operation, status]) => [
        operation,
        {
          ready: status.ready,
          missingItems: status.missingItems,
        },
      ]),
    ),
  });
  if (!distributionSchema.ready) {
    console.warn(
      '[DistributionSchema] Distribution admin routes will stay in guarded compatibility mode until missing migrations are applied.',
    );
  }

  const app = express();
  const server = createServer(app);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });

  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5000',
    'https://real-estate-portal-xi.vercel.app',
    'https://realestateportal-production-8e32.up.railway.app',
    'https://realestateportal-production-9bb8.up.railway.app',
    'https://www.propertylistifysa.co.za',
    'https://propertylistifysa.co.za',
    'http://localhost:3009',
  ];
  const allowedOriginPatterns = [
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i,
    /^https:\/\/([a-z0-9-]+\.)?propertylistifysa\.co\.za(?::\d+)?$/i,
    /^https:\/\/[a-z0-9-]+\.vercel\.app(?::\d+)?$/i,
    /^https:\/\/[a-z0-9-]+\.up\.railway\.app(?::\d+)?$/i,
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        const isAllowed =
          allowedOrigins.includes(origin) || allowedOriginPatterns.some(pattern => pattern.test(origin));

        if (isAllowed) {
          console.log(`✅ CORS: Allowed origin: ${origin}`);
          callback(null, true);
        } else {
          console.warn(`❌ CORS: Blocked origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'trpc-batch-mode', 'x-operating-as-brand'],
      exposedHeaders: ['Set-Cookie'],
      maxAge: 86400,
    }),
  );

  // Apply auth rate limits after CORS so even 429 responses include CORS headers.
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth/resend-verification', authLimiter);

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.use((req, res, next) => {
    const headerRequestId = req.headers['x-request-id'];
    const requestId =
      typeof headerRequestId === 'string' && headerRequestId.trim().length > 0
        ? headerRequestId
        : randomUUID();

    (req as any).requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  });

  app.use(domainRoutingMiddleware);
  app.use(customDomainMiddleware);

  registerAuthRoutes(app);
  registerHealthEndpoint(app);
  app.use('/internal', internalCronRouter);

  app.get('/api/test', async (req, res) => {
    try {
      const { db } = await import('../db');
      await db.execute(sql`SELECT 1`);
      res.json({
        message: 'Backend is running!',
        database: 'Connected',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('DB Check Failed:', error);
      res.status(500).json({
        message: 'Backend is running but Database is unavailable',
        database: 'Error',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

  app.use(
    '/api/trpc',
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError({ error, path, type }) {
        const cause: any = (error as any)?.cause;
        console.error('❌ tRPC Error:', {
          path,
          type,
          code: error.code,
          message: error.message,
          stack: error.stack,
          causeMessage: cause?.message || (typeof cause === 'string' ? cause : undefined),
          causeCode: cause?.code,
        });
      },
    }),
  );

  // -------------------- OPTIONAL ROUTERS (FIXED PATHS) --------------------
  console.log('[Server] Loading optional routers...');

  await mountOptionalRouter(app, '/api/analytics', '../routes/analytics');
  await mountOptionalRouter(app, '/api/kpi', '../routes/kpi');

  await mountOptionalRouter(app, '/api/partners', '../partnerPublicRouter');

  await mountOptionalRouter(app, '/api/partner-analytics', '../partnerAnalyticsRouter');
  await mountOptionalRouter(app, '/api/content', '../contentRouter');
  await mountOptionalRouter(app, '/api/topics', '../topicsRouter');
  await mountOptionalRouter(app, '/api/subscriptions', '../partnerSubscriptionRouter');
  await mountOptionalRouter(app, '/api/boosts', '../partnerBoostCampaignRouter');
  await mountOptionalRouter(app, '/api/leads', '../partnerLeadRouter');

  await mountOptionalRouter(app, '/api/explore', '../routes/exploreShorts');
  await mountOptionalRouter(app, '/api/explore/video', '../routes/exploreVideoUpload');

  console.log('[Server] Optional routers loaded');

  try {
    const { startKpiRollupScheduler } = await import('../services/kpiRollupService');
    const started = startKpiRollupScheduler();
    if (started) {
      console.log('[KPI Rollup] Scheduler started (daily at 02:00 UTC, plus startup backfill)');
    } else {
      console.log(
        '[KPI Rollup] Scheduler disabled for this environment. Set KPI_ROLLUP_SCHEDULER_ENABLED=true to opt in.',
      );
    }
  } catch (error: any) {
    console.warn('[KPI Rollup] Scheduler not started:', error?.message || error);
  }

  try {
    const { startExploreActorScoringScheduler } = await import(
      '../services/exploreActorScoringService'
    );
    startExploreActorScoringScheduler();
    console.log('[ExploreActorScoring] Scheduler started (every 6h at minute 10 UTC)');
  } catch (error: any) {
    console.warn('[ExploreActorScoring] Scheduler not started:', error?.message || error);
  }

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
  await shutdownCache();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down...');
  await shutdownCache();
  process.exit(0);
});
