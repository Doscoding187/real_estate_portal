import { and, eq, inArray } from 'drizzle-orm';
import {
  commercialAssets,
  commercialAvailabilities,
  commercialLeadContexts,
  commercialSpaces,
  listings,
} from '../../drizzle/schema';
import {
  isCommercialMarketingPropertyType,
  isCommercialSpaceClass,
  type CommercialSpaceClass,
} from '../../shared/commercial-domain';

/**
 * The immutable context captured at the Commercial enquiry boundary.  This is
 * deliberately separate from the generic `properties` projection: a
 * Commercial lead has no authoritative generic property record to display.
 */
export type CommercialLeadOperationalContext = {
  listingId: number;
  listingSlug: string;
  listingTitle: string;
  commercialAssetId: number;
  assetName: string;
  commercialSpaceId: number;
  spaceIdentifier: string;
  commercialAvailabilityId: number;
  useType: CommercialSpaceClass;
  rentableAreaM2: number | null;
  usableAreaM2: number | null;
  availabilityState: string;
  transactionType: 'lease';
  city: string | null;
  province: string | null;
};

type CommercialLeadContextDatabase = {
  select: (...args: any[]) => any;
};

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function positiveId(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Candidate IDs are intentionally limited to leads without a generic
 * property projection. Public Commercial capture persists `listingId` and
 * leaves `propertyId` null; this keeps ordinary property lead queries on their
 * existing path and makes the authority boundary explicit.
 */
export function commercialLeadContextCandidateIds(
  leadsToInspect: readonly { id?: unknown; listingId?: unknown; propertyId?: unknown }[],
): number[] {
  return Array.from(
    new Set(
      leadsToInspect
        .filter(
          lead =>
            positiveId(lead.id) != null &&
            positiveId(lead.listingId) != null &&
            positiveId(lead.propertyId) == null,
        )
        .map(lead => positiveId(lead.id) as number),
    ),
  );
}

/**
 * Loads only the canonical Asset → Space → Availability context captured for
 * Commercial leads. Invalid or mixed rows are omitted rather than projected
 * as a generic property, so consumers fail closed.
 */
export async function loadCommercialLeadContexts(
  db: CommercialLeadContextDatabase,
  leadIds: readonly number[],
): Promise<Map<number, CommercialLeadOperationalContext>> {
  const normalizedIds = Array.from(
    new Set(
      leadIds.map(value => positiveId(value)).filter((value): value is number => value != null),
    ),
  );
  const contexts = new Map<number, CommercialLeadOperationalContext>();
  if (!normalizedIds.length) return contexts;

  const rows = await db
    .select({
      leadId: commercialLeadContexts.leadId,
      listingId: commercialLeadContexts.listingId,
      listingSlug: listings.slug,
      listingTitle: listings.title,
      listingPropertyType: listings.propertyType,
      listingCity: listings.city,
      listingProvince: listings.province,
      commercialAssetId: commercialLeadContexts.commercialAssetId,
      assetName: commercialAssets.name,
      commercialSpaceId: commercialLeadContexts.commercialSpaceId,
      // Select the live graph foreign keys as well as the immutable snapshots.
      // The context row is intentionally not trusted to describe a different
      // Space or Asset than the Availability actually references.
      availabilitySpaceId: commercialAvailabilities.commercialSpaceId,
      spaceAssetId: commercialSpaces.commercialAssetId,
      spaceIdentifier: commercialSpaces.identifier,
      spaceClass: commercialSpaces.spaceClass,
      rentableAreaM2: commercialSpaces.rentableAreaM2,
      usableAreaM2: commercialSpaces.usableAreaM2,
      commercialAvailabilityId: commercialLeadContexts.commercialAvailabilityId,
      availabilityState: commercialAvailabilities.availabilityState,
      transactionType: commercialAvailabilities.transactionType,
    })
    .from(commercialLeadContexts)
    .innerJoin(listings, eq(commercialLeadContexts.listingId, listings.id))
    .innerJoin(commercialAssets, eq(commercialLeadContexts.commercialAssetId, commercialAssets.id))
    .innerJoin(commercialSpaces, eq(commercialLeadContexts.commercialSpaceId, commercialSpaces.id))
    .innerJoin(
      commercialAvailabilities,
      eq(commercialLeadContexts.commercialAvailabilityId, commercialAvailabilities.id),
    )
    .where(
      and(
        inArray(commercialLeadContexts.leadId, normalizedIds),
        eq(commercialAvailabilities.commercialSpaceId, commercialSpaces.id),
        eq(commercialSpaces.commercialAssetId, commercialAssets.id),
      ),
    );

  for (const row of rows as any[]) {
    const leadId = positiveId(row.leadId);
    const listingId = positiveId(row.listingId);
    const assetId = positiveId(row.commercialAssetId);
    const spaceId = positiveId(row.commercialSpaceId);
    const availabilityId = positiveId(row.commercialAvailabilityId);
    const availabilitySpaceId = positiveId(row.availabilitySpaceId);
    const spaceAssetId = positiveId(row.spaceAssetId);
    if (
      leadId == null ||
      listingId == null ||
      assetId == null ||
      spaceId == null ||
      availabilityId == null ||
      !isCommercialMarketingPropertyType(row.listingPropertyType) ||
      !isCommercialSpaceClass(row.spaceClass) ||
      row.transactionType !== 'lease' ||
      (row.availabilitySpaceId !== undefined && availabilitySpaceId !== spaceId) ||
      (row.spaceAssetId !== undefined && spaceAssetId !== assetId)
    ) {
      continue;
    }

    // The context table is unique per lead. Keep the first valid row if a
    // compromised database nevertheless returns duplicates; never merge rows.
    if (contexts.has(leadId)) continue;
    contexts.set(leadId, {
      listingId,
      listingSlug: String(row.listingSlug || ''),
      listingTitle: String(row.listingTitle || `Commercial listing #${listingId}`),
      commercialAssetId: assetId,
      assetName: String(row.assetName || `Commercial asset #${assetId}`),
      commercialSpaceId: spaceId,
      spaceIdentifier: String(row.spaceIdentifier || `Space #${spaceId}`),
      commercialAvailabilityId: availabilityId,
      useType: row.spaceClass,
      rentableAreaM2: nullableNumber(row.rentableAreaM2),
      usableAreaM2: nullableNumber(row.usableAreaM2),
      availabilityState: String(row.availabilityState || 'unknown'),
      transactionType: 'lease',
      city: row.listingCity == null ? null : String(row.listingCity),
      province: row.listingProvince == null ? null : String(row.listingProvince),
    });
  }

  return contexts;
}

export async function loadCommercialLeadContext(
  db: CommercialLeadContextDatabase,
  leadId: number,
): Promise<CommercialLeadOperationalContext | null> {
  const contexts = await loadCommercialLeadContexts(db, [leadId]);
  return contexts.get(leadId) || null;
}

export const COMMERCIAL_LEAD_DEDICATED_WORKFLOW_MESSAGE =
  'Commercial enquiries stay linked to their verified marketing listing and require the dedicated Commercial workflow for viewings or offers.';
