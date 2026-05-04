import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Download, ExternalLink, Loader2, Search, SlidersHorizontal } from 'lucide-react';
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
const VIEW_MODE_SUBMIT = 'submit';
const VIEW_MODE_EXPLORE = 'explore';
const BROCHURE_BOND_YEARS = 20;
const BROCHURE_ANNUAL_INTEREST_RATE = 11.75;
const BROCHURE_MIN_INCOME_RATIO = 0.3;

function formatCurrency(value: number | null | undefined) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 'R 0';
  return `R ${Math.round(numeric).toLocaleString('en-ZA')}`;
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

function computeRewardAmount(item: any) {
  const model = String(item?.program?.commissionModel || '');
  const price = pickRepresentativePrice(item?.priceFrom, item?.priceTo) ?? 0;
  if (model === 'flat_amount') {
    return Math.max(0, Number(item?.program?.defaultCommissionAmount || 0));
  }
  if (model === 'flat_percentage') {
    const percent = Number(item?.program?.defaultCommissionPercent || 0);
    if (percent > 0 && price > 0) return Math.round((price * percent) / 100);
  }
  return 0;
}

function getRewardDisplay(item: any) {
  const computed = String(item?.computed?.commissionDisplay || '').trim();
  if (computed && !/^r\s*0\b/i.test(computed)) return computed.replace(/commission/gi, 'reward');
  const amount = computeRewardAmount(item);
  if (amount > 0) return `${formatCurrency(amount)} estimated reward`;
  const percent = Number(item?.program?.defaultCommissionPercent || 0);
  if (String(item?.program?.commissionModel || '') === 'flat_percentage' && percent > 0) {
    return `${percent}% referral reward`;
  }
  return 'Reward configured';
}

function getPayoutDisplay(item: any) {
  const computed = String(item?.computed?.payoutDisplay || '').trim();
  if (computed) return computed;
  const notes = String(item?.program?.payoutMilestoneNotes || '').trim();
  if (notes) return notes;
  const milestone = String(item?.program?.payoutMilestone || '').replace(/_/g, ' ');
  if (milestone) return `Paid after ${milestone}`;
  return 'Paid after qualifying sale milestone';
}

function getBuyerProfile(item: any) {
  const location = [item.city, item.province].filter(Boolean).join(', ') || 'this area';
  const price = pickRepresentativePrice(item.priceFrom, item.priceTo) ?? 0;
  if (price >= 1800000) return `Upscale buyer looking in ${location}`;
  if (price >= 1200000) return `Family or investor buyer looking in ${location}`;
  if (price > 0) return `First-time or value buyer looking in ${location}`;
  return `Buyer asking about ${location}`;
}

function getSellingPoints(item: any) {
  const points = [
    formatCurrencyRange(item.priceFrom, item.priceTo),
    getBuyerProfile(item),
    getRewardDisplay(item),
  ];
  const supportingFiles = countSupportingFiles(item);
  const requiredDocs = countRequiredApplicationDocs(item);
  if (supportingFiles > 0) points.push(`${supportingFiles} shareable sales file${supportingFiles === 1 ? '' : 's'}`);
  if (requiredDocs > 0) points.push(`${requiredDocs} buyer document${requiredDocs === 1 ? '' : 's'} required`);
  return points;
}

function getOpportunityLabel(item: any) {
  if (item.opportunity?.status === 'ready') return 'Open for buyers';
  if (item.opportunity?.status === 'pending_setup') return 'Coming soon';
  return 'Not accepting referrals yet';
}

function estimateMonthlyInstallment(price: number | null | undefined) {
  const principal = Number(price || 0);
  if (!Number.isFinite(principal) || principal <= 0) return null;

  const monthlyRate = BROCHURE_ANNUAL_INTEREST_RATE / 12 / 100;
  const months = BROCHURE_BOND_YEARS * 12;
  if (!Number.isFinite(monthlyRate) || monthlyRate <= 0 || months <= 0) return null;

  const growth = Math.pow(1 + monthlyRate, months);
  const payment = principal * ((monthlyRate * growth) / (growth - 1));
  if (!Number.isFinite(payment) || payment <= 0) return null;
  return payment;
}

