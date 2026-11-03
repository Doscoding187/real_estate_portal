import { useEffect, useState } from 'react';
import { Link, useRoute } from 'wouter';
import { ArrowLeft, ArrowRight, BadgeCheck, Flag, MessageSquare, Star } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { applySeo } from '@/lib/seo';
import { useAuth } from '@/_core/hooks/useAuth';
import { buildProviderProfilePath, toProviderSlug } from '@/features/services/catalog';
import { servicesUi } from '@/features/services/design';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { ProviderRating, StarRating } from '@/components/services/ProviderShowcaseCard';
import { ServicesSiteFooter } from '@/components/services/ServicesSiteFooter';
import { useServicesLocation } from '@/features/services/useServicesLocation';

function parsePositiveInteger(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function ServiceProviderReviewsPage() {
  const { user } = useAuth();
  const { search } = useServicesLocation();
  const [, params] = useRoute('/services/reviews/:providerId');
  const providerId = parsePositiveInteger(params?.providerId);
  const routeProviderId = providerId || 0;
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [reportingReviewId, setReportingReviewId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState<
    'abuse' | 'spam' | 'false_information' | 'privacy' | 'other'
  >('abuse');
  const [reportDetail, setReportDetail] = useState('');
  const [reportMessage, setReportMessage] = useState<string | null>(null);

  const profileQuery = trpc.servicesEngine.getProviderPublicProfile.useQuery(
    { providerId: routeProviderId },
    { enabled: Boolean(providerId) },
  );
  const reviewsQuery = trpc.servicesEngine.getProviderReviews.useQuery(
    { providerId: routeProviderId, limit: 100 },
    { enabled: Boolean(providerId) },
  );
  const eligibilityQuery = trpc.servicesEngine.getProviderReviewEligibility.useQuery(
    { providerId: routeProviderId },
    { enabled: Boolean(providerId && user) },
  );
  const utils = trpc.useUtils();
  const submitReview = trpc.servicesEngine.submitProviderReview.useMutation({
    onSuccess: async result => {
      setSubmitMessage(
        'Thank you. Your review was submitted for moderation. It will appear here once a reviewer approves it.',
      );
      setTitle('');
      setContent('');
      await utils.servicesEngine.getProviderReviews.invalidate({ providerId: routeProviderId });
      await utils.servicesEngine.getProviderPublicProfile.invalidate({
        providerId: routeProviderId,
      });
      await utils.servicesEngine.getProviderReviewEligibility.invalidate({
        providerId: routeProviderId,
      });
    },
    onError: error => setSubmitMessage(error.message),
  });
  const reportReview = trpc.servicesEngine.reportProviderReview.useMutation({
    onSuccess: () => {
      setReportMessage('Report submitted. Our review team will look into it.');
      setReportingReviewId(null);
      setReportDetail('');
    },
    onError: error => setReportMessage(error.message),
  });

  const profile = profileQuery.data;
  const providerName = profile?.companyName || 'Provider';
  const reviews = reviewsQuery.data || [];
  const profileSlug = profile
    ? toProviderSlug(profile.companyName, profile.providerId)
    : String(routeProviderId);
  const backToProfilePath = buildProviderProfilePath(profileSlug, search, {
    providerId: routeProviderId,
  });
  const eligibility = eligibilityQuery.data;
  const canReview = Boolean(user && eligibility?.eligible);

  useEffect(() => {
    applySeo({
      title: `${providerName} Reviews | Property Listify Services`,
      description: `Read published customer reviews and ratings for ${providerName} before requesting a service.`,
      canonicalPath: `/services/reviews/${encodeURIComponent(routeProviderId)}`,
      noindex: true,
    });
  }, [providerId, providerName, routeProviderId]);

  if (!providerId) {
    return (
      <>
        <EnhancedNavbar />
        <main className="min-h-screen bg-[#FDFDFD] px-4 py-12 md:px-6">
          <div className={`${servicesUi.surface} mx-auto max-w-3xl p-8 text-sm text-[#4B5C6B]`}>
            This review link is not valid.
          </div>
        </main>
      </>
    );
  }

  if (profileQuery.isLoading || reviewsQuery.isLoading) {
    return (
      <>
        <EnhancedNavbar />
        <main className="min-h-screen bg-[#FDFDFD] px-4 py-12 md:px-6">
          <div className="mx-auto max-w-4xl animate-pulse space-y-4">
            <div className="h-48 rounded-3xl bg-[#E9F0F4]" />
            <div className="h-64 rounded-3xl bg-[#E9F0F4]" />
          </div>
        </main>
      </>
    );
  }

  if (profileQuery.error || reviewsQuery.error || !profile) {
    return (
      <>
        <EnhancedNavbar />
        <main className="min-h-screen bg-[#FDFDFD] px-4 py-12 md:px-6">
          <div className={`${servicesUi.surface} mx-auto max-w-3xl p-8`}>
            <h1 className="font-['Sora'] text-2xl font-bold tracking-[-0.03em] text-[#0B1B2A]">
              Provider reviews unavailable
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#4B5C6B]">
              This provider is not currently published, or the reviews could not be loaded.
            </p>
            <Link href="/services" className={`${servicesUi.action} mt-6`}>
              Browse services
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <EnhancedNavbar />
      <main className="min-h-screen bg-[#FDFDFD] text-[#0B1B2A]">
        <section className="bg-[#F7FAFB] px-4 py-10 md:px-6 md:py-14">
          <div className="mx-auto w-full max-w-5xl">
            <Link
              href={backToProfilePath}
              className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#4B5C6B] transition hover:text-[#168363]"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to profile
            </Link>
            <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className={servicesUi.eyebrow}>Verified customer reviews</p>
                <h1 className="mt-2 font-['Sora'] text-3xl font-bold tracking-[-0.03em] md:text-[42px]">
                  {providerName}
                </h1>
                <ProviderRating
                  averageRating={profile.averageRating}
                  reviewCount={profile.reviewCount}
                  className="mt-3"
                />
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4B5C6B]">
                  Only customers with a completed or closed request can submit a review. Reviews are
                  published after moderation, and ratings are recomputed from the approved review
                  set.
                </p>
              </div>
              <Link href={backToProfilePath} className={servicesUi.actionOutline}>
                View profile
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-10 md:px-6 md:py-12 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="space-y-3">
            <h2 className="text-lg font-bold">Published reviews</h2>
            {reportMessage && (
              <div className="rounded-2xl border border-[#E3EBF0] bg-white p-3 text-[13px] leading-6 text-[#0B1B2A]">
                {reportMessage}
              </div>
            )}
            {reviews.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[#CBD8E0] bg-white p-8 text-sm leading-6 text-[#4B5C6B]">
                No published reviews for this provider yet. Approved reviews appear after a
                completed or closed request.
              </div>
            )}
            {reviews.map(review => (
              <article key={review.id} className={`${servicesUi.surface} p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <StarRating rating={review.rating} />
                    <p className="mt-2 text-[14px] font-semibold text-[#0B1B2A]">
                      {review.title || 'Verified customer review'}
                    </p>
                  </div>
                  {review.isVerified && (
                    <span className={servicesUi.greenChip}>
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      Verified request
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[13px] leading-6 text-[#4B5C6B]">
                  {review.content || 'No written comment.'}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] text-[#8A99A6]">
                    {review.reviewerLabel} · {String(review.createdAt || '').slice(0, 10)}
                  </p>
                  {user && (
                    <button
                      type="button"
                      onClick={() => {
                        setReportMessage(null);
                        setReportingReviewId(current => (current === review.id ? null : review.id));
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#4B5C6B] underline-offset-2 hover:text-[#168363] hover:underline"
                    >
                      <Flag className="h-3 w-3" aria-hidden="true" />
                      Report
                    </button>
                  )}
                </div>
                {reportingReviewId === review.id && (
                  <form
                    className="mt-3 space-y-2 rounded-xl border border-[#E3EBF0] bg-[#F7FAFB] p-3"
                    onSubmit={event => {
                      event.preventDefault();
                      setReportMessage(null);
                      reportReview.mutate({
                        reviewId: review.id,
                        reason: reportReason,
                        detail: reportDetail.trim() || undefined,
                      });
                    }}
                  >
                    <label className="block text-[11px] font-semibold text-[#4B5C6B]">
                      Reason
                      <select
                        aria-label={`Report reason for review ${review.id}`}
                        value={reportReason}
                        onChange={event =>
                          setReportReason(
                            event.target.value as
                              | 'abuse'
                              | 'spam'
                              | 'false_information'
                              | 'privacy'
                              | 'other',
                          )
                        }
                        className="mt-1 h-9 w-full rounded-lg border border-[#E3EBF0] bg-white px-2 text-[12px] font-normal"
                      >
                        <option value="abuse">Abuse or harassment</option>
                        <option value="spam">Spam or advertising</option>
                        <option value="false_information">False information</option>
                        <option value="privacy">Privacy concern</option>
                        <option value="other">Other</option>
                      </select>
                    </label>
                    <label className="block text-[11px] font-semibold text-[#4B5C6B]">
                      Details (optional)
                      <textarea
                        aria-label={`Report details for review ${review.id}`}
                        value={reportDetail}
                        onChange={event => setReportDetail(event.target.value)}
                        maxLength={2000}
                        rows={2}
                        className="mt-1 w-full rounded-lg border border-[#E3EBF0] bg-white p-2 text-[12px] font-normal"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={reportReview.isPending}
                      className="rounded-lg bg-[#0B1B2A] px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
                    >
                      {reportReview.isPending ? 'Submitting…' : 'Submit report'}
                    </button>
                  </form>
                )}
              </article>
            ))}
          </section>

          <aside className="space-y-4">
            {canReview && (
              <form
                onSubmit={event => {
                  event.preventDefault();
                  setSubmitMessage(null);
                  submitReview.mutate({
                    providerId: routeProviderId,
                    rating,
                    title: title.trim() || undefined,
                    content: content.trim() || undefined,
                  });
                }}
                className={`${servicesUi.surface} p-6`}
              >
                <h2 className="text-[15px] font-bold">Rate this provider</h2>
                <div className="mt-3 flex gap-1.5" role="radiogroup" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map(value => (
                    <button
                      key={`rating-choice-${value}`}
                      type="button"
                      role="radio"
                      aria-checked={rating === value}
                      aria-label={`${value} star${value === 1 ? '' : 's'}`}
                      onClick={() => setRating(value)}
                      className="rounded-md p-1"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          value <= rating
                            ? 'fill-[#F2B53B] text-[#F2B53B]'
                            : 'fill-transparent text-[#CBD8E0]'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <label className="mt-4 block text-[12px] font-semibold text-[#4B5C6B]">
                  Review title
                  <input
                    value={title}
                    onChange={event => setTitle(event.target.value)}
                    maxLength={200}
                    placeholder="Summarise your experience"
                    className="mt-2 h-11 w-full rounded-xl border border-[#E3EBF0] px-3 text-sm font-normal text-[#0B1B2A] outline-none focus:border-[#168363]"
                  />
                </label>
                <label className="mt-3 block text-[12px] font-semibold text-[#4B5C6B]">
                  Your review
                  <textarea
                    value={content}
                    onChange={event => setContent(event.target.value)}
                    maxLength={4000}
                    rows={4}
                    placeholder="What should other property owners know?"
                    className="mt-2 w-full rounded-xl border border-[#E3EBF0] p-3 text-sm font-normal text-[#0B1B2A] outline-none focus:border-[#168363]"
                  />
                </label>
                <button
                  type="submit"
                  disabled={submitReview.isPending}
                  className={`${servicesUi.action} mt-4 w-full`}
                >
                  {submitReview.isPending ? 'Submitting…' : 'Submit review'}
                </button>
              </form>
            )}

            {!user && (
              <div className={`${servicesUi.tintPanel} p-6`}>
                <MessageSquare className="h-5 w-5 text-[#168363]" aria-hidden="true" />
                <h2 className="mt-3 text-[15px] font-bold">Completed a service?</h2>
                <p className="mt-2 text-[13px] leading-6 text-[#4B5C6B]">
                  Sign in to review this provider. Only customers with a completed or closed request
                  can submit a review for moderation.
                </p>
                <Link
                  href={`/login?next=${encodeURIComponent(`/services/reviews/${routeProviderId}`)}`}
                  className={`${servicesUi.action} mt-4 w-full`}
                >
                  Sign in to review
                </Link>
              </div>
            )}

            {user && eligibility && !eligibility.eligible && (
              <div className={`${servicesUi.tintPanel} p-6`}>
                <h2 className="text-[15px] font-bold">Reviews require a completed request</h2>
                <p className="mt-2 text-[13px] leading-6 text-[#4B5C6B]">
                  {eligibility.reason === 'already_reviewed'
                    ? 'You have already submitted a review for this provider.'
                    : 'Once a request to this provider is completed or closed, you can submit a review for moderation from this page.'}
                </p>
              </div>
            )}

            {submitMessage && (
              <div className="rounded-2xl border border-[#D8EDE7] bg-[#EDF8F6] p-4 text-[13px] leading-6 text-[#0B1B2A]">
                {submitMessage}
              </div>
            )}
          </aside>
        </div>

        <ServicesSiteFooter />
      </main>
    </>
  );
}
