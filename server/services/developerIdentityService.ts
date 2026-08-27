import { and, asc, desc, eq, inArray, like, or, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db-connection';
import {
  cataloguePublishers,
  developerOrganisationMemberships,
  developerOrganisations,
  developments,
  leads,
  users,
} from '../../drizzle/schema';
import { assertCataloguePublisherContentMutation } from './cataloguePublisherMutationPolicy';
import { publicDevelopmentEligibilityConditions } from './publicDevelopmentEligibility';

export type PublisherAuthorityKind = 'platform_reference' | 'developer_first_party';
export type DeveloperOrganisationStatus = 'pending' | 'approved' | 'rejected';

export interface CreateDeveloperOrganisationInput {
  name: string;
  description?: string | null;
  logo?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  category?: 'residential' | 'commercial' | 'mixed_use' | 'industrial';
  establishedYear?: number | null;
  trackRecord?: string | null;
  specializations?: string[] | null;
  createdByUserId: number;
}

export interface UpdateCataloguePublisherInput {
  name?: string;
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
  sourceAttribution?: string | null;
  isVisible?: boolean;
  isContactVerified?: boolean;
}

export interface PublisherFilters {
  brandTier?: 'national' | 'regional' | 'boutique';
  isSubscriber?: boolean;
  isVisible?: boolean;
  authorityKind?: PublisherAuthorityKind;
  search?: string;
  limit?: number;
  offset?: number;
}

export type LocalPublisherDiscovery = {
  id: number;
  slug: string;
  brandName: string;
  logoUrl: string | null;
  headOfficeLocation: string | null;
  localStats: {
    activeDevelopments: number;
    sellingNow: number;
    launchingSoon: number;
  };
};

export type DeveloperIdentity = typeof developerOrganisations.$inferSelect & {
  organisation: typeof developerOrganisations.$inferSelect;
  membership: typeof developerOrganisationMemberships.$inferSelect;
  publisher: typeof cataloguePublishers.$inferSelect;
  organisationId: number;
  publisherId: number;
  userId: number;
  /** Compatibility DTO fields. These are projections, not persistence authority. */
  id: number;
  userIdLegacy: number;
  name: string;
  status: DeveloperOrganisationStatus;
  rejectionReason: string | null;
  cataloguePublisherId: number;
};

function slugify(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
  return slug || 'publisher';
}

async function uniquePublisherSlug(
  database: any,
  source: string,
  excludeId?: number,
): Promise<string> {
  const base = slugify(source);
  for (let suffix = 0; suffix < 1000; suffix += 1) {
    const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`;
    const conditions = [eq(cataloguePublishers.slug, candidate)];
    if (excludeId) conditions.push(sql`${cataloguePublishers.id} <> ${excludeId}` as any);
    const [existing] = await database
      .select({ id: cataloguePublishers.id })
      .from(cataloguePublishers)
      .where(and(...conditions))
      .limit(1);
    if (!existing) return candidate;
  }
  throw new TRPCError({
    code: 'CONFLICT',
    message: 'A unique public publisher slug is unavailable.',
  });
}

async function uniqueOrganisationSlug(database: any, source: string): Promise<string> {
  const base = slugify(source);
  for (let suffix = 0; suffix < 1000; suffix += 1) {
    const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`;
    const [existing] = await database
      .select({ id: developerOrganisations.id })
      .from(developerOrganisations)
      .where(eq(developerOrganisations.slug, candidate))
      .limit(1);
    if (!existing) return candidate;
  }
  throw new TRPCError({ code: 'CONFLICT', message: 'A unique organisation slug is unavailable.' });
}

function identityFromRows(
  organisation: typeof developerOrganisations.$inferSelect,
  membership: typeof developerOrganisationMemberships.$inferSelect,
  publisher: typeof cataloguePublishers.$inferSelect,
): DeveloperIdentity {
  return {
    ...organisation,
    organisation,
    membership,
    publisher,
    organisationId: organisation.id,
    publisherId: publisher.id,
    userId: membership.userId,
    id: organisation.id,
    userIdLegacy: membership.userId,
    name: organisation.name,
    status: organisation.status,
    rejectionReason: organisation.rejectionReason,
    cataloguePublisherId: publisher.id,
  };
}

async function loadIdentityForMembership(database: any, membershipId: number) {
  const rows = await database
    .select({
      organisation: developerOrganisations,
      membership: developerOrganisationMemberships,
      publisher: cataloguePublishers,
    })
    .from(developerOrganisationMemberships)
    .innerJoin(
      developerOrganisations,
      eq(developerOrganisationMemberships.organisationId, developerOrganisations.id),
    )
    .innerJoin(
      cataloguePublishers,
      and(
        eq(cataloguePublishers.developerOrganisationId, developerOrganisations.id),
        eq(cataloguePublishers.authorityKind, 'developer_first_party'),
      ),
    )
    .where(
      and(
        eq(developerOrganisationMemberships.id, membershipId),
        eq(developerOrganisationMemberships.status, 'active'),
      ),
    )
    .limit(1);
  const row = rows[0];
  return row ? identityFromRows(row.organisation, row.membership, row.publisher) : null;
}

export async function createDeveloperOrganisation(input: CreateDeveloperOrganisationInput) {
  const database = await getDb();
  if (!database) throw new Error('Database not available');

  const name = input.name.trim();
  if (name.length < 2) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Organisation name must be at least 2 characters.',
    });
  }

  return database.transaction(async (tx: any) => {
    // Serialize onboarding attempts for the authenticated principal. The
    // membership uniqueness constraint protects one organisation's rows, but
    // only a user-row lock makes the "one active organisation" decision
    // deterministic when two requests arrive concurrently before either has
    // inserted its membership.
    const [principal] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, input.createdByUserId))
      .for('update')
      .limit(1);
    if (!principal) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Authenticated user was not found.' });
    }

    const existingMemberships = await tx
      .select({ id: developerOrganisationMemberships.id })
      .from(developerOrganisationMemberships)
      .where(
        and(
          eq(developerOrganisationMemberships.userId, input.createdByUserId),
          eq(developerOrganisationMemberships.status, 'active'),
        ),
      )
      .orderBy(asc(developerOrganisationMemberships.id))
      .limit(2);

    if (existingMemberships.length > 1) {
      throw new TRPCError({
        code: 'CONFLICT',
        message:
          'Multiple active developer organisations require an explicit organisation context.',
      });
    }

    if (existingMemberships[0]) {
      const existing = await loadIdentityForMembership(tx, existingMemberships[0].id);
      if (existing) return existing;
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'The user already has an active developer organisation without a valid publisher.',
      });
    }

    const organisationSlug = await uniqueOrganisationSlug(tx, name);
    const [organisationResult] = await tx.insert(developerOrganisations).values({
      name,
      slug: organisationSlug,
      description: input.description ?? null,
      logo: input.logo ?? null,
      website: input.website ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      province: input.province ?? null,
      category: input.category ?? 'residential',
      establishedYear: input.establishedYear ?? null,
      trackRecord: input.trackRecord ?? null,
      specializations: input.specializations ?? [],
      status: 'pending',
    });
    const organisationId = Number(organisationResult.insertId);

    const [membershipResult] = await tx.insert(developerOrganisationMemberships).values({
      organisationId,
      userId: input.createdByUserId,
      role: 'owner',
      status: 'active',
    });

    const publisherSlug = await uniquePublisherSlug(tx, name);
    const [publisherResult] = await tx.insert(cataloguePublishers).values({
      authorityKind: 'developer_first_party',
      publisherType: 'developer',
      developerOrganisationId: organisationId,
      name,
      slug: publisherSlug,
      logoUrl: input.logo ?? null,
      about: input.description ?? null,
      foundedYear: input.establishedYear ?? null,
      headOfficeLocation:
        input.city && input.province ? `${input.city}, ${input.province}` : (input.city ?? null),
      operatingProvinces: input.province ? [input.province] : [],
      propertyFocus: input.specializations ?? [],
      websiteUrl: input.website ?? null,
      publicContactEmail: input.email ?? null,
      isVisible: 0,
      isContactVerified: 0,
      createdByUserId: input.createdByUserId,
    });

    const identity = await loadIdentityForMembership(tx, Number(membershipResult.insertId));
    if (!identity || identity.publisherId !== Number(publisherResult.insertId)) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Developer organisation was created without a coherent first-party publisher.',
      });
    }
    return identity;
  });
}

