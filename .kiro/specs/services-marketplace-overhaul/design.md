# Design Document — Services Marketplace Overhaul

## Overview

This document describes the frontend-only redesign of the SA Property Portal services section. The goal is to transform a functional but visually plain experience into a trust-first, conversion-focused marketplace in the style of Angi and HomeAdvisor.

**Scope boundary**: All changes are confined to `client/src`. No tRPC routers, Drizzle schema files, or the main homepage (`/`) are touched. All existing URL routes are preserved.

**Tech stack**: React 19 + TypeScript, TailwindCSS v4, shadcn/ui, Framer Motion, Wouter, tRPC + TanStack Query.

The overhaul covers two surfaces:

1. **Consumer-facing** — `ServicesHomePage`, `ServicesRequestPage`, `ServicesResultsPage`, `ServiceProviderProfilePage`, and supporting components.
2. **Provider onboarding** — a new `ProviderOnboardingWizard` at `/service/profile` replacing the current single-page form.

---

## Architecture

### Component Tree

```
ServicesHomePage
├── ServiceHeroSearch (existing, unchanged)
├── TrustBar (NEW)
├── CategoryCard grid (NEW — replaces CategoryChips in this section)
├── DemandCarousel (existing, unchanged)
├── PopularProjectsGrid (existing, unchanged)
└── ProviderCard (ENHANCED) × N

ServicesRequestPage
└── LeadRequestFlow (NEW — replaces LeadRequestWizard)
    ├── WizardProgressIndicator (NEW, shared)
    ├── Step 1: CategoryTileGrid (NEW, shared with onboarding)
    ├── Step 2: LocationStep (suburb + city + SA province dropdown)
    └── Step 3: DescriptionStep (textarea)

ServicesResultsPage
├── MatchedProviderList
│   └── ProviderCard (ENHANCED) + MatchQualityBadge (NEW)
└── RequestSummarySidebar (NEW — replaces raw field sidebar)

ServiceProviderProfilePage
├── ProviderProfileHeader (ENHANCED — logo/avatar, stars, verified badge)
├── ServicesSection (ENHANCED — ZAR price ranges)
├── CoverageAreasSection (existing structure, enhanced display)
└── ReviewsSection (ENHANCED — verified labels, up to 5)

/service/profile route
└── ProviderOnboardingWizard (NEW)
    ├── WizardProgressIndicator (shared)
    ├── Step 1: BusinessBasicsStep
    │   └── CategoryTileGrid (shared)
    ├── Step 2: ProfileDetailsStep
    ├── Step 3: ServicesOfferedStep
    ├── Step 4: CoverageAreasStep
    ├── Step 5: SubscriptionPlanStep
    └── CompletionScreen
```

### Data Flow

```
tRPC endpoints (unchanged)
    │
    ▼
TanStack Query hooks (existing)
    │
    ▼
Page components (ServicesHomePage, etc.)
    │
    ├── pass provider[] → TrustBar (derives counts client-side)
    ├── pass provider[] → ProviderCard (enhanced display)
    ├── pass score → MatchQualityBadge (pure derivation)
    └── wizard state → step components (local React state, no server round-trips between steps)
```

The wizard accumulates form state in a single `useReducer` at the `ProviderOnboardingWizard` level. Each step reads from and writes to that shared state. tRPC mutations are called only on "Continue" — not on every keystroke.

### File Layout (new and modified files)

