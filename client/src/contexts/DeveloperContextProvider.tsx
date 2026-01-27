import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { trpc } from '@/lib/trpc';
import { usePublisherContext } from '@/hooks/usePublisherContext';

interface BrandProfile {
  id: number;
  brandName: string;
  slug: string;
  logoUrl?: string | null;
  brandTier?: 'national' | 'regional' | 'boutique';
  identityType?: 'developer' | 'marketing_agency' | 'hybrid';
  totalLeadsReceived?: number;
}

interface DeveloperContextValue {
  selectedBrandId: number | null;
  selectedBrand: BrandProfile | null;
  setSelectedBrandId: (id: number | null) => void;
  isContextSet: boolean;
  isLoading: boolean;
}

const DeveloperContext = createContext<DeveloperContextValue | undefined>(undefined);

export const DeveloperContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<BrandProfile | null>(null);
  const { setOperatingAs, clearContext } = usePublisherContext();

  // Fetch full brand details when ID changes
  const { data: brandDetails, isLoading } = trpc.superAdminPublisher.getBrandContext.useQuery(
    { brandProfileId: selectedBrandId! },
    {
      enabled: !!selectedBrandId,
      staleTime: 5 * 60 * 1000,
    },
  );

  useEffect(() => {
    if (brandDetails) {
      const brand = brandDetails as unknown as BrandProfile;
      setSelectedBrand(brand);

      // Sync with global publisher context store
      setOperatingAs({
        mode: 'seeding',
        brandProfileId: brand.id,
        brandProfileName: brand.brandName,
        brandProfileType: brand.identityType || 'developer',
        logoUrl: brand.logoUrl,
      });
    } else if (!selectedBrandId) {
      setSelectedBrand(null);
      clearContext();
    }
  }, [brandDetails, selectedBrandId, setOperatingAs, clearContext]);

  const value: DeveloperContextValue = {
    selectedBrandId,
    selectedBrand,
    setSelectedBrandId,
    isContextSet: !!selectedBrandId,
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
