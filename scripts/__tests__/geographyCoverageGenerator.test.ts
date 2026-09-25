import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '../..');
const GENERATOR = path.join(ROOT, 'tools/geography-coverage/generate.mjs');
const CANONICAL_ROOT_ENV = 'PL_GEOGRAPHY_SYNTHETIC_GEOGRAPHY_ROOT';
const temporaryRoots: string[] = [];

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function repositoryRelative(absolutePath: string): string {
  return path.relative(ROOT, absolutePath).split(path.sep).join('/');
}

function writeJson(filePath: string, value: unknown): string {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  writeFileSync(filePath, serialized);
  return sha256(serialized);
}

function writeCanonicalRoot(root: string): { geography: string; names: string } {
  const geography = `${JSON.stringify({
    canonical_location_id: 'pl-geo-v01-test-nz-00000000000000000001',
    preferred_name: 'Test Province',
    canonical_type: 'province',
    type_state: 'supported',
    licensing_classification: 'permissive_supported',
    administrative_context: { adm2: [] },
  })}\n`;
  const names = '';
  mkdirSync(root, { recursive: true });
  writeFileSync(path.join(root, 'geography.jsonl'), geography);
  writeFileSync(path.join(root, 'names.jsonl'), names);
  return { geography, names };
}

function runGenerator(manifestPath: string, canonicalRoot: string, check: boolean) {
  return spawnSync(
    process.execPath,
    [GENERATOR, '--manifest', manifestPath, ...(check ? ['--check'] : [])],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, [CANONICAL_ROOT_ENV]: canonicalRoot },
      timeout: 30_000,
    },
  );
}

function createGeneratorFixture() {
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'property-listify-coverage-generator-'));
  temporaryRoots.push(temporaryRoot);
  const firstCanonicalRoot = path.join(temporaryRoot, 'canonical-a');
  const secondCanonicalRoot = path.join(temporaryRoot, 'canonical-b');
  const firstSource = writeCanonicalRoot(firstCanonicalRoot);
  writeCanonicalRoot(secondCanonicalRoot);
  const carriedProjectionPath = path.join(temporaryRoot, 'carried-projection.json');
  const carriedMappingPath = path.join(temporaryRoot, 'carried-mapping.jsonl');
  const carriedProjection = `${JSON.stringify(
    {
      schema_version: '0.1',
      rows: [
        {
          runtime_natural_key: 'test-province',
          runtime_storage_level: 'province',
          name: 'Test Province',
          slug: 'test-province',
        },
      ],
    },
    null,
    2,
  )}\n`;
  writeFileSync(carriedProjectionPath, carriedProjection);
  writeFileSync(carriedMappingPath, '');
  const outputDirectory = path.join(temporaryRoot, 'output');
  const manifestPath = path.join(temporaryRoot, 'territory-manifest.json');
  const manifest = {
    manifest_version: '0.1',
    contract: 'docs/architecture/geography-coverage-contract.md',
    territory: {
      country: 'ZZ',
      country_name: 'Test Country',
      province: 'Test Province',
      province_slug: 'test-province',
    },
    inputs: {
      canonical_root_env: CANONICAL_ROOT_ENV,
      canonical_root_default: firstCanonicalRoot,
      geography_jsonl: 'geography.jsonl',
      names_jsonl: 'names.jsonl',
      expected_sha256: {
        factual_geography_sha256: sha256(firstSource.geography),
        factual_names_sha256: sha256(firstSource.names),
        carried_projection_sha256: sha256(carriedProjection),
      },
      carried_projection: repositoryRelative(carriedProjectionPath),
      carried_mapping: repositoryRelative(carriedMappingPath),
      researched_parent_edges: [],
    },
    outputs: {
      output_dir: repositoryRelative(outputDirectory),
      projection: 'projection.json',
      mapping: 'mapping.jsonl',
      disposition: 'disposition.json',
      review_queue: 'review-queue.jsonl',
      projection_version: 'test-province-runtime-reference-projection-v0.1',
    },
    parent_context_registry: {
      entries: [],
      excluded_non_territory_contexts: [],
    },
  };
  writeJson(manifestPath, manifest);
  return {
    manifestPath,
    firstCanonicalRoot,
    secondCanonicalRoot,
    outputDirectory,
  };
}

afterEach(() => {
  while (temporaryRoots.length > 0) {
    const root = temporaryRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('geography coverage generator determinism', () => {
  it('checks byte-identical artifacts from an alternate exact canonical root', () => {
    const fixture = createGeneratorFixture();
    const generated = runGenerator(fixture.manifestPath, fixture.firstCanonicalRoot, false);
    expect({ status: generated.status, stderr: generated.stderr }).toEqual({
      status: 0,
      stderr: '',
    });

    const checked = runGenerator(fixture.manifestPath, fixture.secondCanonicalRoot, true);
    expect({ status: checked.status, stderr: checked.stderr }).toEqual({
      status: 0,
      stderr: '',
    });
    expect(
      JSON.parse(readFileSync(path.join(fixture.outputDirectory, 'disposition.json'), 'utf8')),
    ).toMatchObject({
      disposition_version: 'test-province-coverage-disposition-v0.1',
      summary: { factual_identity_count: 1, runtime_row_count: 1, queued_count: 1 },
    });

    appendFileSync(path.join(fixture.outputDirectory, 'projection.json'), '\n');
    const drifted = runGenerator(fixture.manifestPath, fixture.secondCanonicalRoot, true);
    expect(drifted.status).toBe(1);
    expect(drifted.stderr).toContain('Determinism check failed for projection');
  });
});
