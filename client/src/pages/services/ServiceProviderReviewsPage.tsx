import { useEffect } from 'react';
import { Link, useRoute } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { applySeo } from '@/lib/seo';
import { ArrowRight, BadgeCheck, Sparkles } from 'lucide-react';
import { buildProviderProfilePath, toProviderSlug } from '@/features/services/catalog';
import { useServicesLocation } from '@/features/services/useServicesLocation';

function parsePositiveInteger(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function ServiceProviderReviewsPage() {
  const { search } = useServicesLocation();
  const [, params] = useRoute('/services/reviews/:providerId');
  const providerId = parsePositiveInteger(params?.providerId);
  const routeProviderId = providerId || 0;
  const profileQuery = trpc.servicesEngine.getProviderPublicProfile.useQuery(
    { providerId: routeProviderId },
    { enabled: Boolean(providerId) },
  );
  const reviewsQuery = trpc.servicesEngine.getProviderReviews.useQuery(
    { providerId: routeProviderId, limit: 100 },
    { enabled: Boolean(providerId) },
  );
  const profile = profileQuery.data;
  const providerName = profile?.companyName || 'Provider';
  const reviews = reviewsQuery.data || [];
  const profileSlug = profile
    ? toProviderSlug(profile.companyName, profile.providerId)
    : String(routeProviderId);
  const backToProfilePath = buildProviderProfilePath(profileSlug, search, {
    providerId: routeProviderId,
  });

  useEffect(() => {
    applySeo({
      title: `${providerName} Feedback | Property Listify Services`,
      description: `Read published customer feedback for ${providerName} before requesting a service.`,
      canonicalPath: `/services/reviews/${encodeURIComponent(routeProviderId)}`,
      noindex: true,
    });
  }, [providerId, providerName, routeProviderId]);

  if (!providerId) {
    return (
      <main className="min-h-screen bg-[#f7f4ec] px-4 py-12 md:px-6">
        <Card className="mx-auto max-w-3xl border-[#0f3d91]/10 bg-white shadow-sm">
          <CardContent className="p-8 text-sm text-slate-600">
            This feedback link is not valid.
          </CardContent>
        </Card>
      </main>
    );
  }

  if (profileQuery.isLoading || reviewsQuery.isLoading) {
    return (
      <main className="min-h-screen bg-[#f7f4ec] px-4 py-12 md:px-6">
        <div className="mx-auto max-w-4xl animate-pulse space-y-4">
          <div className="h-48 rounded-2xl bg-slate-200" />
          <div className="h-64 rounded-2xl bg-slate-200" />
        </div>
      </main>
    );
  }

  if (profileQuery.error || reviewsQuery.error || !profile) {
    return (
      <main className="min-h-screen bg-[#f7f4ec] px-4 py-12 md:px-6">
        <Card className="mx-auto max-w-3xl border-[#0f3d91]/10 bg-white shadow-sm">
          <CardContent className="space-y-4 p-8">
            <h1 className="text-2xl font-semibold text-slate-950">Provider feedback unavailable</h1>
            <p className="text-sm leading-6 text-slate-600">
              This provider is not currently published, or the feedback could not be loaded.
            </p>
            <Link href="/services">
              <Button>Browse services</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f4ec]">
      <div className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_top_left,_rgba(15,61,145,0.14),_transparent_30%),radial-gradient(circle_at_80%_10%,_rgba(201,139,43,0.16),_transparent_22%),linear-gradient(180deg,_#f9f6ef_0%,_#eef4ff_56%,_#f7f4ec_100%)]" />
        <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6 md:py-12">
          <section className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_90px_-50px_rgba(15,61,145,0.55)] md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#0f3d91]/15 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f3d91]">
                    <Sparkles className="h-3.5 w-3.5" />
                    Property Listify Services
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#10294f] px-3 py-1 text-xs font-semibold text-white">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Published feedback
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Provider feedback
                  </p>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">
                    {providerName}
                  </h1>
                  <p className="mt-2 max-w-2xl text-slate-600">
                    Read published customer feedback before deciding whether this provider fits your
                    property need.
                  </p>
                </div>
              </div>
              <Link href={backToProfilePath}>
                <Button variant="outline">
                  Back to profile
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.5rem] border border-slate-100 bg-[#faf7f0] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Published feedback
                </p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {reviews.length > 0 ? 'Available' : 'Not listed'}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-100 bg-[#faf7f0] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Evidence type
                </p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  Written customer feedback
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-100 bg-[#faf7f0] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Next step
                </p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  Review the profile and request
                </p>
              </div>
            </div>
          </section>

          <Card className="border-[#0f3d91]/10 bg-white/90 shadow-sm">
            <CardContent className="space-y-3 p-6">
              {reviews.map(review => (
                <article
                  key={review.id}
                  className="rounded-[1rem] border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium text-slate-900">
                        {review.title || 'Published feedback'}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500">
                      {String(review.createdAt || '').slice(0, 10)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {review.content || 'No written comment.'}
                  </p>
                </article>
              ))}
              {reviews.length === 0 && (
                <p className="text-sm text-slate-600">
                  No published feedback for this provider yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
