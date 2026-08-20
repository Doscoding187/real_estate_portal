export const LAND_CLASSIFICATIONS = [
  'residential_stand',
  'development_land',
  'commercial_industrial_land',
  'agricultural_vacant_land',
  'smallholding',
  'farm',
  'other_land',
] as const;
export type LandClassification = (typeof LAND_CLASSIFICATIONS)[number];

export const LAND_CLAIM_CODES = [
  'land_extent', 'intended_use', 'access', 'road_frontage', 'water', 'electricity',
  'sanitation', 'zoning_land_use', 'restrictions_servitudes', 'development_context',
] as const;
export type LandClaimCode = (typeof LAND_CLAIM_CODES)[number];

export type LandVerificationStatus =
  | 'unverified' | 'asserted' | 'verified' | 'contradicted' | 'expired' | 'unavailable' | 'withdrawn';

export type LandTrustState = 'listed_with_disclosures' | 'passport_checked' | 'passport_attention_required';

type DateLike = Date | string | null | undefined;

/** Drizzle timestamp mode is string for the Land schema; normalize at the domain boundary. */
export function normalizeLandTimestamp(value: DateLike): Date | null {
  if (!value) return null;
  const normalized = value instanceof Date ? value : new Date(value);
  return Number.isNaN(normalized.getTime()) ? null : normalized;
}

export function isLandTimestampDue(value: DateLike, now: Date): boolean {
  const normalized = normalizeLandTimestamp(value);
  return normalized !== null && normalized.getTime() <= now.getTime();
}

export function deriveLandTrustState(input: {
  marketingAuthorityActive: boolean;
  hasHighSeverityOpenConflict: boolean;
  assertions: readonly Pick<LandVerificationAssertion, 'status' | 'recheckDueAt' | 'expiresAt'>[];
  now?: Date;
}): LandTrustState | null {
  if (!input.marketingAuthorityActive || input.hasHighSeverityOpenConflict) return null;
  const now = input.now || new Date();
  const attentionRequired = input.assertions.some(assertion =>
    assertion.status === 'contradicted' || assertion.status === 'expired' ||
    isLandTimestampDue(assertion.expiresAt, now) ||
    isLandTimestampDue(assertion.recheckDueAt, now),
  );
  if (attentionRequired) return 'passport_attention_required';
  return input.assertions.length > 0 && input.assertions.every(a => a.status === 'verified')
    ? 'passport_checked'
    : 'listed_with_disclosures';
}

export interface LandVerificationAssertion {
  claimCode: LandClaimCode;
  status: LandVerificationStatus;
  publicConclusion: string | null;
  limitations: string | null;
  sourceProvider: string | null;
  verifierType: string;
  verifierName: string | null;
  checkedAt: Date | null;
  recheckDueAt: Date | string | null;
  expiresAt: Date | string | null;
}

/** Public Passport payload. It deliberately has no evidence IDs, document names or storage references. */
export function toPublicLandPassportAssertions(
  assertions: readonly LandVerificationAssertion[],
): readonly LandVerificationAssertion[] {
  return assertions.map(assertion => ({ ...assertion }));
}