function estimateQualifyingIncome(monthlyInstallment: number | null | undefined) {
  const monthly = Number(monthlyInstallment || 0);
  if (!Number.isFinite(monthly) || monthly <= 0) return null;
  const income = monthly / BROCHURE_MIN_INCOME_RATIO;
  if (!Number.isFinite(income) || income <= 0) return null;
  return income;
}

function pickRepresentativePrice(priceFrom: number | null | undefined, priceTo: number | null | undefined) {
  const from = Number(priceFrom || 0);
  const to = Number(priceTo || 0);
  const hasFrom = Number.isFinite(from) && from > 0;
  const hasTo = Number.isFinite(to) && to > 0;
  if (hasFrom) return from;
  if (hasTo) return to;
  return null;
}

function buildBrochureText(item: any) {
  const location = [item.city, item.province].filter(Boolean).join(', ') || 'Location unavailable';
  const unitTypes = Array.isArray(item.unitTypes) ? item.unitTypes : [];
  const lines = [
    `${item.developmentName}`,
    `${location}`,
    '',
    `Price Range: ${formatCurrencyRange(item.priceFrom, item.priceTo)}`,
    `Referral Reward: ${getRewardDisplay(item)}`,
    `Payout Trigger: ${getPayoutDisplay(item)}`,
    `Best Buyer: ${getBuyerProfile(item)}`,
    '',
    'Unit Options:',
  ];

  if (!unitTypes.length) {
    lines.push('- Unit types available on request');
  } else {
    for (const unit of unitTypes.slice(0, 10)) {
      const referencePrice = pickRepresentativePrice(unit.priceFrom, unit.priceTo);
      const monthlyInstallment = estimateMonthlyInstallment(referencePrice);
      const qualifyingIncome = estimateQualifyingIncome(monthlyInstallment);
      lines.push(
        `- ${unit.name}: ${formatCurrencyRange(unit.priceFrom, unit.priceTo)} | Est. installment ${formatCurrency(
          monthlyInstallment,
        )} | Qualifying income ${formatCurrency(qualifyingIncome)}`,
      );
    }
  }

  lines.push(
    '',
    `Estimate assumptions: ${BROCHURE_BOND_YEARS}-year bond at ${BROCHURE_ANNUAL_INTEREST_RATE}% annual interest. Income assumes repayment is ${Math.round(
      BROCHURE_MIN_INCOME_RATIO * 100,
    )}% of gross income.`,
  );
  return lines.join('\n');
}

