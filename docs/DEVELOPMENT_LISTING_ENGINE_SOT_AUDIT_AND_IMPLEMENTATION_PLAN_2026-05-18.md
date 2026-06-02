# Development Listing Engine SOT Audit and Implementation Plan

Date: 2026-05-18  
Source document: `PropertyListify_DevelopmentListingEngine_SOT_v2.docx`  
Scope: read-only audit and implementation planning. No application code changes.

## 1. Executive Summary

The SOT is directionally aligned with the current codebase: the existing Development Wizard is not a flat form and should not be rebuilt from scratch. The current implementation already has a valid foundation:

- A Vite React frontend with an active wizard under `client/src/components/development-wizard`.
- A keyed workflow layer under `client/src/lib/workflows`.
- A Zustand wizard store in `client/src/hooks/useDevelopmentWizard.ts`.
- Express/tRPC backend procedures in `server/developerRouter.ts` and `server/routers.ts`.
- Drizzle schema for `developments`, `development_drafts`, `unit_types`, `development_phases`, `development_units`, and `development_lead_routes`.
- Public search blending that already mixes manual listings and development-derived unit listings.
- A dedicated `developmentDerivedListingService` that turns unit types into searchable development inventory cards.

The main product gap is not whether the wizard exists. It does. The gap is that the current system is halfway between an admin wizard and the target commercial listing engine.

The safest path is to preserve the existing architecture, stabilize canonical ownership of fields, then upgrade in thin PRs:

1. Current-state audit and field ownership plan.
2. Safe P1 UX cleanup with no schema changes unless unavoidable.
3. Unit Types and Inventory commercial-core upgrade.
4. Buyer Costs and Qualification.
5. Documents module.
6. Lead Handling and readiness-based publish modes.

## 2. SOT Requirements That Must Govern Implementation

The SOT defines the Development Listing Engine as an evolution of the existing Development Wizard, not a rebuild.

Non-negotiables:

- Preserve the Step 1 routing gate.
- Do not flatten residential, land, commercial, and mixed-use into one generic wizard.
- Residential is the first implementation focus.
- Every concept needs one canonical owner.
- Every new field must round-trip through draft save and edit hydration.
- Every new field must have a real display or operational destination.
- First-pass migrations must be additive only.
- Derived values must use shared helpers, not duplicated calculations.
- Existing drafts, developments, public rendering, and search must not break.

## 3. Current Project Structure

### Frontend

- App routes: `client/src/App.tsx`, `client/src/pages/DeveloperRoutes.tsx`
- Active create/edit route: `/developer/create-development`
- Legacy alias: `/development-wizard`
- Active wizard shell: `client/src/components/development-wizard/DevelopmentWizard.tsx`
- Wizard engine renderer: `client/src/components/wizard/WizardEngine.tsx`
- Wizard store: `client/src/hooks/useDevelopmentWizard.ts`
- Workflow registry: `client/src/lib/workflows/index.ts`
- Workflow definitions:
  - `client/src/lib/workflows/residential-sale.ts`
  - `client/src/lib/workflows/residential-rent.ts`
  - `client/src/lib/workflows/residential-auction.ts`
- Wizard phases:
  - `DevelopmentTypePhase.tsx`
  - `ResidentialConfigPhase.tsx`
  - `IdentityPhase.tsx`
  - `LocationPhase.tsx`
  - `EstateProfilePhase.tsx`
  - `AmenitiesPhase.tsx`
  - `OverviewPhase.tsx`
  - `MediaPhase.tsx`
  - `UnitTypesPhase.tsx`
  - `FinalisationPhase.tsx`
  - placeholder/partial config phases for commercial, land, mixed-use
- Developer drafts page: `client/src/pages/developer/MyDrafts.tsx`
- Developer development list/edit entry: `client/src/components/developer/DevelopmentsList.tsx`

### Backend

- Developer tRPC router: `server/developerRouter.ts`
- Main properties/search router: `server/routers.ts`
- Development service: `server/services/developmentService.ts`
- Development-derived search service: `server/services/developmentDerivedListingService.ts`
- Property search service: `server/services/propertySearchService.ts`
- Draft sanitizer: `server/lib/sanitizeDraftData.ts`

