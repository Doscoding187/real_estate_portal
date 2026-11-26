import { createHash } from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import type { AuthorizedDatabaseOperation } from '../authorization';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import { assertOwnedDisposableTarget } from '../lifecycle';
import type { ResolvedDatabaseAuthority } from '../types';
import {
  DEVELOPMENT_SEED_PACK_VERSION,
  parseDevelopmentSeedPack,
  type DevelopmentSeedPack,
  type DevelopmentSeedPackMedia,
  type DevelopmentSeedPackUnitType,
} from '../../../../shared/developmentSeedPack';
import {
  assertOperation,
  queryRows,
  requireAcceptedMigrationHead,
  requireExactAdapterTarget,
  rowValue,
  stableDigest,
  withTransaction,
  type AdapterEvidence,
} from './common';

/**
 * Governed loader for development seed packs. A pack is a reviewable
 * description of one launch development; this adapter writes it into a
 * disposable worktree database only. Production seeding is a separate launch
 * step that requires an explicit owner decision and is refused here.
 *
 * Natural keys keep every run idempotent: publisher slug, (publisher,
 * development slug), and a deterministic unit id derived from the three keys.
 */
export const DEVELOPMENT_SEED_PACK_ADAPTER_VERSION = 'development-seed-pack-v1' as const;
export const DEVELOPMENT_SEED_PACK_DIGEST = stableDigest({
  adapter: 'development-seed-pack',
  version: DEVELOPMENT_SEED_PACK_ADAPTER_VERSION,
  packFormat: DEVELOPMENT_SEED_PACK_VERSION,
  authority: 'platform_reference',
  targets: ['disposable-worktree'],
});

export const PRODUCTION_SEEDING_REFUSAL =
  "Development seed pack refused: production seeding is a launch-day step (needs Edward's GO).";

type Row = Record<string, unknown>;
type PreparedState = 'created' | 'updated' | 'reused';

export type SeedPackMediaStoreInput = Readonly<{
  absolutePath: string;
  fileName: string;
  contentType: string;
  mediaType: 'image' | 'video' | 'floorplan' | 'pdf';
  scope: string;
  bytes: Buffer;
}>;
export type SeedPackMediaStoreResult = Readonly<{ key: string; url: string }>;
export type SeedPackMediaStore = (
  input: SeedPackMediaStoreInput,
) => Promise<SeedPackMediaStoreResult>;

export type DevelopmentSeedPackOptions = Readonly<{
  /** Directory the pack's relative asset paths resolve against. */
  assetRoot: string;
  /** Email of an existing user recorded as the Place assignment reviewer. */
  reviewerEmail?: string;
  /** Test seam; defaults to the wizard's governed media storage. */
  storeMedia?: SeedPackMediaStore;
  now?: () => Date;
}>;

export type DevelopmentSeedPackEvidence = AdapterEvidence & {
  pack: { publisherSlug: string; developmentSlug: string; publish: boolean };
  prepared: {
    publisher: PreparedState;
    development: PreparedState;
    placeAssignment: PreparedState;
    unitTypes: { created: number; updated: number; reused: number; notInPack: number };
    media: { stored: number; reused: number; removed: number };
  };
  ids: { publisherId: number; developmentId: number; sitePlaceId: string };
  publicVisibility: {
    eligible: boolean;
    inPlaceSearch: boolean;
    placeId: string;
    publishRequested: boolean;
  } | null;
  migrationHead: string;
};

// ---------------------------------------------------------------------------
// Target authority
// ---------------------------------------------------------------------------

export function assertSeedPackTarget(authority: ResolvedDatabaseAuthority): void {
  const targetClass = authority.context.targetClass;
  if (
    targetClass === 'production' ||
    targetClass === 'staging' ||
    targetClass === 'shared-remote'
  ) {
    throw new Error(PRODUCTION_SEEDING_REFUSAL);
  }
  if (targetClass !== 'disposable-worktree') {
    throw new Error(
      'Development seed pack refused: only an owned disposable worktree database may be seeded.',
    );
  }
  assertOwnedDisposableTarget(authority);
}

// ---------------------------------------------------------------------------
// Row helpers (simple equality lookups so every statement stays auditable)
// ---------------------------------------------------------------------------

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

function assertIdentifiers(...names: string[]): void {
  for (const name of names) {
    if (!IDENTIFIER.test(name))
      throw new Error('Seed pack SQL contract has an invalid identifier.');
  }
}

async function selectRows(
  connection: AuthoritySqlConnection,
  table: string,
  columns: readonly string[],
  where: Record<string, unknown>,
): Promise<Row[]> {
  const keys = Object.keys(where);
  assertIdentifiers(table, ...columns, ...keys);
  const clause = keys.length ? ` WHERE ${keys.map(key => `${key} = ?`).join(' AND ')}` : '';
  return queryRows(
    connection,
    `SELECT ${columns.join(', ')} FROM ${table}${clause}`,
    keys.map(key => where[key]),
  );
}

