import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('launch safety contract', () => {
  it('does not expose a local payment-activation helper', () => {
    const appRouter = readRepoFile('server/routers.ts');

    expect(existsSync(path.resolve(process.cwd(), 'server/devRouter.ts'))).toBe(false);
    expect(appRouter).not.toContain("import { devRouter } from './devRouter'");
    expect(appRouter).not.toContain('mutableAppRouterConfig.dev');
  });

  it('keeps migration execution outside hosted application startup', () => {
    const railway = readRepoFile('railway.json');
    const packageJson = readRepoFile('package.json');

    expect(railway).toContain('"startCommand": "pnpm start:prod"');
    expect(packageJson).toContain('"start": "pnpm start:prod"');
    expect(packageJson).not.toContain('start:prod:with-migrations');
  });

  it('keeps committed email env examples shell-safe', () => {
    for (const file of ['.env.example', '.env.local.example']) {
      const source = readRepoFile(file);

      expect(source).toContain('RESEND_FROM_EMAIL="Listify Local <onboarding@resend.dev>"');
      expect(source).toContain('EMAIL_FROM="Listify Local <onboarding@resend.dev>"');
    }
  });
});
