import { trpc } from '@/lib/trpc';
import { MetaControl } from '@/components/seo/MetaControl';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/feedback-state';
import { PageFrame, PageHeader } from '@/components/ui/page-frame';
import NotFound from '@/pages/NotFound';

function searchHref(transaction: 'property-for-sale' | 'property-to-rent', placeId: string) {
  const params = new URLSearchParams({ canonicalPlaceId: placeId });
  return `/${transaction}?${params.toString()}`;
}

export default function CanonicalPlacePage() {
  const path = typeof window === 'undefined' ? '' : window.location.pathname;
  const query = trpc.placeAuthority.resolveCanonicalUrl.useQuery(
    { path },
    { enabled: Boolean(path), retry: false, staleTime: 300_000 },
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
      ? `Settlement within ${place.pathContext.name}`
      : `Administrative context: ${place.pathContext.name}`
    : place.provinceName;
  const indexable = place.publicationEligible && place.verificationStatus === 'verified';
  const origin = typeof window === 'undefined' ? '' : window.location.origin;

  return (
    <PageFrame>
      <MetaControl
        title={`${place.label} property search | Property Listify`}
        description={`Explore property listings in ${place.label}, ${place.provinceName}.`}
        canonicalUrl={`${origin}${place.path}`}
        forceNoIndex={!indexable}
      />
      <div className="space-y-8">
        <PageHeader
          title={place.label}
          description={
            context ? `${place.placeType.replace(/_/g, ' ')} · ${context}` : place.placeType
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

        <section aria-label={`Search property in ${place.label}`} className="space-y-4">
          <p className="max-w-2xl text-muted-foreground">
            Search listings using this canonical place. Its location scope comes from the admitted
            Place Authority.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <a href={searchHref('property-for-sale', place.placeId)}>Search homes for sale</a>
            </Button>
            <Button asChild variant="outline">
              <a href={searchHref('property-to-rent', place.placeId)}>Search rentals</a>
            </Button>
          </div>
        </section>
      </div>
    </PageFrame>
  );
}
