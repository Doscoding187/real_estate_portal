# Shared Living — Product Specification

**Status:** Phase R spec freeze — pending founder review
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
| Private owner/lister | Owns it · lives here & shares · authorised sublet | Phone OTP → guided authoring → moderation → published. Attribution: "Listed by owner". |
| Agent (PPRA) | Practitioner listing for a client | Existing login → select client/property → confirm authority/mandate reference → published. Attribution: practitioner name + agency, **"Property Practitioner" badge mandatory**. |
| Agency | On behalf of agency portfolio | Existing agency authority → practitioner attribution as above. |
| Operator/institution | Manages accommodation | Organisation-backed multi-space management. Schema ready at launch; management UI is Phase 2. |

**PPRA rule enforced in code:** a practitioner listing can never render as owner-listed. The public attribution block derives from authority records, not authorer self-description.

## 5. Trust ladder

Visible badges; never hidden scores. Compatibility (V2 people-marketplace) uses transparent criteria only.

| Rung | Meaning | Phase |
|---|---|---|
| 1 Phone verified | OTP-confirmed contactable number | MVP — publishing floor |
| 2 Email verified | Existing platform identity | MVP |
| 3 Relationship verified | Owner proof / mandate reference / operator standing | MVP for practitioners (mandate reference); owners Phase 2 evidence flow |
| 4 Property verified | Moderation pass: media + claims coherence | MVP via moderation queue |
| 5 Student accreditation verified | Evidence-based NSFAS/institutional check | Phase 2 |

## 6. Privacy model

Because many places are occupied homes:

- The canonical address is stored privately on the place record.
- Public projection exposes **approximate location only** (suburb/city centroid precision), for all `*_room` and `shared` types by default.
- Standalone types (`garden_cottage`, `granny_flat`, `bachelor_studio`, `backyard_unit`) may expose exact location at lister choice.
- Exact-address disclosure between parties happens on-platform, post-consent.
- Exterior imagery is moderated with the same privacy posture.

## 7. Consumer journeys

### Discovery — `/shared-living`
Hero tab entry (release-gated) plus Rent-journey transfers preserving canonical geography params.

- Market facets: Rooms · Cottages & Small Places · Student Living.
- Filters: accommodation type, price/month, bills included, furnishing, bathroom (own/shared), parking, availability date, geography (canonical ids; Search Areas once graduated for this journey).
- Results paginate (24/page); cards speak **space language** ("En-suite room · 12 m² · bills included"), never whole-house bedrooms/bathrooms.

### Detail — `/shared-living/:slug`
Sections: space hero → household ("3 people currently living here", smoking/pets/visitors/cleaning) → arrangement (rent, deposit, bills split, available-from, minimum stay) → Cost-truth block (included / unknown / to confirm — mirrors Commercial Cost Passport honesty) → trust badges → structured enquiry.

Location rendering follows §6. Detail continuity carries `returnTo` from discovery.

### Enquiry + messaging
Structured enquiry creates a **canonical lead** (reusing `capturePublicLead` custody, rate limiting, honeypot, idempotent captureRequestId) plus an `sl_lead_contexts` adjunct row and an **on-platform message thread** keyed to the lead.

- Both parties converse on-platform; thread surfaces in each party's view (owner inbox / practitioner workspace).
- Other party's contact details remain shielded until both have engaged in the thread (rung-gated reveal).
- Copy actively encourages on-platform communication (safety posture per Flatmates/SpareRoom precedent).

**Regulatory boundary:** advertising + verified discovery + structured enquiry + on-platform messaging only. No deposits, lease generation, or rent collection on-platform (see compliance memo).

## 8. Authoring journeys

Dynamic by relationship (§4). Common spine:

1. Intent: *What are you offering?* (type selector drives schema branch)
2. Place: address (private), geography resolution, place-type context (house/apartment/block)
3. Space(s): add one or more rentable spaces with per-space availability
4. Household (if shared occupancy): occupants, lifestyle attributes
5. Arrangement: rent, bills, deposit, dates, minimum stay
6. Media: photos per space + optional place exterior (privacy-reviewed)
7. Verification: phone OTP gate before submit
8. Review: moderation queue → published

Branch deltas:
- **Owner**: steps 1–8 verbatim; plain-language copy; no industry vocabulary.
- **Practitioner**: step 2 inserts client/property selection + mandate confirmation; public attribution locked to practitioner+agency; delivery of enquiries routes to practitioner workspace.
- **Operator (Phase 2)**: organisation context; bulk space creation; per-space economics.

## 9. One-place-many-spaces invariant

A five-bedroom student house is **one place with five spaces** (Room 1 available, Room 2 occupied, …). Six backyard units are **one place with six spaces**. If an agent later takes the mandate, the same place/spaces gain a practitioner authority record — the accommodation is never duplicated because the supply channel changed.

## 10. MVP / V2 boundary

| MVP (Phase 1) | V2+ |
|---|---|
| Spaces marketplace, three markets | Seeker/person listings ("I need a room") |
| Owner + practitioner authoring | Operator management UI |
| Phone + moderation trust rungs | Identity verification provider; relationship-evidence flows |
| On-platform threads on leads | Transparent matching; Team Up |
| Approximate-location privacy | Student campus/distance layer; NSFAS evidence flow |
| Enquiry-only commercial posture | Boost/Featured/multi-space monetisation products |

## 11. Non-goals (standing)

Deposits/lease generation/rent collection · chat beyond lead threads · compatibility scores · custom domains/CMS · forcing Shared Living inventory into residential Rent semantics · duplicating accommodation across journeys (a standalone cottage may be *eligible* for both Rent discovery and Shared Living discovery through one canonical record — future capability, designed-for now).
