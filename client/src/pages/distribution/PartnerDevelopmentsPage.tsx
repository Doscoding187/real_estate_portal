import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Loader2, Search } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';
import { ProgramRequirementsDialog } from '@/components/distribution/partner/ProgramRequirementsDialog';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const VIEW_MODE_SUBMIT = 'submit';
const VIEW_MODE_EXPLORE = 'explore';

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
  const [viewMode, setViewMode] = useState<typeof VIEW_MODE_SUBMIT | typeof VIEW_MODE_EXPLORE>(
    VIEW_MODE_SUBMIT,
  );
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) setLocation('/login');
  }, [isAuthenticated, loading, setLocation]);

  const termsQuery = trpc.distribution.partner.listProgramTerms.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const allItems = termsQuery.data?.items || [];
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const candidates =
      viewMode === VIEW_MODE_SUBMIT
        ? allItems.filter(
            item =>
              item.opportunity.openForReferral && item.opportunity.marketability === 'marketable',
          )
        : allItems;
    if (!query) return candidates;
    return candidates.filter(item => {
      const promotion = item.programPromotion;
      return [
        item.developmentName,
        item.campaign.tagline,
        item.campaign.description,
        promotion.headline,
        promotion.description,
        ...promotionBullets(promotion.highlightBullets),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [allItems, search, viewMode]);

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
            <h1 className="mt-1 text-[28px] font-semibold">Partner opportunities</h1>
            <p className="mt-2 max-w-3xl text-[13px] leading-5 text-[#ece6da]">
              Browse opportunities you are entitled to access. Development facts, images, contacts,
              and sale or rental availability come from the Developer Engine. Program promotion and
              referral steps are managed here.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-primary/15 bg-primary/5 px-5 py-4 md:px-6">
            <Button
              type="button"
              variant={viewMode === VIEW_MODE_SUBMIT ? 'default' : 'outline'}
              onClick={() => setViewMode(VIEW_MODE_SUBMIT)}
            >
              Ready for referral
            </Button>
            <Button
              type="button"
              variant={viewMode === VIEW_MODE_EXPLORE ? 'default' : 'outline'}
              onClick={() => setViewMode(VIEW_MODE_EXPLORE)}
            >
              Explore programs
            </Button>
          </div>

          <div className="border-b border-primary/15 px-5 py-4 md:px-6">
            <label className="relative block max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search development or program promotion"
                className="h-9 w-full rounded-md border border-primary/15 bg-white pl-9 pr-3 text-[12px] text-foreground placeholder:text-muted-foreground"
              />
            </label>
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
                        <Badge variant="secondary">Distribution program active</Badge>
                        <Badge variant={item.opportunity.openForReferral ? 'default' : 'outline'}>
                          {item.opportunity.openForReferral ? 'Open for referral' : 'Referrals paused'}
                        </Badge>
                      </div>
                      <div>
                        <CardTitle className="text-lg">{item.developmentName}</CardTitle>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {[item.city, item.province].filter(Boolean).join(', ')}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          Canonical development ID {item.developmentId}
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
                          Program promotion
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
                            No program promotion has been added.
                          </p>
                        ) : null}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-4">
                        <div className="rounded-md border p-3">
                          <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                            Developer campaign
                          </p>
                          <p className="mt-1 text-sm font-semibold">Visible</p>
                        </div>
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
                            Unit type availability
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
                            Developer contacts shared with partners
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
                          Program process and requirements
                        </Button>
                        <Button
                          disabled={!canSubmitSale}
                          onClick={() =>
                            setLocation(
                              `/distribution/partner/submit?developmentId=${item.developmentId}&marketMode=sale`,
                            )
                          }
                        >
                          Refer a buyer
                        </Button>
                        <Button
                          variant="outline"
                          disabled={!canSubmitRent}
                          onClick={() =>
                            setLocation(
                              `/distribution/partner/submit?developmentId=${item.developmentId}&marketMode=rent`,
                            )
                          }
                        >
                          Refer a renter
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
                {viewMode === VIEW_MODE_SUBMIT
                  ? 'No opportunities are ready for referral.'
                  : 'No active programs are available to this partner.'}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {viewMode === VIEW_MODE_SUBMIT
                  ? 'A referral can be submitted only for a currently marketable sale or rental mode.'
                  : 'Programs appear here only when Distribution access and partner eligibility allow them.'}
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