```
client/src/
  components/services/
    CategoryCard.tsx          (NEW)
    TrustBar.tsx              (NEW)
    MatchQualityBadge.tsx     (NEW)
    WizardProgressIndicator.tsx (NEW)
    CategoryTileGrid.tsx      (NEW — shared between LeadRequestFlow and wizard)
    ProviderAvatar.tsx        (NEW — logo/initials fallback, star rating)
    StarRating.tsx            (NEW — pure display component)
    ProviderCard.tsx          (ENHANCED)
    ProviderBadges.tsx        (ENHANCED — Verified badge with icon)
    ServicesSkeletons.tsx     (ENHANCED — TrustBar skeleton)
  pages/services/
    ServicesHomePage.tsx      (MODIFIED)
    ServicesRequestPage.tsx   (MODIFIED — swap wizard)
    ServicesResultsPage.tsx   (MODIFIED — match indicators, sidebar)
    ServiceProviderProfilePage.tsx (MODIFIED — full visual overhaul)
  features/services/
    onboarding/
      ProviderOnboardingWizard.tsx  (NEW)
      steps/
        BusinessBasicsStep.tsx      (NEW)
        ProfileDetailsStep.tsx      (NEW)
        ServicesOfferedStep.tsx     (NEW)
        CoverageAreasStep.tsx       (NEW)
        SubscriptionPlanStep.tsx    (NEW)
        CompletionScreen.tsx        (NEW)
      useOnboardingReducer.ts       (NEW)
    LeadRequestFlow.tsx             (NEW — replaces LeadRequestWizard)
    steps/
      CategorySelectionStep.tsx     (NEW)
      LocationStep.tsx              (NEW)
      DescriptionStep.tsx           (NEW)
```

---

## Components and Interfaces

### `CategoryCard`

```tsx
type CategoryCardProps = {
  category: ServiceCategoryMeta;  // from catalog.ts
  onClick: (value: ServiceCategory) => void;
};
```

Renders a card with the Lucide icon (resolved from `category.icon` string), the `category.label` in bold, and `category.subtitle` in muted text. Uses `motion.div` from Framer Motion for a subtle hover scale (`scale: 1.02`). Grid layout is controlled by the parent (`ServicesHomePage`).

Icon resolution: a local `ICON_MAP` record maps the six icon name strings (`'Hammer'`, `'Scale'`, `'Truck'`, `'ClipboardCheck'`, `'ShieldCheck'`, `'Camera'`) to their Lucide React components. This avoids dynamic imports and keeps the bundle deterministic.

### `TrustBar`

```tsx
type TrustBarProps = {
  providers: ProviderDirectoryItem[];
  isLoading: boolean;
};
```

Derives two values client-side from the `providers` array:
- `verifiedCount` — `providers.filter(p => p.verificationStatus === 'verified').length`
- `averageRating` — mean of all non-null `averageRating` values, formatted to one decimal place

Displays three trust signals in a horizontal row (wraps on mobile):
1. Verified provider count + "verified providers"
2. Average rating + "rated by homeowners"
3. Static copy: "Matched to your location"

When `isLoading` is true, renders three `Skeleton` components (from shadcn/ui) in place of the values.

### `StarRating`

```tsx
type StarRatingProps = {
  rating: number | null | undefined;  // 0–5
  reviewCount?: number | null;
  size?: 'sm' | 'md';
  showCount?: boolean;
};
```

Pure display component. Renders 5 star icons. Each star is filled, half-filled, or empty based on rounding the `rating` to the nearest 0.5. Uses Lucide `Star` and `StarHalf` icons with `fill` applied via className. When `rating` is null/0 and `reviewCount` is 0, renders the text "New" instead of stars.

**Rounding logic** (pure function, exported for testing):
```ts
export function roundToHalfStar(rating: number): number {
  return Math.round(rating * 2) / 2;
}
```

### `ProviderAvatar`

```tsx
type ProviderAvatarProps = {
  companyName: string;
  logoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';  // 32px / 48px / 80px
};
```

If `logoUrl` is provided, renders an `<img>` with `onError` fallback to initials. Initials are derived by splitting `companyName` on whitespace and taking the first character of the first two words, uppercased. Single-word names use the first two characters.

**Initials logic** (pure function, exported for testing):
```ts
export function getInitials(companyName: string): string {
  const words = companyName.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
```

### `ProviderCard` (enhanced)

```tsx
// Extends existing ProviderDirectoryItem — no new fields required
type ProviderCardProps = {
  provider: ProviderDirectoryItem;
  matchScore?: number;          // 0–1, optional — shown on results page
  ctaLabel?: string;
  onCta?: (providerId: string) => void;
  onViewProfile?: (providerId: string) => void;
  isFallback?: boolean;         // muted border styling for fallback providers
};
```

