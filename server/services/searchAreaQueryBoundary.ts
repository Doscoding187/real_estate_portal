import { parseCanonicalLocationId } from '../../shared/locationAuthority';
import { encodeCanonicalLocationId } from '../../shared/locationAuthority';
import type { RuntimeSearchScopeKind } from '../../shared/factualRuntimeGeographyBridge';
import type { ResolvedLocation } from './locationResolverService';
import type {
  ResolvedSearchAreaMember,
  SearchAreaResolution,
} from './searchAreaAuthority';

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
  readonly parentCanonicalLocationId?: string;
  readonly parentCityId?: number;
  readonly parentCityName?: string;
  readonly memberCanonicalLocationIds: readonly string[];
  readonly memberScopeKinds?: readonly RuntimeSearchScopeKind[];
  readonly memberRuntimeNaturalKeys?: readonly (string | undefined)[];
  readonly memberFactualLocationIds?: readonly (string | undefined)[];
  readonly memberNames?: readonly string[];
  readonly memberProvinceIds?: readonly (number | undefined)[];
  readonly memberProvinceNames?: readonly (string | undefined)[];
  readonly members?: readonly SearchAreaQueryMember[];
  /** Legacy locality-only arrays retained for existing query consumers. */
  readonly memberSuburbIds: readonly number[];
  readonly memberSuburbNames: readonly string[];
  readonly memberCityIds?: readonly (number | undefined)[];
  readonly memberCityNames?: readonly (string | undefined)[];
}

