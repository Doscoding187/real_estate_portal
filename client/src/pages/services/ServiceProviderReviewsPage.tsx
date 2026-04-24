import { useEffect } from 'react';
import { Link, useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { applySeo } from '@/lib/seo';
import { StarRating } from '@/components/services/StarRating';
import { ArrowRight, BadgeCheck, Sparkles } from 'lucide-react';

export default function ServiceProviderReviewsPage() {
  const [, params] = useRoute('/services/reviews/:providerId');
  const providerId = String(params?.providerId || '');

  const profileQuery = trpc.servicesEngine.getProviderPublicProfile.useQuery(
    { providerId },
    { enabled: Boolean(providerId) },
  );
  const reviewsQuery = trpc.servicesEngine.getProviderReviews.useQuery(
    { providerId, limit: 100 },
    { enabled: Boolean(providerId) },
  );

  const providerName = profileQuery.data?.companyName || 'Provider';
  const reviews = reviewsQuery.data || [];

  useEffect(() => {
    applySeo({
      title: `${providerName} Reviews | Services`,
      description: `Read verified customer reviews and ratings for ${providerName}.`,
      canonicalPath: `/services/reviews/${encodeURIComponent(providerId)}`,
      noindex: true,
    });
  }, [providerId, providerName]);

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
                    Service Listify
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#10294f] px-3 py-1 text-xs font-semibold text-white">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Reviews
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Reviews</p>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">{providerName}</h1>
                  <p className="mt-2 max-w-2xl text-slate-600">
                    Read published customer feedback and recent rating signals before contacting this provider.
                  </p>
                </div>
              </div>
              <Link href={`/services/provider/${providerId}`}>
                <Button variant="outline">
                  Back to profile
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.5rem] border border-slate-100 bg-[#faf7f0] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Total published
                </p>
                <p className="mt-2 text-base font-semibold text-slate-950">{reviews.length} reviews</p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-100 bg-[#faf7f0] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Review focus
                </p>
                <p className="mt-2 text-base font-semibold text-slate-950">Public written feedback</p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-100 bg-[#faf7f0] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Next step
                </p>
                <p className="mt-2 text-base font-semibold text-slate-950">Return to profile to request a quote</p>
              </div>
            </div>
          </section>

          <Card className="border-[#0f3d91]/10 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle>All published reviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reviews.map((review: any) => (
                <article key={review.id} className="rounded-[1rem] border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <StarRating rating={Number(review.rating || 0)} size="sm" />
                        {review.isVerified === 1 && (
                          <span className="text-xs font-medium text-emerald-700">Verified review</span>
                        )}
                      </div>
                      <p className="font-medium text-slate-900">
                        {review.title || `${Number(review.rating || 0)}/5 review`}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500">{String(review.createdAt || '').slice(0, 10)}</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{review.content || 'No written comment.'}</p>
                </article>
              ))}
              {reviews.length === 0 && (
                <p className="text-sm text-slate-600">No published reviews for this provider yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
