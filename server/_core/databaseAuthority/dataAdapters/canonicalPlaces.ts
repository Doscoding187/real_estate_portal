/**
 * Canonical Place Authority materializer (geography contract v0.5).
 *
 * Loads an admitted, digest-pinned Place admission package into the Place
 * tables on an authorized target. This is the smallest Database Authority
 * mechanism Slice 2 requires: Slice 1 correctly refused to create an empty
 * speculative adapter, because there was no governed admission source to
 * reference. There is one now.
 *
 * The adapter is **territory-neutral**. The package directory, its admission
 * version and its artifact filenames come from the committed admission territory
 * registry, and the registry itself pins the source-authority manifest by
 * digest. Materializing a second province is therefore a registry entry plus its
 * governed evidence, never a code change here.
 *
 * It is deliberately NOT a public consumer path. Nothing here changes location
 * search, listing authoring, the three-level runtime, or any existing geography
 * resolution. Slice 3 proves executable discovery.
 *
 * Behaviour required by Slice 2 and implemented here:
 *
 * - **digest-aware**: the package manifest and every artifact digest are
 *   verified before a single row is written;
 * - **fail-closed**: a Place whose stored identity differs from the package is
 *   an error, never a silent update;
 * - **idempotent**: a second run is a no-op and reports zero writes;
 * - **deterministic**: rows are written in a total order derived from the
 *   package, not from filesystem or query order;
 * - **transactional**: the whole load runs in one bounded transaction, so a
 *   failure leaves the target unchanged;
 * - **unable to silently remap**: a stored `place_id` that disagrees with the
 *   package aborts the load rather than being reused.
 *
 * Two guards are specific to this authority:
 *
 * 1. **OSM-only gate.** Places whose licensing classification is
 *    `osm_only_odbl_provisional` may only be materialized on a disposable
 *    target. A non-disposable target must refuse the load until the founder
 *    ODbL gate is cleared (contract D3).
 * 2. **Identity stability.** A stored Place whose identity-bearing fields differ
 *    from the package aborts the load. A changed admission assertion must never
 *    silently mutate an existing identity.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  loadPlaceAdmissionTerritoryRegistry,
  readVerifiedPlaceAdmissionArtifact,
  resolvePlaceAdmissionPackagePaths,
  selectPlaceAdmissionTerritory,
  PLACE_ADMISSION_TERRITORY_REGISTRY_PATH,
} from '../../../../shared/placeAdmissionTerritories';

import {
  queryRows,
  requireAcceptedMigrationHead,
  requireReferenceAdapterTarget,
  withTransaction,
} from './common';

/**
 * The default registered territory's admission version. Derived from the
 * committed admission territory registry rather than hardcoded, so admitting a
 * second province is a registry entry and never a code change here.
 */
export const CANONICAL_PLACES_VERSION = selectPlaceAdmissionTerritory(
  loadPlaceAdmissionTerritoryRegistry(process.cwd()).registry,
).admissionVersion;

/**
 * Digest over the adapter's own governance surface. Recorded so the data-role
 * manifest can prove which materializer it is authorizing.
 */
export const CANONICAL_PLACES_DIGEST = createHash('sha256')
  .update(
    [
      'canonical-places',
      CANONICAL_PLACES_VERSION,
      'place,place_name,place_relationship,place_evidence,place_external_mapping',
      'osm_only_disposable_only_gate',
      'identity_stability_fail_closed',
      'idempotent_upsert',
    ].join('\n'),
  )
  .digest('hex');

const ARTIFACT_KEYS = {
  places: 'places',
  names: 'names',
  relationships: 'relationships',
  evidence: 'evidence',
  external_mappings: 'external_mappings',
  disposition_ledger: 'disposition_ledger',
} as const;

const PLACE_ID_PATTERN = /^pl-place-01-[a-f0-9]{24}$/;

const sha256OfFile = (root: string, path: string) =>
  createHash('sha256')
    .update(readFileSync(resolve(root, path)))
    .digest('hex');

const readJsonl = (root: string, path: string) =>
  readFileSync(resolve(root, path), 'utf8')
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => JSON.parse(line) as Record<string, unknown>);

/**
 * The OSM-only gate is expressed against the resolved target class.
 * `requireReferenceAdapterTarget` already refuses every non-disposable target,
 * so a truthy value here means the target is authorized and disposable.
 */
const isDisposableTarget = (authority: any) =>
  authority.context.targetClass === 'disposable-worktree' ||
  authority.context.targetClass === 'disposable-test';

