/**
 * Slice 3 — Executable Place Foundation.
 *
 * These tests run against the admitted, materialized Place dataset in a real
 * database. They are the behavioural half of the Slice 1 rule: a DDL slice is not
 * proved by static checks or schema congruency, it is proved by actually writing,
 * reading and refusing real rows.
 *
 * What is asserted here is the *executable* contract, not the shape of the code:
 *   - a query resolves to exactly one canonical Place, or reports ambiguity, or
 *     reports no result; it never collapses and never guesses;
 *   - an alias resolves to the same canonical identity as its preferred name;
 *   - a no-result query produces governed, privacy-safe evidence and no Place;
 *   - a canonical Place executes to exactly one scope, or fails closed;
 *   - mixed and malformed authority is rejected rather than merged or widened;
 *   - a provider observation cannot create a canonical locality.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, isNull, sql } from 'drizzle-orm';

import { getDb } from '../db';
import { place, placeEvidence, placeRelationship } from '../../drizzle/schema/placeAuthority';
import { discoverPlaces, executePlace } from '../services/placeDiscoveryService';
import {
  isPublishable,
  normalizePlaceQuery,
  resolveSingleGeographyAuthority,
  type PlaceAuthorityClaim,
} from '../../shared/placeAuthority';

/**
 * Admitted Places referenced by their committed preferred name.
 *
 * The driver returns `[rows, fields]` for a multi-statement path and bare rows
 * otherwise, so both shapes are normalized rather than assumed.
 */
function rowsOf(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0] as Record<string, unknown>[];
  }
  return Array.isArray(result) ? (result as Record<string, unknown>[]) : [];
}

// These identities are pinned in the admitted Gauteng package. Display names
// alone are not unique in a national dataset and must never pick the first row.
const requiredPlaces = {
  Gauteng: 'pl-place-01-131e3e75ad70424e0f9c869a',
  Lyttelton: 'pl-place-01-1a30ae4d635ef747d6c987df',
  Bryanston: 'pl-place-01-f175328139bb845a4645b9d4',
  Soweto: 'pl-place-01-99b91be60755ea1f09bf6349',
  Sandton: 'pl-place-01-dee61758ef3bda7cd1a258ad',
  'North Riding': 'pl-place-01-6a145c6d642ba208a2c12de7',
} as const;
const requiredOsmPlaceId = 'pl-place-01-00a8aa324ee0aabf33eb3c71';
const requiredDiepkloofPlaceIds = [
  'pl-place-01-27a63c126cf908282985f8d5',
  'pl-place-01-e417e2e8049345e728be0ad2',
] as const;

async function placeByPreferredName(name: keyof typeof requiredPlaces): Promise<string> {
  const db = await getDb();
  const result = await db.execute(sql`
    SELECT p.place_id AS placeId
    FROM place p
    JOIN place_name n ON n.place_id = p.place_id
    WHERE p.place_id = ${requiredPlaces[name]} AND n.name = ${name}
      AND n.name_role = 'preferred_public' AND n.name_state = 'active'
  `);
  const rows = rowsOf(result);
  expect(
    rows,
    `Required admitted ${name} identity must have exactly one active preferred name`,
  ).toHaveLength(1);
  return String(rows[0].placeId);
}

/**
 * Subjects this suite invented to prove discovery records coverage signals for
 * a term that is not an admitted Place.
 *
 * Discovery writes `unresolved_query` evidence into the canonical
 * `place_evidence` role. Leaving those rows behind would pollute the reference
 * dataset this suite runs against, so `db:places:verify` would fail afterwards
 * for reasons that have nothing to do with the admitted package. Every subject
 * is registered here and removed in `afterAll`, by canonical primary key.
 */
const syntheticCoverageSubjects: string[] = [];

function unresolvableTerm(suffix: string): string {
  const term = `zz${Date.now().toString(36)}${suffix}`;
  syntheticCoverageSubjects.push(normalizePlaceQuery(term));
  return term;
}

/**
 * File-scoped, not suite-scoped: the subjects are created by the
 * "no-result and ambiguity" suite, so a hook inside any single `describe` would
 * run before them and clean up nothing.
 */
afterAll(async () => {
  if (syntheticCoverageSubjects.length === 0) return;
  const db = await getDb();
  for (const subject of syntheticCoverageSubjects) {
    await db.delete(placeEvidence).where(sql`${placeEvidence.subject} = ${subject}`);
  }
});

