import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { trpc } from '@/lib/trpc';

interface BrandProfile {
  id: number;
  brandName: string;
  slug: string;
  logoUrl?: string | null;
  brandTier?: 'national' | 'regional' | 'boutique';
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

  // Fetch full brand details when ID changes
  const { data: brandDetails, isLoading } = trpc.superAdminPublisher.getBrandContext.useQuery(
    { brandProfileId: selectedBrandId! },
    { 
      enabled: !!selectedBrandId,
      staleTime: 5 * 60 * 1000, 
    }
  );

  useEffect(() => {
    if (brandDetails) {
      setSelectedBrand(brandDetails as unknown as BrandProfile);
    } else if (!selectedBrandId) {
      setSelectedBrand(null);
    }
  }, [brandDetails, selectedBrandId]);

  const value: DeveloperContextValue = {
    selectedBrandId,
    selectedBrand,
    setSelectedBrandId,
    isContextSet: !!selectedBrandId,
    isLoading
  };

  return (
    <DeveloperContext.Provider value={value}>
      {children}
    </DeveloperContext.Provider>
  );
};

export const useDeveloperContext = () => {
  const context = useContext(DeveloperContext);
  if (context === undefined) {
    throw new Error('useDeveloperContext must be used within a DeveloperContextProvider');
  }
  return context;
};
