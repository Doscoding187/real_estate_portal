import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';
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

export default function PartnerDevelopmentsPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedBrandId, setSelectedBrandId] = useState<string>(ALL_FILTER_VALUE);
  const [selectedProvince, setSelectedProvince] = useState<string>(ALL_FILTER_VALUE);
  const [selectedCity, setSelectedCity] = useState<string>(ALL_FILTER_VALUE);
  const [searchText, setSearchText] = useState('');

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
              Showing <span className="font-semibold text-[#1a1a18]">{filteredItems.length}</span> development
              {filteredItems.length === 1 ? '' : 's'}
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

        <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map(item => {
            const badgeLabel = getBadgeLabel({
              isActive: Boolean(item.program?.isActive),
              commissionDisplay: String(item.computed?.commissionDisplay || ''),
            });
            const badgeClass =
              badgeLabel === 'High demand'
                ? 'bg-[#D97706] text-white'
                : badgeLabel === 'Fast payout'
                  ? 'bg-[#059669] text-white'
                  : badgeLabel === 'Paused'
                    ? 'bg-[#9e9d96] text-white'
                    : 'bg-[#1a5bbf] text-white';

            return (
              <article
                key={item.developmentId}
                className="overflow-hidden rounded-xl border border-[#1a1a18]/12 bg-white"
              >
                <div className="relative h-32 bg-[#f5f4f0]">
                  <span className={`absolute left-2 top-2 rounded px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] ${badgeClass}`}>
                    {badgeLabel}
                  </span>
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.developmentName}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[#1a1a18]/35">
                      <svg width="62" height="44" viewBox="0 0 62 44" fill="none">
                        <rect x="7" y="14" width="48" height="26" rx="2" fill="currentColor" />
                        <polygon points="31,3 56,15 6,15" fill="currentColor" />
                        <rect x="25" y="24" width="12" height="16" fill="white" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h2 className="text-[13px] font-semibold text-[#1a1a18]">{item.developmentName}</h2>
                  <p className="mt-0.5 text-[11px] text-[#6b6a64]">
                    {[item.city, item.province].filter(Boolean).join(' - ') || 'Location unavailable'}
                  </p>
                  {item.brand?.brandName ? (
                    <p className="mt-0.5 text-[10px] text-[#9e9d96]">{item.brand.brandName}</p>
                  ) : null}

                  <p className="mt-3 font-mono text-[14px] font-semibold text-[#1a1a18]">
                    {formatCurrencyRange(item.priceFrom, item.priceTo)}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-[#1a7a40]">
                    Commission: {item.computed?.commissionDisplay || 'Commission configured'}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[#6b6a64]">
                    {item.computed?.payoutDisplay || 'Payout rules not configured'}
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setLocation(`/distribution/partner/submit?developmentId=${item.developmentId}`)}
                      className="rounded-md border border-[#1a1a18]/12 bg-[#f5f4f0] px-2 py-1.5 text-[11px] font-semibold text-[#1a1a18]"
                    >
                      Submit Referral
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setLocation(`/distribution/partner/accelerator?developmentId=${item.developmentId}`)
                      }
                      className="rounded-md bg-[#1a1a18] px-2 py-1.5 text-[11px] font-semibold text-white"
                    >
                      Match Buyer
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </ReferralAppShell>
  );
}
