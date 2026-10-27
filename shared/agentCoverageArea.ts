import { isCanonicalPlaceId } from './placeAuthority';

/** Agent onboarding and settings must mirror the product's bounded coverage selector. */
export const AGENT_COVERAGE_AREA_MAX = 20;

/**
 * Agent coverage stores admitted Place identities. Historical numeric location
 * handles are no longer parsed or resolved.
 */
export const CANONICAL_AGENT_COVERAGE_PLACE_ID_PATTERN = /^pl-place-01-[a-f0-9]{24}$/;

export type AgentCoverageArea = Readonly<{
  canonicalLocationId: string;
  /** Display-only text generated from the canonical hierarchy by the server. */
  label: string;
}>;

export function parseCanonicalAgentCoverageLocationId(value: unknown): {
  canonicalLocationId: string;
} | null {
  return isCanonicalPlaceId(value) ? { canonicalLocationId: value } : null;
}

function isCoverageArea(value: unknown): value is AgentCoverageArea {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const canonical = parseCanonicalAgentCoverageLocationId(record.canonicalLocationId);
  const label = typeof record.label === 'string' ? record.label.trim() : '';

  return Boolean(canonical && label && label.length <= 500);
}

/**
 * Read only the current persisted representation. Earlier comma-separated and
 * bare-string JSON values cannot identify one canonical location, so they are
 * deliberately unavailable rather than guessed or silently widened.
 */
export function parseAgentCoverageAreas(value: unknown): AgentCoverageArea[] {
  if (typeof value !== 'string' || !value.trim()) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed) || parsed.length > AGENT_COVERAGE_AREA_MAX) return [];

  const areas: AgentCoverageArea[] = [];
  const seen = new Set<string>();
  for (const item of parsed) {
    if (!isCoverageArea(item)) return [];
    const canonical = parseCanonicalAgentCoverageLocationId(item.canonicalLocationId);
    if (!canonical) return [];
    if (seen.has(canonical.canonicalLocationId)) continue;
    seen.add(canonical.canonicalLocationId);
    areas.push({
      canonicalLocationId: canonical.canonicalLocationId,
      label: item.label.trim(),
    });
  }

  return areas;
}

/**
 * Keep an empty selection nullable so profile-completion logic cannot mistake
 * the JSON text "[]" for a real coverage claim.
 */
export function serializeAgentCoverageAreas(areas: readonly AgentCoverageArea[]): string | null {
  if (areas.length === 0) return null;
  if (areas.length > AGENT_COVERAGE_AREA_MAX) {
    throw new Error(`Choose no more than ${AGENT_COVERAGE_AREA_MAX} coverage areas.`);
  }

  const canonicalAreas: AgentCoverageArea[] = [];
  const seen = new Set<string>();
  for (const area of areas) {
    if (!isCoverageArea(area)) {
      throw new Error('Agent coverage must use canonical locations selected from Property Listify.');
    }
    const canonical = parseCanonicalAgentCoverageLocationId(area.canonicalLocationId);
    if (!canonical || seen.has(canonical.canonicalLocationId)) continue;
    seen.add(canonical.canonicalLocationId);
    canonicalAreas.push({
      canonicalLocationId: canonical.canonicalLocationId,
      label: area.label.trim(),
    });
  }

  return canonicalAreas.length > 0 ? JSON.stringify(canonicalAreas) : null;
}
