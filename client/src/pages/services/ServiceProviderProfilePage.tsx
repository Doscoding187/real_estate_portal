import { useEffect } from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProviderBadges } from '@/components/services/ProviderBadges';
import { providerIdFromSlug, type ServiceCategory } from '@/features/services/catalog';
import { trpc } from '@/lib/trpc';
import { applySeo } from '@/lib/seo';

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
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <Card>
          <CardContent className="p-6 text-sm text-slate-600">Invalid provider route.</CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-6">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Provider Profile
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              {profile?.companyName || 'Loading provider...'}
            </h1>
            <p className="max-w-2xl text-slate-600">
              {profile?.headline || profile?.bio || 'Profile details are being loaded.'}
            </p>
            <ProviderBadges
              verificationStatus={profile?.verificationStatus}
              moderationTier={profile?.moderationTier}
              subscriptionTier={profile?.subscriptionTier}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setLocation(`/services/request/${defaultCategory}?providerId=${providerId}`)}>
              Request quote
            </Button>
            <Link href={`/services/reviews/${providerId}`}>
              <Button variant="outline">All reviews</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(profile?.services || []).map((service: any) => (
              <div key={`${service.code}-${service.displayName}`} className="rounded-md border p-3">
                <p className="font-medium text-slate-900">{service.displayName}</p>
                <p className="text-slate-600">{service.description || service.category}</p>
              </div>
            ))}
            {(profile?.services || []).length === 0 && (
              <p className="text-slate-600">No services listed yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coverage Areas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(profile?.locations || []).map((location: any) => (
              <div
                key={`${location.id}-${location.city}-${location.suburb}`}
                className="rounded-md border p-3"
              >
                <p className="font-medium text-slate-900">
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

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Recent Reviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(profile?.reviews || []).slice(0, 4).map((review: any) => (
              <article key={review.id} className="rounded-md border p-3">
                <p className="font-medium text-slate-900">
                  {review.rating}/5 {review.title ? `· ${review.title}` : ''}
                </p>
                <p className="text-slate-600">{review.content || 'No written review provided.'}</p>
              </article>
            ))}
            {(profile?.reviews || []).length === 0 && (
              <p className="text-slate-600">No public reviews yet.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
