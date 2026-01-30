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

  // Brand details should be passed from parent or fetched via listBrandProfiles
  // For now, we'll create a minimal brand object from the ID
  useEffect(() => {
    if (selectedBrandId) {
      // Minimal brand object - parent should pass full details
      const brand: BrandProfile = {
        id: selectedBrandId,
        brandName: `Brand ${selectedBrandId}`,
        slug: `brand-${selectedBrandId}`,
      };
      setSelectedBrand(brand);

      // Sync with global publisher context store
      setOperatingAs({
        mode: 'seeding',
        brandProfileId: brand.id,
        brandProfileName: brand.brandName,
        brandProfileType: 'developer',
        logoUrl: brand.logoUrl,
      });
    } else {
      setSelectedBrand(null);
      clearContext();
    }
  }, [selectedBrandId, setOperatingAs, clearContext]);

  const value: DeveloperContextValue = {
    selectedBrandId,
    selectedBrand,
    setSelectedBrandId,
    isContextSet: !!selectedBrandId,
    isLoading: false, // No longer fetching brand details
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
