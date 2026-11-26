import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (p: string) => readFileSync(join(repoRoot, p), 'utf8');

describe('vite dev proxy target', () => {
  const config = read('vite.config.ts');

  it('defaults to :5000 and can be overridden by DEV_API_PROXY_TARGET', () => {
    expect(config).toContain(
      "const devApiProxyTarget = process.env.DEV_API_PROXY_TARGET || 'http://localhost:5000';",
    );
  });

  it('uses the variable for both /api/trpc and /api, with no hard-coded target left', () => {
    const proxyBlock = config.slice(config.indexOf('proxy: {'));
    expect(proxyBlock.match(/target: devApiProxyTarget,/g)).toHaveLength(2);
    expect(proxyBlock).not.toContain("target: 'http://localhost:5000'");
  });

  it('parity preview script points the web proxy at the parity API port', () => {
    expect(read('scripts/preview/local-parity.sh')).toContain(
      'DEV_API_PROXY_TARGET="http://127.0.0.1:${API_PORT}"',
    );
  });
});
