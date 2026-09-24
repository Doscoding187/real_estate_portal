import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import {
  probeDevelopmentSupersession,
  publicApiOrigin,
} from './shared/developmentSupersessionRouting';

function developmentSupersessionDevMiddleware(): Plugin {
  return {
    name: 'property-listify-development-supersession',
    configureServer(server) {
      server.middlewares.use(async (request, response, nextMiddleware) => {
        if (
          (request.method !== 'GET' && request.method !== 'HEAD') ||
          !request.url?.startsWith('/development/')
        ) {
          return nextMiddleware();
        }

        const requestUrl = new URL(request.url, 'http://localhost:3009');
        const target = await probeDevelopmentSupersession({
          requestUrl,
          apiOrigin: publicApiOrigin({
            ...process.env,
            VITE_API_URL: process.env.VITE_API_URL || 'http://localhost:5000',
          }),
          signal: AbortSignal.timeout(2_000),
        });
        if (!target) return nextMiddleware();

        response.statusCode = 307;
        response.setHeader('Location', target);
        response.setHeader('Cache-Control', 'no-store');
        response.end();
      });
    },
  };
}

const plugins = [developmentSupersessionDevMiddleware(), react(), tailwindcss()];
const buildGitSha =
  process.env.BUILD_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  process.env.COMMIT_SHA ||
  'local-dev';
const buildTime = new Date().toISOString();

function hostedFrontendBuild(): Plugin {
  return {
    name: 'property-listify-hosted-frontend-contract',
    buildStart() {
      const deployEnv = process.env.VITE_DEPLOY_ENV || 'development';
      const vercelEnv = process.env.VERCEL_ENV;
      if (vercelEnv === 'production' && deployEnv !== 'production') {
        throw new Error('Vercel production requires VITE_DEPLOY_ENV=production.');
      }
      if (vercelEnv === 'preview' && !['staging', 'preview'].includes(deployEnv)) {
        throw new Error('Vercel preview requires explicit VITE_DEPLOY_ENV=staging or preview.');
      }
      if (vercelEnv === 'preview' && deployEnv === 'preview' &&
          process.env.VITE_API_URL !== 'https://api-staging.propertylistifysa.co.za') {
        throw new Error('Unauthenticated previews may call only the staging API origin.');
      }
      if (deployEnv !== 'production' && deployEnv !== 'staging') return;
      if (process.env.VITE_USE_MOCK_EMAILS === 'true') {
        throw new Error('Hosted frontend must not enable mock email.');
      }
      const app = deployEnv === 'production'
        ? 'https://www.propertylistifysa.co.za'
        : 'https://staging.propertylistifysa.co.za';
      const api = deployEnv === 'production'
        ? 'https://api.propertylistifysa.co.za'
        : 'https://api-staging.propertylistifysa.co.za';
      if (process.env.VITE_APP_URL !== app || process.env.VITE_API_URL !== api) {
        throw new Error(`${deployEnv} frontend requires exact HTTPS VITE_APP_URL and VITE_API_URL.`);
      }
      if (process.env.VITE_API_BASE_URL && process.env.VITE_API_BASE_URL !== api) {
        throw new Error('VITE_API_BASE_URL must equal VITE_API_URL.');
      }
      if (!/^[a-f\d]{40}$/i.test(buildGitSha)) {
        throw new Error('Hosted frontend requires a full 40-character build SHA.');
      }
    },
    closeBundle() {
      const outDir = path.resolve(import.meta.dirname, 'dist/public');
      fs.writeFileSync(path.join(outDir, 'version.json'), JSON.stringify({
        gitSha: buildGitSha,
        buildTime,
        env: process.env.VITE_DEPLOY_ENV || 'development',
      }) + '\n');
      if (process.env.VITE_DEPLOY_ENV !== 'production') {
        fs.writeFileSync(path.join(outDir, 'robots-staging.txt'), 'User-agent: *\nDisallow: /\n');
        fs.writeFileSync(path.join(outDir, 'sitemap-staging.xml'),
          '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>\n');
      }
    },
  };
}

plugins.push(hostedFrontendBuild());

export default defineConfig({
  plugins,
  define: {
    __BUILD_GIT_SHA__: JSON.stringify(buildGitSha),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'client', 'src'),
      '@shared': path.resolve(import.meta.dirname, 'shared'),
      '@assets': path.resolve(import.meta.dirname, 'attached_assets'),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, 'client'),
  publicDir: path.resolve(import.meta.dirname, 'client', 'public'),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
    minify: 'terser',
    terserOptions: {
      keep_fnames: true,
      mangle: {
        keep_fnames: true,
      },
    },
    // Simplified chunking to avoid circular dependency issues (TDZ errors)
    // Aggressive splitting was causing 'Cannot access before initialization' errors
    rollupOptions: {
      output: {
        manualChunks: id => {
          if (id.includes('node_modules')) {
            // Single vendor chunk for all dependencies
            // Vite will handle internal code-splitting for app code
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    host: true,
    port: 3009,
    allowedHosts: ['localhost', '127.0.0.1'],
    fs: {
      strict: true,
      deny: ['**/.*'],
    },
    proxy: {
      '/api/trpc': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