export interface CanonicalPlacesExpected {
  territoryId: string;
  admissionVersion: string;
  sourceSnapshotId: string;
  places: number;
  names: number;
  relationships: number;
  evidence: number;
  externalMappings: number;
  dispositionLedger: number;
  verified: number;
  provisional: number;
  searchEligible: number;
  publicationEligible: number;
  osmOnlyPlaces: number;
  verifiedDigest: string;
}

/**
 * Which territory's admitted package to read, and from which registry.
 *
 * `territoryId` defaults to the registry's default territory. `registryPath`
 * exists so the territory-neutrality proof can drive this adapter from a
 * synthetic registry without the real one gaining a fictional entry.
 */
export interface CanonicalPlacesPackageRef {
  territoryId?: string;
  registryPath?: string;
}

/**
 * Resolve the admitted package for a territory. The registry names the package
 * directory, its manifest, its Place-ID registry and its artifact filenames; the
 * manifest then digest-pins the source authority every row was derived from.
 */
function resolveCanonicalPlacesPackage(root: string, ref: CanonicalPlacesPackageRef) {
  const { registry, registrySha256 } = loadPlaceAdmissionTerritoryRegistry(
    root,
    ref.registryPath ?? PLACE_ADMISSION_TERRITORY_REGISTRY_PATH,
  );
  const territory = selectPlaceAdmissionTerritory(registry, ref.territoryId);
  const paths = resolvePlaceAdmissionPackagePaths(territory);

  // The registry pins the source-authority manifest by digest. Verifying it here
  // means a package can never be loaded from a source authority the reviewed
  // registry does not name.
  readVerifiedPlaceAdmissionArtifact(root, territory.sourceAuthority.manifest);

  return { territory, paths, registrySha256 };
}

/** Read and digest-verify the whole package. Fails closed on any mismatch. */
export function loadCanonicalPlacePackage(root: string, ref: CanonicalPlacesPackageRef = {}) {
  const { territory, paths, registrySha256 } = resolveCanonicalPlacesPackage(root, ref);
  const manifest = JSON.parse(readFileSync(resolve(root, paths.manifest), 'utf8')) as {
    admission_version: string;
    generated_from: {
      source_snapshot_id: string;
      compact_artifacts: { path: string; sha256: string }[];
    };
    counts: Record<string, number>;
    outputs: Record<string, string>;
  };

  if (manifest.admission_version !== territory.admissionVersion) {
    throw new Error(
      `canonical-places refused: admission version ${manifest.admission_version} is not ${territory.admissionVersion}`,
    );
  }

  // The forward factual source must itself still be intact, or the admission
  // package's inputs no longer reproduce.
  for (const artifact of manifest.generated_from.compact_artifacts) {
    const actual = sha256OfFile(root, artifact.path);
    if (actual !== artifact.sha256) {
      throw new Error(`canonical-places refused: source artifact ${artifact.path} digest drift`);
    }
  }

  const rows: Record<keyof typeof ARTIFACT_KEYS, Record<string, unknown>[]> = {
    places: [],
    names: [],
    relationships: [],
    evidence: [],
    external_mappings: [],
    disposition_ledger: [],
  };
  for (const [key, outputKey] of Object.entries(ARTIFACT_KEYS)) {
    const path = manifest.outputs[outputKey];
    if (!path) throw new Error(`canonical-places refused: manifest has no output for ${outputKey}`);
    // The manifest must not advertise an artifact the registry did not name.
    if (path !== paths.artifacts[outputKey as keyof typeof paths.artifacts]) {
      throw new Error(
        `canonical-places refused: manifest output ${outputKey} is ${path}, which the admission ` +
          `territory registry does not register for ${territory.territoryId}`,
      );
    }
    rows[key as keyof typeof ARTIFACT_KEYS] = readJsonl(root, path);
  }

  const registryDocument = JSON.parse(readFileSync(resolve(root, paths.placeIdRegistry), 'utf8')) as {
    allocated: Record<string, string>;
  };

  // A digest over the admitted content, so a verification run can prove the
  // target holds exactly this dataset.
  const verifiedDigest = createHash('sha256')
    .update(
      JSON.stringify({
        places: rows.places,
        names: rows.names,
        relationships: rows.relationships,
        evidence: rows.evidence,
        external_mappings: rows.external_mappings,
      }),
    )
    .digest('hex');

  return {
    manifest,
    rows,
    registry: registryDocument,
    verifiedDigest,
    territory,
    registrySha256,
  };
}

