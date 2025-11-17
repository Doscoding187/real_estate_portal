# Smart Listing Creation Wizard - Implementation Guide

## 📋 Project Overview

A comprehensive smart listing creation wizard that adapts to user choices with:

- Multi-step wizard flow (7 steps)
- Dynamic property type templates
- Media-first upload system (vertical video support)
- Approval workflow (auto/manual)
- Lead capture & analytics
- CRM integration hooks

---

## ✅ Completed Components

### 1. Database Schema (`drizzle/listing-schema.ts`)

**Tables Created:**

- `listings` - Main listing data with dynamic fields
- `listing_media` - Images, videos, floorplans, PDFs
- `listing_analytics` - Views, leads, conversions, traffic sources
- `listing_approval_queue` - Manual review queue
- `listing_leads` - Lead capture from various sources
- `listing_viewings` - Scheduled property viewings
- `listing_settings` - Platform settings

**Key Features:**

- Action-based pricing fields (sell/rent/auction)
- Property type-specific details stored in JSON
- Media processing status tracking
- Comprehensive analytics tracking
- CRM sync capabilities

### 2. TypeScript Types (`shared/listing-types.ts`)

- `ListingAction`, `PropertyType` enums
- Property-specific field interfaces (Apartment, House, Farm, Land, Commercial, SharedLiving)
- Pricing field types (Sell, Rent, Auction)
- Media file types with validation rules
- Wizard state management types
- API request/response types
- Property type templates with required fields

### 3. State Management (`client/src/hooks/useListingWizard.ts`)

- Zustand store with persistence
- Multi-step navigation
- Form validation
- Media management (add, remove, reorder)
- Error handling
- Draft saving and submission

### 4. Wizard Components

#### Main Wizard (`client/src/components/listing-wizard/ListingWizard.tsx`)

- Progress bar and step indicators
- Navigation controls
- Validation error display
- Draft save functionality

#### Step 1: Action Selection (`steps/ActionStep.tsx`)

- Visual cards for Sell/Rent/Auction
- Feature descriptions
- Selection indicators

#### Step 2: Property Type Selection (`steps/PropertyTypeStep.tsx`)

- 6 property types with icons
- Required field previews
- Help documentation

#### Step 3: Basic Information (`steps/BasicInfoStep.tsx`)

- Title and description fields
- Dynamic property-specific forms:
  - Apartment: bedrooms, bathrooms, levies, amenities
  - House: erf size, garages, pool, security
  - Farm: hectares, water sources, farm suitability
  - Land: zoning, services, topography
  - Commercial: subtype, floor area, parking
  - Shared Living: rooms, bathroom type, furnished

#### Step 4: Pricing Fields (`steps/PricingStep.tsx`)

- **Sell:** asking price, negotiable, transfer cost estimate
- **Rent:** monthly rent, deposit, lease terms, available date
- **Auction:** starting bid, reserve price, auction date/time
- Contextual tips and warnings

#### Step 5: Location Picker (`steps/LocationStep.tsx`)

- Placeholder for Google Maps integration
- Manual address input fields

#### Step 6: Media Upload (`steps/MediaUploadStep.tsx`)

- Placeholder for media upload system
- Upload guidelines display

#### Step 7: Preview & Submit (`steps/PreviewStep.tsx`)

- Placeholder for listing preview
- Submission confirmation

### 5. API Router (`server/listingRouter.ts`)

**Endpoints Created:**

- `create` - Create new listing
- `update` - Update existing listing
- `getById` - Fetch listing details
- `myListings` - Get user's listings
- `delete` - Delete listing
- `uploadMedia` - Generate presigned upload URL
- `getAnalytics` - Fetch listing analytics
- `getLeads` - Get listing leads
- `submitForReview` - Submit for approval
- `approve` - Approve listing (Super Admin)
- `reject` - Reject listing (Super Admin)
- `getApprovalQueue` - Fetch approval queue (Super Admin)

---

## 🚧 Implementation TODO

### Phase 1: Database Integration

1. **Add schema to `drizzle/schema.ts`**
   - Import tables from `listing-schema.ts`
   - Add foreign key relationships
   - Run migrations: `pnpm db:generate && pnpm db:push`

