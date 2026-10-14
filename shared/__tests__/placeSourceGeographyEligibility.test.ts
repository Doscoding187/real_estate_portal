import { describe, expect, it } from 'vitest';
import { nonGeographicSourceCodes } from '../placeSourceGeographyEligibility';

const national = (code: string) => ({ source_native_classifications: [{ feature_code: code }] });
const gauteng = (featureClass: string, featureCode: string) => ({
  source_native_classifications: [
    {
      classification: {
        feature_class: featureClass,
        feature_code: featureCode,
      },
    },
  ],
});

describe('geographic search eligibility from source evidence', () => {
  it.each(['S.HTL', 'S.MALL', 'S.BLDG', 'S.HSP', 'S.SCH', 'S.AIRP', 'S.TOWR', 'S.RSD', 'L.CTRB'])(
    'refuses the %s facility code in a national source package',
    code => {
      expect(nonGeographicSourceCodes([national(code)])).toEqual([code]);
    },
  );
  it('refuses the convention centre classification in the retained Gauteng package', () => {
    expect(nonGeographicSourceCodes([gauteng('L', 'CTRB')])).toEqual(['L.CTRB']);
  });
  it.each(['P.PPL', 'P.PPLX', 'P.PPLA', 'A.ADM1', 'A.ADM2', 'L.LCTY'])(
    'preserves genuine area evidence %s',
    code => {
      expect(nonGeographicSourceCodes([national(code)])).toEqual([]);
    },
  );
  it('preserves a merged settlement with independent populated-place evidence', () => {
    expect(nonGeographicSourceCodes([national('S.RSTN'), gauteng('P', 'PPL')])).toEqual([]);
  });
  it('preserves a suburb independently classified by OSM despite a spot observation', () => {
    expect(
      nonGeographicSourceCodes([
        national('S.FRM'),
        {
          source_native_classifications: [{ classification: { place: 'suburb' } }],
        },
      ]),
    ).toEqual([]);
  });
  it('never uses a name as a venue filter', () => {
    expect(
      nonGeographicSourceCodes([
        {
          ...national('P.PPL'),
          ...{ preferred_name: 'Hotel View / Mall Village' },
        },
      ]),
    ).toEqual([]);
  });
  it('does not infer a facility or an area from missing classifications', () => {
    expect(nonGeographicSourceCodes([{}, { source_native_classifications: [null, {}] }])).toEqual(
      [],
    );
  });
});
