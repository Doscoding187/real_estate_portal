import {
  QualificationProfileAnswersSchema,
  type DevelopmentMatchLabel,
  type QualificationProfileAnswers,
} from '../../shared/leadRouting';

export type DevelopmentMatchingCandidate = {
  id: number;
  name?: string | null;
  province?: string | null;
  city?: string | null;
  suburb?: string | null;
  priceFrom?: number | string | null;
  estimatedMinIncome?: number | null;
  isPublished?: boolean | number | null;
  approvalStatus?: string | null;
  status?: string | null;
  campaignEligible?: boolean;
  campaignPriority?: number | null;
  distributionReady?: boolean;
  submissionAllowed?: boolean;
  leadRoutingEnabled?: boolean;
  hasMedia?: boolean;
};

export type DevelopmentMatchReason = {
  code: string;
  label: string;
  points: number;
};

export type DevelopmentMatchResult = {
  developmentId: number;
  score: number;
  label: DevelopmentMatchLabel;
  reasons: DevelopmentMatchReason[];
  incomeEligible: boolean;
  locationMatch: boolean;
  campaignEligible: boolean;
  distributionReady: boolean;
  submissionAllowed: boolean;
  estimatedMinIncome: number | null;
};

function normalizeLocation(value: unknown): string | null {
  const text = String(value ?? '')
    .trim()
    .toLowerCase();
  return text || null;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function toBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

export function estimateMinimumMonthlyIncome(
  candidate: DevelopmentMatchingCandidate,
): number | null {
  if (typeof candidate.estimatedMinIncome === 'number' && candidate.estimatedMinIncome > 0) {
    return Math.round(candidate.estimatedMinIncome);
  }

  const priceFrom = toNumber(candidate.priceFrom);
  if (!priceFrom || priceFrom <= 0) return null;

  // Conservative light estimate only. Final affordability must still be advisor/lender reviewed.
  return Math.round(priceFrom * 0.035);
}

export function isDevelopmentEligibleForLeadRouting(
  candidate: DevelopmentMatchingCandidate,
): boolean {
  if (candidate.leadRoutingEnabled === false) return false;
  if (candidate.isPublished === false || candidate.isPublished === 0) return false;
  if (candidate.approvalStatus && candidate.approvalStatus !== 'approved') return false;
  if (candidate.status === 'sold-out' || candidate.status === 'sold_out') return false;
  return true;
}

function classifyMatch(score: number): DevelopmentMatchLabel {
  if (score >= 75) return 'good_match';
  if (score >= 45) return 'possible_match';
  return 'needs_review';
}

function addReason(reasons: DevelopmentMatchReason[], code: string, label: string, points: number) {
  if (!points) return;
  reasons.push({ code, label, points });
}

export function scoreDevelopmentMatch(input: {
  profile: QualificationProfileAnswers;
  candidate: DevelopmentMatchingCandidate;
}): DevelopmentMatchResult | null {
  if (!isDevelopmentEligibleForLeadRouting(input.candidate)) return null;

  const profile = QualificationProfileAnswersSchema.parse(input.profile);
  const candidate = input.candidate;
  const reasons: DevelopmentMatchReason[] = [];
  let score = 0;

  const preferredProvince = normalizeLocation(profile.preferredProvince);
  const preferredCity = normalizeLocation(profile.preferredCity);
  const preferredSuburb = normalizeLocation(profile.preferredSuburb);
  const candidateProvince = normalizeLocation(candidate.province);
  const candidateCity = normalizeLocation(candidate.city);
  const candidateSuburb = normalizeLocation(candidate.suburb);

  let locationMatch = false;
  if (preferredSuburb && candidateSuburb && preferredSuburb === candidateSuburb) {
    score += 40;
    locationMatch = true;
    addReason(reasons, 'suburb_match', 'Preferred suburb matches this development.', 40);
  } else if (preferredCity && candidateCity && preferredCity === candidateCity) {
    score += 34;
    locationMatch = true;
    addReason(reasons, 'city_match', 'Preferred city matches this development.', 34);
  } else if (preferredProvince && candidateProvince && preferredProvince === candidateProvince) {
    score += 22;
    locationMatch = true;
    addReason(reasons, 'province_match', 'Preferred province matches this development.', 22);
  }

  const income = toNumber(profile.grossMonthlyIncome);
  const coApplicantIncome =
    profile.buyingMode === 'joint' ? toNumber(profile.coApplicantIncome) || 0 : 0;
  const totalIncome = income !== null ? income + coApplicantIncome : null;
  const estimatedMinIncome = estimateMinimumMonthlyIncome(candidate);
  let incomeEligible = false;

  if (totalIncome !== null && estimatedMinIncome !== null && totalIncome >= estimatedMinIncome) {
    score += 30;
    incomeEligible = true;
    addReason(reasons, 'income_likely_suitable', 'Income appears suitable for light matching.', 30);
  } else if (
    totalIncome !== null &&
    estimatedMinIncome !== null &&
    totalIncome >= estimatedMinIncome * 0.85
  ) {
    score += 18;
    addReason(
      reasons,
      'income_close_review',
      'Income is close enough to review with an advisor.',
      18,
    );
  } else if (totalIncome === null || estimatedMinIncome === null) {
    score += 8;
    addReason(reasons, 'income_unknown', 'Income or pricing data needs advisor review.', 8);
  }

  const campaignEligible = candidate.campaignEligible === true;
  if (campaignEligible) {
    score += 10;
    addReason(
      reasons,
      'campaign_priority',
      'Development is promoted for this campaign context.',
      10,
    );
  }

  const priority = Math.max(0, Math.min(Number(candidate.campaignPriority || 0), 10));
  if (priority > 0) {
    score += priority;
    addReason(
      reasons,
      'campaign_weight',
      'Campaign priority lifted this recommendation.',
      priority,
    );
  }

  const distributionReady = candidate.distributionReady === true;
  if (distributionReady) {
    score += 12;
    addReason(reasons, 'distribution_ready', 'Development is ready for distribution handoff.', 12);
  }

  const submissionAllowed = candidate.submissionAllowed === true;
  if (submissionAllowed) {
    score += 8;
    addReason(reasons, 'submission_allowed', 'Lead submission is currently allowed.', 8);
  }

  if (toBoolean(candidate.hasMedia)) {
    score += 5;
    addReason(reasons, 'media_ready', 'Development has enough media for buyer review.', 5);
  }

  const cappedScore = Math.max(0, Math.min(score, 100));

  return {
    developmentId: candidate.id,
    score: cappedScore,
    label: classifyMatch(cappedScore),
    reasons,
    incomeEligible,
    locationMatch,
    campaignEligible,
    distributionReady,
    submissionAllowed,
    estimatedMinIncome,
  };
}

export function matchDevelopments(input: {
  profile: QualificationProfileAnswers;
  candidates: DevelopmentMatchingCandidate[];
  limit?: number;
}): DevelopmentMatchResult[] {
  const limit = Math.max(1, Math.min(input.limit ?? 12, 50));

  return input.candidates
    .map(candidate => scoreDevelopmentMatch({ profile: input.profile, candidate }))
    .filter((match): match is DevelopmentMatchResult => Boolean(match))
    .sort((a, b) => b.score - a.score || a.developmentId - b.developmentId)
    .slice(0, limit);
}
