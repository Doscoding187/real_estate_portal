import { and, eq, isNull, or, sql, type SQL } from 'drizzle-orm';

import { developerBrandProfiles, developers, developments, unitTypes } from '../../drizzle/schema';
import {
  SUPPORTED_PUBLIC_TRANSACTION_TYPES,
  type CanonicalDevelopmentCatalogue,
  type SupportedPublicTransactionType,
} from './developerEngineCatalogue';

export type PublicDevelopmentEligibilityReason =
  | 'not_published'
  | 'not_approved'
  | 'unsupported_transaction'
  | 'missing_brand'
  | 'brand_not_visible'
  | 'missing_source_attribution'
  | 'invalid_platform_custody'
  | 'invalid_developer_custody'
  | 'missing_active_unit_types';

export type PublicDevelopmentEligibilityResult = {
  eligible: boolean;
  reasons: PublicDevelopmentEligibilityReason[];
  operatingMode: 'developer' | 'platform_curator' | null;
  supportedTransactionType: SupportedPublicTransactionType | null;
};

function isTinyIntTrue(value: unknown): boolean {
  return Number(value || 0) === 1;
}

function isSupportedPublicTransaction(value: unknown): value is SupportedPublicTransactionType {
  return SUPPORTED_PUBLIC_TRANSACTION_TYPES.includes(value as SupportedPublicTransactionType);
}

/**
 * Evaluate the public marketplace contract from one canonical catalogue
 * snapshot.  This is intentionally a policy, not a second publication
 * workflow: publication establishes current state; this policy explains
 * whether that state is eligible for public projections.
 */
export function evaluatePublicDevelopmentEligibility(
  catalogue: CanonicalDevelopmentCatalogue,
): PublicDevelopmentEligibilityResult {
  const { development, brand, developer, unitTypes: catalogueUnitTypes } = catalogue;
  const reasons: PublicDevelopmentEligibilityReason[] = [];

  if (!isTinyIntTrue(development.isPublished)) reasons.push('not_published');
  if (development.approvalStatus !== 'approved') reasons.push('not_approved');

  const supportedTransactionType = isSupportedPublicTransaction(development.transactionType)
    ? development.transactionType
    : null;
  if (!supportedTransactionType) reasons.push('unsupported_transaction');

  if (brand && !isTinyIntTrue(brand.isVisible)) {
    reasons.push('brand_not_visible');
  }

  let operatingMode: PublicDevelopmentEligibilityResult['operatingMode'] = null;

  if (development.devOwnerType === 'platform') {
    operatingMode = 'platform_curator';
    if (!brand) reasons.push('missing_brand');
    if (!brand || brand.ownerType !== 'platform' || brand.linkedDeveloperAccountId !== null) {
      reasons.push('invalid_platform_custody');
    }
    if (brand && !String(brand.sourceAttribution || '').trim()) {
      reasons.push('missing_source_attribution');
    }
    if (development.developerId !== null) reasons.push('invalid_platform_custody');
  } else if (development.devOwnerType === 'developer') {
    operatingMode = 'developer';
    const developerBrandIsValid =
      development.developerBrandProfileId === null ||
      (!!brand &&
        brand.ownerType === 'developer' &&
        brand.linkedDeveloperAccountId === developer?.id);
    if (
      !developer ||
      developer.status !== 'approved' ||
      !developerBrandIsValid ||
      development.developerId !== developer.id
    ) {
      reasons.push('invalid_developer_custody');
    }
  } else {
    reasons.push('invalid_developer_custody');
  }

  const activeUnitTypeCount =
    catalogue.activeUnitTypeCount ??
    catalogueUnitTypes.filter(unitType => isTinyIntTrue(unitType.isActive)).length;
  if (development.developmentType !== 'land' && activeUnitTypeCount === 0) {
    reasons.push('missing_active_unit_types');
  }

  return {
    eligible: reasons.length === 0,
    reasons: Array.from(new Set(reasons)),
    operatingMode,
    supportedTransactionType,
  };
}

/**
 * SQL form of the same public policy.  Callers must join:
 *   developments -> developerBrandProfiles
 *   developments -> developers (left join is intentional for platform rows)
 *
 * The correlated unitTypes check keeps the public catalogue and DLE on the
 * same canonical inventory authority without introducing a second projection.
 */
export function publicDevelopmentEligibilityConditions(): SQL {
  const platformCustody = and(
    eq(developments.devOwnerType, 'platform'),
    isNull(developments.developerId),
    eq(developerBrandProfiles.ownerType, 'platform'),
    eq(developerBrandProfiles.isVisible, 1),
    isNull(developerBrandProfiles.linkedDeveloperAccountId),
    sql`TRIM(COALESCE(${developerBrandProfiles.sourceAttribution}, '')) <> ''`,
  );

  const developerCustody = and(
    eq(developments.devOwnerType, 'developer'),
    eq(developments.developerId, developers.id),
    eq(developers.status, 'approved'),
    or(
      isNull(developments.developerBrandProfileId),
      and(
        eq(developerBrandProfiles.ownerType, 'developer'),
        eq(developerBrandProfiles.isVisible, 1),
        eq(developerBrandProfiles.linkedDeveloperAccountId, developers.id),
      ),
    ),
  );

  const activeUnitTypeExists = sql`EXISTS (
    SELECT 1
    FROM ${unitTypes}
    WHERE ${unitTypes.developmentId} = ${developments.id}
      AND ${unitTypes.isActive} = 1
  )`;

  return and(
    eq(developments.isPublished, 1),
    eq(developments.approvalStatus, 'approved'),
    or(
      eq(developments.transactionType, SUPPORTED_PUBLIC_TRANSACTION_TYPES[0]),
      eq(developments.transactionType, SUPPORTED_PUBLIC_TRANSACTION_TYPES[1]),
    ),
    or(platformCustody, developerCustody),
    or(eq(developments.developmentType, 'land'), activeUnitTypeExists),
  )!;
}
