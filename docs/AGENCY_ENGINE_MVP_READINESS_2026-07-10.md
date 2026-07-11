# Agency Engine MVP Readiness - 2026-07-10

## Decision

The Agency Engine is the first revenue MVP. Its job is to turn an agency into
an active, paid workspace that can publish inventory and receive, work, and
convert its enquiries. It is not responsible for owning the public search,
discovery, or video-feed experiences.

The next engineering sequence is:

1. Close the Agency Engine release gates below.
2. Harden the Listing Engine as the canonical authoring, review, media, and
   public-projection system.
3. Ship Discovery/Search against those published listings so buyer demand can
   reliably find inventory and create attributable leads.
4. Consolidate Explore around the same public listing and media contracts.

This order keeps the revenue path independent from an unfinished feed product:

`paid agency -> canonical listing -> published public property -> attributable
lead -> agency follow-up/viewing/transaction`

## Agency MVP Scope

The release scope includes:

- Agency onboarding, subscription billing, manual EFT proof submission, and
  finance approval.
- Activation-gated team invitations, acceptance, and agency membership.
- Principal and agent listing inventory, assignment, review submission,
  archival, and public-property links.
- Public property enquiries routed to the owning agency, including listings
  created directly by an agency principal.
- Lead notes, follow-ups, viewings, offers, and transaction operations already
  exercised by the local agency browser suite.

It deliberately excludes an Explore video publishing workflow, feed ranking,
and a new agency-owned video-media model. Those are Explore Engine work, not a
dependency for the first paid agency workflow.

## Invariants

- `listings` is the canonical agency inventory record. A public `properties`
  row is its projection and retains `sourceListingId`.
- An explicit `listings.agencyId` wins ownership decisions. Legacy owner or
  agent agency membership is only a compatibility fallback when that value is
  absent.
- A public property lead derives agency ownership from its source listing,
  then its assigned agent, then its property owner. Client input cannot
  override ownership when a property is supplied.
- Finance approval activates the agency only after a paid invoice. Pending
  team invitations are delivered only after activation and remain durable if
  delivery fails.
- Agency administrators can operate agency inventory. Editing canonical listing
  content remains author-only until an explicit delegated-authoring policy is
  approved and implemented end to end.
- Existing legacy listings remain visible through compatibility fallbacks;
  new agency-owned listings persist the canonical agency relationship.

## Evidence Completed Locally

- Type checking passes.
- Listing lifecycle, agency inventory, public lead attribution, billing, and
  invitation delivery contract tests pass.
- Persisted local-database tests cover agency listing attribution and manual
  billing activation.
- The browser suite passes five workflows: transaction operations, workspace
  lead persistence, invitation acceptance, onboarding revenue activation, and
  manual EFT approval on desktop and mobile.

## Release Gates

Before declaring the Agency Engine live in production:

1. Configure and verify production email delivery, object storage, public app
   URL, billing bank details/provider credentials, and finance-admin access.
2. Run the repository launch preflight with production-safe environment values.
3. Run the agency browser smoke suite against a disposable staging agency and
   confirm one real invite email and one finance-approved payment flow.
4. Assign an operational owner for reviewing payment proofs and responding to
   failed invitation-delivery events.

## Deferred Agency Work

- Decide whether agency managers may edit another member's listing content.
  The current UI preserves the existing author-only API rule rather than
  exposing a failing action.
- Reconcile the legacy commission dashboard aggregate with the newer
  transaction/commission operations model before using commission reports for
  financial reporting.
- Replace the settings and help workspace placeholders after the revenue path
  is live.

## Engine Boundaries After Agency

### Listing Engine

Owns authoring, validation, review, media processing, publication, private
edits, archival, and the `listings -> properties` public projection. It must
be stable before new consumer acquisition features are layered on top.

### Discovery/Search Engine

Owns findability: location/search/filter contracts, listing result quality,
property-detail entry points, and lead conversion into the Agency Engine. Its
first MVP should focus on published inventory and clear enquiry conversion,
not editorial feeds.

### Explore Engine

Owns editorial and video discovery, engagement, feed ranking, and content
moderation. The current implementation has overlapping feed stacks and an
unfinished agency-feed boundary. It should consume canonical published listing
and media contracts rather than create a second inventory system.

## Top Risks

1. A production environment can appear healthy while email, storage, or
   payment configuration prevents a paid agency from completing onboarding.
   Mitigation: make launch preflight and one staging end-to-end payment/invite
   run mandatory release gates.
2. Extending agency ownership rules informally can create cross-agency data
   access or lead-routing errors. Mitigation: keep explicit agency ownership
   authoritative and require an approved policy before delegated listing edits
   are added.
