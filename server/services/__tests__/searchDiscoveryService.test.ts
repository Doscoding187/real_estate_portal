import { describe, expect, it } from 'vitest';

import { isFactualGeographyId } from '../../../shared/factualRuntimeGeographyBridge';
import type { ResolvedLocation } from '../locationResolverService';
import { gautengFactualRuntimeProjectionAuthority } from '../governedRuntimeGeographyReference';
import type { LocationCoverageEvent } from '../locationCoverageTelemetry';
import { setLocationCoverageEventSinkForTests } from '../locationCoverageTelemetry';
import type {
  RuntimeGeographyAuthority,
  RuntimeGeographyAuthorityRecord,
} from '../runtimeGeographyAuthority';
import type {
  SearchAreaDiscoveryResult,
  SearchDiscoveryResult,
} from '../../../shared/searchDiscovery';
import { selectionFromDiscoveryResult } from '../../../shared/searchDiscovery';
import type { SearchAreaSummary } from '../../../shared/searchScope';
import {
  SearchDiscoveryService,
  type SearchDiscoverySearchAreaAuthority,
} from '../searchDiscoveryService';

const ACCEPTED_SEARCH_AREAS = [
  ['pl-sa-gp-3b36a49ecb943c88402b07fd', 'Johannesburg North'],
  ['pl-sa-gp-9314684a28ff63402832b8df', 'Johannesburg South'],
  ['pl-sa-gp-20f043e9ba8ece627365f5ad', 'East Rand'],
  ['pl-sa-gp-3aa01dbdcd93c28e0aef9119', 'Pretoria East'],
  ['pl-sa-gp-01da060bb6c5807438a654e9', 'Midrand'],
  ['pl-sa-gp-35163d1b6013797932cd94c1', 'Centurion'],
] as const;

const COLLISIONS = [
  {
    label: 'Midrand',
    factualLocationId: 'pl-gp-v01-0d7688adb9c7af392007',
    searchAreaId: 'pl-sa-gp-01da060bb6c5807438a654e9',
    runtimeNaturalKey: 'gauteng/midrand',
    scopeKind: 'metro_city' as const,
    factualType: 'town',
  },
  {
    label: 'Centurion',
    factualLocationId: 'pl-gp-v01-029159849439c2ea8783',
    searchAreaId: 'pl-sa-gp-35163d1b6013797932cd94c1',
    runtimeNaturalKey: 'gauteng/centurion',
    scopeKind: 'metro_city' as const,
    factualType: 'town',
  },
  {
    label: 'Johannesburg North',
    factualLocationId: 'pl-gp-v01-c1d935cbc90ea639eb87',
    searchAreaId: 'pl-sa-gp-3b36a49ecb943c88402b07fd',
    runtimeNaturalKey: 'gauteng/johannesburg/johannesburg-north',
    scopeKind: 'locality' as const,
    factualType: 'suburb',
  },
] as const;

function searchAreaSummaries(): SearchAreaSummary[] {
  return ACCEPTED_SEARCH_AREAS.map(([searchAreaId, label]) => ({
    kind: 'search_area',
    searchAreaId,
    label,
    publicSlug: label.toLowerCase().replace(/\s+/g, '-'),
    lifecycle: 'preview',
    availability: 'preview',
    supportedJourneys: ['buy', 'rent'],
    definitionVersion: 1,
  }));
}

function createSearchAreaAuthority(): SearchDiscoverySearchAreaAuthority {
  const summaries = searchAreaSummaries();
  return {
    listSearchAreaSummaries: async options => (options?.includePreview ? summaries : []),
    resolveSearchArea: async (searchAreaId, options) => {
      const summary = summaries.find(item => item.searchAreaId === searchAreaId);
      if (!summary || !options?.includePreview) {
        return {
          status: 'unavailable',
          searchAreaId,
          reason: 'preview_only',
        };
      }
      return {
        status: 'preview',
        definition: {} as never,
        summary,
      };
    },
  };
}

