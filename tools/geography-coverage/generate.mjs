#!/usr/bin/env node
/* global console, process */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIRECTORY, '../..');

const PROJECTION_SCHEMA_VERSION = '0.2';
const PROJECTION_VERSION = 'gauteng-runtime-reference-projection-v0.3';

function loadResearchedEdges(ROOT, rawManifest) {
  const edgeFiles = rawManifest.inputs.researched_parent_edges ?? [];
  const byFactualId = new Map();
  return {
    byFactualId,
    hydrate(acceptedMetroKeys) {
      for (const relativePath of edgeFiles) {
        const resolved = readJson(path.join(ROOT, relativePath));
        for (const edge of resolved.edges ?? []) {
          if (!acceptedMetroKeys.has(edge.parent_natural_key)) continue;
          byFactualId.set(edge.factual_location_id, {
            ...edge,
            allowDuplicateNaturalKeyGrouping:
              resolved.allow_duplicate_natural_key_grouping === true,
          });
        }
      }
    },
    declared: edgeFiles.length,
  };
}

const METRO_TYPES = new Set(['city', 'town']);
const LOCALITY_TYPES = new Set(['suburb', 'locality', 'neighbourhood', 'village', 'township']);
const CONTEXT_ONLY_TYPES = new Set(['district_municipality', 'local_municipality']);