export function canonicalPlacesExpected(
  root: string,
  ref: CanonicalPlacesPackageRef = {},
): CanonicalPlacesExpected {
  const { manifest, rows, verifiedDigest, territory } = loadCanonicalPlacePackage(root, ref);
  const places = rows.places as {
    verification_status: string;
    search_eligible: number;
    publication_eligible: number;
    licensing_classification: string;
  }[];
  return {
    territoryId: territory.territoryId,
    admissionVersion: manifest.admission_version,
    sourceSnapshotId: manifest.generated_from.source_snapshot_id,
    places: places.length,
    names: rows.names.length,
    relationships: rows.relationships.length,
    evidence: rows.evidence.length,
    externalMappings: rows.external_mappings.length,
    dispositionLedger: rows.disposition_ledger.length,
    verified: places.filter(p => p.verification_status === 'verified').length,
    provisional: places.filter(p => p.verification_status === 'provisional').length,
    searchEligible: places.filter(p => p.search_eligible === 1).length,
    publicationEligible: places.filter(p => p.publication_eligible === 1).length,
    osmOnlyPlaces: places.filter(p => p.licensing_classification === 'osm_only_odbl_provisional')
      .length,
    verifiedDigest,
  };
}

/**
 * Read the schema lazily so this module can be imported by static analysis and by
 * tests that do not hold a database connection.
 */
async function readStored(sql: any) {
  const [place, placeName, placeRelationship, placeEvidence, placeExternalMapping] =
    await Promise.all([
      queryRows(
        sql,
        `SELECT place_id, place_type, place_classification, verification_status, lifecycle_status,
              publication_eligible, search_eligible, search_scope, licensing_classification
         FROM \`place\``,
      ),
      queryRows(
        sql,
        `SELECT place_id, name, name_role, name_state, is_searchable, evidence_source
         FROM \`place_name\``,
      ),
      queryRows(
        sql,
        `SELECT from_place_id, to_place_id, relationship_type, search_scope_authorized, evidence_source
         FROM \`place_relationship\``,
      ),
      queryRows(
        sql,
        `SELECT place_id, evidence_kind, evidence_state, subject, provider, provider_record_id
         FROM \`place_evidence\``,
      ),
      queryRows(
        sql,
        `SELECT place_id, provider, provider_record_id FROM \`place_external_mapping\``,
      ),
    ]);
  return { place, placeName, placeRelationship, placeEvidence, placeExternalMapping };
}

const rowKey = (values: unknown[]) => JSON.stringify(values);

