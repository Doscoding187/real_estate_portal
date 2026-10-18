import { useState, useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { ReferralApplyForm } from '@/components/distribution/ReferralApplyForm';
import { PropertyOpportunityShortlist } from '@/components/distribution/PropertyOpportunityShortlist';
import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  LogIn,
  Target,
  Zap,
  Users,
  Search,
  ChevronDown,
  ShieldCheck,
  Unlock,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MobileStickyCTA, useMobileStickyCTA } from '@/components/advertise/MobileStickyCTA';
import { SEOHead } from '@/components/advertise/SEOHead';
import { Skeleton } from '@/components/ui/skeleton';
import { trpc } from '@/lib/trpc';
import {
  DISTRIBUTION_BEDROOM_FILTERS,
  DISTRIBUTION_PRICE_BANDS,
  matchesDistributionOpportunity,
  type DistributionBedroomFilter,
  type DistributionMarketMode,
} from '@shared/distributionOpportunityMatching';
import '@/styles/advertise-responsive.css';
import '@/styles/advertise-focus-indicators.css';

const ACCOUNT_LOGIN_PATH = '/login?next=/distribution/partner/overview';
// Bedroom chip options
// Area options map to the published suburb and city labels.
const AREA_OPTIONS = [
  { label: 'Select area', value: '' },
  { label: 'Roodepoort / West Rand', value: 'roodepoort,west rand,constantia,wilgeheuwel,northgate' },
  { label: 'Johannesburg South', value: 'johannesburg south,alberton,soweto,lenasia,ennerdale,ormonde' },
  { label: 'North Riding / Sandton', value: 'north riding,sandton,fourways,randburg,lonehill,dainfern' },
  { label: 'Pretoria / Centurion', value: 'pretoria,centurion,midrand,menlyn,brooklyn,hatfield' },
  { label: 'East Rand', value: 'east rand,boksburg,germiston,bedfordview,edenvale,benoni' },
  { label: 'Any area', value: 'any' },
];

function formatCurrency(value: number) {
  return `R${Math.round(value).toLocaleString('en-ZA')}`;
}

function formatModePrice(
  mode: { priceFrom: number; priceTo: number } | undefined,
  marketMode: DistributionMarketMode,
) {
  if (!mode) return 'Unavailable';
  const range = mode.priceFrom === mode.priceTo
    ? formatCurrency(mode.priceFrom)
    : `${formatCurrency(mode.priceFrom)} – ${formatCurrency(mode.priceTo)}`;
  return marketMode === 'rent' ? `${range} / month` : range;
}

function formatObservedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'time unavailable';
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function DistributionNetworkPublicPage() {
  const [, setLocation] = useLocation();
  const stickyVisible = useMobileStickyCTA('distribution-network-hero');

  // Expandable form state
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [interestedDevId, setInterestedDevId] = useState<number | null>(null);

  // Matcher state starts empty.
  const [marketMode, setMarketMode] = useState<DistributionMarketMode>('sale');
  const [matchPriceRange, setMatchPriceRange] = useState('any');
  const [matchArea, setMatchArea] = useState('');
  // Bedrooms = multi-select chip set
  const [selectedBeds, setSelectedBeds] = useState<Set<DistributionBedroomFilter>>(new Set());

  const {
    data: developmentSearch,
    isLoading: isLoadingDevs,
    error: developmentSearchError,
  } = trpc.properties.searchDevelopments.useQuery(
    {
      developmentType: 'residential',
      page: 0,
      pageSize: 50,
      sortOption: 'date_desc',
    },
    { staleTime: 1000 * 60 * 5, refetchOnWindowFocus: true },
  );
  const developments = developmentSearch?.items ?? [];
  const candidateDevelopmentIds = useMemo(
    () => [...new Set(developments.map(development => Number(development.id)))],
    [developments],
  );
  const salesProjectionQuery = trpc.distribution.listPublicMarketableOpportunities.useQuery(
    { developmentIds: candidateDevelopmentIds },
    {
      enabled: !isLoadingDevs && candidateDevelopmentIds.length > 0,
      staleTime: 1000 * 30,
      refetchOnWindowFocus: true,
    },
  );
  const publicInventoryLoading = isLoadingDevs ||
    (candidateDevelopmentIds.length > 0 && salesProjectionQuery.isLoading);
  const publicInventoryError = developmentSearchError || salesProjectionQuery.error;
  const searchMetadataById = useMemo(
    () => new Map(developments.map(development => [Number(development.id), development])),
    [developments],
  );
  const projectedDevelopments = useMemo(
    () => (salesProjectionQuery.data?.items || []).flatMap(item => {
      const searchMetadata = searchMetadataById.get(item.developmentId);
      if (!searchMetadata) return [];
      return [{
        id: item.developmentId,
        name: item.campaign.name,
        suburb: searchMetadata.suburb || null,
        city: item.campaign.city,
        province: item.campaign.province,
        canonicalRoute: searchMetadata.canonicalRoute,
        images: item.campaign.images,
        description: item.campaign.description || item.campaign.tagline,
        inventory: item.inventory,
        observedAt: item.observedAt,
      }];
    }),
    [salesProjectionQuery.data?.items, searchMetadataById],
  );

  const revealAndScrollToForm = (devId?: number) => {
    setInterestedDevId(devId ?? null);
    setIsFormVisible(true);
    setTimeout(() => {
      document.getElementById('apply-form-section')?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, 150);
  };

  const scrollToOpportunities = () => {
    document.getElementById('available-developments')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const toggleBed = (bed: DistributionBedroomFilter) => {
    setSelectedBeds(prev => {
      const next = new Set(prev);
      if (next.has(bed)) next.delete(bed);
      else next.add(bed);
      return next;
    });
  };

  // Apply the same browse-only matching rules used in the entitled partner catalogue.
  const filteredDevelopments = useMemo(() => {
    const priceRange = DISTRIBUTION_PRICE_BANDS[marketMode].find(
      option => option.key === matchPriceRange,
    );
    const areaOption = AREA_OPTIONS.find(o => o.value === matchArea);
    const areaKeywords = areaOption?.value && areaOption.value !== 'any'
      ? areaOption.value.split(',').map(k => k.trim().toLowerCase())
      : null;

    const selectedBandIsAny = !priceRange || priceRange.key === 'any';
    const criteria = {
      marketMode,
      minPrice: selectedBandIsAny ? null : priceRange?.minPrice ?? null,
      maxPrice: selectedBandIsAny ? null : priceRange?.maxPrice ?? null,
      areaKeywords: areaKeywords || [],
      bedrooms: [...selectedBeds],
    };

    return projectedDevelopments.filter(dev => {
      const mode = dev.inventory.modes[marketMode];
      return matchesDistributionOpportunity({
        marketMode,
        available: Boolean(mode),
        priceFrom: mode?.priceFrom ?? null,
        priceTo: mode?.priceTo ?? null,
        locationText: [dev.suburb, dev.city, dev.province].filter(Boolean).join(' '),
        unitTypes: dev.inventory.unitTypes.map(unit => {
          const unitMode = unit.modes[marketMode];
          return {
            bedrooms: unit.bedrooms,
            label: unit.name,
            available: Boolean(unitMode),
            priceFrom: unitMode?.priceFrom ?? null,
            priceTo: unitMode?.priceTo ?? null,
          };
        }),
      }, criteria);
    });
  }, [marketMode, matchPriceRange, matchArea, selectedBeds, projectedDevelopments]);
  const shortlistSummary = [
    marketMode === 'sale' ? 'Looking to buy' : 'Looking to rent',
    matchPriceRange !== 'any'
      ? DISTRIBUTION_PRICE_BANDS[marketMode].find(option => option.key === matchPriceRange)?.label
      : 'Any listed price',
    AREA_OPTIONS.find(option => option.value === matchArea)?.label || 'Any area',
    selectedBeds.size
      ? [...selectedBeds].map(key => DISTRIBUTION_BEDROOM_FILTERS.find(option => option.key === key)?.label).filter(Boolean).join(', ')
      : 'Any bedroom count',
  ].filter(Boolean).join(' · ');

  return (
    <>
      <SEOHead
        title="Distribution Network | Property Listify"
        description="Explore property opportunities, apply to join Property Listify's Distribution Network, and see the steps and referral payout for each opportunity."
        canonicalUrl="/distribution-network"
        ogType="website"
      />
      <div className="min-h-screen bg-slate-50">
        <header className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-lg">
          <div className="container flex h-16 items-center justify-between">
            <Link href="/">
              <span className="flex cursor-pointer items-center gap-2 text-lg font-bold text-slate-900">
                <Building2 className="h-5 w-5 text-primary" />
                Property Listify
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="hidden border-slate-300 bg-white text-slate-700 sm:inline-flex hover:bg-slate-50"
                onClick={() => setLocation('/book-strategy')}
              >
                Book Strategy Call
              </Button>
              <Button
                size="sm"
                variant="conversion"
                onClick={() => revealAndScrollToForm()}
              >
                Apply to Join
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="hidden border-primary/20 text-primary sm:inline-flex hover:bg-primary/5"
                onClick={() => setLocation(ACCOUNT_LOGIN_PATH)}
              >
                Partner Login
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-slate-600 hover:text-slate-900"
                aria-label="Sign in"
                onClick={() => setLocation('/login')}
              >
                <LogIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main
          id="main-content"
          className="advertise-page relative overflow-x-hidden bg-slate-50 pt-16 text-slate-900"
        >
          {/* HERO SECTION */}
          <section
            id="distribution-network-hero"
            className="relative overflow-hidden pb-12 pt-12 md:pb-16 md:pt-20 bg-slate-900 text-center"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(2,132,199,0.15),transparent_40%),radial-gradient(circle_at_0%_30%,rgba(0,92,168,0.22),transparent_35%)]" />

            <div className="container relative text-center">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold tracking-wide text-sky-200 uppercase">
                <span className="h-2 w-2 rounded-full bg-conversion animate-pulse" />
                Partner applications open
              </div>

              <h1 className="mx-auto mb-6 max-w-5xl text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-5xl">
                Know someone looking for a home?
                <br />
                <span className="bg-[linear-gradient(135deg,#67e8f9,var(--brand-blue))] bg-clip-text text-transparent">
                  Explore property opportunities together.
                </span>
              </h1>

              <p className="mx-auto max-w-2xl text-lg text-slate-300 mb-4 font-light">
                Browse current buying and rental options first. When you are ready to introduce
                someone, apply for partner access to see the referral steps and follow recorded
                progress and payouts.
              </p>

              <div className="text-blue-200 text-sm md:text-base font-medium mb-10 flex flex-col md:flex-row justify-center items-center gap-2 md:gap-4">
                <span>
                  Explore developer inventory
                </span>
                <span className="hidden md:inline">•</span>
                <span>Browse by area, price, and size</span>
                <span className="hidden md:inline">•</span>
                <span>Referral steps and payouts vary by opportunity</span>
              </div>

              <div className="mx-auto mb-4 flex w-full max-w-md flex-col items-center justify-center gap-4 sm:max-w-none sm:flex-row">
                <Button
                  size="lg"
                  variant="conversion"
                  className="h-14 px-10 text-base font-bold sm:w-auto transition-transform hover:-translate-y-0.5"
                  onClick={scrollToOpportunities}
                >
                  Explore current options
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 border-slate-600 bg-transparent px-8 text-base text-slate-300 sm:w-auto hover:bg-slate-800 hover:text-white transition-colors"
                  onClick={() => revealAndScrollToForm()}
                >
                  Apply to join
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 border-slate-600 bg-transparent px-8 text-base text-slate-300 sm:w-auto hover:bg-slate-800 hover:text-white transition-colors"
                  onClick={() => setLocation(ACCOUNT_LOGIN_PATH)}
                >
                  Sign in
                  <LogIn className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-slate-500 mb-12">
                You can apply even if no one is ready to proceed and you have no property-sales experience.
              </p>

              {/* NETWORK BENEFITS */}
              <div className="border-t border-slate-800 pt-8 flex flex-wrap justify-center gap-x-12 gap-y-6">
                <div className="flex items-center gap-2 text-slate-400">
                  <Zap className="h-5 w-5 text-amber-400" />
                  <span className="text-sm font-medium">Start with the person's needs</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Target className="h-5 w-5 text-emerald-400" />
                  <span className="text-sm font-medium">See each referral's next step</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <ShieldCheck className="h-5 w-5 text-blue-400" />
                  <span className="text-sm font-medium">Review the conditions before introducing someone</span>
                </div>
              </div>
            </div>
          </section>

          {/* EXPANDABLE FORM SECTION */}
          <AnimatePresence>
            {isFormVisible && (
              <motion.section
                id="apply-form-section"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="overflow-hidden bg-slate-100"
              >
                <div className="container py-12 md:py-16 border-b border-slate-200">
                  <ReferralApplyForm
                    onClose={() => setIsFormVisible(false)}
                    interestedDevId={interestedDevId}
                    developments={developments.map(d => ({
                      id: d.id,
                      name: d.name,
                      suburb: d.suburb,
                      city: d.city,
                    }))}
                  />
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* MATCHER ENGINE */}
          <section className="scroll-mt-24 py-16 md:py-24 border-b border-slate-200 bg-white">
            <div className="container">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
                <div className="max-w-xl">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
                    Browse Development Inventory
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl leading-tight mb-5">
                    Find options for the person you’re helping.
                  </h2>
                  <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                    Choose whether they want to buy or rent, then narrow current opportunities by
                    price, area, and bedrooms. This is a property search, not a credit decision.
                  </p>
                  <div className="bg-primary/5 border-l-4 border-primary p-4 rounded-r-lg text-slate-700 font-medium">
                    Prices and availability can change. After you join, you’ll see which options are
                    open for referrals to you and the conditions for each one.
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.1)] border border-slate-200 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[100px] -z-0"></div>

                  <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                    <div className="md:col-span-2">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                        What are they looking for?
                      </span>
                      <div className="flex flex-wrap gap-2" role="group" aria-label="Property type">
                        {(['sale', 'rent'] as const).map(mode => (
                          <button
                            key={mode}
                            type="button"
                            aria-pressed={marketMode === mode}
                            onClick={() => {
                              setMarketMode(mode);
                              setMatchPriceRange('any');
                            }}
                            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                              marketMode === mode
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-primary/40'
                            }`}
                          >
                            {mode === 'sale' ? 'Buy' : 'Rent'}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Price range */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
                        {marketMode === 'sale' ? 'Price range' : 'Monthly rent'}
                      </label>
                      <div className="relative">
                        <select
                          className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          value={matchPriceRange}
                          onChange={e => setMatchPriceRange(e.target.value)}
                        >
                          {DISTRIBUTION_PRICE_BANDS[marketMode].map(o => (
                            <option key={o.key} value={o.key}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Area */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
                        Preferred area
                      </label>
                      <div className="relative">
                        <select
                          className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          value={matchArea}
                          onChange={e => setMatchArea(e.target.value)}
                        >
                          {AREA_OPTIONS.map(o => (
                            <option key={o.value} value={o.value} disabled={o.value === ''}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Bedrooms: select any number of options. */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
                        Bedrooms <span className="text-slate-400 font-normal normal-case">(select all that apply)</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {DISTRIBUTION_BEDROOM_FILTERS.map(bed => {
                          const active = selectedBeds.has(bed.key);
                          return (
                            <button
                              key={bed.label}
                              type="button"
                              aria-pressed={active}
                              onClick={() => toggleBed(bed.key)}
                              className={`px-3.5 py-2 rounded-lg text-xs font-bold border transition-all select-none ${
                                active
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-blue-400 hover:text-blue-700'
                              }`}
                            >
                              {active && <span className="mr-1">✓</span>}
                              {bed.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Results Card */}
                  <div className={`rounded-xl p-5 mb-5 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors ${
                    filteredDevelopments.length === 0
                      ? 'bg-amber-50 border border-amber-200'
                      : 'bg-blue-50 border border-blue-100'
                  }`}>
                    {filteredDevelopments.length === 0 ? (
                      <div className="w-full text-center">
                        <p className="text-sm font-bold text-amber-800">No current opportunities match these choices.</p>
                        <p className="text-xs text-amber-700 mt-1">Try a different area, price range, or bedroom count.</p>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                            Current {marketMode === 'sale' ? 'buying' : 'rental'} options matching these choices
                          </p>
                          <p className="text-xl font-bold text-slate-900">
                            {filteredDevelopments.length} opportunit{filteredDevelopments.length !== 1 ? 'ies' : 'y'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {!publicInventoryLoading && !publicInventoryError ? (
                    <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
                      <PropertyOpportunityShortlist
                        key={marketMode}
                        marketMode={marketMode}
                        searchSummary={shortlistSummary}
                        opportunities={filteredDevelopments.map(dev => ({
                          id: dev.id,
                          name: dev.name,
                          location: [dev.suburb, dev.city, dev.province].filter(Boolean).join(', '),
                          imageUrl: dev.images[0] || null,
                          url: dev.canonicalRoute,
                          priceLabel: formatModePrice(dev.inventory.modes[marketMode], marketMode),
                          availabilityLabel: dev.inventory.modes[marketMode]
                            ? `${dev.inventory.modes[marketMode]!.availableCount} currently available · checked ${formatObservedAt(dev.observedAt)}`
                            : 'No current availability for this option',
                          propertyDetails: dev.inventory.unitTypes
                            .filter(unit => Boolean(unit.modes[marketMode]))
                            .slice(0, 4)
                            .map(unit => `${unit.name}${unit.bedrooms === null ? '' : ` · ${unit.bedrooms} bed${unit.bedrooms === 1 ? '' : 's'}`} · ${formatModePrice(unit.modes[marketMode], marketMode)}`),
                          description: dev.description,
                        }))}
                      />
                    </div>
                  ) : null}

                  <Button
                    className="w-full h-14 bg-[linear-gradient(135deg,#0f172a,#1e293b)] text-white text-base font-bold shadow-lg hover:bg-slate-800 group"
                    onClick={() => revealAndScrollToForm()}
                  >
                    Join to refer someone
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* PROBLEM FRAMING / WHY THIS WORKS */}
          <section id="problem-framing" className="bg-slate-50 py-16 md:py-24">
            <div className="container">
              <div className="mx-auto mb-14 max-w-3xl text-center">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-200 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700">
                  A Guided Partner Workspace
                </div>
                <h2 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">
                  You can take part even if you are new to property.
                </h2>
                <p className="text-lg text-slate-600">
                  Explore property options, see what is needed to make an introduction, follow its
                  progress, and track the referral payout.
                </p>
              </div>

              <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-slate-200 bg-white hover:border-blue-300 transition-colors shadow-sm">
                  <CardContent className="p-6">
                      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Users className="h-5 w-5" />
                    </div>
                    <h3 className="mb-2 text-base font-bold text-slate-900">
                      Start with a person you know
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600">
                      Agents and individuals can join. The person you want to help does not need to
                      be ready before you apply.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-white hover:border-blue-300 transition-colors shadow-sm">
                  <CardContent className="p-6">
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600">
                      <Search className="h-5 w-5" />
                    </div>
                    <h3 className="mb-2 text-base font-bold text-slate-900">
                      Explore available options
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600">
                      Browse current options by buying or renting, area, listed price, and bedrooms.
                      This search does not predict a lender's decision.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-white hover:border-blue-300 transition-colors shadow-sm">
                  <CardContent className="p-6">
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                      <ClipboardCheck className="h-5 w-5" />
                    </div>
                    <h3 className="mb-2 text-base font-bold text-slate-900">
                      Know what happens next
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600">
                      Documents, next steps, and referral payouts can differ by opportunity. Review
                      them before you introduce someone.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-white hover:border-blue-300 transition-colors shadow-sm">
                  <CardContent className="p-6">
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                      <Target className="h-5 w-5" />
                    </div>
                    <h3 className="mb-2 text-base font-bold text-slate-900">
                      Follow every referral
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600">
                      See progress, the responsible team, required documents, and the next action
                      in the partner workspace.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* OPPORTUNITIES (REFERRAL CARDS) */}
          <section
            id="available-developments"
            className="scroll-mt-24 bg-white py-16 md:py-24 border-y border-slate-200/60"
          >
            <div className="container">
              <div className="mx-auto mb-12 max-w-3xl text-center">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
                  Current property options
                </div>
                <h2 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">
                  Explore developments from our publishing partners.
                </h2>
                <p className="text-lg text-slate-600">
                  Browse currently available residential opportunities for{' '}
                  {marketMode === 'sale' ? 'purchase' : 'rent'}. You can explore these public options
                  now; referring someone depends on the opportunity and your account access.
                </p>
                {developmentSearch?.hasMore && (
                  <p className="mt-2 text-sm text-slate-500">
                    Showing up to 50 public listings; only options with confirmed public details and current marketable stock appear here.{' '}
                    <Link href="/new-developments">
                      <span className="font-semibold text-primary underline">Browse the full catalogue</span>
                    </Link>
                    .
                  </p>
                )}
              </div>

              {publicInventoryLoading ? (
                <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
                  <Skeleton className="h-[420px] w-full rounded-2xl bg-slate-100" />
                  <Skeleton className="h-[420px] w-full rounded-2xl bg-slate-100" />
                  <Skeleton className="h-[420px] w-full rounded-2xl bg-slate-100" />
                </div>
              ) : publicInventoryError ? (
                <p role="status" className="mx-auto max-w-3xl rounded-lg border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-900">
                  Current property availability is temporarily unavailable. Please try again later.
                </p>
              ) : filteredDevelopments.length === 0 ? (
                <p className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-700">
                  No public residential {marketMode === 'sale' ? 'purchase' : 'rental'} opportunities
                  match these choices right now.
                </p>
              ) : (
                <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredDevelopments.map((dev, i) => {
                    const mode = dev.inventory.modes[marketMode];
                    const availabilityLabel = mode
                      ? `${mode.availableCount} ${marketMode === 'sale' ? 'homes' : 'rentals'} currently available`
                      : 'Not currently available';
                    const bgGradients = [
                      'linear-gradient(140deg, #0f172a 0%, var(--brand-blue) 100%)',
                      'linear-gradient(140deg, #064e3b 0%, #047857 100%)',
                      'linear-gradient(140deg, #312e81 0%, var(--info) 100%)',
                      'linear-gradient(140deg, #451a03 0%, #b45309 100%)',
                      'linear-gradient(140deg, #172554 0%, var(--brand-blue) 100%)',
                    ];

                    const defaultBg = bgGradients[i % bgGradients.length];
                    const hasCover = Boolean(dev.images[0]);
                    return (
                      <div
                        key={dev.id}
                        className="opp-card relative hover:-translate-y-1 hover:border-blue-300 transition-all"
                      >
                        {/* Image header */}
                        <div
                          className="opp-card-img theme-1"
                          style={{
                            height: '200px',
                            backgroundImage: hasCover
                              ? `linear-gradient(to top, rgba(15,23,42,0.88), rgba(15,23,42,0.1)), url(${dev.images[0]})`
                              : defaultBg,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center center',
                          }}
                        >
                          <div>
                            <div className="opp-name">{dev.name}</div>
                            <div className="opp-location">{dev.suburb || dev.city}</div>
                          </div>
                        </div>
                        <div className="opp-body">
                          <p className="mb-3 text-xs font-medium text-slate-500">
                            Current {marketMode === 'sale' ? 'sale' : 'rental'} option · Checked {formatObservedAt(dev.observedAt)}
                          </p>
                          <div className="opp-price-row">
                            <div className="opp-price">
                              {formatModePrice(mode, marketMode)}
                              <span>
                                Current advertised {marketMode === 'rent' ? 'monthly rent' : 'sale price'} range. Confirm final unit costs with the responsible team.
                              </span>
                            </div>
                            <div className="opp-payout">
                              {availabilityLabel}
                              <span>Availability can change. Confirm the selected unit is still available before proceeding.</span>
                            </div>
                          </div>
                        </div>
                        <div className="opp-footer">
                          <button className="btn-refer" onClick={() => setLocation(dev.canonicalRoute)}>
                            View property
                          </button>
                          <button className="btn-details" onClick={() => revealAndScrollToForm(dev.id)}>
                            Ask how to refer this property
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Partner access CTA */}
                  <div className="relative rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-slate-50 flex flex-col justify-center items-center text-center p-8 hover:border-primary/40 hover:shadow-md transition-all">
                    <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground mb-4 shadow-md">
                      <Unlock className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-2">Join the referral network</h3>
                    <p className="text-sm text-slate-600 max-w-[200px] mb-6">
                      After you join, we’ll show which opportunities you can refer someone to.
                    </p>
                    <Button
                      variant="conversion"
                      className="w-full font-bold"
                      onClick={() => revealAndScrollToForm()}
                    >
                      Apply to Join
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* GUIDED REFERRAL JOURNEY */}
          <section id="how-it-works" className="scroll-mt-24 bg-slate-50 py-16 md:py-24">
            <div className="container">
              <div className="mx-auto mb-14 max-w-3xl text-center">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
                  A Guided Referral Journey
                </div>
                <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl mb-4">
                  Explore first. Introduce when they are ready.
                </h2>
                <p className="text-lg text-slate-600">
                  Agents and individuals can see public options before applying for access to make
                  and follow a referral.
                </p>
              </div>

              <div className="mx-auto max-w-5xl">
                <div className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-12">
                  {/* Timeline connector (hidden on mobile) */}
                  <div className="hidden lg:block absolute top-8 left-[12%] right-[12%] h-[2px] bg-slate-200 border-t-2 border-dashed border-slate-300 z-0"></div>

                  <div className="relative z-10 text-center px-4">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white border-[6px] border-slate-100 shadow-sm text-primary font-black text-xl">
                      1
                    </div>
                    <h3 className="mb-2 text-base font-bold text-slate-900">Explore options</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Browse current public buying and rental options by area, listed price, and
                      home type before creating an account.
                    </p>
                  </div>

                  <div className="relative z-10 text-center px-4">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white border-[6px] border-slate-100 shadow-sm text-primary font-black text-xl">
                      2
                    </div>
                    <h3 className="mb-2 text-base font-bold text-slate-900">Get partner access</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Agents and individuals can apply when they are ready to make referrals. Access
                      is checked for each opportunity.
                    </p>
                  </div>

                  <div className="relative z-10 text-center px-4">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary border-[6px] border-primary/10 shadow-md text-primary-foreground font-black text-xl">
                      3
                    </div>
                    <h3 className="mb-2 text-base font-bold text-slate-900">Introduce with permission</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      If they want to continue, we guide you through their permission and the
                      information needed before you share their details.
                    </p>
                  </div>

                  <div className="relative z-10 text-center px-4">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white border-[6px] border-emerald-100 shadow-sm text-emerald-600 font-black text-xl">
                      4
                    </div>
                    <h3 className="mb-2 text-base font-bold text-slate-900">Follow progress and payout</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      See recorded updates, the next confirmed action, and the referral payout
                      conditions for that opportunity.
                    </p>
                  </div>
                </div>

                {/* Pipeline Box */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm">
                  <div className="flex-1">
                    <p className="text-slate-600 text-sm md:text-base">
                      The deal page shows recorded updates. The process and milestones can differ
                      by opportunity, and a viewing appears only after it is booked.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 md:max-w-md justify-center md:justify-end">
                    <span className="px-3 py-1.5 bg-slate-900 text-white rounded-full text-xs font-semibold">
                      Explore options
                    </span>
                    <span className="px-3 py-1.5 bg-slate-900 text-white rounded-full text-xs font-semibold">
                      Choose an opportunity
                    </span>
                    <span className="px-3 py-1.5 bg-slate-900 text-white rounded-full text-xs font-semibold">
                      Introduce with permission
                    </span>
                    <span className="px-3 py-1.5 bg-white border border-slate-300 text-slate-600 rounded-full text-xs font-medium">
                      Track progress and payout
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* PROGRAM TERMS */}
          <section
            id="referral-payouts"
            className="scroll-mt-24 py-16 md:py-24 bg-white border-t border-slate-200/60"
          >
            <div className="container">
              <div className="mx-auto mb-14 max-w-3xl text-center">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
                  Referral conditions
                </div>
                <h2 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">
                  Each development has its own rules.
                </h2>
                <p className="text-lg text-slate-600">
                  Eligibility, required steps, referral payout terms, and payment milestones can vary by
                  developer. Review the terms for an opportunity before making an introduction.
                </p>
              </div>

              <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3 mb-10">
                <Card className="border-slate-200 bg-white shadow-sm hover:border-blue-200 transition-colors">
                  <CardContent className="p-6 sm:p-8">
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-primary">
                      Referral payout terms
                    </p>
                    <h3 className="mb-3 text-lg font-bold text-slate-900">
                      Set for each opportunity
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Whether a referral payout applies and how it is calculated are defined by the
                      participating opportunity. A referral payout is available only when its terms
                      say it applies.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white shadow-sm hover:border-blue-200 transition-colors">
                  <CardContent className="p-6 sm:p-8">
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-primary">
                      Required steps
                    </p>
                    <h3 className="mb-3 text-lg font-bold text-slate-900">
                      Milestones and documents
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Opportunities can have different document requirements and payout milestones.
                      The workspace shows the steps and conditions for each one.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white shadow-sm hover:border-blue-200 transition-colors">
                  <CardContent className="p-6 sm:p-8">
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-primary">
                      Progress
                    </p>
                    <h3 className="mb-3 text-lg font-bold text-slate-900">Track the referral</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Follow the current stage, manager activity, documents, and recorded outcome
                      from the referral workspace.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center sm:p-12">
                <h3 className="mb-3 text-2xl font-bold text-slate-900">No universal payout rate</h3>
                <p className="mx-auto max-w-3xl text-base text-slate-600">
                  Each opportunity's terms determine whether a referral is eligible for a
                  referral payout, how it is calculated, and which milestone applies.
                  Check those terms before you submit.
                </p>
              </div>
            </div>
          </section>

          {/* NETWORK MODEL */}
          <section className="bg-slate-50 border-t border-slate-200 py-16">
            <div className="container">
              <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-6">
                <div className="w-full max-w-xs rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <div className="text-xl font-black text-slate-900 mb-2">Developer inventory</div>
                  <div className="text-sm text-slate-600 font-medium tracking-wide">
                    Published by participating developers
                  </div>
                </div>
                <div className="w-full max-w-xs rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <div className="text-xl font-black text-slate-900 mb-2">Property introductions</div>
                  <div className="text-sm text-slate-600 font-medium tracking-wide">
                    Submitted by approved partners
                  </div>
                </div>
                <div className="w-full max-w-xs rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <div className="text-xl font-black text-slate-900 mb-2">Deal progress</div>
                  <div className="text-sm text-slate-600 font-medium tracking-wide">
                    Tasks, documents, and outcomes
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* FINAL CTA */}
          <section className="bg-slate-900 text-center py-20 px-6 relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,92,168,0.22),transparent_60%)]" />
            <div className="container relative z-10 max-w-3xl mx-auto text-center">
              <h2 className="mb-4 text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl">
                Help people find
                <br />
                the right opportunity.
              </h2>
              <p className="mb-10 text-lg text-slate-400 font-light">
                Apply to join, then review the active opportunities and terms available to
                you.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  variant="conversion"
                  className="h-14 w-full px-10 text-base font-bold sm:w-auto transition-transform hover:-translate-y-0.5"
                  onClick={() => revealAndScrollToForm()}
                >
                  Apply to Join
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 w-full border-slate-600 bg-transparent px-8 text-base text-slate-300 sm:w-auto hover:bg-slate-800 hover:text-white transition-colors"
                  onClick={() => setLocation('/book-strategy')}
                >
                  Book a Strategy Call
                </Button>
              </div>
            </div>
          </section>
        </main>
      </div>
      <MobileStickyCTA
        label="Apply to Join"
        href="/distribution-network/apply"
        isVisible={stickyVisible}
        onClick={() => revealAndScrollToForm()}
      />
    </>
  );
}
