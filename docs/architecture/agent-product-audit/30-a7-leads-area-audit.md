# A3-A7 — Leads Area Audit

| Field | Value |
| --- | --- |
| Slice | `A3-A7` (charter §4.7 Leads) |
| Status | Draft area audit; synthesis input to A3-B1 |
| Core question | Where does demand come from, how fast does it reach the agent, and does the platform support what the agent does next? Not "can an enquiry technically be captured?" |
| Evidence basis | `server/services/publicLeadCaptureService.ts` (full read), custody/eligibility services, presence-event contract; S1A `AGT-07` delivered / `CON-07` delivered |
| Runbook dependence | Q1 (direct-contact vs captured-form mix), Q2 (enquiry-awareness latency); charter §5.2 zero-leads invalidation applies to every conclusion below |

## 1. Existing inventory

### 1.1 Capture pipeline (`capturePublicLead`)

Save-first custody design: consent + stable `captureRequestId` are validated
before anything else; the enquiry is persisted with a delivery-attempt ledger
(`leadDeliveryService`) recording recipient, channel, status, supply origin and
custody. Custody outcomes: `verified_customer_recipient` (delivered) or
`platform_managed` / `attention_required` (Property Listify operations owns
it). Replay of an identical submission returns the durable record instead of
duplicating; conflicting reuse of a request ID is rejected. Attribution
(surface, referrer, UTM triple, affordability data) is normalized and stored.

### 1.2 Recipient eligibility (who can receive)

`isRecipientCommerciallyDeliverable`: agent must be approved AND (badged
`isVerified` OR paid-entitled via `isPaidSubscriptionRowEntitled`), and an
agency-affiliated agent must hold current membership currency. Lapsed agents
fail closed with explicit reasons. Public gates use identical predicates
(custody service, demand engine, directory presence).

### 1.3 Awareness path (speed)

On capture with a resolved agent: in-app notification ("New enquiry from {name}
… Respond while the interest is warm.", deep link `/agent/leads`) plus email
(`sendNewLeadNotificationEmail`). Bell polls every 30 s. Side effects are
deliberately non-blocking (enquiry durability never depends on them).
Response truth: first action on the lead stamps `firstRespondedAt` /
`lastContactedAt` (validated by `integration.agent-lead-transitions.test.ts`),
which is exactly the quantity runbook Q2 measures.

### 1.4 Direct-contact intent (runbook Q1 boundary)

Agent profile surfaces record eight bounded public presence events — profile
view, listing click, area-guide click, **WhatsApp click, call click, email
click**, contact CTA, share (`agentPresenceSummaryService.ts`,
`contract.public-agent-analytics.test.ts`). These feed the workspace Presence
Proof panel as anonymous counts. They are **never converted into leads**: a
prospect who taps WhatsApp/call bypasses the lead pipeline entirely, so CRM,
follow-up tooling and response-latency truth see nothing. Platform-wide,
direct-contact intent exists only inside `analytics_events`.

### 1.5 What the agent does next

Stage pipeline with transition validation, activity notes, follow-up queue,
showing booking bound to canonical inventory — verified working end-to-end for
solo agents by `integration.agent-launch-journey.test.ts`. No messaging inbox
(honestly declared), no manual lead capture (see A5 G2).

## 2. Quality assessment

The capture spine is production-grade: idempotent, consent-aware, fail-closed,
with an auditable delivery ledger — matching its **delivered** grade honestly.
The awareness loop is dual-channel and immediate. The weak edge is not capture
or awareness but *coverage*: any demand that arrives outside the form (the
majority in SA real-estate behaviour patterns) is invisible to the product's
value story, and the agent's own off-platform response is untracked after the
first stamp.

## 3. Agent value analysis

Core question answered: demand reaches agents from listing detail pages,
development/unit contexts, land/commercial listings and brand surfaces through
one canonical service — technically sound and truthful (`AGT-07`, `CON-07`
both delivered). Speed-to-awareness is minutes at worst (30 s poll + email).
Support for "what next" is real but stops at first response. The structural
gap: the platform cannot tell an agent (or itself) how much interest flowed
around their listings without becoming an enquiry — presence events prove
attention, leads prove intent, and today only the second kind counts anywhere.
Runbook Q1 exists precisely because this split is Unknown; charter §5.2's
invalidation rule means every latency/mix conclusion above is conditional on
cohort data existing at all.

## 4. Gap register

| # | Gap | Type |
| --- | --- | --- |
| G1 | Direct-contact intents (WhatsApp/call/email clicks) invisible to leads/CRM — value proof and follow-up both stop at the form boundary | Structural |
| G2 | No response-time expectation or measurement surface for the agent (Q2 computed only by founder SQL, never shown in-product) | Instrument gap |
| G3 | No reassignment/fallback for solo-agent absence (unlike agency routing `AGT-09`); lapsed agent → `attention_required` operations queue | Design choice, worth revisiting post-cohort |
| G4 | Lead quality fields captured but qualification workflow absent (`AGT-08` static implementation) | Register-known |

## 5. Decision-map row inputs (A3-B1)

| Field | Value |
| --- | --- |
| Existing | Delivered capture/custody/awareness spine with contract tests; eligibility fail-closed |
| Quality | High engineering quality; honest grades; coverage limited to form intent |
| Agent value | Real when enquiries exist; blind to direct-contact majority; no in-product latency view |
| Gap | G1–G4 above |
| Decision candidate | **Strengthen** (surface first-response latency + presence-vs-enquiry conversion to the agent, within `AGT-06` operational-metrics boundary) routed through AAE checklist; **Audit deeper** once Q1/Q2 cohort data exists — zero-leads state invalidates mix/latency conclusions entirely |

## 6. Implementation-slice candidates

An agent-facing response-latency panel and a "presence attention vs captured
enquiries" comparison are candidate slices using only recorded data (no new
metrics collection — charter hard boundary respected). Each must pass the AAE
future-slice compliance checklist before backlog entry; neither may be worded
as performance/ROI proof (`PLT-PROP-10`, `AGT-06` limitation).

## 7. Evidence discipline

Capture/eligibility/awareness statements cite code paths above. Demand volume,
mix and latency values are Unknown pending runbook instruments; this audit
records no estimates.
