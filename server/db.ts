import {
  eq,
  desc,
  getTableColumns,
  and,
  like,
  gte,
  lte,
  inArray,
  or,
  sql,
  SQL,
  isNull,
  not,
  count,
  avg,
  min,
  max,
  sum,
  aliasedTable,
} from 'drizzle-orm';
import {
  users,
  properties,
  propertyImages,
  favorites,
  savedSearches,
  agents,
  subscriptions,
  agencyAgentMemberships,
  agencies,
  leads,
  listings,
  listingMedia,
  listingAnalytics,
  listingApprovalQueue,
  listingLeads,
  listingViewings,
  sellerProspectActivities,
  sellerProspects,
  prospects,
  prospectFavorites,
  scheduledViewings,
  recentlyViewed,
  developerOrganisationMemberships,
  developerOrganisations,
  cataloguePublishers,
  developments,
  commissions,
  platformSettings,
  unitTypes,
  developmentPhases,
  services,
  reviews,
  exploreContent,
  exploreEngagements,
  exploreFeedSessions,
  locations,
  provinces,
  cities,
  suburbs,
  partners,
  explorePartners,
  auditLogs,
  commercialAvailabilityEconomics,
  commercialAvailabilityListingLinks,
  commercialAvailabilities,
  commercialSpaces,
} from '../drizzle/schema';

import { ENV } from './_core/env';
import { isCurrentActiveAgencyMembership } from './services/agencyMembershipService';
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import { normalizeLocationFields, validateLocationForPublish } from './utils/locationUtils';
import { locationResolver } from './services/locationResolverService';
import {
  assertListingPublicationEntitled,
  isSameListingCommercialOwner,
} from './services/listingPublicationEntitlementService';
import { toPublicPropertyType } from '../shared/property-taxonomy';
import {
  buildCanonicalCorePropertyDetails,
  buildCorePropertyInformation,
} from '../shared/core-property-information';
import { normalizeFeaturesContext } from '../shared/features-context';
import {
  buildPricingContract,
  getMoneyFactAmount,
  getPrimaryPrice,
  validatePricingContract,
} from '../shared/pricing-contract';
import {
  normalizeCoordinatePair,
  storedPrecisionToPublicLocationPolicy,
  type PrivateAddress,
} from '../shared/location-contract';
import {
  getListingMediaType,
  getListingMediaUrl,
  getPrimaryListingImage,
  isCompletedListingMedia,
} from '../shared/listing-media';
import { validateListingRecordLocation } from './services/listingLocationResolver';
import {
  getPresentationMediaDescriptor,
  getSafePropertyPresentationVirtualTour,
  normalizePropertyPresentation,
  summarizePropertyPresentation,
} from '../shared/property-presentation';
import { resolveMediaDeliveryUrl } from './_core/mediaStorage';
import { assertCommercialPricingContract } from '../shared/commercial-domain';

type CommercialListingApplicability =
  | { kind: 'not_owned' }
  | { kind: 'canonical_office' }
  | { kind: 'invalid_commercial_context'; message: string };

/** Resolves capability ownership from the canonical Listing association, never propertyType. */
async function resolveCommercialListingApplicability(
  db: any,
  listingId: number,
): Promise<CommercialListingApplicability> {
  const links = await db
    .select()
    .from(commercialAvailabilityListingLinks)
    .where(eq(commercialAvailabilityListingLinks.listingId, listingId));
  if (!links.length) return { kind: 'not_owned' };
  if (links.length !== 1 || links[0].linkStatus !== 'active') {
    return {
      kind: 'invalid_commercial_context',
      message: 'Commercial Listing association is not a single active canonical association.',
    };
  }
  const [availability] = await db
    .select()
    .from(commercialAvailabilities)
    .where(eq(commercialAvailabilities.id, links[0].commercialAvailabilityId))
    .limit(1);
  if (!availability) {
    return {
      kind: 'invalid_commercial_context',
      message: 'Commercial Listing association has no canonical Availability.',
    };
  }
  const [space] = await db
    .select()
    .from(commercialSpaces)
    .where(eq(commercialSpaces.id, availability.commercialSpaceId))
    .limit(1);
  if (!space || space.spaceClass !== 'office' || availability.transactionType !== 'lease') {
    return {
      kind: 'invalid_commercial_context',
      message: 'Commercial Listing association is not an Office lease Availability.',
    };
  }
  return { kind: 'canonical_office' };
}

async function validateCommercialOfficeListingPricing(
  db: any,
  listingId: number,
): Promise<CommercialListingApplicability> {
  const applicability = await resolveCommercialListingApplicability(db, listingId);
  if (applicability.kind !== 'canonical_office') return applicability;
  const [link] = await db
    .select()
    .from(commercialAvailabilityListingLinks)
    .where(
      and(
        eq(commercialAvailabilityListingLinks.listingId, listingId),
        eq(commercialAvailabilityListingLinks.linkStatus, 'active'),
      ),
    )
    .limit(1);
  if (!link)
    return {
      kind: 'invalid_commercial_context',
      message: 'Commercial Listing association disappeared during validation.',
    };
  const [availability] = await db
    .select()
    .from(commercialAvailabilities)
    .where(eq(commercialAvailabilities.id, link.commercialAvailabilityId))
    .limit(1);
  if (!availability || availability.transactionType !== 'lease')
    return {
      kind: 'invalid_commercial_context',
      message: 'Commercial Office listing has no active lease availability.',
    };
  const economics = await db
    .select()
    .from(commercialAvailabilityEconomics)
    .where(eq(commercialAvailabilityEconomics.commercialAvailabilityId, availability.id));
  assertCommercialPricingContract({
    pricingMode: availability.pricingMode as any,
    economics: economics.map((item: any) => ({
      componentCode: item.componentCode,
      valueState: item.valueState,
      chargeBasis: item.chargeBasis,
      amountMinor: item.amountMinor,
      rangeMaximumMinor: item.rangeMaximumMinor,
    })),
  });
  return applicability;
}

// Re-export getDb from the connection module to maintain backward compatibility
// and break circular dependency with locationResolverService
export { getDb } from './db-connection';
import { getDb, _db } from './db-connection';
import { developerIdentityService } from './services/developerIdentityService';

export type User = InferSelectModel<typeof users>;
export type InsertUser = InferInsertModel<typeof users>;
export type Property = InferSelectModel<typeof properties>;
export type InsertProperty = InferInsertModel<typeof properties>;
export type InsertPropertyImage = InferInsertModel<typeof propertyImages>;
export type Prospect = InferSelectModel<typeof prospects>;

// Explicit canonical user columns required by the login boundary.
export const AUTH_LOGIN_USER_COLUMNS = {
  id: users.id,
  openId: users.openId,
  email: users.email,
  passwordHash: users.passwordHash,
  name: users.name,
  emailVerified: users.emailVerified,
  role: users.role,
  emailVerificationToken: users.emailVerificationToken,
} as const;

// Explicit canonical user columns required by the session boundary.
export const AUTH_SESSION_USER_COLUMNS = {
  id: users.id,
  openId: users.openId,
  email: users.email,
  passwordHash: users.passwordHash,
  name: users.name,
  firstName: users.firstName,
  lastName: users.lastName,
  phone: users.phone,
  loginMethod: users.loginMethod,
  emailVerified: users.emailVerified,
  role: users.role,
  agencyId: users.agencyId,
  isSubaccount: users.isSubaccount,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
  lastSignedIn: users.lastSignedIn,
  passwordResetToken: users.passwordResetToken,
  passwordResetTokenExpiresAt: users.passwordResetTokenExpiresAt,
  emailVerificationToken: users.emailVerificationToken,
} as const;

function parseSessionUserId(sessionId: string): number {
  const parsed = Number(sessionId);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('Invalid sessionId format. Expected numeric user id.');
  }
  return parsed;
}

function toMysqlDateTime(value: Date | string = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  }
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function getPricingProjection(
  action: string | undefined,
  pricing: Record<string, unknown> | null | undefined,
  propertyDetails: Record<string, unknown> | null | undefined,
) {
  // Publication is a write boundary: the current authored scalar columns are
  // authoritative. A revision cloned from a published listing can still carry
  // the previous embedded pricing contract until this projection is rebuilt,
  // so preferring that snapshot would silently republish the old price.
  const contract = buildPricingContract(action, pricing, propertyDetails, {
    preferEmbedded: false,
  });
  const recurringCosts = contract?.intent === 'sale' ? contract.recurringCosts : {};
  const levyFact =
    recurringCosts.bodyCorporateLevy ||
    recurringCosts.hoaEstateLevy ||
    recurringCosts.otherMandatoryCharge;

  const primaryPrice =
    contract?.intent === 'sale'
      ? contract.askingPrice
      : contract?.intent === 'rent'
        ? contract.monthlyRent
        : getPrimaryPrice(action, pricing, propertyDetails);

  return {
    contract,
    price: primaryPrice ?? 0,
    ratesAndTaxes: getMoneyFactAmount(recurringCosts.ratesAndTaxes) ?? null,
    legacyLevy: getMoneyFactAmount(levyFact) ?? null,
  };
}

async function lockListingTransitionRow(database: any, listingId: number) {
  if (typeof database.execute !== 'function') return;
  await database.execute(sql`SELECT id FROM listings WHERE id = ${listingId} FOR UPDATE`);
}

// Export a synchronous db object that throws if not initialized
// This is for backwards compatibility with existing code
export const db = new Proxy({} as any, {
  get(_target, prop) {
    if (!_db) {
      throw new Error(
        'Database not initialized. Call getDb() first or use await getDb() in async functions.',
      );
    }
    return _db[prop];
  },
});

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error('User openId is required for upsert');
  }

  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot upsert user: database not available');
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ['name', 'email', 'loginMethod'] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = toMysqlDateTime(user.lastSignedIn as any);
      updateSet.lastSignedIn = toMysqlDateTime(user.lastSignedIn as any);
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerId) {
      values.role = 'super_admin'; // Owner gets super_admin role
      updateSet.role = 'super_admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = toMysqlDateTime();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = toMysqlDateTime();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error('[Database] Failed to upsert user:', error);
    throw error;
  }
}

export async function getUser(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot get user: database not available');
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Get user by ID (for custom authentication)
 */
export async function getUserById(id: number): Promise<User | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot get user: database not available');
    return undefined;
  }

  const result = await db
    .select(AUTH_SESSION_USER_COLUMNS)
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return result.length > 0 ? (result[0] as User) : undefined;
}

/**
 * Get user by email (for custom authentication)
 */
export async function getUserByEmail(email: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot get user: database not available');
    return undefined;
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return undefined;

  const result = await db
    .select(AUTH_LOGIN_USER_COLUMNS)
    .from(users)
    .where(sql`LOWER(TRIM(${users.email})) = ${normalizedEmail}`)
    .limit(2);

  if (result.length > 1) {
    throw new Error('Multiple accounts found for this email. Please contact support.');
  }

  return result.length > 0 ? (result[0] as User) : undefined;
}

/**
 * Create a new user (for custom registration)
 */
export async function createUser(
  userData: Omit<InsertUser, 'id' | 'createdAt' | 'updatedAt' | 'lastSignedIn'>,
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(users).values({
    ...userData,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: toMysqlDateTime(),
  });

  return Number(result[0].insertId);
}

/**
 * Delete a user by ID. Used to clean up partial registration failures.
 */
export async function deleteUserById(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.delete(users).where(eq(users.id, userId));
}

/**
 * Update user's last sign-in timestamp
 */
export async function updateUserLastSignIn(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.update(users).set({ lastSignedIn: toMysqlDateTime() }).where(eq(users.id, userId));
}

/**
 * Update user's password reset token
 */
export async function updateUserPasswordResetToken(
  userId: number,
  token: string,
  expiresAt: Date,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db
    .update(users)
    .set({
      passwordResetToken: token,
      passwordResetTokenExpiresAt: expiresAt,
    })
    .where(eq(users.id, userId));
}

/**
 * Get user by password reset token
 */
export async function getUserByPasswordResetToken(token: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot get user: database not available');
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.passwordResetToken, token)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Update user's password
 */
export async function updateUserPassword(userId: number, passwordHash: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db
    .update(users)
    .set({
      passwordHash,
      passwordResetToken: null,
      passwordResetTokenExpiresAt: null,
    })
    .where(eq(users.id, userId));
}

/**
 * Get user by email verification token
 */
export async function getUserByEmailVerificationToken(token: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot get user: database not available');
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.emailVerificationToken, token))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Mark user's email as verified
 */
export async function verifyUserEmail(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db
    .update(users)
    .set({
      emailVerified: 1,
      emailVerificationToken: null,
    })
    .where(eq(users.id, userId));
}

/**
 * Rotate or set a user's email verification token.
 */
export async function updateUserEmailVerificationToken(
  userId: number,
  token: string,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db
    .update(users)
    .set({
      emailVerificationToken: token,
    })
    .where(eq(users.id, userId));
}

// Property queries
export async function createProperty(property: InsertProperty) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Normalize location fields for consistent querying
  const normalizedProperty = normalizeLocationFields(property);

  // Validate location if publishing
  const validationError = validateLocationForPublish(normalizedProperty);
  if (validationError) {
    throw new Error(validationError);
  }

  // Resolve and populate location IDs if text fields are provided
  // This ensures new properties have proper ID references
  try {
    if (normalizedProperty.province && !normalizedProperty.provinceId) {
      const locationIds = await locationResolver.getLocationIds({
        provinceSlug: normalizedProperty.province,
        citySlug: normalizedProperty.city || undefined,
      });

      if (locationIds.provinceId) {
        normalizedProperty.provinceId = locationIds.provinceId;
      }
      if (locationIds.cityId) {
        normalizedProperty.cityId = locationIds.cityId;
      }
    }
  } catch (error) {
    // If location resolution fails, continue without IDs
    // The text-based fallback will still work
    console.warn('[createProperty] Location ID resolution failed:', error);
  }

  const result = await db.insert(properties).values(normalizedProperty);
  return result[0].insertId;
}

export async function createPropertyImage(image: InsertPropertyImage) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.insert(propertyImages).values(image);
}

export async function getPropertyById(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
  return result[0];
}

function assertListingBackedPropertyProjectionIsReadOnly(
  property: Pick<Property, 'sourceListingId'>,
  operation: string,
) {
  if (property.sourceListingId == null) return;

  throw new Error(
    `Listing-backed public property projections are read-only; use the canonical listing lifecycle to ${operation}.`,
  );
}

export async function getPropertyImages(propertyId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return await db
    .select()
    .from(propertyImages)
    .where(eq(propertyImages.propertyId, propertyId))
    .orderBy(propertyImages.displayOrder);
}

/**
 * Get all properties owned by a user
 */
