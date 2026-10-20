import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readBillingProofDocument, storeBillingProofDocument } from '../billingProofStorage';

const createdRoots: string[] = [];

function privateRoot(): string {
  const root = mkdtempSync('/var/tmp/property-listify-proof-rehearsal-');
  createdRoots.push(root);
  return root;
}

afterEach(() => {
  vi.unstubAllEnvs();
  while (createdRoots.length) rmSync(createdRoots.pop()!, { recursive: true, force: true });
});

describe('local billing proof storage restart rehearsal', () => {
  it('writes an owner-only document under the configured private root', async () => {
    const root = privateRoot();
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('APP_ENV', 'test');
    vi.stubEnv('BILLING_PROOF_STORAGE_ADAPTER', 'local');
    vi.stubEnv('BILLING_PRIVATE_STORAGE_DIR', root);
    const buffer = Buffer.from('private proof rehearsal bytes');

    const stored = await storeBillingProofDocument({
      storageKey: '/invoices/2026/proof.pdf',
      buffer,
      mimeType: 'application/pdf',
      originalFileName: 'proof.pdf',
    });

    expect(stored).toMatchObject({
      adapter: 'local',
      storageKey: 'invoices/2026/proof.pdf',
      durable: false,
    });
    const absolutePath = join(root, 'invoices', '2026', 'proof.pdf');
    expect(readFileSync(absolutePath).equals(buffer)).toBe(true);
    expect(statSync(absolutePath).mode & 0o777).toBe(0o600);

    await expect(
      readBillingProofDocument({
        storageKey: stored.storageKey,
        metadata: { storage_adapter: 'local' },
      }),
    ).resolves.toEqual(buffer);
  });

  it('returns identical bytes to a freshly started process', async () => {
    const root = privateRoot();
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('APP_ENV', 'test');
    vi.stubEnv('BILLING_PROOF_STORAGE_ADAPTER', 'local');
    vi.stubEnv('BILLING_PRIVATE_STORAGE_DIR', root);
    const buffer = Buffer.from('restart durability rehearsal payload');
    const stored = await storeBillingProofDocument({
      storageKey: 'invoices/restart/proof.pdf',
      buffer,
      mimeType: 'application/pdf',
      originalFileName: 'proof.pdf',
    });

    const moduleUrl = pathToFileURL(
      resolve(process.cwd(), 'server/services/billingProofStorage.ts'),
    ).href;
    const childScript = `
      (async () => {
        const { createHash } = await import('node:crypto');
        const { readBillingProofDocument } = await import(${JSON.stringify(moduleUrl)});
        const bytes = await readBillingProofDocument({
          storageKey: ${JSON.stringify(stored.storageKey)},
          metadata: { storage_adapter: 'local' },
        });
        process.stdout.write(JSON.stringify({
          digest: createHash('sha256').update(bytes).digest('hex'),
          length: bytes.length,
        }));
      })().catch(error => { console.error(error); process.exit(1); });
    `;
    const child = spawnSync(
      join(process.cwd(), 'node_modules', '.bin', 'tsx'),
      ['-e', childScript],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          NODE_ENV: 'test',
          APP_ENV: 'test',
          BILLING_PROOF_STORAGE_ADAPTER: 'local',
          BILLING_PRIVATE_STORAGE_DIR: root,
        },
      },
    );

    expect(child.status, child.stderr).toBe(0);
    expect(JSON.parse(child.stdout)).toEqual({
      digest: createHash('sha256').update(buffer).digest('hex'),
      length: buffer.length,
    });
  });
});
