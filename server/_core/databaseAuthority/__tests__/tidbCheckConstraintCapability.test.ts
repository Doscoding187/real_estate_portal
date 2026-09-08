import { describe, expect, it } from 'vitest';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import {
  assertTiDbCheckConstraintCapability,
  readTiDbCheckConstraintCapability,
} from '../tidbCheckConstraintCapability';

function connection(value: unknown): AuthoritySqlConnection {
  return {
    async execute() {
      throw new Error('CHECK capability must use the non-prepared query path.');
    },
    async query() {
      return [[{ Variable_name: 'tidb_enable_check_constraint', Value: value }]];
    },
    async end() {},
  };
}

describe('TiDB CHECK-constraint capability', () => {
  it('treats non-TiDB providers as not applicable without probing', async () => {
    const value = await readTiDbCheckConstraintCapability(connection('OFF'), 'mysql');
    expect(value).toEqual({
      applicable: false,
      variable: 'tidb_enable_check_constraint',
      value: null,
      enabled: null,
    });
  });

  it.each(['ON', 'on', '1', 'true'])('recognizes enabled value %s', async raw => {
    await expect(
      assertTiDbCheckConstraintCapability(connection(raw), 'tidb'),
    ).resolves.toMatchObject({ applicable: true, enabled: true, value: raw });
  });

  it('fails closed when TiDB CHECK enforcement is disabled', async () => {
    await expect(assertTiDbCheckConstraintCapability(connection('OFF'), 'tidb')).rejects.toThrow(
      'tidb_enable_check_constraint=OFF',
    );
  });

  it('fails closed when the capability result is ambiguous', async () => {
    const ambiguous: AuthoritySqlConnection = {
      async execute() {
        throw new Error('CHECK capability must use the non-prepared query path.');
      },
      async query() {
        return [[]];
      },
      async end() {},
    };
    await expect(readTiDbCheckConstraintCapability(ambiguous, 'tidb')).rejects.toThrow(
      'was not returned exactly once',
    );
  });
});