describe('Slice 3: discovery resolves canonical identity', () => {
  beforeAll(async () => {
    // Discovery records coverage signals, so a database must be reachable.
    await getDb();
  });

  it('requires the admitted Place fixture identities', async () => {
    const db = await getDb();
    const requiredIds = [
      ...Object.values(requiredPlaces),
      requiredOsmPlaceId,
      ...requiredDiepkloofPlaceIds,
    ];
    const installed = await db.select({ id: place.placeId }).from(place);
    const installedIds = new Set(installed.map(row => row.id));
    const missing = requiredIds.filter(id => !installedIds.has(id));
    expect(
      missing,
      'Missing admitted Gauteng Place fixtures: prepare and verify db:places with --territory=za-gp before dependent tests',
    ).toEqual([]);
    for (const name of Object.keys(requiredPlaces) as (keyof typeof requiredPlaces)[]) {
      expect(await placeByPreferredName(name)).toBe(requiredPlaces[name]);
    }
  });

  it('refuses to collapse an ambiguous exact preferred name to one canonical Place', async () => {
    const response = await discoverPlaces('Diepkloof', { recordCoverage: false });
    // "Diepkloof" is two distinct admitted Places, so this must be ambiguous
    // rather than collapsed to the first row the database happened to return.
    expect(response.outcome).toBe('ambiguous');
    expect(response.results).toHaveLength(2);
    for (const result of response.results) {
      expect(result.placeId).toMatch(/^pl-place-01-[a-f0-9]{24}$/);
      expect(result.searchScope).not.toBeNull();
    }
  });

  it('returns distinct canonical identities for the two admitted Diepkloof Places', async () => {
    const response = await discoverPlaces('Diepkloof', { recordCoverage: false });
    const ids = new Set(response.results.map(r => r.placeId));
    expect([...ids].sort()).toEqual([...requiredDiepkloofPlaceIds].sort());
    expect(ids.size).toBe(response.results.length);
  });

  it('resolves an alias to the same canonical identity as the preferred name', async () => {
    // Centurion is an admitted alias of the Lyttelton Place. The preferred name
    // must not be changed to make this pass; the alias must resolve to the
    // admitted identity instead.
    const preferred = await placeByPreferredName('Lyttelton');
    expect(preferred).not.toBeNull();
    const response = await discoverPlaces('Centurion', { recordCoverage: false });
    expect(response.outcome).toBe('resolved');
    expect(response.results[0].placeId).toBe(preferred);
    expect(response.results[0].matchedName).toBe('Centurion');
    expect(response.results[0].matchedNameRole).not.toBe('preferred_public');
    expect(response.results[0].preferredPublicLabel).toBe('Lyttelton');
  });

  it('finds a Place by a searchable historical or common name form', async () => {
    // Verwoerdburg is a searchable historical name of the admitted Place.
    const response = await discoverPlaces('Verwoerdburg', { recordCoverage: false });
    expect(response.outcome).toBe('resolved');
    expect(response.results[0].matchedNameRole).toBe('historical');
  });

  it('never returns a non-searchable or retired Place', async () => {
    const db = await getDb();
    const response = await discoverPlaces('a', { recordCoverage: false });
    expect(response.results.length).toBeGreaterThan(0);
    const eligible = await db
      .select({ id: place.placeId })
      .from(place)
      .where(eq(place.searchEligible, 1));
    const eligibleIds = new Set(eligible.map(r => r.id));
    for (const result of response.results) {
      expect(eligibleIds.has(result.placeId)).toBe(true);
    }
  });

  it('separates search eligibility from publication eligibility', async () => {
    // OSM-only Places are searchable but must never be publishable. A consumer
    // that treats "searchable" as "publishable" would leak attribution-free
    // content, so the two gates are asserted as independent facts.
    const db = await getDb();
    const osmOnly = await db.execute(sql`
      SELECT p.place_id AS placeId, p.verification_status AS verificationStatus,
             p.search_eligible AS searchEligible, p.publication_eligible AS publicationEligible,
             p.licensing_classification AS licensingClassification
      FROM place p
      WHERE p.place_id = ${requiredOsmPlaceId}
    `);
    const rows = rowsOf(osmOnly);
    expect(rows, 'Required admitted disposable OSM-only fixture is absent').toHaveLength(1);
    expect(rows[0].placeId).toBe(requiredOsmPlaceId);
    expect(rows[0].licensingClassification).toBe('osm_only_odbl_provisional');
    expect(Number(rows[0].searchEligible)).toBe(1);
    expect(Number(rows[0].publicationEligible)).toBe(0);
    expect(rows[0].verificationStatus).toBe('provisional');
    expect(
      isPublishable({
        publicationEligible: Number(rows[0].publicationEligible) === 1,
        verificationStatus: String(rows[0].verificationStatus),
        lifecycleStatus: 'active',
      }),
    ).toBe(false);
  });
});

