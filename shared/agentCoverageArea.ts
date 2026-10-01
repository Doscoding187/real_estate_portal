import {
  encodeCanonicalLocationId,
  parseCanonicalLocationId,
  type CanonicalLocationLevel,
} from './locationAuthority';

/** Agent onboarding and settings must mirror the product's bounded coverage selector. */
export const AGENT_COVERAGE_AREA_MAX = 20;

/**
 * New writes use the colon form only. The location authority still accepts a
 * hyphenated alias for legacy URL reads, but an agent coverage claim is not a
 * URL and must never persist that alias as a second spelling of one place.
 */
export const CANONICAL_AGENT_COVERAGE_LOCATION_ID_PATTERN = /^(province|city|suburb):[1-9]\d*$/;

export type AgentCoverageArea = Readonly<{
  canonicalLocationId: string;
  /** Display-only text generated from the canonical hierarchy by the server. */
  label: string;
}>;

function normalizeCoverageLocationId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!CANONICAL_AGENT_COVERAGE_LOCATION_ID_PATTERN.test(trimmed)) return null;

  const parsed = parseCanonicalLocationId(trimmed);
  if (!parsed) return null;

  const canonical = encodeCanonicalLocationId(parsed.level, parsed.id);
  return trimmed === canonical ? canonical : null;
}

export function parseCanonicalAgentCoverageLocationId(value: unknown): {
  canonicalLocationId: string;
  level: CanonicalLocationLevel;
  id: number;
} | null {
  const canonicalLocationId = normalizeCoverageLocationId(value);
  if (!canonicalLocationId) return null;

  const parsed = parseCanonicalLocationId(canonicalLocationId);
  if (!parsed) return null;

  return { canonicalLocationId, ...parsed };
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
