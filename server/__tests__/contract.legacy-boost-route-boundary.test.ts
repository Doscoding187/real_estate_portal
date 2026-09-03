import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('legacy boost campaign route boundary', () => {
  it('does not mount the legacy unauthenticated boost router', () => {
    const serverEntry = readRepoFile('server/_core/index.ts');

    expect(serverEntry).not.toContain("mountOptionalRouter(app, '/api/boosts'");
    expect(serverEntry).toContain('Legacy boost campaign routes are intentionally disabled.');
  });
});