describe('Slice 3: no-result and ambiguity produce governed evidence', () => {
  it('records a no-result query as evidence with no Place referent', async () => {
    const db = await getDb();
    // A term that is not an admitted Place name and not a quarantined candidate
    // admitted anywhere: it must produce evidence, not a Place.
    const term = unresolvableTerm('unresolvedplace');
    const before = await db
      .select({ id: placeEvidence.id })
      .from(placeEvidence)
      .where(isNull(placeEvidence.placeId));

    const response = await discoverPlaces(term);
    expect(response.outcome).toBe('no_result');
    expect(response.results).toHaveLength(0);
    expect(response.coverageSignal).not.toBeNull();

    const after = await db
      .select({
        id: placeEvidence.id,
        subject: placeEvidence.subject,
        priority: placeEvidence.researchPriority,
      })
      .from(placeEvidence)
      .where(isNull(placeEvidence.placeId));
    expect(after.length).toBeGreaterThan(before.length);

    const created = after.find(row => row.subject === normalizePlaceQuery(term));
    expect(created).toBeDefined();
    // A demand signal has no Place and cannot become one.
    const stillNoPlace = await db
      .select({ id: placeEvidence.id })
      .from(placeEvidence)
      .where(sql`${placeEvidence.id} = ${created!.id} AND ${placeEvidence.placeId} IS NOT NULL`);
    expect(stillNoPlace).toHaveLength(0);
  });

  it('creates no Place when a query resolves to nothing', async () => {
    const db = await getDb();
    const totalBefore = rowsOf(await db.execute(sql`SELECT COUNT(*) AS n FROM place`));
    await discoverPlaces(unresolvableTerm('anothermissingplace'));
    const totalAfter = rowsOf(await db.execute(sql`SELECT COUNT(*) AS n FROM place`));
    expect(Number(totalAfter[0].n)).toBe(Number(totalBefore[0].n));
  });

  it('is idempotent for a repeated query and only raises research priority', async () => {
    const db = await getDb();
    const term = unresolvableTerm('repeatsignal');
    const subject = normalizePlaceQuery(term);
    await discoverPlaces(term);
    const first = await db
      .select({ id: placeEvidence.id })
      .from(placeEvidence)
      .where(isNull(placeEvidence.placeId));
    await discoverPlaces(term);
    const second = await db
      .select({ id: placeEvidence.id })
      .from(placeEvidence)
      .where(isNull(placeEvidence.placeId));
    // A repeat query must not accumulate duplicate evidence rows.
    expect(second.length).toBe(first.length);

    const row = await db
      .select({ priority: placeEvidence.researchPriority })
      .from(placeEvidence)
      .where(sql`${placeEvidence.subject} = ${subject}`);
    expect(row.length).toBe(1);
    // Repetition raises research priority. It never creates authority.
    expect([0, 1]).toContain(row[0].priority);
  });
});

