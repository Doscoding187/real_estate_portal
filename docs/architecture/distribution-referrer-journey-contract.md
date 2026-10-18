# Distribution Network: Referrer Journey Contract

**Status:** Approved product direction; implementation contract for the Distribution workstream  
**Updated:** 18 October 2026

## Product purpose

The Distribution Network helps an individual or property professional help someone find a suitable property opportunity, prepare an introduction, follow the resulting deal, and understand the referral payout recorded under that opportunity's terms. The referrer does not need property-sales experience.

Property Listify supports discovery, matching, the authorized introduction, and progress visibility. The developer owns development facts, images, phases, inventory, prices, partner-visible contacts, and sales resources. The developer handles its transaction and makes its own sales decisions. Distribution owns referrer identity and access, opportunity programs and terms, referral requirements, intake, assignment, progress, and payout records.

## Three connected records

Keep these concepts connected by identifiers and snapshots, but do not collapse them into one status or record:

1. **Assessment and shortlist:** the person's stated needs, search preferences, calculation assumptions if an approved assessment is available, matched opportunities, and the options presented.
2. **Referral and deal:** the selected opportunity, permission and identity evidence, submitted referral, handover, recorded milestones, responsible party, and outcome.
3. **Referral payout:** the applicable frozen terms, verified eligibility trigger, review and approval, payment reference, and confirmed payment.

Exploring or printing a shortlist is not a referral. Submitting a referral does not mean a viewing is booked, the buyer is approved, a deal is complete, or a payout is earned.

## Journey and acceptance criteria

### 1. Discover opportunities

- A public visitor can explore opportunities that are publicly visible and have current marketable inventory.
- Public discovery and the signed-in catalogue use the shared browse-matching rules for buy/rent mode, listed-price range, area text, and bedroom type.
- Public visibility, current marketability, an active Distribution opportunity, referral-open status, and this referrer's entitlement remain separate checks.
- Partner details appear only after all required gates pass for that actor. Do not show restricted program terms or details to a partner merely because they have a Distribution identity.
- Current sale and rental counts and prices come from the Developer-owned `DevelopmentSalesProjection`. An absent mode is unavailable. Do not infer stock from CRM, program state, referral state, legacy totals, or another mode.

### 2. Prepare a shortlist

- A referrer can select and print or save up to five currently marketable options as a PDF using the browser's print-to-PDF flow.
- A shortlist displays the selected mode, real opportunity details, current projected availability, the time the data was observed, the search preferences, and a clear notice that prices and availability may change.
- Do not put the prospect's income, identity, contact details, or private referral evidence in a general-purpose shortlist.
- Public shortlist selection can be carried into the same browser's signed-in partner catalogue. This is a convenience, not a durable saved assessment.

### 3. Assess fit

- Purchase affordability uses the current prime rate as its baseline and adds no arbitrary risk margin.
- Do not activate income-based purchase matching until the loan term and repayment allowance are explicitly approved and the assumptions are visible and versioned.
- Rental discovery remains available, but rental affordability uses a separate model and stays disabled until its rules are approved.
- A co-applicant is a separate person and assessment. Do not combine incomes until the required inputs, consent, and calculation rules are defined.
- Until these conditions are met, show a clear unavailable state and allow browse-only matching by listed price, area, and bedrooms. Never present a browse filter as a qualification decision.

### 4. Prepare and submit a referral

- The prospect first receives the applicable information and permission documents. Distribution collects the required signed permission and identity evidence before collecting the prospect's contact details.
- Requirements and terms are opportunity-specific and are snapshotted for the referral.
- The Distribution terms snapshot records each required document's stable template ID, code, label, required state, and order. Manager checklists, partner deal details, progress counts, and manager queues read those saved requirements rather than the current template configuration.
- Existing version 1 snapshots have no stable template ID. Resolve them only when the saved document code maps to exactly one template for that development; otherwise show the saved requirement as unavailable and keep it blocking. Never substitute today's requirements.
- Submission rechecks the actor's entitlement, active program, campaign visibility, open-for-referral status, and current Developer projection for the selected sale/rent mode.
- The referral stores the selected mode, Developer projection revision and displayed terms, and applicable Distribution terms snapshot.
- Referral consent and identity evidence remain private Distribution records. Developer sales collateral is a different document category.
- Keep Developer resource links empty until an authorized delivery path exists. Do not describe current file access as revocable.
- Distribution must not write inventory. An inventory change goes through a guarded Developer Engine command.

### 5. Follow a deal

