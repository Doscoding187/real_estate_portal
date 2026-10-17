import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  extractLocalFileTargets,
  extractPnpmScriptNames,
  unresolvedFileTargets,
} from '../scriptReferences';

const ROOT = process.cwd();

function readScripts(): Record<string, string> {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
    scripts?: Record<string, string>;
  };
  return pkg.scripts ?? {};
}

function workflowFiles(): string[] {
  const dir = join(ROOT, '.github', 'workflows');
  return readdirSync(dir)
    .filter(name => name.endsWith('.yml') || name.endsWith('.yaml'))
    .map(name => join(dir, name));
}

describe('script reference extraction', () => {
  it('extracts entrypoints and configuration targets from real command shapes', () => {
    expect(
      extractLocalFileTargets(
        'cross-env NODE_ENV=development APP_ENV=development tsx scripts/databaseAuthorityCli.ts worktree:create',
      ),
    ).toEqual(['scripts/databaseAuthorityCli.ts']);
    expect(
      extractLocalFileTargets(
        'node --test scripts/storage/tests/proof-runtime-verify.test.cjs scripts/storage/tests/media-runtime-verify.test.cjs',
      ),
    ).toEqual([
      'scripts/storage/tests/proof-runtime-verify.test.cjs',
      'scripts/storage/tests/media-runtime-verify.test.cjs',
    ]);
    expect(extractLocalFileTargets('bash scripts/local-db.sh recover')).toEqual([
      'scripts/local-db.sh',
    ]);
    expect(
      extractLocalFileTargets(
        'vitest run --no-cache --config vitest.database-authority-static.config.ts --project database-authority-static',
      ),
    ).toEqual(['vitest.database-authority-static.config.ts']);
  });

  it('ignores prose, binaries and non-path arguments', () => {
    expect(
      extractLocalFileTargets("echo 'Backend build not required; run with tsx directly'"),
    ).toEqual([]);
    expect(extractLocalFileTargets('pnpm vitest run --project server')).toEqual([]);
    expect(
      extractLocalFileTargets('tsx scripts/capturePropertyDiscoveryArtifacts.ts data.json'),
    ).toEqual(['scripts/capturePropertyDiscoveryArtifacts.ts']);
  });

  it('maps extension-only ESM imports onto their TypeScript sources', () => {
    const exists = (path: string) => path === 'server/db.ts';
    expect(unresolvedFileTargets(['server/db.js'], exists)).toEqual([]);
    expect(unresolvedFileTargets(['server/db.mjs'], exists)).toEqual(['server/db.mjs']);
    expect(unresolvedFileTargets(['server/ghost.js'], exists)).toEqual(['server/ghost.js']);
  });

  it('extracts workflow pnpm script names and skips binaries and internals', () => {
    const names = extractPnpmScriptNames(
      [
        'run: pnpm --silent db:schema:congruency | tee out.json',
        'run: pnpm vitest run --project server',
        'run: pnpm run test:load:local -- --duration-seconds 5',
        '# pnpm install is handled by setup',
        'run: pnpm test:client:stub',
      ].join('\n'),
    );
    expect(names).toEqual(['db:schema:congruency', 'test:load:local', 'test:client:stub']);
  });
});

describe('repository script reference guard', () => {
  it('keeps every package script file target on disk', () => {
    const issues: string[] = [];
    let targets = 0;
    for (const [name, command] of Object.entries(readScripts())) {
      const found = extractLocalFileTargets(command);
      targets += found.length;
      for (const target of unresolvedFileTargets(found, path => existsSync(join(ROOT, path)))) {
        issues.push(`${name}: ${target}`);
      }
    }
    expect(targets).toBeGreaterThan(0);
    expect(issues).toEqual([]);
  });

  it('keeps every workflow pnpm invocation on an existing script', () => {
    const scripts = readScripts();
    const issues: string[] = [];
    const names = new Set<string>();
    for (const file of workflowFiles()) {
      const text = readFileSync(file, 'utf8');
      for (const name of extractPnpmScriptNames(text)) {
        names.add(name);
        if (!Object.hasOwn(scripts, name)) issues.push(`${file}: ${name}`);
      }
    }
    expect(names.size).toBeGreaterThan(0);
    expect(issues).toEqual([]);
  });

  it('keeps every workflow file target on disk', () => {
    const issues: string[] = [];
    let targets = 0;
    for (const file of workflowFiles()) {
      const text = readFileSync(file, 'utf8');
      for (const line of text.split('\n')) {
        const found = extractLocalFileTargets(line);
        targets += found.length;
        for (const target of unresolvedFileTargets(found, path => existsSync(join(ROOT, path)))) {
          issues.push(`${file}: ${target}`);
        }
      }
    }
    expect(targets).toBeGreaterThan(0);
    expect(issues).toEqual([]);
  });
});
