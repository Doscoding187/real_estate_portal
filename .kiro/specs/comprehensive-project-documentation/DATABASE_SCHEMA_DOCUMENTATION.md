# Complete Database Schema Documentation

## Overview

This document provides a comprehensive overview of the database schema for the real estate platform, documenting all tables, columns, relationships, and the data we can store based on our 18+ major specifications.

## Database Statistics

- **Total Tables**: 80+ tables
- **Database Engine**: MySQL with Drizzle ORM
- **Key Features**: Full-text search, JSON columns, spatial data, performance indexes
- **Migration System**: Drizzle migrations with rollback support

## Core Entity Categories

### 1. User Management & Authentication
- **users** - Core user accounts with role-based access
- **userSubscriptions** - Subscription management and billing
- **userPreferences** - User search and notification preferences
- **userRecommendations** - AI-powered user recommendations
- **userBehaviorEvents** - User interaction tracking

### 2. Location Intelligence System
- **provinces** - South African provinces with SEO optimization
- **cities** - Cities with Google Places integration
- **suburbs** - Suburbs with AI-generated insights
- **locations** - Unified location hierarchy
- **locationSearches** - Search trend tracking
- **recentSearches** - User search history
- **locationAnalyticsEvents** - Location interaction analytics

### 3. Property Management
- **properties** - Core property listings
- **propertyImages** - Property media management
- **listings** - Enhanced listing management with approval workflow
- **listingMedia** - Advanced media processing
- **listingAnalytics** - Property performance metrics
- **listingLeads** - Lead capture and management

### 4. Development Management
- **developers** - Property developer accounts
- **developerBrandProfiles** - Platform-owned brand data
- **developments** - Property developments with phases
- **developmentPhases** - Multi-phase development support
- **developmentUnits** - Individual unit management
- **developmentApprovalQueue** - Content approval workflow
- **developmentDrafts** - Draft management system

### 5. Unit Types & Specifications
- **unitTypes** - Base unit configurations
- **specVariations** - Spec variations and pricing
- **developmentDocuments** - Document management

### 6. Agency & Agent Management
- **agencies** - Real estate agencies
- **agents** - Individual agent profiles
- **agentCoverageAreas** - Agent service areas
- **agencyBranding** - White-label branding
- **agencySubscriptions** - Agency billing management

### 7. Lead Management & CRM
- **leads** - Comprehensive lead tracking
- **leadActivities** - Lead interaction history
- **prospects** - Anonymous prospect tracking
- **scheduledViewings** - Viewing management
- **offers** - Offer management system

### 8. Explore Discovery Engine
- **exploreContent** - Unified content system
- **exploreShorts** - Short-form video content
- **exploreVideos** - Video management
- **exploreCategories** - Lifestyle categories
- **exploreTopics** - Topic-based navigation
- **exploreInteractions** - User engagement tracking
- **exploreUserPreferences** - Personalization engine

### 9. Partner Marketplace
- **explorePartners** - Partner ecosystem
- **partnerTiers** - Partner tier configuration
- **topics** - Intent-based navigation
- **contentApprovalQueue** - Content governance
- **partnerSubscriptions** - Partner billing
- **partnerLeads** - Lead generation system

### 10. Analytics & Insights
- **priceAnalytics** - Market price intelligence
- **priceHistory** - Historical price tracking
- **pricePredictions** - AI price predictions
- **analyticsAggregations** - Performance aggregations
- **searchAnalytics** - Search behavior analysis

## Detailed Table Specifications

### Core User Tables

#### users
```sql
- id: INT PRIMARY KEY AUTO_INCREMENT
- openId: VARCHAR(64) - OAuth integration
- email: VARCHAR(320) - User email
- passwordHash: VARCHAR(255) - Encrypted password
- name: TEXT - Full name
- firstName: VARCHAR(100)
- lastName: VARCHAR(100)
- phone: VARCHAR(30)
- loginMethod: VARCHAR(64) - OAuth provider
- emailVerified: INT - Verification status
- role: ENUM('visitor','agent','agency_admin','property_developer','super_admin')
- agencyId: INT - Agency association
- isSubaccount: INT - Sub-account flag
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
- lastSignedIn: TIMESTAMP
- passwordResetToken: VARCHAR(255)
- passwordResetTokenExpiresAt: TIMESTAMP
- emailVerificationToken: VARCHAR(255)
```