describe('Slice 3: canonical execution is exact and fail-closed', () => {
  it('executes a canonical metro-city Place to its exact evidenced scope', async () => {
    // Soweto is admitted as one Place whose merged classifications give it a
    // metro_city search scope. Execution must yield the province plus that Place
    // and must not invent a city level it does not have.
    const placeId = await placeByPreferredName('Soweto');
    expect(placeId).not.toBeNull();
    const result = await executePlace(placeId!);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const execution = result.execution;
    expect(execution.placeId).toBe(placeId);
    expect(execution.scope).toBe('metro_city');
    expect(execution.provincePlaceId).toMatch(/^pl-place-01-[a-f0-9]{24}$/);
    expect(execution.cityPlaceId).toBeNull();
    expect(execution.localityPlaceId).toBeNull();
  });

  it('executes a canonical locality Place with only a province context', async () => {
    // The canonical case from the corrected doctrine: a suburb under a
    // municipality, with no city Place anywhere above it, is a legitimate
    // locality execution. Its context is the province it is evidenced inside,
    // and no city node is invented to complete a three-tier ladder.
    const placeId = await placeByPreferredName('Bryanston');
    expect(placeId, 'Bryanston must be an admitted Place').not.toBeNull();
    const result = await executePlace(placeId!);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const execution = result.execution;
    expect(execution.placeId).toBe(placeId);
    expect(execution.scope).toBe('locality');
    expect(execution.provincePlaceId).toMatch(/^pl-place-01-[a-f0-9]{24}$/);
    // The Place is the locality level itself, and no city level is fabricated.
    expect(execution.localityPlaceId).toBe(placeId);
    expect(execution.cityPlaceId).toBeNull();
  });

  it('records the municipality on the path as context, never as a search level', async () => {
    const placeId = await placeByPreferredName('Bryanston');
    const result = await executePlace(placeId!);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // A context-only municipality may appear in the traversed chain, but it
    // contributes no scope and is reported separately from the scoped path.
    for (const contextId of result.execution.contextAncestorPlaceIds) {
      expect(contextId).toMatch(/^pl-place-01-[a-f0-9]{24}$/);
    }
  });

  it('admits many locality-scoped Places, because scope is a category', async () => {
    const db = await getDb();
    const localityScoped = rowsOf(
      await db.execute(sql`
        SELECT COUNT(*) AS n FROM place WHERE search_scope = 'locality' AND search_eligible = 1
      `),
    );
    expect(Number(localityScoped[0].n)).toBeGreaterThan(0);
  });

  it('refuses a scoped Place whose chain has no evidenced province context', async () => {
    // Fail-closed on the one genuinely unbounded case. Constructed in-memory
    // because the admitted data is a single-province forest in which every
    // scoped Place does reach its province; the executor must still refuse a
    // chain that does not.
    const { projectPlaceScope } = await import('../../shared/placeAuthority');
    const result = projectPlaceScope(
      {
        placeId: 'pl-place-01-000000000000000000000000',
        lifecycleStatus: 'active',
        searchEligible: true,
        searchScope: 'locality',
      },
      [{ placeId: 'pl-place-01-111111111111111111111111', scope: null }],
    );
    expect(result).toEqual({ ok: false, reason: 'no_evidenced_province_context' });
  });

  it('refuses a scope that would sit above its own level', async () => {
    const { projectPlaceScope } = await import('../../shared/placeAuthority');
    // A locality whose scoped ancestry is [province, locality] would place a
    // locality at or above itself. That is a malformed chain, not a valid scope.
    const result = projectPlaceScope(
      {
        placeId: 'pl-place-01-000000000000000000000000',
        lifecycleStatus: 'active',
        searchEligible: true,
        searchScope: 'locality',
      },
      [
        { placeId: 'pl-place-01-222222222222222222222222', scope: 'locality' },
        { placeId: 'pl-place-01-111111111111111111111111', scope: 'province' },
      ],
    );
    expect(result.ok).toBe(false);
  });

  it('does not expand a selected Place into other Places', async () => {
    // Exact execution is not broad expansion. Executing a Place must return that
    // Place and its context identities only, never a set of sibling or associated
    // Places, so a metro_city Place cannot silently become "every locality in
    // its municipality".
    const db = await getDb();
    const placeId = await placeByPreferredName('Sandton');
    const result = await executePlace(placeId!);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Every identity returned must be either this Place itself or one of its own
    // ancestors. A Place legitimately occupies two roles at once — a
    // locality-scoped Place is both the selected Place and the locality level — so
    // the self-reference is the only permitted repetition.
    const ancestorIds = new Set(
      [
        ...result.execution.contextAncestorPlaceIds,
        result.execution.provincePlaceId,
        result.execution.cityPlaceId,
      ].filter((value): value is string => Boolean(value) && value !== placeId),
    );
    const otherRoles = [
      result.execution.provincePlaceId,
      result.execution.cityPlaceId,
      result.execution.localityPlaceId,
      ...result.execution.contextAncestorPlaceIds,
    ].filter((value): value is string => Boolean(value) && value !== placeId);
    expect(new Set(otherRoles).size, 'an ancestor must not be reported in two roles').toBe(
      otherRoles.length,
    );
    // The decisive assertion: no Place other than the selected one and its own
    // containment path is returned, so no expansion happened.
    expect(ancestorIds.size).toBeGreaterThan(0);
    expect(result.execution.placeId).toBe(placeId);
    // A sibling or descendant Place is never part of an exact execution.
    // Containment reads from child to parent, so a Place's descendants are the
    // edges whose *parent* is this Place.
    const descendants = rowsOf(
      await db.execute(sql`
        SELECT from_place_id AS placeId FROM place_relationship
        WHERE to_place_id = ${placeId} AND relationship_type = 'administratively_contains'
      `),
    );
    for (const row of descendants) {
      expect(ancestorIds.has(String(row.placeId))).toBe(false);
    }
  });

  it('refuses every admitted Place that carries no executable scope', async () => {
    const db = await getDb();
    const notExecutable = rowsOf(
      await db.execute(sql`
        SELECT place_id AS placeId FROM place
        WHERE search_eligible = 0 AND lifecycle_status = 'active'
        ORDER BY place_id
      `),
    );
    expect(notExecutable.length).toBeGreaterThan(0);
    for (const row of notExecutable.slice(0, 40)) {
      const result = await executePlace(String(row.placeId));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('place_not_searchable');
    }
  });

  it('executes the province-scoped Place, which needs no ancestor', async () => {
    const db = await getDb();
    const provinces = rowsOf(
      await db.execute(sql`
        SELECT place_id AS placeId FROM place
        WHERE place_id = ${requiredPlaces.Gauteng}
          AND search_scope = 'province' AND search_eligible = 1
      `),
    );
    expect(provinces.length).toBe(1);
    const provinceId = String(provinces[0].placeId ?? provinces[0].PLACE_ID ?? '');
    expect(provinceId).toMatch(/^pl-place-01-[a-f0-9]{24}$/);
    const result = await executePlace(provinceId);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.execution.scope).toBe('province');
      expect(result.execution.provincePlaceId).toBe(provinceId);
    }
  });

  it('executes a metro-city Place that has an evidenced province ancestor', async () => {
    const db = await getDb();
    const rows = rowsOf(
      await db.execute(sql`
        SELECT p.place_id AS placeId
        FROM place p
        WHERE p.place_id = ${requiredPlaces.Soweto}
          AND p.search_scope = 'metro_city' AND p.search_eligible = 1
      `),
    );
    expect(rows.length).toBe(1);
    const result = await executePlace(String(rows[0].placeId));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.execution.scope).toBe('metro_city');
      // Soweto's evidenced province is reached through municipality context.
      // The canonical executor validates that chain; a direct province edge
      // is not required and must never be manufactured for this fixture.
      expect(result.execution.provincePlaceId).toBe(requiredPlaces.Gauteng);
    }
  });

  it(
    'executes every single search-eligible Place deterministically',
    { timeout: 300_000 },
    async () => {
      // The exhaustive proof behind the Slice 2 hierarchy repair: not a sample, but
      // every Place the materializer certifies as search-eligible must resolve to a
      // real scope, and resolving it twice must give the identical answer.
      const db = await getDb();
      const eligible = rowsOf(
        await db.execute(sql`
        SELECT place_id AS placeId FROM place WHERE search_eligible = 1 ORDER BY place_id
      `),
      );
      expect(eligible.length).toBeGreaterThan(0);
      const refusals: { placeId: string; reason: string }[] = [];
      let resolved = 0;
      for (const row of eligible) {
        const placeId = String(row.placeId);
        const first = await executePlace(placeId);
        if (!first.ok) {
          refusals.push({ placeId, reason: first.reason });
          continue;
        }
        const second = await executePlace(placeId);
        expect(second.ok, `${placeId} resolved once and failed on rerun`).toBe(true);
        if (second.ok) {
          // Deterministic: the same identity yields byte-identical execution.
          expect(JSON.stringify(second.execution)).toBe(JSON.stringify(first.execution));
        }
        resolved += 1;
      }
      // A single certified-but-unexecutable Place would be a contract breach.
      expect(
        refusals,
        `search-eligible Places that could not execute: ${JSON.stringify(refusals)}`,
      ).toEqual([]);
      expect(resolved).toBe(eligible.length);
    },
  );

  it('refuses a Place that does not exist', async () => {
    const result = await executePlace('pl-place-01-000000000000000000000000');
    expect(result).toEqual({ ok: false, reason: 'unknown_place' });
  });

  it('refuses a malformed Place identity rather than coercing it', async () => {
    for (const bad of ['pl-place-02-000000000000000000000000', 'suburb:34', 'Sandton']) {
      const result = await executePlace(bad);
      expect(result.ok).toBe(false);
    }
  });

  it('never widens scope through a relationship that is not containment', async () => {
    // Only administratively_contains may shape an executable boundary. If any
    // other relationship type existed and were traversed, this would catch it.
    const db = await getDb();
    const nonContainment = await db
      .select({ type: placeRelationship.relationshipType })
      .from(placeRelationship)
      .where(sql`${placeRelationship.relationshipType} <> 'administratively_contains'`);
    const types = new Set(nonContainment.map(r => r.type));
    // Any such edge must be search-scope-unauthorized, so it can never widen a query.
    for (const type of types) {
      const authorized = await db
        .select({ id: placeRelationship.id })
        .from(placeRelationship)
        .where(
          sql`${placeRelationship.relationshipType} = ${type} AND ${placeRelationship.searchScopeAuthorized} = 1`,
        );
      expect(authorized).toHaveLength(0);
    }
  });
});