Layout (left to right on desktop, stacked on mobile):
1. `ProviderAvatar` (48px)
2. Company name + `StarRating` + review count
3. Verified badge (if applicable) + Priority Match chip (if `ecosystem_pro`)
4. Location line: `[suburb, city, province].filter(Boolean).join(', ') || 'National'`
5. Service line: `topService.displayName || 'General support'`
6. CTA buttons: "Request quote" (primary) + "View profile" (outline)

When `matchScore` is provided, renders a `MatchQualityBadge` in the top-right corner.

### `MatchQualityBadge`

```tsx
type MatchQualityBadgeProps = {
  score: number;  // 0–1
};
```

**Score-to-label mapping** (pure function, exported for testing):
```ts
export function getMatchLabel(score: number): 'Strong match' | 'Good match' | 'Possible match' {
  if (score >= 0.75) return 'Strong match';
  if (score >= 0.45) return 'Good match';
  return 'Possible match';
}
```

Color coding: Strong = green, Good = amber, Possible = slate.

### `WizardProgressIndicator`

```tsx
type WizardProgressIndicatorProps = {
  currentStep: number;   // 1-based
  totalSteps: number;
  encouragingCopy?: string;
};
```

Renders:
- Step label: `"Step {currentStep} of {totalSteps}"`
- Horizontal `<progress>` bar (or a styled `<div>` with `width: (currentStep/totalSteps)*100%`)
- Optional `encouragingCopy` line in muted text below the bar

On viewports < 640px, the step label and bar are on a single compact line.

### `CategoryTileGrid`

```tsx
type CategoryTileGridProps = {
  selected: ServiceCategory | null;
  onSelect: (category: ServiceCategory) => void;
  columns?: 2 | 3 | 6;  // defaults to responsive (2 mobile, 3 tablet, 6 desktop)
};
```

Shared between `LeadRequestFlow` (step 1) and `ProviderOnboardingWizard` (step 1). Renders all six categories as selectable tiles. Selected tile gets a ring highlight. Uses the same `ICON_MAP` as `CategoryCard`.

### `LeadRequestFlow`

```tsx
type LeadRequestFlowProps = {
  defaultCategory: ServiceCategory;
  defaultLocation?: string;
  submitting?: boolean;
  error?: string | null;
  onSubmit: (payload: LeadWizardSubmit) => void;
};

// LeadWizardSubmit is the same type as before — no changes to the mutation payload
```

Three steps:
1. **Category** — `CategoryTileGrid`, requires selection to enable Continue
2. **Location** — three separate inputs: Suburb (text), City (text), Province (`<select>` with 9 SA provinces)
3. **Description** — `<textarea>` with placeholder "Describe what you need — the more detail, the better your matches"

Internal state: `{ step, category, suburb, city, province, notes }`. `intentStage` is hardcoded to `'general'`; `sourceSurface` is hardcoded to `'directory'`. Neither is exposed in the UI.

On submit, calls `onSubmit` with the assembled payload. Error from parent is displayed inline above the submit button.

### `ProviderOnboardingWizard`

```tsx
// No props — reads auth context and onboarding status internally
```

Checks `useServiceProviderOnboardingStatus()`. If `status.onboardingStep >= 5` (all steps complete), renders the existing profile editing form. Otherwise renders the wizard starting at `status.onboardingStep + 1` (or step 1 if no status).

State is managed by `useOnboardingReducer` (see Data Models section).

### `SubscriptionPlanStep` — Plan Card data

```ts
const SUBSCRIPTION_PLANS = [
  {
    tier: 'directory' as const,
    name: 'Directory',
    price: 'Free',
    description: 'Basic listing in the service directory.',
    features: ['Listed in directory', 'Consumer can view profile', 'Manual lead routing'],
    recommended: false,
  },
  {
    tier: 'directory_explore' as const,
    name: 'Directory + Explore',
    price: 'R299 / month',
    description: 'Directory listing plus visibility in the Explore feed.',
    features: ['Everything in Directory', 'Explore feed visibility', 'Automated lead matching'],
    recommended: true,
  },
  {
    tier: 'ecosystem_pro' as const,
    name: 'Ecosystem Pro',
    price: 'Contact us',
    description: 'Full ecosystem access with priority matching.',
    features: ['Everything in Directory + Explore', 'Priority Match placement', 'Dedicated account support'],
    recommended: false,
  },
] as const;
```

