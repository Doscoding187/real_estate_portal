import { useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import { toast } from 'sonner';
import { ArrowRight, BadgeCheck, LockKeyhole, Sparkles } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { LeadRequestFlow } from '@/features/services/LeadRequestFlow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import {
  formatCategoryLabel,
  getCategoryMeta,
  serviceCategoryFromSlug,
  type ServiceCategory,
} from '@/features/services/catalog';
import { applySeo } from '@/lib/seo';

function currentQuery() {
  return new URLSearchParams(window.location.search);
}

export default function ServicesRequestPage() {
  const [, params] = useRoute('/services/request/:category');
  const [, setLocation] = useLocation();
  const auth = useAuth();

  const categoryParam = String(params?.category || '').trim();
  const category =
    serviceCategoryFromSlug(categoryParam) || ('home_improvement' as ServiceCategory);
  const categoryMeta = getCategoryMeta(category);

  const query = useMemo(() => currentQuery(), []);
  const defaultLocation = [query.get('suburb'), query.get('city'), query.get('province')]
    .filter(Boolean)
    .join(', ');
  const providerId = query.get('providerId') || undefined;
  const latestSubmissionRef = useRef<{
    category: ServiceCategory;
    intentStage: string;
    sourceSurface: string;
    suburb?: string;
    city?: string;
    province?: string;
    notes?: string;
  } | null>(null);

  useEffect(() => {
    const categoryLabel = formatCategoryLabel(category);
    applySeo({
      title: `Request ${categoryLabel} Quotes | Services`,
      description: `Share your project details and get matched with local ${categoryLabel.toLowerCase()} providers.`,
      canonicalPath: `/services/request/${encodeURIComponent(category)}`,
      noindex: true,
    });
  }, [category]);

  const createLead = trpc.servicesEngine.createLeadFromJourney.useMutation({
    onSuccess: data => {
      const leadId = Number(data.leadIds?.[0] || 0);
      const latestSubmission = latestSubmissionRef.current;
      const nextCategory = latestSubmission?.category || category;
      const nextCity = latestSubmission?.city || '';
      const nextProvince = latestSubmission?.province || '';
      const nextSuburb = latestSubmission?.suburb || '';
      const nextIntentStage = latestSubmission?.intentStage || 'general';
      const nextSourceSurface = latestSubmission?.sourceSurface || 'directory';

      try {
        const leadContext = JSON.stringify({
          category: nextCategory,
          providerIds: data.providerIds,
          unmatched: Boolean(data.unmatched),
          notes: latestSubmission?.notes || '',
          city: nextCity,
          province: nextProvince,
          suburb: nextSuburb,
          intentStage: nextIntentStage,
          sourceSurface: nextSourceSurface,
        });
        sessionStorage.setItem(`service-lead-context-${leadId}`, leadContext);
      } catch {
        // Non-fatal fallback if sessionStorage is unavailable.
      }

      setLocation(
        `/services/results/${leadId}?category=${encodeURIComponent(nextCategory)}&city=${encodeURIComponent(nextCity)}&province=${encodeURIComponent(nextProvince)}&suburb=${encodeURIComponent(nextSuburb)}&intentStage=${encodeURIComponent(nextIntentStage)}&sourceSurface=${encodeURIComponent(nextSourceSurface)}&unmatched=${data.unmatched ? '1' : '0'}`,
      );
    },
    onError: error => {
      toast.error(error.message || 'Unable to submit service request');
    },
  });

  if (!auth.loading && !auth.isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#f7f4ec]">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-10 md:px-6">
          <Card className="overflow-hidden border-[#0f3d91]/10 bg-white/90 shadow-[0_24px_90px_-50px_rgba(15,61,145,0.65)]">
            <CardHeader className="border-b border-slate-100 bg-[linear-gradient(135deg,_#f9f6ef,_#eef4ff)]">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#0f3d91]/15 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f3d91]">
                <LockKeyhole className="h-3.5 w-3.5" />
                Sign-in required
              </div>
              <CardTitle className="pt-3 text-2xl">Sign in to submit your service request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <p className="text-sm leading-6 text-slate-600">
                We need your account to track provider matches, quote responses, and request
                updates.
              </p>
              <div className="flex items-center gap-2">
                <Link
                  href={`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                >
                  <Button className="bg-[#0f3d91] hover:bg-[#0a2e6e]">Go to login</Button>
                </Link>
                <Link href={`/services/${category}`}>
                  <Button variant="outline">Back to {formatCategoryLabel(category)}</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f4ec]">
      <div className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top_left,_rgba(15,61,145,0.14),_transparent_30%),radial-gradient(circle_at_80%_10%,_rgba(201,139,43,0.16),_transparent_22%),linear-gradient(180deg,_#f9f6ef_0%,_#eef4ff_56%,_#f7f4ec_100%)]" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-6 md:py-12">
          <section className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#0f3d91]/15 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f3d91]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Service Listify
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#10294f] px-3 py-1 text-xs font-semibold text-white">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Request matching
                </span>
              </div>

              <div className="max-w-3xl space-y-4">
                <h1 className="font-serif text-4xl leading-tight text-slate-950 md:text-6xl">
                  Get matched for {formatCategoryLabel(category).toLowerCase()}.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-700 md:text-lg">
                  {categoryMeta.subtitle} Tell us what you need and we will route your request to
                  providers ranked for your context.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  className="h-12 rounded-full bg-[#0f3d91] px-6 text-sm font-semibold text-white hover:bg-[#0a2e6e]"
                  onClick={() => {
                    const el = document.getElementById('service-request-flow');
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  Start request
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Link href={`/services/${category}`}>
                  <Button
                    variant="outline"
                    className="h-12 rounded-full border-[#0f3d91]/20 bg-white/85 px-6 text-sm font-semibold text-[#0f3d91] hover:bg-white"
                  >
                    Back to providers
                  </Button>
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Service lane
                  </p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">
                    {categoryMeta.label}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Request steps
                  </p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">3 guided steps</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Preferred area
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-950">
                    {defaultLocation || 'Add your location'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] bg-[#10294f] p-6 text-white shadow-[0_24px_90px_-40px_rgba(16,41,79,0.8)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                What happens next
              </p>
              <div className="mt-4 space-y-3">
                {[
                  'Choose the right category for your project.',
                  'Add the area where the work will happen.',
                  'Describe the job clearly so better-fit providers can respond.',
                ].map((item, index) => (
                  <div
                    key={item}
                    className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#10294f]">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-6 text-white/80">{item}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-sm leading-6 text-white/70">
                We keep this flow short so you can reach matching results quickly without losing
                detail.
              </p>
            </div>
          </section>

          <section id="service-request-flow" className="grid gap-4">
            <LeadRequestFlow
              defaultCategory={category}
              defaultLocation={defaultLocation}
              submitting={createLead.isPending}
              error={createLead.error?.message ?? null}
              onSubmit={payload => {
                latestSubmissionRef.current = {
                  category: payload.category,
                  sourceSurface: payload.sourceSurface,
                  intentStage: payload.intentStage,
                  province: payload.province,
                  city: payload.city,
                  suburb: payload.suburb,
                  notes: payload.notes,
                };
                createLead.mutate({
                  providerId,
                  category: payload.category,
                  sourceSurface: payload.sourceSurface,
                  intentStage: payload.intentStage,
                  propertyId: payload.propertyId,
                  listingId: payload.listingId,
                  developmentId: payload.developmentId,
                  province: payload.province,
                  city: payload.city,
                  suburb: payload.suburb,
                  notes: payload.notes,
                });
              }}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