export async function getDeveloperByUserId(userId: number): Promise<DeveloperIdentity | null> {
  const database = await getDb();
  if (!database) return null;
  const memberships = await database
    .select({ id: developerOrganisationMemberships.id })
    .from(developerOrganisationMemberships)
    .where(
      and(
        eq(developerOrganisationMemberships.userId, userId),
        eq(developerOrganisationMemberships.status, 'active'),
      ),
    )
    .orderBy(asc(developerOrganisationMemberships.id));

  if (memberships.length > 1) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'Multiple active developer organisations require an explicit organisation context.',
    });
  }
  return memberships[0] ? loadIdentityForMembership(database, memberships[0].id) : null;
}

export async function requireDeveloperIdentityByUserId(userId: number): Promise<DeveloperIdentity> {
  const identity = await getDeveloperByUserId(userId);
  if (!identity) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Developer organisation not found. Please complete onboarding.',
    });
  }
  return identity;
}

export interface ResubmitDeveloperOrganisationInput {
  organisationId: number;
  name?: string | null;
  description?: string | null;
  logo?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  category?: 'residential' | 'commercial' | 'mixed_use' | 'industrial';
  establishedYear?: number | null;
  specializations?: string[] | null;
}

/**
 * Apply a rejected developer organisation's corrections and return the
 * identity to identity review. This is the only developer-owned transition
 * out of `rejected`; `pending` and `approved` organisations are immutable
 * through this path so identity approval stays a Property Listify decision.
 */
