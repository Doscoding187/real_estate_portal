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
