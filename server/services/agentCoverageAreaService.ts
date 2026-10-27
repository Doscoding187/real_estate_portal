import {
  AGENT_COVERAGE_AREA_MAX,
  parseCanonicalAgentCoverageLocationId,
  type AgentCoverageArea,
} from '../../shared/agentCoverageArea';
import { loadCanonicalPlaceSearchProjection } from './canonicalPlaceSearchService';

export class AgentCoverageAreaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentCoverageAreaValidationError';
  }
}

/**
 * Canonicalize a submitted agent coverage selection before it reaches the
 * agents table. Labels in browser input are never trusted: the exact typed
 * Place identity is resolved through the admitted Place Authority and the
 * server writes its current hierarchy label.
 */
export async function resolveSubmittedAgentCoverageAreas(
  values: readonly string[],
): Promise<AgentCoverageArea[]> {
  if (values.length > AGENT_COVERAGE_AREA_MAX) {
    throw new AgentCoverageAreaValidationError(
      `Choose no more than ${AGENT_COVERAGE_AREA_MAX} coverage areas.`,
    );
  }

  const canonicalPlaceIds: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const parsed = parseCanonicalAgentCoverageLocationId(value);
    if (!parsed) {
      throw new AgentCoverageAreaValidationError(
        'Choose coverage areas from the admitted canonical Place suggestions.',
      );
    }
    if (seen.has(parsed.canonicalLocationId)) continue;
    seen.add(parsed.canonicalLocationId);
    canonicalPlaceIds.push(parsed.canonicalLocationId);
  }

  const projection = await loadCanonicalPlaceSearchProjection(undefined, {
    placeIds: canonicalPlaceIds,
  });
  return canonicalPlaceIds.map(canonicalLocationId => {
    const execution = projection.executions.get(canonicalLocationId);
    const label = projection.labels.get(canonicalLocationId);
    if (!execution || !label) {
      throw new AgentCoverageAreaValidationError(
        'Choose active, searchable coverage areas from the admitted canonical Place suggestions.',
      );
    }
    const hierarchy =
      execution.scope === 'locality'
        ? [label.label, label.city, label.province]
        : execution.scope === 'metro_city'
          ? [label.label, label.province]
          : [label.label];
    return { canonicalLocationId, label: hierarchy.filter(Boolean).join(', ') };
  });
}
