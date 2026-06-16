# 🏗️ Listing Wizard Overhaul — 18-Week Development Plan

## 🎯 Objective

Transform the current single-property listing wizard from its current ~40% complete state into a **workhouse-grade listing engine** that matches or exceeds the quality of the Development Wizard. The goal is a production-ready, multi-step property listing system with workflow-driven architecture, autosave, draft persistence, advanced validation, and a polished UX.

---

## 📊 Current State Assessment

### What Exists (Current Listing Wizard)
- **8 static steps**: Action → Property Type → Basic Info → Additional Info → Pricing → Location → Media Upload → Preview
- **No workflow engine** — steps are hardcoded, not dynamically composed
- **No autosave** — data lost on browser refresh/navigation
- **No draft persistence** — can't save and continue later
- **Basic validation** — per-field, not per-step with inline errors
- **No edit mode** — can't resume editing an existing listing
- **Media upload works** — S3 integration functional
- **Location with Google Maps** — functional but basic
- **Quality score on preview** — basic implementation

### Target Standard (Development Wizard "Workhouse")
- **Workflow-driven architecture** — dynamic step composition per property type × action
- **Generic WizardEngine** — reusable, composable wizard framework
- **Autosave** — debounced auto-persistence to backend
- **Draft system** — save as draft, resume later, draft management
- **Step validation** — per-step validation with inline error display
- **URL-driven state** — create/edit/draft via URL params
- **Conditional step visibility** — steps shown/hidden based on selections
- **Rich step components** — polished, accessible, responsive
- **Comprehensive field coverage** — all SA property listing fields
- **SEO fields** — meta title, description, canonical URL
- **Agent/Agency attribution** — proper ownership and assignment

---

## 🗓️ 18-Week Roadmap

### **PHASE 1: Foundation & Architecture (Weeks 1-4)**

#### Week 1: Workflow Engine & Wizard Framework
- [ ] Create `client/src/lib/workflows/listingWorkflows.ts` — define workflow configurations per property type × action
- [ ] Build generic `WizardEngine` component (refactor from development wizard or create new)
- [ ] Define workflow step schema: `{ key, component, label, validation, shouldShow }`
- [ ] Create `ListingWizardContext` — centralized state management for wizard
- [ ] Set up URL routing for wizard: `/listings/new`, `/listings/:id/edit`, `/listings/:id/draft`
- [ ] Unit tests for workflow resolution logic

#### Week 2: Autosave & Draft Persistence
- [ ] Implement debounced autosave service (500ms debounce)
- [ ] Create `listings` draft API endpoints: `saveDraft`, `loadDraft`, `listDrafts`, `deleteDraft`
- [ ] Add `status` field management: `draft` → `review` → `published` → `archived`
- [ ] Implement draft indicator UI component (showing save status)
- [ ] Create exit confirmation dialog (unsaved changes warning)
- [ ] Backend: Add `autosave` tRPC procedure to listingRouter
- [ ] Unit tests for autosave logic and draft lifecycle

#### Week 3: Step Validation Framework
- [ ] Build `StepValidator` utility — composable validation per step
- [ ] Create validation schemas for each step using Zod
- [ ] Implement inline error display per field with error summary per step
- [ ] Add step completion indicators (checkmark, progress)
- [ ] Cross-step validation (e.g., pricing consistency, location completeness)
- [ ] Backend validation mirrors frontend (defense in depth)
- [ ] Unit tests for all validation schemas

#### Week 4: Core Step Components (Action + Property Type)
- [ ] Rebuild `ActionStep` — enhanced UI with descriptions, property count hints
- [ ] Rebuild `PropertyTypeStep` — richer cards with icons, descriptions, field previews
- [ ] Implement conditional workflow selection based on action × type
- [ ] Add step transition animations (Framer Motion)
- [ ] Mobile-responsive step layouts
- [ ] Accessibility: ARIA labels, keyboard navigation, screen reader support
- [ ] Visual regression tests for step components

---

### **PHASE 2: Core Listing Steps (Weeks 5-8)**