### Schema

- Main development schema: `drizzle/schema/developments.ts`
- Relevant tables:
  - `developments`
  - `development_drafts`
  - `unit_types`
  - `development_phases`
  - `development_units`
  - `development_lead_routes`

## 4. Current Wizard Architecture

### What Exists

The current wizard already has the correct architectural direction:

- `DevelopmentTypePhase` is the routing gate.
- `useDevelopmentWizard.initializeWorkflow(type, txType)` chooses the workflow.
- `client/src/lib/workflows/index.ts` maps:
  - residential + `for_sale` -> `residential_sale`
  - residential + `for_rent` -> `residential_rent`
  - residential + `auction` -> `residential_auction`
- `WizardEngine` renders by `workflowId` and `currentStepId`.
- `getVisibleSteps()` is already the right extension point for conditional steps.

### Current Active Workflow Steps

Residential sale currently defines:

1. `configuration` -> `ResidentialConfigPhase`
2. `identity_market` -> `IdentityPhase`
3. `location` -> `LocationPhase`
4. `governance_finances` -> `EstateProfilePhase`
5. `amenities_features` -> `AmenitiesPhase`
6. `marketing_summary` -> `OverviewPhase`
7. `development_media` -> `MediaPhase`
8. `unit_types` -> `UnitTypesPhase`
9. `review_publish` -> `FinalisationPhase`

The SOT target is 15 steps grouped into phases. The current code has 9 keyed steps and no separate Timeline, Inventory, Qualification, Documents, or Lead Handling steps yet.

### Important Drift

The keyed workflow layer coexists with legacy numeric phase state:

- `currentPhase`
- `setPhase`
- numeric validation in `validatePhase`
- compatibility mapping from numeric phases to keyed step IDs

This is workable for now but should be treated as transitional. Do not remove it in the first engine PR. It is still used by parts of the wizard and finalisation edit links.

## 5. Current Backend and Persistence Architecture

### Drafts

`developer.saveDraft` stores draft JSON in `development_drafts.draftData`.

Recent PR 1 work made the draft snapshot safer by including:

- `workflowId`
- `currentStepId`
- `completedSteps`
- `stepData`
- `developmentData`
- `unitTypes`
- `_version`
- `_savedAt`

This is the correct foundation for SOT work. Every future field must be tested against this path:

UI input -> Zustand state -> `getDraftData()` -> `developer.saveDraft` -> `sanitizeDraftData()` -> `development_drafts.draftData` -> `developer.getDraft` -> `hydrateDevelopment()` -> UI display.

### Create/Edit

Create and edit flow runs through:

- `FinalisationPhase.tsx`
- `developer.createDevelopment`
- `developer.updateDevelopment`
- `developmentService.createDevelopment`
- `developmentService.updateDevelopment`
- `persistUnitTypes`

`updateDevelopment` already has an important safety rule:

- omitted `unitTypes` preserves existing unit rows
- explicit `unitTypes: []` deletes existing unit rows

This matches the PR 1 persistence direction and should be preserved.

### Public Search and Listing Output

The public search engine already has a development-derived listing path:

- `client/src/pages/SearchResults.tsx`
- `trpc.properties.search`
- `trpc.properties.searchDevelopmentListings`
- `server/routers.ts`
- `server/services/developmentDerivedListingService.ts`
- `client/src/lib/searchBlend.ts`

`developmentDerivedListingService` derives one searchable card per active unit type. It joins `unit_types` to `developments`, maps development unit types into `SearchCardResult`, and supports:

- sale/rent filtering
- price filtering
- bedroom/bathroom filtering
- property type mapping
- basic ranking score
- unit/development image fallback
- availability count
- badges from development stage

This is a strong foundation for the SOT search/listing engine vision.

## 6. What Is Already Good and Should Be Preserved

