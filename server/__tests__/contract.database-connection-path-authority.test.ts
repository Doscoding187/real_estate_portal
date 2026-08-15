import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

type Inventory = {
  canonicalRawConnectionCreator: string;
  testInfrastructureRawConnectionSources: string[];
  activeBoundedConsumers: string[];
  retiredDirectMutationSources: string[];
  legacyContainedDirectSources: string[];
};

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

function directDriverSources(): string[] {
  return ['server', 'scripts']
    .flatMap(directory =>
      readdirSync(join(ROOT, directory), { recursive: true, withFileTypes: true })
        .filter(entry => entry.isFile() && entry.name.endsWith('.ts'))
        .map(entry => join(entry.parentPath, entry.name).slice(ROOT.length + 1).replaceAll('\\', '/')),
    )
    .filter(path => !path.includes('/__tests__/'))
    .filter(path =>
      /from ['"](?:mysql2\/promise|@tidbcloud\/serverless)['"]|require\(['"]mysql2\/promise['"]\)/.test(
        read(path),
      ),
    )
    .sort();
}

describe('bounded connection-path authority', () => {
  it('inventories every remaining raw driver import and permits one active creator', () => {
    const inventory = JSON.parse(
      read('docs/database-authority/connection-path-inventory.json'),
    ) as Inventory;
    const inventoried = [
      inventory.canonicalRawConnectionCreator,
      ...inventory.testInfrastructureRawConnectionSources,
      ...inventory.retiredDirectMutationSources,
      ...inventory.legacyContainedDirectSources,
    ].sort();

    expect(directDriverSources()).toEqual(inventoried);
    expect(inventory.canonicalRawConnectionCreator).toBe(
      'server/_core/databaseAuthority/connectionAuthority.ts',
    );
    for (const path of inventory.activeBoundedConsumers) {
      if (path === inventory.canonicalRawConnectionCreator) continue;
      expect(read(path), `${path} must not create a raw connection`).not.toMatch(
        /from ['"](?:mysql2\/promise|@tidbcloud\/serverless)['"]|createConnection\(|createPool\(/,
      );
    }
  });

  it('keeps retired mutation sources unreachable from package commands and fail-closed directly', () => {
    const inventory = JSON.parse(
      read('docs/database-authority/connection-path-inventory.json'),
    ) as Inventory;
    const packageCommands = Object.values(
      (JSON.parse(read('package.json')) as { scripts: Record<string, string> }).scripts,
    ).join('\n');
    for (const path of inventory.retiredDirectMutationSources) {
      expect(packageCommands).not.toContain(path);
      expect(read(path).toLowerCase()).toContain('retired');
    }
  });
});
