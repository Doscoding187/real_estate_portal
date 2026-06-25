# Navigation Architecture Decision - 2026-06-25

## Status

Accepted.

Navigation cleanup Phase 1 and Phase 2 are complete and merged through pull requests.

- Phase 1: public/admin navigation cleanup.
- Phase 2: workspace navigation ownership cleanup.
- Phase 2 PR: #312.
- Phase 2 merge commit: `08216171`.

## Purpose

This document records the approved navigation ownership model so future agents do not re-open or accidentally reverse the same decisions.

The goal is not to merge every navigation component into one component. The goal is to keep clear route ownership so public, search, admin, and workspace flows do not clash.

## Approved Navigation Components and Layouts

### `HomeLayout`

Public marketing and public profile pages should use `HomeLayout`, which provides the enhanced public navigation experience.

Approved route/page examples:

- `/`
- `/advertise`
- `/subscription-plans`
- `/agents`
- public agent detail/profile pages
- public service/topic landing pages where applicable

Examples already migrated:

- `client/src/pages/Agents.tsx`
- `client/src/pages/AgentDetail.tsx`
- `client/src/pages/AgentMicrosite.tsx`
- `client/src/pages/AgentPublicProfile.tsx`
- `client/src/pages/SubscriptionPlans.tsx`

### `ListingNavbar`

Search, listing, development browsing, comparison, and location-style experiences should keep `ListingNavbar`.

Do not replace `ListingNavbar` with `HomeLayout` or `Navbar` unless a route is deliberately reclassified.

Approved route/page examples:

- `/property-for-sale`
- `/property-to-rent`
- `/properties`
- `/property/:id`
- `/new-developments`
- `/development/:slug`
- `/compare`
- province/city/suburb location pages

Examples:

- `client/src/pages/SearchResults.tsx`
- `client/src/pages/PropertyDetail*.tsx`
- `client/src/pages/DevelopmentDetail.tsx`
- `client/src/components/location/LocationPageLayout.tsx`

### `SuperAdminDashboard`

Registry-backed admin dashboard pages should be rendered inside `SuperAdminDashboard`.

Admin child pages should not render the legacy `Navbar` when they are already wrapped by the admin shell.

Important exception:

- `/admin/review/:id` is a special review route outside the normal admin shell. Do not remove or change its navigation/layout blindly.

### `ProspectLayout`

`ProspectLayout` is the lightweight account/prospect wrapper introduced in Phase 2.

Approved pages:

- `client/src/pages/Favorites.tsx`
- `client/src/pages/UserDashboard.tsx`

`UserDashboard` must preserve its custom gradient background via the layout `className` override.

Do not automatically migrate `/dashboard` into `ProspectLayout`.

### `AgencyLayout`

`AgencyLayout` is transitional.

It currently centralizes the legacy `Navbar` for selected agency workspace pages while future agency workspace navigation is designed.

Approved pages:

- `client/src/pages/AgencyDashboard.tsx`
- `client/src/pages/agency/SubscriptionPage.tsx`
- `client/src/pages/agency/InviteAgents.tsx`
- `client/src/pages/agency/AgentManagement.tsx`

Do not treat this as the final agency shell. A future phase may replace it with a dedicated agency workspace shell.

Do not wrap agency onboarding routes with this layout unless explicitly approved.

### `AgentAppShell`

Agent workspace pages that already use `AgentAppShell` should remain on it.

Do not move agent dashboard/workspace routes to `HomeLayout`, `ProspectLayout`, `AgencyLayout`, or the legacy `Navbar`.

Approved examples:

- `/agent/dashboard`
- `/agent/listings`
- `/agent/leads`
- `/agent/marketing`
- `/agent/earnings`
- `/agent/analytics`
- `/agent/productivity`
- `/agent/training`
- `/agent/settings`

The old `/agent/calendar` route now redirects to `/agent/productivity`.

## Legacy `Navbar`

`Navbar` still exists and must not be deleted yet.

It remains a legacy/shared fallback for routes that have not been reclassified or migrated.

Known intentional hold:

- `/dashboard` still uses `Navbar`.

Reason:

`/dashboard` is a mixed-role legacy property-management dashboard, not a simple prospect dashboard. It includes property listing management, admin handling, distribution referrer redirection, and listing creation entry points. It needs a separate product and route decision before migration.

## `/agencies` Decision

Public `Find Agencies` links were removed from public navigation/footer during Phase 1.

Do not re-add `/agencies` to the public nav unless the public agency directory/product story is explicitly approved.

Valid remaining agency-related routes include admin and advertise routes such as:

- `/admin/agencies`
- `/advertise/sell/agencies`

## Routes Intentionally Not Changed

The following were intentionally left alone:

- `/saved-search/manage`
- `/dashboard`
- agent onboarding routes
- agency onboarding routes
- distribution/referral routes
- search/detail routes using `ListingNavbar`

## Post-Merge Verification

Post-merge verification after PR #312 confirmed:

- TypeScript check passed.
- Production build passed.
- `git diff --check` passed.
- Public `/agencies` and `Find Agencies` links did not return.
- Phase 1 public pages use `HomeLayout`.
- Search/detail pages still use `ListingNavbar`.
- Admin dashboard routes are wrapped by `SuperAdminDashboard`.
- `Favorites` and `UserDashboard` use `ProspectLayout`.
- Agency dashboard/subscription/invite/agents use transitional `AgencyLayout`.
- `/agent/calendar` redirects to `/agent/productivity`.
- `/saved-search/manage` was intentionally left unchanged.
- `/dashboard` intentionally remains on legacy `Navbar`.

## Future Cleanup Order

Recommended next phases:

1. Decide the future of `/dashboard`.
   - Is it a property-management dashboard?
   - Should it become agent-only, owner-only, admin-only, or redirected by role?

2. Design a real agency workspace shell.
   - Replace transitional `AgencyLayout`.
   - Do not change agency business logic in the same phase.

3. Extract shared account/navigation helpers.
   - display name
   - initials
   - dashboard route
   - role labels
   - account menu route behavior

4. Review distribution manager pages currently using `ListingNavbar`.
   - Treat this as referral/distribution navigation cleanup, not search navigation cleanup.

## Rules for Future Agents

- Do not merge navigation work directly into `main`; use a branch and PR.
- Do not replace nav components globally.
- Do not delete `Navbar.tsx` yet.
- Do not move dashboard/workspace pages into public marketing navigation.
- Do not change business logic while doing navigation cleanup.
- Preserve existing page backgrounds and content when changing layout wrappers.
- Keep cleanup phases small and reviewable.
