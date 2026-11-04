#!/usr/bin/env node
/* global console, process */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

const ROOT = process.cwd();
const CHECK_ONLY = process.argv.includes('--check');
const REGISTRY_PATH = 'data/place-admission-territories.v0.2/territory-registry.v0.2.json';
const EXPECTED_REMOVALS = {
  'za-wc': 15,
  'za-kzn': 20,
  'za-ec': 15,
  'za-fs': 10,
  'za-mp': 6,
  'za-li': 10,
  'za-nw': 8,
  'za-nc': 5,
};

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const readBytes = path => readFileSync(resolve(ROOT, path));
const readJson = path => JSON.parse(readBytes(path).toString('utf8'));
const json = value => `${JSON.stringify(value, null, 2)}\n`;
const isGoogleMapsUrlAlias = value => {
  try {
    const url = new URL(String(value));
    return /(^|\.)google\.[a-z.]+$/i.test(url.hostname) && /^\/maps(?:\/|$)/i.test(url.pathname);
  } catch {
    return false;
  }
};
const fail = message => {
  throw new Error(`derive-national-source-authority-v0.3 refused: ${message}`);
};

const registry = readJson(REGISTRY_PATH);

if (
  CHECK_ONLY &&
  Object.keys(EXPECTED_REMOVALS).every(territoryId =>
    registry.territories.find(row => row.territory_id === territoryId)?.source_authority.authority_version.endsWith('-source-authority-v0.3'),
  )
) {
  for (const [territoryId, expectedRemoved] of Object.entries(EXPECTED_REMOVALS)) {
    const territory = registry.territories.find(row => row.territory_id === territoryId);
    const authority = territory.source_authority;
    const manifestBytes = readBytes(authority.manifest.path);
    if (hash(manifestBytes) !== authority.manifest.sha256) fail(`${territoryId} v0.3 manifest pin drift`);
    const manifest = JSON.parse(manifestBytes.toString('utf8'));
    const priorPin = manifest.supersedes?.prior_manifest;
    if (!priorPin?.path || hash(readBytes(priorPin.path)) !== priorPin.sha256) {
      fail(`${territoryId} prior manifest pin drift`);
    }
    const priorManifest = readJson(priorPin.path);
    const priorByKind = new Map(priorManifest.compact_artifacts.map(artifact => [artifact.kind, artifact]));
    let checkedRemoved = 0;
    for (const artifact of manifest.compact_artifacts) {
      const currentBytes = readBytes(artifact.path);
      if (hash(currentBytes) !== artifact.sha256) fail(`${territoryId} v0.3 artifact digest drift`);
      const prior = priorByKind.get(artifact.kind);
      if (!prior) fail(`${territoryId} lost prior artifact kind ${artifact.kind}`);
      const priorBytes = readBytes(prior.path);
      if (artifact.kind === 'names') {
        const lines = priorBytes.toString('utf8').split(/\r?\n/).filter(line => line.trim());
        const kept = [];
        for (const line of lines) {
          const row = JSON.parse(line);
          if (isGoogleMapsUrlAlias(row.name)) checkedRemoved += 1;
          else kept.push(line);
        }
        if (!currentBytes.equals(Buffer.from(`${kept.join('\n')}\n`))) {
          fail(`${territoryId} sanitized name artifact is not reproducible`);
        }
      } else if (!currentBytes.equals(priorBytes)) {
        fail(`${territoryId} non-name artifact changed during sanitization`);
      }
    }
    if (checkedRemoved !== expectedRemoved || manifest.provenance_review?.google_maps_url_aliases_removed !== expectedRemoved) {
      fail(`${territoryId} expected ${expectedRemoved} recorded URL removals, verified ${checkedRemoved}`);
    }
  }
  console.log('National v0.3 source-authority sanitization is reproducible.');
  process.exit(0);
}

const registryOutput = structuredClone(registry);
const outputFiles = [];
const changedAuthorities = [];