2. **Create database functions in `server/db.ts`**
   ```typescript
   export async function createListing(data) { ... }
   export async function updateListing(id, data) { ... }
   export async function getListingById(id) { ... }
   export async function getUserListings(userId) { ... }
   export async function deleteListing(id) { ... }
   // ... more functions
   ```

### Phase 2: Media Upload System

1. **Implement S3 upload with presigned URLs**
   - Extend existing `server/_core/imageUpload.ts`
   - Add video validation (orientation check)
   - Implement FFmpeg processing for videos:
     - Generate thumbnails
     - Create 3s preview clips
     - Compress to H.264 MP4
     - Validate vertical orientation (9:16)

2. **Create media upload component**
   - Drag & drop interface
   - Upload progress indicators
   - Image preview and cropping
   - Video orientation validation
   - Reorder functionality
   - Set main media selector

### Phase 3: Location Integration

1. **Integrate Google Maps**
   - Map component with pin drop
   - Reverse geocoding on pin drop
   - Address autocomplete
   - Suburb/city validation
   - Location mismatch warnings

2. **Update `steps/LocationStep.tsx`**
   - Replace placeholder with map component
   - Implement coordinate capture
   - Add location search

### Phase 4: Preview & Submission

1. **Implement listing preview**
   - Mobile and desktop views
   - Vertical video hero display
   - Image gallery
   - Property details rendering
   - Pricing display
   - Call-to-action buttons

2. **Approval workflow logic**
   ```typescript
   // In server/listingRouter.ts create mutation
   if (user.isVerified && settings.autoPublishForVerifiedAccounts) {
     status = 'published';
     publishedAt = new Date();
     // Trigger post-publish hooks
   } else {
     status = 'pending_review';
     // Add to approval queue
   }
   ```

### Phase 5: Post-Publish Hooks

1. **Search indexing**
   - Add to Elasticsearch/Algolia
   - Generate search tags
   - Update location-based indexes

2. **Notifications**
   - Email to matching subscribers
   - Push notifications to mobile app
   - Agent/agency notifications

3. **CRM integration**

   ```typescript
   async function syncToCRM(listing) {
     if (!settings.crmEnabled) return;

     await fetch(settings.crmWebhookUrl, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         type: 'new_listing',
         listing: {
           id: listing.id,
           title: listing.title,
           price: listing.pricing,
           url: listing.canonicalUrl,
         },
       }),
     });
   }
   ```

4. **Social media auto-share** (optional)
   - Generate social media posts
   - Schedule for peak times

### Phase 6: Lead Capture

1. **Create lead capture forms**
   - Contact form
   - WhatsApp click tracking
   - Phone reveal tracking
   - Book viewing form

2. **Lead management dashboard**
   - Lead list with filters
   - Lead status updates
   - Activity timeline
   - CRM sync status

### Phase 7: Analytics Dashboard

1. **Implement tracking**

   ```typescript
   // Track view
   await incrementListingView(listingId, {
     sessionId,
     userId,
     source,
     referrer,
     userAgent,
   });

   // Track lead
   await recordListingLead(listingId, {
     type: 'contact_form',
     name,
     email,
     phone,
     message,
     source,
     utmParams,
   });
   ```

2. **Create analytics components**
   - View charts (daily/weekly/monthly)
   - Lead conversion funnel
   - Traffic source breakdown
   - Engagement metrics
   - Export functionality

### Phase 8: Admin Approval Dashboard

1. **Create approval queue UI**
   - List pending listings
   - Quick preview
   - Approve/reject actions
   - Bulk operations
   - Priority management

2. **Implement approval logic**
   - Notify owner on approval
   - Trigger publish hooks
   - Update search index
   - Send rejection feedback

### Phase 9: Integration with Existing Dashboard

1. **Add "Add Listing" button to developer dashboard**
   - Update `MarketingTools.tsx` or create new page
   - Link to `/listings/create`

2. **Create listing management page**
   - My listings table
   - Status filters
   - Edit/delete actions
   - Analytics quick view

3. **Add route to app**
   ```typescript
   // In client/src/App.tsx or routing config
   <Route path="/listings/create" component={ListingWizard} />
   <Route path="/listings/:id/edit" component={ListingWizard} />
   <Route path="/listings/:id/analytics" component={ListingAnalytics} />
   ```

