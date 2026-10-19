import type { DistributionUnitMedia } from '@shared/distributionUnitMedia';

export const BROCHURE_MAX_VISIBLE_UNITS = 8;

export type BrochureAffordability = {
  policyVersion: string;
  available: boolean;
  annualInterestRate: number | null;
  rateSource: string;
  rateSourceLabel: string;
  rateUpdatedAt: string | null;
  termMonths: number;
  repaymentAllowanceRatio: number;
  disclaimers: string[];
};

export type BrochureUnitMode = {
  availableCount?: number;
  priceFrom?: number | null;
  priceTo?: number | null;
};

export type BrochureUnit = {
  id?: string;
  name?: string | null;
  description?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  size?: number | null;
  imageUrl?: string | null;
  media?: DistributionUnitMedia | null;
  modes?: Partial<Record<string, BrochureUnitMode | undefined>> | null;
};

export type BrochureItem = {
  developmentName: string;
  city?: string | null;
  province?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  unitTypes?: BrochureUnit[] | null;
  affordability?: BrochureAffordability | null;
  programPromotion?: {
    headline?: string | null;
    description?: string | null;
    highlightBullets?: string[] | null;
  } | null;
  campaign?: {
    name?: string | null;
    tagline?: string | null;
    description?: string | null;
    images?: string[] | null;
  } | null;
  brand?: {
    brandName?: string | null;
    logoUrl?: string | null;
  } | null;
};

export type BrochureUnitRow = {
  unit: BrochureUnit;
  referencePrice: number;
  priceFrom: number;
  priceTo: number;
  monthlyRepayment: number | null;
  qualifyingIncome: number | null;
};

const FALLBACK_HIGHLIGHTS = [
  'Modern development living',
  'Access to local amenities',
  'Multiple unit options available',
  'Indicative bond and income estimates included',
];

function positiveNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatBrochureCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'Unavailable';
  if (!Number.isFinite(value) || value < 0) return 'Unavailable';
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatBrochureCurrencyRange(
  priceFrom: number | null | undefined,
  priceTo: number | null | undefined,
): string {
  const from = positiveNumber(priceFrom);
  const to = positiveNumber(priceTo);
  if (from && to && to > from) {
    return `${formatBrochureCurrency(from)} - ${formatBrochureCurrency(to)}`;
  }
  if (from) return `From ${formatBrochureCurrency(from)}`;
  if (to) return formatBrochureCurrency(to);
  return 'Price on request';
}

export function estimateBrochureMonthlyRepayment(
  price: number | null | undefined,
  affordability: BrochureAffordability | null | undefined,
): number | null {
  const principal = positiveNumber(price);
  if (!principal || !affordability?.available) return null;
  const annualInterestRate = positiveNumber(affordability.annualInterestRate);
  const termMonths = positiveNumber(affordability.termMonths);
  if (!annualInterestRate || !termMonths) return null;

  const monthlyRate = annualInterestRate / 12 / 100;
  if (!Number.isFinite(monthlyRate) || monthlyRate <= 0) return null;
  const growth = Math.pow(1 + monthlyRate, termMonths);
  if (!Number.isFinite(growth) || growth <= 1) return null;

  const payment = principal * ((monthlyRate * growth) / (growth - 1));
  return Number.isFinite(payment) && payment > 0 ? payment : null;
}

export function estimateBrochureQualifyingIncome(
  monthlyRepayment: number | null | undefined,
  affordability: BrochureAffordability | null | undefined,
): number | null {
  const monthly = positiveNumber(monthlyRepayment);
  if (!affordability?.available) return null;
  const ratio = positiveNumber(affordability.repaymentAllowanceRatio);
  if (!monthly || !ratio || ratio >= 1) return null;
  const income = monthly / ratio;
  return Number.isFinite(income) && income > 0 ? income : null;
}

function buildBrochureUnitRows(item: BrochureItem): BrochureUnitRow[] {
  const unitTypes = Array.isArray(item.unitTypes) ? item.unitTypes : [];
  return unitTypes.flatMap(unit => {
    const saleMode = unit.modes?.sale;
    const priceFrom = positiveNumber(saleMode?.priceFrom);
    const priceTo = positiveNumber(saleMode?.priceTo) ?? priceFrom;
    const referencePrice = priceFrom ?? priceTo;
    if (!referencePrice) return [];
    const monthlyRepayment = estimateBrochureMonthlyRepayment(referencePrice, item.affordability);
    return [
      {
        unit,
        referencePrice,
        priceFrom: priceFrom ?? referencePrice,
        priceTo: priceTo ?? referencePrice,
        monthlyRepayment,
        qualifyingIncome: estimateBrochureQualifyingIncome(monthlyRepayment, item.affordability),
      },
    ];
  });
}

