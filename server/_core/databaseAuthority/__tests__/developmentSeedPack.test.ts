import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  developmentSeedPackSchema,
  parseDevelopmentSeedPack,
} from '../../../../shared/developmentSeedPack';
import {
  applyDevelopmentSeedPack,
  assertSeedPackTarget,
  deriveDevelopmentAggregates,
  PRODUCTION_SEEDING_REFUSAL,
  seedPackUnitId,
} from '../dataAdapters/developmentSeedPack';
import {
  buildDevelopmentSeedPackFromRows,
  slugifySeedPackKey,
} from '../dataAdapters/developmentSeedPackExport';
import type { AuthoritySqlConnection } from '../connectionAuthority';

function validPack(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    publisher: {
      slug: 'cosmopolitan',
      name: 'Cosmopolitan Projects',
      sourceAttribution: 'Public brochure, 2026',
    },
    development: {
      slug: 'baltimore',
      name: 'Baltimore',
      description: 'A mixed development.',
      developmentType: 'residential',
      transactionType: 'for_sale',
      status: 'selling',
      sitePlaceId: 'pl-place-01-abc',
      amenities: ['Pool'],
    },
    unitTypes: [
      {
        key: 'one-bed',
        name: '1 Bed',
        structuralType: 'apartment',
        bedrooms: 1,
        bathrooms: 1,
        unitSize: 45,
        priceFrom: 900000,
        totalUnits: 10,
        availableUnits: 4,
      },
      {
        key: 'two-bed',
        name: '2 Bed',
        structuralType: 'apartment',
        bedrooms: 2,
        bathrooms: 2,
        unitSize: 70,
        priceFrom: 1200000,
        priceTo: 1300000,
        totalUnits: 5,
        availableUnits: 5,
      },
    ],
    media: [
      {
        file: 'media/hero.jpg',
        category: 'development_image',
        imageCategory: 'featured',
        isPrimary: true,
      },
    ],
    documents: [{ file: 'docs/brochure.pdf', kind: 'brochure' }],
    provenance: {
      enteredBy: 'ops',
      sourceDocuments: ['brochure.pdf'],
      reviewedBy: 'reviewer@example.test',
      reviewedAt: '2026-11-19',
    },
    ...overrides,
  };
}

