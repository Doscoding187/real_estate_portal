import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('launch safety contract', () => {
  it('keeps the local dev activation helper unavailable to public production traffic', () => {
    const devRouter = readRepoFile('server/devRouter.ts');
    const appRouter = readRepoFile('server/routers.ts');

    expect(devRouter).toContain('triggerWebhookManual: protectedProcedure');
    expect(devRouter).toContain('ENV.isProduction');
    expect(devRouter).toContain("code: 'NOT_FOUND'");
    expect(devRouter).not.toContain('triggerWebhookManual: publicProcedure');
    expect(appRouter).toContain('if (!ENV.isProduction)');
    expect(appRouter).toContain('mutableAppRouterConfig.dev = devRouter;');
    expect(appRouter).not.toContain('dev: devRouter, //');
  });

  it('uses the migration-aware production startup command for hosted deploys', () => {
    const railway = readRepoFile('railway.json');
    const packageJson = readRepoFile('package.json');

    expect(railway).toContain('"startCommand": "pnpm start:prod:with-migrations"');
    expect(packageJson).toContain('"start": "pnpm start:prod:with-migrations"');
  });

  it('keeps committed email env examples shell-safe', () => {
    for (const file of ['.env.example', '.env.local.example']) {
      const source = readRepoFile(file);

      expect(source).toContain('RESEND_FROM_EMAIL="Listify Local <onboarding@resend.dev>"');
      expect(source).toContain('EMAIL_FROM="Listify Local <onboarding@resend.dev>"');
    }
  });
});
