import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Loader2, Search } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';
import { ProgramRequirementsDialog } from '@/components/distribution/partner/ProgramRequirementsDialog';
import { PropertyOpportunityShortlist } from '@/components/distribution/PropertyOpportunityShortlist';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DISTRIBUTION_BEDROOM_FILTERS,
  DISTRIBUTION_PRICE_BANDS,
  matchesDistributionOpportunity,
  type DistributionBedroomFilter,
  type DistributionMarketMode,
} from '@shared/distributionOpportunityMatching';

type PartnerModeProjection = {
  availableCount: number;
  priceFrom: number;
  priceTo: number;
  priceBasis: 'purchase_price' | 'monthly_rent';
};

function formatCurrency(value: number | null | undefined, currencyCode = 'ZAR') {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 'Price unavailable';
  return `${currencyCode === 'ZAR' ? 'R' : `${currencyCode} `}${Math.round(amount).toLocaleString('en-ZA')}`;
}

function formatModePrice(
  mode: PartnerModeProjection | undefined,
  currencyCode = 'ZAR',
  rental = false,
) {
  if (
    !mode ||
    mode.availableCount <= 0 ||
    mode.priceFrom <= 0 ||
    mode.priceTo < mode.priceFrom
  ) {
    return 'Unavailable';
  }
  const range =
    mode.priceFrom === mode.priceTo
      ? formatCurrency(mode.priceFrom, currencyCode)
      : `${formatCurrency(mode.priceFrom, currencyCode)} – ${formatCurrency(mode.priceTo, currencyCode)}`;
  return rental ? `${range} / month` : range;
}

function promotionBullets(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && Boolean(entry.trim()));
}

