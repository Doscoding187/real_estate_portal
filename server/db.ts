import {
  eq,
  desc,
  and,
  like,
  gte,
  lte,
  inArray,
  or,
  sql,
  SQL,
  isNull,
  isNotNull,
  not,
  ne,
  count,
  avg,
  min,
  max,
  sum,
  aliasedTable,
  getTableColumns,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import {
  users,
  properties,
  propertyImages,
  favorites,
  savedSearches,
  agents,
  agencies,
  leads,
  listings,
  listingMedia,
  listingAnalytics,
  listingApprovalQueue,
  listingLeads,
  listingViewings,
  prospects,
  prospectFavorites,
  scheduledViewings,
  recentlyViewed,
  developers,
} from '../drizzle/schema';
import { ENV } from './_core/env';
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';

export type User = InferSelectModel<typeof users>;
export type InsertUser = InferInsertModel<typeof users>;
export type Property = InferSelectModel<typeof properties>;
export type InsertProperty = InferInsertModel<typeof properties>;
export type InsertPropertyImage = InferInsertModel<typeof propertyImages>;
export type Prospect = InferSelectModel<typeof prospects>;

let _db: any = null;

/* Debug database connection (single log) */
console.log('[Database] Checking DATABASE_URL:', process.env.DATABASE_URL ? 'present' : 'missing');
if (process.env.DATABASE_URL) {
  console.log(
    '[Database] DATABASE_URL (masked):',
    process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@'),
  );
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // TiDB Cloud requires SSL for secure connections
      // Parse the DATABASE_URL and add explicit SSL configuration
      const isProduction = process.env.NODE_ENV === 'production';
      const poolConnection = mysql.createPool({
        uri: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: isProduction, // Use true for production with valid certificates
        },
      });
      _db = drizzle(poolConnection);
      console.log(
        '[Database] Connected to MySQL with SSL:',
        process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@'),
      );
    } catch (error) {
      console.error('[Database] Failed to connect:', error);
      _db = null;
    }
  }
  return _db;
}

// Export a synchronous db object that throws if not initialized
// This is for backwards compatibility with existing code
export const db = new Proxy({} as any, {
  get(_target, prop) {
    if (!_db) {
      throw new Error('Database not initialized. Call getDb() first or use await getDb() in async functions.');
    }
    return _db[prop];
  }
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
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerId) {
      values.role = 'super_admin'; // Owner gets super_admin role
      updateSet.role = 'super_admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
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

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
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

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
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
    lastSignedIn: new Date(),
  });

  return Number(result[0].insertId);
}

/**
 * Update user's last sign-in timestamp
 */
