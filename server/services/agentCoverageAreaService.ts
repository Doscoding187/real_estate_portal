import {
  AGENT_COVERAGE_AREA_MAX,
  parseCanonicalAgentCoverageLocationId,
  type AgentCoverageArea,
} from '../../shared/agentCoverageArea';
import { locationResolver, type ResolvedLocation } from './locationResolverService';

export class AgentCoverageAreaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentCoverageAreaValidationError';
  }
}

function coverageLabel(location: ResolvedLocation): string {
  if (location.level === 'suburb' && location.suburb && location.city) {
    return [location.suburb.name, location.city.name, location.province.name].join(', ');
  }
  if (location.level === 'city' && location.city) {
    return [location.city.name, location.province.name].join(', ');
  }
  return location.province.name;
}

function resolvedLocationMatchesCanonicalId(
  canonicalLocationId: string,
  location: ResolvedLocation,
): boolean {
  const parsed = parseCanonicalAgentCoverageLocationId(canonicalLocationId);
  if (!parsed || parsed.level !== location.level) return false;

  if (location.level === 'province') return location.province.id === parsed.id;
  if (location.level === 'city') return location.city?.id === parsed.id;
  return location.suburb?.id === parsed.id;
}

/**
 * Canonicalize a submitted agent coverage selection before it reaches the
 * agents table. Labels in browser input are never trusted: the exact typed
 * identity is resolved through the governed location authority and the server
 * writes its current hierarchy label.
 */
export async function resolveSubmittedAgentCoverageAreas(
  values: readonly string[],
): Promise<AgentCoverageArea[]> {
  if (values.length > AGENT_COVERAGE_AREA_MAX) {
    throw new AgentCoverageAreaValidationError(
      `Choose no more than ${AGENT_COVERAGE_AREA_MAX} coverage areas.`,
    );
  }

  const canonicalLocationIds: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const parsed = parseCanonicalAgentCoverageLocationId(value);
    if (!parsed) {
      throw new AgentCoverageAreaValidationError(
        'Choose coverage areas from the current Property Listify location suggestions.',
      );
    }
    if (seen.has(parsed.canonicalLocationId)) continue;
    seen.add(parsed.canonicalLocationId);
    canonicalLocationIds.push(parsed.canonicalLocationId);
  }

  return Promise.all(
    canonicalLocationIds.map(async canonicalLocationId => {
      const resolved = await locationResolver.resolvePublicLocation({ locationId: canonicalLocationId });
      if (
        resolved.status !== 'resolved' ||
        !resolved.location ||
        !resolvedLocationMatchesCanonicalId(canonicalLocationId, resolved.location)
      ) {
        throw new AgentCoverageAreaValidationError(
          'Choose coverage areas from the current Property Listify location suggestions.',
        );
      }

      return {
        canonicalLocationId,
        label: coverageLabel(resolved.location),
      };
    }),
  );
}
