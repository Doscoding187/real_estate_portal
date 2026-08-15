import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { trpc } from '@/lib/trpc';
import { usePublisherContext } from '@/hooks/usePublisherContext';

interface CataloguePublisherSummary {
  id: number;
  brandName: string;
  slug: string;
  logoUrl?: string | null;
  brandTier?: 'national' | 'regional' | 'boutique';
  identityType?: 'developer' | 'marketing_agency' | 'hybrid';
  totalLeadsReceived?: number;
  sourceAttribution?: string | null;
  about?: string | null;
  propertyFocus?: string[] | null;
  foundedYear?: number | null;
  websiteUrl?: string | null;
  publicContactEmail?: string | null;
  headOfficeLocation?: string | null;
}

interface DeveloperContextValue {
  selectedBrandId: number | null;
  selectedBrand: CataloguePublisherSummary | null;
  setSelectedBrandId: (id: number | null) => void;
  isContextSet: boolean;
  isLoading: boolean;
}

const DeveloperContext = createContext<DeveloperContextValue | undefined>(undefined);

export const DeveloperContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<CataloguePublisherSummary | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);
  const { setOperatingAs, clearContext } = usePublisherContext();

  // Fetch real Catalogue Publisher data when brand ID is selected
  const { data: publisherProfile, isLoading } = trpc.superAdminPublisher.getPublisherById.useQuery(
    { id: selectedBrandId! },
    {
      enabled: !!selectedBrandId,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    },
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('publisher-context');
      if (!stored) return;
      const parsed = JSON.parse(stored);
      const storedBrandId = parsed?.state?.context?.cataloguePublisherId;
      if (typeof storedBrandId === 'number') {
        setSelectedBrandId(storedBrandId);
      }
    } catch {
      // Ignore malformed storage
    } finally {
      setHasHydrated(true);
    }
  }, []);

  // Update selected brand and sync with global publisher context
  useEffect(() => {
    if (selectedBrandId && publisherProfile) {
      const brand: CataloguePublisherSummary = {
        id: publisherProfile.id,
        brandName: publisherProfile.brandName,
        slug: publisherProfile.slug,
        logoUrl: publisherProfile.logoUrl,
        brandTier: publisherProfile.brandTier,
        identityType: publisherProfile.identityType,
        totalLeadsReceived: publisherProfile.totalLeadsReceived,
        sourceAttribution: publisherProfile.sourceAttribution,
        about: publisherProfile.about,
        propertyFocus: publisherProfile.propertyFocus,
        foundedYear: publisherProfile.foundedYear,
        websiteUrl: publisherProfile.websiteUrl,
        publicContactEmail: publisherProfile.publicContactEmail,
        headOfficeLocation: publisherProfile.headOfficeLocation,
      };
      setSelectedBrand(brand);

      // Sync with global publisher context store
      // CRITICAL: Use actual identityType from database, never hardcode
      setOperatingAs({
        mode: 'platform_curator',
        cataloguePublisherId: brand.id,
        publisherName: brand.brandName,
        publisherType: brand.identityType || 'developer', // Use real identityType
        logoUrl: brand.logoUrl,
      });
    } else if (hasHydrated && !selectedBrandId) {
      setSelectedBrand(null);
      clearContext();
    }
  }, [selectedBrandId, publisherProfile, setOperatingAs, clearContext, hasHydrated]);

  const value: DeveloperContextValue = {
    selectedBrandId,
    selectedBrand,
    setSelectedBrandId,
    isContextSet: !!selectedBrandId && !!selectedBrand,
    isLoading,
  };

  return <DeveloperContext.Provider value={value}>{children}</DeveloperContext.Provider>;
};

export const useDeveloperContext = () => {
  const context = useContext(DeveloperContext);
  if (context === undefined) {
    throw new Error('useDeveloperContext must be used within a DeveloperContextProvider');
  }
  return context;
};