---

## Data Models

### SA Provinces constant

```ts
// client/src/features/services/catalog.ts — ADD to existing file
export const SA_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
] as const;

export type SAProvince = (typeof SA_PROVINCES)[number];
```

### Onboarding Wizard State

```ts
// useOnboardingReducer.ts

type ServiceRow = {
  id: string;           // client-side uuid for React key
  displayName: string;
  category: ServiceCategory;
  minPrice: string;     // string for input binding, parsed to number on submit
  maxPrice: string;
};

type LocationRow = {
  id: string;
  suburb: string;
  city: string;
  province: SAProvince | '';
  radiusKm: string;     // string for input binding, defaults to '25'
};

type OnboardingState = {
  currentStep: number;  // 1–5, or 6 for completion screen
  // Step 1
  companyName: string;
  primaryCategory: ServiceCategory | null;
  bio: string;
  // Step 2
  headline: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;
  logoFile: File | null;
  logoPreviewUrl: string | null;
  // Step 3
  services: ServiceRow[];
  // Step 4
  locations: LocationRow[];
  // Step 5
  selectedPlan: 'directory' | 'directory_explore' | 'ecosystem_pro' | null;
  // Meta
  errors: Record<number, string>;   // step → error message
  pendingStep: number | null;       // which step has a pending mutation
};

type OnboardingAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'SET_FIELD'; field: keyof OnboardingState; value: unknown }
  | { type: 'ADD_SERVICE' }
  | { type: 'REMOVE_SERVICE'; id: string }
  | { type: 'UPDATE_SERVICE'; id: string; field: keyof ServiceRow; value: string }
  | { type: 'ADD_LOCATION' }
  | { type: 'REMOVE_LOCATION'; id: string }
  | { type: 'UPDATE_LOCATION'; id: string; field: keyof LocationRow; value: string }
  | { type: 'SET_ERROR'; step: number; message: string }
  | { type: 'CLEAR_ERROR'; step: number }
  | { type: 'SET_PENDING'; step: number | null };
```

### `RequestSummarySidebar` data shape

The sidebar on `ServicesResultsPage` reads from URL query params (already available) and formats them for display:

```ts
type RequestSummary = {
  categoryLabel: string;   // formatCategoryLabel(category)
  location: string;        // formatArea(city, province, suburb)
  notes?: string;          // from sessionStorage lead context
};
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: CategoryCard renders all required fields

*For any* `ServiceCategoryMeta` object, rendering a `CategoryCard` with that metadata should produce output that contains the category's icon name, label, and subtitle.

**Validates: Requirements 1.2**

---

### Property 2: TrustBar formats verified count correctly

*For any* non-negative integer `n`, the trust bar's verified count display should be a whole number followed by the text "verified providers" — never a decimal, never a different label.

**Validates: Requirements 2.3**

---

### Property 3: TrustBar formats average rating correctly

*For any* rating value in the range [0, 5], the trust bar's rating display should be formatted to exactly one decimal place followed by "rated by homeowners".

**Validates: Requirements 2.4**

---

### Property 4: Star rating rounds to nearest half star

*For any* `averageRating` value in [0, 5], `roundToHalfStar(rating)` should return a value that is a multiple of 0.5, is within 0.25 of the input, and is in the range [0, 5].

**Validates: Requirements 3.2**

---

### Property 5: Provider avatar initials are always non-empty

*For any* non-empty `companyName` string, `getInitials(companyName)` should return a string of 1–2 uppercase characters.

**Validates: Requirements 3.1, 6.1**

---

### Property 6: ProviderCard displays Verified badge iff verificationStatus is 'verified'

*For any* `ProviderDirectoryItem`, the rendered `ProviderCard` should contain a Verified badge element if and only if `verificationStatus === 'verified'`.

**Validates: Requirements 3.4, 6.3**

---

### Property 7: ProviderCard displays Priority Match iff subscriptionTier is 'ecosystem_pro'

*For any* `ProviderDirectoryItem`, the rendered `ProviderCard` should contain a "Priority Match" indicator if and only if `subscriptionTier === 'ecosystem_pro'`.

**Validates: Requirements 3.8**

---

### Property 8: LeadRequestFlow never exposes internal jargon

*For any* step (1, 2, or 3) of the `LeadRequestFlow`, the rendered DOM should not contain the strings "intent stage", "source surface", "journey stage", or "source surface" in any visible text node.

**Validates: Requirements 4.4**

---

### Property 9: LeadRequestFlow step counter reflects current step

*For any* step `n` in {1, 2, 3}, the `WizardProgressIndicator` rendered within `LeadRequestFlow` should display the text "Step n of 3" and the progress bar fill should equal `n / 3 * 100%`.

**Validates: Requirements 4.6**

---

### Property 10: LeadRequestFlow preserves data on back navigation

*For any* combination of entered category, suburb, city, province, and notes, navigating forward to step 3 and then back to step 1 should preserve all previously entered values unchanged.

**Validates: Requirements 4.7**

---

### Property 11: Match quality label is deterministic and exhaustive

*For any* score value in [0, 1], `getMatchLabel(score)` should return exactly one of "Strong match", "Good match", or "Possible match" — never throws, never returns undefined.

**Validates: Requirements 5.2**

---

### Property 12: Results page heading contains category label and location

*For any* `ServiceCategory` and location string, the `ServicesResultsPage` heading should contain the human-readable category label (not the raw enum value) and the formatted location string.

**Validates: Requirements 5.5**

---

### Property 13: ZAR price range formatting

*For any* service with non-null `minPrice` and `maxPrice`, `formatPriceRange(min, max)` should return a string matching the pattern `R{min} – R{max}` where both values are formatted as whole numbers with no decimal places.

**Validates: Requirements 6.4**

---

### Property 14: Reviews list is capped at 5

*For any* array of reviews of length `n`, the profile page should display exactly `Math.min(n, 5)` review items.

**Validates: Requirements 6.7**

---

### Property 15: Wizard progress indicator reflects current step

*For any* step `n` in {1, 2, 3, 4, 5}, the `WizardProgressIndicator` should display "Step n of 5" and the progress bar fill should equal `n / 5 * 100%`.

**Validates: Requirements 7.2, 13.2, 13.3**

---

### Property 16: Onboarding service rows add/remove invariant

*For any* current service row count `k` where `k < 10`, clicking "Add service" should increase the row count to `k + 1`. For any `k > 1`, clicking remove on any row should decrease the count to `k - 1`.

**Validates: Requirements 9.3, 9.4**

---

### Property 17: Onboarding location rows add/remove invariant

*For any* current location row count `k` where `k < 5`, clicking "Add area" should increase the row count to `k + 1`. For any `k > 1`, clicking remove on any row should decrease the count to `k - 1`.

**Validates: Requirements 10.3, 10.4**

---

## Error Handling

### Consumer-facing errors

| Scenario | Handling |
|---|---|
| `createLeadFromJourney` mutation error | Inline error message above submit button in `LeadRequestFlow`; step does not advance; button re-enabled |
| `recommendProviders` query error | `ServicesResultsPage` shows a retry card with "Something went wrong" and a "Try again" button |
| `getProviderPublicProfile` query error | `ServiceProviderProfilePage` shows a card with "Unable to load profile" and a back link |
| Provider data loading | Skeleton components in `TrustBar`, `ProviderCard` list |
| Empty results | Encouraging empty state with "Request anyway" and "Edit request" actions |

### Provider onboarding errors

| Scenario | Handling |
|---|---|
| `registerProviderIdentity` error | Inline error below the form on Step 1; wizard stays on Step 1 |
| `upsertProviderProfile` error | Inline error on Step 2; wizard stays on Step 2 |
| `replaceProviderServices` error | Inline error on Step 3; wizard stays on Step 3 |
| `replaceProviderLocations` error | Inline error on Step 4; wizard stays on Step 4 |
| Logo upload > 5 MB | Client-side validation before mutation; inline error "Image must be under 5 MB" |
| Logo upload wrong type | Client-side validation; inline error "Please upload a JPEG, PNG, or WebP image" |
| Mutation pending | Both "Continue" and "Back" buttons disabled; spinner on "Continue" |

### Input validation (client-side, before mutation)

- **Step 1**: `companyName.trim().length > 0` required to enable Continue
- **Step 3**: At least one row with non-empty `displayName` required
- **Step 4**: At least one row with non-empty `city` or `province` required
- **Headline** (Step 2): max 180 characters enforced by `maxLength` attribute and character counter
- **Price inputs** (Step 3): `min={0}` on number inputs; `maxPrice >= minPrice` validated on submit with inline error

---

## Testing Strategy

### Unit tests (Vitest + React Testing Library)

Focus on specific examples, edge cases, and error conditions:

- `StarRating`: renders "New" when rating is null and reviewCount is 0
- `ProviderAvatar`: renders initials when no logoUrl provided
- `MatchQualityBadge`: renders correct label and color for boundary score values (0.74, 0.75, 0.44, 0.45)
- `LeadRequestFlow`: Continue button disabled when no category selected on step 1
- `LeadRequestFlow`: submitting=true disables submit button and shows loading indicator
- `LeadRequestFlow`: error prop displays inline error message
- `ProviderOnboardingWizard`: renders completion screen when onboardingStep >= 5
- `SubscriptionPlanStep`: `directory_explore` card has "Recommended" label
- `ServicesResultsPage`: empty state shows "Request anyway" and "Edit request" buttons
- `ServiceProviderProfilePage`: "Price on request" shown when minPrice is null

### Property-based tests (fast-check, minimum 100 iterations each)

Each property test is tagged with a comment referencing the design property it validates.

```
// Feature: services-marketplace-overhaul, Property 4: Star rating rounds to nearest half star
fc.assert(fc.property(fc.float({ min: 0, max: 5 }), (rating) => {
  const rounded = roundToHalfStar(rating);
  return rounded % 0.5 === 0 && rounded >= 0 && rounded <= 5 && Math.abs(rounded - rating) <= 0.25;
}), { numRuns: 100 });
```

Properties to implement as fast-check tests:
- **Property 2**: `formatVerifiedCount(n)` for any `n >= 0` (fc.nat)
- **Property 3**: `formatRating(r)` for any `r` in [0, 5] (fc.float)
- **Property 4**: `roundToHalfStar(r)` for any `r` in [0, 5]
- **Property 5**: `getInitials(name)` for any non-empty string (fc.string with minLength: 1)
- **Property 8**: Rendered LeadRequestFlow for any step contains no jargon strings
- **Property 9**: WizardProgressIndicator for any step in [1, 3]
- **Property 11**: `getMatchLabel(score)` for any score in [0, 1] (fc.float)
- **Property 13**: `formatPriceRange(min, max)` for any non-negative integers where max >= min
- **Property 14**: Reviews list length for any array of length n (fc.array)
- **Property 15**: WizardProgressIndicator for any step in [1, 5]
- **Property 16**: Service row add/remove for any starting count in [1, 9]
- **Property 17**: Location row add/remove for any starting count in [1, 4]

Properties 6, 7, 10, 12 are better covered by example-based tests due to their reliance on React rendering context.

### Integration tests

- `ServicesHomePage` renders with mocked tRPC: TrustBar, CategoryCard grid, and ProviderCard list all present
- `ServicesRequestPage` with mocked `createLeadFromJourney`: successful submit navigates to results page
- `ProviderOnboardingWizard` with mocked mutations: completing all 5 steps reaches completion screen

### Accessibility

- All interactive elements have accessible labels (`aria-label` or visible text)
- Star rating uses `aria-label="4.5 out of 5 stars"` on the container
- Progress bar uses `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- Category tiles use `role="radio"` within a `role="radiogroup"` for keyboard navigation
- Wizard step transitions use `aria-live="polite"` on the step content container
- Color is never the sole differentiator (match quality badges include text labels)