export function getBrochureUnitRows(item: BrochureItem): {
  visibleRows: BrochureUnitRow[];
  hiddenUnitCount: number;
} {
  const rows = buildBrochureUnitRows(item);

  rows.sort((left, right) => {
    const leftSize = positiveNumber(left.unit.size) ?? Number.MAX_SAFE_INTEGER;
    const rightSize = positiveNumber(right.unit.size) ?? Number.MAX_SAFE_INTEGER;
    if (leftSize !== rightSize) return leftSize - rightSize;
    return String(left.unit.name || '').localeCompare(String(right.unit.name || ''));
  });

  const visibleRows = rows.slice(0, BROCHURE_MAX_VISIBLE_UNITS);
  return {
    visibleRows,
    hiddenUnitCount: Math.max(rows.length - visibleRows.length, 0),
  };
}

export function getMinimumBrochureQualifyingIncome(item: BrochureItem): number | null {
  const incomes = buildBrochureUnitRows(item)
    .map(row => row.qualifyingIncome)
    .filter((income): income is number => typeof income === 'number' && income > 0);
  return incomes.length ? Math.min(...incomes) : null;
}

export function getBrochureHighlights(item: BrochureItem): string[] {
  const bullets = (item.programPromotion?.highlightBullets ?? [])
    .map(value => String(value).trim())
    .filter(Boolean);
  if (bullets.length) return bullets.slice(0, 6);
  return FALLBACK_HIGHLIGHTS;
}

function formatUnitSpecs(unit: BrochureUnit): string {
  const parts: string[] = [];
  const size = positiveNumber(unit.size);
  if (size) parts.push(`${Math.round(size)}m2`);
  const bedrooms = positiveNumber(unit.bedrooms);
  if (bedrooms) parts.push(`${bedrooms} bed`);
  const bathrooms = positiveNumber(unit.bathrooms);
  if (bathrooms) parts.push(`${bathrooms} bath`);
  return parts.join('  ');
}

function affordabilityNote(affordability: BrochureAffordability | null | undefined): string {
  if (!affordability?.available || !affordability.annualInterestRate) {
    return 'Affordability estimates are temporarily unavailable because the prime rate is not configured.';
  }
  const rate = affordability.annualInterestRate.toFixed(2);
  const termMonths = affordability.termMonths;
  const allowance = Math.round(affordability.repaymentAllowanceRatio * 100);
  const updated = affordability.rateUpdatedAt
    ? ` Rate updated ${escapeHtml(affordability.rateUpdatedAt)}.`
    : '';
  return `Estimates use a ${termMonths}-month bond at ${rate}% (${escapeHtml(
    affordability.rateSourceLabel,
  )}).${updated} Qualifying income assumes repayment is ${allowance}% of gross monthly income. These figures are indicative only and are not a lender decision.`;
}

