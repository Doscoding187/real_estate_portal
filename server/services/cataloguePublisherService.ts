/**
 * Catalogue Publisher service.
 *
 * No runtime path in this service reads or writes `developerBrandProfiles`.
 * Platform-curated publisher records and developer first-party publisher
 * records are separate immutable authority kinds. Publisher authority kind and ownership are immutable.
 */
import { TRPCError } from '@trpc/server';
import {
  developerIdentityService,
  type PublisherFilters,
  type LocalPublisherDiscovery,
  type UpdateCataloguePublisherInput,
} from './developerIdentityService';
import { assertCataloguePublisherContentMutation } from './cataloguePublisherMutationPolicy';

export interface CreateCataloguePublisherInput {
  brandName: string;
  slug?: string;
  logoUrl?: string | null;
  about?: string | null;
  foundedYear?: number | null;
  headOfficeLocation?: string | null;
  operatingProvinces?: string[];
  propertyFocus?: string[];
  websiteUrl?: string | null;
  publicContactEmail?: string | null;
  brandTier?: 'national' | 'regional' | 'boutique';
  identityType?: 'developer' | 'marketing_agency' | 'hybrid';
  sourceAttribution?: string | null;
  isVisible?: boolean;
  isContactVerified?: boolean;
  createdBy?: number;
}

export interface UpdateCataloguePublisherCommand extends UpdateCataloguePublisherInput {
  brandName?: string;
}

export type CataloguePublisherFilters = PublisherFilters;

function projectPublisher(publisher: any) {
  if (!publisher) return null;
  return {
    ...publisher,
    brandName: publisher.brandName ?? publisher.name,
    name: publisher.name ?? publisher.brandName,
    identityType: publisher.identityType ?? publisher.publisherType,
    cataloguePublisherId: publisher.id,
  };
}

async function createPlatformReferencePublisher(input: CreateCataloguePublisherInput) {
  const sourceAttribution = input.sourceAttribution?.trim();
  if (!sourceAttribution) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'A source attribution is required for a platform reference publisher.',
    });
  }
  const publisher = await developerIdentityService
    .getPublisherBySlug(input.slug || input.brandName, false)
    .catch(() => null);
  if (publisher) {
    throw new TRPCError({ code: 'CONFLICT', message: 'A publisher with this public identity already exists.' });
  }

  // The service owns platform-reference creation. Registration creates a
  // first-party publisher through createDeveloperOrganisation instead.
  const databasePublisher = await (async () => {
    const { getDb } = await import('../db-connection');
    const { cataloguePublishers } = await import('../../drizzle/schema');
    const { eq } = await import('drizzle-orm');
    const database = await getDb();
    if (!database) throw new Error('Database not available');
    const base = (input.slug || input.brandName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 200);
    let slug = base || 'publisher';
    for (let index = 2; index < 1000; index += 1) {
      const [existing] = await database
        .select({ id: cataloguePublishers.id })
        .from(cataloguePublishers)
        .where(eq(cataloguePublishers.slug, slug))
        .limit(1);
      if (!existing) break;
      slug = `${base}-${index}`;
    }
    const [result] = await database.insert(cataloguePublishers).values({
      authorityKind: 'platform_reference',
      publisherType: input.identityType || 'developer',
      name: input.brandName.trim(),
      slug,
      logoUrl: input.logoUrl ?? null,
      about: input.about ?? null,
      foundedYear: input.foundedYear ?? null,
      headOfficeLocation: input.headOfficeLocation ?? null,
      operatingProvinces: input.operatingProvinces ?? [],
      propertyFocus: input.propertyFocus ?? [],
      websiteUrl: input.websiteUrl ?? null,
      publicContactEmail: input.publicContactEmail ?? null,
      brandTier: input.brandTier || 'regional',
      sourceAttribution,
      isVisible: input.isVisible === false ? 0 : 1,
      isContactVerified: input.isContactVerified ? 1 : 0,
      createdByUserId: input.createdBy ?? null,
    });
    return database
      .select()
      .from(cataloguePublishers)
      .where(eq(cataloguePublishers.id, Number(result.insertId)))
      .limit(1)
      .then(rows => rows[0]);
  })();
  return { id: databasePublisher.id, slug: databasePublisher.slug };
}

async function getPublisherById(id: number) {
  return projectPublisher(await developerIdentityService.getPublisherById(id));
}

async function getPublisherBySlug(slug: string) {
  return projectPublisher(await developerIdentityService.getPublisherBySlug(slug, true));
}

