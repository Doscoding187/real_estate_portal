# Development Wizard Database Schema - Task 1 Complete

## Summary

All database schema and migration scripts for the Development Wizard Optimization have been successfully created and verified. The schema implements a comprehensive 5-step wizard with specification inheritance model.

## Completed Subtasks

### ✅ 1.1 Create developments table schema
**Status:** Complete  
**Location:** `drizzle/schema.ts` (lines for `developments` table)

**Fields Added:**
- Basic Information: `name`, `slug`, `status`, `completion_date`, `description`, `rating`
- Location: `address`, `city`, `province`, `suburb`, `postal_code`, `latitude`, `longitude`, `gps_accuracy`
- Amenities & Highlights: `amenities` (JSON), `highlights` (JSON)
- Features: `features` (JSON for estate-level infrastructure)
- Media: `images`, `videos`, `floor_plans`, `brochures`
- Metadata: `views`, `is_featured`, `is_published`, `published_at`
- Relationships: `developer_id` (FK to developers)

**Indexes Created:**
- `idx_developments_developer_id`
- `idx_developments_status`
- `idx_developments_gps_accuracy`
- `idx_developments_suburb`
- `idx_developments_rating`
- `idx_developments_published`
- `idx_developments_slug` (UNIQUE)
- `idx_developments_location` (lat/lng)

**Requirements Validated:** 1.1, 2.1, 3.1, 4.1

---

### ✅ 1.2 Create unit_types table schema
**Status:** Complete  
**Location:** `drizzle/schema.ts` (lines for `unitTypes` table)

**Fields Added:**
- Basic Configuration: `name`, `bedrooms`, `bathrooms`, `parking`, `unit_size`, `yard_size`, `base_price_from`, `base_price_to`
- Base Features (JSON): `base_features` - includes builtInWardrobes, tiledFlooring, graniteCounters, prepaidElectricity, balcony, petFriendly
- Base Finishes (JSON): `base_finishes` - includes paintAndWalls, flooringTypes, kitchenFeatures, bathroomFeatures
- Base Media (JSON): `base_media` - includes gallery, floorPlans, renders
- Metadata: `display_order`, `is_active`, `created_at`, `updated_at`

**Indexes Created:**
- `idx_unit_types_development_id`
- `idx_unit_types_price_range`
- `idx_unit_types_bedrooms_bathrooms`
- `idx_unit_types_display_order`

**Foreign Keys:**
- `development_id` → `developments(id)` ON DELETE CASCADE

**Requirements Validated:** 5.1, 6.1, 6.3, 6.4, 6.5

---

### ✅ 1.3 Create spec_variations table schema
**Status:** Complete  
**Location:** `drizzle/schema.ts` (lines for `specVariations` table)

**Fields Added:**
- Basic Info: `name`, `price`, `description`
- Overrides (JSON): `overrides` - includes bedroomsOverride, bathroomsOverride, sizeOverride
- Feature Overrides (JSON): `feature_overrides` - includes add, remove, replace operations
- Spec-Specific Media (JSON): `media` - includes photos, floorPlans, videos, pdfs
- Metadata: `display_order`, `is_active`, `created_at`, `updated_at`

**Indexes Created:**
- `idx_spec_variations_unit_type_id`
- `idx_spec_variations_price`
- `idx_spec_variations_display_order`

**Foreign Keys:**
- `unit_type_id` → `unit_types(id)` ON DELETE CASCADE

**Inheritance Model:**
Final Spec Features = Development Amenities + Unit Type Base + Spec Overrides

**Requirements Validated:** 7.1, 7.2, 7.5, 8.3

---

### ✅ 1.4 Create development_documents table schema
**Status:** Complete  
**Location:** `drizzle/schema.ts` (lines for `developmentDocuments` table)

**Fields Added:**
- Document Info: `name`, `type`, `url`, `file_size`, `mime_type`
- Relationships: `development_id`, `unit_type_id` (nullable for development-wide docs)
- Metadata: `uploaded_at`

