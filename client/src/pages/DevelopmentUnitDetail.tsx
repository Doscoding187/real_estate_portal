import { Link, useParams } from 'wouter';
import { Helmet } from 'react-helmet-async';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Breadcrumbs } from '@/components/search/Breadcrumbs';
import { MetaControl } from '@/components/seo/MetaControl';
import { PropertyImageGallery } from '@/components/property/PropertyImageGallery';
import { LeadCaptureForm } from '@/components/developer/LeadCaptureForm';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { SimpleDevelopmentUnitCard } from '@/components/SimpleDevelopmentUnitCard';
import { trpc } from '@/lib/trpc';
import { formatCurrency, formatPriceRangeCompact } from '@/lib/utils';
import { resolveMediaUrl } from '@/lib/mediaUtils';
import {
  ArrowRight,
  Bath,
  Bed,
  Building2,
  Clock3,
  MapPin,
  Ruler,
  Users,
} from 'lucide-react';

type RouteParams = {
  slug?: string;
  unitSlug?: string;
};

const formatListingPrice = (
  listingType: 'sale' | 'rent' | 'auction',
  priceFrom?: number | null,
  priceTo?: number | null,
) => {
  if (listingType === 'rent') {
    return priceFrom ? `${formatCurrency(priceFrom)} / month` : 'Price on request';
  }

  if (listingType === 'auction') {
    return priceFrom ? `Starting from ${formatCurrency(priceFrom)}` : 'Auction price on request';
  }

  return formatPriceRangeCompact(priceFrom, priceTo);
};

const formatAvailability = (availableUnits: number, totalUnits: number) => {
  if (availableUnits > 0 && totalUnits > 0) return `${availableUnits} of ${totalUnits} available`;
  if (availableUnits > 0) return `${availableUnits} available`;
  if (totalUnits > 0) return `${totalUnits} planned`;
  return 'Availability on request';
};

function LoadingState() {
  return (
    <div className="min-h-screen bg-slate-50">
      <ListingNavbar />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-16 pt-24 md:px-6">
        <Skeleton className="h-5 w-72" />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-[420px] w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-[420px] w-full rounded-2xl" />
        </div>
      </main>
    </div>
  );
}

