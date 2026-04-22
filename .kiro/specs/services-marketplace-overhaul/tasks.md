# Implementation Plan: Services Marketplace Overhaul

## Overview

Frontend-only overhaul of the SA Property Portal services section. All changes are confined to `client/src`. The implementation proceeds in five phases: (1) shared primitives and pure utility functions, (2) consumer-facing component enhancements, (3) page-level updates for the consumer surfaces, (4) the provider onboarding wizard, and (5) final wiring and integration. No tRPC routers, Drizzle schema files, or the main homepage are touched.

---

## Tasks

- [x] 1. Add SA_PROVINCES constant and pure utility functions to catalog.ts
  - Add `SA_PROVINCES` array and `SAProvince` type to `client/src/features/services/catalog.ts` as specified in the design
  - Add `formatPriceRange(min: number, max: number): string` pure function that returns `R{min} – R{max}` with whole-number formatting
  - Export both so they are available to all downstream components
  - _Requirements: 9.8, 10.2, 6.4_

  - [x] 1.1 Write property test for formatPriceRange
    - **Property 13: ZAR price range formatting**
    - For any non-negative integers where `max >= min`, `formatPriceRange(min, max)` returns a string matching `R{min} – R{max}` with no decimal places
    - **Validates: Requirements 6.4**

- [ ] 2. Create shared primitive components
  - [x] 2.1 Create `StarRating` component (`client/src/components/services/StarRating.tsx`)
    - Implement `roundToHalfStar(rating: number): number` as an exported pure function
    - Render 5 Lucide `Star` / `StarHalf` icons filled/half/empty based on rounded rating
    - When `rating` is null/0 and `reviewCount` is 0, render "New" text instead of stars
    - Add `aria-label="{rating} out of 5 stars"` on the container
    - _Requirements: 3.2, 3.3_

  - [x] 2.2 Write property test for roundToHalfStar
    - **Property 4: Star rating rounds to nearest half star**
    - For any `rating` in [0, 5], `roundToHalfStar(rating)` returns a multiple of 0.5, within 0.25 of input, in range [0, 5]
    - **Validates: Requirements 3.2**

  - [x] 2.3 Create `ProviderAvatar` component (`client/src/components/services/ProviderAvatar.tsx`)
    - Implement `getInitials(companyName: string): string` as an exported pure function
    - Render `<img>` when `logoUrl` is provided, with `onError` fallback to initials
    - Support `size` prop: `'sm'` (32px), `'md'` (48px), `'lg'` (80px)
    - _Requirements: 3.1, 6.1_

  - [x] 2.4 Write property test for getInitials
    - **Property 5: Provider avatar initials are always non-empty**
    - For any non-empty `companyName` string, `getInitials(companyName)` returns 1–2 uppercase characters
    - **Validates: Requirements 3.1, 6.1**

  - [x] 2.5 Create `WizardProgressIndicator` component (`client/src/components/services/WizardProgressIndicator.tsx`)
    - Render "Step {currentStep} of {totalSteps}" label
    - Render a `<div role="progressbar" aria-valuenow={...} aria-valuemin={1} aria-valuemax={totalSteps}>` bar filled to `(currentStep / totalSteps) * 100%`
    - Render optional `encouragingCopy` in muted text below the bar
    - On viewports < 640px, render step label and bar on a single compact line
    - _Requirements: 4.6, 13.1, 13.2, 13.3, 13.4, 14.6_

  - [x] 2.6 Write property test for WizardProgressIndicator (lead flow)
    - **Property 9: LeadRequestFlow step counter reflects current step**
    - For any step `n` in {1, 2, 3}, the rendered indicator displays "Step n of 3" and progress bar fill equals `n / 3 * 100%`
    - **Validates: Requirements 4.6**

  - [x] 2.7 Write property test for WizardProgressIndicator (onboarding)
    - **Property 15: Wizard progress indicator reflects current step**
    - For any step `n` in {1, 2, 3, 4, 5}, the rendered indicator displays "Step n of 5" and progress bar fill equals `n / 5 * 100%`
    - **Validates: Requirements 7.2, 13.2, 13.3**

  - [x] 2.8 Create `CategoryTileGrid` component (`client/src/components/services/CategoryTileGrid.tsx`)
    - Render all six `SERVICE_CATEGORIES` as selectable tiles using `role="radio"` within `role="radiogroup"`
    - Resolve Lucide icons via a local `ICON_MAP` record (Hammer, Scale, Truck, ClipboardCheck, ShieldCheck, Camera)
    - Highlight selected tile with a ring; apply `motion.div` hover scale 1.02 via Framer Motion
    - Support `columns` prop defaulting to responsive (2 mobile / 3 tablet / 6 desktop)
    - _Requirements: 1.1, 1.2, 4.1, 7.4, 14.5_

  - [x] 2.9 Create `MatchQualityBadge` component (`client/src/components/services/MatchQualityBadge.tsx`)
    - Implement `getMatchLabel(score: number): 'Strong match' | 'Good match' | 'Possible match'` as an exported pure function
    - Apply color coding: Strong = green, Good = amber, Possible = slate
    - Include text label alongside color so color is never the sole differentiator
    - _Requirements: 5.2_

  - [x] 2.10 Write property test for getMatchLabel
    - **Property 11: Match quality label is deterministic and exhaustive**
    - For any score in [0, 1], `getMatchLabel(score)` returns exactly one of the three labels, never throws, never returns undefined
    - **Validates: Requirements 5.2**