for (const territory of registry.territories) {
  const expectedRemoved = EXPECTED_REMOVALS[territory.territory_id];
  if (expectedRemoved === undefined) continue;
  const authority = territory.source_authority;
  if (!authority.authority_version.endsWith('-source-authority-v0.2')) {
    fail(`${territory.territory_id} is no longer on source authority v0.2`);
  }

  const priorManifestBytes = readBytes(authority.manifest.path);
  if (hash(priorManifestBytes) !== authority.manifest.sha256) {
    fail(`${territory.territory_id} prior source manifest digest changed`);
  }
  const priorManifest = JSON.parse(priorManifestBytes.toString('utf8'));
  if (priorManifest.authority_version !== authority.authority_version) {
    fail(`${territory.territory_id} prior manifest authority version changed`);
  }
  for (const artifact of priorManifest.compact_artifacts ?? []) {
    if (hash(readBytes(artifact.path)) !== artifact.sha256) {
      fail(`${territory.territory_id} prior source artifact digest drift: ${artifact.path}`);
    }
  }

  const newVersion = authority.authority_version.replace(/v0\.2$/, 'v0.3');
  const newDirectory = authority.directory.replace(/v0\.2$/, 'v0.3');
  if (newDirectory === authority.directory || existsSync(resolve(ROOT, newDirectory))) {
    fail(`${territory.territory_id} v0.3 output directory already exists or is invalid`);
  }
  const newManifestPath = authority.manifest.path
    .replace(authority.directory, newDirectory)
    .replace(/v0\.2\.json$/, 'v0.3.json');
  const newArtifacts = [];
  let removed = 0;

  for (const artifact of priorManifest.compact_artifacts) {
    const oldBytes = readBytes(artifact.path);
    let bytes = oldBytes;
    if (artifact.kind === 'names') {
      const lines = oldBytes.toString('utf8').split(/\r?\n/).filter(line => line.trim());
      const kept = [];
      for (const line of lines) {
        const row = JSON.parse(line);
        if (isGoogleMapsUrlAlias(row.name)) removed += 1;
        else kept.push(line);
      }
      bytes = Buffer.from(`${kept.join('\n')}\n`);
    }

    const newPath = `${newDirectory}/${basename(artifact.path)}`;
    const newArtifact = {
      ...artifact,
      path: newPath,
      sha256: hash(bytes),
      size_bytes: bytes.length,
      carried_forward: bytes.equals(oldBytes),
      derived_from: { path: artifact.path, sha256: artifact.sha256 },
    };
    newArtifacts.push(newArtifact);
    outputFiles.push({ path: newPath, bytes });
  }

  if (removed !== expectedRemoved) {
    fail(`${territory.territory_id} expected ${expectedRemoved} URL aliases to remove, found ${removed}`);
  }

  const reviewId = `remove-google-maps-url-aliases-${territory.territory_id}-2026-11-02`;
  const priorSupersedes = priorManifest.supersedes;
  const newManifest = {
    ...priorManifest,
    authority_version: newVersion,
    generated_at: '2026-11-02T00:00:00Z',
    source_snapshot_id: hash(Buffer.from(JSON.stringify({
      prior_snapshot_id: priorManifest.source_snapshot_id,
      review_id: reviewId,
      removed_google_maps_url_aliases: removed,
      artifacts: newArtifacts.map(row => [row.path, row.sha256]),
    }))),
    supersedes: {
      authority_version: authority.authority_version,
      status: 'superseded_by_google_maps_url_alias_removal',
      prior_manifest: { path: authority.manifest.path, sha256: hash(priorManifestBytes) },
    },
    ...(priorSupersedes ? { supersedes_history: [...(priorManifest.supersedes_history ?? []), priorSupersedes] } : {}),
    compact_artifacts: newArtifacts,
    provenance_review: {
      review_id: reviewId,
      decision: 'remove_google_maps_url_aliases_from_active_source_names',
      purpose: 'Remove every Google Maps URL name assertion from the current source authority while retaining the underlying non-Google identities and evidence.',
      google_maps_url_aliases_removed: removed,
      historical_snapshot_preserved: true,
      reviewed_on: '2026-11-02',
    },
  };
  const manifestBytes = Buffer.from(json(newManifest));
  outputFiles.push({ path: newManifestPath, bytes: manifestBytes });

  const registered = registryOutput.territories.find(row => row.territory_id === territory.territory_id);
  registered.source_authority = {
    ...registered.source_authority,
    authority_version: newVersion,
    directory: newDirectory,
    manifest: { path: newManifestPath, sha256: hash(manifestBytes) },
  };
  changedAuthorities.push({ territory_id: territory.territory_id, version: newVersion, removed });
}

if (changedAuthorities.length !== Object.keys(EXPECTED_REMOVALS).length) {
  fail(`expected ${Object.keys(EXPECTED_REMOVALS).length} non-Gauteng source authorities, found ${changedAuthorities.length}`);
}

const registryBytes = Buffer.from(json(registryOutput));
outputFiles.push({ path: REGISTRY_PATH, bytes: registryBytes });

if (CHECK_ONLY) {
  const mismatches = outputFiles.filter(file => {
    try {
      return !readBytes(file.path).equals(file.bytes);
    } catch {
      return true;
    }
  });
  if (mismatches.length) {
    fail(`derived national source artifacts differ: ${mismatches.map(file => file.path).join(', ')}`);
  }
  console.log('National v0.3 source-authority derivation is reproducible.');
} else {
  for (const file of outputFiles.slice(0, -1)) {
    const fullPath = resolve(ROOT, file.path);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, file.bytes);
  }
  writeFileSync(resolve(ROOT, REGISTRY_PATH), registryBytes);
  const total = changedAuthorities.reduce((sum, row) => sum + row.removed, 0);
  console.log(`Wrote ${changedAuthorities.length} source authorities; removed ${total} URL aliases outside Gauteng.`);
}
