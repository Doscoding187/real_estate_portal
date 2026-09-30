/**
 * Synthetic non-Gauteng territory fixture (Place Authority Phase 3 gate).
 *
 * The Phase 3 gate requires proving that admitting a second territory needs no
 * new application architecture. This module writes a complete, tiny, obviously
 * fictional territory — a province, two municipalities and three suburbs — into
 * a caller-supplied directory, shaped exactly like a governed source authority.
 *
 * Everything here is invented for the proof. It is deliberately unlike any real
 * South African geography: the names are invented, the identifiers carry a
 * `synthetic` namespace, and nothing is copied from the Gauteng source
 * authority. It exists only to be run through the real admission pipeline.
 *
 * The fixture is written into a throwaway directory that the caller removes, so
 * no fictional geography is ever committed and the real territory registry never
 * gains an entry.
 */

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const SYNTHETIC_TERRITORY_ID = 'synthetic-01';
export const SYNTHETIC_ADMISSION_VERSION = 'synthetic-place-admission-v0.1';
export const SYNTHETIC_SOURCE_AUTHORITY_VERSION = 'synthetic-source-authority-v0.1';
export const SYNTHETIC_SOURCE_SNAPSHOT_ID =
  '00000000000000000000000000000000000000000000000000000000ffffff01';

const SOURCE_DIR = `data/${SYNTHETIC_TERRITORY_ID}-source-authority-v0.1`;
const COVERAGE_DIR = `data/${SYNTHETIC_TERRITORY_ID}-coverage-v0.1`;
const PACKAGE_DIR = `data/${SYNTHETIC_TERRITORY_ID}-place-admission-v0.1`;
const REGISTRY_PATH = `${SOURCE_DIR}/../${SYNTHETIC_TERRITORY_ID}-territory-registry.v0.1.json`;

const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');

const writeJson = (root, relativePath, value) => {
  const full = resolve(root, relativePath);
  mkdirSync(dirname(full), { recursive: true });
  const content = `${JSON.stringify(value, null, 2)}\n`;
  writeFileSync(full, content);
  return { path: relativePath, sha256: sha256(Buffer.from(content)) };
};

const writeJsonl = (root, relativePath, rows) => {
  const full = resolve(root, relativePath);
  mkdirSync(dirname(full), { recursive: true });
  const content = `${rows.map(row => JSON.stringify(row)).join('\n')}\n`;
  writeFileSync(full, content);
  return { path: relativePath, sha256: sha256(Buffer.from(content)) };
};

/**
 * The fictional hierarchy. `adm2` is what the builder reads to attach a
 * containment parent, and `province` is the evidenced context that establishes a
 * search scope, so both are populated exactly as a governed source would.
 */
const PROVINCE = 'Synthetic Province';
const MUNICIPALITIES = ['Alpha Local Municipality', 'Beta Local Municipality'];
const SUBURBS = [
  { name: 'Northridge', municipality: MUNICIPALITIES[0], lat: -33.1, lon: 24.1 },
  { name: 'Southfield', municipality: MUNICIPALITIES[0], lat: -33.2, lon: 24.2 },
  { name: 'Eastgardens', municipality: MUNICIPALITIES[1], lat: -33.3, lon: 24.3 },
];

const PARENT_EVIDENCE_EDGES = [
  {
    edge_id: 'synthetic-edge-1',
    preferred_name: 'Northridge',
    parent_natural_key: 'alpha-local-municipality',
    evidence_class: 'osm_administrative',
  },
  {
    edge_id: 'synthetic-edge-2',
    preferred_name: 'Southfield',
    parent_natural_key: 'alpha-local-municipality',
    evidence_class: 'load_shedding',
  },
];

const identityId = slug => `pl-geo-v01-${SYNTHETIC_TERRITORY_ID}-${slug}`;

function identity({ slug, name, canonicalType, adm2, lat, lon, licensing, osmOnly }) {
  return {
    source_authority_version: SYNTHETIC_SOURCE_AUTHORITY_VERSION,
    canonical_location_id: identityId(slug),
    identity_namespace: 'Property Listify',
    canonical_status: 'factual_canonical',
    lifecycle_status: 'active',
    promotion_class: 'promotable_with_provisional_attributes',
    identity_confidence: 'high',
    preferred_name: name,
    official_name: null,
    normalized_name: name.toLowerCase(),
    name_assertion_ids: [`${SYNTHETIC_TERRITORY_ID}-name-${slug}`],
    name_confidence: 'high',
    name_state: 'supported',
    canonical_type: canonicalType,
    type_confidence: 'high',
    type_state: 'accepted',
    representative_latitude: lat,
    representative_longitude: lon,
    spatial_confidence: 'high',
    administrative_context: {
      adm2: adm2 ? [{ level: 'ADM2', name: adm2 }] : [],
      province: { level: 'ADM1', name: PROVINCE, source: 'synthetic' },
    },
    source_record_ids: [`synthetic:node/${slug}`],
    source_names: ['synthetic'],
    licence_classes: licensing === 'osm_only_odbl_provisional' ? ['ODBL_1'] : ['CC0_1.0'],
    licensing_classification: licensing,
    osm_only: osmOnly ? 1 : 0,
  };
}