#### Week 5: Basic Information Step (Overhaul)
- [ ] Rebuild `BasicInformationStep` with conditional fields per property type
- [ ] Rich text editor for description (with character count, formatting)
- [ ] Property category selection with sub-category drill-down
- [ ] Dynamic field sets: bedrooms/bathrooms for residential, floor area for commercial, etc.
- [ ] Property features/tags with autocomplete
- [ ] SEO fields: meta title, meta description, canonical URL
- [ ] Character counter and content quality hints
- [ ] Unit tests for all field variants

#### Week 6: Additional Information Step (Overhaul)
- [ ] Rebuild `AdditionalInformationStep` with comprehensive field coverage
- [ ] Property condition (excellent/good/fair/renovate/newly built)
- [ ] Year built, last renovated
- [ ] levies/HOA fees (for apartments)
- [ ] Rates and taxes
- [ ] Pet policy, smoking policy
- [ ] Availability date
- [ ] Agent notes (private, not shown publicly)
- [ ] Custom fields per property type
- [ ] Unit tests

#### Week 7: Pricing Step (Overhaul)
- [ ] Rebuild `PricingStep` with full SA financial context
- [ ] Action-specific pricing: Sell (asking price, negotiable, transfer costs), Rent (monthly, deposit, lease terms), Auction (starting bid, reserve, terms)
- [ ] Bond affordability calculator integration (reuse from prospect dashboard)
- [ ] Transfer duty calculator (SA-specific progressive tax)
- [ ] Price comparison with area averages (if location data available)
- [ ] Currency formatting (ZAR with proper notation)
- [ ] Price history tracking for edits
- [ ] Unit tests for pricing calculations

#### Week 8: Location Step (Overhaul)
- [ ] Rebuild `LocationStep` with enhanced Google Maps integration
- [ ] Autocomplete address search with place details
- [ ] Interactive map pin with drag-to-adjust
- [ ] Province/Suburb/City auto-population from address
- [ ] Postal code validation
- [ ] Property boundary overlay (if available)
- [ ] Nearby amenities display (schools, hospitals, transport)
- [ ] Location scoring (walkability, safety, convenience)
- [ ] Multiple location pins for properties with multiple access points
- [ ] Unit tests

---

### **PHASE 3: Media & Publishing (Weeks 9-11)**

#### Week 9: Media Upload Step (Overhaul)
- [ ] Rebuild `MediaUploadStep` with drag-and-drop reordering
- [ ] Image upload with progress indicators, compression preview
- [ ] Multiple image format support (JPG, PNG, WebP)
- [ ] Floor plan upload and display
- [ ] Virtual tour URL input (Matterport, custom)
- [ ] Video upload support (with transcoding status)
- [ ] Image cropping/aspect ratio tools
- [ ] Primary photo selection (drag to set hero image)
- [ ] Alt text for accessibility
- [ ] Bulk upload with queue management
- [ ] Unit tests for upload logic

#### Week 10: Preview & Quality Score
- [ ] Rebuild `PreviewStep` with full listing preview
- [ ] Desktop and mobile preview modes
- [ ] Comprehensive quality score algorithm:
  - Photo count and quality (minimum 5, optimal 15+)
  - Description completeness and length
  - All required fields filled
  - Price competitiveness indicator
  - Location data completeness
  - SEO score
- [ ] Publish readiness checklist (visual checklist with fixes)
- [ ] Social media preview (OG image, title, description)
- [ ] Agent attribution display
- [ ] Publish confirmation dialog
- [ ] Unit tests for quality score algorithm

#### Week 11: Publishing Workflow
- [ ] Implement listing status workflow: `draft` → `pending_review` → `published` → `featured`
- [ ] Agency admin approval workflow (optional, configurable)
- [ ] Automated listing quality checks on publish
- [ ] Listing URL slug generation
- [ ] SEO metadata generation
- [ ] Indexing notification (Google Search Console ping)
- [ ] Email notifications: listing published, listing needs review
- [ ] Audit trail for listing changes
- [ ] Unit + integration tests

---

### **PHASE 4: Advanced Features (Weeks 12-14)**

#### Week 12: Multi-Photo & Floor Plan Management
- [ ] Photo gallery builder with room tagging
- [ ] Floor plan editor/viewer integration
- [ ] 360° photo support
- [ ] Image SEO: alt text, captions, file naming
- [ ] Photo analytics: which photos get viewed most
- [ ] Bulk photo operations (delete, reorder, replace)
- [ ] Unit tests

