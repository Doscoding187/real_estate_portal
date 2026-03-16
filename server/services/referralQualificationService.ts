import { and, eq, inArray } from 'drizzle-orm';
import {
  developments,
  distributionAgentAccess,
  distributionPrograms,
  unitTypes,
} from '../../drizzle/schema';
import {
  REFERRAL_CONFIDENCE_LEVEL_VALUES,
  REFERRAL_MATCH_BUCKET_VALUES,
  REFERRAL_QUAL_MODE_VALUES,
  REFERRAL_READINESS_STATUS_VALUES,
} from '../../drizzle/schema/referrals';
import { getDb } from '../db';
import { AFFORDABILITY_DEFAULT_CONFIG } from './affordabilityConfigService';

export type ReferralQualificationMode = (typeof REFERRAL_QUAL_MODE_VALUES)[number];
export type ReferralReadinessStatus = (typeof REFERRAL_READINESS_STATUS_VALUES)[number];
export type ReferralMatchBucket = (typeof REFERRAL_MATCH_BUCKET_VALUES)[number];
export type ReferralConfidenceLevel = (typeof REFERRAL_CONFIDENCE_LEVEL_VALUES)[number];

export type QuickQualificationInput = {
  grossMonthlyIncome: number;
  preferredAreas: string[];
  monthlyDebts?: number | null;
  monthlyExpenses?: number | null;
  dependents?: number | null;
  depositAmount?: number | null;
  employmentType?: string | null;
  docsUploaded?: number | null;
  mode?: ReferralQualificationMode;
};

export type QuickQualificationConfig = {
  annualInterestRatePercent: number;
  termMonths: number;
  maxIncomeRepaymentRatio: number;
  disposableRepaymentRatio: number;
  affordabilityMinFactor: number;
  verifiedRequiredDocuments: number;
};

export type QuickQualificationResult = {
  mode: ReferralQualificationMode;
  affordabilityMin: number;
  affordabilityMax: number;
  monthlyPaymentEstimate: number;
  confidenceScore: number;
  confidenceLevel: ReferralConfidenceLevel;
  confidenceHint: string;
  confidenceFactors: Record<string, boolean>;
  readinessStatus: ReferralReadinessStatus;
  flags: string[];
  assumptions: string[];
  improveAccuracy: string[];
};

type CandidateUnitType = {
  name: string;
  bedrooms: number | null;
  priceFrom: number | null;
  priceTo: number | null;
};

export type DevelopmentCandidate = {
  programId: number;
  developmentId: number;
  developmentName: string;
  suburb: string | null;
  city: string | null;
  province: string | null;
  priceFrom: number | null;
  priceTo: number | null;
  unitTypes: CandidateUnitType[];
};

export type RankedReferralMatch = {
  programId: number;
  developmentId: number;
  developmentName: string;
  areaLabel: string | null;
  rankScore: number;
  rankPosition: number;
  matchBucket: ReferralMatchBucket;
  matchReasons: string[];
  qualifyingUnitTypes: CandidateUnitType[];
  estimatedEntryPrice: number | null;
};

export type MatchDevelopmentsInput = {
  affordabilityMin: number;
  affordabilityMax: number;
  preferredAreas: string[];
  developments: DevelopmentCandidate[];
  mode?: ReferralQualificationMode;
};

export type PdfTemplateInput = {
  clientName: string;
  referenceCode: string;
  generatedAtIso: string;
  affordabilityMin: number;
  affordabilityMax: number;
  mode: ReferralQualificationMode;
  confidenceScore: number;
  confidenceLevel: ReferralConfidenceLevel;
  confidenceHint: string;
  assumptions: string[];
  matches: RankedReferralMatch[];
  uploadLink: string | null;
  agentName: string | null;
  agentEmail: string | null;
  agentPhone: string | null;
};

export const REQUIRED_DOCUMENT_CHECKLIST = [
  '3 months payslips',
  '3 months bank statements',
  'credit report (or consent to retrieve)',
  'ID document',
  'proof of address',
] as const;

