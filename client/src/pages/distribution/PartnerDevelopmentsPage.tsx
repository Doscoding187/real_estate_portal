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

function formatCurrency(value: number | null | undefined, currencyCode = 'ZAR') {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 'Not configured';
  return `${currencyCode === 'ZAR' ? 'R' : `${currencyCode} `}${Math.round(amount).toLocaleString('en-ZA')}`;
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
    const visibleItems =
      viewMode === VIEW_MODE_SUBMIT
        ? allItems.filter(
            item => item.opportunity.openForReferral && item.referralModes.length > 0,
          )
        : allItems;
    if (!query) return visibleItems;
    return visibleItems.filter(item => {
      return [
        item.developmentName,
        item.campaign.tagline,
        item.description,
        item.city,
        item.province,
        ...item.teamContacts.map((contact: { displayName: string; roleTitle: string }) =>
          `${contact.displayName} ${contact.roleTitle}`,
        ),
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
              Distribution program access and referral rules are managed here. Development facts,
              images, prices, availability, contacts, and shared resources come from the Developer Engine.
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
                placeholder="Search development, phase, contact, or location"
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
                const canSubmit = item.opportunity.openForReferral && item.referralModes.length > 0;
                const inventoryRows = [
                  ['For sale', item.pricingByMode.sale, 'purchase price', item.referralModes.includes('sale')],
                  ['For rent', item.pricingByMode.rent, 'monthly rent', item.referralModes.includes('rent')],
                ] as const;
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
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-md border border-blue-100 bg-blue-50/70 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-800">
                          Development campaign
                        </p>
                        {item.campaign.tagline ? (
                          <p className="mt-1 font-semibold text-slate-900">{item.campaign.tagline}</p>
                        ) : null}
                        {item.description ? (
                          <p className="mt-1 text-sm text-slate-700">{item.description}</p>
                        ) : null}
                        {!item.campaign.tagline && !item.description ? (
                          <p className="mt-1 text-sm text-slate-500">
                            No campaign description has been added.
                          </p>
                        ) : null}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="rounded-md border p-3">
                          <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                            Current release
                          </p>
                          <p className="mt-1 text-sm font-semibold">
                            {item.phases.length
                              ? item.phases.map((phase: { name: string }) => phase.name).join(', ')
                              : item.phaseScope === 'development-wide'
                                ? 'Development-wide stock'
                                : 'No released phase'}
                          </p>
                        </div>
                        <div className="rounded-md border p-3">
                          <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                            Marketable inventory
                          </p>
                          <div className="mt-1 space-y-1">
                            {inventoryRows.map(([label, mode, basis, referralEligible]) => (
                              <p key={label} className="text-sm">
                                <span className="font-semibold">{label}: </span>
                                {mode
                                  ? `${mode.availableCount} available · ${formatCurrency(mode.priceFrom)}${mode.priceTo > mode.priceFrom ? `–${formatCurrency(mode.priceTo)}` : ''} ${basis === 'monthly rent' ? 'per month' : ''}${referralEligible ? '' : ' · referrals not configured'}`
                                  : 'Not currently available'}
                              </p>
                            ))}
                            <p className="text-[11px] text-muted-foreground">
                              Availability checked {new Date(item.campaign.observedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="rounded-md border p-3">
                          <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                            Referral payout
                          </p>
                          <p className="mt-1 text-sm font-semibold">
                            {item.computed.commissionDisplay || formatCurrency(null)}
                          </p>
                        </div>
                      </div>

                      {item.teamContacts.length ? (
                        <div className="rounded-md border p-3">
                          <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                            Development contacts
                          </p>
                          <ul className="mt-2 space-y-2">
                            {item.teamContacts.slice(0, 3).map((contact: {
                              id: number;
                              displayName: string;
                              roleTitle: string;
                              phaseName: string | null;
                              phone: string | null;
                              email: string | null;
                            }) => (
                              <li key={contact.id} className="text-sm">
                                <span className="font-medium">{contact.roleTitle}: {contact.displayName}</span>
                                {contact.phaseName ? <span className="text-muted-foreground"> · {contact.phaseName}</span> : null}
                                <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                                  {contact.phone ? <a href={`tel:${contact.phone}`} className="underline">{contact.phone}</a> : null}
                                  {contact.email ? <a href={`mailto:${contact.email}`} className="underline">{contact.email}</a> : null}
                                </div>
                              </li>
                            ))}
                          </ul>
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
                          disabled={!canSubmit}
                          onClick={() =>
                            setLocation(
                              `/distribution/partner/submit?developmentId=${item.developmentId}`,
                            )
                          }
                        >
                          Submit a buyer
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
                  ? 'A program can be open for referrals while the Developer Engine availability check is still pending.'
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