- [x] 3. Checkpoint — Ensure all primitive components and utility tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create `CategoryCard` component and `TrustBar` component
  - [x] 4.1 Create `CategoryCard` component (`client/src/components/services/CategoryCard.tsx`)
    - Accept `category: ServiceCategoryMeta` and `onClick` props
    - Render icon (from `ICON_MAP`), bold label, and muted subtitle
    - Apply `motion.div` hover scale 1.02 via Framer Motion
    - _Requirements: 1.2, 1.3_

  - [x] 4.2 Write property test for CategoryCard rendering
    - **Property 1: CategoryCard renders all required fields**
    - For any `ServiceCategoryMeta` object, the rendered `CategoryCard` output contains the icon name, label, and subtitle
    - **Validates: Requirements 1.2**

  - [x] 4.3 Create `TrustBar` component (`client/src/components/services/TrustBar.tsx`)
    - Accept `providers: ProviderDirectoryItem[]` and `isLoading: boolean`
    - Derive `verifiedCount` and `averageRating` client-side from the providers array
    - Display three trust signals in a horizontal row (wraps on mobile)
    - When `isLoading` is true, render three `Skeleton` placeholders from shadcn/ui
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 4.4 Write property test for TrustBar verified count formatting
    - **Property 2: TrustBar formats verified count correctly**
    - For any non-negative integer `n`, the verified count display is a whole number followed by "verified providers"
    - **Validates: Requirements 2.3**

  - [x] 4.5 Write property test for TrustBar average rating formatting
    - **Property 3: TrustBar formats average rating correctly**
    - For any rating value in [0, 5], the rating display is formatted to exactly one decimal place followed by "rated by homeowners"
    - **Validates: Requirements 2.4**

- [x] 5. Enhance `ProviderCard` and `ProviderBadges`
  - [x] 5.1 Update `ProviderCard` (`client/src/components/services/ProviderCard.tsx`)
    - Add `matchScore?: number`, `isFallback?: boolean` props to `ProviderCardProps`
    - Integrate `ProviderAvatar` (48px) as the leftmost element
    - Replace the plain rating text with `StarRating` component
    - Add location line: `[suburb, city, province].filter(Boolean).join(', ') || 'National'`
    - Add service line: `topService.displayName || 'General support'`
    - Render `MatchQualityBadge` in the top-right corner when `matchScore` is provided
    - Apply muted border styling when `isFallback` is true
    - Stack all content vertically on mobile (width < 768px)
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 3.7, 3.9, 3.10, 14.4_

  - [x] 5.2 Update `ProviderBadges` (`client/src/components/services/ProviderBadges.tsx`)
    - Render a Verified badge with a Lucide checkmark icon and "Verified" label when `verificationStatus === 'verified'`
    - Render a "Priority Match" chip when `subscriptionTier === 'ecosystem_pro'`
    - _Requirements: 3.4, 3.8_

  - [x] 5.3 Write unit tests for ProviderCard verified badge and priority match
    - **Property 6: ProviderCard displays Verified badge iff verificationStatus is 'verified'**
    - **Property 7: ProviderCard displays Priority Match iff subscriptionTier is 'ecosystem_pro'**
    - Test both positive and negative cases for each badge
    - **Validates: Requirements 3.4, 3.8**

- [x] 6. Update `ServicesSkeletons` to include TrustBar skeleton
  - Add a `TrustBarSkeleton` export to `client/src/components/services/ServicesSkeletons.tsx`
  - Render three `Skeleton` blocks matching the TrustBar layout
  - _Requirements: 2.2_