export async function getUserProperties(
  userId: number,
  limit: number = 20,
  offset: number = 0,
): Promise<Property[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return await db
    .select()
    .from(properties)
    .where(eq(properties.ownerId, userId))
    .orderBy(desc(properties.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Update a property (only by owner or admin)
 */
export async function updateProperty(
  propertyId: number,
  userId: number,
  updates: Partial<InsertProperty>,
  userRole?: string,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Verify ownership
  const property = await getPropertyById(propertyId);
  if (!property) {
    throw new Error('Property not found');
  }

  // Check if user owns the property or is admin (super_admin or agency_admin)
  const isAdmin = userRole === 'super_admin' || userRole === 'agency_admin';
  if (property.ownerId !== userId && !isAdmin) {
    throw new Error('Unauthorized: You can only update your own properties');
  }

  assertListingBackedPropertyProjectionIsReadOnly(property, 'update this inventory');

  // Normalize location fields for consistent querying
  const normalizedUpdates = normalizeLocationFields(updates);

  // Validate location if publishing
  const finalData = { ...property, ...normalizedUpdates };
  const validationError = validateLocationForPublish(finalData);
  if (validationError) {
    throw new Error(validationError);
  }

  // Resolve and populate location IDs if location fields are being updated
  try {
    const province = normalizedUpdates.province || property.province;
    const city = normalizedUpdates.city || property.city;

    if (province && (normalizedUpdates.province || normalizedUpdates.city)) {
      const locationIds = await locationResolver.getLocationIds({
        provinceSlug: province,
        citySlug: city || undefined,
      });

      if (locationIds.provinceId) {
        normalizedUpdates.provinceId = locationIds.provinceId;
      }
      if (locationIds.cityId) {
        normalizedUpdates.cityId = locationIds.cityId;
      }
    }
  } catch (error) {
    // If location resolution fails, continue without IDs
    console.warn('[updateProperty] Location ID resolution failed:', error);
  }

  await db
    .update(properties)
    .set({
      ...normalizedUpdates,
      updatedAt: new Date(),
    })
    .where(eq(properties.id, propertyId));
}

/**
 * Delete a property (only by owner or admin)
 */
export async function deleteProperty(
  propertyId: number,
  userId: number,
  userRole?: string,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Verify ownership
  const property = await getPropertyById(propertyId);
  if (!property) {
    throw new Error('Property not found');
  }

  // Check if user owns the property or is admin (super_admin or agency_admin)
  const isAdmin = userRole === 'super_admin' || userRole === 'agency_admin';
  if (property.ownerId !== userId && !isAdmin) {
    throw new Error('Unauthorized: You can only delete your own properties');
  }

  assertListingBackedPropertyProjectionIsReadOnly(property, 'delete this inventory');

  // Cascade delete will handle propertyImages
  await db.delete(properties).where(eq(properties.id, propertyId));
}

/**
 * Delete a property image
 */
export async function deletePropertyImage(imageId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Get image and verify ownership through property
  const image = await db
    .select()
    .from(propertyImages)
    .where(eq(propertyImages.id, imageId))
    .limit(1);

  if (image.length === 0) {
    throw new Error('Image not found');
  }

  const property = await getPropertyById(image[0].propertyId);
  if (!property || property.ownerId !== userId) {
    throw new Error('Unauthorized: You can only delete images from your own properties');
  }

  await db.delete(propertyImages).where(eq(propertyImages.id, imageId));
}

export interface PropertySearchParams {
  city?: string;
  province?: string;
  propertyType?: string;
  listingType?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minArea?: number;
  maxArea?: number;
  status?: string;
  amenities?: string[];
  postedBy?: string[];
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
  limit?: number;
  offset?: number;
}

export async function searchProperties(params: PropertySearchParams) {
  const db = await getDb();
  if (!db) return [];

  const conditions: SQL[] = [];

  // Build WHERE conditions
  if (params.city) conditions.push(like(properties.city, `%${params.city}%`));
  if (params.province) conditions.push(like(properties.province, `%${params.province}%`));
  if (params.propertyType) conditions.push(eq(properties.propertyType, params.propertyType as any));
  if (params.listingType) conditions.push(eq(properties.listingType, params.listingType as any));
  if (params.minPrice) conditions.push(gte(properties.price, params.minPrice));
  if (params.maxPrice) conditions.push(lte(properties.price, params.maxPrice));
  if (params.minBedrooms) conditions.push(gte(properties.bedrooms, params.minBedrooms));
  if (params.maxBedrooms) conditions.push(lte(properties.bedrooms, params.maxBedrooms));
  if (params.minArea) conditions.push(gte(properties.area, params.minArea));
  if (params.maxArea) conditions.push(lte(properties.area, params.maxArea));
  if (params.status) conditions.push(eq(properties.status, params.status as any));

  // Bounding box search
  if (params.minLat && params.maxLat && params.minLng && params.maxLng) {
    conditions.push(
      and(
        gte(sql`CAST(${properties.publicLatitude} AS DECIMAL)`, params.minLat),
        lte(sql`CAST(${properties.publicLatitude} AS DECIMAL)`, params.maxLat),
        gte(sql`CAST(${properties.publicLongitude} AS DECIMAL)`, params.minLng),
        lte(sql`CAST(${properties.publicLongitude} AS DECIMAL)`, params.maxLng),
      )!,
    );
  }

  // Amenities filter
  if (params.amenities && params.amenities.length > 0) {
    for (const amenity of params.amenities) {
      conditions.push(like(properties.amenities, `%${amenity}%`));
    }
  }

  // Posted By filter
  if (params.postedBy && params.postedBy.length > 0) {
    const roleConditions: SQL[] = [];
    if (params.postedBy.includes('Owner')) {
      roleConditions.push(eq(users.role, 'visitor'));
    }
    if (params.postedBy.includes('Dealer') || params.postedBy.includes('Agent')) {
      roleConditions.push(or(eq(users.role, 'agent'), eq(users.role, 'agency_admin'))!);
    }
    if (params.postedBy.includes('Builder') || params.postedBy.includes('Developer')) {
      roleConditions.push(eq(users.role, 'property_developer'));
    }

    if (roleConditions.length > 0) {
      conditions.push(
        inArray(
          properties.ownerId,
          db
            .select({ id: users.id })
            .from(users)
            .where(or(...roleConditions)!),
        ),
      );
    }
  }

  // Bounds filter
  if (params.minLat !== undefined && params.maxLat !== undefined) {
    conditions.push(
      sql`CAST(${properties.publicLatitude} AS DECIMAL(10, 6)) >= ${params.minLat} AND CAST(${properties.publicLatitude} AS DECIMAL(10, 6)) <= ${params.maxLat}`,
    );
  }
  if (params.minLng !== undefined && params.maxLng !== undefined) {
    conditions.push(
      sql`CAST(${properties.publicLongitude} AS DECIMAL(10, 6)) >= ${params.minLng} AND CAST(${properties.publicLongitude} AS DECIMAL(10, 6)) <= ${params.maxLng}`,
    );
  }

  let query = db.select().from(properties);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  query = query.orderBy(desc(properties.createdAt)) as any;

  if (params.limit) {
    query = query.limit(params.limit) as any;
  }
  if (params.offset) {
    query = query.offset(params.offset) as any;
  }

  const results = await query;

  // Get boosted listings for search channel
  try {
    const { getBoostedListingsForChannel } = await import('./campaignBoost');
    const boostedIds = await getBoostedListingsForChannel('search', 3);

    if (boostedIds.length > 0) {
      // Fetch boosted properties
      const boostedProperties = await db
        .select()
        .from(properties)
        .where(inArray(properties.id, boostedIds));

      // Remove boosted from regular results to avoid duplicates
      const filteredResults = results.filter((prop: any) => !boostedIds.includes(prop.id));

      // Merge: boosted first, then regular
      return [...boostedProperties, ...filteredResults].slice(0, params.limit || 20);
    }
  } catch (error) {
    console.error('Error applying campaign boost:', error);
  }

  return results;
}

export async function getFeaturedProperties(limit: number = 6) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return await db
    .select()
    .from(properties)
    .where(and(eq(properties.featured, 1), eq(properties.status, 'available' as any)))
    .orderBy(desc(properties.createdAt))
    .limit(limit);
}

export async function incrementPropertyViews(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db
    .update(properties)
    .set({ views: sql`${properties.views} + 1` })
    .where(eq(properties.id, id));
}

// Favorites queries
export async function addFavorite(userId: number, propertyId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.insert(favorites).values({ userId, propertyId });
}

export async function removeFavorite(userId: number, propertyId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db
    .delete(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.propertyId, propertyId)));
}

export async function getUserFavorites(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return await db
    .select({
      id: favorites.id,
      propertyId: favorites.propertyId,
      property: properties,
      createdAt: favorites.createdAt,
    })
    .from(favorites)
    .innerJoin(properties, eq(favorites.propertyId, properties.id))
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt));
}

export async function isFavorite(userId: number, propertyId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db
    .select()
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.propertyId, propertyId)))
    .limit(1);
  return result.length > 0;
}

// ==================== AGENTS ====================

export async function getAllAgents() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(agents);
}

export async function getAgentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getFeaturedAgents(limit: number = 6) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(agents).where(eq(agents.isFeatured, 1)).limit(limit);
}

// ==================== DEVELOPMENTS ====================

export async function getAllDevelopments() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(developments);
}

export async function getDevelopmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(developments).where(eq(developments.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getFeaturedDevelopments(limit: number = 6) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(developments).where(eq(developments.isFeatured, 1)).limit(limit);
}

export async function getDevelopmentProperties(developmentId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(properties).where(eq(properties.developmentId, developmentId));
}

/**
 * Search developers by name (for autocomplete)
 */
export async function searchDevelopers(query: string, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: cataloguePublishers.id,
      developerId: developerOrganisations.id,
      cataloguePublisherId: cataloguePublishers.id,
      name: cataloguePublishers.name,
      city: developerOrganisations.city,
      province: developerOrganisations.province,
      status: developerOrganisations.status,
      logo: cataloguePublishers.logoUrl,
    })
    .from(cataloguePublishers)
    .innerJoin(
      developerOrganisations,
      eq(cataloguePublishers.developerOrganisationId, developerOrganisations.id),
    )
    .where(
      and(
        eq(cataloguePublishers.authorityKind, 'developer_first_party'),
        eq(cataloguePublishers.isVisible, 1),
        eq(developerOrganisations.status, 'approved'),
        sql`LOWER(${cataloguePublishers.name}) LIKE ${`%${query.toLowerCase()}%`}`,
      ),
    )
    .limit(limit);
}

// ==================== SERVICES ====================

export async function getAllServices() {
  const db = await getDb();
  if (!db) return [];

  // services table would need to be imported at top if used
  return await db.select().from(services);
}

export async function getServicesByCategory(category: string) {
  const db = await getDb();
  if (!db) return [];

  const categoryId = Number(category);
  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    return [];
  }
  return await db.select().from(services).where(eq(services.categoryId, categoryId));
}

// ==================== REVIEWS ====================

export async function getReviewsByTarget(reviewType: string, targetId: number) {
  const db = await getDb();
  if (!db) return [];

  // reviews table would need to be imported at top if used
  return await db
    .select()
    .from(reviews)
    .where(
      and(
        eq(reviews.targetType, reviewType as any),
        eq(reviews.targetId, targetId),
        eq(reviews.isPublished, 1),
      ),
    );
}

export async function createReview(reviewData: any) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // reviews table would need to be imported at top if used
  const result = await db.insert(reviews).values(reviewData);
  return result[0].insertId;
}

// ==================== LEADS ====================

export async function createLead(leadData: any) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // leads already imported at top
  const result = await db.insert(leads).values(leadData);
  return result[0].insertId;
}

export async function getLeadsByAgent(agentId: number) {
  const db = await getDb();
  if (!db) return [];

  // leads already imported at top
  return await db.select().from(leads).where(eq(leads.agentId, agentId));
}

// ==================== LOCATIONS ====================

export async function getAllLocations() {
  const db = await getDb();
  if (!db) return [];

  // locations table would need to be imported at top if used
  return await db.select().from(locations);
}

export async function getLocationsByType(type: string) {
  const db = await getDb();
  if (!db) return [];

  // locations table would need to be imported at top if used
  return await db
    .select()
    .from(locations)
    .where(eq(locations.type, type as any));
}

// ==================== AGENCY DASHBOARD ANALYTICS ====================

/**
 * Canonical agency inventory is owned by listings. The owner/agent joins are
 * compatibility fallbacks for records created before listings.agencyId existed.
 */
function agencyListingScopeCondition(agencyId: number) {
  return or(
    eq(listings.agencyId, agencyId),
    and(
      isNull(listings.agencyId),
      or(eq(users.agencyId, agencyId), and(isNull(users.agencyId), eq(agents.agencyId, agencyId))),
    ),
  )!;
}

async function getAgencyCanonicalListings(agencyId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({ listing: listings })
    .from(listings)
    .leftJoin(users, eq(listings.ownerId, users.id))
    .leftJoin(agents, eq(listings.agentId, agents.id))
    .where(agencyListingScopeCondition(agencyId));
}

export async function getAgencyDashboardStats(agencyId: number) {
  const db = await getDb();
  if (!db) {
    return {
      totalListings: 0,
      totalSales: 0,
      totalLeads: 0,
      totalAgents: 0,
      activeListings: 0,
      pendingListings: 0,
      recentLeads: 0,
      recentSales: 0,
    };
  }

  const [agencyListingRows, agencyLeads] = await Promise.all([
    getAgencyCanonicalListings(agencyId),
    db.select().from(leads).where(eq(leads.agencyId, agencyId)),
  ]);
  const agencyListings = agencyListingRows.map(row => row.listing);

  // Get agency agents count
  const agencyAgents = await db
    .select()
    .from(users)
    .where(and(eq(users.agencyId, agencyId), eq(users.isSubaccount, 1)));

  // Calculate stats
  const totalListings = agencyListings.length;
  const activeListings = agencyListings.filter(listing => listing.status === 'published').length;
  const pendingListings = agencyListings.filter(
    listing => listing.status === 'pending_review',
  ).length;
  const totalSales = agencyListings.filter(
    listing => listing.status === 'sold' || listing.status === 'rented',
  ).length;
  const totalLeads = agencyLeads.length;
  const totalAgents = agencyAgents.length;

  // Recent activity (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentLeads = agencyLeads.filter(
    (lead: any) => new Date(lead.createdAt) > thirtyDaysAgo,
  ).length;
  const recentSales = agencyListings.filter(
    listing =>
      (listing.status === 'sold' || listing.status === 'rented') &&
      new Date(listing.updatedAt) > thirtyDaysAgo,
  ).length;

  return {
    totalListings,
    totalSales,
    totalLeads,
    totalAgents,
    activeListings,
    pendingListings,
    recentLeads,
    recentSales,
  };
}

// ==================== PROSPECT MANAGEMENT ====================

export async function createProspect(prospectData: any) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(prospects).values(prospectData);
  return result[0].insertId;
}

export async function updateProspect(sessionId: string, updates: any) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const userId = parseSessionUserId(sessionId);

  await db
    .update(prospects)
    .set({
      preferences: updates?.preferences ?? null,
      lastActiveAt: new Date() as any,
      updatedAt: new Date(),
    })
    .where(eq(prospects.userId, userId));

  return { success: true };
}

export async function getProspect(sessionId: string): Promise<Prospect | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const userId = parseSessionUserId(sessionId);

  const result = await db.select().from(prospects).where(eq(prospects.userId, userId)).limit(1);
  return result[0];
}

export async function addProspectFavorite(sessionId: string, propertyId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Get prospect ID from sessionId
  const prospect = await getProspect(sessionId);
  if (!prospect) throw new Error('Prospect not found');

  await db
    .insert(prospectFavorites)
    .values({ prospectId: prospect.id, listingId: propertyId as any });
  return { success: true };
}

export async function removeProspectFavorite(sessionId: string, propertyId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Get prospect ID from sessionId
  const prospect = await getProspect(sessionId);
  if (!prospect) throw new Error('Prospect not found');

  await db
    .delete(prospectFavorites)
    .where(
      and(
        eq(prospectFavorites.prospectId, prospect.id),
        eq(prospectFavorites.listingId, propertyId as any),
      ),
    );

  return { success: true };
}

export async function getProspectFavorites(sessionId: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    // First get the prospect by sessionId
    const prospect = await getProspect(sessionId);
    if (!prospect) {
      console.log('[getProspectFavorites] No prospect found for sessionId:', sessionId);
      return [];
    }

    const results = await db
      .select({
        id: prospectFavorites.id,
        listingId: prospectFavorites.listingId,
        listing: listings,
        createdAt: prospectFavorites.createdAt,
      })
      .from(prospectFavorites)
      .innerJoin(listings, eq(prospectFavorites.listingId, listings.id))
      .where(eq(prospectFavorites.prospectId, prospect.id))
      .orderBy(desc(prospectFavorites.createdAt));

    // Ensure we always return an array, even if results is null/undefined
    return Array.isArray(results) ? results : [];
  } catch (error) {
    console.error('[getProspectFavorites] Database query failed:', error);
    // Return empty array instead of throwing to prevent 500 errors
    return [];
  }
}

export async function scheduleViewing(viewingData: any) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(scheduledViewings).values(viewingData);
  return result[0].insertId;
}

export async function getScheduledViewings(sessionId: string) {
  const db = await getDb();
  if (!db) return [];
  const userId = parseSessionUserId(sessionId);

  try {
    const results = await db
      .select({
        id: scheduledViewings.id,
        propertyId: scheduledViewings.propertyId,
        property: properties,
        scheduledAt: scheduledViewings.scheduledDate,
        status: scheduledViewings.status,
        notes: scheduledViewings.notes,
        createdAt: scheduledViewings.createdAt,
      })
      .from(scheduledViewings)
      .innerJoin(properties, eq(scheduledViewings.propertyId, properties.id))
      .where(eq(scheduledViewings.userId, userId))
      .orderBy(scheduledViewings.scheduledDate);

    return Array.isArray(results) ? results : [];
  } catch (error) {
    console.error('[getScheduledViewings] Database query failed:', error);
    return [];
  }
}

export async function updateViewingStatus(viewingId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db
    .update(scheduledViewings)
    .set({
      status: status as any,
      updatedAt: new Date(),
    })
    .where(eq(scheduledViewings.id, viewingId));

  return { success: true };
}

export async function trackPropertyView(sessionId: string, propertyId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const userId = parseSessionUserId(sessionId);

  // First check if this property was recently viewed by this prospect
  const existing = await db
    .select()
    .from(recentlyViewed)
    .where(and(eq(recentlyViewed.userId, userId), eq(recentlyViewed.listingId, propertyId as any)))
    .limit(1);

  if (existing.length > 0) {
    // Update the viewedAt timestamp
    await db
      .update(recentlyViewed)
      .set({
        viewedAt: new Date(),
      })
      .where(
        and(eq(recentlyViewed.userId, userId), eq(recentlyViewed.listingId, propertyId as any)),
      );
  } else {
    // Insert new record
    await db.insert(recentlyViewed).values({
      userId,
      listingId: propertyId as any,
      viewedAt: new Date(),
    });
  }

  return { success: true };
}

export async function getRecentlyViewed(sessionId: string) {
  const db = await getDb();
  if (!db) return [];
  const userId = parseSessionUserId(sessionId);

  try {
    const results = await db
      .select({
        id: recentlyViewed.id,
        listingId: recentlyViewed.listingId,
        listing: listings,
        viewedAt: recentlyViewed.viewedAt,
      })
      .from(recentlyViewed)
      .innerJoin(listings, eq(recentlyViewed.listingId, listings.id))
      .where(eq(recentlyViewed.userId, userId))
      .orderBy(desc(recentlyViewed.viewedAt))
      .limit(10);

    // Ensure we always return an array, even if results is null/undefined
    return Array.isArray(results) ? results : [];
  } catch (error) {
    console.error('[getRecentlyViewed] Database query failed:', error);
    // Return empty array instead of throwing to prevent 500 errors
    return [];
  }
}

export async function updateProspectProgress(
  sessionId: string,
  progress: number,
  badges?: string[],
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const userId = parseSessionUserId(sessionId);

  const [current] = await db
    .select({ preferences: prospects.preferences })
    .from(prospects)
    .where(eq(prospects.userId, userId))
    .limit(1);

  const currentPreferences =
    current?.preferences && typeof current.preferences === 'object'
      ? (current.preferences as Record<string, unknown>)
      : {};
  const nextPreferences: Record<string, unknown> = {
    ...currentPreferences,
    profileProgress: progress,
  };

  if (badges) {
    nextPreferences.badges = badges;
  }

  const updateData = {
    preferences: nextPreferences as any,
    lastActiveAt: new Date() as any,
    updatedAt: new Date(),
  };

  await db.update(prospects).set(updateData).where(eq(prospects.userId, userId));
  return { success: true };
}

export async function earnBadge(sessionId: string, badge: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const prospect = await getProspect(sessionId);
  if (!prospect) throw new Error('Prospect not found');
  const prefs =
    prospect.preferences && typeof prospect.preferences === 'object'
      ? (prospect.preferences as Record<string, unknown>)
      : {};
  const currentBadges = Array.isArray(prefs.badges) ? [...(prefs.badges as string[])] : [];
  if (!currentBadges.includes(badge)) {
    currentBadges.push(badge);
    const nextPreferences = {
      ...prefs,
      badges: currentBadges,
    };
    const userId = parseSessionUserId(sessionId);
    await db
      .update(prospects)
      .set({
        preferences: nextPreferences as any,
        lastActiveAt: new Date() as any,
        updatedAt: new Date(),
      })
      .where(eq(prospects.userId, userId));
  }

  return { success: true, badges: currentBadges };
}

