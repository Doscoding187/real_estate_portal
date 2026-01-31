/**
 * Brand Emulation Service
 *
 * Handles backend enforcement for brand-scoped operations when super admins
 * are operating in emulator/seeding mode.
 */

import { TRPCError } from '@trpc/server';
import type { BrandEmulationContext, TrpcContext } from '../_core/context';
import { db } from '../db';

export interface ResolvedBrandIdentity {
  brandProfileId: number;
  brandProfileName: string;
  brandProfileType: 'developer' | 'marketing_agency' | 'hybrid';
  source: 'publisher_emulator' | 'real_user';
  isEmulation: boolean;
}

class BrandEmulationService {
  /**
   * Resolve the operating brand identity for the current context.
   *
   * For real users: returns their actual brand profile
   * For super admins in emulation: returns the emulated brand context
   *
   * @throws FORBIDDEN if user lacks appropriate role or emulation context
   */
  async resolveOperatingBrandIdentity(ctx: TrpcContext): Promise<ResolvedBrandIdentity> {
    const { user, brandEmulationContext } = ctx;

    if (!user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    // Case 1: Super Admin operating in emulation mode
    if (user.role === 'super_admin' && brandEmulationContext?.mode === 'seeding') {
      // Verify the brand profile actually exists
      const brandProfile = await this.getBrandProfileById(brandEmulationContext.brandProfileId);
      if (!brandProfile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Brand profile ${brandEmulationContext.brandProfileId} not found`,
        });
      }

      return {
        brandProfileId: brandEmulationContext.brandProfileId,
        brandProfileName: brandEmulationContext.brandProfileName,
        brandProfileType: brandEmulationContext.brandProfileType,
        source: 'publisher_emulator',
        isEmulation: true,
      };
    }

    // Case 2: Real property developer operating as themselves
    if (user.role === 'property_developer') {
      const developerProfile = await this.getDeveloperByUserId(user.id);
      if (!developerProfile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Developer profile not found for user',
        });
      }

      return {
        brandProfileId: developerProfile.brandProfileId!,
        brandProfileName: developerProfile.companyName,
        brandProfileType: 'developer',
        source: 'real_user',
        isEmulation: false,
      };
    }

    // Case 3: Real agency admin operating as themselves
    if (user.role === 'agency_admin') {
      const agencyProfile = await this.getAgencyByUserId(user.id);
      if (!agencyProfile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Agency profile not found for user',
        });
      }

      return {
        brandProfileId: agencyProfile.brandProfileId!,
        brandProfileName: agencyProfile.agencyName,
        brandProfileType: 'marketing_agency',
        source: 'real_user',
        isEmulation: false,
      };
    }

    throw new TRPCError({
      code: 'FORBIDDEN',
      message:
        'User role not authorized for brand operations. Must be super_admin (with emulation), property_developer, or agency_admin.',
    });
  }

  /**
   * Enforce that the operation is scoped to the resolved brand identity.
   * This prevents cross-brand data access in emulation mode.
   */
  enforceBrandScope(
    resolvedIdentity: ResolvedBrandIdentity,
    targetBrandProfileId: number,
    operation: string,
  ): void {
    if (resolvedIdentity.brandProfileId !== targetBrandProfileId) {
      const sourceMsg = resolvedIdentity.isEmulation
        ? `emulated brand ${resolvedIdentity.brandProfileName}`
        : 'your brand profile';

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `${operation}: Cross-brand access not allowed. Operating as ${sourceMsg} but trying to access brand ${targetBrandProfileId}.`,
      });
    }
  }

  /**
   * Middleware helper to enforce brand-scoped operations
   */
  async requireBrandScope(
    ctx: TrpcContext,
    targetBrandProfileId: number,
    operation: string = 'Operation',
  ): Promise<ResolvedBrandIdentity> {
    const resolvedIdentity = await this.resolveOperatingBrandIdentity(ctx);
    this.enforceBrandScope(resolvedIdentity, targetBrandProfileId, operation);
    return resolvedIdentity;
  }

  // Private helper methods to avoid circular dependencies
  private async getBrandProfileById(brandProfileId: number) {
    const database = await db.getDb();
    if (!database) return null;

    const result = await database.execute(`
      SELECT id, brandName, brandType 
      FROM developer_brand_profiles 
      WHERE id = ${brandProfileId}
    `);

    return result.rows?.[0] || null;
  }

  private async getDeveloperByUserId(userId: number) {
    const database = await db.getDb();
    if (!database) return null;

    const result = await database.execute(`
      SELECT id, companyName, brandProfileId 
      FROM developers 
      WHERE userId = ${userId}
    `);

    return result.rows?.[0] || null;
  }

  private async getAgencyByUserId(userId: number) {
    const database = await db.getDb();
    if (!database) return null;

    const result = await database.execute(`
      SELECT id, agencyName, brandProfileId 
      FROM agencies 
      WHERE userId = ${userId}
    `);

    return result.rows?.[0] || null;
  }
}

export const brandEmulationService = new BrandEmulationService();
