# Prospect Engine MVP Recommendation

## Slice comparison

| Candidate slice | User pain / adoption | Existing dependency readiness | Revenue / engine connection | Engineering and privacy risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| 1. Prospect profile and saved journey | Useful repeat-visit value, especially for comparison and saved areas | Favourites and saved searches exist, but guest, Explore, legacy prospect and comparison paths are fragmented | Moderate; improves return discovery and future matching | Medium: requires deliberate anonymous handoff and consolidation before it can be trusted | Valuable second slice, but too much cleanup for the first cross-engine promise. |
| 2. Buyability and affordability foundation | High buyer anxiety; strong finance/referral potential | Calculators and agent/distribution assessment concepts exist, but no prospect-safe scenario/consent store | High later revenue; connects listings, developments and referrals | High: financial data, wording, retention, configuration and referral consent need a dedicated contract | Design now; build after identity and tracker controls are proven. |
| 3. Prospect enquiry/viewing tracker | High anxiety immediately after a lead/viewing request; visible reason to return | `leads`, `showings`, agency lead workspace, My Day, lead activities and agency deals already operate | High connection to agency response quality; enables later referrals/services without paid integration | Low-to-medium if it is a read-only safe projection and adds one identity link | **Recommended first implementation slice.** |

## Recommended bounded slice

Build **Prospect action tracker for listing/development enquiries and agency-confirmed viewings**.

It adds a canonical prospect identity link only for authenticated or explicitly claimed public actions, action-level attribution, and a mobile-first private tracker in `/user/dashboard`. It reads the existing `leads` and `showings` records and translates their states through the status contract. It reuses agency lead assignment, My Day and viewing procedures unchanged. An unauthenticated submitter receives the existing acknowledgement and can claim the action after sign-in/verified contact; the slice does not require forced registration.

### In scope

- `prospect_identities` and safe anonymous-to-authenticated claim flow for tracker ownership.
- Nullable `prospect_identity_id` links on newly created/claimed `leads` and relevant `showings` via the lead relationship; no duplicate viewing tables.
- Immutable first/last/action-touch attribution context on the enquiry/viewing action.
- Public lead creation passes a typed enquiry or viewing-request intent through the existing lead capture procedure.
- Server-side `myProspectActions` projection with strict ownership checks and the allow-listed status translation.
- `/user/dashboard` tracker cards for enquiry sent, received, viewing requested/confirmed/completed, next permitted action, contact-preference display and “no longer interested”.
- Deterministic local fixtures: one anonymous claim, one linked listing enquiry, one linked development enquiry, one requested/confirmed/completed showing, one closed lead and one access-denied cross-user case.
- Cross-agency privacy tests proving one agency cannot expose another agency relationship through a prospect action projection.

### Explicitly out of scope

- New CRM, duplicate leads/tasks, public exposure of agency notes/scores/lost reasons.
- Full saved-journey consolidation, development saves, shared comparison and recommendation ranking.
- Credit bureau, document collection, lending decision, lender-decision language or lender integration.
- Direct public offer/application workflow, transaction negotiation, referral distribution mutation and service-provider booking.
- Rewriting existing agency/developer operations or bulk merging historic identities.
- Real-time notifications beyond existing saved-search delivery capabilities.

## Acceptance criteria

1. An authenticated prospect can see only their linked enquiry/viewing action; a different user, anonymous key, the wrong agency or a second legitimate agency relationship cannot use the tracker endpoint to read it.
2. Submitting one public enquiry creates one `leads` record and one idempotent tracker/action relationship—not a listing lead plus a scheduled viewing plus a second prospect lead.
3. Agency assignment/contact/status changes and `showings` lifecycle changes result in only the approved prospect-safe states shown in the contract.
4. A viewing request does not display “confirmed” until the canonical `showings` state is `confirmed`.
5. Private notes, activity metadata, qualification score, affordability JSON, lost reason, commission and other-prospect records are absent from API payloads and UI tests.
6. First-touch, last-touch and action-touch attribution survive public discovery → contact → claim without creating a second identity.
7. The mobile dashboard supports clear status, confirmed time and next action; all states have deterministic local database fixtures and automated authorization/status-contract tests.

Suggested implementation branch: `feat/prospect-action-tracker-mvp`.

## Follow-on order

After tracker telemetry validates identity claim and agency hand-off, consolidate saved journey data around the same identity, then add the privacy-first Buyability Foundation and consented bond-assistance referral request. This preserves a small, testable path to the strategic journey without assuming external paid integrations.
