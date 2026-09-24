import {
  isPaidMvpLaunchAccessProductKey,
  type PaidMvpLaunchAccessProductKey,
} from '@shared/commercialActivation';

import { trpc } from '@/lib/trpc';

export function useCommercialActivationAvailability() {
  const query = trpc.billing.commercialActivation.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  const isProductAvailable = (productKey: unknown) =>
    isPaidMvpLaunchAccessProductKey(productKey) &&
    query.data?.productAvailability?.[productKey] === true;

  return {
    ...query,
    isProductAvailable,
    salesPaused: query.data?.salesPaused === true,
    unavailableMessage:
      query.data?.message ??
      'Commercial availability could not be verified. Paid actions remain unavailable until it can.',
  };
}

export function useCommercialProductAvailability(productKey: PaidMvpLaunchAccessProductKey) {
  const availability = useCommercialActivationAvailability();

  return {
    ...availability,
    isAvailable: availability.isProductAvailable(productKey),
  };
}
