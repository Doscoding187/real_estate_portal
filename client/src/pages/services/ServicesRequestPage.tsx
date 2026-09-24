import { useEffect, useMemo, useRef } from 'react';
import { Link, useRoute } from 'wouter';
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
  SA_PROVINCES,
  serviceCategoryFromSlug,
  type IntentStage,
  type ServiceCategory,
  type ServiceRequestSourceSurface,
} from '@/features/services/catalog';
import { applySeo } from '@/lib/seo';
import { useServicesLocation } from '@/features/services/useServicesLocation';

const INTENT_STAGES: IntentStage[] = [
  'seller_valuation',
  'seller_listing_prep',
  'buyer_saved_property',
  'buyer_offer_intent',
  'buyer_move_ready',
  'developer_listing_wizard',
  'agent_dashboard',
  'general',
];

const SOURCE_SURFACES: ServiceRequestSourceSurface[] = [
  'directory',
  'journey_injection',
  'agent_dashboard',
];

function parsePositiveInteger(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return undefined;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseIntentStage(value: string | null): IntentStage {
  return INTENT_STAGES.includes(value as IntentStage) ? (value as IntentStage) : 'general';
}

function parseSourceSurface(value: string | null): ServiceRequestSourceSurface {
  return SOURCE_SURFACES.includes(value as ServiceRequestSourceSurface)
    ? (value as ServiceRequestSourceSurface)
    : 'directory';
}

function createRequestKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `service-request-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function ServicesRequestPage() {
  const [, params] = useRoute('/services/request/:category');
  const { search, setLocation } = useServicesLocation();
  const auth = useAuth();

  const categoryParam = String(params?.category || '').trim();
  const parsedCategory = serviceCategoryFromSlug(categoryParam);
  const category = parsedCategory || ('home_improvement' as ServiceCategory);
  const categoryMeta = getCategoryMeta(category);

  const query = useMemo(() => new URLSearchParams(search), [search]);
  const rawProvince = query.get('province')?.trim() || '';
  const initialLocation = {
    suburb: query.get('suburb')?.trim() || '',
    city: query.get('city')?.trim() || '',
    province:
      SA_PROVINCES.find(province => province.toLowerCase() === rawProvince.toLowerCase()) ||
      rawProvince,
  };
  const defaultLocation = [initialLocation.suburb, initialLocation.city, initialLocation.province]
    .filter(Boolean)
    .join(', ');
  const providerId = parsePositiveInteger(query.get('providerId'));
  const serviceCode = query.get('serviceCode')?.trim() || '';
  const propertyId = parsePositiveInteger(query.get('propertyId'));
  const intentStage = parseIntentStage(query.get('intentStage'));
  const sourceSurface = parseSourceSurface(query.get('sourceSurface'));
  const reasonKey = query.get('reasonKey')?.trim() || undefined;
  const latestSubmissionRef = useRef<{
    category: ServiceCategory;
    intentStage: string;
    sourceSurface: string;
    suburb?: string;
    city?: string;
    province?: string;
    notes?: string;
    propertyId?: number;
    serviceCode?: string;
    reasonKey?: string;
  } | null>(null);
  const requestKeyRef = useRef<string | null>(null);
  const requestTargetRef = useRef('');
  const requestTarget = [
    providerId,
    serviceCode,
    category,
    intentStage,
    sourceSurface,
    propertyId || '',
    initialLocation.suburb,
    initialLocation.city,
    initialLocation.province,
  ].join(':');
  if (!requestKeyRef.current || requestTargetRef.current !== requestTarget) {
    requestKeyRef.current = createRequestKey();
    requestTargetRef.current = requestTarget;
  }

  useEffect(() => {
    const categoryLabel = formatCategoryLabel(category);
    applySeo({
      title: `Request ${categoryLabel} | Property Listify Services`,
      description: `Share your project details with a published ${categoryLabel.toLowerCase()} provider.`,
      canonicalPath: `/services/request/${encodeURIComponent(category)}`,
      noindex: true,
    });
  }, [category]);

  const selectedProviderQuery = trpc.servicesEngine.getProviderPublicProfile.useQuery(
    { providerId: providerId || 0 },
    { enabled: Boolean(providerId && parsedCategory) },
  );
  const selectedProvider = selectedProviderQuery.data;

  const createLead = trpc.servicesEngine.createLeadFromJourney.useMutation({
    onSuccess: data => {
      const latestSubmission = latestSubmissionRef.current;
      const nextCategory = latestSubmission?.category || category;
      const nextCity = latestSubmission?.city || '';
      const nextProvince = latestSubmission?.province || '';
      const nextSuburb = latestSubmission?.suburb || '';
      const leadId = Number(data.leadId || data.leadIds?.[0] || 0);

      if (!leadId) {
        const search = new URLSearchParams({
          request: 'unmatched',
          category: nextCategory,
        });
        if (nextCity) search.set('city', nextCity);
        if (nextProvince) search.set('province', nextProvince);
        if (nextSuburb) search.set('suburb', nextSuburb);
        setLocation(`/services/${nextCategory}?${search.toString()}`);
        return;
      }

      setLocation(`/services/results/${leadId}`);
    },
    onError: error => {
      toast.error(error.message || 'Unable to submit service request');
    },
  });

  if (!parsedCategory) {
    return (
      <main className="min-h-screen bg-[#f7f4ec] px-4 py-12 md:px-6">
        <Card className="mx-auto max-w-3xl border-[#0f3d91]/10 bg-white shadow-sm">
          <CardContent className="space-y-4 p-8">
            <h1 className="text-2xl font-semibold text-slate-950">Service category unavailable</h1>
            <p className="text-sm leading-6 text-slate-600">
              Choose a supported service category before starting a provider request.
            </p>
            <Button onClick={() => setLocation('/services')}>Browse services</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!providerId || !serviceCode) {
    return (
      <main className="min-h-screen bg-[#f7f4ec] px-4 py-12 md:px-6">
        <Card className="mx-auto max-w-3xl border-[#0f3d91]/10 bg-white shadow-sm">
          <CardContent className="space-y-4 p-8">
            <h1 className="text-2xl font-semibold text-slate-950">Choose a provider and service</h1>
            <p className="text-sm leading-6 text-slate-600">
              Services V1 sends one attributable request to the provider and service you select.
              Browse published {formatCategoryLabel(category).toLowerCase()} providers before
              continuing.
            </p>
            <Button onClick={() => setLocation(`/services/${category}`)}>
              Browse {formatCategoryLabel(category)} providers
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

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
              <CardTitle className="pt-3 text-2xl">
                Sign in to submit your service request
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <p className="text-sm leading-6 text-slate-600">
                We need your account so the provider can receive your request and you can track its
                status.
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
                  Property Listify Services
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#10294f] px-3 py-1 text-xs font-semibold text-white">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Provider request
                </span>
              </div>

              <div className="max-w-3xl space-y-4">
                <h1 className="font-serif text-4xl leading-tight text-slate-950 md:text-6xl">
                  Request a {formatCategoryLabel(category).toLowerCase()} professional.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-700 md:text-lg">
                  {categoryMeta.subtitle} Tell us what you need and send one request to the provider
                  you choose.
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
                  <p className="mt-2 text-xl font-semibold text-slate-950">{categoryMeta.label}</p>
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
              {selectedProvider && (
                <div className="rounded-[1.5rem] border border-blue-200 bg-blue-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                    Requesting this provider
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-950">
                    {selectedProvider.companyName}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedProvider.headline ||
                      'Review the provider profile before sending your request.'}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-[2rem] bg-[#10294f] p-6 text-white shadow-[0_24px_90px_-40px_rgba(16,41,79,0.8)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                What happens next
              </p>
              <div className="mt-4 space-y-3">
                {[
                  'Choose the right category for your project.',
                  'Add the area where the work will happen.',
                  'Describe the job clearly so the provider can assess fit.',
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
                The request is sent to one provider and its status stays visible in the provider
                workspace.
              </p>
            </div>
          </section>

          <section id="service-request-flow" className="grid gap-4">
            <LeadRequestFlow
              key={[
                providerId,
                serviceCode,
                category,
                intentStage,
                sourceSurface,
                propertyId || '',
                initialLocation.suburb,
                initialLocation.city,
                initialLocation.province,
              ].join(':')}
              defaultCategory={category}
              defaultLocation={defaultLocation}
              defaultLocationParts={{
                suburb: initialLocation.suburb || undefined,
                city: initialLocation.city || undefined,
                province: initialLocation.province || undefined,
              }}
              defaultIntentStage={intentStage}
              defaultSourceSurface={sourceSurface}
              propertyId={propertyId}
              reasonKey={reasonKey}
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
                  propertyId: payload.propertyId,
                  serviceCode,
                  reasonKey: payload.reasonKey,
                };
                createLead.mutate({
                  requestKey: requestKeyRef.current || createRequestKey(),
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
                  serviceCode,
                  context: payload.propertyId
                    ? {
                        sourceDetail: 'property_detail',
                        reasonKey: payload.reasonKey,
                        propertyLinked: true,
                        serviceCode: serviceCode || null,
                      }
                    : serviceCode
                      ? { serviceCode }
                      : undefined,
                });
              }}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