export async function updateUserLastSignIn(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
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

// Property queries
export async function createProperty(property: InsertProperty) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(properties).values(property);
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

  await db
    .update(properties)
    .set({
      ...updates,
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
        gte(sql`CAST(${properties.latitude} AS DECIMAL)`, params.minLat),
        lte(sql`CAST(${properties.latitude} AS DECIMAL)`, params.maxLat),
        gte(sql`CAST(${properties.longitude} AS DECIMAL)`, params.minLng),
        lte(sql`CAST(${properties.longitude} AS DECIMAL)`, params.maxLng),
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
    const roleConditions = [];
    if (params.postedBy.includes('Owner')) {
      roleConditions.push(eq(users.role, 'visitor'));
    }
    if (params.postedBy.includes('Dealer') || params.postedBy.includes('Agent')) {
      roleConditions.push(or(eq(users.role, 'agent'), eq(users.role, 'agency_admin')));
    }
    if (params.postedBy.includes('Builder') || params.postedBy.includes('Developer')) {
      roleConditions.push(eq(users.role, 'property_developer'));
    }

    if (roleConditions.length > 0) {
      conditions.push(
        inArray(
          properties.ownerId,
          db.select({ id: users.id }).from(users).where(or(...roleConditions)),
        ),
      );
    }
  }

  // Bounds filter
  if (params.minLat !== undefined && params.maxLat !== undefined) {
    conditions.push(
      sql`CAST(${properties.latitude} AS DECIMAL(10, 6)) >= ${params.minLat} AND CAST(${properties.latitude} AS DECIMAL(10, 6)) <= ${params.maxLat}`
    );
  }
  if (params.minLng !== undefined && params.maxLng !== undefined) {
    conditions.push(
      sql`CAST(${properties.longitude} AS DECIMAL(10, 6)) >= ${params.minLng} AND CAST(${properties.longitude} AS DECIMAL(10, 6)) <= ${params.maxLng}`
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
      const filteredResults = results.filter(
        (prop: any) => !boostedIds.includes(prop.id)
      );

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

  return await db.select().from(require('../drizzle/schema').agents);
}

export async function getAgentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(require('../drizzle/schema').agents)
    .where(eq(require('../drizzle/schema').agents.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getFeaturedAgents(limit: number = 6) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(require('../drizzle/schema').agents)
    .where(eq(require('../drizzle/schema').agents.isFeatured, 1))
    .limit(limit);
}

// ==================== DEVELOPMENTS ====================

export async function getAllDevelopments() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(require('../drizzle/schema').developments);
}

export async function getDevelopmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(require('../drizzle/schema').developments)
    .where(eq(require('../drizzle/schema').developments.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getFeaturedDevelopments(limit: number = 6) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(require('../drizzle/schema').developments)
    .where(eq(require('../drizzle/schema').developments.isFeatured, 1))
    .limit(limit);
}

export async function getDevelopmentProperties(developmentId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(properties).where(eq(properties.developmentId, developmentId));
}

// ==================== SERVICES ====================

export async function getAllServices() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(require('../drizzle/schema').services);
}

export async function getServicesByCategory(category: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(require('../drizzle/schema').services)
    .where(eq(require('../drizzle/schema').services.category, category as any));
}

// ==================== REVIEWS ====================

export async function getReviewsByTarget(reviewType: string, targetId: number) {
  const db = await getDb();
  if (!db) return [];

  const { reviews } = require('../drizzle/schema');
  return await db
    .select()
    .from(reviews)
    .where(
      and(
        eq(reviews.reviewType, reviewType as any),
        eq(reviews.targetId, targetId),
        eq(reviews.isPublished, 1),
      ),
    );
}

export async function createReview(reviewData: any) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const { reviews } = require('../drizzle/schema');
  const result = await db.insert(reviews).values(reviewData);
  return result[0].insertId;
}

// ==================== LEADS ====================

export async function createLead(leadData: any) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const { leads } = require('../drizzle/schema');
  const result = await db.insert(leads).values(leadData);
  return result[0].insertId;
}

export async function getLeadsByAgent(agentId: number) {
  const db = await getDb();
  if (!db) return [];

  const { leads } = require('../drizzle/schema');
  return await db.select().from(leads).where(eq(leads.agentId, agentId));
}

// ==================== EXPLORE VIDEOS ====================

export async function getAllExploreVideos(limit: number = 20) {
  const db = await getDb();
  if (!db) return [];

  const { exploreVideos } = require('../drizzle/schema');
  return await db.select().from(exploreVideos).where(eq(exploreVideos.isPublished, 1)).limit(limit);
}

export async function getExploreVideoById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const { exploreVideos } = require('../drizzle/schema');
  const result = await db.select().from(exploreVideos).where(eq(exploreVideos.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function incrementVideoViews(id: number) {
  const db = await getDb();
  if (!db) return;

  const { exploreVideos } = require('../drizzle/schema');
  await db
    .update(exploreVideos)
    .set({ views: require('drizzle-orm').sql`views + 1` })
    .where(eq(exploreVideos.id, id));
}

// ==================== LOCATIONS ====================

export async function getAllLocations() {
  const db = await getDb();
  if (!db) return [];

  const { locations } = require('../drizzle/schema');
  return await db.select().from(locations);
}

export async function getLocationsByType(type: string) {
  const db = await getDb();
  if (!db) return [];

  const { locations } = require('../drizzle/schema');
  return await db
    .select()
    .from(locations)
    .where(eq(locations.locationType, type as any));
}

// ==================== AGENCY DASHBOARD ANALYTICS ====================

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

  const { properties, leads, users, agents } = require('../drizzle/schema');

  // Get all properties owned by agency agents
  const agencyProperties = await db
    .select()
    .from(properties)
    .where(
      sql`EXISTS (SELECT 1 FROM agents WHERE agents.id = properties.agentId AND agents.agencyId = ${agencyId})`,
    );

  // Get all leads for agency properties
  const agencyLeads = await db.select().from(leads).where(eq(leads.agencyId, agencyId));

  // Get agency agents count
  const agencyAgents = await db
    .select()
    .from(users)
    .where(and(eq(users.agencyId, agencyId), eq(users.isSubaccount, 1)));

  // Calculate stats
  const totalListings = agencyProperties.length;
  const activeListings = agencyProperties.filter((p: any) => p.status === 'available').length;
  const pendingListings = agencyProperties.filter((p: any) => p.status === 'pending').length;
  const totalSales = agencyProperties.filter((p: any) => p.status === 'sold').length;
  const totalLeads = agencyLeads.length;
  const totalAgents = agencyAgents.length;

  // Recent activity (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentLeads = agencyLeads.filter(
    (lead: any) => new Date(lead.createdAt) > thirtyDaysAgo,
  ).length;
  const recentSales = agencyProperties.filter(
    (p: any) => p.status === 'sold' && new Date(p.updatedAt) > thirtyDaysAgo,
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

  await db
    .update(prospects)
    .set({
      ...updates,
      lastActivity: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(prospects.sessionId, sessionId));

  return { success: true };
}

export async function getProspect(sessionId: string): Promise<Prospect | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(prospects)
    .where(eq(prospects.sessionId, sessionId))
    .limit(1);
  return result[0];
}

export async function addProspectFavorite(sessionId: string, propertyId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Get prospect ID from sessionId
  const prospect = await getProspect(sessionId);
  if (!prospect) throw new Error('Prospect not found');

  await db.insert(prospectFavorites).values({ prospectId: prospect.id, propertyId });
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
        eq(prospectFavorites.propertyId, propertyId),
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
        propertyId: prospectFavorites.propertyId,
        property: properties,
        createdAt: prospectFavorites.createdAt,
      })
      .from(prospectFavorites)
      .innerJoin(properties, eq(prospectFavorites.propertyId, properties.id))
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

  try {
    // Get prospect ID from sessionId
    const prospect = await getProspect(sessionId);
    if (!prospect) {
      console.log('[getScheduledViewings] No prospect found for sessionId:', sessionId);
      return [];
    }

    const results = await db
      .select({
        id: scheduledViewings.id,
        propertyId: scheduledViewings.propertyId,
        property: properties,
        agentId: scheduledViewings.agentId,
        agent: agents,
        scheduledAt: scheduledViewings.scheduledAt,
        status: scheduledViewings.status,
        notes: scheduledViewings.notes,
        createdAt: scheduledViewings.createdAt,
      })
      .from(scheduledViewings)
      .innerJoin(properties, eq(scheduledViewings.propertyId, properties.id))
      .leftJoin(agents, eq(scheduledViewings.agentId, agents.id))
      .where(eq(scheduledViewings.prospectId, prospect.id))
      .orderBy(scheduledViewings.scheduledAt);

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

  // Get prospect ID from sessionId
  const prospect = await getProspect(sessionId);
  if (!prospect) throw new Error('Prospect not found');

  // First check if this property was recently viewed by this prospect
  const existing = await db
    .select()
    .from(recentlyViewed)
    .where(
      and(eq(recentlyViewed.prospectId, prospect.id), eq(recentlyViewed.propertyId, propertyId)),
    )
    .limit(1);

  if (existing.length > 0) {
    // Update the viewedAt timestamp
    await db
      .update(recentlyViewed)
      .set({
        viewedAt: new Date(),
      })
      .where(
        and(eq(recentlyViewed.prospectId, prospect.id), eq(recentlyViewed.propertyId, propertyId)),
      );
  } else {
    // Insert new record
    await db.insert(recentlyViewed).values({
      prospectId: prospect.id,
      propertyId,
      viewedAt: new Date(),
    });
  }

  return { success: true };
}

export async function getRecentlyViewed(sessionId: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    // First get the prospect by sessionId
    const prospect = await getProspect(sessionId);
    if (!prospect) {
      console.log('[getRecentlyViewed] No prospect found for sessionId:', sessionId);
      return [];
    }

    const results = await db
      .select({
        id: recentlyViewed.id,
        propertyId: recentlyViewed.propertyId,
        property: properties,
        viewedAt: recentlyViewed.viewedAt,
      })
      .from(recentlyViewed)
      .innerJoin(properties, eq(recentlyViewed.propertyId, properties.id))
      .where(eq(recentlyViewed.prospectId, prospect.id))
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

  const updateData: any = {
    profileProgress: progress,
    lastActivity: new Date(),
    updatedAt: new Date(),
  };

  if (badges) {
    updateData.badges = JSON.stringify(badges);
  }

  await db.update(prospects).set(updateData).where(eq(prospects.sessionId, sessionId));
  return { success: true };
}

export async function earnBadge(sessionId: string, badge: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const prospect = await getProspect(sessionId);
  if (!prospect) throw new Error('Prospect not found');

  const currentBadges = prospect.badges ? JSON.parse(prospect.badges) : [];
  if (!currentBadges.includes(badge)) {
    currentBadges.push(badge);
    await db
      .update(prospects)
      .set({
        badges: JSON.stringify(currentBadges),
        lastActivity: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(prospects.sessionId, sessionId));
  }

  return { success: true, badges: currentBadges };
}

export async function getRecommendedProperties(prospect: Prospect, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  if (!prospect.affordabilityMax) return [];

  // Build query conditions based on prospect preferences and affordability
  let conditions = [
    eq(properties.status, 'available' as any),
    lte(properties.price, prospect.affordabilityMax),
  ];

  if (prospect.affordabilityMin) {
    conditions.push(gte(properties.price, prospect.affordabilityMin));
  }

  if (prospect.preferredPropertyType) {
    conditions.push(eq(properties.propertyType, prospect.preferredPropertyType as any));
  }

  if (prospect.preferredLocation) {
    conditions.push(like(properties.city, `%${prospect.preferredLocation}%`));
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

  const { properties, leads } = require('../drizzle/schema');

  const currentDate = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 0);

    // Properties listed this month
    const monthProperties = await db
      .select()
      .from(properties)
      .where(
        and(
          sql`EXISTS (SELECT 1 FROM agents WHERE agents.id = properties.agentId AND agents.agencyId = ${agencyId})`,
          sql`${properties.createdAt} >= ${monthStart}`,
          sql`${properties.createdAt} <= ${monthEnd}`,
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
    const monthSales = monthProperties.filter((p: any) => p.status === 'sold').length;

    performanceData.push({
      month: monthStart.toLocaleString('default', { month: 'short', year: '2-digit' }),
      listings: monthProperties.length,
      leads: monthLeads.length,
      sales: monthSales,
    });
  }

  return performanceData;
}

export async function getAgencyRecentLeads(agencyId: number, limit: number = 5) {
  const db = await getDb();
  if (!db) return [];

  const { leads } = require('../drizzle/schema');

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

  const { properties } = require('../drizzle/schema');

  return await db
    .select({
      id: properties.id,
      title: properties.title,
      price: properties.price,
      status: properties.status as any,
      city: properties.city,
      createdAt: properties.createdAt,
      ownerId: properties.ownerId,
    })
    .from(properties)
    .where(
      sql`EXISTS (SELECT 1 FROM agents WHERE agents.id = properties.agentId AND agents.agencyId = ${agencyId})`,
    )
    .orderBy(desc(properties.createdAt))
    .limit(limit);
}

export async function getAgencyAgents(agencyId: number) {
  const db = await getDb();
  if (!db) return [];

  const { users, agents } = require('../drizzle/schema');

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

  const { leads } = require('../drizzle/schema');

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

  const { commissions, agents } = require('../drizzle/schema');

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
  const monthlyBreakdown = [];
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

  const { commissions, agents, leads, properties } = require('../drizzle/schema');

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

  const result = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, key))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function setPlatformSetting(key: string, value: any, updatedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const settingData = {
    key,
    value: JSON.stringify(value),
    updatedBy,
    updatedAt: new Date(),
  };

  await db.insert(platformSettings).values(settingData).onDuplicateKeyUpdate({
    set: settingData,
  });
}

export async function getAllPlatformSettings() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(platformSettings)
    .orderBy(platformSettings.category, platformSettings.key);
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

  // Get counts in a single query
  const [counts] = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM ${users}) as userCount,
      (SELECT COUNT(*) FROM ${agencies}) as agencyCount,
      (SELECT COUNT(*) FROM ${properties}) as propertyCount,
      (SELECT COUNT(*) FROM ${properties} WHERE ${properties.status} = 'available') as activePropertyCount,
      (SELECT COUNT(*) FROM ${agents}) as agentCount,
      (SELECT COUNT(*) FROM ${agencies} WHERE ${agencies.subscriptionPlan} != 'free') as paidSubsCount
  `);

  // Monthly revenue (from commissions) - assume last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Growth metrics
  const [growth] = await db.execute(sql`
    SELECT
      (SELECT SUM(${commissions.amount}) FROM ${commissions} WHERE ${commissions.createdAt} >= ${thirtyDaysAgo}) as monthlyRevenue,
      (SELECT COUNT(*) FROM ${users} WHERE ${users.createdAt} >= ${thirtyDaysAgo}) as userGrowth,
      (SELECT COUNT(*) FROM ${properties} WHERE ${properties.createdAt} >= ${thirtyDaysAgo}) as propertyGrowth
  `);

  const countsRow = (counts as any)[0];
  const growthRow = (growth as any)[0];

  return {
    totalUsers: Number(countsRow.userCount || 0),
    totalAgencies: Number(countsRow.agencyCount || 0),
    totalProperties: Number(countsRow.propertyCount || 0),
    activeProperties: Number(countsRow.activePropertyCount || 0),
    totalAgents: Number(countsRow.agentCount || 0),
    paidSubscriptions: Number(countsRow.paidSubsCount || 0),
    monthlyRevenue: Number(growthRow.monthlyRevenue || 0) / 100, // Convert cents to currency units
    userGrowth: Number(growthRow.userGrowth || 0),
    propertyGrowth: Number(growthRow.propertyGrowth || 0),
  };
}

export async function getListingStats() {
  const db = await getDb();
  if (!db) return { pending: 0, approved: 0, rejected: 0, total: 0 };

  const { properties } = require('../drizzle/schema');

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

  const { agencies } = require('../drizzle/schema');

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
export async function createListing(listingData: any) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  try {
    // Use Drizzle transaction API
    const listingId = await db.transaction(async (tx) => {
      // Create listing record
      // Convert latitude and longitude to strings to match schema
        // Look up agent ID
        const { agents } = require('../drizzle/schema');
        const [agent] = await tx.select().from(agents).where(eq(agents.userId, listingData.userId)).limit(1);
        const agentId = agent ? agent.id : null;

        const [listingResult] = await tx.insert(listings).values({
          ownerId: listingData.userId,
          agentId: agentId,
          action: listingData.action,
          propertyType: listingData.propertyType,
          title: listingData.title,
          description: listingData.description,
          
          // Map pricing fields
          askingPrice: listingData.pricing.askingPrice ? String(listingData.pricing.askingPrice) : null,
          negotiable: listingData.pricing.negotiable ? 1 : 0,
          transferCostEstimate: listingData.pricing.transferCostEstimate ? String(listingData.pricing.transferCostEstimate) : null,
          monthlyRent: listingData.pricing.monthlyRent ? String(listingData.pricing.monthlyRent) : null,
          deposit: listingData.pricing.deposit ? String(listingData.pricing.deposit) : null,
          leaseTerms: listingData.pricing.leaseTerms,
          availableFrom: listingData.pricing.availableFrom ? new Date(listingData.pricing.availableFrom).toISOString().slice(0, 19).replace('T', ' ') : null,
          utilitiesIncluded: listingData.pricing.utilitiesIncluded ? 1 : 0,
          startingBid: listingData.pricing.startingBid ? String(listingData.pricing.startingBid) : null,
          reservePrice: listingData.pricing.reservePrice ? String(listingData.pricing.reservePrice) : null,
          auctionDateTime: listingData.pricing.auctionDateTime ? new Date(listingData.pricing.auctionDateTime).toISOString().slice(0, 19).replace('T', ' ') : null,
          auctionTermsDocumentUrl: listingData.pricing.auctionTermsDocumentUrl,

          propertyDetails: listingData.propertyDetails, // Pass object directly for JSON column
          address: listingData.address,
          latitude: String(listingData.latitude),
          longitude: String(listingData.longitude),
          city: listingData.city,
          suburb: listingData.suburb,
          province: listingData.province,
          postalCode: listingData.postalCode,
          placeId: listingData.placeId,
          slug: listingData.slug,
          status: 'draft',
          approvalStatus: 'pending',
          createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
          updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        });

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
            isPrimary: mediaItem.isPrimary ? 1 : 0,
            processingStatus: mediaItem.processingStatus,
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            uploadedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
          });
        }
      }

      return newListingId;
    });

    return listingId;
  } catch (error) {
    console.error('[Database] Failed to create listing:', error);
    console.error('[Database] Error details:', error.message);
    throw error;
  }
}

/**
 * Get listing by ID
 */
export async function getListingById(listingId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [listing] = await db.select().from(listings).where(eq(listings.id, listingId)).limit(1);

  if (!listing) return null;

  if (!listing) return null;

  // Construct pricing object from individual columns
  const pricing = {
    askingPrice: listing.askingPrice ? Number(listing.askingPrice) : undefined,
    negotiable: listing.negotiable === 1,
    transferCostEstimate: listing.transferCostEstimate ? Number(listing.transferCostEstimate) : undefined,
    monthlyRent: listing.monthlyRent ? Number(listing.monthlyRent) : undefined,
    deposit: listing.deposit ? Number(listing.deposit) : undefined,
    leaseTerms: listing.leaseTerms,
    availableFrom: listing.availableFrom ? new Date(listing.availableFrom) : undefined,
    utilitiesIncluded: listing.utilitiesIncluded === 1,
    startingBid: listing.startingBid ? Number(listing.startingBid) : undefined,
    reservePrice: listing.reservePrice ? Number(listing.reservePrice) : undefined,
    auctionDateTime: listing.auctionDateTime ? new Date(listing.auctionDateTime) : undefined,
    auctionTermsDocumentUrl: listing.auctionTermsDocumentUrl,
  };

  // propertyDetails is already an object if using json() type in schema
  // but if it's null, we should handle it
  const propertyDetails = listing.propertyDetails || {};

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
  offset: number = 0
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const { listingMedia } = require('../drizzle/schema');

  let query = db.select().from(listings).where(eq(listings.ownerId, userId));

  if (status) {
    query = query.where(eq(listings.status, status as any));
  }

  const listingsData = await query
    .orderBy(desc(listings.createdAt))
    .limit(limit)
    .offset(offset);

  // Fetch primary images
  const listingsWithImages = await Promise.all(
    listingsData.map(async (listing) => {
      const images = await db
        .select()
        .from(listingMedia)
        .where(eq(listingMedia.listingId, listing.id))
        .orderBy(listingMedia.displayOrder)
        .limit(1);

      const cdnUrl = ENV.cloudFrontUrl || `https://${ENV.s3BucketName}.s3.${ENV.awsRegion}.amazonaws.com`;
      const primaryImage = images.length > 0 
        ? (images[0].originalUrl.startsWith('http') ? images[0].originalUrl : `${cdnUrl}/${images[0].originalUrl}`)
        : null;

      const pricing = {
        askingPrice: listing.askingPrice ? Number(listing.askingPrice) : undefined,
        negotiable: listing.negotiable === 1,
        transferCostEstimate: listing.transferCostEstimate ? Number(listing.transferCostEstimate) : undefined,
        monthlyRent: listing.monthlyRent ? Number(listing.monthlyRent) : undefined,
        deposit: listing.deposit ? Number(listing.deposit) : undefined,
        leaseTerms: listing.leaseTerms,
        availableFrom: listing.availableFrom ? new Date(listing.availableFrom) : undefined,
        utilitiesIncluded: listing.utilitiesIncluded === 1,
        startingBid: listing.startingBid ? Number(listing.startingBid) : undefined,
        reservePrice: listing.reservePrice ? Number(listing.reservePrice) : undefined,
        auctionDateTime: listing.auctionDateTime ? new Date(listing.auctionDateTime) : undefined,
        auctionTermsDocumentUrl: listing.auctionTermsDocumentUrl,
      };

      const propertyDetails = listing.propertyDetails || {};

      return {
        ...listing,
        userId: listing.ownerId,
        pricing,
        propertyDetails,
        primaryImage,
      };
    })
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

  // Map pricing fields if present
  if (updateData.pricing) {
    if (updateData.pricing.askingPrice !== undefined) updateFields.askingPrice = updateData.pricing.askingPrice ? String(updateData.pricing.askingPrice) : null;
    if (updateData.pricing.negotiable !== undefined) updateFields.negotiable = updateData.pricing.negotiable ? 1 : 0;
    if (updateData.pricing.transferCostEstimate !== undefined) updateFields.transferCostEstimate = updateData.pricing.transferCostEstimate ? String(updateData.pricing.transferCostEstimate) : null;
    if (updateData.pricing.monthlyRent !== undefined) updateFields.monthlyRent = updateData.pricing.monthlyRent ? String(updateData.pricing.monthlyRent) : null;
    if (updateData.pricing.deposit !== undefined) updateFields.deposit = updateData.pricing.deposit ? String(updateData.pricing.deposit) : null;
    if (updateData.pricing.leaseTerms !== undefined) updateFields.leaseTerms = updateData.pricing.leaseTerms;
    if (updateData.pricing.availableFrom !== undefined) updateFields.availableFrom = updateData.pricing.availableFrom ? new Date(updateData.pricing.availableFrom).toISOString().slice(0, 19).replace('T', ' ') : null;
    if (updateData.pricing.utilitiesIncluded !== undefined) updateFields.utilitiesIncluded = updateData.pricing.utilitiesIncluded ? 1 : 0;
    if (updateData.pricing.startingBid !== undefined) updateFields.startingBid = updateData.pricing.startingBid ? String(updateData.pricing.startingBid) : null;
    if (updateData.pricing.reservePrice !== undefined) updateFields.reservePrice = updateData.pricing.reservePrice ? String(updateData.pricing.reservePrice) : null;
    if (updateData.pricing.auctionDateTime !== undefined) updateFields.auctionDateTime = updateData.pricing.auctionDateTime ? new Date(updateData.pricing.auctionDateTime).toISOString().slice(0, 19).replace('T', ' ') : null;
    if (updateData.pricing.auctionTermsDocumentUrl !== undefined) updateFields.auctionTermsDocumentUrl = updateData.pricing.auctionTermsDocumentUrl;
    
    delete updateFields.pricing;
  }

  // propertyDetails is json() type, so pass object directly
  // No need to stringify

  await db.update(listings).set(updateFields).where(eq(listings.id, listingId));
}