function nameAssertion({ slug, canonicalLocationId, name, role, searchable }) {
  return {
    source_authority_version: SYNTHETIC_SOURCE_AUTHORITY_VERSION,
    name_assertion_id: `${SYNTHETIC_TERRITORY_ID}-name-${slug}`,
    canonical_location_id: canonicalLocationId,
    name,
    normalized_name: name.toLowerCase(),
    name_type: role,
    name_roles: [role],
    status: 'active',
    searchable: searchable ? 1 : 0,
    source_record_ids: [`synthetic:node/${slug}`],
    source_names: ['synthetic'],
    derived_from_candidate: false,
  };
}

function sourceLink({ slug, canonicalLocationId, exactSourceName, licenceClass }) {
  return {
    source_authority_version: SYNTHETIC_SOURCE_AUTHORITY_VERSION,
    source_link_id: `${SYNTHETIC_TERRITORY_ID}-source-${slug}`,
    canonical_location_id: canonicalLocationId,
    source_record_id: `synthetic:node/${slug}`,
    source: 'synthetic',
    source_native_id: slug,
    source_native_stable_id: slug,
    exact_source_name: exactSourceName,
    source_native_classification: { place: 'suburb', element_type: 'node' },
    licence_class: licenceClass,
    attribution: 'Synthetic fixture. Not a real source.',
    retrieved_at: '2026-01-01T00:00:00Z',
  };
}

function candidate({ slug, name, candidateType }) {
  return {
    source_authority_version: SYNTHETIC_SOURCE_AUTHORITY_VERSION,
    candidate_location_id: `${SYNTHETIC_TERRITORY_ID}-cand-${slug}`,
    preferred_name: name,
    normalized_name: name.toLowerCase(),
    candidate_type: candidateType,
    assessed_candidate_type: candidateType,
    candidate_type_status: 'proposed',
    promotion_class: 'candidate_only',
    factual_identity_status: 'candidate',
    human_review_required: false,
    priority_probe_review: false,
    promotion_reasons: [
      'evidence does not meet the independent identity threshold for factual canonical promotion',
    ],
    conflict_reasons: ['no cross-source match evidence; source record retained as candidate seed'],
    licence_state: 'osm_only_odbl_provisional',
    osm_only: 1,
    source_support: { sources: ['synthetic'] },
  };
}

/**
 * Write the whole synthetic territory and return the registry path plus the
 * facts the proof asserts against.
 */
