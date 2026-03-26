export type HomeFeedComposableItem =
  | { kind: 'listing'; id: string }
  | { kind: 'unit'; id: string };

export function getBaseHomeUnitCap(limit: number): number {
  return limit >= 10 ? 3 : Math.min(2, Math.max(1, Math.floor(limit / 2)));
}

export function composeResidentialHomeFeedItems<
  L extends { kind: 'listing'; id: string },
  U extends { kind: 'unit'; id: string },
>(
  listingItems: L[],
  unitItems: U[],
  limit: number,
): { items: Array<L | U>; source: 'mixed' | 'listings' | 'units' } {
  const maxUnitItems = getBaseHomeUnitCap(limit);
  const targetListingCount = Math.max(limit - maxUnitItems, 1);
  const selectedListings = listingItems.slice(0, targetListingCount);
  const selectedUnits = unitItems.slice(0, Math.max(0, limit - selectedListings.length));

  // When listings are thin or absent, let units backfill the remaining slots.
  const effectiveUnitCap =
    selectedListings.length >= targetListingCount
      ? maxUnitItems
      : Math.min(selectedUnits.length, limit - selectedListings.length);

  const composed: Array<L | U> = [];
  let listingIndex = 0;
  let unitIndex = 0;

  while (
    composed.length < limit &&
    (listingIndex < selectedListings.length || unitIndex < selectedUnits.length)
  ) {
    if (listingIndex < selectedListings.length) {
      composed.push(selectedListings[listingIndex]);
      listingIndex += 1;
    }

    const canInsertUnit =
      unitIndex < selectedUnits.length &&
      composed.length < limit &&
      unitIndex < effectiveUnitCap &&
      (listingIndex >= 2 || selectedListings.length < 2 || composed.length >= 2);

    if (canInsertUnit) {
      composed.push(selectedUnits[unitIndex]);
      unitIndex += 1;
    }
  }

  while (composed.length < limit && listingIndex < listingItems.length) {
    composed.push(listingItems[listingIndex]);
    listingIndex += 1;
  }

  while (composed.length < limit && unitIndex < unitItems.length && unitIndex < effectiveUnitCap) {
    composed.push(unitItems[unitIndex]);
    unitIndex += 1;
  }

  return {
    items: composed.slice(0, limit),
    source:
      selectedListings.length > 0 && selectedUnits.length > 0
        ? 'mixed'
        : selectedListings.length > 0
          ? 'listings'
          : 'units',
  };
}
