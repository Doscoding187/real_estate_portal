import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';
import { trpc } from '@/lib/trpc';

const ALL_FILTER_VALUE = 'all';

function formatCurrency(value: number | null | undefined) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 'R 0';
  return `R ${numeric.toLocaleString('en-ZA')}`;
}

function formatCurrencyRange(priceFrom: number | null | undefined, priceTo: number | null | undefined) {
  const from = Number(priceFrom || 0);
  const to = Number(priceTo || 0);
  const hasFrom = Number.isFinite(from) && from > 0;
  const hasTo = Number.isFinite(to) && to > 0;
  if (hasFrom && hasTo) {
    if (Math.abs(from - to) <= 1) return formatCurrency(from);
    return `${formatCurrency(from)} - ${formatCurrency(to)}`;
  }
  if (hasFrom) return `From ${formatCurrency(from)}`;
  if (hasTo) return `Up to ${formatCurrency(to)}`;
  return 'Price not configured';
}

function getBadgeLabel(input: { isActive: boolean; commissionDisplay: string }) {
  if (!input.isActive) return 'Paused';
  const commission = String(input.commissionDisplay || '').toLowerCase();
  if (commission.includes('%')) return 'High demand';
  if (commission.includes('r')) return 'Fast payout';
  return 'Open stock';
}

function getProgressSnapshot(item: any) {
  const requiredDocs = Array.isArray(item.requiredDocuments) ? item.requiredDocuments : [];
  const hasRequiredDocs = requiredDocs.length > 0;
  const steps = [
    {
      key: 'program',
      label: 'Program active',
      done: Boolean(item.program?.isActive),
    },
    {
      key: 'docs',
      label: 'Required docs configured',
      done: hasRequiredDocs,
    },
    {
      key: 'live',
      label: 'Referrals enabled',
      done: Boolean(item.program?.isReferralEnabled),
    },
  ];

  const completed = steps.filter(step => step.done).length;
  const total = steps.length;
  const percent = Math.round((completed / total) * 100);
  return { steps, completed, total, percent };
}