| Area | Current evidence | Preserve / improve direction |
|---|---|---|
| Routing gate | `DevelopmentTypePhase`, `initializeWorkflow`, `getWorkflow()` | Preserve. Rename/framing only in P1. |
| Keyed workflow | `workflowId`, `currentStepId`, `completedSteps` | Preserve and make fully canonical over time. |
| Draft snapshot | `getDraftData`, `sanitizeDraftData`, `developer.saveDraft` | Preserve. All new fields must round-trip. |
| Unit type model | `UnitTypesPhase`, `unit_types`, `persistUnitTypes` | Upgrade into catalogue/inventory core. |
| Search integration | `searchDevelopmentListings`, `developmentDerivedListingService` | Build on this, do not replace. |
| Public detail pages | `DevelopmentDetail.tsx`, `DevelopmentUnitDetailPage.tsx` | These already consume unit types, availability, media, brochures. |
| SA cost fields | levies, rates, transfer costs included | Extend carefully with buyer-cost fields. |
| Lead capture | `DevelopmentLeadDialog`, `developer.createLead`, lead routes | Good foundation for future Lead Handling step. |

## 7. Gap Analysis Against SOT Target

### Step 1: Launch Selector

Current:

- Still labeled around Project Setup in parts of the shell.
- Supports residential workflows for sale, rent, auction.
- Land/commercial/mixed-use components exist but are not full workflows.

Gap:

- Needs rename/copy to "What are you listing today?"
- Need Coming Soon / Register Interest, Internal Inventory Setup, Distribution / Referrer Network as future listing goals.
- Disabled engines should show coming-soon badges, not disappear.

Recommendation:

- P1 copy/UX only. Do not change routing semantics until tests cover workflow selection.

### Step 2: Development Classification

Current:

- `ResidentialConfigPhase` handles residential cascade.
- Ownership and structural information exist in schema and unit types.

Gap:

- No live "Your listing will appear as" preview.
- Ownership model may be duplicated or spread between configuration/identity/unit type.
- No shared `deriveOwnershipModel()` helper.

Recommendation:

- P1 add preview and clarify canonical ownership owner.
- Do not add columns unless ambiguity requires it later.

### Step 3: Identity & Positioning

Current:

- `IdentityPhase` and `OverviewPhase` split identity and marketing copy somewhat, but timeline/status and positioning are not cleanly separated.

Gap:

- Missing target buyer profile.
- Missing price positioning.
- Missing main buyer promise.
- Missing competitive advantage.
- Timeline fields are still mixed into identity/development data.

Recommendation:

- P1 remove duplication and improve copy/guidance.
- Add new positioning fields only after field ownership and draft tests are defined.

### Step 4: Timeline & Status

Current:

- `developments` has `status`, `legacyStatus`, `constructionPhase`, `completionDate`, auction dates.
- Store has launch/completion/handover fields.
- No separate keyed Timeline step.

Gap:

- Conditional timeline by listing goal is not implemented as its own step.

Recommendation:

- P2 new step only after P1 stabilizes duplicate timeline ownership.

### Step 5: Location Intelligence

Current:

- `LocationPhase` updates legacy/UI state and keyed step data.
- Schema has address, city, province, suburb, postal code, latitude, longitude, location ID, GPS accuracy.

Gap:

- SOT calls out map snap-to-street zoom and auto-fill unreliability.
- Nearby places and location highlights are not canonical.

Recommendation:

- P1 fix map zoom/autofill bugs.
- P2 add nearby places/location highlights only with defined frontend display mapping.

### Step 6: Governance & Buyer Costs

Current:

- Schema has levy/rates ranges and `transferCostsIncluded`.
- Unit types also have levy/rates and `transferCostsIncluded`.

Gap:

- Transfer duty flag is missing.
- Transfer costs, bond registration costs, deposit, occupation rent, launch incentives need clearer ownership.
- Buyer-cost fields are partly development-level and partly unit-level.

Recommendation:

- P3 introduce shared buyer-cost model and helper functions.
- Decide which values are development defaults vs unit-type overrides before coding.

### Step 7: Amenities & Lifestyle

Current:

- `AmenitiesPhase` exists.
- Amenity registry exists.
- Public detail page displays amenities.
- Search/detail highlights derive from `highlights`, `features`, and amenities.

Gap:

- Sticky category navigation needs UX cleanup.
- "Top Buyer Highlights" is not a first-class canonical field.
- Listing cards should cap front-facing amenity/highlight chips.

Recommendation:

