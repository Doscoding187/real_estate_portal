import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Check, Download, ExternalLink, Home, Loader2, Mail, MapPin, Phone, Search, SlidersHorizontal } from 'lucide-react';
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
const BROCHURE_MAX_VISIBLE_UNITS = 8;

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

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function parseTextList(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .flatMap(item => parseTextList(item))
      .map(item => item.trim())
      .filter(Boolean);
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .flatMap(item => parseTextList(item))
      .map(item => item.trim())
      .filter(Boolean);
  }

  const text = String(value || '').trim();
  if (!text) return [];
  if (text.startsWith('[') || text.startsWith('{')) {
    try {
      return parseTextList(JSON.parse(text));
    } catch {
      return [];
    }
  }

  return text
    .split(/\r?\n|,|;|\u2022/g)
    .map(item => item.replace(/^[-*]+/, '').trim())
    .filter(Boolean);
}

function getBrochureHighlights(item: any) {
  const highlights = [
    ...parseTextList(item.features),
    ...parseTextList(item.amenities),
  ];
  const unique = Array.from(new Map(highlights.map(value => [value.toLowerCase(), value])).values());
  if (unique.length) return unique.slice(0, 6);
  return [
    'Modern development living',
    'Access to local amenities',
    'Multiple unit options available',
    'Indicative bond and income estimates included',
  ];
}

function formatUnitSpecs(unit: any) {
  const parts: string[] = [];
  if (unit.unitSize) parts.push(`${Math.round(Number(unit.unitSize))}m2`);
  if (unit.bedrooms) parts.push(`${Number(unit.bedrooms)} bed`);
  if (unit.bathrooms) parts.push(`${Number(unit.bathrooms)} bath`);
  return parts.join('  ');
}

function getBrochureUnitRows(item: any) {
  const unitTypes = Array.isArray(item?.unitTypes) ? item.unitTypes : [];
  const visibleUnits = unitTypes.slice(0, BROCHURE_MAX_VISIBLE_UNITS);
  return {
    visibleUnits,
    hiddenUnitCount: Math.max(unitTypes.length - visibleUnits.length, 0),
  };
}

