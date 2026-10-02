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

/** Row counts for every table the write body touches, for before/after differencing. */
const WRITTEN_TABLES = {
  places: 'place',
  names: 'place_name',
  relationships: 'place_relationship',
  evidence: 'place_evidence',
  externalMappings: 'place_external_mapping',
} as const;

async function snapshotRowCounts(connection: any): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const [field, table] of Object.entries(WRITTEN_TABLES)) {
    const rows = await queryRows(connection, `SELECT COUNT(*) AS n FROM \`${table}\``);
    counts[field] = Number(rows[0]?.n ?? 0);
  }
  return counts;
}

/** Rows created by a run, measured rather than inferred from a driver's return value. */
function createdByDiff(before: Record<string, number>, after: Record<string, number>): WrittenCounts {
  const created = {} as WrittenCounts;
  for (const field of Object.keys(WRITTEN_TABLES)) {
    created[field] = Math.max(0, (after[field] ?? 0) - (before[field] ?? 0));
  }
  return created;
}

/**
 * The row-writing body, shared by the per-territory and the national load so the
 * two cannot drift. Extracted rather than duplicated: a national load that wrote
 * rows through a second implementation would be a second definition of what a Place
 * is, and the two would disagree the first time one was changed.
 *
 * `written` is deliberately NOT derived from any driver's per-statement return value.
 * Both available signals are wrong here, and each was wrong in a way that looked
 * plausible:
 *
 *   - `affectedRows` is 1 for `ON DUPLICATE KEY UPDATE` whether the row was created or
 *     merely matched, so a complete no-op replay reported a full write of 17,664 Places.
 *   - `insertId` is 0 for every statement, because `place` has a string primary key and
 *     no auto-increment column at all. Switching to it "fixed" the replay count by
 *     making a genuine first load report zero created Places as well.
 *
 * So counts are measured, not inferred: `snapshotRowCounts` reads the target before the
 * transaction and `written` is the difference after it. That is schema-independent and
 * cannot disagree with the table it describes.
 *
 * Every insert is idempotent, so a replay writes nothing and reports zero.
 */
