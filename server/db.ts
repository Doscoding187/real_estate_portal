import { and, desc, eq, gte, inArray, like, lte, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import {
  favorites,
  InsertProperty,
  InsertPropertyImage,
  InsertUser,
  properties,
  propertyImages,
  users,
  platformSettings,
  prospects,
  prospectFavorites,
  scheduledViewings,
  recentlyViewed,
  agents,
  type User,
  type Property,
  type Prospect,
  type ProspectFavorite,
  type ScheduledViewing,
  type RecentlyViewed,
} from '../drizzle/schema';
import { ENV } from './_core/env';

let _db: any = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // TiDB Cloud requires SSL for secure connections
      // Parse the DATABASE_URL and add explicit SSL configuration
      const poolConnection = mysql.createPool({
        uri: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: true,
        },
      });
      _db = drizzle(poolConnection);
      console.log(
        '[Database] Connected to MySQL with SSL:',
        process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@'),
      );
    } catch (error) {
      console.warn('[Database] Failed to connect:', error);
      _db = null;
    }
  }
  return _db;
}

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
export async function getUserProperties(userId: number): Promise<Property[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return await db
    .select()
    .from(properties)
    .where(eq(properties.ownerId, userId))
    .orderBy(desc(properties.createdAt));
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
  limit?: number;
  offset?: number;
}

export async function searchProperties(params: PropertySearchParams) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const conditions = [];

  if (params.city) {
    conditions.push(like(properties.city, `%${params.city}%`));
  }
  if (params.province) {
    conditions.push(eq(properties.province, params.province));
  }
  if (params.propertyType) {
    conditions.push(eq(properties.propertyType, params.propertyType as any));
  }
  if (params.listingType) {
    conditions.push(eq(properties.listingType, params.listingType as any));
  }
  if (params.minPrice !== undefined) {
    conditions.push(gte(properties.price, params.minPrice));
  }
  if (params.maxPrice !== undefined) {
    conditions.push(lte(properties.price, params.maxPrice));
  }
  if (params.minBedrooms !== undefined) {
    conditions.push(gte(properties.bedrooms, params.minBedrooms));
  }
  if (params.maxBedrooms !== undefined) {
    conditions.push(lte(properties.bedrooms, params.maxBedrooms));
  }
  if (params.minArea !== undefined) {
    conditions.push(gte(properties.area, params.minArea));
  }
  if (params.maxArea !== undefined) {
    conditions.push(lte(properties.area, params.maxArea));
  }
  if (params.status) {
    conditions.push(eq(properties.status, params.status as any));
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

  return await query;
}

export async function getFeaturedProperties(limit: number = 6) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return await db
    .select()
    .from(properties)
    .where(and(eq(properties.featured, 1), eq(properties.status, 'available')))
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
    .where(eq(locations.type, type as any));
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
    eq(properties.status, 'available'),
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

  const performanceData = [];
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
      status: properties.status,
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
        or(eq(leads.status, 'converted'), eq(leads.status, 'closed')),
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
        eq(commissions.status, 'paid'),
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
        eq(commissions.status, 'pending'),
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
            eq(properties.status, 'sold'),
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

  const { agencies, properties, agents, commissions } = require('../drizzle/schema');

  // Get counts
  const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const [agencyCount] = await db.select({ count: sql<number>`count(*)` }).from(agencies);
  const [propertyCount] = await db.select({ count: sql<number>`count(*)` }).from(properties);
  const [activePropertyCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(properties)
    .where(eq(properties.status, 'available'));
  const [agentCount] = await db.select({ count: sql<number>`count(*)` }).from(agents);
  const [paidSubsCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(agencies)
    .where(sql`${agencies.subscriptionPlan} != 'free'`);

  // Monthly revenue (from commissions) - assume last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [monthlyRevenue] = await db
    .select({ total: sql<number>`sum(${commissions.amount})` })
    .from(commissions)
    .where(sql`${commissions.createdAt} >= ${thirtyDaysAgo}`);

  // User growth (new users in last 30 days)
  const [recentUsers] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(sql`${users.createdAt} >= ${thirtyDaysAgo}`);

  // Property growth (new properties in last 30 days)
  const [recentProperties] = await db
    .select({ count: sql<number>`count(*)` })
    .from(properties)
    .where(sql`${properties.createdAt} >= ${thirtyDaysAgo}`);

  return {
    totalUsers: Number(userCount?.count || 0),
    totalAgencies: Number(agencyCount?.count || 0),
    totalProperties: Number(propertyCount?.count || 0),
    activeProperties: Number(activePropertyCount?.count || 0),
    totalAgents: Number(agentCount?.count || 0),
    paidSubscriptions: Number(paidSubsCount?.count || 0),
    monthlyRevenue: Number(monthlyRevenue?.total || 0) / 100, // Convert cents to currency units
    userGrowth: Number(recentUsers?.count || 0),
    propertyGrowth: Number(recentProperties?.count || 0),
  };
}

export async function getListingStats() {
  const db = await getDb();
  if (!db) return { pending: 0, approved: 0, rejected: 0, total: 0 };

  const { properties } = require('../drizzle/schema');

  const [pending] = await db
    .select({ count: sql<number>`count(*)` })
    .from(properties)
    .where(eq(properties.status, 'pending'));
  const [approved] = await db
    .select({ count: sql<number>`count(*)` })
    .from(properties)
    .where(eq(properties.status, 'available'));
  const [rejected] = await db
    .select({ count: sql<number>`count(*)` })
    .from(properties)
    .where(eq(properties.status, 'archived')); // Assuming archived means rejected
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
    .where(eq(agencies.subscriptionPlan, 'free'));
  const [basic] = await db
    .select({ count: sql<number>`count(*)` })
    .from(agencies)
    .where(eq(agencies.subscriptionPlan, 'basic'));
  const [premium] = await db
    .select({ count: sql<number>`count(*)` })
    .from(agencies)
    .where(eq(agencies.subscriptionPlan, 'premium'));
  const [enterprise] = await db
    .select({ count: sql<number>`count(*)` })
    .from(agencies)
    .where(eq(agencies.subscriptionPlan, 'enterprise'));
  const [total] = await db.select({ count: sql<number>`count(*)` }).from(agencies);

  return {
    free: Number(free?.count || 0),
    basic: Number(basic?.count || 0),
    premium: Number(premium?.count || 0),
    enterprise: Number(enterprise?.count || 0),
    total: Number(total?.count || 0),
  };
}
