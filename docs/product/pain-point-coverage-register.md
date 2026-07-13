# Agent Pain-Point Coverage Register

Audit date: 2026-07-12
Audited repository baseline: `e460edaf` (`main` and `origin/main`)
Scope: repository implementation and automated evidence only; production operation and South African user validation remain unproven.

Implementation update: the current checkpoint closes the first operational slice of both seller acquisition and buyer-response loops. Seller prospects now record structured contact attempts, required next actions, first-contact metrics, My Day follow-ups, and private mandate metadata/checkpoints. Buyer leads now record structured contact attempts, required next actions, first-response timestamps, and a 15-minute ignored-lead escalation queue in My Day. The migrations are locally schema-validated and the focused automated evidence is recorded with the checkpoint; production validation remains required before treating either loop as released proof.

## Rating method

- **Closed loop**: an agent can complete the outcome end to end without a material off-platform step.
- **Strong foundation**: the core records, lifecycle, permissions, UI, and meaningful automated coverage exist, but important execution steps remain external.
- **Partial**: useful pieces exist, but a central part of the user outcome is absent or only represented as data.
- **Mostly missing**: no meaningful workflow exists beyond adjacent data, labels, or reporting.

Evidence is classified as **B** backend/data model, **U** usable workspace, **C** contract test, **I** database integration test, **E** browser acceptance test, and **P** production proof.

## Executive finding

The brainstorming assessment is substantially correct. Property Listify has a credible connected operating spine from seller prospect through listing, buyer enquiry, viewing, offer, transaction, and commission forecast. None of the twelve pain points is yet a fully closed loop, because material communication, calendar, document, external-party, valuation, reconciliation, or production-validation steps remain outside the product.

Two areas are stronger than the original assessment suggests:

1. **My Day** also includes listing work and offer/transaction deadlines, not only leads and viewings.
2. **Commission data inside transactions** already supports percentage or fixed commission, VAT treatment, agency and agent shares, referral split, other deductions, expected payment date, paid date, and status. The thin part is the standalone commission operating experience and reconciliation workflow.

The most important overstatement is the word **Compliance**. The current Compliance screen is workspace activation/readiness only. Transaction templates and private document metadata provide useful future foundations, but they do not constitute regulatory compliance.

## Audited register