- P1 fix sticky tabs and introduce top-highlights selection only if it can be stored in existing `highlights`/step data safely.

### Step 8: Unit Types & Pricing

Current:

- This is already the strongest area.
- Unit types have:
  - stable UUID-like IDs
  - bedrooms/bathrooms
  - floor/yard size
  - price/rent/auction fields
  - media
  - specifications/features/amenities
  - available/reserved/total counts
  - floorplan/media upload areas
- Search derives public inventory cards from unit types.

Gap:

- Main step should feel like a product catalogue, not a form/list.
- Readiness per unit type is not explicit.
- Derived repayment and gross-income-required helpers are not centralized.
- Inventory is present but not a dedicated step.

Recommendation:

- P2 should make Unit Types the commercial core: catalogue view, readiness signals, derived helper tests, and public card mapping.

### Step 9: Inventory & Availability

Current:

- Unit types already store total, available, reserved.
- Public detail and unit detail pages use availability labels.
- `development_units` exists for individual unit tracking.
- `development_phases` exists for phased developments.

Gap:

- No dedicated Inventory step.
- No full availability enum beyond available/reserved/sold for `development_units` and auction status for unit types.
- Sold/coming soon/on hold/hidden/sold out states are not unified.

Recommendation:

- P2/P3 additive expansion. Start with unit-type-level stock summary before individual unit workflows.

### Step 10: Buyer Qualification

Current:

- There is an affordability/qualification ecosystem:
  - `DevelopmentQualificationPage.tsx`
  - affordability services/tests
  - lead dialog qualification mode
  - unit matching by affordability in services

Gap:

- Wizard does not capture developer-defined qualification rules per development/unit type.
- No canonical qualification rule table/config tied to the wizard.

Recommendation:

- P3 after buyer costs. Reuse existing affordability engine rather than creating a separate calculator.

### Step 11: Development Media

Current:

- `MediaPhase` has photos, videos, documents/brochures.
- `DevelopmentDetail` and `DevelopmentUnitDetailPage` use media, floorplans, brochure CTAs.

Gap:

- Quality score is not clearly tiered Poor/Good/Strong/Excellent.
- Documents are still mixed into media in wizard state.

Recommendation:

- P2 media readiness can be computed.
- P4 should split documents from media if schema/API supports it.

### Step 12: Documents & Requirements

Current:

- Development-level `brochures` and `floorPlans` columns exist.
- `MediaPhase` includes documents.
- There are migration files for development required documents, but this audit did not verify their runtime coupling into the active wizard.

Gap:

- No dedicated wizard document bank.
- No visibility model in the active wizard.
- Application requirements are not part of the active development listing workflow.

Recommendation:

- P4, separate from media. Do not mix into P1/P2.

### Step 13: Marketing & Sales Copy

Current:

- `OverviewPhase` captures description/highlights.
- Public listing and detail pages use description/highlights.

Gap:

- No AI-assisted draft generation.
- No structured urgency/incentive copy.
- Highlights are not clearly ranked.

Recommendation:

- P2/P3 after canonical field ownership. AI generation must remain draft-only and developer-confirmed.

### Step 14: Lead Handling

Current:

- `development_lead_routes` exists.
- Lead capture and developer lead management exist.
- Developer router includes lead procedures.

Gap:

- Wizard does not require sales contact/WhatsApp/routing before publish.
- Lead routing rules are not visibly configured as part of the development listing flow.

Recommendation:

- P5. Keep out of P1/P2.

### Step 15: Review & Publish

Current:

- `FinalisationPhase` validates, creates/updates, publishes, and redirects.
- `server/readiness.ts` exists and basic readiness score fields exist.

Gap:

- No multi-dimensional readiness dashboard.
- Publish modes are not modeled as SOT describes.

Recommendation:

- P5 after buyer costs, media/doc readiness, and lead routing exist.

## 8. Canonical Ownership Risks

