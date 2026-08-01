# Property Listify Product Workflow Authority

Status: active convergence authority for the current implementation branch.

This document defines the one workflow channel used to reason about product
behaviour during the Kiro root-cause convergence. It is derived from current
routes, registered procedures, services, schema consumers and tests. Historical
Kiro specifications and completion reports are evidence of intent only; they
cannot establish that a capability exists.

## Operating rule

Each commercial outcome has one owning workflow and one persistence authority.
Compatibility adapters may remain temporarily, but they must delegate to the
owning workflow or be clearly unavailable. They must not create a second state
machine, parallel database authority or success response that is not backed by
the current implementation.

The launch order is:

1. authentication, authorization and ownership boundaries;
2. listing or development persistence and lifecycle transitions;
3. public publication, search and property detail;
4. enquiry capture, routing and lead operations;
5. commercial content and optional discovery acceleration.

## Canonical workflow map

### 1. Identity and access

`server/_core/context.ts`, `server/_core/auth.ts`, `server/_core/trpc.ts` and
`server/_core/requireUser.ts` establish the request identity. Route and
procedure guards are part of the product contract, not UI decoration.

- Visitors may browse public search, public detail and public content.
- Authenticated users may access only their own consumer actions by default.
- Agents operate their own listing and lead workspace.
- Agency administrators operate agency-scoped inventory, review and lead
  workflows.
- Property developers operate their own development and developer-lead
  workflow.
- Super administrators operate platform approval and authority controls.

Any new procedure must use the narrowest existing procedure guard that matches
the operation. A protected procedure is not sufficient for platform-wide,
agency-wide or destructive work.

### 2. Single-property listing lifecycle

The canonical listing aggregate is `listings` in
`drizzle/schema/listings.ts`. The public catalog projection is `properties`.

```text
agent/owner
  -> listing.create
  -> listing.update
  -> listing.submitForReview
  -> platform review: listing.approve or listing.reject
  -> properties publication mirror
  -> public search and property detail
  -> leads.create / agency lead operations
```

`server/listingRouter.ts` owns the agent-facing create, update and submit
contract. `server/agencyRouter.ts` owns agency-scoped inventory, assignment
and agency-admin submission controls. These are actor-scoped entry points into
the same listing lifecycle; they must continue to share the listing aggregate,
publication entitlement checks and approval queue rather than introduce a new
listing state machine.

Critical invariants:

- `listings` is the authoring and lifecycle authority.
- `properties` is the public read projection, not an alternate authoring store.
- media ownership is checked before publication and public mirror updates.
- status transitions cannot be smuggled through generic update payloads.
- approval and rejection remain platform-authorized operations.

Evidence: `server/listingRouter.ts`, `server/agencyRouter.ts`, `server/db.ts`,
`client/src/components/listing-wizard/ListingWizard.tsx`,
`client/src/features/agency/listings/AgencyListingsWorkspace.tsx` and the
listing lifecycle contract tests under `server/__tests__/`.

### 3. Development lifecycle

The canonical development aggregate and inventory are defined in
`drizzle/schema/developments.ts` and owned by `server/developerRouter.ts` plus
`server/services/developmentService.ts`.

```text
developer setup
  -> development draft
  -> development create/update
  -> validation and publish transition
  -> public development detail
  -> derived unit-type search cards
  -> developer lead capture and routing
```

Development unit-type cards are derived for public discovery. They must not be
treated as independent single-property listing records. Developer lead
capture remains separate from agency listing leads but must converge on the
shared lead-intake and ownership principles.

Evidence: `server/developerRouter.ts`,
`server/services/developmentService.ts`,
`server/services/developmentDerivedListingService.ts`,
`client/src/components/development-wizard/DevelopmentWizard.tsx`,
`client/src/pages/DevelopmentDetail.tsx` and the development contract tests.

### 4. Public discovery and Explore

The current `/explore` and `/explore/feed` product surface uses the `discovery`
router and its domain services:

- `client/src/pages/ExploreHome.tsx` and `client/src/pages/ExploreFeed.tsx`;
- `server/domains/discovery/router.ts`;
- `server/domains/discovery/services/discoveryFeedService.ts`;
- `server/domains/discovery/services/discoveryEngagementService.ts`.

`discovery.getFeed` is the current feed contract. `discovery.engage` records
feed interaction through the existing Explore engagement service. The older
`exploreApi` V3 follow, neighbourhood and saved-content procedures remain
legacy compatibility surfaces and must not be described as implemented while
they return empty or fixed values.

Explore publishing is a separate authoring path:

