type PublicAgentListingIdentity = {
  propertyId: number | null | undefined;
  sourceListingId: number | null | undefined;
};

const usableId = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;

export function getPrivateListingActionIds(listingId: number | null | undefined) {
  const sourceListingId = usableId(listingId);

  return {
    editListingId: sourceListingId,
    deleteListingId: sourceListingId,
    publicPropertyId: null,
  };
}

export function getPublicAgentListingActionIds({
  propertyId,
  sourceListingId,
}: PublicAgentListingIdentity) {
  return {
    editListingId: usableId(sourceListingId),
    deletePropertyId: usableId(propertyId),
    publicPropertyId: usableId(propertyId),
  };
}
