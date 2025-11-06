# Property Portal Implementation Plan
## Based on SquareYards Guide + Your Current State

**Date Created:** Now  
**Current Status:** MVP Foundation Complete (~40%)  
**Target:** Production-Ready Property Marketplace

---

## 📊 Current State Assessment

### ✅ What You Already Have (40% Complete)

#### **Core Infrastructure**
- ✅ React 19 + TypeScript + Vite setup
- ✅ Express + tRPC API layer
- ✅ Drizzle ORM + MySQL database
- ✅ Custom email/password authentication (JWT)
- ✅ S3 SDK integration

#### **Database Schema** (Comprehensive!)
- ✅ users (with passwordHash, emailVerified)
- ✅ properties (comprehensive fields)
- ✅ propertyImages
- ✅ agents, agencies
- ✅ developers, developments
- ✅ reviews
- ✅ leads
- ✅ favorites
- ✅ locations
- ✅ services
- ✅ exploreVideos

#### **API Endpoints (tRPC)**
- ✅ `auth.me`, `auth.logout`
- ✅ `properties.search`, `properties.featured`, `properties.getById`, `properties.getImages`
- ✅ `agents.list`, `agents.getById`, `agents.featured`
- ✅ `developments.*`
- ✅ `leads.create`
- ✅ `reviews.getByTarget`, `reviews.create`
- ✅ `favorites.*` (full CRUD)
- ✅ `locations.*`
- ✅ `services.*`

#### **Frontend Pages**
- ✅ Home (with hero, featured properties, city tabs)
- ✅ Properties (search results)
- ✅ PropertyDetail
- ✅ Agents, AgentDetail
- ✅ CityPage
- ✅ Favorites
- ✅ EnhancedNavbar, EnhancedHero
- ✅ PropertyCard, SearchBar components

---

## 🎯 Gap Analysis: What's Missing

### **🔴 Critical (MVP Blockers)**

#### 1. Property Management (Create/Update/Delete)
**Status:** ❌ Missing  
**Priority:** P0 - MVP Blocker

**What's needed:**
- `properties.create` - Protected endpoint for listing creation
- `properties.update` - Update existing listings
- `properties.delete` - Delete listings
- `properties.myProperties` - Get user's listings
- Frontend: `/list-property` page with form
- Frontend: `/dashboard` or `/my-properties` page

**Files to create:**
- `client/src/pages/ListProperty.tsx`
- `client/src/pages/Dashboard.tsx` (or `MyProperties.tsx`)
- Add mutations to `server/routers.ts`
- Add helpers to `server/db.ts`

---

#### 2. S3 Presigned Upload Flow
**Status:** ❌ Missing  
**Priority:** P0 - MVP Blocker

**What's needed:**
- `upload.presign` - Generate presigned URLs for image uploads
- `upload.complete` - Mark upload as complete, attach to property
- Frontend: Multi-image upload component
- Image processing pipeline (optional: resize, WebP conversion)

**Files to create:**
- `server/routers.ts` - Add upload router
- `server/_core/imageUpload.ts` - Presigned URL logic
- `client/src/components/ImageUploader.tsx`

**Current:** You have `server/storage.ts` with `storagePut` - need to expose presigned URLs

---

#### 3. Search Enhancements
**Status:** ⚠️ Basic exists, needs enhancement  
**Priority:** P1 - High

**Current:** Basic filter search works  
**Missing:**
- Text search (`q` parameter) - full-text search
- Sort options (price_asc, price_desc, newest, relevance)
- Geo-location search (lat/lng/radius)
- Autosuggest/autocomplete
- Map-based search view

**Enhancements needed:**
- Add `q` parameter to `properties.search`
- Add `sort` parameter
- Add `lat`, `lng`, `radiusKm` for geo search
- `locations.suggest` - Autocomplete endpoint
- Frontend: SearchBar with autocomplete
- Frontend: Map view toggle

---

#### 4. Agent Dashboard
**Status:** ❌ Missing  
**Priority:** P1 - High

**What's needed:**
- `leads.listForAgent` - Get leads for logged-in agent
- `leads.updateStatus` - Update lead status (new, contacted, qualified, converted, closed)
- `agents.createProfile` - Create agent profile
- `agents.updateProfile` - Update agent profile
- Frontend: `/agent/dashboard` page
- Frontend: Lead management UI

**Files to create:**
- `client/src/pages/agent/Dashboard.tsx`
- `client/src/pages/agent/Leads.tsx`
- `client/src/pages/agent/Profile.tsx`
- Add endpoints to `server/routers.ts`