export async function getRecommendedProperties(prospect: Prospect, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  const prefs =
    prospect.preferences && typeof prospect.preferences === 'object'
      ? (prospect.preferences as Record<string, unknown>)
      : {};
  const affordabilityMax = Number(prefs.affordabilityMax || 0);
  const affordabilityMin = Number(prefs.affordabilityMin || 0);
  const preferredPropertyType =
    typeof prefs.preferredPropertyType === 'string' ? prefs.preferredPropertyType : null;
  const preferredLocation =
    typeof prefs.preferredLocation === 'string' ? prefs.preferredLocation : null;

  if (!affordabilityMax) return [];

  // Build query conditions based on prospect preferences and affordability
  const conditions: SQL[] = [
    eq(properties.status, 'available' as any),
    lte(properties.price, affordabilityMax),
  ];

  if (affordabilityMin) {
    conditions.push(gte(properties.price, affordabilityMin));
  }

  if (preferredPropertyType) {
    conditions.push(eq(properties.propertyType, preferredPropertyType as any));
  }

  if (preferredLocation) {
    conditions.push(like(properties.city, `%${preferredLocation}%`));
  }

  let query = db
    .select()
    .from(properties)
    .where(and(...conditions));

  query = query.orderBy(desc(properties.featured), desc(properties.createdAt)).limit(limit);

  return await query;
}

export async function getAgencyPerformanceData(agencyId: number, months: number = 6) {
  const db = await getDb();
  if (!db) return [];

  // tables already imported at top

  const currentDate = new Date();
  const performanceData: any[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 0);

    const monthListings = await db
      .select({ listing: listings })
      .from(listings)
      .leftJoin(users, eq(listings.ownerId, users.id))
      .leftJoin(agents, eq(listings.agentId, agents.id))
      .where(
        and(
          agencyListingScopeCondition(agencyId),
          sql`${listings.createdAt} >= ${monthStart}`,
          sql`${listings.createdAt} <= ${monthEnd}`,
        ),
      );

    // Leads generated this month
    const monthLeads = await db
      .select()
      .from(leads)
      .where(
        and(
          eq(leads.agencyId, agencyId),
          sql`${leads.createdAt} >= ${monthStart}`,
          sql`${leads.createdAt} <= ${monthEnd}`,
        ),
      );

    // Sales this month
    const monthSales = monthListings.filter(
      row => row.listing.status === 'sold' || row.listing.status === 'rented',
    ).length;

    performanceData.push({
      month: monthStart.toLocaleString('default', { month: 'short', year: '2-digit' }),
      listings: monthListings.length,
      leads: monthLeads.length,
      sales: monthSales,
    });
  }

  return performanceData;
}

export async function getAgencyRecentLeads(agencyId: number, limit: number = 5) {
  const db = await getDb();
  if (!db) return [];

  // leads already imported at top

  return await db
    .select()
    .from(leads)
    .where(eq(leads.agencyId, agencyId))
    .orderBy(desc(leads.createdAt))
    .limit(limit);
}

export async function getAgencyRecentListings(agencyId: number, limit: number = 5) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({ listing: listings })
    .from(listings)
    .leftJoin(users, eq(listings.ownerId, users.id))
    .leftJoin(agents, eq(listings.agentId, agents.id))
    .where(agencyListingScopeCondition(agencyId))
    .orderBy(desc(listings.createdAt))
    .limit(limit);

  return rows.map(({ listing }) => ({
    id: listing.id,
    title: listing.title,
    price:
      getPrimaryPrice(
        String(listing.action),
        listing as unknown as Record<string, unknown>,
        (listing.propertyDetails as Record<string, unknown> | null | undefined) || {},
      ) ?? null,
    status: listing.status,
    city: listing.city,
    views: null,
    enquiries: null,
    createdAt: listing.createdAt,
    ownerId: listing.ownerId,
  }));
}

export async function getAgencyAgents(agencyId: number) {
  const db = await getDb();
  if (!db) return [];

  // tables already imported at top

  // Get users who are subaccounts of this agency
  const agencyUsers = await db
    .select({
      id: users.id,
      name: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      isSubaccount: users.isSubaccount,
      agentProfile: agents,
    })
    .from(users)
    .leftJoin(agents, eq(users.id, agents.userId))
    .where(and(eq(users.agencyId, agencyId), eq(users.isSubaccount, 1)))
    .orderBy(desc(users.createdAt));

  return agencyUsers;
}

// ==================== LEAD CONVERSION & COMMISSION TRACKING ====================

export async function getLeadConversionStats(agencyId: number, months: number = 6) {
  const db = await getDb();
  if (!db) return { total: 0, converted: 0, conversionRate: 0, byStatus: [] };

  // leads already imported at top

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  // Total leads in period
  const totalLeads = await db
    .select({ count: sql<number>`count(*)` })
    .from(leads)
    .where(and(eq(leads.agencyId, agencyId), sql`${leads.createdAt} >= ${startDate}`));

  // Converted leads (closed or converted status)
  const convertedLeads = await db
    .select({ count: sql<number>`count(*)` })
    .from(leads)
    .where(
      and(
        eq(leads.agencyId, agencyId),
        sql`${leads.createdAt} >= ${startDate}`,
        or(eq(leads.status, 'converted' as any), eq(leads.status, 'closed' as any)),
      ),
    );

  // Leads by status
  const statusStats = await db
    .select({
      status: leads.status,
      count: sql<number>`count(*)`,
    })
    .from(leads)
    .where(and(eq(leads.agencyId, agencyId), sql`${leads.createdAt} >= ${startDate}`))
    .groupBy(leads.status);

  const total = Number(totalLeads[0]?.count || 0);
  const converted = Number(convertedLeads[0]?.count || 0);
  const conversionRate = total > 0 ? (converted / total) * 100 : 0;

  return {
    total,
    converted,
    conversionRate: Math.round(conversionRate * 100) / 100, // Round to 2 decimal places
    byStatus: statusStats.map((s: any) => ({
      status: s.status,
      count: Number(s.count),
      percentage: total > 0 ? Math.round((Number(s.count) / total) * 100) : 0,
    })),
  };
}

export async function getAgencyCommissionStats(agencyId: number, months: number = 6) {
  const db = await getDb();
  if (!db)
    return { totalEarnings: 0, paidCommissions: 0, pendingCommissions: 0, monthlyBreakdown: [] };

  // tables already imported at top

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  // Total earnings
  const totalEarnings = await db
    .select({ total: sql<number>`sum(${commissions.amount})` })
    .from(commissions)
    .innerJoin(agents, eq(commissions.agentId, agents.id))
    .where(and(eq(agents.agencyId, agencyId), sql`${commissions.createdAt} >= ${startDate}`));

  // Paid commissions
  const paidCommissions = await db
    .select({ total: sql<number>`sum(${commissions.amount})` })
    .from(commissions)
    .innerJoin(agents, eq(commissions.agentId, agents.id))
    .where(
      and(
        eq(agents.agencyId, agencyId),
        eq(commissions.status, 'paid' as any),
        sql`${commissions.createdAt} >= ${startDate}`,
      ),
    );

  // Pending commissions
  const pendingCommissions = await db
    .select({ total: sql<number>`sum(${commissions.amount})` })
    .from(commissions)
    .innerJoin(agents, eq(commissions.agentId, agents.id))
    .where(
      and(
        eq(agents.agencyId, agencyId),
        eq(commissions.status, 'pending' as any),
        sql`${commissions.createdAt} >= ${startDate}`,
      ),
    );

  // Monthly breakdown
  const monthlyBreakdown: Array<{ month: string; earnings: number }> = [];
  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
    const monthEnd = new Date(startDate.getFullYear(), startDate.getMonth() + i + 1, 0);

    const monthEarnings = await db
      .select({ total: sql<number>`sum(${commissions.amount})` })
      .from(commissions)
      .innerJoin(agents, eq(commissions.agentId, agents.id))
      .where(
        and(
          eq(agents.agencyId, agencyId),
          sql`${commissions.createdAt} >= ${monthStart}`,
          sql`${commissions.createdAt} <= ${monthEnd}`,
        ),
      );

    monthlyBreakdown.push({
      month: monthStart.toLocaleString('default', { month: 'short', year: '2-digit' }),
      earnings: Number(monthEarnings[0]?.total || 0) / 100, // Convert cents to currency
    });
  }

  return {
    totalEarnings: Number(totalEarnings[0]?.total || 0) / 100,
    paidCommissions: Number(paidCommissions[0]?.total || 0) / 100,
    pendingCommissions: Number(pendingCommissions[0]?.total || 0) / 100,
    monthlyBreakdown,
  };
}

export async function getAgentPerformanceLeaderboard(agencyId: number, months: number = 3) {
  const db = await getDb();
  if (!db) return [];

  // tables already imported at top

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  // Get all agents in the agency
  const agencyAgents = await db
    .select({
      id: agents.id,
      userId: agents.userId,
      firstName: agents.firstName,
      lastName: agents.lastName,
      displayName: agents.displayName,
    })
    .from(agents)
    .where(eq(agents.agencyId, agencyId));

  // Calculate performance metrics for each agent
  const leaderboard = await Promise.all(
    agencyAgents.map(async (agent: any) => {
      // Commission earnings
      const earnings = await db
        .select({ total: sql<number>`sum(${commissions.amount})` })
        .from(commissions)
        .where(
          and(eq(commissions.agentId, agent.id), sql`${commissions.createdAt} >= ${startDate}`),
        );

      // Properties listed
      const propertiesListed = await db
        .select({ count: sql<number>`count(*)` })
        .from(properties)
        .where(and(eq(properties.agentId, agent.id), sql`${properties.createdAt} >= ${startDate}`));

      // Leads generated
      const leadsGenerated = await db
        .select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(and(eq(leads.agentId, agent.id), sql`${leads.createdAt} >= ${startDate}`));

      // Properties sold
      const propertiesSold = await db
        .select({ count: sql<number>`count(*)` })
        .from(properties)
        .where(
          and(
            eq(properties.agentId, agent.id),
            eq(properties.status, 'sold' as any),
            sql`${properties.updatedAt} >= ${startDate}`,
          ),
        );

      return {
        agentId: agent.id,
        agentName: agent.displayName || `${agent.firstName} ${agent.lastName}`,
        earnings: Number(earnings[0]?.total || 0) / 100,
        propertiesListed: Number(propertiesListed[0]?.count || 0),
        leadsGenerated: Number(leadsGenerated[0]?.count || 0),
        propertiesSold: Number(propertiesSold[0]?.count || 0),
        conversionRate:
          Number(leadsGenerated[0]?.count || 0) > 0
            ? Math.round(
                (Number(propertiesSold[0]?.count || 0) / Number(leadsGenerated[0]?.count || 0)) *
                  100,
              )
            : 0,
      };
    }),
  );

  // Sort by earnings (primary), then by properties sold (secondary)
  return leaderboard.sort((a, b) => {
    if (b.earnings !== a.earnings) return b.earnings - a.earnings;
    return b.propertiesSold - a.propertiesSold;
  });
}

// ==================== PLATFORM SETTINGS ====================

export async function getPlatformSetting(key: string) {
  const db = await getDb();
  if (!db) return null;

  const result: any = await db.execute(
    sql.raw(`
      SELECT
        id,
        \`setting_key\` AS settingKey,
        \`setting_value\` AS settingValue,
        description,
        category,
        isPublic,
        updatedBy,
        createdAt,
        updatedAt
      FROM platform_settings
      WHERE \`setting_key\` = ${db.$client.escape(key)}
      LIMIT 1
    `),
  );

  const rows = Array.isArray(result) ? result : Array.isArray(result?.rows) ? result.rows : [];

  return rows.length > 0 ? rows[0] : null;
}

export async function setPlatformSetting(key: string, value: any, updatedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const encodedValue = JSON.stringify(value);
  const updatedByValue = updatedBy == null ? 'NULL' : String(updatedBy);

  await db.execute(
    sql.raw(`
      INSERT INTO platform_settings (
        \`setting_key\`,
        \`setting_value\`,
        \`category\`,
        \`isPublic\`,
        updatedBy,
        updatedAt
      ) VALUES (
        ${db.$client.escape(key)},
        ${db.$client.escape(encodedValue)},
        'other',
        0,
        ${updatedByValue},
        CURRENT_TIMESTAMP
      )
      ON DUPLICATE KEY UPDATE
        \`setting_value\` = VALUES(\`setting_value\`),
        updatedBy = VALUES(updatedBy),
        updatedAt = CURRENT_TIMESTAMP
    `),
  );
}

export async function getAllPlatformSettings() {
  const db = await getDb();
  if (!db) return [];

  const result: any = await db.execute(
    sql.raw(`
      SELECT
        id,
        \`setting_key\` AS settingKey,
        \`setting_value\` AS settingValue,
        description,
        category,
        isPublic,
        updatedBy,
        createdAt,
        updatedAt
      FROM platform_settings
      ORDER BY category, \`setting_key\`
    `),
  );

  return Array.isArray(result) ? result : Array.isArray(result?.rows) ? result.rows : [];
}

// ==================== SUPER ADMIN ANALYTICS ====================