function createRuntimeAuthority(): RuntimeGeographyAuthority {
  const records = new Map<string, RuntimeGeographyAuthorityRecord>();
  let cityId = 700;
  let suburbId = 1700;

  for (const entry of gautengFactualRuntimeProjectionAuthority.entries()) {
    if (
      entry.projectionStatus !== 'projection_ready' ||
      !entry.runtimeNaturalKey ||
      !entry.runtimeSearchScopeKind
    ) {
      continue;
    }
    const isCity = entry.runtimeSearchScopeKind === 'metro_city';
    const canonicalLocationId = isCity ? `city:${cityId++}` : `suburb:${suburbId++}`;
    const segments = entry.runtimeNaturalKey.split('/');
    const parentCanonicalLocationId = isCity ? 'province:1' : `city:${cityId - 1}`;
    records.set(entry.runtimeNaturalKey, {
      canonicalLocationId,
      level: isCity ? 'city' : 'suburb',
      name: entry.factualPreferredName,
      slug: segments.at(-1)!,
      parentCanonicalLocationId,
      parentName: isCity ? 'Gauteng' : segments.at(-2),
      parentSlug: isCity ? 'gauteng' : segments.at(-2),
      runtimeNaturalKey: entry.runtimeNaturalKey,
      scopeKind: entry.runtimeSearchScopeKind,
      factualLocationId: entry.factualLocationId,
      factualPreferredName: entry.factualPreferredName,
      factualType: entry.factualType,
    });
  }

  return {
    resolveRuntimeNaturalKey: async (runtimeNaturalKey, scopeKind) => {
      const record = records.get(runtimeNaturalKey);
      return record?.scopeKind === scopeKind ? record : null;
    },
  };
}

function resolvedCity(locationId: string, name: string): ResolvedLocation {
  return {
    level: 'city',
    province: { id: 1, name: 'Western Cape', slug: 'western-cape', code: 'WC' },
    city: { id: 4, name, slug: name.toLowerCase().replace(/\s+/g, '-'), provinceId: 1 },
    confidence: 'exact',
    fallbackLevel: 'none',
    originalIntent: locationId,
  };
}

function createService(mode: 'public' | 'controlled_acceptance') {
  return new SearchDiscoveryService({
    mode,
    searchAreaAuthority: createSearchAreaAuthority(),
    runtimeGeographyAuthority: createRuntimeAuthority(),
    canonicalLocationSearch: async () => [
      {
        canonicalLocationId: 'city:4',
        label: 'Cape Town',
        factualLevel: 'city',
        provinceSlug: 'western-cape',
        citySlug: 'cape-town',
        canonicalPath: '/western-cape/cape-town',
      },
    ],
    publicLocationResolver: {
      resolvePublicLocation: async ({ locationId }) => ({
        status: 'resolved',
        location: resolvedCity(locationId || '', 'Cape Town'),
      }),
    },
  });
}

function canonicalResult(
  results: readonly SearchDiscoveryResult[],
  factualLocationId: string,
): Extract<SearchDiscoveryResult, { kind: 'canonical_location' }> | undefined {
  return results.find(
    (result): result is Extract<SearchDiscoveryResult, { kind: 'canonical_location' }> =>
      result.kind === 'canonical_location' && result.factualLocationId === factualLocationId,
  );
}

function areaResult(
  results: readonly SearchDiscoveryResult[],
  searchAreaId: string,
): SearchAreaDiscoveryResult | undefined {
  return results.find(
    (result): result is SearchAreaDiscoveryResult =>
      result.kind === 'search_area' && result.searchAreaId === searchAreaId,
  );
}

