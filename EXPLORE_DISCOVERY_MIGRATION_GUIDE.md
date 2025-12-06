# Explore Discovery Engine - Migration Guide

## Overview
This guide explains how to run the Explore Discovery Engine database migration.

## Prerequisites
- TiDB database connection configured
- DATABASE_URL environment variable set in `.env` file

## Migration File
- **Location**: `drizzle/migrations/create-explore-discovery-engine.sql`
- **Runner Script**: `scripts/run-explore-discovery-migration.ts`

## Tables Created
The migration creates 11 tables for the Explore Discovery Engine:

1. **explore_content** - Main content table for all Explore items
2. **explore_discovery_videos** - Video-specific metadata and analytics
3. **explore_neighbourhoods** - Neighbourhood detail pages
4. **explore_user_preferences_new** - User personalization preferences
5. **explore_feed_sessions** - Session tracking for analytics
6. **explore_engagements** - Engagement tracking (views, saves, shares, clicks)
7. **explore_boost_campaigns** - Paid promotion campaigns
8. **explore_saved_properties** - User saved properties
9. **explore_neighbourhood_follows** - Neighbourhood following
10. **explore_creator_follows** - Creator following
11. **explore_categories** - Lifestyle categories (seeded with 10 default categories)

## Setup Instructions

### 1. Configure Database Connection

Add your TiDB connection string to `.env`:

```env
DATABASE_URL=mysql://username:password@host:port/database?ssl={"rejectUnauthorized":true}
```

**TiDB Connection String Format:**
```
mysql://[username]:[password]@[host]:[port]/[database]?ssl={"rejectUnauthorized":true}
```

Example:
```
DATABASE_URL=mysql://user123:pass456@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/real_estate_portal?ssl={"rejectUnauthorized":true}
```

### 2. Run the Migration

Execute the migration script:

```bash
npx tsx scripts/run-explore-discovery-migration.ts
```

### 3. Verify Migration

Check that all tables were created successfully:

```bash
npx tsx scripts/check-explore-tables.ts
```

## Migration Features

### Indexes
- Location-based indexes for spatial queries
- Engagement score indexes for performance
- Creator and content type indexes for filtering
- Composite indexes for common query patterns

### Foreign Keys
- Proper cascade deletes for data integrity
- SET NULL for optional relationships
- References to users, properties, and developments tables

### Data Types
- JSON fields for flexible metadata storage
- DECIMAL for precise price and rating values
- TIMESTAMP for temporal tracking
- VARCHAR with appropriate lengths for text fields

### Default Data
- 10 lifestyle categories pre-seeded:
  - Secure Estates
  - Luxury
  - Family Living
  - Student Living
  - Urban Living
  - Pet-Friendly
  - Retirement
  - Investment
  - Eco-Friendly
  - Beach Living

## Troubleshooting

### Error: "DATABASE_URL: missing"
- Ensure `.env` file exists in project root
- Verify DATABASE_URL is set in `.env`
- Check that the connection string format is correct

### Error: "Cannot read properties of null"
- Database connection failed
- Verify TiDB credentials are correct
- Check network connectivity to TiDB
- Ensure SSL configuration is correct

### Error: "Table already exists"
- Migration will skip existing tables automatically
- Safe to re-run if partially completed

## Requirements Covered
This migration satisfies the following requirements from the Explore Discovery Engine spec:
- Requirements 1.1 (Video feed infrastructure)
- Requirements 2.1 (Personalization system)
- Requirements 3.1 (Map hybrid view data)
- Requirements 5.1 (Neighbourhood pages)
- Requirements 7.1 (Mixed content feed)
- Requirements 12.1 (Content blocks)

## Next Steps
After successful migration:
1. Verify all tables exist
2. Check indexes are created
3. Confirm default categories are seeded
4. Proceed to Task 2: Implement video storage and processing service
