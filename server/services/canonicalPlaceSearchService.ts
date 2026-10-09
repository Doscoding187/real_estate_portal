import type { CanonicalPlaceSearchLabel } from '../../shared/canonicalPlaceSearch';
export type { CanonicalPlaceSearchLabel } from '../../shared/canonicalPlaceSearch';
import { and, eq, inArray } from 'drizzle-orm';
import { place, placeName, placeRelationship } from '../../drizzle/schema/placeAuthority';
import {
  PLACE_PREFERRED_ROLE,
  projectPlaceScope,
  type PlaceScopeExecution,
  type PlaceScopeExecutionResolution,
  type PlaceSearchScope,
} from '../../shared/placeAuthority';
import { getDb } from '../db';
import type { PlaceReadDatabase } from './placeDiscoveryService';

/** Edward's 2026-10-07 consumer projection; it does not change factual edges. */
export const PLACE_INVENTORY_SCOPE_POLICY = 'place-inventory-scope-2026-10-07-v1';

export interface SearchPlaceNode {
  placeId: string;
  lifecycleStatus: string;
  searchEligible: number;
  searchScope: string | null;
  placeType: string;
}

/** Complete containment validation, including context-only intermediaries. */
export function projectSearchPlace(
  placeId: string,
  nodes: ReadonlyMap<string, SearchPlaceNode>,
  parents: ReadonlyMap<string, readonly string[]>,
): PlaceScopeExecutionResolution {
  const selected = nodes.get(placeId);
  if (!selected) return { ok: false, reason: 'unknown_place' };
  const ancestry: { placeId: string; scope: PlaceSearchScope | null }[] = [];
  const seen = new Set([placeId]);
  let cursor = placeId;
  for (let depth = 0; depth < 8; depth++) {
    const edges = parents.get(cursor) ?? [];
    if (!edges.length) {
      return projectPlaceScope(
        {
          ...selected,
          searchEligible: selected.searchEligible === 1,
          searchScope: selected.searchScope as PlaceSearchScope | null,
        },
        ancestry,
      );
    }
    if (edges.length !== 1) return { ok: false, reason: 'unresolved_parent' };
    const parentId = edges[0];
    if (seen.has(parentId)) return { ok: false, reason: 'containment_cycle' };
    seen.add(parentId);
    const parent = nodes.get(parentId);
    if (!parent || parent.lifecycleStatus !== 'active')
      return { ok: false, reason: 'unresolved_parent' };
    ancestry.push({ placeId: parentId, scope: parent.searchScope as PlaceSearchScope | null });
    cursor = parentId;
  }
  return { ok: false, reason: 'unresolved_parent' };
}

export interface CanonicalPlaceSearchProjection {
  executions: Map<string, PlaceScopeExecution>;
  labels: Map<string, CanonicalPlaceSearchLabel>;
}

export interface PlaceSearchProjectionOptions {
  /** Explicit identities whose complete ancestry must be checked. */
  placeIds: readonly string[];
  /** Only inventory scope resolution expands a selected province's descendants. */
  includeProvinceMembers?: boolean;
}

const PLACE_READ_BATCH_SIZE = 500;
const nodeSelection = {
  placeId: place.placeId,
  placeType: place.placeType,
  lifecycleStatus: place.lifecycleStatus,
  searchEligible: place.searchEligible,
  searchScope: place.searchScope,
};

/** Read fresh indexed facts for the requested identities, including every parent edge. */
async function loadRequestedGraph(
  database: PlaceReadDatabase,
  options: PlaceSearchProjectionOptions,
): Promise<{ nodes: SearchPlaceNode[]; edges: { from: string; to: string }[] }> {
  const nodes = new Map<string, SearchPlaceNode>();
  const parents = new Map<string, string[]>();
  const attempted = new Set<string>();
  const readNodes = async (ids: readonly string[]) => {
    const pending = [...new Set(ids)].filter(id => !attempted.has(id));
    for (let offset = 0; offset < pending.length; offset += PLACE_READ_BATCH_SIZE) {
      const batch = pending.slice(offset, offset + PLACE_READ_BATCH_SIZE);
      batch.forEach(id => attempted.add(id));
      const rows = await database
        .select({ ...nodeSelection, parentId: placeRelationship.toPlaceId })
        .from(place)
        .leftJoin(
          placeRelationship,
          and(
            eq(placeRelationship.fromPlaceId, place.placeId),
            eq(placeRelationship.relationshipType, 'administratively_contains'),
          ),
        )
        .where(inArray(place.placeId, batch));
      for (const { parentId, ...node } of rows) {
        nodes.set(node.placeId, node);
        if (parentId) parents.set(node.placeId, [...(parents.get(node.placeId) ?? []), parentId]);
      }
    }
  };
  const readAncestry = async (ids: readonly string[]) => {
    let frontier = [...ids];
    // Match projectSearchPlace's bounded chain; a deeper chain still refuses.
    for (let depth = 0; frontier.length && depth <= 8; depth++) {
      await readNodes(frontier);
      frontier = [...new Set(frontier.flatMap(id => parents.get(id) ?? []))].filter(
        id => !attempted.has(id),
      );
    }
  };
  await readAncestry(options.placeIds);
  if (options.includeProvinceMembers) {
    let frontier = [...new Set(options.placeIds)].filter(id => {
      const resolution = projectSearchPlace(id, nodes, parents);
      return resolution.ok && resolution.execution.scope === 'province';
    });
    const visited = new Set(frontier);
    // Traverse factual containment through context-only nodes, never market edges.
    for (let depth = 0; frontier.length && depth < 8; depth++) {
      const children = new Set<string>();
      for (let offset = 0; offset < frontier.length; offset += PLACE_READ_BATCH_SIZE) {
        const rows = await database
          .select({ placeId: placeRelationship.fromPlaceId })
          .from(placeRelationship)
          .where(
            and(
              inArray(
                placeRelationship.toPlaceId,
                frontier.slice(offset, offset + PLACE_READ_BATCH_SIZE),
              ),
              eq(placeRelationship.relationshipType, 'administratively_contains'),
            ),
          );
        for (const row of rows) if (!visited.has(row.placeId)) children.add(row.placeId);
      }
      frontier = [...children];
      frontier.forEach(id => visited.add(id));
      // Includes competing/outside parents so partial graph reads cannot admit bad chains.
      await readAncestry(frontier);
      // No executable scope is finer than locality. A descendant beneath that
      // scoped ancestor would fail projectPlaceScope, even through context nodes.
      frontier = frontier.filter(id => nodes.get(id)?.searchScope !== 'locality');
    }
  }
  return {
    nodes: [...nodes.values()],
    edges: [...parents].flatMap(([from, ids]) => ids.map(to => ({ from, to }))),
  };
}

