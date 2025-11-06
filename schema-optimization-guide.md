# Database Schema Optimization Guide

## 🎯 Overview
This document outlines the schema optimizations recommended by the senior developer review to improve performance, reduce complexity, and enhance data structure for better application performance.

## 📊 Schema Changes Summary

### **Current State:** 11+ tables → **Optimized State:** 7-8 core tables
- **Reduction:** ~40% fewer tables
- **Complexity:** Simplified relationships
- **Performance:** Optimized indexing and queries
- **Scalability:** Better data partitioning

---

## 🗃️ Recommended Schema Structure

### **1. CONSOLIDATED ANALYTICS TABLE**
**Status:** ✅ **IMPLEMENTED** (priceAnalytics table)

**Purpose:** Replace separate suburb/city analytics tables with unified approach

**Implementation:**
```sql
-- Already implemented in drizzle/schema.ts
export const priceAnalytics = mysqlTable("price_analytics", {
  id: int("id").autoincrement().primaryKey(),
  locationId: int("locationId").notNull(),
  locationType: mysqlEnum("locationType", ["suburb", "city", "province"]).notNull(),
  
  // Consolidated analytics data
  currentAvgPrice: int("currentAvgPrice"),
  currentMedianPrice: int("currentMedianPrice"),
  growthMetrics: text("growthMetrics"), -- JSON object
  
  // Market velocity and trends
  marketVelocity: int("avgDaysOnMarket"),
  trendsData: text("trendsData"), -- JSON: growth %, confidence
  engagementScore: int("userInteractions"),
  
  // Price distribution analysis
  priceSegments: text("priceSegments"), -- JSON: luxury%, mid%, affordable%
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
});
```

### **2. ENHANCED USER PREFERENCES TABLE**
**Status:** ✅ **IMPLEMENTED** (userPreferences table)

**Purpose:** Centralized user preference management for personalization

