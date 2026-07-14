# Prospect Journey Architecture

The Prospect Engine is a journey layer over existing inventory, lead, viewing, services and content engines. It is not a new inventory store or agency dashboard.

## Stage 1 — Discover

Public entry points are search, location/suburb guides, developments, Explore content, agent profiles, sponsored placements and service-provider content. Every render/action receives an ephemeral attribution context: anonymous key, first-touch, current last-touch, landing URL, source surface, content/listing/development/agent/provider IDs and normalized UTM parameters. Login is not required.

The discovery system continues to read `properties`, listing/development projections, location intelligence and Explore. It emits a lightweight event only; it does not create a prospect profile or lead for a page view.

## Stage 2 — Organise

The signed-in journey shows saved properties and developments, saved searches, comparison set, preferred areas, requirements, budget range and recently viewed items. Before sign-in, these may be held against the anonymous key/device only. The one-time handoff claims them after the prospect chooses to keep activity.

Canonical destination rules: user saved property uses `favorites`; saved search uses `saved_searches`; comparison is a prospect-owned shortlist (not a browser-only context); development saves must be an explicit development save rather than a fake property favourite. Recently viewed is a capped activity history, not a CRM signal. Each item records source attribution and intent, where available.

## Stage 3 — Understand buyability

The prospect completes a progressive, self-declared affordability scenario. The first screen asks intent, target area and preferred payment/rental budget; income, debt, deposit, employment, timeline and first-time-buyer inputs appear only when useful. It returns an indicative range, repayment, purchase-cost/deposit guidance, readiness checklist and next best action. It never represents a lending, credit or bond approval decision.

The scenario belongs to the prospect. A user may consent to share a small summary with a chosen agent or a named referral provider; raw inputs stay private. See [Buyability Foundation](./prospect-buyability-foundation.md).

## Stage 4 — Engage

An action creates or updates exactly one domain-owned request:

- listing/development enquiry → `leads`;
- viewing request → typed `leads` request; a `showings` row only when an agency schedules it;
- offer/application interest → typed lead, then the existing agency deal/transaction workflow when staff accept it;
- bond assistance → consented referral request and existing Referral Distribution hand-off;
- service request → `service_leads`;
- WhatsApp → record the lead/action before opening the destination, if the prospect submits contact details.

Each request carries the prospect link when established, the attribution context, the current intent and a contact-preference snapshot. It must not create a second agency task or duplicate lead merely to make it appear in the prospect timeline.

## Stage 5 — Track

The private prospect area is an action timeline, not a lead dashboard. It reads an allow-listed projection of actions associated with the viewer: action type, subject, submitted time, safe status, confirmed viewing time/location, last public update, and permitted next action. It can show “Enquiry sent”, “Agent received your enquiry”, “Viewing requested”, “Viewing confirmed”, “Viewing completed”, “Follow-up expected”, “Application or offer submitted”, “Closed” and “No longer interested”.

It cannot show lead score, internal assignment identity unless the agency deliberately exposes the named public contact, notes, task queues, commissions, reasons, or other prospects. See [Privacy And Status Contract](./prospect-privacy-and-status-contract.md).

## Stage 6 — Continue

After an action, suggestions use the current intent, saves, location and opted-in affordability range: similar public properties, relevant developments, guide content, a buyability next step, bond assistance and services such as conveyancing, moving, inspections and repairs. Recommendations are public-read compositions and must say why they are shown. They never infer a financial decision from internal agency outcomes.

## Mobile contract

Mobile must retain the current property detail’s direct contact and calculator usability while adding one compact, authenticated “Your journey” entry. Confirmation is immediate, progress is readable without horizontal CRM tables, and viewing time/status is accessible from the action card. Anonymous storage handoff must be explicit, skippable and resilient to a cleared browser.
