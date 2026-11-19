import type { AuthoritySqlConnection } from '../connectionAuthority';
import { queryRows, rowValue } from './common';
import {
  DEVELOPMENT_SEED_PACK_VERSION,
  SEED_PACK_IMAGE_CATEGORIES,
  SEED_PACK_STRUCTURAL_TYPES,
} from '../../../../shared/developmentSeedPack';

/**
 * Read-only exporter: turns a wizard-entered development in a database into a
 * draft seed pack plus a list of the stored media objects behind it. Only
 * columns that exist are selected (older schema heads are tolerated) and every
 * skipped field is reported. Facts the source does not hold stay absent.
 */

type Row = Record<string, unknown>;

export type ExportMediaSource = Readonly<{
  /** Path relative to the asset folder, as written into pack.json. */
  file: string;
  /** Governed storage key when the source stores it (local or S3 key). */
  storageKey: string | null;
  url: string | null;
}>;

export type DevelopmentSeedPackExport = {
  pack: Record<string, unknown>;
  mediaSources: ExportMediaSource[];
  skipped: string[];
  source: { developmentId: number; publisherId: number | null };
};

const DEV_WANTED = [
  'id',
  'name',
  'slug',
  'description',
  'developmentType',
  'transaction_type',
  'status',
  'completionDate',
  'amenities',
  'estateSpecs',
  'images',
  'videos',
  'floorPlans',
  'brochures',
  'catalogue_publisher_id',
  'city',
  'province',
  'suburb',
];
const PUBLISHER_WANTED = ['id', 'name', 'slug', 'website_url', 'source_attribution', 'logo_url'];
const UNIT_WANTED = [
  'id',
  'name',
  'bedrooms',
  'bathrooms',
  'unit_size',
  'yard_size',
  'base_price_from',
  'base_price_to',
  'total_units',
  'available_units',
  'structural_type',
  'parking_bays',
  'is_active',
  'display_order',
  'base_media',
];

async function existingColumns(
  connection: AuthoritySqlConnection,
  table: string,
): Promise<Set<string>> {
  const rows = await queryRows(
    connection,
    'SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?',
    [table],
  );
  return new Set(rows.map(row => String(rowValue(row, 'column_name'))));
}

function pick(
  table: string,
  wanted: readonly string[],
  present: Set<string>,
  skipped: string[],
): string[] {
  const selected = wanted.filter(column => present.has(column));
  for (const column of wanted) {
    if (!present.has(column)) skipped.push(`${table}.${column}`);
  }
  return selected;
}

function parseJson(value: unknown): unknown {
  let current: unknown = Buffer.isBuffer(value) ? value.toString('utf8') : value;
  for (let depth = 0; depth < 2 && typeof current === 'string'; depth += 1) {
    const text = current.trim();
    if (!text) return null;
    try {
      current = JSON.parse(text);
    } catch {
      return null;
    }
  }
  return current;
}

function asArray(value: unknown): Row[] {
  const parsed = parseJson(value);
  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object'
      ? [parsed]
      : [];
  return list
    .map(item => (typeof item === 'string' ? { url: item } : item))
    .filter(item => item && typeof item === 'object') as Row[];
}

function str(value: unknown): string | undefined {
  const text = typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
  return text ? text : undefined;
}

function num(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function slugifySeedPackKey(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100) || 'item'
  );
}

function entryUrl(entry: Row): string | null {
  return str(entry.url) ?? str(entry.storageKey) ?? str(entry.key) ?? null;
}

function safeFileName(entry: Row, index: number): string {
  const raw = str(entry.fileName) ?? entryUrl(entry)?.split('?')[0].split('/').pop() ?? '';
  const base = raw.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^[-.]+/, '');
  return `${String(index + 1).padStart(2, '0')}-${base || 'file.bin'}`;
}

