import { describe, expect, it, vi } from 'vitest';
import { inspectStoragePreconditions } from '../../../../tools/place-admission/storage-preconditions.mjs';

describe('national storage proof refuses unsafe initial state', () => {
  it.each(['wrong head', 'populated', 'unreadable ledger', 'unreadable tables'])(
    'aborts on %s before a mutation can run',
    async failure => {
      const mutate = vi.fn();
      const queryRows = vi.fn(async (_connection, sql: string) => {
        if (failure === 'unreadable ledger') throw new Error('ledger unavailable');
        return sql.includes('COUNT')
          ? [{ n: 104 }]
          : [{ filename: failure === 'wrong head' ? '0094' : '0103' }];
      });
      const tableState = vi.fn(async () => {
        if (failure === 'unreadable tables') throw new Error('table unavailable');
        return { place: { rows: failure === 'populated' ? 1544 : 0 } };
      });
      await expect(
        (async () => {
          await inspectStoragePreconditions({
            connection: {},
            queryRows,
            tableState,
            expectedHead: '0103',
          });
          mutate();
        })(),
      ).rejects.toThrow();
      expect(mutate).not.toHaveBeenCalled();
      if (failure === 'wrong head' || failure === 'unreadable ledger')
        expect(tableState).not.toHaveBeenCalled();
    },
  );
  it('accepts an inspected empty target at the expected head', async () => {
    const result = await inspectStoragePreconditions({
      connection: {},
      expectedHead: '0103',
      queryRows: async (_connection, sql: string) =>
        sql.includes('COUNT') ? [{ n: 104 }] : [{ filename: '0103' }],
      tableState: async () => ({ place: { rows: 0 } }),
    });
    expect(result).toMatchObject({ head: '0103', migrationCount: 104 });
  });
});
