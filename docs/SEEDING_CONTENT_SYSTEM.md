# Seeding Content System - Full Context Documentation

This document provides complete context for the **Seeding Content** system used by Super Admins to populate the platform with high-quality development listings during the WAT (We Are Testing) phase.

---

## 🏗️ Architecture Overview

### Core Concept: Separation of Concerns

| Concern | Who Controls It | Database Field |
|---------|-----------------|----------------|
| **Ownership** | Platform (Seed Developer) | `developer_id = 1` |
| **Branding** | Real Brand Profiles | `developer_brand_profile_id` |
| **Publishing** | Super Admin | `dev_owner_type = 'platform'` |

### Key Insight

Seeded content is **platform-owned** but **brand-rendered**. This means:
- All seeded developments belong to the Seed Developer (ID = 1)
- Frontend displays them under real brand profiles (Cosmopolitan, etc.)
- When real developers subscribe, seeded content can be deleted and replaced

---

## 📁 Related Files

### Backend

| File | Purpose |
|------|---------|
| `server/developerRouter.ts` | `createDevelopment` mutation with seeding logic (Lines 494-510) |

### Frontend

| File | Purpose |
|------|---------|
| `client/src/components/development-wizard/phases/RepresentationPhase.tsx` | Step 1 - Identity/Brand selection |
| `client/src/components/development-wizard/phases/FinalisationPhase.tsx` | Final step - Publish mutation |
| `client/src/components/development-wizard/DevelopmentWizard.tsx` | Wizard container with exit logic |
| `client/src/hooks/useDevelopmentWizard.ts` | Zustand state store with identity persistence |

---

## 🔧 Backend Logic

### Location: `server/developerRouter.ts` (Lines 494-510)

```typescript
if (ctx.user.role === 'super_admin') {
  // SEEDING MODE (Super Admin creating platform content)
  // Super Admin uses a system Seed Developer for ownership, but brandProfileId for UI branding
  // This separates: ownership (platform) from branding (Cosmopolitan, etc.)
  
  // Get or create the system Seed Developer (developer ID = 1 is reserved for platform)
  const SEED_DEVELOPER_ID = 1; // System developer for platform-owned content
  
  // Use brandProfileId for frontend grouping/SEO if provided
  brandProfileId = input.brandProfileId;
  developerId = SEED_DEVELOPER_ID; // Platform ownership
  ownerType = 'platform';
  
  console.log('[DeveloperRouter] Seeding Mode: developerId =', developerId, ', brandProfileId =', brandProfileId);
} else if (ctx.user.role === 'property_developer') {
  // DEVELOPER MODE (Self-serve)
  // Developer creates their own development
  const developer = await db.getDeveloperByUserId(ctx.user.id);
  // ... regular developer flow
}
```

### Key Points

1. **SEED_DEVELOPER_ID = 1** - Reserved system developer for platform content
2. **brandProfileId is optional** - Used for frontend grouping (SEO, brand pages)
3. **ownerType = 'platform'** - Marks development as platform-owned

---

## 🎨 Frontend Logic

### Step 1: RepresentationPhase.tsx

#### Identity Type Union (useDevelopmentWizard.ts Line 199)

```typescript
listingIdentity: {
  identityType: 'developer' | 'marketing_agency' | 'private_owner' | 'brand';
  developerBrandProfileId?: number;
  marketingBrandProfileId?: number;
  marketingRole?: 'exclusive' | 'joint' | 'open';
};
```

#### Super Admin Flow (Lines 38-58)

```typescript
const handleNext = () => {
  // Super Admins CAN select a brand profile (for frontend grouping), but it's optional
  // The backend uses the Seed Developer for ownership regardless
  if (isSuperAdmin) {
    if (listingIdentity.developerBrandProfileId) {
      console.log('[RepresentationPhase] Super Admin seeding under brand:', listingIdentity.developerBrandProfileId);
    } else {
      console.log('[RepresentationPhase] Super Admin seeding without brand (platform-only)');
      setListingIdentity({ identityType: 'developer' });
    }
    setPhase(2); // Proceed - backend handles ownership
    return;
  }
  // ... regular user flow
};

const selectBrand = (brand) => {
  setListingIdentity({ 
    identityType: 'brand', 
    developerBrandProfileId: brand.id 
  });
  toast.success(`Publishing as ${brand.brandName}`);
};
```

