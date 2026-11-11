import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const indexHtml = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../../../index.html'),
  'utf8',
);

describe('client/index.html static shell', () => {
  it('does not hard-code a canonical link', () => {
    expect(indexHtml).not.toMatch(/rel=["']canonical["']/i);
  });

  it('does not hard-code og:url or twitter:url', () => {
    expect(indexHtml).not.toMatch(/property=["']og:url["']/i);
    expect(indexHtml).not.toMatch(/name=["']twitter:url["']/i);
  });
});