describe('SearchDiscoveryService collision-safe contract', () => {
  it('returns all six Search Areas only in controlled acceptance discovery', async () => {
    const controlled = createService('controlled_acceptance');
    const publicService = createService('public');

    for (const [searchAreaId, label] of ACCEPTED_SEARCH_AREAS) {
      const controlledResults = await controlled.search(label, 20);
      const controlledArea = areaResult(controlledResults, searchAreaId);
      expect(controlledArea).toMatchObject({
        kind: 'search_area',
        searchAreaId,
        label,
        availability: 'preview',
        publicEligible: false,
        display: { typeLabel: 'Property market area' },
      });

      const publicResults = await publicService.search(label, 20);
      expect(areaResult(publicResults, searchAreaId)).toBeUndefined();
    }
  });

  it('forces public lifecycle gating in production runtime', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousAppEnv = process.env.APP_ENV;
    process.env.NODE_ENV = 'production';
    process.env.APP_ENV = 'production';

    try {
      const service = createService('controlled_acceptance');
      const results = await service.search('Midrand', 20);
      expect(areaResult(results, 'pl-sa-gp-01da060bb6c5807438a654e9')).toBeUndefined();
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
      process.env.APP_ENV = previousAppEnv;
    }
  });

  it.each(COLLISIONS)(
    '$label keeps factual and Search Area identities distinct through selection',
    async collision => {
      expect(isFactualGeographyId(collision.factualLocationId)).toBe(true);
      const service = createService('controlled_acceptance');
      const results = await service.search(collision.label, 20);
      const factual = canonicalResult(results, collision.factualLocationId);
      const area = areaResult(results, collision.searchAreaId);

      expect(factual).toBeDefined();
      expect(area).toBeDefined();
      expect(factual!.label).toBe(area!.label);
      expect(factual!.kind).not.toBe(area!.kind);
      expect(factual!.factualLocationId).not.toBe(area!.searchAreaId);
      expect(factual!.factualType).toBe(collision.factualType);
      expect(factual!.searchScopeKind).toBe(collision.scopeKind);
      expect(factual!.display.typeLabel).not.toBe('Property market area');
      expect(area!.display.typeLabel).toBe('Property market area');

      const factualSelection = selectionFromDiscoveryResult(factual!);
      const areaSelection = selectionFromDiscoveryResult(area!);
      expect(factualSelection).toMatchObject({
        kind: 'canonical_location',
        factualLocationId: collision.factualLocationId,
      });
      expect(areaSelection).toEqual({ kind: 'search_area', searchAreaId: collision.searchAreaId });

      const factualIntent = await service.resolveSelection(factualSelection, { journey: 'buy' });
      const areaIntent = await service.resolveSelection(areaSelection, { journey: 'buy' });
      expect(factualIntent).toMatchObject({
        status: 'resolved',
        scope: { kind: collision.scopeKind },
        factualLocationId: collision.factualLocationId,
      });
      expect(areaIntent).toMatchObject({
        status: 'resolved',
        scope: { kind: 'search_area', searchAreaId: collision.searchAreaId },
      });
      expect(factualIntent).not.toEqual(areaIntent);
    },
  );

  it('does not use labels as a selection fallback and preserves ordinary factual discovery', async () => {
    const service = createService('public');
    const ordinary = await service.search('cape', 10);
    const capeTown = ordinary.find(result => result.kind === 'canonical_location');
    expect(capeTown).toMatchObject({
      kind: 'canonical_location',
      canonicalLocationId: 'city:4',
      label: 'Cape Town',
      display: { typeLabel: 'City' },
    });

    const selection = selectionFromDiscoveryResult(capeTown!);
    const resolution = await service.resolveSelection(selection, { journey: 'rent' });
    expect(resolution).toMatchObject({
      status: 'resolved',
      scope: { kind: 'metro_city', canonicalLocationId: 'city:4' },
      label: 'Cape Town',
    });

    const previewSelection = {
      kind: 'search_area' as const,
      searchAreaId: ACCEPTED_SEARCH_AREAS[4][0],
    };
    await expect(
      service.resolveSelection(previewSelection, { journey: 'rent' }),
    ).resolves.toMatchObject({
      status: 'unavailable',
      reason: 'preview_only',
    });
  });

  it('emits a no_result coverage outcome for unknown queries', async () => {
    const events: LocationCoverageEvent[] = [];
    setLocationCoverageEventSinkForTests(event => events.push(event));
    const service = new SearchDiscoveryService({
      mode: 'public',
      searchAreaAuthority: createSearchAreaAuthority(),
      runtimeGeographyAuthority: createRuntimeAuthority(),
      canonicalLocationSearch: async () => [],
      publicLocationResolver: {
        resolvePublicLocation: async ({ locationId }) => ({
          status: 'resolved',
          location: resolvedCity(locationId || '', 'Cape Town'),
        }),
      },
    });

    const results = await service.search('zzz-no-such-place-zzz', 8);

    expect(results).toHaveLength(0);
    expect(events).toHaveLength(1);
    expect(events[0].outcome.coverageSignal).toBe('no_result');
    expect(events[0].outcome.canonicalResultCount).toBe(0);
    expect(events[0].outcome.normalizedQuery).toBe('zzz-no-such-place-zzz');
  });

  it('reports alias match reasons in the coverage outcome', async () => {
    const events: LocationCoverageEvent[] = [];
    setLocationCoverageEventSinkForTests(event => events.push(event));
    const service = createService('controlled_acceptance');

    await service.search('bryanston west extension 1', 8);

    const event = events.at(-1);
    expect(event?.outcome.coverageSignal).toBe('resolved');
    expect(event?.outcome.topMatchReason).toBe('alias_exact');
    expect(event?.outcome.matchedAlias).toBe('Bryanston West Extension 1');
  });
});