async function selectOne(
  connection: AuthoritySqlConnection,
  table: string,
  columns: readonly string[],
  where: Record<string, unknown>,
  label: string,
): Promise<Row | null> {
  const rows = await selectRows(connection, table, columns, where);
  if (rows.length > 1) throw new Error(`Seed pack found duplicate ${label} rows.`);
  return rows[0] ?? null;
}

async function insertRow(
  connection: AuthoritySqlConnection,
  table: string,
  values: Record<string, unknown>,
): Promise<number> {
  const columns = Object.keys(values);
  assertIdentifiers(table, ...columns);
  const result: any = await connection.execute(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
    columns.map(column => values[column]),
  );
  const header = Array.isArray(result) ? result[0] : result;
  return Number(header?.insertId ?? 0);
}

function canon(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().replace('T', ' ').slice(0, 19);
  if (Buffer.isBuffer(value)) return canon(value.toString('utf8'));
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') return stableStringify(value);
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}T[0-9:.]+Z?$/.test(text)) return text.replace('T', ' ').slice(0, 19);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text} 00:00:00`;
  if (/^-?\d+(?:\.\d+)?$/.test(text)) return String(Number(text));
  if (/^\s*[[{]/.test(text)) {
    try {
      return stableStringify(JSON.parse(text));
    } catch {
      return text;
    }
  }
  return text;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as object)
      .sort()
      .map(key => `${JSON.stringify(key)}:${stableStringify((value as Row)[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

/** Update only pack-owned columns whose stored value differs. */
async function updateChanged(
  connection: AuthoritySqlConnection,
  table: string,
  id: number | string,
  existing: Row,
  desired: Record<string, unknown>,
): Promise<boolean> {
  const changed = Object.keys(desired).filter(
    column => canon(rowValue(existing, column)) !== canon(desired[column]),
  );
  if (changed.length === 0) return false;
  assertIdentifiers(table, ...changed);
  await connection.execute(
    `UPDATE ${table} SET ${changed.map(column => `${column} = ?`).join(', ')} WHERE id = ?`,
    [...changed.map(column => desired[column]), id],
  );
  return true;
}

function dbTimestamp(date: Date): string {
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

function parseJsonArray(value: unknown): Row[] {
  let current: unknown = Buffer.isBuffer(value) ? value.toString('utf8') : value;
  for (let depth = 0; depth < 2 && typeof current === 'string'; depth += 1) {
    const text = current.trim();
    if (!text) return [];
    try {
      current = JSON.parse(text);
    } catch {
      return [];
    }
  }
  return Array.isArray(current)
    ? (current.filter(item => item && typeof item === 'object') as Row[])
    : [];
}

function parseJsonObject(value: unknown): Row {
  let current: unknown = Buffer.isBuffer(value) ? value.toString('utf8') : value;
  if (typeof current === 'string') {
    try {
      current = JSON.parse(current);
    } catch {
      return {};
    }
  }
  return current && typeof current === 'object' && !Array.isArray(current) ? (current as Row) : {};
}

// ---------------------------------------------------------------------------
// Deterministic identity and derived aggregates
// ---------------------------------------------------------------------------

/** Stable UUID-shaped unit id from the natural keys (unit_types.id is varchar(36)). */
export function seedPackUnitId(
  publisherSlug: string,
  developmentSlug: string,
  unitKey: string,
): string {
  const hex = createHash('sha256')
    .update(`seed-pack-unit:${publisherSlug}:${developmentSlug}:${unitKey}`)
    .digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export type DevelopmentAggregates = {
  totalUnits?: number;
  availableUnits?: number;
  priceFrom?: number;
  priceTo?: number;
};

/** Aggregates are derived only when every unit type states the underlying fact. */
export function deriveDevelopmentAggregates(
  units: readonly DevelopmentSeedPackUnitType[],
): DevelopmentAggregates {
  const result: DevelopmentAggregates = {};
  if (units.length === 0) return result;
  if (units.every(unit => unit.totalUnits !== undefined)) {
    result.totalUnits = units.reduce((sum, unit) => sum + (unit.totalUnits ?? 0), 0);
  }
  if (units.every(unit => unit.availableUnits !== undefined)) {
    result.availableUnits = units.reduce((sum, unit) => sum + (unit.availableUnits ?? 0), 0);
  }
  result.priceFrom = Math.round(Math.min(...units.map(unit => unit.priceFrom)));
  if (units.every(unit => unit.priceTo !== undefined)) {
    result.priceTo = Math.round(Math.max(...units.map(unit => unit.priceTo ?? 0)));
  }
  return result;
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

const CONTENT_TYPES: Readonly<Record<string, string>> = Object.freeze({
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
});

function mediaTypeFor(category: DevelopmentSeedPackMedia['category']) {
  switch (category) {
    case 'development_image':
    case 'unit_gallery':
      return 'image' as const;
    case 'development_video':
      return 'video' as const;
    case 'development_document':
      return 'pdf' as const;
    default:
      return 'floorplan' as const;
  }
}

type ResolvedAsset = {
  file: string;
  absolutePath: string;
  bytes: Buffer;
  sha256: string;
  contentType: string;
};

async function resolveAsset(assetRoot: string, file: string): Promise<ResolvedAsset> {
  const rootReal = await realpath(resolve(assetRoot)).catch(() => {
    throw new Error('Seed pack asset root does not exist.');
  });
  const absolutePath = resolve(rootReal, file);
  if (!absolutePath.startsWith(`${rootReal}${sep}`)) {
    throw new Error(`Seed pack asset ${file} escapes the asset root.`);
  }
  const real = await realpath(absolutePath).catch(() => {
    throw new Error(`Seed pack asset ${file} is missing under the asset root.`);
  });
  if (!real.startsWith(`${rootReal}${sep}`) || !(await stat(real)).isFile()) {
    throw new Error(`Seed pack asset ${file} is not a regular file inside the asset root.`);
  }
  const contentType = CONTENT_TYPES[extname(file).toLowerCase()];
  if (!contentType) {
    throw new Error(`Seed pack asset ${file} has an unsupported file type.`);
  }
  const bytes = await readFile(real);
  if (bytes.length === 0) throw new Error(`Seed pack asset ${file} is empty.`);
  return {
    file,
    absolutePath: real,
    bytes,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    contentType,
  };
}

/** The wizard's storage path: local adapter writes the governed worktree media root. */
const defaultStoreMedia: SeedPackMediaStore = async input => {
  const storage = await import('../../mediaStorage');
  if (storage.getMediaStorageAdapter() !== 'local') {
    throw new Error('Seed pack media loading supports the local media storage adapter only.');
  }
  const key = storage.createMediaStorageKey(input.fileName, input.scope);
  await storage.writeLocalMediaObject(
    key,
    input.contentType,
    Readable.from([input.bytes]),
    storage.getLocalMediaMaxBytes(input.mediaType),
  );
  return { key, url: storage.buildLocalMediaPublicUrl(key) };
};

type MediaEntry = Row;

function seedFileOf(entry: Row): string | null {
  return typeof entry.seedPackFile === 'string' ? entry.seedPackFile : null;
}

/** Reconcile seed-managed entries (identified by seedPackFile); manual entries are kept. */
async function reconcileMedia(input: {
  existing: unknown;
  desired: ReadonlyArray<{
    asset: ResolvedAsset;
    mediaType: SeedPackMediaStoreInput['mediaType'];
    entryFields: Row;
  }>;
  scope: string;
  store: SeedPackMediaStore;
}): Promise<{ entries: MediaEntry[]; stored: number; reused: number; removed: number }> {
  const existing = parseJsonArray(input.existing);
  const manual = existing.filter(entry => seedFileOf(entry) === null);
  const seeded = new Map(
    existing.filter(e => seedFileOf(e) !== null).map(e => [seedFileOf(e)!, e]),
  );
  const entries: MediaEntry[] = [];
  let stored = 0;
  let reused = 0;
  for (const item of input.desired) {
    const previous = seeded.get(item.asset.file);
    seeded.delete(item.asset.file);
    if (previous && previous.contentSha256 === item.asset.sha256 && previous.key) {
      entries.push({ ...previous, ...item.entryFields });
      reused += 1;
      continue;
    }
    const fileName = item.asset.file.split(/[\\/]/).pop() ?? item.asset.file;
    const result = await input.store({
      absolutePath: item.asset.absolutePath,
      fileName,
      contentType: item.asset.contentType,
      mediaType: item.mediaType,
      scope: input.scope,
      bytes: item.asset.bytes,
    });
    entries.push({
      ...item.entryFields,
      url: result.url,
      storageKey: result.key,
      key: result.key,
      type: item.mediaType,
      fileName,
      fileSize: item.asset.bytes.length,
      contentSha256: item.asset.sha256,
      seedPackFile: item.asset.file,
    });
    stored += 1;
  }
  return { entries: [...manual, ...entries], stored, reused, removed: seeded.size };
}

// ---------------------------------------------------------------------------
// Place, reviewer
// ---------------------------------------------------------------------------

async function resolveSitePlaceId(
  connection: AuthoritySqlConnection,
  development: DevelopmentSeedPack['development'],
): Promise<string> {
  if (development.sitePlaceId) {
    const place = await selectOne(
      connection,
      'place',
      ['place_id'],
      { place_id: development.sitePlaceId, lifecycle_status: 'active', search_eligible: 1 },
      `place ${development.sitePlaceId}`,
    );
    if (!place) {
      throw new Error(
        `Seed pack sitePlaceId ${development.sitePlaceId} is not an active, search-eligible canonical Place in this database.`,
      );
    }
    return development.sitePlaceId;
  }
  const leaf = development.placePath?.[development.placePath.length - 1] ?? '';
  const matches = await queryRows(
    connection,
    `SELECT DISTINCT n.place_id AS place_id
       FROM place_name n INNER JOIN place p ON p.place_id = n.place_id
      WHERE n.name_role = 'preferred_public' AND n.name_state = 'active'
        AND LOWER(n.name) = LOWER(?) AND p.lifecycle_status = 'active' AND p.search_eligible = 1`,
    [leaf],
  );
  if (matches.length !== 1) {
    throw new Error(
      `Seed pack placePath "${leaf}" matches ${matches.length} canonical Places; set sitePlaceId explicitly.`,
    );
  }
  return String(rowValue(matches[0], 'place_id'));
}

async function resolveReviewerId(
  connection: AuthoritySqlConnection,
  pack: DevelopmentSeedPack,
  options: DevelopmentSeedPackOptions,
): Promise<number> {
  const email = (
    options.reviewerEmail ??
    (pack.provenance.reviewedBy?.includes('@') ? pack.provenance.reviewedBy : '')
  ).trim();
  if (!email) {
    throw new Error(
      'Seed pack needs a reviewer: pass --reviewer-email=<existing user email> (recorded on the accepted Place assignment).',
    );
  }
  const user = await selectOne(connection, 'users', ['id'], { email }, 'reviewer user');
  if (!user) throw new Error('Seed pack reviewer email does not match an existing user.');
  return Number(rowValue(user, 'id'));
}

// ---------------------------------------------------------------------------
// Prepare
// ---------------------------------------------------------------------------

function evidenceBase(authority: ResolvedDatabaseAuthority): AdapterEvidence {
  return {
    ...requireExactAdapterTarget(authority),
    adapter: 'development-seed-pack',
    version: DEVELOPMENT_SEED_PACK_ADAPTER_VERSION,
    digest: DEVELOPMENT_SEED_PACK_DIGEST,
  };
}

function developmentColumns(
  pack: DevelopmentSeedPack,
  publisherId: number,
  aggregates: DevelopmentAggregates,
): Record<string, unknown> {
  const d = pack.development;
  return {
    catalogue_publisher_id: publisherId,
    name: d.name,
    slug: d.slug,
    description: d.description,
    developmentType: d.developmentType,
    transaction_type: d.transactionType,
    status: d.status,
    dev_owner_type: 'platform',
    amenities: JSON.stringify(d.amenities),
    ...(d.completionDate ? { completionDate: d.completionDate.slice(0, 10) } : {}),
    ...(d.estateSpecs ? { estateSpecs: JSON.stringify(d.estateSpecs) } : {}),
    ...(aggregates.totalUnits !== undefined ? { totalUnits: aggregates.totalUnits } : {}),
    ...(aggregates.availableUnits !== undefined
      ? { availableUnits: aggregates.availableUnits }
      : {}),
    ...(aggregates.priceFrom !== undefined ? { priceFrom: aggregates.priceFrom } : {}),
    ...(aggregates.priceTo !== undefined ? { priceTo: aggregates.priceTo } : {}),
  };
}

function unitColumns(
  pack: DevelopmentSeedPack,
  unit: DevelopmentSeedPackUnitType,
  index: number,
): Record<string, unknown> {
  const rent = pack.development.transactionType === 'for_rent';
  return {
    name: unit.name,
    bedrooms: unit.bedrooms,
    bathrooms: unit.bathrooms.toFixed(1),
    unit_size: unit.unitSize,
    base_price_from: unit.priceFrom.toFixed(2),
    structural_type: unit.structuralType,
    display_order: index,
    is_active: 1,
    ...(unit.yardSize !== undefined ? { yard_size: unit.yardSize } : {}),
    ...(unit.priceTo !== undefined ? { base_price_to: unit.priceTo.toFixed(2) } : {}),
    ...(unit.totalUnits !== undefined ? { total_units: unit.totalUnits } : {}),
    ...(unit.availableUnits !== undefined ? { available_units: unit.availableUnits } : {}),
    ...(unit.parkingBays !== undefined ? { parking_bays: unit.parkingBays } : {}),
    ...(rent ? { monthly_rent_from: unit.priceFrom.toFixed(2) } : {}),
    ...(rent && unit.priceTo !== undefined ? { monthly_rent_to: unit.priceTo.toFixed(2) } : {}),
  };
}

export async function applyDevelopmentSeedPack(input: {
  connection: AuthoritySqlConnection;
  pack: DevelopmentSeedPack;
  options: DevelopmentSeedPackOptions;
}): Promise<{
  evidence: Omit<
    DevelopmentSeedPackEvidence,
    keyof AdapterEvidence | 'migrationHead' | 'publicVisibility'
  >;
}> {
  const { connection, pack, options } = input;
  const now = (options.now ?? (() => new Date()))();
  const store = options.storeMedia ?? defaultStoreMedia;

  // Assets are validated before any write so a missing file cannot half-load a pack.
  const assets = new Map<string, ResolvedAsset>();
  const assetFiles = [
    ...pack.media.map(media => media.file),
    ...pack.documents.map(document => document.file),
    ...(pack.publisher.logo?.file ? [pack.publisher.logo.file] : []),
  ];
  for (const file of assetFiles) {
    if (!assets.has(file)) assets.set(file, await resolveAsset(options.assetRoot, file));
  }

  return withTransaction(connection, async () => {
    // Publisher: platform_reference, visible, custody-free.
    const publisherRow = await selectOne(
      connection,
      'catalogue_publishers',
      [
        'id',
        'authority_kind',
        'developer_organisation_id',
        'name',
        'slug',
        'website_url',
        'source_attribution',
        'is_visible',
        'logo_url',
      ],
      { slug: pack.publisher.slug },
      `catalogue publisher ${pack.publisher.slug}`,
    );
    if (
      publisherRow &&
      (String(rowValue(publisherRow, 'authority_kind')) !== 'platform_reference' ||
        rowValue(publisherRow, 'developer_organisation_id') !== null)
    ) {
      throw new Error(
        `Seed pack publisher slug ${pack.publisher.slug} already belongs to a first-party Developer publisher.`,
      );
    }
    const publisherColumns: Record<string, unknown> = {
      name: pack.publisher.name,
      source_attribution: pack.publisher.sourceAttribution,
      is_visible: 1,
      ...(pack.publisher.websiteUrl ? { website_url: pack.publisher.websiteUrl } : {}),
    };
    let publisherState: PreparedState;
    let publisherId: number;
    if (publisherRow) {
      publisherId = Number(rowValue(publisherRow, 'id'));
      publisherState = (await updateChanged(
        connection,
        'catalogue_publishers',
        publisherId,
        publisherRow,
        publisherColumns,
      ))
        ? 'updated'
        : 'reused';
    } else {
      publisherId = await insertRow(connection, 'catalogue_publishers', {
        authority_kind: 'platform_reference',
        publisher_type: 'developer',
        developer_organisation_id: null,
        slug: pack.publisher.slug,
        ...publisherColumns,
      });
      publisherState = 'created';
    }

    const sitePlaceId = await resolveSitePlaceId(connection, pack.development);
    const reviewerId = await resolveReviewerId(connection, pack, options);

    // Development.
    const aggregates = deriveDevelopmentAggregates(pack.unitTypes);
    const devColumns = developmentColumns(pack, publisherId, aggregates);
    const devSelect = [
      'id',
      'catalogue_publisher_id',
      'name',
      'slug',
      'description',
      'developmentType',
      'transaction_type',
      'status',
      'dev_owner_type',
      'amenities',
      'completionDate',
      'estateSpecs',
      'totalUnits',
      'availableUnits',
      'priceFrom',
      'priceTo',
      'isPublished',
      'approval_status',
      'publishedAt',
      'images',
      'videos',
      'floorPlans',
      'brochures',
    ];
    const developmentRow = await selectOne(
      connection,
      'developments',
      devSelect,
      { catalogue_publisher_id: publisherId, slug: pack.development.slug },
      `development ${pack.development.slug}`,
    );
    const publishColumns = pack.publish ? { isPublished: 1, approval_status: 'approved' } : {};
    let developmentState: PreparedState;
    let developmentId: number;
    if (developmentRow) {
      developmentId = Number(rowValue(developmentRow, 'id'));
      const changedBase = await updateChanged(
        connection,
        'developments',
        developmentId,
        developmentRow,
        {
          ...devColumns,
          ...publishColumns,
        },
      );
      let publishedAtChanged = false;
      if (pack.publish && !rowValue(developmentRow, 'publishedAt')) {
        await connection.execute('UPDATE developments SET publishedAt = ? WHERE id = ?', [
          dbTimestamp(now),
          developmentId,
        ]);
        publishedAtChanged = true;
      }
      developmentState = changedBase || publishedAtChanged ? 'updated' : 'reused';
    } else {
      developmentId = await insertRow(connection, 'developments', {
        ...devColumns,
        isPublished: pack.publish ? 1 : 0,
        approval_status: pack.publish ? 'approved' : 'draft',
        ...(pack.publish ? { publishedAt: dbTimestamp(now) } : {}),
      });
      developmentState = 'created';
    }

    // Unit types (deterministic ids; never deleted).
    const unitCounts = { created: 0, updated: 0, reused: 0, notInPack: 0 };
    const unitIds = new Map<string, string>();
    const existingUnits = await selectRows(connection, 'unit_types', ['id'], {
      development_id: developmentId,
    });
    const packUnitIds = new Set<string>();
    for (const [index, unit] of pack.unitTypes.entries()) {
      const id = seedPackUnitId(pack.publisher.slug, pack.development.slug, unit.key);
      unitIds.set(unit.key, id);
      packUnitIds.add(id);
      const columns = unitColumns(pack, unit, index);
      const row = await selectOne(
        connection,
        'unit_types',
        ['id', ...Object.keys(columns), 'base_media'],
        { id },
        `unit ${unit.key}`,
      );
      if (row) {
        const changed = await updateChanged(connection, 'unit_types', id, row, columns);
        unitCounts[changed ? 'updated' : 'reused'] += 1;
      } else {
        await insertRow(connection, 'unit_types', {
          id,
          development_id: developmentId,
          ...columns,
          base_media: JSON.stringify({ gallery: [], floorPlans: [], renders: [] }),
        });
        unitCounts.created += 1;
      }
    }
    unitCounts.notInPack = existingUnits.filter(
      row => !packUnitIds.has(String(rowValue(row, 'id'))),
    ).length;

    // Accepted site assignment (exactly one executable Place per development).
    const siteRows = await selectRows(
      connection,
      'development_place_assignments',
      ['id', 'place_id', 'evidence_reference'],
      { development_id: developmentId, assignment_kind: 'site', review_state: 'accepted' },
    );
    if (siteRows.some(row => String(rowValue(row, 'place_id')) !== sitePlaceId)) {
      throw new Error(
        'Seed pack refused: the development already has an accepted site Place that differs from the pack. Resolve it in the admin workflow first.',
      );
    }
    const evidence =
      `seed-pack:${pack.publisher.slug}/${pack.development.slug}: ${pack.provenance.sourceDocuments.join('; ') || pack.provenance.enteredBy}`.slice(
        0,
        1000,
      );
    let placeState: PreparedState = 'reused';
    if (siteRows.length === 0) {
      await insertRow(connection, 'development_place_assignments', {
        development_id: developmentId,
        phase_id: null,
        place_id: sitePlaceId,
        assignment_kind: 'site',
        review_state: 'accepted',
        evidence_reference: evidence,
        created_by_user_id: reviewerId,
        reviewed_by_user_id: reviewerId,
        reviewed_at: dbTimestamp(
          pack.provenance.reviewedAt ? new Date(pack.provenance.reviewedAt) : now,
        ),
        review_note: 'Loaded from a reviewed development seed pack.',
      });
      placeState = 'created';
    }

    // Media, through the wizard's storage service.
    const mediaTotals = { stored: 0, reused: 0, removed: 0 };
    const fold = (r: { stored: number; reused: number; removed: number }) => {
      mediaTotals.stored += r.stored;
      mediaTotals.reused += r.reused;
      mediaTotals.removed += r.removed;
    };
    const scope = String(developmentId);
    const devMedia = (categories: DevelopmentSeedPackMedia['category'][]) =>
      pack.media
        .filter(media => categories.includes(media.category))
        .map(media => ({
          asset: assets.get(media.file)!,
          mediaType: mediaTypeFor(media.category),
          entryFields: {
            category:
              media.category === 'development_image'
                ? (media.imageCategory ?? 'general')
                : media.category,
            isPrimary: media.isPrimary === true,
            ...(media.title ? { title: media.title } : {}),
          } as Row,
        }));
    const mediaColumns: Record<string, unknown> = {};
    const reconcileColumn = async (column: string, desired: ReturnType<typeof devMedia>) => {
      const result = await reconcileMedia({
        existing: developmentRow ? rowValue(developmentRow, column) : null,
        desired,
        scope,
        store,
      });
      fold(result);
      mediaColumns[column] = JSON.stringify(result.entries);
    };
    await reconcileColumn('images', devMedia(['development_image']));
    await reconcileColumn('videos', devMedia(['development_video']));
    await reconcileColumn('floorPlans', devMedia(['development_floorplan']));
    await reconcileColumn('brochures', [
      ...devMedia(['development_document']),
      ...pack.documents.map(document => ({
        asset: assets.get(document.file)!,
        mediaType: 'pdf' as const,
        entryFields: {
          category: 'development_document',
          kind: document.kind,
          isPrimary: false,
          ...(document.title ? { title: document.title } : {}),
        } as Row,
      })),
    ]);
    const mediaRow = await selectOne(
      connection,
      'developments',
      ['id', 'images', 'videos', 'floorPlans', 'brochures'],
      { id: developmentId },
      'development media',
    );
    if (mediaRow)
      await updateChanged(connection, 'developments', developmentId, mediaRow, mediaColumns);

    // Unit media (gallery, floor plans) inside each unit's base_media object.
    for (const unit of pack.unitTypes) {
      const unitMedia = pack.media.filter(media => media.unitKey === unit.key);
      if (unitMedia.length === 0) continue;
      const id = unitIds.get(unit.key)!;
      const row = await selectOne(
        connection,
        'unit_types',
        ['id', 'base_media'],
        { id },
        `unit ${unit.key}`,
      );
      const base = parseJsonObject(rowValue(row ?? {}, 'base_media'));
      const unitDesired = (category: 'unit_gallery' | 'unit_floorplan') =>
        unitMedia
          .filter(media => media.category === category)
          .map(media => ({
            asset: assets.get(media.file)!,
            mediaType: mediaTypeFor(media.category),
            entryFields: {
              category,
              isPrimary: media.isPrimary === true,
              ...(media.title ? { title: media.title } : {}),
            } as Row,
          }));
      const gallery = await reconcileMedia({
        existing: base.gallery,
        desired: unitDesired('unit_gallery'),
        scope,
        store,
      });
      const floorPlans = await reconcileMedia({
        existing: base.floorPlans,
        desired: unitDesired('unit_floorplan'),
        scope,
        store,
      });
      fold(gallery);
      fold(floorPlans);
      if (row) {
        await updateChanged(connection, 'unit_types', id, row, {
          base_media: JSON.stringify({
            ...base,
            gallery: gallery.entries,
            floorPlans: floorPlans.entries,
          }),
        });
      }
    }

    // Publisher logo.
    if (pack.publisher.logo?.file) {
      const logo = assets.get(pack.publisher.logo.file)!;
      const logoRow = await selectOne(
        connection,
        'catalogue_publishers',
        ['id', 'logo_url'],
        { id: publisherId },
        'publisher logo',
      );
      // An existing logo is kept (clear logo_url to replace it); this keeps reruns idempotent.
      const current = String(rowValue(logoRow ?? {}, 'logo_url') ?? '').trim();
      if (!current) {
        const stored = await store({
          absolutePath: logo.absolutePath,
          fileName: logo.file.split(/[\\/]/).pop() ?? logo.file,
          contentType: logo.contentType,
          mediaType: 'image',
          scope: String(publisherId),
          bytes: logo.bytes,
        });
        await connection.execute('UPDATE catalogue_publishers SET logo_url = ? WHERE id = ?', [
          stored.url,
          publisherId,
        ]);
        mediaTotals.stored += 1;
      } else {
        mediaTotals.reused += 1;
      }
    }

    return {
      evidence: {
        pack: {
          publisherSlug: pack.publisher.slug,
          developmentSlug: pack.development.slug,
          publish: pack.publish === true,
        },
        prepared: {
          publisher: publisherState,
          development: developmentState,
          placeAssignment: placeState,
          unitTypes: unitCounts,
          media: mediaTotals,
        },
        ids: { publisherId, developmentId, sitePlaceId },
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Public visibility (same SQL predicate the public development search uses)
// ---------------------------------------------------------------------------

export async function checkPublicVisibility(
  connection: AuthoritySqlConnection,
  developmentId: number,
  placeId: string,
): Promise<{ eligible: boolean; inPlaceSearch: boolean; placeId: string }> {
  const [{ MySqlDialect }, { sql }, schema, eligibility] = await Promise.all([
    import('drizzle-orm/mysql-core'),
    import('drizzle-orm'),
    import('../../../../drizzle/schema'),
    import('../../../services/publicDevelopmentEligibility'),
  ]);
  const dialect = new MySqlDialect();
  const { developments, developmentPlaceAssignments } = schema;
  const eligibleQuery = dialect.sqlToQuery(
    sql`SELECT ${developments.id} AS id FROM ${developments}
         WHERE ${developments.id} = ${developmentId} AND ${eligibility.publicDevelopmentEligibilityConditions()}`,
  );
  const eligibleRows = await queryRows(connection, eligibleQuery.sql, eligibleQuery.params);
  const eligible = eligibleRows.length === 1;
  let inPlaceSearch = false;
  if (eligible) {
    const placeQuery = dialect.sqlToQuery(
      sql`SELECT ${developmentPlaceAssignments.id} AS id FROM ${developmentPlaceAssignments}
           WHERE ${developmentPlaceAssignments.developmentId} = ${developmentId}
             AND ${developmentPlaceAssignments.placeId} = ${placeId}
             AND ${developmentPlaceAssignments.assignmentKind} = 'site'
             AND ${developmentPlaceAssignments.reviewState} = 'accepted'`,
    );
    inPlaceSearch = (await queryRows(connection, placeQuery.sql, placeQuery.params)).length > 0;
  }
  return { eligible, inPlaceSearch, placeId };
}

// ---------------------------------------------------------------------------
// Verify (read-only)
// ---------------------------------------------------------------------------

function requireEqual(actual: unknown, expected: unknown, label: string): void {
  if (canon(actual) !== canon(expected)) {
    throw new Error(`Seed pack verification failed at ${label}.`);
  }
}

export async function verifyDevelopmentSeedPackRows(
  connection: AuthoritySqlConnection,
  pack: DevelopmentSeedPack,
): Promise<{ publisherId: number; developmentId: number; sitePlaceId: string }> {
  const publisher = await selectOne(
    connection,
    'catalogue_publishers',
    [
      'id',
      'authority_kind',
      'developer_organisation_id',
      'name',
      'source_attribution',
      'is_visible',
    ],
    { slug: pack.publisher.slug },
    'catalogue publisher',
  );
  if (!publisher) throw new Error('Seed pack verification failed: publisher is absent.');
  requireEqual(
    rowValue(publisher, 'authority_kind'),
    'platform_reference',
    'publisher.authority_kind',
  );
  requireEqual(
    rowValue(publisher, 'developer_organisation_id'),
    null,
    'publisher.developer_organisation_id',
  );
  requireEqual(rowValue(publisher, 'name'), pack.publisher.name, 'publisher.name');
  requireEqual(
    rowValue(publisher, 'source_attribution'),
    pack.publisher.sourceAttribution,
    'publisher.source_attribution',
  );
  requireEqual(rowValue(publisher, 'is_visible'), 1, 'publisher.is_visible');
  const publisherId = Number(rowValue(publisher, 'id'));

  const aggregates = deriveDevelopmentAggregates(pack.unitTypes);
  const expected = developmentColumns(pack, publisherId, aggregates);
  const development = await selectOne(
    connection,
    'developments',
    ['id', 'isPublished', 'approval_status', ...Object.keys(expected)],
    { catalogue_publisher_id: publisherId, slug: pack.development.slug },
    'development',
  );
  if (!development) throw new Error('Seed pack verification failed: development is absent.');
  for (const [column, value] of Object.entries(expected)) {
    requireEqual(rowValue(development, column), value, `development.${column}`);
  }
  if (pack.publish) {
    requireEqual(rowValue(development, 'isPublished'), 1, 'development.isPublished');
    requireEqual(
      rowValue(development, 'approval_status'),
      'approved',
      'development.approval_status',
    );
  }
  const developmentId = Number(rowValue(development, 'id'));

  for (const [index, unit] of pack.unitTypes.entries()) {
    const columns = unitColumns(pack, unit, index);
    const row = await selectOne(
      connection,
      'unit_types',
      ['id', 'development_id', ...Object.keys(columns)],
      { id: seedPackUnitId(pack.publisher.slug, pack.development.slug, unit.key) },
      `unit ${unit.key}`,
    );
    if (!row) throw new Error(`Seed pack verification failed: unit ${unit.key} is absent.`);
    requireEqual(rowValue(row, 'development_id'), developmentId, `unit ${unit.key}.development_id`);
    for (const [column, value] of Object.entries(columns)) {
      requireEqual(rowValue(row, column), value, `unit ${unit.key}.${column}`);
    }
  }

  const assignments = await selectRows(connection, 'development_place_assignments', ['place_id'], {
    development_id: developmentId,
    assignment_kind: 'site',
    review_state: 'accepted',
  });
  if (assignments.length !== 1) {
    throw new Error(
      'Seed pack verification failed: expected exactly one accepted site Place assignment.',
    );
  }
  const sitePlaceId = String(rowValue(assignments[0], 'place_id'));
  if (pack.development.sitePlaceId)
    requireEqual(sitePlaceId, pack.development.sitePlaceId, 'site place');

  const expectCount = (column: string, expectedFiles: string[]) => {
    const seeded = parseJsonArray(rowValue(development, column)).map(seedFileOf).filter(Boolean);
    if (seeded.sort().join('\n') !== [...expectedFiles].sort().join('\n')) {
      throw new Error(
        `Seed pack verification failed: ${column} does not match the pack media list.`,
      );
    }
  };
  const filesFor = (categories: string[]) =>
    pack.media.filter(m => categories.includes(m.category)).map(m => m.file);
  expectCount('images', filesFor(['development_image']));
  expectCount('videos', filesFor(['development_video']));
  expectCount('floorPlans', filesFor(['development_floorplan']));
  expectCount('brochures', [
    ...filesFor(['development_document']),
    ...pack.documents.map(d => d.file),
  ]);

  return { publisherId, developmentId, sitePlaceId };
}

// ---------------------------------------------------------------------------
// Adapter entry points
// ---------------------------------------------------------------------------

export async function prepareDevelopmentSeedPack(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
  pack: unknown;
  options: DevelopmentSeedPackOptions;
}): Promise<DevelopmentSeedPackEvidence> {
  assertSeedPackTarget(input.authority);
  assertOperation(input.decision, ['demo-seed']);
  const pack = parseDevelopmentSeedPack(input.pack);
  const base = evidenceBase(input.authority);
  const manifest = await requireAcceptedMigrationHead({
    authority: input.authority,
    connection: input.connection,
  });
  const { evidence } = await applyDevelopmentSeedPack({
    connection: input.connection,
    pack,
    options: input.options,
  });
  await verifyDevelopmentSeedPackRows(input.connection, pack);
  const visibility = await checkPublicVisibility(
    input.connection,
    evidence.ids.developmentId,
    evidence.ids.sitePlaceId,
  );
  return {
    ...base,
    ...evidence,
    publicVisibility: { ...visibility, publishRequested: pack.publish === true },
    migrationHead: manifest.document.expectedHead,
  };
}

export async function verifyDevelopmentSeedPack(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
  pack: unknown;
}): Promise<DevelopmentSeedPackEvidence> {
  assertSeedPackTarget(input.authority);
  assertOperation(input.decision, ['verification', 'browser-verification']);
  const pack = parseDevelopmentSeedPack(input.pack);
  const base = evidenceBase(input.authority);
  const manifest = await requireAcceptedMigrationHead({
    authority: input.authority,
    connection: input.connection,
  });
  const ids = await verifyDevelopmentSeedPackRows(input.connection, pack);
  const visibility = await checkPublicVisibility(
    input.connection,
    ids.developmentId,
    ids.sitePlaceId,
  );
  if (pack.publish && !(visibility.eligible && visibility.inPlaceSearch)) {
    throw new Error(
      'Seed pack verification failed: a publish pack is not publicly eligible for its Place.',
    );
  }
  return {
    ...base,
    pack: {
      publisherSlug: pack.publisher.slug,
      developmentSlug: pack.development.slug,
      publish: pack.publish === true,
    },
    prepared: {
      publisher: 'reused',
      development: 'reused',
      placeAssignment: 'reused',
      unitTypes: { created: 0, updated: 0, reused: pack.unitTypes.length, notInPack: 0 },
      media: { stored: 0, reused: pack.media.length + pack.documents.length, removed: 0 },
    },
    ids,
    publicVisibility: { ...visibility, publishRequested: pack.publish === true },
    migrationHead: manifest.document.expectedHead,
  };
}