```text
approved publisher
  -> explore.getPublishingEligibility
  -> media upload
  -> explore.uploadShort
  -> inactive editorial content
  -> future approved publication authority
  -> discovery feed eligibility
```

The upload path must not imply public publication. Schema changes required to
replace legacy Explore tables, add follow persistence or create a publication
workflow belong to a separately approved Database Authority workstream.

Mock Explore content is an explicit local preview mode only. Live tRPC
discovery is the default so local development does not silently validate a
different product from the deployed application.

### 5. Favorites and saved-search intent

Property favorites have one current persistence path:

- `server/routers.ts` `properties.toggleFavorite`;
- `server/routers.ts` `properties.getFavorites`;
- `server/db.ts` favorites helpers;
- `client/src/pages/Favorites.tsx` and property-detail controls.

Explore cards that represent a real property use this canonical favorites
workflow. Explore engagement records may measure a save interaction for feed
analytics, but they are not a substitute for a user favorite and must not be
presented as saved-property persistence.

Saved searches remain a separate alert workflow owned by `savedSearch` and the
saved-search delivery engine. A saved search is not a favorite and neither
should silently replace the other.

### 6. Enquiry, lead and viewing lifecycle

The current public lead aggregate is `leads` in `drizzle/schema/leads.ts`.
`server/services/publicLeadCaptureService.ts` resolves listing, development,
agent, agency and developer ownership before creating a lead. Agency
operations then use `server/agencyRouter.ts` for assignment, status, contact,
viewing and follow-up work.

```text
public property/development intent
  -> leads.create / public lead capture
  -> ownership and routing
  -> agency or developer lead workspace
  -> status/contact/follow-up
  -> canonical showing/viewing operation where applicable
```

`listingLeads`, service leads, demand leads and distribution referrals have
different ownership boundaries. They may share intake concepts, but they must
not be mirrored into multiple competing lead state machines without an
approved product and schema contract.

Evidence: `server/leadsRouter.ts`,
`server/services/publicLeadCaptureService.ts`, `server/prospectJourneyRouter.ts`,
`server/agencyRouter.ts`, `client/src/components/PropertyContactModal.tsx`,
`client/src/pages/developer/DevelopmentQualificationPage.tsx` and the lead
contract tests.

### 7. Services and distribution

Services and distribution are commercial workflows with their own persistence
and permissions:

- Services: `server/servicesEngineRouter.ts` and `drizzle/schema/servicesEngine.ts`.
- Distribution/referrals: `server/distributionRouter.ts`,
  `drizzle/schema/distribution.ts` and `drizzle/schema/referrals.ts`.

They may consume property or development context, but they are not alternate
listing publication or agency lead authorities. Reconciliation should connect
journeys at explicit hand-off points rather than merge their schemas by
default.

## Legacy-to-authority treatment

| Legacy surface | Current treatment |
| --- | --- |
| Kiro completion, migration and deployment reports | Historical evidence only; do not use as operating authority. |
| `server/exploreApiRouter.ts` V3 stubs | Retain only while callers are migrated; do not advertise as working. |
| `server/exploreRouter.ts` compatibility feed | Compatibility adapter around Explore content; current feed UI uses `discovery`. |
| `server/domains/discovery/*` | Current Explore feed and engagement authority. |
| `favorites`/Explore save overlap | Canonical property favorites own saved-property persistence; Explore engagement is analytics only. |
| `server/listingRouter.ts` and agency listing procedures | Actor-scoped entry points; shared listing lifecycle and publication authority. |
| feature-specific migrations and runtime schema guessing | Deferred to Database Authority; never revived from documentation. |

## Change guardrails

- Do not add a new router when an existing workflow owns the outcome.
- Do not add a second schema or migration runner to repair a product gap.
- Do not return success for a no-op, mock or disabled operation.
- Do not use a Kiro document as proof of reachability or persistence.
- Do not claim a launch journey passes until its route, procedure, persistence,
  permission and focused test evidence agree.
- Any required schema change is recorded for a dedicated Database Authority
  workstream and is not implemented in this convergence slice.

## Open convergence workstreams

1. Consolidate remaining Explore compatibility callers onto `discovery` and
   canonical property workflows; remove unreachable V3 UI after migration.
2. Reconcile agency and agent listing entry points behind shared lifecycle
   services without changing publication or ownership invariants.
3. Complete the listing-to-lead-to-viewing evidence path with focused runtime
   and browser coverage.
4. Replace placeholder location, service, advertising and analytics surfaces
   only where their current journey has a defined commercial MVP outcome.
5. Run a separately approved Database Authority workstream for any legacy
   Explore table retirement, follow persistence or migration consolidation.