export async function prepareCanonicalPlaces(input: {
  authority: any;
  decision: any;
  connection: any;
  root?: string;
}) {
  const { authority, decision, connection } = input;
  requireReferenceAdapterTarget(authority);
  await requireAcceptedMigrationHead({ authority, connection });
  const root = input.root ?? process.cwd();

  const { manifest, rows, verifiedDigest } = loadCanonicalPlacePackage(root);
  const expected = canonicalPlacesExpected(root);
  const disposable = isDisposableTarget(authority);

  // Guard 1: OSM-only materialization is disposable-only (contract D3).
  if (expected.osmOnlyPlaces > 0 && !disposable) {
    throw new Error(
      `canonical-places refused: ${expected.osmOnlyPlaces} OSM-only Places require the founder ODbL gate ` +
        `before any non-disposable target may hold them`,
    );
  }

  const existing = await queryRows(connection, 'SELECT place_id FROM `place`');
  const alreadyLoaded = existing.length > 0;

  if (alreadyLoaded) {
    // Guard 2: identity stability. A stored Place whose identity-bearing fields
    // disagree with the package is never rewritten; the load is refused so the
    // divergence is decided rather than hidden.
    const stored = await readStored(connection);
    const storedPlaces = new Map((stored.place as any[]).map(r => [String(r.place_id), r]));
    for (const place of rows.places as any[]) {
      const current = storedPlaces.get(String(place.place_id));
      if (!current) {
        throw new Error(
          `canonical-places refused: target already holds Places but not ${place.place_id}; ` +
            `an admitted Place may not be added to a loaded authority without a reviewed decision`,
        );
      }
      const expectedIdentity = [
        place.place_id,
        place.place_type,
        place.place_classification,
        place.verification_status,
        place.lifecycle_status,
        place.publication_eligible,
        place.search_eligible,
        place.search_scope ?? null,
        place.licensing_classification ?? null,
      ];
      const storedIdentity = [
        current.place_id,
        current.place_type,
        current.place_classification,
        current.verification_status,
        current.lifecycle_status,
        current.publication_eligible,
        current.search_eligible,
        current.search_scope ?? null,
        current.licensing_classification ?? null,
      ];
      if (rowKey(expectedIdentity) !== rowKey(storedIdentity)) {
        throw new Error(
          `canonical-places refused: stored identity for ${place.place_id} differs from the admission package; ` +
            `a changed admission assertion must not silently mutate identity`,
        );
      }
    }
  }

  const written = { places: 0, names: 0, relationships: 0, evidence: 0, externalMappings: 0 };

  await withTransaction(connection, async () => {
    for (const place of rows.places as any[]) {
      if (!PLACE_ID_PATTERN.test(String(place.place_id))) {
        throw new Error(
          `canonical-places refused: ${place.place_id} is not a governed Place identity`,
        );
      }
      const [result] = await connection.query(
        `INSERT INTO \`place\`
           (place_id, place_type, place_classification, verification_status, lifecycle_status,
            publication_eligible, search_eligible, search_scope, licensing_classification)
         VALUES (?,?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE place_id = place_id`,
        [
          place.place_id,
          place.place_type,
          place.place_classification,
          place.verification_status,
          place.lifecycle_status,
          place.publication_eligible,
          place.search_eligible,
          place.search_scope ?? null,
          place.licensing_classification ?? null,
        ],
      );
      written.places += result.affectedRows ?? 0;
    }

    for (const name of rows.names as any[]) {
      const [result] = await connection.query(
        `INSERT INTO \`place_name\`
           (place_id, name, normalized_name, name_role, name_state, is_searchable, evidence_source, valid_from, valid_to)
         VALUES (?,?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE place_id = place_id`,
        [
          name.place_id,
          name.name,
          name.normalized_name,
          name.name_role,
          name.name_state,
          name.is_searchable,
          name.evidence_source,
          name.valid_from ?? null,
          name.valid_to ?? null,
        ],
      );
      written.names += result.affectedRows ?? 0;
    }

    for (const relationship of rows.relationships as any[]) {
      const [result] = await connection.query(
        `INSERT INTO \`place_relationship\`
           (from_place_id, to_place_id, relationship_type, search_scope_authorized, evidence_source, valid_from, valid_to)
         VALUES (?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE from_place_id = from_place_id`,
        [
          relationship.from_place_id,
          relationship.to_place_id,
          relationship.relationship_type,
          relationship.search_scope_authorized,
          relationship.evidence_source,
          relationship.valid_from ?? null,
          relationship.valid_to ?? null,
        ],
      );
      written.relationships += result.affectedRows ?? 0;
    }

    // place_evidence has no natural unique key: `place_id` is nullable by design
    // so an unresolved signal can exist without a Place, and MySQL treats NULLs
    // in a unique index as distinct. Idempotency is therefore established here
    // rather than by an ON DUPLICATE KEY clause, which would silently duplicate
    // every evidence row on each run.
    const evidenceIdentity = (row: any) =>
      rowKey([
        row.place_id ?? null,
        row.evidence_kind,
        row.subject ?? null,
        row.provider ?? null,
        row.provider_record_id ?? null,
      ]);
    const existingEvidence = new Set(
      (
        await queryRows(
          connection,
          `SELECT place_id, evidence_kind, subject, provider, provider_record_id FROM \`place_evidence\``,
        )
      ).map(existingEvidenceRow => evidenceIdentity(existingEvidenceRow)),
    );
    for (const evidence of rows.evidence as any[]) {
      const identity = evidenceIdentity(evidence);
      if (existingEvidence.has(identity)) continue;
      existingEvidence.add(identity);
      await connection.query(
        `INSERT INTO \`place_evidence\`
           (place_id, evidence_kind, evidence_state, subject, provider, provider_record_id, research_priority)
         VALUES (?,?,?,?,?,?,?)`,
        [
          evidence.place_id ?? null,
          evidence.evidence_kind,
          evidence.evidence_state,
          evidence.subject ?? null,
          evidence.provider ?? null,
          evidence.provider_record_id ?? null,
          evidence.research_priority ?? 0,
        ],
      );
      written.evidence += 1;
    }

    for (const mapping of rows.external_mappings as any[]) {
      const [result] = await connection.query(
        `INSERT INTO \`place_external_mapping\`
           (place_id, provider, provider_record_id, provider_label, normalized_alias, observed_at)
         VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE place_id = place_id`,
        [
          mapping.place_id,
          mapping.provider,
          mapping.provider_record_id,
          mapping.provider_label ?? null,
          mapping.normalized_alias ?? null,
          mapping.observed_at ?? null,
        ],
      );
      written.externalMappings += result.affectedRows ?? 0;
    }
  });

  return {
    adapter: 'canonical-places',
    version: CANONICAL_PLACES_VERSION,
    admissionVersion: manifest.admission_version,
    sourceSnapshotId: manifest.generated_from.source_snapshot_id,
    digest: verifiedDigest,
    targetClassDisposable: disposable,
    expected,
    written,
    schemaMutation: false,
  };
}

