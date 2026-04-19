import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Download, ExternalLink, Loader2 } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';
import { trpc } from '@/lib/trpc';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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
  return 'Price on request';
}

function getOpportunityLabel(item: any) {
  if (item.program?.isReferralEnabled) return 'Open for referral';
  if (item.program?.isActive) return 'Launching soon';
  return 'Preview stock';
}

function buildBrochureText(item: any) {
  const location = [item.city, item.province].filter(Boolean).join(', ') || 'Location unavailable';
  const lines = [
    `${item.developmentName}`,
    `${location}`,
    '',
    `Price Range: ${formatCurrencyRange(item.priceFrom, item.priceTo)}`,
    `Commission: ${item.computed?.commissionDisplay || 'Commission to be confirmed'}`,
    `Payout: ${item.computed?.payoutDisplay || 'Payout to be confirmed'}`,
    '',
    'Unit Types:',
  ];

  const unitTypes = Array.isArray(item.unitTypes) ? item.unitTypes : [];
  if (!unitTypes.length) {
    lines.push('- Unit types available on request');
  } else {
    for (const unit of unitTypes.slice(0, 10)) {
      lines.push(`- ${unit.name}: ${formatCurrencyRange(unit.priceFrom, unit.priceTo)}`);
    }
  }

  lines.push('', 'Contact your Property Listify partner manager for full brochure and stock updates.');
  return lines.join('\n');
}