---

#### 5. Property Detail Enhancements
**Status:** ⚠️ Basic exists  
**Priority:** P1 - High

**Missing:**
- Map integration (show property on map)
- Lead capture form (contact agent/viewing request)
- Share functionality
- Image gallery with lightbox
- Virtual tour integration (you have `virtualTourUrl` field)

**Files to enhance:**
- `client/src/pages/PropertyDetail.tsx`
- Add map component (Mapbox/Google Maps)
- Add lead form modal
- Add image gallery lightbox

---

### **🟡 Important (Post-MVP)**

#### 6. Admin Dashboard
**Status:** ❌ Missing  
**Priority:** P2 - Important

**What's needed:**
- `admin.moderateListing` - Approve/reject listings
- `admin.manageUsers` - User management
- `admin.reports` - Analytics/reports
- Frontend: `/admin` dashboard
- Content moderation queue

**Files to create:**
- `server/routers.ts` - Add admin router
- `client/src/pages/admin/Dashboard.tsx`
- `client/src/pages/admin/Moderation.tsx`
- `client/src/pages/admin/Users.tsx`

---

#### 7. Advanced Search Features
**Status:** ❌ Missing  
**Priority:** P2 - Important

**What's needed:**
- Saved searches (with email notifications)
- Search history
- Property comparison tool
- Advanced filters (parking, furnishing, property age, etc.)

---

#### 8. Monetization
**Status:** ❌ Missing  
**Priority:** P3 - Future

**What's needed:**
- Stripe integration
- Featured listings (payment)
- Subscription packages for agents
- Lead credits system
- `payments.createCheckoutSession`
- `payments.webhookHandler`
- Database: `subscriptions`, `payments` tables

---

#### 9. SEO & Performance
**Status:** ❌ Missing  
**Priority:** P2 - Important

**What's needed:**
- SSR/SSG for key pages (property detail, search results)
- Meta tags (title, description, OG tags)
- Structured data (Schema.org RealEstateListing)
- Sitemap generation
- Image optimization (lazy loading, responsive sizes)
- Pre-rendering for SEO-critical routes

**Options:**
- Use Vite SSR plugin
- Or deploy frontend to Vercel (SSR support)
- Or pre-render static pages at build time

---

#### 10. Email Notifications
**Status:** ❌ Missing  
**Priority:** P2 - Important

**What's needed:**
- Email service integration (SendGrid, AWS SES, etc.)
- Lead notification emails to agents
- Welcome emails
- Password reset emails
- Saved search alerts

**Files to create:**
- `server/_core/email.ts`
- Email templates

---

## 🚀 Implementation Roadmap

### **Phase 1: Complete MVP Core (Week 1-2)**

**Goal:** Enable property listing creation and management

**Tasks:**
1. ✅ **Property Creation Endpoint**
   - Add `properties.create` mutation
   - Add `properties.update` mutation  
   - Add `properties.delete` mutation
   - Add `properties.myProperties` query

2. ✅ **S3 Presigned Upload**
   - Add `upload.presign` endpoint
   - Add `upload.complete` endpoint
   - Create ImageUploader component

3. ✅ **List Property Page**
   - Create `/list-property` page
   - Multi-step form (Basic Info → Details → Images → Review)
   - Image upload integration
   - Form validation with React Hook Form + Zod

4. ✅ **My Properties Dashboard**
   - Create `/dashboard` or `/my-properties` page
   - List user's properties
   - Edit/Delete actions
   - Quick stats (views, inquiries)

**Deliverables:**
- Users can create property listings
- Users can upload images
- Users can manage their listings

---

### **Phase 2: Search & Discovery (Week 3-4)**

**Goal:** Enhanced search experience

**Tasks:**
1. ✅ **Enhanced Search API**
   - Add `q` (text search) parameter
   - Add `sort` parameter (price, date, relevance)
   - Add geo-location search (lat/lng/radius)
   - Improve search query performance

2. ✅ **Search Autocomplete**
   - Add `locations.suggest` endpoint
   - Frontend autocomplete component
   - Integrate into SearchBar

3. ✅ **Map-Based Search**
   - Integrate Mapbox or Google Maps
   - Show properties on map
   - Click markers to see property details
   - Filter by map bounds

4. ✅ **Advanced Filters UI**
   - Parking spaces
   - Furnishing status
   - Property age
   - Additional amenities

**Deliverables:**
- Fast, intuitive search
- Map-based property discovery
- Autocomplete search