**Document Types Supported:**
- brochure
- site-plan
- pricing-sheet
- estate-rules
- engineering-pack
- other

**Indexes Created:**
- `idx_dev_docs_development_id`
- `idx_dev_docs_unit_type_id`
- `idx_dev_docs_type`

**Foreign Keys:**
- `development_id` → `developments(id)` ON DELETE CASCADE
- `unit_type_id` → `unit_types(id)` ON DELETE CASCADE

**Requirements Validated:** 11.1, 11.2

---

### ✅ 1.5 Write migration scripts
**Status:** Complete

**Migration Files Created:**

1. **`drizzle/migrations/add-wizard-optimization-fields.sql`**
   - Adds wizard-specific fields to developments table
   - Updates status enum with new values
   - Adds amenities, highlights, features JSON columns
   - Creates performance indexes

2. **`drizzle/migrations/add-development-location-fields.sql`**
   - Adds location-related fields (slug, published status, etc.)
   - Creates location indexes

3. **`drizzle/migrations/create-unit-types-spec-variations.sql`**
   - Creates unit_types table with full schema
   - Creates spec_variations table with inheritance support
   - Creates development_documents table
   - Includes comprehensive comments and documentation

**Migration Runner Scripts:**

1. **`scripts/run-development-wizard-migration.ts`**
   - Executes all wizard-related migrations in order
   - Handles already-applied migrations gracefully
   - Provides detailed progress output
   - Validates completion

2. **`scripts/verify-development-wizard-schema.ts`**
   - Verifies all tables exist
   - Checks all required columns are present
   - Validates indexes and foreign keys
   - Provides comprehensive status report

**Rollback Script:**

1. **`drizzle/migrations/rollback-development-wizard.sql`**
   - Safely removes wizard tables in reverse order
   - Removes wizard-specific fields from developments
   - Preserves base developments table structure
   - Includes safety warnings

**Requirements Validated:** All database requirements

---

## Database Schema Architecture

### Specification Inheritance Model

```
Development (Estate Level)
├── amenities: ["Swimming Pool", "Clubhouse", "Security"]
├── highlights: ["Close to schools", "Gated community"]
└── features: ["Perimeter Wall", "Fibre Ready"]
    │
    ├── Unit Type 1: "2 Bed Apartment"
    │   ├── base_features: {builtInWardrobes: true, ...}
    │   ├── base_finishes: {paintAndWalls: "Premium", ...}
    │   └── base_media: {gallery: [...], floorPlans: [...]}
    │       │
    │       ├── Spec 1: "Standard Spec" (R850,000)
    │       │   └── Inherits all base features
    │       │
    │       ├── Spec 2: "GAP Spec" (R750,000)
    │       │   └── overrides: {remove: ["Granite Counters"]}
    │       │
    │       └── Spec 3: "Premium Spec" (R950,000)
    │           └── overrides: {add: ["Smart Home System"]}
    │
    └── Unit Type 2: "3 Bed Townhouse"
        └── ... (same structure)
```

### Data Flow

1. **Development Level** (Step 1)
   - Amenities apply to ALL unit types
   - Highlights showcase the development
   - Features describe estate infrastructure

2. **Unit Type Level** (Step 2)
   - Base configuration defines defaults
   - Base features/finishes apply to all specs
   - Base media inherited by all specs

3. **Spec Variation Level** (Step 2, Tab E)
   - Inherits from unit type
   - Can override specific features
   - Can add/remove amenities
   - Can provide spec-specific media

### Storage Efficiency

- Only overrides are stored at spec level
- Reduces data duplication
- Simplifies updates (change base, all specs update)
- Maintains data integrity

---

## Performance Optimizations

### Indexes Created

**Developments Table:**
- Location-based queries: `(latitude, longitude)`
- GPS accuracy filtering: `(gps_accuracy)`
- Suburb searches: `(suburb)`
- Rating sorting: `(rating)`
- Published listings: `(is_published, published_at)`
- Unique slugs: `(slug)` UNIQUE