function downloadBrochure(item: any) {
  const sourceDocs = Array.isArray(item.sourceDocuments) ? item.sourceDocuments : [];
  const primarySource = sourceDocs.find((doc: any) => typeof doc.fileUrl === 'string' && doc.fileUrl);
  if (primarySource?.fileUrl) {
    window.open(primarySource.fileUrl, '_blank', 'noopener,noreferrer');
    return;
  }
  const text = buildBrochureText(item);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeName = String(item.developmentName || 'development')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  anchor.href = href;
  anchor.download = `${safeName || 'development'}-brochure.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(href);
}

export default function PartnerDevelopmentsPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedBrandId, setSelectedBrandId] = useState<string>(ALL_FILTER_VALUE);
  const [selectedProvince, setSelectedProvince] = useState<string>(ALL_FILTER_VALUE);
  const [selectedCity, setSelectedCity] = useState<string>(ALL_FILTER_VALUE);
  const [searchText, setSearchText] = useState('');
  const [brochureItem, setBrochureItem] = useState<any | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) setLocation('/login');
  }, [isAuthenticated, loading, setLocation]);

  const termsQuery = trpc.distribution.partner.listProgramTerms.useQuery(
    { includeDisabled: true },
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
      const haystack = [item.developmentName, item.brand?.brandName, item.city, item.province]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [allItems, searchText, selectedBrandId, selectedProvince, selectedCity]);

  const topDevelopments = useMemo(() => filteredItems.slice(0, 10), [filteredItems]);

  const citySummary = useMemo(() => {
    const counters = new Map<string, { total: number; live: number }>();
    for (const item of filteredItems) {
      const city = String(item.city || 'Unspecified city');
      const current = counters.get(city) || { total: 0, live: 0 };
      current.total += 1;
      if (item.program?.isReferralEnabled) current.live += 1;
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
              Development Opportunities
            </h1>
            <p className="mt-1 text-[12px] text-[#6b6a64]">
              Browse stock, compare unit types, and download a shareable brochure for clients.
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
              Clear filters to view all available opportunities.
            </p>
          </section>
        ) : null}

        <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {topDevelopments.map(item => (
            <article key={item.developmentId} className="overflow-hidden rounded-xl border border-[#1a1a18]/12 bg-white">
              <div className="relative h-36 bg-[#f5f4f0]">
                <span className="absolute left-2 top-2 rounded bg-[#1a1a18] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-white">
                  {getOpportunityLabel(item)}
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

              <div className="space-y-2 p-4">
                <h2 className="text-[14px] font-semibold text-[#1a1a18]">{item.developmentName}</h2>
                <p className="text-[11px] text-[#6b6a64]">
                  {[item.city, item.province].filter(Boolean).join(' - ') || 'Location unavailable'}
                </p>
                {item.brand?.brandName ? (
                  <p className="text-[10px] text-[#9e9d96]">{item.brand.brandName}</p>
                ) : null}

                <p className="font-mono text-[14px] font-semibold text-[#1a1a18]">
                  {formatCurrencyRange(item.priceFrom, item.priceTo)}
                </p>
                <p className="text-[11px] text-[#1a7a40]">
                  {item.computed?.commissionDisplay || 'Commission available on request'}
                </p>

                <p className="text-[10px] text-[#6b6a64]">
                  {Array.isArray(item.unitTypes) && item.unitTypes.length
                    ? `${item.unitTypes.length} unit type${item.unitTypes.length === 1 ? '' : 's'}`
                    : 'Unit type details available'}
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBrochureItem(item)}
                    className="text-[11px]"
                  >
                    View Brochure
                  </Button>
                  <Button
                    size="sm"
                    className="text-[11px]"
                    onClick={() => setLocation(`/distribution/partner/submit?developmentId=${item.developmentId}`)}
                  >
                    Submit Referral
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </section>

        {!!citySummary.length && (
          <section className="mt-4 rounded-xl border border-[#1a1a18]/12 bg-white px-5 py-4 md:px-6">
            <h3 className="text-[12px] font-semibold text-[#1a1a18]">City Opportunity Summary</h3>
            <p className="mt-0.5 text-[11px] text-[#6b6a64]">
              Snapshot of where opportunities are concentrated.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {citySummary.map(city => (
                <div key={city.city} className="rounded border border-[#1a1a18]/12 bg-[#faf9f6] p-2.5">
                  <p className="text-[11px] font-semibold text-[#1a1a18]">{city.city}</p>
                  <p className="text-[10px] text-[#6b6a64]">
                    {city.total} development{city.total === 1 ? '' : 's'}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[#0f6a36]">
                    {city.live} live for referral
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <Dialog open={Boolean(brochureItem)} onOpenChange={open => !open && setBrochureItem(null)}>
        <DialogContent className="max-h-[86vh] overflow-y-auto sm:max-w-2xl">
          {brochureItem ? (
            <>
              <DialogHeader>
                <DialogTitle>{brochureItem.developmentName}</DialogTitle>
                <DialogDescription>
                  {[brochureItem.city, brochureItem.province].filter(Boolean).join(', ') ||
                    'Location unavailable'}
                </DialogDescription>
              </DialogHeader>

              {brochureItem.imageUrl ? (
                <div className="overflow-hidden rounded border">
                  <img
                    src={brochureItem.imageUrl}
                    alt={brochureItem.developmentName}
                    className="h-52 w-full object-cover"
                  />
                </div>
              ) : null}

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded border bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Price Range</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatCurrencyRange(brochureItem.priceFrom, brochureItem.priceTo)}
                  </p>
                </div>
                <div className="rounded border bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Commission</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {brochureItem.computed?.commissionDisplay || 'Commission available on request'}
                  </p>
                </div>
              </div>

              <div className="rounded border p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Unit Types</p>
                {Array.isArray(brochureItem.unitTypes) && brochureItem.unitTypes.length ? (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {brochureItem.unitTypes.slice(0, 8).map((unit: any) => (
                      <div key={unit.name} className="rounded border bg-slate-50 p-2">
                        <p className="text-sm font-medium text-slate-900">{unit.name}</p>
                        <p className="text-xs text-slate-600">
                          {formatCurrencyRange(unit.priceFrom, unit.priceTo)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">Unit type details available on request.</p>
                )}
              </div>

              <div className="rounded border p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Referral Notes</p>
                <p className="mt-2 text-sm text-slate-700">
                  {brochureItem.computed?.payoutDisplay || 'Payout and milestone details on request.'}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {brochureItem.computed?.requiredDocsSummary || 'Requirements shared on submission.'}
                </p>
              </div>

              {Array.isArray(brochureItem.sourceDocuments) && brochureItem.sourceDocuments.length ? (
                <div className="rounded border p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Source Documents</p>
                  <div className="mt-2 grid gap-2">
                    {brochureItem.sourceDocuments.map((doc: any) => (
                      <div
                        key={doc.templateId}
                        className="flex items-center justify-between rounded border bg-slate-50 px-2.5 py-2"
                      >
                        <p className="text-sm text-slate-900">
                          {doc.documentLabel || 'Developer document'}
                        </p>
                        {doc.fileUrl ? (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium text-[#1a5bbf] hover:underline"
                          >
                            Open
                          </a>
                        ) : (
                          <span className="text-xs text-slate-500">Pending upload</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => downloadBrochure(brochureItem)}
                  className="gap-1"
                >
                  <Download className="h-4 w-4" />
                  Download Brochure
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setLocation(`/distribution/partner/accelerator?developmentId=${brochureItem.developmentId}`)
                  }
                  className="gap-1"
                >
                  <ExternalLink className="h-4 w-4" />
                  Pre-Qualify Buyer
                </Button>
                <Button onClick={() => setLocation(`/distribution/partner/submit?developmentId=${brochureItem.developmentId}`)}>
                  Submit Referral
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </ReferralAppShell>
  );
}
