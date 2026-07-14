# Prospect Privacy And Status Contract

## Status translation is a projection, not an enum leak

The prospect client must consume a server-generated `ProspectActionStatus` projection. It must never render `leads.status`, `showings.status`, `agency_deals` state, a referral assessment or a task state directly. The projection is allow-listed by action type, requires verified ownership, and produces a generic terminal state where an internal reason would be sensitive.

| Internal owner state | Prospect-safe state | Conditions and prohibited data |
| --- | --- | --- |
| lead `new` | Enquiry sent | Shows only after durable lead acceptance. |
| lead assigned/delivered | Agent received your enquiry | Do not reveal assignment queues or agent identity unless public-contact consent exists. |
| lead `contacted` | Agent contacted you | Do not show call/email/WhatsApp outcome, agent notes or response score. |
| lead `qualified` | Requirements confirmed | Never expose internal qualification score or affordability conclusion. |
| lead `viewing_scheduled` | Viewing being arranged | A confirmed time comes only from `showings.confirmed`. |
| showing `requested` / `awaiting_confirmation` | Viewing requested | Do not promise a booking. |
| showing `confirmed` | Viewing confirmed | May expose confirmed time, public meeting point and reschedule/cancel action. |
| showing `completed` | Viewing completed | Feedback and staff follow-up remain private. |
| showing `cancelled`, `rescheduled`, `no_show` | Viewing no longer active / Viewing needs a new time | Avoid blame and private cancellation reasons. |
| lead/deal offer intent | Offer or application submitted | Only after the actual domain record accepts the action. |
| lead `converted` / authorised deal progress | Journey progressed | Do not expose negotiation, commission, lender or other-bidder detail. |
| lead `lost` / `closed` | Closed | Never expose lost reason, rejection discussion or lead score. Prospect may mark “No longer interested” on their relationship independently. |
| service/referral recipient routing | Request received / Provider responding | Recipient name only when disclosure/consent permits. |

## Minimum-data and consent rules

- Collect contact data only when necessary to fulfil an enquiry/request. Capture purpose, policy version and timestamp for service/referral consent.
- Store affordability inputs separately from generic leads; retain no credit/bank/identity documents in the first Prospect Engine slice.
- Prospect profile and scenario are private by default. Sharing a summary needs an explicit recipient, fields, purpose and revocation/expiry.
- Agency-private CRM data, activity notes, internal task queues, commissions, scores, lost reasons, staff observations and other-prospect data are never in a prospect response payload.
- Public pages expose only already-public listing, agent/agency, development, provider and guide content. They must not reveal a prospect’s saves, tracker or financial result.
- Provide export of profile/intents/saves/scenarios/tracker history, deletion of non-required profile data, and clear explanation where an agency/referral record must be retained separately. Keep an audit event for consent, sharing, download, deletion request, merge and status projection access.

## Attribution and reporting contract

Attribution attaches to an action/event, not a person duplicate. Store a common `attribution_context_id` with first-touch, last-touch, action-touch, referrer, UTM source/medium/campaign/content, source surface, placement/campaign IDs and consent state. Source-surface values include search result, property page, development page, suburb page, Explore content, agent profile, sponsored placement, referral campaign and service-provider card. First touch is set once per anonymous identity; last touch updates on eligible touchpoints; action touch snapshots context immutably at submission. On login, the context is claimed rather than recreated.

Agency reporting may use action-level source and outcome aggregates for agency-owned leads. Sponsored placement reporting uses campaign/placement impressions and attributed actions with consented, aggregated reporting; it does not expose a named prospect to an advertiser merely because they viewed a placement. Referral revenue reporting uses the immutable consented referral/action relationship and the existing referral/deal records, never a second prospect profile.

## Retention and audit baseline

Retain anonymous attribution only for a short configured window (recommended 30 days), delete/rotate it on opt-out, and avoid cross-site tracking. Retain raw affordability scenarios for 90 days after last update unless renewed. Lead, showing, service and referral owners apply their documented operational/legal retention policies; Prospect Engine deletion detaches or anonymises its profile link where lawful, not silently deletes those records. Audit every internal access to shared affordability summaries and every referral disclosure.
