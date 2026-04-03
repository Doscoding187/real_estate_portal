import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { Navbar } from '@/components/Navbar';
import { ProspectDashboard } from '@/components/ProspectDashboard';
import { RecentlyViewedCarousel } from '@/components/RecentlyViewedCarousel';
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
import { useProspectSessionId } from '@/hooks/useProspectSessionId';
import { useTrendingSuburbs } from '@/hooks/useTrendingSuburbs';
import { normalizePropertyForUI } from '@/lib/normalizers';
import {
  getSavedSearchDeliveryLabel,
  getSavedSearchNotificationDescription,
  getSavedSearchSourceLabel,
} from '@/lib/savedSearchUtils';
import { trpc } from '@/lib/trpc';
import type { SavedSearch } from '@shared/types';
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
type SellerPlanningInputs = {
  goal?: SellerGoal;
  timeline?: SellerTimeline;
  readiness?: SellerReadinessLevel;
};
type RawCriteria = Record<string, unknown>;
type FavoriteCard = ReturnType<typeof normalizePropertyForUI> & {
  savedAt?: string | null;
  property?: Record<string, unknown>;
};
type WatchArea = {
  key: string;
  label: string;
  suburb?: string;
  city?: string;
  province?: string;
  href: string;
  source: 'saved-home' | 'saved-search';
};
type MarketPulse = {
  label: string;
  city?: string;
  province?: string;
  averagePrice: number;
  medianPrice: number;
  propertyCount: number;
  sixMonthGrowth: number;
  trendingDirection: 'up' | 'down' | 'stable';
  trendingScore?: number;
  searchCount30d?: number;
  insight?: string;
  href: string;
};
type ChangeSignal = {
  title: string;
  detail: string;
  tone: 'emerald' | 'blue' | 'amber' | 'rose';
  href?: string;
  cta?: string;
};
type HeatmapEntry = {
  suburbId: number;
  suburbName: string;
  cityName: string;
  province: string;
  averagePrice: number;
  medianPrice: number;
  sixMonthGrowth: number;
  trendingDirection: 'up' | 'down' | 'stable';
  trendConfidence: number;
  propertyCount: number;
  heatmapIntensity: number;
  color: string;
  priceCategory: string;
  growthInsight: string;
};

const DASHBOARD_INTENT_KEY = 'consumer_dashboard_intent';
const DASHBOARD_LAST_VISIT_KEY = 'consumer_dashboard_last_visit';

function normalizeRole(value?: string | null) {
  if (value === 'user') return 'visitor';
  if (value === 'admin') return 'super_admin';
  return value;
}

function normalizeText(value?: string | null) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function titleize(value?: string | null) {
  if (!value) return '';
  return String(value)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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

function roundToNearest(value: number, factor: number) {
  if (!Number.isFinite(value) || !Number.isFinite(factor) || factor <= 0) return 0;
  return Math.round(value / factor) * factor;
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
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(criteria || {})) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      value.forEach(item => {
        if (item !== undefined && item !== null && item !== '') params.append(key, String(item));
      });
      continue;
    }
    params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `/properties?${query}` : '/properties';
}

function getCriteriaValue(criteria: RawCriteria, key: string) {
  const value = criteria[key];
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const first = value.find(item => typeof item === 'string');
    return typeof first === 'string' ? first : undefined;
  }
  return undefined;
}

function makeWatchKey(suburb?: string, city?: string, province?: string) {
  return [normalizeText(suburb), normalizeText(city), normalizeText(province)]
    .filter(Boolean)
    .join('|');
}