#### Week 13: Listing Analytics & Insights
- [ ] Post-publish analytics dashboard for listings
- [ ] View count, inquiry count, save count
- [ ] Photo engagement metrics
- [ ] Search impression data
- [ ] Competitive positioning (price vs. area average)
- [ ] Recommendations for improvement
- [ ] Integration with explore analytics
- [ ] Unit tests

#### Week 14: Bulk Operations & Templates
- [ ] Listing templates (save a listing as template for similar properties)
- [ ] Bulk listing upload (CSV/JSON import)
- [ ] Bulk edit capabilities (price update, status change)
- [ ] Listing duplication (clone a listing)
- [ ] Batch publish/unpublish
- [ ] Unit tests

---

### **PHASE 5: Polish & Production Readiness (Weeks 15-18)**

#### Week 15: UX Polish & Animations
- [ ] Step transition animations (slide, fade)
- [ ] Loading states and skeleton screens
- [ ] Empty states with helpful guidance
- [ ] Error boundaries per step
- [ ] Toast notifications for actions
- [ ] Keyboard shortcuts (Ctrl+S to save, Escape to cancel)
- [ ] Responsive design audit (mobile, tablet, desktop)
- [ ] Dark mode support

#### Week 16: Accessibility & Performance
- [ ] WCAG 2.1 AA compliance audit
- [ ] Screen reader testing and ARIA labels
- [ ] Keyboard-only navigation testing
- [ ] Performance optimization:
  - Code splitting per step
  - Lazy loading of heavy components (maps, editors)
  - Image optimization pipeline
  - Bundle size analysis
- [ ] Lighthouse score target: 90+ accessibility, 90+ performance

#### Week 17: Testing & QA
- [ ] End-to-end Playwright tests for full wizard flow
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile device testing (iOS Safari, Android Chrome)
- [ ] Load testing for media upload
- [ ] Integration tests with backend
- [ ] Contract tests (frontend ↔ backend API)
- [ ] Security audit (XSS, CSRF, file upload validation)
- [ ] Bug bash and fix cycle

#### Week 18: Documentation & Deployment
- [ ] Component documentation (Storybook or inline docs)
- [ ] API documentation for listing endpoints
- [ ] User guide for the listing wizard
- [ ] Migration guide (if schema changes)
- [ ] Performance benchmarks documented
- [ ] Deployment checklist
- [ ] Staging deployment and smoke tests
- [ ] Production deployment plan
- [ ] Rollback strategy

---

## 🏛️ Architecture Decisions

### Workflow-Driven Wizard (Matching Development Wizard Standard)

```
ListingWizard (Orchestrator)
├── WizardEngine (Generic Engine)
│   ├── Resolves workflow for propertyType × action
│   ├── Computes visible steps dynamically
│   ├── Renders active step component
│   ├── Manages Back/Next navigation
│   └── Surfaces validation errors
├── ListingWizardContext (State)
│   ├── Form data (all steps)
│   ├── Dirty state tracking
│   ├── Autosave status
│   ├── Validation state
│   └── Draft metadata
├── Autosave Service
│   ├── Debounced persistence (500ms)
│   ├── Conflict detection
│   └── Offline queue (future)
└── Step Components
    ├── ActionStep
    ├── PropertyTypeStep
    ├── BasicInformationStep
    ├── AdditionalInformationStep
    ├── PricingStep
    ├── LocationStep
    ├── MediaUploadStep
    └── PreviewStep
```

### Workflow Definitions

```typescript
// Example: Residential Sale Workflow
const residentialSaleWorkflow: ListingWorkflow = {
  id: 'residential_sale',
  steps: [
    { key: 'action', component: 'ActionStep', label: 'Action' },
    { key: 'propertyType', component: 'PropertyTypeStep', label: 'Property Type' },
    { key: 'basicInfo', component: 'BasicInformationStep', label: 'Details' },
    { key: 'additionalInfo', component: 'AdditionalInformationStep', label: 'Additional Info' },
    { key: 'pricing', component: 'PricingStep', label: 'Pricing' },
    { key: 'location', component: 'LocationStep', label: 'Location' },
    { key: 'media', component: 'MediaUploadStep', label: 'Photos & Media' },
    { key: 'preview', component: 'PreviewStep', label: 'Review & Publish' },
  ],
};
```

