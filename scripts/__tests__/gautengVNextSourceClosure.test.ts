import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '../..');
const NODE = process.execPath;

function run(script: string, args: string[] = []) {
  return spawnSync(NODE, [path.join(ROOT, script), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 120_000,
  });
}

function sha256(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

describe('Gauteng vNext source closure', () => {
  it('passes source, projection, probe and diff gates without changing the default catalog', () => {
    const probe = run('tools/geography-coverage/vnext-source-probes.mjs');
    expect({ status: probe.status, stderr: probe.stderr }).toEqual({ status: 0, stderr: '' });

    const report = JSON.parse(
      readFileSync(
        path.join(
          ROOT,
          'data/geography-coverage-v0.2/output/gauteng_vnext_probe_results_v0.2.json',
        ),
        'utf8',
      ),
    ) as {
      counts: {
        total_governed_probes: number;
        candidate_disposition_probes: number;
        resolved_identities: number;
        queued_identities: number;
      };
      invariants: Record<string, boolean>;
    };
    expect(report.counts).toMatchObject({
      total_governed_probes: 8297,
      candidate_disposition_probes: 4350,
      resolved_identities: 953,
      queued_identities: 535,
    });
    expect(report.invariants).toMatchObject({
      all_identities_have_one_disposition: true,
      all_names_have_one_identity_disposition: true,
      all_candidates_have_one_disposition: true,
      all_projected_rows_have_closed_parents: true,
      no_legacy_identity_in_vnext_source: true,
      kyalami_non_public: true,
      old_generated_output_not_used_as_source: true,
    });

    const generated = run('tools/geography-coverage/generate.mjs', [
      '--manifest',
      'data/geography-coverage-v0.2/gauteng-territory-manifest.v0.2.json',
      '--check',
    ]);
    expect({ status: generated.status, stderr: generated.stderr }).toEqual({
      status: 0,
      stderr: '',
    });

    const diff = run('tools/geography-coverage/diff-vnext.mjs');
    expect({ status: diff.status, stderr: diff.stderr }).toEqual({ status: 0, stderr: '' });
    const diffReport = JSON.parse(
      readFileSync(
        path.join(ROOT, 'data/geography-coverage-v0.2/output/gauteng_vnext_diff_v0.2.json'),
        'utf8',
      ),
    ) as { comparison_only: boolean; old_generated_output_used_as_vnext_source: boolean };
    expect(diffReport).toMatchObject({
      comparison_only: true,
      old_generated_output_used_as_vnext_source: false,
    });

    const vNextCatalog = JSON.parse(
      readFileSync(
        path.join(ROOT, 'data/geography-coverage-v0.2/territory-catalog.v0.2.json'),
        'utf8',
      ),
    ) as {
      sources: Array<{ source_authority: { path: string; sha256: string } }>;
    };
    const sourceAuthority = vNextCatalog.sources[0]!.source_authority;
    expect(sha256(path.join(ROOT, sourceAuthority.path))).toBe(sourceAuthority.sha256);

    const defaultCatalog = JSON.parse(
      readFileSync(
        path.join(ROOT, 'data/geography-coverage-v0.1/territory-catalog.v0.1.json'),
        'utf8',
      ),
    ) as { sources: Array<{ source_id: string }> };
    expect(defaultCatalog.sources.map(source => source.source_id)).toEqual(['za-gp']);
  });
});
