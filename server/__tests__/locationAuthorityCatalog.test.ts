import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  LOCATION_AUTHORITY_CATALOG,
  LOCATION_AUTHORITY_CATALOG_SHA256,
  loadLocationAuthorityCatalog,
} from '../locationAuthorityCatalog';

const temporaryRoots: string[] = [];

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function writeArtifact(root: string, relativePath: string, value: string): string {
  const target = path.join(root, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, value);
  return sha256(value);
}

function createSyntheticCatalog(factualIdNamespaces = ['test-nz']) {
  const root = mkdtempSync(path.join(tmpdir(), 'property-listify-location-authority-'));
  temporaryRoots.push(root);
  const manifestPath = 'manifest.json';
  const projectionPath = 'projection.json';
  const mappingPath = 'mapping.jsonl';
  const manifest = `${JSON.stringify(
    {
      manifest_version: '0.1',
      territory: { province: 'Test Region', province_slug: 'test-region' },
      outputs: { projection: projectionPath, mapping: mappingPath },
    },
    null,
    2,
  )}\n`;
  const projection = `${JSON.stringify(
    {
      schema_version: '0.2',
      projection_version: 'test-region-runtime-reference-projection-v0.1',
      source_factual_projection_artifact: mappingPath,
      numeric_runtime_ids_are_durable_authority: false,
      checkpoints: {},
      rows: [
        {
          runtime_search_scope_kind: 'province',
          runtime_storage_level: 'province',
          runtime_natural_key: 'test-region',
          runtime_parent_natural_key: null,
          name: 'Test Region',
          slug: 'test-region',
          code: 'TR',
          factual_location_ids: ['pl-geo-v01-test-nz-00000000000000000001'],
          factual_preferred_names: ['Test Region'],
          factual_types: ['province'],
        },
        {
          runtime_search_scope_kind: 'metro_city',
          runtime_storage_level: 'city',
          runtime_natural_key: 'test-region/test-city',
          runtime_parent_natural_key: 'test-region',
          name: 'Test City',
          slug: 'test-city',
          factual_location_ids: ['pl-geo-v01-test-nz-00000000000000000002'],
          factual_preferred_names: ['Test City'],
          factual_types: ['city'],
        },
        {
          runtime_search_scope_kind: 'locality',
          runtime_storage_level: 'suburb',
          runtime_natural_key: 'test-region/test-city/test-locality',
          runtime_parent_natural_key: 'test-region/test-city',
          name: 'Test Locality',
          slug: 'test-locality',
          factual_location_ids: ['pl-geo-v01-test-nz-00000000000000000003'],
          factual_preferred_names: ['Test Locality'],
          factual_types: ['suburb'],
        },
      ],
    },
    null,
    2,
  )}\n`;
  const mapping = `${[
    {
      factual_location_id: 'pl-geo-v01-test-nz-00000000000000000001',
      factual_preferred_name: 'Test Region',
      factual_type: 'province',
      factual_context: { province_slug: 'test-region' },
      runtime_search_scope_kind: 'province',
      runtime_natural_key: 'test-region',
      runtime_parent_natural_key: null,
      runtime_parent_relationship: 'runtime_root',
      projection_status: 'projection_ready',
      runtime_reference_status: 'reference_data_expansion_required',
      environment_runtime_compatibility_ids: [],
      evidence_references: ['test:manifest'],
      decision_reason: 'Synthetic territory contract.',
      name_only_match: false,
    },
    {
      factual_location_id: 'pl-geo-v01-test-nz-00000000000000000002',
      factual_preferred_name: 'Test City',
      factual_type: 'city',
      factual_context: { province_slug: 'test-region' },
      runtime_search_scope_kind: 'metro_city',
      runtime_natural_key: 'test-region/test-city',
      runtime_parent_natural_key: 'test-region',
      runtime_parent_relationship: 'accepted_parent',
      projection_status: 'projection_ready',
      runtime_reference_status: 'reference_data_expansion_required',
      environment_runtime_compatibility_ids: [],
      evidence_references: ['test:manifest'],
      decision_reason: 'Synthetic territory contract.',
      name_only_match: false,
    },
    {
      factual_location_id: 'pl-geo-v01-test-nz-00000000000000000003',
      factual_preferred_name: 'Test Locality',
      factual_type: 'suburb',
      factual_context: { province_slug: 'test-region' },
      runtime_search_scope_kind: 'locality',
      runtime_natural_key: 'test-region/test-city/test-locality',
      runtime_parent_natural_key: 'test-region/test-city',
      runtime_parent_relationship: 'accepted_parent',
      projection_status: 'projection_ready',
      runtime_reference_status: 'reference_data_expansion_required',
      environment_runtime_compatibility_ids: [],
      evidence_references: ['test:manifest'],
      decision_reason: 'Synthetic territory contract.',
      name_only_match: false,
    },
  ]
    .map(entry => JSON.stringify(entry))
    .join('\n')}\n`;
  const source = {
    source_id: 'test-region-source',
    root_natural_key: 'test-region',
    factual_id_namespaces: factualIdNamespaces,
    manifest: {
      path: manifestPath,
      sha256: writeArtifact(root, manifestPath, manifest),
    },
    runtime_projection: {
      path: projectionPath,
      sha256: writeArtifact(root, projectionPath, projection),
    },
    factual_mapping: {
      path: mappingPath,
      sha256: writeArtifact(root, mappingPath, mapping),
    },
    expected_manifest_version: '0.1',
    expected_projection_version: 'test-region-runtime-reference-projection-v0.1',
    expected_runtime_rows: 3,
    expected_factual_entries: 3,
    expected_projection_ready_entries: 3,
    expected_co_published_natural_keys: 0,
  };
  return {
    root,
    catalog: {
      schema_version: '0.1',
      catalog_id: 'property-listify-location-authority-test',
      sources: [source],
    },
  };
}

