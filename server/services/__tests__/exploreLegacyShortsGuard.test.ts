import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const SOURCE_ROOT = path.resolve(process.cwd(), 'client/src');

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(absolute));
      continue;
    }

    if (!entry.isFile()) continue;
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    if (/\.test\.(ts|tsx)$/.test(entry.name)) continue;
    if (/\.spec\.(ts|tsx)$/.test(entry.name)) continue;
    files.push(absolute);
  }

  return files;
}

describe('Explore canonical feed guard', () => {
  it('prevents deprecated `.shorts` alias consumption in frontend source', () => {
    const allFiles = collectSourceFiles(SOURCE_ROOT);
    const violations: string[] = [];

    for (const filePath of allFiles) {
      const source = readFileSync(filePath, 'utf8');
      const lines = source.split(/\r?\n/);

      lines.forEach((line, index) => {
        if (/\.\s*shorts\b/.test(line)) {
          const rel = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
          violations.push(`${rel}:${index + 1}`);
        }
      });
    }

    expect(
      violations,
      `Deprecated feed alias usage found. Replace with canonical \`items\` + filtering.\n${violations.join('\n')}`,
    ).toEqual([]);
  });
});

