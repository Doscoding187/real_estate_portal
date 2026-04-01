import { useEffect, useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Building2, Search, MapPin, Home, Banknote, Loader2 } from 'lucide-react';
import { calculateAffordablePrice, calculateMonthlyRepayment } from '@/lib/bond-calculator';
import { toast } from 'sonner';
import { PayoutRulesDisclosure } from '@/components/distribution/partner/PayoutRulesDisclosure';

const PRIME_RATE = 11.75;
const BOND_TERM_YEARS = 20;

type UnitTypeSummary = {
  name: string;
  isActive: boolean;
  bedrooms: number | null;
  bathrooms: number | null;
  unitSize: number | null;
  yardSize: number | null;
  priceFrom: number | null;
  priceTo: number | null;
};

function formatMoney(value: number | null) {
  if (value === null || Number.isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(value);
}

function parseTagList(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(v => String(v)).filter(Boolean);
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(v => String(v)).filter(Boolean);
    } catch {
      return trimmed
        .split(',')
        .map(v => v.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export default function ReferrerDashboard() {
  useAuth({ redirectOnUnauthenticated: true });

  const [search, setSearch] = useState('');
  const [selectedDevelopmentId, setSelectedDevelopmentId] = useState<number | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<number | null>(null);
  const [grossIncome, setGrossIncome] = useState<number>(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState<number>(0);
  const [monthlyDebt, setMonthlyDebt] = useState<number>(0);
  const [depositPercent, setDepositPercent] = useState<number>(10);
  const [prospectName, setProspectName] = useState('');
  const [prospectEmail, setProspectEmail] = useState('');
  const [prospectPhone, setProspectPhone] = useState('');

  const accessQuery = trpc.distribution.referrer.myAccess.useQuery({
    includePaused: true,
    includeRevoked: false,
  });
  const pipelineQuery = trpc.distribution.referrer.myPipeline.useQuery({ limit: 200 });
  const dealTimelineQuery = trpc.distribution.referrer.dealTimeline.useQuery(
    { dealId: Number(selectedDealId) },
    { enabled: Boolean(selectedDealId) },
  );
  const submitDealMutation = trpc.distribution.referrer.submitDeal.useMutation({
    onSuccess: () => {
      toast.success('Prospect submitted to deal pipeline');
      setProspectName('');
      setProspectEmail('');
      setProspectPhone('');
      pipelineQuery.refetch();
    },
    onError: err => toast.error(err.message),
  });

  const groupedDevelopments = useMemo(() => {
    const rows = accessQuery.data || [];
    const map = new Map<number, any>();

    for (const row of rows as any[]) {
      const developmentId = Number(row.developmentId);
      const existing = map.get(developmentId);
      if (!existing) {
        map.set(developmentId, {
          ...row,
          unitTypes: [...(row.unitTypes || [])] as UnitTypeSummary[],
          statuses: new Set([row.accessStatus]),
        });
        continue;
      }

      const mergedUnits = [...existing.unitTypes, ...(row.unitTypes || [])];
      const uniqueUnits = new Map<string, UnitTypeSummary>();
      for (const unit of mergedUnits) {
        const key = `${unit.name}|${unit.priceFrom ?? 'na'}|${unit.priceTo ?? 'na'}`;
        uniqueUnits.set(key, unit);
      }

      existing.unitTypes = Array.from(uniqueUnits.values());
      existing.statuses.add(row.accessStatus);
      if (row.accessStatus === 'active') {
        existing.accessStatus = 'active';
      }
      map.set(developmentId, existing);
    }

    return Array.from(map.values()).sort((a, b) =>
      String(a.developmentName || '').localeCompare(String(b.developmentName || '')),
    );
  }, [accessQuery.data]);

  const filteredDevelopments = useMemo(() => {
    if (!search.trim()) return groupedDevelopments;
    const q = search.trim().toLowerCase();
    return groupedDevelopments.filter(
      dev =>
        String(dev.developmentName || '')
          .toLowerCase()
          .includes(q) ||
        String(dev.city || '')
          .toLowerCase()
          .includes(q) ||
        String(dev.province || '')
          .toLowerCase()
          .includes(q),
    );
  }, [groupedDevelopments, search]);

  useEffect(() => {
    if (!filteredDevelopments.length) {
      setSelectedDevelopmentId(null);
      return;
    }
    if (!selectedDevelopmentId) {
      setSelectedDevelopmentId(Number(filteredDevelopments[0].developmentId));
      return;
    }
    const stillExists = filteredDevelopments.some(
      dev => Number(dev.developmentId) === Number(selectedDevelopmentId),
    );
    if (!stillExists) {
      setSelectedDevelopmentId(Number(filteredDevelopments[0].developmentId));
    }
  }, [filteredDevelopments, selectedDevelopmentId]);

  const selectedDevelopment = filteredDevelopments.find(
    dev => Number(dev.developmentId) === Number(selectedDevelopmentId),
  );

  const totalUnitTypes = groupedDevelopments.reduce(
    (total, dev) => total + (dev.unitTypes?.length || 0),
    0,
  );

  const disposableIncome = Math.max(0, grossIncome - monthlyExpenses - monthlyDebt);
  const maxMonthlyRepaymentBudget = Math.max(
    0,
    Math.min(grossIncome * 0.3, disposableIncome * 0.6),
  );
  const maxAffordablePrice =
    maxMonthlyRepaymentBudget > 0
      ? calculateAffordablePrice(
          maxMonthlyRepaymentBudget,
          Math.max(0, Math.min(100, depositPercent)),
          PRIME_RATE,
          BOND_TERM_YEARS,
        )
      : 0;

  const qualifyingUnits = ((selectedDevelopment?.unitTypes || []) as UnitTypeSummary[]).filter(
    unit => {
      const priceAnchor = unit.priceFrom ?? unit.priceTo ?? null;
      return typeof priceAnchor === 'number' && priceAnchor <= maxAffordablePrice;
    },
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <ListingNavbar />

      <div className="mx-auto max-w-7xl px-4 pt-24 pb-8">
        <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 p-6 text-white">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-200">Referrer Workspace</p>
          <h1 className="mt-2 text-3xl font-bold">Developments Dashboard</h1>
          <p className="mt-2 text-slate-200">
            Track accessible developments, unit pricing, and estimated qualifying income.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Developments</CardDescription>
              <CardTitle>{groupedDevelopments.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Access</CardDescription>
              <CardTitle>
                {groupedDevelopments.filter(dev => dev.accessStatus === 'active').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Unit Types</CardDescription>
              <CardTitle>{totalUnitTypes}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {accessQuery.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
          </div>
        ) : accessQuery.error ? (
          <Card>
            <CardHeader>
              <CardTitle>Unable to load dashboard</CardTitle>
              <CardDescription>{accessQuery.error.message}</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Developments</CardTitle>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name, city, province"
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {filteredDevelopments.length === 0 ? (
                  <p className="text-sm text-slate-500">No developments match your search.</p>
                ) : (
                  filteredDevelopments.map(dev => {
                    const isSelected = Number(dev.developmentId) === Number(selectedDevelopmentId);
                    return (
                      <button
                        key={dev.developmentId}
                        className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                          isSelected
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                        onClick={() => setSelectedDevelopmentId(Number(dev.developmentId))}
                      >
                        <p className="font-semibold">{dev.developmentName}</p>
                        <p
                          className={`text-xs ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}
                        >
                          {dev.city}, {dev.province}
                        </p>
                      </button>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              {!selectedDevelopment ? (
                <Card>
                  <CardHeader>
                    <CardTitle>No development selected</CardTitle>
                  </CardHeader>
                </Card>
              ) : (
                <>
                  <Card>
                    <CardHeader>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-2xl">
                            {selectedDevelopment.developmentName}
                          </CardTitle>
                          <CardDescription className="mt-2 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {selectedDevelopment.suburb ? `${selectedDevelopment.suburb}, ` : ''}
                            {selectedDevelopment.city}, {selectedDevelopment.province}
                          </CardDescription>
                        </div>
                        <Badge
                          variant={
                            selectedDevelopment.accessStatus === 'active' ? 'default' : 'secondary'
                          }
                        >
                          {selectedDevelopment.accessStatus}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-md border p-2.5">
                          <p className="text-[11px] text-slate-500">Development Price Range</p>
                          <p className="mt-1 text-sm font-semibold leading-tight">
                            {formatMoney(selectedDevelopment.priceFrom)} -{' '}
                            {formatMoney(selectedDevelopment.priceTo)}
                          </p>
                        </div>
                        <div className="rounded-md border p-2.5">
                          <p className="text-[11px] text-slate-500">Commission Model</p>
                          <p className="mt-1 text-sm font-semibold leading-tight">
                            {String(selectedDevelopment.commissionModel || 'N/A').replace('_', ' ')}
                          </p>
                        </div>
                        <div className="rounded-md border p-2.5">
                          <p className="text-[11px] text-slate-500">Referral Status</p>
                          <p className="mt-1 text-sm font-semibold leading-tight">
                            {selectedDevelopment.isReferralEnabled ? 'Enabled' : 'Disabled'}
                          </p>
                        </div>
                        <div className="rounded-md border p-2.5">
                          <p className="text-[11px] text-slate-500">Unit Types</p>
                          <p className="mt-1 text-sm font-semibold leading-tight">
                            {(selectedDevelopment.unitTypes || []).length}
                          </p>
                        </div>
                      </div>

                      {selectedDevelopment.description && (
                        <p className="text-sm text-slate-600">{selectedDevelopment.description}</p>
                      )}

                      {parseTagList(selectedDevelopment.amenities).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {parseTagList(selectedDevelopment.amenities)
                            .slice(0, 12)
                            .map((tag, idx) => (
                              <Badge key={`${tag}-${idx}`} variant="secondary">
                                {tag}
                              </Badge>
                            ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Unit Types</CardTitle>
                      <CardDescription>
                        Pricing, monthly estimate, and qualifying income per unit type.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedDevelopment.unitTypes?.length ? (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {selectedDevelopment.unitTypes.map(
                            (unit: UnitTypeSummary, idx: number) => {
                              const basePrice = unit.priceFrom ?? unit.priceTo ?? null;
                              const monthlyRepayment =
                                basePrice && basePrice > 0
                                  ? calculateMonthlyRepayment(
                                      basePrice,
                                      PRIME_RATE,
                                      BOND_TERM_YEARS,
                                    )
                                  : null;
                              const qualifyingIncome =
                                monthlyRepayment !== null
                                  ? Math.ceil(monthlyRepayment / 0.3)
                                  : null;

                              return (
                                <div key={`${unit.name}-${idx}`} className="rounded-xl border p-4">
                                  <p className="font-semibold">{unit.name}</p>
                                  <p className="mt-1 text-sm text-slate-500">
                                    {[
                                      unit.bedrooms ? `${unit.bedrooms} bed` : null,
                                      unit.bathrooms ? `${unit.bathrooms} bath` : null,
                                      unit.unitSize ? `${unit.unitSize}m2` : null,
                                    ]
                                      .filter(Boolean)
                                      .join(' | ') || 'Unit details'}
                                  </p>
                                  <Separator className="my-3" />
                                  <div className="space-y-2 text-sm">
                                    <p className="flex items-center gap-2">
                                      <Home className="h-4 w-4 text-slate-500" />
                                      {formatMoney(unit.priceFrom)} - {formatMoney(unit.priceTo)}
                                    </p>
                                    <p className="flex items-center gap-2">
                                      <Banknote className="h-4 w-4 text-slate-500" />
                                      Est. repayment: {formatMoney(monthlyRepayment)}
                                    </p>
                                    <p className="flex items-center gap-2">
                                      <Building2 className="h-4 w-4 text-slate-500" />
                                      Qualifying income: {formatMoney(qualifyingIncome)}
                                    </p>
                                  </div>
                                </div>
                              );
                            },
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">
                          No unit types are currently available for this development.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Affordability Assistant</CardTitle>
                        <CardDescription>
                          Estimate what the prospect can qualify for from income and expenses.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Input
                          type="number"
                          min={0}
                          placeholder="Gross monthly income"
                          value={grossIncome || ''}
                          onChange={e => setGrossIncome(Number(e.target.value || 0))}
                        />
                        <Input
                          type="number"
                          min={0}
                          placeholder="Monthly expenses"
                          value={monthlyExpenses || ''}
                          onChange={e => setMonthlyExpenses(Number(e.target.value || 0))}
                        />
                        <Input
                          type="number"
                          min={0}
                          placeholder="Monthly debt repayments"
                          value={monthlyDebt || ''}
                          onChange={e => setMonthlyDebt(Number(e.target.value || 0))}
                        />
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          placeholder="Deposit %"
                          value={depositPercent || ''}
                          onChange={e => setDepositPercent(Number(e.target.value || 0))}
                        />
                        <div className="rounded border p-3 text-sm space-y-1">
                          <p>Disposable income: {formatMoney(disposableIncome)}</p>
                          <p>Repayment budget: {formatMoney(maxMonthlyRepaymentBudget)}</p>
                          <p className="font-semibold">
                            Estimated max affordability: {formatMoney(maxAffordablePrice)}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-semibold">
                            Likely qualifying units in this development
                          </p>
                          {qualifyingUnits.length ? (
                            qualifyingUnits.slice(0, 8).map((unit, idx) => (
                              <div
                                key={`${unit.name}-${idx}`}
                                className="rounded border px-3 py-2 text-sm"
                              >
                                {unit.name} ({formatMoney(unit.priceFrom ?? unit.priceTo ?? null)})
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-slate-500">
                              No units match this affordability range yet.
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Add Prospect to Deal Pipeline</CardTitle>
                        <CardDescription>
                          Create a referral deal and track progression with your manager.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <PayoutRulesDisclosure developmentId={Number(selectedDevelopment?.developmentId || 0)} />
                        <Input
                          placeholder="Prospect full name"
                          value={prospectName}
                          onChange={e => setProspectName(e.target.value)}
                        />
                        <Input
                          placeholder="Prospect email"
                          value={prospectEmail}
                          onChange={e => setProspectEmail(e.target.value)}
                        />
                        <Input
                          placeholder="Prospect phone"
                          value={prospectPhone}
                          onChange={e => setProspectPhone(e.target.value)}
                        />
                        <Button
                          className="w-full"
                          disabled={
                            submitDealMutation.isPending ||
                            !selectedDevelopment?.programId ||
                            !prospectName.trim()
                          }
                          onClick={() => {
                            if (!selectedDevelopment?.programId) {
                              toast.error(
                                'Selected development is missing a distribution program.',
                              );
                              return;
                            }
                            submitDealMutation.mutate({
                              programId: Number(selectedDevelopment.programId),
                              buyerName: prospectName.trim(),
                              buyerEmail: prospectEmail.trim() || null,
                              buyerPhone: prospectPhone.trim() || null,
                              notes: `Affordability estimate: ${formatMoney(maxAffordablePrice)}`,
                              referralContext: {
                                prospect: {
                                  grossMonthlyIncome: grossIncome || null,
                                  grossMonthlyIncomeRange: null,
                                  notes: `Expenses: ${formatMoney(monthlyExpenses)}, Debt: ${formatMoney(monthlyDebt)}`,
                                },
                              },
                            });
                          }}
                        >
                          {submitDealMutation.isPending ? 'Submitting...' : 'Submit Prospect'}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                    <Card>
                      <CardHeader>
                        <CardTitle>Deal Stage Progression</CardTitle>
                        <CardDescription>
                          Track every referred deal by current stage.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(
                            (pipelineQuery.data?.stageCounts || {}) as Record<string, number>,
                          ).map(([stage, count]) => (
                            <Badge key={stage} variant="secondary">
                              {stage}: {count}
                            </Badge>
                          ))}
                        </div>
                        <div className="space-y-2">
                          {(pipelineQuery.data?.deals || []).map((deal: any) => (
                            <button
                              key={deal.id}
                              className={`w-full rounded border p-3 text-left ${
                                Number(selectedDealId) === Number(deal.id)
                                  ? 'border-slate-900 bg-slate-900 text-white'
                                  : 'border-slate-200 bg-white'
                              }`}
                              onClick={() => setSelectedDealId(Number(deal.id))}
                            >
                              <p className="font-medium">
                                {deal.developmentName} - {deal.buyerName}
                              </p>
                              <p
                                className={`text-xs ${
                                  Number(selectedDealId) === Number(deal.id)
                                    ? 'text-slate-200'
                                    : 'text-slate-500'
                                }`}
                              >
                                Stage: {deal.currentStage} | Commission: {deal.commissionStatus}
                              </p>
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Selected Deal Timeline</CardTitle>
                        <CardDescription>
                          {selectedDealId
                            ? `Deal #${selectedDealId}`
                            : 'Select a deal from pipeline'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {(dealTimelineQuery.data?.events || []).map((event: any) => (
                          <div key={event.id} className="rounded border p-3">
                            <p className="font-medium">
                              {event.eventType} | {event.fromStage || 'start'} {'->'}{' '}
                              {event.toStage || 'n/a'}
                            </p>
                            <p className="text-xs text-slate-500">{event.eventAt}</p>
                            {event.notes ? <p className="text-sm mt-1">{event.notes}</p> : null}
                          </div>
                        ))}
                        {selectedDealId &&
                          !dealTimelineQuery.isLoading &&
                          !(dealTimelineQuery.data?.events || []).length && (
                            <p className="text-sm text-slate-500">
                              No timeline events found for this deal.
                            </p>
                          )}
                        {!selectedDealId && (
                          <p className="text-sm text-slate-500">
                            Pick a deal to view detailed stage history.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
