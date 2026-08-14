/**
 * Platform-curator context over Catalogue Publisher.
 */
import { and, eq, like } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db-connection';
import { cataloguePublishers } from '../../drizzle/schema';
import { developerIdentityService } from './developerIdentityService';

export type CataloguePublisherContext = {
  cataloguePublisherId: number;
  publisherName: string;
  authorityKind: 'platform_reference';
  publisherType: 'developer' | 'marketing_agency' | 'hybrid';
  brandTier: 'national' | 'regional' | 'boutique';
  isOperatingAs: boolean;
};

function toContext(publisher: any): CataloguePublisherContext {
  return {
    cataloguePublisherId: publisher.id,
    publisherName: publisher.name,
    authorityKind: 'platform_reference',
    publisherType: publisher.publisherType,
    brandTier: publisher.brandTier,
    isOperatingAs: false,
  };
}

class CataloguePublisherContextService {
  async getPlatformPublishers(options: { search?: string; limit?: number } = {}) {
    const database = await getDb();
    if (!database) throw new Error('Database not available');
    const conditions: any[] = [
      eqPublisherAuthority(),
      eqPublisherVisible(),
    ];
    if (options.search?.trim()) {
      conditions.push(like(cataloguePublishers.name, `%${options.search.trim()}%`));
    }
    const rows = await database
      .select()
      .from(cataloguePublishers)
      .where(and(...conditions))
      .limit(options.limit || 50);
    return rows.map(toContext);
  }

  async getPublisherContext(cataloguePublisherId: number): Promise<CataloguePublisherContext> {
    const publisher = await developerIdentityService.getPlatformPublisherById(cataloguePublisherId);
    if (!publisher) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Platform catalogue publisher not found or not accessible.',
      });
    }
    return toContext(publisher);
  }

  async verifyPublisherContext(cataloguePublisherId: number) {
    return this.getPublisherContext(cataloguePublisherId);
  }

  async isPlatformPublisherAvailable(cataloguePublisherId: number) {
    try {
      await this.getPublisherContext(cataloguePublisherId);
      return true;
    } catch {
      return false;
    }
  }
}

// These helpers keep the query visibly tied to the new immutable authority
// and avoid route code reconstructing the custody predicate.
function eqPublisherAuthority() {
  return eq(cataloguePublishers.authorityKind, 'platform_reference');
}
function eqPublisherVisible() {
  return eq(cataloguePublishers.isVisible, 1);
}

export const cataloguePublisherContextService = new CataloguePublisherContextService();
