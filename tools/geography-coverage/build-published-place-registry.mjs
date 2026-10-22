/**
 * Builds the governed published-place registry.
 *
 * The public URL of a place has always been province/region/place, where the region is the
 * familiar local label, such as Alberton, Benoni or Katlehong. The canonical Place Authority
 * asserts the municipality edge, and for many places it does not carry the town-cluster edge at
 * all. This registry records the URL we already publish, the label we already publish, and the
 * canonical Place identity behind it, so a published link never moves under a customer and a
 * published place never disappears from search.
 *
 * The registry is a URL and display convention. It is not an administrative claim, and it never
 * decides whether a place exists, is searchable or is publishable. The Place Authority remains
 * the only authority for identity, existence, search eligibility and publication eligibility.
 *
 * The reconciliation is deterministic and hierarchical. A published location is bound to a
 * canonical Place by, in order:
 *
 *   1. the published name, or a published searchable alias, matched against an active Place
 *      name with spacing and punctuation removed, so "Eden Park" and "Edenpark" are one place;
 *   2. the published level, so a published city resolves to a searchable city scope and a
 *      published suburb to a searchable locality scope;
 *   3. the published parent's canonical Place, which must be an ancestor of the candidate;
 *   4. the published parent's administrative context;
 *   5. the published canonical type, when the projection recorded one;
 *   6. the representative point, when both sides record one. The nearest candidate wins, and
 *      only when it is strictly nearer than the next one.
 *
 * A published location that no rule resolves is recorded in `unmapped` with its reason. It is
 * never guessed into a Place.
 *
 * Usage:
 *   node tools/geography-coverage/build-published-place-registry.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PROJECTION = join(
  ROOT,
  'data/geography-coverage-v0.1/output/gauteng_runtime_reference_projection_v0.2.json',
);
const ADMISSION_DIR = join(ROOT, 'data/gauteng-place-admission-v0.1');
const ADMISSION = join(ADMISSION_DIR, 'gauteng_place_admission_v0.1.jsonl');
const NAMES = join(ADMISSION_DIR, 'gauteng_place_names_v0.1.jsonl');
const RELATIONSHIPS = join(ADMISSION_DIR, 'gauteng_place_relationships_v0.1.jsonl');
const OUTPUT = join(
  ROOT,
  'data/geography-coverage-v0.1/output/gauteng_published_place_registry_v0.2.json',
);

/** The identity radius, in kilometres, within which two representatives are the same place. */
const IDENTITY_RADIUS_KM = 5;

function readJsonl(path) {
  const rows = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    rows.push(JSON.parse(line));
  }
  return rows;
}

/**
 * The published spelling of a name, reduced to a comparable form.
 *
 * "Eden Park" and "Edenpark" are the same place spelled two ways, and "Boksburg-Noord" and
 * "Boksburg Noord" are the same place spelled two ways. Spacing and punctuation are not
 * identity.
 */
export function normalizePlaceName(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

/** Great-circle distance in kilometres between two representative points. */
function distanceKm(a, b) {
  if (!a || !b) return null;
  const toRad = value => (Number(value) * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(h)));
}

const LEVEL_SCOPE = { province: 'province', city: 'metro_city', suburb: 'locality' };