export async function resubmitRejectedDeveloperOrganisation(
  input: ResubmitDeveloperOrganisationInput,
): Promise<DeveloperIdentity> {
  const database = await getDb();
  if (!database) throw new Error('Database not available');

  if (input.name !== undefined && input.name !== null && input.name.trim().length < 2) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Organisation name must be at least 2 characters.',
    });
  }

  return database.transaction(async (tx: any) => {
    const [organisation] = await tx
      .select()
      .from(developerOrganisations)
      .where(eq(developerOrganisations.id, input.organisationId))
      .for('update')
      .limit(1);

    if (!organisation) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Developer organisation not found.' });
    }
    if (organisation.status !== 'rejected') {
      throw new TRPCError({
        code: 'CONFLICT',
        message:
          organisation.status === 'pending'
            ? 'Your developer organisation is already pending review.'
            : 'Your developer organisation is already approved.',
      });
    }

    const organisationValues: Record<string, unknown> = {};
    for (const key of [
      'name',
      'description',
      'logo',
      'website',
      'email',
      'phone',
      'address',
      'city',
      'province',
      'category',
      'establishedYear',
      'specializations',
    ] as const) {
      if (input[key] === undefined) continue;
      // Category is a non-null enum column: an absent/empty submission must
      // retain the existing value rather than attempt to write null.
      if (key === 'category' && !input.category) continue;
      organisationValues[key] = input[key];
    }
    // Identity review re-runs on the corrected submission.
    organisationValues.status = 'pending';
    organisationValues.rejectionReason = null;

    await tx
      .update(developerOrganisations)
      .set(organisationValues as any)
      .where(eq(developerOrganisations.id, input.organisationId));

    const publisherValues: Record<string, unknown> = {};
    if (input.name !== undefined && input.name !== null) publisherValues.name = input.name.trim();
    if (input.logo !== undefined) publisherValues.logoUrl = input.logo;
    if (input.description !== undefined) publisherValues.about = input.description;
    if (input.website !== undefined) publisherValues.websiteUrl = input.website;
    if (input.email !== undefined) publisherValues.publicContactEmail = input.email;
    if (input.establishedYear !== undefined) publisherValues.foundedYear = input.establishedYear;
    if (input.city !== undefined || input.province !== undefined) {
      const city = input.city !== undefined ? input.city : organisation.city;
      const province = input.province !== undefined ? input.province : organisation.province;
      publisherValues.headOfficeLocation =
        city && province ? `${city}, ${province}` : (city ?? null);
    }
    if (input.province !== undefined) {
      publisherValues.operatingProvinces = input.province ? [input.province] : [];
    }
    if (input.specializations !== undefined) {
      publisherValues.propertyFocus = input.specializations ?? [];
    }
    if (Object.keys(publisherValues).length) {
      await tx
        .update(cataloguePublishers)
        .set(publisherValues as any)
        .where(
          and(
            eq(cataloguePublishers.developerOrganisationId, input.organisationId),
            eq(cataloguePublishers.authorityKind, 'developer_first_party'),
          ),
        );
    }

    const memberships = await tx
      .select({ id: developerOrganisationMemberships.id })
      .from(developerOrganisationMemberships)
      .where(
        and(
          eq(developerOrganisationMemberships.organisationId, input.organisationId),
          eq(developerOrganisationMemberships.status, 'active'),
        ),
      )
      .orderBy(asc(developerOrganisationMemberships.id))
      .limit(1);

    if (!memberships[0]) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Developer organisation has no active owner membership.',
      });
    }

    const identity = await loadIdentityForMembership(tx, memberships[0].id);
    if (!identity) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Resubmitted developer organisation lost its coherent first-party publisher.',
      });
    }
    return identity;
  });
}

