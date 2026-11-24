# Shared Living — Product Specification

**Status:** MVP implementation candidate — founder decisions approved 2026-11-24; see §12 for delivered evidence and remaining gates
**Programme:** Shared Living Foundations
**Related:** `docs/architecture/shared-living-migration-design.md`, `docs/compliance/shared-living-regulatory-boundary.md`

---

## 1. Identity

**Shared Living** is Property Listify's marketplace for finding a room, a small place, or the right person to live with. It formalises the rental market beneath conventional whole-property renting — from a township backyard unit to a Sandton garden cottage to a student room near UJ.

It is **not** a fourth rental category. It is a marketplace layer with three independent dimensions:

| Dimension | Question | Owner |
|---|---|---|
| **Accommodation** | What physical space exists? | Shared Living domain (this spec) |
| **Authority** | Who may advertise or manage it? | Platform identity/mandate system (extended) |
| **Occupancy** | Who lives there; what is vacant; eventually who is looking | Shared Living domain, phased |

The three dimensions are never collapsed. A homeowner with one back room, an agency with eighty mandates, and a 400-bed operator all work without becoming different products.

## 2. The three markets

One journey, three consumer facets:

| Market | Example | Primary decision |
|---|---|---|
| **Rooms** | Spare bedroom in a Sandton house | "Can I live with these people?" |
| **Cottages & Small Places** | Garden cottage, granny flat, bachelor, backyard room | "Is this small space right for me?" |
| **Student Living** | Student house, room, residence | "Is this suitable for my student needs?" |

## 3. Accommodation taxonomy

Consumer-facing types (MVP):

| Value | Label |
|---|---|
| `private_room` | Private room |
| `shared_room` | Shared room / bed |
| `en_suite_room` | En-suite room |
| `garden_cottage` | Garden cottage |
| `granny_flat` | Granny flat |
| `bachelor_studio` | Bachelor / studio |
| `backyard_room` | Backyard room |
| `backyard_unit` | Backyard flat / self-contained unit |
| `room_shared_house` | Room in shared house |
| `room_shared_apartment` | Room in shared apartment |

Deferred: `commune_co_living`; whole-property-for-sharing.

**Market facet** (search facet, orthogonal to type): `room_share` · `independent_micro` · `student`. Student-specific attributes (campus served, distance, residence gender, meals) are **Phase 2**.

**Hard invariant — NSFAS:** accreditation is a verification record (evidence + reviewer), never a lister checkbox. The badge can only ever read "NSFAS accreditation: Verified".

## 4. Authority matrix

Authoring begins with two questions that must never collapse:

1. *What are you offering?* → drives accommodation schema.
2. *What is your relationship to this place?* → drives authority workflow and public attribution.

| Actor | Relationship options | MVP workflow |
|---|---|---|
| Individual homeowner/landlord | Direct authority for a property | Deferred from the initial cohort. Do not let an account role alone establish ownership or advertising authority. |
| Agent (initial cohort) | Advertises for a named owner, landlord or operator | Existing verified Property Listify agent account → residence-specific evidence and time-bounded mandate → reviewer approves mandate → create spaces → independent residence and space review. An agent can manage multiple spaces under one residence. |
| Agency / agent team | Agency portfolio or delegated team | Agency-wide authority and multi-user operator management are deferred. The MVP authority belongs to a named agent user and one residence. |
| Residence operator | Responsible property party represented by an agent | Identified separately from the agent. A single agent account can manage multiple spaces; a full operator organisation workspace is deferred. |

Advertising authority is a specific approved mandate record, not an agent role, agency membership, or self-declared relationship. Public MVP pages do not expose a private owner contact or claim a practitioner verification badge unless the platform has evidence for that badge.

## 5. Trust ladder

Visible badges; never hidden scores. Compatibility (V2 people-marketplace) uses transparent criteria only.

| Rung | Meaning | Phase |
|---|---|---|
| 1 Email verified | Existing Property Listify sign-in authority | MVP account prerequisite |
| 2 Advertising authority approved | Uploaded evidence is independently reviewed for one named agent and residence | MVP publication prerequisite |
| 3 Residence approved | Canonical Place, responsible party, private-address handling, shared facilities and residence media reviewed | MVP publication prerequisite |
| 4 Space approved | Its description, pricing, availability, facilities and media reviewed independently | MVP publication prerequisite |
| 5 Student accreditation | Evidence-based NSFAS/institutional check | Not implemented; never imply verification |

## 6. Privacy model

Because many places are occupied homes:

- The exact street address is stored privately on the residence record.
- Public projection exposes an approved canonical Place label only; it never returns the exact street address, for every accommodation type.
- Public coordinates and address disclosure are not currently projected.
- Exterior imagery is moderated with the same privacy posture.

## 7. Consumer journeys

### Discovery — `/shared-living`
Hero tab entry (release-gated) plus Rent-journey transfers preserving canonical geography params.

- Market facets: Rooms · Cottages & Small Places · Student Living.
- Filters: accommodation type, monthly price, electricity and Wi-Fi bill state, furnishing, bathroom access, available-from date and canonical Place IDs. Unknown bills are not treated as excluded. Search Areas and a parking filter are not implemented in the current route contract.
- Results paginate (24/page); cards speak **space language** ("En-suite room · 12 m² · bills included"), never whole-house bedrooms/bathrooms.

### Detail — `/shared-living/:slug`
Sections: space hero → household ("3 people currently living here", smoking/pets/visitors/cleaning) → arrangement (rent, deposit, bills split, available-from, minimum stay) → Cost-truth block (included / unknown / to confirm — mirrors Commercial Cost Passport honesty) → trust badges → structured enquiry.