**Unit Types Table:**
- Development filtering: `(development_id)`
- Price range queries: `(base_price_from, base_price_to)`
- Bedroom/bathroom filtering: `(bedrooms, bathrooms)`
- Display ordering: `(display_order)`

**Spec Variations Table:**
- Unit type filtering: `(unit_type_id)`
- Price sorting: `(price)`
- Display ordering: `(display_order)`

**Development Documents Table:**
- Development filtering: `(development_id)`
- Unit type filtering: `(unit_type_id)`
- Document type filtering: `(type)`

### Query Optimization

- Foreign keys with CASCADE delete for data integrity
- JSON columns for flexible schema
- Composite indexes for common query patterns
- Proper index cardinality for efficient lookups

---

## Migration Execution

### To Apply Migrations:

```bash
# Run all wizard migrations
pnpm tsx scripts/run-development-wizard-migration.ts

# Verify schema
pnpm tsx scripts/verify-development-wizard-schema.ts
```

### To Rollback (if needed):

```bash
# Execute rollback script (use with caution!)
mysql -u [user] -p [database] < drizzle/migrations/rollback-development-wizard.sql
```

---

## Next Steps

With the database schema complete, the next tasks are:

1. **Task 2:** State management setup (Zustand store)
2. **Task 3:** Step 1 - Development Details UI
3. **Task 4:** Step 2 - Unit Types UI
4. **Task 5:** Step 3 - Phase Details UI
5. **Task 6:** Step 4 - Review & Publish UI

---

## Schema Validation Checklist

- [x] developments table with all required fields
- [x] unit_types table with base configuration
- [x] spec_variations table with inheritance support
- [x] development_documents table
- [x] All foreign keys configured with CASCADE
- [x] All indexes created for performance
- [x] JSON columns for flexible data
- [x] Migration scripts created
- [x] Rollback script created
- [x] Verification script created
- [x] Documentation complete

---

## Technical Notes

### JSON Column Structure

**developments.amenities:**
```json
["Swimming Pool", "Clubhouse", "Jogging Trails", "Parks"]
```

**developments.highlights:**
```json
["2 min from schools", "Close to Mall", "Gated community", "Fibre ready", "Pet friendly"]
```

**developments.features:**
```json
["Perimeter Wall", "Controlled Access", "Paved Roads", "Fibre Ready"]
```

**unit_types.base_features:**
```json
{
  "builtInWardrobes": true,
  "tiledFlooring": true,
  "graniteCounters": true,
  "prepaidElectricity": false,
  "balcony": true,
  "petFriendly": false
}
```

**unit_types.base_finishes:**
```json
{
  "paintAndWalls": "Premium acrylic paint, smooth finish",
  "flooringTypes": "Porcelain tiles in living areas, carpet in bedrooms",
  "kitchenFeatures": "Granite countertops, built-in oven and hob",
  "bathroomFeatures": "Ceramic tiles, chrome fittings"
}
```

**spec_variations.feature_overrides:**
```json
{
  "add": ["Smart Home System", "Solar Geyser"],
  "remove": ["Granite Counters"],
  "replace": {
    "paintAndWalls": "Luxury textured paint"
  }
}
```

---

## Compliance

✅ **Requirements 1.1, 2.1, 3.1, 4.1** - Development Details  
✅ **Requirements 5.1, 6.1, 6.3, 6.4, 6.5** - Unit Types  
✅ **Requirements 7.1, 7.2, 7.5, 8.3** - Spec Variations  
✅ **Requirements 11.1, 11.2** - Documents  
✅ **All database requirements** - Migration scripts

---

## Status: ✅ COMPLETE

All database schema and migration tasks for the Development Wizard Optimization have been successfully completed. The schema is production-ready and implements the full specification inheritance model as designed.

**Date Completed:** December 5, 2024  
**Task:** 1. Database schema and migrations  
**Spec:** development-wizard-optimization
