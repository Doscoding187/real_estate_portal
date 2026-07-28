import { chmodSync, mkdtempSync, readlinkSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertCentralEnvironmentReady,
  classifyRequiredLocalVariable,
  ensureWorktreeLink,
  establishCentralLocalEnvironment,
  inspectCentralLocalEnvironment,
  inspectWorktreeLink,
  resolveDiscoveredDemoPassword,
} from '../localEnvironmentAuthority';

function temporaryWorktree() {
  const root = mkdtempSync(join(tmpdir(), 'listify-env-authority-'));
  return root;
}

const noDiscoveredCredential = () => ({ entries: [], configuredValues: [], agrees: true });
const ignored = () => true;

describe('machine-local environment authority', () => {
  it('reports a missing central local file without reading an alternate environment source', () => {
    const root = temporaryWorktree();
    const central = join(root, 'machine', 'missing.env');

    expect(inspectCentralLocalEnvironment(central)).toMatchObject({
      exists: false,
      permissions: 'missing',
      values: {},
    });
  });

  it('creates a central local file with safe permissions and required local values', () => {
    const root = temporaryWorktree();
    const central = join(root, 'machine', 'local.env');
    const created = establishCentralLocalEnvironment(root, central, noDiscoveredCredential);

    expect(created.exists).toBe(true);
    expect(created.permissions).toBe('safe');
    expect(() => assertCentralEnvironmentReady(created)).not.toThrow();
  });

  it('rejects unsafe central permissions, missing values, and placeholder demo passwords', () => {
    const root = temporaryWorktree();
    const central = join(root, 'machine', 'local.env');
    establishCentralLocalEnvironment(root, central, noDiscoveredCredential);
    chmodSync(central, 0o644);
    expect(() => assertCentralEnvironmentReady(inspectCentralLocalEnvironment(central))).toThrow(
      '0600',
    );
    expect(
      classifyRequiredLocalVariable('LOCAL_DEMO_AGENCY_PASSWORD', 'replace-with-password'),
    ).toBe('placeholder');
    expect(classifyRequiredLocalVariable('JWT_SECRET', undefined)).toBe('missing');
  });

  it('creates and preserves only the exact central worktree link', () => {
    const root = temporaryWorktree();
    const central = join(root, 'machine', 'local.env');
    establishCentralLocalEnvironment(root, central, noDiscoveredCredential);
    expect(ensureWorktreeLink(root, central, ignored)).toBe('linked');
    expect(readlinkSync(join(root, '.env.local'))).toBe(central);
    expect(inspectWorktreeLink(root, central)).toBe('linked');
    expect(ensureWorktreeLink(root, central, ignored)).toBe('linked');
  });

  it('rejects an existing normal file and an incorrect symlink without replacing either', () => {
    const root = temporaryWorktree();
    const central = join(root, 'machine', 'local.env');
    establishCentralLocalEnvironment(root, central, noDiscoveredCredential);
    writeFileSync(join(root, '.env.local'), 'LOCAL_DEMO_AGENCY_PASSWORD=fixture-only-value\n');
    expect(inspectWorktreeLink(root, central)).toBe('conflicting-file');
    expect(() => ensureWorktreeLink(root, central, ignored)).toThrow('normal file');
  });

  it('rejects an incorrect or broken link without replacing it', () => {
    const root = temporaryWorktree();
    const central = join(root, 'machine', 'local.env');
    establishCentralLocalEnvironment(root, central, noDiscoveredCredential);
    symlinkSync(join(root, 'machine', 'other.env'), join(root, '.env.local'));

    expect(inspectWorktreeLink(root, central)).toBe('incorrect-symlink');
    expect(() => ensureWorktreeLink(root, central, ignored)).toThrow('incorrect or broken');
  });

  it('rejects conflicting discovered passwords without exposing either value', () => {
    expect(() => resolveDiscoveredDemoPassword(['fixture-one', 'fixture-two'])).toThrow('conflict');
  });
});