function sanitizePdfText(value: string) {
  return value.replace(/[^\x20-\x7E]/g, '?');
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrapText(value: string, maxLength: number) {
  const text = value.trim();
  if (!text) return [''];
  if (text.length <= maxLength) return [text];

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxLength) {
      current = next;
    } else {
      if (current) lines.push(current);
      if (word.length > maxLength) {
        for (let i = 0; i < word.length; i += maxLength) {
          lines.push(word.slice(i, i + maxLength));
        }
        current = '';
      } else {
        current = word;
      }
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function createSimplePdfBlob(text: string) {
  const rawLines = text.split('\n');
  const wrappedLines = rawLines.flatMap(line => wrapText(sanitizePdfText(line), 95));
  const linesPerPage = 48;
  const pages: string[][] = [];

  for (let i = 0; i < wrappedLines.length; i += linesPerPage) {
    pages.push(wrappedLines.slice(i, i + linesPerPage));
  }
  if (!pages.length) pages.push(['']);

  const objects: string[] = [];
  const catalogObj = 1;
  const pagesObj = 2;
  let nextObj = 3;
  const pageObjs: number[] = [];
  const contentObjs: number[] = [];

  for (let i = 0; i < pages.length; i += 1) {
    pageObjs.push(nextObj++);
    contentObjs.push(nextObj++);
  }
  const fontObj = nextObj++;

  objects[catalogObj] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objects[pagesObj] = `<< /Type /Pages /Kids [${pageObjs.map(id => `${id} 0 R`).join(' ')}] /Count ${pageObjs.length} >>`;

  for (let i = 0; i < pages.length; i += 1) {
    const pageObj = pageObjs[i];
    const contentObj = contentObjs[i];
    const commands = ['BT', '/F1 11 Tf', '50 790 Td', '14 TL'];
    for (const line of pages[i]) {
      commands.push(`(${escapePdfText(line)}) Tj`, 'T*');
    }
    commands.push('ET');
    const stream = commands.join('\n');

    objects[contentObj] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    objects[pageObj] =
      `<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 595 842] ` +
      `/Resources << /Font << /F1 ${fontObj} 0 R >> >> /Contents ${contentObj} 0 R >>`;
  }

  objects[fontObj] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (let i = 1; i < nextObj; i += 1) {
    offsets[i] = pdf.length;
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${nextObj}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < nextObj; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${nextObj} /Root ${catalogObj} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}

function downloadBrochure(item: any) {
  const sourceDocs = Array.isArray(item.sourceDocuments) ? item.sourceDocuments : [];
  const primarySource = sourceDocs.find((doc: any) => typeof doc.fileUrl === 'string' && doc.fileUrl);
  if (primarySource?.fileUrl) {
    window.open(primarySource.fileUrl, '_blank', 'noopener,noreferrer');
    return;
  }
  const text = buildBrochureText(item);
  const blob = createSimplePdfBlob(text);
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeName = String(item.developmentName || 'development')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  anchor.href = href;
  anchor.download = `${safeName || 'development'}-brochure.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(href);
}

function countRequiredApplicationDocs(item: any) {
  return (Array.isArray(item.requiredDocuments) ? item.requiredDocuments : []).filter((doc: any) =>
    Boolean(doc.isRequired),
  ).length;
}

function countSupportingFiles(item: any) {
  return (Array.isArray(item.sourceDocuments) ? item.sourceDocuments : []).filter((doc: any) =>
    Boolean(doc.fileUrl),
  ).length;
}

export default function PartnerDevelopmentsPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedBrandId, setSelectedBrandId] = useState<string>(ALL_FILTER_VALUE);
  const [selectedProvince, setSelectedProvince] = useState<string>(ALL_FILTER_VALUE);
  const [selectedCity, setSelectedCity] = useState<string>(ALL_FILTER_VALUE);
  const [viewMode, setViewMode] = useState<typeof VIEW_MODE_SUBMIT | typeof VIEW_MODE_EXPLORE>(
    VIEW_MODE_SUBMIT,
  );
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
  const modeItems = useMemo(
    () =>
      viewMode === VIEW_MODE_SUBMIT
        ? allItems.filter(item => item.opportunity?.status === 'ready')
        : allItems,
    [allItems, viewMode],
  );

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
      Array.from(new Set(modeItems.map(item => item.province).filter(Boolean) as string[])).sort((a, b) =>
        a.localeCompare(b),
      ),
    [modeItems],
  );

  const cityOptions = useMemo(() => {
    const baseItems =
      selectedProvince === ALL_FILTER_VALUE
        ? modeItems
        : modeItems.filter(item => String(item.province || '') === selectedProvince);
    return Array.from(new Set(baseItems.map(item => item.city).filter(Boolean) as string[])).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [modeItems, selectedProvince]);

  const filteredItems = useMemo(() => {
    const needle = searchText.trim().toLowerCase();
    return modeItems.filter(item => {
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
  }, [modeItems, searchText, selectedBrandId, selectedProvince, selectedCity]);

  const topDevelopments = useMemo(() => filteredItems.slice(0, 10), [filteredItems]);

  const citySummary = useMemo(() => {
    const counters = new Map<string, { total: number; live: number }>();
    for (const item of filteredItems) {
      const city = String(item.city || 'Unspecified city');
      const current = counters.get(city) || { total: 0, live: 0 };
      current.total += 1;
      if (item.opportunity?.status === 'ready') current.live += 1;
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
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <ReferralAppShell>
      <main className="mx-auto w-full max-w-[1420px] px-4 pb-10 pt-6 md:px-7">
        <section className="overflow-hidden rounded-lg border border-primary/15 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-[var(--brand-blue)] via-[var(--info)] to-[var(--brand-blue-hover)] px-5 py-5 text-white md:px-6">
            <p className="text-[10px] font-semibold uppercase text-blue-100">
              Referrer Workspace
            </p>
            <h1 className="mt-1 text-[28px] font-semibold text-white">
              Available Opportunities
            </h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-5 text-[#ece6da]">
              Use Submit mode for opportunities accepting buyers now, or Explore mode for what is coming.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-primary/15 bg-primary/5 px-5 py-4 md:px-6">
            <button
              type="button"
              className={`rounded-md border px-3 py-2 text-[12px] font-semibold ${
                viewMode === VIEW_MODE_SUBMIT
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-primary/15 bg-white text-foreground'
              }`}
              onClick={() => setViewMode(VIEW_MODE_SUBMIT)}
            >
              Submit mode
            </button>
            <button
              type="button"
              className={`rounded-md border px-3 py-2 text-[12px] font-semibold ${
                viewMode === VIEW_MODE_EXPLORE
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-primary/15 bg-white text-foreground'
              }`}
              onClick={() => setViewMode(VIEW_MODE_EXPLORE)}
            >
              Explore mode
            </button>
          </div>

          <div className="grid gap-2 border-b border-primary/15 px-5 py-4 md:grid-cols-4 md:px-6">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                value={searchText}
                onChange={event => setSearchText(event.target.value)}
                placeholder="Search development, city, brand..."
                className="h-9 w-full rounded-md border border-primary/15 bg-white pl-9 pr-3 text-[12px] text-foreground placeholder:text-muted-foreground"
              />
            </label>
            <select
              className="h-9 rounded-md border border-primary/15 bg-white px-3 text-[12px] text-foreground"
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
              className="h-9 rounded-md border border-primary/15 bg-white px-3 text-[12px] text-foreground"
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
              className="h-9 rounded-md border border-primary/15 bg-white px-3 text-[12px] text-foreground"
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
            <p className="text-[11px] text-muted-foreground">
              <SlidersHorizontal className="mr-1 inline h-3.5 w-3.5" />
              Showing{' '}
              <span className="font-semibold text-foreground">{topDevelopments.length}</span> of{' '}
              <span className="font-semibold text-foreground">{filteredItems.length}</span> development
              {filteredItems.length === 1 ? '' : 's'} (top 10)
            </p>
            <button
              type="button"
              className="text-[11px] font-medium text-primary hover:underline"
              onClick={() => setLocation('/distribution/partner/overview')}
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
          <section className="mt-4 rounded-xl border border-border bg-white px-5 py-8 text-center">
            <p className="text-[13px] font-medium text-foreground">No developments match this filter.</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Clear filters or switch to Explore mode to view upcoming opportunities.
            </p>
          </section>
        ) : null}

        <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {topDevelopments.map(item => (
            <article key={item.developmentId} className="overflow-hidden rounded-lg border border-primary/15 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="relative h-40 bg-primary/5">
                <span className="absolute left-3 top-3 rounded bg-primary px-2 py-1 text-[9px] font-semibold uppercase text-primary-foreground">
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
                  <div className="flex h-full w-full items-center justify-center text-foreground/35">
                    <svg width="62" height="44" viewBox="0 0 62 44" fill="none">
                      <rect x="7" y="14" width="48" height="26" rx="2" fill="currentColor" />
                      <polygon points="31,3 56,15 6,15" fill="currentColor" />
                      <rect x="25" y="24" width="12" height="16" fill="white" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="space-y-2 p-4">
                <h2 className="text-[14px] font-semibold text-foreground">{item.developmentName}</h2>
                <p className="text-[11px] text-muted-foreground">
                  {[item.city, item.province].filter(Boolean).join(' - ') || 'Location unavailable'}
                </p>
                {item.brand?.brandName ? (
                  <p className="text-[10px] text-muted-foreground">{item.brand.brandName}</p>
                ) : null}

                <p className="font-mono text-[14px] font-semibold text-foreground">
                  {formatCurrencyRange(item.priceFrom, item.priceTo)}
                </p>
                <div className="rounded-md border border-success/20 bg-success/5 p-2.5">
                  <p className="text-[9px] font-semibold uppercase text-muted-foreground">Estimated reward</p>
                  <p className="mt-1 text-[13px] font-semibold text-success">{getRewardDisplay(item)}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{getPayoutDisplay(item)}</p>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Estimated installment from{' '}
                  {formatCurrency(
                    estimateMonthlyInstallment(pickRepresentativePrice(item.priceFrom, item.priceTo)),
                  )}
                </p>
                <p className="rounded-md border border-primary/10 bg-primary/5 px-2.5 py-2 text-[11px] text-foreground">
                  <span className="font-semibold">Best buyer:</span> {getBuyerProfile(item)}
                </p>

                <p className="text-[10px] text-muted-foreground">
                  {Array.isArray(item.unitTypes) && item.unitTypes.length
                    ? `${item.unitTypes.length} unit type${item.unitTypes.length === 1 ? '' : 's'}`
                    : 'Unit type details available'}
                </p>
                <div className="grid grid-cols-2 gap-2 rounded-md border border-primary/10 bg-primary/5 p-2">
                  <div>
                    <p className="text-[9px] font-semibold uppercase text-muted-foreground">
                      Supporting pack
                    </p>
                    <p className="text-[11px] font-medium text-foreground">
                      {countSupportingFiles(item)} file{countSupportingFiles(item) === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase text-muted-foreground">
                      Application docs
                    </p>
                    <p className="text-[11px] font-medium text-foreground">
                      {countRequiredApplicationDocs(item)} required
                    </p>
                  </div>
                </div>
                <div className="rounded-md border border-primary/10 bg-white p-2">
                  <p className="text-[9px] font-semibold uppercase text-muted-foreground">Sales angle</p>
                  <ul className="mt-1 space-y-1 text-[10px] text-muted-foreground">
                    {getSellingPoints(item).slice(0, 3).map(point => (
                      <li key={point}>- {point}</li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBrochureItem(item)}
                    className="border-primary/15 text-[11px]"
                  >
                    View Brochure
                  </Button>
                  <Button
                    size="sm"
                    variant={item.opportunity?.status === 'ready' ? 'conversion' : 'secondary'}
                    className="text-[11px]"
                    disabled={item.opportunity?.status !== 'ready'}
                    onClick={() => setLocation(`/distribution/partner/submit?developmentId=${item.developmentId}`)}
                  >
                    {item.opportunity?.status === 'ready' ? 'Submit Buyer' : 'Coming Soon'}
                  </Button>
                </div>
                {item.opportunity?.status !== 'ready' ? (
                  <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] text-amber-800">
                    {item.opportunity?.friendlyMessage || 'Referral submissions are not open yet.'}
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </section>

        {!!citySummary.length && (
          <section className="mt-4 rounded-lg border border-primary/15 bg-white px-5 py-4 shadow-sm md:px-6">
            <h3 className="text-[12px] font-semibold text-foreground">City Opportunity Summary</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Snapshot of where opportunities are concentrated.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {citySummary.map(city => (
                <div key={city.city} className="rounded border border-border bg-surface p-2.5">
                  <p className="text-[11px] font-semibold text-foreground">{city.city}</p>
                  <p className="text-[10px] text-muted-foreground">
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
                <div className="rounded border bg-emerald-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Referral Reward</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-700">
                    {getRewardDisplay(brochureItem)}
                  </p>
                </div>
                <div className="rounded border bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Estimated Monthly Installment
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatCurrency(
                      estimateMonthlyInstallment(
                        pickRepresentativePrice(brochureItem.priceFrom, brochureItem.priceTo),
                      ),
                    )}
                  </p>
                </div>
                <div className="rounded border bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Payout Trigger</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{getPayoutDisplay(brochureItem)}</p>
                </div>
              </div>

              <div className="rounded border p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Sales Pack</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{getBuyerProfile(brochureItem)}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {getSellingPoints(brochureItem).map(point => (
                    <div key={point} className="rounded border bg-slate-50 px-2.5 py-2 text-xs text-slate-700">
                      {point}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded border p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Unit Options</p>
                {Array.isArray(brochureItem.unitTypes) && brochureItem.unitTypes.length ? (
                  <div className="mt-2 overflow-hidden rounded border">
                    <table className="w-full border-collapse text-xs">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          <th className="border-b px-2 py-2 text-left font-semibold">Unit Type</th>
                          <th className="border-b px-2 py-2 text-left font-semibold">Price</th>
                          <th className="border-b px-2 py-2 text-left font-semibold">
                            Est. Installment
                          </th>
                          <th className="border-b px-2 py-2 text-left font-semibold">
                            Qualifying Income
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {brochureItem.unitTypes.slice(0, 10).map((unit: any) => {
                          const referencePrice = pickRepresentativePrice(unit.priceFrom, unit.priceTo);
                          const monthlyInstallment = estimateMonthlyInstallment(referencePrice);
                          const qualifyingIncome = estimateQualifyingIncome(monthlyInstallment);
                          return (
                            <tr key={unit.name} className="bg-white text-slate-800">
                              <td className="border-b px-2 py-2">{unit.name || 'Unit'}</td>
                              <td className="border-b px-2 py-2">
                                {formatCurrencyRange(unit.priceFrom, unit.priceTo)}
                              </td>
                              <td className="border-b px-2 py-2">
                                {formatCurrency(monthlyInstallment)}
                              </td>
                              <td className="border-b px-2 py-2">
                                {formatCurrency(qualifyingIncome)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">Unit option details available on request.</p>
                )}
              </div>

              <div className="rounded border p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Estimate Assumptions</p>
                <p className="mt-2 text-sm text-slate-700">
                  {BROCHURE_BOND_YEARS}-year bond at {BROCHURE_ANNUAL_INTEREST_RATE}% annual
                  interest. Qualifying income assumes repayment is{' '}
                  {Math.round(BROCHURE_MIN_INCOME_RATIO * 100)}% of gross monthly income.
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Figures are indicative and subject to lender approval.
                </p>
              </div>

              {Array.isArray(brochureItem.sourceDocuments) && brochureItem.sourceDocuments.length ? (
                <div className="rounded border p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Supporting Pack</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Development-specific files you can share with your buyer before submitting.
                  </p>
                  <div className="mt-2 grid gap-2">
                    {brochureItem.sourceDocuments.map((doc: any) => (
                      <div
                        key={doc.templateId}
                        className="flex items-center justify-between rounded border bg-slate-50 px-2.5 py-2"
                      >
                        <p className="text-sm text-slate-900">
                          {doc.documentLabel || 'Developer document'}
                        </p>
                        {doc.fileName ? (
                          <p className="text-xs text-slate-500">{doc.fileName}</p>
                        ) : null}
                        {doc.fileUrl ? (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium text-primary hover:underline"
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

              <div className="rounded border p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Application Documents</p>
                <p className="mt-1 text-xs text-slate-600">
                  These are the buyer documents needed before the referral can move through
                  qualification.
                </p>
                <div className="mt-2 grid gap-2">
                  {(Array.isArray(brochureItem.requiredDocuments) ? brochureItem.requiredDocuments : [])
                    .sort((a: any, b: any) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
                    .map((doc: any) => (
                      <div
                        key={doc.templateId}
                        className="flex items-center justify-between rounded border bg-slate-50 px-2.5 py-2"
                      >
                        <p className="text-sm text-slate-900">{doc.documentLabel}</p>
                        <span className="text-xs text-slate-500">
                          {doc.isRequired ? 'Required' : 'Optional'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => downloadBrochure(brochureItem)} className="gap-1">
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
                <Button
                  disabled={brochureItem.opportunity?.status !== 'ready'}
                  onClick={() => setLocation(`/distribution/partner/submit?developmentId=${brochureItem.developmentId}`)}
                >
                  {brochureItem.opportunity?.status === 'ready' ? 'Submit Buyer' : 'Coming Soon'}
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </ReferralAppShell>
  );
}