/** Fresh authority projection; omitted options are reserved for full-graph diagnostics. */
export async function loadCanonicalPlaceSearchProjection(
  database?: PlaceReadDatabase,
  options?: PlaceSearchProjectionOptions,
): Promise<CanonicalPlaceSearchProjection> {
  const databaseReader = database ?? (await getDb());
  const { nodes, edges } = options
    ? await loadRequestedGraph(databaseReader, options)
    : {
        nodes: await databaseReader.select(nodeSelection).from(place),
        edges: await databaseReader
          .select({ from: placeRelationship.fromPlaceId, to: placeRelationship.toPlaceId })
          .from(placeRelationship)
          .where(eq(placeRelationship.relationshipType, 'administratively_contains')),
      };
  const nodeMap = new Map<string, SearchPlaceNode>(nodes.map(node => [node.placeId, node]));
  const parents = new Map<string, string[]>();
  for (const edge of edges) parents.set(edge.from, [...(parents.get(edge.from) ?? []), edge.to]);
  const executions = new Map<string, PlaceScopeExecution>();
  for (const node of nodes) {
    const resolution = projectSearchPlace(node.placeId, nodeMap, parents);
    if (resolution.ok) executions.set(node.placeId, resolution.execution);
  }
  const ids = Array.from(
    new Set(
      Array.from(executions.values()).flatMap(execution =>
        [execution.placeId, execution.provincePlaceId, execution.cityPlaceId].filter(
          (id): id is string => Boolean(id),
        ),
      ),
    ),
  );
  const names: { placeId: string; name: string }[] = [];
  for (let offset = 0; offset < ids.length; offset += PLACE_READ_BATCH_SIZE) {
    names.push(
      ...(await databaseReader
        .select({
          placeId: placeName.placeId,
          name: placeName.name,
        })
        .from(placeName)
        .where(
          and(
            inArray(placeName.placeId, ids.slice(offset, offset + PLACE_READ_BATCH_SIZE)),
            eq(placeName.nameRole, PLACE_PREFERRED_ROLE),
            eq(placeName.nameState, 'active'),
          ),
        )),
    );
  }
  const preferred = new Map<string, string>();
  const invalid = new Set<string>();
  for (const name of names) {
    if (preferred.has(name.placeId) || !name.name.trim()) invalid.add(name.placeId);
    preferred.set(name.placeId, name.name.trim());
  }
  const labels = new Map<string, CanonicalPlaceSearchLabel>();
  for (const execution of executions.values()) {
    const required = [execution.placeId, execution.provincePlaceId, execution.cityPlaceId].filter(
      (id): id is string => Boolean(id),
    );
    if (required.some(id => !preferred.has(id) || invalid.has(id))) continue;
    const selected = preferred.get(execution.placeId)!;
    labels.set(execution.placeId, {
      canonicalPlaceId: execution.placeId,
      label: selected,
      placeType: nodeMap.get(execution.placeId)!.placeType,
      scope: execution.scope,
      province: preferred.get(execution.provincePlaceId)!,
      city:
        execution.scope === 'metro_city'
          ? selected
          : execution.cityPlaceId
            ? preferred.get(execution.cityPlaceId)!
            : '',
      locality: execution.scope === 'locality' ? selected : '',
    });
  }
  return { executions, labels };
}

export function canonicalPlaceSearchMembers(
  selected: PlaceScopeExecution,
  projection: CanonicalPlaceSearchProjection,
): string[] {
  if (selected.scope === 'province') {
    return Array.from(projection.executions.values())
      .filter(
        member =>
          member.provincePlaceId === selected.placeId && projection.labels.has(member.placeId),
      )
      .map(member => member.placeId)
      .sort();
  }
  // v1 has no reviewed descendant city membership. Neither containment nor
  // municipality/market associations authorize widening a city or locality.
  return projection.labels.has(selected.placeId) ? [selected.placeId] : [];
}