export default function PartnerDevelopmentsPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedBrandId, setSelectedBrandId] = useState<string>(ALL_FILTER_VALUE);
  const [selectedProvince, setSelectedProvince] = useState<string>(ALL_FILTER_VALUE);
  const [selectedCity, setSelectedCity] = useState<string>(ALL_FILTER_VALUE);
  const [searchText, setSearchText] = useState('');
  const [selectedDevelopmentId, setSelectedDevelopmentId] = useState<number | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, loading, setLocation]);

  const termsQuery = trpc.distribution.partner.listProgramTerms.useQuery(
    { includeDisabled: false },
    { enabled: isAuthenticated, retry: false },
  );

  const allItems = termsQuery.data?.items || [];

  const brandOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const item of allItems) {
      if (item.brand) map.set(Number(item.brand.brandProfileId), String(item.brand.brandName || ''));
    }
    return Array.from(map.entries())
      .map(([brandProfileId, brandName]) => ({ brandProfileId, brandName }))
      .sort((a, b) => a.brandName.localeCompare(b.brandName));
  }, [allItems]);

  const provinceOptions = useMemo(
    () =>
      Array.from(new Set(allItems.map(item => item.province).filter(Boolean) as string[])).sort((a, b) =>
        a.localeCompare(b),
      ),
    [allItems],
  );

  const cityOptions = useMemo(() => {
    const baseItems =
      selectedProvince === ALL_FILTER_VALUE
        ? allItems
        : allItems.filter(item => String(item.province || '') === selectedProvince);
    return Array.from(new Set(baseItems.map(item => item.city).filter(Boolean) as string[])).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [allItems, selectedProvince]);

  const filteredItems = useMemo(() => {
    const needle = searchText.trim().toLowerCase();
    return allItems.filter(item => {
      if (
        selectedBrandId !== ALL_FILTER_VALUE &&
        Number(item.brand?.brandProfileId || 0) !== Number(selectedBrandId)
      ) {
        return false;
      }
      if (selectedProvince !== ALL_FILTER_VALUE && String(item.province || '') !== selectedProvince) {
        return false;
      }
      if (selectedCity !== ALL_FILTER_VALUE && String(item.city || '') !== selectedCity) {
        return false;
      }
      if (!needle) return true;
      const haystack = [
        item.developmentName,
        item.brand?.brandName,
        item.city,
        item.province,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [allItems, searchText, selectedBrandId, selectedProvince, selectedCity]);

  const topDevelopments = useMemo(() => filteredItems.slice(0, 10), [filteredItems]);

  useEffect(() => {
    if (!topDevelopments.length) {
      setSelectedDevelopmentId(null);
      return;
    }
    if (!selectedDevelopmentId) {
      setSelectedDevelopmentId(Number(topDevelopments[0].developmentId));
      return;
    }
    const stillVisible = topDevelopments.some(
      item => Number(item.developmentId) === Number(selectedDevelopmentId),
    );
    if (!stillVisible) {
      setSelectedDevelopmentId(Number(topDevelopments[0].developmentId));
    }
  }, [topDevelopments, selectedDevelopmentId]);

  const selectedDevelopment = useMemo(
    () =>
      topDevelopments.find(
        item => Number(item.developmentId) === Number(selectedDevelopmentId),
      ) || null,
    [topDevelopments, selectedDevelopmentId],
  );

  const citySummary = useMemo(() => {
    const counters = new Map<string, { total: number; enabled: number }>();
    for (const item of filteredItems) {
      const city = String(item.city || 'Unspecified city');
      const current = counters.get(city) || { total: 0, enabled: 0 };
      current.total += 1;
      if (item.program?.isReferralEnabled) current.enabled += 1;
      counters.set(city, current);
    }
    return Array.from(counters.entries())
      .map(([city, stats]) => ({ city, ...stats }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [filteredItems]);

  useEffect(() => {
    if (selectedProvince !== ALL_FILTER_VALUE && !provinceOptions.includes(selectedProvince)) {
      setSelectedProvince(ALL_FILTER_VALUE);
    }
  }, [provinceOptions, selectedProvince]);

  useEffect(() => {
    if (selectedCity !== ALL_FILTER_VALUE && !cityOptions.includes(selectedCity)) {
      setSelectedCity(ALL_FILTER_VALUE);
    }
  }, [cityOptions, selectedCity]);

  if (loading || termsQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0ede8]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <ReferralAppShell>
      <main className="mx-auto w-full max-w-7xl px-4 pb-10 pt-6 md:px-7">
        <section className="rounded-xl border border-[#1a1a18]/12 bg-white">
          <div className="border-b border-[#1a1a18]/12 px-5 py-4 md:px-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b6a64]">
              Partner Workspace
            </p>
            <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-[#1a1a18]">
              Deals You Can Close Today
            </h1>
            <p className="mt-1 text-[12px] text-[#6b6a64]">
              All referral stock is open to every partner. Match a buyer and submit directly.
            </p>
          </div>

          <div className="grid gap-2 border-b border-[#1a1a18]/12 px-5 py-4 md:grid-cols-4 md:px-6">
            <input
              value={searchText}
              onChange={event => setSearchText(event.target.value)}
              placeholder="Search development, city, brand..."
              className="h-9 rounded-md border border-[#1a1a18]/22 bg-white px-3 text-[12px] text-[#1a1a18] placeholder:text-[#9e9d96]"
            />
            <select
              className="h-9 rounded-md border border-[#1a1a18]/22 bg-white px-3 text-[12px] text-[#1a1a18]"
              value={selectedBrandId}
              onChange={event => setSelectedBrandId(event.target.value)}
            >
              <option value={ALL_FILTER_VALUE}>All brands</option>
              {brandOptions.map(option => (
                <option key={option.brandProfileId} value={option.brandProfileId}>
                  {option.brandName}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border border-[#1a1a18]/22 bg-white px-3 text-[12px] text-[#1a1a18]"
              value={selectedProvince}
              onChange={event => setSelectedProvince(event.target.value)}
            >
              <option value={ALL_FILTER_VALUE}>All provinces</option>
              {provinceOptions.map(province => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border border-[#1a1a18]/22 bg-white px-3 text-[12px] text-[#1a1a18]"
              value={selectedCity}
              onChange={event => setSelectedCity(event.target.value)}
            >
              <option value={ALL_FILTER_VALUE}>All cities</option>
              {cityOptions.map(city => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between px-5 py-3 md:px-6">
            <p className="text-[11px] text-[#6b6a64]">
              Showing{' '}
              <span className="font-semibold text-[#1a1a18]">{topDevelopments.length}</span> of{' '}
              <span className="font-semibold text-[#1a1a18]">{filteredItems.length}</span> development
              {filteredItems.length === 1 ? '' : 's'} (top 10)
            </p>
            <button
              type="button"
              className="text-[11px] font-medium text-[#1a5bbf] hover:underline"
              onClick={() => setLocation('/distribution/partner')}
            >
              Back to overview
            </button>
          </div>
        </section>

        {termsQuery.error ? (
          <section className="mt-4 rounded-xl border border-[#b91c1c]/20 bg-[#fef0f0] px-5 py-4 text-[12px] text-[#b91c1c]">
            {termsQuery.error.message}
          </section>
        ) : null}

        {!termsQuery.error && !filteredItems.length ? (
          <section className="mt-4 rounded-xl border border-[#1a1a18]/12 bg-white px-5 py-8 text-center">
            <p className="text-[13px] font-medium text-[#1a1a18]">No developments match this filter.</p>
            <p className="mt-1 text-[12px] text-[#6b6a64]">
              Clear filters to view all available stock in the referral program.
            </p>
          </section>
        ) : null}

        {!!topDevelopments.length && (
          <section className="mt-4 grid gap-3 lg:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.45fr)]">
            <section className="rounded-xl border border-[#1a1a18]/12 bg-white">
              <div className="border-b border-[#1a1a18]/12 px-4 py-3">
                <h2 className="text-[13px] font-semibold text-[#1a1a18]">Developments</h2>
                <p className="text-[11px] text-[#6b6a64]">
                  Select a development to view readiness progress and actions.
                </p>
              </div>
              <div className="max-h-[560px] overflow-y-auto p-2">
                {topDevelopments.map(item => {
                  const progress = getProgressSnapshot(item);
                  const isSelected =
                    Number(item.developmentId) === Number(selectedDevelopment?.developmentId || 0);
                  return (
                    <button
                      key={item.developmentId}
                      type="button"
                      onClick={() => setSelectedDevelopmentId(Number(item.developmentId))}
                      className={`mb-2 w-full rounded-lg border p-3 text-left transition ${
                        isSelected
                          ? 'border-[#1a1a18] bg-[#f7f5f0]'
                          : 'border-[#1a1a18]/12 bg-white hover:border-[#1a1a18]/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[13px] font-semibold text-[#1a1a18]">{item.developmentName}</p>
                          <p className="text-[11px] text-[#6b6a64]">
                            {[item.city, item.province].filter(Boolean).join(' - ') || 'Location unavailable'}
                          </p>
                        </div>
                        <span className="rounded bg-[#1a1a18]/8 px-2 py-0.5 text-[10px] font-medium text-[#1a1a18]">
                          {progress.percent}%
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 rounded bg-[#1a1a18]/10">
                        <div
                          className="h-full rounded bg-[#1a5bbf]"
                          style={{ width: `${progress.percent}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-[#6b6a64]">
                        {progress.completed}/{progress.total} readiness checks complete
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            {selectedDevelopment && (
              <section className="rounded-xl border border-[#1a1a18]/12 bg-white">
                <div className="border-b border-[#1a1a18]/12 px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b6a64]">
                    Selected Development
                  </p>
                  <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.02em] text-[#1a1a18]">
                    {selectedDevelopment.developmentName}
                  </h2>
                  <p className="text-[12px] text-[#6b6a64]">
                    {[selectedDevelopment.city, selectedDevelopment.province].filter(Boolean).join(' - ') ||
                      'Location unavailable'}
                  </p>
                </div>

                <div className="space-y-4 px-5 py-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded border border-[#1a1a18]/12 bg-[#faf9f6] p-3">
                      <p className="text-[10px] uppercase tracking-[0.06em] text-[#6b6a64]">Price Range</p>
                      <p className="mt-1 text-[14px] font-semibold text-[#1a1a18]">
                        {formatCurrencyRange(selectedDevelopment.priceFrom, selectedDevelopment.priceTo)}
                      </p>
                    </div>
                    <div className="rounded border border-[#1a1a18]/12 bg-[#faf9f6] p-3">
                      <p className="text-[10px] uppercase tracking-[0.06em] text-[#6b6a64]">Commission</p>
                      <p className="mt-1 text-[14px] font-semibold text-[#1a7a40]">
                        {selectedDevelopment.computed?.commissionDisplay || 'Commission configured'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded border border-[#1a1a18]/12 p-3">
                    <p className="text-[11px] font-semibold text-[#1a1a18]">Development Progress</p>
                    <div className="mt-2 space-y-2">
                      {getProgressSnapshot(selectedDevelopment).steps.map(step => (
                        <div key={step.key} className="flex items-center justify-between rounded bg-[#faf9f6] px-2.5 py-2">
                          <p className="text-[11px] text-[#1a1a18]">{step.label}</p>
                          <span
                            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium ${
                              step.done
                                ? 'bg-[#e7f7ef] text-[#0f6a36]'
                                : 'bg-[#f4f4f5] text-[#6b6a64]'
                            }`}
                          >
                            {step.done ? <CheckCircle2 className="h-3 w-3" /> : null}
                            {step.done ? 'Done' : 'Pending'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded border border-[#1a1a18]/12 p-3">
                    <p className="text-[11px] font-semibold text-[#1a1a18]">Payout and Requirements</p>
                    <p className="mt-1 text-[11px] text-[#6b6a64]">
                      {selectedDevelopment.computed?.payoutDisplay || 'Payout rules not configured'}
                    </p>
                    <p className="mt-1 text-[11px] text-[#6b6a64]">
                      {selectedDevelopment.computed?.requiredDocsSummary || 'Required documents not configured'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setLocation(
                          `/distribution/partner/submit?developmentId=${selectedDevelopment.developmentId}`,
                        )
                      }
                      className="rounded-md border border-[#1a1a18]/12 bg-[#f5f4f0] px-2 py-2 text-[11px] font-semibold text-[#1a1a18]"
                    >
                      Submit Referral
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setLocation(
                          `/distribution/partner/accelerator?developmentId=${selectedDevelopment.developmentId}`,
                        )
                      }
                      className="rounded-md bg-[#1a1a18] px-2 py-2 text-[11px] font-semibold text-white"
                    >
                      Match Buyer
                    </button>
                  </div>
                </div>
              </section>
            )}
          </section>
        )}

        {!!citySummary.length && (
          <section className="mt-4 rounded-xl border border-[#1a1a18]/12 bg-white px-5 py-4 md:px-6">
            <h3 className="text-[12px] font-semibold text-[#1a1a18]">City Development Summary</h3>
            <p className="mt-0.5 text-[11px] text-[#6b6a64]">
              Quick footer view of active development concentration by city.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {citySummary.map(city => (
                <div key={city.city} className="rounded border border-[#1a1a18]/12 bg-[#faf9f6] p-2.5">
                  <p className="text-[11px] font-semibold text-[#1a1a18]">{city.city}</p>
                  <p className="text-[10px] text-[#6b6a64]">
                    {city.total} development{city.total === 1 ? '' : 's'}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[#0f6a36]">
                    {city.enabled} referral enabled
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </ReferralAppShell>
  );
}