function aggregateMarketPulse(
  label: string,
  href: string,
  entries: HeatmapEntry[],
): MarketPulse | null {
  if (!entries.length) return null;

  const totalPropertyCount = entries.reduce((sum, entry) => sum + entry.propertyCount, 0) || 1;
  const weightedAveragePrice = Math.round(
    entries.reduce((sum, entry) => sum + entry.averagePrice * entry.propertyCount, 0) /
      totalPropertyCount,
  );
  const weightedMedianPrice = Math.round(
    entries.reduce((sum, entry) => sum + entry.medianPrice * entry.propertyCount, 0) /
      totalPropertyCount,
  );
  const weightedGrowth = Number(
    (
      entries.reduce((sum, entry) => sum + entry.sixMonthGrowth * entry.propertyCount, 0) /
      totalPropertyCount
    ).toFixed(1),
  );

  let trendingDirection: 'up' | 'down' | 'stable' = 'stable';
  if (weightedGrowth >= 2) trendingDirection = 'up';
  if (weightedGrowth <= -1) trendingDirection = 'down';

  let insight = 'This market is holding steady, which is useful if you are comparing entry timing.';
  if (weightedGrowth >= 4) {
    insight =
      'Pricing is climbing across multiple nearby suburbs, which usually means demand is outpacing new supply.';
  } else if (weightedGrowth >= 1) {
    insight =
      'Values are edging upward, suggesting steady buyer interest without a full pricing spike yet.';
  } else if (weightedGrowth <= -3) {
    insight =
      'Prices are softening across this market, which can create negotiation room for well-positioned buyers.';
  } else if (weightedGrowth < 0) {
    insight =
      'Momentum is slightly softer right now, so patient offers may land better than they did earlier in the year.';
  }

  return {
    label,
    averagePrice: weightedAveragePrice,
    medianPrice: weightedMedianPrice,
    propertyCount: entries.reduce((sum, entry) => sum + entry.propertyCount, 0),
    sixMonthGrowth: weightedGrowth,
    trendingDirection,
    insight,
    href,
  };
}

function getToneClasses(tone: ChangeSignal['tone']) {
  if (tone === 'emerald') return 'border-emerald-100 bg-emerald-50 text-emerald-800';
  if (tone === 'amber') return 'border-amber-100 bg-amber-50 text-amber-800';
  if (tone === 'rose') return 'border-rose-100 bg-rose-50 text-rose-800';
  return 'border-blue-100 bg-blue-50 text-blue-800';
}

function buildDemandInsight(market: MarketPulse) {
  if (market.insight) {
    if (market.searchCount30d && market.searchCount30d >= 40) {
      return `${market.insight} Search activity is elevated with ${market.searchCount30d} recent demand signals.`;
    }
    return market.insight;
  }

  if (market.trendingDirection === 'up') {
    return market.searchCount30d
      ? `Demand is heating up here with ${market.searchCount30d} recent search signals and prices moving higher.`
      : 'Demand is heating up here and prices are moving higher across the local stock mix.';
  }

  if (market.trendingDirection === 'down') {
    return 'Momentum is softer in this pocket, which may create room to negotiate or wait for stronger value.';
  }

  return 'This area is stable right now, which makes it easier to benchmark value against similar homes.';
}

