/**
 * Canonical Place discovery and execution over admitted Place Authority.
 *
 * This is the executable read boundary Slice 3 proves. It reads `place` and
 * `place_name` and nothing else: no legacy `provinces` / `cities` / `suburbs` /
 * `locations` display text, and no provider label used as authority.
 *
 * Three outcomes are first-class. `canonicalResultCount > 0` is never treated as
 * sufficient resolution, because two admitted Places may legitimately share a
 * name. Nothing is ever collapsed to "the first candidate".
 *
 * A no-result or ambiguous query produces a governed, privacy-safe coverage
 * signal in `place_evidence`. That closes contract criterion D6.6, which was
 * open because the only existing signal was console-only. Search volume raises
 * research priority and never creates geographic authority.
 */

import { and, eq, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import { getDb } from '../db';
import {
  place,
  placeEvidence,
  placeName,
  placeRelationship,
  searchAreaMember,
} from '../../drizzle/schema/placeAuthority';
import {
  PLACE_PREFERRED_ROLE,
  isDiscoverable,
  isAliasMatch,
  normalizePlaceQuery,
  projectPlaceScope,
  resolveDiscoveryOutcome,
  type PlaceDiscoveryCandidate,
  type PlaceDiscoveryResponse,
  type PlaceMatchReason,
  type PlaceScopeExecutionResolution,
  type PlaceSearchScope,
} from '../../shared/placeAuthority';

import { PLACE_COVERAGE_SUBJECT_LIMIT, coverageSignalNote } from '../../shared/placeCoverageSignal';
const MAX_RESULTS = 25;

/** Bound the governed coverage subject so a long paste cannot become evidence. */
const coverageSubject = (normalized: string) => normalized.slice(0, PLACE_COVERAGE_SUBJECT_LIMIT);

const rowOf = <T>(rows: unknown[], index: number): T => rows[index] as T;

/**
 * Classify one (Place, name) pair against a normalized query using the governed
 * D8 order. Returns null when the pair does not match at all.
 */
function classifyMatch(
  normalizedQuery: string,
  name: { name: string; normalizedName: string; nameRole: string },
): PlaceMatchReason | null {
  const isPreferred = name.nameRole === PLACE_PREFERRED_ROLE;
  if (name.normalizedName === normalizedQuery)
    return isPreferred ? 'exact_preferred' : 'exact_name';
  if (name.normalizedName.startsWith(normalizedQuery)) {
    return isPreferred ? 'prefix_preferred' : 'prefix_name';
  }
  // A substring hit is the weakest class and is only offered when nothing
  // stronger matched, which the ranking enforces.
  if (name.normalizedName.includes(normalizedQuery)) return 'substring_name';
  return null;
}

/**
 * Record a governed coverage signal for a query that produced no canonical
 * answer, or more than one. This is a research-priority input only: the row has
 * no Place, and it can never become one from here.
 */
async function recordCoverageSignal(kind: 'unresolved_query' | 'ambiguous_query', subject: string) {
  if (!subject) return;
  const db = await getDb();
  const existing = await db
    .select({ id: placeEvidence.id })
    .from(placeEvidence)
    .where(
      and(
        isNull(placeEvidence.placeId),
        eq(placeEvidence.evidenceKind, kind),
        eq(placeEvidence.subject, subject),
      ),
    )
    .limit(1);
  if (existing.length > 0) {
    // A repeat query raises research priority and nothing else. Authority is
    // never created by repetition.
    await db
      .update(placeEvidence)
      .set({ researchPriority: 1 })
      .where(eq(placeEvidence.id, existing[0].id));
    return;
  }
  await db.insert(placeEvidence).values({
    placeId: null,
    evidenceKind: kind,
    evidenceState: 'recorded',
    subject,
    provider: 'property_listify_search',
    researchPriority: 0,
    note: coverageSignalNote(kind),
  });
}

export interface PlaceDiscoveryOptions {
  /** Include Search Areas in the response, typed separately. Never merged. */
  includeSearchAreas?: boolean;
  /** Record a governed coverage signal for no_result / ambiguous outcomes. */
  recordCoverage?: boolean;
}

export async function discoverPlaces(
  rawQuery: string,
  options: PlaceDiscoveryOptions = {},
): Promise<PlaceDiscoveryResponse> {
  const normalizedQuery = normalizePlaceQuery(rawQuery);
  if (!normalizedQuery) {
    return { outcome: 'no_result', query: normalizedQuery, results: [], coverageSignal: null };
  }

  const db = await getDb();

  // Only searchable, live Places are candidates. Publication eligibility is a
  // separate stricter fact and is never used to admit or exclude a search result.
  const rows = await db
    .select({
      placeId: place.placeId,
      placeType: place.placeType,
      placeClassification: place.placeClassification,
      verificationStatus: place.verificationStatus,
      lifecycleStatus: place.lifecycleStatus,
      searchEligible: place.searchEligible,
      publicationEligible: place.publicationEligible,
      searchScope: place.searchScope,
      name: placeName.name,
      normalizedName: placeName.normalizedName,
      nameRole: placeName.nameRole,
    })
    .from(place)
    .innerJoin(placeName, eq(placeName.placeId, place.placeId))
    .where(
      and(
        eq(place.searchEligible, 1),
        ne(place.lifecycleStatus, 'retired'),
        eq(placeName.nameState, 'active'),
        eq(placeName.isSearchable, 1),
        or(
          eq(placeName.normalizedName, normalizedQuery),
          sql`${placeName.normalizedName} LIKE ${`${normalizedQuery}%`}`,
          sql`${placeName.normalizedName} LIKE ${`%${normalizedQuery}%`}`,
        ),
      ),
    )
    .limit(400);

  // Keep the best-ranked name match per Place, so one Place is never returned
  // twice because several of its names matched.
  const bestPerPlace = new Map<string, (typeof rows)[number]>();
  const matchRank: Record<PlaceMatchReason, number> = {
    exact_preferred: 0,
    exact_name: 1,
    prefix_preferred: 2,
    prefix_name: 3,
    substring_name: 4,
  };
  for (const row of rows) {
    const reason = classifyMatch(normalizedQuery, {
      name: row.name,
      normalizedName: row.normalizedName,
      nameRole: row.nameRole,
    });
    if (!reason) continue;
    const current = bestPerPlace.get(row.placeId);
    if (!current) {
      bestPerPlace.set(row.placeId, row);
      continue;
    }
    const currentReason = classifyMatch(normalizedQuery, {
      name: current.name,
      normalizedName: current.normalizedName,
      nameRole: current.nameRole,
    });
    if (matchRank[reason] < matchRank[currentReason ?? 'substring_name']) {
      bestPerPlace.set(row.placeId, row);
    }
  }

  const placeIds = [...bestPerPlace.keys()];
  const contexts = placeIds.length ? await loadPlaceContexts(placeIds) : new Map();
  const searchableNames = placeIds.length ? await loadSearchableNames(placeIds) : new Map();

  const candidates: PlaceDiscoveryCandidate[] = [];
  for (const placeId of placeIds) {
    const row = bestPerPlace.get(placeId)!;
    if (
      !isDiscoverable({
        searchEligible: row.searchEligible === 1,
        lifecycleStatus: row.lifecycleStatus,
      })
    ) {
      continue;
    }
    const preferredRow = searchableNames
      .get(placeId)
      ?.find(item => item.nameRole === PLACE_PREFERRED_ROLE);
    const context = contexts.get(placeId);
    candidates.push({
      placeId: row.placeId,
      placeType: row.placeType,
      placeClassification: row.placeClassification,
      verificationStatus: row.verificationStatus,
      lifecycleStatus: row.lifecycleStatus,
      searchEligible: row.searchEligible === 1,
      publicationEligible: row.publicationEligible === 1,
      searchScope: (row.searchScope as PlaceSearchScope | null) ?? null,
      preferredPublicLabel: preferredRow?.name ?? null,
      matchedName: row.name,
      matchedNormalizedName: row.normalizedName,
      matchedNameRole: row.nameRole,
      matchReason:
        classifyMatch(normalizedQuery, {
          name: row.name,
          normalizedName: row.normalizedName,
          nameRole: row.nameRole,
        }) ?? 'substring_name',
      searchableNames: (searchableNames.get(placeId) ?? [])
        .filter(item => item.nameRole !== PLACE_PREFERRED_ROLE)
        .map(item => item.name),
      context: context ?? {
        provincePlaceId: null,
        cityPlaceId: null,
        localityPlaceId: null,
        administrativeContext: null,
      },
    });
  }

  const resolved = resolveDiscoveryOutcome(normalizedQuery, candidates);
  const response: PlaceDiscoveryResponse = {
    ...resolved,
    results: resolved.results.slice(0, MAX_RESULTS),
  };

  if (options.recordCoverage !== false && response.coverageSignal) {
    await recordCoverageSignal(response.coverageSignal.kind, coverageSubject(normalizedQuery));
  }

  return response;
}

/** Load the disambiguating administrative context for candidate Places. */
async function loadPlaceContexts(placeIds: string[]) {
  const db = await getDb();
  const chains = await Promise.all(placeIds.map(id => loadContainmentAncestry(id)));
  const contexts = new Map<
    string,
    {
      provincePlaceId: string | null;
      cityPlaceId: string | null;
      localityPlaceId: string | null;
      administrativeContext: string | null;
    }
  >();
  const ancestorIds = [...new Set(chains.flat().map(node => node.placeId))];
  const names = ancestorIds.length ? await loadPreferredNames(ancestorIds) : new Map();

  for (const [index, placeId] of placeIds.entries()) {
    // Scoped ancestors, root first. Only these can name an administrative level.
    const scoped = chains[index]
      .slice()
      .reverse()
      .filter((node): node is { placeId: string; scope: PlaceSearchScope } => node.scope !== null);
    const province = scoped.find(node => node.scope === 'province');
    const city = scoped.find(node => node.scope === 'metro_city');
    const locality = scoped.find(node => node.scope === 'locality');
    const label = (id?: string) => (id ? (names.get(id) ?? null) : null);
    // The chain contains ancestors only. Keep province and context-only
    // municipalities: neither is the selected Place's own label, and both
    // can disambiguate same-name Places in a national catalog.
    const contextParts = chains[index]
      .slice()
      .reverse()
      .map(node => label(node.placeId))
      .filter(Boolean);
    contexts.set(placeId, {
      provincePlaceId: province?.placeId ?? null,
      cityPlaceId: city?.placeId ?? null,
      localityPlaceId: locality?.placeId ?? null,
      administrativeContext: contextParts.length > 0 ? contextParts.join(' / ') : null,
    });
  }
  return contexts;
}

/** Preferred public labels for a set of Places, used only for display context. */
async function loadPreferredNames(placeIds: string[]) {
  const db = await getDb();
  const rows = await db
    .select({ placeId: placeName.placeId, name: placeName.name })
    .from(placeName)
    .where(
      and(
        inArray(placeName.placeId, placeIds),
        eq(placeName.nameRole, PLACE_PREFERRED_ROLE),
        eq(placeName.nameState, 'active'),
      ),
    );
  const names = new Map<string, string>();
  for (const row of rows) if (!names.has(row.placeId)) names.set(row.placeId, row.name);
  return names;
}

/** Load the other searchable names of a Place, for display and alias reporting. */
async function loadSearchableNames(placeIds: string[]) {
  const db = await getDb();
  const rows = await db
    .select({
      placeId: placeName.placeId,
      name: placeName.name,
      nameRole: placeName.nameRole,
    })
    .from(placeName)
    .where(
      and(
        inArray(placeName.placeId, placeIds),
        eq(placeName.isSearchable, 1),
        eq(placeName.nameState, 'active'),
      ),
    );
  const grouped = new Map<string, { name: string; nameRole: string }[]>();
  for (const row of rows) {
    const list = grouped.get(row.placeId) ?? [];
    list.push({ name: row.name, nameRole: row.nameRole });
    grouped.set(row.placeId, list);
  }
  return grouped;
}

/** An existing authorized database or transaction used for one assignment. */
export type PlaceReadDatabase = Pick<Awaited<ReturnType<typeof getDb>>, 'select'>;

/**
 * Exact geographic execution from one canonical Place identity.
 *
 * Fail-closed by contract: a retired, non-searchable or scope-less Place, an
 * unresolved parent, a parent that is not genuinely coarser, or a containment
 * cycle are all refused. There is no fallback to a name, a legacy handle, or
 * display text, because a Place-authoritative request that cannot execute must
 * fail rather than quietly become something else. A supplied transaction owns
 * every read, including the complete ancestry walk.
 */
export async function executePlace(
  placeId: string,
  database?: PlaceReadDatabase,
  options: { lock?: boolean } = {},
): Promise<PlaceScopeExecutionResolution> {
  const db = database ?? (await getDb());
  const query = db
    .select({
      placeId: place.placeId,
      lifecycleStatus: place.lifecycleStatus,
      searchEligible: place.searchEligible,
      searchScope: place.searchScope,
    })
    .from(place)
    .where(eq(place.placeId, placeId))
    .limit(1);
  const rows = await (options.lock ? query.for('update') : query);
  if (rows.length === 0) return { ok: false, reason: 'unknown_place' };
  const row = rows[0];

  let ancestry: Awaited<ReturnType<typeof loadContainmentAncestry>>;
  try {
    ancestry = await loadContainmentAncestry(placeId, db, options.lock);
  } catch (error) {
    if (error instanceof PlaceContainmentError) {
      return { ok: false, reason: error.reason };
    }
    throw error;
  }
  return projectPlaceScope(
    {
      placeId: row.placeId,
      lifecycleStatus: row.lifecycleStatus,
      searchEligible: row.searchEligible === 1,
      searchScope: (row.searchScope as PlaceSearchScope | null) ?? null,
    },
    ancestry,
  );
}

/**
 * Walk the single authoritative containment chain to its root, nearest parent
 * first, recording each parent's declared scope. A parent with no search scope
 * is a context-only intermediary and is returned with a null scope rather than
 * dropped, so the caller can distinguish "no scope" from "no parent".
 *
 * Only `administratively_contains` is ever read, the walk is bounded, and a
 * repeated Place, missing referent, multiple parents or exhausted bound is a
 * refusal, so a corrupted graph cannot silently produce a shorter path.
 */
class PlaceContainmentError extends Error {
  constructor(readonly reason: 'containment_cycle' | 'unresolved_parent') {
    super(`Invalid Place containment: ${reason}`);
  }
}

async function loadContainmentAncestry(
  placeId: string,
  database?: PlaceReadDatabase,
  lock = false,
): Promise<{ placeId: string; scope: PlaceSearchScope | null }[]> {
  const db = database ?? (await getDb());
  const ancestry: { placeId: string; scope: PlaceSearchScope | null }[] = [];
  const seen = new Set<string>([placeId]);
  let cursor: string | null = placeId;
  for (let depth = 0; depth < 8 && cursor; depth += 1) {
    const parentQuery = db
      .select({ toPlaceId: placeRelationship.toPlaceId })
      .from(placeRelationship)
      .where(
        and(
          eq(placeRelationship.fromPlaceId, cursor),
          eq(placeRelationship.relationshipType, 'administratively_contains'),
        ),
      )
      .limit(2);
    const parent = await (lock ? parentQuery.for('update') : parentQuery);
    if (parent.length === 0) return ancestry;
    if (parent.length !== 1) throw new PlaceContainmentError('unresolved_parent');
    const parentId = parent[0].toPlaceId;
    if (seen.has(parentId)) throw new PlaceContainmentError('containment_cycle');
    seen.add(parentId);
    const parentPlaceQuery = db
      .select({ scope: place.searchScope, lifecycleStatus: place.lifecycleStatus })
      .from(place)
      .where(eq(place.placeId, parentId))
      .limit(1);
    const parentRow = await (lock ? parentPlaceQuery.for('update') : parentPlaceQuery);
    if (parentRow.length === 0 || parentRow[0].lifecycleStatus !== 'active') {
      throw new PlaceContainmentError('unresolved_parent');
    }
    if (
      parentRow[0].scope !== null &&
      !['province', 'metro_city', 'locality'].includes(parentRow[0].scope)
    ) {
      throw new PlaceContainmentError('unresolved_parent');
    }
    ancestry.push({
      placeId: parentId,
      scope: (parentRow[0].scope as PlaceSearchScope | null) ?? null,
    });
    cursor = parentId;
  }
  throw new PlaceContainmentError('unresolved_parent');
}

/**
 * Search Areas are returned only when explicitly requested, and only in their own
 * typed shape. A Search Area id is never a Place id, and a Search Area membership
 * never establishes factual containment.
 */
export async function discoverSearchAreasForPlace(placeId: string) {
  const db = await getDb();
  const rows = await db
    .select({
      searchAreaId: searchAreaMember.searchAreaId,
      state: searchAreaMember.memberState,
      evidenceSource: searchAreaMember.evidenceSource,
    })
    .from(searchAreaMember)
    .where(
      and(eq(searchAreaMember.placeId, placeId), ne(searchAreaMember.memberState, 'excluded')),
    );
  return rows.map(row => ({
    kind: 'search_area' as const,
    searchAreaId: row.searchAreaId,
    memberState: row.state,
    evidenceSource: row.evidenceSource,
    // Explicitly not a Place identity and not containment.
    isCanonicalPlace: false,
    establishesPlaceContainment: false,
  }));
}

export const __testing = { classifyMatch, coverageSubject };