| # | Pain point | Severity | Audited coverage | Evidence | Audit correction / remaining friction | Primary success metric | Priority |
|---|---|---|---|---|---|---|---|
| 1 | Find seller stock and win mandates | Critical | **Strong foundation (management), partial (acquisition and persuasion)** | B/U/C/I/E | Prospect capture, assignment, lifecycle, structured activity, next action, follow-up, oversight, private mandate checkpoints, and guarded listing handoff are real. Discovery, outreach execution, owner enrichment, farming, valuation, proposal, legal signing, and nurture are absent. | Qualified seller prospects converting to signed mandates; median days from capture to mandate | P0 |
| 2 | Prevent buyer leads being lost | Critical | **Strong foundation** | B/U/C/I/E | Ownership, queues, stages, notes, structured contact attempts, first-response measurement, ignored-lead escalation, follow-ups, lost reasons, detail, viewing scheduling, and persistence exist. Direct call/WhatsApp links are launch actions, not synchronized communication; contact deduplication, inbox sync, and nurture automation remain absent. | Median first-response time; % leads contacted within SLA; unworked-lead rate | P0 |
| 3 | Know what to work on today | Very high | **Strong foundation** | B/U/C/I | My Day combines seller-prospect and lead follow-ups, ignored buyer leads, urgent leads, viewings, feedback queues, listing tasks, and deal deadlines with direct actions. No external calendar, configurable reminders, general tasks, push, route planning, or offline mode. | Daily queue completion rate; overdue work at day end; weekly active-agent use | P0 |
| 4 | Convert a qualified seller into a mandate and listing | Critical | **Partial** | B/U/C/I/E | The guarded `seller prospect -> listing draft` handoff is real and protects private notes. Mandate type, signed/expiry dates, price expectation, and a checklist are now captured, but the commercial middle—CMA, valuation presentation, objections, proposal, mandate generation, legal signing, and seller onboarding—is absent. | Qualified-to-mandate conversion rate; mandate-to-live-listing time | P0 after loop telemetry |
| 5 | Create complete listings and publish correctly | High | **Strong foundation** | B/U/C/I | Inventory readiness, approval states, private revisions, assignment risks, missing fields/media, stale work, public metrics, and publication mismatch concepts exist. Browser acceptance for the complete create-review-publish path and production proof are not present in the agency acceptance suite. Syndication, duplicate-property checks, bulk actions, media QA, renewals, and seller reporting remain gaps. | First-pass approval rate; time to publish; publication mismatch rate | P0 validation, then P1 |
| 6 | Coordinate viewings and capture feedback | High | **Strong foundation** | B/U/C/I | Canonical viewings support request, confirmation, completion, cancellation, no-show, reschedule, reassignment, structured feedback, history, agency scoping, and My Day. Missing buyer self-booking, occupant confirmation, reminders, calendar sync, routes, digital attendance, feedback forms, seller reports, and open-house capture. | Confirmation rate; no-show rate; feedback captured within 24 hours | P1 |
| 7 | Manage offers, negotiations, and deal deadlines | High / financial risk | **Strong foundation** | B/U/C/I/E | Versioned offers, immutable accepted terms, sale/rental templates, conditions, milestones, parties, risks, activity, private document metadata, deadlines, and commission calculation are implemented. Actual document upload/signing, external-party participation, messaging, deposit/payment tracking, cancellation workflows, and production proof remain incomplete. | Deadline-miss rate; accepted-offer-to-completion rate; fall-through reason coverage | P1 |
| 8 | Remove commission and income uncertainty | Very high | **Partial, with a stronger backend than UI** | B/U/C/I/E | Transaction records already model fixed/percentage basis, VAT treatment, agency/agent shares, referrals, deductions, payment dates, and estimated/payable/paid/cancelled states. The standalone screen only summarizes total/paid/pending and six-month history. No reusable split plans, approvals, disputes, statements, reconciliation, accounting export, or overdue-payment alerts. | Forecast accuracy; overdue commission value; reconciliation time | P1 |
| 9 | Explain market value and unrealistic pricing | High | **Mostly missing** | U | Growth shows lead-source mix and a views/enquiries-by-area heatmap. No comparable sales/listings, price-per-m², days on market, trends, supply/demand, price history, valuation recommendation, CMA, seller presentation, or farming recommendations. Data feasibility is a prerequisite. | CMA creation time; mandate conversion after CMA; pricing variance from achieved price | P2 discovery/data spike |
| 10 | Give principals oversight and accountability | High | **Good foundation** | B/U/E | Membership, invitations, roles/status, workloads, overdue lead work, listing/viewing context, and safe reassignment/deactivation are present. Targets, response-time performance, canvassing expectations, territories, coaching, reviews, training, quality/compliance scorecards, and commission-plan administration are absent. | SLA compliance by agent; follow-up completion; conversion by stage/source | P1 after instrumentation |
| 11 | Compliance, documents, and audit readiness | High risk | **Mostly missing** | B/U/C/I | Current Compliance UI checks profile, billing, and team readiness only. Transaction templates mention FICA/compliance work and private document metadata is agency-scoped, but the deal contract explicitly remains metadata-only. No PPRA/FFC, POPIA consent, FICA collection workflow, document rules/versions, expiry, signing, retention, or audit pack. Rename the screen until genuine compliance exists. | % transactions with complete required pack; credential/mandate expiry breaches | P1 discovery, phased delivery |
| 12 | Eliminate fragmented systems and repeated entry | High / cross-cutting | **Strong architecture, incomplete experience** | B/U/C/I/E | The canonical relationships across prospect, listing, lead, viewing, deal, transaction, and commission are the strongest strategic asset. WhatsApp, email, calls, calendars, files/signatures, valuation data, accounting, portals, and campaigns remain external with little automatic capture. | % active records with one current next action; duplicate entry time; off-platform recovery incidents | P0 design principle |

## Claim-by-claim verdict

### Confirmed

- Canvassing is private, agency-scoped, lifecycle-driven, assignable, follow-up aware, and traceably convertible into the canonical listing engine.
- Lead ownership, assignment, status, notes, follow-up, lost reasons, detail context, and viewing creation are operational rather than placeholder UI.
- Listing inventory distinguishes private drafts/revisions from public state and models readiness and attention reasons.
- Viewings extend the canonical showing model and enforce server-owned lifecycle and agency tenancy.
- Deals connect leads, listings/properties, completed viewings, offer versions, accepted terms, transactions, deadlines, parties, activity, documents, and commission.
- Team workload is connected to operational records.
- Growth is currently limited to source performance and basic geographic demand signals.

### Correct but understated

