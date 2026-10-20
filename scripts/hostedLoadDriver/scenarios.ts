import { createTRPCProxyClient, httpLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '../../server/routers';
import { RehearsalRefusal, type ScenarioKind } from '../loadRehearsal/config';
import { HOSTED_LOAD_BOUNDS } from './schedule';

export type HostedLoadClient = ReturnType<typeof createHostedLoadClient>;

export function createHostedLoadClient(targetOrigin: string): HostedLoadClient {
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpLink({
        url: `${targetOrigin}/api/trpc`,
        transformer: superjson,
        async fetch(input, init) {
          return globalThis.fetch(input, {
            ...(init ?? {}),
            credentials: 'omit',
            signal: AbortSignal.timeout(HOSTED_LOAD_BOUNDS.requestTimeoutMs),
          });
        },
      }),
    ],
  });
}

export interface HostedScenario {
  name: string;
  kind: ScenarioKind;
  execute: () => Promise<unknown>;
}

export interface HostedFixtureSet {
  publicIds: number[];
  city: string;
  province: string;
  scenarioAvailability: Map<string, boolean>;
  unavailable: Array<{ name: string; reason: string }>;
}

function readPositiveInteger(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) && numeric > 0 ? numeric : null;
}

function readText(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

export async function discoverHostedFixtures(client: HostedLoadClient): Promise<HostedFixtureSet> {
  const search = await client.properties.searchPublicInventory.query({
    listingType: 'sale',
    pageSize: 50,
  });
  const cards = Array.isArray(search?.cards) ? search.cards : [];
  const candidateIds: number[] = [];
  for (const card of cards) {
    const id = readPositiveInteger((card as { id?: unknown })?.id);
    if (id !== null && !candidateIds.includes(id)) candidateIds.push(id);
  }

  const publicIds: number[] = [];
  for (let index = 0; index < candidateIds.length && publicIds.length < 8; index += 4) {
    const chunk = candidateIds.slice(index, index + 4);
    const details = await client.properties.getPublicByIds.query({ ids: chunk });
    for (const detail of details) {
      const id = readPositiveInteger((detail as { property?: { id?: unknown } })?.property?.id);
      if (id !== null && !publicIds.includes(id)) publicIds.push(id);
    }
  }
  if (publicIds.length === 0) {
    throw new RehearsalRefusal(
      'Refused: no public-eligible properties are reachable over HTTP, so no representative read workload can be built.',
    );
  }

  const [sampleDetail] = await client.properties.getPublicByIds.query({ ids: [publicIds[0]] });
  const sampleProperty = (sampleDetail as { property?: Record<string, unknown> })?.property ?? {};
  const city = readText(sampleProperty.city);
  const province = readText(sampleProperty.province);

  const unavailable: Array<{ name: string; reason: string }> = [];
  const scenarioAvailability = new Map<string, boolean>();
  const warmUpSearch = async (
    name: string,
    input: { city?: string; province?: string },
  ): Promise<boolean> => {
    try {
      const result = await client.properties.searchPublicInventory.query({
        ...input,
        listingType: 'sale',
        pageSize: 24,
      });
      const available = Array.isArray(result?.cards) && result.cards.length > 0;
      scenarioAvailability.set(name, available);
      if (!available) {
        unavailable.push({
          name,
          reason: 'search returned no public cards for the discovered geography',
        });
      }
      return available;
    } catch (error) {
      scenarioAvailability.set(name, false);
      unavailable.push({
        name,
        reason: `search warmup failed: ${error instanceof Error ? error.message : String(error)}`,
      });
      return false;
    }
  };

  // Each search request carries exactly one geography authority (typed city or
  // typed province). Mixed-authority inputs are deliberately never produced.
  if (city) {
    await warmUpSearch('search-typed-city', { city });
  } else {
    scenarioAvailability.set('search-typed-city', false);
    unavailable.push({ name: 'search-typed-city', reason: 'no typed city in discovered fixtures' });
  }
  if (province) {
    await warmUpSearch('search-typed-province', { province });
  } else {
    scenarioAvailability.set('search-typed-province', false);
    unavailable.push({
      name: 'search-typed-province',
      reason: 'no typed province in discovered fixtures',
    });
  }

  return { publicIds, city, province, scenarioAvailability, unavailable };
}

export function buildHostedScenarios(
  client: HostedLoadClient,
  fixtures: HostedFixtureSet,
  smokeWrite: boolean,
): HostedScenario[] {
  const { publicIds, city, province, scenarioAvailability } = fixtures;
  let detailCursor = 0;
  let relatedCursor = 0;
  let viewCursor = 0;

  const scenarios: HostedScenario[] = [
    {
      name: 'property-detail',
      kind: 'read',
      execute: async () => {
        const id = publicIds[detailCursor++ % publicIds.length];
        const details = await client.properties.getPublicByIds.query({ ids: [id] });
        if (!Array.isArray(details) || details.length === 0) {
          throw new Error(`public detail projection missing for property ${id}`);
        }
        return details[0];
      },
    },
    {
      name: 'property-related-feed',
      kind: 'read',
      execute: () => {
        const id = publicIds[relatedCursor++ % publicIds.length];
        return client.properties.getRelatedPublicInventory.query({ propertyId: id });
      },
    },
  ];
  if (scenarioAvailability.get('search-typed-city')) {
    scenarios.push({
      name: 'search-typed-city',
      kind: 'read',
      execute: () =>
        client.properties.searchPublicInventory.query({ city, listingType: 'sale', pageSize: 24 }),
    });
  }
  if (scenarioAvailability.get('search-typed-province')) {
    scenarios.push({
      name: 'search-typed-province',
      kind: 'read',
      execute: () =>
        client.properties.searchPublicInventory.query({
          province,
          listingType: 'sale',
          pageSize: 24,
        }),
    });
  }
  if (smokeWrite) {
    scenarios.push({
      name: 'property-detail-view',
      kind: 'write',
      execute: async () => {
        const id = publicIds[viewCursor++ % publicIds.length];
        const detail = await client.properties.getById.query({ id });
        if (!detail || !(detail as { property?: unknown }).property) {
          throw new Error(`public detail view projection missing for property ${id}`);
        }
        return detail;
      },
    });
  }

  const hasTypedSearch =
    scenarioAvailability.get('search-typed-city') ||
    scenarioAvailability.get('search-typed-province');
  if (!hasTypedSearch) {
    throw new RehearsalRefusal(
      'Refused: at least one typed-geography search scenario must be available for the admitted profile.',
    );
  }
  return scenarios;
}
