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

/** Classifications with a complete authoring → publication → public-search contract. */
export const LAND_PUBLIC_CLASSIFICATIONS = [
  'residential_stand',
  'development_land',
  'commercial_industrial_land',
  'agricultural_vacant_land',
] as const satisfies readonly LandClassification[];
export type LandPublicClassification = (typeof LAND_PUBLIC_CLASSIFICATIONS)[number];

/**
 * The public Land journey has a deliberately smaller vocabulary than the
 * durable Land model. Keep this runtime guard beside the allow-list so every
 * authoring and public-search boundary can reject an authoring-only value.
 */
export function isLandPublicClassification(value: unknown): value is LandPublicClassification {
  return (
    typeof value === 'string' &&
    (LAND_PUBLIC_CLASSIFICATIONS as readonly string[]).includes(value)
  );
}

export const LAND_CLASSIFICATION_LABELS: Record<LandClassification, string> = {
  residential_stand: 'Residential Stand',
  development_land: 'Development Land',
  commercial_industrial_land: 'Commercial / Industrial Land',
  agricultural_vacant_land: 'Agricultural Land',
  smallholding: 'Smallholding',
  farm: 'Farm',
  other_land: 'Other Land',
};

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

/** A verified mandate stops being public authority as soon as it expires. */
export function isLandMarketingAuthorityActive(input: {
  status: string | null | undefined;
  expiresAt?: DateLike;
  now?: Date;
}): boolean {
  return (
    input.status === 'active' &&
    !isLandTimestampDue(input.expiresAt, input.now || new Date())
  );
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
