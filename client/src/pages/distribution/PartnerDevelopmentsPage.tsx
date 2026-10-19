import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import {
  ArrowRight,
  Bookmark,
  Building2,
  Calculator,
  Camera,
  CheckCircle2,
  CheckSquare,
  FileText,
  Info,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  Square,
} from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';
import { ProgramRequirementsDialog } from '@/components/distribution/partner/ProgramRequirementsDialog';
import { DevelopmentUnitsDialog } from '@/components/distribution/partner/DevelopmentUnitsDialog';
import { DevelopmentBrochureDialog } from '@/components/distribution/partner/DevelopmentBrochureDialog';
import { ShortlistPrintView } from '@/components/distribution/ShortlistPrintView';
import { useDistributionShortlist } from '@/components/distribution/useDistributionShortlist';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  formatDevelopmentTypeLabel,
  formatOpportunityModePrice,
  hasPublishedMode,
  type OpportunityModeProjection,
} from '@/lib/distributionOpportunityFormat';
import {
  DISTRIBUTION_BEDROOM_FILTERS,
  DISTRIBUTION_PRICE_BANDS,
  type DistributionBedroomFilter,
  type DistributionMarketMode,
} from '@shared/distributionOpportunityMatching';

type SortOption = 'recommended' | 'price_low' | 'price_high';

function bedroomFilterValue(value: string | undefined): DistributionBedroomFilter | null {
  if (!value) return null;
  if (value === 'studio' || value === '4+') return value;
  const numeric = Number(value);
  return numeric === 1 || numeric === 2 || numeric === 3 ? numeric : null;
}

function bedroomMatchesFilter(bedrooms: number | null, label: string, filter: DistributionBedroomFilter) {
  if (filter === 'studio') return bedrooms === 0 || /studio|bachelor/i.test(label);
  if (filter === '4+') return (bedrooms !== null && bedrooms >= 4) || /[4-9](\s*bed|\s*br)/i.test(label);
  return bedrooms === filter || new RegExp(`(?:^|\\D)${filter}\\s*(?:bed(?:room)?s?|br)(?:\\D|$)`, 'i').test(label);
}

