import { trpc } from '@/lib/trpc';
import { MetaControl } from '@/components/seo/MetaControl';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/feedback-state';
import { PageFrame, PageHeader } from '@/components/ui/page-frame';
import NotFound from '@/pages/NotFound';
import { isLandPublicDiscoveryAvailable } from '@shared/landLaunchPolicy';
import { useSearch } from 'wouter';

type PropertyGuideMode = 'sale' | 'rent';

function searchHref(transaction: 'property-for-sale' | 'property-to-rent', placeId: string) {
  const params = new URLSearchParams({ canonicalPlaceId: placeId });
  return '/' + transaction + '?' + params.toString();
}

function guideHref(path: string, mode: PropertyGuideMode) {
  return path + '?' + new URLSearchParams({ mode }).toString();
}

function inventoryLabel(mode: PropertyGuideMode, listingCount: number) {
  if (mode === 'sale') return listingCount + (listingCount === 1 ? ' home for sale' : ' homes for sale');
  return listingCount + (listingCount === 1 ? ' rental listing' : ' rental listings');
}

export default function CanonicalPlacePage() {
  const path = typeof window === 'undefined' ? '' : window.location.pathname;
  const search = useSearch();
  const requestedMode = new URLSearchParams(search).get('mode');
  const guideMode: PropertyGuideMode | null =
    requestedMode === 'sale' || requestedMode === 'rent' ? requestedMode : null;
  const query = trpc.placeAuthority.resolveCanonicalUrl.useQuery(
    { path },
    { enabled: Boolean(path), retry: false, staleTime: 300_000 },
  );
  const resolvedPlace = query.data;
  const isBroadPlace =
    resolvedPlace?.searchScope === 'province' || resolvedPlace?.searchScope === 'metro_city';
  const landDiscoveryAvailable = isLandPublicDiscoveryAvailable();
  const landAreas = trpc.landPublic.guideAreas.useQuery(
    { canonicalPlaceId: resolvedPlace?.placeId ?? '' },
    {
      enabled: Boolean(landDiscoveryAvailable && resolvedPlace?.placeId && isBroadPlace),
      retry: false,
      staleTime: 60_000,
    },
  );
  const propertyAreas = trpc.properties.guideAreas.useQuery(
    {
      canonicalPlaceId: resolvedPlace?.placeId ?? '',
      listingType: guideMode ?? 'sale',
    },
    {
      enabled: Boolean(resolvedPlace?.placeId && isBroadPlace && guideMode),
      retry: false,
      staleTime: 60_000,
    },
  );

  if (query.isLoading) {
    return (
      <PageFrame>
        <LoadingState title="Loading place" />
      </PageFrame>
    );
  }
  if (query.error || !query.data) return <NotFound />;

  const place = query.data;
  const context = place.pathContext
    ? place.pathContext.relationship_type === 'settlement_within'
      ? 'Settlement within ' + place.pathContext.name
      : 'Administrative context: ' + place.pathContext.name
    : place.provinceName;
  const indexable = place.publicationEligible && place.verificationStatus === 'verified';
  const origin = typeof window === 'undefined' ? '' : window.location.origin;

  return (
    <PageFrame>
      <MetaControl
        title={place.label + ' property search | Property Listify'}
        description={'Explore property listings in ' + place.label + ', ' + place.provinceName + '.'}
        canonicalUrl={origin + place.path}
        forceNoIndex={!indexable}
      />
      <div className="space-y-8">
        <PageHeader
          title={place.label}
          description={
            context ? place.placeType.replace(/_/g, ' ') + ' · ' + context : place.placeType
          }
          breadcrumbs={
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <a href="/south-africa" className="underline-offset-4 hover:underline">
                South Africa
              </a>
              <span aria-hidden="true">/</span>
              <span>{place.provinceName}</span>
              <span aria-hidden="true">/</span>
              <span aria-current="page" className="text-foreground">
                {place.label}
              </span>
            </nav>
          }
        />

        {isBroadPlace && guideMode ? (
          <section
            aria-labelledby="property-area-guide-title"
            className="space-y-4 rounded-xl border p-5"
          >
            <div>
              <h2 id="property-area-guide-title" className="text-xl font-semibold">
                Explore {guideMode === 'sale' ? 'homes for sale' : 'rentals'} in {place.label}
              </h2>
              <p className="mt-1 max-w-2xl text-muted-foreground">
                Choose an area to see published{' '}
                {guideMode === 'sale' ? 'homes for sale' : 'rental listings'} there.
              </p>
            </div>
            {propertyAreas.isPending ? (
              <p role="status" className="text-sm text-muted-foreground">
                Loading areas with published {guideMode === 'sale' ? 'homes for sale' : 'rental'}{' '}
                inventory…
              </p>
            ) : propertyAreas.error ? (
              <p role="alert" className="text-sm text-destructive">
                Areas could not be loaded. Try again later.
              </p>
            ) : propertyAreas.data?.length ? (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {propertyAreas.data.map(area => (
                  <li key={area.placeId}>
                    <a
                      href={area.href}
                      className="flex min-h-20 items-center justify-between gap-3 rounded-lg border p-4 transition-colors hover:border-primary hover:bg-muted/40"
                    >
                      <span className="font-medium">{area.label}</span>
                      <span className="shrink-0 text-sm text-muted-foreground">
                        {inventoryLabel(guideMode, area.listingCount)}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div role="status" className="space-y-2 text-sm text-muted-foreground">
                <p>
                  {guideMode === 'sale'
                    ? 'No homes for sale in ' + place.label + ' yet.'
                    : 'No rentals in ' + place.label + ' yet.'}
                </p>
                <a
                  className="font-medium text-primary underline-offset-4 hover:underline"
                  href={guideMode === 'sale' ? '/property-for-sale' : '/property-to-rent'}
                >
                  {guideMode === 'sale'
                    ? 'Search homes for sale in another area'
                    : 'Search rentals in another area'}
                </a>
              </div>
            )}
          </section>
        ) : null}

        {landDiscoveryAvailable && isBroadPlace ? (
          <section aria-labelledby="land-area-guide-title" className="space-y-4 rounded-xl border p-5">
            <div>
              <h2 id="land-area-guide-title" className="text-xl font-semibold">
                Explore Land in {place.label}
              </h2>
              <p className="mt-1 max-w-2xl text-muted-foreground">
                Choose a suburb or locality that interests you to see Land listings in that exact area.
              </p>
            </div>
            {landAreas.isPending ? (
              <p role="status" className="text-sm text-muted-foreground">
                Loading areas with published Land listings…
              </p>
            ) : landAreas.error ? (
              <p role="alert" className="text-sm text-destructive">
                Land areas could not be loaded. Try again later.
              </p>
            ) : landAreas.data?.length ? (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {landAreas.data.map(area => (
                  <li key={area.placeId}>
                    <a
                      href={area.href}
                      className="flex min-h-20 items-center justify-between gap-3 rounded-lg border p-4 transition-colors hover:border-primary hover:bg-muted/40"
                    >
                      <span className="font-medium">{area.label}</span>
                      <span className="shrink-0 text-sm text-muted-foreground">
                        {area.listingCount} Land {area.listingCount === 1 ? 'listing' : 'listings'}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div role="status" className="space-y-2 text-sm text-muted-foreground">
                <p>No land listed in {place.label} yet.</p>
                <a className="font-medium text-primary underline-offset-4 hover:underline" href="/plots-and-land">
                  Search Land in another area
                </a>
              </div>
            )}
          </section>
        ) : null}

        <section aria-label={'Search property in ' + place.label} className="space-y-4">
          <p className="max-w-2xl text-muted-foreground">
            {isBroadPlace
              ? 'Choose Sale or Rent to browse published listings in exact localities within this area.'
              : 'Search listings using this canonical place. Its location scope comes from the admitted Place Authority.'}
          </p>
          <div className="flex flex-wrap gap-3">
            {isBroadPlace ? (
              <>
                <Button asChild variant={guideMode === 'rent' ? 'outline' : 'default'}>
                  <a
                    href={guideHref(place.path, 'sale')}
                    aria-current={guideMode === 'sale' ? 'page' : undefined}
                  >
                    {guideMode === 'sale' ? 'Homes for sale' : 'Explore homes for sale'}
                  </a>
                </Button>
                <Button asChild variant={guideMode === 'rent' ? 'default' : 'outline'}>
                  <a
                    href={guideHref(place.path, 'rent')}
                    aria-current={guideMode === 'rent' ? 'page' : undefined}
                  >
                    {guideMode === 'rent' ? 'Rentals' : 'Explore rentals'}
                  </a>
                </Button>
              </>
            ) : (
              <>
                <Button asChild>
                  <a href={searchHref('property-for-sale', place.placeId)}>Search homes for sale</a>
                </Button>
                <Button asChild variant="outline">
                  <a href={searchHref('property-to-rent', place.placeId)}>Search rentals</a>
                </Button>
              </>
            )}
          </div>
        </section>
      </div>
    </PageFrame>
  );
}