Each deal should let its referrer answer: where it stands, what actually happened, what happens next, who is responsible, and what the recorded payout state is. Show only recorded events and verified process updates. A manager's process-step update does not itself change inventory, deal stage, or payout eligibility.

The initial state must mean “referral received.” A viewing status may appear only when a real viewing booking exists. Transaction milestones and referral payout states remain separate. Program-specific process steps are frozen at submission and may be updated only by an authorized manager with an audit event.

### 6. Track referral payouts

- Use **referral payout** in partner-facing language.
- Show potential, pending approval, approved, paid, cancelled, or needs-review states from recorded terms and events.
- Potential is not payable; approval is not payment; only a recorded payment is paid.
- Normal progression to payout-pending and super-admin approval recheck the frozen program milestone and required documents. Unsupported milestones require a documented super-admin confirmation and an audit event.
- Do not show an expected payment date or window until the program has explicit processing terms and the required milestone is verified. Do not infer timing from proximity to a deal stage.

## Current implementation evidence

- Public discovery consumes the Developer projection, and the shared matching helper is used by public and entitled partner catalogues.
- The partner catalogue applies actor-specific program access, projection visibility, marketability, and referral-open checks. Referral submission re-fetches the projection and snapshots its revision, mode, displayed terms, and applicable Distribution terms.
- The payout transition and approval paths check the deal's frozen milestone and required documents; unsupported milestones require a documented administrator override. Payment still requires a real payment reference.
- New referral terms snapshots use version 2 and retain required document template IDs. Missing or invalid snapshots fail closed for checklist edits and payout readiness. If a required template is deleted, the current cascade relationship can remove its status row; the saved requirement remains visible but unavailable. This FK behavior needs reconciliation in the shared migration chain before changing the canonical schema.
- The public shortlist is a browser print-to-PDF flow and keeps prospect details out. Selected opportunity IDs and search preferences persist in local browser storage so they can be imported into the signed-in partner catalogue. The catalogue refreshes opportunity facts before display; this is browser-only continuity, not a durable server-side assessment/shortlist record.
- Income-based assessment and matches fail closed. The retired calculator's fixed 11.75% rate, 240-month term, and 30% repayment ratio are no longer callable; browse-by-listed-price remains available and is not presented as qualification.
- The existing `affordability_assessments` table requires an authenticated actor and gross monthly income, with assumptions and outputs stored as required JSON. It is not a safe store for public browse-only searches: doing so would require inventing income/model values. `affordability_match_snapshots` has a generic JSON payload that could carry projection revision and selected mode, but it depends on an assessment and has no guest owner or explicit versioned shortlist contract. Distribution runtime no longer reads or writes these tables; do not reuse them by filling fake values or storing prospect details before the guided referral evidence step. Their schema declarations remain pending the shared schema decision.
- Permission and identity evidence are collected before prospect details. Secure document storage and delivery to the developer are not connected.
- Opportunity-specific process steps and partner-visible updates are shown on Overview, My Deals, and deal detail. Referral payout states are shown separately and no processing date is promised.
- New deals still use the legacy `viewing_scheduled` database stage as their initial state. The partner UI presents “Referral received” unless a real viewing exists, but the persisted state is not yet correct.

## Integration dependencies

1. **Affordability model:** obtain approval for the purchase loan term and repayment allowance. No live income match until then; browse-only matching remains usable. Prime-rate and lender assumptions should be checked against authoritative current sources before activation.
2. **Referral initial state:** add a truthful `referral_received` state and transition rules through the centrally reconciled Distribution migration chain. The current enum has no such state; do not patch around that with schema guessing or an incompatible runtime value.
3. **Durable assessments and shortlists:** design the canonical record after the shared migration chain is reconciled. It must represent search-only assessment separately from a financial assessment, support public-to-account ownership transfer without losing the work, and snapshot market mode, filters, Developer projection revisions, selected opportunity facts, and calculation-policy version where relevant. Browser session continuity is not a durable saved record. Existing assessment tables must not be populated with invented financial assumptions.
4. **Document delivery:** define and implement an authorized Developer recipient/delivery and acknowledgement path. Keep partner resource URLs and claims about delivery or revocation disabled until it exists.
5. **Payout timing:** add explicit program processing terms and verified-milestone date calculation only after the commercial rules are agreed and represented in the canonical schema.

Distribution work must not edit the Developer worktree, add or apply migrations, or change the shared migration manifest while the chains are being reconciled. Integrate Developer schema prerequisites first, then Distribution migrations, after dependency review.
