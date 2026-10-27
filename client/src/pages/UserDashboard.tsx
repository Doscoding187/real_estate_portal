import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { ProspectLayout } from '@/components/ProspectLayout';
import { ProspectJourneyTracker } from '@/components/prospect/ProspectJourneyTracker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useComparison } from '@/contexts/ComparisonContext';
import { normalizePropertyForUI } from '@/lib/normalizers';
import {
  getSavedSearchDeliveryLabel,
  getSavedSearchNotificationDescription,
  getSavedSearchSourceLabel,
} from '@/lib/savedSearchUtils';
import { buildCanonicalSearchUrl } from '@/lib/searchNavigation';
import { trpc } from '@/lib/trpc';
import type { SavedSearch } from '@shared/types';
import { isCanonicalPlaceId } from '@shared/placeAuthority';
import {
  Activity,
  ArrowRight,
  Bath,
  Bed,
  Bell,
  Calculator,
  Calendar,
  CheckCircle2,
  Clock3,
  CircleDashed,
  GitCompare,
  Heart,
  MapPin,
  Play,
  Search,
  Sparkles,
  Square,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

type DashboardIntent = 'buyer' | 'seller' | 'both';
type SellerGoal = 'upgrade' | 'downsize' | 'sell_investment' | 'test_market' | 'relocating';
type SellerTimeline = '0_30_days' | '1_3_months' | '3_6_months' | '6_months_plus';
type SellerReadinessLevel = 'needs_work' | 'good_condition' | 'launch_ready';
type SellerPropertyType = 'apartment' | 'house' | 'townhouse' | 'vacant_land' | 'commercial';
type SellerBedroomProfile = 'studio_1' | '2' | '3' | '4_plus';
type SellerOccupancy = 'owner_occupied' | 'vacant' | 'tenant_occupied';
type SellerPricingPriority = 'maximize_price' | 'balanced' | 'sell_quickly';
type SellerEstimatedValueBand = 'under_1m' | '1m_2m' | '2m_3m' | '3m_5m' | '5m_plus';
type SellerPlanningInputs = {
  goal?: SellerGoal;
  timeline?: SellerTimeline;
  readiness?: SellerReadinessLevel;
  propertyType?: SellerPropertyType;
  bedroomProfile?: SellerBedroomProfile;
  occupancy?: SellerOccupancy;
  pricingPriority?: SellerPricingPriority;
  estimatedValueBand?: SellerEstimatedValueBand;
};
type RawCriteria = Record<string, unknown>;
type DeferredProspect = { income?: number | null };
type DeferredProgress = { progress?: number | null };
type DeferredBuyability = {
  affordabilityMin?: number | null;
  affordabilityMax?: number | null;
  monthlyPaymentCapacity?: number | null;
  buyabilityScore?: string | null;
};

// Kept as typed empty sources while the legacy Buyability surface is retired.
// The Journey Tracker must not call the unregistered `trpc.prospects.*` API.
function deferredProspect(): DeferredProspect | null {
  return null;
}
function deferredProgress(): DeferredProgress | null {
  return null;
}
function deferredBuyability(): DeferredBuyability | null {
  return null;
}
type FavoriteCard = ReturnType<typeof normalizePropertyForUI> & {
  savedAt?: string | null;
  property?: Record<string, unknown>;
  canonicalPlaceId?: string;
};
type WatchArea = {
  key: string;
  label: string;
  canonicalPlaceId: string;
  href: string;
  source: 'saved-home' | 'saved-search';
};
type ChangeSignal = {
  title: string;
  detail: string;
  tone: 'emerald' | 'blue' | 'amber' | 'rose';
  href?: string;
  cta?: string;
};
const SELLER_SELECT_LABELS = {
  propertyType: {
    apartment: 'Apartment',
    house: 'House',
    townhouse: 'Townhouse',
    vacant_land: 'Vacant land',
    commercial: 'Commercial',
  } satisfies Record<SellerPropertyType, string>,
  bedroomProfile: {
    studio_1: 'Studio / 1 bed',
    '2': '2 bedrooms',
    '3': '3 bedrooms',
    '4_plus': '4+ bedrooms',
  } satisfies Record<SellerBedroomProfile, string>,
  occupancy: {
    owner_occupied: 'Owner occupied',
    vacant: 'Vacant',
    tenant_occupied: 'Tenant occupied',
  } satisfies Record<SellerOccupancy, string>,
  pricingPriority: {
    maximize_price: 'Maximize price',
    balanced: 'Balanced outcome',
    sell_quickly: 'Sell quickly',
  } satisfies Record<SellerPricingPriority, string>,
  estimatedValueBand: {
    under_1m: 'Under R1M',
    '1m_2m': 'R1M - R2M',
    '2m_3m': 'R2M - R3M',
    '3m_5m': 'R3M - R5M',
    '5m_plus': 'R5M+',
  } satisfies Record<SellerEstimatedValueBand, string>,
};

const DASHBOARD_INTENT_KEY = 'consumer_dashboard_intent';
const DASHBOARD_LAST_VISIT_KEY = 'consumer_dashboard_last_visit';

function normalizeRole(value?: string | null) {
  if (value === 'user') return 'visitor';
  if (value === 'admin') return 'super_admin';
  return value;
}


function formatRand(value?: number | null) {
  if (!value || !Number.isFinite(value)) return 'R0';
  return `R${Math.round(value).toLocaleString('en-ZA')}`;
}

function formatCompactRand(value?: number | null) {
  if (!value || !Number.isFinite(value)) return 'R0';
  if (value >= 1000000) return `R${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R${Math.round(value / 1000)}k`;
  return `R${Math.round(value)}`;
}

function formatDashboardDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildSearchHref(criteria: Record<string, unknown>) {
  return buildCanonicalSearchUrl(criteria);
}

function buildSavedSearchHref(search: Pick<SavedSearch, 'placeId' | 'criteria'>): string | null {
  const criteria = (search.criteria || {}) as RawCriteria;
  const retiredKeys = [
    'province',
    'city',
    'suburb',
    'location',
    'slug',
    'locationId',
    'locationIds',
    'locations',
    'factualLocationId',
    'searchAreaIds',
    'searchAreaId',
  ];
  if (
    retiredKeys.some(key => criteria[key] !== undefined && criteria[key] !== null && criteria[key] !== '') ||
    criteria.canonicalPlaceId !== undefined
  ) {
    return null;
  }

  if (search.placeId && !isCanonicalPlaceId(search.placeId)) {
    return null;
  }

  const href = buildSearchHref({
    ...criteria,
    ...(search.placeId ? { canonicalPlaceId: search.placeId } : {}),
  });
  return href === '/' ? null : href;
}

function getToneClasses(tone: ChangeSignal['tone']) {
  if (tone === 'emerald') return 'border-emerald-100 bg-emerald-50 text-emerald-800';
  if (tone === 'amber') return 'border-amber-100 bg-amber-50 text-amber-800';
  if (tone === 'rose') return 'border-rose-100 bg-rose-50 text-rose-800';
  return 'border-blue-100 bg-blue-50 text-blue-800';
}

export default function UserDashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, loading } = useAuth();
  const { comparedProperties, removeFromComparison, clearComparison } = useComparison();
  const utils = trpc.useUtils();
  const [intent, setIntent] = useState<DashboardIntent>(() => {
    if (typeof window === 'undefined') return 'buyer';
    const saved = window.localStorage.getItem(DASHBOARD_INTENT_KEY);
    return saved === 'seller' || saved === 'both' ? saved : 'buyer';
  });
  const [lastVisitAt, setLastVisitAt] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(DASHBOARD_LAST_VISIT_KEY);
  });
  const [sellerPlanning, setSellerPlanning] = useState<SellerPlanningInputs>({});
  const hydrationCompleteRef = useRef(false);
  const persistedIntentRef = useRef<DashboardIntent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(DASHBOARD_INTENT_KEY, intent);
  }, [intent]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const now = new Date().toISOString();
    window.localStorage.setItem(DASHBOARD_LAST_VISIT_KEY, now);
    setLastVisitAt(previous => previous ?? now);
  }, []);

  useEffect(() => {
    if (loading || !isAuthenticated) return;
    if (normalizeRole(user?.role) !== 'visitor') {
      setLocation('/dashboard');
    }
  }, [isAuthenticated, loading, setLocation, user?.role]);

  const normalizedRole = normalizeRole(user?.role);
  const { data: consumerDashboardState } = trpc.user.getConsumerDashboardState.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const updateConsumerDashboardState = trpc.user.updateConsumerDashboardState.useMutation();
  const { data: favoritesRaw, isLoading: favoritesLoading } = trpc.properties.getFavorites.useQuery(
    undefined,
    { enabled: isAuthenticated },
  );
  const { data: savedSearches, isLoading: searchesLoading } = trpc.savedSearch.getAll.useQuery(
    undefined,
    { enabled: isAuthenticated },
  );
  const { data: alertHistory } = trpc.savedSearch.getAlertHistory.useQuery(
    { limit: 12 },
    { enabled: isAuthenticated },
  );
  const { data: comparisonProperties } = trpc.properties.getPublicByIds.useQuery(
    { ids: comparedProperties.slice(0, 4) },
    { enabled: isAuthenticated && comparedProperties.length > 0 },
  );
  useEffect(() => {
    if (!consumerDashboardState || hydrationCompleteRef.current) return;

    const persistedIntent = consumerDashboardState.preferences?.intent as
      | DashboardIntent
      | undefined;
    const persistedSellerPlanning = (consumerDashboardState.sellerPlanning ||
      {}) as SellerPlanningInputs;

    if (persistedIntent) {
      setIntent(persistedIntent);
      persistedIntentRef.current = persistedIntent;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(DASHBOARD_INTENT_KEY, persistedIntent);
      }
    }

    setSellerPlanning(persistedSellerPlanning);
    hydrationCompleteRef.current = true;
  }, [consumerDashboardState]);

  useEffect(() => {
    if (!isAuthenticated || !hydrationCompleteRef.current) return;
    if (persistedIntentRef.current === intent) return;

    persistedIntentRef.current = intent;
    updateConsumerDashboardState.mutate({ preferences: { intent } });
  }, [intent, isAuthenticated, updateConsumerDashboardState]);

  // Buyability is explicitly deferred until the identity and journey contracts are proven.
  const prospect = deferredProspect();
  const prospectProgress = deferredProgress();
  const buyabilityResults = deferredBuyability();

  const favorites = useMemo(
    () =>
      (favoritesRaw || [])
        .map((entry: { createdAt?: string; property?: Record<string, unknown> }) => {
          const normalized = normalizePropertyForUI(entry.property);
          return normalized
            ? ({
                ...normalized,
                savedAt: entry.createdAt,
                property: entry.property,
                canonicalPlaceId:
                  typeof entry.property?.canonicalPlaceId === 'string'
                    ? entry.property.canonicalPlaceId
                    : undefined,
              } as FavoriteCard)
            : null;
        })
        .filter(Boolean) as FavoriteCard[],
    [favoritesRaw],
  );

  const comparisonItems = (comparisonProperties || [])
    .map(resolution => resolution.property)
    .filter(property => comparedProperties.includes(Number(property.id)));

  const canonicalWatchPlaceIds = useMemo(() => {
    const placeIds = new Set<string>();
    favorites.forEach(favorite => {
      if (favorite.canonicalPlaceId && isCanonicalPlaceId(favorite.canonicalPlaceId)) {
        placeIds.add(favorite.canonicalPlaceId);
      }
    });
    (savedSearches || []).forEach(search => {
      if (search.placeId && isCanonicalPlaceId(search.placeId)) placeIds.add(search.placeId);
    });
    return [...placeIds].slice(0, 10);
  }, [favorites, savedSearches]);
  const { data: resolvedWatchPlaces } = trpc.placeAuthority.resolveSearchPlaces.useQuery(
    { placeIds: canonicalWatchPlaceIds },
    { enabled: isAuthenticated && canonicalWatchPlaceIds.length > 0 },
  );
  const watchPlaceLabels = useMemo(
    () =>
      new Map(
        (resolvedWatchPlaces?.results || [])
          .filter((place): place is NonNullable<typeof place> => Boolean(place))
          .map(place => [place.placeId, place.label]),
      ),
    [resolvedWatchPlaces],
  );

  const watchAreas = useMemo(() => {
    const areas = new Map<string, WatchArea>();

    const registerArea = (area: WatchArea) => {
      if (!area.label || areas.has(area.key)) return;
      areas.set(area.key, area);
    };

    favorites.forEach(favorite => {
      const placeId = favorite.canonicalPlaceId;
      if (!placeId || !isCanonicalPlaceId(placeId)) return;
      const label = watchPlaceLabels.get(placeId);
      if (!label) return;

      registerArea({
        key: `place:${placeId}`,
        label,
        canonicalPlaceId: placeId,
        href: buildSearchHref({ canonicalPlaceId: placeId, listingType: 'sale' }),
        source: 'saved-home',
      });
    });

    (savedSearches || []).forEach(search => {
      const href = buildSavedSearchHref(search);
      if (!href) return;

      if (search.placeId && isCanonicalPlaceId(search.placeId)) {
        const label = watchPlaceLabels.get(search.placeId);
        if (!label) return;
        registerArea({
          key: `place:${search.placeId}`,
          label,
          canonicalPlaceId: search.placeId,
          href,
          source: 'saved-search',
        });
        return;
      }
    });

    return Array.from(areas.values()).slice(0, 6);
  }, [favorites, savedSearches, watchPlaceLabels]);

  const locations = useMemo(() => watchAreas.map(area => area.label).slice(0, 6), [watchAreas]);

  const sellerReadiness = useMemo(() => {
    const signals = [
      {
        label: 'Target market defined',
        detail:
          watchAreas.length > 0
            ? `${watchAreas.length} watch area${watchAreas.length === 1 ? '' : 's'} tracked from your saved homes and searches.`
            : 'Save a canonical Place or governed Search Area to keep your target market attached to your plan.',
        complete: watchAreas.length > 0,
      },
      {
        label: 'Comparable demand stack',
        detail:
          favorites.length > 0 || (savedSearches?.length || 0) > 0
            ? `${favorites.length} saved home${favorites.length === 1 ? '' : 's'} and ${savedSearches?.length || 0} alert${(savedSearches?.length || 0) === 1 ? '' : 's'} are already feeding your comps view.`
            : 'Build a shortlist of comparable homes and save one search alert to watch new competing supply.',
        complete: favorites.length > 0 || (savedSearches?.length || 0) > 0,
      },
      {
        label: 'Live market movement available',
        detail:
          'Place based market analytics are not connected to the dashboard yet. No locality text or legacy IDs are used to estimate movement.',
        complete: false,
      },
    ];

    const completed = signals.filter(signal => signal.complete).length;
    const score = Math.round((completed / signals.length) * 100);

    return {
      score,
      signals,
      nextAction:
        score >= 67
          ? 'Your seller profile and canonical watch areas are saved. Arrange a professional valuation before choosing a list price.'
          : 'Save your seller profile and canonical watch areas, then arrange a professional valuation before choosing a list price.',
    };
  }, [favorites.length, savedSearches, watchAreas]);

  const sellerProfileSummary = useMemo(() => {
    const entries = [
      sellerPlanning.propertyType
        ? SELLER_SELECT_LABELS.propertyType[sellerPlanning.propertyType]
        : null,
      sellerPlanning.bedroomProfile
        ? SELLER_SELECT_LABELS.bedroomProfile[sellerPlanning.bedroomProfile]
        : null,
      sellerPlanning.occupancy ? SELLER_SELECT_LABELS.occupancy[sellerPlanning.occupancy] : null,
      sellerPlanning.pricingPriority
        ? SELLER_SELECT_LABELS.pricingPriority[sellerPlanning.pricingPriority]
        : null,
      sellerPlanning.estimatedValueBand
        ? SELLER_SELECT_LABELS.estimatedValueBand[sellerPlanning.estimatedValueBand]
        : null,
    ].filter(Boolean) as string[];

    return {
      labels: entries,
      completed: entries.length,
      total: 5,
    };
  }, [
    sellerPlanning.bedroomProfile,
    sellerPlanning.estimatedValueBand,
    sellerPlanning.occupancy,
    sellerPlanning.pricingPriority,
    sellerPlanning.propertyType,
  ]);

  const sellerStrategy = useMemo(() => ({
    marketTemperature: 'Place analytics unavailable',
    strongestArea: watchAreas[0]?.label || 'No canonical watch area saved',
    launchWindow:
      sellerPlanning.timeline === '0_30_days'
        ? 'Prepare the home and book a professional valuation soon'
        : sellerPlanning.timeline === '6_months_plus'
          ? 'Use the longer runway to prepare the home before valuation'
          : 'Build a preparation plan before setting a list price',
    summary:
      sellerPlanning.readiness === 'needs_work'
        ? 'Your seller plan is saved. Work through repairs and compliance before arranging a valuation.'
        : 'Your seller plan is saved. The dashboard will not estimate a sale price until Place based market data is available.',
  }), [sellerPlanning.readiness, sellerPlanning.timeline, watchAreas]);

  const sellerValuationGuide = useMemo(
    () => ({
      area: watchAreas[0]?.label || 'No canonical watch area saved',
      benchmarkLow: 0,
      benchmarkHigh: 0,
      pricingPosture: 'Professional valuation required',
      rationale:
        'The dashboard does not calculate a price from display names or homeowner profile multipliers. Place based market benchmarks are not connected yet.',
      nextSteps: [
        'Use a professional valuation before choosing a list price.',
        'Keep your exact Place or Search Area watchlist current for a future canonical market report.',
      ],
      confidenceLabel: 'Not calculated',
      confidenceDetail:
        'A confidence score will appear when a canonical Place market analytics source is available.',
      anchorSource: 'No Place based analytics source',
      calibratedAnchor: null as number | null,
    }),
    [watchAreas],
  );

  const bridgePlan = useMemo(() => {
    if (intent !== 'both') return null;

    const buyerReady = Boolean(buyabilityResults) && Number(prospectProgress?.progress || 0) >= 60;
    const sellerReady = sellerReadiness.score >= 67;

    if (buyerReady && sellerReady) {
      return {
        headline: 'Your buy and sell moves can run in parallel',
        detail:
          'Your affordability plan is active and your seller context is strong enough to start valuation prep without losing buyer momentum.',
        primaryLabel: 'Open valuation prep',
        primaryHref:
          '/services/inspection_compliance?intentStage=seller_valuation&sourceSurface=journey_injection&reasonKey=seller_valuation_prep',
        secondaryLabel: 'Refine buyability plan',
      };
    }

    if (buyerReady && !sellerReady) {
      return {
        headline: 'Your buyer side is ahead of your seller side',
        detail:
          'Keep your purchase ceiling in place and complete the seller plan before arranging a professional valuation.',
        primaryLabel: 'Build seller context',
        primaryHref: '#overview-seller-readiness',
        secondaryLabel: 'Review watch areas',
      };
    }

    if (!buyerReady && sellerReady) {
      return {
        headline: 'Your seller side is ahead of your buyer side',
        detail:
          'Your seller profile is saved, but complete an affordability plan before making purchase decisions.',
        primaryLabel: 'Open buyability planner',
        primaryHref: '#open-planner',
        secondaryLabel: 'Review seller readiness',
      };
    }

    return {
      headline: 'Build both sides of the move before you transact',
      detail:
        'Complete your affordability plan and save canonical watch areas before arranging valuation and media services.',
      primaryLabel: 'Start buyability planner',
      primaryHref: '#open-planner',
      secondaryLabel: 'Save target areas',
    };
  }, [buyabilityResults, intent, prospectProgress?.progress, sellerReadiness.score]);

  const handleSaveSellerPlanning = async () => {
    try {
      await updateConsumerDashboardState.mutateAsync({
        preferences: { intent },
        sellerPlanning,
      });
      await utils.user.getConsumerDashboardState.invalidate();
      toast.success('Seller planning saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save seller planning');
    }
  };

  const recentChanges = useMemo(() => {
    const changes: ChangeSignal[] = [];
    const lastVisitDate = parseDate(lastVisitAt);
    const recentAlertCount = (alertHistory || []).filter(entry => {
      const processedAt = parseDate(entry.processedAt as string | null);
      return lastVisitDate && processedAt ? processedAt > lastVisitDate : false;
    }).length;
    const recentSavedHomeCount = favorites.filter(favorite => {
      const savedAt = parseDate(favorite.savedAt);
      return lastVisitDate && savedAt ? savedAt > lastVisitDate : false;
    }).length;

    if (recentAlertCount > 0) {
      changes.push({
        title: `${recentAlertCount} fresh alert${recentAlertCount === 1 ? '' : 's'} since your last visit`,
        detail:
          'Saved-search updates have landed. Review new supply, pricing changes, and shortlist matches.',
        tone: 'blue',
        href: '#alerts',
        cta: 'Review alerts',
      });
    }

    if (recentSavedHomeCount > 0) {
      changes.push({
        title: `${recentSavedHomeCount} new saved home${recentSavedHomeCount === 1 ? '' : 's'} in your stack`,
        detail:
          'Your shortlist is growing. Use compare mode to separate strong fits from nice-to-haves.',
        tone: 'rose',
        href: '#homes',
        cta: 'Open shortlist',
      });
    }

    if (buyabilityResults) {
      const affordableCount = favorites.filter(favorite => {
        const price = Number(favorite.price || 0);
        return price > 0 && price <= Number(buyabilityResults.affordabilityMax || 0);
      }).length;

      if (affordableCount > 0) {
        changes.push({
          title: `${affordableCount} saved home${affordableCount === 1 ? '' : 's'} still sit inside your plan`,
          detail: `Your current affordability ceiling is ${formatCompactRand(
            Number(buyabilityResults.affordabilityMax || 0),
          )}.`,
          tone: 'emerald',
          href: '#homes',
          cta: 'Review matches',
        });
      }
    }

    if (changes.length === 0) {
      changes.push({
        title: 'Your dashboard is primed for signals',
        detail:
          'Save homes and canonical searches to keep your shortlist current. Place based market movement is not available here yet.',
        tone: 'blue',
      });
    }

    return changes.slice(0, 4);
  }, [alertHistory, buyabilityResults, favorites, lastVisitAt]);

  const setFavoriteMutation = trpc.properties.setFavorite.useMutation({
    onSuccess: () => {
      void utils.properties.getFavorites.invalidate();
      toast.success('Saved homes updated');
    },
  });

  const deleteSavedSearchMutation = trpc.savedSearch.delete.useMutation({
    onSuccess: () => void utils.savedSearch.getAll.invalidate(),
  });

  const updateSavedSearchMutation = trpc.savedSearch.updatePreferences.useMutation({
    onSuccess: () => {
      void utils.savedSearch.getAll.invalidate();
      toast.success('Saved search preferences updated');
    },
    onError: error => toast.error(error.message),
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F7FA] text-slate-500">
        Loading your dashboard...
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation('/login');
    return null;
  }

  if (normalizedRole !== 'visitor') {
    return null;
  }

  return (
    <ProspectLayout className="bg-[linear-gradient(180deg,#f7fafc_0%,#edf4f7_50%,#f8fbfd_100%)]">
      <div className="container mx-auto px-4 py-8">
        <Card className="overflow-hidden border-white/60 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(37,99,235,0.1),_transparent_30%),white] shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <CardContent className="grid gap-8 p-6 lg:grid-cols-[1.25fr_0.75fr] lg:p-8">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <User className="h-8 w-8 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">
                    Consumer dashboard
                  </p>
                  <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
                    Welcome back, {user?.firstName || user?.name?.split(' ')[0] || 'there'}
                  </h1>
                </div>
              </div>

              <p className="max-w-2xl text-base leading-7 text-slate-600">
                Track buyability, saved homes, search alerts, watch areas, and seller service
                handoffs from one place.
              </p>

              <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white/80 p-2">
                {(['buyer', 'seller', 'both'] as const).map(option => (
                  <Button
                    key={option}
                    variant={intent === option ? 'default' : 'ghost'}
                    className={
                      intent === option ? 'bg-slate-900 text-white hover:bg-slate-800' : ''
                    }
                    onClick={() => setIntent(option)}
                  >
                    {option === 'buyer'
                      ? 'Buying'
                      : option === 'seller'
                        ? 'Selling'
                        : 'Buying + Selling'}
                  </Button>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  id="open-journey"
                  className="bg-slate-900 text-white hover:bg-slate-800"
                  onClick={() =>
                    document
                      .getElementById('prospect-journey-title')
                      ?.scrollIntoView({ behavior: 'smooth' })
                  }
                >
                  <Activity className="mr-2 h-4 w-4" />
                  View your journey
                </Button>
                <Button variant="outline" onClick={() => setLocation('/')}>
                  <Search className="mr-2 h-4 w-4" />
                  Browse properties
                </Button>
                {(intent === 'seller' || intent === 'both') && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      setLocation(
                        '/services/inspection_compliance?intentStage=seller_valuation&sourceSurface=journey_injection&reasonKey=seller_valuation_prep',
                      )
                    }
                  >
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Seller valuation prep
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Saved Homes
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-rose-600">{favorites.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Search Alerts
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-blue-600">
                    {savedSearches?.length || 0}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Buyability
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-emerald-600">
                    {buyabilityResults?.buyabilityScore?.toUpperCase() || 'START'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Watch Areas
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-amber-600">{locations.length}</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <ProspectJourneyTracker />

        <Tabs defaultValue="overview" className="mt-8 w-full">
          <TabsList className="!grid w-full grid-cols-2 rounded-2xl bg-white/80 p-2 shadow-sm md:grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="homes">Saved Homes</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="compare">Compare</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            {bridgePlan ? (
              <Card className="border-white/60 bg-[linear-gradient(135deg,rgba(15,23,42,0.97),rgba(30,41,59,0.94))] text-white shadow-[0_18px_48px_rgba(15,23,42,0.18)]">
                <CardContent className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-3xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-300">
                      <GitCompare className="h-4 w-4" />
                      <p className="text-xs font-semibold uppercase tracking-[0.22em]">
                        Coordinated move plan
                      </p>
                    </div>
                    <h2 className="text-2xl font-semibold tracking-tight">{bridgePlan.headline}</h2>
                    <p className="text-sm leading-6 text-slate-300">{bridgePlan.detail}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      className="bg-white text-slate-950 hover:bg-slate-100"
                      onClick={() => {
                        if (bridgePlan.primaryHref === '#open-planner') {
                          document
                            .getElementById('prospect-journey-title')
                            ?.scrollIntoView({ behavior: 'smooth' });
                          return;
                        }
                        if (bridgePlan.primaryHref === '#overview-seller-readiness') {
                          document
                            .getElementById('overview-seller-readiness')
                            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          return;
                        }
                        setLocation(bridgePlan.primaryHref);
                      }}
                    >
                      {bridgePlan.primaryLabel}
                    </Button>
                    <Badge className="border-white/15 bg-white/10 text-slate-200 hover:bg-white/10">
                      {bridgePlan.secondaryLabel}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="border-white/60 bg-white/90">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-600" />
                    Buyer intelligence
                  </CardTitle>
                  <CardDescription>Affordability, readiness, and next action.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {buyabilityResults ? (
                    <>
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                          Estimated range
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-emerald-900">
                          {formatRand(buyabilityResults.affordabilityMin)} -{' '}
                          {formatRand(buyabilityResults.affordabilityMax)}
                        </p>
                        <p className="mt-2 text-sm text-emerald-800/80">
                          Monthly capacity {formatRand(buyabilityResults.monthlyPaymentCapacity)}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm text-slate-600">
                          <span>Planner completion</span>
                          <span>{prospectProgress?.progress || 0}%</span>
                        </div>
                        <Progress value={prospectProgress?.progress || 0} className="h-2" />
                      </div>
                    </>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                      <p className="font-semibold text-slate-900">Start your buyability profile</p>
                      <p className="mt-2 text-sm text-slate-600">
                        Add income and deposit details to unlock a personalized affordability range.
                      </p>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    onClick={() =>
                      document
                        .getElementById('prospect-journey-title')
                        ?.scrollIntoView({ behavior: 'smooth' })
                    }
                  >
                    View journey tracker
                  </Button>
                </CardContent>
              </Card>

              <Card
                id="overview-seller-readiness"
                className="border-white/60 bg-white/90 scroll-mt-24"
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    Seller readiness
                  </CardTitle>
                  <CardDescription>
                    Market context first, then partner handoff for valuation and launch.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                          Readiness score
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-blue-950">
                          {sellerReadiness.score}%
                        </p>
                      </div>
                      <div className="min-w-32 flex-1">
                        <Progress value={sellerReadiness.score} className="h-2 bg-blue-100" />
                        <p className="mt-2 text-sm text-blue-800">{sellerReadiness.nextAction}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {sellerReadiness.signals.map(signal => (
                      <div
                        key={signal.label}
                        className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        {signal.complete ? (
                          <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                        ) : (
                          <CircleDashed className="mt-0.5 h-5 w-5 text-slate-400" />
                        )}
                        <div>
                          <p className="font-semibold text-slate-900">{signal.label}</p>
                          <p className="mt-1 text-sm text-slate-600">{signal.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Market temperature
                      </p>
                      <p className="mt-2 text-base font-semibold text-slate-900">
                        {sellerStrategy.marketTemperature}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Strongest area
                      </p>
                      <p className="mt-2 text-base font-semibold text-slate-900">
                        {sellerStrategy.strongestArea}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Launch window
                      </p>
                      <p className="mt-2 text-base font-semibold text-slate-900">
                        {sellerStrategy.launchWindow}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Seller planning inputs
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Save your timing and launch context so this dashboard can guide you more
                          directly.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleSaveSellerPlanning}
                        disabled={updateConsumerDashboardState.isPending}
                      >
                        Save plan
                      </Button>
                    </div>

                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Timing and launch context
                        </p>
                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                          <Select
                            value={sellerPlanning.goal}
                            onValueChange={value =>
                              setSellerPlanning(current => ({
                                ...current,
                                goal: value as SellerGoal,
                              }))
                            }
                          >
                            <SelectTrigger className="w-full bg-white">
                              <SelectValue placeholder="Selling goal" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="upgrade">Upgrade</SelectItem>
                              <SelectItem value="downsize">Downsize</SelectItem>
                              <SelectItem value="sell_investment">Sell investment</SelectItem>
                              <SelectItem value="test_market">Test market</SelectItem>
                              <SelectItem value="relocating">Relocating</SelectItem>
                            </SelectContent>
                          </Select>

                          <Select
                            value={sellerPlanning.timeline}
                            onValueChange={value =>
                              setSellerPlanning(current => ({
                                ...current,
                                timeline: value as SellerTimeline,
                              }))
                            }
                          >
                            <SelectTrigger className="w-full bg-white">
                              <SelectValue placeholder="Timeline" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0_30_days">0-30 days</SelectItem>
                              <SelectItem value="1_3_months">1-3 months</SelectItem>
                              <SelectItem value="3_6_months">3-6 months</SelectItem>
                              <SelectItem value="6_months_plus">6+ months</SelectItem>
                            </SelectContent>
                          </Select>

                          <Select
                            value={sellerPlanning.readiness}
                            onValueChange={value =>
                              setSellerPlanning(current => ({
                                ...current,
                                readiness: value as SellerReadinessLevel,
                              }))
                            }
                          >
                            <SelectTrigger className="w-full bg-white">
                              <SelectValue placeholder="Home readiness" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="needs_work">Needs work</SelectItem>
                              <SelectItem value="good_condition">Good condition</SelectItem>
                              <SelectItem value="launch_ready">Launch ready</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Homeowner profile
                        </p>
                        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                          <Select
                            value={sellerPlanning.propertyType}
                            onValueChange={value =>
                              setSellerPlanning(current => ({
                                ...current,
                                propertyType: value as SellerPropertyType,
                              }))
                            }
                          >
                            <SelectTrigger className="w-full bg-white">
                              <SelectValue placeholder="Property type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="apartment">Apartment</SelectItem>
                              <SelectItem value="house">House</SelectItem>
                              <SelectItem value="townhouse">Townhouse</SelectItem>
                              <SelectItem value="vacant_land">Vacant land</SelectItem>
                              <SelectItem value="commercial">Commercial</SelectItem>
                            </SelectContent>
                          </Select>

                          <Select
                            value={sellerPlanning.bedroomProfile}
                            onValueChange={value =>
                              setSellerPlanning(current => ({
                                ...current,
                                bedroomProfile: value as SellerBedroomProfile,
                              }))
                            }
                          >
                            <SelectTrigger className="w-full bg-white">
                              <SelectValue placeholder="Bedrooms" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="studio_1">Studio / 1 bed</SelectItem>
                              <SelectItem value="2">2 bedrooms</SelectItem>
                              <SelectItem value="3">3 bedrooms</SelectItem>
                              <SelectItem value="4_plus">4+ bedrooms</SelectItem>
                            </SelectContent>
                          </Select>

                          <Select
                            value={sellerPlanning.occupancy}
                            onValueChange={value =>
                              setSellerPlanning(current => ({
                                ...current,
                                occupancy: value as SellerOccupancy,
                              }))
                            }
                          >
                            <SelectTrigger className="w-full bg-white">
                              <SelectValue placeholder="Occupancy" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="owner_occupied">Owner occupied</SelectItem>
                              <SelectItem value="vacant">Vacant</SelectItem>
                              <SelectItem value="tenant_occupied">Tenant occupied</SelectItem>
                            </SelectContent>
                          </Select>

                          <Select
                            value={sellerPlanning.pricingPriority}
                            onValueChange={value =>
                              setSellerPlanning(current => ({
                                ...current,
                                pricingPriority: value as SellerPricingPriority,
                              }))
                            }
                          >
                            <SelectTrigger className="w-full bg-white">
                              <SelectValue placeholder="Pricing priority" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="maximize_price">Maximize price</SelectItem>
                              <SelectItem value="balanced">Balanced outcome</SelectItem>
                              <SelectItem value="sell_quickly">Sell quickly</SelectItem>
                            </SelectContent>
                          </Select>

                          <Select
                            value={sellerPlanning.estimatedValueBand}
                            onValueChange={value =>
                              setSellerPlanning(current => ({
                                ...current,
                                estimatedValueBand: value as SellerEstimatedValueBand,
                              }))
                            }
                          >
                            <SelectTrigger className="w-full bg-white">
                              <SelectValue placeholder="Your estimate" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="under_1m">Under R1M</SelectItem>
                              <SelectItem value="1m_2m">R1M - R2M</SelectItem>
                              <SelectItem value="2m_3m">R2M - R3M</SelectItem>
                              <SelectItem value="3m_5m">R3M - R5M</SelectItem>
                              <SelectItem value="5m_plus">R5M+</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {sellerProfileSummary.labels.length > 0 ? (
                        sellerProfileSummary.labels.map(label => (
                          <Badge key={label} variant="secondary">
                            {label}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">
                          Add homeowner profile details to tighten the valuation guidance.
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                      <span>
                        Homeowner profile saved: {sellerProfileSummary.completed}/
                        {sellerProfileSummary.total}
                      </span>
                      <span>
                        {consumerDashboardState?.updatedAt
                          ? `Last saved ${formatDashboardDate(consumerDashboardState.updatedAt)}`
                          : 'Your saved intent and seller plan travel with your account.'}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-sm leading-6 text-slate-600">{sellerStrategy.summary}</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Valuation guide
                        </p>
                        <p className="mt-2 text-base font-semibold text-slate-900">
                          {sellerValuationGuide.area}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-blue-200 text-blue-800">
                        {sellerValuationGuide.pricingPosture}
                      </Badge>
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Local price estimate
                      </p>
                      <p className="mt-2 text-base font-semibold text-slate-900">
                        No Place based estimate is available
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {sellerValuationGuide.rationale}
                      </p>
                    </div>

                    <div className="mt-4 space-y-2">
                      {sellerValuationGuide.nextSteps.map(step => (
                        <div key={step} className="flex items-start gap-2 text-sm text-slate-600">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-600" />
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 pt-1">
                    <Button
                      variant="outline"
                      className="h-auto w-full justify-between whitespace-normal rounded-2xl px-4 py-4 text-left"
                      onClick={() =>
                        setLocation(
                          '/services/inspection_compliance?intentStage=seller_valuation&sourceSurface=journey_injection&reasonKey=seller_valuation_prep',
                        )
                      }
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">Seller valuation prep</p>
                        <p className="text-sm text-slate-500">
                          Bring in inspections and readiness checks before you set your price.
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </Button>

                    <Button
                      variant="outline"
                      className="h-auto w-full justify-between whitespace-normal rounded-2xl px-4 py-4 text-left"
                      onClick={() =>
                        setLocation(
                          '/services/media_marketing?intentStage=seller_listing_prep&sourceSurface=journey_injection&reasonKey=seller_listing_prep',
                        )
                      }
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">Listing prep</p>
                        <p className="text-sm text-slate-500">
                          Line up photography, staging, and launch media before you go live.
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </Button>
                  </div>

                  {locations.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {locations.map(location => (
                        <Badge key={location} variant="secondary">
                          {location}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <Card className="border-white/60 bg-white/90">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-amber-600" />
                    Neighborhood watch
                  </CardTitle>
                  <CardDescription>
                    Exact Places and governed Search Areas from your saved homes and search alerts.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {watchAreas.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                      <p className="font-semibold text-slate-900">No canonical watch areas yet</p>
                      <p className="mt-2 text-sm text-slate-600">
                        Save a home with an admitted Place or save a search for one Place or governed Search Area.
                      </p>
                    </div>
                  ) : (
                    watchAreas.map(area => (
                      <div
                        key={area.key}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold text-slate-900">{area.label}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              Saved from {area.source === 'saved-home' ? 'a saved home' : 'a saved search'}
                              {' · canonical Place'}
                            </p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setLocation(area.href)}>
                            View homes
                          </Button>
                        </div>
                        <p className="mt-4 text-sm text-slate-500">
                          Place based market analytics are not connected yet. No suburb text or numeric location IDs are used to estimate this area.
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="border-white/60 bg-white/90">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock3 className="h-5 w-5 text-slate-700" />
                    What changed
                  </CardTitle>
              <CardDescription>
                    Signals generated from saved homes and canonical saved searches.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentChanges.map(change => (
                    <div
                      key={change.title}
                      className={`rounded-2xl border p-4 ${getToneClasses(change.tone)}`}
                    >
                      <p className="font-semibold">{change.title}</p>
                      <p className="mt-1 text-sm opacity-90">{change.detail}</p>
                      {change.href && change.cta ? (
                        <Button
                          variant="link"
                          className="mt-2 h-auto p-0 text-current"
                          onClick={() => {
                            const href = change.href;
                            if (!href) return;
                            if (href.startsWith('#')) {
                              const tabId = href.replace('#', '');
                              const trigger = document.querySelector<HTMLElement>(
                                `[data-state][value="${tabId}"]`,
                              );
                              trigger?.click();
                              return;
                            }
                            setLocation(href);
                          }}
                        >
                          {change.cta}
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="homes" className="mt-6">
            {favoritesLoading ? (
              <Card>
                <CardContent className="py-8 text-center text-slate-500">
                  Loading saved homes...
                </CardContent>
              </Card>
            ) : favorites.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Heart className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                  <p className="font-semibold text-slate-900">No saved homes yet</p>
                  <Button className="mt-4" onClick={() => setLocation('/')}>
                    Browse properties
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {favorites.map(property => (
                  <Card key={property.id} className="border-white/60 bg-white/90">
                    <CardContent className="space-y-4 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-slate-900">{property.title}</p>
                          <p className="text-sm text-slate-500">
                            {property.canonicalPlaceId && watchPlaceLabels.get(property.canonicalPlaceId)
                              ? watchPlaceLabels.get(property.canonicalPlaceId)
                              : 'Location not assigned to an admitted Place'}
                          </p>
                        </div>
                        <p className="text-xl font-semibold text-slate-900">
                          {formatRand(property.price)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                        {property.bedrooms ? (
                          <span className="flex items-center gap-1">
                            <Bed className="h-4 w-4" />
                            {property.bedrooms}
                          </span>
                        ) : null}
                        {property.bathrooms ? (
                          <span className="flex items-center gap-1">
                            <Bath className="h-4 w-4" />
                            {property.bathrooms}
                          </span>
                        ) : null}
                        {property.area ? (
                          <span className="flex items-center gap-1">
                            <Square className="h-4 w-4" />
                            {property.area} sqm
                          </span>
                        ) : null}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          onClick={() => setLocation(`/property/${property.id}`)}
                        >
                          View property
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            setFavoriteMutation.mutate({
                              propertyId: Number(property.id),
                              saved: false,
                            })
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="alerts" className="mt-6 space-y-4">
            <Card className="border-white/60 bg-white/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-blue-600" />
                  Saved search controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {searchesLoading ? (
                  <p className="text-sm text-slate-500">Loading saved searches...</p>
                ) : (savedSearches?.length ?? 0) === 0 ? (
                  <p className="text-sm text-slate-500">No saved searches yet.</p>
                ) : (
                  savedSearches!.map(search => (
                    <div
                      key={search.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{search.name}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {getSavedSearchNotificationDescription(
                              (search.criteria as RawCriteria) ?? {},
                              search.notificationFrequency,
                              {
                                emailEnabled: search.emailEnabled,
                                inAppEnabled: search.inAppEnabled,
                              },
                            )}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge variant="secondary">
                              {getSavedSearchSourceLabel((search.criteria as RawCriteria) ?? {})}
                            </Badge>
                            <Badge variant="outline">
                              {getSavedSearchDeliveryLabel({
                                emailEnabled: search.emailEnabled,
                                inAppEnabled: search.inAppEnabled,
                              })}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSavedSearchMutation.mutate({ id: search.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <Select
                          value={search.notificationFrequency}
                          onValueChange={value =>
                            updateSavedSearchMutation.mutate({
                              id: search.id,
                              notificationFrequency: value as SavedSearch['notificationFrequency'],
                              emailEnabled: search.emailEnabled,
                              inAppEnabled: search.inAppEnabled,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="instant">Instant</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="never">Never</SelectItem>
                          </SelectContent>
                        </Select>

                        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                          <span className="text-sm text-slate-700">Email</span>
                          <Switch
                            checked={search.emailEnabled}
                            onCheckedChange={checked =>
                              updateSavedSearchMutation.mutate({
                                id: search.id,
                                notificationFrequency: search.notificationFrequency,
                                emailEnabled: Boolean(checked),
                                inAppEnabled: search.inAppEnabled,
                              })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                          <span className="text-sm text-slate-700">In-app</span>
                          <Switch
                            checked={search.inAppEnabled}
                            onCheckedChange={checked =>
                              updateSavedSearchMutation.mutate({
                                id: search.id,
                                notificationFrequency: search.notificationFrequency,
                                emailEnabled: search.emailEnabled,
                                inAppEnabled: Boolean(checked),
                              })
                            }
                          />
                        </div>
                      </div>

                      <Button
                        className="mt-4"
                        variant="outline"
                        disabled={!buildSavedSearchHref(search)}
                        onClick={() => {
                          const href = buildSavedSearchHref(search);
                          if (href) setLocation(href);
                        }}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        {buildSavedSearchHref(search) ? 'Run search again' : 'Recreate this search'}
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compare" className="mt-6">
            {comparedProperties.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <GitCompare className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                  <p className="font-semibold text-slate-900">Nothing in compare yet</p>
                  <Button className="mt-4" onClick={() => setLocation('/')}>
                    Browse properties
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={clearComparison}>
                    <X className="mr-2 h-4 w-4" />
                    Clear all
                  </Button>
                  <Button
                    onClick={() => setLocation('/compare')}
                    disabled={comparedProperties.length < 2}
                  >
                    <GitCompare className="mr-2 h-4 w-4" />
                    Compare now ({comparedProperties.length})
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {comparisonItems.map(item => {
                    const property = normalizePropertyForUI(item);
                    if (!property) return null;
                    const canonicalPlaceId =
                      typeof item.canonicalPlaceId === 'string' ? item.canonicalPlaceId : undefined;

                    return (
                      <Card key={item.id} className="border-white/60 bg-white/90">
                        <CardContent className="space-y-4 p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">{property.title}</p>
                              <p className="text-sm text-slate-500">
                                {canonicalPlaceId && watchPlaceLabels.get(canonicalPlaceId)
                                  ? watchPlaceLabels.get(canonicalPlaceId)
                                  : 'Location not assigned to an admitted Place'}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromComparison(item.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                            {property.bedrooms ? (
                              <span className="flex items-center gap-1">
                                <Bed className="h-4 w-4" />
                                {property.bedrooms}
                              </span>
                            ) : null}
                            {property.bathrooms ? (
                              <span className="flex items-center gap-1">
                                <Bath className="h-4 w-4" />
                                {property.bathrooms}
                              </span>
                            ) : null}
                            {property.area ? (
                              <span className="flex items-center gap-1">
                                <Square className="h-4 w-4" />
                                {property.area} sqm
                              </span>
                            ) : null}
                          </div>

                          <div className="flex items-center justify-between">
                            <p className="text-xl font-semibold text-slate-900">
                              {formatRand(property.price)}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setLocation(`/property/${item.id}`)}
                            >
                              View
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-6 space-y-4">
            <Card className="border-white/60 bg-white/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-slate-700" />
                  Recent alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(alertHistory?.length ?? 0) === 0 ? (
                  <p className="text-sm text-slate-500">No alert activity yet.</p>
                ) : (
                  alertHistory!.slice(0, 5).map(entry => (
                    <div
                      key={entry.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <Badge variant="outline">{entry.status}</Badge>
                        <span>{formatDashboardDate(entry.processedAt as string | null)}</span>
                      </div>
                      <p className="mt-2 font-medium text-slate-900">{entry.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{entry.content}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProspectLayout>
  );
}
