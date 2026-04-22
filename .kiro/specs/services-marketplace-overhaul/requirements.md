# Requirements Document

## Introduction

The Services Marketplace Overhaul transforms the existing SA Property Portal services section from a functional but visually plain experience into a trust-first, conversion-focused marketplace in the style of Angi and HomeAdvisor. The overhaul covers two distinct surfaces:

1. **Consumer-facing pages** — the `/services` landing page, category pages, lead request flow, results page, and provider profile page — all of which need visual polish, trust signals, and a guided, conversational UX.
2. **Service provider onboarding** — the current single-page `/service/profile` form is replaced with a proper multi-step wizard that guides providers through business basics, profile details, services, coverage areas, and subscription selection, ending with a "You're live!" confirmation screen.

No changes are made to the backend services engine, tRPC endpoints, database schema, or the main platform homepage (`/`).

---

## Glossary

- **Services_Marketplace**: The consumer-facing section of the platform accessible at `/services` and its sub-routes.
- **Provider_Onboarding_Wizard**: The new multi-step wizard at `/service/profile` that replaces the current single-page form.
- **Consumer**: A homeowner, buyer, or seller who visits the Services_Marketplace to find and contact service providers.
- **Provider**: A registered service_provider-role user who lists their business on the platform.
- **Category_Card**: A visual card component displaying a service category with an icon, label, and subtitle — replacing the current text-only category chips.
- **Provider_Card**: A visual card component displaying a provider's logo/avatar, star rating, verified badge, response time, and job count.
- **Lead_Request_Flow**: The conversational multi-step UI that replaces the current `LeadRequestWizard` form, guiding the Consumer through service selection, location, and description without exposing internal concepts.
- **Results_Page**: The `/services/results/:leadId` page showing matched providers after a lead is submitted.
- **Trust_Bar**: A section on the Services_Marketplace landing page displaying aggregate trust signals such as verified provider count and average platform rating.
- **Onboarding_Step**: One discrete screen within the Provider_Onboarding_Wizard, each covering a single topic.
- **Progress_Indicator**: A visual element (e.g., step dots or a progress bar) shown at the top of the Provider_Onboarding_Wizard indicating the current Onboarding_Step and total steps.
- **ZAR**: South African Rand — the currency used for all pricing displays.
- **SA_Province**: One of the nine South African provinces used for location selection (e.g., Gauteng, Western Cape, KwaZulu-Natal).
- **Subscription_Tier**: One of three provider subscription levels: `directory`, `directory_explore`, or `ecosystem_pro`.
- **Match_Score**: A numeric value returned by the backend `recommendProviders` endpoint indicating how well a provider matches a lead.
- **Verified_Badge**: A visual indicator shown on Provider_Cards and provider profiles when `verificationStatus === 'verified'`.

---

## Requirements

### Requirement 1: Visual Category Cards on the Services Landing Page

**User Story:** As a Consumer, I want to see visually distinct category cards with icons on the services landing page, so that I can quickly understand what service types are available and navigate to the one I need.

#### Acceptance Criteria

1. THE Services_Marketplace SHALL display all six service categories (`home_improvement`, `finance_legal`, `moving`, `inspection_compliance`, `insurance`, `media_marketing`) as Category_Cards on the `/services` landing page.
2. WHEN a Consumer views the `/services` landing page, THE Services_Marketplace SHALL render each Category_Card with the category icon (sourced from the existing `ServiceCategoryMeta.icon` field), the category label, and the category subtitle.
3. WHEN a Consumer clicks a Category_Card, THE Services_Marketplace SHALL navigate to the corresponding `/services/:category` page.
4. THE Services_Marketplace SHALL replace the existing `CategoryChips` text-only buttons with Category_Cards in the "Popular categories" section of the landing page.
5. WHILE the Services_Marketplace is rendering on a mobile viewport (width < 768px), THE Services_Marketplace SHALL display Category_Cards in a 2-column grid layout.
6. WHILE the Services_Marketplace is rendering on a desktop viewport (width ≥ 768px), THE Services_Marketplace SHALL display Category_Cards in a 3-column or 6-column grid layout.

---

### Requirement 2: Trust Bar on the Services Landing Page

**User Story:** As a Consumer, I want to see aggregate trust signals on the services landing page, so that I feel confident the platform has a meaningful network of vetted providers before I submit a request.

#### Acceptance Criteria

