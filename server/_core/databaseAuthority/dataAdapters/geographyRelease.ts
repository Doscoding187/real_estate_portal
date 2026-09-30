import {
  assertAuthorizedDatabaseOperation,
  type AuthorizedDatabaseOperation,
} from '../authorization';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import type { ResolvedDatabaseAuthority } from '../types';
import { canonicalGeographyReleaseRows, type GeographyReleaseRow } from './canonicalGeography';
import { LOCATION_AUTHORITY_SOURCE_INDEX_SHA256 } from './governedRuntimeGeography';
import {
  queryRows,
  requireAcceptedMigrationHead,
  requireReleaseReferenceTarget,
  stableDigest,
  withTransaction,
} from './common';

const TABLES = ['provinces', 'cities', 'suburbs'] as const;
export type GeographySnapshot = Record<(typeof TABLES)[number], Record<string, unknown>[]>;
const PARENT = { provinces: null, cities: 'provinceId', suburbs: 'cityId' } as const;
const COLUMNS = {
  provinces: ['name', 'code', 'slug', 'latitude', 'longitude'],
  cities: ['name', 'slug', 'latitude', 'longitude', 'isMetro', 'status'],
  suburbs: ['name', 'slug', 'latitude', 'longitude', 'postalCode', 'status'],
} as const;

/** Pure additive reconciliation: unknown rows and changes are review stops. */
export function planGeographyRows(
  desired: readonly GeographyReleaseRow[],
  snapshot: GeographySnapshot,
) {
  const expected = new Map<string, GeographyReleaseRow>();
  for (const row of desired) {
    if (
      !TABLES.includes(row.table) ||
      expected.has(row.key) ||
      (row.parentKey && !expected.has(row.parentKey))
    )
      throw new Error('Invalid geography catalog order/identity.');
    expected.set(row.key, row);
  }
  const ids = new Map<string, number>();
  const idKeys = {
    provinces: new Map<number, string>(),
    cities: new Map<number, string>(),
    suburbs: new Map<number, string>(),
  };
  const observed: { key: string; id: number; values: Record<string, unknown> }[] = [];
  for (const table of TABLES)
    for (const row of snapshot[table]) {
      const id = Number(row.id);
      if (!Number.isSafeInteger(id) || id <= 0 || idKeys[table].has(id))
        throw new Error('Invalid/duplicate geography row ID.');
      const parentKey =
        table === 'cities'
          ? idKeys.provinces.get(Number(row.provinceId))
          : table === 'suburbs'
            ? idKeys.cities.get(Number(row.cityId))
            : undefined;
      if (table !== 'provinces' && !parentKey) throw new Error('Orphan geography parent.');
      const key = parentKey ? `${parentKey}/${String(row.slug)}` : String(row.slug);
      const want = expected.get(key);
      if (!want || want.table !== table || ids.has(key))
        throw new Error(`Unknown/duplicate geography identity ${key}.`);
      for (const column of COLUMNS[table]) {
        const a = row[column] ?? null,
          b = want.values[column] ?? null;
        const numeric = ['latitude', 'longitude', 'isMetro'].includes(column);
        if (
          a === null || b === null
            ? a !== b
            : numeric
              ? Number(a) !== Number(b)
              : String(a) !== String(b)
        ) {
          throw new Error(`Geography identity ${key} conflicts at ${column}.`);
        }
      }
      ids.set(key, id);
      idKeys[table].set(id, key);
      observed.push({
        key,
        id,
        values: Object.fromEntries(COLUMNS[table].map(c => [c, row[c] ?? null])),
      });
    }
  observed.sort((a, b) => a.key.localeCompare(b.key));
  return { pending: desired.filter(row => !ids.has(row.key)), observed, ids };
}

