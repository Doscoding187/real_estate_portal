# Agent Dashboard Status Report (2026-02-24)

## Scope
- Audited current agent dashboard routes, page components, and core backend procedures used by the agent UI.
- Classified each area as:
  - built and mostly working
  - built but partial/mock/not working reliably

## What Is Already Built

### Core routing and navigation shell
- Agent routes exist for:
  - `/agent/dashboard`
  - `/agent/listings`
  - `/agent/leads`
  - `/agent/marketing`
  - `/agent/earnings`
  - `/agent/analytics`
  - `/agent/productivity`
  - `/agent/training`
  - `/agent/settings`
  - `/agent/setup`
- Sidebar + top nav components are implemented and used across most agent pages.

### Agent onboarding/setup workflow
- Onboarding wizard is implemented with step-based profile completion.
- Supports profile save and publish flows:
  - `agent.getMyProfileOnboarding`
  - `agent.updateMyProfileOnboarding`
  - `agent.publishMyProfile`
- Physical profile photo upload is implemented via presigned upload:
  - `upload.presign`
  - hidden file input + upload dropzone button.

### Listings (most production-ready section)
- Listings page has real data and mutation wiring:
  - `agent.getMyListings`
  - `listing.myListings`
  - `agent.archiveProperty`
  - `agent.deleteProperty`
  - `listing.archive`
  - `listing.delete`
- Search + status tab filtering + archive/delete actions are implemented.

### Backend CRM endpoints are implemented
- Agent router provides real procedures for:
  - dashboard stats
  - leads pipeline
  - lead stage mutation
  - showings
  - commissions
  - notifications
  - CSV export

## Built But Not Working Reliably (or still mock/partial)

### 1) Login/session handoff into dashboard is unstable in some environments
- Observed failure mode: login succeeds, then app returns to login after `auth.me` 500.
- Error points to subscription projection query against `subscriptions` (`owner_type`, `owner_id`).
- Impact: user appears logged in briefly, then session-driven UI fails and redirects.

### 2) Redirect logic is executed during render (React anti-pattern)
- Multiple agent pages call `setLocation(...)` directly in render conditions.
- This can trigger warnings like:
  - "Cannot update a component (`ComparisonBar`) while rendering a different component (`AgentDashboard`)."
- Impact: unstable navigation, noisy console, potential redirect loops.

### 3) Overview/dashboard content is largely scaffolded
- Main dashboard (`/agent/dashboard`) loads shell and KPI call, but many sections use empty/mock arrays:
  - appointments
  - new leads list
  - tasks
  - alerts
  - explore videos
- Top nav notifications/messages are also mock arrays in the current shell component.

### 4) Leads page is using mock pipeline instead of real pipeline
- `/agent/leads` currently uses `EnhancedLeadPipeline`, which is mock-data based.
- A real API-driven `LeadPipeline` component exists, but is not used by the routed leads page.
- Analytics and message center tabs in leads are currently placeholder/mock.

### 5) Marketing, Earnings, Productivity, Training are mostly mock UI
- Marketing hub: video/promotion/template data is hardcoded.
- Earnings: wallet/commission/bonus cards and lists are hardcoded.
- Productivity: tasks/reminders/upcoming showings are hardcoded (only calendar component has real API calls).
- Training/support: courses/certs/FAQs/tickets are hardcoded.

### 6) Analytics page is mixed: partial real + significant placeholders
- Pulls `agent.getDashboardStats`, but most analytics visuals/sections are static or "coming soon".

### 7) Route/auth consistency issues
- Explicit `/agent/...` routes are declared without route-level `RequireRole`.
- A guarded `/agent/*` route exists later, but explicit routes match first.
- Some pages do manual auth checks; some do not (inconsistent enforcement).

### 8) Duplicate dashboard file causes maintenance confusion
- Two dashboard files exist:
  - `client/src/pages/AgentDashboard.tsx` (active routed implementation)
  - `client/src/pages/agent/AgentDashboard.tsx` (unused "coming soon" page)

### 9) Additional implementation gaps
- `AgentSidebar` still uses hardcoded `agentId = 2` for share-profile modal.
- `LeadPipeline` has drag-and-drop temporarily disabled.
- `agent.getMyShowings` currently returns `property: null` and `client: null` placeholders, limiting calendar detail quality.

## Priority Fix Order (Recommended)
1. Stabilize auth/session + entitlement projection failure path (`auth.me`/subscriptions schema handling).
2. Remove render-time redirects; move all auth redirects into `useEffect` or route guards.
3. Enforce route-level role protection uniformly for all `/agent/...` routes.
4. Switch `/agent/leads` from mock `EnhancedLeadPipeline` to API-driven `LeadPipeline` (or wire enhanced UI to real data).
5. Replace mock data on Marketing/Earnings/Productivity/Training with API-backed sources incrementally.
6. Consolidate duplicate dashboard pages and remove dead/legacy screens to reduce confusion.