1. THE Services_Marketplace SHALL display a Trust_Bar on the `/services` landing page containing at least two trust signals: the count of verified providers and the platform's average rating.
2. WHEN provider data is loading, THE Services_Marketplace SHALL display skeleton placeholders in the Trust_Bar positions.
3. THE Trust_Bar SHALL display the verified provider count as a whole number followed by the label "verified providers".
4. THE Trust_Bar SHALL display the average platform rating as a decimal to one place (e.g., "4.8") followed by the label "rated by homeowners".
5. THE Services_Marketplace SHALL position the Trust_Bar below the hero search section and above the Category_Cards section.

---

### Requirement 3: Enhanced Provider Cards with Visual Trust Signals

**User Story:** As a Consumer, I want provider cards to show a logo or avatar, visual star ratings, a verified badge, and key stats, so that I can quickly assess and compare providers without opening each profile.

#### Acceptance Criteria

1. THE Provider_Card SHALL display a provider logo or avatar placeholder when no logo image is available, using the provider's company name initials as a fallback.
2. THE Provider_Card SHALL display a visual star rating using filled and empty star icons derived from the provider's `averageRating` value, rounded to the nearest half star.
3. WHEN `averageRating` is null or zero and `reviewCount` is zero, THE Provider_Card SHALL display "New" in place of the star rating.
4. WHEN `verificationStatus === 'verified'`, THE Provider_Card SHALL display a Verified_Badge with a checkmark icon and the label "Verified".
5. THE Provider_Card SHALL display the provider's `reviewCount` as a number followed by "reviews" (e.g., "42 reviews").
6. THE Provider_Card SHALL display the provider's primary service area (suburb, city, or province) as a location line.
7. THE Provider_Card SHALL display the provider's top service `displayName` as a service line.
8. WHERE `subscriptionTier === 'ecosystem_pro'`, THE Provider_Card SHALL display a "Priority Match" indicator to signal premium placement.
9. THE Provider_Card SHALL include a primary "Request quote" button and a secondary "View profile" link.
10. WHILE the Provider_Card is rendering on a mobile viewport (width < 768px), THE Provider_Card SHALL stack all content vertically in a single column.

---

### Requirement 4: Conversational Lead Request Flow

**User Story:** As a Consumer, I want the quote request process to feel like a guided conversation rather than a raw form, so that I can complete my request quickly without being confused by technical terminology.

#### Acceptance Criteria

1. THE Lead_Request_Flow SHALL present the service selection step using visual option tiles (one tile per service category) rather than a plain `<select>` dropdown.
2. THE Lead_Request_Flow SHALL present the location step using separate labelled inputs for suburb, city, and SA_Province — with SA_Province offered as a dropdown of the nine South African provinces.
3. THE Lead_Request_Flow SHALL present the description step using a single `<textarea>` with the placeholder "Describe what you need — the more detail, the better your matches".
4. THE Lead_Request_Flow SHALL NOT expose the labels "intent stage", "source surface", "journey stage", or "source surface" to the Consumer at any point.
5. WHEN a Consumer completes all steps and submits, THE Lead_Request_Flow SHALL call the existing `createLeadFromJourney` tRPC mutation with `intentStage` defaulting to `'general'` and `sourceSurface` defaulting to `'directory'`.
6. THE Lead_Request_Flow SHALL display a step counter (e.g., "Step 2 of 3") and a progress bar at the top of the wizard.
7. WHEN a Consumer clicks "Back", THE Lead_Request_Flow SHALL return to the previous step without losing previously entered data.
8. WHILE the `createLeadFromJourney` mutation is pending, THE Lead_Request_Flow SHALL disable the submit button and display a loading indicator.
9. IF the `createLeadFromJourney` mutation returns an error, THEN THE Lead_Request_Flow SHALL display the error message inline without navigating away.
10. THE Lead_Request_Flow SHALL require the Consumer to select a service category before proceeding to the location step.

---

### Requirement 5: Enhanced Results Page with Match Quality Indicators

**User Story:** As a Consumer, I want the results page to clearly show how well each provider matches my request and make it easy to compare and request quotes, so that I can make a confident decision.

#### Acceptance Criteria

1. THE Results_Page SHALL display each matched provider using the enhanced Provider_Card (as defined in Requirement 3).
2. THE Results_Page SHALL display a match quality indicator for each provider, derived from the `score` value returned by `recommendProviders`, expressed as a percentage or a labelled tier (e.g., "Strong match", "Good match", "Possible match").
3. THE Results_Page SHALL display a human-readable summary of the Consumer's request (service category, location, and any notes) in the sidebar, replacing the current raw field display of "Lead ID", "Stage", and "Category".
4. WHEN `items.length === 0` and the query is not loading, THE Results_Page SHALL display an encouraging empty-state message with a "Request anyway" action and "Edit request" action, without showing raw internal field names.
5. THE Results_Page SHALL display the page heading as "Providers matched for [category label] in [location]" rather than the current generic "Providers matched to your request".
6. WHEN fallback providers are shown, THE Results_Page SHALL label them "Closest available providers" and visually distinguish them from matched providers (e.g., with a muted border or label).