export function buildDevelopmentSeedPackFromRows(input: {
  development: Row;
  publisher: Row | null;
  units: Row[];
  siteAssignmentPlaceId: string | null;
  skipped: string[];
  databaseName: string;
}): DevelopmentSeedPackExport {
  const { development, publisher, units, skipped } = input;
  const mediaSources: ExportMediaSource[] = [];
  const addSource = (file: string, entry: Row) =>
    mediaSources.push({
      file,
      storageKey: str(entry.storageKey) ?? str(entry.key) ?? null,
      url: str(entry.url) ?? null,
    });

  const media: Record<string, unknown>[] = [];
  const documents: Record<string, unknown>[] = [];

  asArray(rowValue(development, 'images')).forEach((entry, index) => {
    const file = `media/images/${safeFileName(entry, index)}`;
    const category = str(entry.category);
    addSource(file, entry);
    media.push({
      file,
      category: 'development_image',
      ...(category && (SEED_PACK_IMAGE_CATEGORIES as readonly string[]).includes(category)
        ? { imageCategory: category }
        : {}),
      isPrimary: entry.isPrimary === true || entry.isPrimary === 1,
      ...(str(entry.title) ? { title: str(entry.title) } : {}),
      ...(entryUrl(entry) ? { sourceUrl: entryUrl(entry) } : {}),
    });
  });
  for (const [column, folder, category] of [
    ['videos', 'videos', 'development_video'],
    ['floorPlans', 'floorplans', 'development_floorplan'],
  ] as const) {
    asArray(rowValue(development, column)).forEach((entry, index) => {
      const file = `media/${folder}/${safeFileName(entry, index)}`;
      addSource(file, entry);
      media.push({
        file,
        category,
        isPrimary: entry.isPrimary === true || entry.isPrimary === 1,
        ...(str(entry.title) ? { title: str(entry.title) } : {}),
        ...(entryUrl(entry) ? { sourceUrl: entryUrl(entry) } : {}),
      });
    });
  }
  asArray(rowValue(development, 'brochures')).forEach((entry, index) => {
    const file = `documents/${safeFileName(entry, index)}`;
    addSource(file, entry);
    const kind = str(entry.kind);
    documents.push({
      file,
      kind: kind === 'price_list' || kind === 'spec_sheet' ? kind : 'brochure',
      ...(str(entry.title) ? { title: str(entry.title) } : {}),
      ...(entryUrl(entry) ? { sourceUrl: entryUrl(entry) } : {}),
    });
  });

  const usedKeys = new Set<string>();
  const unitTypes = units
    .filter(
      unit =>
        rowValue(unit, 'is_active') === undefined || Number(rowValue(unit, 'is_active')) === 1,
    )
    .sort(
      (a, b) =>
        Number(rowValue(a, 'display_order') ?? 0) - Number(rowValue(b, 'display_order') ?? 0),
    )
    .map(unit => {
      const name = str(rowValue(unit, 'name')) ?? 'unit';
      let key = slugifySeedPackKey(name);
      for (let n = 2; usedKeys.has(key); n += 1) key = `${slugifySeedPackKey(name)}-${n}`;
      usedKeys.add(key);
      const structural = str(rowValue(unit, 'structural_type'));
      const out: Record<string, unknown> = { key, name };
      if (structural && (SEED_PACK_STRUCTURAL_TYPES as readonly string[]).includes(structural)) {
        out.structuralType = structural;
      }
      for (const [field, column] of [
        ['bedrooms', 'bedrooms'],
        ['bathrooms', 'bathrooms'],
        ['unitSize', 'unit_size'],
        ['yardSize', 'yard_size'],
        ['priceFrom', 'base_price_from'],
        ['priceTo', 'base_price_to'],
        ['totalUnits', 'total_units'],
        ['availableUnits', 'available_units'],
        ['parkingBays', 'parking_bays'],
      ] as const) {
        const value = num(rowValue(unit, column));
        if (value !== undefined) out[field] = value;
      }
      const base = parseJson(rowValue(unit, 'base_media'));
      if (base && typeof base === 'object' && !Array.isArray(base)) {
        for (const [field, folder, category] of [
          ['gallery', 'gallery', 'unit_gallery'],
          ['floorPlans', 'floorplans', 'unit_floorplan'],
        ] as const) {
          asArray((base as Row)[field]).forEach((entry, index) => {
            const file = `media/units/${key}/${folder}/${safeFileName(entry, index)}`;
            addSource(file, entry);
            media.push({
              file,
              category,
              unitKey: key,
              isPrimary: entry.isPrimary === true || entry.isPrimary === 1,
              ...(str(entry.title) ? { title: str(entry.title) } : {}),
              ...(entryUrl(entry) ? { sourceUrl: entryUrl(entry) } : {}),
            });
          });
        }
      }
      return out;
    });

  const legacyPath = ['province', 'city', 'suburb']
    .map(column => str(rowValue(development, column)))
    .filter((part): part is string => Boolean(part));
  const completion = rowValue(development, 'completionDate');
  const amenities = parseJson(rowValue(development, 'amenities'));
  const estateSpecs = parseJson(rowValue(development, 'estateSpecs'));

  const pack: Record<string, unknown> = {
    version: DEVELOPMENT_SEED_PACK_VERSION,
    publisher: {
      ...(publisher
        ? {
            slug: str(rowValue(publisher, 'slug')),
            name: str(rowValue(publisher, 'name')),
            sourceAttribution: str(rowValue(publisher, 'source_attribution')),
            ...(str(rowValue(publisher, 'website_url'))
              ? { websiteUrl: str(rowValue(publisher, 'website_url')) }
              : {}),
          }
        : {}),
    },
    development: {
      slug: str(rowValue(development, 'slug')),
      name: str(rowValue(development, 'name')),
      description: str(rowValue(development, 'description')),
      developmentType: str(rowValue(development, 'developmentType')),
      transactionType: str(rowValue(development, 'transaction_type')),
      status: str(rowValue(development, 'status')),
      ...(completion
        ? {
            completionDate: (completion instanceof Date
              ? completion.toISOString()
              : String(completion)
            ).slice(0, 10),
          }
        : {}),
      ...(input.siteAssignmentPlaceId
        ? { sitePlaceId: input.siteAssignmentPlaceId }
        : legacyPath.length
          ? { placePath: legacyPath }
          : {}),
      amenities: Array.isArray(amenities)
        ? amenities.filter(a => typeof a === 'string' && a.trim())
        : [],
      ...(estateSpecs && typeof estateSpecs === 'object' && !Array.isArray(estateSpecs)
        ? { estateSpecs }
        : {}),
    },
    unitTypes,
    media,
    documents,
    provenance: {
      enteredBy: 'exported from a database; unreviewed',
      sourceDocuments: [
        `database-export:${input.databaseName}:development:${Number(rowValue(development, 'id'))}`,
      ],
    },
  };
  const logo = publisher ? str(rowValue(publisher, 'logo_url')) : undefined;
  if (logo) {
    const file = `media/logo/${safeFileName({ url: logo }, 0)}`;
    mediaSources.push({ file, storageKey: null, url: logo });
    (pack.publisher as Row).logo = { file, sourceUrl: logo.startsWith('http') ? logo : undefined };
    if (!logo.startsWith('http')) delete ((pack.publisher as Row).logo as Row).sourceUrl;
  }
  return {
    pack,
    mediaSources,
    skipped,
    source: {
      developmentId: Number(rowValue(development, 'id')),
      publisherId: publisher ? Number(rowValue(publisher, 'id')) : null,
    },
  };
}