- My Day includes listing attention and offer/transaction deadlines in addition to lead follow-ups and viewings.
- Structured viewing feedback includes buyer interest, price reaction, property condition, seller feedback, and recommended next action.
- Sale and rental transactions have different generated milestone/condition templates.
- Commission modeling already includes VAT treatment, referral split, deductions, payment dates, and fixed or percentage calculation.

### Needs qualification

- “Direct call” and “Direct WhatsApp” mean outbound links/actions; they do not prove communication logging or synchronization.
- “Private documents” currently mean validated private storage metadata references and workflow statuses; the agency deal workflow does not itself upload file bytes.
- “Calendar” in the viewings workspace is an internal calendar presentation, not Google/Outlook synchronization.
- Listing publication is contract/integration covered in parts, but the repository does not provide current production evidence for the entire path.
- Existing browser acceptance proves seeded local flows, not live production behavior or sustained agent adoption.

### Incorrect or overstated

- The Compliance workspace is not real-estate compliance. It is workspace readiness and should be named accordingly.
- “VAT handling” is not wholly missing from commission: commission VAT treatment and transfer-duty/VAT treatment are modeled. What remains missing is configurable policy, invoice/accounting behavior, reconciliation, and a complete user-facing commission engine.
- “Transaction-type-specific milestone templates” are not wholly missing: separate sale and rental templates exist. What remains is administrator-configurable templates and deeper transaction variants.

## Four loops and their closure gates

### 1. Seller acquisition loop — current closure slice

`capture -> assign -> contact attempt -> next action -> qualify -> mandate -> listing draft`

The checkpoint now provides the following closure slice:

1. Add seller-prospect follow-ups to My Day.
2. Add a unified contact-attempt record for call, WhatsApp, email, door knock, and note, with outcome and required next action.
3. Measure time-to-first-attempt and overdue seller work.
4. Add a mandate-conversion checklist and mandate metadata (status, type, signed date, expiry, price expectation) without pretending to provide legal signing.
5. Require a next action for every active prospect and preserve the handoff into the listing draft.

Exit gate: an agent can process a seller prospect from capture to mandate-recorded/listing-draft without relying on memory, and management can see where and why prospects stall.

### 2. Buyer lead loop — current closure slice

`enquiry -> assignment -> first contact -> follow-up -> viewing -> outcome -> progress/close`

The checkpoint adds first-response timestamps, a 15-minute SLA escalation, structured contact-attempt capture, ignored-lead escalation, and a required next action for active outcomes. Contact deduplication and WhatsApp/email synchronization remain follow-on work after this source-of-truth layer is proven in production.

### 3. Listing loop

`draft -> readiness -> submit -> approve -> publish -> enquiries -> performance action -> renew/withdraw`

First prove the full flow against production-like media and data, then add explicit price/content review tasks, stale-listing reminders, renewal/withdrawal, and distribution observability.

### 4. Deal loop

`viewing -> offer -> negotiation -> acceptance -> conditions -> completion -> commission reconciliation`

The internal state machine is credible. Close it with real private file upload, required-document rules, cancellation/fall-through handling, external-party update delivery, deposit/payment evidence, and commission reconciliation.

## Delivery order

1. **Validate before expanding**: collect production-like first-response time, next-action completeness, overdue work, stage age, and loop conversion evidence.
2. **Unify interaction history**: retain the manual/outbound-action source of truth for seller prospects and buyer leads, then connect WhatsApp/email/call providers.
3. **Run production-like listing validation** before expanding listing features.
4. **Deepen mandate conversion** around the existing seller checkpoint and listing handoff.
5. **Deepen documents and commission** around the existing transaction model.
6. **Treat market intelligence as a data product discovery track**, not a UI feature, until South African data rights, coverage, freshness, and unit economics are proven.

## Evidence inspected

- `server/canvassingRouter.ts`, `drizzle/schema/canvassing.ts`, and the canvassing contract, integration, and browser acceptance tests.
- `server/agencyRouter.ts` lead, viewing, deal, My Day, and listing procedures.
- `drizzle/schema/agencyDeals.ts` and deal contract/integration/browser acceptance tests.
- Agency leads, listings, viewings, transactions, commission, growth, team, operations, and workspace UI modules.
- Five targeted contract suites: 23 tests passed on the audited baseline.

## Validation still required

- South African agent interviews and observed workflow studies.
- Production telemetry for enquiry routing, response time, listing publication, viewing completion, and transaction progression.
- Production-like browser journeys using real media sizes, permissions, and failure modes.
- Data-source and legal review for valuation/CMA and regulatory compliance.
- Baseline measurements before claiming time saved, adoption, conversion lift, or pain-point closure.