---

### Requirement 6: Enhanced Provider Profile Page

**User Story:** As a Consumer, I want the provider profile page to show a rich, visual profile with a logo, star ratings, service list, coverage map summary, and reviews, so that I can make an informed decision before requesting a quote.

#### Acceptance Criteria

1. THE ServiceProviderProfilePage SHALL display the provider's logo or avatar (with initials fallback) in a prominent header section.
2. THE ServiceProviderProfilePage SHALL display a visual star rating and review count in the header section, consistent with the Provider_Card star rating display.
3. THE ServiceProviderProfilePage SHALL display the Verified_Badge in the header section when `verificationStatus === 'verified'`.
4. THE ServiceProviderProfilePage SHALL display the provider's services as a styled list with the service `displayName`, `description`, and ZAR price range (e.g., "R2 500 – R8 000") when `minPrice` and `maxPrice` are available.
5. IF `minPrice` or `maxPrice` is null for a service, THEN THE ServiceProviderProfilePage SHALL display "Price on request" for that service.
6. THE ServiceProviderProfilePage SHALL display coverage areas as a list of location entries (suburb, city, province, radius in km).
7. THE ServiceProviderProfilePage SHALL display up to 5 recent reviews, each showing the star rating, title, content, and a "Verified review" label when `isVerified === 1`.
8. THE ServiceProviderProfilePage SHALL include a prominent "Request quote" button that navigates to the Lead_Request_Flow pre-filled with the provider's primary category.

---

### Requirement 7: Provider Onboarding Wizard — Step 1: Business Basics

**User Story:** As a Provider, I want the first step of onboarding to capture my business name, primary service category, and a short description, so that I can establish my identity on the platform quickly.

#### Acceptance Criteria

1. THE Provider_Onboarding_Wizard SHALL display Step 1 as the first screen when a service_provider user navigates to `/service/profile` and has not yet completed onboarding.
2. THE Provider_Onboarding_Wizard SHALL display a Progress_Indicator showing "Step 1 of 5" on Step 1.
3. THE Provider_Onboarding_Wizard SHALL present a text input for "Business name" (maps to `companyName`).
4. THE Provider_Onboarding_Wizard SHALL present a visual category selector showing all six service categories as selectable tiles, each with the category icon and label.
5. THE Provider_Onboarding_Wizard SHALL present a `<textarea>` for "Short description" (maps to `bio`).
6. WHEN a Provider clicks "Continue" on Step 1, THE Provider_Onboarding_Wizard SHALL call the existing `registerProviderIdentity` tRPC mutation with the entered `companyName`.
7. IF the `registerProviderIdentity` mutation returns an error, THEN THE Provider_Onboarding_Wizard SHALL display the error message inline and remain on Step 1.
8. THE Provider_Onboarding_Wizard SHALL require a non-empty "Business name" before the "Continue" button is enabled on Step 1.

---

### Requirement 8: Provider Onboarding Wizard — Step 2: Profile Details

**User Story:** As a Provider, I want Step 2 to capture my headline, bio, contact details, and logo, so that my public profile is complete and trustworthy before I go live.

#### Acceptance Criteria

1. THE Provider_Onboarding_Wizard SHALL display Step 2 with a Progress_Indicator showing "Step 2 of 5".
2. THE Provider_Onboarding_Wizard SHALL present a text input for "Headline" (maps to `headline`, max 180 characters).
3. THE Provider_Onboarding_Wizard SHALL present a `<textarea>` for "About your business" (maps to `bio`).
4. THE Provider_Onboarding_Wizard SHALL present text inputs for "Contact email", "Contact phone", and "Website URL".
5. THE Provider_Onboarding_Wizard SHALL present a logo upload control that accepts image files (JPEG, PNG, WebP) up to 5 MB.
6. WHEN a Provider clicks "Continue" on Step 2, THE Provider_Onboarding_Wizard SHALL call the existing `upsertProviderProfile` tRPC mutation with the entered profile fields.
7. IF the `upsertProviderProfile` mutation returns an error, THEN THE Provider_Onboarding_Wizard SHALL display the error message inline and remain on Step 2.
8. THE Provider_Onboarding_Wizard SHALL allow the Provider to click "Back" to return to Step 1 without losing entered data.
9. THE Provider_Onboarding_Wizard SHALL display a character counter for the "Headline" input showing remaining characters out of 180.

