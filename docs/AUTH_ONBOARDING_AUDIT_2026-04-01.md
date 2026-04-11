# Auth Onboarding Audit

Date: 2026-04-01

## Registration

### `POST /api/auth/register`

- Defined in `server/_core/authRoutes.ts`.
- Accepts `email`, `password`, `name`, `role`, and optional `agentProfile`.
- Allowed roles are `visitor`, `agent`, `agency_admin`, `property_developer`, and `service_provider`.
- Delegates to `authService.register(...)` in `server/_core/auth.ts`.
- Persists the user with the requested role in `users.role`.
- Generates `emailVerificationToken`.
- Sends a verification email through `sendVerificationEmail(...)` in `server/_core/email.ts`.
- Returns:
  - `success`
  - `verificationEmailSent`
  - `message`
- It does not return a session, user object, redirect target, or onboarding state.

### Verification email template

- Sent from `server/_core/email.ts`.
- Subject: `Verify your email - Property Listify`
- Format: branded HTML email with greeting, CTA button, and raw fallback verification URL.
- Verification link target: `/api/auth/verify-email?token=...`

### Role persistence status

- `visitor`: supported and persisted correctly.
- `agent`: supported and persisted correctly.
- `agency_admin`: supported and persisted correctly.
- `property_developer`: supported and persisted correctly.
- `service_provider`: supported and persisted correctly.

## Email Verification

### `GET /api/auth/verify-email`

- Defined in `server/_core/authRoutes.ts`.
- Calls `authService.verifyEmail(token)` in `server/_core/auth.ts`.
- Current backend behavior:
  - finds user by verification token
  - marks `emailVerified = 1`
  - clears `emailVerificationToken`
  - for `agent`, verifies an agent profile exists
- Redirect behavior today:
  - all roles redirect to `/login?verified=true`
- Role-specific logic at verification:
  - `agent`: extra validation that an agent profile exists
  - no role-specific redirect yet for `visitor`, `agency_admin`, `property_developer`, or `service_provider`

## Post-login Redirect

### Frontend redirect logic

- Defined in `client/src/pages/Login.tsx`.
- Current mapping now includes:
  - `super_admin` -> `/admin/overview`
  - `property_developer` -> `/developer/dashboard`
  - `agency_admin` -> `/agency/dashboard`
  - `service_provider` -> `/service/dashboard`
  - `hasManagerIdentity` -> `/distribution/manager`
  - `hasReferrerIdentity` -> `/referrer/dashboard`
  - `agent` -> `/agent/dashboard`
  - default -> `/user/dashboard`

### Route existence audit

- `/agent/dashboard`
  - Exists.
  - Entry point: `client/src/pages/AgentDashboard.tsx`
  - Functional.
  - Redirects to `/agent/setup` if the agent profile is missing.

- `/developer/dashboard`
  - Exists.
  - Entry point: `client/src/pages/DeveloperRoutes.tsx`
  - Functional.
  - Includes overview, developments, leads, messages, campaigns, plans, analytics, billing, and settings routes.

- `/agency/dashboard`
  - Exists.
  - Entry point: `client/src/pages/AgencyDashboard.tsx`
  - Functional, but still skewed toward dashboard analytics rather than a true first-run setup wizard.

- `/user/dashboard`
  - Exists.
  - Entry point: `client/src/pages/UserDashboard.tsx`
  - Functional.
  - Includes favorites, saved searches, comparisons, alert history, and placeholder appointment activity.

- `/service/dashboard`
  - Added in this change.
  - Reuses the existing provider dashboard page that previously lived behind `/pro/dashboard`.
  - Compatibility redirects keep `/pro/dashboard`, `/pro/profile`, and `/pro/explore` working.

## Onboarding State

### What existed before this change

- `users` already had:
  - `plan`
  - `trialStatus`
  - `trialStartedAt`
  - `trialEndsAt`
- `agents` already had rich profile fields:
  - photo
  - bio
  - phone
  - focus
  - specializations
  - property types
  - areas served
  - languages
  - years of experience
  - social links
  - completion score
  - completion flags
- Backend already had profile-completion logic in `server/services/agentEntitlementService.ts`.

### What was missing before this change

- `users.onboarding_complete`
- `users.onboarding_step`
- `users.subscription_tier`
- `users.subscription_status`

### What this change adds

- Schema update in `drizzle/schema/core.ts`
- Migration file: `server/migrations/0052_add_user_onboarding_state.sql`

Added fields:

- `onboarding_complete BOOLEAN DEFAULT false`
- `onboarding_step INT DEFAULT 0`
- `subscription_tier ENUM('free','starter','professional','elite') DEFAULT 'free'`
- `subscription_status ENUM('trial','active','expired','cancelled') DEFAULT 'trial'`

### Fields from the brief that already existed

- `trial_started_at`
  - already existed as `trialStartedAt`
