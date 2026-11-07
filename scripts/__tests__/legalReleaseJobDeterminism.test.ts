import { afterAll, describe, expect, it, vi } from 'vitest';

// This file mocks node:child_process, which the global DB setup (vitest.setup.ts) also uses (git) when CI provides a
// database. It needs no database, so opt out of that setup for this file only and restore afterwards.
const previousSkipDbInit = vi.hoisted(() => {
  const previous = process.env.SKIP_DB_INIT;
  process.env.SKIP_DB_INIT = '1';
  return previous;
});
afterAll(() => {
  if (previousSkipDbInit === undefined) delete process.env.SKIP_DB_INIT;
  else process.env.SKIP_DB_INIT = previousSkipDbInit;
});

vi.mock('node:child_process', async importOriginal => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    execFileSync: vi.fn((_cmd: string, args: string[]) => {
      const file = String(args[1]).split('/').pop();
      if (file === 'release-candidate.json') return JSON.stringify({ bundleId: 'x' });
      if (file === 'final-privacy-approval.json') return JSON.stringify({ approved: true });
      return `text:${file}`;
    }),
  };
});
vi.mock('../../server/_core/databaseAuthority/worktreeIdentity', async importOriginal => ({
  ...(await importOriginal<typeof import('../../server/_core/databaseAuthority/worktreeIdentity')>()),
  readGitWorktreeIdentity: () => ({ clean: true, head: 'a'.repeat(40) }),
}));
vi.mock('../../server/services/legalReleasePreparation', () => ({
  prepareLegalRelease: () => ({}),
}));

import { prepareLegalInstallationPacket } from '../../server/_core/databaseAuthority/legalReleaseInstallation';
import { stableDigest } from '../../server/_core/databaseAuthority/dataAdapters/common';

describe('legal release job determinism', () => {
  it('two prepares with the same env and git head give the identical packet digest', () => {
    const input = {
      root: process.cwd(),
      plannedEffectiveAt: '2026-11-08T10:00:00.000Z',
      validUntil: '2026-11-08T10:30:00.000Z',
      expectedPreviousBundleId: null,
    };
    const first = stableDigest(prepareLegalInstallationPacket(input));
    const second = stableDigest(prepareLegalInstallationPacket({ ...input }));
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(second).toBe(first);
  });

  it('a different window changes the digest', () => {
    const base = {
      root: process.cwd(),
      plannedEffectiveAt: '2026-11-08T10:00:00.000Z',
      validUntil: '2026-11-08T10:30:00.000Z',
      expectedPreviousBundleId: null,
    };
    expect(stableDigest(prepareLegalInstallationPacket(base))).not.toBe(
      stableDigest(prepareLegalInstallationPacket({ ...base, validUntil: '2026-11-08T10:20:00.000Z' })),
    );
  });
});
