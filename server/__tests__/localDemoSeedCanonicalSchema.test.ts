import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { runSeedTransaction } from '../scripts/localDemoSeed';

const root = path.resolve(__dirname, '../..');
const source = readFileSync(path.join(root, 'server/scripts/localDemoSeed.ts'), 'utf8');

function insertColumns(tableName: string): string[] {
  const match = source.match(new RegExp(`INSERT INTO ${tableName}\\s*\\n?\\s*\\(([^)]+)\\)`, 'm'));
  if (!match) throw new Error(`Expected ${tableName} insert in local demo seed.`);
  return match[1].split(',').map(column => column.trim());
}

describe('local demo seed canonical schema', () => {
  it('does not insert retired partnership or development-access visibility columns', () => {
    expect(insertColumns('distribution_brand_partnerships')).not.toContain('channel_scope');
    expect(insertColumns('distribution_development_access')).not.toContain('visibility_scope');
  });

  it('does not insert the retired distribution deal status column', () => {
    expect(insertColumns('distribution_deals')).not.toContain('status');
  });

  it('rolls back the seed transaction when a seed step fails', async () => {
    const connection = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
    };

    await expect(
      runSeedTransaction(connection as never, async () => {
        throw new Error('seed fixture failure');
      }),
    ).rejects.toThrow('seed fixture failure');

    expect(connection.beginTransaction).toHaveBeenCalledOnce();
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(connection.commit).not.toHaveBeenCalled();
  });
});
