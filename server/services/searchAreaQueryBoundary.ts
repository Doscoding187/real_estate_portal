import { parseCanonicalLocationId } from '../../shared/locationAuthority';
import type { SearchAreaResolution } from './searchAreaAuthority';

/**
 * Server-only query boundary derived from a validated Search Area definition.
 *
 * The browser may send a stable Search Area ID, but it never sends this
 * boundary or any of its member IDs. The authority key keeps inventory caches
 * tied to the versioned definition that produced the boundary.
 */
export interface SearchAreaQueryBoundary {
  readonly kind: 'canonical_members';
  readonly authorityKey: string;
  readonly parentCanonicalLocationId: string;
  readonly parentCityId: number;
  readonly parentCityName: string;
  readonly memberCanonicalLocationIds: readonly string[];
  readonly memberSuburbIds: readonly number[];
  readonly memberSuburbNames: readonly string[];
}

type ResolvedSearchArea = Extract<SearchAreaResolution, { status: 'available' | 'preview' }>;

export function buildSearchAreaQueryBoundary(
  resolution: ResolvedSearchArea,
): SearchAreaQueryBoundary | null {
  const parent = parseCanonicalLocationId(resolution.definition.parent.canonicalLocationId);
  if (parent?.level !== 'city' || !Number.isSafeInteger(parent.id)) return null;

  const members = resolution.definition.members.map(member => {
    const parsed = parseCanonicalLocationId(member.canonicalLocationId);
    if (parsed?.level !== 'suburb' || !Number.isSafeInteger(parsed.id)) return null;

    return {
      canonicalLocationId: member.canonicalLocationId,
      suburbId: parsed.id,
      name: member.name,
    };
  });

  if (members.some(member => member === null) || members.length === 0) return null;

  const resolvedMembers = members as Array<{
    canonicalLocationId: string;
    suburbId: number;
    name: string;
  }>;

  return {
    kind: 'canonical_members',
    authorityKey: resolution.definition.authorityKey,
    parentCanonicalLocationId: resolution.definition.parent.canonicalLocationId,
    parentCityId: parent.id,
    parentCityName: resolution.definition.parent.name,
    memberCanonicalLocationIds: resolvedMembers.map(member => member.canonicalLocationId),
    memberSuburbIds: resolvedMembers.map(member => member.suburbId),
    memberSuburbNames: resolvedMembers.map(member => member.name),
  };
}

export function narrowSearchAreaQueryBoundary(
  boundary: SearchAreaQueryBoundary,
  canonicalLocationId: string,
): SearchAreaQueryBoundary | null {
  const memberIndex = boundary.memberCanonicalLocationIds.indexOf(canonicalLocationId);
  if (memberIndex < 0) return null;

  return {
    ...boundary,
    memberCanonicalLocationIds: [boundary.memberCanonicalLocationIds[memberIndex]],
    memberSuburbIds: [boundary.memberSuburbIds[memberIndex]],
    memberSuburbNames: [boundary.memberSuburbNames[memberIndex]],
  };
}
