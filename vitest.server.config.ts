import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  root: path.resolve(import.meta.dirname),
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'client', 'src'),
      '@shared': path.resolve(import.meta.dirname, 'shared'),
    },
  },
  test: {
    name: 'server',
    environment: 'node',
    include: ['server/**/*.test.ts', 'server/**/*.spec.ts'],
    globals: true,
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    env: {
      // Load .env.test for test database configuration
      NODE_ENV: 'test',
    },
    setupFiles: ['./vitest.setup.ts'],
  },
});
