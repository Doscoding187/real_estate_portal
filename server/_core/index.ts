import 'dotenv/config';
import { sql } from 'drizzle-orm';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import net from 'net';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { registerAuthRoutes } from './authRoutes';
import { appRouter } from '../routers';
import { createContext } from './context';
import { serveStatic, setupVite } from './vite';
import { handleStripeWebhook } from './stripeWebhooks';
import { domainRoutingMiddleware, customDomainMiddleware } from './domainRouter';
import { initializeCache, shutdownCache } from './cache/redis';

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on('error', () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Check for critical environment variables
  if (!process.env.JWT_SECRET) {
    console.error('\n❌ CRITICAL ERROR: JWT_SECRET is not defined in environment variables.');
    console.error('   Login functionality will fail with HTTP 500 errors.');
    console.error('   Please set JWT_SECRET in your .env file or deployment configuration.\n');
  }

  // Initialize Cache Services (Redis)
  await initializeCache();

  const app = express();
  const server = createServer(app);

  // Rate limiting for authentication endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts
    message: 'Too many login attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply rate limiting to auth endpoints
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);

  // CORS Configuration - Allow Vercel frontend and local development
  const allowedOrigins = [
    'http://localhost:5173', // Vite dev
    'http://localhost:3000', // Local dev
    'http://localhost:5000', // Local dev (port 5000)
    'https://real-estate-portal-xi.vercel.app', // Vercel production
    'https://realestateportal-production-8e32.up.railway.app', // Railway backend (old)
    'https://realestateportal-production-9bb8.up.railway.app', // Railway backend (current)
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        // Check if origin is in allowed list or matches vercel.app pattern
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
      allowedHeaders: ['Content-Type', 'Authorization', 'trpc-batch-mode'],
      exposedHeaders: ['Set-Cookie'],
      maxAge: 86400, // 24 hours
    }),
  );

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Domain routing middleware (must be before other routes)
  app.use(domainRoutingMiddleware);
  app.use(customDomainMiddleware);

  // Custom authentication routes (register/login/logout)
  registerAuthRoutes(app);

  // Simple test endpoint for debugging
  app.get('/api/test', async (req, res) => {
    try {
      // Try to connect to DB
      const { db } = await import('../db');
      await db.execute(sql`SELECT 1`);
      res.json({ 
        message: 'Backend is running!', 
        database: 'Connected', 
        timestamp: new Date().toISOString() 
      });
    } catch (error: any) {
      console.error('DB Check Failed:', error);
      res.status(500).json({ 
        message: 'Backend is running but Database is unavailable', 
        database: 'Error', 
        error: error.message,
        timestamp: new Date().toISOString() 
      });
    }
  });

  // Stripe webhook endpoint (must be before JSON parsing)
  app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

  // tRPC API
  app.use(
    '/api/trpc',
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  // Analytics endpoint (for advertise page tracking)
  const analyticsRouter = await import('../routes/analytics');
  app.use('/api/analytics', analyticsRouter.default);
  // development mode uses Vite, production mode serves static files
  // Skip static file serving if SKIP_FRONTEND env var is set (for Railway backend-only deployment)
  console.log('[Server] NODE_ENV:', process.env.NODE_ENV);
  console.log('[Server] SKIP_FRONTEND:', process.env.SKIP_FRONTEND);
  if (process.env.NODE_ENV === 'development' && !process.env.SKIP_FRONTEND) {
    console.log('[Server] Using Vite development server');
    await setupVite(app, server);
  } else if (process.env.NODE_ENV !== 'development' && !process.env.SKIP_FRONTEND) {
    console.log('[Server] Serving static files');
    serveStatic(app);
  } else {
    console.log('[Server] Skipping frontend static file serving (backend-only mode)');
  }

  // Use configured port or default to 5000
  const port = parseInt(process.env.PORT || '5000', 10);
  console.log('----------------------------------------');
  console.log(`[Server] Starting on port ${port}`);
  console.log('----------------------------------------');

  server.listen(port, '0.0.0.0', () => {
    console.log(`Backend running on http://localhost:${port}`);
    console.log(`tRPC endpoint: http://localhost:${port}/trpc`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch(console.error);

// Handle graceful shutdown
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
