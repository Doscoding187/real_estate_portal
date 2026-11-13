# Property Listify Professional Services V1 Contract

**Workstream:** `feat/services-v1-remediation-port-20260924`

**Integration base:** `4e012b3044628fc06da7489c0055e9ce01bdc8d9`

**Disposition:** `SERVICES V1 — PILOT CANDIDATE`

**Current-state reconciliation (2026-11-12, `origin/main` #761):** This
contract remains the reference for shipped request, privacy, publication and
custody behavior. Later approved V2/V3 work has added moderated reviews,
measured response performance, per-service public pages, SEO infrastructure,
workspace improvements and canonical Place coverage. The current master
vision and [Services engine state register](services-engine-state-register.md)
record that evidence. Historical V1-only limitations below are superseded
where this note names a later approved and shipped capability.

## Product definition

Professional Services V1 is the property-professional directory and enquiry handoff inside Property Listify. It helps a buyer, seller, landlord, tenant, agent, agency, developer, or property owner find a relevant professional for a property task, understand the provider's published service and coverage, and send one attributable request. The strategic product direction beyond V1 is governed by the Services master product vision and V2/V3 contracts.

Services V1 is a directory and enquiry handoff, not a marketplace transaction system. It does not promise appointment booking, escrow, quotes, subscriptions, paid placement, automated matching, or guaranteed outcomes.

The existing six-category authority remains in use:

- Home Improvement
- Finance & Legal
- Moving Services
- Inspection & Compliance
- Insurance
- Media & Marketing

## V1 journey

### Consumer

1. Open `/services` and choose a service category.
2. Select an available canonical Place where geographic filtering is offered.
3. Browse only providers with an active, verified, published profile, an active service, and listed coverage.
4. Open a provider profile and review services, coverage, public website, and published feedback.
5. Select **Request service** on a provider card or profile and provide service, area, and project notes.
6. Sign in when required to submit the request.
7. Receive a request-confirmation page showing the one provider who received it and the current status.
8. If no published provider matches, return to the category directory; a request is never silently sent to an unrelated provider.

### Provider

1. Register a service-provider account and verify its email.
2. Open `/service/profile` and complete business details, contact details, services, and canonical Place coverage.
3. Submit the completed profile for manual review; it remains private until an authorized reviewer publishes it.
4. Open `/service/dashboard` after publication.
5. See only requests assigned to that provider identity, including requester account contact details, project notes, location, and property context.
6. Mark the request accepted, quoted, won, lost, or expired and add a response note through the existing lead event authority.

Publication is required for new request acquisition. Once a request has been assigned, the provider retains read and response custody for that existing request even if publication or subscription state later changes; a never-published provider without assigned requests remains outside the workspace.

## Authorities reused

| Concern                               | Authority                                                                         |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| Provider identity                     | `partners` linked one-to-one to `users`                                           |
| Provider profile                      | `service_provider_profiles`                                                       |
| Provider services                     | `service_provider_services`                                                       |
| Provider coverage                     | `service_provider_locations`                                                      |
| Provider subscription state           | `service_provider_subscriptions`                                                  |
| Reviewed publication                  | `partners.verificationStatus` and `service_provider_profiles.directoryActive`      |
| Publication audit trail               | `audit_logs` via the reviewed Services publication action                         |
| Consumer requests                     | `service_leads`                                                                   |
| Request events and provider responses | `serviceLeadEvents`                                                               |
| Requester contact                     | canonical `users` record                                                          |
| Property/listing/development context  | existing `propertyId`, `listingId`, and `developmentId` fields on `service_leads` |
| Public geography vocabulary           | `service_provider_locations.canonical_place_id`; Place labels are presentation data |

Services does not dual-write to platform `leads`, `partnerLeads`, or Explore content. It does not introduce a second CRM.

## Trust and publication rules

- Public directory queries require `partners.isActive = 1`, `partners.verificationStatus = 'verified'`, `service_provider_profiles.directoryActive = 1`, and an active or trial subscription state.
- A provider must publish at least one active service and one valid canonical Place coverage row. Text labels alone do not satisfy publication or directory queries.
- Provider clients cannot set verification, moderation, directory publication, or subscription tier flags.
- Public profile responses do not return provider email or phone fields.
- **Platform verified** is the only verification badge, backed by the canonical partner verification state. Eligible moderated review aggregates and response measurements are separate computed signals governed by V2/V3.
- Paid placement, publisher tiers, and paid ordering remain prohibited under V2 §3.1. V2-authorized verified-request reviews and computed aggregates, plus DELTA-3 response measurement, may be shown only under their evidence and minimum-sample rules. Qualifications, licenses, years-in-business, and other unverified claims must not be invented.
- Directory results use the implemented named sort options and deterministic tie-breaking. No paid entitlement may affect organic eligibility or ranking.
- Public coverage is described as **listed coverage** and matched by canonical Place identity. It is not represented as a radius, proximity or distance calculation.

## Reviewed publication authority

Publication is a reviewed super-admin transition, not a provider self-service mutation. A new canonical partner starts at `verificationStatus = 'pending'` with `directoryActive = 0`, so a newly onboarded provider is never public.

The Services server exposes three super-admin-only publication procedures: a read-only review worklist that lists service providers with their canonical readiness state, a readiness inspection that reports canonical provider/profile readiness for one provider, and the reviewed transition itself with three decisions:

- `publish` — writes `partners.verificationStatus = 'verified'` and `service_provider_profiles.directoryActive = 1` in one transaction;
- `unpublish` — withdraws `directoryActive` without rejecting the canonical partner;
- `reject` — writes `partners.verificationStatus = 'rejected'` and withdraws `directoryActive`.

Exactly one of the three writes. The reviewed transition is the only writer of `partners.verificationStatus` and `service_provider_profiles.directoryActive`; the worklist and the readiness inspection are reads. The worklist reports the canonical state a reviewer needs — identity, published profile, active services, listed coverage, subscription eligibility, and the named blockers — and never grants publication on its own.

Authorization boundary: the transition requires the existing `super_admin` authority on the canonical `partners` identity. No service-provider role, and no provider self-service mutation, can reach any of the three procedures or write `directoryActive`, `verificationStatus`, `moderationTier`, or a subscription tier.

Publication fails closed. `publish` is refused, with the blocking reasons named, unless the provider has an existing profile with a complete public profile (headline, biography, and at least one contact channel), at least one active service, at least one valid listed coverage row, an eligible subscription state, and an active canonical partner.

The two publication fields cannot drift into an impossible state. The reviewed transition writes them together, and withdrawing partner verification anywhere in the platform also withdraws Services directory publication in the same transaction. Public read paths independently re-check the full eligibility conjunction, so a drifted row is never treated as published.

Every reviewed decision is recorded in the canonical `audit_logs` authority with the acting operator, decision, before/after publication state, and readiness blockers. Publication requires no new infrastructure: it reuses the existing `super_admin` role, the canonical `partners` identity, and the existing audit trail.

## Canonical Place coverage (current)

Provider coverage is associated with canonical Place identity through
`service_provider_locations.canonical_place_id`. Place labels are projected
for display; they are not an alternate geography authority. Directory
eligibility matches the selected canonical Place against provider coverage
without widening to nearby or textually similar areas. The historical deferral
from 2026-10-21 is superseded by the Place Authority integration recorded in
#693 and the current engine state register. Broader service-by-Place landing pages and
any radius or proximity claim remain separate future capabilities.

**Historical decision (2026-10-21, superseded):** the original V1 contract
deferred typed Place references and retained exact listed-coverage matching.
The later #693 Place Authority consumer slice implemented canonical coverage;
this record explains the earlier contract text.

Provider service and coverage replacement is authoritative over the submitted canonical set. Submitted row identifiers must belong to the authenticated provider; an identifier owned by another provider is rejected rather than silently inserted. Changing a service code or a coverage tuple updates the owned canonical row in place, so no active orphan or duplicate is created. A service that is intentionally removed from the submitted set is deactivated and stays visible to the provider editor, and a coverage row that is intentionally removed — including one the provider blanked out — stops matching immediately. Structured fields the caller did not intentionally change are preserved, and an empty or all-blank location replacement is still rejected rather than deleting existing coverage. Blank coverage rows never satisfy publication or directory queries, and canonical coverage and service-code uniqueness remain enforced.

The provider editor also writes service descriptions through this same replacement
authority. Description input is trimmed, limited to 2,000 characters, and stored
on the existing canonical service row; blank input clears the optional value.
The server resolves the provider from the authenticated `service_provider`
account and rejects service IDs not owned by that provider. There is no separate
pending-edit moderation state: unpublished providers remain private, while edits
to a published, active service appear on its public profile/detail page after
save. Publication and eligibility rules remain unchanged. The editor is
implemented on the 2026-11-12 task branch and its provider-owned save, reload,
publication, and privacy behavior passed a real task-local MySQL integration
journey on 2026-11-13. The test captured verification email in memory and used a
synthetic legal fixture; it does not verify external delivery or current legal
release content. The branch remains unmerged and the production artifact is
not release-verified.

## Enquiry privacy and response custody

`service_leads` is the single request authority. A request is assigned to exactly one provider in V1. The server requires an explicitly selected provider and validates that provider's publication state, service, and coverage before writing. The provider inbox query is constrained by the authenticated provider ID. The requester and assigned service-provider account can read the request; unrelated providers and other authenticated users receive a forbidden/not-found response. A `super_admin` has an explicit operational read exception for support and audit work.

Requester email and phone are read from the canonical user record for the assigned provider and the explicit `super_admin` operational exception. V1 does not persist a separate contact snapshot or a separate messaging/quote record. A later authority is required if immutable contact consent/evidence, threaded messaging, formal quotes, or response SLA tracking becomes part of the product.

Service request writes require a stable request key, the existing public-lead rate-limit boundary, a V1 source surface, and an allowlisted context payload. Property, listing, and development context IDs are checked against their canonical records, publication/ownership state, and relationships before persistence; caller-supplied context cannot override the validated service, provider, or request key. The approved `0080_service_lead_request_idempotency.sql` migration supplies the unique `service_leads.request_id` authority. The V1 write derives a fixed-length request ID from the authenticated requester and stable request key without duplicating the raw key in context JSON. Matching retries are serialized against the requester record and replay the original lead only when the normalized provider, category, attribution, geography, property, listing, development, service, and allowlisted context payload are equivalent. A reused key with a changed `sourceDetail`, `reasonKey`, `propertyLinked`, or other material payload fails rather than creating a second request. A stored request context that cannot be read as an allowlisted V1 payload fails closed with a distinct replay-unavailable error rather than a misleading "key already used" conflict. Provider lead pagination is ordered by `createdAt DESC, id DESC` so paging is stable when timestamps collide. The request confirmation reads the persisted lead rather than duplicating notes, contact, or journey context in a result URL or browser storage.

## Surface disposition

| Surface                               | Disposition | Reason                                                     |
| ------------------------------------- | ----------- | ---------------------------------------------------------- |
| `/services`                           | Pilot       | Curated published directory with exact listed coverage     |
| `/services/:category`                 | Pilot       | Category discovery and provider comparison                 |
| `/services/provider/:slug/service/:service` | Pilot | Published provider service detail page; per-service SEO and enquiry context |
| `/services/provider/:slug`            | Pilot       | Published profile with truthful service context            |
| `/services/reviews/:providerId`       | Pilot       | Verified-request review submission and report flow under moderation |
| `/sitemap-services.xml`               | Pilot       | Eligible provider and per-service canonical pages          |
| `/services/request/:category`         | Pilot       | Authenticated one-provider request handoff                 |
| `/services/results/:leadId`            | Pilot       | Server-authoritative request status and provider attribution |
| `/service/profile`                     | Pilot       | Private provider profile setup and editing                 |
| `/service/dashboard`                   | Pilot       | Private request custody and response status                |
| `/admin/services-review`               | Pilot       | Super-admin publication review worklist; read-only over canonical state |
| `/service/explore`                     | Hidden      | Explore publishing is outside Services V1                  |
| Provider paid plans and paid placement | Hidden      | No billing or entitlement authority is changed here        |
| Generic Explore feed integration       | Hidden      | Future boundary only; no Explore redesign in this workstream |
| Automated ranking, bidding, appointments, escrow | Hidden | Not required for the smallest useful journey              |

## Explore boundary

Services exposes a clean future discovery concept: **Service Provider / Professional Service**. A future Explore integration may consume a published provider projection containing provider ID, business identity, service category, service description, listed coverage, public profile URL, and verification state.

Explore must not read private provider contact fields, service leads, request notes, or provider response events. The Services V1 server does not expose Explore publishing, moderation, recommendation ranking, or engagement mutation routes. This workstream does not add an Explore adapter, feed entry, media publisher, ranking signal, or engagement mutation.

## Remaining authority dependencies

These are explicit launch dependencies, not hidden implementation shortcuts:

1. Broader service-by-Place discovery pages remain a future, evidence-led capability. Canonical provider coverage and current request geography already use the Place Authority integration.
2. An accountable `super_admin` reviewer operating the reviewed publication transition. The workflow, its fail-closed readiness gate, and the read-only review worklist at `/admin/services-review` are implemented; the remaining dependency is operational staffing and the reviewer's operating cadence.
3. Durable requester contact/consent evidence if contact details must be retained beyond the canonical user record.
4. Provider messaging or formal quote semantics if status updates are insufficient for the next cohort.
5. Provider review rebuttal and automated abuse detection remain future capabilities; review authorship, moderation, reporting, and aggregate recalculation are implemented under V2.

## Non-goals

This workstream does not change database migrations, canonical Drizzle schema,
Database Authority, Azure, TiDB, Railway, payment lifecycle, billing authority,
commercial entitlement logic, user identity, authentication method, existing
object-ownership or administrator authorization boundaries, B03–B18 evidence,
launch infrastructure, or Agent/Agency/Developer paid lifecycle semantics. The
separately approved Services acquisition slice
allows public `service_provider` account registration through the existing
authentication, email-verification and legal-acceptance flow. It does not grant
publication: provider profiles remain private until the existing super-admin
review transition. Client acquisition copy changes do not alter release or
database authority.
