import { useEffect, useMemo, useRef } from 'react';
import { useLocation, useRoute } from 'wouter';
import { toast } from 'sonner';
import { ArrowRight, BadgeCheck, MapPinned, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProviderCard, type ProviderDirectoryItem } from '@/components/services/ProviderCard';
import { ProviderCardSkeleton } from '@/components/services/ServicesSkeletons';
import { trpc } from '@/lib/trpc';
import {
  isServiceCategory,
  slugifyLocationSegment,
  toServiceCategorySlug,
  formatCategoryLabel,
  formatArea,
  getCategoryMeta,
  type IntentStage,
  type ServiceCategory,
} from '@/features/services/catalog';
import { applySeo } from '@/lib/seo';

function queryParams() {
  return new URLSearchParams(window.location.search);
}

function getOrCreateServicesSessionId() {
  const key = 'services-results-session-id';
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const next =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `svc-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
    sessionStorage.setItem(key, next);
    return next;
  } catch {
    return `svc-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  }
}

function readLeadContext(leadId: number) {
  try {
    const keyedContext = sessionStorage.getItem(`service-lead-context-${leadId}`);
    if (!keyedContext) return null;
    return JSON.parse(keyedContext) as {
      notes?: string;
      city?: string;
      province?: string;
      suburb?: string;
      intentStage?: IntentStage;
      sourceSurface?: 'directory' | 'explore' | 'journey_injection' | 'agent_dashboard';
    };
  } catch {
    return null;
  }
}

