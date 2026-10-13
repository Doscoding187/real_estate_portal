# Private-owner MVP — founder decision record

**Status:** open decision worksheet, revised 13 October 2026 (validation pass). Companion: [validated product and architecture contract](mvp-product-architecture-contract.md), [capability and lifecycle mapping](capability-and-lifecycle-mapping.md), [implementation batches](implementation-batches.md).

The agreed strategic direction is owner control, sale and rental support, meaningful marketing, optional professional assistance and protection of the existing professional launch. Recommendations below are proposed; no unanswered field is approved by default. Edward approves material product/commercial scope; named architecture, finance, operating and legal reviewers provide evidence within their responsibilities.

## D01–D07 decision register

| ID | Decision needed | Recommendation for first pilot | Required evidence / accountable approval | Status |
| --- | --- | --- | --- | --- |
| D01 | Pilot sale/rent cohort, property types/geography, maximum inventory and multi-persona eligibility | Model sale and rental separately; choose the first attended cohort. Initially House/Apartment/Townhouse, one property/action per package. Use consumer account capability; either support professional same-user context explicitly or exclude it visibly from pilot | Edward: selected cohort/limits. Architect: canonical type/context mapping and preserved professional custody. Operator: demand/capacity | OPEN |
| D02 | What the base marketing service actually delivers | One property visibility term plus reviewed presentation/description, approved share pack and a specified organic channel task. Name quantity, format, channel, rights, operator and delivery proof. Do not sell unstaffed distribution or enhanced reach | Edward/marketing operator: final deliverable checklist, available channel, sample approved assets, measured time. Supplier quotes for optional work | OPEN |
| D03 | Price, term, payment timing, rejected/unpublished orders, cancellation/refund/expiry/renewal | Distinct owner package; do not inherit professional prices/90 days. Prefer visibility term starting on first governed publication. Suitability precheck before invoice; formal review remains separate. No automatic renewal. Define remedies before accepting money | Edward/finance: approved net price, VAT/fees, actual payment process, contract terms, reconciliation/partial/duplicate rules and cancellation treatment. Architect/legal review of lifecycle | OPEN |
| D04 | Right-to-advertise evidence, disclosures, recipient verification and privacy | Proportionate property-right checks, owner/representative declaration and private evidence. Do not label verified ownership from email/payment. Owner inbox plus verified delivery; decide whether public WhatsApp is optional. Limit precise address/contact exposure and define retention | Edward/operations/legal: evidence checklist, disputed/co-owner/representative policy, consent/terms/retention. Security: scoped access and revocation criteria | OPEN |
| D05 | Staffed support, moderation, finance and marketing operation | Small attended cohort with named functions, working hours, absence coverage, task queue, complaints/refunds and incidents. A request acknowledgement is not a completion or response guarantee | Edward/operating owner: named responsible people, approved hours/capacity, measurable delivery budget, pause/escalation procedure | OPEN |
| D06 | Commercial viability and optional supplier responsibility | Per-offer cost model using real supplier quotes and loaded labour, conservative acquisition/refund/renewal assumptions. Separate media pass-through budget from service revenue. Offer supplier purchase only with a real contract/process | Edward/finance/marketing: willingness-to-pay evidence, cost/time sample, contribution target, quote and cancellation/reshoot/remedy terms. No prices approved by worksheet | OPEN |
| D07 | Regulatory classification and professional participation | Focused South African review of paid property advertising/marketing itself, plus introductions/viewings/negotiation/referral arrangements when proposed. Directory/request assistance only until real authorised delivery exists. Defer screening, leases, deposits and management | Edward commissions qualified review; record actual entity/offer, applicable PPRA/FFC/FICA/trust-money/disclosure/consumer/privacy obligations and limits. No blanket exemption inferred from owner control | OPEN |

## Decision capture format

For each ID record: decision/date; approving person; exact scope/options selected; evidence link; customer-facing promise; implementation consequence; unresolved exclusions; and objective review trigger. Do not substitute "agreed in principle" for an exact package, price or permission decision.

Price worksheet per offer: net service revenue; advertising/pass-through budget; supplier cost; operator/support hours × loaded rate; payment fees; refund/dispute reserve; acquisition cost; gross margin; contribution; renewal/continuation assumption and supporting evidence. Manual payment does not eliminate reconciliation/support cost. Separate sales from rental operational assumptions.

## Decision packet — what each decision unlocks

Edward asked specifically for the first pilot audience (D01) and the base marketing deliverables (D02) to make the technical plan concrete. Those two decisions gate the customer-facing proposition; the others gate money, operations and legal exposure. Alternatives and consequences are listed so a selection can be made with full information; the recommendations are recommendations only.

### D01 — First pilot audience

**What it unlocks:** the exact customer journey Batch 1 builds against (property types, sale and/or rental, one property per package), whether professional accounts are visibly excluded, and the maximum attended cohort.

**What proceeds independently:** Batch 1 owner-context and private-preparation engineering can start with a placeholder cohort (House/Apartment/Townhouse, one listing, sale-only default) and be re-pointed before the attended pilot. Batches 2–5 cannot be customer-tested without D01.

**Alternatives and consequences:**

