import { trpc } from '@/lib/trpc';
import { developmentPriceLabel } from '@/lib/developmentPriceLabel';

const SECTION_LIMIT = 6;

/**
 * "New developments in <place>" for a city or province page. It is fed by the
 * same public development search as /new-developments, which includes the
 * developments of the suburbs beneath the place, so the page and the search
 * always agree. Honest empty state; "See all developments" opens the search.
 */
export function PlaceDevelopmentsSection({
  placeId,
  placeLabel,
}: {
  placeId: string;
  placeLabel: string;
}) {
  const query = trpc.properties.searchDevelopments.useQuery(
    { canonicalPlaceId: placeId, page: 0, pageSize: SECTION_LIMIT },
    { enabled: Boolean(placeId), retry: false, staleTime: 60_000 },
  );
  const seeAllHref = `/new-developments?${new URLSearchParams({ canonicalPlaceId: placeId })}`;
  const items = query.data?.items ?? [];

  return (
    <section
      aria-labelledby="place-developments-title"
      className="space-y-4 rounded-xl border p-5"
      data-testid="place-developments"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="place-developments-title" className="text-xl font-semibold">
            New developments in {placeLabel}
          </h2>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Published projects in {placeLabel} and the suburbs within it.
          </p>
        </div>
        <a
          className="font-medium text-primary underline-offset-4 hover:underline"
          href={seeAllHref}
        >
          See all developments
        </a>
      </div>
      {query.isPending ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading developments…
        </p>
      ) : query.error ? (
        <p role="alert" className="text-sm text-destructive">
          Developments could not be loaded. Try again later.
        </p>
      ) : items.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(item => (
            <li key={item.id}>
              <a
                href={item.canonicalRoute}
                className="flex h-full flex-col gap-1 rounded-lg border p-4 transition-colors hover:border-primary hover:bg-muted/40"
              >
                <span className="font-medium">{item.name}</span>
                {item.locationLabels.length ? (
                  <span className="text-sm text-muted-foreground">
                    {item.locationLabels.join(', ')}
                  </span>
                ) : null}
                {item.publisher?.name ? (
                  <span className="text-sm text-muted-foreground">by {item.publisher.name}</span>
                ) : null}
                {item.priceFrom ? (
                  <span className="text-sm">
                    From {developmentPriceLabel(item.priceFrom, item.transactionType)}
                  </span>
                ) : null}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No published developments in {placeLabel} yet.
        </p>
      )}
    </section>
  );
}
