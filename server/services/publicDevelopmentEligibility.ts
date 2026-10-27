import { and, eq, ne, sql, type SQL } from 'drizzle-orm';

import {
  cataloguePublishers,
  billableAccounts,
  developmentSupersessions,
  developmentPlaceAssignments,
  developments,
  developerOrganisations,
  developerOrganisationMemberships,
  plans,
  subscriptions,
  unitTypes,
  place,
  placeName,
} from '../../drizzle/schema';
import {
  SUPPORTED_PUBLIC_TRANSACTION_TYPES,
  type CanonicalDevelopmentCatalogue,
  type SupportedPublicTransactionType,
} from './developerEngineCatalogue';
import {
  isDeferredLandDevelopmentType,
  isLandVerticalAvailable,
} from '../../shared/landLaunchPolicy';
import { isCommercialActivationAvailable } from './commercialActivationPolicy';
import { isCanonicalPlaceId } from '../../shared/placeAuthority';

export type PublicDevelopmentEligibilityReason =
  | 'not_published'
  | 'not_approved'
  | 'missing_canonical_place_assignment'
  | 'unsupported_transaction'
  | 'unsupported_development_type'
  | 'land_vertical_deferred'
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
  if (!isCanonicalPlaceId(catalogue.canonicalPlaceId)) {
    reasons.push('missing_canonical_place_assignment');
  }
  // Commercial leasing has its own Asset → Space → Availability authority.
  // A legacy Developer catalogue row must not become a second public
  // Commercial inventory merely because its publication flags are live.
  if (development.developmentType === 'commercial') {
    reasons.push('unsupported_development_type');
  }
  if (isDeferredLandDevelopmentType(development.developmentType)) {
    reasons.push('land_vertical_deferred');
  }

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
  // Keep the platform-curated branch independent of commercial release state,
  // while failing closed for first-party Developer inventory until its exact
  // Launch Access product is explicitly enabled.
  const developerLaunchAccessEnabled = isCommercialActivationAvailable(
    process.env,
    'developer_launch_access',
  )
    ? sql`1 = 1`
    : sql`1 = 0`;
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
          AND ${developerLaunchAccessEnabled}
          AND EXISTS (
            SELECT 1
            FROM ${developerOrganisationMemberships} active_member
            WHERE active_member.organisation_id = p.developer_organisation_id
              AND active_member.status = 'active'
          )
          AND EXISTS (
            SELECT 1
            FROM ${subscriptions} s
            INNER JOIN ${billableAccounts} b ON b.id = s.billable_account_id
            INNER JOIN ${plans} launch_plan ON launch_plan.id = s.plan_id
            WHERE s.owner_type = 'developer'
              AND s.owner_id = p.developer_organisation_id
              AND b.account_kind = 'developer'
              AND b.developer_organisation_id = p.developer_organisation_id
              AND s.status = 'active'
              AND s.current_period_end IS NOT NULL
              AND s.current_period_end > UTC_TIMESTAMP()
              AND launch_plan.segment = 'developer'
              AND launch_plan.name = 'developer_launch_access'
              AND launch_plan.isActive = 1
              AND JSON_UNQUOTE(JSON_EXTRACT(launch_plan.metadata, '$.commercial_term_kind')) = 'paid_launch_access'
              AND JSON_UNQUOTE(JSON_EXTRACT(launch_plan.metadata, '$.commercial_product_key')) = 'developer_launch_access'
              AND CAST(JSON_UNQUOTE(JSON_EXTRACT(launch_plan.metadata, '$.commercial_term_duration_days')) AS UNSIGNED) = 90
              AND JSON_UNQUOTE(JSON_EXTRACT(launch_plan.metadata, '$.commercial_requires_verified_payment')) = 'true'
              AND JSON_UNQUOTE(JSON_EXTRACT(launch_plan.metadata, '$.commercial_auto_renews')) = 'false'
          ))
      )
  )`;

  const activeUnitTypeExists = sql`EXISTS (
    SELECT 1
    FROM ${unitTypes}
    WHERE ${unitTypes.developmentId} = ${developments.id}
      AND ${unitTypes.isActive} = 1
  )`;

  const oneExecutableSitePlace = sql`(
    SELECT COUNT(DISTINCT assignment.place_id)
    FROM ${developmentPlaceAssignments} assignment
    INNER JOIN ${place} assigned_place
      ON assigned_place.place_id = assignment.place_id
    WHERE assignment.development_id = ${developments.id}
      AND assignment.assignment_kind = 'site'
      AND assignment.review_state = 'accepted'
      AND assignment.reviewed_by_user_id IS NOT NULL
      AND assignment.reviewed_at IS NOT NULL
      AND CHAR_LENGTH(TRIM(assignment.evidence_reference)) > 0
      AND assigned_place.lifecycle_status = 'active'
      AND assigned_place.search_eligible = 1
      AND assigned_place.search_scope IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM ${placeName} accepted_place_name
        WHERE accepted_place_name.place_id = assigned_place.place_id
          AND accepted_place_name.name_role = 'preferred_public'
          AND accepted_place_name.name_state = 'active'
          AND CHAR_LENGTH(TRIM(accepted_place_name.name)) > 0
      )
  ) = 1 AND NOT EXISTS (
    SELECT 1
    FROM ${developmentPlaceAssignments} invalid_assignment
    LEFT JOIN ${place} invalid_place
      ON invalid_place.place_id = invalid_assignment.place_id
    WHERE invalid_assignment.development_id = ${developments.id}
      AND invalid_assignment.assignment_kind = 'site'
      AND invalid_assignment.review_state = 'accepted'
      AND (
        invalid_assignment.reviewed_by_user_id IS NULL
        OR invalid_assignment.reviewed_at IS NULL
        OR CHAR_LENGTH(TRIM(invalid_assignment.evidence_reference)) = 0
        OR invalid_place.place_id IS NULL
        OR invalid_place.lifecycle_status <> 'active'
        OR invalid_place.search_eligible <> 1
        OR invalid_place.search_scope IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM ${placeName} invalid_place_name
          WHERE invalid_place_name.place_id = invalid_place.place_id
            AND invalid_place_name.name_role = 'preferred_public'
            AND invalid_place_name.name_state = 'active'
            AND CHAR_LENGTH(TRIM(invalid_place_name.name)) > 0
        )
      )
  )`;

  return and(
    eq(developments.isPublished, 1),
    eq(developments.approvalStatus, 'approved'),
    oneExecutableSitePlace,
    ne(developments.developmentType, 'commercial'),
    isLandVerticalAvailable() ? undefined : ne(developments.developmentType, 'land'),
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