- [x] 7. Update `ServicesHomePage` to integrate new components
  - Import and render `TrustBar` below `ServiceHeroSearch` and above the categories section, passing `providers` and `isLoadingProviders`
  - Replace the `CategoryChips` component in the "Popular categories" section with a `CategoryTileGrid` / `CategoryCard` grid
  - Apply 2-column grid on mobile (< 640px), 3-column on tablet, 6-column on desktop
  - Keep `ServiceHeroSearch`, `DemandCarousel`, `PopularProjectsGrid`, and `CostGuidesSection` unchanged
  - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 2.5, 14.1, 14.5_

- [x] 8. Create `LeadRequestFlow` and update `ServicesRequestPage`
  - [x] 8.1 Create `LeadRequestFlow` (`client/src/features/services/LeadRequestFlow.tsx`)
    - Implement three-step flow: (1) `CategoryTileGrid`, (2) Location inputs (Suburb text, City text, Province `<select>` from `SA_PROVINCES`), (3) `<textarea>` with placeholder "Describe what you need — the more detail, the better your matches"
    - Hardcode `intentStage: 'general'` and `sourceSurface: 'directory'` — never expose these in the UI
    - Render `WizardProgressIndicator` at the top of each step
    - Disable Continue on step 1 until a category is selected
    - Disable submit button and show loading indicator while `submitting` is true
    - Display `error` prop inline above the submit button
    - Preserve all field values when navigating back
    - Use `aria-live="polite"` on the step content container
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 14.2_

  - [x] 8.2 Write property test for LeadRequestFlow — no internal jargon exposed
    - **Property 8: LeadRequestFlow never exposes internal jargon**
    - For any step (1, 2, 3), the rendered DOM does not contain "intent stage", "source surface", "journey stage", or "source surface" in any visible text node
    - **Validates: Requirements 4.4**

  - [x] 8.3 Write property test for LeadRequestFlow — data preserved on back navigation
    - **Property 10: LeadRequestFlow preserves data on back navigation**
    - For any combination of entered category, suburb, city, province, and notes, navigating forward to step 3 and back to step 1 preserves all values unchanged
    - **Validates: Requirements 4.7**

  - [x] 8.4 Update `ServicesRequestPage` (`client/src/pages/services/ServicesRequestPage.tsx`)
    - Replace `LeadRequestWizard` import and usage with `LeadRequestFlow`
    - Pass `submitting={createLead.isPending}` and `error={createLead.error?.message ?? null}`
    - Keep the `createLeadFromJourney` mutation call and navigation logic unchanged
    - _Requirements: 4.5, 15.4, 15.6_

- [x] 9. Checkpoint — Ensure all consumer flow tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Update `ServicesResultsPage`
  - [x] 10.1 Update matched provider list to pass `matchScore` and `isFallback` to `ProviderCard`
    - Pass `matchScore={item.score}` to each matched `ProviderCard`
    - Pass `isFallback={true}` to fallback provider cards
    - Label the fallback section "Closest available providers" (already present — verify wording matches requirement)
    - _Requirements: 5.1, 5.6_

  - [x] 10.2 Update page heading to include category label and location
    - Replace "Providers matched to your request" with "Providers matched for {categoryLabel} in {location}"
    - Use `formatCategoryLabel(category)` for the category label and `formatArea(city, province, suburb)` for the location
    - _Requirements: 5.5_

  - [x] 10.3 Write property test for results page heading
    - **Property 12: Results page heading contains category label and location**
    - For any `ServiceCategory` and location string, the heading contains the human-readable category label and formatted location
    - **Validates: Requirements 5.5**

  - [x] 10.4 Replace raw field sidebar with `RequestSummarySidebar`
    - Remove "Lead ID", "Stage", and "Category" raw field display from the sidebar
    - Display human-readable summary: category label, formatted location, and notes (from sessionStorage lead context if available)
    - Keep the "Edit request" button
    - _Requirements: 5.3_

  - [x] 10.5 Update empty state to remove raw internal field names
    - Ensure the empty state message does not expose "Lead ID", "Stage", "intentStage", or "sourceSurface" labels
    - Verify "Request anyway" and "Edit request" buttons are present
    - _Requirements: 5.4_