describe('development seed pack schema', () => {
  it('accepts a complete pack and keeps unknown optional facts absent', () => {
    const pack = parseDevelopmentSeedPack(validPack());
    expect(pack.unitTypes[0]).not.toHaveProperty('yardSize');
    expect(pack.unitTypes[0]).not.toHaveProperty('priceTo');
    expect(pack.development).not.toHaveProperty('completionDate');
  });

  it.each([
    ['unknown key', validPack({ extra: 1 })],
    [
      'unknown nested key',
      validPack({ publisher: { slug: 'a', name: 'A', sourceAttribution: 'x', invented: 1 } }),
    ],
    ['missing source attribution', validPack({ publisher: { slug: 'a', name: 'A' } })],
    [
      'blank description',
      validPack({ development: { ...validPack().development, description: ' ' } }),
    ],
    [
      'no place',
      validPack({ development: { ...validPack().development, sitePlaceId: undefined } }),
    ],
    ['path traversal', validPack({ media: [{ file: '../x.jpg', category: 'development_image' }] })],
    [
      'absolute asset',
      validPack({ media: [{ file: '/etc/x.jpg', category: 'development_image' }] }),
    ],
    [
      'unit media without unit',
      validPack({ media: [{ file: 'a.jpg', category: 'unit_gallery' }] }),
    ],
    [
      'unknown unit reference',
      validPack({ media: [{ file: 'a.jpg', category: 'unit_gallery', unitKey: 'nope' }] }),
    ],
    [
      'priceTo below priceFrom',
      validPack({ unitTypes: [{ ...validPack().unitTypes[0], priceTo: 1 }] }),
    ],
    [
      'published without review',
      validPack({ publish: true, provenance: { enteredBy: 'ops', sourceDocuments: [] } }),
    ],
    ['wrong version', validPack({ version: 2 })],
  ])('rejects %s', (_label, pack) => {
    expect(developmentSeedPackSchema.safeParse(pack).success).toBe(false);
  });

  it('derives aggregates only from stated facts', () => {
    const pack = parseDevelopmentSeedPack(validPack());
    expect(deriveDevelopmentAggregates(pack.unitTypes)).toEqual({
      totalUnits: 15,
      availableUnits: 9,
      priceFrom: 900000,
    });
  });

  it('derives stable unit ids', () => {
    expect(seedPackUnitId('a', 'b', 'c')).toBe(seedPackUnitId('a', 'b', 'c'));
    expect(seedPackUnitId('a', 'b', 'c')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

describe('seed pack target authority', () => {
  const authority = (targetClass: string) => ({ context: { targetClass } }) as never;
  it.each(['production', 'staging', 'shared-remote'])(
    'refuses %s with the launch-day message',
    targetClass => {
      expect(() => assertSeedPackTarget(authority(targetClass))).toThrow(
        PRODUCTION_SEEDING_REFUSAL,
      );
      expect(PRODUCTION_SEEDING_REFUSAL).toContain('production seeding is a launch-day step');
    },
  );
  it('refuses any other non-worktree target', () => {
    expect(() => assertSeedPackTarget(authority('clean-main-local'))).toThrow(
      'owned disposable worktree',
    );
  });
});

/** Minimal in-memory SQL engine for the loader's simple equality statements. */
function fakeConnection(seed: Record<string, Array<Record<string, unknown>>>) {
  const tables: Record<string, Array<Record<string, unknown>>> = JSON.parse(JSON.stringify(seed));
  const writes: string[] = [];
  const nextId: Record<string, number> = {};
  const execute = async (sql: string, values: readonly unknown[] = []) => {
    const insert = /^INSERT INTO (\w+) \(([^)]*)\) VALUES/.exec(sql);
    if (insert) {
      const row: Record<string, unknown> = {};
      insert[2].split(', ').forEach((column, i) => (row[column] = values[i]));
      nextId[insert[1]] = (nextId[insert[1]] ?? 100) + 1;
      if (row.id === undefined) row.id = nextId[insert[1]];
      (tables[insert[1]] ??= []).push(row);
      writes.push(`INSERT ${insert[1]}`);
      return [{ insertId: row.id as number }, undefined];
    }
    const update = /^UPDATE (\w+) SET (.*) WHERE id = \?$/.exec(sql);
    if (update) {
      const cols = update[2].split(', ').map(part => part.replace(' = ?', ''));
      const row = tables[update[1]].find(r => r.id === values[values.length - 1])!;
      cols.forEach((column, i) => (row[column] = values[i]));
      writes.push(`UPDATE ${update[1]}`);
      return [{}, undefined];
    }
    const select = /^SELECT (.*) FROM (\w+)(?: WHERE (.*))?$/.exec(sql);
    if (select) {
      const where = select[3] ? select[3].split(' AND ').map(part => part.replace(' = ?', '')) : [];
      const rows = (tables[select[2]] ?? []).filter(row =>
        where.every((column, i) => row[column] === values[i]),
      );
      const columns = select[1].split(', ');
      return [
        rows.map(row => Object.fromEntries(columns.map(c => [c, row[c] ?? null]))),
        undefined,
      ];
    }
    if (sql.startsWith('START') || sql.startsWith('COMMIT') || sql.startsWith('ROLLBACK'))
      return [[], undefined];
    throw new Error(`unexpected SQL: ${sql}`);
  };
  const connection: AuthoritySqlConnection = {
    execute,
    query: execute,
    end: async () => undefined,
  };
  return { connection, tables, writes };
}

describe('development seed pack loader', () => {
  const baseTables = () => ({
    place: [{ place_id: 'pl-place-01-abc', lifecycle_status: 'active', search_eligible: 1 }],
    users: [{ id: 7, email: 'reviewer@example.test' }],
  });

  function assets() {
    const root = mkdtempSync(join(tmpdir(), 'seed-pack-'));
    mkdirSync(join(root, 'media'));
    mkdirSync(join(root, 'docs'));
    writeFileSync(join(root, 'media/hero.jpg'), 'jpeg-bytes');
    writeFileSync(join(root, 'docs/brochure.pdf'), 'pdf-bytes');
    return root;
  }

  it('is idempotent: a second run writes nothing and stores no media again', async () => {
    const root = assets();
    try {
      const pack = parseDevelopmentSeedPack(validPack({ publish: true }));
      const stored: string[] = [];
      const options = {
        assetRoot: root,
        reviewerEmail: 'reviewer@example.test',
        storeMedia: async (input: { fileName: string }) => {
          stored.push(input.fileName);
          return {
            key: `properties/1/${stored.length}-${input.fileName}`,
            url: `/api/local-media/object?key=${stored.length}`,
          };
        },
        now: () => new Date('2026-11-19T10:00:00Z'),
      };
      const { connection, tables, writes } = fakeConnection(baseTables());

      const first = await applyDevelopmentSeedPack({ connection, pack, options });
      expect(first.evidence.prepared.publisher).toBe('created');
      expect(first.evidence.prepared.development).toBe('created');
      expect(first.evidence.prepared.unitTypes).toMatchObject({ created: 2 });
      expect(first.evidence.prepared.placeAssignment).toBe('created');
      expect(first.evidence.prepared.media.stored).toBe(2);
      expect(tables.catalogue_publishers[0]).toMatchObject({
        authority_kind: 'platform_reference',
        developer_organisation_id: null,
        is_visible: 1,
      });
      expect(tables.developments[0]).toMatchObject({
        isPublished: 1,
        approval_status: 'approved',
        dev_owner_type: 'platform',
        totalUnits: 15,
        priceFrom: 900000,
      });
      expect(tables.development_place_assignments[0]).toMatchObject({
        review_state: 'accepted',
        assignment_kind: 'site',
        reviewed_by_user_id: 7,
      });
      expect(JSON.parse(String(tables.developments[0].images))[0]).toMatchObject({
        category: 'featured',
        isPrimary: true,
        seedPackFile: 'media/hero.jpg',
      });
      expect(JSON.parse(String(tables.developments[0].brochures))[0]).toMatchObject({
        kind: 'brochure',
      });

      const writesAfterFirst = writes.length;
      const second = await applyDevelopmentSeedPack({ connection, pack, options });
      expect(writes.length).toBe(writesAfterFirst);
      expect(stored).toHaveLength(2);
      expect(second.evidence.prepared).toMatchObject({
        publisher: 'reused',
        development: 'reused',
        placeAssignment: 'reused',
        unitTypes: { created: 0, updated: 0, reused: 2 },
        media: { stored: 0, reused: 2 },
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('leaves an unpublished pack as a draft', async () => {
    const root = assets();
    try {
      const pack = parseDevelopmentSeedPack(validPack());
      const { connection, tables } = fakeConnection(baseTables());
      await applyDevelopmentSeedPack({
        connection,
        pack,
        options: {
          assetRoot: root,
          reviewerEmail: 'reviewer@example.test',
          storeMedia: async () => ({ key: 'properties/1/a.jpg', url: 'u' }),
        },
      });
      expect(tables.developments[0]).toMatchObject({ isPublished: 0, approval_status: 'draft' });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses a first-party publisher slug and a missing asset before writing', async () => {
    const root = assets();
    try {
      const pack = parseDevelopmentSeedPack(validPack());
      const firstParty = fakeConnection({
        ...baseTables(),
        catalogue_publishers: [
          {
            id: 1,
            slug: 'cosmopolitan',
            authority_kind: 'developer_first_party',
            developer_organisation_id: 3,
          },
        ],
      });
      await expect(
        applyDevelopmentSeedPack({
          connection: firstParty.connection,
          pack,
          options: { assetRoot: root, reviewerEmail: 'reviewer@example.test' },
        }),
      ).rejects.toThrow('first-party');

      const missing = fakeConnection(baseTables());
      const bad = parseDevelopmentSeedPack(
        validPack({ media: [{ file: 'media/missing.jpg', category: 'development_image' }] }),
      );
      await expect(
        applyDevelopmentSeedPack({
          connection: missing.connection,
          pack: bad,
          options: { assetRoot: root },
        }),
      ).rejects.toThrow('missing');
      expect(missing.writes).toHaveLength(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('development seed pack exporter mapping', () => {
  it('maps wizard rows to a portable, valid pack and reports media sources', () => {
    const exported = buildDevelopmentSeedPackFromRows({
      databaseName: 'listify_wt_example',
      skipped: ['unit_types.yard_size'],
      siteAssignmentPlaceId: 'pl-place-01-abc',
      publisher: {
        id: 4,
        slug: 'cosmopolitan',
        name: 'Cosmopolitan Projects',
        source_attribution: 'Brochure',
        website_url: null,
        logo_url: null,
      },
      development: {
        id: 9,
        slug: 'baltimore',
        name: 'Baltimore',
        description: 'Desc',
        developmentType: 'residential',
        transaction_type: 'for_sale',
        status: 'selling',
        completionDate: new Date('2027-03-01T00:00:00Z'),
        amenities: '["Pool","Gym"]',
        estateSpecs: null,
        images: JSON.stringify([
          {
            url: '/api/local-media/object?key=x',
            storageKey: 'properties/9/1-a.jpg',
            fileName: 'a.jpg',
            category: 'featured',
            isPrimary: true,
          },
          { url: 'https://cdn.example/b.jpg', category: 'interior' },
        ]),
        videos: JSON.stringify([
          { storageKey: 'properties/9/3-v.mp4', url: 'u', fileName: 'tour.mp4' },
        ]),
        floorPlans: null,
        brochures: JSON.stringify([
          { storageKey: 'properties/9/4-b.pdf', url: 'u2', fileName: 'brochure.pdf' },
        ]),
      },
      units: [
        {
          id: 'u1',
          name: '2 Bed Apartment',
          bedrooms: 2,
          bathrooms: '2.0',
          unit_size: 70,
          base_price_from: '1200000.00',
          base_price_to: null,
          total_units: 5,
          available_units: 3,
          structural_type: 'apartment',
          is_active: 1,
          display_order: 0,
          base_media: JSON.stringify({
            gallery: [{ storageKey: 'properties/9/5-u.jpg', url: 'u3', fileName: 'u.jpg' }],
            floorPlans: [],
          }),
        },
      ],
    });
    expect(exported.pack.media).toMatchObject([
      {
        file: 'media/images/01-a.jpg',
        category: 'development_image',
        imageCategory: 'featured',
        isPrimary: true,
      },
      { category: 'development_image', imageCategory: 'interior', isPrimary: false },
      { file: 'media/videos/01-tour.mp4', category: 'development_video' },
      { category: 'unit_gallery', unitKey: '2-bed-apartment' },
    ]);
    expect(exported.pack.documents).toMatchObject([
      { file: 'documents/01-brochure.pdf', kind: 'brochure' },
    ]);
    expect(exported.mediaSources.map(s => s.storageKey)).toEqual([
      'properties/9/1-a.jpg',
      null,
      'properties/9/3-v.mp4',
      'properties/9/4-b.pdf',
      'properties/9/5-u.jpg',
    ]);
    expect(exported.pack.unitTypes).toMatchObject([
      { key: '2-bed-apartment', priceFrom: 1200000, bathrooms: 2 },
    ]);
    expect(exported.pack.unitTypes[0]).not.toHaveProperty('priceTo');
    expect(exported.skipped).toEqual(['unit_types.yard_size']);
    // Source-only review fields and unknown provenance never make the draft invalid by themselves.
    expect(developmentSeedPackSchema.safeParse(exported.pack).success).toBe(true);
  });

  it('falls back to a legacy place path and leaves missing facts absent', () => {
    const exported = buildDevelopmentSeedPackFromRows({
      databaseName: 'x',
      skipped: [],
      siteAssignmentPlaceId: null,
      publisher: null,
      development: {
        id: 1,
        slug: 's',
        name: 'N',
        description: 'D',
        developmentType: 'residential',
        transaction_type: 'for_sale',
        status: 'selling',
        city: 'Sandton',
        province: 'Gauteng',
        amenities: null,
      },
      units: [],
    });
    expect(exported.pack.development).toMatchObject({
      placePath: ['Gauteng', 'Sandton'],
      amenities: [],
    });
    expect(exported.pack.publisher).toEqual({});
    expect(developmentSeedPackSchema.safeParse(exported.pack).success).toBe(false);
    expect(slugifySeedPackKey('  Two Bed / Loft! ')).toBe('two-bed-loft');
  });
});
