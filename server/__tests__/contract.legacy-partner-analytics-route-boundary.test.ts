import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('legacy partner analytics route boundary', () => {
  it('does not mount unauthenticated analytics beside the governed distribution dashboard', () => {
    const serverEntry = readRepoFile('server/_core/index.ts');
    const distributionDashboard = readRepoFile(
      'client/src/pages/distribution/PartnerDashboardPage.tsx',
    );

    expect(serverEntry).not.toContain("mountOptionalRouter(app, '/api/partner-analytics'");
    expect(serverEntry).toContain('Legacy partner analytics routes are intentionally disabled.');
    expect(distributionDashboard).not.toContain('/api/partner-analytics');
    expect(distributionDashboard).toContain('trpc.distribution.referrer.status');
  });
});
