# Property Listify Professional Services V1 Contract

**Workstream:** `feat/services-v1-remediation-port-20260924`

**Integration base:** `4e012b3044628fc06da7489c0055e9ce01bdc8d9`

**Disposition:** `SERVICES V1 — PILOT CANDIDATE`

## Product definition

Professional Services is the property-professional directory inside Property Listify. It helps a buyer, seller, landlord, tenant, agent, agency, developer, or property owner find a relevant professional for a property task, understand the provider's published service and coverage, and send one attributable request.

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
2. Optionally provide a suburb, city, or province.
3. Browse only providers with an active, verified, published profile, an active service, and listed coverage.
4. Open a provider profile and review services, coverage, public website, and published feedback.
5. Select **Request service** on a provider card or profile and provide service, area, and project notes.
6. Sign in when required to submit the request.
7. Receive a request-confirmation page showing the one provider who received it and the current status.
8. If no published provider matches, return to the category directory; a request is never silently sent to an unrelated provider.

### Provider

1. Open `/service/profile` and create the canonical provider identity.
2. Complete business details, contact details, services, and coverage areas.
3. Finish the profile setup; it remains private and ready for manual directory review.
4. Open `/service/dashboard` after publication.
5. See only requests assigned to that provider identity, including requester account contact details, project notes, location, and property context.
6. Mark the request accepted, quoted, won, lost, or expired and add a response note through the existing lead event authority.

## Authorities reused

| Concern                               | Authority                                                                         |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| Provider identity                     | `partners` linked one-to-one to `users`                                           |
| Provider profile                      | `service_provider_profiles`                                                       |
| Provider services                     | `service_provider_services`                                                       |
| Provider coverage                     | `service_provider_locations`                                                      |
| Provider subscription state           | `service_provider_subscriptions`                                                  |
| Consumer requests                     | `service_leads`                                                                   |
| Request events and provider responses | `serviceLeadEvents`                                                               |
| Requester contact                     | canonical `users` record                                                          |
| Property/listing/development context  | existing `propertyId`, `listingId`, and `developmentId` fields on `service_leads` |
| Public geography vocabulary           | existing Services location fields; no canonical location relation exists yet      |

Services does not dual-write to platform `leads`, `partnerLeads`, or Explore content. It does not introduce a second CRM.

## Trust and publication rules

- Public directory queries require `partners.isActive = 1`, `partners.verificationStatus = 'verified'`, `service_provider_profiles.directoryActive = 1`, and an active or trial subscription state.
- A provider must publish at least one active service and one listed coverage area.
- Provider clients cannot set verification, moderation, directory publication, or subscription tier flags.
- Public profile responses do not return provider email or phone fields.
- The only public trust badge is **Platform verified**, backed by the canonical partner verification state.
- Paid placement, publisher tiers, ratings, aggregate review counts, qualifications, licenses, response times, and experience claims are not shown in V1. Published feedback text may be shown only as content, not as a rating or trust score.
- Directory results are ordered deterministically by provider name, not by trust, subscription, rating, or engagement score.
- Public coverage is described as **listed coverage** and is matched exactly against the fields supplied by the provider. It is not represented as a canonical radius or distance calculation.

## Location limitation

The current Services tables store display-text province, city, suburb, coordinates, and radius, but do not store typed canonical location IDs or a governed coverage relation. Services V1 therefore uses exact, non-widening matching on the submitted fields and labels the result as listed coverage.

A later schema-authority workstream must decide:

- the canonical location level and ID used for a provider coverage area;
- whether one request has one typed location authority or a governed composite;
- hierarchy validation and unknown-location failure behavior;
- whether radius is a real distance claim or only a provider preference;
- canonical location snapshots on a service request.

No migration or schema change is included in this workstream.

## Enquiry privacy and response custody

`service_leads` is the single request authority. A request is assigned to exactly one provider in V1. The server requires an explicitly selected provider and validates that provider's publication state, service, and coverage before writing. The provider inbox query is constrained by the authenticated provider ID. The requester and assigned service-provider account can read the request; unrelated providers and other authenticated users receive a forbidden/not-found response. A `super_admin` has an explicit operational read exception for support and audit work.

