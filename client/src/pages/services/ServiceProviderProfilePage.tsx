import { useEffect } from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProviderBadges } from '@/components/services/ProviderBadges';
import { ProviderAvatar } from '@/components/services/ProviderAvatar';
import { StarRating } from '@/components/services/StarRating';
import {
  providerIdFromSlug,
  formatPriceRange,
  formatCategoryLabel,
  type ServiceCategory,
} from '@/features/services/catalog';
import { trpc } from '@/lib/trpc';
import { applySeo } from '@/lib/seo';
import { ArrowRight, BadgeCheck, MapPinned, Sparkles } from 'lucide-react';

export default function ServiceProviderProfilePage() {
  const [, params] = useRoute('/services/provider/:slug');
  const [, setLocation] = useLocation();
  const slug = String(params?.slug || '');
  const providerId = providerIdFromSlug(decodeURIComponent(slug));

  const profileQuery = trpc.servicesEngine.getProviderPublicProfile.useQuery(
    { providerId },
    { enabled: Boolean(providerId) },
  );
  const profile = profileQuery.data;

  const defaultCategory = (profile?.services?.[0]?.category || 'home_improvement') as ServiceCategory;

  useEffect(() => {
    const providerName = profile?.companyName || 'Service Provider';
    applySeo({
      title: `${providerName} | Service Provider Profile`,
      description:
        profile?.headline ||
        profile?.bio ||
        'View provider services, coverage areas, verification badges, and customer reviews.',
      canonicalPath: `/services/provider/${encodeURIComponent(slug)}`,
    });
  }, [profile?.bio, profile?.companyName, profile?.headline, slug]);

  if (!providerId) {
    return (
      <main className="min-h-screen bg-[#f7f4ec]">
        <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6">
          <Card className="border-[#0f3d91]/10 bg-white/90 shadow-sm">
            <CardContent className="p-6 text-sm text-slate-600">Invalid provider route.</CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f4ec]">
      <div className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[36rem] bg-[radial-gradient(circle_at_top_left,_rgba(15,61,145,0.14),_transparent_30%),radial-gradient(circle_at_80%_10%,_rgba(201,139,43,0.16),_transparent_22%),linear-gradient(180deg,_#f9f6ef_0%,_#eef4ff_56%,_#f7f4ec_100%)]" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-6 md:py-12">
          <section className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_90px_-50px_rgba(15,61,145,0.55)] md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex items-start gap-4">
                <ProviderAvatar
                  companyName={profile?.companyName || '?'}
                  logoUrl={profile?.logoUrl}
                  size="lg"
                />
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#0f3d91]/15 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f3d91]">
                      <Sparkles className="h-3.5 w-3.5" />
                      Service Listify
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-[#10294f] px-3 py-1 text-xs font-semibold text-white">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Provider profile
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">
                      {profile?.companyName || 'Loading provider...'}
                    </h1>
                    <p className="max-w-2xl text-slate-600">
                      {profile?.headline || profile?.bio || 'Profile details are being loaded.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <StarRating
                      rating={profile?.averageRating ?? null}
                      reviewCount={profile?.reviewCount ?? 0}
                      showCount
                    />
                    <ProviderBadges
                      verificationStatus={profile?.verificationStatus}
                      moderationTier={profile?.moderationTier}
                      subscriptionTier={profile?.subscriptionTier}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  className="bg-[#0f3d91] hover:bg-[#0a2e6e]"
                  onClick={() =>
                    setLocation(`/services/request/${defaultCategory}?providerId=${providerId}`)
                  }
                >
                  Request quote
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Link href={`/services/reviews/${providerId}`}>
                  <Button variant="outline">All reviews</Button>
                </Link>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.5rem] border border-slate-100 bg-[#faf7f0] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Primary service
                </p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {profile?.services?.[0]?.category
                    ? formatCategoryLabel(profile.services[0].category as ServiceCategory)
                    : 'Service provider'}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-100 bg-[#faf7f0] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Reviews
                </p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {profile?.reviewCount ?? 0} public reviews
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-100 bg-[#faf7f0] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Coverage
                </p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {(profile?.locations || []).length > 0 ? `${profile?.locations?.length} listed areas` : 'Coverage on request'}
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <Card className="border-[#0f3d91]/10 bg-white/90 shadow-sm">
              <CardHeader>
                <CardTitle>Services</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {(profile?.services || []).map((service: any) => (
                  <div
                    key={`${service.code}-${service.displayName}`}
                    className="rounded-[1rem] border border-slate-200 bg-white p-4"
                  >
                    <p className="font-medium text-slate-900">{service.displayName}</p>
                    {service.description && (
                      <p className="text-slate-600">{service.description}</p>
                    )}
                    <p className="mt-1 text-slate-500">
                      {service.minPrice != null && service.maxPrice != null
                        ? formatPriceRange(service.minPrice, service.maxPrice)
                        : 'Price on request'}
                    </p>
                  </div>
                ))}
                {(profile?.services || []).length === 0 && (
                  <p className="text-slate-600">No services listed yet.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-[#0f3d91]/10 bg-white/90 shadow-sm">
              <CardHeader>
                <CardTitle>Coverage Areas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {(profile?.locations || []).map((location: any) => (
                  <div
                    key={`${location.id}-${location.city}-${location.suburb}`}
                    className="rounded-[1rem] border border-slate-200 bg-white p-4"
                  >
                    <p className="flex items-center gap-2 font-medium text-slate-900">
                      <MapPinned className="h-4 w-4 text-[#0f3d91]" />
                      {[location.suburb, location.city, location.province].filter(Boolean).join(', ')}
                    </p>
                    <p className="text-slate-600">Radius: {location.radiusKm}km</p>
                  </div>
                ))}
                {(profile?.locations || []).length === 0 && (
                  <p className="text-slate-600">No coverage areas listed yet.</p>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <Card className="border-[#0f3d91]/10 bg-white/90 shadow-sm">
              <CardHeader>
                <CardTitle>Recent Reviews</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {(profile?.reviews || []).slice(0, 5).map((review: any) => (
                  <article key={review.id} className="space-y-1 rounded-[1rem] border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2">
                      <StarRating rating={review.rating} size="sm" />
                      {review.isVerified === 1 && (
                        <span className="text-xs font-medium text-emerald-700">Verified review</span>
                      )}
                    </div>
                    {review.title && (
                      <p className="font-medium text-slate-900">{review.title}</p>
                    )}
                    <p className="text-slate-600">{review.content || 'No written review provided.'}</p>
                  </article>
                ))}
                {(profile?.reviews || []).length === 0 && (
                  <p className="text-slate-600">No public reviews yet.</p>
                )}
              </CardContent>
            </Card>

            <aside className="space-y-4">
              <Card className="border-[#0f3d91]/10 bg-white/90 shadow-sm">
                <CardHeader>
                  <CardTitle>Why homeowners shortlist this provider</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600">
                  <p>Check the service list, review count, and area coverage together before requesting a quote.</p>
                  <p>Use the review page when you need more proof before contacting the provider.</p>
                  <Button
                    className="w-full bg-[#0f3d91] hover:bg-[#0a2e6e]"
                    onClick={() =>
                      setLocation(`/services/request/${defaultCategory}?providerId=${providerId}`)
                    }
                  >
                    Contact this provider
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