function normalizeAreaTokens(preferredAreas: string[]) {
  return preferredAreas
    .map(area => String(area || '').trim().toLowerCase())
    .filter(Boolean);
}

function toPositiveNumber(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return parsed;
}

function toNullableNumber(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function parseMoney(value: unknown) {
  if (value === null || typeof value === 'undefined') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function estimateBaselineLivingCost(dependents: number | null | undefined) {
  const dependentsCount = Math.max(0, Math.floor(Number(dependents || 0)));
  return 9000 + dependentsCount * 1800;
}

function presentValueFromMonthlyPayment(payment: number, monthlyRate: number, months: number) {
  if (payment <= 0 || months <= 0) return 0;
  if (monthlyRate <= 0) return payment * months;
  const factor = (Math.pow(1 + monthlyRate, months) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, months));
  return payment * factor;
}

function buildConfidenceScore(input: QuickQualificationInput) {
  const factors = {
    incomeProvided: toPositiveNumber(input.grossMonthlyIncome) > 0,
    preferredAreasProvided: normalizeAreaTokens(input.preferredAreas || []).length > 0,
    debtsProvided: input.monthlyDebts !== null && typeof input.monthlyDebts !== 'undefined',
    expensesProvided: input.monthlyExpenses !== null && typeof input.monthlyExpenses !== 'undefined',
    dependentsProvided: input.dependents !== null && typeof input.dependents !== 'undefined',
    depositProvided: input.depositAmount !== null && typeof input.depositAmount !== 'undefined',
    employmentProvided: Boolean(String(input.employmentType || '').trim()),
    docsProvided: Number(input.docsUploaded || 0) > 0,
  };

  let score = 0;
  if (factors.incomeProvided) score += 30;
  if (factors.preferredAreasProvided) score += 10;
  if (factors.debtsProvided) score += 15;
  if (factors.expensesProvided) score += 5;
  if (factors.dependentsProvided) score += 8;
  if (factors.depositProvided) score += 10;
  if (factors.employmentProvided) score += 7;
  if (factors.docsProvided) score += 15;

  return {
    confidenceScore: Math.min(100, score),
    confidenceFactors: factors,
  };
}

export function deriveConfidenceLevel(confidenceScore: number): ReferralConfidenceLevel {
  const score = Math.max(0, Math.min(100, Math.round(Number(confidenceScore || 0))));
  if (score >= 90) return 'verified';
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export function confidenceLevelLabel(level: ReferralConfidenceLevel): string {
  if (level === 'verified') return 'Verified Confidence';
  if (level === 'high') return 'High Confidence';
  if (level === 'medium') return 'Medium Confidence';
  return 'Low Confidence';
}

export function confidenceLevelHint(level: ReferralConfidenceLevel): string {
  if (level === 'verified') {
    return 'Very complete input set. Suitable for priority routing.';
  }
  if (level === 'high') {
    return 'Strong completeness. Add documents to push to verified confidence.';
  }
  if (level === 'medium') {
    return 'Reasonable estimate. Add debts, expenses, and docs for tighter accuracy.';
  }
  return 'Limited detail provided. Add more inputs and docs to improve reliability.';
}

function deriveReadinessStatus(
  mode: ReferralQualificationMode,
  docsUploaded: number,
  verifiedRequiredDocuments: number,
): ReferralReadinessStatus {
  if (mode === 'verified_qual') {
    if (docsUploaded >= verifiedRequiredDocuments) return 'verified_estimate';
    if (docsUploaded > 0) return 'under_review';
    return 'awaiting_documents';
  }

  if (docsUploaded > 0) {
    return 'awaiting_documents';
  }

  return 'quick_estimate';
}

function buildFlags(input: QuickQualificationInput, monthlyPaymentEstimate: number, affordabilityMax: number) {
  const grossIncome = toPositiveNumber(input.grossMonthlyIncome);
  const monthlyDebts = Math.max(0, Number(input.monthlyDebts || 0));
  const depositAmount = Math.max(0, Number(input.depositAmount || 0));
  const flags: string[] = [];

  const debtRatio = grossIncome > 0 ? monthlyDebts / grossIncome : 0;
  if (debtRatio > 0.35) {
    flags.push('high_debt_ratio');
  }

  if (monthlyPaymentEstimate < 8000) {
    flags.push('tight_budget');
  }

  if (affordabilityMax > 0 && depositAmount < affordabilityMax * 0.05) {
    flags.push('low_deposit');
  }

  return flags;
}

function buildImproveAccuracy(input: QuickQualificationInput, mode: ReferralQualificationMode, docsUploaded: number) {
  const prompts: string[] = [];
  if (input.monthlyDebts === null || typeof input.monthlyDebts === 'undefined') {
    prompts.push('Add existing debt commitments to tighten the estimate.');
  }
  if (input.monthlyExpenses === null || typeof input.monthlyExpenses === 'undefined') {
    prompts.push('Add monthly expenses to improve repayment realism.');
  }
  if (input.dependents === null || typeof input.dependents === 'undefined') {
    prompts.push('Add number of dependents for household-cost calibration.');
  }
  if (input.depositAmount === null || typeof input.depositAmount === 'undefined') {
    prompts.push('Add expected deposit to improve affordability range.');
  }
  if (!String(input.employmentType || '').trim()) {
    prompts.push('Specify employment type for stronger confidence scoring.');
  }
  if (mode === 'verified_qual' && docsUploaded < 3) {
    prompts.push('Upload payslips and bank statements to reach verified confidence.');
  }
  return prompts;
}

function computeEntryPrice(candidate: DevelopmentCandidate) {
  const devPriceFrom = parseMoney(candidate.priceFrom);
  const devPriceTo = parseMoney(candidate.priceTo);
  const unitPrices = candidate.unitTypes
    .map(unit => parseMoney(unit.priceFrom) ?? parseMoney(unit.priceTo))
    .filter((price): price is number => typeof price === 'number' && price > 0);
  const unitMin = unitPrices.length ? Math.min(...unitPrices) : null;
  return devPriceFrom ?? unitMin ?? devPriceTo ?? null;
}

function qualifyUnitTypes(unitRows: CandidateUnitType[], affordabilityMax: number) {
  const stretchCeiling = affordabilityMax * 1.1;
  return unitRows.filter(unit => {
    const from = parseMoney(unit.priceFrom);
    const to = parseMoney(unit.priceTo);
    const anchor = from ?? to;
    return typeof anchor === 'number' && anchor <= stretchCeiling;
  });
}

function areaLabel(candidate: DevelopmentCandidate) {
  return candidate.suburb || candidate.city || candidate.province || null;
}

function normalizeGeoToken(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase();
}

function isPreferredArea(candidate: DevelopmentCandidate, preferredTokens: string[]) {
  if (preferredTokens.length === 0) return false;
  const haystack = [candidate.suburb, candidate.city, candidate.province]
    .map(value => String(value || '').toLowerCase())
    .filter(Boolean)
    .join(' ');
  return preferredTokens.some(token => haystack.includes(token));
}

function bucketPriority(bucket: ReferralMatchBucket) {
  if (bucket === 'preferred_area') return 0;
  if (bucket === 'nearby_area') return 1;
  if (bucket === 'other_area') return 2;
  return 3;
}

function buildMatchReasons(
  bucket: ReferralMatchBucket,
  withinCoreRange: boolean,
  qualifyingTypes: CandidateUnitType[],
) {
  const reasons: string[] = [];
  reasons.push(withinCoreRange ? 'Within your estimated affordability range' : 'Close to your estimated range (stretch)');
  if (bucket === 'preferred_area') {
    reasons.push('In your preferred area');
  } else if (bucket === 'nearby_area') {
    reasons.push('In a nearby area to your preference');
  } else {
    reasons.push('Alternative area with qualifying options');
  }

  const bedroomLabels = Array.from(
    new Set(
      qualifyingTypes
        .map(unit => (unit.bedrooms && unit.bedrooms > 0 ? `${unit.bedrooms}-bed options` : null))
        .filter((value): value is string => Boolean(value)),
    ),
  );
  if (bedroomLabels.length > 0) {
    reasons.push(`Has ${bedroomLabels.slice(0, 2).join(', ')}`);
  } else if (qualifyingTypes.length > 0) {
    reasons.push('Includes unit types that fit your estimate');
  }

  return reasons;
}

export function computeQuickQualification(
  input: QuickQualificationInput,
  config: Partial<QuickQualificationConfig> = {},
): QuickQualificationResult {
  const resolvedConfig = { ...AFFORDABILITY_DEFAULT_CONFIG, ...config };
  const mode: ReferralQualificationMode = input.mode || 'quick_qual';
  const grossMonthlyIncome = toPositiveNumber(input.grossMonthlyIncome);
  const monthlyDebts = Math.max(0, Number(input.monthlyDebts || 0));
  const monthlyExpensesInput = Math.max(0, Number(input.monthlyExpenses || 0));
  const baselineLivingCost = estimateBaselineLivingCost(input.dependents);
  const effectiveExpenses = Math.max(monthlyExpensesInput, baselineLivingCost);
  const depositAmount = Math.max(0, Number(input.depositAmount || 0));
  const docsUploaded = Math.max(0, Math.floor(Number(input.docsUploaded || 0)));

  const incomeBasedBudget = grossMonthlyIncome * resolvedConfig.maxIncomeRepaymentRatio;
  const disposableIncome = Math.max(0, grossMonthlyIncome - effectiveExpenses - monthlyDebts);
  const disposableBasedBudget = disposableIncome * resolvedConfig.disposableRepaymentRatio;
  const monthlyPaymentEstimate = Math.round(Math.max(0, Math.min(incomeBasedBudget, disposableBasedBudget)));

  const monthlyRate = resolvedConfig.annualInterestRatePercent / 100 / 12;
  const maxLoan = presentValueFromMonthlyPayment(monthlyPaymentEstimate, monthlyRate, resolvedConfig.termMonths);
  const affordabilityMax = Math.max(0, Math.round(maxLoan + depositAmount));
  const affordabilityMin = Math.max(0, Math.round(affordabilityMax * resolvedConfig.affordabilityMinFactor));

  const confidence = buildConfidenceScore(input);
  const confidenceLevel = deriveConfidenceLevel(confidence.confidenceScore);
  const readinessStatus = deriveReadinessStatus(
    mode,
    docsUploaded,
    resolvedConfig.verifiedRequiredDocuments,
  );
  const flags = buildFlags(input, monthlyPaymentEstimate, affordabilityMax);
  const improveAccuracy = buildImproveAccuracy(input, mode, docsUploaded);

  return {
    mode,
    affordabilityMin,
    affordabilityMax,
    monthlyPaymentEstimate,
    confidenceScore: confidence.confidenceScore,
    confidenceLevel,
    confidenceHint: confidenceLevelHint(confidenceLevel),
    confidenceFactors: confidence.confidenceFactors,
    readinessStatus,
    flags,
    assumptions: [
      `Prime-linked stress rate: ${resolvedConfig.annualInterestRatePercent.toFixed(2)}%`,
      `Bond term: ${Math.round(resolvedConfig.termMonths / 12)} years`,
      'Max housing repayment ratio: 33% of gross monthly income',
      'Disposable income safeguard applied before affordability projection',
      'Output is indicative only and not a final credit approval',
    ],
    improveAccuracy,
  };
}

export function matchDevelopments(input: MatchDevelopmentsInput): RankedReferralMatch[] {
  const preferredTokens = normalizeAreaTokens(input.preferredAreas || []);
  const affordabilityMax = Math.max(0, Number(input.affordabilityMax || 0));
  const stretchCeiling = affordabilityMax * 1.15;
  const mode = input.mode || 'quick_qual';
  const qualifyingRows: Array<{
    candidate: DevelopmentCandidate;
    entryPrice: number | null;
    qualifyingUnitTypes: CandidateUnitType[];
    preferred: boolean;
    withinCoreRange: boolean;
    affordabilityScore: number;
    unitCoverageScore: number;
    modeBonus: number;
    cityToken: string;
    provinceToken: string;
  }> = [];

  for (const candidate of input.developments) {
    const entryPrice = computeEntryPrice(candidate);
    const qualifyingUnitTypes = qualifyUnitTypes(candidate.unitTypes || [], affordabilityMax);
    const hasMatchableUnits = qualifyingUnitTypes.length > 0;
    const inRangeByEntryPrice = typeof entryPrice === 'number' ? entryPrice <= stretchCeiling : false;
    if (!hasMatchableUnits && !inRangeByEntryPrice) {
      continue;
    }

    const preferred = isPreferredArea(candidate, preferredTokens);
    const withinCoreRange = typeof entryPrice === 'number' ? entryPrice <= affordabilityMax : hasMatchableUnits;
    const priceGapRatio =
      typeof entryPrice === 'number' && affordabilityMax > 0 ? Math.abs(affordabilityMax - entryPrice) / affordabilityMax : 1;

    const affordabilityScore = withinCoreRange
      ? Math.max(18, Math.round(42 - priceGapRatio * 20))
      : Math.max(10, Math.round(24 - priceGapRatio * 12));
    const unitCoverageScore = Math.min(20, qualifyingUnitTypes.length * 4);
    const modeBonus = mode === 'verified_qual' ? 5 : 0;

    qualifyingRows.push({
      candidate,
      entryPrice,
      qualifyingUnitTypes,
      preferred,
      withinCoreRange,
      affordabilityScore,
      unitCoverageScore,
      modeBonus,
      cityToken: normalizeGeoToken(candidate.city),
      provinceToken: normalizeGeoToken(candidate.province),
    });
  }

  const preferredCityTokens = new Set(
    qualifyingRows.filter(row => row.preferred).map(row => row.cityToken).filter(Boolean),
  );
  const preferredProvinceTokens = new Set(
    qualifyingRows.filter(row => row.preferred).map(row => row.provinceToken).filter(Boolean),
  );

  const rankedRows: RankedReferralMatch[] = qualifyingRows.map(row => {
    let matchBucket: ReferralMatchBucket = 'other_area';
    if (row.preferred) {
      matchBucket = 'preferred_area';
    } else if (
      (row.cityToken && preferredCityTokens.has(row.cityToken)) ||
      (row.provinceToken && preferredProvinceTokens.has(row.provinceToken))
    ) {
      matchBucket = 'nearby_area';
    }

    const areaScore = matchBucket === 'preferred_area' ? 30 : matchBucket === 'nearby_area' ? 18 : 8;
    const rankScore = Math.max(0, areaScore + row.affordabilityScore + row.unitCoverageScore + row.modeBonus);

    return {
      programId: Number(row.candidate.programId),
      developmentId: Number(row.candidate.developmentId),
      developmentName: row.candidate.developmentName,
      areaLabel: areaLabel(row.candidate),
      rankScore,
      rankPosition: 0,
      matchBucket,
      matchReasons: buildMatchReasons(matchBucket, row.withinCoreRange, row.qualifyingUnitTypes),
      qualifyingUnitTypes: row.qualifyingUnitTypes,
      estimatedEntryPrice: row.entryPrice,
    };
  });

  rankedRows.sort((a, b) => {
    if (a.matchBucket !== b.matchBucket) {
      return bucketPriority(a.matchBucket) - bucketPriority(b.matchBucket);
    }
    if (b.rankScore !== a.rankScore) {
      return b.rankScore - a.rankScore;
    }
    const aPrice = typeof a.estimatedEntryPrice === 'number' ? a.estimatedEntryPrice : Number.MAX_SAFE_INTEGER;
    const bPrice = typeof b.estimatedEntryPrice === 'number' ? b.estimatedEntryPrice : Number.MAX_SAFE_INTEGER;
    return aPrice - bPrice;
  });

  return rankedRows.map((row, index) => ({
    ...row,
    rankPosition: index + 1,
  }));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderReferralPdfHtml(input: PdfTemplateInput) {
  const generatedDate = new Date(input.generatedAtIso);
  const generatedLabel = Number.isNaN(generatedDate.getTime())
    ? input.generatedAtIso
    : generatedDate.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
  const confidenceLabel = confidenceLevelLabel(input.confidenceLevel);
  const confidenceHint = input.confidenceHint || confidenceLevelHint(input.confidenceLevel);

  const assumptionsHtml = input.assumptions
    .slice(0, 6)
    .map(assumption => `<li>${escapeHtml(assumption)}</li>`)
    .join('');
  const selectedMatches = input.matches.slice(0, 12);
  const groupedMatches = {
    preferred: selectedMatches.filter(match => match.matchBucket === 'preferred_area'),
    nearby: selectedMatches.filter(match => match.matchBucket === 'nearby_area'),
    other: selectedMatches.filter(
      match => match.matchBucket === 'other_area' || match.matchBucket === 'fallback_area',
    ),
  };
  const renderMatchRows = (matches: RankedReferralMatch[]) =>
    matches
      .map(match => {
        const unitTypes = match.qualifyingUnitTypes
          .slice(0, 3)
          .map(unit => escapeHtml(unit.name))
          .join(', ');
        const reasons = match.matchReasons.map(reason => escapeHtml(reason)).join(' | ');
        return `
          <tr>
            <td>${escapeHtml(match.developmentName)}</td>
            <td>${escapeHtml(match.areaLabel || 'Area not specified')}</td>
            <td>${match.estimatedEntryPrice ? escapeHtml(formatCurrency(match.estimatedEntryPrice)) : 'N/A'}</td>
            <td>${unitTypes || 'Matching unit types available'}</td>
            <td>${reasons}</td>
          </tr>
        `;
      })
      .join('');
  const renderMatchTable = (title: string, matches: RankedReferralMatch[], emptyMessage: string) => `
    <div class="match-group">
      <h3>${escapeHtml(title)}</h3>
      <table>
        <thead>
          <tr>
            <th>Development</th>
            <th>Area</th>
            <th>Price From</th>
            <th>Likely Unit Types</th>
            <th>Why It Matched</th>
          </tr>
        </thead>
        <tbody>
          ${matches.length > 0 ? renderMatchRows(matches) : `<tr><td colspan="5">${escapeHtml(emptyMessage)}</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  const uploadLink = input.uploadLink ? escapeHtml(input.uploadLink) : 'Upload link will be provided by your agent.';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Referral Qualification Summary - ${escapeHtml(input.referenceCode)}</title>
    <style>
      :root {
        --ink: #0f172a;
        --muted: #64748b;
        --line: #e2e8f0;
        --accent: #0f766e;
        --soft: #f8fafc;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Segoe UI", Arial, sans-serif;
        color: var(--ink);
        background: #fff;
      }
      .page {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        padding: 16mm;
        border-bottom: 1px solid var(--line);
      }
      h1, h2, h3, p { margin: 0; }
      .header {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        border-bottom: 2px solid var(--line);
        padding-bottom: 10px;
        margin-bottom: 14px;
      }
      .title {
        font-size: 24px;
        font-weight: 700;
      }
      .meta {
        color: var(--muted);
        font-size: 12px;
        text-align: right;
      }
      .pill {
        display: inline-block;
        background: #ecfeff;
        color: var(--accent);
        border: 1px solid #99f6e4;
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        margin-top: 6px;
      }
      .affordability-box {
        border: 1px solid var(--line);
        background: var(--soft);
        border-radius: 12px;
        padding: 14px;
        margin: 12px 0 14px;
      }
      .affordability-label {
        color: var(--muted);
        font-size: 12px;
        margin-bottom: 6px;
      }
      .affordability-value {
        font-size: 30px;
        font-weight: 700;
        color: var(--accent);
      }
      .confidence {
        margin-top: 8px;
        color: var(--muted);
        font-size: 12px;
      }
      .confidence-level {
        margin-top: 4px;
        font-size: 12px;
        font-weight: 600;
        color: #0f766e;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
        margin-top: 8px;
      }
      th, td {
        border: 1px solid var(--line);
        padding: 7px;
        vertical-align: top;
      }
      th {
        background: #f1f5f9;
        text-align: left;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      .match-group + .match-group {
        margin-top: 10px;
      }
      .match-group h3 {
        margin: 0 0 4px 0;
        font-size: 12px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      .section {
        margin-top: 12px;
      }
      .section h2 {
        font-size: 14px;
        margin-bottom: 6px;
      }
      ul {
        margin: 6px 0 0 18px;
        padding: 0;
      }
      li {
        margin: 3px 0;
        font-size: 12px;
      }
      .disclaimer {
        margin-top: 12px;
        padding: 10px;
        border: 1px dashed #f59e0b;
        background: #fffbeb;
        color: #92400e;
        font-size: 12px;
      }
      .doc-list {
        margin-top: 10px;
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 10px;
        background: var(--soft);
      }
      .upload {
        margin-top: 10px;
        padding: 10px;
        border: 1px solid #bae6fd;
        background: #eff6ff;
        border-radius: 10px;
        font-size: 12px;
      }
      .footer-meta {
        margin-top: 12px;
        font-size: 11px;
        color: var(--muted);
      }
    </style>
  </head>
  <body>
    <section class="page">
      <div class="header">
        <div>
          <h1 class="title">Estimated Affordability Summary</h1>
          <span class="pill">${escapeHtml(input.mode === 'verified_qual' ? 'Verified Qual' : 'Quick Qual')}</span>
        </div>
        <div class="meta">
          <div>Reference: ${escapeHtml(input.referenceCode)}</div>
          <div>Date: ${escapeHtml(generatedLabel)}</div>
          <div>Client: ${escapeHtml(input.clientName)}</div>
        </div>
      </div>

      <div class="affordability-box">
        <p class="affordability-label">Estimated affordability range</p>
        <p class="affordability-value">${escapeHtml(formatCurrency(input.affordabilityMin))} - ${escapeHtml(formatCurrency(input.affordabilityMax))}</p>
        <p class="confidence">Confidence score: ${Math.max(0, Math.min(100, Math.round(input.confidenceScore)))} / 100</p>
        <p class="confidence-level">${escapeHtml(confidenceLabel)}: ${escapeHtml(confidenceHint)}</p>
      </div>

      <div class="section">
        <h2>What you may qualify for</h2>
        ${renderMatchTable('Preferred Area Matches', groupedMatches.preferred, 'No preferred-area matches currently available.')}
        ${renderMatchTable('Nearby Area Matches', groupedMatches.nearby, 'No nearby-area matches currently available.')}
        ${renderMatchTable('Other Area Matches', groupedMatches.other, 'No alternative-area matches currently available.')}
      </div>

      <div class="section">
        <h2>Assumptions used</h2>
        <ul>${assumptionsHtml}</ul>
      </div>

      <div class="disclaimer">
        This is an indicative estimate only. It is not a final bond approval, credit decision, or lending commitment.
      </div>
    </section>

    <section class="page">
      <div class="header">
        <div>
          <h1 class="title">Next Steps</h1>
        </div>
        <div class="meta">
          <div>Reference: ${escapeHtml(input.referenceCode)}</div>
          <div>Status: ${escapeHtml(input.mode === 'verified_qual' ? 'Verified Estimate' : 'Quick Estimate')}</div>
        </div>
      </div>

      <div class="doc-list">
        <h2>Documents for full assessment</h2>
        <ul>
          ${REQUIRED_DOCUMENT_CHECKLIST.map(doc => `<li>${escapeHtml(doc)}</li>`).join('')}
        </ul>
      </div>

      <div class="upload">
        <strong>Secure upload link</strong><br />
        ${uploadLink}
      </div>

      <div class="footer-meta">
        <div>Agent: ${escapeHtml(input.agentName || 'Assigned agent')}</div>
        <div>Email: ${escapeHtml(input.agentEmail || 'Not provided')}</div>
        <div>Phone: ${escapeHtml(input.agentPhone || 'Not provided')}</div>
      </div>

      <div class="disclaimer">
        Consent required: by uploading documents, the client confirms the information is provided for affordability assessment purposes.
      </div>
    </section>
  </body>
</html>`;
}

export function generateReferralReference(now: Date = new Date(), randomToken: string = '') {
  const stamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const token = (randomToken || Math.random().toString(36).slice(2, 10))
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 8)
    .toUpperCase();
  return `RQ-${stamp}-${token}`;
}

export async function listAccessibleDevelopmentCandidates(agentId: number): Promise<DevelopmentCandidate[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const accessRows = await db
    .select({
      programId: distributionAgentAccess.programId,
      developmentId: distributionAgentAccess.developmentId,
      developmentName: developments.name,
      suburb: developments.suburb,
      city: developments.city,
      province: developments.province,
      priceFrom: developments.priceFrom,
      priceTo: developments.priceTo,
    })
    .from(distributionAgentAccess)
    .innerJoin(distributionPrograms, eq(distributionAgentAccess.programId, distributionPrograms.id))
    .innerJoin(developments, eq(distributionAgentAccess.developmentId, developments.id))
    .where(
      and(
        eq(distributionAgentAccess.agentId, agentId),
        eq(distributionAgentAccess.accessStatus, 'active'),
        eq(distributionPrograms.isActive, 1),
        eq(distributionPrograms.isReferralEnabled, 1),
      ),
    );

  const developmentIds: number[] = Array.from(
    new Set(
      accessRows
        .map(row => Number(row.developmentId))
        .filter((value): value is number => Number.isFinite(value) && value > 0),
    ),
  );

  const unitRows = developmentIds.length
    ? await db
        .select({
          developmentId: unitTypes.developmentId,
          name: unitTypes.name,
          bedrooms: unitTypes.bedrooms,
          priceFrom: unitTypes.priceFrom,
          priceTo: unitTypes.priceTo,
          basePriceFrom: unitTypes.basePriceFrom,
          basePriceTo: unitTypes.basePriceTo,
        })
        .from(unitTypes)
        .where(and(inArray(unitTypes.developmentId, developmentIds), eq(unitTypes.isActive, 1)))
    : [];

  const unitsByDevelopment = new Map<number, CandidateUnitType[]>();
  for (const unit of unitRows) {
    const developmentId = Number(unit.developmentId);
    const current = unitsByDevelopment.get(developmentId) || [];
    const priceFrom = parseMoney(unit.priceFrom) ?? parseMoney(unit.basePriceFrom);
    const priceTo = parseMoney(unit.priceTo) ?? parseMoney(unit.basePriceTo) ?? priceFrom;
    current.push({
      name: String(unit.name || '').trim(),
      bedrooms: toNullableNumber(unit.bedrooms),
      priceFrom,
      priceTo,
    });
    unitsByDevelopment.set(developmentId, current);
  }

  return accessRows.map(row => ({
    programId: Number(row.programId),
    developmentId: Number(row.developmentId),
    developmentName: String(row.developmentName || 'Unnamed development'),
    suburb: row.suburb || null,
    city: row.city || null,
    province: row.province || null,
    priceFrom: parseMoney(row.priceFrom),
    priceTo: parseMoney(row.priceTo),
    unitTypes: unitsByDevelopment.get(Number(row.developmentId)) || [],
  }));
}