#### userSubscriptions
```sql
- id: INT PRIMARY KEY AUTO_INCREMENT
- userId: INT - Foreign key to users
- planId: VARCHAR(100) - Subscription plan identifier
- status: ENUM('trial_active','trial_expired','active_paid','past_due','cancelled','downgraded','grace_period')
- trialStartedAt: TIMESTAMP
- trialEndsAt: TIMESTAMP
- currentPeriodStart: TIMESTAMP
- currentPeriodEnd: TIMESTAMP
- stripeSubscriptionId: VARCHAR(255)
- stripeCustomerId: VARCHAR(255)
- paystackSubscriptionCode: VARCHAR(255)
- amountZar: INT - Amount in ZAR cents
- billingInterval: ENUM('monthly','yearly')
- nextBillingDate: TIMESTAMP
```

### Location Intelligence Tables

#### provinces
```sql
- id: INT PRIMARY KEY AUTO_INCREMENT
- name: VARCHAR(100) NOT NULL
- slug: VARCHAR(200) UNIQUE - SEO-friendly URL
- placeId: VARCHAR(255) - Google Places ID
- seoTitle: VARCHAR(255) - SEO title
- seoDescription: TEXT - SEO description
- code: VARCHAR(10) - Province code
- latitude: VARCHAR(20)
- longitude: VARCHAR(21)
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
```

#### cities
```sql
- id: INT PRIMARY KEY AUTO_INCREMENT
- provinceId: INT - Foreign key to provinces
- name: VARCHAR(150) NOT NULL
- slug: VARCHAR(200) - SEO-friendly URL
- placeId: VARCHAR(255) - Google Places ID
- seoTitle: VARCHAR(255)
- seoDescription: TEXT
- latitude: VARCHAR(20)
- longitude: VARCHAR(21)
- isMetro: INT - Metro area flag
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
```

#### suburbs
```sql
- id: INT PRIMARY KEY AUTO_INCREMENT
- cityId: INT - Foreign key to cities
- name: VARCHAR(200) NOT NULL
- slug: VARCHAR(200) - SEO-friendly URL
- placeId: VARCHAR(255) - Google Places ID
- seoTitle: VARCHAR(255)
- seoDescription: TEXT
- latitude: VARCHAR(20)
- longitude: VARCHAR(21)
- postalCode: VARCHAR(10)
- pros: JSON - AI-generated pros
- cons: JSON - AI-generated cons
- aiGenerationDate: TIMESTAMP
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
```

### Property Management Tables

#### properties
```sql
- id: INT PRIMARY KEY AUTO_INCREMENT
- title: VARCHAR(255) NOT NULL
- description: TEXT NOT NULL
- propertyType: ENUM('apartment','house','villa','plot','commercial','townhouse','cluster_home','farm','shared_living')
- listingType: ENUM('sale','rent','rent_to_buy','auction','shared_living')
- transactionType: ENUM('sale','rent','rent_to_buy','auction')
- price: INT NOT NULL - Price in cents
- bedrooms: INT
- bathrooms: INT
- area: INT - Area in square meters
- address: TEXT NOT NULL
- city: VARCHAR(100)
- province: VARCHAR(100)
- zipCode: VARCHAR(20)
- latitude: VARCHAR(50)
- longitude: VARCHAR(50)
- provinceId: INT - Foreign key to provinces
- cityId: INT - Foreign key to cities
- suburbId: INT - Foreign key to suburbs
- locationId: INT - Foreign key to locations
- locationText: TEXT
- placeId: VARCHAR(255) - Google Places ID
- amenities: TEXT
- yearBuilt: INT
- status: ENUM('available','sold','rented','pending','draft','published','archived')
- featured: INT - Featured flag
- views: INT - View count
- enquiries: INT - Enquiry count
- agentId: INT - Foreign key to agents
- developmentId: INT - Foreign key to developments
- developerBrandProfileId: INT - Foreign key to developer brand profiles
- ownerId: INT - Foreign key to users
- propertySettings: TEXT - JSON settings
- videoUrl: TEXT
- virtualTourUrl: TEXT
- levies: INT - Monthly levies in cents
- ratesAndTaxes: INT - Monthly rates in cents
- mainImage: VARCHAR(1024)
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
```

### Development Management Tables