---

### **Phase 3: Agent Tools (Week 5-6)**

**Goal:** Agent dashboard and lead management

**Tasks:**
1. ✅ **Agent Profile Management**
   - `agents.createProfile` endpoint
   - `agents.updateProfile` endpoint
   - Frontend profile creation/edit form

2. ✅ **Lead Management**
   - `leads.listForAgent` endpoint
   - `leads.updateStatus` endpoint
   - Lead management dashboard
   - Lead details page
   - Email notifications for new leads

3. ✅ **Agent Dashboard**
   - Dashboard page (`/agent/dashboard`)
   - Stats: Total listings, views, leads
   - Recent leads list
   - Property performance metrics

4. ✅ **Lead Capture Enhancements**
   - Contact form on property pages
   - Schedule viewing form
   - WhatsApp integration (optional)

**Deliverables:**
- Agents can manage their profile
- Agents can manage leads
- Agents have analytics dashboard

---

### **Phase 4: Property Detail Enhancements (Week 7)**

**Goal:** Rich property detail pages

**Tasks:**
1. ✅ **Map Integration**
   - Show property location on map
   - Nearby properties
   - Nearby amenities

2. ✅ **Image Gallery**
   - Lightbox gallery
   - Full-screen view
   - Thumbnail navigation

3. ✅ **Lead Capture Forms**
   - Contact agent form
   - Schedule viewing form
   - Share property (social, email)

4. ✅ **Virtual Tours**
   - Embed 360° tours (you have `virtualTourUrl`)
   - Video tours support

**Deliverables:**
- Engaging property detail pages
- Easy lead capture
- Rich media experience

---

### **Phase 5: Admin & Moderation (Week 8)**

**Goal:** Content moderation and admin tools

**Tasks:**
1. ✅ **Admin Endpoints**
   - `admin.moderateListing`
   - `admin.manageUsers`
   - `admin.reports`
   - Admin-only tRPC procedures

2. ✅ **Admin Dashboard**
   - Moderation queue
   - User management
   - Analytics/reports
   - System settings

3. ✅ **Moderation Workflow**
   - Listing approval process
   - Flagged content review
   - User bans/suspensions

**Deliverables:**
- Content moderation system
- Admin management tools
- Platform health monitoring

---

### **Phase 6: SEO & Performance (Week 9-10)**

**Goal:** SEO-optimized, fast-loading site

**Tasks:**
1. ✅ **SSR/SSG Setup**
   - Configure Vite SSR (or deploy to Vercel)
   - Pre-render key pages
   - Dynamic meta tags

2. ✅ **SEO Optimization**
   - Meta tags (title, description, OG)
   - Structured data (Schema.org)
   - Sitemap generation
   - Robots.txt

3. ✅ **Performance**
   - Image optimization (responsive sizes, WebP)
   - Lazy loading
   - Code splitting
   - Caching strategy

**Deliverables:**
- SEO-friendly pages
- Fast load times
- Rich search results

---

### **Phase 7: Monetization (Week 11-12)**

**Goal:** Revenue features

**Tasks:**
1. ✅ **Stripe Integration**
   - Payment endpoints
   - Checkout flow
   - Webhook handling

2. ✅ **Featured Listings**
   - Payment for featured status
   - Featured badge in search
   - Priority placement

3. ✅ **Subscription System**
   - Agent subscription packages
   - Lead credits system
   - Usage tracking

4. ✅ **Database Schema**
   - `subscriptions` table
   - `payments` table
   - `leadCredits` tracking

**Deliverables:**
- Payment processing
- Featured listings
- Subscription system

---

## 📋 Detailed Task Breakdown

### **Immediate Next Steps (Start Here!)**

#### Task 1: Property Creation API
**File:** `server/routers.ts`

```typescript
properties: router({
  // ... existing endpoints ...
  
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(5),
      description: z.string().min(10),
      propertyType: z.enum([...]),
      listingType: z.enum([...]),
      price: z.number().positive(),
      // ... all property fields ...
      images: z.array(z.string()).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      // Create property
      // Create images
      return { propertyId: ... };
    }),
    
  update: protectedProcedure
    .input(z.object({ id: z.number(), ... }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      // Update property
    }),
    
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      // Delete property
    }),
    
  myProperties: protectedProcedure
    .query(async ({ ctx }) => {
      return await db.getUserProperties(ctx.user.id);
    }),
})
```

#### Task 2: S3 Presigned Upload
**File:** `server/routers.ts`

