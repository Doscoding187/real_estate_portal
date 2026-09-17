import { TRPCError } from '@trpc/server';
import {
  isDeferredLandDevelopmentDraft,
  isDeferredLandDevelopmentType,
} from '../../shared/landLaunchPolicy';

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

/**
 * The generic Developer lifecycle is not a second Land lifecycle. Preserve
 * existing rows, but reject new Land authoring and every transition that could
 * make a `developmentType = land` row reviewable or public while Land is
 * intentionally deferred.
 */
export function assertLandDevelopmentOperationAvailable(
  developmentType: unknown,
  operation: string,
): void {
  if (!isDeferredLandDevelopmentType(developmentType)) return;

  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message:
      `${operation} is unavailable while Land is deferred from the first launch cohort. ` +
      'Land requires its dedicated commercial and operating acceptance before exposure.',
  });
}

/**
 * Generic Developer drafts are authoring state, even before they become a
 * persisted Development row. Both historical wizard payload shapes must obey
 * the same deferred-Land policy.
 */
export function assertLandDevelopmentDraftOperationAvailable(
  draftData: unknown,
  operation: string,
): void {
  if (!isDeferredLandDevelopmentDraft(draftData)) return;

  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message:
      `${operation} is unavailable while Land is deferred from the first launch cohort. ` +
      'Land requires its dedicated commercial and operating acceptance before exposure.',
  });
}