Location rendering follows §6. Detail pages are space-specific and expose only approved space/residence media, public canonical Place labels and separately stored residence/space facilities. They do not return the private street address.

### Enquiry + messaging
Structured enquiry creates a **canonical lead** (reusing `capturePublicLead` custody, rate limiting, honeypot, idempotent captureRequestId) plus an `sl_lead_contexts` adjunct row and an **on-platform message thread** keyed to the lead.

- Enquiries are canonical Property Listify leads with a Shared Living residence/space context, recipient snapshot and on-platform thread. An authorized agent sees current leads in the Shared Living inbox; historic leads remain visible after their mandate ends.
- Replies from a lister are accepted only while that user holds the current approved mandate. Public and enquiry routes resolve the currently authorized recipient at capture time.
- Copy actively encourages on-platform communication (safety posture per Flatmates/SpareRoom precedent).

**Regulatory boundary:** advertising + verified discovery + structured enquiry + on-platform messaging only. No deposits, lease generation, or rent collection on-platform (see compliance memo).

## 8. Authoring journeys

The initial agent journey follows this spine:

1. Establish residence identity, private address, canonical Place and responsible owner/landlord/operator.
2. Upload mandate evidence and submit the residence-specific authority request.
3. Wait for independent reviewer approval of the mandate before creating rentable inventory.
4. Add one or multiple independent spaces with their own rent basis, occupancy, availability, facilities and description.
5. Upload typed residence or space photographs through the existing media adapter; media begins pending review.
6. Submit the residence and spaces. Review each parent and space separately.
7. Publish only when the residence and relevant space are approved and the current mandate and canonical Place remain eligible.

Branch deltas:
- **Individual homeowner/landlord**: direct self-service is deferred; do not infer owner authority from a user account.
- **Agent**: the MVP route is for an existing authenticated agent user, with a separate responsible party and residence-scoped approved mandate.
- **Operator**: one agent may manage multiple independently described and reviewed spaces under a residence; organisation teams and bulk management are later work.

## 9. One-place-many-spaces invariant

A five-bedroom student house is **one place with five spaces** (Room 1 available, Room 2 occupied, …). Six backyard units are **one place with six spaces**. If an agent later takes the mandate, the same place/spaces gain a practitioner authority record — the accommodation is never duplicated because the supply channel changed.

## 10. MVP / V2 boundary

| Implemented MVP candidate | Later work |
|---|---|
| Shared Living discovery and space detail routes over publication-eligible inventory | Direct owner/landlord authoring and organisation-backed agent teams |
| Agent authority requests with private evidence, expiry and revocation | Electronic grantor signing and automated expiry processing |
| Parent and individual-space review/publication | Booking, applications, tenancy, deposits and payments |
| Canonical lead capture and authorized-agent inbox/thread | Institutional, NSFAS or campus verification |
| Private street address and approximate canonical Place discovery | Search Areas, parking filter and advanced student search |
| Manual agent/reviewer workflow and local/S3 adapter integration | Automated notifications, analytics and operator CRM |

## 11. Non-goals (standing)

Deposits/lease generation/rent collection · chat beyond lead threads · compatibility scores · custom domains/CMS · forcing Shared Living inventory into residential Rent semantics · duplicating accommodation across journeys (a standalone cottage may be *eligible* for both Rent discovery and Shared Living discovery through one canonical record — future capability, designed-for now).

## 12. Implementation evidence and open authority

The 2026-11-24 implementation candidate connects the authenticated agent inventory route, public Shared Living search/detail routes, super-admin mandate and listing moderation, existing media storage, and canonical Property Listify lead delivery. One agent can create multiple spaces under a residence. Authority revocation holds the residence and its spaces, blocks new discovery/enquiries and preserves captured lead history.

Verified on the exact worktree-owned disposable MySQL target: migrations through `0210_sl_place_publication_lifecycle.sql`; schema congruency passed for all 41 enforced checks; admitted national Canonical Place reference data verified; and the database-backed agent-to-seeker journey passed, including media upload, separate approvals, address privacy, per-person pricing, lead inbox receipt, mandate revocation and reply denial. These results do not establish production/shared database state or production readiness.

Final candidate verification: `pnpm check` passed; full lint completed with 0 errors and 14,230 repository-wide warnings; focused Shared Living/public-navigation and database-authority contracts passed (38 tests); and the real database/API journey passed (1 test). The final `pnpm test:authority` run completed with 862 passed, 13 skipped and 37 failed tests across 13 failed files. Failures include the historical runtime-grant and rehearsal-source bindings still pinned to the 0197 release, stale legal-consent fixture state, and an existing canonical-admin row in the disposable database. The 0197 grant/rehearsal bindings were not refreshed because that would change protected release authority. These results are not a green authority suite.

The final `pnpm db:authority:status` identified the exact worktree-owned disposable target, manifest head 0210, no incomplete attempts, schema congruency and canonical Launch Access foundation readiness. Its canonical-reference-data field remains `reference-not-evaluated`; the separate `pnpm db:places:verify-national` command passed earlier for the disposable target. P7 remains open.

P7 remains open. This branch establishes a functioning Shared Living implementation against its task-owned disposable database, but it does not close the broader P7 domain-supply audit, verify a shared/production target, approve a release, or remove other P7 evidence gaps. See `docs/architecture/shared-living-migration-design.md` and `docs/architecture/database-takeover/p7-domain-supply-audit.md`.

Known limitations: agent account eligibility relies on existing authenticated agent-role authority plus this residence-specific mandate; shared/operator organizations and direct homeowner accounts are not part of the initial cohort. Expiry is fail-closed in public discovery, lead capture and replies through effective-date predicates; there is no expiry worker that persists the `expired` label or writes held statuses. Exact-address disclosure, bookings, payments and tenancy management remain out of scope.