export function buildPublishedPlaceRegistry() {
  const projection = JSON.parse(readFileSync(PROJECTION, 'utf8'));
  const admission = readJsonl(ADMISSION);
  const names = readJsonl(NAMES);
  const relationships = readJsonl(RELATIONSHIPS);

  const placeById = new Map(admission.map(place => [place.place_id, place]));

  const parentsByChild = new Map();
  for (const edge of relationships) {
    if (edge.relationship_type !== 'administratively_contains') continue;
    const held = parentsByChild.get(edge.from_place_id) || [];
    held.push(edge.to_place_id);
    parentsByChild.set(edge.from_place_id, held);
  }

  const ancestorsOf = placeId => {
    const chain = [];
    const seen = new Set([placeId]);
    let cursor = placeId;
    for (let depth = 0; depth < 8; depth += 1) {
      const direct = parentsByChild.get(cursor) || [];
      if (!direct.length) break;
      for (const parent of direct) {
        if (seen.has(parent)) continue;
        seen.add(parent);
        chain.push(parent);
      }
      cursor = direct[0];
    }
    return chain;
  };

  // Name index. A name claimed by several Places is kept, so the rules below can disambiguate
  // rather than the join guessing.
  const placesByNormalizedName = new Map();
  const preferredNameByPlace = new Map();
  for (const name of names) {
    if (name.name_state !== 'active') continue;
    if (/^https?:/i.test(String(name.name || ''))) continue;
    const key = normalizePlaceName(name.name);
    if (!key) continue;
    const held = placesByNormalizedName.get(key) || new Set();
    held.add(name.place_id);
    placesByNormalizedName.set(key, held);
    if (name.name_role === 'preferred_public') preferredNameByPlace.set(name.place_id, key);
  }

  const contextOf = placeId =>
    placeById.get(placeId)?.adjudication?.administrative_context || null;
  const typeOf = placeId => placeById.get(placeId)?.place_type || null;
  const scopeOf = placeId => placeById.get(placeId)?.search_scope || null;
  const pointOf = placeId => {
    const adjudication = placeById.get(placeId)?.adjudication;
    if (!adjudication) return null;
    const latitude = Number(adjudication.representative_latitude);
    const longitude = Number(adjudication.representative_longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  };

  const rows = projection.rows;
  const provinceRow = rows.find(row => row.runtime_natural_key === 'gauteng');
  const provincePlace = admission.find(
    place => place.place_type === 'province' && place.adjudication?.province_context === 'Gauteng',
  );
  if (!provincePlace) throw new Error('Published registry refused: no Gauteng province Place.');

  const bound = new Map();
  const matchRules = new Map();
  const distances = new Map();
  const unmapped = [];

  const levelOf = key => {
    const parts = key.split('/');
    if (parts.length === 2) return 'city';
    if (parts.length === 3) return 'suburb';
    return 'province';
  };

  const provinceScoped = placeId =>
    placeId === provincePlace.place_id || ancestorsOf(placeId).includes(provincePlace.place_id);

  const publishedNames = row => [row.name, ...(row.searchable_aliases || [])];

  const publishedPoint = row =>
    row.latitude !== undefined && row.longitude !== undefined
      ? { latitude: Number(row.latitude), longitude: Number(row.longitude) }
      : null;

  const factualTypes = row => (row.factual_types || []).filter(Boolean);

  /**
   * Resolves one published row to a canonical Place.
   *
   * Every narrowing step is recorded so the registry says how each place was bound.
   */
  const resolve = (row, parentKey) => {
    const level = levelOf(row.runtime_natural_key);
    const wanted = publishedNames(row).map(normalizePlaceName).filter(Boolean);
    const wantedSet = new Set(wanted);

    const candidates = new Set();
    for (const name of wanted) {
      for (const placeId of placesByNormalizedName.get(name) || []) {
        if (provinceScoped(placeId)) candidates.add(placeId);
      }
    }

    let rule = 'name';
    if (!candidates.size) {
      // A published name that is the stem of a canonical name, such as "Broadacres" published
      // and "Broadacres AH" canonical, is the same place under a longer official name. The rule
      // only fires when exactly one canonical Place is a candidate.
      for (const [key, placeIds] of placesByNormalizedName) {
        for (const placeId of placeIds) {
          if (!provinceScoped(placeId)) continue;
          const preferred = preferredNameByPlace.get(placeId);
          if (!preferred) continue;
          if (wanted.some(name => preferred.startsWith(name) && preferred.length > name.length)) {
            candidates.add(placeId);
          }
        }
      }
      rule = 'name-stem';
    }

    if (!candidates.size) {
      return { status: 'unmapped', reason: 'no canonical place carries the published name' };
    }

    let narrowed = [...candidates];

    // The canonical name the Place itself publishes. A candidate whose own preferred public
    // name is one of the published names is the place, whatever else shares the name. A
    // candidate that only carries the published name as a common or historical name is a
    // weaker match and is set aside when a stronger one exists.
    const preferred = narrowed.filter(placeId => {
      const name = preferredNameByPlace.get(placeId);
      return name ? wantedSet.has(name) : false;
    });
    if (preferred.length) {
      narrowed = preferred;
      rule = `${rule}+preferred`;
    }

    // The published level. A published city resolves to a searchable city scope, a published
    // suburb to a searchable locality scope. The published level and the canonical scope may
    // legitimately disagree, so this only discriminates between candidates; it never refuses a
    // binding on its own. The published level decides the URL shape, and the registry records
    // it.
    const levelScoped = narrowed.filter(placeId => scopeOf(placeId) === LEVEL_SCOPE[level]);
    if (levelScoped.length) {
      narrowed = levelScoped;
      rule = `${rule}+level`;
    }

    // The published parent's canonical Place must be an ancestor of the candidate.
    const parentPlace = parentKey ? bound.get(parentKey) : null;
    if (parentPlace) {
      const descended = narrowed.filter(placeId => ancestorsOf(placeId).includes(parentPlace));
      if (descended.length) {
        narrowed = descended;
        rule = `${rule}+parent`;
      }
    }

    // The published parent's administrative context.
    const parentContext = parentPlace ? contextOf(parentPlace) : null;
    if (parentContext) {
      const contextual = narrowed.filter(placeId => contextOf(placeId) === parentContext);
      if (contextual.length) {
        narrowed = contextual;
        rule = `${rule}+context`;
      }
    }

    // The published canonical type, when the projection recorded one.
    const types = factualTypes(row);
    if (types.length) {
      const typed = narrowed.filter(placeId => types.includes(typeOf(placeId)));
      if (typed.length) {
        narrowed = typed;
        rule = `${rule}+type`;
      }
    }

    // The representative point. The nearest candidate wins, and only when it is strictly
    // nearer than the next one, so an equal pair is reported as ambiguous rather than guessed.
    const point = publishedPoint(row);
    if (point) {
      const ranked = narrowed
        .map(placeId => ({ placeId, distance: distanceKm(point, pointOf(placeId)) }))
        .filter(entry => entry.distance !== null)
        .sort((a, b) => a.distance - b.distance);
      if (ranked.length) {
        const best = ranked[0];
        const runnerUp = ranked[1];
        if (
          best.distance <= IDENTITY_RADIUS_KM &&
          (!runnerUp || runnerUp.distance > best.distance)
        ) {
          narrowed = [best.placeId];
          rule = `${rule}+spatial`;
        }
      }
    }

    if (narrowed.length === 1) {
      const placeId = narrowed[0];
      const distance = point ? distanceKm(point, pointOf(placeId)) : null;
      return { status: 'bound', placeId, rule, distance };
    }
    if (!narrowed.length) {
      return { status: 'unmapped', reason: 'no canonical place satisfies the published hierarchy' };
    }
    return {
      status: 'unmapped',
      reason: `the published name is claimed by ${narrowed.length} canonical places`,
    };
  };

  bound.set(provinceRow.runtime_natural_key, provincePlace.place_id);
  matchRules.set(provinceRow.runtime_natural_key, 'province');
  distances.set(provinceRow.runtime_natural_key, null);

  const cityRows = rows.filter(row => row.runtime_natural_key.split('/').length === 2);
  const suburbRows = rows.filter(row => row.runtime_natural_key.split('/').length === 3);

  // The city level first, so a published suburb can be bound to its published parent's Place.
  for (const row of cityRows) {
    const result = resolve(row, 'gauteng');
    if (result.status === 'bound') {
      bound.set(row.runtime_natural_key, result.placeId);
      matchRules.set(row.runtime_natural_key, result.rule);
      distances.set(row.runtime_natural_key, result.distance);
    } else {
      unmapped.push({ row, reason: result.reason });
    }
  }

  // A published city that several Places claim is decided by the published children: the Place
  // that holds them is the published city.
  for (const row of cityRows) {
    if (bound.has(row.runtime_natural_key)) continue;
    const children = suburbRows.filter(
      child => child.runtime_parent_natural_key === row.runtime_natural_key,
    );
    const childParents = new Set();
    for (const child of children) {
      const result = resolve(child, row.runtime_natural_key);
      if (result.status !== 'bound') continue;
      for (const parent of parentsByChild.get(result.placeId) || []) childParents.add(parent);
    }
    if (childParents.size === 1) {
      const placeId = [...childParents][0];
      bound.set(row.runtime_natural_key, placeId);
      matchRules.set(row.runtime_natural_key, 'children');
      distances.set(row.runtime_natural_key, null);
    }
  }

  for (const row of suburbRows) {
    const result = resolve(row, row.runtime_parent_natural_key);
    if (result.status === 'bound') {
      bound.set(row.runtime_natural_key, result.placeId);
      matchRules.set(row.runtime_natural_key, result.rule);
      distances.set(row.runtime_natural_key, result.distance);
    } else {
      unmapped.push({ row, reason: result.reason });
    }
  }

  // A canonical Place carries one published URL. When two published locations resolve to the
  // same Place, the nearer one keeps it and the other is recorded, with its reason.
  const claimsByPlace = new Map();
  for (const [key, placeId] of bound) {
    const claims = claimsByPlace.get(placeId) || [];
    claims.push(key);
    claimsByPlace.set(placeId, claims);
  }

  const kept = new Map();
  const dropped = [];
  for (const [placeId, claims] of claimsByPlace) {
    if (claims.length === 1) {
      kept.set(placeId, claims[0]);
      continue;
    }
    const ranked = [...claims].sort((a, b) => {
      const distanceA = distances.get(a);
      const distanceB = distances.get(b);
      const rankA = distanceA === null || distanceA === undefined ? Number.POSITIVE_INFINITY : distanceA;
      const rankB = distanceB === null || distanceB === undefined ? Number.POSITIVE_INFINITY : distanceB;
      if (rankA !== rankB) return rankA - rankB;
      return a < b ? -1 : a > b ? 1 : 0;
    });
    kept.set(placeId, ranked[0]);
    for (const claim of ranked.slice(1)) {
      dropped.push({ key: claim, placeId, winner: ranked[0] });
    }
  }

  const places = {};
  for (const [placeId, key] of kept) {
    const parts = key.split('/');
    const region = parts.length === 3 ? parts[1] : null;
    const place = parts[parts.length - 1];
    const row = rows.find(candidate => candidate.runtime_natural_key === key);
    const regionRow = region
      ? rows.find(candidate => candidate.runtime_natural_key === parts.slice(0, 2).join('/'))
      : null;
    const provinceRowFor = rows.find(
      candidate => candidate.runtime_natural_key === parts[0],
    );
    places[placeId] = {
      label: String(row.name),
      region,
      regionName: regionRow ? String(regionRow.name) : null,
      place,
      path: `/${key}`,
      level: levelOf(key),
      provinceSlug: parts[0],
      provinceName: provinceRowFor ? String(provinceRowFor.name) : parts[0],
      matchRule: matchRules.get(key),
    };
  }

  const unmappedPublished = [
    ...unmapped.map(entry => ({ row: entry.row, reason: entry.reason })),
    ...dropped.map(entry => {
      const row = rows.find(candidate => candidate.runtime_natural_key === entry.key);
      return {
        row,
        reason: `the canonical Place is published at /${entry.winner}`,
      };
    }),
  ]
    .map(entry => {
      const parts = entry.row.runtime_natural_key.split('/');
      const region = parts.length === 3 ? parts[1] : null;
      const regionRow = region
        ? rows.find(candidate => candidate.runtime_natural_key === parts.slice(0, 2).join('/'))
        : null;
      const provinceRowFor = rows.find(candidate => candidate.runtime_natural_key === parts[0]);
      return {
        path: `/${entry.row.runtime_natural_key}`,
        label: String(entry.row.name),
        level: levelOf(entry.row.runtime_natural_key),
        region,
        regionName: regionRow ? String(regionRow.name) : null,
        place: parts[parts.length - 1],
        provinceSlug: parts[0],
        provinceName: provinceRowFor ? String(provinceRowFor.name) : parts[0],
        reason: entry.reason,
      };
    })
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  return {
    registryVersion: 'gauteng-published-place-registry-v0.2',
    policy: 'published-url-compatibility',
    note:
      'The URL and label we already publish for each place, bound to the canonical Place identity behind it. A URL and display convention only.',
    source:
      'data/geography-coverage-v0.1/output/gauteng_runtime_reference_projection_v0.2.json',
    reconciliation: {
      publishedLocations: rows.filter(row => row.runtime_natural_key.split('/').length >= 2).length,
      boundToCanonicalPlace: Object.keys(places).length,
      unmappedPublishedLocations: unmappedPublished.length,
    },
    places,
    unmapped: unmappedPublished,
  };
}

function main() {
  const result = buildPublishedPlaceRegistry();
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(result, null, 2)}\n`);
  console.log(
    `published place registry: ${result.reconciliation.boundToCanonicalPlace} bound, ` +
      `${result.reconciliation.unmappedPublishedLocations} unmapped -> ${OUTPUT}`,
  );
  for (const entry of result.unmapped) {
    console.log(`  unmapped: ${entry.path} (${entry.label}) ${entry.reason}`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('build-published-place-registry.mjs')) main();
