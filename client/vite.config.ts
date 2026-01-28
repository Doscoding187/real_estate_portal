import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgrPlugin from 'vite-plugin-svgr';
import path from 'path';

export default defineConfig({
  plugins: [react(), svgrPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/_core': path.resolve(__dirname, '../server/_core'),
      '@/shared': path.resolve(__dirname, '../shared'),
    },
  },
  server: {
    port: 3009,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/trpc': {
        target: process.env.VITE_API_URL || 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  // Exclude the separate dashboard directory from being processed
  optimizeDeps: {
    exclude: ['../Dashboard/superadmin']
  },
  build: {
    rollupOptions: {
      external: ['../Dashboard/superadmin']
    }
  }
});