export async function exportDevelopmentSeedPack(input: {
  connection: AuthoritySqlConnection;
  developmentSlug: string;
  publisherSlug?: string;
  databaseName: string;
}): Promise<DevelopmentSeedPackExport> {
  const { connection } = input;
  const skipped: string[] = [];
  const devColumns = await existingColumns(connection, 'developments');
  if (devColumns.size === 0 || !devColumns.has('slug')) {
    throw new Error('Seed pack export refused: this database has no developments.slug column.');
  }
  const devSelect = pick('developments', DEV_WANTED, devColumns, skipped);
  const developments = await queryRows(
    connection,
    `SELECT ${devSelect.join(', ')} FROM developments WHERE slug = ?`,
    [input.developmentSlug],
  );
  const candidates: Row[] = [];
  for (const row of developments) {
    if (!input.publisherSlug) {
      candidates.push(row);
      continue;
    }
    const publisherId = rowValue(row, 'catalogue_publisher_id');
    const match = await queryRows(
      connection,
      'SELECT id FROM catalogue_publishers WHERE id = ? AND slug = ?',
      [publisherId, input.publisherSlug],
    );
    if (match.length) candidates.push(row);
  }
  if (candidates.length === 0)
    throw new Error('Seed pack export: no development matches that slug.');
  if (candidates.length > 1) {
    throw new Error('Seed pack export: the slug is ambiguous; pass --publisher-slug=<slug>.');
  }
  const development = candidates[0];
  const developmentId = Number(rowValue(development, 'id'));

  let publisher: Row | null = null;
  const publisherColumns = await existingColumns(connection, 'catalogue_publishers');
  const publisherId = rowValue(development, 'catalogue_publisher_id');
  if (publisherColumns.size > 0 && publisherId) {
    const publisherSelect = pick(
      'catalogue_publishers',
      PUBLISHER_WANTED,
      publisherColumns,
      skipped,
    );
    publisher =
      (
        await queryRows(
          connection,
          `SELECT ${publisherSelect.join(', ')} FROM catalogue_publishers WHERE id = ?`,
          [publisherId],
        )
      )[0] ?? null;
  } else {
    skipped.push('catalogue_publishers (table or developments.catalogue_publisher_id absent)');
  }

  const unitColumns = await existingColumns(connection, 'unit_types');
  const unitSelect = pick('unit_types', UNIT_WANTED, unitColumns, skipped);
  const units = unitColumns.size
    ? await queryRows(
        connection,
        `SELECT ${unitSelect.join(', ')} FROM unit_types WHERE development_id = ?`,
        [developmentId],
      )
    : [];

  let siteAssignmentPlaceId: string | null = null;
  const assignmentColumns = await existingColumns(connection, 'development_place_assignments');
  if (assignmentColumns.size) {
    const rows = await queryRows(
      connection,
      `SELECT DISTINCT place_id FROM development_place_assignments
        WHERE development_id = ? AND assignment_kind = 'site' AND review_state = 'accepted'`,
      [developmentId],
    );
    if (rows.length === 1) siteAssignmentPlaceId = String(rowValue(rows[0], 'place_id'));
    else
      skipped.push(
        `development_place_assignments (${rows.length} accepted site rows; sitePlaceId not set)`,
      );
  } else {
    skipped.push(
      'development_place_assignments (table absent; placePath used if legacy columns exist)',
    );
  }

  return buildDevelopmentSeedPackFromRows({
    development,
    publisher,
    units,
    siteAssignmentPlaceId,
    skipped,
    databaseName: input.databaseName,
  });
}
