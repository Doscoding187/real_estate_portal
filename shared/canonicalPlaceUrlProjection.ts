/**
 * Deterministic public paths projected from the admitted Place Authority.
 *
 * A path is a route for one Place identity. `settlement_within` supplies a
 * searchable city/town context where reviewed; otherwise an admitted
 * administrative municipality may disambiguate the locality path. A
 * municipality path segment is context only and never changes search scope.
 */

export type CanonicalPlaceUrlScope = 'province' | 'metro_city' | 'locality';
export type CanonicalPlaceUrlContextRelationship =
  | 'settlement_within'
  | 'administratively_contains';

export interface CanonicalPlaceUrlContext {
  place_id: string;
  name: string;
  place_type: string;
  search_scope: CanonicalPlaceUrlScope | null;
  relationship_type: CanonicalPlaceUrlContextRelationship;
  path_segment: string;
}

export interface CanonicalPlaceUrlEntry {
  place_id: string;
  territory_id: string;
  preferred_public_name: string;
  place_type: string;
  search_scope: CanonicalPlaceUrlScope;
  search_eligible: true;
  publication_eligible: boolean;
  verification_status: string;
  lifecycle_status: 'active';
  path: string;
  path_segment: string;
  province_place_id: string;
  province_name: string;
  province_slug: string;
  path_context: CanonicalPlaceUrlContext | null;
}

export interface CanonicalPlaceUrlTerritoryInput {
  territory_id: string;
  display_name: string;
  admission_version: string;
  package_manifest_path: string;
  package_manifest_sha256: string;
  package_artifacts: Array<{ path: string; sha256: string }>;
  places: Array<Record<string, any>>;
  names: Array<Record<string, any>>;
  relationships: Array<Record<string, any>>;
}

export interface CanonicalPlaceUrlProjection {
  schema_version: '0.1';
  projection_id: 'property-listify-national-canonical-place-url-projection-v0.1';
  source_registry: { path: string; sha256: string };
  path_policy: {
    version: 'canonical-place-url-policy-v0.1';
    city_scopes: 'province/place';
    locality_parent_order: readonly [
      'reviewed_settlement_within',
      'admitted_administrative_context',
      'province_localities_namespace',
    ];
    collision_rule: 'append-stable-place-id-suffix-to-every-colliding-terminal-segment';
    legacy_aliases: 'none';
  };
  source_packages: Array<{
    territory_id: string;
    admission_version: string;
    package_manifest_path: string;
    package_manifest_sha256: string;
    package_artifacts: Array<{ path: string; sha256: string }>;
  }>;
  summary: {
    route_entries: number;
    by_scope: Record<CanonicalPlaceUrlScope, number>;
    settlement_context_localities: number;
    administrative_context_localities: number;
    namespace_localities: number;
    collision_disambiguations: number;
  };
  entries: CanonicalPlaceUrlEntry[];
}