export default function PartnerDevelopmentsPage() {
  const { isAuthenticated, loading, user } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState('');
  const [marketMode, setMarketMode] = useState<DistributionMarketMode>('sale');
  const [priceBand, setPriceBand] = useState('any');
  const [bedroomFilter, setBedroomFilter] = useState('');
  const [sort, setSort] = useState<SortOption>('recommended');
  const [unitsItem, setUnitsItem] = useState<any | null>(null);
  const [brochureItem, setBrochureItem] = useState<any | null>(null);
  const [requirementsItem, setRequirementsItem] = useState<any | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) setLocation('/login');
  }, [isAuthenticated, loading, setLocation]);

  const termsQuery = trpc.distribution.partner.listProgramTerms.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    refetchOnWindowFocus: true,
  });
  const allItems = termsQuery.data?.items || [];
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const selectedBand = DISTRIBUTION_PRICE_BANDS[marketMode].find(
      band => band.key === priceBand,
    );
    const hasPriceBand = Boolean(selectedBand && selectedBand.key !== 'any');
    const selectedBedrooms = bedroomFilterValue(bedroomFilter);

    return allItems.filter(item => {
      const locationText = [item.developmentName, item.city, item.province]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (query && !locationText.includes(query)) return false;

      const mode = item.inventory?.modes?.[marketMode] as OpportunityModeProjection | undefined;
      if (hasPriceBand && hasPublishedMode(mode)) {
        const highest = mode.priceTo || mode.priceFrom;
        if (typeof selectedBand?.maxPrice === 'number' && mode.priceFrom > selectedBand.maxPrice) {
          return false;
        }
        if (typeof selectedBand?.minPrice === 'number' && highest < selectedBand.minPrice) {
          return false;
        }
      }

      if (selectedBedrooms !== null) {
        const unitTypes = Array.isArray(item.unitTypes) ? item.unitTypes : [];
        const unitsWithMode = unitTypes.filter((unitType: any) =>
          hasPublishedMode(unitType?.modes?.[marketMode]),
        );
        if (unitsWithMode.length) {
          return unitsWithMode.some((unitType: any) =>
            bedroomMatchesFilter(unitType.bedrooms ?? null, String(unitType.name || ''), selectedBedrooms),
          );
        }
      }

      return true;
    });
  }, [allItems, marketMode, priceBand, search, bedroomFilter]);
  const sortedItems = useMemo(() => {
    if (sort === 'recommended') return filteredItems;
    const priceOf = (item: any) => {
      const mode = item.inventory?.modes?.[marketMode] as OpportunityModeProjection | undefined;
      return hasPublishedMode(mode) ? mode.priceFrom : null;
    };
    return [...filteredItems].sort((a, b) => {
      const priceA = priceOf(a);
      const priceB = priceOf(b);
      if (priceA === null && priceB === null) return 0;
      if (priceA === null) return 1;
      if (priceB === null) return -1;
      return sort === 'price_low' ? priceA - priceB : priceB - priceA;
    });
  }, [filteredItems, marketMode, sort]);

  const shortlistOptions = useMemo(
    () =>
      allItems.map((item: any) => {
        const mode = item.inventory?.modes?.[marketMode] as OpportunityModeProjection | undefined;
        const modeIsPublished = hasPublishedMode(mode);
        const currencyCode = item.program?.currencyCode || 'ZAR';
        return {
          id: item.developmentId,
          marketable: modeIsPublished,
          name: item.developmentName,
          location: [item.city, item.province].filter(Boolean).join(', '),
          imageUrl: item.imageUrl,
          priceLabel: modeIsPublished
            ? formatOpportunityModePrice(mode, currencyCode, marketMode === 'rent')
            : 'Price not yet published',
          availabilityLabel: modeIsPublished
            ? `${mode.availableCount} ${marketMode === 'sale' ? 'homes' : 'rentals'} currently listed`
            : 'Availability not yet published',
          propertyDetails: (item.unitTypes || [])
            .filter((unitType: any) => hasPublishedMode(unitType?.modes?.[marketMode]))
            .map((unitType: any) => {
              const unitMode = unitType.modes[marketMode] as OpportunityModeProjection;
              return `${unitType.name}${unitType.bedrooms === null || unitType.bedrooms === undefined ? '' : ` · ${unitType.bedrooms} bed${unitType.bedrooms === 1 ? '' : 's'}`} · ${formatOpportunityModePrice(unitMode, currencyCode, marketMode === 'rent')}`;
            }),
          description: item.campaign?.description || item.campaign?.tagline || null,
        };
      }),
    [allItems, marketMode],
  );
  const {
    maxOptions,
    selectedOptions,
    selectedIds,
    toggleOption,
    publicSelectionCount,
    importMessage,
    importPublicShortlist,
  } = useDistributionShortlist({
    marketMode,
    searchSummary: [
      marketMode === 'sale' ? 'Looking to buy' : 'Looking to rent',
      priceBand !== 'any'
        ? DISTRIBUTION_PRICE_BANDS[marketMode].find(band => band.key === priceBand)?.label
        : 'Any listed price',
      search.trim() ? `Area or development: ${search.trim()}` : 'Any area',
      bedroomFilter
        ? DISTRIBUTION_BEDROOM_FILTERS.find(option => String(option.key) === bedroomFilter)?.label
        : 'Any bedroom count',
    ].filter(Boolean).join(' · '),
    storageScope: `partner:${user?.id ?? 'unknown'}`,
    currentOpportunities: shortlistOptions,
  });
  const shortlistById = new Map(shortlistOptions.map(option => [String(option.id), option]));

  const scrollToCheckFit = () => {
    document.getElementById('check-fit')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const startReferral = (item: any) => {
    setUnitsItem(null);
    setBrochureItem(null);
    setLocation(
      `/distribution/partner/submit?developmentId=${item.developmentId}&marketMode=${marketMode}`,
    );
  };

  if (loading || termsQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ReferralAppShell>
      <main className="mx-auto w-full max-w-[1180px] space-y-6 px-4 pb-10 pt-7 md:px-7">
        <section>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#cfe0f8] bg-[#eff5fe] px-3 py-1 text-[12px] font-medium text-[#1d6fe3]">
            <Search className="h-3.5 w-3.5" /> Find opportunities
          </span>
          <h1 className="mt-3 text-[30px] font-bold leading-tight tracking-[-0.02em] text-[#0b1c3f]">
            Find the right property for someone you know
          </h1>
          <p className="mt-2 max-w-3xl text-[15px] leading-6 text-muted-foreground">
            Explore current sale or rental options first. Check fit, compare real opportunities, and
            build a shortlist before making an introduction.
          </p>
        </section>

        <section className="rounded-xl border border-border bg-white p-5 shadow-sm md:p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[auto_1.2fr_1fr_1fr_auto] xl:items-end">
            <div>
              <span className="mb-2 block text-[12px] font-medium text-muted-foreground">
                Buy / Rent
              </span>
              <div
                className="inline-grid h-10 grid-cols-2 items-center rounded-lg border border-border bg-surface p-1"
                role="group"
                aria-label="Buy or rent"
              >
                {(['sale', 'rent'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={marketMode === mode}
                    onClick={() => {
                      setMarketMode(mode);
                      setPriceBand('any');
                    }}
                    className={cn(
                      'h-8 rounded-md px-5 text-[13px] transition',
                      marketMode === mode
                        ? 'bg-[#1d6fe3] font-semibold text-white shadow-sm'
                        : 'font-medium text-muted-foreground hover:text-[#0b1c3f]',
                    )}
                  >
                    {mode === 'sale' ? 'Buy' : 'Rent'}
                  </button>
                ))}
              </div>
            </div>

            <label className="relative block text-[12px] font-medium text-muted-foreground">
              Location or development
              <Search className="pointer-events-none absolute left-3 top-[2.35rem] h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search by area, suburb or development"
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-sm font-normal text-foreground placeholder:text-muted-foreground"
              />
            </label>

            <label className="block text-[12px] font-medium text-muted-foreground">
              Price range
              <select
                value={priceBand}
                onChange={event => setPriceBand(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-white px-3 text-sm font-normal text-foreground"
              >
                {DISTRIBUTION_PRICE_BANDS[marketMode].map(band => (
                  <option key={band.key} value={band.key}>{band.label}</option>
                ))}
              </select>
            </label>

            <label className="block text-[12px] font-medium text-muted-foreground">
              Bedrooms
              <select
                value={bedroomFilter}
                onChange={event => setBedroomFilter(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-white px-3 text-sm font-normal text-foreground"
              >
                <option value="">Any</option>
                {DISTRIBUTION_BEDROOM_FILTERS.map(option => (
                  <option key={option.label} value={String(option.key)}>{option.label}</option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={scrollToCheckFit}
              className="inline-flex h-10 items-center gap-2 rounded-lg px-2 text-[13px] font-medium text-[#1d6fe3] transition hover:text-[#0b1c3f]"
            >
              <Calculator className="h-4 w-4" /> Check fit (optional)
            </button>
          </div>
        </section>

        <section className="grid gap-4 rounded-xl border border-[#cfe0f8] bg-[#eff5fe] p-5 text-[12.5px] leading-5 text-[#33507e] md:grid-cols-2 md:p-6">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#1d6fe3]" />
            <p>
              <span className="font-semibold text-[#0b1c3f]">Browse first — no prospect details needed.</span>{' '}
              Explore the properties available to your account before sharing anyone's personal
              details.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1d6fe3]" />
            <p>
              <span className="font-semibold text-[#0b1c3f]">Availability and referral eligibility are checked separately.</span>{' '}
              Some developments may be visible but not yet open for referral with your partner
              access.
            </p>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] font-semibold text-[#0b1c3f]">
            Showing {sortedItems.length} opportunit{sortedItems.length === 1 ? 'y' : 'ies'}
          </p>
          <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
            Sort by
            <select
              value={sort}
              onChange={event => setSort(event.target.value as SortOption)}
              className="h-9 rounded-lg border border-border bg-white px-3 text-sm font-normal text-foreground"
            >
              <option value="recommended">Recommended</option>
              <option value="price_low">Price: low to high</option>
              <option value="price_high">Price: high to low</option>
            </select>
          </label>
        </div>

        {termsQuery.error ? (
          <div
            className="rounded-xl border border-[#f5d9a8] bg-[#fffbf2] p-5 text-sm text-[#b07a1e] shadow-sm"
            role="alert"
          >
            Partner opportunities could not be loaded. Refresh and try again.
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div>
              {sortedItems.length ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {sortedItems.map((item: any) => {
                    const mode = item.inventory?.modes?.[marketMode] as
                      | OpportunityModeProjection
                      | undefined;
                    const modeIsPublished = hasPublishedMode(mode);
                    const currencyCode = item.program?.currencyCode || 'ZAR';
                    const openForReferral = Boolean(item.opportunity?.openForReferral);
                    const developmentType = formatDevelopmentTypeLabel(
                      item.campaign?.developmentType,
                    );
                    const imageCount = Array.isArray(item.campaign?.images)
                      ? item.campaign.images.length
                      : 0;
                    const shortlistOption = shortlistById.get(String(item.developmentId));
                    const shortlisted = selectedIds.has(String(item.developmentId));
                    const description = item.campaign?.description || item.campaign?.tagline;

                    return (
                      <article
                        key={item.developmentId}
                        className="flex flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm"
                      >
                        <div className="relative">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.developmentName}
                              className="h-40 w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-40 w-full items-center justify-center bg-[#eef4fc]">
                              <Building2 className="h-8 w-8 text-[#9cc0ee]" />
                            </div>
                          )}
                          <span
                            className={cn(
                              'absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium',
                              modeIsPublished
                                ? 'border-[#cde9d2] bg-[#f5fcf6] text-[#2f8f4e]'
                                : 'border-border bg-white/95 text-muted-foreground',
                            )}
                          >
                            {modeIsPublished ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <Info className="h-3 w-3" />
                            )}
                            {modeIsPublished ? 'Available to explore' : 'Awaiting availability'}
                          </span>
                          {imageCount > 1 ? (
                            <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
                              <Camera className="h-3 w-3" /> {imageCount}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex flex-1 flex-col p-4">
                          <h2 className="text-[16px] font-semibold leading-snug text-[#0b1c3f]">
                            {item.developmentName}
                          </h2>
                          <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            {[item.city, item.province].filter(Boolean).join(', ') ||
                              'Location to be confirmed'}
                          </p>

                          {developmentType || modeIsPublished ? (
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-[12.5px] text-muted-foreground">
                              {developmentType ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <Building2 className="h-3.5 w-3.5" /> {developmentType}
                                </span>
                              ) : null}
                              {modeIsPublished ? (
                                <span>
                                  {mode.availableCount}{' '}
                                  {marketMode === 'sale' ? 'home' : 'rental'}
                                  {mode.availableCount === 1 ? '' : 's'} available
                                </span>
                              ) : null}
                            </div>
                          ) : null}

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <p
                              className={cn(
                                'text-[17px] font-bold text-[#0b1c3f]',
                                !modeIsPublished && 'text-[13px] font-medium text-muted-foreground',
                              )}
                            >
                              {modeIsPublished
                                ? formatOpportunityModePrice(mode, currencyCode, marketMode === 'rent')
                                : 'Current price not yet published'}
                            </p>
                            {modeIsPublished ? (
                              <span className="rounded-full border border-[#cfe0f8] bg-[#eff5fe] px-2 py-0.5 text-[11px] font-medium text-[#33507e]">
                                {marketMode === 'sale' ? 'Sale' : 'Rent'}
                              </span>
                            ) : null}
                          </div>

                          {description ? (
                            <p className="mt-2 line-clamp-3 text-[13px] leading-5 text-muted-foreground">
                              {description}
                            </p>
                          ) : null}

                          <p
                            className={cn(
                              'mt-3 flex items-start gap-1.5 text-[12px] leading-5',
                              openForReferral ? 'text-[#2f8f4e]' : 'text-muted-foreground',
                            )}
                            title={item.opportunity?.friendlyMessage || undefined}
                          >
                            {openForReferral ? (
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            ) : (
                              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            )}
                            {openForReferral
                              ? 'Open for referral'
                              : 'Referral access: check programme'}
                          </p>

                          <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-3">
                            <button
                              type="button"
                              disabled={!shortlistOption?.marketable}
                              aria-pressed={shortlisted}
                              onClick={() => shortlistOption && toggleOption(shortlistOption)}
                              className={cn(
                                'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium transition',
                                shortlisted
                                  ? 'border-[#1d6fe3] bg-[#eff5fe] text-[#1d6fe3]'
                                  : 'border-border bg-white text-slate-600 hover:border-[#9cc0ee] hover:text-[#1d6fe3]',
                                !shortlistOption?.marketable && 'cursor-not-allowed opacity-60',
                              )}
                            >
                              {shortlisted ? (
                                <CheckSquare className="h-4 w-4" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                              {shortlisted ? 'In shortlist' : 'Add to shortlist'}
                            </button>
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={() => setUnitsItem(item)}
                            >
                              View details <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setBrochureItem(item)}
                            >
                              <FileText className="mr-2 h-4 w-4" /> Brochure
                            </Button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-white p-8 text-center shadow-sm">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e7f0fd] text-[#1d6fe3]">
                    <Search className="h-5 w-5" />
                  </span>
                  <h2 className="mt-3 text-lg font-semibold text-[#0b1c3f]">
                    {allItems.length
                      ? 'No developments match these choices.'
                      : 'No property opportunities are available to your account yet.'}
                  </h2>
                  <p className="mx-auto mt-2 max-w-lg text-[13.5px] leading-5 text-muted-foreground">
                    {allItems.length
                      ? 'Try changing the area, price range, or bedroom filters, or switch between buying and renting.'
                      : 'Options appear here when they are open for referrals and available to your account.'}
                  </p>
                  {!allItems.length ? (
                    <Button
                      className="mt-4"
                      variant="outline"
                      onClick={() => setLocation('/distribution-network')}
                    >
                      Explore public opportunities
                    </Button>
                  ) : null}
                </div>
              )}
            </div>

            <aside id="check-fit" className="h-fit rounded-xl border border-border bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e7f0fd] text-[#1d6fe3]">
                  <Calculator className="h-4 w-4" />
                </span>
                <p className="text-[14px] font-semibold text-[#0b1c3f]">Check fit (optional)</p>
              </div>
              <p className="mt-2 text-[12.5px] leading-5 text-muted-foreground">
                Get a preliminary estimate to see what might be within reach. This is not a lender
                decision.
              </p>
              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="text-[12px] font-medium text-muted-foreground">Monthly income</span>
                  <input
                    type="text"
                    disabled
                    placeholder="e.g. R 25,000"
                    aria-label="Monthly income"
                    className="mt-1.5 h-10 w-full cursor-not-allowed rounded-lg border border-border bg-surface px-3 text-sm text-muted-foreground"
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] font-medium text-muted-foreground">Deposit (optional)</span>
                  <input
                    type="text"
                    disabled
                    placeholder="e.g. R 100,000"
                    aria-label="Deposit"
                    className="mt-1.5 h-10 w-full cursor-not-allowed rounded-lg border border-border bg-surface px-3 text-sm text-muted-foreground"
                  />
                </label>
                <div>
                  <span className="text-[12px] font-medium text-muted-foreground">Looking to</span>
                  <div className="mt-1.5 grid h-10 grid-cols-2 items-center rounded-lg border border-border bg-surface p-1">
                    <button
                      type="button"
                      disabled
                      className="cursor-not-allowed rounded-md bg-white text-[13px] font-semibold text-[#0b1c3f] shadow-sm"
                    >
                      Buy
                    </button>
                    <button
                      type="button"
                      disabled
                      className="cursor-not-allowed text-[13px] font-medium text-muted-foreground"
                    >
                      Rent
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#cfe0f8] bg-[#eff5fe] p-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#1d6fe3]" />
                <p className="text-[12px] leading-5 text-[#33507e]">
                  Preliminary affordability is not active yet. Browse by listed price, area, and
                  bedrooms while the approved assessment model is pending. This is not a lender
                  decision.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full border-[#9cc0ee] text-[#1d6fe3]"
                onClick={() => setLocation('/distribution/partner/how-it-works')}
              >
                Learn more
              </Button>
            </aside>
          </div>
        )}

        <section className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-white p-4 shadow-sm md:px-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e7f0fd] text-[#1d6fe3]">
            <Bookmark className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-[#0b1c3f]">
              Your shortlist{' '}
              <span className="font-normal text-muted-foreground">
                · {selectedOptions.length} of {maxOptions} selected
              </span>
            </p>
            <p className="mt-0.5 text-[12.5px] leading-5 text-muted-foreground">
              Save or export options to discuss before sharing anyone's details. The shortlist is
              for discussion — it is not a credit decision or a saved referral.
            </p>
            {publicSelectionCount > 0 ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="text-[12px] text-muted-foreground">
                  You have {publicSelectionCount} option{publicSelectionCount === 1 ? '' : 's'} in
                  your public shortlist for this search.
                </p>
                <Button type="button" variant="outline" size="sm" onClick={importPublicShortlist}>
                  Continue with public shortlist
                </Button>
              </div>
            ) : null}
            {importMessage ? (
              <p role="status" className="mt-1 text-[12px] text-muted-foreground">{importMessage}</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!selectedOptions.length}
            onClick={() => window.print()}
          >
            Create shareable shortlist
          </Button>
        </section>
      </main>

      {unitsItem ? (
        <DevelopmentUnitsDialog
          open={Boolean(unitsItem)}
          onOpenChange={open => !open && setUnitsItem(null)}
          item={unitsItem}
          marketMode={marketMode}
          onStartReferral={() => startReferral(unitsItem)}
          onOpenHowReferring={() => {
            setRequirementsItem(unitsItem);
            setUnitsItem(null);
          }}
          onOpenBrochure={() => {
            setBrochureItem(unitsItem);
            setUnitsItem(null);
          }}
        />
      ) : null}

      {brochureItem ? (
        <DevelopmentBrochureDialog
          open={Boolean(brochureItem)}
          onOpenChange={open => !open && setBrochureItem(null)}
          item={brochureItem}
          canStartReferral={Boolean(brochureItem.opportunity?.openForReferral)}
          onStartReferral={() => startReferral(brochureItem)}
        />
      ) : null}

      {requirementsItem ? (
        <ProgramRequirementsDialog
          open={Boolean(requirementsItem)}
          onOpenChange={open => !open && setRequirementsItem(null)}
          developmentId={Number(requirementsItem.developmentId)}
          referralProcessAvailable={Boolean(requirementsItem.opportunity?.openForReferral)}
          item={requirementsItem}
        />
      ) : null}

      <ShortlistPrintView marketMode={marketMode} selectedOptions={selectedOptions} />
    </ReferralAppShell>
  );
}
