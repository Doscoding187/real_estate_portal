import { defineConfig } from 'vitest/config';
import path from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(import.meta.dirname),
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './client/src'),
    },
  },
  test: {
    name: 'client',
    environment: 'jsdom',
    include: ['client/src/**/*.test.{ts,tsx}', 'client/src/**/*.spec.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
  },
});