### Phase 10: Testing & Documentation

1. **Unit tests**
   - Wizard step validation
   - State management
   - API endpoint tests

2. **Integration tests**
   - Full wizard flow
   - Media upload
   - Approval workflow

3. **API documentation**
   - OpenAPI/Swagger specs
   - Example requests/responses

4. **User documentation**
   - Wizard usage guide
   - Media guidelines
   - Pricing best practices

---

## 🔧 Quick Start Integration

### 1. Add router to main app router

```typescript
// In server/routers.ts
import { listingRouter } from './listingRouter';

export const appRouter = router({
  // ... existing routers
  listing: listingRouter,
});
```

### 2. Create page route

```typescript
// In client/src/pages/CreateListing.tsx
import ListingWizard from '@/components/listing-wizard/ListingWizard';

export default function CreateListingPage() {
  return <ListingWizard />;
}
```

### 3. Add navigation link

```typescript
// In your dashboard component
<Button onClick={() => navigate('/listings/create')}>
  + Add Listing
</Button>
```

---

## 📊 Database Migration Script

```sql
-- Run this to create all listing tables
-- Copy from drizzle/listing-schema.ts and convert to SQL

-- Example migration command:
-- pnpm db:generate
-- pnpm db:push
```

---

## 🎨 Customization Options

### Styling

- All components use Tailwind CSS classes
- Color scheme can be customized via Tailwind config
- Components use shadcn/ui primitives

### Property Types

- Add new types in `shared/listing-types.ts`
- Update `PROPERTY_TYPE_TEMPLATES`
- Create corresponding form component

### Pricing Models

- Extend pricing fields in schema
- Update `PricingStep.tsx` with new action types

### Media Limits

- Configured in `listing_settings` table
- Update validation in wizard store

---

## 🚀 Deployment Checklist

- [ ] Database migrations applied
- [ ] S3/storage configured for media upload
- [ ] FFmpeg installed for video processing
- [ ] Google Maps API key configured
- [ ] CRM webhook URL configured (if applicable)
- [ ] Email notification templates created
- [ ] Search indexing configured
- [ ] Analytics tracking tested
- [ ] Approval workflow tested
- [ ] Performance optimization (lazy loading, caching)

---

## 📞 Support & Maintenance

### Monitoring

- Track failed media uploads
- Monitor approval queue size
- Alert on CRM sync failures
- Track page load times

### Regular Tasks

- Review and approve pending listings
- Clean up failed media uploads
- Archive old listings
- Generate monthly analytics reports

---

## 🔐 Security Considerations

1. **Authorization**
   - Verify ownership before updates/deletes
   - Restrict admin endpoints to super_admin role
   - Validate media file types and sizes

2. **Data Validation**
   - Sanitize user input (title, description)
   - Validate coordinates within reasonable bounds
   - Check pricing values are positive

3. **Rate Limiting**
   - Limit listing creation per user per day
   - Throttle media uploads
   - Prevent approval queue spam

---

## 📈 Future Enhancements

1. **AI-powered features**
   - Auto-generate descriptions from images
   - Price recommendations based on market data
   - Property type detection from images

2. **Advanced media**
   - 360° virtual tours
   - Drone footage integration
   - Live video viewings

3. **Enhanced analytics**
   - Heatmap tracking
   - A/B testing for descriptions
   - Competitor analysis

4. **Marketing automation**
   - Scheduled social media posts
   - Email drip campaigns
   - Automated price adjustments

---

## 🐛 Known Issues & Workarounds

1. **Zustand persist with large media arrays**
   - Solution: Store media URLs separately, not File objects

2. **Video orientation detection**
   - Solution: Use FFmpeg probe before upload

3. **Location validation lag**
   - Solution: Debounce reverse geocoding calls

---

## 📚 Additional Resources

- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [tRPC Documentation](https://trpc.io/)
- [Zustand Guide](https://github.com/pmndrs/zustand)
- [FFmpeg Video Processing](https://ffmpeg.org/ffmpeg.html)
- [Google Maps API](https://developers.google.com/maps)

---

**Version:** 1.0.0  
**Last Updated:** November 17, 2025  
**Status:** Foundation Complete, Implementation In Progress