export function buildBrochureHtml(item: BrochureItem): string {
  const location = [item.city, item.province].filter(Boolean).join(' | ');
  const highlights = getBrochureHighlights(item);
  const { visibleRows, hiddenUnitCount } = getBrochureUnitRows(item);
  const brandName = item.brand?.brandName || 'Listify Property';
  const heroImage = item.imageUrl || item.campaign?.images?.[0] || '';
  const description = item.description || item.programPromotion?.description || '';
  const affordabilityAvailable = Boolean(item.affordability?.available);

  const rows = visibleRows.length
    ? visibleRows
        .map(row => {
          const specs = formatUnitSpecs(row.unit);
          return `
            <tr>
              <td><span class="home-icon">&#8962;</span>${escapeHtml(specs || row.unit.name || 'Unit')}</td>
              <td>${escapeHtml(row.unit.name || 'Unit')}</td>
              <td>${escapeHtml(formatBrochureCurrencyRange(row.priceFrom, row.priceTo))}</td>
              <td>${escapeHtml(
                affordabilityAvailable
                  ? formatBrochureCurrency(row.monthlyRepayment)
                  : 'Unavailable',
              )}</td>
              <td>${escapeHtml(
                affordabilityAvailable
                  ? formatBrochureCurrency(row.qualifyingIncome)
                  : 'Unavailable',
              )}</td>
            </tr>`;
        })
        .join('')
    : `<tr><td colspan="5">Unit options available on request.</td></tr>`;

  return `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(item.developmentName)} Brochure</title>
        <style>
          @page { size: A4; margin: 0; }
          * { box-sizing: border-box; }
          body { margin: 0; background: #f3f4f6; color: #111827; font-family: Arial, Helvetica, sans-serif; }
          .sheet { width: 210mm; height: 297mm; margin: 0 auto; background: white; overflow: hidden; }
          .header { min-height: 31mm; display: flex; align-items: center; padding: 10mm 18mm 6mm; }
          .location { margin-top: 4px; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; }
          h1 { margin: 0; max-width: 150mm; font-size: 31px; line-height: 1; letter-spacing: .04em; text-transform: uppercase; }
          .hero { height: 96mm; background: #d1d5db; }
          .hero img { width: 100%; height: 100%; object-fit: cover; display: block; }
          .hero-empty { height: 100%; display: flex; align-items: center; justify-content: center; color: #6b7280; font-size: 18px; }
          .description { padding: 6mm 18mm 5mm; font-size: 11px; line-height: 1.4; color: #374151; }
          table { width: 100%; border-collapse: collapse; border-top: 1.5px solid #111; border-bottom: 1.5px solid #111; }
          th { padding: 2.1mm 4mm 1.6mm; font-size: 8px; text-align: left; text-transform: uppercase; color: #4b5563; border-bottom: 1px solid #111; }
          td { padding: 2.15mm 4mm; font-size: 11px; font-weight: 700; border-bottom: 1px solid #111; vertical-align: middle; }
          .home-icon { color: #6b7280; display: inline-block; min-width: 9mm; font-size: 16px; }
          .unit-note { padding: 2mm 18mm 0; font-size: 9px; color: #374151; }
          .assumptions { padding: 3mm 18mm; font-size: 8.5px; color: #4b5563; border-bottom: 1px solid #d1d5db; }
          .amenities { display: grid; grid-template-columns: repeat(6, 1fr); gap: 5mm; padding: 6mm 18mm 5mm; border-bottom: 1px solid #d1d5db; text-align: center; }
          .amenity { font-size: 9px; line-height: 1.05; color: #111827; }
          .amenity-mark { margin: 0 auto 2mm; width: 10mm; height: 10mm; border: 1px solid #111; border-radius: 999px; display: flex; align-items: center; justify-content: center; font-size: 12px; }
          .footer { display: flex; justify-content: flex-end; align-items: center; gap: 6mm; padding: 6mm 18mm; }
          .footer-logo { max-height: 13mm; max-width: 42mm; object-fit: contain; }
          .footer-brand { font-size: 14px; font-weight: 800; letter-spacing: .03em; color: #1f2937; }
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
          </section>
          <section class="hero">
            ${heroImage ? `<img src="${escapeHtml(heroImage)}" alt="">` : '<div class="hero-empty">Development image</div>'}
          </section>
          ${
            description
              ? `<section class="description">${escapeHtml(String(description).slice(0, 360))}</section>`
              : ''
          }
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
          <section class="assumptions">${affordabilityNote(item.affordability)}</section>
          <section class="amenities">
            ${highlights
              .slice(0, 6)
              .map(
                text =>
                  `<div class="amenity"><div class="amenity-mark">&#10003;</div>${escapeHtml(text)}</div>`,
              )
              .join('')}
          </section>
          <section class="footer">
            ${item.brand?.logoUrl ? `<img class="footer-logo" src="${escapeHtml(item.brand.logoUrl)}" alt="">` : ''}
            <div class="footer-brand">${escapeHtml(brandName)}</div>
          </section>
        </main>
      </body>
    </html>`;
}

export function openBrochurePrintWindow(item: BrochureItem): boolean {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.print();
    return false;
  }
  printWindow.document.open();
  printWindow.document.write(buildBrochureHtml(item));
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 350);
  return true;
}
