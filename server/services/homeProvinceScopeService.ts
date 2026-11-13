import { TRPCError } from '@trpc/server';

import {
  loadCanonicalPlaceSearchProjection,
  type CanonicalPlaceSearchProjection,
} from './canonicalPlaceSearchService';

export type HomeProvinceScope = {
  province: { placeId: string; name: string };
  projection: CanonicalPlaceSearchProjection;
  /** Every labelled place inside the province (cities and localities). */
  memberPlaceIds: string[];
};

/**
 * Resolves a province-scope place and its labelled members from the canonical
 * place authority. Anything that is not a province is a BAD_REQUEST, so the
 * homepage can never be pointed at a city, a locality or an unknown id.
 */
export async function loadHomeProvinceScope(provincePlaceId: string): Promise<HomeProvinceScope> {
  const projection = await loadCanonicalPlaceSearchProjection(undefined, {
    placeIds: [provincePlaceId],
    includeProvinceMembers: true,
  });
  const execution = projection.executions.get(provincePlaceId);
  const label = projection.labels.get(provincePlaceId);
  if (!execution || execution.scope !== 'province' || !label) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'provincePlaceId must be a province.' });
  }
  const memberPlaceIds = Array.from(projection.executions.values())
    .filter(member => member.provincePlaceId === provincePlaceId && projection.labels.has(member.placeId))
    .map(member => member.placeId);
  return { province: { placeId: provincePlaceId, name: label.label }, projection, memberPlaceIds };
}
