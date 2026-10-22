import { getDb } from '../db';
import {
  listPartnerAccessibleDevelopmentIds,
  type DistributionPartnerActor,
} from './distributionPartnerProgramAccessService';

type ProgramPromotion = {
  headline?: string | null;
  description?: string | null;
  highlightBullets?: string[];
};

type PartnerProgramTermsInput = {
  actor: DistributionPartnerActor;
  cataloguePublisherId?: number;
  developmentIds?: number[];
  /** Retained for old callers. Partner routes never expose inactive programs. */
  includeDisabled?: boolean;
};

export type PartnerProgramTermsItem = {
  developmentId: number;
  developmentName: string;
  developmentFactsAvailable: boolean;
  city: string | null;
  province: string | null;
  suburb: string | null;
  address: null;
  description: string | null;
  amenities: null;
  features: null;
  priceFrom: number | null;
  priceTo: number | null;
  imageUrl: string | null;
  programPromotion: ProgramPromotion;
  brand: { cataloguePublisherId: number; brandName: string } | null;
  program: {
    programId: number;
    isActive: boolean;
    isReferralEnabled: boolean;
    submissionAllowed: boolean;
    tierAccessPolicy: string | null;
    commissionModel: string;
    defaultCommissionPercent: number | null;
    defaultCommissionAmount: number | null;
    referrerCommissionType: string | null;
    referrerCommissionValue: number | null;
    referrerCommissionBasis: string | null;
    currencyCode: string | null;
    payoutMilestone: string | null;
    payoutMilestoneNotes: string | null;
  };
  unitTypes: Array<{
    id: string;
    name: string;
    description: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    size: number | null;
    imageUrl: string | null;
    modes: Partial<Record<'sale' | 'rent', {
      availableCount: number;
      priceFrom: number;
      priceTo: number;
      priceBasis: 'purchase_price' | 'monthly_rent';
    }>>;
  }>;
  requiredDocuments: Array<{
    templateId: number;
    documentCode: string;
    documentLabel: string;
    category: 'client_required_document';
    isRequired: boolean;
    sortOrder: number;
  }>;
  sourceDocuments: [];
  computed: {
    commissionDisplay: string;
    payoutDisplay: string;
    requiredDocsSummary: string;
  };
  opportunity: {
    status: 'ready' | 'pending_setup' | 'blocked';
    distributionActive: true;
    partnerEntitled: true;
    campaignVisibility: 'visible' | 'hidden' | 'unverified';
    openForReferral: boolean;
    marketability: 'marketable' | 'not_marketable' | 'unverified';
    reasonCodes: string[];
    nextAction: 'submit_referral' | 'upload_docs' | 'contact_manager' | 'not_available';
    friendlyMessage: string;
  };
};

/**
 * Partner catalogue reads remain closed until this worktree can consume the
 * Developer-owned workspace reference and sales projection. In particular,
 * Distribution cannot confirm `campaign.visible` from its own program rows.
 */
export async function listPartnerProgramTerms(
  input: PartnerProgramTermsInput,
): Promise<{ items: PartnerProgramTermsItem[] }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  if (input.developmentIds?.length === 0) return { items: [] };

  // Keep the actor-specific Distribution entitlement check in place even while
  // the Developer projection provider is absent from this isolated worktree.
  await listPartnerAccessibleDevelopmentIds({
    db,
    actor: input.actor,
    requestedDevelopmentIds: input.developmentIds,
  });

  // No catalogue item is safe to return until campaign visibility and current
  // sale/rent marketability can be confirmed by the Developer Engine.
  return { items: [] };
}

export async function getPartnerProgramTermsByDevelopmentId(
  developmentId: number,
  actor: DistributionPartnerActor,
) {
  const result = await listPartnerProgramTerms({
    actor,
    developmentIds: [developmentId],
  });
  return result.items.find(item => item.developmentId === developmentId) || null;
}
