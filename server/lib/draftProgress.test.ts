import { describe, expect, it } from 'vitest';
import { draftProgressPercent } from './draftProgress';

describe('draftProgressPercent', () => {
  it('uses the progress the wizard computed from its real step count', () => {
    expect(draftProgressPercent({ progressPercent: 50, currentPhase: 1 }, { currentPhase: 1 })).toBe(50);
    expect(draftProgressPercent({ progressPercent: 100 }, {})).toBe(100);
  });

  it('clamps and rounds reported progress', () => {
    expect(draftProgressPercent({ progressPercent: 140 }, {})).toBe(100);
    expect(draftProgressPercent({ progressPercent: -5 }, {})).toBe(0);
    expect(draftProgressPercent({ progressPercent: 33.6 }, {})).toBe(34);
  });

  it('falls back to the legacy estimate for older clients', () => {
    expect(draftProgressPercent({}, { currentPhase: 11 })).toBe(100);
    expect(draftProgressPercent(undefined, undefined)).toBe(0);
    expect(draftProgressPercent({ progressPercent: 'nope' }, { currentPhase: 0 })).toBe(0);
  });
});