export default function ServicesResultsPage() {
  const [, params] = useRoute('/services/results/:leadId');
  const [, setLocation] = useLocation();
  const leadId = Number(params?.leadId || 0);
  const query = useMemo(() => queryParams(), []);
  const sessionId = useMemo(() => getOrCreateServicesSessionId(), []);
  const leadContext = useMemo(() => readLeadContext(leadId), [leadId]);

  const categoryParam = String(query.get('category') || '').toLowerCase();
  const category = isServiceCategory(categoryParam)
    ? (categoryParam as ServiceCategory)
    : ('home_improvement' as ServiceCategory);
  const city = query.get('city') || leadContext?.city || undefined;
  const province = query.get('province') || leadContext?.province || undefined;
  const suburb = query.get('suburb') || leadContext?.suburb || undefined;
  const locationLabel = formatArea(city, province, suburb);
  const unmatched = query.get('unmatched') === '1';
  const intentStage = (query.get('intentStage') || leadContext?.intentStage || 'general') as IntentStage;
  const sourceSurface = (query.get('sourceSurface') || leadContext?.sourceSurface || 'directory') as
    | 'directory'
    | 'explore'
    | 'journey_injection'
    | 'agent_dashboard';
  const searchLocationSource = useMemo(
    () => ([suburb, city, province].filter(Boolean).length > 0 ? 'manual' : 'fallback'),
    [city, province, suburb],
  );

  useEffect(() => {
    applySeo({
      title: `Matched Providers for Lead ${leadId || 'Request'} | Services`,
      description:
        'Review matched providers, compare service fit, and send quote requests for your service requirement.',
      canonicalPath: `/services/results/${leadId || 0}`,
      noindex: true,
    });
  }, [leadId]);

  const recommendations = trpc.servicesEngine.recommendProviders.useQuery({
    category,
    intentStage,
    sourceSurface,
    city,
    province,
    suburb,
    limit: 12,
  });
  const fallbackProvidersQuery = trpc.servicesEngine.directorySearch.useQuery(
    {
      category,
      limit: 6,
    },
    { enabled: !recommendations.isLoading },
  );
  const logLeadEvent = trpc.servicesEngine.leads.logEvent.useMutation();

  const createLead = trpc.servicesEngine.createLeadFromJourney.useMutation({
    onSuccess: () => toast.success('Quote request sent to provider'),
    onError: error => toast.error(error.message || 'Unable to send request'),
  });

  const items = (recommendations.data || []) as Array<{
    provider: ProviderDirectoryItem;
    score: number;
  }>;
  const fallbackProviders = (fallbackProvidersQuery.data || []) as ProviderDirectoryItem[];
  const categoryMeta = getCategoryMeta(category);
  const canLogEvents = leadId > 0;
  const hasLoggedRecommendations = useRef(false);
  const hasLoggedEmptyState = useRef(false);
  const requestNotes = leadContext?.notes || null;

  const emitEvent = (
    type:
      | 'recommendations_shown'
      | 'provider_card_clicked'
      | 'quote_requested'
      | 'results_empty_shown'
      | 'nearby_market_clicked',
    providerId?: string,
    metadata?: Record<string, unknown>,
  ) => {
    if (!canLogEvents) return;
    logLeadEvent.mutate(
      {
        leadId: String(leadId),
        type,
        providerId,
        metadata: {
          sessionId,
          searchLocationSource,
          ...metadata,
        },
      },
      {
        onError: () => {
          // Non-blocking analytics logging.
        },
      },
    );
  };

  const citySuggestions = useMemo(() => {
    const values = new Set<string>();
    for (const provider of fallbackProviders) {
      for (const location of provider.locations || []) {
        const cityPart = String(location.city || '').trim();
        const provincePart = String(location.province || '').trim();
        if (!cityPart && !provincePart) continue;
        values.add([cityPart, provincePart].filter(Boolean).join(', '));
        if (values.size >= 2) return Array.from(values);
      }
    }
    return Array.from(values);
  }, [fallbackProviders]);

  useEffect(() => {
    if (!canLogEvents || recommendations.isLoading || hasLoggedRecommendations.current) return;
    hasLoggedRecommendations.current = true;
    emitEvent('recommendations_shown', undefined, {
      totalShown: items.length,
      totalFallbackProviders: fallbackProviders.length,
      unmatched,
      sourceSurface,
      intentStage,
      city: city || null,
      province: province || null,
      suburb: suburb || null,
    });
  }, [
    canLogEvents,
    recommendations.isLoading,
    items.length,
    fallbackProviders.length,
    unmatched,
    sourceSurface,
    intentStage,
    city,
    province,
    suburb,
  ]);

  useEffect(() => {
    if (!canLogEvents || recommendations.isLoading || items.length > 0 || hasLoggedEmptyState.current) return;
    hasLoggedEmptyState.current = true;
    emitEvent('results_empty_shown', undefined, {
      unmatched,
      sourceSurface,
      intentStage,
      city: city || null,
      province: province || null,
      suburb: suburb || null,
    });
  }, [
    canLogEvents,
    recommendations.isLoading,
    items.length,
    unmatched,
    sourceSurface,
    intentStage,
    city,
    province,
    suburb,
  ]);

  return (
    <main className="min-h-screen bg-[#f7f4ec]">
      <div className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[36rem] bg-[radial-gradient(circle_at_top_left,_rgba(15,61,145,0.14),_transparent_30%),radial-gradient(circle_at_80%_10%,_rgba(201,139,43,0.16),_transparent_22%),linear-gradient(180deg,_#f9f6ef_0%,_#eef4ff_56%,_#f7f4ec_100%)]" />
        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6 md:py-12">
          <section className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#0f3d91]/15 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f3d91]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Service Listify
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#10294f] px-3 py-1 text-xs font-semibold text-white">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Match results
                </span>
              </div>

              <div className="max-w-3xl space-y-4">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">
                  Providers matched for {formatCategoryLabel(category)} in {locationLabel}
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-700 md:text-lg">
                  {categoryMeta.subtitle} Compare provider quality, service fit, and next-step
                  response options before requesting quotes.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  className="h-12 rounded-full bg-[#0f3d91] px-6 text-sm font-semibold text-white hover:bg-[#0a2e6e]"
                  onClick={() => {
                    const el = document.getElementById('results-list');
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  Review matches
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-12 rounded-full border-[#0f3d91]/20 bg-white/85 px-6 text-sm font-semibold text-[#0f3d91] hover:bg-white"
                  onClick={() => setLocation(`/services/request/${category}`)}
                >
                  Edit request
                </Button>
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
                    Matches
                  </p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">
                    {recommendations.isLoading ? '...' : items.length}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Search area
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-950">{locationLabel}</p>
                </div>
              </div>

              {unmatched && (
                <p className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Your request has been queued as unmatched while we find providers in this area.
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-[2rem] bg-[#10294f] p-6 text-white shadow-[0_24px_90px_-40px_rgba(16,41,79,0.8)]">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  <MapPinned className="h-4 w-4" />
                  Match summary
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    'Providers are ranked for category fit, trust, and service area.',
                    'Use profiles and reviews to compare before sending a quote request.',
                    'If your area is thin, we still surface fallback providers where possible.',
                  ].map(item => (
                    <div
                      key={item}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/80"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <Card className="border-[#0f3d91]/10 bg-white/90 shadow-sm">
                <CardHeader>
                  <CardTitle>Your request</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium text-slate-900">Service:</span>{' '}
                    {formatCategoryLabel(category)}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Location:</span>{' '}
                    {locationLabel}
                  </p>
                  {requestNotes && (
                    <p>
                      <span className="font-medium text-slate-900">Notes:</span> {requestNotes}
                    </p>
                  )}
                  <div className="pt-2">
                    <Button
                      onClick={() => setLocation(`/services/request/${category}`)}
                      variant="outline"
                    >
                      Edit request
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section id="results-list" className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
            <section className="space-y-4">
              <div className="grid gap-3">
                {recommendations.isLoading &&
                  Array.from({ length: 4 }).map((_, index) => (
                    <ProviderCardSkeleton key={`results-provider-skeleton-${index}`} />
                  ))}
                {items.map((item, rankIndex) => (
                  <ProviderCard
                    key={item.provider.providerId}
                    provider={item.provider}
                    matchScore={item.score}
                    onViewProfile={providerId =>
                      emitEvent('provider_card_clicked', providerId, {
                        rankIndex,
                        score: item.score,
                        isFallback: false,
                      })
                    }
                    onCta={providerId => {
                      emitEvent('quote_requested', providerId, {
                        rankIndex,
                        score: item.score,
                        isFallback: false,
                      });
                      createLead.mutate({
                        providerId,
                        category,
                        sourceSurface: 'directory',
                        intentStage,
                        city,
                        province,
                        suburb,
                        notes: `Follow-up request from results page (lead ${leadId || 'n/a'})`,
                      });
                    }}
                  />
                ))}
                {!recommendations.isLoading && items.length === 0 && (
                  <Card className="border-slate-200 bg-white">
                    <CardContent className="space-y-3 p-6 text-sm text-slate-700">
                      <p className="font-medium text-slate-900">We are expanding to this area.</p>
                      <p>
                        No direct match yet. Submit your request anyway and we will queue it as
                        unmatched while routing to the closest providers.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => {
                            emitEvent('quote_requested', undefined, {
                              rankIndex: null,
                              isFallback: true,
                              action: 'request_anyway',
                            });
                            createLead.mutate({
                              category,
                              sourceSurface: 'journey_injection',
                              intentStage,
                              city,
                              province,
                              suburb,
                              notes: `Unmatched request submitted from results page (lead ${leadId || 'n/a'})`,
                            });
                          }}
                        >
                          Request anyway
                        </Button>
                        <Button
                          onClick={() => setLocation(`/services/request/${category}`)}
                          variant="outline"
                        >
                          Edit request
                        </Button>
                      </div>
                      {citySuggestions.length > 0 && (
                        <div className="pt-1">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Try nearby markets
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {citySuggestions.map(cityLabel => {
                              const [cityName, provinceName] = cityLabel
                                .split(',')
                                .map(value => value.trim());
                              if (!cityName || !provinceName) return null;
                              const citySlug = cityName.toLowerCase().replace(/\s+/g, '-');
                              const provinceSlug = provinceName.toLowerCase().replace(/\s+/g, '-');
                              return (
                                <button
                                  key={cityLabel}
                                  type="button"
                                  onClick={() => {
                                    emitEvent('nearby_market_clicked', undefined, {
                                      city: cityName,
                                      province: provinceName,
                                    });
                                    setLocation(
                                      `/services/${toServiceCategorySlug(category)}/${slugifyLocationSegment(citySlug)}/${slugifyLocationSegment(provinceSlug)}`,
                                    );
                                  }}
                                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  {cityLabel}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
                {!recommendations.isLoading &&
                  items.length === 0 &&
                  fallbackProviders.length > 0 && (
                    <section className="space-y-3 pt-2">
                      <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                        Closest available providers
                      </h2>
                      {fallbackProviders.slice(0, 3).map((provider, rankIndex) => (
                        <ProviderCard
                          key={`fallback-${provider.providerId}`}
                          provider={provider}
                          isFallback={true}
                          onViewProfile={providerId =>
                            emitEvent('provider_card_clicked', providerId, {
                              rankIndex,
                              isFallback: true,
                            })
                          }
                          onCta={providerId => {
                            emitEvent('quote_requested', providerId, {
                              rankIndex,
                              isFallback: true,
                            });
                            createLead.mutate({
                              providerId,
                              category,
                              sourceSurface: 'directory',
                              intentStage,
                              city,
                              province,
                              suburb,
                              notes: `Fallback provider request from results page (lead ${leadId || 'n/a'})`,
                            });
                          }}
                        />
                      ))}
                    </section>
                  )}
              </div>
            </section>

            <aside className="space-y-3">
              <Card className="border-[#0f3d91]/10 bg-white/90 shadow-sm">
                <CardHeader>
                  <CardTitle>What to look for</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600">
                  <p>Check fit first: service line, area coverage, and trust signals.</p>
                  <p>Use reviews and profile detail before sending quote requests.</p>
                  <p>If the list feels thin, edit the request or try a nearby market.</p>
                </CardContent>
              </Card>
            </aside>
          </section>
        </div>
      </div>
    </main>
  );
}
