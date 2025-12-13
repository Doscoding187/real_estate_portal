# Location Auto-Population System

## 🎯 Overview

This system automatically creates city and suburb records from Google Places data when agents add properties. No need to manually seed thousands of locations!

## 📋 How It Works

### 1. **Provinces (Manual - One Time)**
- ✅ 9 South African provinces are seeded once
- ✅ These are fixed and won't change

### 2. **Cities & Suburbs (Automatic - Dynamic)**
- ✅ Auto-created when agents add properties
- ✅ Uses Google Places API data
- ✅ Prevents duplicates
- ✅ Keeps location data in sync with actual properties

## 🚀 Setup Instructions

### Step 1: Seed Provinces

Run this command once:

\`\`\`bash
pnpm tsx scripts/seed-provinces-only.ts
\`\`\`

This creates the 9 SA provinces with slugs for location pages.

### Step 2: Integrate Auto-Population

When a property is created, call the auto-population service. Here's how:

#### In your property creation endpoint (e.g., `propertiesRouter.ts`):

\`\`\`typescript
import { autoCreateLocationHierarchy, extractPlaceComponents } from '../services/locationAutoPopulation';

// When creating or updating a property:
createListing: protectedProcedure
  .input(createPropertySchema)
  .mutation(async ({ ctx, input }) => {
    
    // ... your existing code ...

    // Auto-create location hierarchy from Google Places data
    let locationIds = { provinceId: null, cityId: null, suburbId: null };
    
    if (input.googlePlaceData) {
      const components = extractPlaceComponents(input.googlePlaceData.address_components);
      
      locationIds = await autoCreateLocationHierarchy({
        placeId: input.googlePlaceData.place_id,
        formattedAddress: input.googlePlaceData.formatted_address,
        latitude: input.latitude,
        longitude: input.longitude,
        components
      });
    }

    // Create property with auto-populated location IDs
    const newProperty = await db.insert(properties).values({
      ...input,
      provinceId: locationIds.provinceId,
      cityId: locationIds.cityId,
      suburbId: locationIds.suburbId,
      // ... other fields
    });

    return newProperty;
  });
\`\`\`

###  Step 3: Update Your Frontend

Make sure the listing wizard captures Google Places data:

#### In `LocationStep.tsx` or similar:

\`\`\`typescript
// When user selects a location from Google Places:
const handleLocationSelect = (place: google.maps.places.PlaceResult) => {
  onUpdate({
    address: place.formatted_address,
    latitude: place.geometry?.location?.lat(),
    longitude: place.geometry?.location?.lng(),
    // 👇 Add this - capture full Google Places data
    googlePlaceData: {
      place_id: place.place_id,
      formatted_address: place.formatted_address,
      address_components: place.address_components,
      // ... other relevant fields
    }
  });
};
\`\`\`

## 🔄 How It Works Internally

1. **Agent adds property** → Selects location from Google Places autocomplete
2. **Frontend captures** → Full Google Places data (not just address)
3. **Backend receives** → Property creation request with Google Places data
4. **Auto-population service**:
   - Extracts: Province, City, Suburb from `address_components`
   - Checks if city exists → Creates if not
   - Checks if suburb exists → Creates if not
   - Returns IDs for linking to property
5. **Property saved** → Linked to auto-created locations
6. **Location pages work** → `/gauteng/johannesburg` now has data!

## 📊 Benefits

✅ **No manual seeding** - Locations create themselves
✅ **Always accurate** - Data comes from Google Places
✅ **No duplicates** - Checks before creating
✅ **Scalable** - Works for any location in South Africa
✅ **SEO-friendly** - Automatic slugs for URL paths
✅ **Low maintenance** - Set it and forget it

## 🧪 Testing

After setup, test by:

1. Creating a property in Sandton, Johannesburg
2. Check database: `SELECT * FROM cities WHERE name = 'Johannesburg'`
3. Check database: `SELECT * FROM suburbs WHERE name = 'Sandton'`
4. Visit: `http://localhost:3001/gauteng/johannesburg`
5. Should see the city page with your property!

## 📝 Database Schema

The auto-population service creates records in these tables:

### Cities
\`\`\`sql
CREATE TABLE cities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  provinceId INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(100),  -- Auto-generated (e.g., 'johannesburg')
  latitude VARCHAR(20),
  longitude VARCHAR(21),
  isMetro INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
\`\`\`

### Suburbs
\`\`\`sql
CREATE TABLE suburbs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cityId INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100),  -- Auto-generated (e.g., 'sandton')
  latitude VARCHAR(20),
  longitude VARCHAR(21),
  postalCode VARCHAR(10),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
\`\`\`

## 🔍 Monitoring

Check auto-creation logs in your server console:

\`\`\`
[AutoLocation] Processing: 123 Main St, Sandton, Johannesburg, 2196
[AutoLocation] Looking for province: Gauteng
[AutoLocation] Province found: Gauteng (id: 3)
[AutoLocation] Looking for city: Johannesburg
[AutoLocation] City found: Johannesburg (id: 15)
[AutoLocation] Looking for suburb: Sandton
[AutoLocation] Auto-creating suburb: Sandton
[AutoLocation] ✅ Suburb created: Sandton (id: 42)
\`\`\`

## 🛠️ Troubleshooting

### Issue: Cities not being created
**Solution**: Check that `input.googlePlaceData.address_components` contains `locality` type

### Issue: Wrong province detected
**Solution**: Ensure provinces are seeded first with correct names matching Google Places

### Issue: Duplicate cities
**Solution**: The service checks for existing cities by name (case-insensitive)

## 📚 Files Created

1. \`scripts/seed-provinces-only.ts\` - One-time province seeding
2. \`server/services/locationAutoPopulation.ts\` - Auto-creation logic
3. \`LOCATION_AUTO_POPULATION_GUIDE.md\` - This guide

## ✅ Next Steps

1. Run: `pnpm tsx scripts/seed-provinces-only.ts`
2. Integrate auto-population into your property creation flow
3. Test by creating a property
4. Visit location pages to see them populate!

---

💡 **Pro Tip**: The more properties agents add, the more comprehensive your location pages become. It's a self-improving system!