| Concept | Current owner(s) | Risk | Direction |
|---|---|---|---|
| Workflow position | `workflowId`, `currentStepId`, `completedSteps`, legacy `currentPhase` | State models can drift | Keep keyed workflow canonical; migrate numeric jumps later. |
| Unit types | root `unitTypes`, `stepData.unit_types.unitTypes`, DB `unit_types` | Mirroring can drift | Keep `stepData.unit_types.unitTypes` canonical for drafts, DB canonical after publish/edit. |
| Price from | frontend finalisation, backend service, public search service | Duplicated derived logic | Create shared `calculatePriceFrom(unitTypes)` helper before expanding pricing. |
| Inventory summary | frontend unit step, detail page, derived search service | Duplicated available/sold math | Create shared `calculateInventorySummary(unitTypes)`. |
| Ownership model | classification, identity, unit type, schema fields | Duplication and conflict | Create `deriveOwnershipModel(configuration)` and only ask when ambiguous. |
| Media readiness | wizard validation, readiness helper, public media fallback | Inconsistent readiness score | Create shared media readiness helper. |
| Documents | `brochures`, `floorPlans`, media documents, possible required-doc migrations | Media/document ambiguity | Separate in P4; do not solve in P1. |

## 9. Schema Readiness

### Already present

`developments` has:

- development type
- transaction type
- status / legacy status / construction phase
- address, city, province, suburb, postal code, lat/lng
- price/rent/auction range fields
- total and available units
- media/document-ish fields: images, videos, floorPlans, brochures
- highlights/features/amenities
- levies/rates ranges
- transfer costs included
- readiness score
- ownership/structural/floors

`unit_types` has:

- stable string ID
- unit basics
- structural/ownership type
- base price and display price fields
- rent and auction fields
- stock counts
- transfer costs included
- levies/rates
- deposit required
- media/spec/features/amenities JSON

`development_phases`, `development_units`, and `development_lead_routes` provide foundations for phased inventory and lead routing.

### Missing or not yet clearly canonical

- launch strategy
- target buyer profile
- price positioning
- buyer promise
- competitive advantage
- nearby places/location highlights
- transfer duty applicable
- bond costs included
- occupation rent
- explicit buyer-cost defaults vs unit overrides
- top buyer highlights with priority
- full unit availability states
- qualification rules
- document visibility/access control in active wizard
- lead routing mode and WhatsApp SLA in active wizard
- publish modes/readiness dimensions

## 10. Search Engine / Public Listing Findings

The search side is already closer to the SOT than the wizard UI is.

Confirmed:

- `SearchResults.tsx` fetches manual listings and development-derived listings separately.
- `searchBlend.ts` blends manual and development cards by intent/sort.
- `developmentDerivedListingService` uses `unit_types` as the public searchable inventory layer.
- Unit type cards include price, bedrooms, bathrooms, area, development reference, image, badges, and availability.
- `DevelopmentDetail.tsx` and `DevelopmentUnitDetailPage.tsx` already render unit-level detail, availability, brochure CTAs, and qualification entry points.

Risks:

- Search card ranking and derived values are local to `developmentDerivedListingService`.
- Detail pages recompute availability/ownership/media differently.
- Search filters do not yet understand future SOT fields like transfer duty, buyer-cost badges, qualification fit, or top highlights.

Direction:

- Do not overhaul search first.
- First make the wizard produce canonical, stable unit/development data.
- Then upgrade search cards to consume shared derived helpers.

## 11. Recommended Implementation Sequence

### PR 0: Planning Artifact

Status: this document.

Acceptance:

- SOT mapped to current code.
- Current state/gaps documented.
- PR sequence defined.

### PR 1: Safe UX Cleanup, No Schema Changes

Title: `Refine development launch wizard foundation`

Scope:

- Rename visible "Project Setup" framing to "What are you listing today?"
- Add phase/step label beside progress.
- Improve Launch Selector copy and disabled engine badges.
- Add classification preview.
- Fix or document map zoom/autofill bug.
- Improve amenities sticky tabs.
- Improve unit types empty state.
- Remove or reduce Identity/Classification duplicate prompts where possible.

Do not:

- Add schema fields.
- Rewrite routes.
- Enable new engines.
- Introduce documents/qualification/lead routing.

Tests:

- Workflow selection still initializes residential sale/rent/auction correctly.
- Draft resume still restores current step.
- Existing edit flow still hydrates.
- Unit types still save/update.

### PR 2: Unit Types Catalogue and Inventory Core