export async function getPublisherById(id: number) {
  const database = await getDb();
  if (!database) return null;
  const [publisher] = await database
    .select()
    .from(cataloguePublishers)
    .where(eq(cataloguePublishers.id, id))
    .limit(1);
  return publisher ?? null;
}

export async function getPublisherBySlug(slug: string, visibleOnly = true) {
  const database = await getDb();
  if (!database) return null;
  const conditions = [eq(cataloguePublishers.slug, slug.trim())];
  if (visibleOnly) conditions.push(eq(cataloguePublishers.isVisible, 1));
  const [publisher] = await database
    .select()
    .from(cataloguePublishers)
    .where(and(...conditions))
    .limit(1);
  return publisher ?? null;
}

export async function getPlatformPublisherById(id: number) {
  const publisher = await getPublisherById(id);
  if (
    !publisher ||
    publisher.authorityKind !== 'platform_reference' ||
    publisher.developerOrganisationId !== null ||
    Number(publisher.isVisible) !== 1 ||
    !publisher.sourceAttribution?.trim()
  ) {
    return null;
  }
  return publisher;
}

function publicPublisherAuthorityCondition() {
  return or(
    and(
      eq(cataloguePublishers.authorityKind, 'platform_reference'),
      sql`CHAR_LENGTH(TRIM(COALESCE(${cataloguePublishers.sourceAttribution}, ''))) > 0`,
    ),
    and(
      eq(cataloguePublishers.authorityKind, 'developer_first_party'),
      eq(developerOrganisations.status, 'approved'),
    ),
  );
}

export async function getPublicPublisherById(id: number) {
  const database = await getDb();
  if (!database) return null;
  const rows = await database
    .select({ publisher: cataloguePublishers })
    .from(cataloguePublishers)
    .leftJoin(
      developerOrganisations,
      eq(cataloguePublishers.developerOrganisationId, developerOrganisations.id),
    )
    .where(
      and(
        eq(cataloguePublishers.id, id),
        eq(cataloguePublishers.isVisible, 1),
        publicPublisherAuthorityCondition(),
      ),
    )
    .limit(1);
  return rows[0]?.publisher ?? null;
}

