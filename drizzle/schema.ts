import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  name: text("name"),
  firstName: varchar("firstName", { length: 100 }),
  lastName: varchar("lastName", { length: 100 }),
  phone: varchar("phone", { length: 30 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  emailVerified: int("emailVerified").default(0).notNull(),
  role: mysqlEnum("role", ["visitor", "agent", "agency_admin", "super_admin"]).default("visitor").notNull(),
  agencyId: int("agencyId").references(() => agencies.id, { onDelete: "set null" }),
  isSubaccount: int("isSubaccount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Properties table - stores all property listings
 */
export const properties = mysqlTable("properties", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  propertyType: mysqlEnum("propertyType", ["apartment", "house", "villa", "plot", "commercial", "townhouse", "cluster_home", "farm", "shared_living"]).notNull(),
  listingType: mysqlEnum("listingType", ["sale", "rent", "rent_to_buy", "auction", "shared_living"]).notNull(),
  transactionType: mysqlEnum("transactionType", ["sale", "rent", "rent_to_buy", "auction"]).default("sale").notNull(),
  price: int("price").notNull(),
  bedrooms: int("bedrooms"),
  bathrooms: int("bathrooms"),
  area: int("area").notNull(), // in square feet
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  province: varchar("province", { length: 100 }).notNull(),
  zipCode: varchar("zipCode", { length: 20 }),
  latitude: varchar("latitude", { length: 50 }),
  longitude: varchar("longitude", { length: 50 }),
  // New location hierarchy fields
  provinceId: int("provinceId").references(() => provinces.id, { onDelete: "set null" }),
  cityId: int("cityId").references(() => cities.id, { onDelete: "set null" }),
  suburbId: int("suburbId").references(() => suburbs.id, { onDelete: "set null" }),
  locationText: text("locationText"), // Full address as entered by user
  placeId: varchar("placeId", { length: 255 }), // Google Places ID if available
  amenities: text("amenities"), // JSON array stored as text
  yearBuilt: int("yearBuilt"),
  status: mysqlEnum("status", ["available", "sold", "rented", "pending", "draft", "published", "archived"]).default("available").notNull(),
  featured: int("featured").default(0).notNull(), // 0 or 1 for boolean
  views: int("views").default(0).notNull(),
  enquiries: int("enquiries").default(0).notNull(),
  agentId: int("agentId").references(() => agents.id, { onDelete: "set null" }),
  developmentId: int("developmentId").references(() => developments.id, { onDelete: "set null" }),
  ownerId: int("ownerId").notNull().references(() => users.id),
  propertySettings: text("propertySettings"), // JSON: estate_living, security_estate, etc.
  videoUrl: text("videoUrl"),
  virtualTourUrl: text("virtualTourUrl"),
  levies: int("levies"),
  ratesAndTaxes: int("ratesAndTaxes"),
  mainImage: varchar("mainImage", { length: 1024 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;

/**
 * Property images table - stores multiple images per property
 */
export const propertyImages = mysqlTable("propertyImages", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull().references(() => properties.id, { onDelete: "cascade" }),
  imageUrl: text("imageUrl").notNull(),
  isPrimary: int("isPrimary").default(0).notNull(), // 0 or 1 for boolean
  displayOrder: int("displayOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PropertyImage = typeof propertyImages.$inferSelect;
export type InsertPropertyImage = typeof propertyImages.$inferInsert;

/**
 * Favorites table - stores user's favorite properties
 */
export const favorites = mysqlTable("favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  propertyId: int("propertyId").notNull().references(() => properties.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;

/**
 * Agencies table - real estate agencies/companies
 */
export const agencies = mysqlTable("agencies", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  logo: text("logo"),
  website: varchar("website", { length: 255 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  province: varchar("province", { length: 100 }),
  subscriptionPlan: varchar("subscriptionPlan", { length: 50 }).default("free").notNull(),
  subscriptionStatus: varchar("subscriptionStatus", { length: 30 }).default("trial").notNull(),
  subscriptionExpiry: timestamp("subscriptionExpiry"),
  isVerified: int("isVerified").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Agency = typeof agencies.$inferSelect;
export type InsertAgency = typeof agencies.$inferInsert;

/**
 * Invitations table - agent invitations to join agencies
 */
export const invitations = mysqlTable("invitations", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull().references(() => agencies.id, { onDelete: "cascade" }),
  invitedBy: int("invitedBy").notNull().references(() => users.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 320 }).notNull(),
  role: varchar("role", { length: 50 }).default("agent").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  status: mysqlEnum("status", ["pending", "accepted", "expired", "cancelled"]).default("pending").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  acceptedBy: int("acceptedBy").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = typeof invitations.$inferInsert;

/**
 * Agents table - individual real estate agents
 */
export const agents = mysqlTable("agents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "cascade" }),
  agencyId: int("agencyId").references(() => agencies.id, { onDelete: "set null" }),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  displayName: varchar("displayName", { length: 200 }),
  bio: text("bio"),
  profileImage: text("profileImage"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  whatsapp: varchar("whatsapp", { length: 50 }),
  specialization: text("specialization"), // JSON array
  role: mysqlEnum("role", ["agent", "principal_agent", "broker"]).default("agent").notNull(),
  licenseNumber: varchar("licenseNumber", { length: 100 }),
  yearsExperience: int("yearsExperience"),
  areasServed: text("areasServed"), // JSON array of cities/areas
  languages: text("languages"), // JSON array
  rating: int("rating").default(0),
  reviewCount: int("reviewCount").default(0),
  totalSales: int("totalSales").default(0),
  isVerified: int("isVerified").default(0).notNull(),
  isFeatured: int("isFeatured").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

/**
 * Developers table - property development companies
 */
export const developers = mysqlTable("developers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  logo: text("logo"),
  website: varchar("website", { length: 255 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  province: varchar("province", { length: 100 }),
  category: mysqlEnum("category", ["residential", "commercial", "mixed_use", "industrial"]).default("residential").notNull(),
  establishedYear: int("establishedYear"),
  totalProjects: int("totalProjects").default(0),
  rating: int("rating").default(0),
  reviewCount: int("reviewCount").default(0),
  isVerified: int("isVerified").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Developer = typeof developers.$inferSelect;
export type InsertDeveloper = typeof developers.$inferInsert;

/**
 * Developments table - property development projects
 */
export const developments = mysqlTable("developments", {
  id: int("id").autoincrement().primaryKey(),
  developerId: int("developerId").references(() => developers.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  developmentType: mysqlEnum("developmentType", ["residential", "commercial", "mixed_use", "estate", "complex"]).notNull(),
  status: mysqlEnum("status", ["planning", "under_construction", "completed", "coming_soon"]).default("planning").notNull(),
  address: text("address"),
  city: varchar("city", { length: 100 }).notNull(),
  province: varchar("province", { length: 100 }).notNull(),
  latitude: varchar("latitude", { length: 50 }),
  longitude: varchar("longitude", { length: 50 }),
  totalUnits: int("totalUnits"),
  availableUnits: int("availableUnits"),
  priceFrom: int("priceFrom"),
  priceTo: int("priceTo"),
  amenities: text("amenities"), // JSON array
  images: text("images"), // JSON array of image URLs
  videos: text("videos"), // JSON array of video URLs
  completionDate: timestamp("completionDate"),
  isFeatured: int("isFeatured").default(0).notNull(),
  views: int("views").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Development = typeof developments.$inferSelect;
export type InsertDevelopment = typeof developments.$inferInsert;

/**
 * Services table - integrated service providers (loans, insurance, interiors)
 */
export const services = mysqlTable("services", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: mysqlEnum("category", ["home_loan", "insurance", "interior_design", "legal", "moving", "other"]).notNull(),
  description: text("description"),
  logo: text("logo"),
  website: varchar("website", { length: 255 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  commissionRate: int("commissionRate"), // percentage * 100 (e.g., 250 = 2.5%)
  isActive: int("isActive").default(1).notNull(),
  isFeatured: int("isFeatured").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;

/**
 * Reviews table - reviews for agents, developers, and properties
 */
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  reviewType: mysqlEnum("reviewType", ["agent", "developer", "property"]).notNull(),
  targetId: int("targetId").notNull(), // ID of agent, developer, or property
  rating: int("rating").notNull(), // 1-5 stars
  title: varchar("title", { length: 255 }),
  comment: text("comment"),
  isVerified: int("isVerified").default(0).notNull(),
  isPublished: int("isPublished").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

/**
 * Leads table - lead capture and tracking
 */
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").references(() => properties.id, { onDelete: "set null" }),
  developmentId: int("developmentId").references(() => developments.id, { onDelete: "set null" }),
  agencyId: int("agencyId").references(() => agencies.id, { onDelete: "set null" }),
  agentId: int("agentId").references(() => agents.id, { onDelete: "set null" }),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  message: text("message"),
  leadType: mysqlEnum("leadType", ["inquiry", "viewing_request", "offer", "callback"]).default("inquiry").notNull(),
  status: mysqlEnum("status", ["new", "contacted", "qualified", "converted", "closed", "viewing_scheduled", "offer_sent", "lost"]).default("new").notNull(),
  source: varchar("source", { length: 100 }), // e.g., "website", "explore_feed", "agent_profile"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  nextFollowUp: timestamp("nextFollowUp"),
  lastContactedAt: timestamp("lastContactedAt"),
  notes: text("notes"),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

/**
 * Locations table - South African cities and neighborhoods
 */
export const locations = mysqlTable("locations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  type: mysqlEnum("type", ["province", "city", "suburb", "neighborhood"]).notNull(),
  parentId: int("parentId"), // self-referencing for hierarchy
  description: text("description"),
  latitude: varchar("latitude", { length: 50 }),
  longitude: varchar("longitude", { length: 50 }),
  propertyCount: int("propertyCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Location = typeof locations.$inferSelect;
export type InsertLocation = typeof locations.$inferInsert;

/**
 * Videos table - TikTok-style property videos with dual-type support
 */
export const videos = mysqlTable("videos", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").references(() => agents.id, { onDelete: "cascade" }),
  propertyId: int("propertyId").references(() => properties.id, { onDelete: "set null" }),
  developmentId: int("developmentId").references(() => developments.id, { onDelete: "set null" }),
  videoUrl: text("videoUrl").notNull(),
  caption: text("caption"),
  type: mysqlEnum("type", ["listing", "content"]).default("content").notNull(),
  duration: int("duration").default(0), // in seconds
  views: int("views").default(0).notNull(),
  likes: int("likes").default(0).notNull(),
  shares: int("shares").default(0).notNull(),
  isPublished: int("isPublished").default(1).notNull(),
  isFeatured: int("isFeatured").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Video = typeof videos.$inferSelect;
export type InsertVideo = typeof videos.$inferInsert;

/**
 * Video likes table - track user likes on videos
 */
export const videoLikes = mysqlTable("videoLikes", {
  id: int("id").autoincrement().primaryKey(),
  videoId: int("videoId").notNull().references(() => videos.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VideoLike = typeof videoLikes.$inferSelect;
export type InsertVideoLike = typeof videoLikes.$inferInsert;

// Legacy table for backward compatibility
export const exploreVideos = mysqlTable("exploreVideos", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").references(() => agents.id, { onDelete: "cascade" }),
  propertyId: int("propertyId").references(() => properties.id, { onDelete: "set null" }),
  developmentId: int("developmentId").references(() => developments.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  videoUrl: text("videoUrl").notNull(),
  thumbnailUrl: text("thumbnailUrl"),
  duration: int("duration"), // in seconds
  views: int("views").default(0).notNull(),
  likes: int("likes").default(0).notNull(),
  shares: int("shares").default(0).notNull(),
  isPublished: int("isPublished").default(1).notNull(),
  isFeatured: int("isFeatured").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExploreVideo = typeof exploreVideos.$inferSelect;
export type InsertExploreVideo = typeof exploreVideos.$inferInsert;

/**
 * Invites table - agency invite tokens for adding agents as subaccounts
 */
export const invites = mysqlTable("invites", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull().references(() => agencies.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  role: varchar("role", { length: 30 }).default("agent"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  used: int("used").default(0).notNull(),
  usedAt: timestamp("usedAt"),
  usedBy: int("usedBy").references(() => users.id, { onDelete: "set null" }),
});

export type Invite = typeof invites.$inferSelect;
export type InsertInvite = typeof invites.$inferInsert;

/**
 * Agency join requests - agents requesting to join agencies
 */
export const agencyJoinRequests = mysqlTable("agency_join_requests", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull().references(() => agencies.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  message: text("message"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  reviewedBy: int("reviewedBy").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewedAt"),
});

export type AgencyJoinRequest = typeof agencyJoinRequests.$inferSelect;
export type InsertAgencyJoinRequest = typeof agencyJoinRequests.$inferInsert;

/**
 * Audit logs - track super_admin and sensitive actions
 */
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 100 }).notNull(),
  targetType: varchar("targetType", { length: 50 }),
  targetId: int("targetId"),
  metadata: text("metadata"), // JSON
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Showings table - property viewing appointments
 */
export const showings = mysqlTable("showings", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull().references(() => properties.id, { onDelete: "cascade" }),
  leadId: int("leadId").references(() => leads.id, { onDelete: "set null" }),
  agentId: int("agentId").references(() => agents.id, { onDelete: "set null" }),
  scheduledAt: timestamp("scheduledAt").notNull(),
  status: mysqlEnum("status", ["requested", "confirmed", "completed", "cancelled"]).default("requested").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Showing = typeof showings.$inferSelect;
export type InsertShowing = typeof showings.$inferInsert;

/**
 * Commissions table - agent commission tracking
 */
export const commissions = mysqlTable("commissions", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull().references(() => agents.id, { onDelete: "cascade" }),
  propertyId: int("propertyId").references(() => properties.id, { onDelete: "set null" }),
  leadId: int("leadId").references(() => leads.id, { onDelete: "set null" }),
  amount: int("amount").notNull(), // in cents
  percentage: int("percentage"), // percentage * 100
  status: mysqlEnum("status", ["pending", "approved", "paid", "cancelled"]).default("pending").notNull(),
  transactionType: mysqlEnum("transactionType", ["sale", "rent", "referral", "other"]).default("sale").notNull(),
  description: text("description"),
  payoutDate: timestamp("payoutDate"),
  paymentReference: varchar("paymentReference", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Commission = typeof commissions.$inferSelect;
export type InsertCommission = typeof commissions.$inferInsert;

/**
 * Lead activities table - activity log for leads
 */
export const leadActivities = mysqlTable("lead_activities", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull().references(() => leads.id, { onDelete: "cascade" }),
  agentId: int("agentId").references(() => agents.id, { onDelete: "set null" }),
  activityType: mysqlEnum("activityType", ["call", "email", "meeting", "note", "status_change", "viewing_scheduled", "offer_sent"]).notNull(),
  description: text("description"),
  metadata: text("metadata"), // JSON
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LeadActivity = typeof leadActivities.$inferSelect;
export type InsertLeadActivity = typeof leadActivities.$inferInsert;

/**
 * Offers table - property offers from buyers
 */
export const offers = mysqlTable("offers", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull().references(() => properties.id, { onDelete: "cascade" }),
  leadId: int("leadId").references(() => leads.id, { onDelete: "set null" }),
  agentId: int("agentId").references(() => agents.id, { onDelete: "set null" }),
  buyerName: varchar("buyerName", { length: 200 }).notNull(),
  buyerEmail: varchar("buyerEmail", { length: 320 }),
  buyerPhone: varchar("buyerPhone", { length: 50 }),
  offerAmount: int("offerAmount").notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "rejected", "countered", "withdrawn"]).default("pending").notNull(),
  conditions: text("conditions"),
  expiresAt: timestamp("expiresAt"),
  respondedAt: timestamp("respondedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Offer = typeof offers.$inferSelect;
export type InsertOffer = typeof offers.$inferInsert;

/**
 * Platform settings table - key-value store for global configuration
 */
export const platformSettings = mysqlTable("platform_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(), // JSON string
  description: text("description"),
  category: mysqlEnum("category", ["pricing", "features", "notifications", "limits", "other"]).default("other").notNull(),
  isPublic: int("isPublic").default(0).notNull(), // 0 or 1 for boolean
  updatedBy: int("updatedBy").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlatformSetting = typeof platformSettings.$inferSelect;
export type InsertPlatformSetting = typeof platformSettings.$inferInsert;

/**
 * Plans table - system-wide subscription plan definitions
 */
export const plans = mysqlTable("plans", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  displayName: varchar("displayName", { length: 100 }).notNull(),
  description: text("description"),
  price: int('price').notNull(), // price in cents (e.g., 4999 = R49.99)
  currency: varchar("currency", { length: 3 }).default("ZAR").notNull(),
  interval: mysqlEnum("interval", ["month", "year"]).default("month").notNull(),
  stripePriceId: varchar("stripePriceId", { length: 100 }).unique(),
  features: text("features"), // JSON array of feature strings
  limits: text("limits"), // JSON object with limits (properties, agents, etc.)
  isActive: int("isActive").default(1).notNull(),
  isPopular: int("isPopular").default(0).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Plan = typeof plans.$inferSelect;
export type InsertPlan = typeof plans.$inferInsert;

/**
 * Agency subscriptions table - Stripe subscription records
 */
export const agencySubscriptions = mysqlTable("agency_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull().references(() => agencies.id, { onDelete: "cascade" }),
  planId: int("planId").references(() => plans.id, { onDelete: "set null" }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 100 }).unique(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 100 }).notNull(),
  stripePriceId: varchar("stripePriceId", { length: 100 }),
  status: mysqlEnum("status", ["incomplete", "incomplete_expired", "trialing", "active", "past_due", "canceled", "unpaid"]).default("incomplete").notNull(),
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  trialEnd: timestamp("trialEnd"),
  cancelAtPeriodEnd: int("cancelAtPeriodEnd").default(0).notNull(),
  canceledAt: timestamp("canceledAt"),
  endedAt: timestamp("endedAt"),
  metadata: text("metadata"), // JSON
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgencySubscription = typeof agencySubscriptions.$inferSelect;
export type InsertAgencySubscription = typeof agencySubscriptions.$inferInsert;

/**
 * Invoices table - billing records with PDF links
 */
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull().references(() => agencies.id, { onDelete: "cascade" }),
  subscriptionId: int("subscriptionId").references(() => agencySubscriptions.id, { onDelete: "set null" }),
  stripeInvoiceId: varchar("stripeInvoiceId", { length: 100 }).unique(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 100 }),
  amount: int("amount").notNull(), // in cents
  currency: varchar("currency", { length: 3 }).default("ZAR").notNull(),
  status: mysqlEnum("status", ["draft", "open", "paid", "void", "uncollectible"]).default("draft").notNull(),
  invoicePdf: text("invoicePdf"), // URL to PDF
  hostedInvoiceUrl: text("hostedInvoiceUrl"), // Stripe hosted invoice URL
  invoiceNumber: varchar("invoiceNumber", { length: 50 }),
  description: text("description"),
  billingReason: mysqlEnum("billingReason", ["subscription_cycle", "subscription_create", "subscription_update", "subscription_finalize", "manual"]).default("subscription_cycle").notNull(),
  periodStart: timestamp("periodStart"),
  periodEnd: timestamp("periodEnd"),
  paidAt: timestamp("paidAt"),
  dueDate: timestamp("dueDate"),
  metadata: text("metadata"), // JSON
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

/**
 * Payment methods table - stored card/bank account info
 */
export const paymentMethods = mysqlTable("payment_methods", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull().references(() => agencies.id, { onDelete: "cascade" }),
  stripePaymentMethodId: varchar("stripePaymentMethodId", { length: 100 }).unique(),
  type: mysqlEnum("type", ["card", "bank_account"]).default("card").notNull(),
  cardBrand: varchar("cardBrand", { length: 20 }),
  cardLast4: varchar("cardLast4", { length: 4 }),
  cardExpMonth: int("cardExpMonth"),
  cardExpYear: int("cardExpYear"),
  bankName: varchar("bankName", { length: 100 }),
  bankLast4: varchar("bankLast4", { length: 4 }),
  isDefault: int("isDefault").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  metadata: text("metadata"), // JSON
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = typeof paymentMethods.$inferInsert;

/**
 * Coupons table - discount codes for subscriptions
 */
export const coupons = mysqlTable("coupons", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  stripeCouponId: varchar("stripeCouponId", { length: 100 }).unique(),
  name: varchar("name", { length: 100 }),
  description: text("description"),
  discountType: mysqlEnum("discountType", ["amount", "percent"]).default("percent").notNull(),
  discountAmount: int("discountAmount"), // in cents for amount, percentage for percent
  maxRedemptions: int("maxRedemptions"), // null = unlimited
  redemptionsUsed: int("redemptionsUsed").default(0).notNull(),
  validFrom: timestamp("validFrom"),
  validUntil: timestamp("validUntil"),
  isActive: int("isActive").default(1).notNull(),
  appliesToPlans: text("appliesToPlans"), // JSON array of plan IDs
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = typeof coupons.$inferInsert;

/**
 * Agency branding table - white-label customization settings
 */
export const agencyBranding = mysqlTable("agency_branding", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull().references(() => agencies.id, { onDelete: "cascade" }),
  primaryColor: varchar("primaryColor", { length: 7 }), // hex color
  secondaryColor: varchar("secondaryColor", { length: 7 }),
  accentColor: varchar("accentColor", { length: 7 }),
  logoUrl: text("logoUrl"),
  faviconUrl: text("faviconUrl"),
  customDomain: varchar("customDomain", { length: 255 }),
  subdomain: varchar("subdomain", { length: 63 }), // max 63 chars for subdomain
  companyName: varchar("companyName", { length: 255 }),
  tagline: varchar("tagline", { length: 255 }),
  customCss: text("customCss"),
  metaTitle: varchar("metaTitle", { length: 255 }),
  metaDescription: text("metaDescription"),
  supportEmail: varchar("supportEmail", { length: 320 }),
  supportPhone: varchar("supportPhone", { length: 50 }),
  socialLinks: text("socialLinks"), // JSON object
  isEnabled: int("isEnabled").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgencyBranding = typeof agencyBranding.$inferSelect;
export type InsertAgencyBranding = typeof agencyBranding.$inferInsert;

/**
 * Prospects table - pre-qualification user profiles
 */
export const prospects = mysqlTable("prospects", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 255 }).notNull(), // Anonymous session identifier
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),

  // Financial Information
  income: int("income"), // Monthly gross income in cents
  incomeRange: mysqlEnum("incomeRange", ["under_15k", "15k_25k", "25k_50k", "50k_100k", "over_100k"]),
  employmentStatus: mysqlEnum("employmentStatus", ["employed", "self_employed", "business_owner", "student", "retired", "unemployed"]),
  combinedIncome: int("combinedIncome"), // Joint applications

  // Expenses & Liabilities
  monthlyExpenses: int("monthlyExpenses"), // Rent, utilities, etc.
  monthlyDebts: int("monthlyDebts"), // Loans, credit cards
  dependents: int("dependents").default(0),

  // Assets & Savings
  savingsDeposit: int("savingsDeposit"), // Available for down payment
  creditScore: int("creditScore"), // Optional credit score
  hasCreditConsent: int("hasCreditConsent").default(0), // User consent for credit check

  // Buyability Calculation Results
  buyabilityScore: mysqlEnum("buyabilityScore", ["low", "medium", "high"]),
  affordabilityMin: int("affordabilityMin"), // Min property price they can afford
  affordabilityMax: int("affordabilityMax"), // Max property price they can afford
  monthlyPaymentCapacity: int("monthlyPaymentCapacity"), // Max monthly payment

  // Gamification & Progress
  profileProgress: int("profileProgress").default(0), // Percentage complete (0-100)
  badges: text("badges"), // JSON array of earned badges
  lastActivity: timestamp("lastActivity"),

  // Preferences
  preferredPropertyType: mysqlEnum("preferredPropertyType", ["apartment", "house", "villa", "plot", "commercial", "townhouse", "cluster_home", "farm", "shared_living"]),
  preferredLocation: varchar("preferredLocation", { length: 100 }), // City or suburb
  maxCommuteTime: int("maxCommuteTime"), // Minutes

  // Metadata
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  referrer: text("referrer"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Prospect = typeof prospects.$inferSelect;
export type InsertProspect = typeof prospects.$inferInsert;

/**
 * Prospect favorites table - properties favorited by prospects
 */
export const prospectFavorites = mysqlTable("prospect_favorites", {
  id: int("id").autoincrement().primaryKey(),
  prospectId: int("prospectId").notNull().references(() => prospects.id, { onDelete: "cascade" }),
  propertyId: int("propertyId").notNull().references(() => properties.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProspectFavorite = typeof prospectFavorites.$inferSelect;
export type InsertProspectFavorite = typeof prospectFavorites.$inferInsert;

/**
 * Scheduled viewings table - property viewing appointments scheduled by prospects
 */
export const scheduledViewings = mysqlTable("scheduled_viewings", {
  id: int("id").autoincrement().primaryKey(),
  prospectId: int("prospectId").notNull().references(() => prospects.id, { onDelete: "cascade" }),
  propertyId: int("propertyId").notNull().references(() => properties.id, { onDelete: "cascade" }),
  agentId: int("agentId").references(() => agents.id, { onDelete: "set null" }),
  scheduledAt: timestamp("scheduledAt").notNull(),
  status: mysqlEnum("status", ["scheduled", "confirmed", "completed", "cancelled", "no_show"]).default("scheduled").notNull(),
  notes: text("notes"),
  prospectName: varchar("prospectName", { length: 200 }),
  prospectEmail: varchar("prospectEmail", { length: 320 }),
  prospectPhone: varchar("prospectPhone", { length: 50 }),
  notificationSent: int("notificationSent").default(0), // Whether agent was notified
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScheduledViewing = typeof scheduledViewings.$inferSelect;
export type InsertScheduledViewing = typeof scheduledViewings.$inferInsert;

/**
 * Recently viewed properties table - track prospect browsing history
 */
export const recentlyViewed = mysqlTable("recently_viewed", {
  id: int("id").autoincrement().primaryKey(),
  prospectId: int("prospectId").notNull().references(() => prospects.id, { onDelete: "cascade" }),
  propertyId: int("propertyId").notNull().references(() => properties.id, { onDelete: "cascade" }),
  viewedAt: timestamp("viewedAt").defaultNow().notNull(),
});

export type RecentlyViewed = typeof recentlyViewed.$inferSelect;
export type InsertRecentlyViewed = typeof recentlyViewed.$inferInsert;

/**
 * Notifications table - real-time notifications for agents and users
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: mysqlEnum("type", ["lead_assigned", "offer_received", "showing_scheduled", "system_alert"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  data: text("data"), // JSON data for additional notification context
  isRead: int("isRead").default(0).notNull(), // 0 = unread, 1 = read
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Email templates table - branded communication templates
 */
export const emailTemplates = mysqlTable("email_templates", {
  id: int("id").autoincrement().primaryKey(),
  templateKey: varchar("templateKey", { length: 100 }).notNull().unique(),
  subject: varchar("subject", { length: 255 }).notNull(),
  htmlContent: text("htmlContent").notNull(),
  textContent: text("textContent"),
  agencyId: int("agencyId").references(() => agencies.id, { onDelete: "cascade" }),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;

/**
 * Provinces table - South African provinces
 */
export const provinces = mysqlTable("provinces", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  latitude: varchar("latitude", { length: 20 }), // DECIMAL as string
  longitude: varchar("longitude", { length: 21 }), // DECIMAL as string
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Province = typeof provinces.$inferSelect;
export type InsertProvince = typeof provinces.$inferInsert;

/**
 * Cities table - South African cities
 */
export const cities = mysqlTable("cities", {
  id: int("id").autoincrement().primaryKey(),
  provinceId: int("provinceId").notNull().references(() => provinces.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 150 }).notNull(),
  latitude: varchar("latitude", { length: 20 }), // DECIMAL as string
  longitude: varchar("longitude", { length: 21 }), // DECIMAL as string
  isMetro: int("isMetro").default(0).notNull(), // 1 = Metropolitan municipality
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type City = typeof cities.$inferSelect;
export type InsertCity = typeof cities.$inferInsert;

/**
 * Suburbs table - South African suburbs
 */
export const suburbs = mysqlTable("suburbs", {
  id: int("id").autoincrement().primaryKey(),
  cityId: int("cityId").notNull().references(() => cities.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  latitude: varchar("latitude", { length: 20 }), // DECIMAL as string
  longitude: varchar("longitude", { length: 21 }), // DECIMAL as string
  postalCode: varchar("postalCode", { length: 10 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Suburb = typeof suburbs.$inferSelect;
export type InsertSuburb = typeof suburbs.$inferInsert;

/**
 * Location search cache for performance optimization
 */
export const locationSearchCache = mysqlTable("location_search_cache", {
  id: int("id").autoincrement().primaryKey(),
  searchQuery: varchar("searchQuery", { length: 255 }).notNull(),
  searchType: mysqlEnum("searchType", ["province", "city", "suburb", "address", "all"]).notNull(),
  resultsJSON: text("resultsJSON").notNull(), // Cached search results as JSON
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

export type LocationSearchCache = typeof locationSearchCache.$inferSelect;
export type InsertLocationSearchCache = typeof locationSearchCache.$inferInsert;

/**
 * Agent coverage areas for mapping
 */
export const agentCoverageAreas = mysqlTable("agent_coverage_areas", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull().references(() => agents.id, { onDelete: "cascade" }),
  areaName: varchar("areaName", { length: 255 }).notNull(),
  areaType: mysqlEnum("areaType", ["province", "city", "suburb", "custom_polygon"]).notNull(),
  areaData: text("areaData").notNull(), // JSON - coordinates or area definition
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgentCoverageArea = typeof agentCoverageAreas.$inferSelect;
export type InsertAgentCoverageArea = typeof agentCoverageAreas.$inferInsert;

/**
 * Phase 10: Price Insights & Analytics Engine Tables
 * AI-assisted property price insights and user behavior tracking
 */

// Price History Tracking Table
export const priceHistory = mysqlTable("price_history", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull().references(() => properties.id, { onDelete: "cascade" }),
  suburbId: int("suburbId"),
  cityId: int("cityId"),
  provinceId: int("provinceId"),
  price: int("price").notNull(),
  pricePerSqm: int("pricePerSqm"),
  propertyType: mysqlEnum("propertyType", ["apartment", "house", "villa", "plot", "commercial", "townhouse", "cluster_home", "farm", "shared_living"]).notNull(),
  listingType: mysqlEnum("listingType", ["sale", "rent", "rent_to_buy", "auction", "shared_living"]).notNull(),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  source: mysqlEnum("source", ["new_listing", "price_change", "sold", "rented", "market_update"]).default("market_update").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PriceHistory = typeof priceHistory.$inferSelect;
export type InsertPriceHistory = typeof priceHistory.$inferInsert;

// Consolidated Price Analytics (replaces suburb + city analytics)
export const priceAnalytics = mysqlTable("price_analytics", {
  id: int("id").autoincrement().primaryKey(),
  locationId: int("locationId").notNull(),
  locationType: mysqlEnum("locationType", ["suburb", "city", "province"]).notNull(),
  
  // Current Statistics
  currentAvgPrice: int("currentAvgPrice"),
  currentMedianPrice: int("currentMedianPrice"),
  currentMinPrice: int("currentMinPrice"),
  currentMaxPrice: int("currentMaxPrice"),
  currentPriceCount: int("currentPriceCount").default(0),
  
  // Growth Metrics
  oneMonthGrowthPercent: int("oneMonthGrowthPercent"),
  threeMonthGrowthPercent: int("threeMonthGrowthPercent"),
  sixMonthGrowthPercent: int("sixMonthGrowthPercent"),
  oneYearGrowthPercent: int("oneYearGrowthPercent"),
  
  // Price Distribution
  luxurySegmentPercent: int("luxurySegmentPercent").default(0), // Properties > R2M
  midRangePercent: int("midRangePercent").default(0), // Properties R800K-R2M
  affordablePercent: int("affordablePercent").default(0), // Properties < R800K
  
  // Market Velocity
  avgDaysOnMarket: int("avgDaysOnMarket").default(0),
  newListingsMonthly: int("newListingsMonthly").default(0),
  soldPropertiesMonthly: int("soldPropertiesMonthly").default(0),
  
  // Price Trends
  trendingDirection: mysqlEnum("trendingDirection", ["up", "down", "stable"]).default("stable").notNull(),
  trendConfidence: int("trendConfidence").default(0), // percentage * 100
  
  // Popular Metrics
  totalProperties: int("totalProperties").default(0),
  activeListings: int("activeListings").default(0),
  userInteractions: int("userInteractions").default(0),
  
  // Computed Values
  priceVolatility: int("priceVolatility").default(0), // percentage * 100
  marketMomentum: int("marketMomentum").default(0), // 0.00 to 1.00
  investmentScore: int("investmentScore").default(0), // 0.00 to 1.00
  
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
});

export type PriceAnalytics = typeof priceAnalytics.$inferSelect;
export type InsertPriceAnalytics = typeof priceAnalytics.$inferInsert;

// Legacy suburb analytics table (deprecated - use priceAnalytics instead)
export const suburbPriceAnalytics = mysqlTable("suburb_price_analytics", {
  id: int("id").autoincrement().primaryKey(),
  suburbId: int("suburbId").notNull().references(() => suburbs.id, { onDelete: "cascade" }),
  cityId: int("cityId").notNull().references(() => cities.id, { onDelete: "cascade" }),
  provinceId: int("provinceId").notNull().references(() => provinces.id, { onDelete: "cascade" }),
  
  // Current Month Statistics
  currentAvgPrice: int("currentAvgPrice"),
  currentMedianPrice: int("currentMedianPrice"),
  currentMinPrice: int("currentMinPrice"),
  currentMaxPrice: int("currentMaxPrice"),
  currentPriceCount: int("currentPriceCount").default(0),
  
  // Last Month Comparison
  lastMonthAvgPrice: int("lastMonthAvgPrice"),
  lastMonthMedianPrice: int("lastMonthMedianPrice"),
  lastMonthPriceCount: int("lastMonthPriceCount").default(0),
  
  // Growth Metrics
  sixMonthGrowthPercent: int("sixMonthGrowthPercent"), // percentage * 100
  threeMonthGrowthPercent: int("threeMonthGrowthPercent"),
  oneMonthGrowthPercent: int("oneMonthGrowthPercent"),
  
  // Price Trends
  trendingDirection: mysqlEnum("trendingDirection", ["up", "down", "stable"]).default("stable").notNull(),
  trendConfidence: int("trendConfidence").default(0), // percentage * 100
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
});

export type SuburbPriceAnalytics = typeof suburbPriceAnalytics.$inferSelect;
export type InsertSuburbPriceAnalytics = typeof suburbPriceAnalytics.$inferInsert;

// Legacy city analytics table (deprecated - use priceAnalytics instead)
export const cityPriceAnalytics = mysqlTable("city_price_analytics", {
  id: int("id").autoincrement().primaryKey(),
  cityId: int("cityId").notNull().references(() => cities.id, { onDelete: "cascade" }),
  provinceId: int("provinceId").notNull().references(() => provinces.id, { onDelete: "cascade" }),
  
  // Current Statistics
  currentAvgPrice: int("currentAvgPrice"),
  currentMedianPrice: int("currentMedianPrice"),
  currentMinPrice: int("currentMinPrice"),
  currentMaxPrice: int("currentMaxPrice"),
  currentPriceCount: int("currentPriceCount").default(0),
  
  // Growth Metrics
  sixMonthGrowthPercent: int("sixMonthGrowthPercent"),
  threeMonthGrowthPercent: int("threeMonthGrowthPercent"),
  oneMonthGrowthPercent: int("oneMonthGrowthPercent"),
  
  // Popular Metrics
  totalProperties: int("totalProperties").default(0),
  activeListings: int("activeListings").default(0),
  averageDaysOnMarket: int("averageDaysOnMarket").default(0),
  
  // Price Distribution
  luxurySegmentPercent: int("luxurySegmentPercent").default(0), // Properties > R2M
  midRangePercent: int("midRangePercent").default(0), // Properties R800K-R2M
  affordablePercent: int("affordablePercent").default(0), // Properties < R800K
  
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
});

export type CityPriceAnalytics = typeof cityPriceAnalytics.$inferSelect;
export type InsertCityPriceAnalytics = typeof cityPriceAnalytics.$inferInsert;

// User Behavior Tracking
export const userBehaviorEvents = mysqlTable("user_behavior_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  sessionId: varchar("sessionId", { length: 255 }).notNull(),
  
  // Event Details
  eventType: mysqlEnum("eventType", ["property_view", "search", "save_property", "contact_agent", "map_interaction", "price_filter", "location_filter", "property_type_filter"]).notNull(),
  eventData: text("eventData"), // JSON
  
  // Context
  propertyId: int("propertyId").references(() => properties.id, { onDelete: "set null" }),
  suburbId: int("suburbId").references(() => suburbs.id, { onDelete: "set null" }),
  cityId: int("cityId").references(() => cities.id, { onDelete: "set null" }),
  provinceId: int("provinceId").references(() => provinces.id, { onDelete: "set null" }),
  priceRangeMin: int("priceRangeMin"),
  priceRangeMax: int("priceRangeMax"),
  propertyType: varchar("propertyType", { length: 50 }),
  listingType: varchar("listingType", { length: 50 }),
  
  // Tracking
  pageUrl: varchar("pageUrl", { length: 500 }),
  referrer: varchar("referrer", { length: 500 }),
  userAgent: text("userAgent"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserBehaviorEvent = typeof userBehaviorEvents.$inferSelect;
export type InsertUserBehaviorEvent = typeof userBehaviorEvents.$inferInsert;

// User Preferences & Recommendations
export const userRecommendations = mysqlTable("user_recommendations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // User Preferences
  preferredSuburbs: text("preferredSuburbs"), // JSON array
  preferredCities: text("preferredCities"), // JSON array
  preferredPriceRange: text("preferredPriceRange"), // JSON object
  preferredPropertyTypes: text("preferredPropertyTypes"), // JSON array
  preferredListingTypes: text("preferredListingTypes"), // JSON array
  
  // AI Recommendations
  recommendedSuburbs: text("recommendedSuburbs"), // JSON array
  recommendedProperties: text("recommendedProperties"), // JSON array
  recommendedSimilarUsers: text("recommendedSimilarUsers"), // JSON array
  
  // Engagement Metrics
  recommendationClickCount: int("recommendationClickCount").default(0),
  recommendationConversionCount: int("recommendationConversionCount").default(0),
  lastRecommendationUpdate: timestamp("lastRecommendationUpdate").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserRecommendation = typeof userRecommendations.$inferSelect;
export type InsertUserRecommendation = typeof userRecommendations.$inferInsert;

// User Preferences for personalized search experience
export const userPreferences = mysqlTable("user_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Property Search Preferences
  preferredPropertyTypes: text("preferredPropertyTypes"), // JSON array: ["house", "apartment"]
  preferredPriceMin: int("preferredPriceMin"), // Minimum price in ZAR
  preferredPriceMax: int("preferredPriceMax"), // Maximum price in ZAR
  preferredBedrooms: int("preferredBedrooms"), // Number of bedrooms
  preferredBathrooms: int("preferredBathrooms"), // Number of bathrooms
  preferredPropertySize: text("preferredPropertySize"), // JSON object: {"min": 50, "max": 200}
  
  // Location Preferences
  preferredLocations: text("preferredLocations"), // JSON array of suburb/city names
  preferredDistance: int("preferredDistance"), // Max distance in km from center
  preferredProvices: text("preferredProvices"), // JSON array of province names
  preferredCities: text("preferredCities"), // JSON array of city names
  preferredSuburbs: text("preferredSuburbs"), // JSON array of suburb names
  
  // Property Features
  requiredAmenities: text("requiredAmenities"), // JSON array: ["pool", "garden", "garage"]
  preferredAmenities: text("preferredAmenities"), // JSON array
  propertyFeatures: text("propertyFeatures"), // JSON object with feature preferences
  petFriendly: int("petFriendly").default(0), // 0 = No preference, 1 = Required, 2 = Not wanted
  furnished: mysqlEnum("furnished", ["unfurnished", "semi_furnished", "fully_furnished"]),
  
  // Search & Notifications
  alertFrequency: mysqlEnum("alertFrequency", ["never", "instant", "daily", "weekly"]).default("daily"),
  emailNotifications: int("emailNotifications").default(1),
  smsNotifications: int("smsNotifications").default(0),
  pushNotifications: int("pushNotifications").default(1),
  isActive: int("isActive").default(1),
  
  // Weights for recommendation scoring (0-100 scale)
  locationWeight: int("locationWeight").default(30), // How important location is
  priceWeight: int("priceWeight").default(25), // How important price match is
  featuresWeight: int("featuresWeight").default(25), // How important features match is
  sizeWeight: int("sizeWeight").default(20), // How important size match is
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastUsed: timestamp("lastUsed"),
});

export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = typeof userPreferences.$inferInsert;

// Market Insights Cache
export const marketInsightsCache = mysqlTable("market_insights_cache", {
  id: int("id").autoincrement().primaryKey(),
  cacheKey: varchar("cacheKey", { length: 255 }).notNull().unique(),
  cacheData: text("cacheData").notNull(), // JSON
  cacheType: mysqlEnum("cacheType", ["suburb_heatmap", "city_trends", "popular_areas", "price_predictions", "user_recommendations"]).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MarketInsightsCache = typeof marketInsightsCache.$inferSelect;
export type InsertMarketInsightsCache = typeof marketInsightsCache.$inferInsert;

// Price Prediction Models
export const pricePredictions = mysqlTable("price_predictions", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").references(() => properties.id, { onDelete: "cascade" }),
  suburbId: int("suburbId").references(() => suburbs.id, { onDelete: "cascade" }),
  cityId: int("cityId").references(() => cities.id, { onDelete: "cascade" }),
  provinceId: int("provinceId").references(() => provinces.id, { onDelete: "cascade" }),
  
  // Prediction Details
  predictedPrice: int("predictedPrice").notNull(),
  predictedPriceRangeMin: int("predictedPriceRangeMin"),
  predictedPriceRangeMax: int("predictedPriceRangeMax"),
  confidenceScore: int("confidenceScore").default(0), // percentage * 100
  
  // Model Information
  modelVersion: varchar("modelVersion", { length: 50 }),
  modelFeatures: text("modelFeatures"), // JSON
  trainingDataSize: int("trainingDataSize"),
  
  // Validation
  actualPrice: int("actualPrice"), // When property is sold/rented
  predictionError: int("predictionError"), // Absolute error
  predictionAccuracy: int("predictionAccuracy"), // Percentage accuracy
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  validatedAt: timestamp("validatedAt"),
});

export type PricePrediction = typeof pricePredictions.$inferSelect;
export type InsertPricePrediction = typeof pricePredictions.$inferInsert;

// Property Similarity Index
export const propertySimilarityIndex = mysqlTable("property_similarity_index", {
  id: int("id").autoincrement().primaryKey(),
  propertyId1: int("propertyId1").notNull().references(() => properties.id, { onDelete: "cascade" }),
  propertyId2: int("propertyId2").notNull().references(() => properties.id, { onDelete: "cascade" }),
  
  // Similarity Metrics
  locationSimilarity: int("locationSimilarity").default(0), // percentage * 100
  priceSimilarity: int("priceSimilarity").default(0),
  typeSimilarity: int("typeSimilarity").default(0),
  featureSimilarity: int("featureSimilarity").default(0),
  overallSimilarity: int("overallSimilarity").default(0),
  
  // Context
  similarityReason: text("similarityReason"), // JSON
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PropertySimilarityIndex = typeof propertySimilarityIndex.$inferSelect;
export type InsertPropertySimilarityIndex = typeof propertySimilarityIndex.$inferInsert;

// Analytics Aggregations
export const analyticsAggregations = mysqlTable("analytics_aggregations", {
  id: int("id").autoincrement().primaryKey(),
  aggregationType: mysqlEnum("aggregationType", ["daily", "weekly", "monthly"]).notNull(),
  aggregationDate: varchar("aggregationDate", { length: 10 }).notNull(), // YYYY-MM-DD
  
  // Geographic Aggregations
  suburbId: int("suburbId").references(() => suburbs.id, { onDelete: "cascade" }),
  cityId: int("cityId").references(() => cities.id, { onDelete: "cascade" }),
  provinceId: int("provinceId").references(() => provinces.id, { onDelete: "cascade" }),
  
  // Property Type Aggregations
  propertyType: varchar("propertyType", { length: 50 }),
  listingType: varchar("listingType", { length: 50 }),
  
  // Metrics
  totalProperties: int("totalProperties").default(0),
  activeListings: int("activeListings").default(0),
  avgPrice: int("avgPrice"),
  medianPrice: int("medianPrice"),
  minPrice: int("minPrice"),
  maxPrice: int("maxPrice"),
  pricePerSqmAvg: int("pricePerSqmAvg"),
  
  // User Activity
  totalViews: int("totalViews").default(0),
  totalSaves: int("totalSaves").default(0),
  totalContacts: int("totalContacts").default(0),
  uniqueVisitors: int("uniqueVisitors").default(0),
  
  // Market Velocity
  newListings: int("newListings").default(0),
  soldProperties: int("soldProperties").default(0),
  rentedProperties: int("rentedProperties").default(0),
  avgDaysOnMarket: int("avgDaysOnMarket"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AnalyticsAggregation = typeof analyticsAggregations.$inferSelect;
export type InsertAnalyticsAggregation = typeof analyticsAggregations.$inferInsert;