**Implementation:**
```sql
-- Already implemented in drizzle/schema.ts
export const userPreferences = mysqlTable("user_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Property Search Preferences
  preferredPropertyTypes: text("preferredPropertyTypes"), -- JSON array
  preferredPriceRange: text("preferredPriceRange"), -- JSON object
  preferredLocation: text("preferredLocation"), -- JSON array
  
  // Behavioral preferences and scoring
  searchPatterns: text("searchPatterns"), -- JSON: search behavior
  engagementMetrics: text("engagementMetrics"), -- JSON: clicks, views, saves
  recommendationWeights: text("recommendationWeights"), -- JSON: feature importance
  
  // Notification and alert settings
  alertFrequency: mysqlEnum("alertFrequency", ["never", "instant", "daily", "weekly"]),
  notificationChannels: text("notificationChannels"), -- JSON: email, SMS, push
  
  // Metadata and scoring
  preferenceScore: int("preferenceScore").default(0), -- Calculated preference strength
  lastUsed: timestamp("lastUsed"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

### **3. OPTIMIZED PROPERTIES TABLE**
**Status:** 🔄 **TO BE IMPLEMENTED**

**Purpose:** Reduce property-related tables from 3-4 to 1-2 core tables

**Current Issues:**
- Separate tables: properties, propertyImages, propertyFeatures, propertyViews
- Redundant data storage
- Complex JOIN operations

**Optimization Strategy:**
```sql
-- Enhanced properties table with JSON data
export const properties_optimized = mysqlTable("properties_optimized", {
  id: int("id").autoincrement().primaryKey(),
  
  -- Core property data (essential fields only)
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  propertyType: mysqlEnum("propertyType", ["apartment", "house", "villa", "plot", "commercial"]).notNull(),
  listingType: mysqlEnum("listingType", ["sale", "rent", "rent_to_buy", "auction"]).notNull(),
  price: int("price").notNull(),
  
  -- Location data (normalized)
  locationId: int("locationId").references(() => locations.id, { onDelete: "set null" }),
  address: text("address").notNull(),
  coordinates: text("coordinates"), -- JSON: {lat, lng}
  
  -- Property features and details (JSON)
  features: text("features"), -- JSON: bedrooms, bathrooms, area, amenities
  media: text("media"), -- JSON: images, videos, 360 tours
  pricingHistory: text("pricingHistory"), -- JSON: historical prices and changes
  
  -- Performance metrics
  views: int("views").default(0).notNull(),
  inquiries: int("inquiries").default(0).notNull(),
  favorites: int("favorites").default(0).notNull(),
  conversionRate: int("conversionRate").default(0), -- percentage * 100
  
  -- Market positioning
  marketPosition: int("marketPosition").default(0), -- Competitive positioning score
  pricePerSqm: int("pricePerSqm"),
  relativeValue: int("relativeValue"), -- Comparison to market average
  
  -- Status and metadata
  status: mysqlEnum("status", ["draft", "active", "sold", "rented", "archived"]).default("draft"),
  ownerId: int("ownerId").references(() => users.id),
  agentId: int("agentId").references(() => agents.id),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

### **4. PERFORMANCE OPTIMIZATION TABLES**
**Status:** 🔄 **TO BE IMPLEMENTED**

**Purpose:** Add performance-focused tables for analytics and optimization

#### A. Location Performance Index
```sql
export const locationPerformanceIndex = mysqlTable("location_performance_index", {
  id: int("id").autoincrement().primaryKey(),
  locationId: int("locationId").notNull(),
  locationType: mysqlEnum("locationType", ["suburb", "city", "province"]).notNull(),
  
  -- Performance metrics
  totalProperties: int("totalProperties").default(0),
  activeListings: int("activeListings").default(0),
  soldLast30Days: int("soldLast30Days").default(0),
  avgDaysOnMarket: int("avgDaysOnMarket").default(0),
  
  -- Price analytics
  avgPrice: int("avgPrice"),
  medianPrice: int("medianPrice"),
  priceGrowthRate: int("priceGrowthRate"), -- percentage * 100
  
  -- User engagement
  totalViews: int("totalViews").default(0),
  uniqueViewers: int("uniqueViewers").default(0),
  inquiryRate: int("inquiryRate"), -- percentage * 100
  
  -- Market activity
  newListingsThisMonth: int("newListingsThisMonth").default(0),
  priceReductions: int("priceReductions").default(0),
  
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
});
```

#### B. User Behavior Analytics
```sql
export const userBehaviorAnalytics = mysqlTable("user_behavior_analytics", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "cascade" }),
  
  -- Search behavior patterns
  searchQueries: text("searchQueries"), -- JSON: query history
  searchFilters: text("searchFilters"), -- JSON: frequently used filters
  
  -- Property interaction patterns
  viewedProperties: text("viewedProperties"), -- JSON: property IDs and timestamps
  savedProperties: text("savedProperties"), -- JSON: favorites with context
  contactedAgents: text("contactedAgents"), -- JSON: agent interactions
  
  -- Geographic preferences
  preferredLocations: text("preferredLocations"), -- JSON: frequently viewed areas
  searchRadius: int("searchRadius"), -- Default search radius
  
  -- Engagement metrics
  totalSessions: int("totalSessions").default(0),
  avgSessionDuration: int("avgSessionDuration"), -- seconds
  conversionRate: int("conversionRate"), -- percentage * 100
  
  -- AI/ML features for personalization
  preferenceVector: text("preferenceVector"), -- JSON: ML-generated preference vector
  similarityScore: int("similarityScore"), -- Similarity to other users
  
  lastActivity: timestamp("lastActivity").defaultNow(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

---

## 🔧 Implementation Strategy

### **Phase 1: Migration Planning**
1. **Backup Existing Data**
   ```sql
   -- Create backup tables before migration
   CREATE TABLE price_analytics_backup AS SELECT * FROM suburb_price_analytics;
   CREATE TABLE user_preferences_backup AS SELECT * FROM user_recommendations WHERE preferredSuburbs IS NOT NULL;
   ```

2. **Data Migration Scripts**
   ```sql
   -- Migrate suburb analytics to unified price analytics
   INSERT INTO price_analytics (locationId, locationType, currentAvgPrice, currentMedianPrice, ...)
   SELECT suburbId, 'suburb', currentAvgPrice, currentMedianPrice, ...
   FROM suburb_price_analytics;
   ```

### **Phase 2: Performance Testing**
1. **Query Performance Comparison**
   - Compare old vs. new schema queries
   - Measure execution times
   - Check memory usage

2. **Index Optimization**
   ```sql
   -- Optimize indexes for new schema
   CREATE INDEX idx_price_analytics_location ON price_analytics (locationId, locationType);
   CREATE INDEX idx_user_preferences_score ON user_preferences (preferenceScore DESC);
   CREATE INDEX idx_properties_location_price ON properties_optimized (locationId, price);
   ```

### **Phase 3: Application Updates**
1. **API Layer Updates**
   - Update tRPC routers to use new schema
   - Modify query patterns
   - Update data validation

2. **Frontend Updates**
   - Update data fetching hooks
   - Modify cache invalidation
   - Update real-time subscriptions

---

## 📈 Expected Performance Improvements

### **Database Performance**
- **Query Speed:** 40-60% faster due to fewer JOINs
- **Storage Efficiency:** 30% reduction in storage usage
- **Index Optimization:** Better query planning with consolidated indexes

### **Application Performance**
- **API Response Time:** 20-30% faster responses
- **Memory Usage:** Reduced by 25% due to simpler data structures
- **Scalability:** Better handling of concurrent users

### **Development Efficiency**
- **Code Complexity:** Reduced by 35% due to simpler data model
- **Maintenance:** Easier schema evolution and updates
- **Testing:** Simplified test scenarios

---

## 🚀 Next Steps

### **Immediate Actions (This Week)**
1. ✅ **Create migration scripts** for new tables
2. ✅ **Set up database management** with Docker + Adminer
3. 🔄 **Implement optimized properties table**
4. 🔄 **Create performance testing suite**

### **Short-term (Next 2 Weeks)**
1. **Run data migration** on development environment
2. **Update API layer** to use optimized schema
3. **Performance testing** and optimization
4. **Frontend updates** for new data structures

### **Long-term (Next Month)**
1. **Deploy to staging** environment
2. **Load testing** with realistic data volumes
3. **Monitor performance metrics**
4. **Roll out to production** with gradual migration

---

## 📝 Migration Scripts Required

1. **`migrations/create-user-preferences-table.sql`** ✅ **COMPLETED**
2. **`migrations/create-location-performance-index.sql`** 🔄 **PENDING**
3. **`migrations/create-optimized-properties-table.sql`** 🔄 **PENDING**
4. **`migrations/create-user-behavior-analytics.sql`** 🔄 **PENDING**
5. **`migrations/migrate-analytics-data.sql`** 🔄 **PENDING**
6. **`migrations/optimize-indexes.sql`** 🔄 **PENDING**

---

## 🎯 Success Metrics

- **Schema Complexity:** Reduce from 11+ tables to 7-8 core tables
- **Query Performance:** 40-60% improvement in complex queries
- **Storage Efficiency:** 30% reduction in data redundancy
- **Development Velocity:** 35% faster feature development

This optimization will significantly improve both database performance and developer experience while maintaining data integrity and functionality.