- [x] 11. Update `ServiceProviderProfilePage`
  - [x] 11.1 Enhance the profile header section
    - Add `ProviderAvatar` (80px) prominently in the header
    - Add `StarRating` component with review count in the header
    - Add `Verified_Badge` in the header when `verificationStatus === 'verified'`
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 11.2 Enhance the services section with ZAR price ranges
    - Display `formatPriceRange(minPrice, maxPrice)` when both are non-null
    - Display "Price on request" when either `minPrice` or `maxPrice` is null
    - Show service `displayName`, `description`, and price range in a styled list
    - _Requirements: 6.4, 6.5_

  - [x] 11.3 Enhance the reviews section
    - Cap displayed reviews at 5 (change `.slice(0, 4)` to `.slice(0, 5)`)
    - Show star rating, title, content, and "Verified review" label when `review.isVerified === 1`
    - _Requirements: 6.7_

  - [x] 11.4 Write property test for reviews list cap
    - **Property 14: Reviews list is capped at 5**
    - For any array of reviews of length `n`, the profile page displays exactly `Math.min(n, 5)` review items
    - **Validates: Requirements 6.7**

  - [x] 11.5 Update "Request quote" button to pre-fill category
    - Ensure the button navigates to `/services/request/{defaultCategory}?providerId={providerId}` (already present — verify it uses the provider's primary category)
    - _Requirements: 6.8_

- [x] 12. Checkpoint — Ensure all consumer page tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [-] 13. Create `useOnboardingReducer` hook
  - Create `client/src/features/services/onboarding/useOnboardingReducer.ts`
  - Implement `OnboardingState`, `OnboardingAction`, `ServiceRow`, and `LocationRow` types as specified in the design
  - Implement the reducer handling all action types: `SET_STEP`, `SET_FIELD`, `ADD_SERVICE`, `REMOVE_SERVICE`, `UPDATE_SERVICE`, `ADD_LOCATION`, `REMOVE_LOCATION`, `UPDATE_LOCATION`, `SET_ERROR`, `CLEAR_ERROR`, `SET_PENDING`
  - Initialize `services` with one empty row; initialize `locations` with one empty row
  - _Requirements: 7.1, 9.3, 9.4, 10.3, 10.4, 13.6_

  - [x] 13.1 Write property test for service row add/remove invariant
    - **Property 16: Onboarding service rows add/remove invariant**
    - For any starting count `k` where `k < 10`, `ADD_SERVICE` increases count to `k + 1`; for `k > 1`, `REMOVE_SERVICE` decreases count to `k - 1`
    - **Validates: Requirements 9.3, 9.4**

  - [x] 13.2 Write property test for location row add/remove invariant
    - **Property 17: Onboarding location rows add/remove invariant**
    - For any starting count `k` where `k < 5`, `ADD_LOCATION` increases count to `k + 1`; for `k > 1`, `REMOVE_LOCATION` decreases count to `k - 1`
    - **Validates: Requirements 10.3, 10.4**

- [x] 14. Create onboarding wizard step components
  - [x] 14.1 Create `BusinessBasicsStep` (`client/src/features/services/onboarding/steps/BusinessBasicsStep.tsx`)
    - Text input for "Business name" (maps to `companyName`); required, non-empty to enable Continue
    - `CategoryTileGrid` for primary service category selection
    - `<textarea>` for "Short description" (maps to `bio`)
    - Call `registerProviderIdentity` mutation on Continue; display inline error on failure; stay on step 1
    - Disable Continue and Back while mutation is pending; show spinner on Continue
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 13.4, 13.7_

  - [x] 14.2 Create `ProfileDetailsStep` (`client/src/features/services/onboarding/steps/ProfileDetailsStep.tsx`)
    - Text input for "Headline" (maps to `headline`, max 180 chars) with character counter showing remaining/180
    - `<textarea>` for "About your business" (maps to `bio`)
    - Text inputs for "Contact email", "Contact phone", "Website URL"
    - Logo upload control accepting JPEG, PNG, WebP up to 5 MB; client-side validation with inline errors
    - Call `upsertProviderProfile` mutation on Continue; display inline error on failure; stay on step 2
    - Disable Continue and Back while mutation is pending
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 13.4, 13.7_

  - [x] 14.3 Create `ServicesOfferedStep` (`client/src/features/services/onboarding/steps/ServicesOfferedStep.tsx`)
    - Render dynamic list of service rows, each with: "Service name" text input, "Category" dropdown (six categories), "Min price (ZAR)" number input (min=0, label "R"), "Max price (ZAR)" number input (min=0, label "R")
    - "Add service" button (disabled when row count = 10); remove button on each row
    - Validate `maxPrice >= minPrice` on submit with inline error
    - Require at least one row with non-empty service name to enable Continue
    - Call `replaceProviderServices` mutation on Continue; display inline error on failure; stay on step 3
    - Disable Continue and Back while mutation is pending
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 13.4, 13.7_

  - [x] 14.4 Create `CoverageAreasStep` (`client/src/features/services/onboarding/steps/CoverageAreasStep.tsx`)
    - Render dynamic list of location rows, each with: "Suburb" text input, "City" text input, "SA Province" `<select>` from `SA_PROVINCES`, "Radius (km)" number input defaulting to 25
    - "Add area" button (disabled when row count = 5); remove button on each row
    - Mark first row with a "Primary" label
    - Require at least one row with non-empty city or province to enable Continue
    - Call `replaceProviderLocations` mutation on Continue with `isPrimary: true` on the first row; display inline error on failure; stay on step 4
    - Disable Continue and Back while mutation is pending
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 13.4, 13.7_

  - [x] 14.5 Create `SubscriptionPlanStep` (`client/src/features/services/onboarding/steps/SubscriptionPlanStep.tsx`)
    - Render the three `SUBSCRIPTION_PLANS` as selectable plan cards, each showing tier name, feature list, and ZAR price or "Contact us"
    - Visually highlight `directory_explore` as "Recommended"
    - Display `directory` as free/trial and `ecosystem_pro` as premium
    - On "Go live", advance to the completion screen (step 6)
    - Allow Back to return to step 4 without losing selected plan
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x] 14.6 Create `CompletionScreen` (`client/src/features/services/onboarding/steps/CompletionScreen.tsx`)
    - Display heading "You're live!" with a success icon
    - Display summary of company name and primary service category
    - Display three action links: "View your public profile", "Go to your dashboard", "Complete your profile"
    - Do NOT render `WizardProgressIndicator`
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [x] 15. Create `ProviderOnboardingWizard` and wire to `/service/profile` route
  - [x] 15.1 Create `ProviderOnboardingWizard` (`client/src/features/services/onboarding/ProviderOnboardingWizard.tsx`)
    - Call `useServiceProviderOnboardingStatus()` to determine current state
    - If `status.onboardingStep >= 5`, render the existing profile editing form (not the wizard)
    - Otherwise render the wizard starting at `status.onboardingStep + 1` (or step 1 if no status)
    - Manage all wizard state via `useOnboardingReducer`
    - Render `WizardProgressIndicator` at the top of each step (steps 1–5); omit on completion screen
    - Render encouraging copy line below the step title on each step
    - Pass shared state and dispatch to each step component
    - _Requirements: 7.1, 12.5, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

  - [x] 15.2 Update the `/service/profile` route to render `ProviderOnboardingWizard`
    - Replace the current single-page form component at the `/service/profile` route with `ProviderOnboardingWizard`
    - Preserve the route path `/service/profile` exactly
    - _Requirements: 7.1, 12.5, 15.6_

