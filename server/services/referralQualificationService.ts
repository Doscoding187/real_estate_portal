export const REQUIRED_DOCUMENT_CHECKLIST = [
  'Latest payslip',
  'Latest bank statement',
  'Credit report',
  'ID document',
  'Proof of address',
] as const;

export type ReferralConfidenceLevel = 'low' | 'medium' | 'high' | 'verified';
export type ReferralQualificationMode = 'quick_qual' | 'verified_qual';
export type ReferralReadinessStatus =
  | 'quick_estimate'
  | 'awaiting_documents'
  | 'under_review'
  | 'verified_estimate'
  | 'matched_to_development'
  | 'submitted_to_partner';

export type QuickQualificationInput = {
  mode: ReferralQualificationMode;
  grossMonthlyIncome: number;
  preferredAreas: string[];
  monthlyDebts?: number | null;
  monthlyExpenses?: number | null;
  dependents?: number | null;
  depositAmount?: number | null;
  employmentType?: string | null;
  docsUploaded?: number | null;
};

export type QuickQualificationResult = {
  affordabilityMin: number;
  affordabilityMax: number;
  monthlyPaymentEstimate: number;
  confidenceScore: number;
  confidenceLevel: ReferralConfidenceLevel;
  confidenceFactors: string[];
  readinessStatus: ReferralReadinessStatus;
  flags: string[];
  assumptions: string[];
  improveAccuracy: string[];
};

export type DevelopmentCandidate = {
  programId: number;
  developmentId: number;
  developmentName: string;
  areaLabel: string | null;
  priceFrom?: number | null;
  priceTo?: number | null;
};

export type RankedReferralMatch = {
  programId: number;
  developmentId: number;
  developmentName: string;
  areaLabel: string | null;
  rankScore: number;
  rankPosition: number;
  matchBucket: 'preferred_area' | 'nearby_area' | 'other_area' | 'fallback_area';
  matchReasons: string[];
  qualifyingUnitTypes: Array<{
    name: string;
    bedrooms: number | null;
    priceFrom: number | null;
    priceTo: number | null;
  }>;
  estimatedEntryPrice: number | null;
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

export function deriveConfidenceLevel(score: number): ReferralConfidenceLevel {
  if (score >= 85) return 'verified';
  if (score >= 70) return 'high';
  if (score >= 45) return 'medium';
  return 'low';
}

export function confidenceLevelHint(level: ReferralConfidenceLevel): string {
  if (level === 'verified') return 'Verified affordability data supplied.';
  if (level === 'high') return 'Strong data quality and affordability fit.';
  if (level === 'medium') return 'Indicative fit, but more detail would improve accuracy.';
  return 'Low confidence estimate. Additional documents are recommended.';
}

export function computeQuickQualification(
  input: QuickQualificationInput,
  _config: Record<string, unknown>,
): QuickQualificationResult {
  const gross = Math.max(0, Number(input.grossMonthlyIncome || 0));
  const debts = Math.max(0, Number(input.monthlyDebts || 0));
  const expenses = Math.max(0, Number(input.monthlyExpenses || 0));
  const deposit = Math.max(0, Number(input.depositAmount || 0));
  const docsUploaded = Math.max(0, Number(input.docsUploaded || 0));
  const serviceableIncome = Math.max(0, gross - debts - expenses);
  const affordabilityMax = Math.round(serviceableIncome * 60 + deposit);
  const affordabilityMin = Math.max(0, Math.round(affordabilityMax * 0.75));
  const confidenceScore = Math.max(15, Math.min(95, 40 + docsUploaded * 10));
  const confidenceLevel = deriveConfidenceLevel(confidenceScore);
  const readinessStatus: ReferralReadinessStatus =
    input.mode === 'verified_qual'
      ? docsUploaded >= 3
        ? 'verified_estimate'
        : 'under_review'
      : 'quick_estimate';

  return {
    affordabilityMin,
    affordabilityMax,
    monthlyPaymentEstimate: Math.round(affordabilityMax / 240),
    confidenceScore,
    confidenceLevel,
    confidenceFactors: docsUploaded > 0 ? ['documents_uploaded'] : ['self_reported_income_only'],
    readinessStatus,
    flags: affordabilityMax > 0 ? [] : ['insufficient_income_data'],
    assumptions: [
      'Indicative estimate based on supplied income and debt profile.',
      'Final affordability remains subject to lender approval.',
    ],
    improveAccuracy:
      docsUploaded >= 3
        ? []
        : ['Upload supporting affordability documents to increase confidence.'],
  };
}

export function generateReferralReference(at: Date, seed: string): string {
  const datePart = at.toISOString().slice(0, 10).replace(/-/g, '');
  return `REF-${datePart}-${seed.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase()}`;
}

export async function listAccessibleDevelopmentCandidates(
  _agentId: number,
): Promise<DevelopmentCandidate[]> {
  return [];
}

export function matchDevelopments(input: {
  affordabilityMin: number;
  affordabilityMax: number;
  preferredAreas: string[];
  developments: DevelopmentCandidate[];
  mode: ReferralQualificationMode;
}): RankedReferralMatch[] {
  const preferredSet = new Set(input.preferredAreas.map(area => String(area).trim().toLowerCase()));
  return input.developments.map((development, index) => {
    const area = String(development.areaLabel || '').trim().toLowerCase();
    const matchBucket = preferredSet.has(area)
      ? 'preferred_area'
      : preferredSet.size > 0 && area
        ? 'nearby_area'
        : 'fallback_area';

    return {
      programId: development.programId,
      developmentId: development.developmentId,
      developmentName: development.developmentName,
      areaLabel: development.areaLabel,
      rankScore: Math.max(0, 100 - index * 3),
      rankPosition: index + 1,
      matchBucket,
      matchReasons:
        matchBucket === 'preferred_area'
          ? ['Matches client preferred area']
          : ['Fits indicative affordability band'],
      qualifyingUnitTypes: [],
      estimatedEntryPrice: development.priceFrom ?? input.affordabilityMin ?? null,
    };
  });
}

export function renderReferralPdfHtml(input: PdfTemplateInput): string {
  const matchList = input.matches
    .map(match => `<li>${match.developmentName}${match.areaLabel ? ` - ${match.areaLabel}` : ''}</li>`)
    .join('');

  return `<!doctype html>
<html>
  <body>
    <h1>Referral Qualification Summary</h1>
    <p>Reference: ${input.referenceCode}</p>
    <p>Client: ${input.clientName}</p>
    <p>Affordability Range: ${input.affordabilityMin} - ${input.affordabilityMax}</p>
    <p>Confidence: ${input.confidenceLevel} (${input.confidenceScore})</p>
    <p>${input.confidenceHint}</p>
    <ul>${matchList}</ul>
  </body>
</html>`;
}
