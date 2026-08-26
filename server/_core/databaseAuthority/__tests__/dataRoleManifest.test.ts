import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertDataRoleManifest,
  DATA_ROLE_MANIFEST,
  DATA_ROLE_MANIFEST_VERSION,
} from '../dataAdapters/dataRoleManifest';

const ROOT = process.cwd();

describe('Database Authority data-role manifest', () => {
  it('declares independent versioned role adapters for every supported data lane', () => {
    expect(() => assertDataRoleManifest()).not.toThrow();
    expect(DATA_ROLE_MANIFEST.manifestVersion).toBe(DATA_ROLE_MANIFEST_VERSION);
    expect(DATA_ROLE_MANIFEST.roles.map(role => role.key)).toEqual([
      'reference.geography',
      'foundation.launch-access',
      'demo.listing-preview-authentication',
      'scenario.search-to-lead',
      'test-fixture.ple-publication-entitlement',
      'test-fixture.ple-reviewer',
    ]);

    for (const role of DATA_ROLE_MANIFEST.roles) {
      expect(role.targetClasses).toEqual(['disposable-worktree', 'disposable-test']);
      expect(role.transaction).toBe('bounded');
      expect(role.schemaMutation).toBe(false);
      expect(role.version).toBeTruthy();
      expect(role.digest).toMatch(/^[a-f0-9]{64}$/);
      expect(role.prepareCommand).toMatch(/^db:/);
      expect(role.verifyCommand).toMatch(/^db:/);
      expect(readFileSync(join(ROOT, role.adapterPath), 'utf8')).not.toMatch(
        /(?:mysql2\/promise|createConnection|createPool|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE|TRUNCATE\s+TABLE)/i,
      );
    }
  });

  it('rejects duplicate or malformed role declarations', () => {
    const duplicate = {
      ...DATA_ROLE_MANIFEST,
      roles: [...DATA_ROLE_MANIFEST.roles, DATA_ROLE_MANIFEST.roles[0]],
    } as typeof DATA_ROLE_MANIFEST;
    expect(() => assertDataRoleManifest(duplicate)).toThrow('duplicate role keys');

    const malformed = {
      ...DATA_ROLE_MANIFEST,
      roles: DATA_ROLE_MANIFEST.roles.map((role, index) =>
        index === 0 ? { ...role, digest: 'not-a-digest' } : role,
      ),
    } as typeof DATA_ROLE_MANIFEST;
    expect(() => assertDataRoleManifest(malformed)).toThrow('is malformed');
  });
});
