# Prospect–Agency Integration Map

## Integration doctrine

One action has one operational owner. The Prospect Engine creates an identity link, immutable attribution context and safe progress projection around the owner’s record; it does not create duplicate lead, task, showing, referral or deal records.

| Prospect action / canonical event | Existing owning table or proposed link | Owning stakeholder | Prospect-safe state | Agent-visible state | Manager exception / attribution / privacy |
| --- | --- | --- | --- | --- | --- |
| Listing enquiry `prospect.enquiry_submitted` | `leads`; add nullable `prospect_identity_id` and action/attribution reference | Agency or developer lead routing | Enquiry sent → Agent received your enquiry | Full lead, source, assignment, follow-ups | Unassigned/first-response SLA overdue. Preserve first/last/action touch, listing/property/development, agent/agency, UTM. Private notes/score never project. |
| WhatsApp contact `prospect.contact_channel_opened` | The same `leads` record when form submitted; append an immutable action event, not another lead | Lead owner | Enquiry sent / Contact channel opened | Lead source and contact channel | Missing public WhatsApp contact or failed delivery. Do not treat a browser redirect as confirmed conversation. |
| Viewing request `prospect.viewing_requested` | Typed `leads` request; create `showings` only through agency scheduling/confirmation procedure | Agency operations | Viewing requested | Lead and requested scheduling work | Unconfirmed/past-due request, double-booking or no assigned agent. `showings` is the one calendar record; do not also write legacy `scheduled_viewings`/`listing_viewings`. |
| Viewing lifecycle `showing.*` | `showings`, linked `lead_activities` | Agency/My Day | Requested, confirmed, completed, did not take place | Full status, feedback, tasks, agent assignment | Upcoming unconfirmed, no-show, feedback/follow-up due. Agent feedback and notes are private. |
| Contact/follow-up `lead.*` | `leads`, `lead_activities` | Agency lead workspace / My Day | Agent contacted you / Follow-up expected | Contact attempts, next action/date and notes | First response overdue, due/overdue follow-up. Do not reveal channel outcome/reason unless an explicit public message is sent. |
| Offer or application interest | `leads` with typed intent; later existing `agency_deals` and transaction tables | Agency transaction workflow | Offer/application submitted; Journey progressed | Private deal workflow and stages | Missing mandatory docs, ownership/conflict; no commission, negotiation or competing-offer exposure. |
| Bond assistance request | New consented request that references prospect/action, then existing `referrals`/distribution deal only after authorised ownership hand-off | Referral Distribution / authorised provider | Bond assistance requested / Referral received | Consent, recipient, permitted summary, referral progression | Consent expired, no eligible recipient, hand-off failure. No documents or internal lender assessment in prospect tracker. |
| Service request | `service_leads`, `service_lead_events`, with prospect/action link | Services Engine/provider routing | Service request sent / Provider responding | Full service lead lifecycle | Unmatched/assignment exception. Keep provider-only notes and pricing private. |
| Saved-area or location action | Prospect event and existing location analytics projections; no lead | Prospect owns preference; Location Intelligence owns aggregate | Saved area updated | Aggregate signals only | Data quality/aggregation exceptions. Never turn a save into an agency lead. |
| Explore content engagement | `explore_engagements` plus same attribution/action reference | Explore/Discovery | Usually no visible status | Content attribution/aggregate metrics | Sponsored disclosure/reporting validation. Aggregate reports cannot expose individual identity without consent. |

## Agency systems already available

The agency workspace has authenticated ownership checks over `leads`, lead assignment/status/contact/follow-up procedures, `showings`, My Day queues, and `agency_deals`. The Prospect Engine should call these write paths only through their domain procedures. Its own API is read/projection-oriented for tracker items and profile-owned for preferences. It may issue an event after a successful domain write, but it must be idempotent using the owner record ID and event type.

## Referral and financial hand-off

No public prospect action should directly construct an agent-owned referral or distribution deal with financial data. The first hand-off stores consent and the approved derived summary, selects an eligible recipient through existing distribution rules, and records the resulting referral/deal ID as a relationship. A referral recipient may have a different retention policy; the prospect sees that policy and can revoke future sharing, while records required for an already-consented service are retained according to lawful obligations.
