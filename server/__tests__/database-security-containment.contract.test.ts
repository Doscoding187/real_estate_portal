import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function repoPath(relativePath: string) {
  return path.resolve(root, relativePath);
}

function readRepoFile(relativePath: string) {
  return readFileSync(repoPath(relativePath), 'utf8');
}

describe('database security containment contract', () => {
  it('does not ship direct production database utilities or editor credentials', () => {
    const prohibitedFiles = [
      '.vscode/settings.json',
      'check-images.ts',
      'cleanup-production-safe.ts',
      'fix-schema.ts',
      'scripts/debug_service.ts',
      'scripts/reset-prod-tidb.mjs',
    ];

    for (const relativePath of prohibitedFiles) {
      expect(
        existsSync(repoPath(relativePath)),
        `${relativePath} must remain absent`,
      ).toBe(false);
    }
  });

  it('does not expose a package-level production reset command', () => {
    const packageJson = JSON.parse(readRepoFile('package.json')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts).not.toHaveProperty('reset:prod');
    expect(JSON.stringify(packageJson)).not.toContain('reset-prod-tidb');
  });

  it('does not mount the legacy partner subscription API', () => {
    const serverEntry = readRepoFile('server/_core/index.ts');

    expect(serverEntry).not.toContain("'/api/subscriptions'");
    expect(serverEntry).not.toContain("'../partnerSubscriptionRouter'");
    expect(serverEntry).toContain(
      'Legacy partner subscription routes are intentionally disabled',
    );
  });

  it('keeps retained deployment documentation free of database connection literals', () => {
    const documents = [
      'DEPLOYMENT.md',
      'EXPLORE_DISCOVERY_MIGRATION_GUIDE.md',
    ];

    const connectionPattern =
      /(?:mysql|postgres(?:ql)?|mongodb(?:\+srv)?|redis):\/\//i;

    for (const relativePath of documents) {
      const source = readRepoFile(relativePath);

      expect(source, relativePath).not.toMatch(connectionPattern);
      expect(source, relativePath).not.toMatch(/tidbcloud\.com/i);
    }
  });

  it('ignores local VS Code settings that may contain connection profiles', () => {
    const gitignore = readRepoFile('.gitignore');

    expect(
      gitignore.split(/\r?\n/).map(line => line.trim()),
    ).toContain('.vscode/settings.json');
  });
});