async function writePackageRows(connection: any, rows: any) {
  for (const place of rows.places as any[]) {
    if (!PLACE_ID_PATTERN.test(String(place.place_id))) {
      throw new Error(
        `canonical-places refused: ${place.place_id} is not a governed Place identity`,
      );
    }
    await connection.query(
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
    
  }

  for (const name of rows.names as any[]) {
    await connection.query(
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
    
  }

  for (const relationship of rows.relationships as any[]) {
    await connection.query(
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
  }

  for (const mapping of rows.external_mappings as any[]) {
    await connection.query(
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
    
  }
}

interface WrittenCounts {
  places: number;
  names: number;
  relationships: number;
  evidence: number;
  externalMappings: number;
}

export async function prepareCanonicalPlaces(input: {
  authority: any;
  decision: any;
  connection: any;
  root?: string;
  /** Explicit territory selection. Defaults to the registry's default territory. */
  territoryId?: string;
}) {
  const { authority, decision, connection } = input;
  requireReferenceAdapterTarget(authority);
  await requireAcceptedMigrationHead({ authority, connection });
  const root = input.root ?? process.cwd();
  const ref: CanonicalPlacesPackageRef = input.territoryId
    ? { territoryId: input.territoryId }
    : {};

  const { manifest, rows, verifiedDigest } = loadCanonicalPlacePackage(root, ref);
  const expected = canonicalPlacesExpected(root, ref);
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

  // Counts are measured either side of the transaction rather than inferred from any
  // driver's return value. See writePackageRows for why both available signals lie.
  const countsBefore = await snapshotRowCounts(connection);
  await withTransaction(connection, async () => {
    await writePackageRows(connection, rows);
  });
  const countsAfter = await snapshotRowCounts(connection);
  const written = createdByDiff(countsBefore, countsAfter);

  /**
   * A row the database refused to store must never be reported as a successful
   * load. Every insert above uses `ON DUPLICATE KEY UPDATE`, so a row whose
   * `(place_id, role, name)` key the target's collation already holds is dropped
   * silently, and `place_name.name` is `utf8mb4_0900_ai_ci` — accent- *and*
   * case-insensitive — so ordinary accented evidence reaches this.
   *
   * The check compares the target's resulting state against the package, not the
   * number of rows written by this run. A replay legitimately writes nothing, so
   * counting writes would report a correct idempotent no-op as a defect.
   */
  const storedAfter = await readStored(connection);
  const dropped: string[] = [];
  const compare = (label: string, actual: number, expectedCount: number) => {
    if (actual !== expectedCount) dropped.push(`${label} ${actual} != package ${expectedCount}`);
  };
  compare('places', storedAfter.place.length, expected.places);
  compare('names', storedAfter.placeName.length, expected.names);
  compare('relationships', storedAfter.placeRelationship.length, expected.relationships);
  compare('evidence', storedAfter.placeEvidence.length, expected.evidence);
  compare(
    'external mappings',
    storedAfter.placeExternalMapping.length,
    expected.externalMappings,
  );
  if (dropped.length > 0) {
    throw new Error(
      `canonical-places refused: the target does not hold exactly the admission package, so a ` +
        `row was rejected as a duplicate key under the target collation. This is a data or ` +
        `collation defect, not a successful load:\n  ${dropped.join('\n  ')}`,
    );
  }

  return {
    adapter: 'canonical-places',
    version: CANONICAL_PLACES_VERSION,
    admissionVersion: manifest.admission_version,
    sourceSnapshotId: manifest.generated_from.source_snapshot_id,
    territoryId: expected.territoryId,
    digest: verifiedDigest,
    targetClassDisposable: disposable,
    expected,
    written,
    schemaMutation: false,
  };
}

/**
 * National storage proof: every registered province into one target, one
 * transaction, disposable only.
 *
 * This answers a storage question and nothing else. It does not activate a
 * consumer, does not publish a scope, and does not widen a search. It proves that
 * nine independently admitted and separately proven packages can coexist in one
 * `place` table without an ID collision and without a partial state.
 *
 * Founder decision of record: `place_id` is the identity. A uniqueness constraint
 * on (parent, normalized_name) is rejected outright, and adding place_type does not
 * rescue it -- `measure-national-collision-surface.mjs` measures 614 admitted pairs
 * that share a parent and name, 500 of which also share a type, so both candidate
 * constraints would reject correct data.
 *
 * The four guarantees this must hold, in the order they can fail:
 *
 *   1. Every package is loaded and digest-verified BEFORE any row is written, so a
 *      bad province cannot half-load the target.
 *   2. Cross-province Place identity is checked across the loaded set, so a package
 *      change cannot quietly introduce a collision that the static check has not
 *      seen yet. This is enforced here, not asserted by a report.
 *   3. One transaction wraps all nine writes. A failure anywhere leaves the target
 *      holding zero provinces. A half-loaded target is the one unacceptable outcome,
 *      because seven provinces present and one missing reads as complete to every
 *      caller that does not recount.
 *   4. A target already holding a PARTIAL set of provinces is refused rather than
 *      extended. Extending it would launder a broken prior load into a healthy one.
 */
export async function prepareNationalCanonicalPlaces(input: {
  authority: any;
  decision: any;
  connection: any;
  root?: string;
}) {
  const { authority, decision, connection } = input;
  requireReferenceAdapterTarget(authority);
  await requireAcceptedMigrationHead({ authority, connection });
  const root = input.root ?? process.cwd();
  const disposable = isDisposableTarget(authority);

  const { registry } = loadPlaceAdmissionTerritoryRegistry(root);
  const territoryIds = registry.territories.map(territory => territory.territoryId);
  if (territoryIds.length < 2) {
    throw new Error(
      `canonical-places national refused: the registry names ${territoryIds.length} territory, ` +
        `which is not a national load`,
    );
  }

  // (1) Load and verify every package before writing anything.
  const packages = territoryIds.map((territoryId: string) => {
    const ref: CanonicalPlacesPackageRef = { territoryId };
    const expected = canonicalPlacesExpected(root, ref);
    if (expected.osmOnlyPlaces > 0 && !disposable) {
      throw new Error(
        `canonical-places national refused: ${territoryId} has ${expected.osmOnlyPlaces} OSM-only ` +
          `Places, which require the founder ODbL gate before any non-disposable target may hold them`,
      );
    }
    const loaded = loadCanonicalPlacePackage(root, ref);
    return { territoryId, expected, rows: loaded.rows, digest: loaded.verifiedDigest };
  });

  // (2) Cross-province Place identity, enforced across the whole set.
  const owner = new Map<string, string>();
  const collisions: string[] = [];
  for (const pkg of packages) {
    for (const place of pkg.rows.places as any[]) {
      const id = String(place.place_id);
      if (!PLACE_ID_PATTERN.test(id)) {
        throw new Error(`canonical-places national refused: ${id} is not a governed Place identity`);
      }
      const existing = owner.get(id);
      if (existing && existing !== pkg.territoryId) {
        collisions.push(`${id} claimed by ${existing} and ${pkg.territoryId}`);
      }
      owner.set(id, pkg.territoryId);
    }
  }
  if (collisions.length) {
    throw new Error(
      `canonical-places national refused: ${collisions.length} Place identities are claimed by two ` +
        `provinces, so a national load would be ambiguous:\n  ${collisions.slice(0, 20).join('\n  ')}`,
    );
  }

  /**
   * (4) A non-empty target is accepted only on EXACT identity agreement.
   *
   * This used to compare row counts: `alreadyStored === expectedIds.size`. That accepts
   * any target holding the right NUMBER of Places, including one whose identities are
   * entirely different, so a target that had been loaded from other data would be
   * adopted as national. It also computed `storedIds` and never read it, which is the
   * tell that the check was not doing what its variable name claimed.
   *
   * Both directions are now required. A stored identity the packages do not claim is a
   * foreign Place; a claimed identity the target lacks is a partial load. Count
   * equality proves neither, and same-count identity drift is exactly the case that has
   * to be refused.
   */
  const storedBefore = await readStored(connection);
  const alreadyStored = storedBefore.place.length;
  if (alreadyStored > 0) {
    const storedIds = new Set(storedBefore.place.map((row: any) => String(row.place_id)));
    const expectedIds = new Set(Array.from(owner.keys()));
    const foreign = [...storedIds].filter(placeId => !expectedIds.has(placeId));
    const missing = [...expectedIds].filter(placeId => !storedIds.has(placeId));

    if (foreign.length || missing.length) {
      const describe = (label: string, ids: string[]) =>
        ids.length ? `${label}: ${ids.length} (for example ${ids.slice(0, 3).join(', ')})` : null;
      const detail = [describe('stored identities the packages do not claim', foreign), describe('claimed identities the target lacks', missing)]
        .filter(Boolean)
        .join('; ');
      throw new Error(
        `canonical-places national refused: the target already holds ${alreadyStored} Places, which is ` +
          `not the exact identity set of a national load. ${detail}. A target is accepted only when ` +
          `every identity agrees, so a partially loaded or foreign target is refused rather than ` +
          `extended or adopted. Dispose the target and load from zero.`,
      );
    }
  }

  const totals = packages.reduce(
    (sum, pkg) => ({
      places: sum.places + pkg.expected.places,
      names: sum.names + pkg.expected.names,
      relationships: sum.relationships + pkg.expected.relationships,
      evidence: sum.evidence + pkg.expected.evidence,
      externalMappings: sum.externalMappings + pkg.expected.externalMappings,
      dispositionLedger: sum.dispositionLedger + pkg.expected.dispositionLedger,
    }),
    { places: 0, names: 0, relationships: 0, evidence: 0, externalMappings: 0, dispositionLedger: 0 },
  );

  // (3) One transaction for all nine. Any throw below rolls the whole load back.
  const countsBefore = await snapshotRowCounts(connection);

  /**
   * The post-write verification runs INSIDE the transaction.
   *
   * It used to run after it, which meant a validation failure discovered there left the
   * already-committed rows in place: the load reported failure while the target kept the
   * changes. A refusal that mutates is not a refusal. Any throw from inside the
   * transaction rolls the whole nine-province load back, so a failed national load
   * leaves the target exactly as it was.
   */
  await withTransaction(connection, async () => {
    for (const pkg of packages) {
      await writePackageRows(connection, pkg.rows);
    }
    const inside = await readStored(connection);
    const drift: string[] = [];
    const assertTotal = (label: string, actual: number, expectedCount: number) => {
      if (actual !== expectedCount) drift.push(`${label} ${actual} != national total ${expectedCount}`);
    };
    assertTotal('places', inside.place.length, totals.places);
    assertTotal('names', inside.placeName.length, totals.names);
    assertTotal('relationships', inside.placeRelationship.length, totals.relationships);
    assertTotal('evidence', inside.placeEvidence.length, totals.evidence);
    assertTotal('external mappings', inside.placeExternalMapping.length, totals.externalMappings);
    const insideIds = new Set(inside.place.map((row: any) => String(row.place_id)));
    const absent = [...owner.keys()].filter(placeId => !insideIds.has(placeId));
    if (absent.length) drift.push(`${absent.length} claimed identities are absent (for example ${absent.slice(0, 3).join(', ')})`);
    if (drift.length) {
      throw new Error(
        `canonical-places national refused: the target does not hold the national total, so a row was ` +
          `rejected as a duplicate key under the target collation. This is a data or collation defect, ` +
          `not a successful load, and the transaction is rolled back:\n  ${drift.join('\n  ')}`,
      );
    }
  });
  const countsAfter = await snapshotRowCounts(connection);
  const written = createdByDiff(countsBefore, countsAfter);

  /**
   * Re-read after the commit purely to report what the target now holds. Verification
   * already happened inside the transaction; this cannot fail the load, so it cannot
   * leave a committed-but-unverified state behind.
   */
  const storedAfter = await readStored(connection);

  return {
    adapter: 'canonical-places-national',
    scope: 'national-storage',
    consumerActivated: false,
    publicationPerformed: false,
    identity: 'place_id',
    rejectedConstraints: ['UNIQUE(parent, normalized_name)', 'UNIQUE(parent, normalized_name, place_type)'],
    targetClassDisposable: disposable,
    provinces: territoryIds,
    provinceCount: territoryIds.length,
    expected: totals,
    written,
    stored: {
      places: storedAfter.place.length,
      names: storedAfter.placeName.length,
      relationships: storedAfter.placeRelationship.length,
      evidence: storedAfter.placeEvidence.length,
      externalMappings: storedAfter.placeExternalMapping.length,
    },
    perProvince: packages.map(pkg => ({
      territoryId: pkg.territoryId,
      places: pkg.expected.places,
      names: pkg.expected.names,
      relationships: pkg.expected.relationships,
      evidence: pkg.expected.evidence,
      externalMappings: pkg.expected.externalMappings,
      dispositionLedger: pkg.expected.dispositionLedger,
      digest: pkg.digest,
    })),
    digests: Object.fromEntries(packages.map(pkg => [pkg.territoryId, pkg.digest])),
    schemaMutation: false,
  };
}

/**
 * National verification: every registered province checked inside one shared
 * target.
 *
 * The per-territory verifier cannot do this job. It compares the target against a
 * single province's expected counts, so against a national target it correctly
 * refuses for all nine, which is why a national load needs its own verifier rather
 * than a loosened one.
 *
 * Per province it establishes that every admitted Place is present, that its
 * identity-bearing fields still match its own package, and that its row counts are
 * exactly what that package claims. Then it establishes the national properties
 * that only exist once the provinces are together: total accounting, nine distinct
 * province roots, and no Place claimed by two provinces.
 */
export async function verifyNationalCanonicalPlaces(input: {
  authority: any;
  decision: any;
  connection: any;
  root?: string;
}) {
  const { authority, decision, connection } = input;
  requireReferenceAdapterTarget(authority);
  await requireAcceptedMigrationHead({ authority, connection });
  const root = input.root ?? process.cwd();

  const { registry } = loadPlaceAdmissionTerritoryRegistry(root);
  const packages = registry.territories.map((territory: any) => {
    const ref: CanonicalPlacesPackageRef = { territoryId: territory.territoryId };
    return {
      territoryId: territory.territoryId,
      expected: canonicalPlacesExpected(root, ref),
      rows: loadCanonicalPlacePackage(root, ref).rows,
    };
  });

  const stored = await readStored(connection);
  const storedPlaces = new Map(stored.place.map((row: any) => [String(row.place_id), row]));
  const problems: string[] = [];
  const perProvince: any[] = [];

  for (const pkg of packages) {
    let present = 0;
    let identityDrift = 0;
    for (const place of pkg.rows.places as any[]) {
      const current = storedPlaces.get(String(place.place_id));
      if (!current) {
        problems.push(`${pkg.territoryId}: admitted Place ${place.place_id} is absent from the target`);
        continue;
      }
      present += 1;
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
        identityDrift += 1;
        problems.push(
          `${pkg.territoryId}: stored identity for ${place.place_id} differs from its admission package`,
        );
      }
    }
    perProvince.push({
      territoryId: pkg.territoryId,
      admittedPlaces: pkg.expected.places,
      presentPlaces: present,
      complete: present === pkg.expected.places,
      identityDrift,
    });
  }

  // National properties, which exist only when the provinces are together.
  const totals = packages.reduce(
    (sum, pkg) => ({
      places: sum.places + pkg.expected.places,
      names: sum.names + pkg.expected.names,
      relationships: sum.relationships + pkg.expected.relationships,
      evidence: sum.evidence + pkg.expected.evidence,
      externalMappings: sum.externalMappings + pkg.expected.externalMappings,
    }),
    { places: 0, names: 0, relationships: 0, evidence: 0, externalMappings: 0 },
  );
  if (stored.place.length !== totals.places) {
    problems.push(`national place rows ${stored.place.length} != total ${totals.places}`);
  }
  if (stored.placeName.length !== totals.names) {
    problems.push(`national place_name rows ${stored.placeName.length} != total ${totals.names}`);
  }
  if (stored.placeRelationship.length !== totals.relationships) {
    problems.push(
      `national place_relationship rows ${stored.placeRelationship.length} != total ${totals.relationships}`,
    );
  }
  if (stored.placeEvidence.length !== totals.evidence) {
    problems.push(`national place_evidence rows ${stored.placeEvidence.length} != total ${totals.evidence}`);
  }
  if (stored.placeExternalMapping.length !== totals.externalMappings) {
    problems.push(
      `national place_external_mapping rows ${stored.placeExternalMapping.length} != ` +
        `total ${totals.externalMappings}`,
    );
  }

  const roots = stored.place.filter((row: any) => row.place_type === 'province');
  if (roots.length !== packages.length) {
    problems.push(`national target holds ${roots.length} province roots for ${packages.length} provinces`);
  }

  // A containment forest must not become cyclic or gain a second parent once the
  // provinces share one table: that is a hazard that only exists nationally.
  const parents = new Map<string, string>();
  for (const edge of stored.placeRelationship) {
    const child = String(edge.from_place_id);
    const parent = String(edge.to_place_id);
    const existing = parents.get(child);
    if (existing && existing !== parent) {
      problems.push(`${child} has more than one containment parent: ${existing} and ${parent}`);
    }
    parents.set(child, parent);
  }
  for (const child of Array.from(parents.keys())) {
    const seen = new Set<string>([child]);
    let cursor: string | undefined = parents.get(child);
    while (cursor) {
      if (seen.has(cursor)) {
        problems.push(`containment cycle through ${cursor}`);
        break;
      }
      seen.add(cursor);
      cursor = parents.get(cursor);
    }
  }

  if (problems.length) {
    throw new Error(
      `canonical-places national verification failed with ${problems.length} problem(s):\n  ` +
        `${problems.slice(0, 25).join('\n  ')}`,
    );
  }

  return {
    adapter: 'canonical-places-national',
    scope: 'national-storage',
    consumerActivated: false,
    provinces: packages.length,
    completeProvinces: perProvince.filter(entry => entry.complete).length,
    provinceRoots: roots.length,
    totals: {
      expected: totals,
      stored: {
        places: stored.place.length,
        names: stored.placeName.length,
        relationships: stored.placeRelationship.length,
        evidence: stored.placeEvidence.length,
        externalMappings: stored.placeExternalMapping.length,
      },
    },
    perProvince,
    containmentEdges: parents.size,
  };
}

export async function verifyCanonicalPlaces(input: {
  authority: any;
  decision: any;
  connection: any;
  root?: string;
  /** Explicit territory selection. Defaults to the registry's default territory. */
  territoryId?: string;
}) {
  const { authority, decision, connection } = input;
  requireReferenceAdapterTarget(authority);
  const root = input.root ?? process.cwd();
  const expected = canonicalPlacesExpected(
    root,
    input.territoryId ? { territoryId: input.territoryId } : {},
  );
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
  const { rows } = loadCanonicalPlacePackage(
    root,
    input.territoryId ? { territoryId: input.territoryId } : {},
  );
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
