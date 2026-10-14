/**
 * Search scopes describe geographic areas, not individual facilities.
 * Frozen source packages remain provenance; their proposed canonical types
 * cannot turn an explicitly classified spot feature into an area.
 * GeoNames definitions: https://www.geonames.org/export/codes.html
 * No name, label, substring, coordinate or provider identity is used here.
 */
export const PLACE_SOURCE_GEOGRAPHY_POLICY = 'source-geography-eligibility-2026-10-14-v1';

type SourceIdentity = { source_native_classifications?: unknown };
const SETTLEMENT_PLACE_VALUES = new Set([
  'city',
  'town',
  'village',
  'hamlet',
  'suburb',
  'quarter',
  'neighbourhood',
  'locality',
]);

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Both source-package versions are explicit: Gauteng's native classification
 * object and the national snapshot's fully qualified feature_code field.
 * A merged area with independent settlement evidence remains an area even when
 * another source also records its railway station, farm or hotel.
 */
export function nonGeographicSourceCodes(identities: readonly SourceIdentity[]): string[] {
  const nonGeographic = new Set<string>();
  let hasGeographicEvidence = false;
  for (const identity of identities) {
    if (!Array.isArray(identity.source_native_classifications)) continue;
    for (const raw of identity.source_native_classifications) {
      const record = object(raw);
      if (!record) continue;
      const native = object(record.classification) ?? record;
      const rawCode = typeof native.feature_code === 'string' ? native.feature_code : '';
      const featureClass =
        typeof native.feature_class === 'string' ? native.feature_class : rawCode.split('.')[0];
      const code = rawCode.includes('.') ? rawCode : `${featureClass}.${rawCode}`;
      if (featureClass === 'P' || featureClass === 'A' || code === 'L.LCTY') {
        hasGeographicEvidence = true;
      }
      if (typeof native.place === 'string' && SETTLEMENT_PLACE_VALUES.has(native.place)) {
        hasGeographicEvidence = true;
      }
      // S is a spot/building/facility class. L.CTRB is a business centre.
      if (featureClass === 'S' || code === 'L.CTRB') nonGeographic.add(code);
    }
  }
  return hasGeographicEvidence ? [] : [...nonGeographic].sort();
}
