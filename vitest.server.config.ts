import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  root: path.resolve(import.meta.dirname),
  test: {
    name: 'server',
    environment: 'node',
    include: ['server/**/*.test.ts', 'server/**/*.spec.ts'],
    globals: true,
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
  },
});
