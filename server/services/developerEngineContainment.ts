import { TRPCError } from '@trpc/server';

/**
 * S0 publication boundary for the transaction types supported by the public
 * MVP contract.
 */

export function throwAuctionPublicationDisabled(): never {
  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message:
      'Auction developments are not part of the supported public MVP contract and cannot be published.',
  });
}
