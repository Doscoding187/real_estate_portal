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
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  process.env.COMMIT_SHA ||
  'local-dev';
const buildTime = new Date().toISOString();

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