async function getPublicPublisherById(id: number) {
  return projectPublisher(await developerIdentityService.getPublicPublisherById(id));
}

async function getPublicPublisherBySlug(slug: string) {
  return projectPublisher(await developerIdentityService.getPublicPublisherBySlug(slug));
}

async function listPublishers(filters: CataloguePublisherFilters = {}) {
  return (await developerIdentityService.listCataloguePublishers(filters)).map(projectPublisher);
}

async function listPublicPublishers(filters: CataloguePublisherFilters = {}) {
  return (await developerIdentityService.listPublicCataloguePublishers({
    ...filters,
    isVisible: true,
  })).map(projectPublisher);
}

async function listPublicPublishersByProvince(
  province: string,
  limit?: number,
): Promise<LocalPublisherDiscovery[]> {
  return developerIdentityService.listPublicPublishersByProvince(province, limit);
}

async function updatePublisher(id: number, input: UpdateCataloguePublisherCommand) {
  assertCataloguePublisherContentMutation(input);
  const publisher = await developerIdentityService.updateCataloguePublisher(id, {
    name: input.name ?? input.brandName,
    slug: input.slug,
    logoUrl: input.logoUrl,
    about: input.about,
    foundedYear: input.foundedYear,
    headOfficeLocation: input.headOfficeLocation,
    operatingProvinces: input.operatingProvinces,
    propertyFocus: input.propertyFocus,
    websiteUrl: input.websiteUrl,
    publicContactEmail: input.publicContactEmail,
    brandTier: input.brandTier,
    sourceAttribution: input.sourceAttribution,
    isVisible: input.isVisible,
    isContactVerified: input.isContactVerified,
  });
  return projectPublisher(publisher);
}

async function toggleVisibility(id: number, visible: boolean) {
  return projectPublisher(await developerIdentityService.setPublisherVisibility(id, visible));
}

async function getPublisherDevelopments(cataloguePublisherId: number) {
  return developerIdentityService.getPublisherDevelopments(cataloguePublisherId);
}

async function getPublisherWithStats(id: number) {
  const profile = await getPublisherById(id);
  if (!profile) return null;
  const developments = await getPublisherDevelopments(id);
  return { ...profile, developmentCount: developments.length };
}

async function incrementLeadCountAsync(_cataloguePublisherId: number) {
  // Lead counts are derived from leads; mutable publisher counters are no
  // longer an authority.
  return { success: true };
}

async function getPublisherLeadStats(cataloguePublisherId: number) {
  return developerIdentityService.getPublisherLeadStats(cataloguePublisherId);
}

async function hidePublisher(id: number, _force = false) {
  const profile = await getPublisherById(id);
  if (!profile) throw new TRPCError({ code: 'NOT_FOUND', message: `Publisher ${id} not found.` });
  await developerIdentityService.setPublisherVisibility(id, false);
  return {
    success: true,
    mode: 'soft' as const,
    message: `Publisher "${profile.brandName}" hidden. Destructive identity removal requires a separate migration authorization.`,
  };
}

async function verifyPlatformPublisherOperation(id: number, operation: string) {
  const profile = await getPublisherById(id);
  if (!profile) return { canOperate: false, reason: 'Publisher not found' };
  if (profile.authorityKind !== 'platform_reference' || profile.developerOrganisationId !== null) {
    return {
      canOperate: false,
      reason: `Cannot ${operation} on a first-party publisher from platform context.`,
    };
  }
  return { canOperate: true, publisher: profile };
}

export const cataloguePublisherService = {
  createPlatformReferencePublisher,
  getPublisherById,
  getPublisherBySlug,
  getPublicPublisherById,
  getPublicPublisherBySlug,
  listPublishers,
  listPublicPublishers,
  listPublicPublishersByProvince,
  updatePublisher,
  toggleVisibility,
  hidePublisher,
  verifyPlatformPublisherOperation,
  getPublisherDevelopments,
  getPublisherWithStats,
  incrementLeadCountAsync,
  getPublisherLeadStats,
};

// Canonical named exports for direct service consumers.
export {
  createPlatformReferencePublisher,
  getPublisherById,
  getPublisherBySlug,
  getPublicPublisherById,
  getPublicPublisherBySlug,
  listPublishers,
  listPublicPublishers,
  listPublicPublishersByProvince,
  updatePublisher,
  toggleVisibility,
  hidePublisher,
  verifyPlatformPublisherOperation,
  getPublisherDevelopments,
  getPublisherWithStats,
  incrementLeadCountAsync,
  getPublisherLeadStats,
};