export default function PartnerDevelopmentsPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState('');
  const [marketMode, setMarketMode] = useState<DistributionMarketMode>('sale');
  const [priceBand, setPriceBand] = useState('any');
  const [selectedBeds, setSelectedBeds] = useState<Set<DistributionBedroomFilter>>(new Set());
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

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
    const hasPriceBand = selectedBand && selectedBand.key !== 'any';

    return allItems.filter(item => {
      const selectedMode = item.inventory?.modes?.[marketMode];
      const matchingMode = (mode: PartnerModeProjection | undefined) => Boolean(
        mode &&
          mode.availableCount > 0 &&
          mode.priceFrom > 0 &&
          mode.priceTo >= mode.priceFrom,
      );
      const candidate = {
        marketMode,
        available: matchingMode(selectedMode),
        priceFrom: selectedMode?.priceFrom ?? null,
        priceTo: selectedMode?.priceTo ?? null,
        locationText: [item.developmentName, item.city, item.province].filter(Boolean).join(' '),
        unitTypes: (item.unitTypes || []).map((unitType: any) => {
          const mode = unitType.modes?.[marketMode] as PartnerModeProjection | undefined;
          return {
            bedrooms: unitType.bedrooms,
            label: unitType.name,
            available: matchingMode(mode),
            priceFrom: mode?.priceFrom ?? null,
            priceTo: mode?.priceTo ?? null,
          };
        }),
      };

      const matchesFilters = matchesDistributionOpportunity(candidate, {
        marketMode,
        minPrice: hasPriceBand ? selectedBand?.minPrice ?? null : null,
        maxPrice: hasPriceBand ? selectedBand?.maxPrice ?? null : null,
        areaKeywords: query ? [query] : [],
        bedrooms: [...selectedBeds],
      });
      return matchesFilters;
    });
  }, [allItems, marketMode, priceBand, search, selectedBeds]);

  const toggleBedroom = (bedroom: DistributionBedroomFilter) => {
    setSelectedBeds(current => {
      const next = new Set(current);
      if (next.has(bedroom)) next.delete(bedroom);
      else next.add(bedroom);
      return next;
    });
  };

  if (loading || termsQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <ReferralAppShell>
      <main className="mx-auto w-full max-w-[1180px] px-4 pb-10 pt-6 md:px-7">
        <section className="overflow-hidden rounded-lg border border-primary/15 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-[var(--brand-blue)] via-[var(--info)] to-[var(--brand-blue-hover)] px-5 py-5 text-white md:px-6">
            <p className="text-[10px] font-semibold uppercase text-blue-100">Distribution Network</p>
            <h1 className="mt-1 text-[28px] font-semibold">Find property opportunities</h1>
            <p className="mt-2 max-w-3xl text-[13px] leading-5 text-[#ece6da]">
              Search current sale or rental options for the person you are helping. Prices and
              availability are a guide to explore, not a credit decision. Before referring, check
              that referrals are open and review the steps and referral payout.
            </p>
          </div>

          <div className="space-y-4 border-b border-primary/15 bg-primary/5 px-5 py-4 md:px-6">
            <div>
              <span className="mb-2 block text-xs font-semibold text-slate-700">Are they looking to buy or rent?</span>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Property type">
                {(['sale', 'rent'] as const).map(mode => (
                  <Button
                    key={mode}
                    type="button"
                    variant={marketMode === mode ? 'default' : 'outline'}
                    aria-pressed={marketMode === mode}
                    onClick={() => {
                      setMarketMode(mode);
                      setPriceBand('any');
                    }}
                  >
                    {mode === 'sale' ? 'Buy' : 'Rent'}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-xs font-semibold text-slate-700">
                {marketMode === 'sale' ? 'Listed price range' : 'Monthly rent range'}
                <select
                  value={priceBand}
                  onChange={event => setPriceBand(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-primary/15 bg-white px-3 text-sm font-normal text-foreground"
                >
                  {DISTRIBUTION_PRICE_BANDS[marketMode].map(band => (
                    <option key={band.key} value={band.key}>{band.label}</option>
                  ))}
                </select>
              </label>
              <label className="relative block text-xs font-semibold text-slate-700">
                Development or area
                <Search className="pointer-events-none absolute left-3 top-[2.1rem] h-4 w-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="For example, Sandton or a development name"
                  className="mt-1 h-10 w-full rounded-md border border-primary/15 bg-white pl-9 pr-3 text-sm font-normal text-foreground placeholder:text-muted-foreground"
                />
              </label>
            </div>

            <fieldset>
              <legend className="mb-2 text-xs font-semibold text-slate-700">Bedrooms</legend>
              <div className="flex flex-wrap gap-2">
                {DISTRIBUTION_BEDROOM_FILTERS.map(bedroom => {
                  const active = selectedBeds.has(bedroom.key);
                  return (
                    <Button
                      key={bedroom.label}
                      type="button"
                      variant={active ? 'default' : 'outline'}
                      aria-pressed={active}
                      onClick={() => toggleBedroom(bedroom.key)}
                    >
                      {bedroom.label}
                    </Button>
                  );
                })}
              </div>
            </fieldset>
            <p className="text-xs text-muted-foreground">
              Showing {filteredItems.length} current {marketMode === 'sale' ? 'purchase' : 'rental'} option{filteredItems.length === 1 ? '' : 's'} available to your account.
            </p>
            {filteredItems.length ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/15 bg-white p-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Share the options you found</p>
                  <p className="mt-1 text-xs text-muted-foreground">Print a shortlist or save it as a PDF to discuss with the person you’re helping.</p>
                </div>
                <PropertyOpportunityShortlist
                  marketMode={marketMode}
                  searchSummary={[
                    marketMode === 'sale' ? 'Looking to buy' : 'Looking to rent',
                    priceBand !== 'any'
                      ? DISTRIBUTION_PRICE_BANDS[marketMode].find(band => band.key === priceBand)?.label
                      : 'Any listed price',
                    search.trim() ? `Area or development: ${search.trim()}` : 'Any area',
                    selectedBeds.size
                      ? [...selectedBeds].map(key => DISTRIBUTION_BEDROOM_FILTERS.find(option => option.key === key)?.label).filter(Boolean).join(', ')
                      : 'Any bedroom count',
                  ].filter(Boolean).join(' · ')}
                  opportunities={filteredItems.map(item => {
                    const mode = item.inventory?.modes?.[marketMode];
                    const currencyCode = item.program.currencyCode || 'ZAR';
                    return {
                      id: item.developmentId,
                      name: item.developmentName,
                      location: [item.city, item.province].filter(Boolean).join(', '),
                      imageUrl: item.imageUrl,
                      priceLabel: formatModePrice(mode, currencyCode, marketMode === 'rent'),
                      availabilityLabel: mode
                        ? `${mode.availableCount} ${marketMode === 'sale' ? 'homes' : 'rentals'} currently listed`
                        : 'No current availability for this option',
                      propertyDetails: (item.unitTypes || [])
                        .filter((unitType: any) => Boolean(unitType.modes?.[marketMode]))
                        .map((unitType: any) => {
                          const unitMode = unitType.modes[marketMode] as PartnerModeProjection;
                          return `${unitType.name}${unitType.bedrooms === null ? '' : ` · ${unitType.bedrooms} bed${unitType.bedrooms === 1 ? '' : 's'}`} · ${formatModePrice(unitMode, currencyCode, marketMode === 'rent')}`;
                        }),
                      description: item.campaign.description || item.campaign.tagline,
                    };
                  })}
                />
              </div>
            ) : null}
          </div>

          {termsQuery.error ? (
            <div className="p-6 text-sm text-red-700" role="alert">
              Partner opportunities could not be loaded. Refresh and try again.
            </div>
          ) : filteredItems.length ? (
            <div className="grid gap-4 p-5 md:grid-cols-2 md:p-6">
              {filteredItems.map(item => {
                const bullets = promotionBullets(item.programPromotion.highlightBullets);
                const saleMode = item.inventory?.modes?.sale;
                const rentMode = item.inventory?.modes?.rent;
                const canSubmitSale = Boolean(
                  item.opportunity.openForReferral &&
                    saleMode &&
                    saleMode.availableCount > 0 &&
                    saleMode.priceFrom > 0 &&
                    saleMode.priceTo >= saleMode.priceFrom,
                );
                const canSubmitRent = Boolean(
                  item.opportunity.openForReferral &&
                    rentMode &&
                    rentMode.availableCount > 0 &&
                    rentMode.priceFrom > 0 &&
                    rentMode.priceTo >= rentMode.priceFrom,
                );
                const currencyCode = item.program.currencyCode || 'ZAR';
                const unitTypes = (item.unitTypes || []).filter((unitType: any) =>
                  Boolean(unitType.modes?.sale || unitType.modes?.rent),
                );
                const contacts = Array.isArray(item.contacts) ? item.contacts : [];

                return (
                  <Card key={item.developmentId} className="border-primary/15 shadow-sm">
                    <CardHeader className="space-y-3 pb-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge variant="secondary">Available to explore</Badge>
                        <Badge variant={item.opportunity.openForReferral ? 'default' : 'outline'}>
                          {item.opportunity.openForReferral ? 'Accepting referrals' : 'Referrals temporarily paused'}
                        </Badge>
                      </div>
                      <div>
                        <CardTitle className="text-lg">{item.developmentName}</CardTitle>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {[item.city, item.province].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.developmentName}
                          className="h-44 w-full rounded-md object-cover"
                        />
                      ) : null}
                      {item.campaign.tagline ? (
                        <p className="text-sm font-medium text-slate-800">{item.campaign.tagline}</p>
                      ) : null}
                      {item.campaign.description ? (
                        <p className="text-sm leading-6 text-slate-600">
                          {item.campaign.description}
                        </p>
                      ) : null}

                      <div className="rounded-md border border-blue-100 bg-blue-50/70 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-800">
                          About this referral opportunity
                        </p>
                        {item.programPromotion.headline ? (
                          <p className="mt-1 font-semibold text-slate-900">
                            {item.programPromotion.headline}
                          </p>
                        ) : null}
                        {item.programPromotion.description ? (
                          <p className="mt-1 text-sm text-slate-700">
                            {item.programPromotion.description}
                          </p>
                        ) : null}
                        {bullets.length ? (
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                            {bullets.map((bullet, index) => (
                              <li key={`${item.developmentId}-${index}`}>{bullet}</li>
                            ))}
                          </ul>
                        ) : null}
                        {!item.programPromotion.headline &&
                        !item.programPromotion.description &&
                        !bullets.length ? (
                          <p className="mt-1 text-sm text-slate-500">
                            No extra referral information has been added.
                          </p>
                        ) : null}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="rounded-md border p-3">
                          <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                            Sale availability
                          </p>
                          <p className="mt-1 text-sm font-semibold">
                            {saleMode
                              ? `${saleMode.availableCount} available · ${formatModePrice(saleMode, currencyCode)}`
                              : 'No current sale availability'}
                          </p>
                        </div>
                        <div className="rounded-md border p-3">
                          <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                            Rental availability
                          </p>
                          <p className="mt-1 text-sm font-semibold">
                            {rentMode
                              ? `${rentMode.availableCount} available · ${formatModePrice(rentMode, currencyCode, true)}`
                              : 'No current rental availability'}
                          </p>
                        </div>
                        <div className="rounded-md border p-3">
                          <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                            Referral payout
                          </p>
                          <p className="mt-1 text-sm font-semibold">
                            {item.computed.commissionDisplay || 'Payout terms configured'}
                          </p>
                          {item.computed.payoutDisplay ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {item.computed.payoutDisplay}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {unitTypes.length ? (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Home types and current prices
                          </p>
                          {unitTypes.map((unitType: any) => (
                            <div key={unitType.id} className="rounded-md border p-3 text-sm">
                              <p className="font-semibold text-slate-900">{unitType.name}</p>
                              <div className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                                <p>
                                  Sale:{' '}
                                  {unitType.modes.sale
                                    ? `${unitType.modes.sale.availableCount} · ${formatModePrice(unitType.modes.sale, currencyCode)}`
                                    : 'Unavailable'}
                                </p>
                                <p>
                                  Rent:{' '}
                                  {unitType.modes.rent
                                    ? `${unitType.modes.rent.availableCount} · ${formatModePrice(unitType.modes.rent, currencyCode, true)}`
                                    : 'Unavailable'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {contacts.length ? (
                        <div className="rounded-md border p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Opportunity contact
                          </p>
                          <div className="mt-2 space-y-2">
                            {contacts.map((contact: any) => (
                              <div key={contact.id} className="text-sm">
                                <p className="font-medium text-slate-900">
                                  {contact.displayName} · {contact.roleTitle}
                                </p>
                                <p className="text-xs text-slate-600">
                                  {[
                                    contact.phaseName,
                                    contact.organizationName,
                                    contact.email,
                                    contact.phone,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <p className="text-xs leading-5 text-muted-foreground">
                        {item.opportunity.friendlyMessage}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => setSelectedItem(item)}>
                          How referring works
                        </Button>
                        <Button
                          disabled={marketMode === 'sale' ? !canSubmitSale : !canSubmitRent}
                          onClick={() => setLocation(
                            `/distribution/partner/submit?developmentId=${item.developmentId}&marketMode=${marketMode}`,
                          )}
                        >
                          Start a referral
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="font-medium text-slate-900">
                {termsQuery.data?.items?.length
                  ? `No current ${marketMode === 'sale' ? 'purchase' : 'rental'} options match these choices.`
                  : 'No property opportunities are available to your account yet.'}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {termsQuery.data?.items?.length
                  ? 'Try changing the area, price range, or bedroom filters, or switch between buying and renting.'
                  : 'Options appear here when they are open for referrals and available to your account.'}
              </p>
            </div>
          )}
        </section>
      </main>

      {selectedItem ? (
        <ProgramRequirementsDialog
          open={Boolean(selectedItem)}
          onOpenChange={open => !open && setSelectedItem(null)}
          item={selectedItem}
        />
      ) : null}
    </ReferralAppShell>
  );
}
