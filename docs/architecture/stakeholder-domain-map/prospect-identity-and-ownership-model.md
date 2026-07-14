# Prospect Identity And Ownership Model

## Current model and collision risks

The platform has no prospect role. An authenticated consumer is a `users` row with `role = visitor`; agency affiliation is also stored on `users`. `prospects` is a legacy one-to-one extension keyed by `user_id`, but its router is absent. Public leads create `leads` records from name/email/phone with no user or prospect foreign key. Saved searches and favourites are keyed directly to `users`; guest activity and comparison are browser-local; showings can point to a `visitor_id`; service requests point to their requesting `user_id`; referrals and distribution deals identify clients with contact snapshots and are agent-owned.

This permits one person to exist at once as an anonymous browser record, a visitor user, a legacy prospect, a `leads` contact, a showing visitor, a saved-search owner, a favourite owner, a service lead requester and an agency CRM contact. Email/phone matching alone is not safe: households share contacts, values change, and an agency may legitimately hold separate relationships for one person.

`seller_prospects` is a distinct agency-owned seller-acquisition aggregate and is not a buyer/tenant prospect identity. Do not combine it with this model.

## Canonical target model

Adopt a small, cross-domain **Prospect Identity** aggregate. `users` remains the authentication authority; the Prospect Engine is the journey authority.

| Aggregate | Key and purpose | Owner and visibility |
| --- | --- | --- |
| `prospect_identities` | UUID `id`; optional unique `user_id`; optional hashed first-party anonymous key; merge/consent timestamps. One row represents one person across anonymous and authenticated use. | Platform identity service. The prospect can access their own record; agencies cannot browse it as a CRM. |
| `prospect_profiles` | one-to-one extension with user-controlled display/contact preferences and communication preferences. No agency notes. | Prospect owns; platform processes with consent. |
| `prospect_intents` | many rows per identity: buy, rent, development buy, shared-living, commercial; goal, target areas, requirements, budget bands, timeline and active/paused state. | Prospect owns. It replaces inferring intent solely from listing type or lead status. |
| `prospect_identity_links` | auditable link/merge candidates between a prospect identity and a legacy user/lead/service/referral record. Store reason, confidence, verified-at and actor; never silently merge ambiguous PII. | Platform-controlled reconciliation. |
| existing domain aggregates | `favorites`, `saved_searches`, `leads`, `showings`, `service_leads`, referrals and agency deals remain their own write owners. Add nullable `prospect_identity_id` only where an explicit, authenticated or consented link exists. | Their existing stakeholder retains operational authority. |

An anonymous visitor receives an opaque, first-party anonymous key. It may identify an activity context but is not itself a profile. On account creation/sign-in, the user is offered a clear “keep this activity” choice. Accepting it atomically claims unclaimed guest saves, comparisons, searches and attribution into the identity; declining discards/retains only device-local data. Significant anonymous actions such as an enquiry may create an identity with a hashed key, but must not manufacture a duplicate user account.

## Identity resolution rules

1. A verified authenticated session is the only automatic link to `users` and user-owned saved data.
2. An anonymous key may be claimed once by the authenticated prospect after explicit handoff confirmation and a secure proof that the browser-held key is theirs. For a contact-bearing historical action, require the authenticated session plus a verified contact-channel challenge; a cookie, email or phone value alone is insufficient.
3. A public lead is linked when the submitting user is authenticated, or later only after the person verifies control of the contact channel and accepts the link. Do not merge solely because name/email/phone looks equal.
4. Keep the lead’s contact snapshot. It is evidence of the agency’s consented enquiry and may differ from the current profile; a link does not make private CRM fields prospect-owned.
5. Multiple leads and multiple legitimate agency/agent relationships are allowed. A relationship is represented by lead/service/referral records, not duplicate prospect identities.
6. An existing client who is also an agent/agency user still has one prospect identity when acting as a consumer. Role/agency access is authorization context, not a second person record.

## Ownership boundaries

The prospect controls private profile, intents, saves, comparisons, affordability scenarios, contact preferences and whether a summary may be shared. The agency/developer controls lead assignment, internal status, tasks, notes, score, lost reason, commission and transaction work. A public lead acknowledgement grants the prospect access only to the public-safe action/progress projection for their own linked action.

Do not expose `leads.notes`, `lead_activities` notes, internal qualification scores, agency tasks, `lostReason`, `affordabilityData`, commission records or other client records through the prospect API. A prospect may withdraw interest; it must change their relationship state, not erase a legally retained agency lead without applying the retention policy.

## Migration posture

Do not bulk-deduplicate existing `users`, `prospects`, `leads`, referrals or service leads. First introduce the identity aggregate and new nullable references; backfill only unambiguous authenticated ownership (for example `favorites.user_id`, `saved_searches.user_id`, and a showing `visitor_id`). Treat legacy `prospects` and session-string helpers as read-only migration evidence until a separately approved retirement plan exists.
