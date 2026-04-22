import { defineConfig } from 'drizzle-kit';
import { loadAppRuntimeEnv } from './server/_core/runtimeBootstrap';

loadAppRuntimeEnv({ cwd: process.cwd() });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing from environment variables');
}

export default defineConfig({
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dialect: 'mysql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