---

### Requirement 9: Provider Onboarding Wizard — Step 3: Services Offered

**User Story:** As a Provider, I want Step 3 to let me select the specific services I offer and set pricing ranges in ZAR, so that Consumers can see exactly what I do and what it costs.

#### Acceptance Criteria

1. THE Provider_Onboarding_Wizard SHALL display Step 3 with a Progress_Indicator showing "Step 3 of 5".
2. THE Provider_Onboarding_Wizard SHALL present a list of service entry rows, each with a "Service name" text input, a "Category" dropdown (the six service categories), a "Min price (ZAR)" number input, and a "Max price (ZAR)" number input.
3. THE Provider_Onboarding_Wizard SHALL allow the Provider to add up to 10 service rows using an "Add service" button.
4. THE Provider_Onboarding_Wizard SHALL allow the Provider to remove any service row using a remove button on each row.
5. WHEN a Provider clicks "Continue" on Step 3, THE Provider_Onboarding_Wizard SHALL call the existing `replaceProviderServices` tRPC mutation with the entered services.
6. IF the `replaceProviderServices` mutation returns an error, THEN THE Provider_Onboarding_Wizard SHALL display the error message inline and remain on Step 3.
7. THE Provider_Onboarding_Wizard SHALL require at least one service row with a non-empty "Service name" before the "Continue" button is enabled on Step 3.
8. THE Provider_Onboarding_Wizard SHALL display all prices in ZAR with the "R" prefix in the input labels.
9. THE Provider_Onboarding_Wizard SHALL allow the Provider to click "Back" to return to Step 2 without losing entered data.

---

### Requirement 10: Provider Onboarding Wizard — Step 4: Coverage Areas

**User Story:** As a Provider, I want Step 4 to let me define the geographic areas I serve, so that the matching engine can route relevant leads to me.

#### Acceptance Criteria

1. THE Provider_Onboarding_Wizard SHALL display Step 4 with a Progress_Indicator showing "Step 4 of 5".
2. THE Provider_Onboarding_Wizard SHALL present a list of location entry rows, each with a "Suburb" text input, a "City" text input, an "SA_Province" dropdown (nine South African provinces), and a "Radius (km)" number input defaulting to 25.
3. THE Provider_Onboarding_Wizard SHALL allow the Provider to add up to 5 location rows using an "Add area" button.
4. THE Provider_Onboarding_Wizard SHALL allow the Provider to remove any location row using a remove button on each row.
5. THE Provider_Onboarding_Wizard SHALL mark the first location row as the primary coverage area with a "Primary" label.
6. WHEN a Provider clicks "Continue" on Step 4, THE Provider_Onboarding_Wizard SHALL call the existing `replaceProviderLocations` tRPC mutation with the entered locations, setting `isPrimary: true` on the first row.
7. IF the `replaceProviderLocations` mutation returns an error, THEN THE Provider_Onboarding_Wizard SHALL display the error message inline and remain on Step 4.
8. THE Provider_Onboarding_Wizard SHALL require at least one location row with a non-empty "City" or "SA_Province" before the "Continue" button is enabled on Step 4.
9. THE Provider_Onboarding_Wizard SHALL allow the Provider to click "Back" to return to Step 3 without losing entered data.

---

### Requirement 11: Provider Onboarding Wizard — Step 5: Subscription Plan Selection

**User Story:** As a Provider, I want Step 5 to show me the available subscription plans with clear feature comparisons, so that I can choose the plan that fits my business goals before going live.

#### Acceptance Criteria

1. THE Provider_Onboarding_Wizard SHALL display Step 5 with a Progress_Indicator showing "Step 5 of 5".
2. THE Provider_Onboarding_Wizard SHALL display the three Subscription_Tiers (`directory`, `directory_explore`, `ecosystem_pro`) as selectable plan cards, each showing the tier name, a feature list, and a ZAR price or "Contact us" label.
3. THE Provider_Onboarding_Wizard SHALL visually highlight the `directory_explore` plan as "Recommended".
4. WHEN a Provider selects a plan and clicks "Go live", THE Provider_Onboarding_Wizard SHALL navigate to the confirmation screen (Step 6 / completion screen).
5. THE Provider_Onboarding_Wizard SHALL allow the Provider to click "Back" to return to Step 4 without losing the selected plan.
6. THE Provider_Onboarding_Wizard SHALL display the `directory` tier as the free/trial option and the `ecosystem_pro` tier as the premium option.

