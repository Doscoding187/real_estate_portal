import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const TOOL = path.resolve(
  import.meta.dirname,
  '../../tools/geography-coverage/place-readiness.mjs',
);

type Readiness = {
  total: number;
  verified: number;
  carried: number;
  provisional: number;
  blockers: Record<string, number>;
  unlockedByTierRuleOnly: number;
  unlockedByScope: Record<string, number>;
  unlockedByLicensing: Record<string, number>;
};

function run(args: string[] = ['--json']): Readiness {
  return JSON.parse(execFileSync('node', [TOOL, ...args], { encoding: 'utf8' }));
}

describe('place readiness report', () => {
  it('accounts for every runtime row', () => {
    const report = run();
    expect(report.total).toBeGreaterThan(0);
    expect(report.verified + report.provisional).toBe(report.total);
    expect(report.carried).toBeLessThanOrEqual(report.verified);
  });

  it('separates the places the tier rule hides from the places the licence gate holds', () => {
    const report = run();
    // The OSM-only rows are correctly held by the production release policy.
    expect(report.blockers.licensing_held).toBeGreaterThan(0);
    // A row that is released, parented and projection-ready is hidden by the tier rule alone.
    expect(report.unlockedByTierRuleOnly).toBeGreaterThan(0);
    expect(report.unlockedByTierRuleOnly + report.blockers.licensing_held).toBeGreaterThanOrEqual(
      report.provisional,
    );
  });

  it('never counts a carried or licensing-held row as unlockable', () => {
    const report = run();
    expect(Object.keys(report.unlockedByLicensing)).not.toContain('osm_only_odbl_provisional');
    expect(report.unlockedByLicensing).not.toHaveProperty('unknown');
  });

  it('reports the same numbers on every run', () => {
    expect(run()).toEqual(run());
  });
});