export async function getPlatformAnalytics() {
  const db = await getDb();
  if (!db) {
    return {
      totalUsers: 0,
      totalAgencies: 0,
      totalProperties: 0,
      activeProperties: 0,
      totalAgents: 0,
      paidSubscriptions: 0,
      monthlyRevenue: 0,
      userGrowth: 0,
      propertyGrowth: 0,
    };
  }

  // Schema tables are already imported at top level

  // Get counts in a single query - use listings table (new) instead of properties (old)
  const [counts] = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM ${users}) as userCount,
      (SELECT COUNT(*) FROM ${agencies}) as agencyCount,
      (SELECT COUNT(*) FROM ${listings}) as propertyCount,
      (SELECT COUNT(*) FROM ${listings} WHERE ${listings.status} IN ('pending_review', 'approved', 'published')) as activePropertyCount,
      (SELECT COUNT(*) FROM ${agents}) as agentCount,
      (SELECT COUNT(*) FROM ${subscriptions} WHERE ${subscriptions.ownerType} = 'agency' AND ${subscriptions.status} IN ('active', 'grace_period')) as paidSubsCount,
      (SELECT COUNT(*) FROM ${cataloguePublishers} WHERE ${cataloguePublishers.authorityKind} = 'developer_first_party') as developerCount
  `);

  // Monthly revenue (from commissions) - assume last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Growth metrics
  const [growth] = await db.execute(sql`
    SELECT
      (SELECT SUM(${commissions.amount}) FROM ${commissions} WHERE ${commissions.createdAt} >= ${thirtyDaysAgo}) as monthlyRevenue,
      (SELECT COUNT(*) FROM ${users} WHERE ${users.createdAt} >= ${thirtyDaysAgo}) as userGrowth,
      (SELECT COUNT(*) FROM ${listings} WHERE ${listings.createdAt} >= ${thirtyDaysAgo}) as propertyGrowth
  `);

  const countsRow = (counts as any)[0];
  const growthRow = (growth as any)[0];

  return {
    totalUsers: Number(countsRow.userCount || 0),
    totalAgencies: Number(countsRow.agencyCount || 0),
    totalProperties: Number(countsRow.propertyCount || 0),
    activeProperties: Number(countsRow.activePropertyCount || 0),
    totalAgents: Number(countsRow.agentCount || 0),
    totalDevelopers: Number(countsRow.developerCount || 0),
    paidSubscriptions: Number(countsRow.paidSubsCount || 0),
    monthlyRevenue: Number(growthRow.monthlyRevenue || 0) / 100, // Convert cents to currency units
    userGrowth: Number(growthRow.userGrowth || 0),
    propertyGrowth: Number(growthRow.propertyGrowth || 0),
  };
}

export async function getListingStats() {
  const db = await getDb();
  if (!db) return { pending: 0, approved: 0, rejected: 0, total: 0 };

  // properties already imported at top

  const [pending] = await db
    .select({ count: sql<number>`count(*)` })
    .from(properties)
    .where(eq(properties.status, 'pending' as any));
  const [approved] = await db
    .select({ count: sql<number>`count(*)` })
    .from(properties)
    .where(eq(properties.status, 'available' as any));
  const [rejected] = await db
    .select({ count: sql<number>`count(*)` })
    .from(properties)
    .where(eq(properties.status, 'archived' as any)); // Assuming archived means rejected
  const [total] = await db.select({ count: sql<number>`count(*)` }).from(properties);

  return {
    pending: Number(pending?.count || 0),
    approved: Number(approved?.count || 0),
    rejected: Number(rejected?.count || 0),
    total: Number(total?.count || 0),
  };
}

export async function getSubscriptionStats() {
  const db = await getDb();
  if (!db) return { free: 0, basic: 0, premium: 0, enterprise: 0, total: 0 };

  // agencies already imported at top

  const [free] = await db
    .select({ count: sql<number>`count(*)` })
    .from(agencies)
    .where(eq(agencies.subscriptionPlan, 'free' as any));
  const [basic] = await db
    .select({ count: sql<number>`count(*)` })
    .from(agencies)
    .where(eq(agencies.subscriptionPlan, 'basic' as any));
  const [premium] = await db
    .select({ count: sql<number>`count(*)` })
    .from(agencies)
    .where(eq(agencies.subscriptionPlan, 'premium' as any));
  const [enterprise] = await db
    .select({ count: sql<number>`count(*)` })
    .from(agencies)
    .where(eq(agencies.subscriptionPlan, 'enterprise' as any));
  const [total] = await db.select({ count: sql<number>`count(*)` }).from(agencies);

  return {
    free: Number(free?.count || 0),
    basic: Number(basic?.count || 0),
    premium: Number(premium?.count || 0),
    enterprise: Number(enterprise?.count || 0),
    total: Number(total?.count || 0),
  };
}

/**
 * Create a new listing
 */
export type SellerProspectConversionInput = {
  sellerProspectId: number;
  agencyId: number;
  assignedAgentId: number | null;
  actorUserId: number;
};

export async function createListing(
  listingData: any & { sellerProspectConversion?: SellerProspectConversionInput },
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  try {
    // Use Drizzle transaction API
    const listingId = await db.transaction(async tx => {
      // Create listing record
      // Convert latitude and longitude to strings to match schema
      // Look up agent ID
      // agents already imported at top
      const [agent] = await tx
        .select()
        .from(agents)
        .where(eq(agents.userId, listingData.userId))
        .limit(1);
      const [owner] = await tx
        .select({ agencyId: users.agencyId, role: users.role })
        .from(users)
        .where(eq(users.id, listingData.userId))
        .limit(1);
      const agentId = agent ? agent.id : null;
      const ownerAgencyId = owner?.agencyId || null;
      const agentAgencyId = agent?.agencyId || null;

      if (ownerAgencyId && agentAgencyId && ownerAgencyId !== agentAgencyId) {
        throw new Error('Listing owner and agent belong to different agencies');
      }

      // Membership is canonical; agent affiliation only preserves legacy agent-owned records.
      const agencyId = ownerAgencyId || agentAgencyId || null;

      // Attribution currency: a member whose canonical membership exists but
      // is no longer current cannot mint new inventory attributed to the
      // agency. Members predating the membership authority (no row) pass so
      // legacy accounts are not locked out of drafting.
      if ((ownerAgencyId || agentAgencyId) && agent) {
        const [membershipRow] = await tx
          .select()
          .from(agencyAgentMemberships)
          .where(
            and(
              eq(agencyAgentMemberships.agentId, Number(agent.id)),
              eq(
                agencyAgentMemberships.agencyId,
                Number(ownerAgencyId || agentAgencyId),
              ),
            ),
          )
          .limit(1);

        if (membershipRow && !isCurrentActiveAgencyMembership(membershipRow)) {
          throw new Error(
            'Your agency membership is no longer active. New listings cannot be attributed to the agency.',
          );
        }
      }
      const sellerProspectConversion = listingData.sellerProspectConversion;
      const effectiveAgentId = sellerProspectConversion?.assignedAgentId ?? agentId;

      if (sellerProspectConversion) {
        if (!agencyId || agencyId !== sellerProspectConversion.agencyId) {
          throw new Error('Seller prospect and listing owner belong to different agencies');
        }

        if (effectiveAgentId) {
          const [assignedAgent] = await tx
            .select({ id: agents.id })
            .from(agents)
            .where(
              and(
                eq(agents.id, effectiveAgentId),
                eq(agents.agencyId, sellerProspectConversion.agencyId),
                eq(agents.status, 'approved'),
              ),
            )
            .limit(1);
          if (!assignedAgent) {
            throw new Error('Seller prospect assignment is no longer an approved agency agent');
          }
        }

        const [sellerProspect] = await tx
          .select({
            id: sellerProspects.id,
            stage: sellerProspects.stage,
            convertedListingId: sellerProspects.convertedListingId,
            assignedAgentId: sellerProspects.assignedAgentId,
          })
          .from(sellerProspects)
          .where(
            and(
              eq(sellerProspects.id, sellerProspectConversion.sellerProspectId),
              eq(sellerProspects.agencyId, sellerProspectConversion.agencyId),
            ),
          )
          .limit(1);

        if (!sellerProspect || sellerProspect.convertedListingId) {
          throw new Error('Seller prospect is no longer available for listing conversion');
        }
        if (!['qualified', 'mandate_won'].includes(String(sellerProspect.stage))) {
          throw new Error('Seller prospect must be qualified before listing conversion');
        }

        const currentAssignedAgentId = sellerProspect.assignedAgentId
          ? Number(sellerProspect.assignedAgentId)
          : null;
        if (currentAssignedAgentId !== sellerProspectConversion.assignedAgentId) {
          throw new Error('Seller prospect assignment changed before listing conversion');
        }

        const actorIsManager = owner?.role === 'agency_admin' || owner?.role === 'super_admin';
        if (
          !actorIsManager &&
          (owner?.role !== 'agent' || !agentId || currentAssignedAgentId !== agentId)
        ) {
          throw new Error('Seller prospect assignment no longer permits this listing conversion');
        }
      }

      console.log('[db.createListing] Inserting listing:', {
        ownerId: listingData.userId,
        agentId: effectiveAgentId,
        agencyId,
        slug: listingData.slug,
        coords: { lat: listingData.latitude, lng: listingData.longitude },
      });

      const pricingContract = buildPricingContract(
        listingData.action,
        listingData.pricing as Record<string, unknown>,
        listingData.propertyDetails as Record<string, unknown>,
        { preferEmbedded: false },
      );
      const salePrice =
        pricingContract?.intent === 'sale' ? pricingContract.askingPrice : undefined;
      const rentPrice =
        pricingContract?.intent === 'rent' ? pricingContract.monthlyRent : undefined;
      const depositAmount =
        pricingContract?.intent === 'rent'
          ? getMoneyFactAmount(pricingContract.deposit)
          : undefined;

      const insertValues: any = {
        ownerId: listingData.userId,
        // A manager may convert a seller prospect assigned to another
        // approved agency agent. Persist the assignment that was validated
        // above rather than silently replacing it with the acting user's
        // agent identity (or null for an agency administrator).
        agentId: effectiveAgentId,
        agencyId,
        action: listingData.action,
        propertyType: listingData.propertyType,
        title: listingData.title,
        description: listingData.description,

        // Map pricing fields
        askingPrice: salePrice !== undefined ? String(salePrice) : null,
        negotiable:
          pricingContract?.intent === 'sale' && pricingContract.negotiability === 'negotiable'
            ? 1
            : 0,
        transferCostEstimate: listingData.pricing.transferCostEstimate
          ? String(listingData.pricing.transferCostEstimate)
          : null,
        monthlyRent: rentPrice !== undefined ? String(rentPrice) : null,
        deposit: depositAmount !== undefined ? String(depositAmount) : null,
        leaseTerms: listingData.pricing.leaseTerms || null,
        availableFrom: listingData.pricing.availableFrom
          ? new Date(listingData.pricing.availableFrom).toISOString().slice(0, 19).replace('T', ' ')
          : null,
        utilitiesIncluded: listingData.pricing.utilitiesIncluded ? 1 : 0,
        startingBid: listingData.pricing.startingBid
          ? String(listingData.pricing.startingBid)
          : null,
        reservePrice: listingData.pricing.reservePrice
          ? String(listingData.pricing.reservePrice)
          : null,
        auctionDateTime: listingData.pricing.auctionDateTime
          ? new Date(listingData.pricing.auctionDateTime)
              .toISOString()
              .slice(0, 19)
              .replace('T', ' ')
          : null,
        auctionTermsDocumentUrl: listingData.pricing.auctionTermsDocumentUrl || null,

        propertyDetails: listingData.propertyDetails, // Drizzle handles JSON
        address: listingData.address || null,
        latitude: listingData.latitude == null ? null : Number(listingData.latitude).toFixed(7),
        longitude: listingData.longitude == null ? null : Number(listingData.longitude).toFixed(7),
        city: listingData.city,
        suburb: listingData.suburb || null,
        province: listingData.province,
        provinceId: listingData.provinceId ?? null,
        cityId: listingData.cityId ?? null,
        suburbId: listingData.suburbId ?? null,
        privateAddress: listingData.privateAddress ?? null,
        coordinateSource: listingData.coordinateSource ?? null,
        locationConfirmationState: listingData.locationConfirmationState ?? 'needs_confirmation',
        publicLocationPrecision: listingData.publicLocationPrecision ?? 'approximate',

        // Failsafe: Ensure slug is unique
        slug: listingData.slug.match(/-ts-[a-z0-9]+$/)
          ? listingData.slug
          : `${listingData.slug}-ts-${Date.now().toString(36)}`,
        status: 'draft',
        approvalStatus: 'pending',
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      };

      // Add optional fields only if they exist
      if (listingData.suburb !== undefined) insertValues.suburb = listingData.suburb || null;
      if (listingData.postalCode !== undefined)
        insertValues.postalCode = listingData.postalCode || null;
      if (listingData.placeId) insertValues.placeId = listingData.placeId;
      if (listingData.locationId) insertValues.locationId = listingData.locationId;

      // Explicit nulls for strictness if needed, but omitting them is cleaner for Drizzle
      // insertValues.mainMediaId = null;
      // insertValues.mainMediaType = null;

      const [listingResult] = await tx.insert(listings).values(insertValues);

      const newListingId = Number(listingResult.insertId);

      // Create listing analytics record
      await tx.insert(listingAnalytics).values({
        listingId: newListingId,
        totalViews: 0,
        uniqueVisitors: 0,
        totalLeads: 0,
        contactFormLeads: 0,
        whatsappClicks: 0,
        phoneReveals: 0,
        bookingViewingRequests: 0,
        totalFavorites: 0,
        totalShares: 0,
        conversionRate: '0',
        viewsByDay: {},
        trafficSources: {},
        lastUpdated: new Date().toISOString().slice(0, 19).replace('T', ' '),
      });

      // Add media records
      if (listingData.media && listingData.media.length > 0) {
        const primaryMedia = getPrimaryListingImage(listingData.media);
        for (const mediaItem of listingData.media) {
          await tx.insert(listingMedia).values({
            listingId: newListingId,
            originalUrl: mediaItem.url,
            thumbnailUrl: mediaItem.thumbnailUrl,
            mediaType: mediaItem.type,
            originalFileName: mediaItem.fileName,
            originalFileSize: mediaItem.fileSize,
            width: mediaItem.width,
            height: mediaItem.height,
            duration: mediaItem.duration,
            orientation: mediaItem.orientation,
            displayOrder: mediaItem.displayOrder,
            isPrimary: primaryMedia && String(primaryMedia.id) === String(mediaItem.id) ? 1 : 0,
            processingStatus: mediaItem.processingStatus === 'completed' ? 'completed' : 'pending',
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            uploadedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
          });
        }
      }

      if (sellerProspectConversion) {
        const conversionTimestamp = toMysqlDateTime();
        const conversionUpdate = await tx
          .update(sellerProspects)
          .set({
            stage: 'converted_to_listing',
            convertedListingId: newListingId,
            convertedAt: conversionTimestamp,
            nextFollowUp: null,
            updatedAt: conversionTimestamp,
          })
          .where(
            and(
              eq(sellerProspects.id, sellerProspectConversion.sellerProspectId),
              eq(sellerProspects.agencyId, sellerProspectConversion.agencyId),
              isNull(sellerProspects.convertedListingId),
            ),
          );
        const affectedRows = Number(
          (conversionUpdate as any)?.affectedRows ??
            (conversionUpdate as any)?.[0]?.affectedRows ??
            0,
        );
        if (affectedRows === 0) {
          throw new Error('Seller prospect is no longer available for listing conversion');
        }

        await tx.insert(sellerProspectActivities).values({
          agencyId: sellerProspectConversion.agencyId,
          sellerProspectId: sellerProspectConversion.sellerProspectId,
          actorUserId: sellerProspectConversion.actorUserId,
          activityType: 'conversion',
          description: 'Canonical listing draft created from this seller prospect.',
          metadata: { listingId: newListingId, assignedAgentId: effectiveAgentId || null },
          createdAt: conversionTimestamp,
        });
      }

      return newListingId;
    });

    return listingId;
  } catch (error) {
    console.error('[Database] Failed to create listing:', error);
    if (error instanceof Error) {
      console.error('[Database] Error details:', error.message);
    } else {
      console.error('[Database] Error details:', String(error));
    }
    throw error;
  }
}

/**
 * Get listing by ID
 */
export async function getListingById(listingId: number, database?: any) {
  const db = database || (await getDb());
  if (!db) throw new Error('Database not available');

  const [listing] = await db.select().from(listings).where(eq(listings.id, listingId)).limit(1);

  if (!listing) return null;

  if (!listing) return null;

  // propertyDetails is already an object if using json() type in schema
  // but if it's null, we should handle it
  const propertyDetails = listing.propertyDetails || {};

  // Construct compatibility pricing from individual columns, then expose the
  // versioned contract when one is present in the approved property details.
  const pricing = {
    askingPrice: listing.askingPrice != null ? Number(listing.askingPrice) : undefined,
    negotiable: listing.negotiable === 1,
    transferCostEstimate:
      listing.transferCostEstimate != null ? Number(listing.transferCostEstimate) : undefined,
    monthlyRent: listing.monthlyRent != null ? Number(listing.monthlyRent) : undefined,
    deposit: listing.deposit != null ? Number(listing.deposit) : undefined,
    leaseTerms: listing.leaseTerms,
    availableFrom: listing.availableFrom ? new Date(listing.availableFrom) : undefined,
    utilitiesIncluded: listing.utilitiesIncluded === 1,
    startingBid: listing.startingBid != null ? Number(listing.startingBid) : undefined,
    reservePrice: listing.reservePrice != null ? Number(listing.reservePrice) : undefined,
    auctionDateTime: listing.auctionDateTime ? new Date(listing.auctionDateTime) : undefined,
    auctionTermsDocumentUrl: listing.auctionTermsDocumentUrl,
  } as Record<string, unknown>;
  const pricingContract = buildPricingContract(
    listing.action,
    pricing,
    propertyDetails as Record<string, unknown>,
  );
  if (pricingContract) {
    pricing.pricingContract = pricingContract;
    if (pricingContract.intent === 'sale') {
      pricing.negotiability = pricingContract.negotiability;
      pricing.recurringCosts = pricingContract.recurringCosts;
    } else {
      pricing.depositFact = pricingContract.deposit;
    }
  }

  return {
    ...listing,
    userId: listing.ownerId, // Map ownerId to userId for compatibility
    pricing,
    propertyDetails,
  };
}

/**
 * Get user's listings
 */
export async function getUserListings(
  userId: number,
  status?: string,
  limit: number = 20,
  offset: number = 0,
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // listingMedia already imported at top

  let query = db.select().from(listings).where(eq(listings.ownerId, userId));

  if (status) {
    query = query.where(eq(listings.status, status as any));
  }

  const listingsData = await query.orderBy(desc(listings.createdAt)).limit(limit).offset(offset);

  // Fetch primary images
  const listingsWithImages = await Promise.all(
    listingsData.map(async listing => {
      const media = await db
        .select()
        .from(listingMedia)
        .where(eq(listingMedia.listingId, listing.id))
        .orderBy(listingMedia.displayOrder);

      const primaryMedia = getPrimaryListingImage(media);
      const primaryImage = primaryMedia ? resolveMediaDeliveryUrl(primaryMedia.originalUrl) : null;

      const propertyDetails = listing.propertyDetails || {};
      const pricing: Record<string, unknown> = {
        askingPrice: listing.askingPrice != null ? Number(listing.askingPrice) : undefined,
        negotiable: listing.negotiable === 1,
        transferCostEstimate:
          listing.transferCostEstimate != null ? Number(listing.transferCostEstimate) : undefined,
        monthlyRent: listing.monthlyRent != null ? Number(listing.monthlyRent) : undefined,
        deposit: listing.deposit != null ? Number(listing.deposit) : undefined,
        leaseTerms: listing.leaseTerms,
        availableFrom: listing.availableFrom ? new Date(listing.availableFrom) : undefined,
        utilitiesIncluded: listing.utilitiesIncluded === 1,
        startingBid: listing.startingBid != null ? Number(listing.startingBid) : undefined,
        reservePrice: listing.reservePrice != null ? Number(listing.reservePrice) : undefined,
        auctionDateTime: listing.auctionDateTime ? new Date(listing.auctionDateTime) : undefined,
        auctionTermsDocumentUrl: listing.auctionTermsDocumentUrl,
      };
      const pricingContract = buildPricingContract(
        listing.action,
        pricing,
        propertyDetails as Record<string, unknown>,
      );
      if (pricingContract) {
        pricing.pricingContract = pricingContract;
        if (pricingContract.intent === 'sale') {
          pricing.negotiability = pricingContract.negotiability;
          pricing.recurringCosts = pricingContract.recurringCosts;
        } else {
          pricing.depositFact = pricingContract.deposit;
        }
      }

      return {
        ...listing,
        userId: listing.ownerId,
        pricing,
        propertyDetails,
        primaryImage,
      };
    }),
  );

  return listingsWithImages;
}

/**
 * Update listing
 */
export async function updateListing(listingId: number, updateData: any) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Prepare update fields
  const updateFields: any = {
    ...updateData,
    updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
  };

  // API-only fields are persisted through their own canonical paths.
  delete updateFields.id;
  delete updateFields.location;
  delete updateFields.media;
  delete updateFields.mediaIds;
  delete updateFields.mainMediaId;

  // Map pricing fields if present
  if (updateData.pricing) {
    const pricingContract = buildPricingContract(
      updateData.action,
      updateData.pricing,
      updateData.propertyDetails,
      { preferEmbedded: false },
    );
    const salePrice = pricingContract?.intent === 'sale' ? pricingContract.askingPrice : undefined;
    const rentPrice = pricingContract?.intent === 'rent' ? pricingContract.monthlyRent : undefined;
    const depositAmount =
      pricingContract?.intent === 'rent' ? getMoneyFactAmount(pricingContract.deposit) : undefined;

    if (updateData.action === 'sell') {
      updateFields.askingPrice = salePrice !== undefined ? String(salePrice) : null;
      updateFields.monthlyRent = null;
      updateFields.deposit = null;
      updateFields.negotiable =
        pricingContract?.intent === 'sale' && pricingContract.negotiability === 'negotiable'
          ? 1
          : 0;
    } else if (updateData.action === 'rent') {
      updateFields.askingPrice = null;
      updateFields.monthlyRent = rentPrice !== undefined ? String(rentPrice) : null;
      updateFields.deposit = depositAmount !== undefined ? String(depositAmount) : null;
      updateFields.negotiable = 0;
    } else {
      if (updateData.pricing.askingPrice !== undefined)
        updateFields.askingPrice = updateData.pricing.askingPrice
          ? String(updateData.pricing.askingPrice)
          : null;
      if (updateData.pricing.negotiable !== undefined)
        updateFields.negotiable = updateData.pricing.negotiable ? 1 : 0;
    }
    if (updateData.pricing.transferCostEstimate !== undefined)
      updateFields.transferCostEstimate =
        updateData.pricing.transferCostEstimate !== null
          ? String(updateData.pricing.transferCostEstimate)
          : null;
    if (updateData.pricing.leaseTerms !== undefined)
      updateFields.leaseTerms = updateData.pricing.leaseTerms;
    if (updateData.pricing.availableFrom !== undefined)
      updateFields.availableFrom = updateData.pricing.availableFrom
        ? new Date(updateData.pricing.availableFrom).toISOString().slice(0, 19).replace('T', ' ')
        : null;
    if (updateData.pricing.utilitiesIncluded !== undefined)
      updateFields.utilitiesIncluded = updateData.pricing.utilitiesIncluded ? 1 : 0;
    if (updateData.pricing.startingBid !== undefined)
      updateFields.startingBid = updateData.pricing.startingBid
        ? String(updateData.pricing.startingBid)
        : null;
    if (updateData.pricing.reservePrice !== undefined)
      updateFields.reservePrice = updateData.pricing.reservePrice
        ? String(updateData.pricing.reservePrice)
        : null;
    if (updateData.pricing.auctionDateTime !== undefined)
      updateFields.auctionDateTime = updateData.pricing.auctionDateTime
        ? new Date(updateData.pricing.auctionDateTime).toISOString().slice(0, 19).replace('T', ' ')
        : null;
    if (updateData.pricing.auctionTermsDocumentUrl !== undefined)
      updateFields.auctionTermsDocumentUrl = updateData.pricing.auctionTermsDocumentUrl;

    delete updateFields.pricing;
  }

  // propertyDetails is json() type, so pass object directly
  // No need to stringify

  await db.update(listings).set(updateFields).where(eq(listings.id, listingId));
}

/**
 * Submit listing for review
 */
export async function submitListingForReview(listingId: number, database?: any) {
  const db = database || (await getDb());
  if (!db) throw new Error('Database not available');

  if (!database && typeof db.transaction === 'function') {
    return db.transaction((transaction: any) => submitListingForReview(listingId, transaction));
  }

  await lockListingTransitionRow(db, listingId);
  const [transitionListing] = await db
    .select()
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);
  if (!transitionListing) throw new Error('Listing not found');
  if (!['draft', 'rejected'].includes(String(transitionListing.status))) {
    throw new Error(`Listing cannot be submitted from status "${transitionListing.status}"`);
  }

  const listing = await getListingById(listingId, db);
  if (!listing) throw new Error('Listing not found');
  const locationIssues = validateListingRecordLocation(listing as Record<string, unknown>);
  if (locationIssues.length > 0) {
    throw new Error(locationIssues.join(' '));
  }
  const commercialPricing = await validateCommercialOfficeListingPricing(db, listingId);
  if (commercialPricing.kind === 'invalid_commercial_context')
    throw new Error(commercialPricing.message);
  const pricingIssues =
    commercialPricing.kind === 'canonical_office'
      ? []
      : validatePricingContract(
          String((transitionListing as any).action),
          (listing as any)?.pricing,
          (listing as any)?.propertyDetails,
          { mode: 'publish', enforceInputShape: false },
        );
  if (pricingIssues.length > 0) {
    throw new Error(pricingIssues.map(issue => issue.message).join(' '));
  }

  // This is the transition boundary for every caller, including agency routes,
  // generic routes, scripts, and lower-level tests.
  const originalListingId = Number((transitionListing as any).revisionOfListingId || 0);
  await assertListingPublicationEntitled(db, {
    listingId,
    operation: 'submit',
    ...(originalListingId > 0 ? { excludeListingIds: [originalListingId] } : {}),
  });

  // Update listing status
  await db
    .update(listings)
    .set({
      status: 'pending_review' as any,
      approvalStatus: 'pending' as any,
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    })
    .where(eq(listings.id, listingId));

  // Add to approval queue
  await db.insert(listingApprovalQueue).values({
    listingId,
    submittedBy: transitionListing.ownerId,
    submittedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    status: 'pending' as any,
    priority: 'normal' as any,
  });
}

/**
 * Get listing analytics
 */
export async function getListingAnalytics(listingId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [analytics] = await db
    .select()
    .from(listingAnalytics)
    .where(eq(listingAnalytics.listingId, listingId))
    .limit(1);

  if (!analytics) return null;

  // Parse JSON fields
  return {
    ...analytics,
    viewsByDay: analytics.viewsByDay ? JSON.parse(analytics.viewsByDay) : {},
    trafficSources: analytics.trafficSources ? JSON.parse(analytics.trafficSources) : {},
  };
}

/**
 * Get listing media
 */
export async function getListingMedia(listingId: number, database?: any) {
  const db = database || (await getDb());
  if (!db) throw new Error('Database not available');

  return await db
    .select()
    .from(listingMedia)
    .where(eq(listingMedia.listingId, listingId))
    .orderBy(listingMedia.displayOrder);
}

export type ListingRevisionContext = {
  revisionListingId: number;
  mediaIdMap: Map<number, number>;
};

/**
 * Create the private draft used to revise a published listing. The published
 * row and its public mirror remain untouched until the revision is approved.
 */
export async function createListingRevision(listingId: number): Promise<ListingRevisionContext> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return await db.transaction(async tx => {
    const [source] = await tx.select().from(listings).where(eq(listings.id, listingId)).limit(1);
    if (!source) throw new Error('Listing not found');
    if (source.status !== 'published') {
      throw new Error(`Only published listings can be revised (status "${source.status}")`);
    }

    const [activeRevision] = await tx
      .select({ id: listings.id })
      .from(listings)
      .where(
        and(
          eq(listings.revisionOfListingId, listingId),
          inArray(listings.status, ['draft', 'pending_review'] as any),
        ),
      )
      .limit(1);
    if (activeRevision) {
      throw new Error(
        'Another listing revision is already in progress. Open that revision to continue.',
      );
    }

    const {
      id: _sourceId,
      createdAt: _sourceCreatedAt,
      updatedAt: _sourceUpdatedAt,
      publishedAt: _sourcePublishedAt,
      archivedAt: _sourceArchivedAt,
      reviewedBy: _sourceReviewedBy,
      reviewedAt: _sourceReviewedAt,
      rejectionReason: _sourceRejectionReason,
      rejectionReasons: _sourceRejectionReasons,
      rejectionNote: _sourceRejectionNote,
      status: _sourceStatus,
      approvalStatus: _sourceApprovalStatus,
      revisionOfListingId: _sourceRevisionOfListingId,
      mainMediaId: _sourceMainMediaId,
      mainMediaType: _sourceMainMediaType,
      canonicalUrl: _sourceCanonicalUrl,
      slug: sourceSlug,
      ...draftFields
    } = source as any;

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const revisionSlug =
      `${String(sourceSlug || listingId)}-revision-${Date.now().toString(36)}`.slice(0, 255);
    const [revisionResult] = await tx.insert(listings).values({
      ...draftFields,
      slug: revisionSlug,
      canonicalUrl: null,
      status: 'draft',
      approvalStatus: 'pending',
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
      rejectionReasons: null,
      rejectionNote: null,
      publishedAt: null,
      archivedAt: null,
      revisionOfListingId: listingId,
      mainMediaId: null,
      mainMediaType: null,
      createdAt: now,
      updatedAt: now,
    } as any);
    const revisionListingId = Number((revisionResult as any).insertId);

    const sourceMedia = await tx
      .select()
      .from(listingMedia)
      .where(eq(listingMedia.listingId, listingId))
      .orderBy(listingMedia.displayOrder);
    const mediaIdMap = new Map<number, number>();

    for (const item of sourceMedia) {
      const [mediaResult] = await tx.insert(listingMedia).values({
        listingId: revisionListingId,
        mediaType: item.mediaType,
        originalUrl: item.originalUrl,
        originalFileName: item.originalFileName,
        originalFileSize: item.originalFileSize,
        processedUrl: item.processedUrl,
        thumbnailUrl: item.thumbnailUrl,
        previewUrl: item.previewUrl,
        width: item.width,
        height: item.height,
        duration: item.duration,
        mimeType: item.mimeType,
        orientation: item.orientation,
        isVertical: item.isVertical,
        displayOrder: item.displayOrder,
        isPrimary: item.isPrimary,
        processingStatus: item.processingStatus,
        processingError: item.processingError,
        createdAt: item.createdAt,
        uploadedAt: item.uploadedAt,
        processedAt: item.processedAt,
      });
      mediaIdMap.set(Number(item.id), Number((mediaResult as any).insertId));
    }

    return { revisionListingId, mediaIdMap };
  });
}

export type ListingMediaReplacementInput = {
  id: string;
  mediaType: 'image' | 'video' | 'floorplan' | 'pdf';
  uploadToken?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  orientation?: 'vertical' | 'horizontal' | 'square' | null;
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed' | null;
};

const EXISTING_LISTING_MEDIA_ID_PREFIX = 'existing:';

function parseExistingListingMediaId(value: string) {
  if (!value.startsWith(EXISTING_LISTING_MEDIA_ID_PREFIX)) return null;
  const id = Number(value.slice(EXISTING_LISTING_MEDIA_ID_PREFIX.length));
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * Replaces the ordered canonical media manifest for one listing. Existing
 * records are retained only by their explicit `existing:<id>` token; all
 * other entries are newly uploaded storage keys. This preserves the listing
 * media contract without trusting a client to reference another listing's row.
 */
export async function replaceListingMedia(
  listingId: number,
  media: ListingMediaReplacementInput[],
  mainMediaId?: string | null,
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const ids = media.map(item => item.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error('Listing media manifest contains duplicate items');
  }

  if (mainMediaId && !ids.includes(mainMediaId)) {
    throw new Error('Listing primary media must be included in the media manifest');
  }

  await db.transaction(async tx => {
    const existing = (await tx
      .select({
        id: listingMedia.id,
        mediaType: listingMedia.mediaType,
        originalUrl: listingMedia.originalUrl,
        processingStatus: listingMedia.processingStatus,
      })
      .from(listingMedia)
      .where(eq(listingMedia.listingId, listingId))) as Array<{
      id: number;
      mediaType: ListingMediaReplacementInput['mediaType'] | null;
      originalUrl: string | null;
      processingStatus: 'pending' | 'processing' | 'completed' | 'failed' | null;
    }>;
    const existingIds = new Set(existing.map(item => Number(item.id)));
    const retainedExistingIds = new Set<number>();

    const existingById = new Map(existing.map(item => [Number(item.id), item]));
    const canonicalMediaForPrimary = media.map(item => {
      const existingId = parseExistingListingMediaId(item.id);
      const existingItem = existingId === null ? null : existingById.get(existingId);
      return {
        ...item,
        id: item.id,
        url: existingItem?.originalUrl || item.id,
        mediaType: existingItem?.mediaType || item.mediaType,
        processingStatus: existingItem?.processingStatus || item.processingStatus,
      };
    });
    const primaryMedia = getPrimaryListingImage(canonicalMediaForPrimary, mainMediaId);
    const resolvedMainMediaId = primaryMedia ? String(primaryMedia.id) : null;
    if (mainMediaId && resolvedMainMediaId !== mainMediaId) {
      throw new Error('Listing primary media must be a completed image');
    }

    for (const item of media) {
      if (!item.id.startsWith(EXISTING_LISTING_MEDIA_ID_PREFIX)) continue;
      const existingMediaId = parseExistingListingMediaId(item.id);
      if (existingMediaId === null || !existingIds.has(existingMediaId)) {
        throw new Error('Listing media does not belong to this listing');
      }
      const existingItem = existingById.get(existingMediaId);
      if (existingItem?.mediaType && existingItem.mediaType !== item.mediaType) {
        throw new Error(
          'Existing listing media type cannot be changed through the client manifest',
        );
      }
      retainedExistingIds.add(existingMediaId);
    }

    const staleExistingIds = existing
      .map(item => Number(item.id))
      .filter(id => !retainedExistingIds.has(id));
    if (staleExistingIds.length) {
      await tx
        .delete(listingMedia)
        .where(
          and(eq(listingMedia.listingId, listingId), inArray(listingMedia.id, staleExistingIds)),
        );
    }

    for (const [displayOrder, item] of media.entries()) {
      const existingMediaId = parseExistingListingMediaId(item.id);
      const isPrimary = item.id === resolvedMainMediaId ? 1 : 0;

      if (existingMediaId !== null) {
        await tx
          .update(listingMedia)
          .set({ displayOrder, isPrimary })
          .where(and(eq(listingMedia.id, existingMediaId), eq(listingMedia.listingId, listingId)));
        continue;
      }

      await tx.insert(listingMedia).values({
        listingId,
        originalUrl: item.id,
        thumbnailUrl: item.thumbnailUrl || null,
        previewUrl: item.previewUrl || null,
        mediaType: item.mediaType,
        originalFileName: item.fileName || null,
        originalFileSize: item.fileSize || null,
        width: item.width || null,
        height: item.height || null,
        duration: item.duration || null,
        orientation: item.orientation || null,
        displayOrder,
        isPrimary,
        processingStatus: item.processingStatus === 'completed' ? 'completed' : 'pending',
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        uploadedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      });
    }
  });
}

/**
 * Copy the complete approved revision media snapshot onto the original
 * listing. Revision rows remain intact for history; the original listing is
 * the canonical public source after approval.
 */
async function synchronizeApprovedRevisionMediaWithDatabase(
  originalListingId: number,
  revisionListingId: number,
  database: any,
) {
  const revisionMedia = await database
    .select()
    .from(listingMedia)
    .where(eq(listingMedia.listingId, revisionListingId))
    .orderBy(listingMedia.displayOrder);
  const primary = getPrimaryListingImage(revisionMedia);
  const mediaIdMap = new Map<number, number>();

  await database.delete(listingMedia).where(eq(listingMedia.listingId, originalListingId));
  for (const item of revisionMedia) {
    const [inserted] = await database.insert(listingMedia).values({
      listingId: originalListingId,
      originalUrl: item.originalUrl,
      originalFileName: item.originalFileName,
      originalFileSize: item.originalFileSize,
      processedUrl: item.processedUrl,
      thumbnailUrl: item.thumbnailUrl,
      previewUrl: item.previewUrl,
      width: item.width,
      height: item.height,
      duration: item.duration,
      mimeType: item.mimeType,
      orientation: item.orientation,
      isVertical: item.isVertical,
      mediaType: item.mediaType,
      displayOrder: item.displayOrder,
      isPrimary: primary && Number(primary.id) === Number(item.id) ? 1 : 0,
      processingStatus: item.processingStatus,
      processingError: item.processingError,
      createdAt: item.createdAt,
      uploadedAt: item.uploadedAt,
      processedAt: item.processedAt,
    });
    mediaIdMap.set(Number(item.id), Number((inserted as any).insertId));
  }

  return { copied: revisionMedia.length, primaryMediaId: primary?.id ?? null, mediaIdMap };
}

export async function synchronizeApprovedRevisionMedia(
  originalListingId: number,
  revisionListingId: number,
  database?: any,
) {
  const db = database || (await getDb());
  if (!db) throw new Error('Database not available');

  if (database) {
    return synchronizeApprovedRevisionMediaWithDatabase(
      originalListingId,
      revisionListingId,
      database,
    );
  }

  return db.transaction((tx: any) =>
    synchronizeApprovedRevisionMediaWithDatabase(originalListingId, revisionListingId, tx),
  );
}

async function syncPublishedListingMediaToPropertyMirrorWithDatabase(
  listingId: number,
  database: any,
) {
  const listing = await getListingById(listingId, database);
  if (!listing) {
    return { synced: false, reason: 'listing_not_found' as const };
  }

  if (listing.status !== 'published' && listing.status !== 'approved') {
    return { synced: false, reason: 'listing_not_published' as const };
  }

  // Replacing public media is a public projection update, never a draft-only
  // action. This prevents repair/compatibility callers bypassing entitlement.
  await assertListingPublicationEntitled(database, { listingId, operation: 'public_media_sync' });

  const [mirroredProperty] = await database
    .select({ id: properties.id })
    .from(properties)
    .where(eq(properties.sourceListingId, listingId))
    .limit(1);

  if (!mirroredProperty) {
    return { synced: false, reason: 'property_mirror_not_found' as const };
  }

  const mediaItems = await getListingMedia(listingId, database);
  const imageItems = mediaItems.filter(
    item => item.mediaType === 'image' && isCompletedListingMedia(item),
  );
  const mainMedia = getPrimaryListingImage(imageItems);

  await database
    .update(properties)
    .set({
      mainImage: mainMedia ? mainMedia.processedUrl || mainMedia.originalUrl : null,
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    })
    .where(eq(properties.id, mirroredProperty.id));

  await database.delete(propertyImages).where(eq(propertyImages.propertyId, mirroredProperty.id));

  for (const item of imageItems) {
    await database.insert(propertyImages).values({
      propertyId: mirroredProperty.id,
      imageUrl: item.processedUrl || item.originalUrl,
      isPrimary: mainMedia && Number(mainMedia.id) === Number(item.id) ? 1 : 0,
      displayOrder: item.displayOrder,
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });
  }

  return {
    synced: true,
    propertyId: mirroredProperty.id,
    imageCount: imageItems.length,
  };
}

/**
 * Keep search mirror media in sync for already-published listings.
 *
 * Callers that already own a transaction must pass its executor. The wrapper
 * retains standalone atomic behavior for callers outside an approval flow.
 */
export async function syncPublishedListingMediaToPropertyMirror(listingId: number, database?: any) {
  const db = database || (await getDb());
  if (!db) throw new Error('Database not available');

  if (database) {
    return syncPublishedListingMediaToPropertyMirrorWithDatabase(listingId, database);
  }

  return db.transaction((tx: any) =>
    syncPublishedListingMediaToPropertyMirrorWithDatabase(listingId, tx),
  );
}

/**
 * Get approval queue items
 */
export async function getApprovalQueue(status?: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  let query = db
    .select({
      id: listingApprovalQueue.id,
      listingId: listingApprovalQueue.listingId,
      submittedBy: listingApprovalQueue.submittedBy,
      submittedAt: listingApprovalQueue.submittedAt,
      status: listingApprovalQueue.status,
      priority: listingApprovalQueue.priority,
      reviewedBy: listingApprovalQueue.reviewedBy,
      reviewedAt: listingApprovalQueue.reviewedAt,
      reviewNotes: listingApprovalQueue.reviewNotes,
      rejectionReason: listingApprovalQueue.rejectionReason,
      // Join with listings table to get listing details
      listingTitle: listings.title,
      listingPropertyType: listings.propertyType,
      listingAction: listings.action,
      listingStatus: listings.status,
    })
    .from(listingApprovalQueue)
    .leftJoin(listings, eq(listingApprovalQueue.listingId, listings.id));

  if (status) {
    query = query.where(eq(listingApprovalQueue.status, status as any));
  }

  return await query.orderBy(desc(listingApprovalQueue.submittedAt));
}

function finiteCoordinate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(7) : null;
}

function readPrivateAddress(value: unknown): PrivateAddress | null {
  if (!value) return null;
  if (typeof value === 'object') return value as PrivateAddress;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as PrivateAddress;
    } catch {
      return null;
    }
  }
  return null;
}

function locationLabels(listing: any) {
  const areaLabel = [listing.suburb, listing.city, listing.province]
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .join(', ');
  const privateAddress = readPrivateAddress(listing.privateAddress);
  const streetName = privateAddress?.streetName?.trim() || '';
  const streetNumber = privateAddress?.streetNumber?.trim() || '';
  const streetLabel = [streetName, areaLabel].filter(Boolean).join(', ');
  const fullAddressLabel = [[streetNumber, streetName].filter(Boolean).join(' '), areaLabel]
    .filter(Boolean)
    .join(', ');

  return { areaLabel, privateAddress, streetLabel, fullAddressLabel };
}

async function buildPublicLocationProjection(database: any, listing: any) {
  const precision = listing.publicLocationPrecision === 'exact' ? 'exact' : 'approximate';
  const policy = storedPrecisionToPublicLocationPolicy(precision);
  const { areaLabel, streetLabel, fullAddressLabel } = locationLabels(listing);

  if (precision === 'exact') {
    const latitude = finiteCoordinate(listing.latitude);
    const longitude = finiteCoordinate(listing.longitude);
    const hasExactCoordinatePair =
      normalizeCoordinatePair(listing.latitude, listing.longitude) !== null;
    return {
      publicAddress: fullAddressLabel || areaLabel || null,
      publicLatitude: hasExactCoordinatePair ? latitude : null,
      publicLongitude: hasExactCoordinatePair ? longitude : null,
      publicLocationPrecision: 'exact' as const,
      publicLocationPolicy: policy,
    };
  }

  let center: { latitude: string | null; longitude: string | null } | null = null;
  if (listing.suburbId) {
    const [suburb] = await database
      .select({ latitude: suburbs.latitude, longitude: suburbs.longitude })
      .from(suburbs)
      .where(eq(suburbs.id, Number(listing.suburbId)))
      .limit(1);
    center = suburb || null;
  }
  if (!center && listing.cityId) {
    const [city] = await database
      .select({ latitude: cities.latitude, longitude: cities.longitude })
      .from(cities)
      .where(eq(cities.id, Number(listing.cityId)))
      .limit(1);
    center = city || null;
  }
  if (!center && listing.provinceId) {
    const [province] = await database
      .select({ latitude: provinces.latitude, longitude: provinces.longitude })
      .from(provinces)
      .where(eq(provinces.id, Number(listing.provinceId)))
      .limit(1);
    center = province || null;
  }

  const approximateCoordinates = normalizeCoordinatePair(center?.latitude, center?.longitude);

  return {
    publicAddress: streetLabel || areaLabel || null,
    publicLatitude: approximateCoordinates ? finiteCoordinate(center?.latitude) : null,
    publicLongitude: approximateCoordinates ? finiteCoordinate(center?.longitude) : null,
    publicLocationPrecision: 'approximate' as const,
    publicLocationPolicy: policy,
  };
}

function remapApprovedRevisionPresentationMedia(
  propertyDetails: Record<string, any>,
  mediaIdMap: Map<number, number>,
) {
  const presentation = normalizePropertyPresentation(propertyDetails.propertyPresentation);
  if (!presentation) return propertyDetails;

  const media = presentation.media.map(item => {
    if (!item.mediaId.startsWith('existing:')) return item;
    const revisionMediaId = Number(item.mediaId.slice('existing:'.length));
    const originalMediaId = mediaIdMap.get(revisionMediaId);
    if (!originalMediaId) {
      throw new Error('Approved revision presentation references unsynchronized media');
    }
    return { ...item, mediaId: `existing:${originalMediaId}` };
  });

  return {
    ...propertyDetails,
    propertyPresentation: { ...presentation, media },
  };
}

function parsePublicationRecord(value: unknown, label: string): Record<string, any> {
  if (value === undefined || value === null || value === '') return {};
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, any>;
      }
    } catch {
      // The public projection boundary fails closed below. A malformed source
      // snapshot must never be converted into an empty public record.
    }
  }
  throw new Error(`Listing ${label} is not a valid publication record`);
}

function publicListingTypeForAction(action: unknown): 'sale' | 'rent' | 'auction' {
  if (action === 'sell') return 'sale';
  if (action === 'rent') return 'rent';
  if (action === 'auction') return 'auction';
  throw new Error(`Unsupported listing action for public projection: ${String(action)}`);
}

function knownCoreNumber(fact: any): number | null {
  return fact?.status === 'known' && Number.isFinite(Number(fact.value))
    ? Number(fact.value)
    : null;
}

function knownCoreMeasurement(fact: any): number | null {
  return fact?.status === 'known' && Number.isFinite(Number(fact.valueM2))
    ? Number(fact.valueM2)
    : null;
}

type CanonicalPublicPropertyProjection = {
  canonicalDetails: Record<string, any>;
  propertyValues: Record<string, any>;
};

/**
 * Keep the canonical source row internally coherent when a revision changes
 * intent. Revision drafts are cloned from the live row, so columns belonging
 * to the previous intent can otherwise survive a Sale -> Rent (or equivalent)
 * transition even though they are no longer valid authored truth.
 */
function buildCanonicalListingPricingSnapshot(listing: any) {
  const action = String(listing.action);
  return {
    askingPrice: action === 'sell' ? listing.askingPrice : null,
    negotiable: action === 'sell' ? listing.negotiable : 0,
    transferCostEstimate: action === 'sell' ? listing.transferCostEstimate : null,
    monthlyRent: action === 'rent' ? listing.monthlyRent : null,
    deposit: action === 'rent' ? listing.deposit : null,
    leaseTerms: action === 'rent' ? listing.leaseTerms : null,
    availableFrom: action === 'rent' ? listing.availableFrom : null,
    utilitiesIncluded: action === 'rent' ? listing.utilitiesIncluded : 0,
    startingBid: action === 'auction' ? listing.startingBid : null,
    reservePrice: action === 'auction' ? listing.reservePrice : null,
    auctionDateTime: action === 'auction' ? listing.auctionDateTime : null,
    auctionTermsDocumentUrl: action === 'auction' ? listing.auctionTermsDocumentUrl : null,
  };
}

/**
 * Build the complete public read-model snapshot from one canonical listing
 * version. Initial approval and approved revisions both pass through this
 * function so taxonomy, pricing, core facts, location, presentation and
 * ownership cannot drift behind a partial field patch.
 */
async function buildCanonicalPublicPropertyProjection(
  database: any,
  listing: any,
  input: {
    sourceListingId: number;
    approvedAt: string;
    propertyDetails?: Record<string, any>;
  },
): Promise<CanonicalPublicPropertyProjection> {
  const details = input.propertyDetails
    ? { ...input.propertyDetails }
    : parsePublicationRecord(listing.propertyDetails, 'property details');
  const pricing = parsePublicationRecord(listing.pricing, 'pricing');
  const featuresContext = normalizeFeaturesContext(details.featuresContext, details);
  const canonicalDetails: Record<string, any> = {
    ...details,
    featuresContext,
    ...buildCanonicalCorePropertyDetails(String(listing.propertyType) as any, details),
  };
  const pricingProjection = getPricingProjection(String(listing.action), pricing, canonicalDetails);
  if (pricingProjection.contract) {
    canonicalDetails.pricingContract = pricingProjection.contract;
  }

  const core = buildCorePropertyInformation(String(listing.propertyType) as any, canonicalDetails);
  const bedrooms =
    knownCoreNumber(core.bedrooms) ??
    (Number.isFinite(Number(details.bedrooms)) ? Number(details.bedrooms) : null);
  const bathrooms =
    knownCoreNumber(core.bathrooms) ??
    (Number.isFinite(Number(details.bathrooms)) ? Number(details.bathrooms) : null);
  const internalAreaM2 = knownCoreMeasurement(core.internalArea);
  const erfSizeM2 = knownCoreMeasurement(core.erfArea);
  const landAreaM2 =
    core.farmLandArea?.status === 'known' && Number.isFinite(Number(core.farmLandArea.normalizedM2))
      ? Number(core.farmLandArea.normalizedM2)
      : null;
  const compatibilityAreaCandidates = [
    details.unitSizeM2,
    details.houseAreaM2,
    details.floorAreaM2,
    details.erfSizeM2,
    details.landAreaM2,
  ];
  const compatibilityArea = compatibilityAreaCandidates
    .map(value => Number(value))
    .find(value => Number.isFinite(value) && value > 0);

  // `area` remains a required compatibility/search column. Prefer the same
  // normalized core facts as Detail, including erf/land area where a dwelling
  // floor area is not applicable.
  const area = internalAreaM2 ?? erfSizeM2 ?? landAreaM2 ?? compatibilityArea ?? 0;
  const authoredAmenities = Array.isArray(details.amenities)
    ? details.amenities
    : typeof details.amenities === 'string'
      ? details.amenities.split(',')
      : [];
  const amenitiesList = Array.from(
    new Set(
      [...featuresContext.spaces, ...featuresContext.security.features, ...authoredAmenities]
        .map(value => String(value || '').trim())
        .filter(Boolean),
    ),
  );
  const publicLocation = await buildPublicLocationProjection(database, listing);
  const listingType = publicListingTypeForAction(listing.action);

  return {
    canonicalDetails,
    propertyValues: {
      title: listing.title,
      description: listing.description,
      propertyType: toPublicPropertyType(String(listing.propertyType)),
      listingType,
      transactionType: listingType,
      price: pricingProjection.price,
      bedrooms,
      bathrooms,
      area,
      internalAreaM2,
      erfSizeM2,
      landAreaM2,
      address: publicLocation.publicAddress || 'Location available on enquiry',
      city: listing.city,
      province: listing.province,
      zipCode: listing.postalCode,
      latitude: publicLocation.publicLatitude,
      longitude: publicLocation.publicLongitude,
      provinceId: listing.provinceId,
      cityId: listing.cityId,
      suburbId: listing.suburbId,
      publicAddress: publicLocation.publicAddress,
      publicLatitude: publicLocation.publicLatitude,
      publicLongitude: publicLocation.publicLongitude,
      publicLocationPrecision: publicLocation.publicLocationPrecision,
      locationText:
        publicLocation.publicAddress ||
        [listing.suburb, listing.city, listing.province].filter(Boolean).join(', ') ||
        'Location available on enquiry',
      // Provider IDs and development/catalogue ownership are not valid
      // provenance for a manual-listing projection.
      placeId: null,
      developmentId: null,
      cataloguePublisherId: null,
      amenities: amenitiesList.length > 0 ? amenitiesList.join(',') : null,
      status: 'available' as any,
      featured: listing.featured || 0,
      agentId: listing.agentId || null,
      ownerId: listing.ownerId,
      sourceListingId: input.sourceListingId,
      propertySettings: JSON.stringify(canonicalDetails),
      videoUrl: null,
      virtualTourUrl:
        getSafePropertyPresentationVirtualTour(canonicalDetails.propertyPresentation)?.embedUrl ||
        null,
      levies: pricingProjection.legacyLevy,
      ratesAndTaxes: pricingProjection.ratesAndTaxes,
      updatedAt: input.approvedAt,
    },
  };
}

async function upsertCanonicalPublicPropertyProjection(
  database: any,
  propertyValues: Record<string, any>,
): Promise<number> {
  const [existingProperty] = await database
    .select({ id: properties.id })
    .from(properties)
    .where(eq(properties.sourceListingId, Number(propertyValues.sourceListingId)))
    .limit(1);

  if (existingProperty) {
    await database
      .update(properties)
      .set(propertyValues)
      .where(eq(properties.id, Number(existingProperty.id)));
    return Number(existingProperty.id);
  }

  const [propertyResult] = await database.insert(properties).values({
    ...propertyValues,
    views: 0,
    enquiries: 0,
    createdAt: propertyValues.updatedAt,
  });
  return Number((propertyResult as any).insertId);
}

function buildApprovedRevisionSourceSnapshot(
  revision: any,
  canonicalDetails: Record<string, any>,
  mediaSynchronization: {
    primaryMediaId: number | null;
    mediaIdMap: Map<number, number>;
  },
  reviewedBy: number,
  approvedAt: string,
) {
  const promotedPrimaryMediaId = mediaSynchronization.primaryMediaId
    ? mediaSynchronization.mediaIdMap.get(Number(mediaSynchronization.primaryMediaId)) || null
    : null;

  return {
    // Explicit provenance/ownership is part of the approved version. The
    // commercial-owner equality guard has already proved that a revision
    // cannot move inventory across customers.
    ownerId: revision.ownerId,
    agentId: revision.agentId || null,
    agencyId: revision.agencyId || null,
    action: revision.action,
    propertyType: revision.propertyType,
    title: revision.title,
    description: revision.description,
    ...buildCanonicalListingPricingSnapshot(revision),
    propertyDetails: canonicalDetails,
    address: revision.address,
    latitude: revision.latitude,
    longitude: revision.longitude,
    city: revision.city,
    suburb: revision.suburb,
    province: revision.province,
    postalCode: revision.postalCode,
    placeId: revision.placeId,
    locationId: revision.locationId,
    provinceId: revision.provinceId,
    cityId: revision.cityId,
    suburbId: revision.suburbId,
    privateAddress: revision.privateAddress,
    coordinateSource: revision.coordinateSource,
    locationConfirmationState: revision.locationConfirmationState,
    publicLocationPrecision: revision.publicLocationPrecision,
    mainMediaId: promotedPrimaryMediaId,
    mainMediaType: promotedPrimaryMediaId ? ('image' as const) : null,
    readinessScore: revision.readinessScore,
    qualityScore: revision.qualityScore,
    qualityBreakdown: revision.qualityBreakdown,
    metaTitle: revision.metaTitle,
    metaDescription: revision.metaDescription,
    searchTags: revision.searchTags,
    featured: revision.featured || 0,
    status: 'published' as any,
    approvalStatus: 'approved' as any,
    reviewedBy,
    reviewedAt: approvedAt,
    updatedAt: approvedAt,
  };
}

/**
 * Search results are cached independently from the approval transaction. The
 * cache must be invalidated only after the transaction commits so a failed
 * approval cannot disturb a still-valid public snapshot, and a successful
 * approval cannot leave Search serving the previous projection indefinitely.
 *
 * This is intentionally a post-commit, best-effort side effect: approval has
 * already committed at this point, so a cache-service failure must not report
 * a false approval failure or trigger a retry of the lifecycle transaction.
 */
async function invalidateApprovedPropertySearchCacheAfterCommit(): Promise<void> {
  try {
    const { propertySearchService } = await import('./services/propertySearchService');
    await propertySearchService.invalidateCache();
  } catch (error) {
    console.error('[Listings] Approved property Search cache invalidation failed', error);
  }
}

/**
 * Approve listing
 */
export async function approveListing(
  listingId: number,
  reviewedBy: number,
  notes?: string,
  source: 'admin_approval' | 'fast_track' = 'admin_approval',
  database?: any,
) {
  const db = database || (await getDb());
  if (!db) throw new Error('Database not available');

  if (!database && typeof db.transaction === 'function') {
    const result = await db.transaction((transaction: any) =>
      approveListing(listingId, reviewedBy, notes, source, transaction),
    );
    await invalidateApprovedPropertySearchCacheAfterCommit();
    return result;
  }

  await lockListingTransitionRow(db, listingId);

  // 1. Get full listing data
  const listing = await getListingById(listingId, db);
  if (!listing) throw new Error('Listing not found');

  if (listing.status === 'published' || listing.status === 'approved') {
    throw new Error('Listing is already published');
  }

  if (listing.status === 'archived' || (listing.status === 'rejected' && source !== 'fast_track')) {
    throw new Error(`Listing cannot be approved from status "${listing.status}"`);
  }

  const allowedStatuses = source === 'fast_track' ? ['draft', 'rejected'] : ['pending_review'];
  if (!allowedStatuses.includes(String(listing.status))) {
    throw new Error(`Listing cannot be approved from status "${listing.status}"`);
  }

  // This guard is deliberately in the persistence path. A router, script, or
  // future service that invokes approveListing cannot create a public property
  // without the same commercial decision. A revision replaces an existing
  // active listing, so that original is excluded from the capacity count.
  const originalListingIdForCapacity = Number((listing as any).revisionOfListingId || 0);
  const listingCommercialOwner = await assertListingPublicationEntitled(db, {
    listingId,
    operation: source === 'fast_track' ? 'fast_track' : 'admin_approval',
    ...(originalListingIdForCapacity > 0
      ? { excludeListingIds: [originalListingIdForCapacity] }
      : {}),
  });

  const commercialPricing = await validateCommercialOfficeListingPricing(db, listingId);
  if (commercialPricing.kind === 'invalid_commercial_context')
    throw new Error(commercialPricing.message);
  const pricingIssues =
    commercialPricing.kind === 'canonical_office'
      ? []
      : validatePricingContract(
          String((listing as any).action),
          (listing as any).pricing,
          (listing as any).propertyDetails,
          { mode: 'publish', enforceInputShape: false },
        );
  if (pricingIssues.length > 0) {
    throw new Error(pricingIssues.map(issue => issue.message).join(' '));
  }
  const locationIssues = validateListingRecordLocation(listing as Record<string, unknown>);
  if (locationIssues.length > 0) {
    throw new Error(locationIssues.join(' '));
  }

  // A revision is a private listing-engine draft. Approval applies its public fields to
  // the original canonical listing/projection; the revision itself never becomes public.
  if ((listing as any).revisionOfListingId) {
    const originalListingId = Number((listing as any).revisionOfListingId);
    const [original] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, originalListingId))
      .limit(1);
    if (!original || original.status !== 'published')
      throw new Error('The original published listing is no longer available for this revision');
    const revisionCommercialOwner = listingCommercialOwner;
    const originalCommercialOwner = await assertListingPublicationEntitled(db, {
      listingId: originalListingId,
      operation: 'republish',
    });
    if (!isSameListingCommercialOwner(revisionCommercialOwner, originalCommercialOwner)) {
      throw new Error('Listing revision commercial owner does not match the original listing');
    }
    const mediaSynchronization = await synchronizeApprovedRevisionMedia(
      originalListingId,
      listingId,
      db,
    );
    const approvedPropertyDetails = remapApprovedRevisionPresentationMedia(
      parsePublicationRecord((listing as any).propertyDetails, 'property details'),
      mediaSynchronization.mediaIdMap,
    );
    const approvedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const projection = await buildCanonicalPublicPropertyProjection(db, listing, {
      sourceListingId: originalListingId,
      approvedAt,
      propertyDetails: approvedPropertyDetails,
    });
    await db
      .update(listings)
      .set(
        buildApprovedRevisionSourceSnapshot(
          listing,
          projection.canonicalDetails,
          mediaSynchronization,
          reviewedBy,
          approvedAt,
        ) as any,
      )
      .where(eq(listings.id, originalListingId));
    await upsertCanonicalPublicPropertyProjection(db, projection.propertyValues);
    await syncPublishedListingMediaToPropertyMirror(originalListingId, db);
    await db
      .update(listings)
      .set({
        status: 'archived' as any,
        approvalStatus: 'approved' as any,
        reviewedBy,
        reviewedAt: approvedAt,
        updatedAt: approvedAt,
      } as any)
      .where(eq(listings.id, listingId));
    await db
      .update(listingApprovalQueue)
      .set({ status: 'approved' as any, reviewedBy, reviewedAt: approvedAt, reviewNotes: notes })
      .where(eq(listingApprovalQueue.listingId, listingId));
    return;
  }

  // Initial approval and revision approval use the same complete projection
  // builder. Re-evaluate immediately before the first public write as defence
  // in depth for entitlement changes between review and projection.
  await assertListingPublicationEntitled(db, { listingId, operation: 'public_projection' });
  const approvedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const projection = await buildCanonicalPublicPropertyProjection(db, listing, {
    sourceListingId: listingId,
    approvedAt,
  });
  const newPropertyId = await upsertCanonicalPublicPropertyProjection(
    db,
    projection.propertyValues,
  );

  // 4. Sync Media
  const mediaItems = await getListingMedia(listingId, db);
  const imageItems = mediaItems.filter(
    item => item.mediaType === 'image' && isCompletedListingMedia(item),
  );
  const mainMedia = getPrimaryListingImage(imageItems);

  await db
    .update(properties)
    .set({ mainImage: mainMedia ? mainMedia.processedUrl || mainMedia.originalUrl : null })
    .where(eq(properties.id, newPropertyId));

  await db.delete(propertyImages).where(eq(propertyImages.propertyId, newPropertyId));

  for (const item of imageItems) {
    await db.insert(propertyImages).values({
      propertyId: newPropertyId,
      imageUrl: item.processedUrl || item.originalUrl,
      isPrimary: mainMedia && Number(mainMedia.id) === Number(item.id) ? 1 : 0,
      displayOrder: item.displayOrder,
      createdAt: approvedAt,
    });
  }

  // 5. Update listing status
  await db
    .update(listings)
    .set({
      status: 'published' as any,
      approvalStatus: 'approved' as any,
      ...buildCanonicalListingPricingSnapshot(listing),
      propertyDetails: projection.canonicalDetails,
      reviewedBy,
      reviewedAt: approvedAt,
      publishedAt: approvedAt,
      updatedAt: approvedAt,
    })
    .where(eq(listings.id, listingId));

  // 6. Update approval queue
  await db
    .update(listingApprovalQueue)
    .set({
      status: 'approved' as any,
      reviewedBy,
      reviewedAt: approvedAt,
      reviewNotes: notes,
    })
    .where(eq(listingApprovalQueue.listingId, listingId));
}

/**
 * Reject listing
 */
export async function rejectListing(
  listingId: number,
  reviewedBy: number,
  reason: string,
  reasons?: string[],
  note?: string,
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const listing = await getListingById(listingId);
  if (!listing) throw new Error('Listing not found');
  if (listing.status !== 'pending_review') {
    throw new Error(`Listing cannot be rejected from status "${listing.status}"`);
  }

  // Update listing status
  await db
    .update(listings)
    .set({
      status: 'rejected',
      approvalStatus: 'rejected',
      reviewedBy,
      reviewedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      rejectionReason: reason, // Legacy support
      rejectionReasons: reasons ? JSON.stringify(reasons) : null,
      rejectionNote: note,
    })
    .where(eq(listings.id, listingId));

  // Update approval queue
  await db
    .update(listingApprovalQueue)
    .set({
      status: 'rejected',
      reviewedBy,
      reviewedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      reviewNotes: note || reason,
      rejectionReason: reason,
    })
    .where(
      and(
        eq(listingApprovalQueue.listingId, listingId),
        eq(listingApprovalQueue.status, 'pending'),
      ),
    );
}

/**
 * Archive property (Soft Delete)
 */
export async function archiveProperty(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const property = await getPropertyById(id);
  if (!property) throw new Error('Property not found');
  assertListingBackedPropertyProjectionIsReadOnly(property, 'archive this inventory');

  await db
    .update(properties)
    .set({
      status: 'archived' as any,
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    })
    .where(eq(properties.id, id));
}

/**
 * Delete listing (Hard Delete)
 */
export async function deleteListing(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const listing = await getListingById(id);
  if (!listing) throw new Error('Listing not found');
  if (['published', 'approved'].includes(String(listing.status))) {
    throw new Error('Published listings must be archived through the canonical lifecycle.');
  }

  await db.transaction(async tx => {
    await tx
      .update(properties)
      .set({
        status: 'archived',
        updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      })
      .where(eq(properties.sourceListingId, id));

    // Delete related media first to avoid foreign key constraint errors
    await tx.delete(listingMedia).where(eq(listingMedia.listingId, id));

    // Delete from approval queue if exists
    await tx.delete(listingApprovalQueue).where(eq(listingApprovalQueue.listingId, id));

    // Delete analytics
    await tx.delete(listingAnalytics).where(eq(listingAnalytics.listingId, id));

    // Delete leads
    await tx.delete(listingLeads).where(eq(listingLeads.listingId, id));

    // Delete viewings
    await tx.delete(listingViewings).where(eq(listingViewings.listingId, id));

    // Now delete the listing
    await tx.delete(listings).where(eq(listings.id, id));
  });
}

/**
 * Archive listing (Soft Delete)
 */
export async function archiveListing(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const archivedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await db.transaction(async tx => {
    await tx
      .update(listings)
      .set({
        status: 'archived' as any,
        archivedAt,
        updatedAt: archivedAt,
      })
      .where(eq(listings.id, id));

    await tx
      .update(properties)
      .set({
        status: 'archived',
        updatedAt: archivedAt,
      })
      .where(eq(properties.sourceListingId, id));
  });
}

/**
 * Update canonical listing custody and its public projection together.
 *
 * Agent assignment is an authored-listing decision. The public property row
 * is updated only as the derived projection of that decision, in the same
 * transaction, so a projection-only custody write cannot drift from source.
 */
export async function updateListingAgentAssignment(listingId: number, agentId: number | null) {
  await updateListingAgentAssignments([listingId], agentId);
}

export async function updateListingAgentAssignments(listingIds: number[], agentId: number | null) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const uniqueListingIds = [
    ...new Set(listingIds.map(Number).filter(id => Number.isSafeInteger(id) && id > 0)),
  ];
  if (uniqueListingIds.length === 0) return;

  const updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await db.transaction(async tx => {
    await tx
      .update(listings)
      .set({ agentId, updatedAt })
      .where(inArray(listings.id, uniqueListingIds));

    await tx
      .update(properties)
      .set({ agentId, updatedAt })
      .where(inArray(properties.sourceListingId, uniqueListingIds));
  });
}

/**
 * Create agent profile
 */
export async function createAgentProfile(data: {
  userId: number;
  displayName: string;
  phone: string;
  bio?: string;
  profilePhoto?: string;
  licenseNumber?: string;
  specializations?: string[];
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(agents).values({
    userId: data.userId,
    displayName: data.displayName,
    phone: data.phone,
    bio: data.bio || null,
    profileImage: data.profilePhoto || null,
    licenseNumber: data.licenseNumber || null,
    specialization: data.specializations ? data.specializations.join(',') : null,
    firstName: data.displayName.split(' ')[0] || data.displayName,
    lastName: data.displayName.split(' ').slice(1).join(' ') || '',
    isVerified: 0,
    isFeatured: 0,
    status: 'pending' as any, // Pending until ID/FFC verification complete
    createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
  });

  return Number(result[0].insertId);
}

/**
 * Get agent by user ID
 */
export async function getAgentByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [agent] = await db.select().from(agents).where(eq(agents.userId, userId)).limit(1);

  return agent || null;
}

// ==================== LISTINGS SEARCH (NEW) ====================

/**
 * Transform listing to property format for backward compatibility
 */
export function transformListingToProperty(listing: any, media: any[] = []) {
  const propertyDetails = (listing.propertyDetails as any) || {};
  const canonicalDetails = {
    ...propertyDetails,
    featuresContext: normalizeFeaturesContext(propertyDetails.featuresContext, propertyDetails),
    ...buildCanonicalCorePropertyDetails(String(listing.propertyType) as any, propertyDetails),
  };

  const featuresContext = canonicalDetails.featuresContext;
  const structuredFeatures = [...featuresContext.spaces, ...featuresContext.security.features];
  const publicLocationPolicy = storedPrecisionToPublicLocationPolicy(
    listing.publicLocationPrecision,
  );
  const { areaLabel: publicAreaLabel, streetLabel, fullAddressLabel } = locationLabels(listing);
  const exactPublicLocation = publicLocationPolicy === 'full_address';
  type PublicListingMedia = {
    id: string | number;
    url: string;
    mediaType: 'image' | 'video' | 'floorplan' | 'pdf';
    type: 'image' | 'video' | 'floorplan' | 'pdf';
    isPrimary: number;
    displayOrder: number;
    thumbnailUrl: string | null;
    previewUrl: string | null;
    processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
    originalFileName: string | null;
    mimeType?: string | null;
    presentationKind?: 'floorplan' | 'document';
    presentationLabel?: string | null;
  };
  const publicMediaCandidates = media
    .map((item: any) => {
      const rawUrl = getListingMediaUrl(item);
      const mediaType = getListingMediaType(item);
      if (!rawUrl || !mediaType) return null;

      const presentationDescriptor = getPresentationMediaDescriptor(
        propertyDetails.propertyPresentation,
        {
          id: item.id,
          type: mediaType,
          mediaType,
          url: rawUrl,
          originalUrl: item.originalUrl,
          originalFileName: item.originalFileName,
        },
      );

      const url = resolveMediaDeliveryUrl(rawUrl);
      if (!url) return null;

      return {
        id: item.id,
        url,
        mediaType,
        type: mediaType,
        isPrimary: item.isPrimary ? 1 : 0,
        displayOrder: Number(item.displayOrder || 0),
        thumbnailUrl: item.thumbnailUrl || null,
        previewUrl: item.previewUrl || null,
        processingStatus: item.processingStatus || 'completed',
        originalFileName: item.originalFileName || null,
        mimeType: item.mimeType || null,
        presentationKind: presentationDescriptor.kind,
        presentationLabel: presentationDescriptor.label || null,
      };
    })
    .filter(Boolean) as PublicListingMedia[];
  const primaryPublicImage = getPrimaryListingImage(publicMediaCandidates);
  const publicMedia = publicMediaCandidates.map(item => ({
    ...item,
    isPrimary: primaryPublicImage && Number(primaryPublicImage.id) === Number(item.id) ? 1 : 0,
  }));
  const mediaSummary = summarizePropertyPresentation(media, propertyDetails.propertyPresentation);

  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    // Map price based on action type
    price: getPrimaryPrice(listing.action, listing.pricing || listing, canonicalDetails) || 0,
    listingType: listing.action, // 'sell', 'rent', 'auction'
    propertyType: toPublicPropertyType(String(listing.propertyType)),
    propertySettings: canonicalDetails,
    propertyDetails: canonicalDetails,
    // Extract from propertyDetails JSON
    bedrooms: canonicalDetails.bedrooms || 0,
    bathrooms: canonicalDetails.bathrooms || 0,
    area:
      canonicalDetails.internalAreaM2 ||
      canonicalDetails.unitSizeM2 ||
      canonicalDetails.houseAreaM2 ||
      canonicalDetails.floorAreaM2 ||
      0,
    yardSize:
      canonicalDetails.erfAreaM2 || canonicalDetails.erfSizeM2 || canonicalDetails.landAreaM2 || 0,
    amenities: [
      ...structuredFeatures,
      ...(Array.isArray(canonicalDetails.amenities) ? canonicalDetails.amenities : []),
      ...(Array.isArray(canonicalDetails.amenitiesFeatures)
        ? canonicalDetails.amenitiesFeatures
        : []),
      ...(Array.isArray(canonicalDetails.securityFeatures)
        ? canonicalDetails.securityFeatures
        : []),
      ...(Array.isArray(canonicalDetails.kitchenFeatures) ? canonicalDetails.kitchenFeatures : []),
      ...(Array.isArray(canonicalDetails.outdoorFeatures) ? canonicalDetails.outdoorFeatures : []),
      ...(Array.isArray(canonicalDetails.energyFeatures) ? canonicalDetails.energyFeatures : []),
      canonicalDetails.waterHeating,
      canonicalDetails.waterSupply,
    ]
      .filter(Boolean)
      .flat(),
    features: [
      ...structuredFeatures,
      ...(Array.isArray(canonicalDetails.amenities) ? canonicalDetails.amenities : []),
      ...(Array.isArray(canonicalDetails.amenitiesFeatures)
        ? canonicalDetails.amenitiesFeatures
        : []),
      ...(Array.isArray(canonicalDetails.securityFeatures)
        ? canonicalDetails.securityFeatures
        : []),
      ...(Array.isArray(canonicalDetails.kitchenFeatures) ? canonicalDetails.kitchenFeatures : []),
      ...(Array.isArray(canonicalDetails.outdoorFeatures) ? canonicalDetails.outdoorFeatures : []),
      ...(Array.isArray(canonicalDetails.energyFeatures) ? canonicalDetails.energyFeatures : []),
      canonicalDetails.waterHeating,
      canonicalDetails.waterSupply,
    ]
      .filter(Boolean)
      .flat(),
    // Location fields
    city: listing.city,
    province: listing.province,
    suburb: listing.suburb,
    address: exactPublicLocation
      ? fullAddressLabel || publicAreaLabel
      : streetLabel || publicAreaLabel,
    zipCode: listing.postalCode,
    latitude: exactPublicLocation ? finiteCoordinate(listing.latitude) : null,
    longitude: exactPublicLocation ? finiteCoordinate(listing.longitude) : null,
    provinceId: listing.provinceId ?? null,
    cityId: listing.cityId ?? null,
    suburbId: listing.suburbId ?? null,
    publicLocationPrecision: exactPublicLocation ? 'exact' : 'approximate',
    publicLocationPolicy,
    // Compatibility cards receive only completed image URLs. Typed consumers
    // use `media` so video/document semantics are never discarded.
    images: publicMedia
      .filter(item => item.mediaType === 'image' && isCompletedListingMedia(item))
      .map(item => item.url)
      .filter(Boolean),
    media: publicMedia,
    virtualTour:
      getSafePropertyPresentationVirtualTour(propertyDetails.propertyPresentation) || null,
    mediaSummary,
    hasFloorplan: mediaSummary.hasFloorplan,
    hasVirtualTour: mediaSummary.hasVirtualTour,
    hasPublicDocuments: mediaSummary.hasDocuments,
    mainImage: primaryPublicImage?.url || null,
    // Metadata
    status: listing.status,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    userId: listing.userId,
    ownerId: listing.userId,
    // Linked Agent/User details from join
    agent: listing.agentId
      ? {
          name: listing.agentName,
          image: listing.agentImage,
          email: listing.agentEmail,
          phone: listing.agentPhone,
        }
      : null,
    user: {
      id: listing.ownerId,
      name: listing.ownerName,
      image: listing.ownerImage,
      email: listing.ownerEmail,
    },
  };
}

interface ListingSearchParams {
  city?: string;
  province?: string;
  propertyType?: string;
  listingType?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minArea?: number;
  maxArea?: number;
  status?: string;
  amenities?: string[];
  postedBy?: string[];
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
  limit?: number;
  offset?: number;
}

/**
 * Search listings (replacement for searchProperties)
 */
export async function searchListings(params: ListingSearchParams) {
  const db = await getDb();
  if (!db) return [];

  const conditions: SQL[] = [];

  // Only show published listings (status after approval)
  // Use raw SQL to bypass Drizzle enum type mismatch
  conditions.push(sql`${listings.status} = 'published'`);

  // Location filters - use LOWER for case-insensitive matching
  if (params.city)
    conditions.push(sql`LOWER(${listings.city}) LIKE ${`%${params.city.toLowerCase()}%`}`);
  if (params.province)
    conditions.push(sql`LOWER(${listings.province}) LIKE ${`%${params.province.toLowerCase()}%`}`);

  // Property type filter
  if (params.propertyType) conditions.push(eq(listings.propertyType, params.propertyType as any));

  // Listing type filter (map to action)
  let actionFilter: string | undefined;
  if (params.listingType) {
    const actionMap: Record<string, string> = {
      sale: 'sell',
      rent: 'rent',
      auction: 'auction',
      rent_to_buy: 'rent',
      shared_living: 'rent',
    };
    actionFilter = actionMap[params.listingType] || params.listingType;
    conditions.push(eq(listings.action, actionFilter as any));
  }

  // Price filters - handle different price fields based on action
  if (params.minPrice || params.maxPrice) {
    const priceConditions: SQL[] = [];

    const priceColumn =
      actionFilter === 'sell'
        ? listings.askingPrice
        : actionFilter === 'rent'
          ? listings.monthlyRent
          : actionFilter === 'auction'
            ? listings.startingBid
            : undefined;

    if (priceColumn && params.minPrice) {
      priceConditions.push(gte(priceColumn, params.minPrice.toString()));
    } else if (!priceColumn && params.minPrice) {
      priceConditions.push(
        or(
          gte(listings.askingPrice, params.minPrice.toString()),
          gte(listings.monthlyRent, params.minPrice.toString()),
          gte(listings.startingBid, params.minPrice.toString()),
        )!,
      );
    }

    if (priceColumn && params.maxPrice) {
      priceConditions.push(lte(priceColumn, params.maxPrice.toString()));
    } else if (!priceColumn && params.maxPrice) {
      priceConditions.push(
        or(
          lte(listings.askingPrice, params.maxPrice.toString()),
          lte(listings.monthlyRent, params.maxPrice.toString()),
          lte(listings.startingBid, params.maxPrice.toString()),
        )!,
      );
    }

    if (priceConditions.length > 0) {
      conditions.push(and(...priceConditions)!);
    }
  }

  // Geographic bounds filter
  if (params.minLat !== undefined && params.maxLat !== undefined) {
    conditions.push(
      sql`CAST(${listings.latitude} AS DECIMAL(10, 6)) >= ${params.minLat} AND CAST(${listings.latitude} AS DECIMAL(10, 6)) <= ${params.maxLat}`,
    );
  }
  if (params.minLng !== undefined && params.maxLng !== undefined) {
    conditions.push(
      sql`CAST(${listings.longitude} AS DECIMAL(10, 6)) >= ${params.minLng} AND CAST(${listings.longitude} AS DECIMAL(10, 6)) <= ${params.maxLng}`,
    );
  }

  // Build query
  let query = db
    .select({
      ...getTableColumns(listings),
      ownerName: users.name,
      ownerEmail: users.email,
      agentName: agents.displayName,
      agentImage: agents.profileImage,
      agentEmail: agents.email,
      agentPhone: agents.phone,
    })
    .from(listings)
    .leftJoin(users, eq(listings.ownerId, users.id))
    .leftJoin(agents, eq(listings.agentId, agents.id)) as any;

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  query = query.orderBy(desc(listings.createdAt));

  if (params.limit) {
    query = query.limit(params.limit);
  }
  if (params.offset) {
    query = query.offset(params.offset);
  }

  const results = await query;

  // Fetch media for each listing
  const listingsWithMedia = await Promise.all(
    results.map(async (listing: any) => {
      const media = await db
        .select()
        .from(listingMedia)
        .where(eq(listingMedia.listingId, listing.id))
        .orderBy(listingMedia.displayOrder);

      return transformListingToProperty(listing, media);
    }),
  );

  // Apply filters that require JSON extraction (bedrooms, bathrooms, area, amenities)
  let filtered = listingsWithMedia;

  if (params.minBedrooms) {
    filtered = filtered.filter(p => p.bedrooms >= params.minBedrooms!);
  }
  if (params.maxBedrooms) {
    filtered = filtered.filter(p => p.bedrooms <= params.maxBedrooms!);
  }
  if (params.minArea) {
    filtered = filtered.filter(p => p.area >= params.minArea!);
  }
  if (params.maxArea) {
    filtered = filtered.filter(p => p.area <= params.maxArea!);
  }
  if (params.amenities && params.amenities.length > 0) {
    filtered = filtered.filter(p =>
      params.amenities!.every(amenity =>
        p.amenities.some((a: string) => a.toLowerCase().includes(amenity.toLowerCase())),
      ),
    );
  }

  return filtered;
}

/**
 * Get featured listings (replacement for getFeaturedProperties)
 */
export async function getFeaturedListings(limit: number = 6) {
  const db = await getDb();
  if (!db) return [];

  const results = await db
    .select()
    .from(listings)
    .where(and(eq(listings.featured, 1), eq(listings.status, 'approved' as any)))
    .orderBy(desc(listings.createdAt))
    .limit(limit);

  // Fetch media for each listing
  const listingsWithMedia = await Promise.all(
    results.map(async listing => {
      const media = await db
        .select()
        .from(listingMedia)
        .where(eq(listingMedia.listingId, listing.id))
        .orderBy(listingMedia.displayOrder);

      return transformListingToProperty(listing, media);
    }),
  );

  return listingsWithMedia;
}

// ==================== DEVELOPER FUNCTIONS ====================

/**
 * Developer identity compatibility boundary.
 *
 * These helpers retain the old database-module API for callers that still
 * need the shape, but all reads and writes resolve through the new
 * organisation/membership/publisher authority. They never read or write the
 * retired `developers` or `developer_brand_profiles` tables.
 */
type DeveloperOrganisationRow = {
  organisation: typeof developerOrganisations.$inferSelect;
  publisher: typeof cataloguePublishers.$inferSelect;
  userId: number | null;
};

function projectDeveloperOrganisation(row: DeveloperOrganisationRow) {
  const { organisation, publisher } = row;
  return {
    ...organisation,
    id: organisation.id,
    userId: row.userId,
    name: organisation.name,
    description: organisation.description,
    logo: publisher.logoUrl ?? organisation.logo,
    website: publisher.websiteUrl ?? organisation.website,
    email: publisher.publicContactEmail ?? organisation.email,
    phone: organisation.phone,
    address: organisation.address,
    city: organisation.city,
    province: organisation.province,
    category: organisation.category,
    establishedYear: organisation.establishedYear,
    specializations: organisation.specializations,
    isVerified: organisation.isVerified,
    isTrusted: organisation.isTrusted,
    status: organisation.status,
    cataloguePublisherId: publisher.id,
    publisherId: publisher.id,
    organisationId: organisation.id,
    publisher,
  };
}

async function getDeveloperOrganisationRow(id: number): Promise<DeveloperOrganisationRow | null> {
  const database = await getDb();
  if (!database) return null;
  const rows = await database
    .select({
      organisation: developerOrganisations,
      publisher: cataloguePublishers,
      userId: developerOrganisationMemberships.userId,
    })
    .from(developerOrganisations)
    .innerJoin(
      cataloguePublishers,
      and(
        eq(cataloguePublishers.developerOrganisationId, developerOrganisations.id),
        eq(cataloguePublishers.authorityKind, 'developer_first_party'),
      ),
    )
    .leftJoin(
      developerOrganisationMemberships,
      and(
        eq(developerOrganisationMemberships.organisationId, developerOrganisations.id),
        eq(developerOrganisationMemberships.role, 'owner'),
        eq(developerOrganisationMemberships.status, 'active'),
      ),
    )
    .where(eq(developerOrganisations.id, id))
    .limit(1);
  return rows[0] ?? null;
}

async function listDeveloperOrganisationRows(
  status?: 'pending' | 'approved' | 'rejected',
  filters?: {
    category?: string;
    city?: string;
    province?: string;
    isVerified?: number;
    limit?: number;
    offset?: number;
  },
) {
  const database = await getDb();
  if (!database) return [];
  const conditions: SQL[] = [eq(cataloguePublishers.authorityKind, 'developer_first_party')];
  if (status) conditions.push(eq(developerOrganisations.status, status));
  if (filters?.category)
    conditions.push(eq(developerOrganisations.category, filters.category as any));
  if (filters?.city) conditions.push(like(developerOrganisations.city, `%${filters.city}%`));
  if (filters?.province)
    conditions.push(like(developerOrganisations.province, `%${filters.province}%`));
  if (filters?.isVerified !== undefined) {
    conditions.push(eq(developerOrganisations.isVerified, filters.isVerified));
  }

  let query = database
    .select({
      organisation: developerOrganisations,
      publisher: cataloguePublishers,
      userId: developerOrganisationMemberships.userId,
    })
    .from(developerOrganisations)
    .innerJoin(
      cataloguePublishers,
      and(
        eq(cataloguePublishers.developerOrganisationId, developerOrganisations.id),
        eq(cataloguePublishers.authorityKind, 'developer_first_party'),
      ),
    )
    .leftJoin(
      developerOrganisationMemberships,
      and(
        eq(developerOrganisationMemberships.organisationId, developerOrganisations.id),
        eq(developerOrganisationMemberships.role, 'owner'),
        eq(developerOrganisationMemberships.status, 'active'),
      ),
    )
    .where(and(...conditions))
    .orderBy(desc(developerOrganisations.createdAt));
  if (filters?.limit) query = query.limit(filters.limit) as any;
  if (filters?.offset) query = query.offset(filters.offset) as any;
  const rows = await query;
  return rows.map(projectDeveloperOrganisation);
}

export async function createDeveloper(data: {
  name: string;
  description?: string;
  logo?: string | null;
  website?: string | null;
  email: string;
  phone?: string | null;
  address?: string | null;
  city: string;
  province: string;
  category?: 'residential' | 'commercial' | 'mixed_use' | 'industrial';
  specializations?: string[];
  establishedYear?: number | null;
  userId: number;
  status?: 'pending' | 'approved' | 'rejected';
  isVerified?: number;
}) {
  const identity = await developerIdentityService.createDeveloperOrganisation({
    name: data.name,
    description: data.description ?? null,
    logo: data.logo ?? null,
    website: data.website ?? null,
    email: data.email,
    phone: data.phone ?? null,
    address: data.address ?? null,
    city: data.city,
    province: data.province,
    category: data.category ?? 'residential',
    specializations: data.specializations ?? [],
    establishedYear: data.establishedYear ?? null,
    createdByUserId: data.userId,
  });
  return identity.organisationId;
}

export async function getDeveloperByUserId(userId: number) {
  return developerIdentityService.getDeveloperByUserId(userId);
}

export async function getDeveloperById(id: number) {
  const row = await getDeveloperOrganisationRow(id);
  return row ? projectDeveloperOrganisation(row) : null;
}

export async function updateDeveloper(
  id: number,
  data: Partial<{
    name: string;
    description: string;
    logo: string | null;
    website: string | null;
    email: string;
    phone: string | null;
    address: string | null;
    city: string;
    province: string;
    specializations: string[];
    establishedYear: number | null;
  }>,
) {
  const database = await getDb();
  if (!database) throw new Error('Database not available');
  const row = await getDeveloperOrganisationRow(id);
  if (!row) return false;

  const organisationValues: Record<string, unknown> = {};
  for (const key of [
    'name',
    'description',
    'website',
    'email',
    'phone',
    'address',
    'city',
    'province',
    'establishedYear',
  ] as const) {
    if (data[key] !== undefined) organisationValues[key] = data[key];
  }
  if (data.logo !== undefined) organisationValues.logo = data.logo;
  if (data.specializations !== undefined) organisationValues.specializations = data.specializations;
  if (Object.keys(organisationValues).length) {
    await database
      .update(developerOrganisations)
      .set(organisationValues as any)
      .where(eq(developerOrganisations.id, id));
  }

  const publisherValues: Record<string, unknown> = {};
  if (data.name !== undefined) publisherValues.name = data.name;
  if (data.logo !== undefined) publisherValues.logoUrl = data.logo;
  if (data.description !== undefined) publisherValues.about = data.description;
  if (data.website !== undefined) publisherValues.websiteUrl = data.website;
  if (data.email !== undefined) publisherValues.publicContactEmail = data.email;
  if (Object.keys(publisherValues).length) {
    await database
      .update(cataloguePublishers)
      .set(publisherValues as any)
      .where(eq(cataloguePublishers.id, row.publisher.id));
  }
  return true;
}

export async function listDevelopers(filters: {
  category?: string;
  city?: string;
  province?: string;
  isVerified?: number;
  limit?: number;
  offset?: number;
}) {
  return listDeveloperOrganisationRows('approved', filters);
}

export async function listPendingDevelopers() {
  return listDeveloperOrganisationRows('pending');
}

export async function listAllDevelopers() {
  return listDeveloperOrganisationRows();
}

export async function approveDeveloper(id: number, approvedBy: number) {
  const database = await getDb();
  if (!database) throw new Error('Database not available');
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await database.transaction(async (tx: any) => {
    await tx
      .update(developerOrganisations)
      .set({ isVerified: 1, status: 'approved', approvedBy, approvedAt: now })
      .where(eq(developerOrganisations.id, id));
    const [row] = await tx
      .select({ publisherId: cataloguePublishers.id })
      .from(cataloguePublishers)
      .where(
        and(
          eq(cataloguePublishers.developerOrganisationId, id),
          eq(cataloguePublishers.authorityKind, 'developer_first_party'),
        ),
      )
      .limit(1);
    if (row) {
      await tx
        .update(cataloguePublishers)
        .set({ isVisible: 1, isContactVerified: 1 })
        .where(eq(cataloguePublishers.id, row.publisherId));
    }
  });
  return true;
}

export async function rejectDeveloper(id: number, rejectedBy: number, reason: string) {
  const database = await getDb();
  if (!database) throw new Error('Database not available');
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await database.transaction(async (tx: any) => {
    await tx
      .update(developerOrganisations)
      .set({ status: 'rejected', rejectionReason: reason, rejectedBy, rejectedAt: now })
      .where(eq(developerOrganisations.id, id));
    const [row] = await tx
      .select({ publisherId: cataloguePublishers.id })
      .from(cataloguePublishers)
      .where(
        and(
          eq(cataloguePublishers.developerOrganisationId, id),
          eq(cataloguePublishers.authorityKind, 'developer_first_party'),
        ),
      )
      .limit(1);
    if (row) {
      await tx
        .update(cataloguePublishers)
        .set({ isVisible: 0 })
        .where(eq(cataloguePublishers.id, row.publisherId));
    }
  });
  return true;
}

export async function setDeveloperTrust(id: number, isTrusted: boolean) {
  const database = await getDb();
  if (!database) throw new Error('Database not available');
  await database
    .update(developerOrganisations)
    .set({ isTrusted: isTrusted ? 1 : 0 })
    .where(eq(developerOrganisations.id, id));
  return true;
}

// ==================== PARTNER NETWORK ====================

export async function listPartners({
  page = 1,
  limit = 50,
  search,
}: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const conditions: SQL[] = [];

  if (search) {
    conditions.push(
      or(like(partners.companyName, `%${search}%`), like(partners.contactEmail, `%${search}%`))!,
    );
  }

  const offset = (page - 1) * limit;

  const [partnersList, countResult] = await Promise.all([
    db
      .select()
      .from(partners)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(partners.createdAt)),
    db
      .select({ count: count() })
      .from(partners)
      .where(and(...conditions)),
  ]);

  const total = countResult[0]?.count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return {
    partners: partnersList,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export async function createPartner(data: typeof partners.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(partners).values(data);
  return result[0].insertId;
}

export async function updatePartner(id: number, data: Partial<typeof partners.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.update(partners).set(data).where(eq(partners.id, id));
  return { success: true };
}

export async function deletePartner(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.delete(partners).where(eq(partners.id, id));
  return { success: true };
}

// ==================== DASHBOARD HELPERS ====================

export async function countPendingAgents() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db
    .select({ count: count() })
    .from(agents)
    .where(eq(agents.status, 'pending'));
  return result[0]?.count ?? 0;
}

export async function countPendingListings() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db
    .select({ count: count() })
    .from(listings)
    .where(eq(listings.status, 'pending_review'));
  return result[0]?.count ?? 0;
}

export async function countPendingDevelopments() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Use developmentApprovalQueue or direct status check depending on architecture
  // Based on adminRouter imports, developmentApprovalQueue exists
  // For now, let's count simple 'pending' status on developments table directly for speed
  const result = await db
    .select({ count: count() })
    .from(developments)
    .where(eq(developments.approvalStatus, 'pending'));

  return result[0]?.count ?? 0;
}

export async function getEcosystemStats() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateStr = thirtyDaysAgo.toISOString(); // Assuming string storage for dates based on other code

  const [totalAgencies, activeAgencies, newAgencies] = await Promise.all([
    db.select({ count: count() }).from(agencies),
    db.select({ count: count() }).from(agencies).where(eq(agencies.isVerified, 1)),
    db
      .select({ count: count() })
      .from(agencies)
      .where(sql`${agencies.createdAt} > ${dateStr}`),
  ]);

  const [totalAgents, activeAgents, newAgents] = await Promise.all([
    db.select({ count: count() }).from(agents),
    db.select({ count: count() }).from(agents).where(eq(agents.status, 'approved')),
    db
      .select({ count: count() })
      .from(agents)
      .where(sql`${agents.createdAt} > ${dateStr}`),
  ]);

  const firstPartyPublisher = eq(cataloguePublishers.authorityKind, 'developer_first_party');
  const [totalDevelopers, activeDevelopers, newDevelopers] = await Promise.all([
    db.select({ count: count() }).from(cataloguePublishers).where(firstPartyPublisher),
    db
      .select({ count: count() })
      .from(cataloguePublishers)
      .innerJoin(
        developerOrganisations,
        eq(cataloguePublishers.developerOrganisationId, developerOrganisations.id),
      )
      .where(and(firstPartyPublisher, eq(developerOrganisations.status, 'approved'))),
    db
      .select({ count: count() })
      .from(cataloguePublishers)
      .where(and(firstPartyPublisher, sql`${cataloguePublishers.createdAt} > ${dateStr}`)),
  ]);

  const [totalUsers, newUsers] = await Promise.all([
    db.select({ count: count() }).from(users).where(eq(users.role, 'visitor')), // Assuming 'visitor' is end user
    db
      .select({ count: count() })
      .from(users)
      .where(and(eq(users.role, 'visitor'), sql`${users.createdAt} > ${dateStr}`)),
  ]);

  return {
    agencies: {
      total: totalAgencies[0]?.count ?? 0,
      active: activeAgencies[0]?.count ?? 0,
      growth: newAgencies[0]?.count ?? 0,
    },
    agents: {
      total: totalAgents[0]?.count ?? 0,
      active: activeAgents[0]?.count ?? 0,
      growth: newAgents[0]?.count ?? 0,
    },
    developers: {
      total: totalDevelopers[0]?.count ?? 0,
      active: activeDevelopers[0]?.count ?? 0,
      growth: newDevelopers[0]?.count ?? 0,
    },
    users: {
      total: totalUsers[0]?.count ?? 0,
      active: totalUsers[0]?.count ?? 0, // Users generally considered active if they exist for now
      growth: newUsers[0]?.count ?? 0,
    },
  };
}