- `trial_ends_at`
  - already existed as `trialEndsAt`

## Agent-specific Post-registration Flow

### What existed before this change

- Registration creates the user and sends verification email.
- Registration for `agent` can also create the base agent profile immediately.
- Verification only redirects back to `/login?verified=true`.
- Existing onboarding UI/page:
  - `/agent/setup`
  - `/onboarding/agent-profile`
  - backed by `AgentSetupWizard`
- Existing tRPC onboarding/profile procedures:
  - `agent.getMyProfileOnboarding`
  - `agent.updateMyProfileOnboarding`
  - `agent.publishMyProfile`

### What this change adds

Express API endpoints mounted under `/api/agent`:

- `GET /api/agent/onboarding-status`
- `POST /api/agent/select-package`
- `POST /api/agent/profile`

These are implemented by:

- `server/routes/agentOnboarding.ts`
- `server/services/agentOnboardingService.ts`

### Package selection behavior

- `POST /api/agent/select-package`
- Accepts `tier` = `free | starter | professional | elite`
- Sets:
  - `trialStartedAt = now`
  - `trialEndsAt = now + 90 days`
  - `plan = 'trial'`
  - `trialStatus = 'active'`
  - `subscriptionTier = selected tier`
  - `subscriptionStatus = 'trial'`
- Also syncs the pricing-governance `subscriptions` projection through `setSubscriptionPlanForOwner(...)`

### Profile behavior

- `POST /api/agent/profile`
- Saves partial or full onboarding profile data
- Creates the agent profile if missing
- Recalculates completion score and flags
- Updates:
  - `users.onboarding_step`
  - `users.onboarding_complete`
  - `agents.profileCompletionScore`
  - `agents.profileCompletionFlags`

### Current unlock model

- dashboard unlock: `onboardingStep >= 3`
- full features unlock: `onboardingStep >= 4` or completion score at full threshold
- full threshold uses:
  - completion score >= 80
  - has photo
  - has areas

### Still missing for the full product vision

- a package-selection frontend screen
- first-run automatic redirect from email verification directly into package selection
- explicit S3 upload flow inside the new onboarding REST endpoints
- feature-lock banners inside the agent dashboard tied to the new onboarding state

## Other Roles: Current Post-registration Flow

### Visitor

- After verify: returns to `/login?verified=true`, then login redirects to `/user/dashboard`
- No package selection flow exists
- Dashboard exists and shows:
  - favorites
  - saved searches
  - saved-search alert history
  - property comparison
  - placeholder appointment count
- Property search and saved properties exist

### Agency Admin

- After verify: returns to `/login?verified=true`, then login redirects to `/agency/dashboard`
- Agency dashboard exists and is functional
- It shows:
  - stats
  - performance chart
  - explore overview
  - conversion analytics
  - commissions
  - agent leaderboard
  - recent leads and listings
- Missing relative to target flow:
  - enforced first-run agency setup wizard after verification
  - create-agency onboarding gate before dashboard
  - office-setup progression tracking

### Property Developer

- After verify: returns to `/login?verified=true`, then login redirects to `/developer/dashboard`
- Developer dashboard exists and is functional
- It includes overview plus multiple operational subroutes
- Missing relative to target flow:
  - enforced developer onboarding after verification
  - guided company-profile -> projects -> units wizard state

### Service Provider

- After verify: returns to `/login?verified=true`, then login redirects to `/service/dashboard`
- Existing provider/product surface already existed under `/pro/*`
- Current provider capability includes:
  - provider identity creation
  - provider profile editing
  - service categories
  - service locations
  - provider dashboard
  - explore publishing
- `ProProfilePage` already auto-bootstraps a provider identity for `service_provider` users
- Missing relative to target flow:
  - verification-step redirect straight into partner setup
  - explicit onboarding-step tracking on the provider journey
  - dedicated service-provider onboarding wizard

## Deliverables Added In This Change

### Database

- `server/migrations/0052_add_user_onboarding_state.sql`

### Backend endpoints

- `GET /api/agent/onboarding-status`
- `POST /api/agent/select-package`
- `POST /api/agent/profile`

### Frontend routing

- `service_provider` login redirect now points to `/service/dashboard`
- Added `/service/dashboard`
- Added `/service/profile`
- Added `/service/explore`
- Added compatibility redirects from `/pro/*` to `/service/*`

## Overall Exists vs Missing

### Already solid

- auth registration and login
- email verification email sending
- role persistence for all five roles
- buyer dashboard
- agent dashboard and agent setup wizard
- developer dashboard shell
- agency dashboard shell
- service-provider dashboard/profile/explore pages

### Missing or still partial

- role-specific post-verification redirects
- formal onboarding wizard for agency admins
- formal onboarding wizard for developers
- formal onboarding wizard for service providers
- package-selection UI for agents
- feature locking in dashboards based on onboarding state
- one unified onboarding-state model across all non-visitor business roles