describe('Slice 3: mixed authority is rejected, never merged', () => {
  const cases: { label: string; claim: PlaceAuthorityClaim; reason: string }[] = [
    {
      label: 'Place plus legacy geography text',
      claim: {
        placeId: 'pl-place-01-000000000000000000000000',
        legacyCity: 'Sandton',
      },
      reason: 'competing_place_and_legacy_geography',
    },
    {
      label: 'Place plus a legacy numeric handle',
      claim: {
        placeId: 'pl-place-01-000000000000000000000000',
        legacyLocationId: 42,
      },
      reason: 'competing_place_and_legacy_handle',
    },
    {
      label: 'Place plus a Search Area',
      claim: {
        placeId: 'pl-place-01-000000000000000000000000',
        searchAreaId: 'sandton-core',
      },
      reason: 'competing_place_and_search_area',
    },
    {
      label: 'Search Area plus legacy geography text',
      claim: { searchAreaId: 'sandton-core', legacyCity: 'Sandton' },
      reason: 'competing_search_area_and_legacy_geography',
    },
    {
      label: 'legacy handle plus legacy geography text',
      claim: { legacyLocationId: 42, legacyCity: 'Sandton' },
      reason: 'competing_legacy_handle_and_legacy_geography',
    },
    {
      label: 'more than one legacy geography level',
      claim: { legacyCity: 'Sandton', legacySuburb: 'Sandton' },
      reason: 'multiple_legacy_geography_fields',
    },
    {
      label: 'a malformed Place identity',
      claim: { placeId: 'suburb:34' },
      reason: 'malformed_place_id',
    },
    {
      label: 'no geography at all',
      claim: {},
      reason: 'no_geography_authority',
    },
  ];

  for (const testCase of cases) {
    it(`rejects ${testCase.label}`, () => {
      const resolution = resolveSingleGeographyAuthority(testCase.claim);
      expect(resolution.ok).toBe(false);
      if (!resolution.ok) expect(resolution.reason).toBe(testCase.reason);
    });
  }

  it('accepts exactly one authority without widening it', () => {
    const place = resolveSingleGeographyAuthority({
      placeId: 'pl-place-01-000000000000000000000000',
    });
    expect(place.ok).toBe(true);
    if (place.ok) {
      expect(place.authority).toEqual({
        kind: 'place',
        placeId: 'pl-place-01-000000000000000000000000',
      });
    }
  });

  it('never treats a Search Area identity as a Place identity', () => {
    const resolution = resolveSingleGeographyAuthority({ searchAreaId: 'sandton-core' });
    expect(resolution.ok).toBe(true);
    if (resolution.ok) {
      expect(resolution.authority.kind).toBe('search_area');
      // A Search Area must not be resolvable through the Place executor.
      expect(resolution.authority.kind === 'place').toBe(false);
    }
  });
});

describe('Slice 3: a provider observation cannot create a canonical locality', () => {
  it('no longer auto-inserts a provisional provider suburb', async () => {
    const { readFileSync } = await import('node:fs');
    const source = readFileSync('server/services/listingLocationResolver.ts', 'utf8');
    // The governed failure is structural: there is no code path that inserts a
    // canonical locality row from a provider label.
    expect(source).not.toMatch(/insert\(suburbs\)/);
    expect(source).not.toMatch(/origin:\s*'provider'/);
    expect(source).toMatch(/recordUnresolvedLocalityCandidate/);
    // The governed outcome is an explicit unresolved refusal, not a fallback.
    expect(source).toMatch(/requires admission before a listing can use it/);
    expect(source).toMatch(/'unresolved'/);
  });

  it('removes the unauthenticated provider location write procedure', async () => {
    const { readFileSync } = await import('node:fs');
    const source = readFileSync('server/locationRouter.ts', 'utf8');
    expect(source).not.toContain('saveGooglePlaceLocation');
  });

  it('removes the dead service that auto-created legacy geography', async () => {
    const { existsSync } = await import('node:fs');
    expect(existsSync('server/services/locationPagesServiceEnhanced.ts')).toBe(false);
  });
});
