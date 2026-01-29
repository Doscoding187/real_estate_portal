import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'path';
import { defineConfig } from 'vite';

const plugins = [react(), tailwindcss()];

export default defineConfig({
  plugins,
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
    // Prevent name mangling issues with wouter
    rollupOptions: {
      output: {
        manualChunks: id => {
          if (id.includes('node_modules')) {
            // UI Libraries (must checks before 'react' to capture react-based UI libs)
            if (
              id.includes('@radix-ui') ||
              id.includes('framer-motion') ||
              id.includes('lucide-react') ||
              id.includes('embla-carousel') ||
              id.includes('sonner') ||
              id.includes('vaul') ||
              id.includes('class-variance-authority') ||
              id.includes('clsx') ||
              id.includes('tailwind-merge')
            ) {
              return 'ui-vendor';
            }

            // Maps
            if (
              id.includes('leaflet') ||
              id.includes('react-leaflet') ||
              id.includes('google-maps')
            ) {
              return 'maps-vendor';
            }

            // Charts
            if (id.includes('recharts')) {
              return 'charts-vendor';
            }

            // Backend/Data/Utils
            if (
              id.includes('drizzle-orm') ||
              id.includes('@aws-sdk') ||
              id.includes('date-fns') ||
              id.includes('zod') ||
              id.includes('superjson')
            ) {
              return 'utils-vendor';
            }

            // Core React Ecosystem
            if (
              id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('wouter') ||
              id.includes('@tanstack/react-query') ||
              id.includes('@trpc')
            ) {
              return 'react-vendor';
            }

            // Fallback for everything else
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