```typescript
upload: router({
  presign: protectedProcedure
    .input(z.object({
      filename: z.string(),
      contentType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Generate presigned URL
      // Return { url, key }
    }),
    
  complete: protectedProcedure
    .input(z.object({
      key: z.string(),
      propertyId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Create propertyImage record
    }),
})
```

#### Task 3: List Property Page
**File:** `client/src/pages/ListProperty.tsx`

- Multi-step form (4 steps)
- Image upload integration
- Validation with Zod
- Submit to `properties.create`

---

## 🗂️ Database Schema Additions Needed

### **Subscriptions Table** (Phase 7)
```typescript
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id),
  planType: mysqlEnum("planType", ["basic", "premium", "enterprise"]),
  status: mysqlEnum("status", ["active", "cancelled", "expired"]),
  leadCredits: int("leadCredits").default(0),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow(),
});
```

### **Payments Table** (Phase 7)
```typescript
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id),
  amount: int("amount"), // in cents
  currency: varchar("currency", { length: 3 }).default("ZAR"),
  status: mysqlEnum("status", ["pending", "completed", "failed", "refunded"]),
  stripePaymentId: varchar("stripePaymentId", { length: 255 }),
  purpose: mysqlEnum("purpose", ["featured_listing", "subscription", "lead_purchase"]),
  createdAt: timestamp("createdAt").defaultNow(),
});
```

---

## 🎨 Frontend Component Library Needed

### **Existing Components** (✅ Already Built)
- PropertyCard
- SearchBar
- EnhancedNavbar
- EnhancedHero

### **Components to Build**

#### **Phase 1**
- `ImageUploader.tsx` - Multi-image upload with preview
- `ListingForm.tsx` - Property listing form (or use in ListProperty page)

#### **Phase 2**
- `MapView.tsx` - Mapbox/Google Maps integration
- `AutocompleteSearch.tsx` - Search autocomplete dropdown
- `FiltersPanel.tsx` - Advanced filter sidebar

#### **Phase 3**
- `LeadManagement.tsx` - Lead list with status management
- `AgentDashboard.tsx` - Agent dashboard layout
- `LeadDetailsModal.tsx` - Lead detail view

#### **Phase 4**
- `PropertyMap.tsx` - Property location map
- `ImageGallery.tsx` - Lightbox gallery
- `ContactForm.tsx` - Lead capture form
- `ShareButton.tsx` - Share property

#### **Phase 5**
- `ModerationQueue.tsx` - Admin moderation interface
- `AdminDashboard.tsx` - Admin dashboard

---

## 📦 Required Dependencies

### **Phase 1**
- ✅ Already have: React Hook Form, Zod, bcryptjs

### **Phase 2**
```bash
pnpm add @mapbox/mapbox-gl
pnpm add -D @types/mapbox-gl
# OR
pnpm add @react-google-maps/api
```

### **Phase 7**
```bash
pnpm add stripe
pnpm add @stripe/stripe-js
```

---

## 🔒 Security Checklist

### **Already Implemented**
- ✅ Password hashing (bcryptjs)
- ✅ JWT tokens
- ✅ HTTP-only cookies
- ✅ Input validation (Zod)

### **To Implement**
- ⚠️ Rate limiting (express-rate-limit)
- ⚠️ CSRF protection
- ⚠️ File upload validation (file type, size)
- ⚠️ SQL injection prevention (using Drizzle ORM - mostly covered)
- ⚠️ XSS prevention (React auto-escapes - verify)

---

## 📈 Success Metrics

### **MVP Success Criteria**
- ✅ Users can create property listings
- ✅ Users can upload images
- ✅ Users can search properties
- ✅ Users can view property details
- ✅ Users can contact agents
- ✅ Agents receive leads

### **Post-MVP Metrics**
- Agent dashboard adoption
- Lead conversion rate
- Property listing quality
- Search success rate
- Page load times
- SEO rankings

---

## 🎯 Priority Order (Based on Guide)

**Follow this exact order from the guide:**

1. **Auth** ✅ DONE
2. **Listing CRUD** ❌ DO NEXT
3. **S3 Presigned Upload** ❌ DO NEXT  
4. **Basic Search** ✅ DONE (enhance next)
5. **Property Detail** ✅ DONE (enhance next)
6. **Agent Profiles** ✅ DONE
7. **Lead Capture** ⚠️ PARTIAL (create done, management missing)
8. **Admin Panel** ❌ TODO

---

**Next Step:** Start with Phase 1, Task 1 - Property Creation API!