function buildPrintableBrochureHtml(item: any) {
  const location = [item.suburb, item.city, item.province].filter(Boolean).join(' | ');
  const highlights = getBrochureHighlights(item);
  const { visibleUnits, hiddenUnitCount } = getBrochureUnitRows(item);
  const brandName = item.brand?.brandName || 'Listify Property';
  const contactName = item.brochure?.contactName || 'Sales';
  const contactPhone = item.brochure?.contactPhone || 'On request';
  const contactEmail = item.brochure?.contactEmail || item.brand?.publicContactEmail || 'sales@listify.co.za';
  const heroImage = item.imageUrl || '';

  const rows = visibleUnits.length
    ? visibleUnits
        .map((unit: any) => {
          const referencePrice = pickRepresentativePrice(unit.priceFrom, unit.priceTo);
          const monthlyInstallment = estimateMonthlyInstallment(referencePrice);
          const qualifyingIncome = estimateQualifyingIncome(monthlyInstallment);
          return `
            <tr>
              <td><span class="home-icon">&#8962;</span>${escapeHtml(formatUnitSpecs(unit) || unit.name || 'Unit')}</td>
              <td>${escapeHtml(unit.name || 'Unit')}</td>
              <td>${escapeHtml(formatCurrencyRange(unit.priceFrom, unit.priceTo))}</td>
              <td>${escapeHtml(formatCurrency(monthlyInstallment))}</td>
              <td>${escapeHtml(formatCurrency(qualifyingIncome))}</td>
            </tr>`;
        })
        .join('')
    : `<tr><td colspan="5">Unit options available on request.</td></tr>`;

  return `<!doctype html>
    <html>
      <head>
        <title>${escapeHtml(item.developmentName)} Brochure</title>
        <style>
          @page { size: A4; margin: 0; }
          * { box-sizing: border-box; }
          body { margin: 0; background: #f3f4f6; color: #111827; font-family: Arial, Helvetica, sans-serif; }
          .sheet { width: 210mm; height: 297mm; margin: 0 auto; background: white; overflow: hidden; }
          .header { height: 34mm; display: flex; align-items: center; justify-content: space-between; padding: 11mm 18mm 7mm; }
          .brand { text-align: right; }
          .brand img { max-height: 20mm; max-width: 52mm; object-fit: contain; margin-bottom: 3mm; }
          .brand-name { font-size: 18px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
          .location { margin-top: 4px; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; }
          h1 { margin: 0; max-width: 95mm; font-size: 29px; line-height: 1; letter-spacing: .04em; text-transform: uppercase; }
          .hero { height: 82mm; background: #d1d5db; }
          .hero img { width: 100%; height: 100%; object-fit: cover; display: block; }
          .hero-empty { height: 100%; display: flex; align-items: center; justify-content: center; color: #6b7280; font-size: 18px; }
          .description { padding: 6mm 18mm 2mm; font-size: 11px; line-height: 1.4; color: #374151; }
          .highlights { display: grid; grid-template-columns: 1fr 1fr; gap: 1.8mm 12mm; padding: 4mm 18mm 6mm; font-size: 13px; }
          .highlight:before { content: "\\2713"; margin-right: 7px; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; border-top: 1.5px solid #111; border-bottom: 1.5px solid #111; }
          th { padding: 2.1mm 4mm 1.6mm; font-size: 8px; text-align: left; text-transform: uppercase; color: #4b5563; border-bottom: 1px solid #111; }
          td { padding: 2.15mm 4mm; font-size: 11px; font-weight: 700; border-bottom: 1px solid #111; vertical-align: middle; }
          td:nth-child(4), td:nth-child(5) { font-size: 11px; }
          .home-icon { color: #6b7280; display: inline-block; min-width: 9mm; font-size: 16px; }
          .unit-note { padding: 2mm 18mm 0; font-size: 9px; color: #374151; }
          .assumptions { padding: 3mm 18mm; font-size: 8.5px; color: #4b5563; border-bottom: 1px solid #d1d5db; }
          .amenities { display: grid; grid-template-columns: repeat(6, 1fr); gap: 5mm; padding: 6mm 18mm 5mm; border-bottom: 1px solid #d1d5db; text-align: center; }
          .amenity { font-size: 9px; line-height: 1.05; color: #111827; }
          .amenity-mark { margin: 0 auto 2mm; width: 10mm; height: 10mm; border: 1px solid #111; border-radius: 999px; display: flex; align-items: center; justify-content: center; font-size: 12px; }
          .footer { display: flex; justify-content: space-between; align-items: center; padding: 6mm 18mm; }
          .footer-brand { font-size: 14px; font-weight: 800; letter-spacing: .03em; color: #1f2937; }
          .contact { text-align: right; }
          .contact-title { font-size: 18px; font-weight: 800; letter-spacing: .14em; }
          .contact-line { margin-top: 3mm; font-size: 11px; color: #374151; }
          @media print {
            body { background: white; }
            .sheet { margin: 0; width: 210mm; height: 297mm; }
          }
        </style>
      </head>
      <body>
        <main class="sheet">
          <section class="header">
            <div>
              <h1>${escapeHtml(item.developmentName)}</h1>
              <div class="location">${escapeHtml(location || 'South Africa')}</div>
            </div>
            <div class="brand">
              ${item.brand?.logoUrl ? `<img src="${escapeHtml(item.brand.logoUrl)}" alt="">` : ''}
              <div class="brand-name">${escapeHtml(brandName)}</div>
            </div>
          </section>
          <section class="hero">
            ${heroImage ? `<img src="${escapeHtml(heroImage)}" alt="">` : '<div class="hero-empty">Development image</div>'}
          </section>
          ${
            item.description
              ? `<section class="description">${escapeHtml(String(item.description)).slice(0, 360)}</section>`
              : ''
          }
          <section class="highlights">
            ${highlights.map(text => `<div class="highlight">${escapeHtml(text)}</div>`).join('')}
          </section>
          <table>
            <thead>
              <tr>
                <th>Unit</th>
                <th>Type</th>
                <th>Price</th>
                <th>Est. Bond Payment</th>
                <th>Qualifying Income</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          ${
            hiddenUnitCount > 0
              ? `<section class="unit-note">Additional unit options available on request. ${hiddenUnitCount} more option${
                  hiddenUnitCount === 1 ? '' : 's'
                } not shown on this A4 summary.</section>`
              : ''
          }
          <section class="assumptions">
            Estimates use a ${BROCHURE_BOND_YEARS}-year bond at ${BROCHURE_ANNUAL_INTEREST_RATE}% annual interest. Qualifying income assumes repayment is ${Math.round(
              BROCHURE_MIN_INCOME_RATIO * 100,
            )}% of gross monthly income. Figures are indicative and subject to lender approval.
          </section>
          <section class="amenities">
            ${highlights
              .slice(0, 6)
              .map(text => `<div class="amenity"><div class="amenity-mark">&#10003;</div>${escapeHtml(text)}</div>`)
              .join('')}
          </section>
          <section class="footer">
            <div class="footer-brand">${escapeHtml(brandName)}</div>
            <div class="contact">
              <div class="contact-title">CONTACT ${escapeHtml(contactName).toUpperCase()}</div>
              <div class="contact-line">${escapeHtml(contactPhone)} &nbsp; ${escapeHtml(contactEmail)}</div>
            </div>
          </section>
        </main>
      </body>
    </html>`;
}

function downloadBrochure(item: any) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.print();
    return;
  }
  printWindow.document.open();
  printWindow.document.write(buildPrintableBrochureHtml(item));
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 350);
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
                      Bond estimate
                    </p>
                    <p className="text-[11px] font-medium text-foreground">
                      {formatCurrency(
                        estimateMonthlyInstallment(pickRepresentativePrice(item.priceFrom, item.priceTo)),
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase text-muted-foreground">
                      Income from
                    </p>
                    <p className="text-[11px] font-medium text-foreground">
                      {formatCurrency(
                        estimateQualifyingIncome(
                          estimateMonthlyInstallment(pickRepresentativePrice(item.priceFrom, item.priceTo)),
                        ),
                      )}
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
                    Open Brochure
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
        <DialogContent className="max-h-[92vh] overflow-y-auto bg-slate-100 sm:max-w-5xl">
          {brochureItem ? (
            <>
              <DialogHeader>
                <DialogTitle>{brochureItem.developmentName}</DialogTitle>
                <DialogDescription>
                  {[brochureItem.suburb, brochureItem.city, brochureItem.province].filter(Boolean).join(' | ') ||
                    'Location unavailable'}
                </DialogDescription>
              </DialogHeader>

              <div className="mx-auto w-full max-w-[794px] overflow-hidden bg-white text-slate-950 shadow-xl">
                <section className="flex min-h-[128px] items-center justify-between px-10 py-8">
                  <div>
                    <h2 className="max-w-[430px] text-[30px] font-black uppercase leading-none tracking-wide">
                      {brochureItem.developmentName}
                    </h2>
                    <p className="mt-3 flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-slate-600">
                      <MapPin className="h-3.5 w-3.5" />
                      {[brochureItem.suburb, brochureItem.city, brochureItem.province].filter(Boolean).join(' | ') ||
                        'South Africa'}
                    </p>
                  </div>
                  <div className="text-right">
                    {brochureItem.brand?.logoUrl ? (
                      <img
                        src={brochureItem.brand.logoUrl}
                        alt=""
                        className="ml-auto max-h-14 max-w-44 object-contain"
                      />
                    ) : null}
                    <p className="mt-2 text-[18px] font-black uppercase tracking-[0.16em]">
                      {brochureItem.brand?.brandName || 'Listify Property'}
                    </p>
                  </div>
                </section>

                <section className="h-[348px] bg-slate-200">
                  {brochureItem.imageUrl ? (
                    <img
                      src={brochureItem.imageUrl}
                      alt={brochureItem.developmentName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      Development image
                    </div>
                  )}
                </section>

                {brochureItem.description ? (
                  <section className="px-10 pb-2 pt-6 text-[13px] leading-6 text-slate-700">
                    {String(brochureItem.description).slice(0, 360)}
                  </section>
                ) : null}

                <section className="grid grid-cols-2 gap-x-10 gap-y-2 px-10 py-6 text-[15px]">
                  {getBrochureHighlights(brochureItem).slice(0, 6).map(highlight => (
                    <p key={highlight} className="leading-6">
                      <Check className="mr-2 inline h-4 w-4 stroke-[3]" />
                      {highlight}
                    </p>
                  ))}
                </section>

                <section className="border-y border-slate-950">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="text-[9px] uppercase tracking-wide text-slate-500">
                        <th className="px-5 py-2 font-semibold">Unit</th>
                        <th className="px-3 py-2 font-semibold">Price</th>
                        <th className="px-3 py-2 font-semibold">Est. Bond Payment</th>
                        <th className="px-5 py-2 font-semibold">Qualifying Income</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getBrochureUnitRows(brochureItem).visibleUnits.length ? (
                        getBrochureUnitRows(brochureItem).visibleUnits.map((unit: any) => {
                          const referencePrice = pickRepresentativePrice(unit.priceFrom, unit.priceTo);
                          const monthlyInstallment = estimateMonthlyInstallment(referencePrice);
                          const qualifyingIncome = estimateQualifyingIncome(monthlyInstallment);
                          return (
                            <tr key={`${unit.name}-${unit.priceFrom}-${unit.priceTo}`} className="border-t border-slate-950">
                              <td className="px-5 py-3 text-[14px]">
                                <span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-400 text-slate-500">
                                  <Home className="h-4 w-4" />
                                </span>
                                <span className="font-semibold">
                                  {formatUnitSpecs(unit) || unit.name || 'Unit'}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-[14px] font-black">
                                {formatCurrencyRange(unit.priceFrom, unit.priceTo)}
                              </td>
                              <td className="px-3 py-3">
                                <p className="text-[10px] text-slate-500">Estimated Bond Payment</p>
                                <p className="text-[14px] font-black">{formatCurrency(monthlyInstallment)}</p>
                              </td>
                              <td className="px-5 py-3">
                                <p className="text-[10px] text-slate-500">Qualifying income</p>
                                <p className="text-[14px] font-black">{formatCurrency(qualifyingIncome)}</p>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-5 py-6 text-sm text-slate-600">
                            Unit option details available on request.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </section>

                {getBrochureUnitRows(brochureItem).hiddenUnitCount > 0 ? (
                  <section className="border-b border-slate-200 px-10 py-2 text-[11px] text-slate-600">
                    Additional unit options available on request. {getBrochureUnitRows(brochureItem).hiddenUnitCount}{' '}
                    more option
                    {getBrochureUnitRows(brochureItem).hiddenUnitCount === 1 ? '' : 's'} not shown on this A4
                    summary.
                  </section>
                ) : null}

                <section className="border-b border-slate-200 px-10 py-3 text-[10px] leading-4 text-slate-500">
                  Estimates use a {BROCHURE_BOND_YEARS}-year bond at {BROCHURE_ANNUAL_INTEREST_RATE}% annual
                  interest. Qualifying income assumes repayment is {Math.round(BROCHURE_MIN_INCOME_RATIO * 100)}%
                  of gross monthly income. Figures are indicative and subject to lender approval.
                </section>

                <section className="grid grid-cols-3 gap-4 border-b border-slate-200 px-10 py-6 text-center sm:grid-cols-6">
                  {getBrochureHighlights(brochureItem).slice(0, 6).map(highlight => (
                    <div key={`amenity-${highlight}`} className="text-[10px] leading-tight text-slate-700">
                      <span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full border border-slate-900 font-semibold">
                        <Check className="h-4 w-4 stroke-[3]" />
                      </span>
                      {highlight}
                    </div>
                  ))}
                </section>

                <section className="flex items-center justify-between px-10 py-7">
                  <p className="text-[18px] font-black tracking-wide text-slate-700">
                    {brochureItem.brand?.brandName || 'Listify Property'}
                  </p>
                  <div className="text-right">
                    <p className="text-[18px] font-black uppercase tracking-[0.18em]">
                      Contact {brochureItem.brochure?.contactName || 'Sales'}
                    </p>
                    <div className="mt-2 flex flex-wrap justify-end gap-4 text-[12px] text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {brochureItem.brochure?.contactPhone || 'On request'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {brochureItem.brochure?.contactEmail ||
                          brochureItem.brand?.publicContactEmail ||
                          'sales@listify.co.za'}
                      </span>
                    </div>
                  </div>
                </section>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => downloadBrochure(brochureItem)} className="gap-1">
                  <Download className="h-4 w-4" />
                  Print / Download PDF
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
