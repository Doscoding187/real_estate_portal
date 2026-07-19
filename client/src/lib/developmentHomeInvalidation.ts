export const developmentHomeRanges = ['7d', '30d', '90d'] as const;

export type DevelopmentHomeRange = (typeof developmentHomeRanges)[number];

type DevelopmentHomeInput = {
  developmentId: number;
  range: DevelopmentHomeRange;
};

/**
 * Refreshes every cached Development Home period for one development after a
 * successful specialist mutation. Keeping the input explicit avoids evicting
 * other developers' cached Homes or only refreshing the currently visible range.
 */
export async function invalidateDevelopmentHomeRanges(
  developmentId: number | undefined,
  invalidate: (input: DevelopmentHomeInput) => Promise<unknown>,
): Promise<void> {
  if (!Number.isInteger(developmentId) || (developmentId ?? 0) <= 0) return;

  await Promise.all(
    developmentHomeRanges.map(range => invalidate({ developmentId: developmentId!, range })),
  );
}
