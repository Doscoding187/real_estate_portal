# Development Submission System - Complete Guide

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Architecture & Flow](#architecture--flow)
3. [Critical Bug & Fix](#critical-bug--fix)
4. [Database Schema](#database-schema)
5. [Backend Logic](#backend-logic)
6. [Frontend Wizard](#frontend-wizard)
7. [Draft System](#draft-system)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 System Overview

The Development Submission System allows property developers to create and manage residential development listings through a multi-step wizard interface.

### Key Features:
- ✅ 7-step wizard for development creation
- ✅ Auto-save drafts to localStorage (Zustand persist)
- ✅ Database-backed draft storage (in progress)
- ✅ Image/video uploads via AWS S3
- ✅ Unit type management
- ✅ Developer tier limits (Free/Pro/Enterprise)
- ✅ Address geocoding & map integration

---

## 🏗 Architecture & Flow

### Request Flow Diagram
```
Frontend (React)
    ↓
DevelopmentWizard Component
    ↓
tRPC Client (type-safe API calls)
    ↓
developerRouter.ts (endpoint: createDevelopment)
    ↓
developmentService.ts (business logic)
    ↓
Drizzle ORM
    ↓
Railway MySQL Database
```

### File Structure
```
client/src/
├── components/development-wizard/
│   ├── DevelopmentWizard.tsx          # Main wizard orchestrator
│   └── steps/
│       ├── BasicDetailsStep.tsx       # Step 1: Name, type, location
│       ├── UnitTypesStep.tsx          # Step 2: Unit configurations
│       ├── HighlightsStep.tsx         # Step 3: Amenities & features
│       ├── MediaUploadStep.tsx        # Step 4: Development images/videos
│       ├── UnitMediaStep.tsx          # Step 5: Unit-specific media
│       ├── DeveloperInfoStep.tsx      # Step 6: Contact details
│       └── PreviewStep.tsx            # Step 7: Review & submit
├── hooks/
│   └── useDevelopmentWizard.ts        # Zustand state management
└── pages/
    └── developer/
        └── MyDrafts.tsx               # Draft management page

server/
├── developerRouter.ts                 # tRPC endpoints
├── services/
│   ├── developmentService.ts          # Core business logic
│   └── developerSubscriptionService.ts # Tier limits
└── db.ts                              # Database connection

drizzle/
└── schema.ts                          # Database schema definitions
```

---

## 🐛 Critical Bug & Fix

### THE PROBLEM
**Error:** `Cannot read properties of undefined (reading 'findFirst')`

**Root Cause:** The `developmentService.ts` was importing and using `db` directly instead of calling `getDb()` to initialize the database connection.

### ❌ BROKEN CODE (Before Fix)
```typescript
// server/services/developmentService.ts
import { db } from '../db';  // ❌ WRONG!

async createDevelopment(developerId: number, input: CreateDevelopmentInput) {
  // This fails because 'db' is not initialized
  const existing = await db.query.developments.findFirst({
    where: eq(developments.slug, slug)
  });
  // ERROR: Cannot read properties of undefined (reading 'findFirst')
}
```

### ✅ FIXED CODE (Current)
```typescript
// server/services/developmentService.ts
import { getDb } from '../db';  // ✅ CORRECT!

async createDevelopment(developerId: number, input: CreateDevelopmentInput) {
  const db = await getDb();  // ✅ Initialize connection
  if (!db) throw new Error('Database not available');
  
  // Now 'db' is properly initialized
  const existing = await db.query.developments.findFirst({
    where: eq(developments.slug, slug)
  });
  // ✅ WORKS!
}
```

### Why This Happens
Railway's MySQL connection requires async initialization. The `getDb()` function:
1. Checks if connection exists
2. Creates new connection if needed
3. Returns initialized Drizzle instance

### All Fixed Methods
The fix was applied to **ALL 8 methods** in `developmentService.ts`:
- ✅ `ensureUniqueSlug()`
- ✅ `createDevelopment()`
- ✅ `getDevelopment()`
- ✅ `getDevelopmentWithPhases()`
- ✅ `getDeveloperDevelopments()`
- ✅ `updateDevelopment()`
- ✅ `deleteDevelopment()`
- ✅ `createPhase()`

**Commit:** `f88c8d4` - "Fix database initialization error in developmentService - use getDb() properly"

---

## 💾 Database Schema

### Developments Table
```sql
CREATE TABLE `developments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `developerId` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL UNIQUE,
  `description` text,
  `developmentType` enum('residential','commercial','mixed_use','estate','complex') NOT NULL,
  `status` enum('planning','under_construction','completed','coming_soon') DEFAULT 'planning',
  `address` varchar(500),
  `city` varchar(100) NOT NULL,
  `province` varchar(100) NOT NULL,
  `latitude` decimal(10,8),
  `longitude` decimal(11,8),
  `priceFrom` decimal(15,2),
  `priceTo` decimal(15,2),
  `amenities` json,
  `images` json,
  `videos` json,
  `floorPlans` json,
  `brochures` json,
  `completionDate` date,
  `totalUnits` int DEFAULT 0,
  `availableUnits` int DEFAULT 0,
  `isFeatured` tinyint(1) DEFAULT 0,
  `isPublished` tinyint(1) DEFAULT 0,
  `showHouseAddress` tinyint(1) DEFAULT 1,
  `views` int DEFAULT 0,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_developer_id` (`developerId`),
  KEY `idx_slug` (`slug`),
  KEY `idx_city_province` (`city`,`province`),
  CONSTRAINT `fk_development_developer` FOREIGN KEY (`developerId`) REFERENCES `developers` (`id`) ON DELETE CASCADE
);
```

### Development Drafts Table (New Feature)
```sql
CREATE TABLE `development_drafts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `developerId` int NOT NULL,
  `draftName` varchar(255),
  `draftData` json NOT NULL,
  `progress` int NOT NULL DEFAULT 0,
  `currentStep` int NOT NULL DEFAULT 0,
  `lastModified` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_dev_drafts_developer_id` (`developerId`),
  KEY `idx_dev_drafts_last_modified` (`lastModified`),
  CONSTRAINT `fk_dev_drafts_developer` FOREIGN KEY (`developerId`) REFERENCES `developers` (`id`) ON DELETE CASCADE
);
```

---

## ⚙️ Backend Logic

### 1. tRPC Endpoint (`developerRouter.ts`)

```typescript
createDevelopment: protectedProcedure
  .input(
    z.object({
      name: z.string().min(2, 'Development name must be at least 2 characters'),
      developmentType: z.enum(['residential', 'commercial', 'mixed_use', 'estate', 'complex']),
      description: z.string().optional(),
      address: z.string().optional(),
      city: z.string().min(1, 'City is required'),
      province: z.string().min(1, 'Province is required'),
      latitude: z.string().optional(),
      longitude: z.string().optional(),
      priceFrom: z.number().int().positive().optional(),
      priceTo: z.number().int().positive().optional(),
      amenities: z.array(z.string()).optional(),
      completionDate: z.string().optional(),
      showHouseAddress: z.boolean().default(true),
    })
  )
  .mutation(async ({ input, ctx }) => {
    // 1. Get developer profile from authenticated user
    const developer = await db.getDeveloperByUserId(ctx.user.id);
    
    if (!developer) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Developer profile not found',
      });
    }

    try {
      // 2. Call service to create development
      const development = await developmentService.createDevelopment(developer.id, input);
      return { development, message: 'Development created successfully' };
    } catch (error: any) {
      // 3. Handle tier limit errors
      if (error.message.includes('limit reached')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: error.message,
        });
      }
      throw error;
    }
  })
```

### 2. Service Layer (`developmentService.ts`)

```typescript
async createDevelopment(
  developerId: number,
  input: CreateDevelopmentInput
): Promise<Development> {
  // STEP 1: Initialize database connection
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // STEP 2: Check tier limits
  const limitCheck = await developerSubscriptionService.checkLimit(developerId, 'developments');
  if (!limitCheck.allowed) {
    throw new Error(
      `Development limit reached. Your ${limitCheck.tier} tier allows ${limitCheck.max} development(s).`
    );
  }

  // STEP 3: Generate unique slug
  const baseSlug = this.generateSlug(input.name);
  const slug = await this.ensureUniqueSlug(baseSlug);

  // STEP 4: Insert into database
  const [development] = await db.insert(developments).values({
    developerId,
    name: input.name,
    slug,
    description: input.description || null,
    developmentType: input.developmentType,
    status: 'planning',
    address: input.address || null,
    city: input.city,
    province: input.province,
    latitude: input.latitude || null,
    longitude: input.longitude || null,
    priceFrom: input.priceFrom || null,
    priceTo: input.priceTo || null,
    amenities: input.amenities ? JSON.stringify(input.amenities) : null,
    completionDate: input.completionDate || null,
    isFeatured: 0,
    isPublished: 0,
    showHouseAddress: input.showHouseAddress === false ? 0 : 1,
    views: 0,
  }).returning();

  // STEP 5: Increment usage counter
  await developerSubscriptionService.incrementUsage(developerId, 'developments');

  return development;
}
```

### 3. Tier Limits
```typescript
// Free tier: 1 development
// Pro tier: 10 developments
// Enterprise tier: Unlimited

const TIER_LIMITS = {
  free: { developments: 1, units: 50, media: 20 },
  pro: { developments: 10, units: 500, media: 200 },
  enterprise: { developments: -1, units: -1, media: -1 }, // -1 = unlimited
};
```

---

## 🎨 Frontend Wizard

### State Management (Zustand)

```typescript
// client/src/hooks/useDevelopmentWizard.ts
interface DevelopmentWizardState {
  // Step 1: Basic Details
  developmentName: string;
  address: string;
  city: string;
  province: string;
  suburb: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  
  // Step 2: Unit Types
  unitTypes: UnitType[];
  
  // Step 3: Highlights
  description: string;
  amenities: string[];
  highlights: string[];
  
  // Step 4-5: Media
  media: MediaFile[];
  
  // Step 6: Developer Info
  developerName: string;
  contactDetails: ContactDetails;
  
  // Navigation
  currentStep: number;
  
  // Actions
  setDevelopmentName: (name: string) => void;
  setUnitTypes: (types: UnitType[]) => void;
  nextStep: () => void;
  previousStep: () => void;
  reset: () => void;
}

export const useDevelopmentWizard = create<DevelopmentWizardState>()(
  persist(
    (set, get) => ({
      // Initial state
      developmentName: '',
      address: '',
      // ... all fields
      
      // Actions
      setDevelopmentName: (name) => set({ developmentName: name }),
      nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 6) })),
      previousStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 0) })),
      reset: () => set(initialState),
    }),
    {
      name: 'development-wizard-storage', // localStorage key
      version: 1,
    }
  )
);
```

### Wizard Steps

#### Step 1: Basic Details
- Development name
- Type (residential/commercial/etc.)
- Location (address, city, province)
- Map picker with geocoding

#### Step 2: Unit Types
- Unit configurations (studio, 1-4 bed, penthouse, etc.)
- Bedrooms, bathrooms, size
- Price range per unit type

#### Step 3: Highlights
- Description (rich text)
- Amenities (pool, gym, security, etc.)
- Key highlights

#### Step 4: Development Media
- Upload images (galleries)
- Upload videos (virtual tours)
- Upload floor plans
- Upload brochures

#### Step 5: Unit Media
- Upload unit-specific images
- Upload unit floor plans

#### Step 6: Developer Info
- Company name
- Contact email
- Contact phone
- Company logo

#### Step 7: Preview & Submit
- Review all entered data
- Submit to backend

---

## 💾 Draft System

### Current Implementation (localStorage)
```typescript
// Auto-saves every time state changes
// Stored in: localStorage['development-wizard-storage']

// Resume dialog shows on page load if draft exists
useEffect(() => {
  const hasDraft = 
    currentStep > 0 || 
    store.developmentName || 
    store.address ||
    store.unitTypes.length > 0 ||
    store.description ||
    store.media.length > 0;

  if (hasDraft) {
    setShowResumeDraftDialog(true);
  }
}, []);
```

### New Feature: Database-Backed Drafts

#### Backend Endpoints (developerRouter.ts)
```typescript
// Save draft (create or update)
saveDraft: protectedProcedure
  .input(z.object({
    id: z.number().int().optional(),
    draftData: z.object({ /* all wizard fields */ }),
    progress: z.number().int().min(0).max(100).optional(),
    currentStep: z.number().int().min(0).max(6).optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    const developer = await db.getDeveloperByUserId(ctx.user.id);
    const draftName = input.draftData.developmentName || `Draft ${new Date().toLocaleDateString()}`;
    
    if (input.id) {
      // Update existing draft
      await dbConn.update(developmentDrafts)
        .set({ draftData: input.draftData, progress, currentStep, lastModified: new Date() })
        .where(eq(developmentDrafts.id, input.id));
    } else {
      // Create new draft
      const [result] = await dbConn.insert(developmentDrafts)
        .values({ developerId: developer.id, draftName, draftData: input.draftData, progress, currentStep })
        .returning();
    }
  });

// Get all drafts for developer
getDrafts: protectedProcedure.query(async ({ ctx }) => {
  const developer = await db.getDeveloperByUserId(ctx.user.id);
  return await dbConn.query.developmentDrafts.findMany({
    where: eq(developmentDrafts.developerId, developer.id),
    orderBy: [desc(developmentDrafts.lastModified)],
  });
});

// Get single draft
getDraft: protectedProcedure
  .input(z.object({ id: z.number().int() }))
  .query(async ({ input, ctx }) => {
    const developer = await db.getDeveloperByUserId(ctx.user.id);
    const draft = await dbConn.query.developmentDrafts.findFirst({
      where: and(
        eq(developmentDrafts.id, input.id),
        eq(developmentDrafts.developerId, developer.id)
      ),
    });
    return draft;
  });

// Delete draft
deleteDraft: protectedProcedure
  .input(z.object({ id: z.number().int() }))
  .mutation(async ({ input, ctx }) => {
    const developer = await db.getDeveloperByUserId(ctx.user.id);
    await dbConn.delete(developmentDrafts)
      .where(and(
        eq(developmentDrafts.id, input.id),
        eq(developmentDrafts.developerId, developer.id)
      ));
  });
```

#### Frontend: My Drafts Page
```typescript
// client/src/pages/developer/MyDrafts.tsx

// Fetch all drafts
const { data: drafts } = trpc.developer.getDrafts.useQuery();

// Display as cards with:
// - Draft name
// - Progress percentage
// - Last modified timestamp
// - Resume button → Navigate to wizard with draftId
// - Delete button → Confirm and delete
```

#### Wizard Integration
```typescript
// Load draft from URL parameter
const urlParams = new URLSearchParams(window.location.search);
const draftIdFromUrl = urlParams.get('draftId');

// Fetch and populate wizard state
const { data: loadedDraft } = trpc.developer.getDraft.useQuery(
  { id: parseInt(draftIdFromUrl!) },
  { enabled: !!draftIdFromUrl }
);

useEffect(() => {
  if (loadedDraft && loadedDraft.draftData) {
    const data = loadedDraft.draftData;
    // Populate all wizard fields
    store.setDevelopmentName(data.developmentName);
    store.setAddress(data.address);
    // ... etc
  }
}, [loadedDraft]);

// Auto-save to database every 3 seconds
useEffect(() => {
  const timer = setTimeout(() => {
    saveDraftMutation.mutate({
      id: currentDraftId,
      draftData: { /* all current wizard state */ },
      progress: Math.round((currentStep / 6) * 100),
      currentStep,
    });
  }, 3000);
  return () => clearTimeout(timer);
}, [currentStep, /* ...dependencies */]);
```

---

## 🔧 Troubleshooting

### Issue 1: "Cannot read properties of undefined (reading 'findFirst')"

**Cause:** Database not initialized in service layer

**Solution:** Ensure all service methods use:
```typescript
const db = await getDb();
if (!db) throw new Error('Database not available');
```

**Status:** ✅ FIXED in commit `f88c8d4`

---

### Issue 2: "No procedure found on path 'developer.saveDraft'"

**Cause:** Backend code not deployed to Railway

**Solution:** 
1. Check Railway deployment status
2. Trigger manual deployment if needed
3. Verify commit is pushed to main branch

**Status:** ⏳ WAITING FOR DEPLOYMENT

---

### Issue 3: Draft auto-save errors

**Cause:** Database draft endpoints not yet deployed

**Solution:** Temporarily disabled auto-save until backend is live
```typescript
// Commented out in DevelopmentWizard.tsx
// Will re-enable after Railway deployment
```

**Status:** ⏳ TEMPORARILY DISABLED

---

### Issue 4: Wizard doesn't show resume dialog

**Cause:** Draft detection only checked `currentStep > 0`

**Solution:** Enhanced detection to check multiple fields:
```typescript
const hasDraft = 
  currentStep > 0 || 
  store.developmentName || 
  store.address ||
  store.unitTypes.length > 0 ||
  store.description ||
  store.media.length > 0;
```

**Status:** ✅ FIXED in commit `47fcd7e`

---

## 📝 Deployment Checklist

### Before Going Live:

- [x] Fix database initialization in developmentService.ts
- [x] Add draft endpoints to developerRouter.ts
- [x] Create development_drafts table schema
- [x] Build MyDrafts.tsx page
- [x] Add "My Drafts" navigation link
- [x] Integrate draft loading in wizard
- [ ] **Run SQL migration on Railway database**
- [ ] **Verify Railway deployment includes all commits**
- [ ] **Re-enable auto-save in wizard**
- [ ] **Test end-to-end submission flow**

### To Re-Enable Auto-Save:

1. Verify backend is deployed (check Railway dashboard)
2. Run database migration: `migrations/create-development-drafts-table.sql`
3. Uncomment auto-save code in `DevelopmentWizard.tsx` (lines ~133-178)
4. Test draft save/load/delete functionality
5. Commit and push changes

---

## 🚀 Next Steps

1. **Immediate:** Wait for Railway to deploy backend fixes
2. **Short-term:** Run database migration for drafts table
3. **Medium-term:** Re-enable auto-save and test drafts feature
4. **Long-term:** Add draft notifications, draft sharing, collaborative editing

---

## 📚 Key Files Reference

| File | Purpose | Lines of Code |
|------|---------|---------------|
| `server/services/developmentService.ts` | Core business logic | 387 |
| `server/developerRouter.ts` | tRPC API endpoints | 1720 |
| `client/src/components/development-wizard/DevelopmentWizard.tsx` | Main wizard | 442 |
| `client/src/hooks/useDevelopmentWizard.ts` | State management | ~200 |
| `client/src/pages/developer/MyDrafts.tsx` | Draft management UI | 241 |
| `drizzle/schema.ts` | Database schema | ~2000 |

---

**Last Updated:** December 4, 2025  
**Version:** 1.0  
**Status:** Production-ready (pending deployment)
