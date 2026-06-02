export type PropertyMutationListingType =
  | 'sale'
  | 'rent'
  | 'rent_to_buy'
  | 'auction'
  | 'shared_living';

export type PropertyMutationTransactionType = 'sale' | 'rent' | 'auction';

export function mapPropertyListingTypeToTransactionType(
  listingType: PropertyMutationListingType,
): PropertyMutationTransactionType {
  if (listingType === 'auction') return 'auction';
  if (listingType === 'rent' || listingType === 'rent_to_buy' || listingType === 'shared_living') {
    return 'rent';
  }
  return 'sale';
}
