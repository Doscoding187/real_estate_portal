import dotenv from 'dotenv';
import path from 'path';

// Load .env first
dotenv.config();
// Load .env.local (overrides .env) - critical for secrets
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

import { sql } from 'drizzle-orm';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import superjson from 'superjson';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { registerAuthRoutes } from './authRoutes';
import { appRouter } from '../routers';
import { createContext } from './context';
import { serveStatic, setupVite } from './vite';
import { handleStripeWebhook } from './stripeWebhooks';
import { domainRoutingMiddleware, customDomainMiddleware } from './domainRouter';
import { initializeCache, shutdownCache } from './cache/redis';

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

  const app = express();
  const server = createServer(app);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);

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

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
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

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.use(domainRoutingMiddleware);
  app.use(customDomainMiddleware);

  registerAuthRoutes(app);

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
      transformer: superjson,
      onError({ error, path, type }) {
        console.error('❌ tRPC Error:', {
          path,
          type,
          code: error.code,
          message: error.message,
          stack: error.stack,
          cause: (error as any).cause,
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
  await mountOptionalRouter(app, '/api/subscriptions', '../partnerSubscriptionRouter');
  await mountOptionalRouter(app, '/api/boosts', '../partnerBoostCampaignRouter');
  await mountOptionalRouter(app, '/api/leads', '../partnerLeadRouter');

  await mountOptionalRouter(app, '/api/explore', '../routes/exploreShorts');
  await mountOptionalRouter(app, '/api/explore/video', '../routes/exploreVideoUpload');

  console.log('[Server] Optional routers loaded');

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