export async function getPublicPublisherBySlug(slug: string) {
  const database = await getDb();
  if (!database) return null;
  const rows = await database
    .select({ publisher: cataloguePublishers })
    .from(cataloguePublishers)
    .leftJoin(
      developerOrganisations,
      eq(cataloguePublishers.developerOrganisationId, developerOrganisations.id),
    )
    .where(
      and(
        eq(cataloguePublishers.slug, slug.trim()),
        eq(cataloguePublishers.isVisible, 1),
        publicPublisherAuthorityCondition(),
      ),
    )
    .limit(1);
  return rows[0]?.publisher ?? null;
}

export async function listCataloguePublishers(filters: PublisherFilters = {}) {
  const database = await getDb();
  if (!database) return [];
  const conditions: any[] = [];
  if (filters.isVisible !== undefined)
    conditions.push(eq(cataloguePublishers.isVisible, filters.isVisible ? 1 : 0));
  if (filters.authorityKind)
    conditions.push(eq(cataloguePublishers.authorityKind, filters.authorityKind));
  if (filters.brandTier) conditions.push(eq(cataloguePublishers.brandTier, filters.brandTier));
  if (filters.isSubscriber !== undefined) {
    conditions.push(
      eq(
        cataloguePublishers.authorityKind,
        filters.isSubscriber ? 'developer_first_party' : 'platform_reference',
      ),
    );
  }
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(
      or(like(cataloguePublishers.name, term), like(cataloguePublishers.headOfficeLocation, term)),
    );
  }
  const publishers = await database
    .select()
    .from(cataloguePublishers)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(cataloguePublishers.createdAt))
    .limit(filters.limit ?? 50)
    .offset(filters.offset ?? 0);
  const ids = publishers.map(publisher => publisher.id);
  if (!ids.length) return [];
  const developmentCounts = await database
    .select({ publisherId: developments.cataloguePublisherId, count: sql<number>`COUNT(*)` })
    .from(developments)
    .where(inArray(developments.cataloguePublisherId, ids))
    .groupBy(developments.cataloguePublisherId);
  const countByPublisher = new Map(
    developmentCounts.map(row => [Number(row.publisherId), Number(row.count)]),
  );
  return publishers.map(publisher => ({
    ...publisher,
    brandName: publisher.name,
    identityType: publisher.publisherType,
    ownerType: publisher.authorityKind === 'platform_reference' ? 'platform' : 'developer',
    isSubscriber: publisher.authorityKind === 'developer_first_party' ? 1 : 0,
    developmentCount: countByPublisher.get(publisher.id) ?? 0,
  }));
}