export async function releaseCanonicalGeography(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
  expectedPlanDigest?: string;
}) {
  assertAuthorizedDatabaseOperation(input.authority, input.decision, [
    'release-reference-plan',
    'release-reference-apply',
    'release-reference-verify',
  ]);
  const target = requireReleaseReferenceTarget(input.authority);
  if (
    target.targetFingerprintHash !==
    'b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced'
  ) {
    throw new Error('Geography release admits only the approved retained Azure target.');
  }
  const manifest = await requireAcceptedMigrationHead(input);
  const desired = canonicalGeographyReleaseRows();
  const inspect = async () => {
    const snapshot = {} as GeographySnapshot;
    for (const table of TABLES)
      snapshot[table] = await queryRows(input.connection, `SELECT * FROM ${table} ORDER BY id`);
    const reconciliation = planGeographyRows(desired, snapshot);
    const binding = {
      targetFingerprintHash: target.targetFingerprintHash,
      manifestDigest: manifest.manifestDigest,
      head: manifest.document.expectedHead,
      sourceIndexDigest: LOCATION_AUTHORITY_SOURCE_INDEX_SHA256,
      desiredDigest: stableDigest(desired),
      observed: reconciliation.observed,
      pending: reconciliation.pending,
    };
    return {
      reconciliation,
      evidence: {
        adapter: 'canonical-geography',
        targetFingerprintHash: binding.targetFingerprintHash,
        head: binding.head,
        manifestDigest: binding.manifestDigest,
        sourceIndexDigest: binding.sourceIndexDigest,
        desiredDigest: binding.desiredDigest,
        planDigest: stableDigest(binding),
        existingRows: reconciliation.observed.length,
        pendingRows: reconciliation.pending.length,
        pendingKeys: reconciliation.pending.map(row => row.key),
      },
    };
  };
  if (input.decision.operation !== 'release-reference-apply') {
    const plan = await inspect();
    if (input.decision.operation === 'release-reference-verify' && plan.evidence.pendingRows)
      throw new Error('Geography reference data is incomplete.');
    return plan.evidence;
  }
  if (!/^[a-f0-9]{64}$/.test(input.expectedPlanDigest ?? ''))
    throw new Error('Reviewed geography plan digest required.');
  const lockName = 'property-listify:canonical-geography:release';
  const lock = await queryRows(
    input.connection,
    'SELECT GET_LOCK(?, 30) AS acquired, CONNECTION_ID() AS owner',
    [lockName],
  );
  if (Number(lock[0]?.acquired) !== 1) throw new Error('Geography release lock unavailable.');
  try {
    const owner = await queryRows(
      input.connection,
      'SELECT IS_USED_LOCK(?) AS owner, CONNECTION_ID() AS current_id',
      [lockName],
    );
    if (
      !Number.isSafeInteger(Number(lock[0]?.owner)) ||
      Number(lock[0]?.owner) <= 0 ||
      Number(owner[0]?.owner) !== Number(lock[0]?.owner) ||
      Number(owner[0]?.current_id) !== Number(lock[0]?.owner)
    )
      throw new Error('Geography lock/session mismatch.');
    return await withTransaction(input.connection, async () => {
      const plan = await inspect();
      if (plan.evidence.planDigest !== input.expectedPlanDigest)
        throw new Error('Geography plan changed; review a fresh plan.');
      const ids = plan.reconciliation.ids;
      for (const row of plan.reconciliation.pending) {
        const columns: string[] = [...COLUMNS[row.table]];
        const values: unknown[] = columns.map(c => row.values[c]);
        const parentColumn = PARENT[row.table];
        if (parentColumn) {
          const id = ids.get(row.parentKey!);
          if (!id) throw new Error('Geography parent missing during apply.');
          columns.push(parentColumn);
          values.push(id);
        }
        const result = await input.connection.execute(
          `INSERT INTO ${row.table} (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
          values,
        );
        const id = Number((result as [{ insertId?: number }])[0]?.insertId);
        if (!Number.isSafeInteger(id) || id <= 0)
          throw new Error('Geography insert identity unavailable.');
        ids.set(row.key, id);
      }
      const verified = await inspect();
      if (verified.evidence.pendingRows) throw new Error('Geography verification failed.');
      return { ...verified.evidence, acceptedPlanDigest: plan.evidence.planDigest };
    });
  } finally {
    await input.connection.query('SELECT RELEASE_LOCK(?)', [lockName]);
  }
}