const URL_SCOPES = new Set<CanonicalPlaceUrlScope>([
  'province',
  'metro_city',
  'locality',
]);

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function slugifyCanonicalPlaceUrl(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function placePathSegment(name: string, placeId: string): string {
  const slug = slugifyCanonicalPlaceUrl(name);
  return slug || 'place-' + placeId.slice(-8);
}

function requireValue<T>(value: T | undefined | null, description: string): T {
  if (value === undefined || value === null || value === '') {
    throw new Error('canonical-place-url projection refused: ' + description + ' is missing');
  }
  return value;
}

function appendIdentitySuffix(path: string, placeId: string): string {
  const parts = path.split('/');
  const terminal = parts.pop();
  if (!terminal) throw new Error('canonical-place-url projection refused: invalid path ' + path);
  parts.push(terminal + '--' + placeId.slice(-8));
  return parts.join('/');
}

function resolveCollidingPaths<T extends { place_id: string; path: string }>(
  entries: T[],
): { entries: T[]; collisionDisambiguations: number } {
  const byPath = new Map<string, T[]>();
  for (const entry of entries) {
    const list = byPath.get(entry.path) ?? [];
    list.push(entry);
    byPath.set(entry.path, list);
  }
  let collisionDisambiguations = 0;
  const resolved = entries.map(entry => {
    if ((byPath.get(entry.path)?.length ?? 0) < 2) return entry;
    collisionDisambiguations += 1;
    return { ...entry, path: appendIdentitySuffix(entry.path, entry.place_id) };
  });
  const seen = new Set<string>();
  for (const entry of resolved) {
    if (seen.has(entry.path)) {
      throw new Error('canonical-place-url projection refused: path collision remains at ' + entry.path);
    }
    seen.add(entry.path);
  }
  return { entries: resolved, collisionDisambiguations };
}

/**
 * Build the national route projection from the exact admitted packages named
 * by the territory registry. No path is copied from a prior runtime or URL
 * registry, and the function refuses unresolved or ambiguous parent claims.
 */
export function buildCanonicalPlaceUrlProjection(input: {
  registryPath: string;
  registrySha256: string;
  territories: CanonicalPlaceUrlTerritoryInput[];
}): CanonicalPlaceUrlProjection {
  const entries: CanonicalPlaceUrlEntry[] = [];
  const sourcePackages: CanonicalPlaceUrlProjection['source_packages'] = [];
  const seenPlaceIds = new Set<string>();
  const provincePaths = new Set<string>();
  let settlementContextLocalities = 0;
  let administrativeContextLocalities = 0;
  let namespaceLocalities = 0;
  let collisionDisambiguations = 0;
  const byScope: Record<CanonicalPlaceUrlScope, number> = {
    province: 0,
    metro_city: 0,
    locality: 0,
  };

  const sortedTerritories = [...input.territories].sort((a, b) =>
    compareText(a.territory_id, b.territory_id),
  );

  for (const territory of sortedTerritories) {
    sourcePackages.push({
      territory_id: territory.territory_id,
      admission_version: territory.admission_version,
      package_manifest_path: territory.package_manifest_path,
      package_manifest_sha256: territory.package_manifest_sha256,
      package_artifacts: [...territory.package_artifacts].sort((a, b) =>
        compareText(a.path, b.path),
      ),
    });

    const places = new Map<string, Record<string, any>>();
    for (const place of territory.places) {
      const placeId = requireValue(String(place.place_id ?? ''), 'place_id');
      if (places.has(placeId) || seenPlaceIds.has(placeId)) {
        throw new Error('canonical-place-url projection refused: duplicate Place id ' + placeId);
      }
      places.set(placeId, place);
      seenPlaceIds.add(placeId);
    }

    const namesByPlaceId = new Map<string, string>();
    for (const name of territory.names) {
      if (
        name.name_role !== 'preferred_public' ||
        name.name_state !== 'active' ||
        name.is_preferred_public === 0
      ) {
        continue;
      }
      const placeId = String(name.place_id ?? '');
      if (!places.has(placeId)) {
        throw new Error('canonical-place-url projection refused: preferred name has no Place ' + placeId);
      }
      const current = namesByPlaceId.get(placeId);
      if (current && current !== name.name) {
        throw new Error('canonical-place-url projection refused: multiple preferred names for ' + placeId);
      }
      namesByPlaceId.set(placeId, String(name.name));
    }

    const relationshipsByChild = new Map<
      string,
      { relationshipType: CanonicalPlaceUrlContextRelationship; parentPlaceId: string }[]
    >();
    for (const relationship of territory.relationships) {
      const relationshipType = relationship.relationship_type;
      if (
        relationshipType !== 'administratively_contains' &&
        relationshipType !== 'settlement_within'
      ) {
        continue;
      }
      const childId = String(relationship.from_place_id ?? '');
      const parentId = String(relationship.to_place_id ?? '');
      if (!places.has(childId) || !places.has(parentId)) {
        throw new Error(
          'canonical-place-url projection refused: unresolved relationship ' + childId + ' → ' + parentId,
        );
      }
      if (
        relationshipType === 'settlement_within' &&
        (relationship.basis !== 'reviewed_settlement_membership' ||
          Number(relationship.search_scope_authorized) !== 0)
      ) {
        throw new Error(
          'canonical-place-url projection refused: settlement path context is not a reviewed, non-authorizing attestation for ' +
            childId,
        );
      }
      const list = relationshipsByChild.get(childId) ?? [];
      list.push({ relationshipType, parentPlaceId: parentId });
      relationshipsByChild.set(childId, list);
    }

    const scopedPlaces = [...places.values()].filter(place => {
      return (
        URL_SCOPES.has(place.search_scope as CanonicalPlaceUrlScope) &&
        place.lifecycle_status === 'active' &&
        Number(place.search_eligible) === 1
      );
    });
    for (const place of scopedPlaces) {
      const name = requireValue(namesByPlaceId.get(String(place.place_id)), 'preferred public name');
      placePathSegment(name, String(place.place_id));
    }

    const roots = scopedPlaces.filter(place => place.search_scope === 'province');
    if (roots.length !== 1) {
      throw new Error(
        'canonical-place-url projection refused: territory ' + territory.territory_id +
          ' must have exactly one searchable province root; found ' + roots.length,
      );
    }
    const root = roots[0];
    const provincePlaceId = String(root.place_id);
    const provinceName = namesByPlaceId.get(provincePlaceId)!;
    const provinceSlug = placePathSegment(provinceName, provincePlaceId);
    const provincePath = '/' + provinceSlug;
    if (provincePaths.has(provincePath)) {
      throw new Error('canonical-place-url projection refused: duplicate province path ' + provincePath);
    }
    provincePaths.add(provincePath);

    const metroPlaces = scopedPlaces.filter(place => place.search_scope === 'metro_city');
    const metroCandidates = metroPlaces.map(place => ({
      place_id: String(place.place_id),
      path:
        '/' + provinceSlug + '/' +
        placePathSegment(namesByPlaceId.get(String(place.place_id))!, String(place.place_id)),
    }));
    const resolvedMetro = resolveCollidingPaths(metroCandidates);
    collisionDisambiguations += resolvedMetro.collisionDisambiguations;
    const metroPaths = new Map(resolvedMetro.entries.map(entry => [entry.place_id, entry.path]));
    const metroSegments = new Map(
      [...metroPaths.entries()].map(([placeId, path]) => [placeId, path.split('/').pop()!]),
    );

    const administrativeContextIds = new Set<string>();
    const localityContext = new Map<
      string,
      { parentPlaceId: string; relationshipType: CanonicalPlaceUrlContextRelationship } | null
    >();
    for (const place of scopedPlaces.filter(candidate => candidate.search_scope === 'locality')) {
      const placeId = String(place.place_id);
      const relationships = relationshipsByChild.get(placeId) ?? [];
      const settlementParents = relationships.filter(edge => edge.relationshipType === 'settlement_within');
      const administrativeParents = relationships.filter(
        edge => edge.relationshipType === 'administratively_contains',
      );
      if (settlementParents.length > 1 || administrativeParents.length > 1) {
        throw new Error(
          'canonical-place-url projection refused: ambiguous path parent for ' + placeId,
        );
      }
      if (settlementParents.length === 1) {
        const parentId = settlementParents[0].parentPlaceId;
        const parent = places.get(parentId)!;
        if (
          parent.search_scope !== 'metro_city' ||
          parent.lifecycle_status !== 'active' ||
          Number(parent.search_eligible) !== 1 ||
          !metroSegments.has(parentId)
        ) {
          throw new Error(
            'canonical-place-url projection refused: settlement parent is not an active searchable city/town for ' +
              placeId,
          );
        }
        localityContext.set(placeId, {
          parentPlaceId: parentId,
          relationshipType: 'settlement_within',
        });
        settlementContextLocalities += 1;
        continue;
      }

      const adminParent = administrativeParents[0];
      if (!adminParent || adminParent.parentPlaceId === provincePlaceId) {
        localityContext.set(placeId, null);
        namespaceLocalities += 1;
        continue;
      }
      const parent = places.get(adminParent.parentPlaceId)!;
      if (
        parent.lifecycle_status !== 'active' ||
        !['district_municipality', 'local_municipality'].includes(String(parent.place_type))
      ) {
        throw new Error(
          'canonical-place-url projection refused: non-province administrative context is not a municipality for ' +
            placeId,
        );
      }
      requireValue(namesByPlaceId.get(adminParent.parentPlaceId), 'administrative context preferred name');
      administrativeContextIds.add(adminParent.parentPlaceId);
      localityContext.set(placeId, {
        parentPlaceId: adminParent.parentPlaceId,
        relationshipType: 'administratively_contains',
      });
      administrativeContextLocalities += 1;
    }

    const contextSlugs = new Map<string, string>();
    const contextsBySlug = new Map<string, string[]>();
    for (const placeId of administrativeContextIds) {
      const base = placePathSegment(namesByPlaceId.get(placeId)!, placeId);
      const list = contextsBySlug.get(base) ?? [];
      list.push(placeId);
      contextsBySlug.set(base, list);
    }
    for (const [base, ids] of contextsBySlug) {
      for (const placeId of ids) {
        contextSlugs.set(
          placeId,
          ids.length > 1 ? base + '--' + placeId.slice(-8) : base,
        );
      }
    }

    const rawEntries: Array<
      Omit<CanonicalPlaceUrlEntry, 'path' | 'path_segment'> & { path: string }
    > = [];
    for (const place of scopedPlaces) {
      const placeId = String(place.place_id);
      const name = namesByPlaceId.get(placeId)!;
      const ownSlug = placePathSegment(name, placeId);
      const scope = place.search_scope as CanonicalPlaceUrlScope;
      let path: string;
      let context: CanonicalPlaceUrlContext | null = null;

      if (scope === 'province') {
        path = provincePath;
      } else if (scope === 'metro_city') {
        path = metroPaths.get(placeId)!;
      } else {
        const selectedContext = localityContext.get(placeId) ?? null;
        if (selectedContext) {
          const parent = places.get(selectedContext.parentPlaceId)!;
          const parentName = namesByPlaceId.get(selectedContext.parentPlaceId)!;
          const parentSegment =
            selectedContext.relationshipType === 'settlement_within'
              ? metroSegments.get(selectedContext.parentPlaceId)!
              : contextSlugs.get(selectedContext.parentPlaceId)!;
          path = '/' + provinceSlug + '/' + parentSegment + '/' + ownSlug;
          context = {
            place_id: selectedContext.parentPlaceId,
            name: parentName,
            place_type: String(parent.place_type),
            search_scope: URL_SCOPES.has(parent.search_scope as CanonicalPlaceUrlScope)
              ? (parent.search_scope as CanonicalPlaceUrlScope)
              : null,
            relationship_type: selectedContext.relationshipType,
            path_segment: parentSegment,
          };
        } else {
          path = '/' + provinceSlug + '/localities/' + ownSlug;
        }
      }

      rawEntries.push({
        place_id: placeId,
        territory_id: territory.territory_id,
        preferred_public_name: name,
        place_type: String(place.place_type),
        search_scope: scope,
        search_eligible: true,
        publication_eligible: Number(place.publication_eligible) === 1,
        verification_status: String(place.verification_status),
        lifecycle_status: 'active',
        path,
        province_place_id: provincePlaceId,
        province_name: provinceName,
        province_slug: provinceSlug,
        path_context: context,
      });
    }

    const resolvedPaths = resolveCollidingPaths(rawEntries);
    collisionDisambiguations += resolvedPaths.collisionDisambiguations;
    for (const entry of resolvedPaths.entries) {
      const finalPath = entry.path;
      const finalSegment = finalPath.split('/').pop()!;
      entries.push({ ...entry, path: finalPath, path_segment: finalSegment });
      byScope[entry.search_scope] += 1;
    }
  }

  entries.sort((left, right) =>
    compareText(left.path, right.path) || compareText(left.place_id, right.place_id),
  );
  const allPaths = new Set<string>();
  for (const entry of entries) {
    if (allPaths.has(entry.path)) {
      throw new Error('canonical-place-url projection refused: national path collision at ' + entry.path);
    }
    allPaths.add(entry.path);
  }

  return {
    schema_version: '0.1',
    projection_id: 'property-listify-national-canonical-place-url-projection-v0.1',
    source_registry: { path: input.registryPath, sha256: input.registrySha256 },
    path_policy: {
      version: 'canonical-place-url-policy-v0.1',
      city_scopes: 'province/place',
      locality_parent_order: [
        'reviewed_settlement_within',
        'admitted_administrative_context',
        'province_localities_namespace',
      ],
      collision_rule: 'append-stable-place-id-suffix-to-every-colliding-terminal-segment',
      legacy_aliases: 'none',
    },
    source_packages: sourcePackages,
    summary: {
      route_entries: entries.length,
      by_scope: byScope,
      settlement_context_localities: settlementContextLocalities,
      administrative_context_localities: administrativeContextLocalities,
      namespace_localities: namespaceLocalities,
      collision_disambiguations: collisionDisambiguations,
    },
    entries,
  };
}
