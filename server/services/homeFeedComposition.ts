export type HomeFeedComposableItem =
  | { kind: 'listing'; id: string }
  | { kind: 'unit'; id: string; developmentKey?: string | null };

function diversifyUnitsByDevelopment<
  U extends { kind: 'unit'; id: string; developmentKey?: string | null },
>(unitItems: U[]): U[] {
  const groups = new Map<string, U[]>();
  const groupOrder: string[] = [];

  unitItems.forEach(item => {
    const rawKey = String(item.developmentKey || '').trim();
    const key = rawKey || item.id;
    if (!groups.has(key)) {
      groups.set(key, []);
      groupOrder.push(key);
    }
    groups.get(key)?.push(item);
  });

  const diversified: U[] = [];
  let remaining = true;

  while (remaining) {
    remaining = false;
    groupOrder.forEach(key => {
      const queue = groups.get(key);
      const nextItem = queue?.shift();
      if (nextItem) {
        diversified.push(nextItem);
        remaining = true;
      }
    });
  }

  return diversified;
}

export function getBaseHomeUnitCap(limit: number): number {
  return limit >= 10 ? 3 : Math.min(2, Math.max(1, Math.floor(limit / 2)));
}

export function composeResidentialHomeFeedItems<
  L extends { kind: 'listing'; id: string },
  U extends { kind: 'unit'; id: string; developmentKey?: string | null },
>(
  listingItems: L[],
  unitItems: U[],
  limit: number,
): { items: Array<L | U>; source: 'mixed' | 'listings' | 'units' } {
  const diversifiedUnits = diversifyUnitsByDevelopment(unitItems);
  const maxUnitItems = getBaseHomeUnitCap(limit);
  const targetListingCount = Math.max(limit - maxUnitItems, 1);
  const selectedListings = listingItems.slice(0, targetListingCount);
  const selectedUnits = diversifiedUnits.slice(0, Math.max(0, limit - selectedListings.length));

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

  while (
    composed.length < limit &&
    unitIndex < diversifiedUnits.length &&
    unitIndex < effectiveUnitCap
  ) {
    composed.push(diversifiedUnits[unitIndex]);
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