export async function listPublicCataloguePublishers(filters: PublisherFilters = {}) {
  const database = await getDb();
  if (!database) return [];
  const conditions: any[] = [
    eq(cataloguePublishers.isVisible, 1),
    publicPublisherAuthorityCondition(),
  ];
  if (filters.brandTier) conditions.push(eq(cataloguePublishers.brandTier, filters.brandTier));
  if (filters.authorityKind)
    conditions.push(eq(cataloguePublishers.authorityKind, filters.authorityKind));
  if (filters.isSubscriber !== undefined) {
    conditions.push(
      eq(
        cataloguePublishers.authorityKind,
        filters.isSubscriber ? 'developer_first_party' : 'platform_reference',
      ),
    );
  }
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(
      or(like(cataloguePublishers.name, term), like(cataloguePublishers.headOfficeLocation, term)),
    );
  }

  const rows = await database
    .select({ publisher: cataloguePublishers })
    .from(cataloguePublishers)
    .leftJoin(
      developerOrganisations,
      eq(cataloguePublishers.developerOrganisationId, developerOrganisations.id),
    )
    .where(and(...conditions))
    .orderBy(desc(cataloguePublishers.createdAt))
    .limit(filters.limit ?? 50)
    .offset(filters.offset ?? 0);
  const publishers = rows.map(row => row.publisher);
  if (!publishers.length) return [];
  const ids = publishers.map(publisher => publisher.id);
  const developmentCounts = await database
    .select({ publisherId: developments.cataloguePublisherId, count: sql<number>`COUNT(*)` })
    .from(developments)
    .where(inArray(developments.cataloguePublisherId, ids))
    .groupBy(developments.cataloguePublisherId);
  const countByPublisher = new Map(
    developmentCounts.map(row => [Number(row.publisherId), Number(row.count)]),
  );
  return publishers.map(publisher => ({
    ...publisher,
    brandName: publisher.name,
    identityType: publisher.publisherType,
    ownerType: publisher.authorityKind === 'platform_reference' ? 'platform' : 'developer',
    isSubscriber: publisher.authorityKind === 'developer_first_party' ? 1 : 0,
    developmentCount: countByPublisher.get(publisher.id) ?? 0,
  }));
}

/**
 * Organic homepage discovery for publishers with qualifying, live work in one
 * exact province. This query does not assign paid or featured placement.
 */
export async function listPublicPublishersByProvince(
  province: string,
  limit = 10,
): Promise<LocalPublisherDiscovery[]> {
  const database = await getDb();
  if (!database) return [];

  const rows = await database
    .select({
      id: cataloguePublishers.id,
      slug: cataloguePublishers.slug,
      brandName: cataloguePublishers.name,
      logoUrl: cataloguePublishers.logoUrl,
      headOfficeLocation: cataloguePublishers.headOfficeLocation,
      activeDevelopments: sql<number>`COUNT(*)`,
      sellingNow: sql<number>`SUM(CASE WHEN ${developments.status} = 'selling' THEN 1 ELSE 0 END)`,
      launchingSoon: sql<number>`SUM(CASE WHEN ${developments.status} = 'launching-soon' THEN 1 ELSE 0 END)`,
    })
    .from(developments)
    .innerJoin(cataloguePublishers, eq(developments.cataloguePublisherId, cataloguePublishers.id))
    .where(
      and(
        eq(developments.province, province),
        inArray(cataloguePublishers.publisherType, ['developer', 'hybrid']),
        publicDevelopmentEligibilityConditions(),
      ),
    )
    .groupBy(
      cataloguePublishers.id,
      cataloguePublishers.slug,
      cataloguePublishers.name,
      cataloguePublishers.logoUrl,
      cataloguePublishers.headOfficeLocation,
    )
    .orderBy(
      desc(sql`COUNT(*)`),
      desc(sql`MAX(${developments.publishedAt})`),
      asc(cataloguePublishers.name),
    )
    .limit(limit);

  return rows.map(row => ({
    id: row.id,
    slug: row.slug,
    brandName: row.brandName,
    logoUrl: row.logoUrl,
    headOfficeLocation: row.headOfficeLocation,
    localStats: {
      activeDevelopments: Number(row.activeDevelopments || 0),
      sellingNow: Number(row.sellingNow || 0),
      launchingSoon: Number(row.launchingSoon || 0),
    },
  }));
}

