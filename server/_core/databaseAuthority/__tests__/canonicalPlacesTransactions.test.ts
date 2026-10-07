import { describe, expect, it, vi } from 'vitest';
import { buildForeignIdentityFixture } from '../../../../tools/place-admission/foreign-identity-fixture.mjs';

// Only target/head checks are stubbed. The real writer, validators and
// START/COMMIT/ROLLBACK implementation run against an in-memory SQL transport.
vi.mock('../dataAdapters/common', async importOriginal => ({
  ...(await importOriginal<any>()),
  requireReferenceAdapterTarget: vi.fn(),
  requireAcceptedMigrationHead: vi.fn(),
}));
import {
  loadCanonicalPlacePackage,
  prepareCanonicalPlaces,
  prepareNationalCanonicalPlaces,
} from '../dataAdapters/canonicalPlaces';
import { loadPlaceAdmissionTerritoryRegistry } from '../../../../shared/placeAdmissionTerritories';

const authority = { context: { targetClass: 'disposable-worktree' } };
const keys = {
  place: ['place_id'],
  place_name: ['place_id', 'name_role', 'name'],
  place_relationship: ['from_place_id', 'to_place_id', 'relationship_type'],
  place_evidence: [],
  place_external_mapping: ['provider', 'provider_record_id'],
};
type Table = keyof typeof keys;
type Row = Record<string, any>;
const empty = () =>
  Object.fromEntries(Object.keys(keys).map(table => [table, []])) as Record<Table, Row[]>;

function transport(initial = empty(), swallowMapping = false) {
  let state = structuredClone(initial);
  let saved = empty();
  const commands: string[] = [];
  const rowKey = (table: Table, row: Row) => JSON.stringify(keys[table].map(key => row[key]));
  const seen = Object.fromEntries(
    Object.keys(keys).map(table => [
      table,
      new Set(state[table as Table].map(row => rowKey(table as Table, row))),
    ]),
  ) as Record<Table, Set<string>>;
  let swallowed = false;
  const connection = {
    execute: async (sql: string, values: any[] = []): Promise<any[]> =>
      connection.query(sql, values),
    query: async (sql: string, values: any[] = []) => {
      if (['START TRANSACTION', 'COMMIT', 'ROLLBACK'].includes(sql)) {
        commands.push(sql);
        if (sql === 'START TRANSACTION') saved = structuredClone(state);
        if (sql === 'ROLLBACK') state = saved;
        return [{}];
      }
      const deletion = sql.match(/^DELETE FROM `([^`]+)`/);
      if (deletion) {
        const table = deletion[1] as Table;
        state[table] = [];
        seen[table].clear();
        return [{}];
      }
      const insert = sql.match(/INSERT INTO `([^`]+)`\s*\(([^)]+)\)/);
      if (insert) {
        const table = insert[1] as Table;
        if (table === 'place_external_mapping' && swallowMapping && !swallowed) {
          swallowed = true;
          return [{ affectedRows: 1, insertId: 0 }];
        }
        const row = Object.fromEntries(
          insert[2].split(',').map((column, i) => [column.trim(), values[i]]),
        );
        const unique = keys[table];
        if (!unique.length || !seen[table].has(rowKey(table, row))) {
          state[table].push(row);
          seen[table].add(rowKey(table, row));
        }
        return [{ affectedRows: 1, insertId: 0 }];
      }
      const table = sql.match(/FROM `([^`]+)`/)?.[1] as Table;
      if (!table || !state[table]) throw new Error(`Unexpected test SQL: ${sql}`);
      return [
        sql.includes('COUNT(*)') ? [{ n: state[table].length }] : structuredClone(state[table]),
      ];
    },
  };
  return { connection, commands, state: () => state };
}

function nationalState() {
  const state = empty();
  const fields = {
    places: 'place',
    names: 'place_name',
    relationships: 'place_relationship',
    evidence: 'place_evidence',
    external_mappings: 'place_external_mapping',
  } as const;
  for (const territory of loadPlaceAdmissionTerritoryRegistry(process.cwd()).registry.territories) {
    const { rows } = loadCanonicalPlacePackage(process.cwd(), {
      territoryId: territory.territoryId,
    });
    for (const [field, table] of Object.entries(fields)) state[table].push(...rows[field]);
  }
  return state;
}

describe('canonical Place preparation validates before commit', () => {
  it('rolls back a per-territory load whose mapping insert was silently dropped', async () => {
    const mock = transport(empty(), true);
    await expect(
      prepareCanonicalPlaces({ authority, decision: {}, connection: mock.connection }),
    ).rejects.toThrow('external mappings');
    expect(mock.commands).toEqual(['START TRANSACTION', 'ROLLBACK']);
    expect(mock.state()).toEqual(empty());
  });

  it('commits a complete per-territory load and reports zero writes on replay', async () => {
    const mock = transport();
    const input = { authority, decision: {}, connection: mock.connection };
    const first = await prepareCanonicalPlaces(input);
    expect(first.written.places).toBe(1466);
    const before = structuredClone(mock.state());
    const replay = await prepareCanonicalPlaces(input);
    expect(Object.values(replay.written)).toEqual([0, 0, 0, 0, 0]);
    expect(mock.state()).toEqual(before);
    expect(mock.commands).toEqual(['START TRANSACTION', 'COMMIT', 'START TRANSACTION', 'COMMIT']);
  });

  it('refuses national identity-field drift with the correct ID set and totals, without committing', async () => {
    const initial = nationalState();
    initial.place[0].place_type = 'district_municipality';
    const mock = transport(initial);
    await expect(
      prepareNationalCanonicalPlaces({ authority, decision: {}, connection: mock.connection }),
    ).rejects.toThrow('stored identity');
    expect(mock.commands).toEqual([]);
    expect(mock.state()).toEqual(initial);
  }, 30000);
});

describe('foreign-identity refusal fixture is atomic', () => {
  it('constructs all 17,664 foreign identities with exactly one commit', async () => {
    const mock = transport();
    await buildForeignIdentityFixture(mock.connection, 17664);
    expect(mock.commands).toEqual(['START TRANSACTION', 'COMMIT']);
    expect(mock.state().place).toHaveLength(17664);
    expect(new Set(mock.state().place.map(row => row.place_id)).size).toBe(17664);
  });

  it('retains the preceding fixture if a replacement insert fails', async () => {
    const initial = empty();
    initial.place.push({ place_id: 'preceding-fixture' });
    const mock = transport(initial);
    const query = mock.connection.query.bind(mock.connection);
    mock.connection.query = async (sql, values) => {
      if (sql.startsWith('INSERT')) throw new Error('fixture fault');
      return query(sql, values);
    };
    await expect(buildForeignIdentityFixture(mock.connection, 3)).rejects.toThrow('fixture fault');
    expect(mock.commands).toEqual(['START TRANSACTION', 'ROLLBACK']);
    expect(mock.state()).toEqual(initial);
  });
});
