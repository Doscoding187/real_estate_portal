import { defineConfig } from 'vitest/config';

/** Mocked command-boundary contracts must never initialise a runtime database. */
export default defineConfig({
  envDir: false,
  test: {
    name: 'place-command',
    environment: 'node',
    include: ['server/_core/databaseAuthority/__tests__/placeReleaseCommand.test.ts'],
    setupFiles: [],
    globals: true,
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
  },
});