Requester email and phone are read from the canonical user record for the assigned provider and the explicit `super_admin` operational exception. V1 does not persist a separate contact snapshot or a separate messaging/quote record. A later authority is required if immutable contact consent/evidence, threaded messaging, formal quotes, or response SLA tracking becomes part of the product.

Service request writes require a stable request key, the existing public-lead rate-limit boundary, a V1 source surface, and an allowlisted context payload. Property, listing, and development context IDs are checked against their canonical records, publication/ownership state, and relationships before persistence; caller-supplied context cannot override the validated service, provider, or request key. The approved `0080_service_lead_request_idempotency.sql` migration supplies the unique `service_leads.request_id` authority. The V1 write derives a fixed-length request ID from the authenticated requester and stable request key. Matching retries are serialized against the requester record and replay the original lead; a reused key with a changed payload fails rather than creating a second request. The request confirmation reads the persisted lead rather than duplicating notes, contact, or journey context in a result URL or browser storage.

## Surface disposition

| Surface                               | Disposition | Reason                                                     |
| ------------------------------------- | ----------- | ---------------------------------------------------------- |
| `/services`                           | Pilot       | Curated published directory with exact listed coverage     |
| `/services/:category`                 | Pilot       | Category discovery and provider comparison                 |
| `/services/:category/:city/:province` | Pilot       | Exact city/province coverage view                          |
| `/services/provider/:slug`            | Pilot       | Published profile with truthful service context            |
| `/services/reviews/:providerId`       | Pilot       | Published feedback text only; no ratings or review capture |

| `/services/request/:category` | Pilot | Authenticated one-provider request handoff |
| `/services/results/:leadId` | Pilot | Server-authoritative request status and provider attribution |
| `/service/profile` | Pilot | Manual provider profile and publication review |
| `/service/dashboard` | Pilot | Private request custody and response status |
| `/service/explore` | Hidden | Explore publishing is outside Services V1 |
| Provider paid plans and paid placement | Hidden | No billing or entitlement authority is changed here |
| Generic Explore feed integration | Hidden | Future boundary only; no Explore redesign in this workstream |
| Public review submission | Hidden | No review writer, moderation, or aggregate authority |
| Automated ranking, bidding, appointments, escrow | Hidden | Not required for the smallest useful journey |

## Explore boundary

Services exposes a clean future discovery concept: **Service Provider / Professional Service**. A future Explore integration may consume a published provider projection containing provider ID, business identity, service category, service description, listed coverage, public profile URL, and verification state.

Explore must not read private provider contact fields, service leads, request notes, or provider response events. The Services V1 server does not expose Explore publishing, moderation, recommendation ranking, or engagement mutation routes. This workstream does not add an Explore adapter, feed entry, media publisher, ranking signal, or engagement mutation.

## Remaining authority dependencies

These are explicit launch dependencies, not hidden implementation shortcuts:

1. Canonical provider coverage geography and request location authority.
2. Audited manual provider publication/approval workflow with an accountable operator. Services V1 has no provider-side review-submission or approval state; completing setup means the private profile is ready for that operator review.
3. Durable requester contact/consent evidence if contact details must be retained beyond the canonical user record.
4. Provider messaging or formal quote semantics if status updates are insufficient for the next cohort.
5. Review authorship, moderation, and aggregate recalculation before ratings become a public trust signal.

## Non-goals

This workstream does not change database migrations, canonical Drizzle schema, Database Authority, Azure, TiDB, Railway, payment lifecycle, billing authority, commercial entitlement logic, authentication/security authority, B03–B18 evidence, launch infrastructure, or Agent/Agency/Developer paid lifecycle semantics. The narrow client route, navigation, and surface-registry edits in this workstream only enforce the Services V1 pilot/hidden boundary; they are not launch infrastructure changes.
