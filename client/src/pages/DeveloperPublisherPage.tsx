import { useEffect, useState } from 'react';
import { Link, useLocation, useRoute, useSearch } from 'wouter';
import { Helmet } from 'react-helmet-async';
import { Building2, Calendar, Globe, MapPin, ShieldCheck } from 'lucide-react';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SimpleDevelopmentCard } from '@/components/SimpleDevelopmentCard';
import {
  CanonicalPlaceSelector,
  type CanonicalPlaceSelection,
} from '@/components/location/CanonicalPlaceSelector';
import { trpc } from '@/lib/trpc';
import { getPrimaryDevelopmentImageUrl } from '@/lib/mediaUtils';
import { developerDiscoveryHref, readDeveloperPlace } from '@shared/developerDiscovery';

const PAGE_SIZE = 12;
interface PublicProjectPreview {
  id: number;
  name: string;
  slug?: string | null;
  canonicalRoute?: string;
  locationLabels: string[];
  images: unknown;
  priceFrom: number | null;
  priceTo: number | null;
  transactionType: string;
  status: string;
  unitTypes?: { bedrooms: number | null; priceFrom: number | null; priceTo?: number | null }[];
}
function projectPriceRange(project: PublicProjectPreview) {
  const units = (project.unitTypes || []).filter(
    unit =>
      typeof unit.priceFrom === 'number' && Number.isFinite(unit.priceFrom) && unit.priceFrom > 0,
  );
  if (!units.length) return { min: null, max: null };
  return {
    min: Math.min(...units.map(unit => unit.priceFrom!)),
    max: Math.max(
      ...units.map(unit =>
        typeof unit.priceTo === 'number' &&
        Number.isFinite(unit.priceTo) &&
        unit.priceTo >= unit.priceFrom!
          ? unit.priceTo
          : unit.priceFrom!,
      ),
    ),
  };
}
export default function DeveloperPublisherPage() {
  const [, params] = useRoute('/developer/:slug');
  const [, setLocation] = useLocation();
  const search = useSearch();
  const scope = readDeveloperPlace(search);
  const [placeSelection, setPlaceSelection] = useState<CanonicalPlaceSelection | null>(null);
  const slug = params?.slug || '';
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [slug, scope.canonicalPlaceId, scope.invalid]);
  const profileQuery = trpc.developer.getPublicDeveloperBySlug.useQuery(
    { slug },
    { enabled: !!slug, retry: false },
  );
  const profile = profileQuery.data;
  const projectsQuery = trpc.developer.getPublicDevelopmentsForPublisher.useQuery(
    {
      cataloguePublisherId: profile?.cataloguePublisherId || 0,
      canonicalPlaceId: scope.canonicalPlaceId,
      limit: PAGE_SIZE + 1,
      offset: page * PAGE_SIZE,
    },
    { enabled: !!profile && !scope.invalid, retry: false },
  );
  const projects = (projectsQuery.data?.slice(0, PAGE_SIZE) ?? []) as PublicProjectPreview[];
  const hasMore = (projectsQuery.data?.length ?? 0) > PAGE_SIZE;
  const projectsPending = projectsQuery.isLoading || projectsQuery.isFetching;
  useEffect(() => {
    if (profile && window.location.hash === '#developments')
      document.getElementById('developments')?.scrollIntoView({ block: 'start' });
  }, [profile, scope.canonicalPlaceId]);
  const directoryHref = developerDiscoveryHref('/developers', scope.canonicalPlaceId);
  const changePlace = (selection: CanonicalPlaceSelection | null) => {
    setPlaceSelection(selection);
    setPage(0);
    setLocation(
      developerDiscoveryHref(`/developer/${slug}`, selection?.canonicalPlaceId, true),
    );
  };
  if (profileQuery.isLoading)
    return (
      <div className="min-h-screen bg-slate-50">
        <ListingNavbar />
        <div role="status" aria-label="Loading developer profile" className="container py-24">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="mt-6 h-64 rounded-xl" />
        </div>
      </div>
    );
  if (profileQuery.isError || !profile) {
    const unavailable = profileQuery.isError && profileQuery.error.data?.code !== 'NOT_FOUND';
    return (
      <div className="min-h-screen bg-slate-50">
        <Helmet>
          <title>
            {unavailable ? 'Developer unavailable' : 'Developer not found'} | Property Listify
          </title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <ListingNavbar />
        <div className="container py-20 text-center" role={unavailable ? 'alert' : undefined}>
          <Building2 className="mx-auto h-12 w-12 text-slate-400" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            {unavailable ? 'Developer profile could not be loaded' : 'Developer profile not found'}
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            {unavailable
              ? 'Please try again. Your selected canonical Place is still here.'
              : 'This developer profile is not currently available.'}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {unavailable && (
              <Button
                variant="outline"
                disabled={profileQuery.isFetching}
                onClick={() => void profileQuery.refetch()}
                className="min-h-[44px]"
              >
                {profileQuery.isFetching ? 'Trying again…' : 'Try again'}
              </Button>
            )}
            <Button asChild className="min-h-[44px]">
              <Link href={directoryHref}>Browse developers</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }
  const website =
    typeof profile.website === 'string' && /^https?:\/\//i.test(profile.website)
      ? profile.website
      : null;
  const verificationLabel = profile.stats.isOrganisationVerified
    ? 'Verified developer'
    : profile.stats.isContactVerified
      ? 'Contact verified'
      : null;
  const profileUrl = new URL(`/developer/${profile.slug}`, window.location.origin).href;
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: profile.name,
    image: profile.logo,
    description: profile.description,
    url: profileUrl,
    address: profile.address
      ? { '@type': 'PostalAddress', streetAddress: profile.address }
      : undefined,
    telephone: profile.phones?.[0],
    email: profile.emails?.[0],
    sameAs: website ? [website] : [],
  };
  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>{profile.name} | Property Listify</title>
        <meta
          name="description"
          content={
            profile.description
              ? String(profile.description).slice(0, 160)
              : `Explore ${profile.name} and its published developments on Property Listify.`
          }
        />
        <link rel="canonical" href={profileUrl} />
        <script type="application/ld+json">{JSON.stringify(schemaData)}</script>
      </Helmet>
      <ListingNavbar />
      <div className="bg-gradient-to-b from-indigo-900 to-indigo-800 pb-10 pt-24 text-white">
        <div className="container">
          <Link
            href={directoryHref}
            className="mb-4 inline-flex min-h-[44px] items-center rounded-md text-sm text-indigo-100 hover:underline"
          >
            Back to developer directory
          </Link>
          <div className="flex flex-col items-start gap-5 md:flex-row">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-2 md:h-24 md:w-24">
              {profile.logo ? (
                <img
                  src={profile.logo}
                  alt={`${profile.name} logo`}
                  className="h-full w-full object-contain"
                />
              ) : (
                <Building2 className="h-10 w-10 text-indigo-100" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <h1 className="break-words text-3xl font-bold md:text-4xl">{profile.name}</h1>
                {verificationLabel && (
                  <Badge className="border-emerald-300/40 bg-emerald-950/30 text-emerald-100">
                    <ShieldCheck className="mr-1 h-3 w-3" aria-hidden="true" />
                    {verificationLabel}
                  </Badge>
                )}
                {profile.stats.isTrusted && (
                  <Badge className="border-indigo-300/40 bg-indigo-950/30 text-indigo-100">
                    Trusted Partner
                  </Badge>
                )}
              </div>
              {profile.address && (
                <p className="mb-3 flex items-start gap-2 text-sm text-indigo-100">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Head office: {profile.address}</span>
                </p>
              )}
              {profile.description && (
                <p className="mb-4 max-w-2xl text-base leading-relaxed text-indigo-100">
                  {profile.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-indigo-100">
                {profile.stats.establishedYear && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" aria-hidden="true" />
                    Est. {profile.stats.establishedYear}
                  </span>
                )}
                {website && (
                  <a
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md hover:underline"
                  >
                    <Globe className="h-4 w-4" aria-hidden="true" />
                    Website
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="container py-8">
        <section
          id="developments"
          className="scroll-mt-24"
          aria-labelledby="developer-projects-heading"
        >
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2
                id="developer-projects-heading"
                className="flex items-start gap-2 text-xl font-bold leading-snug text-slate-900 md:text-2xl"
              >
                <Building2 className="mt-1 h-5 w-5 shrink-0 text-indigo-600" aria-hidden="true" />
                Published projects{scope.canonicalPlaceId ? ' at the selected Place' : ''}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Open a development to compare its unit types, pricing and current availability.
              </p>
            </div>
            <div className="w-full text-slate-700 sm:w-80">
              <CanonicalPlaceSelector
                value={placeSelection}
                onChange={changePlace}
                purpose="search"
                label="Project Place"
                placeholder="Search approved Places"
                hint="Only projects with this exact reviewed Place assignment match."
              />
              {scope.canonicalPlaceId && !placeSelection && !scope.invalid ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => changePlace(null)}>
                  Clear selected Place
                </Button>
              ) : null}
            </div>
          </div>
          {scope.invalid ? (
            <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-6">
              <h3 className="font-semibold text-slate-900">Choose a canonical project Place</h3>
              <p className="mt-2 text-sm text-slate-600">
                This location link is invalid or uses retired text geography. Choose an
                approved Place above to see matching projects.
              </p>
            </div>
          ) : projectsQuery.isError ? (
            <div
              role="alert"
              className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center"
            >
              <h3 className="font-semibold text-slate-900">
                Published projects could not be loaded
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Please try again. Your developer and selected Place are still here.
              </p>
              <Button
                variant="outline"
                disabled={projectsQuery.isFetching}
                onClick={() => void projectsQuery.refetch()}
                className="mt-4 min-h-[44px] bg-white"
              >
                {projectsQuery.isFetching ? 'Trying again…' : 'Try again'}
              </Button>
            </div>
          ) : projectsPending ? (
            <div
              role="status"
              aria-label="Loading published projects"
              className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
            >
              {[0, 1, 2].map(index => (
                <Skeleton key={index} className="h-80 rounded-xl" />
              ))}
            </div>
          ) : projects.length ? (
            <>
              <p className="mb-4 text-sm text-slate-600" aria-live="polite">
                Showing {page * PAGE_SIZE + 1}–{page * PAGE_SIZE + projects.length} published
                projects
              </p>
              <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map(project => (
                  <SimpleDevelopmentCard
                    key={project.id}
                    id={String(project.id)}
                    title={project.name}
                    locationLabel={project.locationLabels?.join(', ') || 'Place assignment pending'}
                    image={getPrimaryDevelopmentImageUrl(project.images) || ''}
                    priceRange={projectPriceRange(project)}
                    listingType={project.transactionType === 'for_rent' ? 'rent' : 'sale'}
                    bedrooms={(project.unitTypes || [])
                      .map(unit => unit.bedrooms)
                      .filter((value): value is number => typeof value === 'number' && value > 0)}
                    status={
                      project.status === 'selling' ||
                      project.status === 'launching-soon' ||
                      project.status === 'sold-out'
                        ? project.status
                        : undefined
                    }
                    href={project.canonicalRoute || `/development/${project.slug || project.id}`}
                    className="flex h-full max-w-none flex-col"
                    actionLabel="View development"
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
              <Building2 className="mx-auto h-9 w-9 text-slate-400" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-semibold text-slate-900">
                {page
                  ? 'No more published projects'
                  : scope.canonicalPlaceId
                    ? 'No published projects at the selected canonical Place'
                    : 'No published projects listed yet'}
              </h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-600">
                {scope.canonicalPlaceId
                  ? 'Choose another canonical Place or clear the Place filter to view all published projects from this developer.'
                  : 'Published projects will appear here when they become available on Property Listify.'}
              </p>
              {scope.canonicalPlaceId && (
                <Button
                  variant="outline"
                  onClick={() => changePlace(null)}
                  className="mt-4 min-h-[44px]"
                >
                  View all published projects
                </Button>
              )}
            </div>
          )}
          {!scope.invalid &&
            !projectsQuery.isError &&
            !projectsPending &&
            (page > 0 || hasMore) && (
              <nav
                aria-label="Published project pages"
                className="mt-6 flex flex-wrap items-center justify-between gap-3"
              >
                <Button
                  variant="outline"
                  disabled={page === 0}
                  onClick={() => setPage(value => Math.max(0, value - 1))}
                  className="min-h-[44px]"
                >
                  Previous projects
                </Button>
                <span className="text-sm text-slate-600">Page {page + 1}</span>
                <Button
                  variant="outline"
                  disabled={!hasMore}
                  onClick={() => setPage(value => value + 1)}
                  className="min-h-[44px]"
                >
                  Next projects
                </Button>
              </nav>
            )}
        </section>
        {profile.isClaimable && (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-center">
            <p className="mb-3 text-sm text-slate-600">Are you part of the {profile.name} team?</p>
            <Button asChild variant="outline" className="min-h-[44px]">
              <Link href="/developer/setup">Claim this profile</Link>
            </Button>
          </div>
        )}
      </div>
      <div className="bg-slate-100 py-6">
        <p className="container text-center text-xs leading-relaxed text-slate-600">
          Developer information is provided for identification purposes only.
        </p>
      </div>
    </div>
  );
}