afterEach(() => {
  while (temporaryRoots.length > 0) {
    const root = temporaryRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('location authority aggregate catalog', () => {
  it('loads the frozen Gauteng source and resolves only exact governed group members', () => {
    const root = path.resolve(import.meta.dirname, '../..');
    const projection = readFileSync(
      path.join(
        root,
        'data/geography-coverage-v0.1/output/gauteng_runtime_reference_projection_v0.2.json',
      ),
    );
    const mapping = readFileSync(
      path.join(
        root,
        'data/geography-coverage-v0.1/output/gauteng_factual_runtime_mapping_v0.2.jsonl',
      ),
    );
    const disposition = readFileSync(
      path.join(root, 'data/geography-coverage-v0.1/output/gauteng_coverage_disposition_v0.1.json'),
    );
    const reviewQueue = readFileSync(
      path.join(root, 'data/geography-coverage-v0.1/output/gauteng_review_queue_v0.1.jsonl'),
    );

    expect(sha256(projection)).toBe(
      'faad65e4216c2fb62886e5561984a8b82fe3b750942a4bb38c2eba12a8141399',
    );
    expect(sha256(mapping)).toBe(
      'ed709559ba69b28b6dcc20fc7381478f2e822ff8436bcaaf7dcaaddd410c63fa',
    );
    expect(sha256(disposition)).toBe(
      'd80601e2b368190c31650a68c3f38d1ba351e9e05803ebd01ff21ae7a860d232',
    );
    expect(sha256(reviewQueue)).toBe(
      'd8e3521a20a9d906cc12ae13236e5aafdfd78291612068048a09cb5bbbab424a',
    );
    const recovery = JSON.parse(
      readFileSync(
        path.join(root, 'data/geography-coverage-v0.1/source-recovery.v0.1.json'),
        'utf8',
      ),
    ) as Record<string, unknown>;
    expect(recovery).toMatchObject({
      status: 'exact_source_unrecoverable',
      authority_decision: {
        source_replacement: 'prohibited',
        full_regeneration: 'blocked_until_exact_source_is_restored',
      },
    });
    expect(LOCATION_AUTHORITY_CATALOG_SHA256).toMatch(/^[a-f0-9]{64}$/);
    expect(LOCATION_AUTHORITY_CATALOG.sources).toHaveLength(1);
    expect(LOCATION_AUTHORITY_CATALOG.runtimeRows).toHaveLength(1414);
    expect(LOCATION_AUTHORITY_CATALOG.factualEntries).toHaveLength(1480);
    expect(LOCATION_AUTHORITY_CATALOG.coPublications).toHaveLength(14);

    for (const group of LOCATION_AUTHORITY_CATALOG.coPublications) {
      expect(
        LOCATION_AUTHORITY_CATALOG.projectionAuthority.resolveNaturalKey(group.runtimeNaturalKey),
      ).toMatchObject({ status: 'blocked', projectionStatus: 'ambiguous_projection' });
      for (const factualLocationId of group.factualLocationIds) {
        expect(
          LOCATION_AUTHORITY_CATALOG.projectionAuthority.resolveNaturalKey(
            group.runtimeNaturalKey,
            factualLocationId,
          ),
        ).toMatchObject({ status: 'resolved', projection: { factualLocationId } });
      }
    }
  });

  it('loads a synthetic non-Gauteng territory without changing the real catalog', () => {
    const { root, catalog } = createSyntheticCatalog();
    const aggregate = loadLocationAuthorityCatalog({ rootDirectory: root, catalog });

    expect(aggregate.catalog.catalogId).toBe('property-listify-location-authority-test');
    expect(aggregate.runtimeRows.map(row => row.runtimeNaturalKey)).toEqual([
      'test-region',
      'test-region/test-city',
      'test-region/test-city/test-locality',
    ]);
    expect(
      aggregate.projectionAuthority.resolveNaturalKey('test-region/test-city/test-locality'),
    ).toMatchObject({
      status: 'resolved',
      projection: { factualLocationId: 'pl-geo-v01-test-nz-00000000000000000003' },
    });
    expect(LOCATION_AUTHORITY_CATALOG.sources).toHaveLength(1);
  });

  it('fails closed for an unregistered factual namespace', () => {
    const { root, catalog } = createSyntheticCatalog(['gp']);
    expect(() => loadLocationAuthorityCatalog({ rootDirectory: root, catalog })).toThrow(
      'unregistered factual identity',
    );
  });

  it('fails closed when a runtime row contains a blocked factual member', () => {
    const { root, catalog } = createSyntheticCatalog();
    const mappingPath = catalog.sources[0]!.factual_mapping.path;
    const entries = readFileSync(path.join(root, mappingPath), 'utf8')
      .trim()
      .split(/\n/)
      .map(line => JSON.parse(line) as Record<string, unknown>);
    entries[0]!.projection_status = 'ambiguous_projection';
    entries[0]!.runtime_search_scope_kind = null;
    entries[0]!.runtime_natural_key = null;
    entries[0]!.runtime_parent_natural_key = null;
    entries[0]!.runtime_reference_status = null;
    catalog.sources[0]!.expected_projection_ready_entries = 2;
    catalog.sources[0]!.factual_mapping.sha256 = writeArtifact(
      root,
      mappingPath,
      `${entries.map(entry => JSON.stringify(entry)).join('\n')}\n`,
    );

    expect(() => loadLocationAuthorityCatalog({ rootDirectory: root, catalog })).toThrow(
      'no ready matching factual entry',
    );
  });

  it('fails closed for malformed optional runtime metadata on a blocked mapping', () => {
    const { root, catalog } = createSyntheticCatalog();
    const mappingPath = catalog.sources[0]!.factual_mapping.path;
    const entries = readFileSync(path.join(root, mappingPath), 'utf8')
      .trim()
      .split(/\n/)
      .map(line => JSON.parse(line) as Record<string, unknown>);
    entries.push({
      ...entries[0]!,
      factual_location_id: 'pl-geo-v01-test-nz-00000000000000000004',
      factual_preferred_name: 'Malformed Blocked Entry',
      projection_status: 'ambiguous_projection',
      runtime_search_scope_kind: 'province',
      runtime_natural_key: 7,
      runtime_parent_natural_key: null,
      runtime_reference_status: null,
    });
    catalog.sources[0]!.expected_factual_entries = 4;
    catalog.sources[0]!.factual_mapping.sha256 = writeArtifact(
      root,
      mappingPath,
      `${entries.map(entry => JSON.stringify(entry)).join('\n')}\n`,
    );

    expect(() => loadLocationAuthorityCatalog({ rootDirectory: root, catalog })).toThrow(
      'invalid runtime_natural_key',
    );
  });

  it('fails closed for malformed factual context', () => {
    const { root, catalog } = createSyntheticCatalog();
    const mappingPath = catalog.sources[0]!.factual_mapping.path;
    const mapping = readFileSync(path.join(root, mappingPath), 'utf8').replace(
      '"province_slug":"test-region"',
      '"province_slug":7',
    );
    catalog.sources[0]!.factual_mapping.sha256 = writeArtifact(root, mappingPath, mapping);

    expect(() => loadLocationAuthorityCatalog({ rootDirectory: root, catalog })).toThrow(
      'invalid province context',
    );
  });

  it('fails closed when projection metadata conflicts with its natural key', () => {
    const { root, catalog } = createSyntheticCatalog();
    const projectionPath = catalog.sources[0]!.runtime_projection.path;
    const projection = JSON.parse(readFileSync(path.join(root, projectionPath), 'utf8')) as {
      rows: Array<{ slug: string }>;
    };
    projection.rows[1]!.slug = 'wrong-slug';
    catalog.sources[0]!.runtime_projection.sha256 = writeArtifact(
      root,
      projectionPath,
      `${JSON.stringify(projection, null, 2)}\n`,
    );

    expect(() => loadLocationAuthorityCatalog({ rootDirectory: root, catalog })).toThrow(
      'slug incompatible with its natural key',
    );
  });

  it('fails closed for a changed source digest', () => {
    const { root, catalog } = createSyntheticCatalog();
    catalog.sources[0]!.runtime_projection.sha256 = '0'.repeat(64);
    expect(() => loadLocationAuthorityCatalog({ rootDirectory: root, catalog })).toThrow(
      'does not match',
    );
  });

  it('rejects one factual identity registered by two territory sources', () => {
    const { root, catalog } = createSyntheticCatalog();
    const manifestPath = 'second-manifest.json';
    const projectionPath = 'second-projection.json';
    const mappingPath = 'second-mapping.jsonl';
    const duplicateId = 'pl-geo-v01-test-nz-00000000000000000001';
    const manifest = `${JSON.stringify(
      {
        manifest_version: '0.1',
        territory: { province: 'Second Region', province_slug: 'second-region' },
        outputs: { projection: projectionPath, mapping: mappingPath },
      },
      null,
      2,
    )}\n`;
    const projection = `${JSON.stringify(
      {
        schema_version: '0.2',
        projection_version: 'second-region-runtime-reference-projection-v0.1',
        source_factual_projection_artifact: mappingPath,
        numeric_runtime_ids_are_durable_authority: false,
        checkpoints: {},
        rows: [
          {
            runtime_search_scope_kind: 'province',
            runtime_storage_level: 'province',
            runtime_natural_key: 'second-region',
            runtime_parent_natural_key: null,
            name: 'Second Region',
            slug: 'second-region',
            code: 'SR',
            factual_location_ids: [duplicateId],
            factual_preferred_names: ['Second Region'],
            factual_types: ['province'],
          },
        ],
      },
      null,
      2,
    )}\n`;
    const mapping = `${JSON.stringify({
      factual_location_id: duplicateId,
      factual_preferred_name: 'Second Region',
      factual_type: 'province',
      factual_context: { province_slug: 'second-region' },
      runtime_search_scope_kind: 'province',
      runtime_natural_key: 'second-region',
      runtime_parent_natural_key: null,
      runtime_parent_relationship: 'runtime_root',
      projection_status: 'projection_ready',
      runtime_reference_status: 'reference_data_expansion_required',
      environment_runtime_compatibility_ids: [],
      evidence_references: ['test:second-manifest'],
      decision_reason: 'Synthetic cross-source duplicate contract.',
      name_only_match: false,
    })}\n`;
    catalog.sources.push({
      source_id: 'second-region-source',
      root_natural_key: 'second-region',
      factual_id_namespaces: ['test-nz'],
      manifest: {
        path: manifestPath,
        sha256: writeArtifact(root, manifestPath, manifest),
      },
      runtime_projection: {
        path: projectionPath,
        sha256: writeArtifact(root, projectionPath, projection),
      },
      factual_mapping: {
        path: mappingPath,
        sha256: writeArtifact(root, mappingPath, mapping),
      },
      expected_manifest_version: '0.1',
      expected_projection_version: 'second-region-runtime-reference-projection-v0.1',
      expected_runtime_rows: 1,
      expected_factual_entries: 1,
      expected_projection_ready_entries: 1,
      expected_co_published_natural_keys: 0,
    });

    expect(() => loadLocationAuthorityCatalog({ rootDirectory: root, catalog })).toThrow(
      'aggregate repeats factual identity',
    );
  });

  it('rejects two source registrations for the same runtime root', () => {
    const { root, catalog } = createSyntheticCatalog();
    catalog.sources.push({
      ...catalog.sources[0]!,
      source_id: 'test-region-source-duplicate',
    });
    expect(() => loadLocationAuthorityCatalog({ rootDirectory: root, catalog })).toThrow(
      'Duplicate location authority root',
    );
  });
});
