import { useEffect } from 'react';
import { Link, useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { applySeo } from '@/lib/seo';

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
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Reviews</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{providerName}</h1>
        </div>
        <Link href={`/services/provider/${providerId}`}>
          <Button variant="outline">Back to profile</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All published reviews</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {reviews.map((review: any) => (
            <article key={review.id} className="rounded-md border p-4">
              <p className="font-medium text-slate-900">
                {Number(review.rating || 0)}/5 {review.title ? `· ${review.title}` : ''}
              </p>
              <p className="mt-1 text-sm text-slate-600">{review.content || 'No written comment.'}</p>
              <p className="mt-2 text-xs text-slate-500">{String(review.createdAt || '').slice(0, 10)}</p>
            </article>
          ))}
          {reviews.length === 0 && (
            <p className="text-sm text-slate-600">No published reviews for this provider yet.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