#### UI Behavior

- **Developer option hidden** for Super Admins (`{!isSuperAdmin && ...}`)
- **Brand search always visible** for Super Admins
- **Optional brand selection** - can proceed without selecting

---

### Final Step: FinalisationPhase.tsx

#### Mutation Payload (Lines 127-152)

```typescript
// Determine if this is a brand development
const isBrandDevelopment = listingIdentity?.identityType === 'brand' || 
                           listingIdentity?.identityType === 'marketing_agency';

const result = await createDevelopment.mutateAsync({
  name: developmentData.name || 'Untitled Development',
  developmentType: developmentType,
  // ... other fields
  
  // Identity & Branding - Send brandProfileId for brand or marketing_agency identity types
  brandProfileId: isBrandDevelopment ? listingIdentity?.developerBrandProfileId : undefined,
  marketingBrandProfileId: listingIdentity?.identityType === 'marketing_agency' 
    ? listingIdentity.marketingBrandProfileId 
    : undefined,
  marketingRole: listingIdentity?.marketingRole || 'exclusive',
});
```

#### Post-Publish Redirect

```typescript
// Reset wizard and redirect based on user role
reset();
navigate(isSuperAdmin ? '/admin/overview' : '/developer/developments');
```

---

## 🗄️ Database Model

### Developments Table (Relevant Columns)

| Column | Type | Super Admin Value |
|--------|------|-------------------|
| `developer_id` | INT (FK) | `1` (Seed Developer) |
| `developer_brand_profile_id` | INT (FK) | Selected brand ID or NULL |
| `dev_owner_type` | ENUM | `'platform'` |

### Developer Brand Profiles Table

| Column | Purpose |
|--------|---------|
| `id` | Primary key for brand lookup |
| `brand_name` | Display name (e.g., "Cosmopolitan") |
| `logo_url` | Brand logo for UI |
| `slug` | URL-friendly identifier |

---

## 🔄 Flow Diagram

```
Super Admin Opens Wizard
    │
    ▼
Step 1: Identity (RepresentationPhase)
    │
    ├── Brand Search (Optional)
    │       │
    │       ├── Brand Selected → identityType = 'brand'
    │       └── No Brand → identityType = 'developer'
    │
    ▼
Complete Wizard Steps 2-7
    │
    ▼
FinalisationPhase - Publish
    │
    ▼
Backend: createDevelopment
    │
    ├── user.role === 'super_admin'?
    │       │
    │       ├── YES: developerId = 1, ownerType = 'platform'
    │       └── NO:  developerId = user's developer
    │
    ▼
Save to Database
    │
    ▼
Redirect to /admin/overview (Super Admin)
         or /developer/developments (Developer)
```

---

## 🧪 Testing Checklist

### Super Admin Seeding

- [ ] Navigate to `/developer/wizard/new`
- [ ] Step 1 shows only "Marketing Agency" and "Private Owner" cards
- [ ] Brand search input is visible
- [ ] Can proceed without selecting a brand
- [ ] Can select a brand (e.g., "Cosmopolitan")
- [ ] Publish succeeds without errors
- [ ] Redirect goes to `/admin/overview`

### Database Verification

After publishing as Super Admin:

```sql
SELECT developer_id, developer_brand_profile_id, dev_owner_type, name 
FROM developments 
WHERE developer_id = 1
ORDER BY created_at DESC 
LIMIT 5;
```

Expected results:
- `developer_id = 1` (Seed Developer)
- `developer_brand_profile_id` = selected brand ID or NULL
- `dev_owner_type = 'platform'`

---

## 🚀 Future: Subscription Launch Cleanup

When real developers subscribe and take over their brand:

```sql
-- Delete all seeded content for a brand
DELETE FROM developments
WHERE developer_brand_profile_id = :brandId
  AND developer_id = 1
  AND dev_owner_type = 'platform';
```

Then the real developer creates fresh content with:
- `developer_id = their_developer_id`
- `developer_brand_profile_id = their_brand_id`
- `dev_owner_type = 'developer'`