- [x] 16. Checkpoint — Ensure all onboarding wizard tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Write integration tests
  - [x] 17.1 Write integration test: ServicesHomePage renders TrustBar, CategoryCard grid, and ProviderCard list
    - Mock tRPC `directorySearch` query
    - Assert TrustBar, CategoryCard grid, and at least one ProviderCard are present in the rendered output
    - _Requirements: 1.1, 2.1_

  - [x] 17.2 Write integration test: ServicesRequestPage successful submit navigates to results
    - Mock `createLeadFromJourney` mutation to return a lead ID
    - Complete all three steps of `LeadRequestFlow` and submit
    - Assert navigation to `/services/results/{leadId}`
    - _Requirements: 4.5_

  - [x] 17.3 Write integration test: ProviderOnboardingWizard completes all 5 steps and reaches completion screen
    - Mock all four tRPC mutations (`registerProviderIdentity`, `upsertProviderProfile`, `replaceProviderServices`, `replaceProviderLocations`)
    - Step through all five wizard steps
    - Assert the completion screen with "You're live!" heading is rendered
    - _Requirements: 12.1_

- [x] 18. Final checkpoint — Ensure all tests pass and routes are preserved
  - Run the full test suite and confirm all tests pass
  - Verify all existing URL routes are preserved: `/services`, `/services/:category`, `/services/:category/:city/:province`, `/services/request/:category`, `/services/results/:leadId`, `/services/provider/:slug`, `/services/reviews/:providerId`, `/service/profile`
  - Ensure no tRPC router files, Drizzle schema files, or the main homepage component have been modified
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at each phase boundary
- Property tests validate universal correctness properties using fast-check (minimum 100 iterations each)
- Unit tests validate specific examples, edge cases, and error conditions
- The `LeadRequestWizard` component is replaced by `LeadRequestFlow` — the old file can be deleted once `ServicesRequestPage` is updated
- All price displays use ZAR with the "R" prefix as per South African locale conventions