export async function verifyCanonicalPlaces(input: {
  authority: any;
  decision: any;
  connection: any;
  root?: string;
}) {
  const { authority, decision, connection } = input;
  requireReferenceAdapterTarget(authority);
  const root = input.root ?? process.cwd();
  const expected = canonicalPlacesExpected(root);
  const disposable = isDisposableTarget(authority);

  if (expected.osmOnlyPlaces > 0 && !disposable) {
    throw new Error(
      `canonical-places refused: ${expected.osmOnlyPlaces} OSM-only Places are present on a non-disposable target`,
    );
  }

  const stored = await readStored(connection);
  const problems: string[] = [];

  if (stored.place.length !== expected.places) {
    problems.push(`place rows ${stored.place.length} != expected ${expected.places}`);
  }
  if (stored.placeName.length !== expected.names) {
    problems.push(`place_name rows ${stored.placeName.length} != expected ${expected.names}`);
  }
  if (stored.placeRelationship.length !== expected.relationships) {
    problems.push(
      `place_relationship rows ${stored.placeRelationship.length} != expected ${expected.relationships}`,
    );
  }
  if (stored.placeEvidence.length !== expected.evidence) {
    problems.push(
      `place_evidence rows ${stored.placeEvidence.length} != expected ${expected.evidence}`,
    );
  }
  if (stored.placeExternalMapping.length !== expected.externalMappings) {
    problems.push(
      `place_external_mapping rows ${stored.placeExternalMapping.length} != expected ${expected.externalMappings}`,
    );
  }

  // Identity stability: every stored Place must belong to the package, with the
  // same identity-bearing values. A Place the package does not know is a failure,
  // not a tolerated extra.
  const { rows } = loadCanonicalPlacePackage(root);
  const packageIdentities = new Map(
    (rows.places as any[]).map(place => [
      String(place.place_id),
      rowKey([
        place.place_type,
        place.place_classification,
        place.verification_status,
        place.lifecycle_status,
        place.publication_eligible,
        place.search_eligible,
        place.search_scope ?? null,
        place.licensing_classification ?? null,
      ]),
    ]),
  );
  for (const storedPlace of stored.place as any[]) {
    const expectedIdentity = packageIdentities.get(String(storedPlace.place_id));
    if (!expectedIdentity) {
      problems.push(`stored Place ${storedPlace.place_id} is not in the admission package`);
      continue;
    }
    const actualIdentity = rowKey([
      storedPlace.place_type,
      storedPlace.place_classification,
      storedPlace.verification_status,
      storedPlace.lifecycle_status,
      storedPlace.publication_eligible,
      storedPlace.search_eligible,
      storedPlace.search_scope ?? null,
      storedPlace.licensing_classification ?? null,
    ]);
    if (actualIdentity !== expectedIdentity) {
      problems.push(`stored Place ${storedPlace.place_id} identity differs from the package`);
    }
  }

  // No orphans and no cycles in authoritative containment.
  const parents = new Map<string, string>();
  for (const relationship of stored.placeRelationship as any[]) {
    if (relationship.relationship_type !== 'administratively_contains') continue;
    if (parents.has(String(relationship.from_place_id))) {
      problems.push(`Place ${relationship.from_place_id} has more than one containment parent`);
    }
    parents.set(String(relationship.from_place_id), String(relationship.to_place_id));
  }
  for (const [child, parent] of parents) {
    const seen = new Set([child]);
    let cursor: string | undefined = parent;
    while (cursor) {
      if (seen.has(cursor)) {
        problems.push(`containment cycle detected involving ${cursor}`);
        break;
      }
      seen.add(cursor);
      cursor = parents.get(cursor);
    }
  }

  if (problems.length) {
    throw new Error(`canonical-places verification failed: ${problems.slice(0, 20).join('; ')}`);
  }

  return {
    adapter: 'canonical-places',
    version: CANONICAL_PLACES_VERSION,
    admissionVersion: expected.admissionVersion,
    sourceSnapshotId: expected.sourceSnapshotId,
    digest: expected.verifiedDigest,
    targetClassDisposable: disposable,
    verified: true,
    expected,
  };
}
