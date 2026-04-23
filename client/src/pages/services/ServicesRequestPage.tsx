import { useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';
import { LeadRequestFlow } from '@/features/services/LeadRequestFlow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import {
  formatCategoryLabel,
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
        sessionStorage.setItem(
          `service-lead-context-${leadId}`,
          leadContext,
        );
        sessionStorage.setItem('services-lead-context', leadContext);
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
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Sign in to submit your service request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              We need your account to track provider matches and quote responses.
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`}
              >
                <Button>Go to login</Button>
              </Link>
              <Link href={`/services/${category}`}>
                <Button variant="outline">Back to {formatCategoryLabel(category)}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Request Matching
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Get matched for {formatCategoryLabel(category)}
        </h1>
        <p className="text-slate-600">
          Tell us what you need and we will route your request to providers ranked for your context.
        </p>
      </header>

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
    </main>
  );
}