#### developers
```sql
- id: INT PRIMARY KEY AUTO_INCREMENT
- name: VARCHAR(255) NOT NULL
- slug: VARCHAR(255) - SEO-friendly URL
- description: TEXT
- logo: TEXT - Logo URL
- website: VARCHAR(255)
- email: VARCHAR(320)
- phone: VARCHAR(50)
- address: TEXT
- city: VARCHAR(100)
- province: VARCHAR(100)
- category: ENUM('residential','commercial','mixed_use','industrial')
- establishedYear: INT
- totalProjects: INT
- rating: INT - Rating out of 5
- reviewCount: INT
- isVerified: INT - Verification status
- userId: INT - Foreign key to users
- status: ENUM('pending','approved','rejected')
- rejectionReason: TEXT
- approvedBy: INT - Foreign key to users
- approvedAt: TIMESTAMP
- kpiCache: JSON - Cached KPI data
- lastKpiCalculation: TIMESTAMP
- completedProjects: INT
- currentProjects: INT
- upcomingProjects: INT
- trackRecord: TEXT
- specializations: JSON
- isTrusted: BOOLEAN
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
```

#### developments
```sql
- id: INT PRIMARY KEY AUTO_INCREMENT
- developerId: INT - Foreign key to developers
- developerBrandProfileId: INT - Foreign key to developer brand profiles
- marketingBrandProfileId: INT - Marketing agency brand profile
- marketingRole: ENUM('exclusive', 'joint', 'open')
- name: VARCHAR(255) NOT NULL
- tagline: VARCHAR(255) - Marketing tagline
- marketingName: VARCHAR(255) - Optional branding name
- slug: VARCHAR(255) UNIQUE
- description: TEXT
- rating: DECIMAL(3,2) - Auto-calculated rating
- developmentType: ENUM('residential','commercial','mixed_use','estate','complex')
- status: ENUM('launching-soon','selling','sold-out')
- address: TEXT
- city: VARCHAR(100) NOT NULL
- province: VARCHAR(100) NOT NULL
- suburb: VARCHAR(100)
- locationId: INT - Foreign key to locations
- postalCode: VARCHAR(20)
- latitude: VARCHAR(50)
- longitude: VARCHAR(50)
- gpsAccuracy: ENUM('accurate', 'approximate')
- totalUnits: INT
- availableUnits: INT
- priceFrom: INT - Price from in cents
- priceTo: INT - Price to in cents
- amenities: JSON - Development amenities array
- highlights: JSON - Up to 5 development highlights
- features: JSON - Estate-level features
- estateSpecs: JSON - Structured specifications
- images: TEXT - Image URLs
- videos: TEXT - Video URLs
- floorPlans: TEXT - Floor plan URLs
- brochures: TEXT - Brochure URLs
- completionDate: TIMESTAMP
- isFeatured: INT
- isPublished: INT
- publishedAt: TIMESTAMP
- approvalStatus: ENUM('draft', 'pending', 'approved', 'rejected')
- readinessScore: INT - Content readiness score
- rejectionReasons: JSON
- rejectionNote: TEXT
- showHouseAddress: INT
- views: INT
- inquiriesCount: INT
- demandScore: INT
- isHotSelling: INT
- nature: ENUM('new', 'phase', 'extension', 'redevelopment')
- totalDevelopmentArea: INT - Area in square meters
- propertyTypes: JSON - Multi-select property types
- customClassification: VARCHAR(255)
- monthlyLevyFrom: DECIMAL(10,2)
- monthlyLevyTo: DECIMAL(10,2)
- ratesFrom: DECIMAL(10,2)
- ratesTo: DECIMAL(10,2)
- transferCostsIncluded: TINYINT
- isHighDemand: INT
- devOwnerType: ENUM('platform', 'developer')
- isShowcase: TINYINT
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
```

### Unit Types & Specifications

