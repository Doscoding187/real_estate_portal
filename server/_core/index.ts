import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import net from 'net';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { registerAuthRoutes } from './authRoutes';
import { appRouter } from '../routers';
import { createContext } from './context';
import { serveStatic, setupVite } from './vite';
import { handleStripeWebhook } from './stripeWebhooks';
import { domainRoutingMiddleware, customDomainMiddleware } from './domainRouter';

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
  const app = express();
  const server = createServer(app);

  // CORS Configuration - Allow Vercel frontend and local development
  const allowedOrigins = [
    'http://localhost:5173', // Vite dev
    'http://localhost:3000', // Local dev
    'https://real-estate-portal-xi.vercel.app', // Vercel production
    'https://realestateportal-production-8e32.up.railway.app', // Railway backend (for webhook testing)
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
  // development mode uses Vite, production mode serves static files
  // Skip static file serving if SKIP_FRONTEND env var is set (for Railway backend-only deployment)
  if (process.env.NODE_ENV === 'development') {
    await setupVite(app, server);
  } else if (!process.env.SKIP_FRONTEND) {
    serveStatic(app);
  } else {
    console.log('[Server] Skipping frontend static file serving (backend-only mode)');
  }

  const preferredPort = parseInt(process.env.PORT || '3000');
  const port = process.env.PORT ? preferredPort : await findAvailablePort(preferredPort);

  if (port !== preferredPort && !process.env.PORT) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch(console.error);