Title: `Upgrade unit types into development inventory catalogue`

Scope:

- Catalogue view for existing unit types.
- Unit readiness indicators.
- Shared helpers:
  - `calculatePriceFrom`
  - `calculateInventorySummary`
  - `calculateEstimatedRepayment`
- Make availability summary consistent across wizard, search, detail pages.
- Keep schema additive only if needed.

Tests:

- Unit type catalogue renders stable cards.
- Price from derives consistently.
- Inventory counts survive draft/edit/update.
- Search card and detail page use same inventory summary.

### PR 3: Buyer Costs and Qualification

Title: `Add buyer cost and qualification data to residential developments`

Scope:

- Transfer duty flag.
- Transfer/bond costs included.
- Deposit model.
- Occupation rent if applicable.
- Repayment/income helpers.
- Qualification rules integrated with existing affordability services.

Tests:

- Buyer cost fields round-trip through draft.
- Public detail affordability block reflects fields.
- Qualification flow uses same repayment/income helpers.

### PR 4: Documents Module

Title: `Separate development documents from listing media`

Scope:

- Dedicated document bank.
- Visibility/access controls.
- Brochure/pricelist/site/floorplan distinction.
- Lead-gated documents.

Tests:

- Documents do not pollute media fields.
- Visibility gates apply correctly.
- Existing brochures/floorPlans migrate or dual-read safely.

### PR 5: Lead Handling and Readiness Publish

Title: `Add lead routing and readiness-based publish controls`

Scope:

- Sales contact and WhatsApp.
- Lead routing mode.
- Follow-up SLA.
- Multi-dimensional readiness dashboard.
- Publish modes.

Tests:

- Lead routes persist and route correctly.
- Publish blocked/warned by specific missing readiness items.
- Existing publish flow still works.

## 12. Highest-Risk Areas Before Coding

| Risk | Status | Evidence | Impact | Mitigation |
|---|---|---|---|---|
| Numeric phase and keyed workflow drift | Confirmed | `currentPhase`, `setPhase`, `currentStepId` coexist | Users can jump/reset unexpectedly | Keep keyed canonical; migrate numeric paths later. |
| Derived price/inventory duplication | Confirmed | Finalisation, service, search, detail pages derive values independently | Search/detail mismatch | Shared helper PR before adding pricing complexity. |
| Documents/media ambiguity | Confirmed | `brochures`, `floorPlans`, media documents coexist | Access control confusion | Separate document PR later. |
| Future engine flattening risk | Confirmed | Workflow registry only supports residential today | Commercial/land can be bolted on incorrectly | Extend workflow registry per engine; do not flatten. |
| Schema/runtime drift | Likely | Many migrations and dirty schema-related files exist | Runtime mismatch/local bugs | Additive migrations, runtime guards, migration tests. |
| Search/display drift | Confirmed | Search-derived listings already compute their own card model | Wizard captures may not surface | Every new field must name display surface before implementation. |

## 13. Immediate Recommendation

Do not start with a broad search overhaul. The search layer already has development-derived inventory cards. The better first move is to make the wizard produce cleaner canonical data.

Recommended next implementation PR:

`Refine development launch wizard foundation`

Why:

- It aligns with SOT P1.
- It preserves the existing engine.
- It avoids schema risk.
- It improves user perception immediately.
- It prepares the system for Unit Types/Inventory without disrupting public search.

Acceptance criteria:

- Existing residential create/edit/draft resume still works.
- Save Draft and My Drafts still work.
- Publish still works.
- Residential sale/rent/auction workflows still initialize correctly.
- No public search regression.
- No schema/package/distribution changes.
- No deletion of legacy wizard code.

## 14. Open Questions for Product Review

1. Should "Coming Soon / Register Interest" be a `transactionType`, a `launchStrategy`, or a publish mode?
2. Should transfer duty be development-level by default with unit-level override?
3. Should "Top Buyer Highlights" reuse `highlights` with priority metadata or become a new field?
4. Should individual units/stands be part of PR 2, or should PR 2 stay unit-type-level only?
5. Should documents be tied to the Development Listing Engine only, or share infrastructure with distribution/referral document workflows later?

