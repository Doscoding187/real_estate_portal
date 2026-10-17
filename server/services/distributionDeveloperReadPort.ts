/**
 * Distribution's consumer-side boundary for Developer-owned campaign and sales
 * facts. These types describe only fields Distribution reads; Developer remains
 * the sole authority and implementation owner.
 *
 * The provider is deliberately unavailable until the Developer contract is
 * published on the integration branch. Empty/null results are fail-closed: no
 * Developer-table reads, legacy inventory reconstruction, or catalogue facts
 * are substituted here.
 */
export type DevelopmentSalesModeProjection = {
  availableCount: number;
  priceFrom: number;
  priceTo: number;
  priceBasis: 'purchase_price' | 'monthly_rent';
};

export type DevelopmentSalesProjection = {
  publisherId: number | null;
  revision: string;
  observedAt: string;
  campaign: {
    visible: boolean;
    name: string;
    tagline: string | null;
    description: string | null;
    developmentType: string;
    lifecycle: string | null;
    city: string;
    province: string;
    images: string[];
  };
  inventory: {
    phaseScope: 'phase-released' | 'development-wide' | 'unscoped-hidden';
    modes: Partial<Record<'for_sale' | 'for_rent', DevelopmentSalesModeProjection>>;
    unitTypes: Array<{
      id: string;
      name: string;
      description: string | null;
      bedrooms: number | null;
      bathrooms: number | null;
      size: number | null;
      imageUrl: string | null;
      modes: Partial<Record<'for_sale' | 'for_rent', DevelopmentSalesModeProjection>>;
    }>;
  };
  contacts: Array<{
    id: number | string;
    displayName: string;
    roleTitle: string | null;
    phaseName: string | null;
    organizationName: string | null;
    email: string | null;
    phone: string | null;
  }>;
};

export type DevelopmentSalesWorkspaceReference = {
  developmentId: number;
  publisherId: number | null;
  name: string;
  displayName: string;
  city: string | null;
  province: string | null;
  suburb: string | null;
  publisherName: string | null;
  publisherAuthorityKind: string | null;
  isPublished: boolean;
  approvalStatus: string | null;
  lifecycle: string | null;
  updatedAt: string | null;
};

export type DevelopmentSalesWorkspaceReferenceQuery = {
  developmentIds?: number[];
  publisherId?: number;
  search?: string;
  limit?: number;
  offset?: number;
};

/** No provider is linked in this isolated Distribution worktree. */
export async function getDevelopmentSalesProjection(
  _developmentId: number,
): Promise<DevelopmentSalesProjection | null> {
  return null;
}

/** No publisher-scoped Developer workspace read is linked in this worktree. */
export async function getDevelopmentSalesWorkspaceReference(
  _developmentId: number,
): Promise<DevelopmentSalesWorkspaceReference | null> {
  return null;
}

/** Publisher enumeration remains empty until the Developer-owned contract lands. */
export async function listDevelopmentSalesWorkspaceReferences(
  _query: DevelopmentSalesWorkspaceReferenceQuery,
): Promise<DevelopmentSalesWorkspaceReference[]> {
  return [];
}