export default function DevelopmentUnitDetail() {
  const { slug, unitSlug } = useParams<RouteParams>();

  const unitQuery = trpc.developer.getPublicDevelopmentUnitBySlug.useQuery(
    {
      slugOrId: slug || '',
      unitSlug: unitSlug || '',
    },
    {
      enabled: Boolean(slug && unitSlug),
    },
  );

  if (unitQuery.isLoading) {
    return <LoadingState />;
  }

  if (unitQuery.error || !unitQuery.data) {
    return (
      <div className="min-h-screen bg-slate-50">
        <ListingNavbar />
        <main className="mx-auto flex w-full max-w-4xl flex-col items-center px-4 pb-20 pt-28 text-center md:px-6">
          <Badge className="mb-4 border border-red-200 bg-red-50 text-red-700">Unit not found</Badge>
          <h1 className="mb-3 text-3xl font-bold text-slate-900">This development unit is unavailable</h1>
          <p className="mb-8 max-w-2xl text-sm text-slate-600">
            The unit may have been removed or the development is no longer publicly available.
          </p>
          <div className="flex gap-3">
            <Button asChild variant="outline">
              <Link href="/new-developments">Browse developments</Link>
            </Button>
            <Button asChild className="bg-[#2774AE] hover:bg-[#1f5d8b]">
              <Link href="/">Go home</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const unit = unitQuery.data;
  const parsedUnitId = Number(unit.unitTypeId);
  const developmentHref = `/development/${unit.developmentSlug || unit.developmentId}`;
  const galleryImages =
    unit.gallery.length > 0
      ? unit.gallery.map((image, index) => ({
          id: index + 1,
          imageUrl: resolveMediaUrl(image) || image,
          isPrimary: index === 0 ? 1 : 0,
          displayOrder: index,
        }))
      : [];

  const priceLabel = formatListingPrice(unit.listingType, unit.priceFrom, unit.priceTo);
  const metaDescription =
    unit.description ||
    `${unit.unitTypeName} in ${unit.developmentName}, ${unit.suburb || unit.city}. ${priceLabel}.`;
  const siteOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'https://propertylistifysa.co.za';
  const unitCanonicalUrl = `${siteOrigin}${unit.href}`;
  const developmentCanonicalUrl = `${siteOrigin}${developmentHref}`;

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Developments', href: '/new-developments' },
    { label: unit.developmentName, href: developmentHref },
    { label: unit.unitTypeName, href: unit.href },
  ];

  const specs = [
    {
      label: 'Bedrooms',
      value: unit.bedrooms ? `${unit.bedrooms}` : 'On request',
      icon: Bed,
    },
    {
      label: 'Bathrooms',
      value: unit.bathrooms ? `${unit.bathrooms}` : 'On request',
      icon: Bath,
    },
    {
      label: 'Floor size',
      value: unit.unitSize ? `${unit.unitSize} m2` : 'On request',
      icon: Ruler,
    },
    {
      label: 'Availability',
      value: formatAvailability(unit.availableUnits, unit.totalUnits),
      icon: Users,
    },
  ];
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${siteOrigin}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Developments',
        item: `${siteOrigin}/new-developments`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: unit.developmentName,
        item: developmentCanonicalUrl,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: unit.unitTypeName,
        item: unitCanonicalUrl,
      },
    ],
  };
  const unitSchemaType =
    unit.propertyType === 'house'
      ? 'SingleFamilyResidence'
      : unit.propertyType === 'townhouse'
        ? 'Residence'
        : 'Apartment';
  const unitSchema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': unitSchemaType,
    name: `${unit.unitTypeName} at ${unit.developmentName}`,
    description: metaDescription,
    url: unitCanonicalUrl,
    image: galleryImages.map(image => image.imageUrl).filter(Boolean),
    isPartOf: {
      '@type': 'Residence',
      name: unit.developmentName,
      url: developmentCanonicalUrl,
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: unit.address || undefined,
      addressLocality: unit.city,
      addressRegion: unit.province,
      addressCountry: 'ZA',
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'ZAR',
      price: unit.priceFrom ?? undefined,
      availability:
        unit.availableUnits > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/PreOrder',
      url: unitCanonicalUrl,
      seller: {
        '@type': 'Organization',
        name: unit.developerDisplay.name,
      },
    },
    additionalProperty: [
      unit.bedrooms != null
        ? {
            '@type': 'PropertyValue',
            name: 'Bedrooms',
            value: unit.bedrooms,
          }
        : null,
      unit.bathrooms != null
        ? {
            '@type': 'PropertyValue',
            name: 'Bathrooms',
            value: unit.bathrooms,
          }
        : null,
      unit.unitSize != null
        ? {
            '@type': 'PropertyValue',
            name: 'Floor Size',
            value: unit.unitSize,
            unitText: 'm2',
          }
        : null,
      {
        '@type': 'PropertyValue',
        name: 'Available Units',
        value: unit.availableUnits,
      },
    ].filter(Boolean),
  };

  if (unit.latitude && unit.longitude) {
    unitSchema.geo = {
      '@type': 'GeoCoordinates',
      latitude: Number(unit.latitude),
      longitude: Number(unit.longitude),
    };
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <MetaControl
        canonicalUrl={unitCanonicalUrl}
        title={`${unit.unitTypeName} at ${unit.developmentName} | ${unit.city}`}
        description={metaDescription}
        image={resolveMediaUrl(unit.image || unit.gallery[0] || '') || undefined}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(unitSchema)}</script>
      </Helmet>

      <ListingNavbar />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-16 pt-24 md:px-6">
        <Breadcrumbs items={breadcrumbItems} className="pt-2" />

        <section className="grid gap-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-0 bg-slate-950 text-white">Development Unit</Badge>
              <Badge variant="outline" className="border-[#2774AE]/20 bg-[#2774AE]/5 text-[#2774AE]">
                {unit.listingType === 'rent'
                  ? 'For Rent'
                  : unit.listingType === 'auction'
                    ? 'Auction'
                    : 'For Sale'}
              </Badge>
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                Part of {unit.developmentName}
              </Badge>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
                Unit type
              </p>
              <h1 className="max-w-4xl text-3xl font-bold leading-tight text-slate-950 md:text-5xl">
                {unit.unitTypeName}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span>{unit.suburb ? `${unit.suburb}, ${unit.city}` : unit.city}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-400" />
                <span>Presented by {unit.developerDisplay.name}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {specs.map(spec => {
                const Icon = spec.icon;
                return (
                  <div
                    key={spec.label}
                    className="flex min-w-[160px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="rounded-xl bg-white p-2 text-[#2774AE] shadow-sm">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        {spec.label}
                      </p>
                      <p className="text-sm font-semibold text-slate-900">{spec.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Card className="overflow-hidden rounded-[24px] border-slate-200 shadow-none">
            <CardContent className="space-y-5 p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Starting from</p>
                <p className="mt-2 text-3xl font-bold text-[#2774AE]">{priceLabel}</p>
              </div>
              <Separator />
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 h-4 w-4 text-slate-400" />
                  <span>{formatAvailability(unit.availableUnits, unit.totalUnits)}</span>
                </div>
                <div className="flex items-start gap-3">
                  <ArrowRight className="mt-0.5 h-4 w-4 text-slate-400" />
                  <span>Enquiries go directly to the development team.</span>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Button asChild className="w-full bg-[#2774AE] hover:bg-[#1f5d8b]">
                  <a href="#unit-enquiry">Enquire about this unit</a>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href={developmentHref}>View full development</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="space-y-8">
            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white p-4 md:p-6">
              <PropertyImageGallery images={galleryImages} propertyTitle={unit.title} />
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2774AE]">
                    Why this page looks different
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-950">Built for development inventory</h2>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-slate-200 shadow-none">
                  <CardContent className="space-y-2 p-5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Context</p>
                    <p className="text-sm text-slate-700">
                      This is a unit type within <span className="font-semibold">{unit.developmentName}</span>, not a standalone resale listing.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-none">
                  <CardContent className="space-y-2 p-5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Ownership</p>
                    <p className="text-sm text-slate-700">
                      Leads are routed to <span className="font-semibold">{unit.developerDisplay.name}</span> so the buyer stays attached to the development team.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-none">
                  <CardContent className="space-y-2 p-5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Discovery</p>
                    <p className="text-sm text-slate-700">
                      Pricing, specs, and availability are unit-specific, while the broader project remains accessible from the parent development page.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6">
              <div className="mb-4">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Overview</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">
                  {unit.unitTypeName} at {unit.developmentName}
                </h2>
              </div>
              <p className="max-w-4xl text-sm leading-7 text-slate-700">
                {unit.description ||
                  `Explore this ${unit.unitTypeName.toLowerCase()} in ${unit.developmentName}. The page focuses on the unit type itself, while staying clearly attached to its parent development for stronger buyer context and cleaner SEO.`}
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Card className="border-slate-200 shadow-none">
                  <CardContent className="space-y-3 p-5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Development</p>
                    <p className="text-lg font-semibold text-slate-900">{unit.developmentName}</p>
                    <Button asChild variant="ghost" className="h-auto justify-start p-0 text-[#2774AE]">
                      <Link href={developmentHref}>Go to development page</Link>
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-none">
                  <CardContent className="space-y-3 p-5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Location</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {unit.suburb ? `${unit.suburb}, ${unit.city}` : unit.city}
                    </p>
                    <p className="text-sm text-slate-600">{unit.address || unit.province}</p>
                  </CardContent>
                </Card>
              </div>
            </section>

            {unit.siblings.length > 0 && (
              <section className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      More in this development
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-950">Other unit types</h2>
                  </div>
                  <Button asChild variant="outline">
                    <Link href={developmentHref}>See full development</Link>
                  </Button>
                </div>
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {unit.siblings.map((sibling: any) => (
                    <SimpleDevelopmentUnitCard
                      key={sibling.id}
                      id={sibling.id}
                      title={sibling.unitTypeName}
                      developmentName={sibling.developmentName}
                      city={sibling.city}
                      suburb={sibling.suburb || undefined}
                      image={sibling.image}
                      href={sibling.href}
                      priceFrom={sibling.priceFrom}
                      priceTo={sibling.priceTo}
                      bedrooms={sibling.bedrooms}
                      bathrooms={sibling.bathrooms}
                      unitSize={sibling.unitSize}
                      listingType={sibling.listingType}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside id="unit-enquiry" className="space-y-5 lg:sticky lg:top-24">
            <Card className="rounded-[28px] border-slate-200 shadow-none">
              <CardContent className="space-y-5 p-6">
                <div className="space-y-2">
                  <Badge className="border border-[#2774AE]/20 bg-[#2774AE]/5 text-[#2774AE]">
                    Contact developer
                  </Badge>
                  <h2 className="text-2xl font-bold text-slate-950">{unit.developerDisplay.name}</h2>
                  <p className="text-sm leading-6 text-slate-600">
                    Ask about pricing, availability, brochures, or similar unit options in this development.
                  </p>
                </div>
                <LeadCaptureForm
                  developmentId={unit.developmentId}
                  unitId={Number.isFinite(parsedUnitId) ? parsedUnitId : undefined}
                  developerBrandProfileId={unit.developerBrandProfileId || undefined}
                  leadSource="development_unit_detail"
                  defaultMessage={`Hi, I'm interested in the ${unit.unitTypeName} at ${unit.developmentName}. Please share current pricing, availability, and next steps.`}
                  title="Enquire about this unit type"
                  description="Your enquiry goes to the development sales team, not to a standalone listing owner."
                  submitLabel="Send unit enquiry"
                />
              </CardContent>
            </Card>
          </aside>
        </section>
      </main>

      <Footer />
    </div>
  );
}
