# Shared Living — Domain and Migration Architecture

**Status:** 2026-11-24 implementation candidate; not a production release approval.
**Product authority:** `docs/product/shared-living-spec.md`.
**Database authority:** `docs/architecture/database-authority-policy.md` and the governed database authority procedures.

## Product and domain boundary

Shared Living owns accommodation residences and independently rentable spaces.
Property Listify continues to own accounts, canonical Place identity, secure
media storage, moderation users, canonical leads, and platform navigation.
Shared Living does not turn rooms into ordinary property listings and does not
create a parallel user, geography, media-storage, or lead system.

One `sl_places` residence can own many `sl_spaces`. The historical physical
column `sl_places.owner_user_id` is mapped in runtime code as
`createdByUserId`; it records the creator and is not proof of ownership or
authority to advertise. A named responsible party and an independently
reviewed, residence-specific agent mandate establish the accountable
relationship.

## Canonical data model

- `sl_places`: residence identity, private address, canonical
  `canonical_place_id` reference to Property Listify's `place.place_id`,
  residence type, content, and parent publication lifecycle.
- `sl_responsible_parties`: owner, landlord, or operator identified for a
  residence; distinct from the agent who created or manages the record.
- `sl_listing_authorities`, `sl_listing_authority_evidence`, and
  `sl_listing_authority_events`: residence-scoped mandate, its private
  evidence, effective/expiry dates, reviewer decision, revocation, and audit
  events. The agent account role alone is not advertising authority.
- `sl_spaces`: independently described accommodation, with its own
  availability and publication states.
- `sl_space_availability`: rent, explicit per-space/per-person basis,
  available-from date, and utilities/bill truth states.
- `sl_space_specifications`, `sl_place_specifications`, and
  `sl_place_household`: typed space features, residence facilities, and
  household information at their respective scopes.
- `sl_place_media` and `sl_space_media`: typed, separately moderated
  associations to residence or space photographs. Bytes use the existing
  Property Listify media adapter; private mandate evidence uses a separate
  restricted storage path.
- `sl_moderation_queue`: authorised review work for the parent residence and
  each individual space.
- `sl_verifications`: evidence-backed verification facts; uploaded evidence
  alone does not create a public verification badge.
- `sl_lead_contexts` and `sl_messages`: Shared Living context and thread
  adjuncts to canonical Property Listify leads. They do not replace lead
  capture, custody, idempotency, or the existing inbox authority.

## Authority and publication rules

An agent may manage a residence only while the corresponding mandate is
approved, effective, unexpired, and not revoked. Mandate evidence is private
and reviewer-controlled. Expired authority fails closed in public discovery,
enquiry recipient resolution, and lister replies. Explicit revocation also
holds the residence and its spaces from discovery and stops new enquiry
delivery to that agent; existing residence, space, and lead history is
retained.

Residence and space publication are reviewed independently. A space is
publicly eligible only when its own lifecycle is published, its parent is
published, the residence has a current approved mandate, and its canonical
Place passes the existing active, verified, searchable, and publication-
eligible authority checks. Availability (available, occupied, unavailable)
remains separate from moderation/publication state. Space-level changes do not
implicitly rewrite sibling content or approval.

Public projections use the approved canonical Place label and approved media;
they do not select or return the private street address. Student/funding or
other verification claims remain evidence-based. A draft or unapproved parent,
space, or photo is not exposed through public search or detail routes.

## Application integration

- `server/sharedLivingRouter.ts` exposes authenticated agent authoring and
  reviewer-only controls, plus public discovery, detail, and enquiry routes.
- `server/services/sharedLivingWorkflowService.ts` owns residence/space
  lifecycle, mandate gates, canonical Place checks, media associations, and
  public eligibility projections.
- `server/services/sharedLivingEnquiryService.ts` resolves the current
  authorised recipient and Shared Living inbox/thread context around canonical
  leads. Lead delivery uses the canonical `primary_custody` purpose.
- `server/services/sharedLivingEvidenceStorage.ts` handles private mandate
  evidence; normal residence/space photos use the existing secured media
  upload and storage adapter.
- The client integrates the marketplace, space details, agent workspace, and
  super-admin review into Property Listify routes and navigation.

## Migration and verification status

The registered additive migration sequence for this candidate is
`0198_sl_responsible_parties.sql` through
`0210_sl_place_publication_lifecycle.sql`. It introduces the mandate,
evidence/event, separate lifecycle, typed-media, specification, display-name,
and canonical Place publication structures used by the runtime model. The
sequence is registered in `server/migrations/manifest.json` and
`docs/database-authority/migration-tree-authority.json`.

For this implementation, the sequence was applied only to the verified
task-owned disposable worktree database. The database authority status,
migration head, schema congruency, and Canonical Place reference data were
verified there. The database-backed provider-to-seeker integration journey
passed against that target. This is evidence for the isolated candidate only;
it does not verify or authorize any shared or production database state.

**P7 remains open.** Registering migrations and proving this domain against a
disposable target do not complete the broader P7 domain-supply audit or its
independent review. Do not bypass the canonical Place assignment/publication
gate or classify P7 as resolved from this work. See
`docs/architecture/database-takeover/p7-domain-supply-audit.md`.

## Known limits

- The initial authoring cohort is authenticated agents. Direct homeowner
  authoring and organisation-wide multi-user operator workspaces are deferred.
- Expiry is enforced fail-closed at read/action time; no worker currently
  persists an `expired` label or writes the explicit held lifecycle on expiry.
- The verified journey is database/API-level. Browser-based end-to-end
  evidence remains separate from this integration proof.
- The existing 0197 runtime-grant and rehearsal-source plans remain pinned to
  their reviewed 0197 source state and reject this 0210 candidate. A successor
  runtime-permission/release authority must be reviewed before any shared or
  production database release; this work did not alter or apply those grants.
- Production database application, deployment, consumer release, and any
  release-specific admission remain unapproved and unverified.
