import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  root: path.resolve(import.meta.dirname),
  test: {
    globals: true,
    environment: "jsdom",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts", "client/src/**/__tests__/**/*.test.tsx", "client/src/**/__tests__/**/*.spec.tsx"],
    alias: {
      '@': path.resolve(__dirname, './client/src'),
    },
    setupFiles: 'client/src/setupTests.ts',
  },
});
