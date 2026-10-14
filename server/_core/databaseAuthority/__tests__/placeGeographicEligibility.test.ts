import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  loadPlaceAdmissionTerritoryRegistry,
  resolvePlaceAdmissionPackagePaths,
  resolvePlaceAdmissionSourcePaths,
} from '../../../../shared/placeAdmissionTerritories';
import { nonGeographicSourceCodes } from '../../../../shared/placeSourceGeographyEligibility';
import { isDiscoverable, projectPlaceScope } from '../../../../shared/placeAuthority';
import { loadCanonicalPlacePackage } from '../dataAdapters/canonicalPlaces';

const readJsonl = (path: string): Record<string, unknown>[] =>
  readFileSync(path, 'utf8')
    .trim()
    .split('\n')
    .map(line => JSON.parse(line));
const { registry } = loadPlaceAdmissionTerritoryRegistry(process.cwd());

describe('canonical geographic area eligibility', () => {
  for (const territory of registry.territories) {
    it(`withdraws facility-only scopes in ${territory.territoryId} while retaining their IDs`, () => {
      const { rows } = loadCanonicalPlacePackage(process.cwd(), {
        territoryId: territory.territoryId,
      });
      const sources = new Map(
        readJsonl(resolvePlaceAdmissionSourcePaths(territory).artifacts.geography).map(row => [
          row.canonical_location_id,
          row,
        ]),
      );
      const paths = resolvePlaceAdmissionPackagePaths(territory);
      const allocated = new Set(
        Object.values(JSON.parse(readFileSync(paths.placeIdRegistry, 'utf8')).allocated),
      );
      let eligible = 0;
      for (const row of rows.places) {
        expect(allocated.has(row.place_id)).toBe(true);
        const identities = (row.source_identity_ids as string[]).map(id => {
          const identity = sources.get(id);
          expect(identity).toBeDefined();
          return identity!;
        });
        const refusal = nonGeographicSourceCodes(identities);
        if (refusal.length) {
          expect(row.search_scope).toBeNull();
          expect(row.search_eligible).toBe(0);
          expect(row.publication_eligible).toBe(0);
        } else if (row.search_eligible === 1) {
          eligible += 1;
        }
      }
      expect(eligible).toBe(territory.expectedCounts.executable_places);
    });
  }

  it('keeps Sandton selectable and excludes the convention centre at every area boundary', () => {
    const { rows } = loadCanonicalPlacePackage(process.cwd(), { territoryId: 'za-gp' });
    const conventionCentre = rows.places.find(
      row => row.place_id === 'pl-place-01-9e02b737f2b0bdac9bd1f1f4',
    );
    expect(conventionCentre).toMatchObject({
      search_eligible: 0,
      publication_eligible: 0,
      search_scope: null,
    });
    expect(isDiscoverable({ lifecycleStatus: 'active', searchEligible: false })).toBe(false);
    expect(
      projectPlaceScope(
        {
          placeId: String(conventionCentre?.place_id),
          lifecycleStatus: 'active',
          searchEligible: false,
          searchScope: null,
        },
        [],
      ),
    ).toEqual({ ok: false, reason: 'place_not_searchable' });
    const sandtonIds = rows.names.filter(row => row.name === 'Sandton').map(row => row.place_id);
    expect(sandtonIds.length).toBeGreaterThan(0);
    for (const id of sandtonIds) {
      expect(rows.places.find(row => row.place_id === id)?.search_eligible).toBe(1);
    }
  });

  it('bounds the existing-data migration to exactly the source-refused identities', () => {
    const blockedIds = registry.territories.flatMap(territory => {
      const { rows } = loadCanonicalPlacePackage(process.cwd(), {
        territoryId: territory.territoryId,
      });
      const sources = new Map(
        readJsonl(resolvePlaceAdmissionSourcePaths(territory).artifacts.geography).map(row => [
          row.canonical_location_id,
          row,
        ]),
      );
      return rows.places
        .filter(
          row =>
            nonGeographicSourceCodes(
              (row.source_identity_ids as string[]).map(id => sources.get(id)!),
            ).length > 0,
        )
        .map(row => String(row.place_id));
    });
    const migration = readFileSync(
      'server/migrations/0115_non_geographic_place_search_eligibility.sql',
      'utf8',
    );
    const ids = [...migration.matchAll(/'(pl-place-01-[a-f0-9]{24})'/g)].map(match => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual([...new Set(blockedIds)].sort());
    expect(migration).not.toMatch(/\b(?:DELETE|DROP|INSERT)\b/i);
  });
});
