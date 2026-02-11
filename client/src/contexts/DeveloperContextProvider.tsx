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
  const [hasHydrated, setHasHydrated] = useState(false);
  const { setOperatingAs, clearContext } = usePublisherContext();

  // Fetch real brand profile data when brand ID is selected
  const { data: brandProfile, isLoading } = trpc.superAdminPublisher.getBrandProfileById.useQuery(
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
      const storedBrandId = parsed?.state?.context?.brandProfileId;
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
    if (selectedBrandId && brandProfile) {
      const brand: BrandProfile = {
        id: brandProfile.id,
        brandName: brandProfile.brandName,
        slug: brandProfile.slug,
        logoUrl: brandProfile.logoUrl,
        brandTier: brandProfile.brandTier,
        identityType: brandProfile.identityType,
        totalLeadsReceived: brandProfile.totalLeadsReceived,
      };
      setSelectedBrand(brand);

      // Sync with global publisher context store
      // CRITICAL: Use actual identityType from database, never hardcode
      setOperatingAs({
        mode: 'seeding',
        brandProfileId: brand.id,
        brandProfileName: brand.brandName,
        brandProfileType: brand.identityType || 'developer', // Use real identityType
        logoUrl: brand.logoUrl,
      });
    } else if (hasHydrated && !selectedBrandId) {
      setSelectedBrand(null);
      clearContext();
    }
  }, [selectedBrandId, brandProfile, setOperatingAs, clearContext, hasHydrated]);

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
