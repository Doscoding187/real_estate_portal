import { useEffect, useMemo, useRef } from 'react';
import { useLocation, useRoute } from 'wouter';
import { toast } from 'sonner';
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

export default function ServicesResultsPage() {
  const [, params] = useRoute('/services/results/:leadId');
  const [, setLocation] = useLocation();
  const leadId = Number(params?.leadId || 0);
  const query = useMemo(queryParams, []);
  const sessionId = useMemo(getOrCreateServicesSessionId, []);

  const categoryParam = String(query.get('category') || '').toLowerCase();
  const category = isServiceCategory(categoryParam)
    ? (categoryParam as ServiceCategory)
    : ('home_improvement' as ServiceCategory);
  const city = query.get('city') || undefined;
  const province = query.get('province') || undefined;
  const suburb = query.get('suburb') || undefined;
  const unmatched = query.get('unmatched') === '1';
  const intentStage = (query.get('intentStage') || 'general') as IntentStage;
  const sourceSurface = (query.get('sourceSurface') || 'journey_injection') as
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

  const items = (recommendations.data || []) as Array<{ provider: ProviderDirectoryItem; score: number }>;
  const fallbackProviders = (fallbackProvidersQuery.data || []) as ProviderDirectoryItem[];
  const canLogEvents = leadId > 0;
  const hasLoggedRecommendations = useRef(false);
  const hasLoggedEmptyState = useRef(false);

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
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 md:grid-cols-[minmax(0,1fr)_320px] md:px-6">
      <section className="space-y-4">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Match Results
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Providers matched for {formatCategoryLabel(category)} in {formatArea(city, province, suburb)}
          </h1>
          <p className="text-slate-600">
            Compare provider quality, service fit, and response path before requesting quotes.
          </p>
          {unmatched && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Your request has been queued as unmatched while we find providers in this area.
            </p>
          )}
        </header>

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
            <Card>
              <CardContent className="space-y-3 p-6 text-sm text-slate-700">
                <p className="font-medium text-slate-900">We are expanding to this area.</p>
                <p>
                  No direct match yet. Submit your request anyway and we will queue it as unmatched while
                  routing to the closest providers.
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
                  <Button onClick={() => setLocation(`/services/request/${category}`)} variant="outline">
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
                        const [cityName, provinceName] = cityLabel.split(',').map(value => value.trim());
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
          {!recommendations.isLoading && items.length === 0 && fallbackProviders.length > 0 && (
            <section className="space-y-3 pt-2">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">Closest available providers</h2>
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
        <Card>
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
              {formatArea(city, province, suburb)}
            </p>
            {(() => {
              try {
                const leadContext = sessionStorage.getItem('services-lead-context');
                if (leadContext) {
                  const parsed = JSON.parse(leadContext) as { notes?: string };
                  if (parsed.notes) {
                    return (
                      <p>
                        <span className="font-medium text-slate-900">Notes:</span>{' '}
                        {parsed.notes}
                      </p>
                    );
                  }
                }
              } catch {
                // sessionStorage unavailable or invalid JSON — skip notes
              }
              return null;
            })()}
            <div className="pt-2">
              <Button onClick={() => setLocation(`/services/request/${category}`)} variant="outline">
                Edit request
              </Button>
            </div>
          </CardContent>
        </Card>
      </aside>
    </main>
  );
}
