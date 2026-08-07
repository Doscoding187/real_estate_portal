import { parseCanonicalLocationId } from '../../shared/locationAuthority';
import { encodeCanonicalLocationId } from '../../shared/locationAuthority';
import type { ResolvedLocation } from './locationResolverService';
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

export interface CanonicalLocationQueryMember {
  readonly canonicalLocationId: string;
  readonly level: 'province' | 'city' | 'suburb';
  readonly name: string;
  readonly provinceId: number;
  readonly provinceName: string;
  readonly cityId?: number;
  readonly cityName?: string;
  readonly suburbId?: number;
  readonly suburbName?: string;
}

/**
 * Server-only OR boundary derived from individually resolved canonical
 * locations. The browser supplies only the canonical IDs; this structure is
 * never accepted as request input.
 */
export interface CanonicalLocationQueryBoundary {
  readonly kind: 'canonical_locations';
  readonly authorityKey: string;
  readonly level: 'province' | 'city' | 'suburb';
  readonly parentCanonicalLocationId?: string;
  readonly parentName?: string;
  readonly members: readonly CanonicalLocationQueryMember[];
}

export type PublicSearchQueryBoundary = SearchAreaQueryBoundary | CanonicalLocationQueryBoundary;

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
    authorityKey: `${boundary.authorityKey}:locality:${canonicalLocationId}`,
    memberCanonicalLocationIds: [boundary.memberCanonicalLocationIds[memberIndex]],
    memberSuburbIds: [boundary.memberSuburbIds[memberIndex]],
    memberSuburbNames: [boundary.memberSuburbNames[memberIndex]],
  };
}

export function combineSearchAreaQueryBoundaries(
  boundaries: readonly SearchAreaQueryBoundary[],
): SearchAreaQueryBoundary | null {
  if (boundaries.length === 0) return null;

  const [first] = boundaries;
  if (
    boundaries.some(
      boundary => boundary.parentCanonicalLocationId !== first.parentCanonicalLocationId,
    )
  ) {
    return null;
  }

  const members = new Map<
    string,
    { canonicalLocationId: string; suburbId: number; name: string }
  >();
  boundaries.forEach(boundary => {
    boundary.memberCanonicalLocationIds.forEach((canonicalLocationId, index) => {
      if (!members.has(canonicalLocationId)) {
        members.set(canonicalLocationId, {
          canonicalLocationId,
          suburbId: boundary.memberSuburbIds[index],
          name: boundary.memberSuburbNames[index],
        });
      }
    });
  });

  const sortedMembers = Array.from(members.values()).sort((a, b) =>
    a.canonicalLocationId.localeCompare(b.canonicalLocationId),
  );
  if (sortedMembers.length === 0) return null;

  const authorityKey = `search-area-union:v1:${boundaries
    .map(boundary => boundary.authorityKey)
    .sort()
    .join('|')}`;

  return {
    ...first,
    authorityKey,
    memberCanonicalLocationIds: sortedMembers.map(member => member.canonicalLocationId),
    memberSuburbIds: sortedMembers.map(member => member.suburbId),
    memberSuburbNames: sortedMembers.map(member => member.name),
  };
}

function canonicalIdForResolvedLocation(location: ResolvedLocation): string | null {
  if (location.level === 'province') {
    return encodeCanonicalLocationId('province', location.province.id);
  }
  if (location.level === 'city' && location.city) {
    return encodeCanonicalLocationId('city', location.city.id);
  }
  if (location.level === 'suburb' && location.suburb) {
    return encodeCanonicalLocationId('suburb', location.suburb.id);
  }
  return null;
}

export function buildCanonicalLocationQueryBoundary(
  resolvedLocations: readonly ResolvedLocation[],
  canonicalLocationIds: readonly string[],
): CanonicalLocationQueryBoundary | null {
  if (resolvedLocations.length === 0 || resolvedLocations.length !== canonicalLocationIds.length) {
    return null;
  }

  const members = resolvedLocations.map((location, index) => {
    const canonicalLocationId = canonicalIdForResolvedLocation(location);
    if (
      !canonicalLocationId ||
      canonicalLocationId !== canonicalLocationIds[index] ||
      location.confidence !== 'exact' ||
      location.fallbackLevel !== 'none'
    ) {
      return null;
    }

    if (location.level === 'province') {
      return {
        canonicalLocationId,
        level: 'province' as const,
        name: location.province.name,
        provinceId: location.province.id,
        provinceName: location.province.name,
      } satisfies CanonicalLocationQueryMember;
    }

    if (location.level === 'city' && location.city) {
      return {
        canonicalLocationId,
        level: 'city' as const,
        name: location.city.name,
        provinceId: location.province.id,
        provinceName: location.province.name,
        cityId: location.city.id,
        cityName: location.city.name,
      } satisfies CanonicalLocationQueryMember;
    }

    if (location.level === 'suburb' && location.city && location.suburb) {
      return {
        canonicalLocationId,
        level: 'suburb' as const,
        name: location.suburb.name,
        provinceId: location.province.id,
        provinceName: location.province.name,
        cityId: location.city.id,
        cityName: location.city.name,
        suburbId: location.suburb.id,
        suburbName: location.suburb.name,
      } satisfies CanonicalLocationQueryMember;
    }

    return null;
  });

  if (members.some(member => member === null)) return null;

  const resolvedMembers = members as CanonicalLocationQueryMember[];
  const levels = new Set(resolvedMembers.map(member => member.level));
  if (levels.size !== 1) return null;

  const uniqueIds = new Set(resolvedMembers.map(member => member.canonicalLocationId));
  if (uniqueIds.size !== resolvedMembers.length) {
    return buildCanonicalLocationQueryBoundary(
      [resolvedLocations[0]],
      [resolvedMembers[0].canonicalLocationId],
    );
  }

  const level = resolvedMembers[0].level;
  const parentCanonicalLocationId =
    level === 'city'
      ? encodeCanonicalLocationId('province', resolvedMembers[0].provinceId)
      : level === 'suburb'
        ? encodeCanonicalLocationId('city', resolvedMembers[0].cityId!)
        : undefined;
  const parentName =
    level === 'city'
      ? resolvedMembers[0].provinceName
      : level === 'suburb'
        ? resolvedMembers[0].cityName
        : undefined;

  if (
    resolvedMembers.some(member => {
      const memberParent =
        level === 'city'
          ? encodeCanonicalLocationId('province', member.provinceId)
          : level === 'suburb'
            ? encodeCanonicalLocationId('city', member.cityId!)
            : undefined;
      return memberParent !== parentCanonicalLocationId;
    })
  ) {
    return null;
  }

  const sortedMembers = [...resolvedMembers].sort((a, b) =>
    a.canonicalLocationId.localeCompare(b.canonicalLocationId),
  );
  return {
    kind: 'canonical_locations',
    authorityKey: `canonical-location-union:v1:${level}:${sortedMembers
      .map(member => member.canonicalLocationId)
      .join(',')}`,
    level,
    parentCanonicalLocationId,
    parentName,
    members: sortedMembers,
  };
}
