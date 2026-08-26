import type { ServiceTaxonomySeedNode } from '@shared/services-taxonomy';

export type { ServiceTaxonomySeedNode };

/** Directory search result item (organic ordering only). */
export type DirectoryProvider = {
  providerId: number;
  slug: string;
  name: string;
  logoUrl: string | null;
  about: string | null;
  topOfferings: Array<{
    label: string;
    nodeSlug: string;
    priceMin: number | null;
    priceMax: number | null;
  }>;
  bestCapabilityRank?: number;
  geoRank?: number;
  verifiedDimensionCount: number;
  areas: Array<{
    coverageType: 'locality' | 'radius' | 'province_wide' | 'national' | 'remote';
    radiusKm: number | null;
    isPrimary: boolean;
  }>;
};

/** Public provider profile payload (services.providers.getPublicProfile). */
export type PublicProviderProfile = {
  provider: {
    id: number;
    slug: string;
    name: string;
    logoUrl: string | null;
    about: string | null;
    websiteUrl: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    participationStatus:
      | 'draft'
      | 'pending_review'
      | 'live'
      | 'paused'
      | 'suspended';
  };
  offerings: Array<{
    id: number;
    nodeSlug: string;
    nodeName: string;
    nodeLevel: string;
    parentSlug: string | null;
    displayNameOverride: string | null;
    description: string | null;
    priceMin: number | null;
    priceMax: number | null;
    currency: string;
  }>;
  areas: Array<{
    id: number;
    coverageType: 'locality' | 'radius' | 'province_wide' | 'national' | 'remote';
    radiusKm: number | null;
    isPrimary: boolean;
    provinceName: string | null;
    cityName: string | null;
    suburbName: string | null;
  }>;
  verifiedDimensions: string[];
};

export type RequestSummary = {
  request: {
    id: number;
    publicReference: string;
    requesterUserId: number | null;
    taxonomyNodeId: number;
    title: string | null;
    description: string | null;
    timelineBand: string | null;
    budgetBand: string | null;
    provinceId: number | null;
    cityId: number | null;
    suburbId: number | null;
    locationText: string | null;
    journeyStage: string | null;
    sourceSurface: string;
    originType: string | null;
    reasonCode: string | null;
    status:
      | 'open'
      | 'routing'
      | 'introduced'
      | 'connected'
      | 'closed_matched'
      | 'closed_no_match'
      | 'cancelled';
    createdAt: string;
  };
  node: ServiceTaxonomySeedNode | null;
  introductions: Array<{
    id: number;
    providerId: number;
    providerName: string;
    providerSlug: string;
    logoUrl: string | null;
    about: string | null;
    status: string;
    source: string;
    matchScoreSnapshot: string | null;
    createdAt: string;
  }>;
};
