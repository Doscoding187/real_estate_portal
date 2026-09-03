import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('legacy partner lead route boundary', () => {
  it('does not mount the ungoverned partner-lead router beside canonical lead capture', () => {
    const serverEntry = readRepoFile('server/_core/index.ts');
    const appRouter = readRepoFile('server/routers.ts');
    const leadsRouter = readRepoFile('server/leadsRouter.ts');

    expect(serverEntry).not.toContain("mountOptionalRouter(app, '/api/leads'");
    expect(serverEntry).toContain('Legacy partner-lead routes are intentionally disabled.');
    expect(appRouter).toContain('leads: leadsRouter');
    expect(leadsRouter).toContain('capturePublicLead');
  });
});