export default function UserDashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, loading } = useAuth();
  const { comparedProperties, removeFromComparison, clearComparison } = useComparison();
  const sessionId = useProspectSessionId();
  const utils = trpc.useUtils();
  const [plannerOpen, setPlannerOpen] = useState(false);
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
  const { data: allProperties } = trpc.properties.search.useQuery(
    { status: 'available', limit: 120 },
    { enabled: isAuthenticated },
  );
  const { data: prospect } = trpc.prospects.getProspect.useQuery(
    { sessionId },
    { enabled: isAuthenticated && !!sessionId },
  );
  const { data: prospectProgress } = trpc.prospects.getProspectProgress.useQuery(
    { sessionId },
    { enabled: isAuthenticated && !!sessionId },
  );
  const { data: marketHeatmap, isLoading: marketHeatmapLoading } =
    trpc.priceInsights.getSuburbPriceHeatmap.useQuery(
      { limit: 120, offset: 0 },
      { enabled: isAuthenticated },
    );
  const { data: trendingSuburbs, isLoading: trendingLoading } = useTrendingSuburbs({
    limit: 12,
    enabled: isAuthenticated,
  });

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

  const buyabilityInput = useMemo(() => {
    if (!prospect) return null;

    return {
      income: prospect.income ? prospect.income / 100 : undefined,
      incomeRange: prospect.incomeRange as
        | 'under_15k'
        | '15k_25k'
        | '25k_50k'
        | '50k_75k'
        | '75k_100k'
        | '100k_plus'
        | undefined,
      employmentStatus: prospect.employmentStatus as
        | 'employed'
        | 'self_employed'
        | 'contract'
        | 'unemployed'
        | undefined,
      combinedIncome: prospect.combinedIncome ? prospect.combinedIncome / 100 : undefined,
      monthlyExpenses: prospect.monthlyExpenses ? prospect.monthlyExpenses / 100 : undefined,
      monthlyDebts: prospect.monthlyDebts ? prospect.monthlyDebts / 100 : undefined,
      dependents: prospect.dependents || 0,
      savingsDeposit: prospect.savingsDeposit ? prospect.savingsDeposit / 100 : undefined,
      creditScore: prospect.creditScore || undefined,
      hasCreditConsent: prospect.hasCreditConsent === 1,
    };
  }, [prospect]);

  const { data: buyabilityResults } = trpc.prospects.calculateBuyability.useQuery(
    buyabilityInput as never,
    { enabled: Boolean(buyabilityInput) },
  );

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
              } as FavoriteCard)
            : null;
        })
        .filter(Boolean) as FavoriteCard[],
    [favoritesRaw],
  );

  const allPropertyItems = Array.isArray(allProperties)
    ? allProperties
    : ((allProperties as { items?: Array<{ id: number }>; results?: Array<{ id: number }> })
        ?.items ??
      (allProperties as { results?: Array<{ id: number }> })?.results ??
      []);

  const comparisonItems = allPropertyItems.filter(item => comparedProperties.includes(item.id));

  const watchAreas = useMemo(() => {
    const areas = new Map<string, WatchArea>();

    const registerArea = (area: WatchArea) => {
      if (!area.label || areas.has(area.key)) return;
      areas.set(area.key, area);
    };

    favorites.forEach(favorite => {
      const suburb = favorite.suburb ? String(favorite.suburb) : undefined;
      const city = favorite.city ? String(favorite.city) : undefined;
      const province = favorite.province ? String(favorite.province) : undefined;
      const label = [suburb, city, province].filter(Boolean).join(', ');

      registerArea({
        key: makeWatchKey(suburb, city, province),
        label,
        suburb,
        city,
        province,
        href: buildSearchHref({ suburb, city, province }),
        source: 'saved-home',
      });
    });

    (savedSearches || []).forEach(search => {
      const criteria = (search.criteria || {}) as RawCriteria;
      const suburb = getCriteriaValue(criteria, 'suburb');
      const city = getCriteriaValue(criteria, 'city');
      const province = getCriteriaValue(criteria, 'province');
      const label = [titleize(suburb), titleize(city), titleize(province)]
        .filter(Boolean)
        .join(', ');

      registerArea({
        key: makeWatchKey(suburb, city, province),
        label,
        suburb: titleize(suburb),
        city: titleize(city),
        province: titleize(province),
        href: buildSearchHref(criteria),
        source: 'saved-search',
      });
    });

    return Array.from(areas.values()).slice(0, 6);
  }, [favorites, savedSearches]);

  const locations = useMemo(() => watchAreas.map(area => area.label).slice(0, 6), [watchAreas]);

  const watchMarket = useMemo(() => {
    const heatmapEntries = (marketHeatmap || []) as HeatmapEntry[];
    const normalizedTrending =
      trendingSuburbs?.map(suburb => ({
        ...suburb,
        suburbKey: makeWatchKey(
          suburb.name,
          suburb.cityName || undefined,
          suburb.provinceName || undefined,
        ),
        cityKey: makeWatchKey(
          undefined,
          suburb.cityName || undefined,
          suburb.provinceName || undefined,
        ),
        provinceKey: makeWatchKey(undefined, undefined, suburb.provinceName || undefined),
      })) || [];

    const cityBuckets = new Map<string, HeatmapEntry[]>();
    const provinceBuckets = new Map<string, HeatmapEntry[]>();

    heatmapEntries.forEach(entry => {
      const cityKey = makeWatchKey(undefined, entry.cityName, entry.province);
      const provinceKey = makeWatchKey(undefined, undefined, entry.province);
      cityBuckets.set(cityKey, [...(cityBuckets.get(cityKey) || []), entry]);
      provinceBuckets.set(provinceKey, [...(provinceBuckets.get(provinceKey) || []), entry]);
    });

    return watchAreas
      .map(area => {
        const suburbMatch = heatmapEntries.find(
          entry =>
            normalizeText(entry.suburbName) === normalizeText(area.suburb) &&
            (!area.city || normalizeText(entry.cityName) === normalizeText(area.city)),
        );

        const suburbTrend = normalizedTrending.find(item => item.suburbKey === area.key);
        const cityTrend = normalizedTrending.find(
          item => item.cityKey === makeWatchKey(undefined, area.city, area.province),
        );
        const provinceTrend = normalizedTrending.find(
          item => item.provinceKey === makeWatchKey(undefined, undefined, area.province),
        );

        if (suburbMatch) {
          return {
            area,
            market: {
              label: area.label,
              city: suburbMatch.cityName,
              province: suburbMatch.province,
              averagePrice: suburbMatch.averagePrice,
              medianPrice: suburbMatch.medianPrice,
              propertyCount: suburbMatch.propertyCount,
              sixMonthGrowth: suburbMatch.sixMonthGrowth,
              trendingDirection: suburbMatch.trendingDirection,
              trendingScore: suburbTrend?.trendingScore,
              searchCount30d: suburbTrend?.searchCount30d,
              insight: suburbMatch.growthInsight,
              href: area.href,
            } satisfies MarketPulse,
          };
        }

        if (area.city) {
          const aggregate = aggregateMarketPulse(
            area.label,
            area.href,
            cityBuckets.get(makeWatchKey(undefined, area.city, area.province)) || [],
          );
          if (aggregate) {
            return {
              area,
              market: {
                ...aggregate,
                city: area.city,
                province: area.province,
                trendingScore: cityTrend?.trendingScore,
                searchCount30d: cityTrend?.searchCount30d,
              } satisfies MarketPulse,
            };
          }
        }

        if (area.province) {
          const aggregate = aggregateMarketPulse(
            area.label,
            area.href,
            provinceBuckets.get(makeWatchKey(undefined, undefined, area.province)) || [],
          );
          if (aggregate) {
            return {
              area,
              market: {
                ...aggregate,
                province: area.province,
                trendingScore: provinceTrend?.trendingScore,
                searchCount30d: provinceTrend?.searchCount30d,
              } satisfies MarketPulse,
            };
          }
        }

        return { area, market: null };
      })
      .slice(0, 3);
  }, [marketHeatmap, trendingSuburbs, watchAreas]);

  const topTrendingAreas = useMemo(() => {
    const watchKeys = new Set(watchAreas.map(area => area.key));
    return (
      (trendingSuburbs || [])
        .filter(suburb =>
          watchKeys.has(
            makeWatchKey(
              suburb.name,
              suburb.cityName || undefined,
              suburb.provinceName || undefined,
            ),
          ),
        )
        .slice(0, 3)
        .map(suburb => ({
          label: `${suburb.name}, ${suburb.cityName || suburb.provinceName || 'South Africa'}`,
          trendingScore: suburb.trendingScore,
          searchCount30d: suburb.searchCount30d,
          href: buildSearchHref({
            suburb: suburb.name,
            city: suburb.cityName || undefined,
            province: suburb.provinceName || undefined,
          }),
        })) || []
    );
  }, [trendingSuburbs, watchAreas]);

  const sellerReadiness = useMemo(() => {
    const signals = [
      {
        label: 'Target market defined',
        detail:
          watchAreas.length > 0
            ? `${watchAreas.length} watch area${watchAreas.length === 1 ? '' : 's'} tracked from your saved homes and searches.`
            : 'Save the suburbs or cities you would sell into so pricing guidance becomes location-specific.',
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
        detail: watchMarket.some(item => item.market)
          ? 'At least one of your focus areas already has live pricing movement and demand signals.'
          : 'As soon as locality analytics are available for your watch areas, this dashboard will show the movement automatically.',
        complete: watchMarket.some(item => item.market),
      },
    ];

    const completed = signals.filter(signal => signal.complete).length;
    const score = Math.round((completed / signals.length) * 100);

    return {
      score,
      signals,
      nextAction:
        score >= 67
          ? 'You have enough market context to start valuation prep and line up your launch partners.'
          : 'Tighten your market context first, then move into valuation and listing-prep services with much better timing.',
    };
  }, [favorites.length, savedSearches, watchAreas, watchMarket]);

  const sellerStrategy = useMemo(() => {
    const activeMarkets = watchMarket
      .filter(item => item.market)
      .map(item => item.market as MarketPulse);

    if (activeMarkets.length === 0) {
      return {
        marketTemperature: 'Context building',
        strongestArea: 'No tracked market yet',
        launchWindow:
          sellerPlanning.timeline === '0_30_days'
            ? 'Urgent timeline, but build watch areas first'
            : 'Build watch areas first',
        summary:
          'You need at least one live watch area before the dashboard can suggest pricing or launch timing with confidence.',
      };
    }

    const strongestArea = [...activeMarkets].sort(
      (left, right) => right.sixMonthGrowth - left.sixMonthGrowth,
    )[0];
    const averageGrowth =
      activeMarkets.reduce((sum, market) => sum + market.sixMonthGrowth, 0) / activeMarkets.length;
    const averageDemand =
      activeMarkets.reduce((sum, market) => sum + Number(market.trendingScore || 0), 0) /
      activeMarkets.length;

    let marketTemperature = 'Stable market';
    let launchWindow = 'Stage the home, then test pricing deliberately';
    let summary =
      'Your markets are balanced right now, so presentation quality and pricing discipline will matter more than speed.';

    if (averageGrowth >= 3 || averageDemand >= 65) {
      marketTemperature = 'Demand-forward market';
      launchWindow = 'Prepare quickly and go to market while demand stays elevated';
      summary =
        'The areas you watch are showing strong movement or search demand, which usually rewards prepared sellers who launch with clean media and pricing confidence.';
    } else if (averageGrowth <= -1) {
      marketTemperature = 'Buyer-leaning market';
      launchWindow = 'Use valuation prep before committing to a listing price';
      summary =
        'Momentum is softer across your tracked areas, so inspections, compliance work, and realistic pricing become more important than rushing live.';
    }

    if (sellerPlanning.timeline === '0_30_days') {
      launchWindow = 'Fast-track prep and remove avoidable launch blockers this month';
    } else if (sellerPlanning.timeline === '6_months_plus') {
      launchWindow = 'Use the longer runway to improve presentation before launch';
    }

    if (sellerPlanning.readiness === 'needs_work') {
      summary =
        'Your market context is useful, but the property still needs prep. Condition and compliance work should happen before you rely on an ambitious price.';
    } else if (
      sellerPlanning.readiness === 'launch_ready' &&
      marketTemperature !== 'Buyer-leaning market'
    ) {
      summary =
        'Your markets are supportive and the property is close to launch-ready, so the next leverage point is clean valuation discipline and strong launch media.';
    }

    return {
      marketTemperature,
      strongestArea: strongestArea.label,
      launchWindow,
      summary,
    };
  }, [sellerPlanning.readiness, sellerPlanning.timeline, watchMarket]);

  const sellerValuationGuide = useMemo(() => {
    const activeMarkets = watchMarket
      .filter(item => item.market)
      .map(item => item.market as MarketPulse)
      .sort((left, right) => right.sixMonthGrowth - left.sixMonthGrowth);

    if (activeMarkets.length === 0) {
      return {
        area: 'Add a watch area first',
        benchmarkLow: 0,
        benchmarkHigh: 0,
        pricingPosture: 'Context first',
        rationale:
          'Once you save the areas you care about, the dashboard will start forming a local benchmark band and launch posture.',
        nextSteps: [
          'Save target suburbs or cities to build comparable market context.',
          'Create at least one saved search so new competing stock starts shaping your pricing view.',
        ],
      };
    }

    const anchor = activeMarkets[0];
    const lowMultiplier =
      sellerStrategy.marketTemperature === 'Demand-forward market'
        ? 0.99
        : sellerStrategy.marketTemperature === 'Buyer-leaning market'
          ? 0.94
          : 0.97;
    const highMultiplier =
      sellerStrategy.marketTemperature === 'Demand-forward market'
        ? 1.04
        : sellerStrategy.marketTemperature === 'Buyer-leaning market'
          ? 1.0
          : 1.02;

    const benchmarkLow = roundToNearest(anchor.medianPrice * lowMultiplier, 25000);
    const benchmarkHigh = roundToNearest(anchor.averagePrice * highMultiplier, 25000);

    let pricingPosture = 'Price close to the market median';
    let rationale =
      'Your strongest watch area is balanced enough that accurate positioning and presentation should matter more than aggressive overpricing.';
    let nextSteps = [
      'Run valuation prep before finalizing a list price.',
      'Prepare media once the pricing brief is aligned with current supply.',
    ];

    if (sellerStrategy.marketTemperature === 'Demand-forward market') {
      pricingPosture = 'Lead at the upper end of the local band';
      rationale =
        'Demand is strong enough that well-prepared listings can push closer to the top of the local range, provided the launch quality is tight.';
      nextSteps = [
        'Book inspections quickly so you do not lose momentum before launch.',
        'Sequence photography and staging immediately after the valuation brief.',
      ];
    } else if (sellerStrategy.marketTemperature === 'Buyer-leaning market') {
      pricingPosture = 'Stay disciplined and defensible';
      rationale =
        'Softer demand means the market will punish optimistic pricing faster, so compliance, condition, and realistic positioning should lead the strategy.';
      nextSteps = [
        'Use inspection and compliance work to remove buyer objections before launch.',
        'Benchmark against active competing stock instead of older peak pricing.',
      ];
    }

    if (sellerPlanning.goal === 'test_market') {
      pricingPosture = 'Start with a testable, feedback-driven price';
      rationale =
        'Because you are testing the market, the goal is to learn quickly from buyer reactions without anchoring too high too early.';
    } else if (sellerPlanning.goal === 'upgrade') {
      nextSteps = [
        ...nextSteps,
        'Keep your purchase plan updated so your next-home timing stays synchronized with the sale.',
      ];
    }

    if (sellerPlanning.readiness === 'needs_work') {
      nextSteps = [
        'Prioritize repairs, compliance, and presentation work before committing to the top of the pricing band.',
        ...nextSteps,
      ].slice(0, 3);
    }

    return {
      area: anchor.label,
      benchmarkLow,
      benchmarkHigh,
      pricingPosture,
      rationale,
      nextSteps,
    };
  }, [
    sellerPlanning.goal,
    sellerPlanning.readiness,
    sellerStrategy.marketTemperature,
    watchMarket,
  ]);

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
          '/services/request/inspection_compliance?intentStage=seller_valuation&sourceSurface=journey_injection',
        secondaryLabel: 'Refine buyability plan',
      };
    }

    if (buyerReady && !sellerReady) {
      return {
        headline: 'Your buyer side is ahead of your seller side',
        detail:
          'Keep your purchase ceiling in place, but build seller market context next so your sale timing does not become the bottleneck.',
        primaryLabel: 'Build seller context',
        primaryHref: '#overview-seller-readiness',
        secondaryLabel: 'Review watch areas',
      };
    }

    if (!buyerReady && sellerReady) {
      return {
        headline: 'Your seller side is ahead of your buyer side',
        detail:
          'You have enough market context to prepare a sale, but you still need a sharper affordability plan before making confident purchase decisions.',
        primaryLabel: 'Open buyability planner',
        primaryHref: '#open-planner',
        secondaryLabel: 'Review seller readiness',
      };
    }

    return {
      headline: 'Build both sides of the move before you transact',
      detail:
        'Complete your affordability plan and tighten your target markets first. That gives you a cleaner handoff into valuation, media, and eventual property offers.',
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

    const hottestArea = watchMarket
      .filter(item => item.market)
      .sort(
        (left, right) => (right.market?.sixMonthGrowth || 0) - (left.market?.sixMonthGrowth || 0),
      )[0];

    if (hottestArea?.market) {
      const directionCopy =
        hottestArea.market.trendingDirection === 'down'
          ? 'is cooling'
          : hottestArea.market.trendingDirection === 'up'
            ? 'is heating up'
            : 'is holding steady';

      changes.push({
        title: `${hottestArea.area.label} ${directionCopy}`,
        detail: `${formatCompactRand(hottestArea.market.medianPrice)} median with ${hottestArea.market.sixMonthGrowth.toFixed(1)}% six-month movement.`,
        tone:
          hottestArea.market.trendingDirection === 'down'
            ? 'amber'
            : hottestArea.market.trendingDirection === 'up'
              ? 'emerald'
              : 'blue',
        href: hottestArea.market.href,
        cta: 'View area',
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
          'Save homes, save searches, and complete your buyability planner to unlock personalized market movement here.',
        tone: 'blue',
      });
    }

    return changes.slice(0, 4);
  }, [alertHistory, buyabilityResults, favorites, lastVisitAt, watchMarket]);

  const toggleFavoriteMutation = trpc.properties.toggleFavorite.useMutation({
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
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7fafc_0%,#edf4f7_50%,#f8fbfd_100%)]">
      <Navbar />

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
                  id="open-planner"
                  className="bg-slate-900 text-white hover:bg-slate-800"
                  onClick={() => setPlannerOpen(true)}
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  {prospect ? 'Update buyability plan' : 'Start buyability plan'}
                </Button>
                <Button variant="outline" onClick={() => setLocation('/properties')}>
                  <Search className="mr-2 h-4 w-4" />
                  Browse properties
                </Button>
                {(intent === 'seller' || intent === 'both') && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      setLocation(
                        '/services/request/inspection_compliance?intentStage=seller_valuation&sourceSurface=journey_injection',
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

        <Tabs defaultValue="overview" className="mt-8 w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-white/80 p-2 shadow-sm md:grid-cols-5">
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
                          setPlannerOpen(true);
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

            <div className="grid gap-6 lg:grid-cols-2">
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

                  <Button variant="outline" onClick={() => setPlannerOpen(true)}>
                    Open planner
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

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <Select
                        value={sellerPlanning.goal}
                        onValueChange={value =>
                          setSellerPlanning(current => ({
                            ...current,
                            goal: value as SellerGoal,
                          }))
                        }
                      >
                        <SelectTrigger className="bg-white">
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
                        <SelectTrigger className="bg-white">
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
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Home readiness" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="needs_work">Needs work</SelectItem>
                          <SelectItem value="good_condition">Good condition</SelectItem>
                          <SelectItem value="launch_ready">Launch ready</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <p className="mt-3 text-xs text-slate-500">
                      {consumerDashboardState?.updatedAt
                        ? `Last saved ${formatDashboardDate(consumerDashboardState.updatedAt)}`
                        : 'Your saved intent and seller plan travel with your account.'}
                    </p>
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

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Suggested local band
                        </p>
                        <p className="mt-2 text-xl font-semibold text-slate-900">
                          {sellerValuationGuide.benchmarkLow > 0
                            ? `${formatRand(sellerValuationGuide.benchmarkLow)} - ${formatRand(
                                sellerValuationGuide.benchmarkHigh,
                              )}`
                            : 'Build a watch area first'}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Positioning note
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {sellerValuationGuide.rationale}
                        </p>
                      </div>
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
                      className="h-auto w-full justify-between rounded-2xl px-4 py-4 text-left"
                      onClick={() =>
                        setLocation(
                          '/services/request/inspection_compliance?intentStage=seller_valuation&sourceSurface=journey_injection',
                        )
                      }
                    >
                      <div>
                        <p className="font-semibold text-slate-900">Seller valuation prep</p>
                        <p className="text-sm text-slate-500">
                          Bring in inspections and readiness checks before you set your price.
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </Button>

                    <Button
                      variant="outline"
                      className="h-auto w-full justify-between rounded-2xl px-4 py-4 text-left"
                      onClick={() =>
                        setLocation(
                          '/services/request/media_marketing?intentStage=seller_listing_prep&sourceSurface=journey_injection',
                        )
                      }
                    >
                      <div>
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
                    Real movement across the areas showing up in your saved homes and search alerts.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {marketHeatmapLoading || trendingLoading ? (
                    <p className="text-sm text-slate-500">Loading area signals...</p>
                  ) : watchMarket.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                      <p className="font-semibold text-slate-900">No watch areas yet</p>
                      <p className="mt-2 text-sm text-slate-600">
                        Save homes or searches to build your neighborhood watchlist.
                      </p>
                    </div>
                  ) : (
                    watchMarket.map(item => (
                      <div
                        key={item.area.key}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold text-slate-900">
                              {item.area.label}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              Source:{' '}
                              {item.area.source === 'saved-home' ? 'Saved homes' : 'Saved searches'}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(item.area.href)}
                          >
                            View homes
                          </Button>
                        </div>

                        {item.market ? (
                          <div className="mt-4 space-y-3">
                            <div className="grid gap-3 md:grid-cols-4">
                              <div className="rounded-xl bg-white px-3 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                  Median
                                </p>
                                <p className="mt-2 text-lg font-semibold text-slate-900">
                                  {formatCompactRand(item.market.medianPrice)}
                                </p>
                              </div>
                              <div className="rounded-xl bg-white px-3 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                  Avg price
                                </p>
                                <p className="mt-2 text-lg font-semibold text-slate-900">
                                  {formatCompactRand(item.market.averagePrice)}
                                </p>
                              </div>
                              <div className="rounded-xl bg-white px-3 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                  6m movement
                                </p>
                                <p
                                  className={`mt-2 text-lg font-semibold ${
                                    item.market.trendingDirection === 'down'
                                      ? 'text-amber-700'
                                      : item.market.trendingDirection === 'up'
                                        ? 'text-emerald-700'
                                        : 'text-slate-900'
                                  }`}
                                >
                                  {item.market.sixMonthGrowth > 0 ? '+' : ''}
                                  {item.market.sixMonthGrowth.toFixed(1)}%
                                </p>
                              </div>
                              <div className="rounded-xl bg-white px-3 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                  Market pulse
                                </p>
                                <div className="mt-2 flex items-center gap-2">
                                  {item.market.trendingDirection === 'down' ? (
                                    <TrendingDown className="h-4 w-4 text-amber-700" />
                                  ) : item.market.trendingDirection === 'up' ? (
                                    <TrendingUp className="h-4 w-4 text-emerald-700" />
                                  ) : (
                                    <Activity className="h-4 w-4 text-blue-700" />
                                  )}
                                  <span className="font-semibold text-slate-900">
                                    {item.market.trendingScore
                                      ? `${item.market.trendingScore}/100 demand`
                                      : `${item.market.propertyCount} active homes`}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Why this area is moving
                              </p>
                              <p className="mt-2 text-sm leading-6 text-slate-600">
                                {buildDemandInsight(item.market)}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-4 text-sm text-slate-500">
                            We have your watch area saved. Market pricing will appear here as more
                            locality data becomes available.
                          </p>
                        )}
                      </div>
                    ))
                  )}

                  {topTrendingAreas.length > 0 ? (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                      <div className="flex items-center gap-2 text-blue-800">
                        <TrendingUp className="h-4 w-4" />
                        <p className="text-sm font-semibold">Areas getting more attention</p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {topTrendingAreas.map(area => (
                          <Button
                            key={area.label}
                            variant="outline"
                            className="border-blue-200 bg-white text-blue-800 hover:bg-blue-100"
                            onClick={() => setLocation(area.href)}
                          >
                            {area.label} - {area.trendingScore}/100
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="border-white/60 bg-white/90">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock3 className="h-5 w-5 text-slate-700" />
                    What changed
                  </CardTitle>
                  <CardDescription>
                    Signals generated from alerts, saved activity, and the markets you are watching.
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
                            if (change.href.startsWith('#')) {
                              const tabId = change.href.replace('#', '');
                              const trigger = document.querySelector<HTMLElement>(
                                `[data-state][value="${tabId}"]`,
                              );
                              trigger?.click();
                              return;
                            }
                            setLocation(change.href);
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

            {sessionId ? <RecentlyViewedCarousel sessionId={sessionId} /> : null}
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
                  <Button className="mt-4" onClick={() => setLocation('/properties')}>
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
                            {[property.suburb, property.city, property.province]
                              .filter(Boolean)
                              .join(', ') || 'South Africa'}
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
                            toggleFavoriteMutation.mutate({ propertyId: Number(property.id) })
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
                        onClick={() =>
                          setLocation(buildSearchHref((search.criteria as RawCriteria) ?? {}))
                        }
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Run search again
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
                  <Button className="mt-4" onClick={() => setLocation('/properties')}>
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

                    return (
                      <Card key={item.id} className="border-white/60 bg-white/90">
                        <CardContent className="space-y-4 p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">{property.title}</p>
                              <p className="text-sm text-slate-500">
                                {[property.city, property.province].filter(Boolean).join(', ') ||
                                  'South Africa'}
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
            {sessionId ? <RecentlyViewedCarousel sessionId={sessionId} /> : null}

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

      <ProspectDashboard isOpen={plannerOpen} onClose={() => setPlannerOpen(false)} />
    </div>
  );
}