export async function updateCataloguePublisher(id: number, input: UpdateCataloguePublisherInput) {
  assertCataloguePublisherContentMutation(input);
  const database = await getDb();
  if (!database) throw new Error('Database not available');
  const existing = await getPublisherById(id);
  if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: `Publisher ${id} not found.` });
  const values: Record<string, unknown> = {};
  if (input.name !== undefined) values.name = input.name.trim();
  if (input.slug !== undefined) values.slug = await uniquePublisherSlug(database, input.slug, id);
  if (input.logoUrl !== undefined) values.logoUrl = input.logoUrl;
  if (input.about !== undefined) values.about = input.about;
  if (input.foundedYear !== undefined) values.foundedYear = input.foundedYear;
  if (input.headOfficeLocation !== undefined) values.headOfficeLocation = input.headOfficeLocation;
  if (input.operatingProvinces !== undefined) values.operatingProvinces = input.operatingProvinces;
  if (input.propertyFocus !== undefined) values.propertyFocus = input.propertyFocus;
  if (input.websiteUrl !== undefined) values.websiteUrl = input.websiteUrl;
  if (input.publicContactEmail !== undefined) values.publicContactEmail = input.publicContactEmail;
  if (input.brandTier !== undefined) values.brandTier = input.brandTier;
  if (input.sourceAttribution !== undefined) values.sourceAttribution = input.sourceAttribution;
  if (input.isVisible !== undefined) values.isVisible = input.isVisible ? 1 : 0;
  if (input.isContactVerified !== undefined)
    values.isContactVerified = input.isContactVerified ? 1 : 0;
  if (Object.keys(values).length)
    await database
      .update(cataloguePublishers)
      .set(values as any)
      .where(eq(cataloguePublishers.id, id));
  return getPublisherById(id);
}

export async function setPublisherVisibility(id: number, visible: boolean) {
  return updateCataloguePublisher(id, { isVisible: visible });
}

export async function getPublisherDevelopments(publisherId: number) {
  const database = await getDb();
  if (!database) return [];
  return database
    .select()
    .from(developments)
    .where(eq(developments.cataloguePublisherId, publisherId))
    .orderBy(desc(developments.createdAt));
}

export async function getPublisherLeadStats(publisherId: number) {
  const database = await getDb();
  if (!database) return null;
  const publisher = await getPublisherById(publisherId);
  if (!publisher) return null;
  const [total] = await database
    .select({ count: sql<number>`COUNT(*)` })
    .from(leads)
    .where(eq(leads.cataloguePublisherId, publisherId));
  const breakdown = await database
    .select({ status: leads.brandLeadStatus, count: sql<number>`COUNT(*)` })
    .from(leads)
    .where(eq(leads.cataloguePublisherId, publisherId))
    .groupBy(leads.brandLeadStatus);
  return {
    totalLeadsReceived: Number(total?.count ?? 0),
    unclaimedLeadCount: 0,
    lastLeadDate: null,
    isSubscriber: publisher.authorityKind === 'developer_first_party' ? 1 : 0,
    isContactVerified: publisher.isContactVerified,
    leadBreakdown: breakdown,
    totalLeads: Number(total?.count ?? 0),
    developmentCount: Number((await getPublisherDevelopments(publisherId)).length),
    propertyCount: 0,
  };
}

export async function assertPublisherForOrganisation(publisherId: number, organisationId: number) {
  const publisher = await getPublisherById(publisherId);
  if (
    !publisher ||
    publisher.authorityKind !== 'developer_first_party' ||
    Number(publisher.developerOrganisationId) !== Number(organisationId)
  ) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Publisher is not owned by this organisation.',
    });
  }
  return publisher;
}

export async function assertPublisherReadable(publisherId: number) {
  const publisher = await getPublisherById(publisherId);
  if (!publisher || Number(publisher.isVisible) !== 1) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Catalogue publisher not found.' });
  }
  return publisher;
}

export const developerIdentityService = {
  createDeveloperOrganisation,
  resubmitRejectedDeveloperOrganisation,
  getDeveloperByUserId,
  requireDeveloperIdentityByUserId,
  getPublisherById,
  getPublisherBySlug,
  getPlatformPublisherById,
  getPublicPublisherById,
  getPublicPublisherBySlug,
  listCataloguePublishers,
  listPublicCataloguePublishers,
  listPublicPublishersByProvince,
  updateCataloguePublisher,
  setPublisherVisibility,
  getPublisherDevelopments,
  getPublisherLeadStats,
  assertPublisherForOrganisation,
  assertPublisherReadable,
};
