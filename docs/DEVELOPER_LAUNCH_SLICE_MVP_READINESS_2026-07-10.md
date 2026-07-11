# Developer Launch Slice MVP Readiness - 2026-07-10

## Decision

The Developer launch slice is a public development-discovery and lead-handoff
surface, not a second public directory or an independently paid product. Its
MVP is complete when an approved developer can have a branded public profile,
show only approved and published developments, and route a buyer from that
profile into the canonical development-detail enquiry flow.

The commercial path is deliberately split:

`approved developer -> public brand profile -> approved published development -> development detail -> attributable enquiry`

Every new or existing developer receives a real free-trial subscription record.
Paid Developer plan selection is sales-assisted until the canonical manual EFT
billing and payment-proof workflow supports developer ownership. A request for
a paid tier never changes an entitlement by itself.

This is a bounded launch slice. Agency commercial activation remains the
current revenue-ready billing path. Explore remains deferred until its
video-content and publishing contracts are designed.

## MVP Scope

The release scope includes:

- One-segment public developer brand URLs such as `/developer/acme-homes`,
  separated from authenticated Developer workspace routes.
- Public brand identity data only for visible profiles linked to approved
  developer accounts.
- Public development cards sourced through the canonical public-development
  service, restricted to `isPublished=1` and `approvalStatus='approved'`.
- A public development-card contact action that opens the existing development
  detail, which owns the canonical enquiry dialog and attribution context.
- Free-trial subscription bootstrapping for newly created profiles and
  backfilling for existing developer profiles on subscription access.
- Sales-assisted paid-plan requests that leave the active plan unchanged until
  payment is invoiced, received, and verified.

## Invariants

- A public brand profile must be visible. If it is linked to a developer
  account, that developer must also be `approved`; pending and rejected
  developer brands are not public.
- Developer approval makes the linked brand visible and contact-verified;
  rejection hides it. The public profile cannot become discoverable solely
  because a developer completed onboarding.
- Public brand inventory is always read through
  `developmentService.listPublicDevelopments`. A brand filter supplements,
  rather than replaces, the canonical published-and-approved predicates.
- A route is public only when it is exactly `/developer/<slug>` and its slug is
  not a reserved workspace segment. Nested and operating-system routes remain
  authenticated Developer routes.
- The public claim CTA is shown only for platform-owned profiles explicitly
  marked claimable. Subscriber-owned brands cannot present a misleading claim
  action.
- The development detail remains the owner of buyer enquiry capture and
  attribution. Cards do not construct a separate contact URL or client-side
  ownership contract.
- Paid Developer plan requests do not mutate subscription tier, capacity, or
  billing state. Developer self-service EFT activation is out of scope until it
  extends the canonical billing proof and verification workflow.
- Explore is not a hidden extension of the Developer profile. It must later
  consume approved public listing/development media through its own video
  publishing, moderation, and ranking contract.

## Evidence Completed Locally

- Unit contracts cover the public/private Developer route boundary, visible
  public brand response shape, canonical public-development filter, invisible
  brand denial, free-trial bootstrapping, and paid-plan commercial honesty.
- A persisted local database integration test creates an approved developer
  brand with one approved published development and one draft, verifies only
  the published development is public, then verifies that rejection removes
  public profile access.
- Browser verification confirmed the public Developer brand page renders,
  its development contact action reaches development detail instead of a 404,
  and the existing enquiry dialog opens from the detail page.
- Browser verification confirmed an existing developer account is backfilled
  to the free trial and that a paid-plan dialog requests an invoice without
  claiming immediate activation.

## Release Gates

Before declaring this slice live in production:

1. Run route-boundary, public-profile, subscription-commercial, and persisted
   public-profile integration suites against the release database.
2. In staging, approve a test developer and verify its brand becomes public;
   reject or unpublish it and verify the profile and inventory no longer
   appear publicly.
3. Open a public development from a Developer brand page and submit a staging
   enquiry. Confirm the existing development lead appears with the expected
   server-derived ownership and attribution.
4. Verify a draft, rejected, or unpublished development cannot appear on the
   public brand page even when directly filtering by brand profile ID.
5. Configure production email and an invoice-handling process before exposing
   the paid-plan request CTA. Do not represent paid plans as self-service until
   developer EFT proof verification is implemented.
6. Complete production launch preflight with the required production database,
   public URL, email, storage, billing, and security configuration.

## Deferred Work

- Extend the existing canonical manual EFT payment-proof, verification, and
  activation workflow to `ownerType='developer'`, including invoices and
  finance/reporting controls.
- Persist and operate sales-assisted developer plan requests rather than using
  the current email handoff.
- Full developer recurring billing, entitlement lifecycle, cancellations,
  financial reporting, and payment reconciliation.
- Developer dashboard task/report/explore placeholders that are not needed for
  the public discovery-to-enquiry path.
- Explore's video-centric content model, media eligibility, moderation,
  ranking, feed composition, and analytics.

## Top Risks

1. Public profile work can accidentally expose pending developers or private
   development inventory. Mitigation: approval/visibility checks remain on the
   server, public inventory reuses the canonical filter, and both receive
   contract and integration coverage.
2. A plan-selection screen can be mistaken for a payment system. Mitigation:
   the API returns `sales_assisted` without changing entitlements, and the UI
   requires invoice and payment verification language.
3. A new contact shortcut can lose lead attribution or lead buyers to a dead
   URL. Mitigation: the card routes to development detail, where the existing
   enquiry dialog and attribution path are already owned.

## Files Touched

- `client/src/App.tsx`
- `client/src/pages/DeveloperRoutes.tsx`
- `client/src/lib/developerRouteBoundary.ts`
- `client/src/pages/DeveloperBrandProfilePage.tsx`
- `client/src/components/DevelopmentCard.tsx`
- `client/src/pages/DeveloperPlans.tsx`
- `server/developerRouter.ts`
- `server/brandProfileRouter.ts`
- `server/services/developmentService.ts`
- `server/services/developerSubscriptionService.ts`
- `server/db.ts`
- `client/src/lib/__tests__/developerRouteBoundary.test.ts`
- `server/__tests__/developer.public-profile.contract.test.ts`
- `server/__tests__/developer.subscription-commercial.contract.test.ts`
- `server/__tests__/integration.developer-public-profile.test.ts`
