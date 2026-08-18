import { and, eq, sql, type SQL } from 'drizzle-orm';

import {
  cataloguePublishers,
  developmentSupersessions,
  developments,
  developerOrganisations,
  developerOrganisationMemberships,
  plans,
  subscriptions,
  unitTypes,
} from '../../drizzle/schema';
import {
  SUPPORTED_PUBLIC_TRANSACTION_TYPES,
  type CanonicalDevelopmentCatalogue,
  type SupportedPublicTransactionType,
} from './developerEngineCatalogue';

export type PublicDevelopmentEligibilityReason =
  | 'not_published'
  | 'not_approved'
  | 'unsupported_transaction'
  | 'missing_publisher'
  | 'publisher_not_visible'
  | 'missing_source_attribution'
  | 'invalid_publisher_custody'
  | 'missing_active_unit_types'
  | 'missing_launch_access'
  | 'missing_active_operator'
  | 'active_supersession_source';

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

export function evaluatePublicDevelopmentEligibility(
  catalogue: CanonicalDevelopmentCatalogue,
): PublicDevelopmentEligibilityResult {
  const { development, publisher, organisation, unitTypes: catalogueUnitTypes } = catalogue;
  const reasons: PublicDevelopmentEligibilityReason[] = [];

  if (catalogue.activeSupersessionSource) reasons.push('active_supersession_source');
  if (!isTinyIntTrue(development.isPublished)) reasons.push('not_published');
  if (development.approvalStatus !== 'approved') reasons.push('not_approved');

  const supportedTransactionType = isSupportedPublicTransaction(development.transactionType)
    ? development.transactionType
    : null;
  if (!supportedTransactionType) reasons.push('unsupported_transaction');

  if (!publisher) {
    reasons.push('missing_publisher');
  } else if (!isTinyIntTrue(publisher.isVisible)) {
    reasons.push('publisher_not_visible');
  }

  let operatingMode: PublicDevelopmentEligibilityResult['operatingMode'] = null;
  if (publisher?.authorityKind === 'platform_reference') {
    operatingMode = 'platform_curator';
    if (
      publisher.developerOrganisationId !== null ||
      !String(publisher.sourceAttribution || '').trim()
    ) {
      if (!String(publisher.sourceAttribution || '').trim()) {
        reasons.push('missing_source_attribution');
      }
      reasons.push('invalid_publisher_custody');
    }
  } else if (publisher?.authorityKind === 'developer_first_party') {
    operatingMode = 'developer';
    if (
      publisher.developerOrganisationId === null ||
      !organisation ||
      organisation.id !== publisher.developerOrganisationId ||
      organisation.status !== 'approved'
    ) {
      reasons.push('invalid_publisher_custody');
    }
    if (catalogue.commercialAccess !== true) reasons.push('missing_launch_access');
    if (Number(catalogue.activeOperatorCount || 0) < 1) {
      reasons.push('missing_active_operator');
    }
  } else {
    reasons.push('invalid_publisher_custody');
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
 * SQL form of the same public policy. It intentionally uses correlated
 * subqueries so callers cannot accidentally satisfy custody by joining a
 * legacy developer or brand row.
 */
export function publicDevelopmentEligibilityConditions(): SQL {
  const publisherExists = sql`EXISTS (
    SELECT 1
    FROM ${cataloguePublishers} p
    LEFT JOIN ${developerOrganisations} o ON o.id = p.developer_organisation_id
    WHERE p.id = ${developments.cataloguePublisherId}
      AND p.is_visible = 1
      AND (
        (p.authority_kind = 'platform_reference'
          AND p.developer_organisation_id IS NULL
          AND CHAR_LENGTH(TRIM(COALESCE(p.source_attribution, ''))) > 0)
        OR
        (p.authority_kind = 'developer_first_party'
          AND p.developer_organisation_id IS NOT NULL
          AND o.status = 'approved'
          AND EXISTS (
            SELECT 1
            FROM ${developerOrganisationMemberships} active_member
            WHERE active_member.organisation_id = p.developer_organisation_id
              AND active_member.status = 'active'
          )
          AND EXISTS (
            SELECT 1
            FROM ${subscriptions} s
            INNER JOIN ${plans} launch_plan ON launch_plan.id = s.plan_id
            WHERE s.owner_type = 'developer'
              AND s.owner_id = p.developer_organisation_id
              AND s.status IN ('active', 'grace_period')
              AND s.current_period_end IS NOT NULL
              AND s.current_period_end > UTC_TIMESTAMP()
              AND launch_plan.segment = 'developer'
              AND launch_plan.name = 'developer_launch_access'
              AND JSON_UNQUOTE(JSON_EXTRACT(launch_plan.metadata, '$.commercial_term_kind')) = 'paid_launch_access'
              AND JSON_UNQUOTE(JSON_EXTRACT(launch_plan.metadata, '$.commercial_product_key')) = 'developer_launch_access'
          ))
      )
  )`;

  const activeUnitTypeExists = sql`EXISTS (
    SELECT 1
    FROM ${unitTypes}
    WHERE ${unitTypes.developmentId} = ${developments.id}
      AND ${unitTypes.isActive} = 1
  )`;

  return and(
    eq(developments.isPublished, 1),
    eq(developments.approvalStatus, 'approved'),
    sql`(${developments.transactionType} IN ('for_sale', 'for_rent'))`,
    publisherExists,
    sql`(${developments.developmentType} = 'land' OR ${activeUnitTypeExists})`,
    sql`NOT EXISTS (
      SELECT 1
      FROM ${developmentSupersessions}
      WHERE ${developmentSupersessions.sourceDevelopmentId} = ${developments.id}
        AND ${developmentSupersessions.status} = 'active'
    )`,
  )!;
}