### Database Schema Changes (New Migration)

```sql
-- Add draft/autosave support to listings
ALTER TABLE listings ADD COLUMN status ENUM('draft', 'pending_review', 'published', 'archived', 'featured') DEFAULT 'draft';
ALTER TABLE listings ADD COLUMN draft_data JSON;  -- Full wizard state for autosave
ALTER TABLE listings ADD COLUMN last_autosaved_at TIMESTAMP NULL;
ALTER TABLE listings ADD COLUMN published_at TIMESTAMP NULL;
ALTER TABLE listings ADD COLUMN quality_score INT DEFAULT 0;
ALTER TABLE listings ADD COLUMN seo_title VARCHAR(255);
ALTER TABLE listings ADD COLUMN seo_description TEXT;
ALTER TABLE listings ADD COLUMN canonical_url VARCHAR(500);
ALTER TABLE listings ADD COLUMN slug VARCHAR(255);
ALTER TABLE listings ADD COLUMN template_id VARCHAR(36);  -- If created from template
```

---

## 🧪 Local Testing Strategy

### Before Each PR
1. **Unit Tests**: `pnpm test` — all unit tests pass
2. **Type Check**: `pnpm type-check` — no TypeScript errors
3. **Lint**: `pnpm lint:check` — no lint errors
4. **Local Dev**: `pnpm dev` — wizard works end-to-end locally

### Per-Phase Verification
1. **Visual Testing**: `pnpm test:visual` — Playwright visual regression
2. **Integration Tests**: `pnpm test:integration` — API + DB integration
3. **Contract Tests**: `pnpm db:verify` — schema contracts valid

### PR Process
1. Push to `feature/listing-wizard-overhaul` branch
2. Create PR to `main`
3. CI runs: lint → type-check → unit tests → integration tests
4. Manual QA on staging
5. Merge after approval

---

## 📁 Files to Create/Modify

### New Files
```
client/src/lib/workflows/listingWorkflows.ts          — Workflow definitions
client/src/components/listing-wizard/WizardEngine.tsx  — Generic wizard engine
client/src/components/listing-wizard/ListingWizard.tsx — Main orchestrator
client/src/components/listing-wizard/ListingWizardContext.tsx — State management
client/src/components/listing-wizard/steps/           — All step components (rebuilt)
client/src/components/listing-wizard/ui/              — Shared wizard UI components
client/src/services/listingAutosave.ts                — Autosave service
client/src/hooks/useListingWizard.ts                  — Wizard hook
server/services/listingWorkflowService.ts             — Backend workflow logic
drizzle/schema/listings-extensions.ts                 — New schema fields
```

### Modified Files
```
server/listingRouter.ts                               — Add draft/autosave endpoints
drizzle/schema/listings.ts                            — Add new fields
client/src/App.tsx                                    — Update listing routes
client/src/pages/ListingTemplate.tsx                  — Replace with new wizard
```

---

## 🎯 Success Metrics

| Metric | Target |
|--------|--------|
| Step completion rate | >90% per step |
| Autosave reliability | 99.9% (no data loss) |
| Draft resume rate | >60% of drafts eventually published |
| Average listing creation time | <10 minutes |
| Quality score on publish | >70/100 average |
| Accessibility score | WCAG 2.1 AA |
| Lighthouse performance | >90 |
| Test coverage | >80% for wizard components |
| Zero data loss incidents | 0 |

---

## 📅 Milestone Checkpoints

| Week | Milestone | Demo Ready? |
|------|-----------|-------------|
| 4 | Workflow engine + first 2 steps working | Internal demo |
| 8 | All 8 steps rebuilt with validation | Internal demo |
| 11 | Media + Preview + Publishing flow | Beta testing |
| 14 | Advanced features (templates, bulk) | Feature complete |
| 18 | Polish + docs + production ready | Production deploy |

---

*Plan created: 2026-06-16*
*Branch: `feature/listing-wizard-overhaul`*
*Worktree: `../listify-listing-wizard-overhaul`*