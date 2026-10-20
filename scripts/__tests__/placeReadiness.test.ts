import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { isReleasedPlaceLicensing, runtimePlaceStatus } from '../../shared/placeReadiness';

const TOOL = path.resolve(
  import.meta.dirname,
  '../../tools/geography-coverage/place-readiness.mjs',
);

type Readiness = {
  total: number;
  recordedTier: Record<string, number>;
  effectiveTier: Record<string, number>;
  blockers: Record<string, number>;
  held: number;
  heldForLicensing: number;
  heldWithoutLicence: number;
  tierDisagreement: number;
  tierDisagreementByLicensing: Record<string, number>;
};

function run(args: string[] = ['--json']): Readiness {
  return JSON.parse(execFileSync('npx', ['tsx', TOOL, ...args], { encoding: 'utf8' }));
}

describe('place readiness rule', () => {
  it('holds only the licensing the production release policy holds', () => {
    expect(runtimePlaceStatus({ publicationStatus: 'provisional' })).toBe('provisional');
    expect(
      runtimePlaceStatus({
        publicationStatus: 'provisional',
        licensingClassification: 'osm_only_odbl_provisional',
      }),
    ).toBe('provisional');
    expect(
      runtimePlaceStatus({
        publicationStatus: 'provisional',
        licensingClassification: 'mixed_odbl_supported',
      }),
    ).toBe('verified');
    expect(
      runtimePlaceStatus({
        publicationStatus: 'provisional',
        licensingClassification: 'permissive_supported',
      }),
    ).toBe('verified');
    expect(runtimePlaceStatus({ publicationStatus: 'verified' })).toBe('verified');
  });

  it('recognises exactly the released licensing classifications', () => {
    expect(isReleasedPlaceLicensing('mixed_odbl_supported')).toBe(true);
    expect(isReleasedPlaceLicensing('permissive_supported')).toBe(true);
    expect(isReleasedPlaceLicensing('osm_only_odbl_provisional')).toBe(false);
    expect(isReleasedPlaceLicensing(undefined)).toBe(false);
  });
});

describe('place readiness report', () => {
  it('accounts for every runtime row', () => {
    const report = run();
    expect(report.total).toBeGreaterThan(0);
    expect((report.effectiveTier.verified || 0) + (report.effectiveTier.provisional || 0)).toBe(
      report.total,
    );
  });

  it('holds a row only when the release policy holds it', () => {
    const report = run();
    expect(report.heldWithoutLicence).toBe(0);
    expect(report.held).toBe(report.heldForLicensing);
    expect(report.blockers.held_without_licence).toBeUndefined();
  });

  it('makes the released places usable and leaves the licence-held ones held', () => {
    const report = run();
    const effectiveVerified = report.effectiveTier.verified || 0;
    const recordedVerified = report.recordedTier.verified || 0;
    expect(effectiveVerified).toBeGreaterThan(recordedVerified);
    expect(report.tierDisagreement).toBe(effectiveVerified - recordedVerified);
    // Every disagreement is a place the release policy releases.
    expect(report.tierDisagreementByLicensing.osm_only_odbl_provisional).toBeUndefined();
  });

  it('reports the same numbers on every run', () => {
    expect(run()).toEqual(run());
  });

  it('passes its own gate', () => {
    const output = execFileSync('npx', ['tsx', TOOL, '--check'], { encoding: 'utf8' });
    expect(output).toContain('every held row is held by the release policy');
  });
});
