import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '../../../server/routers';
import { trpc } from '@/lib/trpc';

export type CommercialCatalog = inferRouterOutputs<AppRouter>['billing']['commercialCatalog'];
export type CommercialProduct = CommercialCatalog['products'][number];
export type CommercialAudience = CommercialProduct['audience'];

/**
 * Read the canonical commercial catalog without starting checkout or changing
 * any account, subscription, or entitlement state.
 */
export function useCommercialCatalog(audience?: CommercialAudience) {
  return trpc.billing.commercialCatalog.useQuery(audience ? { audience } : undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
}