export function writeSyntheticTerritoryFixture(root) {
  const provinceSlug = 'province';
  const provinceId = identityId(provinceSlug);
  const municipalityIds = MUNICIPALITIES.map((name, index) =>
    identityId(`municipality-${index}`),
  );

  const identities = [
    identity({
      slug: provinceSlug,
      name: PROVINCE,
      canonicalType: 'province',
      adm2: null,
      lat: -33.0,
      lon: 24.0,
      licensing: 'permissive_supported',
      osmOnly: 0,
    }),
    ...MUNICIPALITIES.map((name, index) =>
      identity({
        slug: `municipality-${index}`,
        name,
        canonicalType: 'local_municipality',
        adm2: name,
        lat: -33.0 - index * 0.1,
        lon: 24.0 + index * 0.1,
        licensing: 'permissive_supported',
        osmOnly: 0,
      }),
    ),
    ...SUBURBS.map(suburb =>
      identity({
        slug: suburb.name.toLowerCase(),
        name: suburb.name,
        canonicalType: 'suburb',
        adm2: suburb.municipality,
        lat: suburb.lat,
        lon: suburb.lon,
        licensing: 'osm_only_odbl_provisional',
        osmOnly: 1,
      }),
    ),
  ];

  const names = identities.map((entry, index) =>
    nameAssertion({
      slug: index === 0 ? provinceSlug : entry.canonical_location_id.split('-').pop(),
      canonicalLocationId: entry.canonical_location_id,
      name: entry.preferred_name,
      role: 'preferred_common',
      searchable: true,
    }),
  );

  const links = identities.map((entry, index) =>
    sourceLink({
      slug: index === 0 ? provinceSlug : entry.canonical_location_id.split('-').pop(),
      canonicalLocationId: entry.canonical_location_id,
      exactSourceName: entry.preferred_name,
      licenceClass: entry.licensing_classification === 'osm_only_odbl_provisional' ? 'ODBL_1' : 'CC0_1.0',
    }),
  );

  const candidates = [
    candidate({ slug: 'quarantined-one', name: 'Quarantined One', candidateType: 'neighbourhood' }),
    candidate({ slug: 'quarantined-two', name: 'Quarantined Two', candidateType: 'neighbourhood' }),
  ];

  const geography = writeJsonl(
    root,
    `${SOURCE_DIR}/synthetic_factual_canonical_geography_v0.1.jsonl`,
    identities,
  );
  const namesArtifact = writeJsonl(
    root,
    `${SOURCE_DIR}/synthetic_factual_canonical_names_v0.1.jsonl`,
    names,
  );
  const sourceLinks = writeJsonl(
    root,
    `${SOURCE_DIR}/synthetic_factual_canonical_source_links_v0.1.jsonl`,
    links,
  );
  const candidateDispositions = writeJsonl(
    root,
    `${SOURCE_DIR}/synthetic_candidate_dispositions_v0.1.jsonl`,
    candidates,
  );

  const sourceManifest = writeJson(root, `${SOURCE_DIR}/synthetic_source_manifest_v0.1.json`, {
    authority_version: SYNTHETIC_SOURCE_AUTHORITY_VERSION,
    source_snapshot_id: SYNTHETIC_SOURCE_SNAPSHOT_ID,
    country: 'synthetic',
    province: PROVINCE,
    note: 'Synthetic fixture. Not real geography and not forward authority for any territory.',
    compact_artifacts: [geography, namesArtifact, sourceLinks, candidateDispositions].map(
      artifact => ({ ...artifact, size_bytes: 0 }),
    ),
  });

  const parentEvidence = writeJson(
    root,
    `${COVERAGE_DIR}/research/synthetic-parent-evidence.v0.1.json`,
    {
      note: 'Synthetic fixture parent evidence.',
      edges: PARENT_EVIDENCE_EDGES,
    },
  );

  writeJson(root, `${COVERAGE_DIR}/synthetic-territory-manifest.v0.1.json`, {
    territory_id: SYNTHETIC_TERRITORY_ID,
    note: 'Synthetic fixture. Not real geography.',
    inputs: { researched_parent_edges: [parentEvidence.path] },
  });

  writeJson(root, `${COVERAGE_DIR}/territory-catalog.v0.1.json`, {
    note: 'Synthetic fixture. Never merged into the real territory catalog.',
    sources: [],
  });

  const admittedPlaces = identities.length;
  const executablePlaces = 1 + SUBURBS.length;
  const containmentEdges = admittedPlaces - 1;
  // One evidence row per admitted Place, one per quarantined candidate, and one
  // per classified parent-evidence edge.
  const evidenceRows = admittedPlaces + candidates.length + PARENT_EVIDENCE_EDGES.length;

  writeJson(root, REGISTRY_PATH, {
    schema_version: '0.1',
    registry_id: 'synthetic-place-admission-territories-v0.1',
    default_territory_id: SYNTHETIC_TERRITORY_ID,
    territories: [
      {
        territory_id: SYNTHETIC_TERRITORY_ID,
        display_name: PROVINCE,
        admission_version: SYNTHETIC_ADMISSION_VERSION,
        source_authority: {
          authority_version: SYNTHETIC_SOURCE_AUTHORITY_VERSION,
          directory: SOURCE_DIR,
          manifest: { path: sourceManifest.path, sha256: sourceManifest.sha256 },
          artifacts: {
            geography: geography.path.split('/').pop(),
            names: namesArtifact.path.split('/').pop(),
            source_links: sourceLinks.path.split('/').pop(),
            candidate_dispositions: candidateDispositions.path.split('/').pop(),
          },
        },
        coverage_baseline: {
          directory: COVERAGE_DIR,
          territory_manifest: 'synthetic-territory-manifest.v0.1.json',
          territory_catalog: 'territory-catalog.v0.1.json',
          counts: {
            factual_identity_count: identities.length,
            runtime_row_count: admittedPlaces,
            queued_count: candidates.length,
            awaiting_accepted_parent_edge: 0,
            duplicate_natural_key_within_parent: 0,
            natural_key_owned_by_accepted_row: 0,
            co_published_natural_keys: 0,
          },
        },
        admission_package: {
          directory: PACKAGE_DIR,
          manifest: 'synthetic_place_admission_manifest.v0.1.json',
          place_id_registry: 'synthetic_place_id_registry.v0.1.json',
          artifacts: {
            places: 'synthetic_place_admission_v0.1.jsonl',
            names: 'synthetic_place_names_v0.1.jsonl',
            relationships: 'synthetic_place_relationships_v0.1.jsonl',
            evidence: 'synthetic_place_evidence_v0.1.jsonl',
            external_mappings: 'synthetic_place_external_mappings_v0.1.jsonl',
            disposition_ledger: 'synthetic_place_disposition_ledger_v0.1.jsonl',
            parent_evidence_classification:
              'synthetic_parent_evidence_classification_v0.1.json',
          },
        },
        expected_counts: {
          source_identities: identities.length,
          admitted_places: admittedPlaces,
          names: names.length,
          relationships: containmentEdges,
          evidence_rows: evidenceRows,
          external_mappings: links.length,
          disposition_ledger_rows: candidates.length,
          executable_places: executablePlaces,
        },
      },
    ],
  });

  return {
    registryPath: REGISTRY_PATH,
    territoryId: SYNTHETIC_TERRITORY_ID,
    admissionVersion: SYNTHETIC_ADMISSION_VERSION,
    provinceId,
    municipalityIds,
    expected: {
      admittedPlaces,
      containmentEdges,
      executablePlaces,
      quarantinedCandidates: candidates.length,
    },
  };
}