function sha256File(filePath) {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonl(filePath) {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

function slugify(value) {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : null;
}

function normalizeName(value) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

const EXTENSION_PATTERN = /^(.*\S)\s+(ext(?:ension)?\.?|uit(?:breiding)?)\.?\s+(\d{1,3})$/i;

function extensionAliasForms(name) {
  const match = EXTENSION_PATTERN.exec(name.trim());
  if (!match) return [];
  const base = match[1].trim();
  const number = match[3];
  return [
    `${base} Extension ${number}`,
    `${base} Ext ${number}`,
    `${base} Ext. ${number}`,
  ].filter(form => normalizeName(form) !== normalizeName(name));
}

function parseArguments(argv) {
  const options = { manifest: null, check: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--check') options.check = true;
    else if (value === '--manifest') {
      index += 1;
      options.manifest = argv[index];
    } else throw new Error(`Unknown argument ${value}`);
  }
  if (!options.manifest) throw new Error('--manifest is required');
  return options;
}

function loadInputs(ROOT, manifest) {
  const carriedProjectionPath = path.join(ROOT, manifest.inputs.carried_projection);
  const carriedProjectionRaw = readJson(carriedProjectionPath);
  if (carriedProjectionRaw.schema_version !== '0.1') {
    throw new Error(
      `Carried projection has unexpected schema ${carriedProjectionRaw.schema_version}.`,
    );
  }

  const canonicalRoot =
    process.env[manifest.inputs.canonical_root_env] || manifest.inputs.canonical_root_default;
  const geographyPath = path.join(canonicalRoot, manifest.inputs.geography_jsonl);
  const namesPath = path.join(canonicalRoot, manifest.inputs.names_jsonl);
  if (!fs.existsSync(geographyPath) || !fs.existsSync(namesPath)) {
    throw new Error(
      `Canonical layer files not found under ${canonicalRoot}. Restore the approved canonical-root worktree.`,
    );
  }

  const carriedMappingPath = path.join(ROOT, manifest.inputs.carried_mapping);
  return {
    carriedRows: carriedProjectionRaw.rows,
    carriedDigest: sha256File(carriedProjectionPath),
    geography: readJsonl(geographyPath),
    names: readJsonl(namesPath),
    geographyDigest: sha256File(geographyPath),
    namesDigest: sha256File(namesPath),
    carriedMapping: readJsonl(carriedMappingPath),
  };
}

function buildAliasIndex(canonicalNames) {
  const aliasesByFactualId = new Map();
  for (const assertion of canonicalNames) {
    if (assertion.status !== 'active' || assertion.searchable !== true) continue;
    if ((assertion.name_roles ?? []).includes('preferred_common')) continue;
    const list = aliasesByFactualId.get(assertion.canonical_location_id) ?? [];
    if (!list.some(entry => entry.normalized === assertion.normalized_name)) {
      list.push({ name: assertion.name, normalized: assertion.normalized_name });
    }
    aliasesByFactualId.set(assertion.canonical_location_id, list);
  }
  return aliasesByFactualId;
}

function createState(inputs) {
  const usedNaturalKeys = new Map();
  const preferredNameTriples = new Map();

  for (const row of inputs.carriedRows) {
    const [province] = row.runtime_natural_key.split('/');
    usedNaturalKeys.set(row.runtime_natural_key, 'carried_v0.1');
    preferredNameTriples.set(
      `${row.runtime_storage_level}|${province}|${normalizeName(row.name)}`,
      row.runtime_natural_key,
    );
  }

  return {
    usedNaturalKeys,
    preferredNameTriples,
    aliasDrops: [],
    runtimeRecords: [],
    queueById: new Map(),
  };
}

function queueRecord(state, record, reason, nextAction) {
  if (state.queueById.has(record.canonical_location_id)) return;
  state.queueById.set(record.canonical_location_id, {
    factual_location_id: record.canonical_location_id,
    preferred_name: record.preferred_name,
    factual_type: record.canonical_type,
    administrative_context: record.administrative_context?.adm2?.[0]?.name ?? null,
    licensing_classification: record.licensing_classification,
    type_state: record.type_state,
    reason,
    suggested_next_action: nextAction,
  });
}

function collectCandidates(state, inputs, manifest) {
  const candidates = [];
  const localityInputs = [];
  const registryByContext = manifest.registryByContext;
  const excludedContexts = manifest.excludedContexts;
  const researchedEdges = manifest.researchedEdges;
  const carriedByFactualId = new Map(
    inputs.carriedMapping.map(entry => [entry.factual_location_id, entry]),
  );

  for (const record of inputs.geography) {
    const type = record.canonical_type;

    if (type === 'province') {
      queueRecord(
        state,
        record,
        'province_scope_owned_by_carried_gauteng_row',
        'No additional province scope is released; lineage retained in disposition artifacts.',
      );
      continue;
    }

    if (CONTEXT_ONLY_TYPES.has(type)) {
      queueRecord(
        state,
        record,
        'context_only_type_municipality',
        'Municipalities remain parent context in release 1 (contract D1); reconsider at a level-taxonomy revision.',
      );
      continue;
    }

    if (type === 'estate/residential_development_candidate') {
      queueRecord(
        state,
        record,
        'estate_discovery_entity_deferred',
        'Contract D4 defers standalone estate discovery entities; revisit when listing supply justifies.',
      );
      continue;
    }

    if (!METRO_TYPES.has(type) && !LOCALITY_TYPES.has(type)) {
      queueRecord(
        state,
        record,
        'unsupported_factual_type_for_release_1',
        'Classify the type in the next research wave.',
      );
      continue;
    }

    const adm2Name = record.administrative_context?.adm2?.[0]?.name ?? null;
    if (adm2Name && excludedContexts.has(adm2Name)) {
      queueRecord(
        state,
        record,
        'outside_territory_adm2_context',
        'Representative context falls outside Gauteng districts; route to the owning territory wave.',
      );
      continue;
    }

    const carriedEntry = carriedByFactualId.get(record.canonical_location_id);
    if (carriedEntry?.runtime_natural_key) {
      queueRecord(
        state,
        record,
        'represented_by_carried_runtime_row',
        'No action; identity already projects through the founder-reviewed bounded slice.',
      );
      continue;
    }

    const slug = slugify(record.preferred_name);
    if (!slug) {
      queueRecord(state, record, 'invalid_slug', 'Repair the preferred name before promotion.');
      continue;
    }

    if (METRO_TYPES.has(type)) {
      candidates.push({
        record,
        scopeKind: 'metro_city',
        storageLevel: 'city',
        naturalKey: `gauteng/${slug}`,
        parentKey: 'gauteng',
        publicationStatus:
          record.type_state === 'supported' &&
          record.licensing_classification !== 'osm_only_odbl_provisional'
            ? 'verified'
            : 'provisional',
        allowDuplicateNaturalKeyGrouping: false,
      });
      continue;
    }

    localityInputs.push({ record, adm2Name, slug });
  }

  const acceptedMetroKeys = new Set(
    inputs.carriedRows
      .filter(row => row.runtime_storage_level === 'city')
      .map(row => row.runtime_natural_key),
  );
  acceptedMetroKeys.add('gauteng');
  for (const candidate of candidates) acceptedMetroKeys.add(candidate.naturalKey);
  researchedEdges.hydrate(acceptedMetroKeys);

  for (const candidate of candidates) {
    const edge = researchedEdges.byFactualId.get(candidate.record.canonical_location_id);
    if (!edge || edge.parent_natural_key !== 'gauteng') continue;
    candidate.allowDuplicateNaturalKeyGrouping = edge.allowDuplicateNaturalKeyGrouping === true;
    candidate.decisionNote = `researched edge (${edge.evidence_class})`;
  }

  for (const { record, adm2Name, slug } of localityInputs) {
    const edge = researchedEdges.byFactualId.get(record.canonical_location_id);
    const registryEntry = adm2Name ? registryByContext.get(adm2Name) : undefined;
    let parentKey;
    let decisionNote;
    if (registryEntry) {
      parentKey = registryEntry.parent_natural_key;
      decisionNote = null;
    } else if (edge && edge.parent_natural_key !== 'gauteng') {
      parentKey = edge.parent_natural_key;
      decisionNote = `researched edge (${edge.evidence_class})`;
    } else {
      queueRecord(
        state,
        record,
        'awaiting_accepted_parent_edge',
        `Register an evidenced parent edge for ${adm2Name ?? 'the record'} or accept a town-level context in a research wave.`,
      );
      continue;
    }
    candidates.push({
      record,
      scopeKind: 'locality',
      storageLevel: 'suburb',
      naturalKey: `${parentKey}/${slug}`,
      parentKey,
      publicationStatus: 'provisional',
      decisionNote,
      allowDuplicateNaturalKeyGrouping: edge?.allowDuplicateNaturalKeyGrouping === true,
    });
  }
  return candidates;
}

function resolveCollisions(state, candidates) {
  const byNaturalKey = new Map();
  for (const candidate of candidates) {
    const list = byNaturalKey.get(candidate.naturalKey) ?? [];
    list.push(candidate);
    byNaturalKey.set(candidate.naturalKey, list);
  }

  const survivors = [];
  for (const [naturalKey, group] of [...byNaturalKey.entries()].sort((left, right) =>
    left[0].localeCompare(right[0]),
  )) {
    const occupant = state.usedNaturalKeys.get(naturalKey);
    if (
      !occupant &&
      group.length > 1 &&
      group.every(candidate => candidate.allowDuplicateNaturalKeyGrouping === true)
    ) {
      const grouped = [...group].sort((left, right) =>
        left.record.canonical_location_id.localeCompare(right.record.canonical_location_id),
      );
      survivors.push({
        ...grouped[0],
        records: grouped.map(candidate => candidate.record),
      });
      continue;
    }
    if (occupant || group.length > 1) {
      for (const candidate of group) {
        queueRecord(
          state,
          candidate.record,
          occupant
            ? 'natural_key_owned_by_accepted_row'
            : 'duplicate_natural_key_within_parent',
          'Reconcile the same-name identities before either can be published.',
        );
      }
      continue;
    }

    const candidate = group[0];
    const [province] = naturalKey.split('/');
    const tripleOwner = state.preferredNameTriples.get(
      `${candidate.storageLevel}|${province}|${normalizeName(candidate.record.preferred_name)}`,
    );
    if (tripleOwner && tripleOwner !== naturalKey) {
      queueRecord(
        state,
        candidate.record,
        'same_name_already_accepted_under_different_parent',
        `Reconcile against ${tripleOwner} before publishing a second public identity.`,
      );
      continue;
    }
    survivors.push(candidate);
  }
  return survivors;
}

function buildAliasList(state, candidate, preferredNameTriples) {
  const records = candidate.records ?? [candidate.record];
  const { storageLevel, naturalKey } = candidate;
  const [province] = naturalKey.split('/');
  const requested = [];
  for (const record of records) {
    for (const alias of state.aliasIndex?.get(record.canonical_location_id) ?? []) {
      requested.push({ name: alias.name, normalized: alias.normalized, origin: 'name_assertion' });
    }
    for (const form of extensionAliasForms(record.preferred_name)) {
      requested.push({
        name: form,
        normalized: normalizeName(form),
        origin: 'generated_extension_pattern',
      });
    }
  }

  const seen = new Set(records.map(record => normalizeName(record.preferred_name)));
  const accepted = [];
  for (const alias of requested) {
    if (seen.has(alias.normalized)) continue;
    const conflicting = preferredNameTriples.get(`${storageLevel}|${province}|${alias.normalized}`);
    if (conflicting && conflicting !== naturalKey) {
      state.aliasDrops.push({
        row: naturalKey,
        alias: alias.name,
        reason: `conflicts_with_preferred_name_of_${conflicting}`,
      });
      continue;
    }
    seen.add(alias.normalized);
    accepted.push(alias);
  }
  return accepted;
}

function emitRows(state, survivors) {
  const rows = [];
  for (const candidate of survivors) {
    const aliases = buildAliasList(state, candidate, state.preferredNameTriples);
    const records = candidate.records ?? [candidate.record];
    const { scopeKind, storageLevel, naturalKey, parentKey, publicationStatus } = candidate;
    const record = records[0];
    const row = {
      runtime_search_scope_kind: scopeKind,
      runtime_storage_level: storageLevel,
      runtime_natural_key: naturalKey,
      runtime_parent_natural_key: parentKey,
      name: record.preferred_name,
      slug: naturalKey.split('/').slice(-1)[0],
      ...(record.representative_latitude !== undefined && record.representative_latitude !== null
        ? { latitude: record.representative_latitude }
        : {}),
      ...(record.representative_longitude !== undefined && record.representative_longitude !== null
        ? { longitude: record.representative_longitude }
        : {}),
      searchable_aliases: aliases.map(alias => alias.name),
      publication_status: publicationStatus,
      licensing_classification: record.licensing_classification,
      factual_location_ids: records.map(item => item.canonical_location_id),
      factual_preferred_names: records.map(item => item.preferred_name),
      factual_types: records.map(item => item.canonical_type),
    };
    rows.push(row);
    const [province] = naturalKey.split('/');
    state.usedNaturalKeys.set(naturalKey, record.canonical_location_id);
    state.preferredNameTriples.set(
      `${storageLevel}|${province}|${normalizeName(record.preferred_name)}`,
      naturalKey,
    );
    for (const record of records) {
      state.runtimeRecords.push({ record, row, decisionNote: candidate.decisionNote });
    }
  }
  return rows;
}

function buildPromotedMappingEntry(entry) {
  const { record, row } = entry;
  return {
    factual_location_id: record.canonical_location_id,
    factual_preferred_name: record.preferred_name,
    factual_type: record.canonical_type,
    factual_context: {
      province_slug: 'gauteng',
      administrative_context_names:
        record.administrative_context?.adm2?.map(item => item.name) ?? [],
    },
    runtime_search_scope_kind: row.runtime_search_scope_kind,
    runtime_natural_key: row.runtime_natural_key,
    runtime_parent_natural_key: row.runtime_parent_natural_key ?? null,
    runtime_parent_relationship: 'accepted_market_or_administrative_parent',
    projection_status: 'projection_ready',
    runtime_reference_status: 'reference_data_expansion_required',
    environment_runtime_compatibility_ids: [],
    evidence_references: [
      'data/geography-coverage-v0.1/gauteng-territory-manifest.v0.1.json#parent_context_registry',
    ],
    decision_reason: `Territory coverage pipeline promotion (${row.publication_status}); licensing ${record.licensing_classification}.${entry.decisionNote ? ` Parent via ${entry.decisionNote}.` : ''}`,
    name_only_match: false,
  };
}

function projectionStatusForReason(reason) {
  switch (reason) {
    case 'awaiting_accepted_parent_edge':
      return 'factual_geography_blocker';
    case 'duplicate_natural_key_within_parent':
    case 'natural_key_owned_by_accepted_row':
    case 'same_name_already_accepted_under_different_parent':
      return 'ambiguous_projection';
    case 'context_only_type_municipality':
    case 'unsupported_factual_type_for_release_1':
    case 'province_scope_owned_by_carried_gauteng_row':
      return 'unsupported_search_scope';
    case 'outside_territory_adm2_context':
    case 'estate_discovery_entity_deferred':
    case 'invalid_slug':
      return 'other_material_blocker';
    default:
      throw new Error(`Unhandled queue reason ${reason}`);
  }
}

function buildBlockedMappingEntry(record, queueEntry) {
  return {
    factual_location_id: record.canonical_location_id,
    factual_preferred_name: record.preferred_name,
    factual_type: record.canonical_type,
    factual_context: {
      province_slug: 'gauteng',
      administrative_context_names:
        record.administrative_context?.adm2?.map(item => item.name) ?? [],
    },
    runtime_search_scope_kind: null,
    runtime_natural_key: null,
    runtime_parent_natural_key: null,
    runtime_parent_relationship: null,
    projection_status: projectionStatusForReason(queueEntry.reason),
    runtime_reference_status: null,
    environment_runtime_compatibility_ids: [],
    evidence_references: ['data/geography-coverage-v0.1/gauteng-territory-manifest.v0.1.json'],
    decision_reason: `Coverage pipeline queue: ${queueEntry.reason}. Next: ${queueEntry.suggested_next_action}`,
    name_only_match: false,
  };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const manifestPath = path.resolve(ROOT, options.manifest);
  const rawManifest = readJson(manifestPath);

  const inputs = loadInputs(ROOT, rawManifest);
  const state = createState(inputs);
  state.aliasIndex = buildAliasIndex(inputs.names);
  const researchedEdges = loadResearchedEdges(ROOT, rawManifest);

  const registryByContext = new Map(
    (rawManifest.parent_context_registry?.entries ?? []).map(entry => [
      entry.administrative_context_name,
      entry,
    ]),
  );
  const excludedContexts = new Set(
    rawManifest.parent_context_registry?.excluded_non_territory_contexts ?? [],
  );
  const manifest = { registryByContext, excludedContexts, researchedEdges };

  const candidates = collectCandidates(state, inputs, manifest);
  const survivors = resolveCollisions(state, candidates);
  const newRows = emitRows(state, survivors);

  const finalRows = [...inputs.carriedRows, ...newRows].sort((left, right) =>
    left.runtime_natural_key.localeCompare(right.runtime_natural_key),
  );

  const recordsById = new Map(inputs.geography.map(record => [record.canonical_location_id, record]));
  const promotedIds = new Set(state.runtimeRecords.map(entry => entry.record.canonical_location_id));

  const mappingEntries = [
    ...inputs.carriedMapping.map(entry => ({ ...entry })),
    ...state.runtimeRecords.map(buildPromotedMappingEntry),
    ...[...state.queueById.keys()]
      .filter(factualId => !promotedIds.has(factualId))
      .filter(factualId => !inputs.carriedMapping.some(entry => entry.factual_location_id === factualId))
      .map(factualId => buildBlockedMappingEntry(recordsById.get(factualId), state.queueById.get(factualId))),
  ].sort((left, right) => left.factual_location_id.localeCompare(right.factual_location_id));

  const queueReasonCounts = {};
  for (const entry of state.queueById.values()) {
    queueReasonCounts[entry.reason] = (queueReasonCounts[entry.reason] ?? 0) + 1;
  }

  const projection = {
    schema_version: PROJECTION_SCHEMA_VERSION,
    projection_version: PROJECTION_VERSION,
    source_factual_projection_artifact: `${rawManifest.outputs.output_dir}/${rawManifest.outputs.mapping}`,
    numeric_runtime_ids_are_durable_authority: false,
    checkpoints: {
      factual_canonical_geography_sha256: inputs.geographyDigest,
      factual_canonical_names_sha256: inputs.namesDigest,
      carried_projection_v01_sha256: inputs.carriedDigest,
      territory_manifest_sha256: sha256File(manifestPath),
    },
    rows: finalRows,
  };

  const disposition = {
    disposition_version: 'gauteng-coverage-disposition-v0.1',
    contract: 'docs/architecture/geography-coverage-contract.md',
    manifest: options.manifest,
    inputs: {
      canonical_root:
        process.env[rawManifest.inputs.canonical_root_env] ||
        rawManifest.inputs.canonical_root_default,
      factual_geography_sha256: inputs.geographyDigest,
      factual_names_sha256: inputs.namesDigest,
      carried_projection_sha256: inputs.carriedDigest,
    },
    summary: {
      factual_identity_count: inputs.geography.length,
      runtime_row_count: finalRows.length,
      carried_row_count: inputs.carriedRows.length,
      newly_promoted_row_count: newRows.length,
      newly_promoted_identity_count: state.runtimeRecords.length,
      queued_count: state.queueById.size,
      represented_by_carried_count: [...state.queueById.values()].filter(
        entry => entry.reason === 'represented_by_carried_runtime_row',
      ).length,
      alias_drop_count: state.aliasDrops.length,
    },
    disposition_invariant: {
      rule: 'promoted_new_identities + queued === factual_identity_count',
      promoted_new_identities: state.runtimeRecords.length,
      promoted_new_rows: newRows.length,
      queued: state.queueById.size,
    },
    tier_counts: {
      verified_rows: finalRows.filter(row => (row.publication_status ?? 'verified') === 'verified').length,
      provisional_rows: finalRows.filter(row => row.publication_status === 'provisional').length,
      carried_rows: inputs.carriedRows.length,
    },
    queue_reason_counts: queueReasonCounts,
    alias_drop_log: state.aliasDrops.sort((left, right) =>
      `${left.row}|${left.alias}`.localeCompare(`${right.row}|${right.alias}`),
    ),
  };

  const outputDirectory = path.join(ROOT, rawManifest.outputs.output_dir);
  fs.mkdirSync(outputDirectory, { recursive: true });
  const projectionPath = path.join(outputDirectory, rawManifest.outputs.projection);
  const mappingPath = path.join(outputDirectory, rawManifest.outputs.mapping);
  const queuePath = path.join(outputDirectory, rawManifest.outputs.review_queue);
  const dispositionPath = path.join(outputDirectory, rawManifest.outputs.disposition);

  const serializeProjection = () => `${JSON.stringify(projection, null, 2)}\n`;
  const serializeMapping = () =>
    `${mappingEntries.map(entry => JSON.stringify(entry)).join('\n')}\n`;
  const serializeQueue = () =>
    `${[...state.queueById.values()]
      .sort((left, right) => left.factual_location_id.localeCompare(right.factual_location_id))
      .map(entry => JSON.stringify(entry))
      .join('\n')}\n`;

  if (options.check) {
    const expected = {
      projection: fs.readFileSync(projectionPath, 'utf8'),
      mapping: fs.readFileSync(mappingPath, 'utf8'),
      queue: fs.readFileSync(queuePath, 'utf8'),
    };
    const actual = {
      projection: serializeProjection(),
      mapping: serializeMapping(),
      queue: serializeQueue(),
    };
    for (const key of Object.keys(actual)) {
      if (expected[key] !== actual[key]) {
        throw new Error(`Determinism check failed for ${key}; regenerate the artifacts.`);
      }
    }
    console.log('coverage-generate: determinism check passed');
    return;
  }

  fs.writeFileSync(projectionPath, serializeProjection());
  fs.writeFileSync(mappingPath, serializeMapping());
  fs.writeFileSync(queuePath, serializeQueue());

  disposition.outputs = {
    projection: `${rawManifest.outputs.output_dir}/${rawManifest.outputs.projection}`,
    projection_sha256: sha256File(projectionPath),
    mapping: `${rawManifest.outputs.output_dir}/${rawManifest.outputs.mapping}`,
    review_queue: `${rawManifest.outputs.output_dir}/${rawManifest.outputs.review_queue}`,
  };
  fs.writeFileSync(dispositionPath, `${JSON.stringify(disposition, null, 2)}\n`);

  console.log(
    `coverage-generate: ${finalRows.length} runtime rows (${newRows.length} new), ${state.queueById.size} queued identities`,
  );
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