#### unitTypes
```sql
- id: VARCHAR(36) PRIMARY KEY
- developmentId: INT - Foreign key to developments
- label: VARCHAR(255)
- name: VARCHAR(255) NOT NULL
- description: TEXT
- ownershipType: ENUM('full-title', 'sectional-title', 'leasehold', 'life-rights')
- structuralType: ENUM('apartment', 'freestanding-house', 'simplex', 'duplex', 'penthouse', 'plot-and-plan', 'townhouse', 'studio')
- floors: ENUM('single-storey', 'double-storey', 'triplex')
- bedrooms: INT NOT NULL
- bathrooms: DECIMAL(3,1) NOT NULL
- parking: ENUM('none', '1', '2', 'carport', 'garage')
- parkingType: VARCHAR(50)
- parkingBays: INT
- unitSize: INT - Size in square meters
- yardSize: INT - Yard size in square meters
- sizeFrom: INT
- sizeTo: INT
- priceFrom: DECIMAL(15,2)
- priceTo: DECIMAL(15,2)
- basePriceFrom: DECIMAL(15,2) NOT NULL
- basePriceTo: DECIMAL(15,2)
- depositRequired: DECIMAL(15,2)
- totalUnits: INT
- availableUnits: INT
- reservedUnits: INT
- completionDate: DATE
- transferCostsIncluded: TINYINT
- monthlyLevy: INT
- monthlyLevyFrom: INT
- monthlyLevyTo: INT
- ratesAndTaxesFrom: INT
- ratesAndTaxesTo: INT
- extras: JSON - Pricing extras array
- baseFeatures: JSON - Default features
- baseFinishes: JSON - Base finishes
- baseMedia: JSON - Inherited media
- specOverrides: JSON
- specifications: JSON
- amenities: JSON
- features: JSON
- configDescription: TEXT
- virtualTourLink: VARCHAR(500)
- internalNotes: TEXT
- displayOrder: INT
- isActive: TINYINT
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
```

### Explore Discovery Engine

#### exploreContent
```sql
- id: INT PRIMARY KEY AUTO_INCREMENT
- contentType: VARCHAR(50) NOT NULL
- referenceId: INT NOT NULL
- creatorId: INT
- creatorType: ENUM('user', 'agent', 'developer', 'agency')
- agencyId: INT
- partnerId: VARCHAR(36)
- contentCategory: ENUM('primary', 'secondary', 'tertiary')
- badgeType: VARCHAR(50)
- isLaunchContent: BOOLEAN
- title: VARCHAR(255)
- description: TEXT
- thumbnailUrl: VARCHAR(500)
- videoUrl: VARCHAR(500)
- metadata: JSON
- tags: JSON
- lifestyleCategories: JSON
- locationLat: DECIMAL(10,8)
- locationLng: DECIMAL(11,8)
- priceMin: INT
- priceMax: INT
- viewCount: INT
- engagementScore: DECIMAL(5,2)
- isActive: TINYINT
- isFeatured: TINYINT
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
```

#### exploreShorts
```sql
- id: INT PRIMARY KEY AUTO_INCREMENT
- listingId: INT
- developmentId: INT
- agentId: INT
- developerId: INT
- agencyId: INT
- partnerId: VARCHAR(36)
- contentType: ENUM('property_tour', 'development_promo', 'agent_intro', 'neighbourhood_tour', 'market_insight', 'lifestyle', 'education')
- topicId: INT - Foreign key to explore topics
- categoryId: INT - Foreign key to explore categories
- contentCategory: ENUM('primary', 'secondary', 'tertiary')
- badgeType: VARCHAR(50)
- isLaunchContent: BOOLEAN
- title: VARCHAR(255) NOT NULL
- caption: TEXT
- primaryMediaId: INT NOT NULL
- mediaIds: JSON NOT NULL
- highlights: JSON
- performanceScore: DECIMAL(5,2)
- boostPriority: INT
- viewCount: INT
- uniqueViewCount: INT
- saveCount: INT
- shareCount: INT
- skipCount: INT
- averageWatchTime: INT
- viewThroughRate: DECIMAL(5,2)
- saveRate: DECIMAL(5,2)
- shareRate: DECIMAL(5,2)
- skipRate: DECIMAL(5,2)
- isPublished: TINYINT
- isFeatured: TINYINT
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
- publishedAt: TIMESTAMP
```

### Partner Marketplace

#### explorePartners
```sql
- id: VARCHAR(36) PRIMARY KEY
- userId: VARCHAR(36) NOT NULL
- tierId: INT - Foreign key to partner tiers
- companyName: VARCHAR(255) NOT NULL
- description: TEXT
- logoUrl: VARCHAR(500)
- verificationStatus: ENUM('pending', 'verified', 'rejected')
- trustScore: DECIMAL(5,2)
- serviceLocations: JSON
- approvedContentCount: INT
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
```