---

### Requirement 12: Provider Onboarding Wizard — Completion Screen

**User Story:** As a Provider, I want to see a "You're live!" confirmation screen after completing onboarding, so that I know my profile is active and understand what to do next.

#### Acceptance Criteria

1. WHEN a Provider completes all five Onboarding_Steps, THE Provider_Onboarding_Wizard SHALL display a completion screen with the heading "You're live!" and a success icon.
2. THE completion screen SHALL display a summary of the Provider's company name and primary service category.
3. THE completion screen SHALL display three "next steps" action links: "View your public profile", "Go to your dashboard", and "Complete your profile".
4. THE completion screen SHALL NOT display the Progress_Indicator.
5. WHEN a Provider navigates to `/service/profile` after completing onboarding, THE Provider_Onboarding_Wizard SHALL display the existing profile editing form (not restart the wizard from Step 1).

---

### Requirement 13: Wizard Progress Indicator and Navigation

**User Story:** As a Provider, I want a clear visual progress indicator and the ability to navigate back through the wizard, so that I always know where I am in the process and can correct mistakes.

#### Acceptance Criteria

1. THE Provider_Onboarding_Wizard SHALL display a Progress_Indicator at the top of every Onboarding_Step screen (Steps 1–5).
2. THE Progress_Indicator SHALL show the current step number and total step count (e.g., "Step 3 of 5").
3. THE Progress_Indicator SHALL render a horizontal progress bar filled proportionally to the current step (e.g., 60% filled on Step 3 of 5).
4. THE Provider_Onboarding_Wizard SHALL display an encouraging copy line below the step title on each Onboarding_Step (e.g., "Almost there — just a few more details").
5. WHEN a Provider clicks "Back" on any Onboarding_Step after Step 1, THE Provider_Onboarding_Wizard SHALL navigate to the previous Onboarding_Step.
6. THE Provider_Onboarding_Wizard SHALL preserve all previously entered field values when navigating back and forward between Onboarding_Steps.
7. WHILE a mutation is pending on any Onboarding_Step, THE Provider_Onboarding_Wizard SHALL disable both the "Continue" and "Back" buttons.

---

### Requirement 14: Mobile-First Responsive Design

**User Story:** As a Consumer or Provider using a mobile device, I want all overhauled pages and wizards to be fully usable on small screens, so that I can complete my tasks without horizontal scrolling or broken layouts.

#### Acceptance Criteria

1. THE Services_Marketplace SHALL render all overhauled pages without horizontal overflow on viewports as narrow as 320px.
2. THE Lead_Request_Flow SHALL stack all step content in a single column on viewports narrower than 768px.
3. THE Provider_Onboarding_Wizard SHALL stack all Onboarding_Step content in a single column on viewports narrower than 768px.
4. THE Provider_Card SHALL be fully readable and actionable on viewports as narrow as 320px.
5. THE Category_Card grid SHALL use a 2-column layout on viewports narrower than 640px and a 3-column or wider layout on viewports 640px and above.
6. THE Provider_Onboarding_Wizard SHALL display the Progress_Indicator in a compact single-line format on viewports narrower than 640px.

---

### Requirement 15: No Changes to Backend or Homepage

**User Story:** As a platform maintainer, I want the overhaul to be strictly frontend-only, so that the existing backend logic, database schema, and main homepage remain stable and unaffected.

#### Acceptance Criteria

1. THE Services_Marketplace overhaul SHALL NOT modify any tRPC router, service, or procedure in the `servicesEngineRouter` or `servicesEngineService`.
2. THE Services_Marketplace overhaul SHALL NOT modify the Drizzle ORM schema files for the services engine tables.
3. THE Services_Marketplace overhaul SHALL NOT modify the main platform homepage component at route `/`.
4. THE Lead_Request_Flow SHALL call only the existing `createLeadFromJourney` tRPC mutation — no new backend endpoints SHALL be introduced for lead creation.
5. THE Provider_Onboarding_Wizard SHALL call only the existing tRPC mutations: `registerProviderIdentity`, `upsertProviderProfile`, `replaceProviderServices`, and `replaceProviderLocations`.
6. THE Services_Marketplace overhaul SHALL preserve all existing URL routes (`/services`, `/services/:category`, `/services/:category/:city/:province`, `/services/request/:category`, `/services/results/:leadId`, `/services/provider/:slug`, `/services/reviews/:providerId`, `/service/profile`).
