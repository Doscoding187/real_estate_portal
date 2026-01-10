/**
 * Publisher Context Store
 * 
 * Global state for "Operate As" functionality in Publisher Emulator.
 * Persists the selected brand profile context across navigation.
 * 
 * Used by:
 * - SuperAdminPublisher: Sets context when brand is selected
 * - DevelopmentWizard: Reads context to auto-skip identity selection
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PublisherBrandContext {
  mode: 'seeding';
  brandProfileId: number;
  brandProfileName: string;
  brandProfileType: 'developer' | 'marketing_agency' | 'hybrid';
  logoUrl?: string | null;
}

interface PublisherContextState {
  context: PublisherBrandContext | null;
  
  // Set the "Operate As" context
  setOperatingAs: (brand: PublisherBrandContext) => void;
  
  // Clear context (e.g., when exiting Publisher Emulator)
  clearContext: () => void;
  
  // Helper: Check if actively operating as a brand
  isOperatingAsBrand: () => boolean;
}

export const usePublisherContext = create<PublisherContextState>()(
  persist(
    (set, get) => ({
      context: null,
      
      setOperatingAs: (brand) => {
        console.log('[PublisherContext] Operating as:', brand.brandProfileName);
        set({ context: brand });
      },
      
      clearContext: () => {
        console.log('[PublisherContext] Context cleared');
        set({ context: null });
      },
      
      isOperatingAsBrand: () => {
        return get().context !== null;
      },
    }),
    {
      name: 'publisher-context',
      version: 1,
    }
  )
);

/**
 * Resolve publishing identity based on user role and publisher context.
 * 
 * Returns resolved identity if context exists (wizard should skip Step 1),
 * or null if wizard should ask for identity.
 */
export function resolvePublishingIdentity(
  userRole: string | undefined,
  publisherContext: PublisherBrandContext | null
): {
  identityType: 'developer' | 'marketing_agency' | 'brand';
  brandProfileId: number;
  source: 'publisher_emulator';
} | null {
  // Only resolve for Super Admin with active publisher context
  if (userRole === 'super_admin' && publisherContext?.mode === 'seeding') {
    // Map brand profile type to wizard identity type
    const identityType = publisherContext.brandProfileType === 'developer' 
      ? 'brand' // Super Admin publishing as a developer brand
      : 'marketing_agency';
    
    return {
      identityType,
      brandProfileId: publisherContext.brandProfileId,
      source: 'publisher_emulator',
    };
  }
  
  // No context - wizard should ask for identity
  return null;
}