#### topics
```sql
- id: VARCHAR(36) PRIMARY KEY
- slug: VARCHAR(100) UNIQUE NOT NULL
- name: VARCHAR(100) NOT NULL
- description: TEXT
- icon: VARCHAR(50)
- displayOrder: INT
- isActive: BOOLEAN
- contentTags: JSON
- propertyFeatures: JSON
- partnerCategories: JSON
- createdAt: TIMESTAMP
```

### Analytics & Insights

#### priceAnalytics
```sql
- id: INT PRIMARY KEY AUTO_INCREMENT
- locationId: INT NOT NULL
- locationType: ENUM('suburb','city','province')
- currentAvgPrice: INT
- currentMedianPrice: INT
- currentMinPrice: INT
- currentMaxPrice: INT
- currentPriceCount: INT
- oneMonthGrowthPercent: INT
- threeMonthGrowthPercent: INT
- sixMonthGrowthPercent: INT
- oneYearGrowthPercent: INT
- luxurySegmentPercent: INT
- midRangePercent: INT
- affordablePercent: INT
- avgDaysOnMarket: INT
- newListingsMonthly: INT
- soldPropertiesMonthly: INT
- trendingDirection: ENUM('up','down','stable')
- trendConfidence: INT
- totalProperties: INT
- activeListings: INT
- userInteractions: INT
- priceVolatility: INT
- marketMomentum: INT
- investmentScore: INT
- lastUpdated: TIMESTAMP
```

## Key Relationships

### User-Centric Relationships
- users → userSubscriptions (1:1)
- users → userPreferences (1:1)
- users → developers (1:many)
- users → agents (1:1)
- users → properties (1:many)

### Location Hierarchy
- provinces → cities (1:many)
- cities → suburbs (1:many)
- locations → properties (1:many)
- locations → developments (1:many)

### Development Structure
- developers → developments (1:many)
- developments → developmentPhases (1:many)
- developments → unitTypes (1:many)
- unitTypes → specVariations (1:many)

### Content & Discovery
- exploreContent → exploreShorts (1:1)
- exploreContent → exploreEngagements (1:many)
- explorePartners → exploreContent (1:many)
- topics → contentTopics (1:many)

## Performance Indexes

### Critical Performance Indexes
```sql
-- Location-based searches
CREATE INDEX idx_properties_location_price ON properties(locationId, price);
CREATE INDEX idx_developments_location_status ON developments(locationId, status);

-- User activity
CREATE INDEX idx_user_behavior_events_user_created ON user_behavior_events(userId, createdAt);
CREATE INDEX idx_explore_engagements_user_content ON explore_engagements(userId, contentId);

-- Content discovery
CREATE INDEX idx_explore_content_active_engagement ON explore_content(isActive, engagementScore DESC);
CREATE INDEX idx_explore_shorts_agency_performance ON explore_shorts(agencyId, performanceScore DESC);

-- Analytics
CREATE INDEX idx_price_analytics_location_type ON price_analytics(locationId, locationType);
CREATE INDEX idx_analytics_aggregations_date ON analytics_aggregations(aggregationDate);
```

## Data Storage Capabilities

Based on our comprehensive schema, we can store:

### User Data
- Complete user profiles with preferences
- Subscription and billing history
- Behavioral analytics and recommendations
- Search history and saved properties

### Property Data
- Detailed property listings with media
- Development projects with phases and units
- Pricing history and market analytics
- Virtual tours and documentation

### Location Intelligence
- Complete South African location hierarchy
- Google Places integration
- SEO-optimized location pages
- Market insights and trends

### Content & Discovery
- Short-form video content
- Lifestyle categorization
- Partner marketplace content
- User engagement tracking

### Business Intelligence
- Lead management and conversion tracking
- Performance analytics and KPIs
- Market trend analysis
- Revenue and subscription metrics

### Developer Tools
- Multi-phase development management
- Unit type configurations
- Approval workflows
- Brand profile management

## Migration History

Our database has evolved through 50+ migrations including:
- Initial schema setup
- Google Places integration
- Explore discovery engine
- Partner marketplace
- Unit types system
- Performance optimizations
- Analytics enhancements

## Security & Compliance

- Password hashing with bcrypt
- OAuth integration support
- Audit logging for sensitive operations
- GDPR-compliant user data handling
- Role-based access control
- API rate limiting support

This comprehensive schema supports our platform's full feature set including property listings, development management, content discovery, partner marketplace, and advanced analytics capabilities.