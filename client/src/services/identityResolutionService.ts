/**
 * Identity Resolution Service
 *
 * Provides server-backed identity resolution for the Publisher Emulator.
 * Replaces fake brand objects with proper database-backed identity validation
 * and enables safe seeding, lead attribution, and brand cleanup.
 */

import { trpc } from '@/lib/trpc';

export interface BrandProfile {
  id: number;
  brandName: string;
  slug: string;
  logoUrl?: string | null;
  brandTier?: 'national' | 'regional' | 'boutique';
  identityType?: 'developer' | 'marketing_agency' | 'hybrid';
  totalLeadsReceived?: number;
  isSubscriber?: boolean;
  isVisible?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ResolvedPublisherIdentity {
  brandProfile: BrandProfile;
  mode: 'seeding';
  source: 'publisher_emulator';
  permissions: {
    canCreateDevelopments: boolean;
    canManageLeads: boolean;
    canViewMetrics: boolean;
    canDeleteBrand: boolean;
  };
  attribution: {
    createdBy: 'super_admin';
    ownerType: 'platform';
    sessionContext: string;
  };
}

export interface IdentityResolutionError {
  code: 'BRAND_NOT_FOUND' | 'BRAND_NOT_VISIBLE' | 'INSUFFICIENT_PERMISSIONS' | 'INVALID_CONTEXT';
  message: string;
  details?: any;
}

class IdentityResolutionService {
  private static instance: IdentityResolutionService;
  private sessionContext: string;

  private constructor() {
    this.sessionContext = this.generateSessionContext();
  }

  static getInstance(): IdentityResolutionService {
    if (!IdentityResolutionService.instance) {
      IdentityResolutionService.instance = new IdentityResolutionService();
    }
    return IdentityResolutionService.instance;
  }

  private generateSessionContext(): string {
    return `emulator_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Resolves a brand ID to a complete, validated brand profile
   * Replaces the fake brand object creation with proper server lookup
   */
  async resolveBrandIdentity(
    brandProfileId: number,
  ): Promise<ResolvedPublisherIdentity | IdentityResolutionError> {
    try {
      // Fetch full brand profile from server
      const brandProfile = await trpc.superAdminPublisher.getBrandProfileById.query({
        id: brandProfileId,
      });

      if (!brandProfile) {
        return {
          code: 'BRAND_NOT_FOUND',
          message: `Brand profile with ID ${brandProfileId} not found`,
        };
      }

      if (!brandProfile.isVisible) {
        return {
          code: 'BRAND_NOT_VISIBLE',
          message: `Brand profile "${brandProfile.brandName}" is not visible`,
        };
      }

      // Calculate permissions based on brand profile and user role
      const permissions = this.calculatePermissions(brandProfile);

      // Create resolved identity with proper attribution
      const resolvedIdentity: ResolvedPublisherIdentity = {
        brandProfile,
        mode: 'seeding',
        source: 'publisher_emulator',
        permissions,
        attribution: {
          createdBy: 'super_admin',
          ownerType: 'platform',
          sessionContext: this.sessionContext,
        },
      };

      return resolvedIdentity;
    } catch (error) {
      return {
        code: 'INVALID_CONTEXT',
        message: `Failed to resolve brand identity: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error,
      };
    }
  }

  /**
   * Validates that a brand can be safely used for seeding operations
   */
  async validateForSeeding(brandProfileId: number): Promise<boolean | IdentityResolutionError> {
    const resolution = await this.resolveBrandIdentity(brandProfileId);

    if ('code' in resolution) {
      return resolution;
    }

    // Additional seeding-specific validations
    if (!resolution.permissions.canCreateDevelopments) {
      return {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'This brand profile cannot be used for seeding developments',
      };
    }

    return true;
  }

  /**
   * Calculates permissions based on brand profile and system context
   */
  private calculatePermissions(brandProfile: BrandProfile) {
    return {
      canCreateDevelopments: true, // Super admin can always create in emulator
      canManageLeads: true, // Super admin can manage all leads in emulator
      canViewMetrics: true, // Super admin can view all metrics
      canDeleteBrand: !brandProfile.isSubscriber, // Can't delete active subscribers
    };
  }

  /**
   * Creates attribution metadata for platform-owned data
   */
  createDataAttribution(brandProfileId: number, operation: 'create' | 'update' | 'delete') {
    return {
      ownerType: 'platform' as const,
      createdBy: 'super_admin' as const,
      brandProfileId,
      operation,
      sessionContext: this.sessionContext,
      timestamp: new Date().toISOString(),
      source: 'publisher_emulator' as const,
    };
  }

  /**
   * Tracks lead attribution for emulator-generated leads
   */
  trackLeadAttribution(leadId: number, brandProfileId: number) {
    return {
      leadId,
      brandProfileId,
      attributedTo: 'publisher_emulator',
      sessionContext: this.sessionContext,
      attributionType: 'platform_seeding',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Generates cleanup metadata for brand operations
   */
  generateCleanupMetadata(
    brandProfileId: number,
    cleanupType: 'soft_delete' | 'hard_delete' | 'archive',
  ) {
    return {
      brandProfileId,
      cleanupType,
      initiatedBy: 'super_admin',
      sessionContext: this.sessionContext,
      platformOwned: true,
      affectedEntities: [], // To be populated by cleanup service
      cleanupDate: new Date().toISOString(),
    };
  }

  /**
   * Resets the session context (useful for testing or session changes)
   */
  resetSession(): void {
    this.sessionContext = this.generateSessionContext();
  }

  /**
   * Gets the current session context for debugging/auditing
   */
  getSessionContext(): string {
    return this.sessionContext;
  }
}

// Export singleton instance
export const identityResolution = IdentityResolutionService.getInstance();

// Export types for external use
export type { ResolvedPublisherIdentity, IdentityResolutionError };
