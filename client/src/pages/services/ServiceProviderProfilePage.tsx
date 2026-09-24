import { useEffect, useState } from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProviderBadges } from '@/components/services/ProviderBadges';
import { ProviderAvatar } from '@/components/services/ProviderAvatar';
import {
  providerIdFromSlug,
  formatPriceRange,
  formatCategoryLabel,
  type ServiceCategory,
} from '@/features/services/catalog';
import { trpc } from '@/lib/trpc';
import { applySeo } from '@/lib/seo';
import { ArrowRight, BadgeCheck, MapPinned, Sparkles } from 'lucide-react';

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return '';
  }
}

export default function ServiceProviderProfilePage() {
  const [, params] = useRoute('/services/provider/:slug');
  const [, setLocation] = useLocation();
  const slug = String(params?.slug || '');
  const providerId = providerIdFromSlug(safeDecode(slug));
  const profileQuery = trpc.servicesEngine.getProviderPublicProfile.useQuery(
    { providerId: providerId || 0 },
    { enabled: Boolean(providerId) },
  );
  const profile = profileQuery.data;
  const [selectedServiceCode, setSelectedServiceCode] = useState<string | null>(null);
  const defaultService =
    profile?.services?.find(service => service.code === selectedServiceCode) ||
    profile?.services?.[0];
  const defaultCategory = (defaultService?.category || 'home_improvement') as ServiceCategory;

  useEffect(() => {
    const providerName = profile?.companyName || 'Service provider';
    applySeo({
      title: `${providerName} | Property Listify Services`,
      description:
        profile?.headline ||
        profile?.bio ||
        'Review published services, listed coverage, and platform verification for this provider.',
      canonicalPath: `/services/provider/${encodeURIComponent(slug)}`,
    });
  }, [profile?.bio, profile?.companyName, profile?.headline, slug]);

  if (!providerId) {
    return (
      <main className="min-h-screen bg-[#f7f4ec] px-4 py-8 md:px-6">
        <Card className="mx-auto max-w-4xl border-[#0f3d91]/10 bg-white shadow-sm">
          <CardContent className="p-6 text-sm text-slate-600">
            This provider link is not valid.
          </CardContent>
        </Card>
      </main>
    );
  }

  if (profileQuery.isLoading) {
    return (
      <main className="min-h-screen bg-[#f7f4ec] px-4 py-8 md:px-6">
        <div className="mx-auto max-w-6xl animate-pulse space-y-4">
          <div className="h-64 rounded-[2rem] bg-slate-200" />
          <div className="h-48 rounded-[2rem] bg-slate-200" />
        </div>
      </main>
    );
  }

  if (profileQuery.error || !profile) {
    return (
      <main className="min-h-screen bg-[#f7f4ec] px-4 py-8 md:px-6">
        <Card className="mx-auto max-w-3xl border-[#0f3d91]/10 bg-white shadow-sm">
          <CardContent className="space-y-4 p-8">
            <h1 className="text-2xl font-semibold text-slate-950">Provider profile unavailable</h1>
            <p className="text-sm leading-6 text-slate-600">
              This provider is not currently published in the Services directory. Browse the
              directory to find an available professional.
            </p>
            <Button onClick={() => setLocation('/services')}>Browse services</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const requestPath = `/services/request/${defaultCategory}?providerId=${providerId}${
    defaultService?.code ? `&serviceCode=${encodeURIComponent(defaultService.code)}` : ''
  }`;

  return (
    <main className="min-h-screen bg-[#f7f4ec]">
      <div className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[36rem] bg-[radial-gradient(circle_at_top_left,_rgba(15,61,145,0.14),_transparent_30%),radial-gradient(circle_at_80%_10%,_rgba(201,139,43,0.16),_transparent_22%),linear-gradient(180deg,_#f9f6ef_0%,_#eef4ff_56%,_#f7f4ec_100%)]" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-6 md:py-12">
          <section className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_90px_-50px_rgba(15,61,145,0.55)] md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex items-start gap-4">
                <ProviderAvatar
                  companyName={profile.companyName}
                  logoUrl={profile.logoUrl}
                  size="lg"
                />
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#0f3d91]/15 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f3d91]">
                      <Sparkles className="h-3.5 w-3.5" />
                      Property Listify Services
                    </span>
                    <ProviderBadges verificationStatus={profile.verificationStatus} />
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">
                      {profile.companyName}
                    </h1>
                    <p className="max-w-2xl text-slate-600">
                      {profile.headline || profile.bio || 'Published provider profile.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1 text-sm text-slate-500">
                      <BadgeCheck className="h-4 w-4 text-emerald-700" />
                      Verification state recorded by Property Listify
                    </span>
                    {profile.websiteUrl && (
                      <a
                        href={profile.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-[#0f3d91] underline-offset-4 hover:underline"
                      >
                        Visit provider website
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="bg-[#0f3d91] hover:bg-[#0a2e6e]"
                  onClick={() => setLocation(requestPath)}
                >
                  Request service
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                {profile.reviews.length > 0 && (
                  <Link href={`/services/reviews/${providerId}`}>
                    <Button variant="outline">Published feedback</Button>
                  </Link>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.5rem] border border-slate-100 bg-[#faf7f0] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Primary service
                </p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {defaultService?.category
                    ? formatCategoryLabel(defaultService.category as ServiceCategory)
                    : 'Service provider'}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-100 bg-[#faf7f0] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Published feedback
                </p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {profile.reviews.length > 0 ? 'Available' : 'Not listed'}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-100 bg-[#faf7f0] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Coverage
                </p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {profile.locations.length} listed areas
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <Card className="border-[#0f3d91]/10 bg-white/90 shadow-sm">
              <CardHeader>
                <CardTitle>Services</CardTitle>
                {profile.services.length > 1 && (
                  <label className="space-y-1 text-xs font-medium text-slate-600">
                    Service to request
                    <select
                      aria-label="Service to request"
                      value={defaultService?.code || ''}
                      onChange={event => setSelectedServiceCode(event.target.value)}
                      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                    >
                      {profile.services.map(service => (
                        <option key={service.code} value={service.code}>
                          {service.displayName}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {profile.services.map(service => (
                  <div
                    key={`${service.code}-${service.displayName}`}
                    className="rounded-[1rem] border border-slate-200 bg-white p-4"
                  >
                    <p className="font-medium text-slate-900">{service.displayName}</p>
                    {service.description && (
                      <p className="mt-1 text-slate-600">{service.description}</p>
                    )}
                    <p className="mt-2 text-slate-500">
                      {service.minPrice != null && service.maxPrice != null
                        ? formatPriceRange(service.minPrice, service.maxPrice)
                        : 'Price on request'}
                    </p>
                  </div>
                ))}
                {profile.services.length === 0 && (
                  <p className="text-slate-600">No services listed yet.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-[#0f3d91]/10 bg-white/90 shadow-sm">
              <CardHeader>
                <CardTitle>Listed coverage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {profile.locations.map(location => (
                  <div
                    key={`${location.id}-${location.city}-${location.suburb}`}
                    className="rounded-[1rem] border border-slate-200 bg-white p-4"
                  >
                    <p className="flex items-center gap-2 font-medium text-slate-900">
                      <MapPinned className="h-4 w-4 text-[#0f3d91]" />
                      {[location.suburb, location.city, location.province]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                    <p className="mt-1 text-slate-600">Coverage label supplied by the provider</p>
                  </div>
                ))}
                {profile.locations.length === 0 && (
                  <p className="text-slate-600">No coverage areas listed yet.</p>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <Card className="border-[#0f3d91]/10 bg-white/90 shadow-sm">
              <CardHeader>
                <CardTitle>Published feedback</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {profile.reviews.slice(0, 5).map(review => (
                  <article
                    key={review.id}
                    className="space-y-1 rounded-[1rem] border border-slate-200 bg-white p-4"
                  >
                    {review.title && <p className="font-medium text-slate-900">{review.title}</p>}
                    <p className="text-slate-600">
                      {review.content || 'No written review provided.'}
                    </p>
                  </article>
                ))}
                {profile.reviews.length === 0 && (
                  <p className="text-slate-600">No published feedback yet.</p>
                )}
              </CardContent>
            </Card>

            <aside className="space-y-4">
              <Card className="border-[#0f3d91]/10 bg-white/90 shadow-sm">
                <CardHeader>
                  <CardTitle>Before you contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
                  <p>Check that the service and listed coverage fit your property need.</p>
                  <p>
                    Use published feedback as one input, not a guarantee of availability or outcome.
                  </p>
                  <Button
                    className="w-full bg-[#0f3d91] hover:bg-[#0a2e6e]"
                    onClick={() => setLocation(requestPath)}
                  >
                    Request this provider
                  </Button>
                </CardContent>
              </Card>
            </aside>
          </section>
        </div>
      </div>
    </main>
  );
}