export interface SearchAreaQueryMember {
  readonly canonicalLocationId: string;
  readonly scopeKind: RuntimeSearchScopeKind;
  readonly runtimeNaturalKey?: string;
  readonly factualLocationId?: string;
  readonly name: string;
  readonly slug: string;
  readonly provinceId?: number;
  readonly provinceName?: string;
  readonly cityId?: number;
  readonly cityName?: string;
  readonly suburbId?: number;
  readonly suburbName?: string;
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

function scopeKindForLevel(level: 'province' | 'city' | 'suburb'): RuntimeSearchScopeKind {
  if (level === 'province') return 'province';
  if (level === 'city') return 'metro_city';
  return 'locality';
}

function slugForName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function toSearchAreaQueryMember(member: ResolvedSearchAreaMember): SearchAreaQueryMember | null {
  const parsed = parseCanonicalLocationId(member.canonicalLocationId);
  if (!parsed || !Number.isSafeInteger(parsed.id)) return null;

  const scopeKind = member.scopeKind ?? scopeKindForLevel(parsed.level);
  if (
    (scopeKind === 'province' && parsed.level !== 'province') ||
    (scopeKind === 'metro_city' && parsed.level !== 'city') ||
    (scopeKind === 'locality' && parsed.level !== 'suburb')
  ) {
    return null;
  }

  const parent = member.parentCanonicalLocationId
    ? parseCanonicalLocationId(member.parentCanonicalLocationId)
    : null;
  if (scopeKind === 'locality' && parent?.level !== 'city') return null;
  if (scopeKind === 'metro_city' && parent && parent.level !== 'province') return null;

  return {
    canonicalLocationId: member.canonicalLocationId,
    scopeKind,
    ...(member.runtimeNaturalKey ? { runtimeNaturalKey: member.runtimeNaturalKey } : {}),
    ...(member.factualLocationId ? { factualLocationId: member.factualLocationId } : {}),
    name: member.name,
    slug: member.slug || slugForName(member.name),
    ...(scopeKind === 'province'
      ? { provinceId: parsed.id, provinceName: member.name }
      : scopeKind === 'metro_city'
        ? {
            cityId: parsed.id,
            cityName: member.name,
            ...(parent
              ? {
                  provinceId: parent.id,
                  ...(member.parentName ? { provinceName: member.parentName } : {}),
                }
              : {}),
          }
        : {
            suburbId: parsed.id,
            suburbName: member.name,
            ...(parent
              ? {
                  cityId: parent.id,
                  ...(member.parentName ? { cityName: member.parentName } : {}),
                }
              : {}),
          }),
  };
}

export function getSearchAreaQueryMembers(
  boundary: SearchAreaQueryBoundary,
): SearchAreaQueryMember[] {
  if (boundary.members) return [...boundary.members];

  let localityNameIndex = 0;
  return boundary.memberCanonicalLocationIds.flatMap<SearchAreaQueryMember>(
    (canonicalLocationId, index) => {
      const parsed = parseCanonicalLocationId(canonicalLocationId);
      if (!parsed) return [];
      const scopeKind = boundary.memberScopeKinds?.[index] ?? scopeKindForLevel(parsed.level);
      const localityFallbackName =
        scopeKind === 'locality' ? boundary.memberSuburbNames[localityNameIndex++] : undefined;
      const name =
        boundary.memberNames?.[index] ||
        localityFallbackName ||
        (scopeKind === 'metro_city' ? boundary.memberCityNames?.[index] : undefined) ||
        canonicalLocationId;

      if (scopeKind === 'province') {
        return [
          {
            canonicalLocationId,
            scopeKind,
            ...(boundary.memberRuntimeNaturalKeys?.[index]
              ? { runtimeNaturalKey: boundary.memberRuntimeNaturalKeys[index] }
              : {}),
            ...(boundary.memberFactualLocationIds?.[index]
              ? { factualLocationId: boundary.memberFactualLocationIds[index] }
              : {}),
            name,
            slug: slugForName(name),
            provinceId: boundary.memberProvinceIds?.[index] ?? parsed.id,
            provinceName: boundary.memberProvinceNames?.[index] || name,
          },
        ];
      }
      if (scopeKind === 'metro_city') {
        return [
          {
            canonicalLocationId,
            scopeKind,
            ...(boundary.memberRuntimeNaturalKeys?.[index]
              ? { runtimeNaturalKey: boundary.memberRuntimeNaturalKeys[index] }
              : {}),
            ...(boundary.memberFactualLocationIds?.[index]
              ? { factualLocationId: boundary.memberFactualLocationIds[index] }
              : {}),
            name,
            slug: slugForName(name),
            cityId: boundary.memberCityIds?.[index] ?? parsed.id,
            cityName: boundary.memberCityNames?.[index] || name,
            provinceId: boundary.memberProvinceIds?.[index] ?? boundary.parentCityId,
            provinceName: boundary.memberProvinceNames?.[index],
          },
        ];
      }
      return [
        {
          canonicalLocationId,
          scopeKind,
          ...(boundary.memberRuntimeNaturalKeys?.[index]
            ? { runtimeNaturalKey: boundary.memberRuntimeNaturalKeys[index] }
            : {}),
          ...(boundary.memberFactualLocationIds?.[index]
            ? { factualLocationId: boundary.memberFactualLocationIds[index] }
            : {}),
          name,
          slug: slugForName(name),
          cityId: boundary.memberCityIds?.[index] ?? boundary.parentCityId,
          cityName: boundary.memberCityNames?.[index] || boundary.parentCityName,
          suburbId: parsed.id,
          suburbName: boundary.memberSuburbNames[index] || name,
          provinceId: boundary.memberProvinceIds?.[index],
          provinceName: boundary.memberProvinceNames?.[index],
        },
      ];
    },
  );
}

function buildBoundaryFromMembers(
  base: SearchAreaQueryBoundary,
  members: readonly SearchAreaQueryMember[],
): SearchAreaQueryBoundary {
  const localities = members.filter(member => member.scopeKind === 'locality');
  const { members: _members, ...baseWithoutMembers } = base;
  return {
    ...baseWithoutMembers,
    memberCanonicalLocationIds: members.map(member => member.canonicalLocationId),
    memberScopeKinds: members.map(member => member.scopeKind),
    memberRuntimeNaturalKeys: members.map(member => member.runtimeNaturalKey),
    memberFactualLocationIds: members.map(member => member.factualLocationId),
    memberNames: members.map(member => member.name),
    memberProvinceIds: members.map(member => member.provinceId),
    memberProvinceNames: members.map(member => member.provinceName),
    memberSuburbIds: localities
      .map(member => member.suburbId)
      .filter((value): value is number => Number.isSafeInteger(value)),
    memberSuburbNames: localities.map(member => member.suburbName || member.name),
    memberCityIds: members.map(member => member.cityId),
    memberCityNames: members.map(member => member.cityName),
  };
}

export function buildSearchAreaQueryBoundary(
  resolution: ResolvedSearchArea,
): SearchAreaQueryBoundary | null {
  const parent = resolution.definition.parent
    ? parseCanonicalLocationId(resolution.definition.parent.canonicalLocationId)
    : null;
  if (parent && (parent.level !== 'city' || !Number.isSafeInteger(parent.id))) return null;

  const members = resolution.definition.members
    .map(toSearchAreaQueryMember)
    .map(member =>
      member &&
      member.scopeKind === 'locality' &&
      !member.cityName &&
      resolution.definition.parent
        ? {
            ...member,
            cityId: parent?.id,
            cityName: resolution.definition.parent.name,
          }
        : member,
    )
    .filter((member): member is SearchAreaQueryMember => Boolean(member));
  if (members.length !== resolution.definition.members.length || members.length === 0) return null;

  return buildBoundaryFromMembers({
    kind: 'canonical_members',
    authorityKey: resolution.definition.authorityKey,
    ...(resolution.definition.parent && parent
      ? {
          parentCanonicalLocationId: resolution.definition.parent.canonicalLocationId,
          parentCityId: parent.id,
          parentCityName: resolution.definition.parent.name,
        }
      : {}),
    memberCanonicalLocationIds: [],
    memberSuburbIds: [],
    memberSuburbNames: [],
  }, members);
}

export function narrowSearchAreaQueryBoundary(
  boundary: SearchAreaQueryBoundary,
  canonicalLocationId: string,
): SearchAreaQueryBoundary | null {
  const members = getSearchAreaQueryMembers(boundary);
  const member = members.find(item => item.canonicalLocationId === canonicalLocationId);
  if (!member) return null;

  return buildBoundaryFromMembers(
    {
      ...boundary,
      authorityKey: `${boundary.authorityKey}:locality:${canonicalLocationId}`,
    },
    [member],
  );
}

export function combineSearchAreaQueryBoundaries(
  boundaries: readonly SearchAreaQueryBoundary[],
): SearchAreaQueryBoundary | null {
  if (boundaries.length === 0) return null;

  const [first] = boundaries;
  const members = new Map<string, SearchAreaQueryMember>();
  boundaries.flatMap(getSearchAreaQueryMembers).forEach(member => {
    const identity = `${member.scopeKind}:${member.canonicalLocationId}`;
    if (!members.has(identity)) members.set(identity, member);
  });

  const sortedMembers = Array.from(members.values()).sort((a, b) =>
    a.canonicalLocationId.localeCompare(b.canonicalLocationId),
  );
  if (sortedMembers.length === 0) return null;

  const parentCanonicalLocationIds = new Set(
    boundaries.map(boundary => boundary.parentCanonicalLocationId).filter(Boolean),
  );
  const parentCityIds = new Set(
    boundaries
      .map(boundary => boundary.parentCityId)
      .filter((value): value is number => Number.isSafeInteger(value)),
  );
  const parentCityNames = new Set(
    boundaries.map(boundary => boundary.parentCityName).filter(Boolean),
  );

  const authorityKey = `search-area-union:v1:${boundaries
    .map(boundary => boundary.authorityKey)
    .sort()
    .join('|')}`;

  return buildBoundaryFromMembers(
    {
      ...first,
      authorityKey,
      ...(parentCanonicalLocationIds.size === 1
        ? { parentCanonicalLocationId: [...parentCanonicalLocationIds][0] }
        : { parentCanonicalLocationId: undefined }),
      ...(parentCityIds.size === 1
        ? { parentCityId: [...parentCityIds][0] }
        : { parentCityId: undefined }),
      ...(parentCityNames.size === 1
        ? { parentCityName: [...parentCityNames][0] }
        : { parentCityName: undefined }),
    },
    sortedMembers,
  );
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
