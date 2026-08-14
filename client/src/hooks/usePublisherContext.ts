/**
 * Publisher Context Store
 *
 * Global state for the platform-curator operating identity.
 * Persists the selected Catalogue Publisher context across navigation.
 *
 * Used by:
 * - SuperAdminPublisher: Sets context when brand is selected
 * - DevelopmentWizard: Reads context to auto-skip identity selection
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PublisherContext {
  mode: 'platform_curator';
  cataloguePublisherId: number;
  publisherName: string;
  publisherType: 'developer' | 'marketing_agency' | 'hybrid';
  logoUrl?: string | null;
}

interface PublisherContextState {
  context: PublisherContext | null;

  // Set the "Operate As" context
  setOperatingAs: (publisher: PublisherContext) => void;

  // Clear context (e.g., when exiting Publisher Emulator)
  clearContext: () => void;

  isOperatingAsPublisher: () => boolean;
}

export const usePublisherContext = create<PublisherContextState>()(
  persist(
    (set, get) => ({
      context: null,

      setOperatingAs: publisher => {
        console.log('[PublisherContext] Operating as:', publisher.publisherName);
        set({ context: publisher });
      },

      clearContext: () => {
        console.log('[PublisherContext] Context cleared');
        set({ context: null });
      },

      isOperatingAsPublisher: () => {
        return get().context !== null;
      },
    }),
    {
      name: 'publisher-context',
      version: 2,
    },
  ),
);

/**
 * Resolve publishing identity based on user role and publisher context.
 *
 * Returns resolved identity if context exists (wizard should skip Step 1),
 * or null if wizard should ask for identity.
 */
export function resolvePublishingIdentity(
  userRole: string | undefined,
  publisherContext: PublisherContext | null,
): {
  identityType: 'developer' | 'marketing_agency' | 'brand';
  cataloguePublisherId: number;
  source: 'platform_curator';
} | null {
  // Only resolve for Super Admin with active publisher context
  if (userRole === 'super_admin' && publisherContext?.mode === 'platform_curator') {
    // Map publisher type to the wizard's presentation identity type.
    const identityType =
      publisherContext.publisherType === 'developer'
        ? 'brand' // Super Admin publishing as a developer brand
        : 'marketing_agency';

    return {
      identityType,
      cataloguePublisherId: publisherContext.cataloguePublisherId,
      source: 'platform_curator',
    };
  }

  // No context - wizard should ask for identity
  return null;
}