/**
 * Submit listing for review
 */
export async function submitListingForReview(listingId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Update listing status
  await db
    .update(listings)
    .set({
      status: 'pending_review' as any,
      approvalStatus: 'pending' as any,
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    })
    .where(eq(listings.id, listingId));

  // Get listing to find owner
  const listing = await getListingById(listingId);
  if (!listing) throw new Error('Listing not found');

  // Add to approval queue
  await db.insert(listingApprovalQueue).values({
    listingId,
    submittedBy: listing.ownerId,
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
export async function getListingMedia(listingId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return await db
    .select()
    .from(listingMedia)
    .where(eq(listingMedia.listingId, listingId))
    .orderBy(listingMedia.displayOrder);
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

/**
 * Approve listing
 */
export async function approveListing(listingId: number, reviewedBy: number, notes?: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // 1. Get full listing data
  const listing = await getListingById(listingId);
  if (!listing) throw new Error('Listing not found');

  // 2. Prepare property data
  // Parse pricing JSON if it's a string
  let pricingData: any = {};
  if (listing.pricing) {
    try {
      pricingData = typeof listing.pricing === 'string' ? JSON.parse(listing.pricing) : listing.pricing;
    } catch (e) {
      console.error('Failed to parse pricing:', e);
    }
  }
  
  // Determine price based on listing type
  let price = 0;
  price = pricingData.askingPrice || pricingData.monthlyRent || pricingData.startingBid || 0;

  // Parse propertyDetails JSON if it's a string
  let details: any = {};
  if (listing.propertyDetails) {
    try {
      details = typeof listing.propertyDetails === 'string' ? JSON.parse(listing.propertyDetails) : listing.propertyDetails;
    } catch (e) {
      console.error('Failed to parse propertyDetails:', e);
    }
  }
  
  const bedrooms = Number(details.bedrooms) || 0;
  const bathrooms = Number(details.bathrooms) || 0;
  
  // Determine area (prioritize building size, not land size)
  const area = 
    Number(details.unitSizeM2) || 
    Number(details.houseAreaM2) || 
    Number(details.floorAreaM2) || 
    0;

  // Map amenities
  const amenitiesList = [
    ...(details.amenities || []),
    ...(details.amenitiesFeatures || []),
    ...(details.securityFeatures || []),
    ...(details.outdoorFeatures || [])
  ];
  const amenitiesString = amenitiesList.length > 0 ? amenitiesList.join(',') : null;

  // 3. Insert into properties table
  
  const [propertyResult] = await db.insert(properties).values({
    title: listing.title,
    description: listing.description,
    propertyType: listing.propertyType,
    listingType: listing.action === 'sell' ? 'sale' : listing.action === 'rent' ? 'rent' : 'auction', // Map 'sell' to 'sale'
    transactionType: listing.action === 'sell' ? 'sale' : listing.action === 'rent' ? 'rent' : 'auction',
    price: price,
    bedrooms: bedrooms,
    bathrooms: bathrooms,
    area: area,
    address: listing.address,
    city: listing.city,
    province: listing.province,
    zipCode: listing.postalCode,
    latitude: String(listing.latitude),
    longitude: String(listing.longitude),
    // IDs for relations (would need lookup logic for IDs, skipping for now or using defaults)
    locationText: `${listing.city}, ${listing.province}`,
    placeId: listing.placeId,
    amenities: amenitiesString,
    status: 'available' as any, // Make it live immediately
    featured: listing.featured || 0,
    views: 0,
    enquiries: 0,
    agentId: listing.agentId,
    ownerId: listing.ownerId,
    propertySettings: JSON.stringify(details),
    levies: Number(details.levies) || Number(details.leviesHoaOperatingCosts) || null,
    ratesAndTaxes: Number(details.ratesTaxes) || null,
    createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
  });

  const newPropertyId = Number(propertyResult.insertId);

  // 4. Sync Media
  const mediaItems = await getListingMedia(listingId);
  
  if (mediaItems && mediaItems.length > 0) {
    // Find main image to update property record
    const mainMedia = mediaItems.find(m => m.isPrimary && m.mediaType === 'image') || mediaItems.find(m => m.mediaType === 'image');
    
    if (mainMedia) {
      await db.update(properties)
        .set({ mainImage: mainMedia.processedUrl || mainMedia.originalUrl })
        .where(eq(properties.id, newPropertyId));
    }

    // Insert all images into propertyImages table
    for (const item of mediaItems) {
      if (item.mediaType === 'image') {
        await db.insert(propertyImages).values({
          propertyId: newPropertyId,
          imageUrl: item.processedUrl || item.originalUrl,
          isPrimary: item.isPrimary ? 1 : 0,
          displayOrder: item.displayOrder,
          createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        });
      }
      // Note: Videos are stored in properties.videoUrl or separate table depending on schema
      // For now we only sync images to propertyImages as per schema
    }
  }

  // 5. Update listing status
  await db
    .update(listings)
    .set({
      status: 'published' as any,
      approvalStatus: 'approved' as any,
      publishedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    })
    .where(eq(listings.id, listingId));

  // 6. Update approval queue
  await db
    .update(listingApprovalQueue)
    .set({
      status: 'approved' as any,
      reviewedBy,
      reviewedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      reviewNotes: notes,
    })
    .where(eq(listingApprovalQueue.listingId, listingId));
}

/**
 * Reject listing
 */
export async function rejectListing(listingId: number, reviewedBy: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Update listing status
  await db
    .update(listings)
    .set({
      status: 'rejected' as any,
      approvalStatus: 'rejected' as any,
      updatedAt: new Date(),
    })
    .where(eq(listings.id, listingId));

  // Update approval queue
  await db
    .update(listingApprovalQueue)
    .set({
      status: 'rejected' as any,
      reviewedBy,
      reviewedAt: new Date(),
      rejectionReason: reason,
    })
    .where(eq(listingApprovalQueue.listingId, listingId));
}


/**
 * Archive property (Soft Delete)
 */
export async function archiveProperty(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db
    .update(properties)
    .set({ status: 'archived' as any, updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') })
    .where(eq(properties.id, id));
}

/**
 * Delete listing (Hard Delete)
 */
export async function deleteListing(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Delete related media first to avoid foreign key constraint errors
  await db.delete(listingMedia).where(eq(listingMedia.listingId, id));
  
  // Delete from approval queue if exists
  await db.delete(listingApprovalQueue).where(eq(listingApprovalQueue.listingId, id));

  // Delete analytics
  await db.delete(listingAnalytics).where(eq(listingAnalytics.listingId, id));

  // Delete leads
  await db.delete(listingLeads).where(eq(listingLeads.listingId, id));

  // Delete viewings
  await db.delete(listingViewings).where(eq(listingViewings.listingId, id));
  
  // Now delete the listing
  await db.delete(listings).where(eq(listings.id, id));
}

/**
 * Archive listing (Soft Delete)
 */
export async function archiveListing(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db
    .update(listings)
    .set({ status: 'archived' as any, updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') })
    .where(eq(listings.id, id));
}

/**
 * Create agent profile
 */
export async function createAgentProfile(data: {
  userId: number;
  displayName: string;
  phoneNumber: string;
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
    phoneNumber: data.phoneNumber || data.displayName, // Use displayName as fallback
    bio: data.bio || null,
    profilePhoto: data.profilePhoto || null,
    licenseNumber: data.licenseNumber || null,
    specializations: data.specializations ? data.specializations.join(',') : null,
    firstName: data.displayName.split(' ')[0] || data.displayName,
    lastName: data.displayName.split(' ').slice(1).join(' ') || '',
    isVerified: 0,
    isFeatured: 0,
    status: 'pending' as any, // Default to pending for admin approval
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

  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.userId, userId))
    .limit(1);

  return agent || null;
}

// ==================== LISTINGS SEARCH (NEW) ====================

/**
 * Transform listing to property format for backward compatibility
 */
export function transformListingToProperty(listing: any, media: any[] = []) {
  const propertyDetails = listing.propertyDetails as any || {};
  
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    // Map price based on action type
    price: listing.askingPrice || listing.monthlyRent || listing.startingBid || 0,
    listingType: listing.action, // 'sell', 'rent', 'auction'
    propertyType: listing.propertyType,
    // Extract from propertyDetails JSON
    bedrooms: propertyDetails.bedrooms || 0,
    bathrooms: propertyDetails.bathrooms || 0,
    area: propertyDetails.erfSizeM2 || propertyDetails.unitSizeM2 || propertyDetails.landSizeM2OrHa || 0,
    amenities: propertyDetails.amenitiesFeatures || [],
    features: propertyDetails.amenitiesFeatures || [],
    // Location fields
    city: listing.city,
    province: listing.province,
    address: listing.streetAddress,
    zipCode: listing.postalCode,
    latitude: listing.latitude,
    longitude: listing.longitude,
    // Media
    images: media.map((m: any) => m.mediaUrl),
    // Metadata
    status: listing.status,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    userId: listing.userId,
    ownerId: listing.userId,
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

  // Only show approved/published listings
  conditions.push(eq(listings.status, 'approved' as any));

  // Location filters
  if (params.city) conditions.push(like(listings.city, `%${params.city}%`));
  if (params.province) conditions.push(like(listings.province, `%${params.province}%`));

  // Property type filter
  if (params.propertyType) conditions.push(eq(listings.propertyType, params.propertyType as any));

  // Listing type filter (map to action)
  if (params.listingType) {
    const actionMap: Record<string, string> = {
      'sale': 'sell',
      'rent': 'rent',
      'auction': 'auction',
      'rent_to_buy': 'rent',
      'shared_living': 'rent',
    };
    const action = actionMap[params.listingType] || params.listingType;
    conditions.push(eq(listings.action, action as any));
  }

  // Price filters - handle different price fields based on action
  if (params.minPrice || params.maxPrice) {
    const priceConditions: SQL[] = [];
    
    if (params.minPrice) {
      priceConditions.push(
        or(
          gte(listings.askingPrice, params.minPrice.toString()),
          gte(listings.monthlyRent, params.minPrice.toString()),
          gte(listings.startingBid, params.minPrice.toString())
        )!
      );
    }
    
    if (params.maxPrice) {
      priceConditions.push(
        or(
          lte(listings.askingPrice, params.maxPrice.toString()),
          lte(listings.monthlyRent, params.maxPrice.toString()),
          lte(listings.startingBid, params.maxPrice.toString())
        )!
      );
    }
    
    if (priceConditions.length > 0) {
      conditions.push(and(...priceConditions)!);
    }
  }

  // Geographic bounds filter
  if (params.minLat !== undefined && params.maxLat !== undefined) {
    conditions.push(
      sql`CAST(${listings.latitude} AS DECIMAL(10, 6)) >= ${params.minLat} AND CAST(${listings.latitude} AS DECIMAL(10, 6)) <= ${params.maxLat}`
    );
  }
  if (params.minLng !== undefined && params.maxLng !== undefined) {
    conditions.push(
      sql`CAST(${listings.longitude} AS DECIMAL(10, 6)) >= ${params.minLng} AND CAST(${listings.longitude} AS DECIMAL(10, 6)) <= ${params.maxLng}`
    );
  }

  // Build query
  let query = db.select().from(listings);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  query = query.orderBy(desc(listings.createdAt)) as any;

  if (params.limit) {
    query = query.limit(params.limit) as any;
  }
  if (params.offset) {
    query = query.offset(params.offset) as any;
  }

  const results = await query;

  // Fetch media for each listing
  const listingsWithMedia = await Promise.all(
    results.map(async (listing) => {
      const media = await db
        .select()
        .from(listingMedia)
        .where(eq(listingMedia.listingId, listing.id))
        .orderBy(listingMedia.displayOrder);
      
      return transformListingToProperty(listing, media);
    })
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
        p.amenities.some((a: string) => a.toLowerCase().includes(amenity.toLowerCase()))
      )
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
    .where(and(
      eq(listings.featured, 1),
      eq(listings.status, 'approved' as any)
    ))
    .orderBy(desc(listings.createdAt))
    .limit(limit);

  // Fetch media for each listing
  const listingsWithMedia = await Promise.all(
    results.map(async (listing) => {
      const media = await db
        .select()
        .from(listingMedia)
        .where(eq(listingMedia.listingId, listing.id))
        .orderBy(listingMedia.displayOrder);
      
      return transformListingToProperty(listing, media);
    })
  );

  return listingsWithMedia;
}

// ==================== DEVELOPER FUNCTIONS ====================

/**
 * Create developer profile
 */
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
  category?: 'residential' | 'commercial' | 'mixed_use' | 'industrial'; // Deprecated, use specializations
  specializations?: string[]; // Array of development types
  establishedYear?: number | null;
  totalProjects?: number;
  completedProjects?: number;
  currentProjects?: number;
  upcomingProjects?: number;
  userId: number;
  status?: 'pending' | 'approved' | 'rejected';
  isVerified?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Valid category values for the enum
  const validCategories = ['residential', 'commercial', 'mixed_use', 'industrial'];
  
  // Find first valid category from specializations, or use provided category, or default to residential
  const category = data.category || 
                   data.specializations?.find(s => validCategories.includes(s)) || 
                   'residential';

  const [result] = await db.insert(developers).values({
    ...data,
    // Convert specializations array to JSON string, or use category as fallback
    specializations: data.specializations ? JSON.stringify(data.specializations) : 
                     data.category ? JSON.stringify([data.category]) : null,
    category: category as 'residential' | 'commercial' | 'mixed_use' | 'industrial', // Keep for backward compatibility
    isVerified: data.isVerified ?? 0,
    status: data.status ?? 'pending',
    totalProjects: data.totalProjects ?? 0,
    completedProjects: data.completedProjects ?? 0,
    currentProjects: data.currentProjects ?? 0,
    upcomingProjects: data.upcomingProjects ?? 0,
    rating: 0,
    reviewCount: 0,
  });

  return result.insertId;
}

/**
 * Get developer by user ID
 */
export async function getDeveloperByUserId(userId: number) {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[Database] getDeveloperByUserId: Database not available');
      return null;
    }

    const [developer] = await db
      .select()
      .from(developers)
      .where(eq(developers.userId, userId))
      .limit(1);

    return developer || null;
  } catch (error: any) {
    console.error('[Database] Error in getDeveloperByUserId for userId:', userId, error);
    console.error('[Database] Error details:', {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
    });
    throw error; // Re-throw to be caught by the router
  }
}

/**
 * Get developer by ID
 */
export async function getDeveloperById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const [developer] = await db
    .select()
    .from(developers)
    .where(eq(developers.id, id))
    .limit(1);

  return developer || null;
}

/**
 * Update developer profile
 */
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
    specializations: string[]; // Array of development types
    establishedYear: number | null;
    totalProjects: number;
    completedProjects: number;
    currentProjects: number;
    upcomingProjects: number;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Prepare update data with JSON serialization for specializations
  const updateData: any = { ...data };
  if (data.specializations) {
    updateData.specializations = JSON.stringify(data.specializations);
    // Also update category for backward compatibility (use first specialization)
    updateData.category = data.specializations[0] || 'residential';
  }

  await db
    .update(developers)
    .set({
      ...updateData,
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    })
    .where(eq(developers.id, id));

  return true;
}

/**
 * List developers with filters
 */
export async function listDevelopers(filters: {
  category?: string;
  city?: string;
  province?: string;
  isVerified?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions: SQL[] = [eq(developers.status, 'approved')];

  if (filters.category) {
    conditions.push(eq(developers.category, filters.category as any));
  }
  if (filters.city) {
    conditions.push(like(developers.city, `%${filters.city}%`));
  }
  if (filters.province) {
    conditions.push(like(developers.province, `%${filters.province}%`));
  }
  if (typeof filters.isVerified !== 'undefined') {
    conditions.push(eq(developers.isVerified, filters.isVerified));
  }

  let query = db
    .select()
    .from(developers)
    .where(and(...conditions))
    .orderBy(desc(developers.createdAt));

  if (filters.limit) {
    query = query.limit(filters.limit) as any;
  }
  if (filters.offset) {
    query = query.offset(filters.offset) as any;
  }

  return await query;
}

/**
 * Admin: List pending developers
 */
export async function listPendingDevelopers() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(developers)
    .where(eq(developers.status, 'pending'))
    .orderBy(desc(developers.createdAt));
}

/**
 * Admin: Approve developer
 */
export async function approveDeveloper(id: number, approvedBy: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db
    .update(developers)
    .set({
      isVerified: 1,
      status: 'approved',
      approvedBy,
      approvedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    })
    .where(eq(developers.id, id));

  return true;
}

/**
 * Admin: Reject developer
 */
export async function rejectDeveloper(
  id: number,
  rejectedBy: number,
  reason: string
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db
    .update(developers)
    .set({
      status: 'rejected',
      rejectionReason: reason,
      rejectedBy,
      rejectedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    })
    .where(eq(developers.id, id));

  return true;
}
