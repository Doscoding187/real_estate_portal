/**
 * Brand Emulation Client Service
 *
 * Handles client-side injection of brand emulation context into API requests
 * when super admins are operating in emulator/seeding mode.
 *
 * SECURITY: Only sends brandProfileId in header. Type is resolved server-side from DB.
 */

export interface BrandEmulationHeaders {
  'x-operating-as-brand': string;
}

class BrandEmulationClientService {
  /**
   * Create brand emulation headers for tRPC requests
   * SECURITY: Only send the brand ID, not the type (resolved server-side)
   */
  createEmulationHeaders(brandProfileId: number): BrandEmulationHeaders {
    return {
      'x-operating-as-brand': String(brandProfileId),
    };
  }

  /**
   * Check if brand emulation is currently active
   */
  isEmulationActive(): boolean {
    try {
      const storedContext = localStorage.getItem('publisher-context');
      if (!storedContext) return false;

      const publisherContext = JSON.parse(storedContext);
      return publisherContext.context?.mode === 'seeding';
    } catch {
      return false;
    }
  }

  /**
   * Get current brand profile ID if emulation is active
   */
  getCurrentBrandId(): number | null {
    try {
      const storedContext = localStorage.getItem('publisher-context');
      if (!storedContext) return null;

      const publisherContext = JSON.parse(storedContext);
      if (publisherContext.context?.mode === 'seeding') {
        return publisherContext.context.brandProfileId || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get current full context (for UI display only, not for API calls)
   */
  getCurrentContext(): { brandProfileId: number; brandProfileName: string } | null {
    try {
      const storedContext = localStorage.getItem('publisher-context');
      if (!storedContext) return null;

      const publisherContext = JSON.parse(storedContext);
      if (publisherContext.context?.mode === 'seeding') {
        return {
          brandProfileId: publisherContext.context.brandProfileId,
          brandProfileName: publisherContext.context.brandProfileName,
        };
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const brandEmulationClientService = new BrandEmulationClientService();

/**
 * tRPC link middleware to automatically inject brand emulation headers
 * SECURITY: Only sends brand ID - server resolves type from DB
 */
import type { TRPCLink } from '@trpc/client';
import type { AppRouter } from '../../../../server/routers';

/**
 * tRPC link middleware to automatically inject brand emulation headers
 * SECURITY: Only sends brand ID - server resolves type from DB
 */
export function createBrandEmulationLink(): TRPCLink<AppRouter> {
  return () => {
    return ({ op, next }: { op: any; next: any }) => {
      // Get brand ID if emulation is active
      const brandId = brandEmulationClientService.getCurrentBrandId();
      if (brandId) {
        op.context.headers = {
          ...op.context.headers,
          'x-operating-as-brand': String(brandId),
        };
      }

      return next(op);
    };
  };
}