| Option | Consequence |
| --- | --- |
| (a) Private sellers only, sale journey, one property, House/Apartment/Townhouse *(recommended)* | Smallest safe scope: no rental operational services, no tenancy privacy questions in v1, rental added later with its own cohort. Marketing copy and evidence checks are single-journey. |
| (b) Sale and rental in the first pilot | Matches the strategic promise earlier; doubles the review/privacy/operations surface (tenant enquiries, rental disclosures, landlord banking details) and increases D04/D05/D07 load before launch evidence exists. |
| (c) Include professional-account private listings (multi-persona) | Reuses one account model for professionals selling their own property; requires explicit multi-persona eligibility design (the same user is `agent` for agency inventory and a private owner for their own home) and must not weaken professional custody or billing uniqueness (`uq_billable_accounts_user`, billing.ts:112). |
| (d) Exclude professional-account private listings visibly *(recommended companion to (a))* | Simpler entitlement reasoning (owner product principal is a consumer account); professionals are told openly that their personal property is deferred. Must be an honest exclusion in copy, not a silent rejection at review time. |

**Evidence needed to decide:** target cohort size, geography, and (if multi-persona) the architect's canonical context mapping plus preserved professional custody proof.

### D02 — Base marketing deliverables

**What it unlocks:** the exact sellable content of the starter package: quantity, format, channel, rights, named operator and delivery evidence. Without D02 no package can be advertised, priced (D03/D06) or fulfilled (Batch 4).

**What proceeds independently:** Batch 1 (owner preparation) and Batch 3 (reviewed publication, public identity, enquiry custody) do not depend on which marketing deliverables are chosen; they make the property publishable and enquiry-capable regardless.

**Alternatives and consequences:**

| Option | Consequence |
| --- | --- |
| (a) Reviewed listing + one approved share pack + one organic social post on a named channel, delivered by a named operator with captured evidence *(recommended)* | Smallest credible, staffable, evidenceable promise. Delivery proof is a link/archive record in the operations register; no paid budget; no reach guarantee. |
| (b) (a) plus a second organic deliverable (e.g., one short video or a listing-page SEO pass) | Stronger proposition if the operator and time are real; doubles the evidence obligations and requires image/material rights review before approval. |
| (c) Include paid distribution (boosting) | Requires client budget handling, pass-through accounting (D06), platform advertising policy review and refund treatment for unspent budget — materially more finance/legal work; not recommended for the first pilot. |
| (d) Listing-only package (no marketing task) | Cheapest to fulfil and honestly sellable, but abandons the marketing-led differentiator; if chosen, market it as a listing product and do not describe it as a marketing package. |

**Evidence needed to decide:** the operator's available hours and channel access, a sample approved asset, measured production time per deliverable, and the delivery-evidence format for the operations register.

### D03–D07 — unlock summary

| ID | What it unlocks | What proceeds independently |
| --- | --- | --- |
| D03 | Batch 2 money flow: owner price, term, payment timing, remedies. Nothing may be invoiced or activated before D03. | Batches 1 and 3 are fully buildable and testable in an owned disposable target without prices (the activation gate pattern — `shared/commercialActivation.ts:37-52` — supports a disabled owner product). |
| D04 | The right-to-advertise evidence flow in Batch 1, owner contact exposure in Batch 3's public identity, and retention rules. | Draft preparation UI can ship with the declaration form and evidence upload before the exact checklist is fixed; publication requires D04. |
| D05 | Batch 4 attended pilot: named operators, hours, capacity, complaint/pause path. No consented customer may be admitted before D05. | All engineering batches; automated tests use governed fixtures, not staffed operations. |
| D06 | Offering economics: whether the starter is sold at all, and supplier purchase availability. | Everything except selling; the price worksheet can be prepared in parallel from D02's deliverable list. |
| D07 | Whether paid advertising/assistance itself needs registration/disclosures, and what may be promised professionally. | Listing/enquiry engineering (Batches 1–3) is agnostic to classification; any paid activation, referral arrangement or assisted promise requires D07. |

## Immediate decision list for Edward (ordered)

1. **D01 pilot audience** — select (a)/(b) and (c)/(d); record cohort size and geography.
2. **D02 base marketing deliverables** — select the deliverable set, channel and named operator; approve the delivery-evidence format.
3. **D03 price and payment timing** — owner package price, term, payment-timing sequence and remedies before any invoice path is enabled.
4. **D04 evidence and privacy** — right-to-advertise checklist and public-contact exposure (WhatsApp/address) policy.
5. **D05 staffed operations** — named functions, hours, absence coverage and pause/escalation path for the attended pilot.
6. **D06 viability worksheet** — confirm contribution target and supplier responsibility for optional services.
7. **D07 regulatory review** — commission the focused South African review before any paid activation or professional-referral promise.

## Separate engineering design approval

After product inputs are resolved, the architect records the minimum canonical representation of owner listing context, commercial principal/package unit, term and recipient custody. Account role, exact schema and route names remain design outputs, not founder worksheet assumptions. Review multi-persona billing uniqueness and enquiry recipient typing before implementation.

Acceptance requires a scoped permission matrix, lifecycle mapping, privacy/marketing operation and test/release plan consistent with D01–D07 — the matrix and mapping are provided in [capability-and-lifecycle-mapping.md](capability-and-lifecycle-mapping.md). Any later canonical schema or data transition must use Database Authority and its own approved workstream. No runtime overrides, migration, commercial activation or deployment follow automatically from accepting documentation.

The professional launch continues against its existing gate register while these owner decisions are made.
